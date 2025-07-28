'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Shield, 
  X, 
  Phone,
  ExternalLink,
  CheckCircle,
  Bell,
  Flame,
  Droplets,
  Zap,
  Biohazard
} from 'lucide-react';

interface SafetyAlert {
  id: string;
  title: string;
  title_fr: string;
  message: string;
  message_fr: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'fire' | 'chemical' | 'electrical' | 'biological' | 'physical' | 'general';
  isAcknowledged: boolean;
  requiresAction: boolean;
  emergencyContact?: string;
  externalLink?: string;
  timestamp: string;
}

interface SafetyWarningsAlertsProps {
  /** Array of safety alerts */
  alerts: SafetyAlert[];
  /** Show emergency procedures */
  showEmergencyProcedures?: boolean;
  /** Allow alert acknowledgment */
  allowAcknowledge?: boolean;
  /** Show alert history */
  showHistory?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when alert is acknowledged */
  onAcknowledge?: (alertId: string) => void;
  /** Callback when emergency contact is called */
  onEmergencyCall?: (contact: string) => void;
  /** Callback when external link is opened */
  onExternalLink?: (url: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SafetyWarningsAlerts - Safety warnings and emergency alerts component
 */
const SafetyWarningsAlerts: React.FC<SafetyWarningsAlertsProps> = ({
  alerts,
  showEmergencyProcedures = true,
  allowAcknowledge = true,
  showHistory = false,
  isLoading = false,
  onAcknowledge,
  onEmergencyCall,
  onExternalLink,
  className
}) => {
  const t = useTranslations('sop.safety');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  const handleAcknowledge = useCallback((alertId: string) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
    onAcknowledge?.(alertId);
  }, [onAcknowledge]);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-600',
          icon: AlertTriangle,
          label: t('severity.critical')
        };
      case 'high':
        return {
          color: 'text-krong-red',
          bgColor: 'bg-krong-red/10',
          borderColor: 'border-krong-red',
          icon: AlertTriangle,
          label: t('severity.high')
        };
      case 'medium':
        return {
          color: 'text-golden-saffron',
          bgColor: 'bg-golden-saffron/10',
          borderColor: 'border-golden-saffron',
          icon: Shield,
          label: t('severity.medium')
        };
      case 'low':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-600',
          icon: Shield,
          label: t('severity.low')
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-400',
          icon: Shield,
          label: t('severity.unknown')
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fire': return Flame;
      case 'chemical': return Droplets;
      case 'electrical': return Zap;
      case 'biological': return Biohazard;
      case 'physical': return AlertTriangle;
      default: return Shield;
    }
  };

  const activeAlerts = alerts.filter(alert => 
    !alert.isAcknowledged && !acknowledgedAlerts.has(alert.id)
  );
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-2 border-red-600 bg-red-100 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            {t('criticalAlertsActive', { count: criticalAlerts.length })}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Safety Alerts */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('title')}
            </CardTitle>
            {activeAlerts.length > 0 && (
              <Badge 
                variant={criticalAlerts.length > 0 ? "destructive" : "secondary"}
                className="text-tablet-sm"
              >
                <Bell className="w-3 h-3 mr-1" />
                {activeAlerts.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {activeAlerts.map((alert) => {
              const severityConfig = getSeverityConfig(alert.severity);
              const CategoryIcon = getCategoryIcon(alert.category);
              const SeverityIcon = severityConfig.icon;

              return (
                <Alert
                  key={alert.id}
                  className={cn(
                    "border-2",
                    severityConfig.bgColor,
                    severityConfig.borderColor,
                    alert.severity === 'critical' && "animate-pulse"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <SeverityIcon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", severityConfig.color)} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={cn("text-tablet-base font-body font-semibold", severityConfig.color)}>
                          {alert.title}
                        </h4>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={cn("text-tablet-xs border-2", severityConfig.color, severityConfig.borderColor)}
                          >
                            <CategoryIcon className="w-3 h-3 mr-1" />
                            {t(`category.${alert.category}`)}
                          </Badge>
                          
                          <Badge 
                            variant="outline" 
                            className={cn("text-tablet-xs border-2", severityConfig.color, severityConfig.borderColor)}
                          >
                            {severityConfig.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <AlertDescription className={cn("text-tablet-sm mb-3", severityConfig.color)}>
                        {alert.message}
                      </AlertDescription>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {allowAcknowledge && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            className="text-tablet-xs"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('acknowledge')}
                          </Button>
                        )}
                        
                        {alert.emergencyContact && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onEmergencyCall?.(alert.emergencyContact!)}
                            className="text-tablet-xs"
                          >
                            <Phone className="w-3 h-3 mr-1" />
                            {t('emergencyCall')}
                          </Button>
                        )}
                        
                        {alert.externalLink && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onExternalLink?.(alert.externalLink!)}
                            className="text-tablet-xs"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            {t('learnMore')}
                          </Button>
                        )}
                        
                        <span className="text-tablet-xs text-muted-foreground ml-auto">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Alert>
              );
            })}
          </div>

          {activeAlerts.length === 0 && (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-jade-green mx-auto mb-3" />
              <h3 className="text-tablet-lg font-heading font-semibold text-jade-green mb-2">
                {t('noActiveAlerts.title')}
              </h3>
              <p className="text-tablet-sm font-body text-muted-foreground">
                {t('noActiveAlerts.description')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Procedures */}
      {showEmergencyProcedures && (
        <Card className="border-2 border-krong-red">
          <CardHeader className="pb-4">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2 text-krong-red">
              <Phone className="w-5 h-5" />
              {t('emergencyProcedures.title')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-tablet-sm font-body font-semibold text-krong-black">
                  {t('emergencyProcedures.fire')}
                </h4>
                <p className="text-tablet-xs text-muted-foreground">
                  {t('emergencyProcedures.fireSteps')}
                </p>
                <Button variant="destructive" size="sm" className="w-full">
                  <Phone className="w-3 h-3 mr-1" />
                  {t('emergencyProcedures.fireNumber')}
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-tablet-sm font-body font-semibold text-krong-black">
                  {t('emergencyProcedures.medical')}
                </h4>
                <p className="text-tablet-xs text-muted-foreground">
                  {t('emergencyProcedures.medicalSteps')}
                </p>
                <Button variant="destructive" size="sm" className="w-full">
                  <Phone className="w-3 h-3 mr-1" />
                  {t('emergencyProcedures.medicalNumber')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SafetyWarningsAlerts;