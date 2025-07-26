/**
 * SOP Search API endpoint
 * GET /api/sop/search - Full-text search across SOPs with advanced filtering
 */

import { NextRequest } from 'next/server';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  createSuccessResponse,
  logAuditEvent,
  getClientIP,
  sanitizeSearchQuery,
  extractHighlights
} from '@/lib/api/utils';
import { createAuthenticatedClient } from '@/lib/supabase/client';
import { validationSchemas } from '@/lib/validations';
import { SearchRequest, SearchResult, SearchResponse } from '@/types/api';
import { SOPStatus, SOPPriority } from '@/types/database';

/**
 * GET /api/sop/search
 * Full-text search across SOP content with bilingual support
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    
    // Extract search parameters
    const query = searchParams.get('query') || '';
    const language = (searchParams.get('language') || 'both') as 'en' | 'th' | 'both';
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as SOPStatus;
    const priority = searchParams.get('priority') as SOPPriority;
    const tags = searchParams.getAll('tags');
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    if (!query.trim()) {
      return createSuccessResponse(
        { error: 'Search query is required' },
        undefined,
        400,
        req.requestId
      );
    }

    const sanitizedQuery = sanitizeSearchQuery(query);
    if (!sanitizedQuery) {
      return createSuccessResponse(
        { error: 'Invalid search query' },
        undefined,
        400,
        req.requestId
      );
    }

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      const startTime = Date.now();

      // Build full-text search query based on language preference
      let searchCondition: string;
      
      switch (language) {
        case 'en':
          searchCondition = `title.fts.${sanitizedQuery} | content.fts.${sanitizedQuery}`;
          break;
        case 'th':
          searchCondition = `title_th.fts.${sanitizedQuery} | content_th.fts.${sanitizedQuery}`;
          break;
        default: // 'both'
          searchCondition = `title.fts.${sanitizedQuery} | content.fts.${sanitizedQuery} | title_th.fts.${sanitizedQuery} | content_th.fts.${sanitizedQuery}`;
      }

      // Build the query with full-text search
      let searchQuery = client
        .from('sop_documents')
        .select(`
          id,
          title,
          title_th,
          content,
          content_th,
          category_id,
          status,
          priority,
          tags,
          tags_th,
          created_at,
          updated_at,
          category:sop_categories(
            id,
            name,
            name_th,
            icon,
            color
          )
        `)
        .eq('restaurant_id', req.auth!.restaurantId)
        .eq('is_active', true)
        .or(searchCondition);

      // Apply additional filters
      if (categoryId) {
        searchQuery = searchQuery.eq('category_id', categoryId);
      }

      if (status) {
        searchQuery = searchQuery.eq('status', status);
      }

      if (priority) {
        searchQuery = searchQuery.eq('priority', priority);
      }

      if (tags && tags.length > 0) {
        // Search in both English and Thai tags
        const tagConditions = tags.map(tag => 
          `tags.cs.{${tag}} | tags_th.cs.{${tag}}`
        ).join(' | ');
        searchQuery = searchQuery.or(tagConditions);
      }

      // Apply pagination and ordering by relevance
      const { data: searchResults, error } = await searchQuery
        .order('updated_at', { ascending: false }) // Fallback ordering
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Get total count for pagination (separate query)
      let countQuery = client
        .from('sop_documents')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', req.auth!.restaurantId)
        .eq('is_active', true)
        .or(searchCondition);

      // Apply same filters to count query
      if (categoryId) countQuery = countQuery.eq('category_id', categoryId);
      if (status) countQuery = countQuery.eq('status', status);
      if (priority) countQuery = countQuery.eq('priority', priority);
      if (tags && tags.length > 0) {
        const tagConditions = tags.map(tag => 
          `tags.cs.{${tag}} | tags_th.cs.{${tag}}`
        ).join(' | ');
        countQuery = countQuery.or(tagConditions);
      }

      const { count } = await countQuery;

      // Process search results and add highlights
      const processedResults: SearchResult[] = (searchResults || []).map((sop) => {
        // Calculate match score based on query relevance
        let matchScore = 0;
        const lowerQuery = sanitizedQuery.toLowerCase();
        
        // Title matches get highest score
        if (sop.title.toLowerCase().includes(lowerQuery)) matchScore += 50;
        if (sop.title_th.toLowerCase().includes(lowerQuery)) matchScore += 50;
        
        // Content matches get medium score
        if (sop.content.toLowerCase().includes(lowerQuery)) matchScore += 30;
        if (sop.content_th.toLowerCase().includes(lowerQuery)) matchScore += 30;
        
        // Tag matches get lower score
        const allTags = [...(sop.tags || []), ...(sop.tags_th || [])];
        if (allTags.some(tag => tag.toLowerCase().includes(lowerQuery))) matchScore += 20;

        // Generate highlights
        const highlights: SearchResult['highlights'] = {};
        
        if (sop.title.toLowerCase().includes(lowerQuery)) {
          highlights.title = extractHighlights(sop.title, sanitizedQuery, 100);
        }
        
        if (sop.title_th.toLowerCase().includes(lowerQuery)) {
          highlights.titleTh = extractHighlights(sop.title_th, sanitizedQuery, 100);
        }
        
        if (sop.content.toLowerCase().includes(lowerQuery)) {
          highlights.content = extractHighlights(sop.content, sanitizedQuery, 200);
        }
        
        if (sop.content_th.toLowerCase().includes(lowerQuery)) {
          highlights.contentTh = extractHighlights(sop.content_th, sanitizedQuery, 200);
        }

        return {
          id: sop.id,
          title: sop.title,
          titleTh: sop.title_th,
          content: sop.content.substring(0, 300) + (sop.content.length > 300 ? '...' : ''),
          contentTh: sop.content_th.substring(0, 300) + (sop.content_th.length > 300 ? '...' : ''),
          categoryId: sop.category_id,
          categoryName: sop.category?.name || '',
          categoryNameTh: sop.category?.name_th || '',
          status: sop.status,
          priority: sop.priority,
          tags: sop.tags || [],
          tagsTh: sop.tags_th || [],
          matchScore,
          highlights,
          createdAt: sop.created_at,
          updatedAt: sop.updated_at,
        };
      });

      // Sort by match score (highest first)
      processedResults.sort((a, b) => b.matchScore - a.matchScore);

      const searchTime = Date.now() - startTime;

      // Generate search suggestions (simple implementation)
      const suggestions = generateSearchSuggestions(sanitizedQuery, processedResults);

      const response: SearchResponse = {
        results: processedResults,
        totalResults: count || 0,
        searchTime,
        query: sanitizedQuery,
        suggestions,
      };

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'VIEW',
        'sop_search',
        undefined,
        undefined,
        undefined,
        { 
          action: 'sop_search_performed',
          query: sanitizedQuery,
          language,
          filters: { categoryId, status, priority, tags },
          results_count: processedResults.length,
          total_results: count || 0,
          search_time: searchTime
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        response,
        `Found ${count || 0} results in ${searchTime}ms`,
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error performing search:', error);
      return createSuccessResponse(
        { error: 'Search failed' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['sop:read'],
    rateLimit: {
      maxRequests: 60,
      windowMinutes: 1,
    },
    validation: {
      query: validationSchemas.searchRequest,
    },
    audit: true,
  }
);

/**
 * Generate search suggestions based on query and results
 */
function generateSearchSuggestions(query: string, results: SearchResult[]): string[] {
  const suggestions: string[] = [];
  
  if (results.length === 0) {
    // No results - suggest broader terms
    const words = query.toLowerCase().split(' ');
    if (words.length > 1) {
      // Suggest individual words
      suggestions.push(...words.filter(word => word.length > 2));
    }
    
    // Common search terms in restaurant context
    const commonTerms = [
      'food safety', 'cleaning', 'customer service', 'hygiene',
      'ความปลอดภัย', 'การทำความสะอาด', 'การบริการ', 'สุขอนามัย'
    ];
    
    const relevantTerms = commonTerms.filter(term => 
      !query.toLowerCase().includes(term.toLowerCase())
    );
    
    suggestions.push(...relevantTerms.slice(0, 3));
  } else if (results.length < 5) {
    // Few results - suggest related terms from tags
    const allTags = results.flatMap(result => [...result.tags, ...result.tagsTh]);
    const uniqueTags = [...new Set(allTags)];
    
    suggestions.push(...uniqueTags
      .filter(tag => !query.toLowerCase().includes(tag.toLowerCase()))
      .slice(0, 3)
    );
  }

  return suggestions.slice(0, 5);
}

