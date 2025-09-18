'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Cpu,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface SystemHealthMonitorProps {
  health?: any;
  detailed?: boolean;
}

export function SystemHealthMonitor({ health, detailed = false }: SystemHealthMonitorProps) {
  const getHealthStatus = (metric: string, value: number): 'healthy' | 'warning' | 'critical' => {
    switch (metric) {
      case 'cpu':
        return value < 70 ? 'healthy' : value < 90 ? 'warning' : 'critical';
      case 'memory':
        return value < 70 ? 'healthy' : value < 85 ? 'warning' : 'critical';
      case 'errorRate':
        return value < 1 ? 'healthy' : value < 5 ? 'warning' : 'critical';
      case 'apiLatency':
        return value < 200 ? 'healthy' : value < 500 ? 'warning' : 'critical';
      default:
        return 'healthy';
    }
  };

  const metrics = [
    {
      name: 'CPU Usage',
      value: health?.metrics?.cpu ? Math.min(health.metrics.cpu, 100) : 45,
      unit: '%',
      icon: Cpu,
      status: getHealthStatus('cpu', health?.metrics?.cpu || 45)
    },
    {
      name: 'Memory Usage',
      value: health?.metrics?.memory ? (health.metrics.memory / 1024).toFixed(1) : 3.2,
      unit: 'GB',
      icon: HardDrive,
      status: getHealthStatus('memory', health?.metrics?.memory ? (health.metrics.memory / 16384) * 100 : 40)
    },
    {
      name: 'API Latency',
      value: health?.metrics?.apiLatency?.p95 || 120,
      unit: 'ms',
      icon: Zap,
      status: getHealthStatus('apiLatency', health?.metrics?.apiLatency?.p95 || 120)
    },
    {
      name: 'Error Rate',
      value: health?.metrics?.errorRate || 0.5,
      unit: '%',
      icon: AlertTriangle,
      status: getHealthStatus('errorRate', health?.metrics?.errorRate || 0.5)
    }
  ];

  if (detailed) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metrics.map((metric) => (
            <Card key={metric.name}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{metric.name}</CardTitle>
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{metric.value}</span>
                    <span className="text-sm text-muted-foreground">{metric.unit}</span>
                  </div>
                  <Progress
                    value={parseFloat(metric.value.toString()) * (metric.unit === '%' ? 1 : metric.unit === 'ms' ? 0.2 : 10)}
                    className={`h-2 ${
                      metric.status === 'healthy'
                        ? '[&>div]:bg-green-500'
                        : metric.status === 'warning'
                        ? '[&>div]:bg-yellow-500'
                        : '[&>div]:bg-red-500'
                    }`}
                  />
                  <Badge
                    variant={
                      metric.status === 'healthy'
                        ? 'default'
                        : metric.status === 'warning'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {metric.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                All systems operating normally
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                Memory usage approaching threshold (85%)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ServiceStatus name="API Gateway" status="operational" uptime="99.99%" />
              <ServiceStatus name="Database" status="operational" uptime="99.95%" />
              <ServiceStatus name="Redis Cache" status="operational" uptime="100%" />
              <ServiceStatus name="Search Service" status="degraded" uptime="99.5%" />
              <ServiceStatus name="Analytics Pipeline" status="operational" uptime="99.9%" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{metric.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {metric.value}{metric.unit}
                </span>
                <StatusIndicator status={metric.status} />
              </div>
            </div>
          ))}

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Health</span>
              <Badge variant="default">
                <Activity className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  return (
    <div
      className={`h-2 w-2 rounded-full ${
        status === 'healthy'
          ? 'bg-green-500'
          : status === 'warning'
          ? 'bg-yellow-500'
          : 'bg-red-500'
      }`}
    />
  );
}

function ServiceStatus({ name, status, uptime }: { name: string; status: string; uptime: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <StatusIndicator
          status={status === 'operational' ? 'healthy' : status === 'degraded' ? 'warning' : 'critical'}
        />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={status === 'operational' ? 'outline' : 'secondary'}>
          {status}
        </Badge>
        <span className="text-sm text-muted-foreground">{uptime}</span>
      </div>
    </div>
  );
}