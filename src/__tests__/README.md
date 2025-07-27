# Translation System Test Suite

Comprehensive testing suite for the database-driven translation system in the Restaurant Krong Thai SOP Management System.

## Test Structure

### Unit Tests (`src/__tests__/hooks/`)
- **`use-translations-db.test.tsx`** - Core translation hook functionality
- **`use-translation-admin.test.tsx`** - Admin operations and management

### API Tests (`src/__tests__/api/`)
- **`public-translations.test.ts`** - Public translation endpoints
- **`admin-translations.test.ts`** - Admin translation management APIs

### Integration Tests (`src/__tests__/integration/`)
- **`translation-caching.test.ts`** - Multi-level caching system
- **`icu-message-format.test.ts`** - ICU message format parsing
- **`websocket-realtime.test.ts`** - Real-time update system

### Performance Tests (`src/__tests__/performance/`)
- **`translation-performance.test.ts`** - Load testing and optimization validation

### Test Utilities (`src/__tests__/utils/` & `src/__tests__/mocks/`)
- **`test-utils.tsx`** - Common testing utilities and helpers
- **`translation-mocks.ts`** - Mock data generators and scenarios

## Features Tested

### Core Translation System
- ✅ Database-driven translation loading
- ✅ Type-safe translation keys with autocomplete
- ✅ ICU message format with variables, pluralization, and selection
- ✅ Multi-locale support (EN, FR, TH)
- ✅ Namespace-based organization
- ✅ Fallback mechanisms for missing translations

### Caching System
- ✅ Multi-level caching (memory + IndexedDB + localStorage)
- ✅ Cache invalidation strategies
- ✅ Performance optimization (>95% hit rate target)
- ✅ Memory management and LRU eviction
- ✅ Compression and storage efficiency

### Real-Time Updates
- ✅ WebSocket connection management
- ✅ Live translation updates
- ✅ Bulk update handling
- ✅ Connection resilience and reconnection
- ✅ Error handling and graceful degradation

### Admin Management
- ✅ Translation key CRUD operations
- ✅ Bulk import/export functionality
- ✅ Workflow management (draft → review → approved → published)
- ✅ Analytics and usage tracking
- ✅ Authentication and authorization

### Performance & Scalability
- ✅ Sub-100ms response times for cached translations
- ✅ Sub-500ms response times for API requests
- ✅ High-frequency translation calls (1000+ per second)
- ✅ Large dataset handling (10,000+ translations)
- ✅ Concurrent user support (100+ simultaneous requests)
- ✅ Memory efficiency and optimization

## Running Tests

### Full Test Suite
```bash
pnpm test
```

### Test Categories
```bash
# Unit tests only
pnpm vitest run src/__tests__/hooks/

# API tests only
pnpm vitest run src/__tests__/api/

# Integration tests only
pnpm vitest run src/__tests__/integration/

# Performance tests only
pnpm vitest run src/__tests__/performance/
```

### Specific Test Files
```bash
# Translation hooks
pnpm vitest run src/__tests__/hooks/use-translations-db.test.tsx

# API endpoints
pnpm vitest run src/__tests__/api/public-translations.test.ts

# ICU formatting
pnpm vitest run src/__tests__/integration/icu-message-format.test.ts
```

### Test Coverage
```bash
# Generate coverage report
pnpm vitest run --coverage

# View coverage in browser
pnpm vitest --coverage --ui
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- **Environment**: jsdom for browser simulation
- **Setup**: Automatic mocks for Next.js, Supabase, WebSocket
- **Coverage**: 80% minimum, 90% for critical files
- **Timeout**: 10s for tests, 10s for hooks
- **Parallel**: Multi-threaded execution

### Coverage Thresholds
- **Global**: 80% branches, functions, lines, statements
- **Translation hooks**: 90% (critical system components)
- **Admin hooks**: 85% (important management features)

## Test Scenarios

### Restaurant-Specific Use Cases
- **Menu Management**: Item availability, pricing, descriptions
- **Staff Scheduling**: Shift assignments, role translations
- **Order Management**: Status updates, customer notifications
- **Inventory Alerts**: Stock levels, critical notifications
- **Training Modules**: Progress tracking, completion status

### ICU Message Format Examples
```typescript
// Pluralization
'{count, plural, =0 {No items} =1 {1 item} other {# items}}'

// Selection
'{status, select, ready {✅ Ready} pending {⏳ Pending} other {❓ Unknown}}'

// Complex nested
'{department, select, kitchen {{role, select, chef {Head Chef} other {Kitchen Staff}}} other {Staff}}'
```

### Performance Benchmarks
- **Translation loading**: <100ms (cached), <500ms (API)
- **ICU formatting**: <0.1ms per simple operation, <1ms per complex
- **Cache operations**: <50ms invalidation, <100ms full clear
- **Concurrent requests**: 100+ simultaneous users supported

## Mock Data

### Sample Translation Keys
```typescript
{
  "common.welcome": "Welcome, {name}!",
  "sop.procedures_count": "{count, plural, =0 {No procedures} other {# procedures}}",
  "training.progress": "Progress: {current}/{total} ({percentage}%)",
  "analytics.score": "Score: {score} ({grade, select, A {Excellent} other {Good}})"
}
```

### Test Scenarios
- **Bulk import**: 100+ translation entries
- **High-frequency usage**: 1000+ calls per second
- **Large datasets**: 10,000+ translation keys
- **Error conditions**: Network failures, malformed data
- **Edge cases**: Empty values, special characters, Unicode

## Error Handling

### Graceful Degradation
- **Network errors**: Fallback to cache, show stale data
- **Malformed data**: Skip invalid entries, continue operation
- **WebSocket failures**: Disable real-time, maintain functionality
- **Cache errors**: Fall back to direct API calls

### Error Types Tested
- **API errors**: 4xx/5xx responses, network timeouts
- **Data errors**: Invalid JSON, missing translations
- **System errors**: Memory limits, storage quota
- **User errors**: Invalid input, unauthorized access

## Browser Compatibility

### Supported Environments
- **Chrome/Edge**: 90+ (full WebSocket support)
- **Firefox**: 88+ (IndexedDB support)
- **Safari**: 14+ (ES2020 features)
- **Mobile**: iOS 14+, Android 8+

### Polyfills Tested
- **IndexedDB**: Fallback to localStorage
- **WebSocket**: Graceful degradation
- **Fetch**: Built-in fetch mock
- **Intl**: ICU message format support

## Continuous Integration

### Test Pipeline
1. **Lint**: ESLint code quality checks
2. **Type Check**: TypeScript compilation
3. **Unit Tests**: Core functionality validation
4. **Integration Tests**: System integration verification
5. **Performance Tests**: Load and stress testing
6. **Coverage**: Minimum threshold validation

### Quality Gates
- **All tests pass**: No failing test cases
- **Coverage threshold**: 80% minimum met
- **Performance benchmarks**: Sub-100ms targets met
- **Type safety**: No TypeScript errors
- **Linting**: No ESLint violations

## Contributing

### Adding New Tests
1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts` or `*.test.tsx`
3. Use descriptive test names explaining behavior
4. Include performance assertions where relevant
5. Mock external dependencies appropriately

### Test Best Practices
- **Arrange-Act-Assert** pattern
- **Descriptive test names** explaining behavior
- **Independent tests** with proper setup/teardown
- **Mock external dependencies** for isolation
- **Performance assertions** for critical paths
- **Error condition testing** for robustness

### Mock Guidelines
- Use provided mock factories for consistency
- Keep mocks simple and focused
- Reset mocks between tests
- Prefer behavior mocking over implementation
- Document complex mock scenarios