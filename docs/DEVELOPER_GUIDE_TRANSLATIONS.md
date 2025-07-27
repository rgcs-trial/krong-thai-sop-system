# Translation System Developer Guide
# คู่มือนักพัฒนาระบบการแปล

*Restaurant Krong Thai SOP Management System*  
*ระบบจัดการ SOP ร้านอาหารไทยกรองไทย*

**Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Target Audience**: Frontend Developers, Backend Engineers, Full-Stack Developers  
**ผู้ใช้เป้าหมาย**: นักพัฒนา Frontend วิศวกร Backend นักพัฒนา Full-Stack

---

## Table of Contents / สารบัญ

1. [Quick Start](#quick-start)
2. [Type-Safe Translation Hooks](#type-safe-translation-hooks)
3. [Component Integration Patterns](#component-integration-patterns)
4. [ICU Message Format](#icu-message-format)
5. [Real-time Subscriptions](#real-time-subscriptions)
6. [Cache Management](#cache-management)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Testing Strategies](#testing-strategies)
10. [Best Practices](#best-practices)

---

## Quick Start

### Installation & Setup

The translation system is already integrated into the Krong Thai SOP system. To start using translations in your components:

```typescript
// Import the main translation hook
import { useTranslations } from '@/hooks/use-translations-db';

// Or use namespace-specific hooks for better performance
import { 
  useCommonTranslations, 
  useSopTranslations,
  useMenuTranslations 
} from '@/hooks/use-translations-db';
```

### Basic Usage

```typescript
import React from 'react';
import { useTranslations } from '@/hooks/use-translations-db';

function WelcomeComponent() {
  const { t, isLoading, error } = useTranslations();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('common.description')}</p>
    </div>
  );
}
```

### TypeScript Integration

The system provides full TypeScript support with autocomplete for all translation keys:

```typescript
// All translation keys are typed - you'll get autocomplete!
t('common.welcome')     // ✅ Valid key
t('common.invalid')     // ❌ TypeScript error
t('menu.appetizers')    // ✅ Valid key from menu namespace
```

---

## Type-Safe Translation Hooks

### Main Translation Hook

The `useTranslations` hook is the primary interface for accessing translations with full type safety:

```typescript
interface UseTranslationsOptions {
  namespace?: keyof TranslationDomains;
  fallback?: string;
  lazy?: boolean;
  realtime?: boolean;
}

interface UseTranslationsReturn {
  t: TranslationFunction;
  hasTranslation: (key: string) => boolean;
  isLoading: boolean;
  error: Error | null;
  locale: Locale;
  switchLocale: (locale: Locale) => Promise<void>;
  refresh: () => Promise<void>;
}

function useTranslations(options?: UseTranslationsOptions): UseTranslationsReturn;
```

#### Usage Examples

```typescript
// Basic usage
const { t } = useTranslations();

// With options
const { t, isLoading, error } = useTranslations({
  namespace: 'common',
  fallback: 'Translation not found',
  realtime: true
});

// Check if translation exists
const { hasTranslation } = useTranslations();
if (hasTranslation('optional.key')) {
  return <div>{t('optional.key')}</div>;
}

// Handle locale switching
const { switchLocale } = useTranslations();
const handleLanguageChange = async (newLocale: Locale) => {
  await switchLocale(newLocale);
};
```

### Namespace-Specific Hooks

For better performance and type safety, use namespace-specific hooks:

```typescript
// Common UI translations
const commonT = useCommonTranslations();
commonT.t('loading')     // Type: string
commonT.t('save')        // Type: string
commonT.t('cancel')      // Type: string

// SOP-specific translations
const sopT = useSopTranslations();
sopT.t('categories.food_safety.title')
sopT.t('procedures.opening.step1')

// Menu translations
const menuT = useMenuTranslations();
menuT.t('appetizers.spring_rolls.name')
menuT.t('appetizers.spring_rolls.description')
```

#### Available Namespace Hooks

```typescript
// Core application areas
useCommonTranslations()      // UI elements, buttons, messages
useAuthTranslations()        // Authentication flow
useNavigationTranslations()  // Navigation menus and breadcrumbs
useErrorTranslations()       // Error messages and validation

// Business domains
useSopTranslations()         // Standard Operating Procedures
useMenuTranslations()        // Menu items and descriptions
useTrainingTranslations()    // Training modules and content
useAnalyticsTranslations()   // Dashboard and analytics

// Features
useSearchTranslations()      // Search interface and results
useDashboardTranslations()   // Dashboard widgets and metrics
useFormsTranslations()       // Form labels and validation
useReportsTranslations()     // Report generation and exports
```

### Advanced Hook Usage

#### Conditional Loading

```typescript
function ConditionalTranslations({ showAdvanced }: { showAdvanced: boolean }) {
  // Only load advanced translations when needed
  const { t: basicT } = useCommonTranslations();
  const { t: advancedT, isLoading } = useSopTranslations({ 
    lazy: !showAdvanced 
  });
  
  return (
    <div>
      <h1>{basicT.t('title')}</h1>
      {showAdvanced && (
        isLoading ? 
          <div>Loading advanced content...</div> :
          <div>{advancedT.t('advanced.procedures')}</div>
      )}
    </div>
  );
}
```

#### Batch Translation Loading

```typescript
function useMultipleTranslations() {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['translations', 'common'],
        queryFn: () => fetchTranslations('common')
      },
      {
        queryKey: ['translations', 'sop'],
        queryFn: () => fetchTranslations('sop')
      }
    ]
  });
  
  const isLoading = queries.some(query => query.isLoading);
  const hasError = queries.some(query => query.error);
  
  return { isLoading, hasError, queries };
}
```

---

## Component Integration Patterns

### Higher-Order Component Pattern

```typescript
import { ComponentType } from 'react';
import { useTranslations } from '@/hooks/use-translations-db';

interface WithTranslationsProps {
  t: (key: string, variables?: Record<string, any>) => string;
}

function withTranslations<T extends object>(
  WrappedComponent: ComponentType<T & WithTranslationsProps>,
  namespace?: string
) {
  return function WithTranslationsComponent(props: T) {
    const { t } = useTranslations({ namespace });
    
    return <WrappedComponent {...props} t={t} />;
  };
}

// Usage
const TranslatedButton = withTranslations(
  ({ t, label, ...props }: { label: string } & WithTranslationsProps) => (
    <button {...props}>{t(label)}</button>
  ),
  'common'
);

// In component
<TranslatedButton label="save" onClick={handleSave} />
```

### Render Props Pattern

```typescript
interface TranslationProviderProps {
  namespace?: string;
  children: (translation: {
    t: (key: string, variables?: Record<string, any>) => string;
    isLoading: boolean;
    error: Error | null;
  }) => React.ReactNode;
}

function TranslationProvider({ namespace, children }: TranslationProviderProps) {
  const translation = useTranslations({ namespace });
  return <>{children(translation)}</>;
}

// Usage
<TranslationProvider namespace="menu">
  {({ t, isLoading, error }) => (
    <div>
      {isLoading && <div>Loading menu...</div>}
      {error && <div>Error: {error.message}</div>}
      {!isLoading && !error && (
        <ul>
          <li>{t('appetizers.title')}</li>
          <li>{t('main_courses.title')}</li>
          <li>{t('desserts.title')}</li>
        </ul>
      )}
    </div>
  )}
</TranslationProvider>
```

### Custom Hook Composition

```typescript
function useLocalizedData<T>(
  dataKey: string,
  transformer?: (data: any, t: TranslationFunction) => T
) {
  const { t } = useTranslations();
  const { data, isLoading, error } = useQuery({
    queryKey: [dataKey],
    queryFn: () => fetchData(dataKey)
  });
  
  const localizedData = useMemo(() => {
    if (!data || !transformer) return data;
    return transformer(data, t);
  }, [data, transformer, t]);
  
  return { data: localizedData, isLoading, error };
}

// Usage
function MenuList() {
  const { data: menuItems, isLoading } = useLocalizedData(
    'menu-items',
    (items, t) => items.map(item => ({
      ...item,
      name: t(`menu.items.${item.id}.name`),
      description: t(`menu.items.${item.id}.description`)
    }))
  );
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <ul>
      {menuItems?.map(item => (
        <li key={item.id}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
```

### Context-Based Translations

```typescript
const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationContextValue {
  t: TranslationFunction;
  locale: Locale;
  switchLocale: (locale: Locale) => Promise<void>;
}

export function TranslationContextProvider({ children }: { children: ReactNode }) {
  const translation = useTranslations();
  
  return (
    <TranslationContext.Provider value={translation}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslationContext must be used within TranslationContextProvider');
  }
  return context;
}

// Usage in deeply nested components
function DeepComponent() {
  const { t } = useTranslationContext();
  return <span>{t('deep.nested.key')}</span>;
}
```

---

## ICU Message Format

### Basic Variable Interpolation

```typescript
// Translation definition
{
  "welcome.user": "Welcome back, {username}!",
  "items.selected": "You have selected {count} items"
}

// Component usage
function WelcomeMessage({ username }: { username: string }) {
  const { t } = useTranslations();
  
  return (
    <div>
      {t('welcome.user', { username })}
    </div>
  );
}

function ItemCounter({ count }: { count: number }) {
  const { t } = useTranslations();
  
  return (
    <div>
      {t('items.selected', { count })}
    </div>
  );
}
```

### Pluralization Rules

```typescript
// Translation definitions with ICU plural syntax
{
  "items.count": "{count, plural, =0 {No items} =1 {One item} other {# items}}",
  "time.remaining": "{minutes, plural, =0 {Less than a minute} =1 {One minute} other {# minutes}} remaining"
}

// Thai pluralization (Thai doesn't have plural forms, but ICU handles this)
{
  "items.count.th": "{count, plural, other {# รายการ}}",
  "time.remaining.th": "เหลือเวลา {minutes, plural, other {# นาที}}"
}

// Component usage
function ItemList({ items }: { items: any[] }) {
  const { t } = useTranslations();
  
  return (
    <div>
      <h2>{t('items.count', { count: items.length })}</h2>
      <ul>
        {items.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </div>
  );
}
```

### Selection and Conditional Text

```typescript
// Translation definitions
{
  "user.greeting": "{gender, select, male {Welcome, sir!} female {Welcome, madam!} other {Welcome!}}",
  "status.message": "{status, select, pending {Processing your request...} completed {Request completed!} error {An error occurred} other {Unknown status}}"
}

// Component usage
function UserGreeting({ user }: { user: User }) {
  const { t } = useTranslations();
  
  return (
    <div>
      {t('user.greeting', { gender: user.gender })}
    </div>
  );
}

function StatusDisplay({ status }: { status: string }) {
  const { t } = useTranslations();
  
  return (
    <div className={`status-${status}`}>
      {t('status.message', { status })}
    </div>
  );
}
```

### Date and Number Formatting

```typescript
// Translation definitions with formatters
{
  "order.date": "Order placed on {date, date, long}",
  "price.display": "Price: {amount, number, currency}",
  "completion.percentage": "Progress: {progress, number, percent}"
}

// Component usage with proper formatting
function OrderInfo({ order }: { order: Order }) {
  const { t } = useTranslations();
  
  return (
    <div>
      {t('order.date', { 
        date: new Date(order.createdAt) 
      })}
      {t('price.display', { 
        amount: order.total,
        // ICU will use locale-appropriate currency formatting
      })}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const { t } = useTranslations();
  
  return (
    <div>
      <div className="progress-bar">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
      {t('completion.percentage', { progress })}
    </div>
  );
}
```

### Complex ICU Patterns

```typescript
// Advanced ICU patterns for restaurant scenarios
{
  "reservation.confirmation": "Table for {partySize, plural, =1 {one person} other {# people}} on {date, date, full} at {time, time, short}",
  "order.summary": "Your order: {itemCount, plural, =0 {no items} =1 {one item} other {# items}} totaling {total, number, currency}",
  "wait.time": "{estimatedTime, plural, =0 {Ready now!} =1 {About 1 minute} other {About # minutes}} until your order is ready"
}

// Thai equivalents with cultural considerations
{
  "reservation.confirmation.th": "โต๊ะสำหรับ {partySize} ท่าน วันที่ {date, date, full} เวลา {time, time, short}",
  "order.summary.th": "รายการสั่ง: {itemCount} รายการ รวม {total, number, currency}",
  "wait.time.th": "{estimatedTime, plural, =0 {พร้อมเสิร์ฟแล้ว!} other {รออีกประมาณ # นาที}} อาหารจะพร้อม"
}

// Usage in restaurant components
function ReservationConfirmation({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslations();
  
  return (
    <div className="reservation-card">
      {t('reservation.confirmation', {
        partySize: reservation.partySize,
        date: new Date(reservation.date),
        time: new Date(reservation.time)
      })}
    </div>
  );
}

function OrderSummary({ order }: { order: Order }) {
  const { t } = useTranslations();
  
  return (
    <div className="order-summary">
      {t('order.summary', {
        itemCount: order.items.length,
        total: order.total
      })}
    </div>
  );
}
```

---

## Real-time Subscriptions

### Basic Real-time Setup

```typescript
import { useTranslationWebSocket } from '@/hooks/use-translations-db';

function RealTimeTranslationComponent() {
  const { t, connectionStatus, isRealtime } = useTranslations({ 
    realtime: true 
  });
  
  // Connection status indicator
  const statusColor = {
    'connected': 'green',
    'connecting': 'yellow',
    'disconnected': 'red'
  }[connectionStatus];
  
  return (
    <div>
      <div style={{ color: statusColor }}>
        Status: {connectionStatus}
      </div>
      <h1>{t('common.welcome')}</h1>
      {/* Translation updates automatically when changed in admin panel */}
    </div>
  );
}
```

### Advanced Subscription Management

```typescript
function useTranslationSubscriptions(options: SubscriptionOptions) {
  const [subscriptions, setSubscriptions] = useState<Map<string, Subscription>>(new Map());
  
  const subscribe = useCallback((
    locales: Locale[],
    namespaces: string[],
    callback: SubscriptionCallback
  ) => {
    const subscription = translationWebSocket.subscribe({
      locales,
      namespaces,
      events: ['translation_updated', 'translation_published'],
      includeMetadata: true
    }, callback);
    
    const subscriptionId = generateSubscriptionId(locales, namespaces);
    setSubscriptions(prev => new Map(prev).set(subscriptionId, subscription));
    
    return () => {
      subscription.unsubscribe();
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(subscriptionId);
        return newMap;
      });
    };
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
    };
  }, [subscriptions]);
  
  return { subscribe };
}

// Usage
function AdminTranslationEditor() {
  const { subscribe } = useTranslationSubscriptions();
  const [liveUpdates, setLiveUpdates] = useState<TranslationUpdate[]>([]);
  
  useEffect(() => {
    const unsubscribe = subscribe(
      ['en', 'th'],
      ['common', 'menu'],
      (update: TranslationUpdate) => {
        setLiveUpdates(prev => [...prev, update]);
        
        // Show notification
        toast({
          title: 'Translation Updated',
          description: `${update.key} has been updated by ${update.metadata.userRole}`
        });
      }
    );
    
    return unsubscribe;
  }, [subscribe]);
  
  return (
    <div>
      <h2>Live Translation Updates</h2>
      {liveUpdates.map(update => (
        <div key={update.id} className="update-notification">
          <strong>{update.key}</strong> updated to: {update.data.current}
        </div>
      ))}
    </div>
  );
}
```

### Real-time Collaboration

```typescript
function CollaborativeTranslationEditor({ translationId }: { translationId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState('');
  
  // Subscribe to collaboration events
  useEffect(() => {
    const unsubscribe = translationWebSocket.subscribe({
      locales: ['en', 'th'],
      events: ['user_joined', 'user_left', 'editing_started', 'editing_stopped', 'content_changed'],
      filters: { translationId }
    }, (event) => {
      switch (event.type) {
        case 'user_joined':
          setCollaborators(prev => [...prev, event.data.user]);
          break;
        case 'user_left':
          setCollaborators(prev => prev.filter(c => c.id !== event.data.userId));
          break;
        case 'editing_started':
          if (event.data.userId !== currentUserId) {
            setIsEditing(true);
          }
          break;
        case 'editing_stopped':
          setIsEditing(false);
          break;
        case 'content_changed':
          if (event.data.userId !== currentUserId) {
            setCurrentValue(event.data.newValue);
          }
          break;
      }
    });
    
    return unsubscribe;
  }, [translationId]);
  
  return (
    <div className="collaborative-editor">
      <div className="collaborators">
        {collaborators.map(collaborator => (
          <div key={collaborator.id} className="collaborator">
            <div 
              className="avatar" 
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.initials}
            </div>
            {collaborator.isEditing && <span className="editing-indicator">✏️</span>}
          </div>
        ))}
      </div>
      
      <textarea
        value={currentValue}
        onChange={(e) => {
          setCurrentValue(e.target.value);
          // Debounced real-time sync
          debouncedSyncChange(e.target.value);
        }}
        disabled={isEditing}
        placeholder={isEditing ? "Another user is editing..." : "Enter translation..."}
        className={isEditing ? "editor-disabled" : "editor-active"}
      />
    </div>
  );
}
```

---

## Cache Management

### Manual Cache Control

```typescript
import { translationCache } from '@/lib/translation-client-cache';

function TranslationCacheManager() {
  const handleClearCache = async () => {
    await translationCache.clear();
    toast({ title: 'Cache cleared successfully' });
  };
  
  const handlePrefetchCommon = async () => {
    await translationCache.prefetch('en', ['common', 'navigation'], 'high');
    toast({ title: 'Common translations prefetched' });
  };
  
  const handleInvalidateKey = async (key: string) => {
    await translationCache.invalidate({ keys: [key] });
    toast({ title: `Cache invalidated for ${key}` });
  };
  
  return (
    <div className="cache-controls">
      <button onClick={handleClearCache}>Clear All Cache</button>
      <button onClick={handlePrefetchCommon}>Prefetch Common</button>
      <button onClick={() => handleInvalidateKey('menu.title')}>
        Invalidate Menu Title
      </button>
    </div>
  );
}
```

### Cache Status Monitoring

```typescript
function useCacheMonitoring() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  
  useEffect(() => {
    const updateStats = async () => {
      const stats = await translationCache.getStats();
      setCacheStats(stats);
    };
    
    // Update every 10 seconds
    const interval = setInterval(updateStats, 10000);
    updateStats(); // Initial load
    
    return () => clearInterval(interval);
  }, []);
  
  return cacheStats;
}

function CacheStatusDisplay() {
  const cacheStats = useCacheMonitoring();
  
  if (!cacheStats) return <div>Loading cache stats...</div>;
  
  return (
    <div className="cache-stats">
      <div className="stat">
        <label>Hit Rate:</label>
        <span>{(cacheStats.hitRate * 100).toFixed(1)}%</span>
      </div>
      <div className="stat">
        <label>Total Entries:</label>
        <span>{cacheStats.totalEntries}</span>
      </div>
      <div className="stat">
        <label>Memory Usage:</label>
        <span>{(cacheStats.memoryUsage / 1024 / 1024).toFixed(1)} MB</span>
      </div>
      <div className="stat">
        <label>Last Updated:</label>
        <span>{new Date(cacheStats.lastUpdated).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
```

### Smart Prefetching

```typescript
function useSmartPrefetching() {
  const { locale } = useTranslations();
  const router = useRouter();
  
  useEffect(() => {
    // Prefetch based on current route
    const currentPath = router.asPath;
    
    const prefetchStrategies = {
      '/admin': () => translationCache.prefetch(locale, ['admin', 'common'], 'high'),
      '/menu': () => translationCache.prefetch(locale, ['menu', 'common'], 'high'),
      '/training': () => translationCache.prefetch(locale, ['training', 'common'], 'medium'),
      '/analytics': () => translationCache.prefetch(locale, ['analytics', 'common'], 'medium')
    };
    
    // Find matching prefetch strategy
    const strategy = Object.entries(prefetchStrategies)
      .find(([path]) => currentPath.startsWith(path));
    
    if (strategy) {
      strategy[1](); // Execute prefetch
    }
    
    // Prefetch likely next destinations based on user patterns
    const userPatterns = getUserNavigationPatterns();
    const likelyDestinations = predictNextDestinations(currentPath, userPatterns);
    
    likelyDestinations.forEach(destination => {
      const namespace = getNamespaceForPath(destination);
      if (namespace) {
        translationCache.prefetch(locale, [namespace], 'low');
      }
    });
  }, [router.asPath, locale]);
}

// Usage in app root
function AppWithPrefetching({ children }: { children: ReactNode }) {
  useSmartPrefetching();
  return <>{children}</>;
}
```

### Cache Persistence

```typescript
function usePersistentCache() {
  useEffect(() => {
    // Restore cache from localStorage on app start
    const restoreCache = async () => {
      try {
        const persistedCache = localStorage.getItem('translation-cache');
        if (persistedCache) {
          const cacheData = JSON.parse(persistedCache);
          await translationCache.restore(cacheData);
        }
      } catch (error) {
        console.error('Failed to restore cache:', error);
      }
    };
    
    restoreCache();
    
    // Persist cache changes to localStorage
    const persistCache = async () => {
      try {
        const cacheData = await translationCache.serialize();
        localStorage.setItem('translation-cache', JSON.stringify(cacheData));
      } catch (error) {
        console.error('Failed to persist cache:', error);
      }
    };
    
    // Persist every 30 seconds
    const interval = setInterval(persistCache, 30000);
    
    // Persist on page unload
    const handleUnload = () => persistCache();
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      persistCache(); // Final persist
    };
  }, []);
}
```

---

## Error Handling

### Translation Error Boundaries

```typescript
interface TranslationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class TranslationErrorBoundary extends Component<
  { children: ReactNode; fallback?: ComponentType<{ error: Error }> },
  TranslationErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error: Error): TranslationErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log translation errors
    console.error('Translation Error:', error, errorInfo);
    
    // Report to error tracking service
    if (error.message.includes('translation')) {
      reportTranslationError(error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultTranslationErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }
    
    return this.props.children;
  }
}

function DefaultTranslationErrorFallback({ error }: { error: Error }) {
  return (
    <div className="translation-error">
      <h3>Translation Error</h3>
      <p>Failed to load translations: {error.message}</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}

// Usage
function App() {
  return (
    <TranslationErrorBoundary fallback={CustomErrorFallback}>
      <MainApplication />
    </TranslationErrorBoundary>
  );
}
```

### Graceful Fallbacks

```typescript
function useSafeTranslation(key: string, fallback?: string, variables?: Record<string, any>) {
  const { t, hasTranslation, error } = useTranslations();
  
  return useMemo(() => {
    // If there's an error, return fallback or key
    if (error) {
      return fallback || key;
    }
    
    // If translation doesn't exist, return fallback or key
    if (!hasTranslation(key)) {
      console.warn(`Translation missing: ${key}`);
      return fallback || key;
    }
    
    try {
      return t(key, variables);
    } catch (translationError) {
      console.error(`Translation error for key ${key}:`, translationError);
      return fallback || key;
    }
  }, [t, key, fallback, variables, error, hasTranslation]);
}

// Usage
function SafeTranslationComponent() {
  const safeTitle = useSafeTranslation(
    'page.title', 
    'Default Page Title'
  );
  
  const safeDescription = useSafeTranslation(
    'page.description',
    'Default description for this page.',
    { user: 'John' }
  );
  
  return (
    <div>
      <h1>{safeTitle}</h1>
      <p>{safeDescription}</p>
    </div>
  );
}
```

### Error Recovery Strategies

```typescript
function useTranslationWithRetry(maxRetries = 3) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { t, error, refresh } = useTranslations();
  
  const retryTranslation = useCallback(async () => {
    if (retryCount >= maxRetries) {
      console.error('Max retries reached for translation loading');
      return;
    }
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await refresh();
      setRetryCount(0); // Reset on success
    } catch (retryError) {
      console.error(`Retry ${retryCount + 1} failed:`, retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [refresh, retryCount, maxRetries]);
  
  // Auto-retry on error
  useEffect(() => {
    if (error && retryCount < maxRetries && !isRetrying) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      const timeoutId = setTimeout(retryTranslation, retryDelay);
      return () => clearTimeout(timeoutId);
    }
  }, [error, retryCount, maxRetries, isRetrying, retryTranslation]);
  
  return {
    t,
    error,
    isRetrying,
    retryCount,
    canRetry: retryCount < maxRetries,
    manualRetry: retryTranslation
  };
}

// Usage
function RetryableTranslationComponent() {
  const { 
    t, 
    error, 
    isRetrying, 
    retryCount, 
    canRetry, 
    manualRetry 
  } = useTranslationWithRetry();
  
  if (error && !isRetrying && !canRetry) {
    return (
      <div className="translation-error">
        <p>Failed to load translations after multiple attempts.</p>
        <button onClick={manualRetry}>Try Again</button>
      </div>
    );
  }
  
  if (isRetrying) {
    return (
      <div className="translation-loading">
        <p>Retrying translation load... (Attempt {retryCount + 1})</p>
      </div>
    );
  }
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
    </div>
  );
}
```

### Validation and Type Safety

```typescript
// Runtime validation for translation variables
function createTypedTranslation<T extends Record<string, any>>(
  key: string,
  schema: z.ZodSchema<T>
) {
  return function useTypedTranslation(variables: T) {
    const { t } = useTranslations();
    
    // Validate variables at runtime
    const validationResult = schema.safeParse(variables);
    if (!validationResult.success) {
      console.error(`Invalid variables for translation ${key}:`, validationResult.error);
      throw new Error(`Invalid translation variables for ${key}`);
    }
    
    return t(key, validationResult.data);
  };
}

// Usage with type safety
const useWelcomeMessage = createTypedTranslation(
  'welcome.user',
  z.object({
    username: z.string().min(1),
    lastLogin: z.date().optional()
  })
);

function TypeSafeComponent({ user }: { user: User }) {
  // TypeScript will enforce the correct variable types
  const welcomeMessage = useWelcomeMessage({
    username: user.name,
    lastLogin: user.lastLoginAt
  });
  
  return <div>{welcomeMessage}</div>;
}
```

---

## Performance Optimization

### Lazy Loading Strategies

```typescript
// Lazy load translations by route
const translations = {
  '/admin': () => import('@/translations/admin'),
  '/menu': () => import('@/translations/menu'),
  '/training': () => import('@/translations/training')
};

function useRouteBasedTranslations() {
  const router = useRouter();
  const [currentTranslations, setCurrentTranslations] = useState<any>(null);
  
  useEffect(() => {
    const loadTranslationsForRoute = async () => {
      const routeTranslations = translations[router.pathname];
      if (routeTranslations) {
        const translationModule = await routeTranslations();
        setCurrentTranslations(translationModule.default);
      }
    };
    
    loadTranslationsForRoute();
  }, [router.pathname]);
  
  return currentTranslations;
}
```

### Memoization Patterns

```typescript
// Memoize expensive translation operations
function useMemoizedTranslations(keys: string[], variables?: Record<string, any>) {
  const { t } = useTranslations();
  
  return useMemo(() => {
    return keys.reduce((acc, key) => {
      acc[key] = t(key, variables);
      return acc;
    }, {} as Record<string, string>);
  }, [t, keys, variables]);
}

// Memoize complex ICU formatting
function useMemoizedICUTranslation(
  key: string, 
  variables: Record<string, any>,
  dependencies: any[] = []
) {
  const { t } = useTranslations();
  
  return useMemo(() => {
    return t(key, variables);
  }, [t, key, ...dependencies]);
}

// Usage
function OptimizedComponent({ orders }: { orders: Order[] }) {
  // Memoize all menu translations at once
  const menuTranslations = useMemoizedTranslations([
    'menu.appetizers.title',
    'menu.main_courses.title',
    'menu.desserts.title'
  ]);
  
  // Memoize complex order summary
  const orderSummary = useMemoizedICUTranslation(
    'order.summary',
    { 
      count: orders.length,
      total: orders.reduce((sum, order) => sum + order.total, 0)
    },
    [orders.length, orders.reduce((sum, order) => sum + order.total, 0)]
  );
  
  return (
    <div>
      <h1>{menuTranslations['menu.appetizers.title']}</h1>
      <p>{orderSummary}</p>
    </div>
  );
}
```

### Bundle Optimization

```typescript
// Create specialized hooks for different use cases
export function useMenuTranslations() {
  return useTranslations({ namespace: 'menu' });
}

export function useCommonTranslations() {
  return useTranslations({ namespace: 'common' });
}

// Tree-shakable translation utilities
export const translationUtils = {
  // Only include formatters used in the app
  formatCurrency: (amount: number, locale: Locale) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  },
  
  formatDate: (date: Date, locale: Locale) => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }
};
```

### Virtual Translation Loading

```typescript
// Load translations on-demand based on viewport
function useVirtualTranslations(keys: string[], isVisible: boolean) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const { t } = useTranslations();
  
  useEffect(() => {
    if (isVisible && Object.keys(translations).length === 0) {
      const loadedTranslations = keys.reduce((acc, key) => {
        acc[key] = t(key);
        return acc;
      }, {} as Record<string, string>);
      
      setTranslations(loadedTranslations);
    }
  }, [isVisible, keys, t, translations]);
  
  return translations;
}

// Usage with Intersection Observer
function VirtualTranslationComponent({ translationKeys }: { translationKeys: string[] }) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  const translations = useVirtualTranslations(translationKeys, inView);
  
  return (
    <div ref={ref}>
      {inView ? (
        <div>
          {translationKeys.map(key => (
            <p key={key}>{translations[key] || 'Loading...'}</p>
          ))}
        </div>
      ) : (
        <div>Scroll to load translations...</div>
      )}
    </div>
  );
}
```

---

## Testing Strategies

### Unit Testing Translation Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslations } from '@/hooks/use-translations-db';

describe('useTranslations', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('should return translation function', async () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });
    
    await act(async () => {
      // Wait for initial load
    });
    
    expect(result.current.t).toBeDefined();
    expect(typeof result.current.t).toBe('function');
  });
  
  it('should handle missing translations gracefully', async () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });
    
    await act(async () => {
      const translation = result.current.t('nonexistent.key');
      expect(translation).toBe('nonexistent.key'); // Fallback to key
    });
  });
  
  it('should support ICU variable interpolation', async () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });
    
    await act(async () => {
      const translation = result.current.t('welcome.user', { name: 'John' });
      expect(translation).toContain('John');
    });
  });
});
```

### Mocking Translation Data

```typescript
// Mock translation provider for tests
export const MockTranslationProvider = ({ 
  translations = {},
  children 
}: {
  translations?: Record<string, string>;
  children: ReactNode;
}) => {
  const mockT = (key: string, variables?: Record<string, any>) => {
    let translation = translations[key] || key;
    
    // Simple variable interpolation for tests
    if (variables) {
      Object.entries(variables).forEach(([varKey, value]) => {
        translation = translation.replace(`{${varKey}}`, String(value));
      });
    }
    
    return translation;
  };
  
  const mockTranslationContext = {
    t: mockT,
    hasTranslation: (key: string) => key in translations,
    isLoading: false,
    error: null,
    locale: 'en' as Locale,
    switchLocale: jest.fn(),
    refresh: jest.fn()
  };
  
  return (
    <TranslationContext.Provider value={mockTranslationContext}>
      {children}
    </TranslationContext.Provider>
  );
};

// Usage in tests
describe('WelcomeComponent', () => {
  it('should display welcome message', () => {
    const mockTranslations = {
      'common.welcome': 'Welcome to Test App',
      'common.description': 'This is a test description'
    };
    
    render(
      <MockTranslationProvider translations={mockTranslations}>
        <WelcomeComponent />
      </MockTranslationProvider>
    );
    
    expect(screen.getByText('Welcome to Test App')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
// Test translation system integration
describe('Translation System Integration', () => {
  beforeEach(async () => {
    // Setup test database with sample translations
    await setupTestDatabase();
  });
  
  afterEach(async () => {
    await cleanupTestDatabase();
  });
  
  it('should load translations from API', async () => {
    const mockTranslations = {
      'common.welcome': 'Welcome',
      'common.save': 'Save'
    };
    
    // Mock API response
    fetchMock.mockResponseOnce(JSON.stringify({
      locale: 'en',
      translations: mockTranslations,
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      }
    }));
    
    const { result } = renderHook(() => useTranslations());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.t('common.welcome')).toBe('Welcome');
    expect(result.current.t('common.save')).toBe('Save');
  });
  
  it('should handle real-time translation updates', async () => {
    const { result } = renderHook(() => useTranslations({ realtime: true }));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Simulate real-time update
    act(() => {
      mockWebSocket.emit('translation_updated', {
        key: 'common.welcome',
        newValue: 'Updated Welcome',
        locale: 'en'
      });
    });
    
    await waitFor(() => {
      expect(result.current.t('common.welcome')).toBe('Updated Welcome');
    });
  });
});
```

### E2E Testing with Cypress

```typescript
// cypress/e2e/translation-system.cy.ts
describe('Translation System E2E', () => {
  beforeEach(() => {
    cy.visit('/admin/translations');
    cy.login('admin@krongthai.com', '1234');
  });
  
  it('should create and publish translation', () => {
    // Navigate to translation editor
    cy.get('[data-testid="new-translation-btn"]').click();
    
    // Fill translation form
    cy.get('[data-testid="key-input"]').type('test.new.key');
    cy.get('[data-testid="category-select"]').select('common');
    cy.get('[data-testid="en-input"]').type('Test English Text');
    cy.get('[data-testid="th-input"]').type('ข้อความทดสอบภาษาไทย');
    
    // Save translation
    cy.get('[data-testid="save-translation-btn"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-toast"]').should('contain', 'Translation saved');
    
    // Submit for review
    cy.get('[data-testid="submit-review-btn"]').click();
    
    // Navigate to workflow management
    cy.get('[data-testid="workflow-tab"]').click();
    
    // Approve translation
    cy.get('[data-testid="pending-translations"]')
      .contains('test.new.key')
      .parent()
      .find('[data-testid="approve-btn"]')
      .click();
    
    // Publish translation
    cy.get('[data-testid="publish-btn"]').click();
    
    // Verify translation is live
    cy.visit('/test-page');
    cy.get('[data-translation="test.new.key"]').should('contain', 'Test English Text');
    
    // Switch language and verify Thai translation
    cy.get('[data-testid="language-switcher"]').click();
    cy.get('[data-testid="th-option"]').click();
    cy.get('[data-translation="test.new.key"]').should('contain', 'ข้อความทดสอบภาษาไทย');
  });
  
  it('should handle real-time collaboration', () => {
    // Open translation editor in two windows
    cy.window().then((win) => {
      const newWindow = win.open('/admin/translations/editor/123', '_blank');
      
      // Simulate collaborative editing
      cy.get('[data-testid="translation-input"]').type('User 1 editing...');
      
      // Verify other user sees the change
      cy.wrap(newWindow).its('document').then((doc) => {
        cy.wrap(doc.querySelector('[data-testid="collaborator-indicator"]'))
          .should('be.visible');
      });
    });
  });
});
```

---

## Best Practices

### Code Organization

```typescript
// Recommended project structure for translations
src/
├── hooks/
│   ├── use-translations-db.ts          # Main translation hooks
│   ├── use-translation-admin.ts        # Admin-specific hooks
│   └── use-translation-analytics.ts    # Analytics hooks
├── lib/
│   ├── translation-cache.ts            # Cache management
│   ├── translation-websocket.ts        # Real-time functionality
│   └── translation-utils.ts            # Utility functions
├── types/
│   ├── translation.ts                  # Core types
│   ├── translation-keys.ts             # Generated key types
│   └── translation-admin.ts            # Admin types
├── components/
│   ├── translation/                    # Translation-specific components
│   │   ├── TranslationProvider.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   └── TranslationErrorBoundary.tsx
│   └── admin/                          # Admin components
│       ├── TranslationEditor.tsx
│       └── TranslationManager.tsx
└── constants/
    └── translation-keys.ts             # Key constants and mappings
```

### Naming Conventions

```typescript
// Translation key naming best practices
const translationKeys = {
  // Use dot notation for hierarchy
  'common.buttons.save': 'Save',
  'common.buttons.cancel': 'Cancel',
  'common.messages.success': 'Operation completed successfully',
  
  // Use descriptive, hierarchical keys
  'menu.categories.appetizers.title': 'Appetizers',
  'menu.categories.appetizers.description': 'Start your meal with our delicious appetizers',
  
  // Include context in key names
  'forms.validation.email.required': 'Email address is required',
  'forms.validation.email.invalid': 'Please enter a valid email address',
  
  // Use plural forms appropriately
  'items.count.zero': 'No items',
  'items.count.one': 'One item',
  'items.count.other': '{count} items',
  
  // Separate user-facing and system messages
  'system.errors.database.connection': 'Database connection failed',
  'user.errors.login.invalid': 'Invalid username or password'
};

// Component naming for translation-related components
export const TranslationComponent = () => { /* */ };          // ✅ Clear purpose
export const useTranslationHook = () => { /* */ };            // ✅ Hook naming
export const TranslationContext = createContext();            // ✅ Context naming
export const withTranslations = (Component) => { /* */ };     // ✅ HOC naming
```

### Performance Guidelines

```typescript
// DO: Use namespace-specific hooks for better performance
const { t } = useCommonTranslations();
const menuT = useMenuTranslations();

// DON'T: Load all translations when only specific ones are needed
const { t } = useTranslations(); // Loads everything

// DO: Memoize expensive translation operations
const expensiveTranslation = useMemo(() => {
  return t('complex.icu.message', { 
    count: items.length,
    total: calculateTotal(items)
  });
}, [t, items.length, calculateTotal(items)]);

// DON'T: Re-calculate translations on every render
const expensiveTranslation = t('complex.icu.message', { 
  count: items.length,
  total: calculateTotal(items) // Calculated every render
});

// DO: Prefetch translations for likely navigation
useEffect(() => {
  if (userRole === 'admin') {
    translationCache.prefetch('en', ['admin', 'analytics'], 'low');
  }
}, [userRole]);

// DO: Use lazy loading for large translation sets
const { t } = useTranslations({ 
  namespace: 'reports',
  lazy: !showReports 
});
```

### Error Handling Best Practices

```typescript
// DO: Provide meaningful fallbacks
function TranslationWithFallback({ translationKey, fallback }: Props) {
  const { t, hasTranslation } = useTranslations();
  
  if (!hasTranslation(translationKey)) {
    console.warn(`Missing translation: ${translationKey}`);
    return <span>{fallback || translationKey}</span>;
  }
  
  return <span>{t(translationKey)}</span>;
}

// DO: Handle translation errors gracefully
function SafeTranslatedContent({ children }: { children: ReactNode }) {
  return (
    <TranslationErrorBoundary
      fallback={({ error }) => (
        <div className="error-fallback">
          <p>Content temporarily unavailable</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </TranslationErrorBoundary>
  );
}

// DO: Validate translation variables
function validateTranslationVariables(
  key: string, 
  variables: Record<string, any>,
  schema: z.ZodSchema
) {
  const result = schema.safeParse(variables);
  if (!result.success) {
    console.error(`Invalid variables for ${key}:`, result.error);
    throw new Error(`Translation variable validation failed for ${key}`);
  }
  return result.data;
}
```

### Testing Best Practices

```typescript
// DO: Test translation behavior, not implementation
test('should display user greeting with name', () => {
  render(
    <MockTranslationProvider translations={{
      'user.greeting': 'Hello, {name}!'
    }}>
      <UserGreeting name="John" />
    </MockTranslationProvider>
  );
  
  expect(screen.getByText('Hello, John!')).toBeInTheDocument();
});

// DO: Test edge cases and error scenarios
test('should handle missing translation gracefully', () => {
  render(
    <MockTranslationProvider translations={{}}>
      <TranslationComponent translationKey="missing.key" />
    </MockTranslationProvider>
  );
  
  expect(screen.getByText('missing.key')).toBeInTheDocument();
});

// DO: Test real-time updates
test('should update translation when WebSocket event received', async () => {
  const { result } = renderHook(() => useTranslations({ realtime: true }));
  
  act(() => {
    mockWebSocket.emit('translation_updated', {
      key: 'test.key',
      newValue: 'Updated Value'
    });
  });
  
  await waitFor(() => {
    expect(result.current.t('test.key')).toBe('Updated Value');
  });
});
```

### Security Considerations

```typescript
// DO: Sanitize user-provided translation variables
function safeTranslation(key: string, variables: Record<string, any>) {
  const sanitizedVariables = Object.entries(variables).reduce((acc, [k, v]) => {
    // Sanitize string values to prevent XSS
    if (typeof v === 'string') {
      acc[k] = DOMPurify.sanitize(v);
    } else {
      acc[k] = v;
    }
    return acc;
  }, {} as Record<string, any>);
  
  return t(key, sanitizedVariables);
}

// DO: Validate translation keys to prevent injection
function validateTranslationKey(key: string): boolean {
  // Only allow alphanumeric characters, dots, and underscores
  const validKeyPattern = /^[a-zA-Z0-9._]+$/;
  return validKeyPattern.test(key);
}

// DON'T: Trust user input in translation keys
function UnsafeComponent({ userProvidedKey }: { userProvidedKey: string }) {
  const { t } = useTranslations();
  
  // ❌ DANGEROUS: User could inject malicious keys
  return <div>{t(userProvidedKey)}</div>;
}

// DO: Use whitelisted keys or validation
function SafeComponent({ keyType }: { keyType: 'greeting' | 'farewell' }) {
  const { t } = useTranslations();
  
  const keyMap = {
    greeting: 'user.greeting',
    farewell: 'user.farewell'
  };
  
  return <div>{t(keyMap[keyType])}</div>;
}
```

### Accessibility Best Practices

```typescript
// DO: Provide language metadata for screen readers
function AccessibleTranslation({ translationKey }: { translationKey: string }) {
  const { t, locale } = useTranslations();
  
  return (
    <span lang={locale}>
      {t(translationKey)}
    </span>
  );
}

// DO: Handle direction changes for RTL languages
function DirectionalText({ children }: { children: ReactNode }) {
  const { locale } = useTranslations();
  const isRTL = ['ar', 'he', 'fa'].includes(locale);
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
}

// DO: Provide alternative text for non-text content
function LocalizedImage({ imageKey, altTextKey }: { imageKey: string; altTextKey: string }) {
  const { t } = useTranslations();
  
  return (
    <img 
      src={t(imageKey)} 
      alt={t(altTextKey)}
      role="img"
    />
  );
}
```

---

## Summary / สรุป

This developer guide provides comprehensive patterns and best practices for implementing the translation system in the Krong Thai restaurant management platform. Key takeaways include:

### Core Development Principles
- **Type Safety**: Leverage TypeScript for compile-time validation of translation keys
- **Performance**: Use namespace-specific hooks and smart caching strategies  
- **Error Resilience**: Implement graceful fallbacks and comprehensive error boundaries
- **Real-time Collaboration**: Utilize WebSocket subscriptions for live translation updates

### Advanced Features
- **ICU Message Format**: Support complex pluralization, selection, and formatting
- **Cache Management**: Multi-layer caching with intelligent prefetching
- **Testing Strategies**: Comprehensive unit, integration, and E2E testing approaches
- **Security**: Input validation, sanitization, and XSS prevention

### Best Practices
- **Code Organization**: Clear separation of concerns and modular architecture
- **Naming Conventions**: Consistent, hierarchical translation key naming
- **Performance Optimization**: Lazy loading, memoization, and bundle splitting
- **Accessibility**: Screen reader support, language direction, and proper markup

By following these patterns and practices, developers can build robust, scalable, and maintainable internationalization features that enhance the restaurant operations experience across multiple languages and cultures.

---

**Document Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Languages**: English, Thai (ไทย)  
**Platform**: Krong Thai SOP Management System  
**Framework**: Next.js 15.4.4 + React 19.1.0 + TypeScript 5.8.3