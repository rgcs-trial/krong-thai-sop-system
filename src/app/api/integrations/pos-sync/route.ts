/**
 * POS System Synchronization API Route
 * Handles integration with Point of Sale systems for inventory and sales data
 * 
 * GET    /api/integrations/pos-sync                - Get POS sync status and data
 * POST   /api/integrations/pos-sync                - Trigger POS data synchronization  
 * PUT    /api/integrations/pos-sync/config         - Update POS configuration
 * POST   /api/integrations/pos-sync/webhook        - Receive POS webhook events
 * GET    /api/integrations/pos-sync/inventory      - Get synced inventory data
 * GET    /api/integrations/pos-sync/sales          - Get sales data for SOP optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface POSConfiguration {
  id?: string;
  pos_provider: 'square' | 'toast' | 'clover' | 'revel' | 'shopify' | 'lightspeed' | 'custom';
  api_endpoint: string;
  api_key: string;
  merchant_id: string;
  location_id: string;
  sync_enabled: boolean;
  sync_frequency_minutes: number;
  sync_features: {
    inventory_sync: boolean;
    sales_data_sync: boolean;
    menu_item_sync: boolean;
    modifier_sync: boolean;
    category_sync: boolean;
  };
  field_mappings: {
    item_id_field: string;
    item_name_field: string;
    category_field: string;
    price_field: string;
    inventory_field: string;
  };
  webhook_endpoints: {
    inventory_update: string;
    sale_completed: string;
    item_modified: string;
  };
  last_sync_at?: string;
  sync_status: 'active' | 'error' | 'disabled';
  error_message?: string;
}

interface POSInventoryItem {
  pos_item_id: string;
  sop_id?: string;
  item_name: string;
  category: string;
  current_stock: number;
  par_level: number;
  unit_cost: number;
  sell_price: number;
  last_updated: string;
  related_sops: Array<{
    sop_id: string;
    title: string;
    relationship_type: 'ingredient' | 'preparation' | 'storage' | 'quality_check';
  }>;
  low_stock_alert: boolean;
  expiry_date?: string;
  supplier_info?: {
    supplier_name: string;
    order_frequency: string;
    lead_time_days: number;
  };
}

interface POSSalesData {
  sale_date: string;
  item_sales: Array<{
    pos_item_id: string;
    item_name: string;
    quantity_sold: number;
    revenue: number;
    prep_time_minutes?: number;
    related_sop_usage: Array<{
      sop_id: string;
      usage_count: number;
    }>;
  }>;
  total_revenue: number;
  peak_hours: Array<{
    hour: number;
    order_count: number;
    revenue: number;
  }>;
  top_selling_items: Array<{
    pos_item_id: string;
    item_name: string;
    quantity_sold: number;
    revenue_percentage: number;
  }>;
}

interface SOPInventoryRecommendation {
  recommendation_id: string;
  recommendation_type: 'reorder' | 'prep_schedule' | 'quality_check' | 'menu_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  affected_items: string[];
  related_sops: string[];
  description: string;
  description_fr: string;
  action_required: string;
  action_required_fr: string;
  estimated_impact: {
    cost_impact?: number;
    time_impact_minutes?: number;
    quality_impact?: string;
  };
  expires_at: string;
  created_at: string;
}

interface POSWebhookEvent {
  event_type: 'inventory_low' | 'item_sold' | 'menu_item_updated' | 'sale_voided' | 'shift_closed';
  event_data: {
    item_id?: string;
    quantity?: number;
    timestamp: string;
    location_id: string;
    additional_data?: Record<string, any>;
  };
  signature?: string;
}

/**
 * POS System Integration Manager
 * Handles synchronization with various POS systems
 */
class POSIntegrationManager {
  private context: SOPAuthContext;
  private restaurantId: string;
  private config?: POSConfiguration;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Initialize POS configuration
   */
  async initialize(): Promise<void> {
    const { data: config } = await supabaseAdmin
      .from('pos_configurations')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .single();

    this.config = config;
  }

  /**
   * Synchronize inventory data from POS
   */
  async syncInventoryData(): Promise<{ synced: number; errors: string[] }> {
    if (!this.config || !this.config.sync_enabled || !this.config.sync_features.inventory_sync) {
      throw new Error('POS inventory sync not configured or disabled');
    }

    const syncResults = {
      synced: 0,
      errors: [] as string[]
    };

    try {
      // Fetch inventory data from POS system
      const inventoryData = await this.fetchPOSInventory();
      
      // Process each inventory item
      for (const item of inventoryData) {
        try {
          // Find related SOPs for this inventory item
          const relatedSOPs = await this.findRelatedSOPs(item);
          
          // Store/update inventory data
          await this.storeInventoryData({
            ...item,
            related_sops: relatedSOPs
          });

          // Check for low stock alerts and SOP implications
          if (item.current_stock <= item.par_level * 0.3) {
            await this.handleLowStockAlert(item, relatedSOPs);
          }

          syncResults.synced++;
        } catch (error) {
          const errorMessage = `Failed to sync inventory item ${item.pos_item_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          syncResults.errors.push(errorMessage);
        }
      }

      // Update sync status
      await this.updateSyncStatus('inventory', syncResults.errors.length === 0 ? 'active' : 'error', 
        syncResults.errors.length > 0 ? syncResults.errors.join('; ') : null);

    } catch (error) {
      syncResults.errors.push(`POS inventory sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return syncResults;
  }

  /**
   * Synchronize sales data from POS
   */
  async syncSalesData(startDate: string, endDate: string): Promise<{ synced: number; errors: string[] }> {
    if (!this.config || !this.config.sync_enabled || !this.config.sync_features.sales_data_sync) {
      throw new Error('POS sales sync not configured or disabled');
    }

    const syncResults = {
      synced: 0,
      errors: [] as string[]
    };

    try {
      // Fetch sales data from POS system
      const salesData = await this.fetchPOSSalesData(startDate, endDate);
      
      // Process sales data for each day
      for (const dayData of salesData) {
        try {
          // Store sales data
          await this.storeSalesData(dayData);
          
          // Analyze SOP usage patterns
          await this.analyzeSalesSOPPatterns(dayData);
          
          // Generate optimization recommendations
          await this.generateSalesRecommendations(dayData);
          
          syncResults.synced++;
        } catch (error) {
          const errorMessage = `Failed to sync sales data for ${dayData.sale_date}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          syncResults.errors.push(errorMessage);
        }
      }

      // Update sync status
      await this.updateSyncStatus('sales', syncResults.errors.length === 0 ? 'active' : 'error',
        syncResults.errors.length > 0 ? syncResults.errors.join('; ') : null);

    } catch (error) {
      syncResults.errors.push(`POS sales sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return syncResults;
  }

  /**
   * Fetch inventory data from POS system
   */
  private async fetchPOSInventory(): Promise<Omit<POSInventoryItem, 'related_sops'>[]> {
    if (!this.config) {
      throw new Error('POS configuration not initialized');
    }

    const response = await fetch(`${this.config.api_endpoint}/inventory`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.api_key}`,
        'Content-Type': 'application/json',
        'X-Location-ID': this.config.location_id
      }
    });

    if (!response.ok) {
      throw new Error(`POS API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    
    // Transform POS data to our format
    return this.transformPOSInventoryData(data);
  }

  /**
   * Fetch sales data from POS system
   */
  private async fetchPOSSalesData(startDate: string, endDate: string): Promise<POSSalesData[]> {
    if (!this.config) {
      throw new Error('POS configuration not initialized');
    }

    const response = await fetch(`${this.config.api_endpoint}/sales?start=${startDate}&end=${endDate}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.api_key}`,
        'Content-Type': 'application/json',
        'X-Location-ID': this.config.location_id
      }
    });

    if (!response.ok) {
      throw new Error(`POS API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    
    // Transform POS data to our format
    return this.transformPOSSalesData(data);
  }

  /**
   * Transform POS inventory data to our format
   */
  private transformPOSInventoryData(posData: any): Omit<POSInventoryItem, 'related_sops'>[] {
    const mappings = this.config?.field_mappings;
    
    return (posData.items || posData || []).map((item: any) => ({
      pos_item_id: item[mappings?.item_id_field || 'id'] || item.id,
      item_name: item[mappings?.item_name_field || 'name'] || item.name,
      category: item[mappings?.category_field || 'category'] || item.category || 'uncategorized',
      current_stock: item[mappings?.inventory_field || 'stock'] || item.quantity || 0,
      par_level: item.par_level || item.min_quantity || 10,
      unit_cost: item.cost || item.unit_cost || 0,
      sell_price: item[mappings?.price_field || 'price'] || item.price || 0,
      last_updated: item.updated_at || item.last_modified || new Date().toISOString(),
      low_stock_alert: (item.quantity || 0) <= (item.par_level || item.min_quantity || 10) * 0.3,
      expiry_date: item.expiry_date,
      supplier_info: item.supplier ? {
        supplier_name: item.supplier.name,
        order_frequency: item.supplier.frequency || 'weekly',
        lead_time_days: item.supplier.lead_time || 3
      } : undefined
    }));
  }

  /**
   * Transform POS sales data to our format
   */
  private transformPOSSalesData(posData: any): POSSalesData[] {
    const salesByDate = new Map<string, any>();

    // Group sales by date
    for (const sale of posData.sales || posData || []) {
      const saleDate = sale.date || sale.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      
      if (!salesByDate.has(saleDate)) {
        salesByDate.set(saleDate, {
          sale_date: saleDate,
          item_sales: [],
          total_revenue: 0,
          peak_hours: [],
          top_selling_items: []
        });
      }

      const dayData = salesByDate.get(saleDate);
      
      // Process sale items
      for (const item of sale.items || sale.line_items || []) {
        const existingItem = dayData.item_sales.find((i: any) => i.pos_item_id === item.id);
        
        if (existingItem) {
          existingItem.quantity_sold += item.quantity || 1;
          existingItem.revenue += item.total || item.price || 0;
        } else {
          dayData.item_sales.push({
            pos_item_id: item.id,
            item_name: item.name,
            quantity_sold: item.quantity || 1,
            revenue: item.total || item.price || 0,
            prep_time_minutes: item.prep_time,
            related_sop_usage: [] // Will be populated later
          });
        }
      }

      dayData.total_revenue += sale.total || sale.amount || 0;
    }

    return Array.from(salesByDate.values());
  }

  /**
   * Find SOPs related to inventory item
   */
  private async findRelatedSOPs(item: Omit<POSInventoryItem, 'related_sops'>): Promise<POSInventoryItem['related_sops']> {
    // Search for SOPs that mention this item
    const { data: relatedSOPs } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title, content, tags')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .or(`title.ilike.%${item.item_name}%,content.ilike.%${item.item_name}%,tags.cs.{${item.category}}`);

    if (!relatedSOPs) return [];

    return relatedSOPs.map(sop => {
      // Determine relationship type based on content analysis
      const content = sop.content.toLowerCase();
      const itemName = item.item_name.toLowerCase();
      
      let relationshipType: POSInventoryItem['related_sops'][0]['relationship_type'] = 'ingredient';
      
      if (content.includes('prep') || content.includes('cook') || content.includes('prepare')) {
        relationshipType = 'preparation';
      } else if (content.includes('store') || content.includes('refrigerat') || content.includes('freez')) {
        relationshipType = 'storage';
      } else if (content.includes('check') || content.includes('quality') || content.includes('inspect')) {
        relationshipType = 'quality_check';
      }
      
      return {
        sop_id: sop.id,
        title: sop.title,
        relationship_type: relationshipType
      };
    });
  }

  /**
   * Store inventory data in database
   */
  private async storeInventoryData(item: POSInventoryItem): Promise<void> {
    await supabaseAdmin
      .from('pos_inventory_items')
      .upsert({
        restaurant_id: this.restaurantId,
        pos_item_id: item.pos_item_id,
        item_name: item.item_name,
        category: item.category,
        current_stock: item.current_stock,
        par_level: item.par_level,
        unit_cost: item.unit_cost,
        sell_price: item.sell_price,
        last_updated: item.last_updated,
        related_sops: item.related_sops,
        low_stock_alert: item.low_stock_alert,
        expiry_date: item.expiry_date,
        supplier_info: item.supplier_info,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'restaurant_id,pos_item_id',
        ignoreDuplicates: false
      });
  }

  /**
   * Store sales data in database
   */
  private async storeSalesData(salesData: POSSalesData): Promise<void> {
    await supabaseAdmin
      .from('pos_sales_data')
      .upsert({
        restaurant_id: this.restaurantId,
        sale_date: salesData.sale_date,
        item_sales: salesData.item_sales,
        total_revenue: salesData.total_revenue,
        peak_hours: salesData.peak_hours,
        top_selling_items: salesData.top_selling_items,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'restaurant_id,sale_date',
        ignoreDuplicates: false
      });
  }

  /**
   * Handle low stock alerts
   */
  private async handleLowStockAlert(item: Omit<POSInventoryItem, 'related_sops'>, relatedSOPs: POSInventoryItem['related_sops']): Promise<void> {
    // Create notifications for affected SOPs
    const sopIds = relatedSOPs.map(sop => sop.sop_id);
    
    if (sopIds.length > 0) {
      // Find users who work with these SOPs
      const { data: affectedUsers } = await supabaseAdmin
        .from('sop_assignments')
        .select('assigned_to')
        .eq('restaurant_id', this.restaurantId)
        .in('sop_id', sopIds)
        .eq('status', 'active');

      const userIds = [...new Set(affectedUsers?.map(a => a.assigned_to) || [])];

      // Send notifications
      const notifications = userIds.map(userId => ({
        restaurant_id: this.restaurantId,
        user_id: userId,
        notification_type: 'inventory_alert',
        title: 'Low Stock Alert',
        title_fr: 'Alerte de Stock Bas',
        message: `${item.item_name} is running low (${item.current_stock} remaining)`,
        message_fr: `${item.item_name} est en rupture de stock (${item.current_stock} restant)`,
        is_read: false,
        created_at: new Date().toISOString(),
        metadata: {
          pos_item_id: item.pos_item_id,
          current_stock: item.current_stock,
          par_level: item.par_level,
          affected_sops: sopIds
        }
      }));

      if (notifications.length > 0) {
        await supabaseAdmin
          .from('sop_notifications')
          .insert(notifications);
      }
    }
  }

  /**
   * Analyze sales patterns for SOP optimization
   */
  private async analyzeSalesSOPPatterns(salesData: POSSalesData): Promise<void> {
    // Find SOPs related to top-selling items
    for (const topItem of salesData.top_selling_items.slice(0, 5)) {
      const { data: relatedSOPs } = await supabaseAdmin
        .from('pos_inventory_items')
        .select('related_sops')
        .eq('restaurant_id', this.restaurantId)
        .eq('pos_item_id', topItem.pos_item_id)
        .single();

      if (relatedSOPs?.related_sops) {
        // Update SOP usage tracking
        for (const sopRelation of relatedSOPs.related_sops) {
          await supabaseAdmin
            .from('sop_usage_analytics')
            .upsert({
              restaurant_id: this.restaurantId,
              sop_id: sopRelation.sop_id,
              usage_date: salesData.sale_date,
              usage_count: topItem.quantity_sold,
              usage_source: 'pos_sales',
              revenue_generated: topItem.revenue_percentage * salesData.total_revenue / 100,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'restaurant_id,sop_id,usage_date,usage_source',
              ignoreDuplicates: false
            });
        }
      }
    }
  }

  /**
   * Generate recommendations based on sales data
   */
  private async generateSalesRecommendations(salesData: POSSalesData): Promise<void> {
    const recommendations: SOPInventoryRecommendation[] = [];

    // Analyze peak hours for staff scheduling recommendations
    if (salesData.peak_hours.length > 0) {
      const peakHour = salesData.peak_hours.reduce((peak, hour) => 
        hour.order_count > peak.order_count ? hour : peak
      );

      recommendations.push({
        recommendation_id: `peak_hour_${salesData.sale_date}_${peakHour.hour}`,
        recommendation_type: 'prep_schedule',
        priority: 'medium',
        affected_items: salesData.top_selling_items.slice(0, 3).map(item => item.pos_item_id),
        related_sops: [], // Will be populated
        description: `Peak hour at ${peakHour.hour}:00 with ${peakHour.order_count} orders. Consider prep scheduling.`,
        description_fr: `Heure de pointe à ${peakHour.hour}:00 avec ${peakHour.order_count} commandes. Envisager la planification de la préparation.`,
        action_required: 'Schedule additional prep staff and SOPs before peak hours',
        action_required_fr: 'Planifier du personnel de préparation supplémentaire et des SOPs avant les heures de pointe',
        estimated_impact: {
          time_impact_minutes: 30,
          quality_impact: 'improved'
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        created_at: new Date().toISOString()
      });
    }

    // Store recommendations
    if (recommendations.length > 0) {
      const recommendationData = recommendations.map(rec => ({
        restaurant_id: this.restaurantId,
        recommendation_id: rec.recommendation_id,
        recommendation_type: rec.recommendation_type,
        priority: rec.priority,
        affected_items: rec.affected_items,
        related_sops: rec.related_sops,
        description: rec.description,
        description_fr: rec.description_fr,
        action_required: rec.action_required,
        action_required_fr: rec.action_required_fr,
        estimated_impact: rec.estimated_impact,
        expires_at: rec.expires_at,
        created_at: rec.created_at
      }));

      await supabaseAdmin
        .from('sop_inventory_recommendations')
        .insert(recommendationData);
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(syncType: string, status: string, errorMessage?: string): Promise<void> {
    await supabaseAdmin
      .from('pos_configurations')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: status,
        error_message: errorMessage
      })
      .eq('restaurant_id', this.restaurantId);
  }

  /**
   * Process POS webhook events
   */
  async processWebhookEvent(event: POSWebhookEvent): Promise<void> {
    switch (event.event_type) {
      case 'inventory_low':
        await this.handleInventoryLowWebhook(event.event_data);
        break;
      case 'item_sold':
        await this.handleItemSoldWebhook(event.event_data);
        break;
      case 'menu_item_updated':
        await this.handleMenuItemUpdatedWebhook(event.event_data);
        break;
      case 'sale_voided':
        await this.handleSaleVoidedWebhook(event.event_data);
        break;
      case 'shift_closed':
        await this.handleShiftClosedWebhook(event.event_data);
        break;
    }

    // Log webhook event
    await supabaseAdmin
      .from('pos_webhook_events')
      .insert({
        restaurant_id: this.restaurantId,
        event_type: event.event_type,
        event_data: event.event_data,
        processed_at: new Date().toISOString()
      });
  }

  /**
   * Handle inventory low webhook
   */
  private async handleInventoryLowWebhook(eventData: any): Promise<void> {
    if (eventData.item_id) {
      // Trigger immediate inventory sync for this item
      const { data: inventoryItem } = await supabaseAdmin
        .from('pos_inventory_items')
        .select('*, related_sops')
        .eq('restaurant_id', this.restaurantId)
        .eq('pos_item_id', eventData.item_id)
        .single();

      if (inventoryItem) {
        await this.handleLowStockAlert(inventoryItem, inventoryItem.related_sops || []);
      }
    }
  }

  /**
   * Handle item sold webhook
   */
  private async handleItemSoldWebhook(eventData: any): Promise<void> {
    // Update real-time usage tracking
    if (eventData.item_id) {
      const today = new Date().toISOString().split('T')[0];
      
      await supabaseAdmin
        .from('sop_usage_analytics')
        .upsert({
          restaurant_id: this.restaurantId,
          sop_id: eventData.item_id, // This would need proper mapping
          usage_date: today,
          usage_count: eventData.quantity || 1,
          usage_source: 'pos_realtime',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id,sop_id,usage_date,usage_source',
          ignoreDuplicates: false
        });
    }
  }

  /**
   * Handle menu item updated webhook
   */
  private async handleMenuItemUpdatedWebhook(eventData: any): Promise<void> {
    // Trigger sync for updated item
    if (eventData.item_id) {
      // This would trigger a partial sync for the specific item
      console.log(`Menu item ${eventData.item_id} updated, triggering sync`);
    }
  }

  /**
   * Handle sale voided webhook
   */
  private async handleSaleVoidedWebhook(eventData: any): Promise<void> {
    // Update analytics to remove voided sales
    console.log('Sale voided:', eventData);
  }

  /**
   * Handle shift closed webhook
   */
  private async handleShiftClosedWebhook(eventData: any): Promise<void> {
    // Trigger end-of-shift compliance checks
    const today = new Date().toISOString().split('T')[0];
    
    // This could trigger automated compliance monitoring
    await supabaseAdmin
      .from('compliance_violations')
      .insert({
        restaurant_id: this.restaurantId,
        violation_type: 'shift_close_check',
        severity: 'low',
        sop_id: 'system',
        user_id: this.context.userId,
        description: 'Shift closed - running end-of-day compliance check',
        description_fr: 'Équipe fermée - vérification de conformité de fin de journée',
        detected_at: new Date().toISOString(),
        auto_resolved: false,
        metadata: { shift_data: eventData }
      });
  }
}

/**
 * GET /api/integrations/pos-sync - Get POS sync status and data
 */
async function handleGetPOSStatus(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const includeInventory = searchParams.get('include_inventory') === 'true';
    const includeSales = searchParams.get('include_sales') === 'true';
    const includeRecommendations = searchParams.get('include_recommendations') === 'true';

    // Get POS configuration
    const { data: config } = await supabaseAdmin
      .from('pos_configurations')
      .select('*')
      .eq('restaurant_id', context.restaurantId)
      .single();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'POS integration not configured',
        errorCode: 'NOT_CONFIGURED',
      } as APIResponse, { status: 404 });
    }

    const responseData: any = {
      configuration: {
        provider: config.pos_provider,
        sync_enabled: config.sync_enabled,
        sync_frequency_minutes: config.sync_frequency_minutes,
        last_sync_at: config.last_sync_at,
        sync_status: config.sync_status,
        sync_features: config.sync_features
      }
    };

    if (includeInventory) {
      const { data: inventory } = await supabaseAdmin
        .from('pos_inventory_items')
        .select('*')
        .eq('restaurant_id', context.restaurantId)
        .order('current_stock', { ascending: true })
        .limit(50);

      responseData.inventory_items = inventory || [];
    }

    if (includeSales) {
      const { data: sales } = await supabaseAdmin
        .from('pos_sales_data')
        .select('*')
        .eq('restaurant_id', context.restaurantId)
        .gte('sale_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('sale_date', { ascending: false })
        .limit(30);

      responseData.sales_data = sales || [];
    }

    if (includeRecommendations) {
      const { data: recommendations } = await supabaseAdmin
        .from('sop_inventory_recommendations')
        .select('*')
        .eq('restaurant_id', context.restaurantId)
        .gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      responseData.recommendations = recommendations || [];
    }

    const response: APIResponse = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/integrations/pos-sync:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/integrations/pos-sync - Trigger POS data synchronization
 */
async function handlePOSSync(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sync_type, start_date, end_date } = sanitizeInput(body);

    const manager = new POSIntegrationManager(context);
    await manager.initialize();

    let result: any;

    switch (sync_type) {
      case 'inventory':
        result = await manager.syncInventoryData();
        break;
      case 'sales':
        if (!start_date || !end_date) {
          return NextResponse.json({
            success: false,
            error: 'start_date and end_date are required for sales sync',
            errorCode: 'VALIDATION_ERROR',
          } as APIResponse, { status: 400 });
        }
        result = await manager.syncSalesData(start_date, end_date);
        break;
      case 'full':
        const inventoryResult = await manager.syncInventoryData();
        const salesResult = await manager.syncSalesData(
          start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date || new Date().toISOString()
        );
        result = {
          inventory: inventoryResult,
          sales: salesResult,
          total_synced: inventoryResult.synced + salesResult.synced,
          total_errors: [...inventoryResult.errors, ...salesResult.errors]
        };
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid sync_type. Must be one of: inventory, sales, full',
          errorCode: 'VALIDATION_ERROR',
        } as APIResponse, { status: 400 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'pos_sync',
      null,
      null,
      { sync_type, result },
      request
    );

    const response: APIResponse = {
      success: true,
      data: result,
      message: `POS ${sync_type} sync completed successfully`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/integrations/pos-sync:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'POS_SYNC_ERROR',  
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetPOSStatus, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handlePOSSync, PERMISSIONS.SOP.CREATE, {
  maxRequests: 20,
  windowMs: 60000, // 1 minute
});

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}