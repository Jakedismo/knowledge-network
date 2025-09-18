'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  FileText,
  TrendingUp,
  Activity,
  Clock,
  Search,
  AlertCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardsProps {
  userEngagement: any;
  systemHealth: any;
}

export function MetricCards({ userEngagement, systemHealth }: MetricCardsProps) {
  const metrics = [
    {
      title: 'Active Users',
      value: systemHealth?.metrics?.activeUsers || 0,
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Page Views',
      value: userEngagement?.metrics?.pageViews || 0,
      change: '+8%',
      trend: 'up',
      icon: FileText,
      color: 'text-green-600'
    },
    {
      title: 'Avg. Session Duration',
      value: formatDuration(userEngagement?.metrics?.averageSessionDuration || 0),
      change: '+5%',
      trend: 'up',
      icon: Clock,
      color: 'text-purple-600'
    },
    {
      title: 'API Latency (p95)',
      value: `${systemHealth?.metrics?.apiLatency?.p95 || 0}ms`,
      change: '-10%',
      trend: 'down',
      icon: Zap,
      color: 'text-orange-600'
    },
    {
      title: 'Search Queries',
      value: userEngagement?.metrics?.searchQueries || 0,
      change: '+15%',
      trend: 'up',
      icon: Search,
      color: 'text-cyan-600'
    },
    {
      title: 'Error Rate',
      value: `${(systemHealth?.metrics?.errorRate || 0).toFixed(2)}%`,
      change: '-25%',
      trend: 'down',
      icon: AlertCircle,
      color: systemHealth?.metrics?.errorRate > 1 ? 'text-red-600' : 'text-green-600'
    },
    {
      title: 'Content Created',
      value: userEngagement?.metrics?.documentsCreated || 0,
      change: '+20%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-indigo-600'
    },
    {
      title: 'System Uptime',
      value: formatUptime(systemHealth?.metrics?.uptime || 0),
      change: '99.9%',
      trend: 'stable',
      icon: Activity,
      color: 'text-emerald-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <metric.icon className={cn('h-4 w-4', metric.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="flex items-center mt-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  metric.trend === 'up' && 'text-green-600',
                  metric.trend === 'down' && metric.title.includes('Error') || metric.title.includes('Latency')
                    ? 'text-green-600'
                    : metric.trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600'
                )}
              >
                {metric.change}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                vs last period
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}