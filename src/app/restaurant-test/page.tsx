/**
 * Restaurant Management Test Page
 * Test page for restaurant location management features
 */

'use client';

import { useState } from 'react';
import { LocationSelector } from '@/components/auth/location-selector';
import { RestaurantForm } from '@/components/auth/restaurant-form';
import { RestaurantErrorDisplay, RestaurantSuccessDisplay } from '@/components/auth/restaurant-errors';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Restaurant {
  id: string;
  name: string;
  name_th: string;
  address?: string;
  address_th?: string;
  phone?: string;
  email?: string;
}

export default function RestaurantTestPage() {
  const [currentView, setCurrentView] = useState<'selector' | 'form' | 'test'>('test');
  const [locale, setLocale] = useState<'en' | 'fr'>('en');
  const [userRole, setUserRole] = useState<'admin' | 'manager'>('admin');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleLocationSelected = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setTestResult({
      type: 'success',
      message: `Restaurant "${locale === 'en' ? restaurant.name : restaurant.name_th}" selected successfully!`
    });
    setCurrentView('test');
  };

  const handleFormSubmit = async (formData: any) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setTestResult({
      type: 'success',
      message: 'Restaurant created successfully!'
    });
    setCurrentView('test');
  };

  const handleCancel = () => {
    setCurrentView('test');
  };

  const testApiEndpoint = async (method: string, endpoint: string, data?: any) => {
    try {
      setTestResult(null);
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(endpoint, options);
      const result = await response.json();

      setTestResult({
        type: response.ok ? 'success' : 'error',
        message: response.ok 
          ? `${method} ${endpoint}: Success! ${JSON.stringify(result).slice(0, 100)}...`
          : `${method} ${endpoint}: Error - ${result.error || 'Unknown error'}`
      });
    } catch (error) {
      setTestResult({
        type: 'error',
        message: `${method} ${endpoint}: Network error - ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  if (currentView === 'selector') {
    return (
      <LocationSelector
        userRole={userRole}
        onLocationSelected={handleLocationSelected}
        onCancel={handleCancel}
        locale={locale}
      />
    );
  }

  if (currentView === 'form') {
    return (
      <RestaurantForm
        mode="create"
        onSubmit={handleFormSubmit}
        onCancel={handleCancel}
        locale={locale}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <Card className="p-6">
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            Restaurant Management System Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test the restaurant location management features including creation, selection, and API endpoints.
          </p>

          {/* Settings */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Language:</label>
              <Button
                size="sm"
                variant={locale === 'en' ? 'default' : 'outline'}
                onClick={() => setLocale('en')}
              >
                EN
              </Button>
              <Button
                size="sm"
                variant={locale === 'fr' ? 'default' : 'outline'}
                onClick={() => setLocale('fr')}
              >
                FR
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Role:</label>
              <Button
                size="sm"
                variant={userRole === 'admin' ? 'default' : 'outline'}
                onClick={() => setUserRole('admin')}
              >
                Admin
              </Button>
              <Button
                size="sm"
                variant={userRole === 'manager' ? 'default' : 'outline'}
                onClick={() => setUserRole('manager')}
              >
                Manager
              </Button>
            </div>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="mb-6">
              {testResult.type === 'success' ? (
                <RestaurantSuccessDisplay
                  message={testResult.message}
                  locale={locale}
                  onDismiss={() => setTestResult(null)}
                />
              ) : (
                <RestaurantErrorDisplay
                  error={testResult.message}
                  locale={locale}
                  onDismiss={() => setTestResult(null)}
                />
              )}
            </div>
          )}

          {/* Selected Restaurant Display */}
          {selectedRestaurant && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Selected Restaurant:</h3>
              <p className="text-green-700">
                <strong>Name:</strong> {locale === 'en' ? selectedRestaurant.name : selectedRestaurant.name_th}
              </p>
              {selectedRestaurant.address && (
                <p className="text-green-700">
                  <strong>Address:</strong> {locale === 'en' ? selectedRestaurant.address : selectedRestaurant.address_th}
                </p>
              )}
              {selectedRestaurant.phone && (
                <p className="text-green-700">
                  <strong>Phone:</strong> {selectedRestaurant.phone}
                </p>
              )}
              {selectedRestaurant.email && (
                <p className="text-green-700">
                  <strong>Email:</strong> {selectedRestaurant.email}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Component Tests */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Component Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setCurrentView('selector')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Test Location Selector
            </Button>
            <Button
              onClick={() => setCurrentView('form')}
              className="bg-green-600 hover:bg-green-700"
            >
              Test Restaurant Form
            </Button>
          </div>
        </Card>

        {/* API Tests */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Endpoint Tests</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">GET /api/restaurants</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint('GET', '/api/restaurants')}
                >
                  Get All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint('GET', '/api/restaurants?active=true')}
                >
                  Get Active Only
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-2">POST /api/restaurants</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testApiEndpoint('POST', '/api/restaurants', {
                  name: 'Test Restaurant',
                  name_th: 'ร้านทดสอบ',
                  address: '123 Test Street',
                  address_th: '123 ถนนทดสอบ',
                  phone: '+66123456789',
                  email: 'test@restaurant.com',
                  timezone: 'Asia/Bangkok',
                  capacity: 50,
                  operational_hours: {
                    monday: { open: '09:00', close: '22:00', closed: false },
                    tuesday: { open: '09:00', close: '22:00', closed: false },
                    wednesday: { open: '09:00', close: '22:00', closed: false },
                    thursday: { open: '09:00', close: '22:00', closed: false },
                    friday: { open: '09:00', close: '22:00', closed: false },
                    saturday: { open: '09:00', close: '22:00', closed: false },
                    sunday: { open: '10:00', close: '21:00', closed: false }
                  }
                })}
              >
                Create Test Restaurant
              </Button>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-2">Validation Tests</h3>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint('POST', '/api/restaurants', {
                    name: '', // Missing required field
                    name_th: 'ร้านทดสอบ'
                  })}
                >
                  Test Missing Name
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint('POST', '/api/restaurants', {
                    name: 'Test Restaurant',
                    name_th: 'ร้านทดสอบ',
                    email: 'invalid-email' // Invalid email
                  })}
                >
                  Test Invalid Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint('POST', '/api/restaurants', {
                    name: 'Test Restaurant',
                    name_th: 'ร้านทดสอบ',
                    capacity: -5 // Invalid capacity
                  })}
                >
                  Test Invalid Capacity
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Documentation */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Features Implemented</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Restaurant creation form with bilingual support (EN/TH)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Location selector with "Add Location" functionality for admins</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>API endpoints for CRUD operations (GET, POST, PUT, DELETE)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Comprehensive validation with Zod schemas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Error handling components with bilingual messages</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Tablet-optimized UI with proper touch targets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Operational hours management with day-specific settings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Brand-consistent styling with Krong Thai colors</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}