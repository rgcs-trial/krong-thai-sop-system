/**
 * Location Selector Component for Manager Authentication
 * Allows managers to select restaurant location and bind tablet
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RestaurantForm } from './restaurant-form';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Restaurant {
  id: string;
  name: string;
  name_th: string;
  address?: string;
  address_th?: string;
  phone?: string;
  email?: string;
}

interface LocationSelectorProps {
  userRole: 'admin' | 'manager';
  userRestaurantId?: string;
  onLocationSelected: (restaurant: Restaurant) => void;
  onCancel: () => void;
  locale: 'en' | 'th';
  isLoading?: boolean;
}

export function LocationSelector({
  userRole,
  userRestaurantId,
  onLocationSelected,
  onCancel,
  locale,
  isLoading = false
}: LocationSelectorProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    loadRestaurants();
  }, [userRole, userRestaurantId]);

  const loadRestaurants = async () => {
    try {
      setLoadingRestaurants(true);
      setError('');

      // For managers, only show their assigned restaurant
      // For admins, show all active restaurants
      const response = await fetch('/api/restaurants?' + new URLSearchParams({
        ...(userRole === 'manager' && userRestaurantId && { restaurantId: userRestaurantId }),
        active: 'true'
      }));

      if (!response.ok) {
        throw new Error('Failed to load restaurants');
      }

      const data = await response.json();
      setRestaurants(data.restaurants || []);

      // Auto-select if manager has only one restaurant
      if (userRole === 'manager' && data.restaurants?.length === 1) {
        setSelectedRestaurant(data.restaurants[0]);
      }
    } catch (err) {
      setError(locale === 'en' 
        ? 'Failed to load restaurant locations' 
        : 'ไม่สามารถโหลดข้อมูลสถานที่ได้'
      );
      console.error('Error loading restaurants:', err);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const handleLocationSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleConfirm = () => {
    if (selectedRestaurant) {
      onLocationSelected(selectedRestaurant);
    }
  };

  const handleAddRestaurant = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create restaurant');
      }

      // Refresh restaurants list
      await loadRestaurants();
      
      // Close form and select the new restaurant
      setShowAddForm(false);
      if (result.restaurant) {
        setSelectedRestaurant(result.restaurant);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setSubmitError(locale === 'en' 
        ? `Failed to create restaurant: ${errorMessage}`
        : `ไม่สามารถสร้างร้านอาหารได้: ${errorMessage}`
      );
      console.error('Error creating restaurant:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setSubmitError('');
  };

  // Show add restaurant form
  if (showAddForm) {
    return (
      <>
        {submitError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
            <Alert variant="destructive">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          </div>
        )}
        <RestaurantForm
          mode="create"
          onSubmit={handleAddRestaurant}
          onCancel={handleCancelAdd}
          locale={locale}
          isSubmitting={isSubmitting}
        />
      </>
    );
  }

  if (loadingRestaurants) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-red-600 border-t-transparent rounded-full" />
          <p className="text-gray-600">
            {locale === 'en' ? 'Loading locations...' : 'กำลังโหลดสถานที่...'}
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-800 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={loadRestaurants} variant="outline">
              {locale === 'en' ? 'Retry' : 'ลองใหม่'}
            </Button>
            <Button onClick={onCancel} variant="outline">
              {locale === 'en' ? 'Cancel' : 'ยกเลิก'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {locale === 'en' ? 'Select Restaurant Location' : 'เลือกสถานที่ร้านอาหาร'}
          </h1>
          <p className="text-gray-600">
            {locale === 'en' 
              ? 'Choose the restaurant location for this tablet session' 
              : 'เลือกสถานที่ร้านอาหารสำหรับการใช้งานแท็บเล็ตนี้'
            }
          </p>
        </div>

        {restaurants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {locale === 'en' ? 'No restaurants available' : 'ไม่มีร้านอาหารที่ใช้งานได้'}
            </p>
            <div className="flex gap-2 justify-center">
              {userRole === 'admin' && (
                <Button 
                  onClick={() => setShowAddForm(true)} 
                  className="bg-red-600 hover:bg-red-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {locale === 'en' ? 'Add Restaurant' : 'เพิ่มร้านอาหาร'}
                </Button>
              )}
              <Button onClick={onCancel} variant="outline">
                {locale === 'en' ? 'Back to Login' : 'กลับไปหน้าเข้าสู่ระบบ'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-8">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRestaurant?.id === restaurant.id
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleLocationSelect(restaurant)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {locale === 'en' ? restaurant.name : restaurant.name_th}
                        </h3>
                        {selectedRestaurant?.id === restaurant.id && (
                          <Badge className="bg-red-600">
                            {locale === 'en' ? 'Selected' : 'เลือกแล้ว'}
                          </Badge>
                        )}
                      </div>
                      {restaurant.address && (
                        <p className="text-gray-600 text-sm">
                          {locale === 'en' ? restaurant.address : restaurant.address_th}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {restaurant.phone && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {restaurant.phone}
                          </span>
                        )}
                        {restaurant.email && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {restaurant.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedRestaurant?.id === restaurant.id
                          ? 'border-red-600 bg-red-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedRestaurant?.id === restaurant.id && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-between">
              <div className="flex gap-2">
                {userRole === 'admin' && (
                  <Button 
                    onClick={() => setShowAddForm(true)} 
                    variant="outline"
                    disabled={isLoading}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {locale === 'en' ? 'Add Location' : 'เพิ่มสถานที่'}
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={onCancel} variant="outline" disabled={isLoading}>
                  {locale === 'en' ? 'Cancel' : 'ยกเลิก'}
                </Button>
                <Button 
                  onClick={handleConfirm} 
                  disabled={!selectedRestaurant || isLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      {locale === 'en' ? 'Setting up...' : 'กำลังตั้งค่า...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {locale === 'en' ? 'Confirm Location' : 'ยืนยันสถานที่'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}