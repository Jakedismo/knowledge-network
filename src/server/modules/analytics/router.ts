import { Router } from 'express';
import type { Request, Response } from 'express';
import { analyticsService } from './service';
import {
  MetricType,
  AggregationPeriod,
  ExportFormat,
  type TimeRange
} from '@/types/analytics';
import { exportService } from './export';
import { reportService } from './reports';

const router = Router();

// Track a new metric
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { type, dimensions, measures, userId, sessionId, metadata } = req.body;

    await analyticsService.trackMetric({
      type,
      dimensions,
      measures,
      userId,
      sessionId,
      metadata,
      organizationId: req.user?.organizationId
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to track metric:', error);
    res.status(500).json({ error: 'Failed to track metric' });
  }
});

// Get dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { timeRange = '7d' } = req.query;

    const range = parseTimeRange(timeRange as string);

    const [
      userEngagement,
      systemHealth,
      recentErrors,
      topContent
    ] = await Promise.all([
      analyticsService.getUserEngagementMetrics(req.user?.id || 'system', range),
      analyticsService.getSystemHealthMetrics(),
      analyticsService.getRecentMetrics(MetricType.ERROR, 3600000), // Last hour
      getTopContent(range)
    ]);

    res.json({
      userEngagement,
      systemHealth,
      recentErrors: recentErrors.slice(0, 10),
      topContent,
      timeRange: range
    });
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get specific metrics
router.get('/metrics/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { timeRange = '24h', aggregation = 'hour' } = req.query;

    const range = parseTimeRange(timeRange as string);
    const period = aggregation as AggregationPeriod;

    const metrics = await analyticsService.getAggregatedMetrics(
      type as MetricType,
      period,
      range
    );

    res.json({ metrics, type, period, timeRange: range });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Get user engagement metrics
router.get('/users/:userId/engagement', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { timeRange = '30d' } = req.query;

    const range = parseTimeRange(timeRange as string);
    const metrics = await analyticsService.getUserEngagementMetrics(userId, range);

    res.json(metrics);
  } catch (error) {
    console.error('Failed to get user engagement:', error);
    res.status(500).json({ error: 'Failed to get user engagement' });
  }
});

// Get content metrics
router.get('/content/:contentId/metrics', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { timeRange = '30d' } = req.query;

    const range = parseTimeRange(timeRange as string);
    const metrics = await analyticsService.getContentMetrics(contentId, range);

    res.json(metrics);
  } catch (error) {
    console.error('Failed to get content metrics:', error);
    res.status(500).json({ error: 'Failed to get content metrics' });
  }
});

// Get system health metrics
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await analyticsService.getSystemHealthMetrics();
    res.json(health);
  } catch (error) {
    console.error('Failed to get system health:', error);
    res.status(500).json({ error: 'Failed to get system health' });
  }
});

// Get performance metrics
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { page, timeRange = '1h' } = req.query;

    const range = parseTimeRange(timeRange as string);
    const metrics = await analyticsService.getRecentMetrics(
      MetricType.PERFORMANCE,
      Date.now() - new Date(range.start).getTime()
    );

    const filtered = page
      ? metrics.filter((m: any) => m.page === page)
      : metrics;

    res.json({
      metrics: filtered,
      count: filtered.length,
      timeRange: range
    });
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// Custom query endpoint
router.post('/query', async (req: Request, res: Response) => {
  try {
    const {
      metrics,
      dimensions,
      filters,
      timeRange,
      aggregation = AggregationPeriod.DAY,
      limit = 100
    } = req.body;

    // This would need a more sophisticated query builder
    // For now, return aggregated metrics
    const range = timeRange || parseTimeRange('7d');
    const results = await Promise.all(
      metrics.map((metricType: MetricType) =>
        analyticsService.getAggregatedMetrics(metricType, aggregation, range)
      )
    );

    res.json({
      results: results.flat().slice(0, limit),
      query: req.body,
      count: results.flat().length
    });
  } catch (error) {
    console.error('Failed to execute query:', error);
    res.status(500).json({ error: 'Failed to execute query' });
  }
});

// Export data
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { format, data, filters, timeRange } = req.body;

    const job = await exportService.createExportJob({
      format: format as ExportFormat,
      data,
      filters,
      timeRange,
      userId: req.user?.id || 'system'
    });

    res.json({ jobId: job.id, status: job.status });
  } catch (error) {
    console.error('Failed to create export:', error);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

// Get export status
router.get('/export/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await exportService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Failed to get export status:', error);
    res.status(500).json({ error: 'Failed to get export status' });
  }
});

// Download export
router.get('/export/:jobId/download', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { url, filename } = await exportService.getDownloadUrl(jobId);

    if (!url) {
      return res.status(404).json({ error: 'Export not ready or not found' });
    }

    res.json({ url, filename });
  } catch (error) {
    console.error('Failed to get download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// Reports endpoints
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const reports = await reportService.listReports(req.user?.id || 'system');
    res.json(reports);
  } catch (error) {
    console.error('Failed to list reports:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

router.post('/reports', async (req: Request, res: Response) => {
  try {
    const report = await reportService.createReport({
      ...req.body,
      createdBy: req.user?.id || 'system'
    });
    res.json(report);
  } catch (error) {
    console.error('Failed to create report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

router.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const report = await reportService.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Failed to get report:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

router.post('/reports/:id/execute', async (req: Request, res: Response) => {
  try {
    const result = await reportService.executeReport(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Failed to execute report:', error);
    res.status(500).json({ error: 'Failed to execute report' });
  }
});

router.delete('/reports/:id', async (req: Request, res: Response) => {
  try {
    await reportService.deleteReport(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Helper functions
function parseTimeRange(range: string): TimeRange {
  const now = new Date();
  let start: Date;

  // Parse relative time ranges
  if (range.endsWith('m')) {
    const minutes = parseInt(range);
    start = new Date(now.getTime() - minutes * 60 * 1000);
  } else if (range.endsWith('h')) {
    const hours = parseInt(range);
    start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  } else if (range.endsWith('d')) {
    const days = parseInt(range);
    start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  } else if (range.endsWith('w')) {
    const weeks = parseInt(range);
    start = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  } else if (range.endsWith('M')) {
    const months = parseInt(range);
    start = new Date(now);
    start.setMonth(start.getMonth() - months);
  } else {
    // Try to parse as date
    start = new Date(range);
    if (isNaN(start.getTime())) {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days
    }
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
    relative: true,
    duration: range
  };
}

async function getTopContent(timeRange: TimeRange): Promise<any[]> {
  // This would query the database for top content
  // For now, return mock data
  return [
    {
      id: '1',
      title: 'Getting Started Guide',
      views: 1234,
      engagement: 0.85
    },
    {
      id: '2',
      title: 'API Documentation',
      views: 987,
      engagement: 0.78
    },
    {
      id: '3',
      title: 'Best Practices',
      views: 756,
      engagement: 0.92
    }
  ];
}

export default router;