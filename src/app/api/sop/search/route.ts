/**
 * SOP Search API Route
 * Provides full-text search capabilities across SOP documents
 * 
 * GET    /api/sop/search    - Search SOPs with full-text and filters
 * POST   /api/sop/search    - Advanced search with complex queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS } from '@/lib/middleware/auth';
import { validateSOPSearch, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPSearchResponse,
  SOPSearchResult,
  SOPSearchFilters,
  SOPAuthContext 
} from '@/types/api/sop';

/**
 * Utility function to escape special characters for text search
 */
function escapeSearchQuery(query: string): string {
  return query
    .replace(/[|&:*!()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate search suggestions based on query
 */
async function generateSearchSuggestions(
  query: string, 
  restaurantId: string, 
  locale: 'en' | 'fr' = 'en'
): Promise<string[]> {
  const suggestions: string[] = [];
  
  try {
    // Get common tags that match the query
    const { data: documents } = await supabaseAdmin
      .from('sop_documents')
      .select('tags, title, title_fr')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .limit(100);

    if (documents) {
      const allTags = new Set<string>();
      const titles = new Set<string>();
      
      documents.forEach(doc => {
        // Collect tags
        doc.tags?.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            allTags.add(tag);
          }
        });
        
        // Collect title words
        const title = locale === 'fr' ? doc.title_fr : doc.title;
        const words = title.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3 && word.includes(query.toLowerCase())) {
            titles.add(word);
          }
        });
      });
      
      suggestions.push(...Array.from(allTags).slice(0, 3));
      suggestions.push(...Array.from(titles).slice(0, 2));
    }
  } catch (error) {
    console.error('Error generating search suggestions:', error);
  }
  
  return suggestions.slice(0, 5);
}

/**
 * Calculate relevance score based on match type and position
 */
function calculateRelevanceScore(
  matchType: 'title' | 'content' | 'tags',
  matchPosition: number,
  queryLength: number,
  contentLength: number
): number {
  let baseScore = 0;
  
  switch (matchType) {
    case 'title':
      baseScore = 100;
      break;
    case 'tags':
      baseScore = 80;
      break;
    case 'content':
      baseScore = 60;
      break;
  }
  
  // Boost score for matches at the beginning
  const positionBoost = Math.max(0, 20 - (matchPosition / contentLength) * 20);
  
  // Boost score for longer query matches
  const lengthBoost = Math.min(20, queryLength * 2);
  
  return Math.round(baseScore + positionBoost + lengthBoost);
}

/**
 * Extract highlighted text around matches
 */
function extractHighlightedText(
  content: string,
  query: string,
  maxLength: number = 200
): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  
  if (index === -1) return '';
  
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + maxLength - 50);
  
  let excerpt = content.substring(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt;
}

/**
 * GET /api/sop/search - Basic search functionality
 */
async function handleSearchGet(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    
    // Parse search parameters
    const filters: SOPSearchFilters = {
      query: searchParams.get('q') || searchParams.get('query') || '',
      locale: (searchParams.get('locale') as 'en' | 'fr') || 'en',
      category_id: searchParams.get('category_id') || undefined,
      status: searchParams.get('status') || undefined,
      difficulty_level: searchParams.get('difficulty_level') as any || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search_fields: searchParams.get('search_fields')?.split(',') as any || ['title', 'content', 'tags'],
      fuzzy: searchParams.get('fuzzy') === 'true',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    // Validate search parameters
    const validation = validateSOPSearch(filters);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: validation.errors,
      } as APIResponse, { status: 400 });
    }

    if (!filters.query || filters.query.length < 1) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required',
        errorCode: 'MISSING_QUERY',
      } as APIResponse, { status: 400 });
    }

    const escapedQuery = escapeSearchQuery(filters.query);
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);

    // Build search query
    let query = supabaseAdmin
      .from('sop_documents')
      .select(`
        *,
        category:sop_categories!inner(id, name, name_fr, icon, color),
        created_by_user:auth_users!sop_documents_created_by_fkey(id, full_name, email),
        updated_by_user:auth_users!sop_documents_updated_by_fkey(id, full_name, email)
      `, { count: 'exact' })
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true);

    // Apply filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.difficulty_level) {
      query = query.eq('difficulty_level', filters.difficulty_level);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    // Apply text search
    const titleField = filters.locale === 'fr' ? 'title_fr' : 'title';
    const contentField = filters.locale === 'fr' ? 'content_fr' : 'content';
    
    if (filters.search_fields?.includes('title')) {
      query = query.textSearch(titleField, escapedQuery, { 
        type: filters.fuzzy ? 'websearch' : 'plainto' 
      });
    } else if (filters.search_fields?.includes('content')) {
      query = query.textSearch(contentField, escapedQuery, { 
        type: filters.fuzzy ? 'websearch' : 'plainto' 
      });
    } else {
      // Search both title and content
      query = query.or(`${titleField}.fts.${escapedQuery},${contentField}.fts.${escapedQuery}`);
    }

    // Apply pagination and ordering
    query = query
      .order('updated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error searching SOP documents:', error);
      return NextResponse.json({
        success: false,
        error: 'Search failed',
        errorCode: 'SEARCH_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Process search results and calculate relevance
    const searchResults: SOPSearchResult[] = (documents || []).map(doc => {
      const title = filters.locale === 'fr' ? doc.title_fr : doc.title;
      const content = filters.locale === 'fr' ? doc.content_fr : doc.content;
      
      // Determine match type and calculate relevance
      let matchType: 'title' | 'content' | 'tags' = 'content';
      let relevanceScore = 50;
      let highlightedText = '';
      
      const queryLower = filters.query.toLowerCase();
      
      if (title.toLowerCase().includes(queryLower)) {
        matchType = 'title';
        const titleIndex = title.toLowerCase().indexOf(queryLower);
        relevanceScore = calculateRelevanceScore(matchType, titleIndex, filters.query.length, title.length);
        highlightedText = title;
      } else if (doc.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
        matchType = 'tags';
        relevanceScore = calculateRelevanceScore(matchType, 0, filters.query.length, 50);
        highlightedText = doc.tags.filter(tag => 
          tag.toLowerCase().includes(queryLower)
        ).join(', ');
      } else if (content.toLowerCase().includes(queryLower)) {
        matchType = 'content';
        const contentIndex = content.toLowerCase().indexOf(queryLower);
        relevanceScore = calculateRelevanceScore(matchType, contentIndex, filters.query.length, content.length);
        highlightedText = extractHighlightedText(content, filters.query);
      }
      
      return {
        document: doc,
        relevance_score: relevanceScore,
        highlighted_text: highlightedText,
        match_type: matchType,
      };
    });

    // Sort by relevance score
    searchResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Generate suggestions
    const suggestions = await generateSearchSuggestions(filters.query, context.restaurantId, filters.locale);

    const searchTime = Date.now() - startTime;

    const response: SOPSearchResponse = {
      success: true,
      data: searchResults,
      query: filters.query,
      total_results: count || 0,
      search_time_ms: searchTime,
      suggestions,
      timestamp: new Date().toISOString(),
    };

    // Log search analytics
    await supabaseAdmin
      .from('performance_metrics')
      .insert({
        restaurant_id: context.restaurantId,
        metric_type: 'sop_search',
        metric_name: 'search_query',
        metric_value: searchTime,
        measurement_unit: 'milliseconds',
        timestamp: new Date().toISOString(),
        metadata: {
          query: filters.query,
          results_count: count || 0,
          user_id: context.userId,
          locale: filters.locale,
          filters: {
            category_id: filters.category_id,
            status: filters.status,
            difficulty_level: filters.difficulty_level,
            tags: filters.tags,
          },
        },
      });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/search:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal search error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/search - Advanced search with complex queries
 */
async function handleSearchPost(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const filters = sanitizeInput(body) as SOPSearchFilters;

    // Validate search parameters
    const validation = validateSOPSearch(filters);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: validation.errors,
      } as APIResponse, { status: 400 });
    }

    // Use the same logic as GET but with more complex query capabilities
    const modifiedRequest = new NextRequest(request.url, {
      method: 'GET',
      headers: request.headers,
    });

    // Convert POST body to URL search params for reusing GET logic
    const searchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });

    // Create new URL with search params
    const url = new URL(modifiedRequest.url);
    url.search = searchParams.toString();
    const newRequest = new NextRequest(url.toString(), modifiedRequest);

    return handleSearchGet(newRequest, context);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/search:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal search error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleSearchGet, PERMISSIONS.SOP.READ, {
  maxRequests: 500,
  windowMs: 60000, // 1 minute - higher limit for search
});

export const POST = withAuth(handleSearchPost, PERMISSIONS.SOP.READ, {
  maxRequests: 200,
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