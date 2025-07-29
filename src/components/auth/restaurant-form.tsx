/**
 * Restaurant Form Component
 * Handles creation and editing of restaurant locations with bilingual support
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  FormField, 
  FormLabel, 
  FormInput, 
  FormSelect, 
  FormGrid, 
  FormSection 
} from '@/components/ui/form-field';
import { RestaurantErrorDisplay } from './restaurant-errors';

interface RestaurantFormData {
  name: string;
  name_fr: string;
  street_address?: string;
  street_address_fr?: string;
  city?: string;
  city_fr?: string;
  state_province?: string;
  state_province_fr?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone: string;
  capacity?: number;
  operational_hours?: Record<string, {
    open: string;
    close: string;
    closed?: boolean;
  }>;
  settings?: Record<string, any>;
}

interface RestaurantFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<RestaurantFormData>;
  onSubmit: (data: RestaurantFormData) => Promise<void>;
  onCancel: () => void;
  locale: 'en' | 'fr';
  isSubmitting?: boolean;
}

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver', 
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'UTC'
];

const countries = [
  { code: 'US', name: 'United States', name_fr: 'États-Unis' },
  { code: 'CA', name: 'Canada', name_fr: 'Canada' },
  { code: 'MX', name: 'Mexico', name_fr: 'Mexique' }
];

const daysOfWeek = [
  { key: 'monday', en: 'Monday', fr: 'Lundi' },
  { key: 'tuesday', en: 'Tuesday', fr: 'Mardi' },
  { key: 'wednesday', en: 'Wednesday', fr: 'Mercredi' },
  { key: 'thursday', en: 'Thursday', fr: 'Jeudi' },
  { key: 'friday', en: 'Friday', fr: 'Vendredi' },
  { key: 'saturday', en: 'Saturday', fr: 'Samedi' },
  { key: 'sunday', en: 'Sunday', fr: 'Dimanche' }
];

export function RestaurantForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  locale,
  isSubmitting = false
}: RestaurantFormProps) {
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    name_fr: '',
    street_address: '',
    street_address_fr: '',
    city: '',
    city_fr: '',
    state_province: '',
    state_province_fr: '',
    postal_code: '',
    country: 'US',
    phone: '',
    email: '',
    timezone: 'America/New_York',
    capacity: 50,
    operational_hours: {},
    settings: {},
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState('basic');
  const [submitError, setSubmitError] = useState<any>(null);

  // Initialize operational hours if not provided
  useEffect(() => {
    if (!formData.operational_hours || Object.keys(formData.operational_hours).length === 0) {
      const defaultHours = daysOfWeek.reduce((acc, day) => {
        acc[day.key] = {
          open: '09:00',
          close: '22:00',
          closed: false
        };
        return acc;
      }, {} as Record<string, { open: string; close: string; closed?: boolean }>);

      setFormData(prev => ({
        ...prev,
        operational_hours: defaultHours
      }));
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = locale === 'en' ? 'Restaurant name is required' : 'Le nom du restaurant est requis';
    }

    if (!formData.name_fr.trim()) {
      newErrors.name_fr = locale === 'en' ? 'French restaurant name is required' : 'Le nom du restaurant en français est requis';
    }

    if (!formData.timezone) {
      newErrors.timezone = locale === 'en' ? 'Timezone is required' : 'Le fuseau horaire est requis';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = locale === 'en' ? 'Invalid email format' : 'Format d\'email invalide';
    }

    // Phone validation (basic)
    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = locale === 'en' ? 'Invalid phone format' : 'Format de téléphone invalide';
    }

    // Capacity validation
    if (formData.capacity && formData.capacity < 1) {
      newErrors.capacity = locale === 'en' ? 'Capacity must be at least 1' : 'La capacité doit être d\'au moins 1';
    }

    // Operational hours validation
    if (formData.operational_hours) {
      Object.entries(formData.operational_hours).forEach(([day, hours]) => {
        if (!hours.closed) {
          if (!hours.open || !hours.close) {
            newErrors[`${day}_hours`] = locale === 'en' 
              ? 'Open and close times are required' 
              : 'Les heures d\'ouverture et de fermeture sont requises';
          } else if (hours.open >= hours.close) {
            newErrors[`${day}_hours`] = locale === 'en' 
              ? 'Close time must be after open time' 
              : 'L\'heure de fermeture doit être après l\'heure d\'ouverture';
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error: any) {
      console.error('Form submission error:', error);
      setSubmitError(error);
    }
  };

  const handleInputChange = (field: keyof RestaurantFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Real-time validation for specific fields
    if (field === 'email' && value && value.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setErrors(prev => ({
          ...prev,
          email: locale === 'en' ? 'Invalid email format' : 'Format d\'email invalide'
        }));
      }
    }

    if (field === 'phone' && value && value.trim()) {
      if (!/^\+?[\d\s-()]+$/.test(value)) {
        setErrors(prev => ({
          ...prev,
          phone: locale === 'en' ? 'Invalid phone format' : 'Format de téléphone invalide'
        }));
      }
    }

    if (field === 'capacity' && value !== undefined && value !== '') {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (isNaN(numValue) || numValue < 1) {
        setErrors(prev => ({
          ...prev,
          capacity: locale === 'en' ? 'Capacity must be at least 1' : 'La capacité doit être d\'au moins 1'
        }));
      }
    }
  };

  const handleOperationalHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      operational_hours: {
        ...prev.operational_hours,
        [day]: {
          ...prev.operational_hours?.[day],
          [field]: value
        }
      }
    }));

    // Clear error when user makes changes
    if (errors[`${day}_hours`]) {
      setErrors(prev => ({
        ...prev,
        [`${day}_hours`]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {mode === 'create' ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'create' 
              ? (locale === 'en' ? 'Add New Restaurant Location' : 'Ajouter un nouveau restaurant')
              : (locale === 'en' ? 'Edit Restaurant Location' : 'Modifier le restaurant')
            }
          </h1>
          <p className="text-slate-700">
            {locale === 'en' 
              ? 'Enter restaurant details and operational settings' 
              : 'Entrez les détails du restaurant et les paramètres opérationnels'
            }
          </p>
        </div>

        {/* Display submit error */}
        {submitError && (
          <RestaurantErrorDisplay
            error={submitError}
            locale={locale}
            onDismiss={() => setSubmitError(null)}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">
                {locale === 'en' ? 'Basic Info' : 'Informations de base'}
              </TabsTrigger>
              <TabsTrigger value="hours">
                {locale === 'en' ? 'Operating Hours' : 'Heures d\'ouverture'}
              </TabsTrigger>
              <TabsTrigger value="settings">
                {locale === 'en' ? 'Settings' : 'Paramètres'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              {/* Restaurant Names */}
              <FormGrid columns={2}>
                <FormInput
                  id="name"
                  label={locale === 'en' ? 'Restaurant Name (English)' : 'Nom du restaurant (Anglais)'}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={locale === 'en' ? 'Enter restaurant name' : 'Entrez le nom du restaurant'}
                  error={errors.name}
                  required
                />

                <FormInput
                  id="name_fr"
                  label={locale === 'en' ? 'Restaurant Name (French)' : 'Nom du restaurant (Français)'}
                  value={formData.name_fr}
                  onChange={(e) => handleInputChange('name_fr', e.target.value)}
                  placeholder={locale === 'en' ? 'Entrez le nom en français' : 'Entrez le nom en français'}
                  error={errors.name_fr}
                  required
                />
              </FormGrid>

              {/* Address Information */}
              <FormSection 
                title={locale === 'en' ? 'Address Information' : 'Informations d\'adresse'}
                description={locale === 'en' ? 'Enter the restaurant\'s physical location details' : 'Entrez les détails de l\'emplacement physique du restaurant'}
              >
                {/* Street Address */}
                <FormGrid columns={2}>
                  <FormInput
                    id="street_address"
                    label={locale === 'en' ? 'Street Address (English)' : 'Adresse civique (Anglais)'}
                    value={formData.street_address}
                    onChange={(e) => handleInputChange('street_address', e.target.value)}
                    placeholder={locale === 'en' ? '123 Main Street' : '123 Rue Principale'}
                    error={errors.street_address}
                  />

                  <FormInput
                    id="street_address_fr"
                    label={locale === 'en' ? 'Street Address (French)' : 'Adresse civique (Français)'}
                    value={formData.street_address_fr}
                    onChange={(e) => handleInputChange('street_address_fr', e.target.value)}
                    placeholder={locale === 'en' ? '123 Rue Principale' : '123 Rue Principale'}
                    error={errors.street_address_fr}
                  />
                </FormGrid>

                {/* City */}
                <FormGrid columns={2}>
                  <FormInput
                    id="city"
                    label={locale === 'en' ? 'City (English)' : 'Ville (Anglais)'}
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder={locale === 'en' ? 'New York' : 'New York'}
                    error={errors.city}
                  />

                  <FormInput
                    id="city_fr"
                    label={locale === 'en' ? 'City (French)' : 'Ville (Français)'}
                    value={formData.city_fr}
                    onChange={(e) => handleInputChange('city_fr', e.target.value)}
                    placeholder={locale === 'en' ? 'Montréal' : 'Montréal'}
                    error={errors.city_fr}
                  />
                </FormGrid>

                {/* State/Province and Postal Code */}
                <FormGrid columns={3}>
                  <FormInput
                    id="state_province"
                    label={locale === 'en' ? 'State/Province (English)' : 'État/Province (Anglais)'}
                    value={formData.state_province}
                    onChange={(e) => handleInputChange('state_province', e.target.value)}
                    placeholder={locale === 'en' ? 'NY / Ontario' : 'NY / Ontario'}
                    error={errors.state_province}
                  />

                  <FormInput
                    id="state_province_fr"
                    label={locale === 'en' ? 'State/Province (French)' : 'État/Province (Français)'}
                    value={formData.state_province_fr}
                    onChange={(e) => handleInputChange('state_province_fr', e.target.value)}
                    placeholder={locale === 'en' ? 'NY / Ontario' : 'NY / Ontario'}
                    error={errors.state_province_fr}
                  />

                  <FormInput
                    id="postal_code"
                    label={locale === 'en' ? 'ZIP/Postal Code' : 'Code postal'}
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder={locale === 'en' ? '10001 / H3A 1A1' : '10001 / H3A 1A1'}
                    error={errors.postal_code}
                  />
                </FormGrid>

                {/* Country */}
                <FormSelect
                  id="country"
                  label={locale === 'en' ? 'Country' : 'Pays'}
                  value={formData.country}
                  onValueChange={(value) => handleInputChange('country', value)}
                  options={countries.map(country => ({
                    value: country.code,
                    label: locale === 'en' ? country.name : country.name_fr
                  }))}
                  placeholder={locale === 'en' ? 'Select country' : 'Sélectionnez le pays'}
                  error={errors.country}
                  required
                />
              </FormSection>

              {/* Contact Information */}
              <FormSection 
                title={locale === 'en' ? 'Contact Information' : 'Informations de contact'}
                description={locale === 'en' ? 'Primary contact details for the restaurant' : 'Coordonnées principales du restaurant'}
              >
                <FormGrid columns={2}>
                  <FormInput
                    id="phone"
                    type="tel"
                    label={locale === 'en' ? 'Phone Number' : 'Numéro de téléphone'}
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder={locale === 'en' ? '+1 (555) 123-4567' : '+1 (555) 123-4567'}
                    error={errors.phone}
                    helpText={locale === 'en' ? 'Include country and area code' : 'Inclure le code pays et régional'}
                  />

                  <FormInput
                    id="email"
                    type="email"
                    label={locale === 'en' ? 'Email Address' : 'Adresse e-mail'}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={locale === 'en' ? 'restaurant@example.com' : 'restaurant@example.com'}
                    error={errors.email}
                    helpText={locale === 'en' ? 'Primary contact email for the restaurant' : 'E-mail de contact principal du restaurant'}
                    success={formData.email && !errors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)}
                  />
                </FormGrid>
              </FormSection>

              {/* Timezone */}
              <FormSelect
                id="timezone"
                label={locale === 'en' ? 'Timezone' : 'Fuseau horaire'}
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
                options={timezones.map(tz => ({
                  value: tz,
                  label: tz
                }))}
                placeholder={locale === 'en' ? 'Select timezone' : 'Sélectionnez le fuseau horaire'}
                error={errors.timezone}
                required
                helpText={locale === 'en' ? 'Choose the timezone for restaurant operations' : 'Choisissez le fuseau horaire pour les opérations du restaurant'}
              />
            </TabsContent>

            <TabsContent value="hours" className="space-y-6">
              <FormSection 
                title={locale === 'en' ? 'Operating Hours' : 'Heures d\'ouverture'}
                description={locale === 'en' 
                  ? 'Set the operating hours for each day of the week' 
                  : 'Définissez les heures d\'ouverture pour chaque jour de la semaine'
                }
              >
                {daysOfWeek.map((day) => {
                  const dayHours = formData.operational_hours?.[day.key] || { open: '09:00', close: '22:00', closed: false };
                  
                  return (
                    <div key={day.key} className="p-4 border-2 border-slate-300 rounded-lg bg-slate-50/80 hover:bg-slate-100/90 hover:border-slate-400 transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-krong-black text-base">
                          {locale === 'en' ? day.en : day.fr}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <FormLabel htmlFor={`${day.key}_closed`} className="text-sm font-medium text-krong-black">
                            {locale === 'en' ? 'Closed' : 'Fermé'}
                          </FormLabel>
                          <Switch
                            id={`${day.key}_closed`}
                            checked={dayHours.closed || false}
                            onCheckedChange={(checked) => handleOperationalHoursChange(day.key, 'closed', checked)}
                          />
                        </div>
                      </div>

                      {!dayHours.closed && (
                        <FormGrid columns={2}>
                          <FormField error={errors[`${day.key}_hours`]}>
                            <FormLabel htmlFor={`${day.key}_open`}>
                              {locale === 'en' ? 'Open Time' : 'Heure d\'ouverture'}
                            </FormLabel>
                            <Input
                              id={`${day.key}_open`}
                              type="time"
                              value={dayHours.open || '09:00'}
                              onChange={(e) => handleOperationalHoursChange(day.key, 'open', e.target.value)}
                              className={errors[`${day.key}_hours`] ? 'border-red-600 focus:border-red-600 focus:ring-red-500 bg-red-50' : 'border-slate-400 focus:border-krong-red bg-white'}
                              aria-invalid={errors[`${day.key}_hours`] ? 'true' : 'false'}
                            />
                          </FormField>
                          <FormField error={errors[`${day.key}_hours`]}>
                            <FormLabel htmlFor={`${day.key}_close`}>
                              {locale === 'en' ? 'Close Time' : 'Heure de fermeture'}
                            </FormLabel>
                            <Input
                              id={`${day.key}_close`}
                              type="time"
                              value={dayHours.close || '22:00'}
                              onChange={(e) => handleOperationalHoursChange(day.key, 'close', e.target.value)}
                              className={errors[`${day.key}_hours`] ? 'border-red-600 focus:border-red-600 focus:ring-red-500 bg-red-50' : 'border-slate-400 focus:border-krong-red bg-white'}
                              aria-invalid={errors[`${day.key}_hours`] ? 'true' : 'false'}
                            />
                          </FormField>
                        </FormGrid>
                      )}
                    </div>
                  );
                })}
              </FormSection>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <FormSection 
                title={locale === 'en' ? 'Restaurant Settings' : 'Paramètres du restaurant'}
                description={locale === 'en' ? 'Configure basic restaurant operational settings' : 'Configurez les paramètres opérationnels de base du restaurant'}
              >
                <FormInput
                  id="capacity"
                  type="number"
                  label={locale === 'en' ? 'Seating Capacity' : 'Capacité d\'accueil'}
                  value={formData.capacity?.toString() || ''}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                  placeholder={locale === 'en' ? 'Number of seats' : 'Nombre de places'}
                  error={errors.capacity}
                  helpText={locale === 'en' ? 'Total number of customers that can be seated' : 'Nombre total de clients pouvant être assis'}
                />

                <Alert>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <AlertDescription>
                    {locale === 'en' 
                      ? 'Additional settings can be configured after creating the restaurant location.'
                      : 'Des paramètres supplémentaires peuvent être configurés après la création du restaurant'
                    }
                  </AlertDescription>
                </Alert>
              </FormSection>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex gap-3 justify-end">
            <Button 
              type="button" 
              onClick={onCancel} 
              variant="outline" 
              disabled={isSubmitting}
            >
              {locale === 'en' ? 'Cancel' : 'Annuler'}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  {locale === 'en' ? 'Saving...' : 'Enregistrement...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {mode === 'create' 
                    ? (locale === 'en' ? 'Create Restaurant' : 'Créer le restaurant')
                    : (locale === 'en' ? 'Update Restaurant' : 'Mettre à jour le restaurant')
                  }
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}