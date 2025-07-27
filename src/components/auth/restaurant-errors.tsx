/**
 * Restaurant Error Handling Components
 * Provides consistent error display for restaurant management operations
 */

'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface RestaurantError {
  code: string;
  message: string;
  details?: any;
}

interface RestaurantErrorDisplayProps {
  error: RestaurantError | string;
  locale: 'en' | 'fr';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function RestaurantErrorDisplay({
  error,
  locale,
  onRetry,
  onDismiss,
  className = ''
}: RestaurantErrorDisplayProps) {
  const errorObj = typeof error === 'string' ? { code: 'UNKNOWN', message: error } : error;

  const getErrorMessage = (code: string, fallbackMessage: string): { title: string; description: string } => {
    const messages = {
      en: {
        VALIDATION_ERROR: {
          title: 'Validation Error',
          description: 'Please check the form and correct any invalid fields.'
        },
        CREATE_FAILED: {
          title: 'Creation Failed',
          description: 'Unable to create the restaurant location. Please try again.'
        },
        UPDATE_FAILED: {
          title: 'Update Failed',
          description: 'Unable to update the restaurant location. Please try again.'
        },
        DELETE_FAILED: {
          title: 'Deletion Failed',
          description: 'Unable to delete the restaurant location. Please try again.'
        },
        SERVICE_DOWN: {
          title: 'Service Unavailable',
          description: 'The service is temporarily unavailable. Please try again later.'
        },
        MISSING_ID: {
          title: 'Invalid Request',
          description: 'Restaurant ID is required for this operation.'
        },
        NETWORK_ERROR: {
          title: 'Network Error',
          description: 'Unable to connect to the server. Please check your connection.'
        },
        PERMISSION_DENIED: {
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action.'
        },
        UNKNOWN: {
          title: 'Error',
          description: fallbackMessage || 'An unexpected error occurred.'
        }
      },
      th: {
        VALIDATION_ERROR: {
          title: 'ข้อมูลไม่ถูกต้อง',
          description: 'กรุณาตรวจสอบแบบฟอร์มและแก้ไขข้อมูลที่ไม่ถูกต้อง'
        },
        CREATE_FAILED: {
          title: 'สร้างไม่สำเร็จ',
          description: 'ไม่สามารถสร้างสถานที่ร้านอาหารได้ กรุณาลองใหม่อีกครั้ง'
        },
        UPDATE_FAILED: {
          title: 'อัปเดตไม่สำเร็จ',
          description: 'ไม่สามารถอัปเดตสถานที่ร้านอาหารได้ กรุณาลองใหม่อีกครั้ง'
        },
        DELETE_FAILED: {
          title: 'ลบไม่สำเร็จ',
          description: 'ไม่สามารถลบสถานที่ร้านอาหารได้ กรุณาลองใหม่อีกครั้ง'
        },
        SERVICE_DOWN: {
          title: 'บริการไม่พร้อมใช้งาน',
          description: 'บริการไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง'
        },
        MISSING_ID: {
          title: 'คำขอไม่ถูกต้อง',
          description: 'ต้องระบุรหัสร้านอาหารสำหรับการดำเนินการนี้'
        },
        NETWORK_ERROR: {
          title: 'ข้อผิดพลาดเครือข่าย',
          description: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ'
        },
        PERMISSION_DENIED: {
          title: 'ไม่มีสิทธิ์เข้าถึง',
          description: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้'
        },
        UNKNOWN: {
          title: 'เกิดข้อผิดพลาด',
          description: fallbackMessage || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
        }
      }
    };

    return messages[locale][code as keyof typeof messages[typeof locale]] || messages[locale].UNKNOWN;
  };

  const { title, description } = getErrorMessage(errorObj.code, errorObj.message);

  return (
    <Alert variant="destructive" className={`border-red-200 bg-red-50 ${className}`}>
      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <AlertTitle className="text-red-800">{title}</AlertTitle>
      <AlertDescription className="text-red-700 mt-2">
        {description}
        
        {/* Show validation details if available */}
        {errorObj.code === 'VALIDATION_ERROR' && errorObj.details && (
          <div className="mt-3 space-y-1">
            {Object.entries(errorObj.details).map(([field, fieldErrors]: [string, any]) => {
              if (fieldErrors && typeof fieldErrors === 'object' && fieldErrors._errors) {
                return (
                  <div key={field} className="text-sm">
                    <span className="font-medium capitalize">{field.replace('_', ' ')}:</span>{' '}
                    {fieldErrors._errors.join(', ')}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Action buttons */}
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 mt-4">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {locale === 'en' ? 'Retry' : 'ลองใหม่'}
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                {locale === 'en' ? 'Dismiss' : 'ปิด'}
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Success message component for restaurant operations
interface RestaurantSuccessDisplayProps {
  message: string;
  locale: 'en' | 'fr';
  onDismiss?: () => void;
  className?: string;
}

export function RestaurantSuccessDisplay({
  message,
  locale,
  onDismiss,
  className = ''
}: RestaurantSuccessDisplayProps) {
  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <AlertTitle className="text-green-800">
        {locale === 'en' ? 'Success' : 'สำเร็จ'}
      </AlertTitle>
      <AlertDescription className="text-green-700 mt-2">
        {message}
        
        {onDismiss && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            className="mt-3 border-green-300 text-green-700 hover:bg-green-100"
          >
            {locale === 'en' ? 'Dismiss' : 'ปิด'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Hook for managing restaurant operation states
export function useRestaurantOperations(locale: 'en' | 'fr') {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<RestaurantError | null>(null);
  const [success, setSuccess] = React.useState<string>('');

  const executeOperation = async (
    operation: () => Promise<any>,
    successMessage?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess('');

      const result = await operation();

      if (successMessage) {
        setSuccess(successMessage);
      }

      return result;
    } catch (err: any) {
      const errorObj: RestaurantError = {
        code: err.code || 'UNKNOWN',
        message: err.message || (locale === 'en' ? 'An unexpected error occurred' : 'เกิดข้อผิดพลาดที่ไม่คาดคิด'),
        details: err.details
      };
      
      setError(errorObj);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);
  const clearSuccess = () => setSuccess('');
  const clearAll = () => {
    setError(null);
    setSuccess('');
  };

  return {
    isLoading,
    error,
    success,
    executeOperation,
    clearError,
    clearSuccess,
    clearAll
  };
}

