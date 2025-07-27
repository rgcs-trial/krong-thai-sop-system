'use client';

import React from 'react';

// Force dynamic rendering for admin pages that require database access
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Languages, 
  Settings, 
  Users, 
  Database, 
  Shield,
  Bell,
  Palette,
  Globe
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

/**
 * Admin Settings Page
 * Central hub for all administrative settings including translation management
 */
export default function AdminSettingsPage() {
  const { t } = useI18n();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
            <Settings size={32} className="text-primary" />
            {t('admin.settings.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.settings.subtitle')}
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {t('admin.settings.adminOnly')}
        </Badge>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="translations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-14">
          <TabsTrigger value="translations" className="flex flex-col items-center gap-1 text-xs">
            <Languages size={16} />
            {t('admin.settings.translations')}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex flex-col items-center gap-1 text-xs">
            <Users size={16} />
            {t('admin.settings.users')}
          </TabsTrigger>
          <TabsTrigger value="database" className="flex flex-col items-center gap-1 text-xs">
            <Database size={16} />
            {t('admin.settings.database')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex flex-col items-center gap-1 text-xs">
            <Shield size={16} />
            {t('admin.settings.security')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col items-center gap-1 text-xs">
            <Bell size={16} />
            {t('admin.settings.notifications')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex flex-col items-center gap-1 text-xs">
            <Palette size={16} />
            {t('admin.settings.appearance')}
          </TabsTrigger>
        </TabsList>

        {/* Translation Management Tab */}
        <TabsContent value="translations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages size={20} />
                Translation Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Languages size={48} className="mx-auto mb-4 opacity-20" />
                <p>Translation management system loading...</p>
                <p className="text-sm mt-2">Database-driven translation system ready for deployment</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                {t('admin.settings.userManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t('admin.settings.userManagementPlaceholder')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Management Tab */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={20} />
                {t('admin.settings.databaseManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Database size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t('admin.settings.databaseManagementPlaceholder')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                {t('admin.settings.securitySettings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Shield size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t('admin.settings.securitySettingsPlaceholder')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} />
                {t('admin.settings.notificationSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Bell size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t('admin.settings.notificationSettingsPlaceholder')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette size={20} />
                {t('admin.settings.appearanceSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Palette size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t('admin.settings.appearanceSettingsPlaceholder')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}