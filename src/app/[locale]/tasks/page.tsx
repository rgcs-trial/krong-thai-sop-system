import React from 'react';
import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PersonalTaskDashboard, 
  TaskCalendarView, 
  TaskNotificationSystem 
} from '@/components/tasks';

interface TasksPageProps {
  params: { locale: string };
  searchParams: { 
    view?: 'dashboard' | 'calendar' | 'analytics';
    userId?: string;
    restaurantId?: string;
  };
}

export const metadata: Metadata = {
  title: 'Task Management - Restaurant Krong Thai',
  description: 'Comprehensive task management system for restaurant operations with real-time collaboration and tracking.',
};

export default function TasksPage({ params, searchParams }: TasksPageProps) {
  const { locale } = params;
  const { view = 'dashboard', userId = 'current-user', restaurantId = 'demo-restaurant' } = searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {locale === 'fr' ? 'Gestion des tâches' : 'Task Management'}
            </h1>
            <p className="text-gray-600 mt-1">
              {locale === 'fr' 
                ? 'Gérez vos tâches quotidiennes et collaborez avec votre équipe'
                : 'Manage your daily tasks and collaborate with your team'
              }
            </p>
          </div>
          
          {/* Notification Bell */}
          <TaskNotificationSystem
            locale={locale}
            userId={userId}
            restaurantId={restaurantId}
          />
        </div>

        {/* Main Task Interface */}
        <Tabs value={view} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#E31B23] data-[state=active]:text-white">
              {locale === 'fr' ? 'Tableau de bord' : 'Dashboard'}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#E31B23] data-[state=active]:text-white">
              {locale === 'fr' ? 'Calendrier' : 'Calendar'}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#E31B23] data-[state=active]:text-white">
              {locale === 'fr' ? 'Analytiques' : 'Analytics'}
            </TabsTrigger>
          </TabsList>

          {/* Personal Task Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <PersonalTaskDashboard
              locale={locale}
              userId={userId}
              restaurantId={restaurantId}
            />
          </TabsContent>

          {/* Task Calendar View */}
          <TabsContent value="calendar" className="space-y-6">
            <TaskCalendarView
              locale={locale}
              userId={userId}
              restaurantId={restaurantId}
              onTaskClick={(task) => {
                // Navigate to task detail view
                window.location.href = `/tasks/${task.id}`;
              }}
              onDateSelect={(date) => {
                // Handle date selection for task creation
                console.log('Date selected for new task:', date);
              }}
            />
          </TabsContent>

          {/* Task Analytics (Placeholder) */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Performance Overview */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {locale === 'fr' ? 'Performance d\'équipe' : 'Team Performance'}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {locale === 'fr' ? 'Tâches terminées' : 'Tasks Completed'}
                    </span>
                    <span className="font-semibold">24/30</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {locale === 'fr' ? 'Taux de réussite' : 'Success Rate'}
                    </span>
                    <span className="font-semibold text-green-600">80%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {locale === 'fr' ? 'Temps moyen' : 'Avg. Time'}
                    </span>
                    <span className="font-semibold">67m</span>
                  </div>
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {locale === 'fr' ? 'Répartition des priorités' : 'Priority Distribution'}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-gray-600">
                        {locale === 'fr' ? 'Critique' : 'Critical'}
                      </span>
                    </div>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-gray-600">
                        {locale === 'fr' ? 'Élevée' : 'High'}
                      </span>
                    </div>
                    <span className="font-semibold">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-gray-600">
                        {locale === 'fr' ? 'Moyenne' : 'Medium'}
                      </span>
                    </div>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded"></div>
                      <span className="text-gray-600">
                        {locale === 'fr' ? 'Faible' : 'Low'}
                      </span>
                    </div>
                    <span className="font-semibold">7</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {locale === 'fr' ? 'Activité récente' : 'Recent Activity'}
                </h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {locale === 'fr' ? 'Nettoyage terminé' : 'Cleaning Completed'}
                    </p>
                    <p className="text-gray-500">
                      {locale === 'fr' ? 'il y a 15 minutes' : '15 minutes ago'}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {locale === 'fr' ? 'Inventaire démarré' : 'Inventory Started'}
                    </p>
                    <p className="text-gray-500">
                      {locale === 'fr' ? 'il y a 32 minutes' : '32 minutes ago'}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {locale === 'fr' ? 'Formation assignée' : 'Training Assigned'}
                    </p>
                    <p className="text-gray-500">
                      {locale === 'fr' ? 'il y a 1 heure' : '1 hour ago'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}