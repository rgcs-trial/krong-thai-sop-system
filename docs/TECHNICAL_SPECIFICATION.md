# Technical Specification - Restaurant Krong Thai Internal SOP Website

## Document Information
- **Version**: 1.1.0
- **Date**: July 26, 2025
- **Project**: Restaurant Krong Thai Internal SOP Website
- **Status**: Development Phase - Critical Issues Identified
- **Project Version**: 0.1.3
- **Health Score**: 4/10 - Requires Significant Work for Production Readiness

---

## 1. Executive Summary

The Restaurant Krong Thai Internal SOP Website is a tablet-optimized web application designed to provide secure, bilingual access to Standard Operating Procedures for restaurant staff. The system features PIN-based authentication, comprehensive SOP management across 16 categories, and 25 core features including offline capability, search functionality, and administrative tools.

**CURRENT STATUS**: The project is experiencing critical issues that must be resolved before production deployment. Build failures, database schema inconsistencies, and security concerns require immediate attention.

### Key Objectives
- Provide secure, easy access to restaurant SOPs
- Ensure tablet-friendly user experience
- Support bilingual operations (English/Thai)
- Enable offline access to critical procedures
- Facilitate content management and staff tracking

### Critical Issues Requiring Resolution
- ❌ **Build System Failures**: Prerender errors preventing production builds
- ❌ **Database Schema Misalignment**: TypeScript types don't match actual Supabase schema
- ⚠️ **Security Configuration**: Environment variable exposure concerns
- ⚠️ **Project Performance**: 1.2GB project size indicates optimization needs

---

## 2. Technology Stack

### 2.1 Frontend Architecture
- **Framework**: Next.js 15.4.4 (App Router)
- **React Version**: React 19.1.0
- **Language**: TypeScript 5.8.3
- **Styling**: Tailwind CSS 4.1
- **UI Components**: shadcn/ui (latest)
- **State Management**: Zustand + React Query
- **Internationalization**: next-intl
- **PWA Support**: next-pwa

### 2.2 Backend & Database
- **Database**: Supabase 1.25.04
- **Authentication**: Custom PIN-based system
- **API**: Next.js API Routes + Supabase SDK
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### 2.3 Development & Deployment
- **Package Manager**: pnpm
- **Code Quality**: ESLint, Prettier, TypeScript
- **Testing**: Vitest, React Testing Library, Playwright
- **Deployment**: Vercel (recommended)
- **Monitoring**: Vercel Analytics + Custom logging

---

## 3. System Architecture

### 3.1 High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tablet Client │────│   Next.js App   │────│   Supabase DB   │
│                 │    │                 │    │                 │
│ • React 19.1.0  │    │ • App Router    │    │ • PostgreSQL    │
│ • Tailwind 4.1  │    │ • API Routes    │    │ • Auth          │
│ • PWA Support   │    │ • Middleware    │    │ • Storage       │
│ • Offline Cache │    │ • i18n Support  │    │ • Realtime      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3.2 Application Layers
- **Presentation Layer**: shadcn/ui components with tablet optimization
- **Business Logic**: Next.js API routes and server actions
- **Data Layer**: Supabase with Row Level Security
- **Security Layer**: PIN-based authentication and audit logging

---

## 4. Database Design

### 4.1 Core Tables
```sql
-- Users table for staff members
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_hash TEXT NOT NULL UNIQUE,
    staff_id VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    language_preference VARCHAR(2) DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SOP Categories
CREATE TABLE sop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL,
    name_th VARCHAR(100) NOT NULL,
    description_en TEXT,
    description_th TEXT,
    icon VARCHAR(50),
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SOPs (Standard Operating Procedures)
CREATE TABLE sops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES sop_categories(id),
    title_en VARCHAR(200) NOT NULL,
    title_th VARCHAR(200) NOT NULL,
    content_en TEXT NOT NULL,
    content_th TEXT NOT NULL,
    version VARCHAR(10) DEFAULT '1.0',
    is_critical BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    media_urls TEXT[],
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Authentication Strategy

### 5.1 PIN-Based Authentication
- 4-digit PIN system for restaurant environment
- Device binding for security
- Session management with 8-hour timeout
- Rate limiting to prevent brute force attacks

### 5.2 Security Implementation
```typescript
interface AuthFlow {
  step1: "PIN Entry (4 digits)";
  step2: "Client-side validation";
  step3: "Hash PIN with salt";
  step4: "Server verification";
  step5: "JWT token generation";
  step6: "Session storage";
  step7: "Automatic logout (8 hours)";
}
```

---

## 6. Feature Specifications

### 6.1 Core Features (1-25)

#### SOP Management System
- Digital SOP creation and editing
- Version control and approval workflow
- Rich media support (images, videos)
- Multilingual content management

#### Training Module
- Interactive training sessions
- Progress tracking per user
- Certification management
- Assessment and quiz system

#### Search & Navigation
- Full-text search across SOPs
- Category-based navigation
- Bookmarks and favorites
- Recent access history

#### Reporting & Analytics
- Usage analytics dashboard
- Compliance reporting
- Staff performance metrics
- Audit trail functionality

---

## 7. Performance Optimization

### 7.1 Frontend Performance
- Code splitting with dynamic imports
- Image optimization with Next.js Image
- Service worker for offline functionality
- Bundle optimization and tree shaking

### 7.2 Database Performance
- Strategic indexing on frequently queried columns
- Connection pooling
- Query optimization
- Caching strategies

---

## 8. Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- Project setup and configuration
- Database schema design and creation
- Basic authentication system
- Core UI components setup

### Phase 2: Core Features (Weeks 3-4)
- SOP CRUD operations
- Basic search functionality
- User management system
- Bilingual support implementation

### Phase 3: Advanced Features (Weeks 5-6)
- Training module development
- Analytics and reporting
- Performance optimization
- Security hardening

### Phase 4: Testing & Deployment (Weeks 7-8)
- Comprehensive testing
- User acceptance testing
- Production deployment
- Staff training and rollout

---

## 9. Success Metrics

### Performance Targets
- Page Load Time: < 2 seconds
- Search Response Time: < 500ms
- Offline Capability: 95% of critical SOPs
- Uptime Target: 99.9%

### Business Metrics
- User Adoption: 95% within 3 months
- Training Efficiency: 40% reduction in time
- Compliance Rate: 99% SOP adherence
- Error Reduction: 50% fewer operational mistakes

---

This technical specification provides the foundation for building a world-class restaurant SOP management system using modern 2025 technology stack with Next.js 15.4.4, React 19.1.0, and shadcn/ui.