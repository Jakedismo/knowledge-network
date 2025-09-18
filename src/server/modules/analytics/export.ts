import { ExportFormat, type ExportJob } from '@/types/analytics';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import * as fs from 'fs/promises';
import * as path from 'path';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class ExportService {
  private static instance: ExportService;
  private exportDir = path.join(process.cwd(), 'exports');

  private constructor() {
    this.ensureExportDir();
  }

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private async ensureExportDir() {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }

  async createExportJob(config: {
    format: ExportFormat;
    data: any;
    filters?: Record<string, any>;
    timeRange?: any;
    userId: string;
  }): Promise<ExportJob> {
    const job: ExportJob = {
      id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'metrics',
      format: config.format,
      status: 'pending',
      config: {
        data: config.data,
        filters: config.filters,
        timeRange: config.timeRange
      },
      createdBy: config.userId,
      createdAt: new Date()
    };

    // Store job in Redis
    await redis.setex(
      `export:job:${job.id}`,
      86400, // 24 hours TTL
      JSON.stringify(job)
    );

    // Process the export asynchronously
    this.processExport(job);

    return job;
  }

  private async processExport(job: ExportJob) {
    try {
      // Update status to processing
      job.status = 'processing';
      await this.updateJob(job);

      let filePath: string;

      switch (job.format) {
        case ExportFormat.CSV:
          filePath = await this.exportToCSV(job);
          break;
        case ExportFormat.JSON:
          filePath = await this.exportToJSON(job);
          break;
        case ExportFormat.EXCEL:
          filePath = await this.exportToExcel(job);
          break;
        case ExportFormat.PDF:
          filePath = await this.exportToPDF(job);
          break;
        default:
          throw new Error(`Unsupported export format: ${job.format}`);
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      // Update job with result
      job.status = 'completed';
      job.result = {
        url: `/exports/${path.basename(filePath)}`,
        size: stats.size,
        rows: this.countDataRows(job.config.data)
      };
      job.completedAt = new Date();

      await this.updateJob(job);
    } catch (error) {
      // Update job with error
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Export failed';
      job.completedAt = new Date();

      await this.updateJob(job);
      console.error('Export failed:', error);
    }
  }

  private async exportToCSV(job: ExportJob): Promise<string> {
    const data = job.config.data;
    const filename = `export_${job.id}.csv`;
    const filePath = path.join(this.exportDir, filename);

    // Convert data to CSV format
    const rows: string[] = [];

    if (Array.isArray(data) && data.length > 0) {
      // Get headers from first item
      const headers = Object.keys(data[0]);
      rows.push(headers.join(','));

      // Add data rows
      for (const item of data) {
        const values = headers.map(header => {
          const value = item[header];
          // Escape commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value?.toString() || '';
        });
        rows.push(values.join(','));
      }
    }

    await fs.writeFile(filePath, rows.join('\n'), 'utf-8');
    return filePath;
  }

  private async exportToJSON(job: ExportJob): Promise<string> {
    const data = job.config.data;
    const filename = `export_${job.id}.json`;
    const filePath = path.join(this.exportDir, filename);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  private async exportToExcel(job: ExportJob): Promise<string> {
    const data = job.config.data;
    const filename = `export_${job.id}.xlsx`;
    const filePath = path.join(this.exportDir, filename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Analytics Data');

    if (Array.isArray(data) && data.length > 0) {
      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      for (const item of data) {
        const values = headers.map(header => item[header]);
        worksheet.addRow(values);
      }

      // Auto-fit columns
      worksheet.columns.forEach((column, index) => {
        let maxLength = headers[index].length;

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 1) {
            const cellValue = row.getCell(index + 1).value?.toString() || '';
            maxLength = Math.max(maxLength, cellValue.length);
          }
        });

        column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
      });

      // Add filters
      worksheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(64 + headers.length)}1`
      };
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private async exportToPDF(job: ExportJob): Promise<string> {
    const data = job.config.data;
    const filename = `export_${job.id}.pdf`;
    const filePath = path.join(this.exportDir, filename);

    // Create a simple PDF with the data
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Analytics Report', 14, 20);

    // Add metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 30);
    doc.text(`Format: ${job.format}`, 14, 36);

    if (job.config.timeRange) {
      doc.text(`Time Range: ${job.config.timeRange.start} - ${job.config.timeRange.end}`, 14, 42);
    }

    // Add data summary
    doc.setFontSize(12);
    let yPosition = 55;

    if (Array.isArray(data)) {
      doc.text(`Total Records: ${data.length}`, 14, yPosition);
      yPosition += 10;

      // Add table headers if data has consistent structure
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const maxRows = Math.min(data.length, 30); // Limit to 30 rows for PDF

        // Simple table representation
        doc.setFontSize(10);

        // Headers
        let xPosition = 14;
        headers.slice(0, 5).forEach(header => { // Show first 5 columns
          doc.text(header.substring(0, 15), xPosition, yPosition);
          xPosition += 35;
        });

        yPosition += 6;
        doc.line(14, yPosition - 2, 190, yPosition - 2); // Header line

        // Data rows
        for (let i = 0; i < maxRows; i++) {
          xPosition = 14;
          headers.slice(0, 5).forEach(header => {
            const value = data[i][header]?.toString() || '';
            doc.text(value.substring(0, 15), xPosition, yPosition);
            xPosition += 35;
          });
          yPosition += 6;

          // Add new page if needed
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
        }

        if (data.length > maxRows) {
          yPosition += 10;
          doc.text(`... and ${data.length - maxRows} more records`, 14, yPosition);
        }
      }
    } else if (typeof data === 'object') {
      // Handle object data
      const entries = Object.entries(data).slice(0, 20); // Limit to 20 entries

      for (const [key, value] of entries) {
        doc.text(`${key}: ${JSON.stringify(value).substring(0, 50)}`, 14, yPosition);
        yPosition += 8;

        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
      }
    }

    // Save the PDF
    const pdfBuffer = doc.output('arraybuffer');
    await fs.writeFile(filePath, Buffer.from(pdfBuffer));

    return filePath;
  }

  private async updateJob(job: ExportJob) {
    await redis.setex(
      `export:job:${job.id}`,
      86400, // 24 hours TTL
      JSON.stringify(job)
    );

    // Update progress
    if (job.progress !== undefined) {
      await redis.setex(
        `export:progress:${job.id}`,
        3600, // 1 hour TTL
        job.progress.toString()
      );
    }
  }

  async getJobStatus(jobId: string): Promise<ExportJob | null> {
    const data = await redis.get(`export:job:${jobId}`);
    if (!data) return null;

    const job = JSON.parse(data) as ExportJob;

    // Get current progress if processing
    if (job.status === 'processing') {
      const progress = await redis.get(`export:progress:${jobId}`);
      if (progress) {
        job.progress = parseInt(progress);
      }
    }

    return job;
  }

  async getDownloadUrl(jobId: string): Promise<{ url: string; filename: string }> {
    const job = await this.getJobStatus(jobId);

    if (!job || job.status !== 'completed' || !job.result?.url) {
      throw new Error('Export not ready or not found');
    }

    const filename = path.basename(job.result.url);

    return {
      url: job.result.url,
      filename
    };
  }

  private countDataRows(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    }
    return 0;
  }

  async cleanupOldExports() {
    try {
      const files = await fs.readdir(this.exportDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old export: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
    }
  }
}

export const exportService = ExportService.getInstance();