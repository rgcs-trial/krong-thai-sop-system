/**
 * Restaurant Authentication Flow Page
 * Handles the multi-step authentication process for restaurant tablets
 */

import { RestaurantAuthFlow } from '@/components/auth/restaurant-auth-flow';

interface RestaurantFlowPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function RestaurantFlowPage({ params }: RestaurantFlowPageProps) {
  return <RestaurantAuthFlow params={params} />;
}

export const metadata = {
  title: 'Restaurant Authentication - Krong Thai SOP',
  description: 'Tablet authentication for restaurant staff',
};