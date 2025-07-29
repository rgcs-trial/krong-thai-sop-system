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

// Helper function to get user-friendly field names
function getFieldDisplayName(field: string, locale: 'en' | 'fr'): string {
  const fieldNames = {
    en: {
      name: 'Restaurant Name (English)',
      name_fr: 'Restaurant Name (French)',
      street_address: 'Street Address (English)',
      street_address_fr: 'Street Address (French)',
      city: 'City (English)',
      city_fr: 'City (French)',
      state_province: 'State/Province (English)',
      state_province_fr: 'State/Province (French)',
      postal_code: 'ZIP/Postal Code',
      country: 'Country',
      phone: 'Phone Number',
      email: 'Email Address',
      timezone: 'Timezone',
      capacity: 'Seating Capacity',
      operational_hours: 'Operating Hours'
    },
    fr: {
      name: 'Nom du restaurant (Anglais)',
      name_fr: 'Nom du restaurant (Français)',
      street_address: 'Adresse civique (Anglais)',
      street_address_fr: 'Adresse civique (Français)',
      city: 'Ville (Anglais)',
      city_fr: 'Ville (Français)',
      state_province: 'État/Province (Anglais)',
      state_province_fr: 'État/Province (Français)',
      postal_code: 'Code postal',
      country: 'Pays',
      phone: 'Numéro de téléphone',
      email: 'Adresse e-mail',
      timezone: 'Fuseau horaire',
      capacity: 'Capacité d\'accueil',
      operational_hours: 'Heures d\'ouverture'
    }
  };

  return fieldNames[locale][field as keyof typeof fieldNames[typeof locale]] || 
         field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
      fr: {
        VALIDATION_ERROR: {
          title: 'Erreur de validation',
          description: 'Veuillez vérifier le formulaire et corriger les champs invalides.'
        },
        CREATE_FAILED: {
          title: 'Échec de la création',
          description: 'Impossible de créer l\'emplacement du restaurant. Veuillez réessayer.'
        },
        UPDATE_FAILED: {
          title: 'Échec de la mise à jour',
          description: 'Impossible de mettre à jour l\'emplacement du restaurant. Veuillez réessayer.'
        },
        DELETE_FAILED: {
          title: 'Échec de la suppression',
          description: 'Impossible de supprimer l\'emplacement du restaurant. Veuillez réessayer.'
        },
        SERVICE_DOWN: {
          title: 'Service indisponible',
          description: 'Le service est temporairement indisponible. Veuillez réessayer plus tard.'
        },
        MISSING_ID: {
          title: 'Demande invalide',
          description: 'L\'ID du restaurant est requis pour cette opération.'
        },
        NETWORK_ERROR: {
          title: 'Erreur réseau',
          description: 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion.'
        },
        PERMISSION_DENIED: {
          title: 'Autorisation refusée',
          description: 'Vous n\'avez pas l\'autorisation d\'effectuer cette action.'
        },
        UNKNOWN: {
          title: 'Erreur',
          description: fallbackMessage || 'Une erreur inattendue s\'est produite.'
        }
      }
    };

    return messages[locale][code as keyof typeof messages[typeof locale]] || messages[locale].UNKNOWN;
  };

  const { title, description } = getErrorMessage(errorObj.code, errorObj.message);

  return (
    <Alert variant="destructive" className={`border-red-600 bg-red-50 ring-1 ring-red-200 ${className}`}>
      <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <AlertTitle className="text-red-900 font-bold">{title}</AlertTitle>
      <AlertDescription className="text-red-800 mt-2">
        {description}
        
        {/* Show validation details if available */}
        {errorObj.code === 'VALIDATION_ERROR' && errorObj.details && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-semibold text-red-900 mb-2">
              {locale === 'en' ? 'Please fix the following issues:' : 'Veuillez corriger les problèmes suivants :'}
            </div>
            {Object.entries(errorObj.details).map(([field, fieldErrors]: [string, any]) => {
              if (fieldErrors && typeof fieldErrors === 'object' && fieldErrors._errors) {
                const fieldName = getFieldDisplayName(field, locale);
                return (
                  <div key={field} className="text-sm bg-red-100 p-3 rounded-lg border-l-4 border-red-600">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <span className="font-semibold text-red-900">{fieldName}:</span>{' '}
                        <span className="text-red-800">{fieldErrors._errors.join(', ')}</span>
                      </div>
                    </div>
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
                className="border-red-600 text-red-800 hover:bg-red-100 hover:text-red-900 focus:ring-red-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {locale === 'en' ? 'Retry' : 'Réessayer'}
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="border-red-600 text-red-800 hover:bg-red-100 hover:text-red-900 focus:ring-red-500"
              >
                {locale === 'en' ? 'Dismiss' : 'Fermer'}
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
    <Alert className={`border-green-600 bg-green-50 ring-1 ring-green-200 ${className}`}>
      <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <AlertTitle className="text-green-900 font-bold">
        {locale === 'en' ? 'Success' : 'Succès'}
      </AlertTitle>
      <AlertDescription className="text-green-800 mt-2">
        {message}
        
        {onDismiss && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            className="mt-3 border-green-600 text-green-800 hover:bg-green-100 hover:text-green-900 focus:ring-green-500"
          >
            {locale === 'en' ? 'Dismiss' : 'Fermer'}
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

