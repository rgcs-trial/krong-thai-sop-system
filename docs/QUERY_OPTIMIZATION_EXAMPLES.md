# Query Optimization Examples

## Quick Reference for Database Performance Optimizations

### Search Queries (Target: <100ms)

#### Optimized French Search
```sql
-- Before: Basic search with poor performance
SELECT * FROM sop_documents 
WHERE title_fr ILIKE '%nourriture%' OR content_fr ILIKE '%nourriture%';

-- After: Optimized with GIN index and ranking
SELECT * FROM search_sop_documents(
    '550e8400-e29b-41d4-a716-446655440000',  -- restaurant_id
    'nourriture',                             -- search_term
    'fr',                                     -- language
    NULL,                                     -- category_id (optional)
    20,                                       -- limit
    0                                         -- offset
);
```

#### English Search with Category Filter
```sql
-- Optimized search with category filtering
SELECT * FROM search_sop_documents(
    '550e8400-e29b-41d4-a716-446655440000',
    'food safety',
    'en',
    (SELECT id FROM sop_categories WHERE code = 'FOOD_SAFETY'),
    10,
    0
);
```

### SOP Document Queries (Target: <50ms)

#### Category Browsing
```sql
-- Before: Multiple queries and JOINs
SELECT sc.*, COUNT(sd.id) as sop_count
FROM sop_categories sc
LEFT JOIN sop_documents sd ON sc.id = sd.category_id
WHERE sd.restaurant_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY sc.id;

-- After: Single optimized function call
SELECT * FROM get_sop_categories_with_counts(
    '550e8400-e29b-41d4-a716-446655440000'
);
```

#### SOP Document Listing by Priority
```sql
-- Optimized query using composite index
SELECT id, title, title_th, priority, updated_at
FROM sop_documents
WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000'
AND is_active = true
AND status = 'approved'
ORDER BY priority DESC, updated_at DESC
LIMIT 20;
```

### Training Queries (Target: <75ms)

#### User Training Dashboard
```sql
-- Before: Multiple complex JOINs
SELECT tm.*, utp.status, utp.progress_percentage, tc.status as cert_status
FROM training_modules tm
LEFT JOIN user_training_progress utp ON tm.id = utp.module_id
LEFT JOIN training_certificates tc ON tm.id = tc.module_id
WHERE utp.user_id = '880e8400-e29b-41d4-a716-446655440000';

-- After: Single optimized function
SELECT * FROM get_user_training_dashboard(
    '880e8400-e29b-41d4-a716-446655440000'
);
```

#### Training Progress Tracking
```sql
-- Optimized progress calculation using composite index
SELECT module_id, status, progress_percentage, last_accessed_at
FROM user_training_progress
WHERE user_id = '880e8400-e29b-41d4-a716-446655440000'
AND status IN ('in_progress', 'completed')
ORDER BY last_accessed_at DESC;
```

### Authentication Queries (Target: <50ms)

#### PIN Validation
```sql
-- Optimized using composite index
SELECT * FROM validate_pin(
    'admin@krongthai.com',
    '1234'
);
```

#### User Session Management
```sql
-- Efficient active user lookup
SELECT id, role, restaurant_id, full_name, last_login_at
FROM auth_users
WHERE email = 'admin@krongthai.com'
AND is_active = true
AND (locked_until IS NULL OR locked_until < NOW());
```

### Form and Audit Queries

#### Recent Form Submissions
```sql
-- Using optimized date index
SELECT fs.id, ft.name, fs.submitted_by, fs.submission_date, fs.status
FROM form_submissions fs
JOIN form_templates ft ON fs.template_id = ft.id
WHERE fs.restaurant_id = '550e8400-e29b-41d4-a716-446655440000'
AND fs.submission_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY fs.created_at DESC;
```

#### Audit Trail Queries
```sql
-- Efficient audit log filtering
SELECT action, resource_type, user_id, created_at, metadata
FROM audit_logs
WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000'
AND created_at >= NOW() - INTERVAL '24 hours'
AND action IN ('CREATE', 'UPDATE', 'DELETE')
ORDER BY created_at DESC;
```

### Real-time Subscription Examples

#### SOP Change Notifications
```javascript
// Frontend subscription example
const sop_subscription = supabase
  .channel(`sop_changes:${restaurantId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'sop_documents',
    filter: `restaurant_id=eq.${restaurantId}`
  }, (payload) => {
    console.log('SOP updated:', payload);
    // Update UI with new SOP data
  })
  .subscribe();
```

#### Training Progress Updates
```javascript
// Real-time training progress
const training_subscription = supabase
  .channel(`training_progress:user:${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public', 
    table: 'user_training_progress',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('Training progress updated:', payload);
    // Update progress bars and completion status
  })
  .subscribe();
```

### Performance Monitoring Queries

#### Check Query Performance
```sql
-- Monitor current performance
SELECT * FROM get_performance_dashboard(24);
```

#### Alert Summary
```sql
-- Get recent alerts
SELECT * FROM get_alert_summary(24);
```

#### Manual Performance Logging
```sql
-- Log a query performance metric
SELECT log_query_performance(
    'sop_search',                    -- query_type
    45.2,                           -- execution_time_ms
    'French search for food safety', -- query_text
    '550e8400-e29b-41d4-a716-446655440000', -- restaurant_id
    '880e8400-e29b-41d4-a716-446655440000'  -- user_id
);
```

### Index Usage Examples

#### Check Index Usage
```sql
-- Verify GIN index usage for search
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM search_sop_documents(
    '550e8400-e29b-41d4-a716-446655440000',
    'food safety',
    'en',
    NULL,
    10,
    0
);
```

#### Composite Index Performance
```sql
-- Verify composite index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sop_documents
WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000'
AND category_id = (SELECT id FROM sop_categories WHERE code = 'FOOD_SAFETY')
AND status = 'approved'
AND is_active = true;
```

### Maintenance Queries

#### Cleanup Operations
```sql
-- Run cleanup procedures
SELECT cleanup_performance_logs();
SELECT cleanup_old_audit_logs(); 
SELECT cleanup_expired_sessions();
```

#### Monitor System Health
```sql
-- Check database capacity
SELECT * FROM capacity_metrics 
WHERE metric_date >= CURRENT_DATE - 7
ORDER BY metric_date DESC;

-- Run monitoring cycle
SELECT run_monitoring_cycle();
```

### Best Practices

1. **Always use parameterized queries** to leverage prepared statement caching
2. **Filter early** using WHERE clauses with indexed columns
3. **Use appropriate LIMIT** clauses for pagination
4. **Leverage composite indexes** for multi-column filtering
5. **Monitor query plans** using EXPLAIN ANALYZE
6. **Use functions** for complex, frequently-used queries
7. **Subscribe selectively** to real-time channels to minimize overhead
8. **Use analytics client wrappers** for optimized dashboard performance (Phase 2+ Enhanced)
9. **Implement E2E testing** with Cypress to validate query performance

### Common Pitfalls to Avoid

❌ **Don't**: Use ILIKE with leading wildcards `%search%`
✅ **Do**: Use full-text search with GIN indexes

❌ **Don't**: Join large tables without proper indexing
✅ **Do**: Use optimized functions with pre-computed JOINs

❌ **Don't**: Subscribe to all real-time events
✅ **Do**: Filter subscriptions by restaurant/user context

❌ **Don't**: Ignore query performance in development
✅ **Do**: Monitor and log performance metrics continuously