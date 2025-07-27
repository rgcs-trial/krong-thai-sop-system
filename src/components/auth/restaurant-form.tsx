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
import { RestaurantErrorDisplay } from './restaurant-errors';

interface RestaurantFormData {
  name: string;
  name_th: string;
  address?: string;
  address_th?: string;
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
  locale: 'en' | 'th';
  isSubmitting?: boolean;
}

const timezones = [
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Ho_Chi_Minh',
  'UTC'
];

const daysOfWeek = [
  { key: 'monday', en: 'Monday', th: 'จันทร์' },
  { key: 'tuesday', en: 'Tuesday', th: 'อังคาร' },
  { key: 'wednesday', en: 'Wednesday', th: 'พุธ' },
  { key: 'thursday', en: 'Thursday', th: 'พฤหัสบดี' },
  { key: 'friday', en: 'Friday', th: 'ศุกร์' },
  { key: 'saturday', en: 'Saturday', th: 'เสาร์' },
  { key: 'sunday', en: 'Sunday', th: 'อาทิตย์' }
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
    name_th: '',
    address: '',
    address_th: '',
    phone: '',
    email: '',
    timezone: 'Asia/Bangkok',
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
      newErrors.name = locale === 'en' ? 'Restaurant name is required' : 'ชื่อร้านอาหารต้องระบุ';
    }

    if (!formData.name_th.trim()) {
      newErrors.name_th = locale === 'en' ? 'Thai restaurant name is required' : 'ชื่อร้านอาหารภาษาไทยต้องระบุ';
    }

    if (!formData.timezone) {
      newErrors.timezone = locale === 'en' ? 'Timezone is required' : 'เขตเวลาต้องระบุ';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = locale === 'en' ? 'Invalid email format' : 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    // Phone validation (basic)
    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = locale === 'en' ? 'Invalid phone format' : 'รูปแบบเบอร์โทรไม่ถูกต้อง';
    }

    // Capacity validation
    if (formData.capacity && formData.capacity < 1) {
      newErrors.capacity = locale === 'en' ? 'Capacity must be at least 1' : 'จำนวนที่นั่งต้องมากกว่า 0';
    }

    // Operational hours validation
    if (formData.operational_hours) {
      Object.entries(formData.operational_hours).forEach(([day, hours]) => {
        if (!hours.closed) {
          if (!hours.open || !hours.close) {
            newErrors[`${day}_hours`] = locale === 'en' 
              ? 'Open and close times are required' 
              : 'เวลาเปิดและปิดต้องระบุ';
          } else if (hours.open >= hours.close) {
            newErrors[`${day}_hours`] = locale === 'en' 
              ? 'Close time must be after open time' 
              : 'เวลาปิดต้องหลังเวลาเปิด';
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
              ? (locale === 'en' ? 'Add New Restaurant Location' : 'เพิ่มสถานที่ร้านอาหารใหม่')
              : (locale === 'en' ? 'Edit Restaurant Location' : 'แก้ไขสถานที่ร้านอาหาร')
            }
          </h1>
          <p className="text-gray-600">
            {locale === 'en' 
              ? 'Enter restaurant details and operational settings' 
              : 'กรอกรายละเอียดร้านอาหารและการตั้งค่าการดำเนินงาน'
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
                {locale === 'en' ? 'Basic Info' : 'ข้อมูลพื้นฐาน'}
              </TabsTrigger>
              <TabsTrigger value="hours">
                {locale === 'en' ? 'Operating Hours' : 'เวลาทำการ'}
              </TabsTrigger>
              <TabsTrigger value="settings">
                {locale === 'en' ? 'Settings' : 'การตั้งค่า'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              {/* Restaurant Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {locale === 'en' ? 'Restaurant Name (English)' : 'ชื่อร้าน (อังกฤษ)'}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={locale === 'en' ? 'Enter restaurant name' : 'ระบุชื่อร้านอาหาร'}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_th">
                    {locale === 'en' ? 'Restaurant Name (Thai)' : 'ชื่อร้าน (ไทย)'}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="name_th"
                    type="text"
                    value={formData.name_th}
                    onChange={(e) => handleInputChange('name_th', e.target.value)}
                    placeholder={locale === 'en' ? 'ระบุชื่อร้านภาษาไทย' : 'ระบุชื่อร้านภาษาไทย'}
                    className={`${errors.name_th ? 'border-red-500' : ''} font-thai`}
                  />
                  {errors.name_th && (
                    <p className="text-sm text-red-500">{errors.name_th}</p>
                  )}
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">
                    {locale === 'en' ? 'Address (English)' : 'ที่อยู่ (อังกฤษ)'}
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder={locale === 'en' ? 'Enter address' : 'ระบุที่อยู่'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_th">
                    {locale === 'en' ? 'Address (Thai)' : 'ที่อยู่ (ไทย)'}
                  </Label>
                  <Input
                    id="address_th"
                    type="text"
                    value={formData.address_th}
                    onChange={(e) => handleInputChange('address_th', e.target.value)}
                    placeholder={locale === 'en' ? 'ระบุที่อยู่ภาษาไทย' : 'ระบุที่อยู่ภาษาไทย'}
                    className="font-thai"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {locale === 'en' ? 'Phone Number' : 'เบอร์โทรศัพท์'}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder={locale === 'en' ? '+66 XX XXX XXXX' : '+66 XX XXX XXXX'}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    {locale === 'en' ? 'Email Address' : 'อีเมล'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={locale === 'en' ? 'restaurant@example.com' : 'restaurant@example.com'}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">
                  {locale === 'en' ? 'Timezone' : 'เขตเวลา'}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select 
                  value={formData.timezone} 
                  onValueChange={(value) => handleInputChange('timezone', value)}
                >
                  <SelectTrigger className={errors.timezone ? 'border-red-500' : ''}>
                    <SelectValue placeholder={locale === 'en' ? 'Select timezone' : 'เลือกเขตเวลา'} />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-red-500">{errors.timezone}</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="hours" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {locale === 'en' ? 'Operating Hours' : 'เวลาทำการ'}
                </h3>
                <p className="text-sm text-gray-600">
                  {locale === 'en' 
                    ? 'Set the operating hours for each day of the week' 
                    : 'กำหนดเวลาทำการสำหรับแต่ละวันในสัปดาห์'
                  }
                </p>

                {daysOfWeek.map((day) => {
                  const dayHours = formData.operational_hours?.[day.key] || { open: '09:00', close: '22:00', closed: false };
                  
                  return (
                    <div key={day.key} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          {locale === 'en' ? day.en : day.th}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${day.key}_closed`} className="text-sm">
                            {locale === 'en' ? 'Closed' : 'ปิด'}
                          </Label>
                          <Switch
                            id={`${day.key}_closed`}
                            checked={dayHours.closed || false}
                            onCheckedChange={(checked) => handleOperationalHoursChange(day.key, 'closed', checked)}
                          />
                        </div>
                      </div>

                      {!dayHours.closed && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${day.key}_open`} className="text-sm">
                              {locale === 'en' ? 'Open Time' : 'เวลาเปิด'}
                            </Label>
                            <Input
                              id={`${day.key}_open`}
                              type="time"
                              value={dayHours.open || '09:00'}
                              onChange={(e) => handleOperationalHoursChange(day.key, 'open', e.target.value)}
                              className={errors[`${day.key}_hours`] ? 'border-red-500' : ''}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${day.key}_close`} className="text-sm">
                              {locale === 'en' ? 'Close Time' : 'เวลาปิด'}
                            </Label>
                            <Input
                              id={`${day.key}_close`}
                              type="time"
                              value={dayHours.close || '22:00'}
                              onChange={(e) => handleOperationalHoursChange(day.key, 'close', e.target.value)}
                              className={errors[`${day.key}_hours`] ? 'border-red-500' : ''}
                            />
                          </div>
                        </div>
                      )}

                      {errors[`${day.key}_hours`] && (
                        <p className="text-sm text-red-500 mt-2">{errors[`${day.key}_hours`]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {locale === 'en' ? 'Restaurant Settings' : 'การตั้งค่าร้านอาหาร'}
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="capacity">
                    {locale === 'en' ? 'Seating Capacity' : 'จำนวนที่นั่ง'}
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity || ''}
                    onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                    placeholder={locale === 'en' ? 'Number of seats' : 'จำนวนที่นั่ง'}
                    className={errors.capacity ? 'border-red-500' : ''}
                  />
                  {errors.capacity && (
                    <p className="text-sm text-red-500">{errors.capacity}</p>
                  )}
                </div>

                <Alert>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <AlertDescription>
                    {locale === 'en' 
                      ? 'Additional settings can be configured after creating the restaurant location.'
                      : 'การตั้งค่าเพิ่มเติมสามารถกำหนดได้หลังจากสร้างสถานที่ร้านอาหารแล้ว'
                    }
                  </AlertDescription>
                </Alert>
              </div>
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
              {locale === 'en' ? 'Cancel' : 'ยกเลิก'}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  {locale === 'en' ? 'Saving...' : 'กำลังบันทึก...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {mode === 'create' 
                    ? (locale === 'en' ? 'Create Restaurant' : 'สร้างร้านอาหาร')
                    : (locale === 'en' ? 'Update Restaurant' : 'อัปเดตร้านอาหาร')
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