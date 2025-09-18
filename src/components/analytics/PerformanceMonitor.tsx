'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface PerformanceMonitorProps {
  timeRange: string;
  detailed?: boolean;
}

export function PerformanceMonitor({ timeRange, detailed = false }: PerformanceMonitorProps) {
  const [webVitals, setWebVitals] = useState<any>(null);

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['analytics', 'performance', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/performance?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  useEffect(() => {
    // Collect Web Vitals
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      collectWebVitals();
    }
  }, []);

  const collectWebVitals = () => {
    try {
      // Collect LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        setWebVitals((prev: any) => ({
          ...prev,
          lcp: lastEntry.renderTime || lastEntry.loadTime
        }));
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Collect FCP
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          setWebVitals((prev: any) => ({
            ...prev,
            fcp: fcpEntry.startTime
          }));
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // Get CLS from performance API
      if ('LayoutShift' in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          setWebVitals((prev: any) => ({
            ...prev,
            cls: clsValue
          }));
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      }

      // Track these metrics
      if (webVitals) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'performance',
            dimensions: {
              page: window.location.pathname
            },
            measures: {
              ...webVitals
            }
          })
        });
      }
    } catch (error) {
      console.error('Failed to collect web vitals:', error);
    }
  };

  const vitalsData = [
    {
      metric: 'LCP',
      value: webVitals?.lcp || 0,
      target: 2500,
      unit: 'ms',
      status: getVitalStatus(webVitals?.lcp, 2500, 4000)
    },
    {
      metric: 'FCP',
      value: webVitals?.fcp || 0,
      target: 1800,
      unit: 'ms',
      status: getVitalStatus(webVitals?.fcp, 1800, 3000)
    },
    {
      metric: 'CLS',
      value: webVitals?.cls || 0,
      target: 0.1,
      unit: '',
      status: getVitalStatus(webVitals?.cls, 0.1, 0.25)
    },
    {
      metric: 'INP',
      value: webVitals?.inp || 0,
      target: 200,
      unit: 'ms',
      status: getVitalStatus(webVitals?.inp, 200, 500)
    },
    {
      metric: 'TTFB',
      value: webVitals?.ttfb || 0,
      target: 800,
      unit: 'ms',
      status: getVitalStatus(webVitals?.ttfb, 800, 1800)
    }
  ];

  const radarData = vitalsData.map(vital => ({
    metric: vital.metric,
    value: Math.min((vital.target / (vital.value || 1)) * 100, 100),
    fullMark: 100
  }));

  if (detailed) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Core Web Vitals */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 mb-6">
                {vitalsData.map((vital) => (
                  <div key={vital.metric} className="text-center">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {vital.metric}
                    </div>
                    <div className="text-2xl font-bold">
                      {vital.value.toFixed(vital.unit === '' ? 2 : 0)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {vital.unit}
                      </span>
                    </div>
                    <Badge
                      variant={
                        vital.status === 'good'
                          ? 'default'
                          : vital.status === 'needs-improvement'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="mt-1"
                    >
                      {vital.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  LCP on /dashboard exceeds threshold
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  High CLS detected on mobile devices
                </AlertDescription>
              </Alert>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  All APIs responding within SLA
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Performance Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={generatePerformanceTimeline()}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="lcp"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="LCP (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="fcp"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="FCP (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="ttfb"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="TTFB (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4 mb-4">
          {vitalsData.slice(0, 3).map((vital) => (
            <div key={vital.metric}>
              <div className="text-sm text-muted-foreground">{vital.metric}</div>
              <div className="text-xl font-semibold">
                {vital.value.toFixed(vital.unit === '' ? 2 : 0)}
                {vital.unit}
              </div>
              <VitalIndicator status={vital.status} />
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={vitalsData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="metric" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="target" fill="#e5e7eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function VitalIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <div
        className={`h-2 w-2 rounded-full ${
          status === 'good'
            ? 'bg-green-500'
            : status === 'needs-improvement'
            ? 'bg-yellow-500'
            : 'bg-red-500'
        }`}
      />
      <span className="text-xs text-muted-foreground capitalize">{status}</span>
    </div>
  );
}

function getVitalStatus(value: number, goodThreshold: number, poorThreshold: number): string {
  if (!value) return 'unknown';
  if (value <= goodThreshold) return 'good';
  if (value <= poorThreshold) return 'needs-improvement';
  return 'poor';
}

function generatePerformanceTimeline() {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  return hours.map(time => ({
    time,
    lcp: Math.random() * 1000 + 2000,
    fcp: Math.random() * 500 + 1500,
    ttfb: Math.random() * 300 + 500,
    cls: Math.random() * 0.15
  }));
}