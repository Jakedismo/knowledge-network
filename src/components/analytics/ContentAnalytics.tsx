'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Eye, Edit, MessageSquare, Share2 } from 'lucide-react';

interface ContentAnalyticsProps {
  topContent?: any[];
  detailed?: boolean;
}

export function ContentAnalytics({ topContent = [], detailed = false }: ContentAnalyticsProps) {
  const defaultContent = [
    {
      id: '1',
      title: 'Getting Started Guide',
      views: 1234,
      engagement: 0.85,
      edits: 23,
      comments: 45,
      shares: 12
    },
    {
      id: '2',
      title: 'API Documentation',
      views: 987,
      engagement: 0.78,
      edits: 15,
      comments: 32,
      shares: 8
    },
    {
      id: '3',
      title: 'Best Practices',
      views: 756,
      engagement: 0.92,
      edits: 8,
      comments: 28,
      shares: 15
    },
    {
      id: '4',
      title: 'Troubleshooting Guide',
      views: 623,
      engagement: 0.70,
      edits: 12,
      comments: 19,
      shares: 5
    }
  ];

  const content = topContent.length > 0 ? topContent : defaultContent;

  if (detailed) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {content.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.edits}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.shares}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={item.engagement > 0.8 ? 'default' : 'secondary'}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {(item.engagement * 100).toFixed(0)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Engagement Rate</span>
                    <span className="text-sm font-medium">{(item.engagement * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={item.engagement * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {content.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-muted-foreground">
                  #{index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {item.views} views
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(item.engagement * 100).toFixed(0)}% engagement
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3" />
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}