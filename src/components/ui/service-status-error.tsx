/**
 * Service Status Error Component
 * Displays user-friendly error messages when services are unavailable
 */

'use client';

import { AlertTriangle, RefreshCw, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceStatusErrorProps {
  error?: string;
  code?: string;
  onRetry?: () => void;
  locale?: string;
}

export function ServiceStatusError({ 
  error, 
  code, 
  onRetry, 
  locale = 'en' 
}: ServiceStatusErrorProps) {
  const isServiceDown = code === 'SERVICE_DOWN' || error?.includes('temporarily unavailable');
  
  const messages = {
    en: {
      title: isServiceDown ? 'Service Temporarily Unavailable' : 'Connection Error',
      subtitle: isServiceDown 
        ? 'Our authentication service is currently experiencing issues. Please try again in a few moments.'
        : 'Unable to connect to the authentication service. Please check your connection and try again.',
      retry: 'Try Again',
      contact: 'Contact Support',
      technical: 'Technical Details'
    },
    th: {
      title: isServiceDown ? 'บริการไม่พร้อมใช้งานชั่วคราว' : 'ข้อผิดพลาดการเชื่อมต่อ',
      subtitle: isServiceDown
        ? 'บริการยืนยันตัวตนของเรากำลังประสบปัญหา กรุณาลองใหม่อีกครั้งในอีกสักครู่'
        : 'ไม่สามารถเชื่อมต่อกับบริการยืนยันตัวตนได้ กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง',
      retry: 'ลองใหม่',
      contact: 'ติดต่อฝ่ายสนับสนุน',
      technical: 'รายละเอียดทางเทคนิค'
    },
    fr: {
      title: isServiceDown ? 'Service temporairement indisponible' : 'Erreur de connexion',
      subtitle: isServiceDown
        ? 'Notre service d\'authentification rencontre actuellement des problèmes. Veuillez réessayer dans quelques instants.'
        : 'Impossible de se connecter au service d\'authentification. Veuillez vérifier votre connexion et réessayer.',
      retry: 'Réessayer',
      contact: 'Contacter le support',
      technical: 'Détails techniques'
    }
  };

  const t = messages[locale as keyof typeof messages] || messages.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border-0 p-6">
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                {isServiceDown ? (
                  <Server className="w-8 h-8 text-red-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {t.title}
            </h1>

            {/* Subtitle */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t.subtitle}
            </p>

            {/* Actions */}
            <div className="space-y-3">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="w-full h-12 text-base font-medium bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t.retry}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => window.open('mailto:support@krongthai.com', '_blank')}
              >
                {t.contact}
              </Button>
            </div>

            {/* Technical Details (collapsible) */}
            {(error || code) && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  {t.technical}
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 break-all">
                  {code && <div>Code: {code}</div>}
                  {error && <div>Error: {error}</div>}
                  <div>Time: {new Date().toISOString()}</div>
                </div>
              </details>
            )}

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isServiceDown ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <span>
                {isServiceDown 
                  ? (locale === 'fr' ? 'บริการออฟไลน์' : locale === 'fr' ? 'Service hors ligne' : 'Service Offline')
                  : (locale === 'fr' ? 'ปัญหาการเชื่อมต่อ' : locale === 'fr' ? 'Problème de connexion' : 'Connection Issue')
                }
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>&copy; 2025 Restaurant Krong Thai. {locale === 'fr' ? 'สงวนลิขสิทธิ์ทุกประการ' : locale === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}.</p>
        </div>
      </div>
    </div>
  );
}