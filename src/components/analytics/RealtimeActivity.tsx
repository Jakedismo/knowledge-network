'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import {
  Activity,
  Users,
  FileText,
  Search,
  MessageSquare,
  Edit,
  Eye,
  Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  action: string;
  target?: string;
  timestamp: Date;
  metadata?: any;
}

export function RealtimeActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate real-time connection
    connectToRealtime();

    return () => {
      // Cleanup
      setIsConnected(false);
    };
  }, []);

  const connectToRealtime = () => {
    // In production, this would be a WebSocket or SSE connection
    setIsConnected(true);
    setActiveUsers(Math.floor(Math.random() * 50) + 10);

    // Simulate incoming activities
    const interval = setInterval(() => {
      const newActivity = generateRandomActivity();
      setActivities(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50 items
    }, Math.random() * 5000 + 2000); // Random interval between 2-7 seconds

    return () => clearInterval(interval);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'page_view':
        return Eye;
      case 'content_create':
        return FileText;
      case 'content_edit':
        return Edit;
      case 'search':
        return Search;
      case 'comment':
        return MessageSquare;
      case 'share':
        return Share2;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'page_view':
        return 'text-blue-600';
      case 'content_create':
        return 'text-green-600';
      case 'content_edit':
        return 'text-yellow-600';
      case 'search':
        return 'text-purple-600';
      case 'comment':
        return 'text-pink-600';
      case 'share':
        return 'text-cyan-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            <Activity className="h-3 w-3 mr-1" />
            {isConnected ? 'Live' : 'Connecting...'}
          </Badge>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{activeUsers} active users</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  const color = getActivityColor(activity.type);

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <div className="bg-gradient-to-br from-primary/20 to-primary/40 h-full w-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {activity.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </Avatar>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${color}`} />
                          <span className="text-sm font-medium">
                            {activity.user.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {activity.action}
                          </span>
                          {activity.target && (
                            <span className="text-sm font-medium truncate max-w-[200px]">
                              {activity.target}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activities.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Waiting for activity...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Metrics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LiveMetric
                label="Actions per minute"
                value={Math.floor(Math.random() * 100) + 20}
                trend="up"
              />
              <LiveMetric
                label="Avg. response time"
                value={`${Math.floor(Math.random() * 50) + 100}ms`}
                trend="down"
              />
              <LiveMetric
                label="Active sessions"
                value={activeUsers * 2}
                trend="stable"
              />
              <LiveMetric
                label="Error rate"
                value="0.02%"
                trend="stable"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trending Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TrendingItem action="Search: 'API documentation'" count={45} />
                <TrendingItem action="View: Getting Started" count={38} />
                <TrendingItem action="Create: New Document" count={32} />
                <TrendingItem action="Share: Best Practices" count={28} />
                <TrendingItem action="Edit: Configuration" count={24} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LiveMetric({ label, value, trend }: { label: string; value: string | number; trend: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{value}</span>
        {trend === 'up' && (
          <span className="text-xs text-green-600">↑</span>
        )}
        {trend === 'down' && (
          <span className="text-xs text-red-600">↓</span>
        )}
      </div>
    </div>
  );
}

function TrendingItem({ action, count }: { action: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm truncate flex-1">{action}</span>
      <Badge variant="secondary">{count}</Badge>
    </div>
  );
}

function generateRandomActivity(): ActivityItem {
  const types = ['page_view', 'content_create', 'content_edit', 'search', 'comment', 'share'];
  const users = [
    { id: '1', name: 'Alice Johnson' },
    { id: '2', name: 'Bob Smith' },
    { id: '3', name: 'Charlie Brown' },
    { id: '4', name: 'Diana Prince' },
    { id: '5', name: 'Eve Anderson' }
  ];

  const actions = {
    page_view: ['viewed', 'accessed', 'opened'],
    content_create: ['created', 'published', 'drafted'],
    content_edit: ['edited', 'updated', 'modified'],
    search: ['searched for', 'looked up', 'queried'],
    comment: ['commented on', 'replied to', 'mentioned'],
    share: ['shared', 'exported', 'sent']
  };

  const targets = [
    'API Documentation',
    'Getting Started Guide',
    'User Dashboard',
    'Analytics Report',
    'Configuration Settings',
    'Team Workspace',
    'Project Overview'
  ];

  const type = types[Math.floor(Math.random() * types.length)];
  const user = users[Math.floor(Math.random() * users.length)];
  const actionList = actions[type as keyof typeof actions];
  const action = actionList[Math.floor(Math.random() * actionList.length)];
  const target = type === 'search'
    ? `"${targets[Math.floor(Math.random() * targets.length)]}"`
    : targets[Math.floor(Math.random() * targets.length)];

  return {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    user,
    action,
    target,
    timestamp: new Date()
  };
}