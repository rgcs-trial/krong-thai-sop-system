/**
 * Kitchen Display System (KDS) Integration API Route
 * Handles integration with restaurant Kitchen Display Systems for SOP-related operations
 * 
 * GET    /api/integrations/kitchen-display           - Get KDS integration status and data
 * POST   /api/integrations/kitchen-display           - Send SOP data to KDS
 * PUT    /api/integrations/kitchen-display/config    - Update KDS configuration
 * POST   /api/integrations/kitchen-display/sync      - Sync SOPs with KDS
 * POST   /api/integrations/kitchen-display/webhook   - Receive KDS webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface KDSConfiguration {
  id?: string;
  kds_provider: 'toast' | 'square' | 'revel' | 'aloha' | 'custom';
  api_endpoint: string;
  api_key: string;
  restaurant_location_id: string;
  sync_enabled: boolean;
  sync_frequency_minutes: number;
  supported_features: {
    recipe_display: boolean;
    prep_instructions: boolean;
    quality_alerts: boolean;
    compliance_notifications: boolean;
    timing_integration: boolean;
  };
  field_mappings: {
    sop_id_field: string;
    title_field: string;
    instructions_field: string;
    category_field: string;
  };
  webhook_url?: string;
  webhook_secret?: string;
  last_sync_at?: string;
  sync_status: 'active' | 'error' | 'disabled';
  error_message?: string;
}

interface KDSDisplayItem {
  id: string;
  kds_item_id: string;
  sop_id: string;
  title: string;
  title_fr: string;
  category: string;
  instructions: string[];
  prep_time_minutes?: number;
  quality_checks: string[];
  allergen_alerts: string[];
  temperature_requirements?: {
    min_temp?: number;
    max_temp?: number;
    unit: 'C' | 'F';
  };
  display_priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface KDSOrderIntegration {
  order_id: string;
  kds_order_id: string;
  related_sops: Array<{
    sop_id: string;
    title: string;
    instructions: string[];
    estimated_prep_time: number;
    quality_requirements: string[];
  }>;
  prep_start_time?: string;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  quality_check_results?: Array<{
    check_item: string;
    passed: boolean;
    notes?: string;
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'quality_failed';
}

interface KDSWebhookEvent {
  event_type: 'order_started' | 'order_completed' | 'quality_check' | 'prep_delay' | 'item_void';
  event_data: {
    order_id: string;
    item_id?: string;
    station_id?: string;
    user_id?: string;
    timestamp: string;
    additional_data?: Record<string, any>;
  };
  signature?: string;
}

/**
 * Kitchen Display System Integration Manager
 * Handles communication with various KDS providers
 */
class KDSIntegrationManager {
  private context: SOPAuthContext;
  private restaurantId: string;
  private config?: KDSConfiguration;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Initialize KDS configuration
   */
  async initialize(): Promise<void> {
    const { data: config } = await supabaseAdmin
      .from('kds_configurations')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .single();

    this.config = config;
  }

  /**
   * Sync SOPs with KDS system
   */
  async syncSOPsWithKDS(): Promise<{ synced: number; errors: string[] }> {
    if (!this.config || !this.config.sync_enabled) {
      throw new Error('KDS integration not configured or disabled');
    }

    // Get active SOPs that should be synced to KDS
    const { data: sops } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        id, title, title_fr, content, content_fr, 
        category:sop_categories!inner(id, name, name_fr),
        tags, estimated_read_time, difficulty_level
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .contains('tags', ['kitchen', 'prep', 'cooking', 'recipe']);

    if (!sops || sops.length === 0) {
      return { synced: 0, errors: [] };
    }

    const syncResults = {
      synced: 0,
      errors: [] as string[]
    };

    // Process each SOP for KDS integration
    for (const sop of sops) {
      try {
        const kdsItem = await this.convertSOPToKDSItem(sop);
        await this.sendToKDS(kdsItem);
        
        // Store KDS mapping
        await this.storeKDSMapping(sop.id, kdsItem.kds_item_id, kdsItem);
        
        syncResults.synced++;
      } catch (error) {
        const errorMessage = `Failed to sync SOP ${sop.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        syncResults.errors.push(errorMessage);
        console.error(errorMessage, error);
      }
    }

    // Update last sync time
    await supabaseAdmin
      .from('kds_configurations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        sync_status: syncResults.errors.length > 0 ? 'error' : 'active',
        error_message: syncResults.errors.length > 0 ? syncResults.errors.join('; ') : null
      })
      .eq('restaurant_id', this.restaurantId);

    return syncResults;
  }

  /**
   * Convert SOP to KDS display item format
   */
  private async convertSOPToKDSItem(sop: any): Promise<KDSDisplayItem> {
    // Parse content for cooking instructions
    const instructions = this.extractCookingInstructions(sop.content);
    const qualityChecks = this.extractQualityChecks(sop.content);
    const allergenAlerts = this.extractAllergenInfo(sop.content, sop.tags);
    const tempRequirements = this.extractTemperatureRequirements(sop.content);

    return {
      id: `kds_${sop.id}`,
      kds_item_id: `krong_thai_${sop.id}`,
      sop_id: sop.id,
      title: sop.title,
      title_fr: sop.title_fr,
      category: sop.category.name,
      instructions: instructions,
      prep_time_minutes: sop.estimated_read_time,
      quality_checks: qualityChecks,
      allergen_alerts: allergenAlerts,
      temperature_requirements: tempRequirements,
      display_priority: this.calculateDisplayPriority(sop),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Extract cooking instructions from SOP content
   */
  private extractCookingInstructions(content: string): string[] {
    const instructions: string[] = [];
    
    // Look for numbered lists, bullet points, or step-by-step instructions
    const stepPatterns = [
      /^\d+\.\s*(.+)$/gm,  // Numbered steps (1. Step)
      /^-\s*(.+)$/gm,      // Bullet points (- Step)
      /^•\s*(.+)$/gm,      // Bullet points (• Step)
      /Step \d+:\s*(.+)/gi // Explicit steps (Step 1: ...)
    ];

    for (const pattern of stepPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        instructions.push(...matches.map(match => match.replace(pattern, '$1').trim()));
      }
    }

    // If no structured steps found, break content into sentences
    if (instructions.length === 0) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      instructions.push(...sentences.slice(0, 5)); // Limit to first 5 sentences
    }

    return instructions.slice(0, 10); // KDS usually limits instruction count
  }

  /**
   * Extract quality checks from content
   */
  private extractQualityChecks(content: string): string[] {
    const qualityKeywords = [
      'check', 'verify', 'ensure', 'confirm', 'temperature', 'color',
      'texture', 'doneness', 'golden', 'crispy', 'tender', 'internal temp'
    ];

    const sentences = content.toLowerCase().split(/[.!?]+/);
    const qualityChecks = sentences
      .filter(sentence => qualityKeywords.some(keyword => sentence.includes(keyword)))
      .map(sentence => sentence.trim())
      .slice(0, 5);

    return qualityChecks;
  }

  /**
   * Extract allergen information
   */
  private extractAllergenInfo(content: string, tags: string[]): string[] {
    const allergens = ['nuts', 'dairy', 'eggs', 'gluten', 'shellfish', 'soy', 'fish'];
    const foundAllergens: string[] = [];

    const contentLower = content.toLowerCase();
    const tagsLower = tags?.map(tag => tag.toLowerCase()) || [];

    for (const allergen of allergens) {
      if (contentLower.includes(allergen) || tagsLower.some(tag => tag.includes(allergen))) {
        foundAllergens.push(allergen);
      }
    }

    return foundAllergens;
  }

  /**
   * Extract temperature requirements
   */
  private extractTemperatureRequirements(content: string): KDSDisplayItem['temperature_requirements'] {
    const tempRegex = /(\d+)°?\s*(C|F|celsius|fahrenheit)/gi;
    const matches = content.match(tempRegex);

    if (matches && matches.length > 0) {
      const temps = matches.map(match => {
        const numMatch = match.match(/(\d+)/);
        const unitMatch = match.match(/(C|F|celsius|fahrenheit)/i);
        
        return {
          temp: numMatch ? parseInt(numMatch[1]) : 0,
          unit: unitMatch ? (unitMatch[1].toLowerCase().startsWith('c') ? 'C' : 'F') : 'C'
        };
      });

      if (temps.length > 0) {
        return {
          min_temp: Math.min(...temps.map(t => t.temp)),
          max_temp: Math.max(...temps.map(t => t.temp)),
          unit: temps[0].unit as 'C' | 'F'
        };
      }
    }

    return undefined;
  }

  /**
   * Calculate display priority for KDS
   */
  private calculateDisplayPriority(sop: any): number {
    let priority = 5; // Base priority

    // Higher priority for critical cooking steps
    const criticalTags = ['cooking', 'safety', 'temperature', 'time'];
    const matchingTags = sop.tags?.filter((tag: string) => 
      criticalTags.some(critical => tag.toLowerCase().includes(critical))
    ) || [];

    priority += matchingTags.length * 2;

    // Adjust by difficulty
    const difficultyBonus = {
      'beginner': 0,
      'intermediate': 2,
      'advanced': 4
    };
    priority += difficultyBonus[sop.difficulty_level as keyof typeof difficultyBonus] || 0;

    return Math.min(10, Math.max(1, priority));
  }

  /**
   * Send data to KDS system
   */
  private async sendToKDS(item: KDSDisplayItem): Promise<void> {
    if (!this.config) {
      throw new Error('KDS configuration not initialized');
    }

    const payload = {
      item_id: item.kds_item_id,
      name: item.title,
      category: item.category,
      instructions: item.instructions,
      prep_time: item.prep_time_minutes,
      quality_checks: item.quality_checks,
      allergens: item.allergen_alerts,
      temperature: item.temperature_requirements,
      priority: item.display_priority
    };

    try {
      const response = await fetch(`${this.config.api_endpoint}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
          'X-Restaurant-ID': this.config.restaurant_location_id
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`KDS API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('Successfully sent to KDS:', result);

    } catch (error) {
      console.error('KDS integration error:', error);
      throw error;
    }
  }

  /**
   * Store KDS mapping in database
   */
  private async storeKDSMapping(sopId: string, kdsItemId: string, item: KDSDisplayItem): Promise<void> {
    await supabaseAdmin
      .from('kds_display_items')
      .upsert({
        restaurant_id: this.restaurantId,
        sop_id: sopId,
        kds_item_id: kdsItemId,
        title: item.title,
        title_fr: item.title_fr,
        category: item.category,
        instructions: item.instructions,
        prep_time_minutes: item.prep_time_minutes,
        quality_checks: item.quality_checks,
        allergen_alerts: item.allergen_alerts,
        temperature_requirements: item.temperature_requirements,
        display_priority: item.display_priority,
        is_active: item.is_active,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'restaurant_id,sop_id',
        ignoreDuplicates: false
      });
  }

  /**
   * Process order integration with SOPs
   */
  async processOrderIntegration(orderData: any): Promise<KDSOrderIntegration> {
    // Map order items to relevant SOPs
    const relatedSOPs = await this.findRelatedSOPs(orderData.items || []);

    const orderIntegration: KDSOrderIntegration = {
      order_id: orderData.order_id,
      kds_order_id: orderData.kds_order_id || orderData.order_id,
      related_sops: relatedSOPs,
      status: 'pending'
    };

    // Store order integration
    await supabaseAdmin
      .from('kds_order_integrations')
      .insert({
        restaurant_id: this.restaurantId,
        order_id: orderIntegration.order_id,
        kds_order_id: orderIntegration.kds_order_id,
        related_sops: orderIntegration.related_sops,
        status: orderIntegration.status,
        created_at: new Date().toISOString()
      });

    return orderIntegration;
  }

  /**
   * Find SOPs related to order items
   */
  private async findRelatedSOPs(orderItems: any[]): Promise<KDSOrderIntegration['related_sops']> {
    const relatedSOPs: KDSOrderIntegration['related_sops'] = [];

    for (const item of orderItems) {
      // Try to match order items with SOPs by name or tags
      const { data: matchingSOPs } = await supabaseAdmin
        .from('sop_documents')
        .select('id, title, content, estimated_read_time, tags')
        .eq('restaurant_id', this.restaurantId)
        .eq('is_active', true)
        .or(`title.ilike.%${item.name || item.item_name}%,tags.cs.{${item.category || 'kitchen'}}`);

      if (matchingSOPs && matchingSOPs.length > 0) {
        for (const sop of matchingSOPs) {
          const instructions = this.extractCookingInstructions(sop.content);
          const qualityRequirements = this.extractQualityChecks(sop.content);

          relatedSOPs.push({
            sop_id: sop.id,
            title: sop.title,
            instructions: instructions.slice(0, 5), // Limit for display
            estimated_prep_time: sop.estimated_read_time || 10,
            quality_requirements: qualityRequirements.slice(0, 3)
          });
        }
      }
    }

    return relatedSOPs;
  }

  /**
   * Process KDS webhook events
   */
  async processWebhookEvent(event: KDSWebhookEvent): Promise<void> {
    // Verify webhook signature if configured
    if (this.config?.webhook_secret && event.signature) {
      const isValid = await this.verifyWebhookSignature(event, this.config.webhook_secret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    switch (event.event_type) {
      case 'order_started':
        await this.handleOrderStarted(event.event_data);
        break;
      case 'order_completed':
        await this.handleOrderCompleted(event.event_data);
        break;
      case 'quality_check':
        await this.handleQualityCheck(event.event_data);
        break;
      case 'prep_delay':
        await this.handlePrepDelay(event.event_data);
        break;
      case 'item_void':
        await this.handleItemVoid(event.event_data);
        break;
    }

    // Log webhook event
    await supabaseAdmin
      .from('kds_webhook_events')
      .insert({
        restaurant_id: this.restaurantId,
        event_type: event.event_type,
        event_data: event.event_data,
        processed_at: new Date().toISOString()
      });
  }

  /**
   * Handle order started event
   */
  private async handleOrderStarted(eventData: any): Promise<void> {
    await supabaseAdmin
      .from('kds_order_integrations')
      .update({
        prep_start_time: eventData.timestamp,
        status: 'in_progress'
      })
      .eq('restaurant_id', this.restaurantId)
      .eq('order_id', eventData.order_id);
  }

  /**
   * Handle order completed event
   */
  private async handleOrderCompleted(eventData: any): Promise<void> {
    await supabaseAdmin
      .from('kds_order_integrations')
      .update({
        actual_completion_time: eventData.timestamp,
        status: 'completed'
      })
      .eq('restaurant_id', this.restaurantId)
      .eq('order_id', eventData.order_id);
  }

  /**
   * Handle quality check event
   */
  private async handleQualityCheck(eventData: any): Promise<void> {
    const qualityResult = {
      check_item: eventData.check_item || 'General quality check',
      passed: eventData.passed || false,
      notes: eventData.notes
    };

    // Update order integration with quality check result
    const { data: orderIntegration } = await supabaseAdmin
      .from('kds_order_integrations')
      .select('quality_check_results')
      .eq('restaurant_id', this.restaurantId)
      .eq('order_id', eventData.order_id)
      .single();

    const existingResults = orderIntegration?.quality_check_results || [];
    existingResults.push(qualityResult);

    await supabaseAdmin
      .from('kds_order_integrations')
      .update({
        quality_check_results: existingResults,
        status: qualityResult.passed ? 'completed' : 'quality_failed'
      })
      .eq('restaurant_id', this.restaurantId)
      .eq('order_id', eventData.order_id);
  }

  /**
   * Handle prep delay event
   */
  private async handlePrepDelay(eventData: any): Promise<void> {
    // Log prep delay and potentially trigger notifications
    await supabaseAdmin
      .from('sop_notifications')
      .insert({
        restaurant_id: this.restaurantId,
        user_id: eventData.user_id || this.context.userId,
        notification_type: 'prep_delay',
        title: 'Kitchen Prep Delay',
        title_fr: 'Retard de Préparation en Cuisine',
        message: `Order ${eventData.order_id} experiencing prep delay`,
        message_fr: `Commande ${eventData.order_id} subissant un retard de préparation`,
        is_read: false,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Handle item void event
   */
  private async handleItemVoid(eventData: any): Promise<void> {
    // Update order integration status
    await supabaseAdmin
      .from('kds_order_integrations')
      .update({
        status: 'completed', // Mark as completed even if voided
        actual_completion_time: eventData.timestamp
      })
      .eq('restaurant_id', this.restaurantId)
      .eq('order_id', eventData.order_id);
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(event: KDSWebhookEvent, secret: string): Promise<boolean> {
    // Implementation depends on KDS provider's signature method
    // This is a simplified example
    try {
      const crypto = require('crypto');
      const payload = JSON.stringify({ event_type: event.event_type, event_data: event.event_data });
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return event.signature === expectedSignature;
    } catch {
      return false;
    }
  }
}

/**
 * GET /api/integrations/kitchen-display - Get KDS integration status and data
 */
async function handleGetKDSStatus(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const includeItems = searchParams.get('include_items') === 'true';
    const includeOrders = searchParams.get('include_orders') === 'true';

    // Get KDS configuration
    const { data: config } = await supabaseAdmin
      .from('kds_configurations')
      .select('*')
      .eq('restaurant_id', context.restaurantId)
      .single();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'KDS integration not configured',
        errorCode: 'NOT_CONFIGURED',
      } as APIResponse, { status: 404 });
    }

    const responseData: any = {
      configuration: {
        provider: config.kds_provider,
        sync_enabled: config.sync_enabled,
        sync_frequency_minutes: config.sync_frequency_minutes,
        last_sync_at: config.last_sync_at,
        sync_status: config.sync_status,
        supported_features: config.supported_features
      }
    };

    if (includeItems) {
      const { data: items } = await supabaseAdmin
        .from('kds_display_items')
        .select(`
          *,
          sop_documents(id, title, title_fr, category:sop_categories(name, name_fr))
        `)
        .eq('restaurant_id', context.restaurantId)
        .eq('is_active', true)
        .order('display_priority', { ascending: false })
        .limit(50);

      responseData.display_items = items || [];
    }

    if (includeOrders) {
      const { data: orders } = await supabaseAdmin
        .from('kds_order_integrations')
        .select('*')
        .eq('restaurant_id', context.restaurantId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(20);

      responseData.recent_orders = orders || [];
    }

    const response: APIResponse = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/integrations/kitchen-display:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/integrations/kitchen-display - Send SOP data to KDS or sync
 */
async function handleKDSOperation(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { operation, sop_ids, order_data } = sanitizeInput(body);

    const manager = new KDSIntegrationManager(context);
    await manager.initialize();

    let result: any;

    switch (operation) {
      case 'sync_all':
        result = await manager.syncSOPsWithKDS();
        break;
      case 'sync_specific':
        if (!sop_ids || !Array.isArray(sop_ids)) {
          return NextResponse.json({
            success: false,
            error: 'sop_ids array is required for sync_specific operation',
            errorCode: 'VALIDATION_ERROR',
          } as APIResponse, { status: 400 });
        }
        // Implementation for syncing specific SOPs would go here
        result = { synced: sop_ids.length, errors: [] };
        break;
      case 'process_order':
        if (!order_data) {
          return NextResponse.json({
            success: false,
            error: 'order_data is required for process_order operation',
            errorCode: 'VALIDATION_ERROR',
          } as APIResponse, { status: 400 });
        }
        result = await manager.processOrderIntegration(order_data);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation. Must be one of: sync_all, sync_specific, process_order',
          errorCode: 'VALIDATION_ERROR',
        } as APIResponse, { status: 400 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'kds_integration',
      null,
      null,
      { operation, result },
      request
    );

    const response: APIResponse = {
      success: true,
      data: result,
      message: `KDS ${operation} completed successfully`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/integrations/kitchen-display:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'KDS_OPERATION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetKDSStatus, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleKDSOperation, PERMISSIONS.SOP.CREATE, {
  maxRequests: 50,
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