import type { CustomReport, ReportQuery } from '@/types/analytics';
import { analyticsService } from './service';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class ReportService {
  private static instance: ReportService;

  private constructor() {}

  static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  async createReport(data: Omit<CustomReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomReport> {
    const report: CustomReport = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await redis.setex(
      `report:${report.id}`,
      86400 * 30, // 30 days TTL
      JSON.stringify(report)
    );

    // Add to user's reports list
    await redis.sadd(`user:${data.createdBy}:reports`, report.id);

    // If scheduled, set up the schedule
    if (report.schedule?.enabled) {
      await this.scheduleReport(report);
    }

    return report;
  }

  async getReport(id: string): Promise<CustomReport | null> {
    const data = await redis.get(`report:${id}`);
    if (!data) return null;

    return JSON.parse(data) as CustomReport;
  }

  async listReports(userId: string): Promise<CustomReport[]> {
    const reportIds = await redis.smembers(`user:${userId}:reports`);
    const reports: CustomReport[] = [];

    for (const id of reportIds) {
      const report = await this.getReport(id);
      if (report) {
        reports.push(report);
      }
    }

    // Sort by creation date (newest first)
    return reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateReport(id: string, updates: Partial<CustomReport>): Promise<CustomReport | null> {
    const report = await this.getReport(id);
    if (!report) return null;

    const updatedReport: CustomReport = {
      ...report,
      ...updates,
      id: report.id, // Preserve original ID
      createdAt: report.createdAt, // Preserve creation date
      updatedAt: new Date()
    };

    await redis.setex(
      `report:${id}`,
      86400 * 30, // 30 days TTL
      JSON.stringify(updatedReport)
    );

    // Update schedule if needed
    if (updatedReport.schedule?.enabled) {
      await this.scheduleReport(updatedReport);
    } else {
      await this.unscheduleReport(id);
    }

    return updatedReport;
  }

  async deleteReport(id: string): Promise<void> {
    const report = await this.getReport(id);
    if (!report) return;

    // Remove from Redis
    await redis.del(`report:${id}`);
    await redis.srem(`user:${report.createdBy}:reports`, id);

    // Remove schedule
    await this.unscheduleReport(id);
  }

  async executeReport(
    id: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    const report = await this.getReport(id);
    if (!report) {
      throw new Error('Report not found');
    }

    return this.executeQuery(report.query, parameters);
  }

  private async executeQuery(
    query: ReportQuery,
    parameters?: Record<string, any>
  ): Promise<any> {
    const { metrics, dimensions, filters, timeRange, aggregation, sortBy, limit } = query;

    // Merge parameters with query filters
    const finalFilters = {
      ...filters,
      ...parameters
    };

    // This is a simplified implementation
    // In production, this would build a proper database query
    const results: any[] = [];

    // Get metrics data
    for (const metricType of metrics) {
      const metricData = await analyticsService.getAggregatedMetrics(
        metricType as any,
        aggregation || 'day' as any,
        timeRange
      );

      // Apply filters
      const filtered = this.applyFilters(metricData, finalFilters);

      // Apply sorting
      const sorted = this.applySorting(filtered, sortBy);

      // Apply limit
      const limited = limit ? sorted.slice(0, limit) : sorted;

      results.push(...limited);
    }

    // Group by dimensions if specified
    if (dimensions && dimensions.length > 0) {
      return this.groupByDimensions(results, dimensions);
    }

    return {
      data: results,
      query: {
        metrics,
        dimensions,
        filters: finalFilters,
        timeRange,
        aggregation,
        sortBy,
        limit
      },
      metadata: {
        totalRows: results.length,
        executedAt: new Date()
      }
    };
  }

  private applyFilters(data: any[], filters: Record<string, any>): any[] {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        // Handle different filter operators
        if (typeof value === 'object' && value !== null) {
          if (value.operator === 'gt' && item[key] <= value.value) return false;
          if (value.operator === 'lt' && item[key] >= value.value) return false;
          if (value.operator === 'equals' && item[key] !== value.value) return false;
          if (value.operator === 'contains' && !item[key]?.includes?.(value.value)) return false;
          if (value.operator === 'between' && (item[key] < value.min || item[key] > value.max)) return false;
          if (value.operator === 'in' && !value.values?.includes(item[key])) return false;
        } else {
          // Simple equality check
          if (item[key] !== value) return false;
        }
      }
      return true;
    });
  }

  private applySorting(data: any[], sortBy?: string): any[] {
    if (!sortBy) return data;

    const [field, direction = 'asc'] = sortBy.split(':');

    return [...data].sort((a, b) => {
      const aValue = this.getNestedValue(a, field);
      const bValue = this.getNestedValue(b, field);

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  private groupByDimensions(data: any[], dimensions: string[]): any {
    const grouped: Record<string, any[]> = {};

    for (const item of data) {
      // Create group key from dimensions
      const groupKey = dimensions
        .map(dim => item[dim] || 'unknown')
        .join('|');

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }

      grouped[groupKey].push(item);
    }

    // Convert to array format with aggregations
    return Object.entries(grouped).map(([key, items]) => {
      const dimensionValues = key.split('|');
      const dimensionObj: Record<string, any> = {};

      dimensions.forEach((dim, index) => {
        dimensionObj[dim] = dimensionValues[index];
      });

      return {
        dimensions: dimensionObj,
        metrics: this.aggregateMetrics(items),
        count: items.length
      };
    });
  }

  private aggregateMetrics(items: any[]): Record<string, any> {
    if (items.length === 0) return {};

    const result: Record<string, any> = {};

    // Find numeric fields to aggregate
    const numericFields = Object.keys(items[0]).filter(key =>
      typeof items[0][key] === 'number'
    );

    for (const field of numericFields) {
      const values = items.map(item => item[field]).filter(v => v !== null && v !== undefined);

      result[field] = {
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }

  private async scheduleReport(report: CustomReport) {
    // This would integrate with a job scheduler like Bull or node-cron
    // For now, just store the schedule information
    await redis.setex(
      `report:schedule:${report.id}`,
      86400 * 30, // 30 days TTL
      JSON.stringify(report.schedule)
    );

    // In production, this would set up actual scheduled jobs
    console.log(`Report ${report.id} scheduled:`, report.schedule);
  }

  private async unscheduleReport(reportId: string) {
    await redis.del(`report:schedule:${reportId}`);

    // In production, this would cancel scheduled jobs
    console.log(`Report ${reportId} unscheduled`);
  }

  async executeScheduledReports() {
    // This method would be called by a cron job
    // to execute scheduled reports

    const scheduleKeys = await redis.keys('report:schedule:*');

    for (const key of scheduleKeys) {
      const reportId = key.split(':')[2];
      const report = await this.getReport(reportId);

      if (report && report.schedule?.enabled) {
        // Check if it's time to run this report
        if (this.shouldRunReport(report.schedule)) {
          try {
            const result = await this.executeReport(reportId);

            // Send results to recipients
            if (report.recipients && report.recipients.length > 0) {
              await this.sendReportResults(report, result);
            }
          } catch (error) {
            console.error(`Failed to execute scheduled report ${reportId}:`, error);
          }
        }
      }
    }
  }

  private shouldRunReport(schedule: any): boolean {
    // Simplified scheduling logic
    // In production, use a proper scheduling library
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const date = now.getDate();

    if (schedule.time) {
      const [scheduleHour] = schedule.time.split(':').map(Number);
      if (hour !== scheduleHour) return false;
    }

    if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
      return day === schedule.dayOfWeek;
    }

    if (schedule.frequency === 'monthly' && schedule.dayOfMonth !== undefined) {
      return date === schedule.dayOfMonth;
    }

    if (schedule.frequency === 'daily') {
      return true;
    }

    return false;
  }

  private async sendReportResults(report: CustomReport, results: any) {
    // This would integrate with email service or notification system
    console.log(`Sending report ${report.id} to recipients:`, report.recipients);
    console.log('Results:', results);

    // Store the last execution
    await redis.setex(
      `report:${report.id}:lastExecution`,
      86400 * 7, // 7 days TTL
      JSON.stringify({
        executedAt: new Date(),
        results,
        recipients: report.recipients
      })
    );
  }
}

export const reportService = ReportService.getInstance();