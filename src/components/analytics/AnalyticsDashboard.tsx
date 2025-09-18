'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { MetricCards } from './MetricCards';
import { UserEngagementChart } from './UserEngagementChart';
import { PerformanceMonitor } from './PerformanceMonitor';
import { RealtimeActivity } from './RealtimeActivity';
import { ContentAnalytics } from './ContentAnalytics';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import { ExportDialog } from './ExportDialog';
import type { TimeRange } from '@/types/analytics';
import { Calendar, Download, RefreshCw, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardData {
  userEngagement: any;
  systemHealth: any;
  recentErrors: any[];
  topContent: any[];
  timeRange: TimeRange;
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['analytics', 'dashboard', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false // Refresh every 30 seconds if enabled
  });

  useEffect(() => {
    // Track page view
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type: 'page_view',
        dimensions: {
          page: '/analytics',
          category: 'dashboard'
        },
        measures: {
          value: 1
        },
        sessionId: sessionStorage.getItem('sessionId') || generateSessionId()
      })
    });
  }, []);

  const handleExport = () => {
    setShowExportDialog(true);
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor system performance and user engagement
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={timeRange}
              onValueChange={handleTimeRangeChange}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="3M">Last 3 Months</option>
            </Select>
          </div>

          {/* Auto Refresh Toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto Refreshing' : 'Auto Refresh'}
          </Button>

          {/* Export Button */}
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {/* Settings */}
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {data && (
        <MetricCards
          userEngagement={data.userEngagement}
          systemHealth={data.systemHealth}
        />
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="content">Content Analytics</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserEngagementChart data={data?.userEngagement} />
            <ContentAnalytics topContent={data?.topContent} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceMonitor timeRange={timeRange} />
            <SystemHealthMonitor health={data?.systemHealth} />
          </div>
        </TabsContent>

        <TabsContent value="engagement">
          <UserEngagementChart data={data?.userEngagement} detailed />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMonitor timeRange={timeRange} detailed />
        </TabsContent>

        <TabsContent value="content">
          <ContentAnalytics topContent={data?.topContent} detailed />
        </TabsContent>

        <TabsContent value="realtime">
          <RealtimeActivity />
        </TabsContent>

        <TabsContent value="system">
          <SystemHealthMonitor health={data?.systemHealth} detailed />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={data}
          timeRange={timeRange}
        />
      )}
    </div>
  );
}

function generateSessionId(): string {
  const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('sessionId', id);
  return id;
}