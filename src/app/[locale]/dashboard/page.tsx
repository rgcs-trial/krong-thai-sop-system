/**
 * Dashboard Page for Restaurant Krong Thai SOP Management System
 * Main landing page after authentication with tablet optimization
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth, useSession } from '@/lib/stores/auth-store';
import { LanguageToggle } from '@/components/language-toggle';
import { 
  Shield, 
  Users, 
  BookOpen, 
  Clock, 
  Settings, 
  LogOut,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Smartphone,
  Calendar
} from 'lucide-react';

interface DashboardPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const [locale, setLocale] = useState('en');
  const [isClient, setIsClient] = useState(false);
  const [authState, setAuthState] = useState<{
    user: any;
    userProfile: any;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
  }>({
    user: null,
    userProfile: null,
    isAuthenticated: false,
    logout: async () => {},
  });
  const [sessionState, setSessionState] = useState<{
    expiresAt: Date | null;
    lastActivity: Date | null;
    updateLastActivity: () => void;
  }>({
    expiresAt: null,
    lastActivity: null,
    updateLastActivity: () => {},
  });
  
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');

  // Resolve params and set client ready state
  useEffect(() => {
    const resolveParams = async () => {
      const { locale: paramLocale } = await params;
      setLocale(paramLocale);
      setIsClient(true);
    };
    
    resolveParams();
  }, [params]);

  // Update activity only on client side
  useEffect(() => {
    if (isClient) {
      updateLastActivity();
    }
  }, [isClient, updateLastActivity]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  // Show loading state during SSR or while resolving params
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication loading state if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {tAuth('title')}
                </h1>
                <p className="text-sm text-gray-600">
                  {tAuth('subtitle')}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.fullName || user.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role}
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {tAuth('logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t('welcome')}
            </h2>
            <p className="text-gray-600">
              {new Date().toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('totalSops')}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+2</span> from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('activeCategories')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">16</div>
                <p className="text-xs text-muted-foreground">
                  All categories active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('lastLogin')}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lastActivity ? new Date(lastActivity).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : '--:--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Session active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('systemStatus')}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {t('online')}
                </div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Access */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('quickAccess')}</CardTitle>
                  <CardDescription>
                    Access frequently used SOPs and functions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { name: 'Food Safety', icon: Shield, color: 'bg-red-100 text-red-700', count: 8 },
                      { name: 'Kitchen Ops', icon: Settings, color: 'bg-blue-100 text-blue-700', count: 6 },
                      { name: 'Cleaning', icon: Users, color: 'bg-green-100 text-green-700', count: 4 },
                      { name: 'Emergency', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700', count: 3 },
                      { name: 'Training', icon: BookOpen, color: 'bg-purple-100 text-purple-700', count: 5 },
                      { name: 'Quality Control', icon: TrendingUp, color: 'bg-indigo-100 text-indigo-700', count: 7 },
                    ].map((category) => (
                      <Button
                        key={category.name}
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center p-4 hover:shadow-md transition-shadow"
                      >
                        <div className={`w-10 h-10 rounded-full ${category.color} flex items-center justify-center mb-2`}>
                          <category.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-center">{category.name}</span>
                        <span className="text-xs text-gray-500">{category.count} SOPs</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Session & System Info */}
            <div className="space-y-6">
              {/* Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smartphone className="w-5 h-5 mr-2" />
                    Session Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Role</span>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Device</span>
                    <Badge variant="secondary">
                      Tablet
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Session Expires</span>
                    <span className="text-sm font-medium">
                      {expiresAt ? new Date(expiresAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : 'Unknown'}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Secure Connection
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    {t('recentlyViewed')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">{t('noRecentSops')}</p>
                    <p className="text-xs mt-1">Start browsing SOPs to see recent activity</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}