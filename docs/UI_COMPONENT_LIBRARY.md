# Krong Thai UI Component Library

**Version**: 0.2.0 - Phase 2+ Enhanced  
**Components**: 60+ Across 6 Domains  
**Status**: Production Optimized with Analytics Client Wrappers & E2E Testing

A comprehensive design system for Krong Thai restaurant management platform, built on shadcn/ui with French cultural elements, bilingual EN/FR support, and enterprise-grade features including analytics client wrappers, training system, Cypress E2E testing, and voice search capabilities.

## Brand Foundation

### Color Palette

#### Primary Colors
```css
--krong-red: #E31B23;
--golden-saffron: #D4AF37;
--krong-red-50: #fef2f2;
--krong-red-100: #fee2e2;
--krong-red-500: #E31B23;
--krong-red-600: #dc2626;
--krong-red-700: #b91c1c;
--golden-saffron-50: #fefce8;
--golden-saffron-100: #fef3c7;
--golden-saffron-500: #D4AF37;
--golden-saffron-600: #ca8a04;
--golden-saffron-700: #a16207;
```

#### Semantic Colors
```css
--background: 0 0% 100%;
--foreground: 0 0% 3.9%;
--card: 0 0% 100%;
--card-foreground: 0 0% 3.9%;
--popover: 0 0% 100%;
--popover-foreground: 0 0% 3.9%;
--primary: 0 84% 60%; /* Krong Red */
--primary-foreground: 0 0% 98%;
--secondary: 45 100% 51%; /* Golden Saffron */
--secondary-foreground: 0 0% 9%;
--muted: 0 0% 96.1%;
--muted-foreground: 0 0% 45.1%;
--accent: 45 100% 51%;
--accent-foreground: 0 0% 9%;
--destructive: 0 84.7% 60.2%;
--destructive-foreground: 0 0% 98%;
--border: 0 0% 89.8%;
--input: 0 0% 89.8%;
--ring: 0 84% 60%;
```

### Typography

#### Font Families
```css
--font-serif: 'EB Garamond', serif; /* Headlines, elegant text */
--font-sans: 'Inter', sans-serif; /* Body text, UI elements */
--font-french: 'Inter', sans-serif; /* French text */
```

#### Font Scale
```css
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */
--text-5xl: 3rem; /* 48px */
```

## Touch Optimization

### Touch Targets
- Minimum touch target: 44px × 44px
- Recommended spacing: 8px between interactive elements
- Button padding: 12px vertical, 16px horizontal minimum

### Spacing Scale
```css
--spacing-1: 0.25rem; /* 4px */
--spacing-2: 0.5rem; /* 8px */
--spacing-3: 0.75rem; /* 12px */
--spacing-4: 1rem; /* 16px */
--spacing-5: 1.25rem; /* 20px */
--spacing-6: 1.5rem; /* 24px */
--spacing-8: 2rem; /* 32px */
--spacing-10: 2.5rem; /* 40px */
--spacing-12: 3rem; /* 48px */
--spacing-16: 4rem; /* 64px */
```

## Bilingual Text Patterns

### Language Direction Classes
```css
.text-french {
  font-family: var(--font-french);
  line-height: var(--leading-relaxed);
}

.text-english {
  font-family: var(--font-sans);
  line-height: var(--leading-normal);
}

.bilingual-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.bilingual-inline {
  display: inline-flex;
  gap: var(--spacing-2);
  align-items: baseline;
}
```

## Core Components

### Button Variants

#### Primary Button (Krong Red)
```tsx
<Button 
  variant="default" 
  className="bg-krong-red hover:bg-krong-red-600 text-white font-medium min-h-[44px] px-6"
>
  Enregistrer / Save
</Button>
```

#### Secondary Button (Golden Saffron)
```tsx
<Button 
  variant="secondary" 
  className="bg-golden-saffron hover:bg-golden-saffron-600 text-black font-medium min-h-[44px] px-6"
>
  Voir les détails / View Details
</Button>
```

### Input Components

#### Text Input
```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium text-foreground">
    ชื่อ SOP / SOP Name
  </Label>
  <Input 
    className="min-h-[44px] border-border focus:border-krong-red focus:ring-krong-red"
    placeholder="กรอกชื่อ SOP / Enter SOP name"
  />
</div>
```

#### Select Dropdown
```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium text-foreground">
    หมวดหมู่ / Category
  </Label>
  <Select>
    <SelectTrigger className="min-h-[44px] border-border">
      <SelectValue placeholder="เลือกหมวดหมู่ / Select category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="food-safety">
        <span className="bilingual-inline">
          <span className="text-thai">ความปลอดภัยอาหาร</span>
          <span className="text-muted-foreground">Food Safety</span>
        </span>
      </SelectItem>
      <SelectItem value="cleaning">
        <span className="bilingual-inline">
          <span className="text-thai">การทำความสะอาด</span>
          <span className="text-muted-foreground">Cleaning</span>
        </span>
      </SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Card Components

#### SOP Card
```tsx
<Card className="overflow-hidden hover:shadow-lg transition-shadow touch-manipulation">
  <CardHeader className="pb-3">
    <div className="flex justify-between items-start">
      <CardTitle className="bilingual-container">
        <span className="text-thai">การล้างมือ</span>
        <span className="text-english text-muted-foreground">Hand Washing</span>
      </CardTitle>
      <Badge variant="secondary" className="bg-golden-saffron text-black">
        สำคัญ / Important
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="bilingual-container">
      <p className="text-thai text-sm text-muted-foreground">
        ขั้นตอนการล้างมือที่ถูกต้องสำหรับพนักงาน
      </p>
      <p className="text-english text-sm text-muted-foreground">
        Proper hand washing procedure for staff
      </p>
    </div>
  </CardContent>
  <CardFooter>
    <Button className="w-full min-h-[48px]" size="lg">
      เปิดดู / View
    </Button>
  </CardFooter>
</Card>
```

### Navigation Components

#### Tab Navigation
```tsx
<Tabs defaultValue="all" className="w-full">
  <TabsList className="grid w-full grid-cols-4 h-12">
    <TabsTrigger value="all" className="min-h-[44px]">
      <span className="bilingual-container text-center">
        <span className="text-thai text-sm">ทั้งหมด</span>
        <span className="text-xs text-muted-foreground">All</span>
      </span>
    </TabsTrigger>
    <TabsTrigger value="food-safety" className="min-h-[44px]">
      <span className="bilingual-container text-center">
        <span className="text-thai text-sm">อาหาร</span>
        <span className="text-xs text-muted-foreground">Food</span>
      </span>
    </TabsTrigger>
    <TabsTrigger value="cleaning" className="min-h-[44px]">
      <span className="bilingual-container text-center">
        <span className="text-thai text-sm">ทำความสะอาด</span>
        <span className="text-xs text-muted-foreground">Cleaning</span>
      </span>
    </TabsTrigger>
    <TabsTrigger value="service" className="min-h-[44px]">
      <span className="bilingual-container text-center">
        <span className="text-thai text-sm">บริการ</span>
        <span className="text-xs text-muted-foreground">Service</span>
      </span>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### Data Display Components

#### Table
```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="text-thai font-medium">
          ชื่อ SOP
          <br />
          <span className="text-xs text-muted-foreground font-normal">SOP Name</span>
        </TableHead>
        <TableHead className="text-thai font-medium">
          หมวดหมู่
          <br />
          <span className="text-xs text-muted-foreground font-normal">Category</span>
        </TableHead>
        <TableHead className="text-thai font-medium">
          สถานะ
          <br />
          <span className="text-xs text-muted-foreground font-normal">Status</span>
        </TableHead>
        <TableHead className="text-right"></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>
          <div className="bilingual-container">
            <span className="text-thai">การล้างมือ</span>
            <span className="text-sm text-muted-foreground">Hand Washing</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="bilingual-container">
            <span className="text-thai">ความปลอดภัยอาหาร</span>
            <span className="text-sm text-muted-foreground">Food Safety</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            เผยแพร่แล้ว / Published
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">
            แก้ไข / Edit
          </Button>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

## Custom Component Variants

### Thai Price Display
```tsx
const ThaiPriceDisplay = ({ amount, size = "base" }) => {
  const sizeClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  };
  
  return (
    <span className={`font-bold text-krong-red ${sizeClasses[size]}`}>
      ฿{amount.toLocaleString('th-TH')}
    </span>
  );
};
```

### Bilingual Heading
```tsx
const BilingualHeading = ({ thai, english, level = 2, className = "" }) => {
  const Tag = `h${level}`;
  
  return (
    <Tag className={`bilingual-container ${className}`}>
      <span className="text-thai font-thai">{thai}</span>
      <span className="text-english text-muted-foreground">{english}</span>
    </Tag>
  );
};
```

### Status Indicator
```tsx
const StatusIndicator = ({ status, thai, english }) => {
  const statusStyles = {
    draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
    review: "bg-blue-100 text-blue-800 border-blue-200",
    published: "bg-green-100 text-green-800 border-green-200",
    archived: "bg-gray-100 text-gray-800 border-gray-200"
  };
  
  return (
    <Badge 
      variant="outline" 
      className={`${statusStyles[status]} bilingual-inline`}
    >
      <span className="text-thai">{thai}</span>
      <span className="text-xs">{english}</span>
    </Badge>
  );
};
```

### Touch-Optimized Number Input
```tsx
const NumberInput = ({ value, onChange, min = 0, max = 99 }) => {
  return (
    <div className="flex items-center border rounded-md">
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 rounded-r-none"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="border-0 border-l border-r text-center h-10 w-16 rounded-none"
        min={min}
        max={max}
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 rounded-l-none"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
```

## Responsive Design Patterns

### Mobile-First Grid
```css
.sop-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .sop-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .sop-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .sop-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Tablet Layout
```css
.tablet-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) and (max-width: 1023px) {
  .tablet-layout {
    grid-template-columns: 300px 1fr;
  }
  
  .touch-optimized {
    min-height: 48px;
    min-width: 48px;
    padding: 12px 16px;
  }
}
```

## Component Domains

### 1. Authentication Components
- **PIN Input Components**: Tablet-optimized PIN entry with visual feedback
- **Location Selector**: Restaurant location selection interface
- **Restaurant Form**: Comprehensive restaurant setup and management forms
- **Error Display**: User-friendly error messaging with severity levels and error codes

### 2. Restaurant Management Components  
- **Restaurant Creation Form**: Multi-step form with bilingual support and validation
- **Location Management**: CRUD operations for restaurant locations
- **Operational Settings**: Operating hours, capacity, and configuration management
- **Success/Error Handling**: Specialized feedback components for restaurant operations

### 3. SOP Management Components
- **SOP Category Dashboard**: Visual category grid with icons and statistics
- **Document Viewer**: Bilingual document display with interactive features
- **Content Editor**: Rich text editing with translation support
- **Search Interface**: Advanced search with voice capabilities

### 4. Training System Components
- **Training Modules**: Interactive training content delivery
- **Assessment Components**: Quiz and evaluation interfaces
- **Certificate Management**: Digital certificate display and verification
- **Progress Tracking**: Visual progress indicators and analytics

### 5. Analytics Components
- **Executive Dashboard**: High-level analytics with charts and KPIs
- **Executive Client Wrapper**: Client-side wrapper preventing SSR issues
- **Real-time Monitoring**: Live system status and performance metrics
- **Real-time Monitoring Client Wrapper**: SSR-safe real-time dashboard wrapper
- **Operational Insights**: Business analytics and reporting dashboard
- **Operational Insights Client Wrapper**: Client-side operational analytics wrapper
- **SOP Analytics**: SOP usage and effectiveness metrics
- **SOP Analytics Client Wrapper**: Client-side SOP metrics wrapper
- **Training Analytics**: Staff training progress and completion analytics
- **Training Analytics Client Wrapper**: Client-side training dashboard wrapper
- **Report Generators**: Export capabilities with multiple formats
- **Data Visualizations**: Recharts integration with restaurant themes

### 6. UI Foundation Components
- **Form Controls**: Enhanced shadcn/ui components with French support
- **Form Field Component**: Reusable form field with bilingual labels and validation
- **Navigation**: Tablet-optimized navigation patterns
- **Layout Components**: Responsive grid and container systems
- **Feedback Components**: Toasts, alerts, and status indicators
- **Service Status Error**: Specialized error handling for service connectivity issues

## Recent Additions (v0.2.0+)

### Analytics Client Wrapper Components
```tsx
// Executive Dashboard Client Wrapper
<ExecutiveClientWrapper 
  className="min-h-[600px]"
  loadingText="Loading executive dashboard..."
/>

// Real-time Monitoring Client Wrapper
<RealtimeMonitoringClientWrapper 
  className="grid grid-cols-1 lg:grid-cols-2 gap-6"
  refreshInterval={5000}
/>

// SOP Analytics Client Wrapper
<SOPAnalyticsClientWrapper 
  filters={{ category: 'all', dateRange: '30d' }}
  exportEnabled={true}
/>

// Training Analytics Client Wrapper
<TrainingAnalyticsClientWrapper 
  userId={user.id}
  showCertificates={true}
/>
```

### Form Field Component
```tsx
<FormField
  name="restaurantName"
  label={{ en: "Restaurant Name", fr: "Nom du restaurant" }}
  placeholder={{ en: "Enter name", fr: "Entrez le nom" }}
  required={true}
  validation={{ minLength: 2, maxLength: 100 }}
  locale="fr"
/>
```

### Cypress E2E Testing Components
```tsx
// Test automation components for E2E testing
<TestAutomation
  testId="restaurant-form-bilingual"
  scenario="bilingual-form-submission"
  mockData={mockRestaurantData}
/>
```

### Enhanced Error Handling System
```tsx
<ErrorDisplay
  error={{
    message: "Please enter both your email and 4-digit PIN",
    errorCode: "AUTH_001", 
    severity: "low"
  }}
  locale="en"
/>
```

### Restaurant Management Forms
```tsx
<RestaurantForm
  onSubmit={handleSubmit}
  onSuccess={handleSuccess}
  locale="th"
  className="tablet-optimized"
/>
```

### Bilingual Success Messages
```tsx
<SuccessDisplay
  message={{
    en: "Restaurant location created successfully!",
    th: "สร้างสาขาร้านอาหารเรียบร้อยแล้ว!"
  }}
  locale={currentLocale}
/>
```

## Accessibility Guidelines

### ARIA Labels for Bilingual Content
```tsx
<Button
  aria-label="บันทึก Save"
  className="bilingual-inline"
>
  <span className="text-thai">บันทึก</span>
  <span className="sr-only">Save</span>
</Button>
```

### Focus Management
```css
.focus-visible {
  outline: 2px solid var(--krong-red);
  outline-offset: 2px;
}

.focus-within {
  border-color: var(--krong-red);
  box-shadow: 0 0 0 3px rgba(227, 27, 35, 0.1);
}
```

This component library provides a solid foundation for building consistent, accessible, and culturally appropriate interfaces for the Krong Thai restaurant management platform.