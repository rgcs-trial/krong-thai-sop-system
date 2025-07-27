/**
 * Real-time Monitoring Dashboard Component
 * Live system monitoring, performance tracking, alerts management,
 * and real-time notifications for restaurant operations
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Server,
  Wifi,
  Battery,
  Thermometer,
  Gauge,
  Bell,
  BellRing,
  Eye,
  RefreshCw,
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  Router,
  Database,
  Shield,
  Zap,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Signal,
  HardDrive,
  Cpu,
  MemoryStick,
  Download,
  Upload,
  Globe
} from 'lucide-react';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface RealtimeMonitoringDashboardProps {
  className?: string;
}

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: {
    warning: number;
    critical: number;
  };
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface LiveAlert {
  id: string;
  type: 'system' | 'performance' | 'security' | 'user';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  isResolved: boolean;
  autoResolve: boolean;
  acknowledgement?: {
    by: string;
    at: string;
    note?: string;
  };
}

interface DeviceStatus {
  id: string;
  name: string;
  type: 'tablet' | 'router' | 'server' | 'mobile';
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  battery?: number;
  signal?: number;
  temperature?: number;
  ip: string;
  uptime: string;
}

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  network: number;
  response_time: number;
  active_users: number;
  database_queries: number;
}

// Chart colors
const CHART_COLORS = ['#E31B23', '#D4AF37', '#008B8B', '#231F20', '#D2B48C'];

export function RealtimeMonitoringDashboard({ className }: RealtimeMonitoringDashboardProps) {
  const { t, locale } = useI18n();
  
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [showResolvedAlerts, setShowResolvedAlerts] = useState(false);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);

  // Mock system metrics
  const mockSystemMetrics = useMemo<SystemMetric[]>(() => [
    {
      id: 'cpu_usage',
      name: t('monitoring.cpu_usage'),
      value: 42.5,
      unit: '%',
      status: 'healthy',
      threshold: { warning: 70, critical: 85 },
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'memory_usage',
      name: t('monitoring.memory_usage'),
      value: 68.2,
      unit: '%',
      status: 'warning',
      threshold: { warning: 75, critical: 90 },
      trend: 'up',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'disk_usage',
      name: t('monitoring.disk_usage'),
      value: 23.7,
      unit: '%',
      status: 'healthy',
      threshold: { warning: 80, critical: 95 },
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'response_time',
      name: t('monitoring.response_time'),
      value: 125,
      unit: 'ms',
      status: 'healthy',
      threshold: { warning: 500, critical: 1000 },
      trend: 'down',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'active_sessions',
      name: t('monitoring.active_sessions'),
      value: 23,
      unit: '',
      status: 'healthy',
      threshold: { warning: 50, critical: 80 },
      trend: 'up',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'database_connections',
      name: t('monitoring.database_connections'),
      value: 8,
      unit: '',
      status: 'healthy',
      threshold: { warning: 20, critical: 30 },
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    },
  ], [t]);

  // Mock live alerts
  const mockAlerts = useMemo<LiveAlert[]>(() => [
    {
      id: '1',
      type: 'performance',
      severity: 'high',
      title: t('alerts.high_memory_usage'),
      message: t('alerts.memory_usage_above_threshold'),
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      source: 'Main Server',
      isResolved: false,
      autoResolve: false,
    },
    {
      id: '2',
      type: 'user',
      severity: 'medium',
      title: t('alerts.multiple_failed_logins'),
      message: t('alerts.failed_login_attempts_detected'),
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      source: 'Authentication System',
      isResolved: false,
      autoResolve: true,
    },
    {
      id: '3',
      type: 'system',
      severity: 'info',
      title: t('alerts.scheduled_backup_completed'),
      message: t('alerts.daily_backup_successful'),
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      source: 'Backup Service',
      isResolved: true,
      autoResolve: true,
    },
    {
      id: '4',
      type: 'security',
      severity: 'critical',
      title: t('alerts.unauthorized_access_attempt'),
      message: t('alerts.suspicious_activity_detected'),
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      source: 'Security Monitor',
      isResolved: false,
      autoResolve: false,
    },
  ], [t]);

  // Mock device status
  const mockDevices = useMemo<DeviceStatus[]>(() => [
    {
      id: '1',
      name: 'Kitchen Tablet #1',
      type: 'tablet',
      location: 'Kitchen Station A',
      status: 'online',
      lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      battery: 78,
      signal: 95,
      temperature: 32,
      ip: '192.168.1.101',
      uptime: '2d 14h 32m',
    },
    {
      id: '2',
      name: 'Service Counter Tablet',
      type: 'tablet',
      location: 'Front Counter',
      status: 'online',
      lastSeen: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      battery: 45,
      signal: 88,
      temperature: 28,
      ip: '192.168.1.102',
      uptime: '1d 8h 15m',
    },
    {
      id: '3',
      name: 'Manager Mobile',
      type: 'mobile',
      location: 'Office',
      status: 'warning',
      lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      battery: 15,
      signal: 72,
      ip: '192.168.1.105',
      uptime: '12h 45m',
    },
    {
      id: '4',
      name: 'Kitchen Display #2',
      type: 'tablet',
      location: 'Kitchen Station B',
      status: 'offline',
      lastSeen: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      battery: 0,
      signal: 0,
      ip: '192.168.1.103',
      uptime: '0m',
    },
    {
      id: '5',
      name: 'Main Router',
      type: 'router',
      location: 'Network Closet',
      status: 'online',
      lastSeen: new Date().toISOString(),
      signal: 100,
      temperature: 38,
      ip: '192.168.1.1',
      uptime: '15d 6h 23m',
    },
  ], []);

  // Generate mock performance history
  const generatePerformanceHistory = useCallback(() => {
    const now = new Date();
    const history: PerformanceData[] = [];
    
    for (let i = 60; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 1000);
      history.push({
        timestamp: timestamp.toISOString(),
        cpu: 30 + Math.random() * 40 + Math.sin(i / 10) * 15,
        memory: 50 + Math.random() * 30 + Math.sin(i / 8) * 10,
        network: 10 + Math.random() * 80,
        response_time: 80 + Math.random() * 100 + Math.sin(i / 6) * 50,
        active_users: 15 + Math.random() * 20 + Math.sin(i / 12) * 10,
        database_queries: 5 + Math.random() * 15 + Math.sin(i / 4) * 5,
      });
    }
    
    return history;
  }, []);

  // Initialize data
  useEffect(() => {
    setSystemMetrics(mockSystemMetrics);
    setAlerts(mockAlerts);
    setDevices(mockDevices);
    setPerformanceHistory(generatePerformanceHistory());
  }, [mockSystemMetrics, mockAlerts, mockDevices, generatePerformanceHistory]);

  // Real-time updates
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      // Update system metrics with slight variations
      setSystemMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, metric.value + (Math.random() - 0.5) * 5),
        lastUpdated: new Date().toISOString(),
      })));

      // Update performance history
      setPerformanceHistory(prev => {
        const newData = prev.slice(1);
        const latest = prev[prev.length - 1];
        
        newData.push({
          timestamp: new Date().toISOString(),
          cpu: Math.max(0, Math.min(100, latest.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(0, Math.min(100, latest.memory + (Math.random() - 0.5) * 8)),
          network: Math.max(0, Math.min(100, latest.network + (Math.random() - 0.5) * 20)),
          response_time: Math.max(0, latest.response_time + (Math.random() - 0.5) * 50),
          active_users: Math.max(0, latest.active_users + (Math.random() - 0.5) * 3),
          database_queries: Math.max(0, latest.database_queries + (Math.random() - 0.5) * 2),
        });
        
        return newData;
      });

      // Randomly generate new alerts (5% chance per update)
      if (Math.random() < 0.05) {
        const alertTypes = ['system', 'performance', 'security', 'user'] as const;
        const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;
        
        const newAlert: LiveAlert = {
          id: Date.now().toString(),
          type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          title: t('alerts.new_system_event'),
          message: t('alerts.automated_alert_generated'),
          timestamp: new Date().toISOString(),
          source: 'Automated Monitor',
          isResolved: false,
          autoResolve: Math.random() > 0.5,
        };
        
        setAlerts(prev => [newAlert, ...prev].slice(0, 50)); // Keep only latest 50 alerts
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isRealTimeEnabled, refreshInterval, t]);

  const getMetricStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Server className="h-4 w-4" />;
      case 'performance':
        return <Gauge className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'router':
        return <Router className="h-5 w-5" />;
      case 'server':
        return <Server className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            acknowledgement: {
              by: 'Current User',
              at: new Date().toISOString(),
              note: 'Acknowledged from dashboard'
            }
          }
        : alert
    ));
    
    toast({
      title: t('alerts.alert_acknowledged'),
      description: t('alerts.alert_acknowledged_desc'),
    });
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isResolved: true } : alert
    ));
    
    toast({
      title: t('alerts.alert_resolved'),
      description: t('alerts.alert_resolved_desc'),
    });
  };

  const filteredAlerts = alerts.filter(alert => 
    showResolvedAlerts || !alert.isResolved
  );

  const criticalAlertsCount = alerts.filter(alert => 
    !alert.isResolved && (alert.severity === 'critical' || alert.severity === 'high')
  ).length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold">{t('monitoring.realtime_monitoring')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('monitoring.realtime_monitoring_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isRealTimeEnabled}
              onCheckedChange={setIsRealTimeEnabled}
            />
            <span className="text-sm">{t('monitoring.realtime_updates')}</span>
          </div>
          
          <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1s</SelectItem>
              <SelectItem value="5">5s</SelectItem>
              <SelectItem value="10">10s</SelectItem>
              <SelectItem value="30">30s</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-1">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            )} />
            <span className="text-sm text-muted-foreground">
              {isRealTimeEnabled ? t('monitoring.live') : t('monitoring.paused')}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlertsCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <BellRing className="h-5 w-5 text-red-600 animate-bounce" />
              <div>
                <h3 className="font-semibold text-red-800">
                  {t('alerts.critical_alerts_active', { count: criticalAlertsCount })}
                </h3>
                <p className="text-sm text-red-700">
                  {t('alerts.immediate_attention_required')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemMetrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getMetricStatusIcon(metric.status)}
                  <h3 className="font-semibold text-sm">{metric.name}</h3>
                </div>
                <Badge variant={
                  metric.status === 'healthy' ? 'default' :
                  metric.status === 'warning' ? 'secondary' : 'destructive'
                }>
                  {metric.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {Math.round(metric.value * 10) / 10}{metric.unit}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(metric.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
                
                <Progress 
                  value={metric.unit === '%' ? metric.value : (metric.value / metric.threshold.critical) * 100} 
                  className="h-2"
                />
                
                <div className="text-xs text-muted-foreground">
                  Warning: {metric.threshold.warning}{metric.unit} | 
                  Critical: {metric.threshold.critical}{metric.unit}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monitoring Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">{t('monitoring.performance')}</TabsTrigger>
          <TabsTrigger value="alerts">{t('monitoring.alerts')}</TabsTrigger>
          <TabsTrigger value="devices">{t('monitoring.devices')}</TabsTrigger>
          <TabsTrigger value="network">{t('monitoring.network')}</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU & Memory Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="h-5 w-5 mr-2 text-blue-500" />
                  {t('monitoring.system_resources')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceHistory.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                      formatter={(value: any, name: any) => [`${Math.round(value)}%`, name]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cpu" 
                      stackId="1"
                      stroke="#E31B23" 
                      fill="#E31B23"
                      fillOpacity={0.6}
                      name={t('monitoring.cpu_usage')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="memory" 
                      stackId="1"
                      stroke="#008B8B" 
                      fill="#008B8B"
                      fillOpacity={0.6}
                      name={t('monitoring.memory_usage')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Time & Active Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-500" />
                  {t('monitoring.application_performance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceHistory.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                    />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="response_time" 
                      stroke="#D4AF37" 
                      strokeWidth={2}
                      name={t('monitoring.response_time_ms')}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="active_users" 
                      stroke="#231F20" 
                      strokeWidth={2}
                      name={t('monitoring.active_users')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-orange-500" />
                  {t('monitoring.system_alerts')}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showResolvedAlerts}
                    onCheckedChange={setShowResolvedAlerts}
                  />
                  <span className="text-sm">{t('monitoring.show_resolved')}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAlerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-4 border rounded-lg',
                      alert.isResolved ? 'bg-gray-50 border-gray-200' : 
                      alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      'bg-blue-50 border-blue-200'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          'p-2 rounded-full',
                          alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-blue-100 text-blue-600'
                        )}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold">{alert.title}</h4>
                            <Badge 
                              variant={
                                alert.severity === 'critical' ? 'destructive' :
                                alert.severity === 'high' ? 'secondary' : 'default'
                              }
                            >
                              {alert.severity}
                            </Badge>
                            {alert.isResolved && (
                              <Badge variant="outline">{t('monitoring.resolved')}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{alert.source}</span>
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                            {alert.acknowledgement && (
                              <span className="text-blue-600">
                                {t('monitoring.acknowledged_by')} {alert.acknowledgement.by}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!alert.isResolved && (
                        <div className="flex items-center space-x-2">
                          {!alert.acknowledgement && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              {t('monitoring.acknowledge')}
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            onClick={() => resolveAlert(alert.id)}
                          >
                            {t('monitoring.resolve')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="h-5 w-5 mr-2 text-purple-500" />
                {t('monitoring.device_status')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className={cn(
                      'p-4 border rounded-lg',
                      device.status === 'online' ? 'border-green-200 bg-green-50' :
                      device.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      'border-red-200 bg-red-50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'p-2 rounded-full',
                          device.status === 'online' ? 'bg-green-100 text-green-600' :
                          device.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        )}>
                          {getDeviceIcon(device.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{device.name}</h4>
                          <p className="text-sm text-muted-foreground">{device.location}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          device.status === 'online' ? 'default' :
                          device.status === 'warning' ? 'secondary' : 'destructive'
                        }
                      >
                        {device.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('monitoring.ip_address')}:</span>
                        <span className="font-mono">{device.ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('monitoring.uptime')}:</span>
                        <span>{device.uptime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('monitoring.last_seen')}:</span>
                        <span>{new Date(device.lastSeen).toLocaleTimeString()}</span>
                      </div>
                      
                      {device.battery !== undefined && (
                        <div className="flex justify-between items-center">
                          <span>{t('monitoring.battery')}:</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={device.battery} className="w-16 h-2" />
                            <span>{device.battery}%</span>
                          </div>
                        </div>
                      )}
                      
                      {device.signal !== undefined && (
                        <div className="flex justify-between items-center">
                          <span>{t('monitoring.signal')}:</span>
                          <div className="flex items-center space-x-2">
                            <Signal className="h-4 w-4" />
                            <span>{device.signal}%</span>
                          </div>
                        </div>
                      )}
                      
                      {device.temperature !== undefined && (
                        <div className="flex justify-between items-center">
                          <span>{t('monitoring.temperature')}:</span>
                          <div className="flex items-center space-x-2">
                            <Thermometer className="h-4 w-4" />
                            <span>{device.temperature}°C</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-indigo-500" />
                  {t('monitoring.network_traffic')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceHistory.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                      formatter={(value: any) => [`${Math.round(value)} MB/s`, 'Network Usage']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="network" 
                      stroke="#8B5CF6" 
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                      name={t('monitoring.network_usage')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2 text-emerald-500" />
                  {t('monitoring.database_performance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('monitoring.active_connections')}</span>
                    <span className="text-2xl font-bold">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('monitoring.queries_per_second')}</span>
                    <span className="text-2xl font-bold">24.5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('monitoring.avg_query_time')}</span>
                    <span className="text-2xl font-bold">45ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('monitoring.database_size')}</span>
                    <span className="text-2xl font-bold">2.4GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RealtimeMonitoringDashboard;