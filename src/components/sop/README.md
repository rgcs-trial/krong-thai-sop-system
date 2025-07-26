# Restaurant Krong Thai SOP Design System

A comprehensive UI system designed specifically for tablet-optimized SOP (Standard Operating Procedures) management in Restaurant Krong Thai. This design system provides bilingual support (English/Thai) and follows the restaurant's brand guidelines.

## Design Principles

### 1. Tablet-First Approach
- **Touch-friendly interactions**: Minimum 44px touch targets for optimal finger interaction
- **Readable typography**: Larger font sizes optimized for tablet reading distances
- **Appropriate spacing**: Generous padding and margins for comfortable touch navigation
- **Visual hierarchy**: Clear information organization suitable for quick scanning

### 2. Bilingual Design
- **Dynamic font switching**: Automatic font family changes based on language selection
- **Cultural sensitivity**: Color and layout considerations for Thai and English content
- **Consistent spacing**: Proper line-height and character spacing for both languages
- **Context-aware translations**: Meaningful translations that preserve intent

### 3. Brand Consistency
- **Restaurant colors**: Primary red (#E31B23), black (#231F20), white (#FCFCFC)
- **Accent colors**: Golden saffron (#D4AF37), jade green (#008B8B), earthen beige (#D2B48C)
- **Typography hierarchy**: EB Garamond SC for headings, Source Serif Pro for body, Inter for UI
- **Professional appearance**: Clean, structured layouts that inspire confidence

## Components Overview

### Core Components

#### 1. SOP Category Icons (`sop-category-icons.tsx`)
**Purpose**: Provides visual identification and categorization for 16 SOP categories.

**Features**:
- Category-specific Lucide icons with semantic meaning
- Color-coded visual treatments for quick recognition
- Priority-based classification (critical, high, medium, standard)
- Bilingual name and description support

**Usage**:
```tsx
import { SOP_CATEGORIES, getCategoryById } from '@/components/sop/sop-category-icons';

const category = getCategoryById(1); // Food Safety & Hygiene
```

**Categories**:
1. **Food Safety & Hygiene** (Critical) - Shield icon, red theme
2. **Food Preparation** (High) - ChefHat icon, saffron theme
3. **Cooking Procedures** (High) - Flame icon, orange theme
4. **Plating & Presentation** (High) - UtensilsCrossed icon, teal theme
5. **Service Standards** (Critical) - HandHeart icon, pink theme
6. **Customer Interaction** (High) - MessageCircle icon, blue theme
7. **POS & Billing** (High) - CreditCard icon, purple theme
8. **Inventory Management** (Medium) - Package icon, indigo theme
9. **Opening Procedures** (Critical) - Sunrise icon, amber theme
10. **Closing Procedures** (Critical) - Sunset icon, orange theme
11. **Cleaning & Sanitation** (Critical) - Sparkles icon, cyan theme
12. **Equipment Operation** (Medium) - Settings icon, gray theme
13. **Emergency Procedures** (Critical) - AlertTriangle icon, red theme
14. **Health & Safety** (Critical) - Heart icon, rose theme
15. **Staff Training** (Medium) - GraduationCap icon, green theme
16. **Quality Control** (High) - CheckCircle icon, emerald theme

#### 2. SOP Category Dashboard (`sop-category-dashboard.tsx`)
**Purpose**: Main interface for browsing and selecting SOP categories.

**Features**:
- Grid and list view modes with responsive layout
- Search functionality with real-time filtering
- Priority-based filtering tabs
- Overall progress tracking with visual indicators
- Critical SOP alerts for incomplete procedures
- Touch-optimized card interactions with hover states

**Props**:
```tsx
interface SOPCategoryDashboardProps {
  language: 'en' | 'th';
  onCategorySelect: (category: SOPCategory) => void;
}
```

**Design Elements**:
- **Card Design**: Rounded corners, subtle shadows, hover animations
- **Progress Bars**: Color-coded based on completion percentage
- **Status Indicators**: Visual feedback for completion, last accessed dates
- **Responsive Grid**: 1-4 columns based on screen size

#### 3. SOP Document Viewer (`sop-document-viewer.tsx`)
**Purpose**: Detailed view for individual SOP documents with step-by-step guidance.

**Features**:
- Expandable step interface with detailed instructions
- Media integration (images/videos) with fullscreen viewing
- Progress tracking with step completion markers
- Bilingual content with proper text rendering
- Checkpoint validation and warning systems
- Attachment management and download functionality
- Related SOP suggestions and cross-references

**Props**:
```tsx
interface SOPDocumentViewerProps {
  document: SOPDocument;
  language: 'en' | 'th';
  onBack: () => void;
  onStepComplete: (stepId: string) => void;
  onDocumentComplete: () => void;
}
```

**Design Elements**:
- **Step Cards**: Collapsible design with completion status
- **Media Previews**: Thumbnail with click-to-expand functionality
- **Progress Header**: Circular progress indicator with metadata
- **Warning Callouts**: Red-themed alerts for critical information
- **Tabbed Interface**: Content, attachments, and related SOPs

#### 4. Status Indicators (`sop-status-indicators.tsx`)
**Purpose**: Consistent status communication across the application.

**Components**:

##### StatusIndicator
Visual representation of completion status with icon and text.
```tsx
<StatusIndicator 
  status="completed" 
  language="en" 
  size="md" 
  showText={true} 
/>
```

**Status Types**:
- `completed`: Green with CheckCircle2 icon
- `in_progress`: Yellow with PlayCircle icon
- `not_started`: Gray with PauseCircle icon
- `overdue`: Red with AlertTriangle icon
- `review_required`: Orange with RotateCcw icon

##### ComplianceIndicator
Shows compliance levels with color-coded dots and percentage display.
```tsx
<ComplianceIndicator 
  level="compliant" 
  language="en" 
  percentage={95} 
  showPercentage={true} 
/>
```

##### PriorityIndicator
Displays priority levels using brand colors.
```tsx
<PriorityIndicator 
  priority="critical" 
  language="en" 
  showText={true} 
/>
```

##### ProgressRing
Circular progress indicator with customizable size and color.
```tsx
<ProgressRing 
  percentage={75} 
  size="md" 
  showPercentage={true} 
  color="#D4AF37" 
/>
```

##### TeamProgress
Comprehensive team statistics with recent activity feed.
```tsx
<TeamProgress 
  teamStats={mockTeamStats}
  language="en"
  recentActivity={mockRecentActivity}
/>
```

## Typography System

### Font Families
- **Headings**: EB Garamond SC - Elegant serif for restaurant branding
- **Body Text**: Source Serif Pro - Readable serif for content
- **UI Elements**: Inter - Clean sans-serif for interface components
- **Thai Text**: Noto Sans Thai - Optimized for Thai character rendering

### Font Sizes (Tablet-Optimized)
```css
.text-tablet-sm    /* 1rem / 16px - line-height: 1.5rem */
.text-tablet-base  /* 1.125rem / 18px - line-height: 1.75rem */
.text-tablet-lg    /* 1.25rem / 20px - line-height: 1.75rem */
.text-tablet-xl    /* 1.5rem / 24px - line-height: 2rem */
.text-tablet-2xl   /* 1.875rem / 30px - line-height: 2.25rem */
```

### CSS Classes
```css
.font-heading  /* EB Garamond SC for titles */
.font-body     /* Source Serif Pro for content */
.font-ui       /* Inter for interface elements */
.font-thai     /* Noto Sans Thai for Thai text */
```

## Color System

### Primary Colors
```css
--krong-red: #E31B23        /* Primary brand color */
--krong-black: #231F20      /* Text and accents */
--krong-white: #FCFCFC      /* Backgrounds and contrast */
```

### Accent Colors
```css
--golden-saffron: #D4AF37   /* Positive states, highlights */
--jade-green: #008B8B       /* Success states, completed items */
--earthen-beige: #D2B48C    /* Neutral states, secondary elements */
```

### Usage Guidelines
- **Red**: Critical alerts, primary actions, brand elements
- **Black**: Text, icons, professional elements
- **White**: Backgrounds, cards, clean spaces
- **Saffron**: In-progress states, warnings, highlights
- **Jade**: Success states, completed items, positive feedback
- **Beige**: Neutral elements, secondary information

## Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
sm: 640px    /* Small tablets */
md: 768px    /* Medium tablets */
lg: 1024px   /* Large tablets */
xl: 1280px   /* Desktop fallback */
```

### Touch Targets
```css
.min-h-touch-sm   /* 44px minimum */
.min-h-touch-md   /* 48px recommended */
.min-h-touch-lg   /* 56px comfortable */
```

### Grid System
- **Mobile**: 1 column layout
- **Small Tablet**: 2 columns
- **Medium Tablet**: 3 columns  
- **Large Tablet**: 4 columns

## Accessibility Features

### Color Contrast
- All text meets WCAG AA standards (4.5:1 ratio minimum)
- Interactive elements have sufficient contrast
- Color is not the only way to convey information

### Touch Accessibility
- Minimum 44px touch targets
- Adequate spacing between interactive elements
- Clear focus indicators for keyboard navigation

### Language Support
- Proper text direction for both languages
- Appropriate line-height for Thai characters
- Font fallbacks for character support

## Implementation Guidelines

### Component Structure
```
src/components/sop/
├── sop-category-icons.tsx      # Category definitions and icons
├── sop-category-dashboard.tsx  # Main dashboard interface
├── sop-document-viewer.tsx     # Document reading interface
├── sop-status-indicators.tsx   # Status and progress components
└── README.md                   # This documentation
```

### Usage Patterns

#### Basic Category Display
```tsx
import { SOPCategoryDashboard } from '@/components/sop/sop-category-dashboard';

<SOPCategoryDashboard
  language="en"
  onCategorySelect={(category) => {
    // Handle category selection
    router.push(`/sop/${category.id}`);
  }}
/>
```

#### Document Viewing
```tsx
import { SOPDocumentViewer } from '@/components/sop/sop-document-viewer';

<SOPDocumentViewer
  document={sopDocument}
  language="en"
  onBack={() => router.back()}
  onStepComplete={(stepId) => {
    // Update step completion in database
    updateStepCompletion(sopDocument.id, stepId);
  }}
  onDocumentComplete={() => {
    // Mark entire document as completed
    completeDocument(sopDocument.id);
  }}
/>
```

#### Status Indicators
```tsx
import { StatusIndicator, ComplianceIndicator } from '@/components/sop/sop-status-indicators';

<div className="flex gap-2">
  <StatusIndicator status="completed" language="en" />
  <ComplianceIndicator level="compliant" language="en" percentage={95} />
</div>
```

## Best Practices

### Performance
- Use React.memo for static components
- Implement virtualization for large lists
- Optimize images and media for tablet screens
- Lazy load non-critical components

### Usability
- Provide immediate visual feedback for interactions
- Use consistent navigation patterns
- Include loading states for async operations
- Implement offline functionality where possible

### Maintenance
- Follow consistent naming conventions
- Document prop interfaces thoroughly
- Use TypeScript for type safety
- Implement comprehensive error boundaries

## Browser Support
- iOS Safari 14+
- Chrome for Android 90+
- Samsung Internet 14+
- Firefox for Android 88+

## Future Enhancements
- Dark mode support for low-light environments
- Voice navigation for hands-free operation
- Offline synchronization capabilities
- Advanced analytics and reporting features
- Integration with restaurant management systems

---

*This design system was created specifically for Restaurant Krong Thai's tablet-based SOP management needs, ensuring optimal usability for restaurant staff while maintaining brand consistency and professional appearance.*