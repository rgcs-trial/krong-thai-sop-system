"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  PlayCircle, 
  PauseCircle,
  RotateCcw,
  User,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

export type CompletionStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'review_required';
export type ComplianceLevel = 'compliant' | 'warning' | 'non_compliant' | 'unknown';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

interface StatusIndicatorProps {
  status: CompletionStatus;
  language: 'en' | 'th';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function StatusIndicator({ status, language, size = 'md', showText = true }: StatusIndicatorProps) {
  const getStatusConfig = (status: CompletionStatus) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-green-600 bg-green-50 border-green-200',
          badgeVariant: 'default' as const,
          text: { en: 'Completed', th: 'เสร็จสิ้น' }
        };
      case 'in_progress':
        return {
          icon: PlayCircle,
          color: 'text-golden-saffron bg-yellow-50 border-yellow-200',
          badgeVariant: 'secondary' as const,
          text: { en: 'In Progress', th: 'กำลังดำเนินการ' }
        };
      case 'not_started':
        return {
          icon: PauseCircle,
          color: 'text-gray-500 bg-gray-50 border-gray-200',
          badgeVariant: 'outline' as const,
          text: { en: 'Not Started', th: 'ยังไม่เริ่ม' }
        };
      case 'overdue':
        return {
          icon: AlertTriangle,
          color: 'text-red-600 bg-red-50 border-red-200',
          badgeVariant: 'destructive' as const,
          text: { en: 'Overdue', th: 'เกินกำหนด' }
        };
      case 'review_required':
        return {
          icon: RotateCcw,
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          badgeVariant: 'secondary' as const,
          text: { en: 'Review Required', th: 'ต้องทบทวน' }
        };
      default:
        return {
          icon: XCircle,
          color: 'text-gray-400 bg-gray-50 border-gray-200',
          badgeVariant: 'outline' as const,
          text: { en: 'Unknown', th: 'ไม่ทราบ' }
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';

  if (showText) {
    return (
      <Badge variant={config.badgeVariant} className="flex items-center gap-1">
        <Icon className={iconSize} />
        <span className={language === 'th' ? 'font-thai' : 'font-ui'}>
          {config.text[language]}
        </span>
      </Badge>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center p-1 rounded-full ${config.color}`}>
      <Icon className={iconSize} />
    </div>
  );
}

interface ComplianceIndicatorProps {
  level: ComplianceLevel;
  language: 'en' | 'th';
  percentage?: number;
  showPercentage?: boolean;
}

export function ComplianceIndicator({ 
  level, 
  language, 
  percentage, 
  showPercentage = false 
}: ComplianceIndicatorProps) {
  const getComplianceConfig = (level: ComplianceLevel) => {
    switch (level) {
      case 'compliant':
        return {
          color: 'bg-green-600',
          textColor: 'text-green-800',
          bgColor: 'bg-green-50',
          text: { en: 'Compliant', th: 'ปฏิบัติตาม' }
        };
      case 'warning':
        return {
          color: 'bg-golden-saffron',
          textColor: 'text-amber-800',
          bgColor: 'bg-yellow-50',
          text: { en: 'Warning', th: 'เตือน' }
        };
      case 'non_compliant':
        return {
          color: 'bg-krong-red',
          textColor: 'text-red-800',
          bgColor: 'bg-red-50',
          text: { en: 'Non-Compliant', th: 'ไม่ปฏิบัติตาม' }
        };
      case 'unknown':
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-50',
          text: { en: 'Unknown', th: 'ไม่ทราบ' }
        };
    }
  };

  const config = getComplianceConfig(level);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor}`}>
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className={`text-sm font-medium ${config.textColor} ${
        language === 'th' ? 'font-thai' : 'font-ui'
      }`}>
        {config.text[language]}
        {showPercentage && percentage !== undefined && ` (${percentage}%)`}
      </span>
    </div>
  );
}

interface PriorityIndicatorProps {
  priority: Priority;
  language: 'en' | 'th';
  showText?: boolean;
}

export function PriorityIndicator({ priority, language, showText = true }: PriorityIndicatorProps) {
  const getPriorityConfig = (priority: Priority) => {
    switch (priority) {
      case 'critical':
        return {
          color: 'bg-krong-red text-white',
          dotColor: 'bg-krong-red',
          text: { en: 'Critical', th: 'วิกฤต' }
        };
      case 'high':
        return {
          color: 'bg-golden-saffron text-krong-black',
          dotColor: 'bg-golden-saffron',
          text: { en: 'High', th: 'สูง' }
        };
      case 'medium':
        return {
          color: 'bg-jade-green text-white',
          dotColor: 'bg-jade-green',
          text: { en: 'Medium', th: 'ปานกลาง' }
        };
      case 'low':
        return {
          color: 'bg-earthen-beige text-krong-black',
          dotColor: 'bg-earthen-beige',
          text: { en: 'Low', th: 'ต่ำ' }
        };
    }
  };

  const config = getPriorityConfig(priority);

  if (showText) {
    return (
      <Badge className={config.color}>
        <span className={language === 'th' ? 'font-thai' : 'font-ui'}>
          {config.text[language]}
        </span>
      </Badge>
    );
  }

  return <div className={`w-3 h-3 rounded-full ${config.dotColor}`} />;
}

interface ProgressRingProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  color?: string;
}

export function ProgressRing({ 
  percentage, 
  size = 'md', 
  showPercentage = true, 
  color = '#D4AF37' 
}: ProgressRingProps) {
  const sizeConfig = {
    sm: { diameter: 40, strokeWidth: 4, textSize: 'text-xs' },
    md: { diameter: 60, strokeWidth: 6, textSize: 'text-sm' },
    lg: { diameter: 80, strokeWidth: 8, textSize: 'text-base' }
  };

  const config = sizeConfig[size];
  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex">
      <svg width={config.diameter} height={config.diameter} className="transform -rotate-90">
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          stroke={color}
          strokeWidth={config.strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-krong-black ${config.textSize}`}>
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

interface TeamProgressProps {
  teamStats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  language: 'en' | 'th';
  recentActivity?: Array<{
    name: string;
    action: string;
    timestamp: Date;
  }>;
}

export function TeamProgress({ teamStats, language, recentActivity }: TeamProgressProps) {
  const completionRate = Math.round((teamStats.completed / teamStats.total) * 100);
  const progressRate = Math.round((teamStats.inProgress / teamStats.total) * 100);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-lg ${
              language === 'th' ? 'font-thai' : 'font-heading'
            }`}>
              {language === 'en' ? 'Team Progress' : 'ความคืบหน้าทีม'}
            </h3>
            <ProgressRing percentage={completionRate} size="sm" />
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{teamStats.completed}</div>
              <div className={`text-sm text-krong-black/60 ${
                language === 'th' ? 'font-thai' : 'font-ui'
              }`}>
                {language === 'en' ? 'Completed' : 'เสร็จสิ้น'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-golden-saffron">{teamStats.inProgress}</div>
              <div className={`text-sm text-krong-black/60 ${
                language === 'th' ? 'font-thai' : 'font-ui'
              }`}>
                {language === 'en' ? 'In Progress' : 'กำลังดำเนินการ'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{teamStats.notStarted}</div>
              <div className={`text-sm text-krong-black/60 ${
                language === 'th' ? 'font-thai' : 'font-ui'
              }`}>
                {language === 'en' ? 'Not Started' : 'ยังไม่เริ่ม'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-krong-black">{teamStats.total}</div>
              <div className={`text-sm text-krong-black/60 ${
                language === 'th' ? 'font-thai' : 'font-ui'
              }`}>
                {language === 'en' ? 'Total' : 'ทั้งหมด'}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {recentActivity && recentActivity.length > 0 && (
            <div className="space-y-3">
              <h4 className={`font-medium ${
                language === 'th' ? 'font-thai' : 'font-ui'
              }`}>
                {language === 'en' ? 'Recent Activity' : 'กิจกรรมล่าสุด'}
              </h4>
              <div className="space-y-2">
                {recentActivity.slice(0, 3).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-krong-black/40 flex-shrink-0" />
                    <div className="flex-1">
                      <span className={`font-medium ${
                        language === 'th' ? 'font-thai' : 'font-ui'
                      }`}>
                        {activity.name}
                      </span>
                      <span className={`text-krong-black/60 ml-1 ${
                        language === 'th' ? 'font-thai' : 'font-body'
                      }`}>
                        {activity.action}
                      </span>
                    </div>
                    <span className={`text-xs text-krong-black/40 ${
                      language === 'th' ? 'font-thai' : 'font-ui'
                    }`}>
                      {activity.timestamp.toLocaleTimeString(
                        language === 'en' ? 'en-US' : 'th-TH',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  value: number;
  label: string;
  language: 'en' | 'th';
}

export function TrendIndicator({ trend, value, label, language }: TrendIndicatorProps) {
  const getTrendConfig = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return {
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'down':
        return {
          icon: TrendingDown,
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      case 'stable':
        return {
          icon: Minus,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const config = getTrendConfig(trend);
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <div>
        <div className={`font-semibold ${config.color}`}>
          {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{value}%
        </div>
        <div className={`text-xs text-krong-black/60 ${
          language === 'th' ? 'font-thai' : 'font-ui'
        }`}>
          {label}
        </div>
      </div>
    </div>
  );
}