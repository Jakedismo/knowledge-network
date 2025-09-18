// Analytics Type Definitions

export enum MetricType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  API_CALL = 'api_call',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  SEARCH = 'search',
  CONTENT_CREATE = 'content_create',
  CONTENT_UPDATE = 'content_update',
  CONTENT_DELETE = 'content_delete',
  COLLABORATION = 'collaboration',
  CUSTOM = 'custom'
}

export enum AggregationPeriod {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel'
}

export interface MetricDimensions {
  page?: string;
  action?: string;
  category?: string;
  label?: string;
  userId?: string;
  workspaceId?: string;
  documentId?: string;
  customDimensions?: Record<string, string>;
}

export interface MetricMeasures {
  value: number;
  duration?: number;
  count?: number;
  size?: number;
  customMeasures?: Record<string, number>;
}

export interface AnalyticsMetric {
  id: string;
  type: MetricType;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  dimensions: MetricDimensions;
  measures: MetricMeasures;
}

export interface AggregatedMetric {
  id: string;
  period: AggregationPeriod;
  startDate: Date;
  endDate: Date;
  dimensions: Record<string, string>;
  metrics: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    percentiles?: {
      p50?: number;
      p75?: number;
      p90?: number;
      p95?: number;
      p99?: number;
    };
  };
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  page: string;
  metrics: {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    cls?: number; // Cumulative Layout Shift
    inp?: number; // Interaction to Next Paint
    ttfb?: number; // Time to First Byte
    fid?: number; // First Input Delay
    domContentLoaded?: number;
    loadComplete?: number;
  };
  resourceTimings?: {
    name: string;
    duration: number;
    size?: number;
    type: string;
  }[];
  userAgent?: string;
  connectionType?: string;
}

export interface UserEngagementMetrics {
  userId: string;
  period: Date;
  metrics: {
    sessions: number;
    totalDuration: number;
    averageSessionDuration: number;
    pageViews: number;
    uniquePages: number;
    actions: number;
    bounceRate: number;
    documentsCreated: number;
    documentsEdited: number;
    collaborationTime: number;
    searchQueries: number;
  };
}

export interface ContentMetrics {
  contentId: string;
  period: Date;
  metrics: {
    views: number;
    uniqueViewers: number;
    edits: number;
    editors: number;
    averageReadTime: number;
    shares: number;
    comments: number;
    reactions: number;
    searchAppearances: number;
    searchClicks: number;
    qualityScore?: number;
  };
}

export interface SystemHealthMetrics {
  timestamp: Date;
  metrics: {
    uptime: number;
    cpu: number;
    memory: number;
    activeUsers: number;
    apiLatency: {
      p50: number;
      p95: number;
      p99: number;
    };
    errorRate: number;
    throughput: number;
    queueSize: number;
  };
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout?: DashboardLayout;
  refreshInterval?: number;
  filters?: DashboardFilter[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  metricType: MetricType | MetricType[];
  visualization: VisualizationType;
  dataSource: DataSourceConfig;
  position: WidgetPosition;
  size: WidgetSize;
  config?: Record<string, any>;
}

export enum WidgetType {
  METRIC_CARD = 'metric_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  AREA_CHART = 'area_chart',
  SCATTER_PLOT = 'scatter_plot',
  HEATMAP = 'heatmap',
  TABLE = 'table',
  GAUGE = 'gauge',
  MAP = 'map',
  ACTIVITY_FEED = 'activity_feed'
}

export enum VisualizationType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  TABLE = 'table',
  GAUGE = 'gauge',
  MAP = 'map',
  FEED = 'feed',
  CARD = 'card'
}

export interface DataSourceConfig {
  type: 'metric' | 'aggregation' | 'realtime' | 'custom';
  metricType?: MetricType;
  aggregation?: AggregationPeriod;
  filters?: Record<string, any>;
  timeRange?: TimeRange;
  query?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'custom';
  columns?: number;
  rows?: number;
  gap?: number;
}

export interface DashboardFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: any;
}

export interface TimeRange {
  start: Date | string;
  end: Date | string;
  relative?: boolean;
  duration?: string; // e.g., '7d', '1h', '30m'
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  query: ReportQuery;
  schedule?: ReportSchedule;
  format: ExportFormat[];
  recipients?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  timeRange: TimeRange;
  aggregation?: AggregationPeriod;
  sortBy?: string;
  limit?: number;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone?: string;
}

export interface ExportJob {
  id: string;
  type: 'report' | 'dashboard' | 'metrics';
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  config: Record<string, any>;
  result?: {
    url?: string;
    size?: number;
    rows?: number;
  };
  error?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface Alert {
  id: string;
  name: string;
  description?: string;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  lastTriggered?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'equals' | 'anomaly';
  threshold: number;
  duration?: string;
  aggregation?: AggregationPeriod;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'notification';
  config: Record<string, any>;
}

export interface AnalyticsPermissions {
  viewDashboard: boolean;
  editDashboard: boolean;
  createReport: boolean;
  exportData: boolean;
  viewSystemMetrics: boolean;
  manageAlerts: boolean;
}