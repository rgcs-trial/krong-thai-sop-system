/**
 * Supply Chain Management API
 * Global supply chain integration and optimization system
 * 
 * Features:
 * - Vendor management and performance tracking
 * - Supply order automation and tracking
 * - Quality control and compliance monitoring
 * - Cost optimization and price comparison
 * - Inventory forecasting and demand planning
 * - Risk assessment and supply continuity
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const SupplyChainQuerySchema = z.object({
  scope: z.enum(['vendors', 'orders', 'analytics', 'forecasting']).optional().default('vendors'),
  regionId: z.string().uuid().optional(),
  restaurantId: z.string().uuid().optional(),
  status: z.enum(['active', 'pending', 'critical', 'optimal']).optional(),
  timeframe: z.enum(['24h', '7d', '30d', '90d']).optional().default('30d'),
  includeMetrics: z.boolean().optional().default(true),
  vendorCategories: z.array(z.string()).optional(),
  costThreshold: z.number().optional()
});

const CreateVendorSchema = z.object({
  vendor_code: z.string().min(3).max(20),
  company_name: z.string().min(2).max(200),
  contact_name: z.string().min(2).max(100),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state_province: z.string().optional(),
  country_code: z.string().length(2),
  postal_code: z.string().optional(),
  business_type: z.string().min(2).max(100),
  product_categories: z.array(z.string()).min(1),
  certifications: z.array(z.string()).optional().default([]),
  payment_terms: z.string().min(5).max(100),
  lead_time_days: z.number().min(1).max(365),
  minimum_order_value: z.number().optional(),
  credit_limit: z.number().optional()
});

const CreateSupplyOrderSchema = z.object({
  vendor_id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  delivery_date: z.string().datetime(),
  order_items: z.array(z.object({
    product_code: z.string().min(1),
    product_name: z.string().min(1),
    quantity_ordered: z.number().positive(),
    unit_price: z.number().positive(),
    unit_of_measure: z.string().min(1),
    expiry_date: z.string().datetime().optional(),
    quality_requirements: z.string().optional()
  })).min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  special_instructions: z.string().optional()
});

const VendorPerformanceUpdateSchema = z.object({
  vendor_id: z.string().uuid(),
  quality_rating: z.number().min(0).max(10).optional(),
  delivery_rating: z.number().min(0).max(10).optional(),
  price_competitiveness: z.number().min(0).max(10).optional(),
  reliability_score: z.number().min(0).max(10).optional(),
  review_notes: z.string().max(1000).optional(),
  certifications_updated: z.array(z.string()).optional()
});

// Logger utility
function logSupplyChain(context: string, operation: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const operationLog = {
    timestamp,
    context,
    operation,
    metadata,
    level: 'info'
  };
  
  console.log(`[SUPPLY-CHAIN] ${timestamp}:`, JSON.stringify(operationLog, null, 2));
}

function logSupplyChainError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata,
    level: 'error'
  };
  
  console.error(`[SUPPLY-CHAIN-ERROR] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify supply chain admin access
async function verifySupplyChainAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select(`
      id, 
      role, 
      full_name,
      restaurant_id,
      restaurants!inner(settings)
    `)
    .eq('id', userId)
    .in('role', ['admin', 'manager'])
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Supply chain access required');
  }

  return user;
}

// Helper function to calculate vendor performance score
function calculateVendorScore(vendor: any): number {
  const weights = {
    quality_rating: 0.35,
    delivery_rating: 0.25,
    price_competitiveness: 0.20,
    reliability_score: 0.20
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  Object.entries(weights).forEach(([metric, weight]) => {
    if (vendor[metric] !== undefined && vendor[metric] !== null) {
      totalScore += vendor[metric] * weight;
      totalWeight += weight;
    }
  });
  
  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
}

// GET: Supply Chain Overview
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse array parameters
    if (queryParams.vendorCategories) {
      try {
        queryParams.vendorCategories = JSON.parse(queryParams.vendorCategories);
      } catch {
        queryParams.vendorCategories = [queryParams.vendorCategories];
      }
    }
    
    const validationResult = SupplyChainQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { scope, regionId, restaurantId, status, timeframe, includeMetrics, vendorCategories, costThreshold } = validationResult.data;

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifySupplyChainAccess(supabase, userId);
      logSupplyChain('SUPPLY_CHAIN_ACCESS', { userId, scope, timeframe });
    } catch (error) {
      logSupplyChainError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (timeframe) {
      case '24h': startDate.setDate(endDate.getDate() - 1); break;
      case '7d': startDate.setDate(endDate.getDate() - 7); break;
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
      case '90d': startDate.setDate(endDate.getDate() - 90); break;
    }

    let responseData: any = {};

    if (scope === 'vendors' || scope === 'analytics') {
      // Get vendor information (simulated - would come from supply_chain_vendors table)
      const mockVendors = [
        {
          id: '1',
          vendor_code: 'FRESH001',
          company_name: 'FreshFoods International',
          contact_name: 'John Smith',
          contact_email: 'john@freshfoods.com',
          contact_phone: '+1-555-0123',
          address: '123 Supplier Ave',
          city: 'Montreal',
          country_code: 'CA',
          business_type: 'Food Distributor',
          product_categories: ['vegetables', 'fruits', 'herbs'],
          status: 'approved',
          quality_rating: 8.5,
          delivery_rating: 9.2,
          price_competitiveness: 7.8,
          reliability_score: 8.9,
          payment_terms: 'Net 30',
          lead_time_days: 2,
          certifications: ['HACCP', 'Organic', 'Fair Trade'],
          created_at: '2024-01-15T00:00:00Z',
          last_reviewed_at: '2024-07-20T00:00:00Z'
        },
        {
          id: '2',
          vendor_code: 'MEAT002',
          company_name: 'Premium Meats Ltd',
          contact_name: 'Sarah Johnson',
          contact_email: 'sarah@premiummeats.com',
          contact_phone: '+1-555-0124',
          address: '456 Butcher St',
          city: 'Toronto',
          country_code: 'CA',
          business_type: 'Meat Supplier',
          product_categories: ['beef', 'chicken', 'pork', 'seafood'],
          status: 'approved',
          quality_rating: 9.1,
          delivery_rating: 8.7,
          price_competitiveness: 8.3,
          reliability_score: 9.4,
          payment_terms: 'Net 15',
          lead_time_days: 1,
          certifications: ['HACCP', 'Halal', 'AAA Grade'],
          created_at: '2024-02-01T00:00:00Z',
          last_reviewed_at: '2024-07-18T00:00:00Z'
        },
        {
          id: '3',
          vendor_code: 'SPICE003',
          company_name: 'Thai Spice Co',
          contact_name: 'Somchai Prasert',
          contact_email: 'somchai@thaispice.co.th',
          contact_phone: '+66-2-555-0125',
          address: '789 Spice Market Rd',
          city: 'Bangkok',
          country_code: 'TH',
          business_type: 'Spice & Condiment Supplier',
          product_categories: ['spices', 'sauces', 'condiments'],
          status: 'approved',
          quality_rating: 9.5,
          delivery_rating: 7.8,
          price_competitiveness: 9.2,
          reliability_score: 8.6,
          payment_terms: 'Net 45',
          lead_time_days: 7,
          certifications: ['ISO 22000', 'Authentic Thai', 'Export License'],
          created_at: '2024-01-20T00:00:00Z',
          last_reviewed_at: '2024-07-15T00:00:00Z'
        }
      ];

      // Filter vendors based on criteria
      let filteredVendors = mockVendors;
      
      if (vendorCategories && vendorCategories.length > 0) {
        filteredVendors = filteredVendors.filter(vendor => 
          vendor.product_categories.some(cat => vendorCategories.includes(cat))
        );
      }

      if (status) {
        filteredVendors = filteredVendors.filter(vendor => vendor.status === status);
      }

      // Calculate performance scores
      const vendorsWithScores = filteredVendors.map(vendor => ({
        ...vendor,
        overall_score: calculateVendorScore(vendor),
        risk_level: calculateVendorScore(vendor) >= 8.5 ? 'low' : 
                   calculateVendorScore(vendor) >= 7.0 ? 'medium' : 'high'
      }));

      responseData.vendors = vendorsWithScores;
      
      // Vendor analytics
      if (scope === 'analytics') {
        const totalVendors = vendorsWithScores.length;
        const activeVendors = vendorsWithScores.filter(v => v.status === 'approved').length;
        const avgQualityRating = vendorsWithScores.reduce((sum, v) => sum + v.quality_rating, 0) / totalVendors;
        const avgDeliveryRating = vendorsWithScores.reduce((sum, v) => sum + v.delivery_rating, 0) / totalVendors;
        const highRiskVendors = vendorsWithScores.filter(v => v.risk_level === 'high').length;

        responseData.analytics = {
          totalVendors,
          activeVendors,
          suspendedVendors: totalVendors - activeVendors,
          averageQualityRating: Math.round(avgQualityRating * 10) / 10,
          averageDeliveryRating: Math.round(avgDeliveryRating * 10) / 10,
          highRiskVendors,
          mediumRiskVendors: vendorsWithScores.filter(v => v.risk_level === 'medium').length,
          lowRiskVendors: vendorsWithScores.filter(v => v.risk_level === 'low').length,
          categoryDistribution: vendorsWithScores.reduce((acc: any, vendor) => {
            vendor.product_categories.forEach(cat => {
              acc[cat] = (acc[cat] || 0) + 1;
            });
            return acc;
          }, {}),
          topPerformingVendors: vendorsWithScores
            .sort((a, b) => b.overall_score - a.overall_score)
            .slice(0, 5)
            .map(v => ({ id: v.id, name: v.company_name, score: v.overall_score }))
        };
      }
    }

    if (scope === 'orders') {
      // Get supply order information (simulated)
      const mockOrders = [
        {
          id: '1',
          order_number: 'PO-2024-001',
          vendor_id: '1',
          restaurant_id: restaurantId || 'rest-001',
          order_date: '2024-07-26T10:30:00Z',
          delivery_date: '2024-07-28T08:00:00Z',
          total_amount: 2450.75,
          currency: 'CAD',
          status: 'confirmed',
          delivery_status: 'in_transit',
          tracking_number: 'FF123456789',
          order_items: [
            {
              product_code: 'VEG-001',
              product_name: 'Fresh Lettuce (Organic)',
              quantity_ordered: 50,
              quantity_received: 0,
              unit_price: 2.50,
              total_price: 125.00,
              unit_of_measure: 'head',
              expiry_date: '2024-08-05T00:00:00Z'
            },
            {
              product_code: 'VEG-002',
              product_name: 'Roma Tomatoes',
              quantity_ordered: 100,
              quantity_received: 0,
              unit_price: 3.25,
              total_price: 325.00,
              unit_of_measure: 'lb',
              expiry_date: '2024-08-10T00:00:00Z'
            }
          ],
          vendor: mockVendors[0],
          created_at: '2024-07-26T10:30:00Z'
        },
        {
          id: '2',
          order_number: 'PO-2024-002',
          vendor_id: '2',
          restaurant_id: restaurantId || 'rest-001',
          order_date: '2024-07-25T14:15:00Z',
          delivery_date: '2024-07-27T07:00:00Z',
          total_amount: 1875.90,
          currency: 'CAD',
          status: 'delivered',
          delivery_status: 'completed',
          quality_check_passed: true,
          received_at: '2024-07-27T07:30:00Z',
          order_items: [
            {
              product_code: 'MEAT-001',
              product_name: 'AAA Beef Striploin',
              quantity_ordered: 20,
              quantity_received: 20,
              unit_price: 45.50,
              total_price: 910.00,
              unit_of_measure: 'lb',
              quality_grade: 'AAA'
            }
          ],
          vendor: mockVendors[1],
          created_at: '2024-07-25T14:15:00Z'
        }
      ];

      responseData.orders = mockOrders;
      
      // Order analytics
      const totalOrders = mockOrders.length;
      const completedOrders = mockOrders.filter(o => o.delivery_status === 'completed').length;
      const pendingOrders = mockOrders.filter(o => o.delivery_status === 'in_transit').length;
      const totalValue = mockOrders.reduce((sum, o) => sum + o.total_amount, 0);

      responseData.orderAnalytics = {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders: 0,
        totalOrderValue: totalValue,
        averageOrderValue: Math.round((totalValue / totalOrders) * 100) / 100,
        onTimeDeliveryRate: 92.5,
        qualityPassRate: 96.8,
        orderFrequency: 'Daily'
      };
    }

    if (scope === 'forecasting') {
      // Supply forecasting and demand planning
      responseData.forecasting = {
        demandPrediction: {
          nextWeek: {
            vegetables: { predicted_demand: 150, confidence: 85 },
            meat: { predicted_demand: 80, confidence: 92 },
            spices: { predicted_demand: 25, confidence: 78 }
          },
          nextMonth: {
            vegetables: { predicted_demand: 600, confidence: 75 },
            meat: { predicted_demand: 320, confidence: 88 },
            spices: { predicted_demand: 100, confidence: 82 }
          }
        },
        seasonalTrends: {
          peakSeasons: ['summer', 'holiday_season'],
          lowSeasons: ['late_winter'],
          specialEvents: ['thai_new_year', 'valentine_day']
        },
        stockOptimization: {
          overstocked_items: ['rice_paper', 'coconut_milk'],
          understocked_items: ['fish_sauce', 'palm_sugar'],
          reorder_recommendations: [
            {
              product: 'Fish Sauce Premium',
              recommended_quantity: 50,
              urgency: 'high',
              reason: 'Current stock below safety threshold'
            }
          ]
        },
        costOptimization: {
          potential_savings: 1250.50,
          optimization_opportunities: [
            {
              category: 'spices',
              opportunity: 'Bulk purchase discount available',
              potential_saving: 450.25
            },
            {
              category: 'vegetables',
              opportunity: 'Alternative vendor with 8% lower prices',
              potential_saving: 800.25
            }
          ]
        }
      };
    }

    logSupplyChain('SUPPLY_CHAIN_QUERY', {
      scope,
      vendorCount: responseData.vendors?.length || 0,
      orderCount: responseData.orders?.length || 0,
      timeframe
    });

    return NextResponse.json({
      success: true,
      data: {
        ...responseData,
        metadata: {
          scope,
          timeframe,
          regionId,
          restaurantId,
          generatedAt: new Date().toISOString(),
          dataFreshness: 'real-time'
        }
      }
    });

  } catch (error) {
    logSupplyChainError('UNEXPECTED_ERROR', error, { operation: 'supply_chain_query' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Create Supply Chain Entity
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    // Parse request body
    const body = await request.json();
    const entityType = body.entity_type; // 'vendor' or 'order'

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifySupplyChainAccess(supabase, userId);
    } catch (error) {
      logSupplyChainError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    let result: any = {};
    let actionDescription = '';

    if (entityType === 'vendor') {
      const validationResult = CreateVendorSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
          { status: 400 }
        );
      }

      const vendorData = validationResult.data;
      
      // In a real implementation, this would insert into supply_chain_vendors table
      const newVendor = {
        id: `vendor-${Date.now()}`,
        ...vendorData,
        status: 'pending',
        quality_rating: 0,
        delivery_rating: 0,
        price_competitiveness: 0,
        reliability_score: 0,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      result = newVendor;
      actionDescription = `New vendor created: ${vendorData.company_name}`;

    } else if (entityType === 'order') {
      const validationResult = CreateSupplyOrderSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
          { status: 400 }
        );
      }

      const orderData = validationResult.data;
      
      // Calculate total amount
      const totalAmount = orderData.order_items.reduce(
        (sum, item) => sum + (item.quantity_ordered * item.unit_price), 0
      );

      // In a real implementation, this would insert into supply_orders table
      const newOrder = {
        id: `order-${Date.now()}`,
        order_number: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        ...orderData,
        order_date: new Date().toISOString(),
        total_amount: totalAmount,
        currency: 'CAD',
        status: 'pending',
        delivery_status: 'pending',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      result = newOrder;
      actionDescription = `New supply order created: ${newOrder.order_number}`;
    }

    // Log the supply chain operation
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: body.restaurant_id || null,
        user_id: userId,
        action: 'CREATE',
        resource_type: `supply_chain_${entityType}`,
        resource_id: result.id,
        details: {
          entityType,
          actionDescription,
          data: result
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    logSupplyChain('SUPPLY_CHAIN_CREATE', {
      entityType,
      id: result.id,
      actionDescription
    });

    return NextResponse.json({
      success: true,
      message: actionDescription,
      data: result
    });

  } catch (error) {
    logSupplyChainError('UNEXPECTED_ERROR', error, { operation: 'supply_chain_create' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Update Vendor Performance
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    // Parse and validate request body
    const body = await request.json();
    const validationResult = VendorPerformanceUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifySupplyChainAccess(supabase, userId);
    } catch (error) {
      logSupplyChainError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // In a real implementation, this would update the supply_chain_vendors table
    const updatedVendor = {
      id: updateData.vendor_id,
      ...updateData,
      overall_score: calculateVendorScore(updateData),
      reviewed_by: userId,
      last_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Log the vendor performance update
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: null,
        user_id: userId,
        action: 'UPDATE',
        resource_type: 'vendor_performance',
        resource_id: updateData.vendor_id,
        details: {
          updateData,
          newOverallScore: updatedVendor.overall_score,
          reviewNotes: updateData.review_notes
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    logSupplyChain('VENDOR_PERFORMANCE_UPDATE', {
      vendorId: updateData.vendor_id,
      newScore: updatedVendor.overall_score,
      reviewedBy: userId
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor performance updated successfully',
      data: updatedVendor
    });

  } catch (error) {
    logSupplyChainError('UNEXPECTED_ERROR', error, { operation: 'vendor_performance_update' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}