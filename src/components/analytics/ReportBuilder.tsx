'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Save,
  Play,
  Download,
  Trash2,
  Calendar,
  Filter,
  BarChart3
} from 'lucide-react';
import {
  MetricType,
  AggregationPeriod,
  ExportFormat,
  type CustomReport,
  type ReportQuery
} from '@/types/analytics';
import { toast } from '@/hooks/use-toast';

export function ReportBuilder() {
  const [activeReport, setActiveReport] = useState<Partial<CustomReport>>({
    name: '',
    description: '',
    query: {
      metrics: [],
      dimensions: [],
      filters: {},
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        relative: true,
        duration: '7d'
      },
      aggregation: AggregationPeriod.DAY,
      limit: 100
    },
    format: [ExportFormat.CSV, ExportFormat.PDF],
    schedule: {
      enabled: false,
      frequency: 'daily'
    }
  });

  const [previewData, setPreviewData] = useState<any>(null);

  // Load existing reports
  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ['analytics', 'reports'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/reports', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      return response.json();
    }
  });

  // Create report mutation
  const createReport = useMutation({
    mutationFn: async (report: Partial<CustomReport>) => {
      const response = await fetch('/api/analytics/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(report)
      });
      if (!response.ok) {
        throw new Error('Failed to create report');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Report Created',
        description: 'Your custom report has been created successfully.'
      });
      refetchReports();
      resetReport();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create report. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Execute report mutation
  const executeReport = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`/api/analytics/reports/${reportId}/execute`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to execute report');
      }
      return response.json();
    }
  });

  const handleMetricToggle = (metric: MetricType) => {
    const metrics = activeReport.query?.metrics || [];
    const updated = metrics.includes(metric)
      ? metrics.filter(m => m !== metric)
      : [...metrics, metric];

    setActiveReport({
      ...activeReport,
      query: {
        ...activeReport.query!,
        metrics: updated
      }
    });
  };

  const handleDimensionToggle = (dimension: string) => {
    const dimensions = activeReport.query?.dimensions || [];
    const updated = dimensions.includes(dimension)
      ? dimensions.filter(d => d !== dimension)
      : [...dimensions, dimension];

    setActiveReport({
      ...activeReport,
      query: {
        ...activeReport.query!,
        dimensions: updated
      }
    });
  };

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(activeReport.query)
      });

      if (!response.ok) {
        throw new Error('Failed to preview report');
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      toast({
        title: 'Preview Failed',
        description: 'Failed to generate report preview.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = () => {
    if (!activeReport.name) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a report name.',
        variant: 'destructive'
      });
      return;
    }

    createReport.mutate(activeReport);
  };

  const resetReport = () => {
    setActiveReport({
      name: '',
      description: '',
      query: {
        metrics: [],
        dimensions: [],
        filters: {},
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
          relative: true,
          duration: '7d'
        },
        aggregation: AggregationPeriod.DAY,
        limit: 100
      },
      format: [ExportFormat.CSV, ExportFormat.PDF],
      schedule: {
        enabled: false,
        frequency: 'daily'
      }
    });
    setPreviewData(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create custom analytics reports and schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePreview} variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Configuration */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Report Name</Label>
                    <Input
                      id="name"
                      value={activeReport.name}
                      onChange={(e) => setActiveReport({ ...activeReport, name: e.target.value })}
                      placeholder="Monthly Performance Report"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={activeReport.description}
                      onChange={(e) => setActiveReport({ ...activeReport, description: e.target.value })}
                      placeholder="Describe what this report shows..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Metrics Selection */}
                <div>
                  <Label>Metrics</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {Object.values(MetricType).map((metric) => (
                      <label key={metric} className="flex items-center space-x-2">
                        <Checkbox
                          checked={activeReport.query?.metrics?.includes(metric) || false}
                          onCheckedChange={() => handleMetricToggle(metric)}
                        />
                        <span className="text-sm">{metric.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <Label>Dimensions</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['page', 'action', 'category', 'userId', 'workspaceId'].map((dimension) => (
                      <label key={dimension} className="flex items-center space-x-2">
                        <Checkbox
                          checked={activeReport.query?.dimensions?.includes(dimension) || false}
                          onCheckedChange={() => handleDimensionToggle(dimension)}
                        />
                        <span className="text-sm">{dimension}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Aggregation */}
                <div>
                  <Label htmlFor="aggregation">Aggregation Period</Label>
                  <Select
                    id="aggregation"
                    value={activeReport.query?.aggregation}
                    onChange={(e) => setActiveReport({
                      ...activeReport,
                      query: {
                        ...activeReport.query!,
                        aggregation: e.target.value as AggregationPeriod
                      }
                    })}
                  >
                    {Object.values(AggregationPeriod).map((period) => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Schedule & Export */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule & Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Schedule */}
                <div className="space-y-3">
                  <Label>Schedule</Label>
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={activeReport.schedule?.enabled || false}
                      onCheckedChange={(checked) => setActiveReport({
                        ...activeReport,
                        schedule: {
                          ...activeReport.schedule!,
                          enabled: !!checked
                        }
                      })}
                    />
                    <span className="text-sm">Enable scheduled execution</span>
                  </label>

                  {activeReport.schedule?.enabled && (
                    <Select
                      value={activeReport.schedule.frequency}
                      onChange={(e) => setActiveReport({
                        ...activeReport,
                        schedule: {
                          ...activeReport.schedule!,
                          frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                        }
                      })}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  )}
                </div>

                {/* Export Formats */}
                <div className="space-y-3">
                  <Label>Export Formats</Label>
                  {Object.values(ExportFormat).map((format) => (
                    <label key={format} className="flex items-center space-x-2">
                      <Checkbox
                        checked={activeReport.format?.includes(format) || false}
                        onCheckedChange={(checked) => {
                          const formats = activeReport.format || [];
                          const updated = checked
                            ? [...formats, format]
                            : formats.filter(f => f !== format);
                          setActiveReport({ ...activeReport, format: updated });
                        }}
                      />
                      <span className="text-sm">{format.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports?.map((report: CustomReport) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{report.name}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {report.schedule?.enabled && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {report.schedule.frequency}
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {report.query.metrics.length} metrics
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeReport.mutate(report.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {(!reports || reports.length === 0) && (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No saved reports yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {previewData ? (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Click "Preview" to see report data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}