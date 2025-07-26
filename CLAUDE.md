# Restaurant Krong Thai SOP Management System - Claude Development Guide

## Project Overview

This is a **tablet-optimized internal SOP (Standard Operating Procedures) management website** for Restaurant Krong Thai, built with the latest 2025 technology stack. The system provides bilingual (English/Thai) content management for 16 SOP categories with PIN-based authentication designed for restaurant staff.

**Current Status**: Planning Phase - Documentation complete, implementation pending  
**Technology Stack**: Next.js 15.4.4, React 19.1.0, TypeScript 5.8.3, Tailwind CSS 4.1, shadcn/ui, Supabase

## Development Commands

Since no implementation exists yet, here are the planned commands based on the technical specification:

```bash
# Development server (once implemented)
pnpm dev                    # Start development server on http://localhost:3000

# Build and deployment
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm type-check             # TypeScript type checking
pnpm lint                   # ESLint code quality check  
pnpm lint:fix               # Auto-fix ESLint issues

# Database operations (Supabase)
pnpm db:generate-types      # Generate TypeScript types from Supabase schema
pnpm db:reset               # Reset local Supabase database
pnpm db:migrate             # Run database migrations

# Testing (planned)
pnpm test                   # Run unit tests with Vitest
pnpm test:ui                # Run tests with UI
pnpm test:e2e               # Run end-to-end tests with Playwright
```

## Architecture Overview

### Core Components
- **Authentication**: Custom PIN-based system (4-digit PINs, 8-hour sessions)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **UI Framework**: shadcn/ui components with Thai restaurant branding
- **State Management**: Zustand + TanStack Query for server state
- **Internationalization**: Bilingual EN/TH support throughout

### Key Features (Planned Implementation)
- 16 SOP categories with bilingual content
- PIN-based staff authentication
- Tablet-first responsive design
- Offline functionality with service workers
- Training modules with progress tracking
- Analytics dashboard for usage monitoring
- Form submissions with audit logging

## Development Guidelines

### Brand Colors (Apply Site-wide)
```css
/* Primary Colors */
--krong-red: #E31B23;
--krong-black: #231F20;
--krong-white: #FCFCFC;

/* Accent Colors */
--golden-saffron: #D4AF37;
--jade-green: #008B8B;
--earthen-beige: #D2B48C;
```

### Typography
- **Headings**: EB Garamond SC (fallback for Trajan Pro 3)
- **Body**: Source Serif Pro (fallback for Minion Pro)
- **UI**: Inter (sans-serif)
- **Thai Text**: Noto Sans Thai

### File Structure (Planned)
```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # PIN login pages
│   ├── dashboard/         # Main dashboard
│   └── sop/              # SOP category pages
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── restaurant/       # Custom restaurant components
│   └── layout/           # Layout components
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── auth.ts           # Authentication utilities
│   └── utils.ts          # General utilities
├── hooks/                # React hooks
├── stores/               # Zustand stores
└── types/
    ├── supabase.ts       # Generated Supabase types
    └── index.ts          # General type definitions
```

## Database Schema (Supabase)

### Key Tables
- `auth_users`: Staff authentication with PIN hashes
- `sop_categories`: 16 SOP categories with bilingual names
- `sop_documents`: Individual SOPs with bilingual content
- `form_submissions`: SOP form submissions with audit trails
- `audit_logs`: System activity logging

### Row Level Security (RLS)
All tables have RLS enabled with policies based on authenticated staff roles (admin, manager, staff).

## Security Considerations
- PIN-based authentication (no passwords for restaurant environment)
- Device binding for additional security
- Session timeout (8 hours)
- Rate limiting on PIN attempts
- Audit logging for all system actions
- HTTPS only for production

## Development Workflow

### Getting Started (When Implementation Begins)
1. Follow `docs/INSTALLATION_GUIDE.md` for complete setup
2. Create `.env.local` with Supabase credentials
3. Set up Supabase project and run migrations
4. Install dependencies with `pnpm install`
5. Initialize shadcn/ui components
6. Start development server with `pnpm dev`

### Code Quality
- TypeScript strict mode enabled
- ESLint with Next.js and TypeScript rules
- Prettier with Tailwind CSS plugin
- Pre-commit hooks with husky and lint-staged
- 100% TypeScript coverage required

### Testing Strategy
- Unit tests: Vitest + React Testing Library
- Integration tests: API route testing
- E2E tests: Playwright for critical user flows
- Visual regression: Chromatic (future consideration)

## Important Files & Documentation

### Core Documentation
- `docs/README.md` - Original project requirements and specifications
- `docs/TECHNICAL_SPECIFICATION.md` - Comprehensive technical blueprint
- `docs/INSTALLATION_GUIDE.md` - Complete setup instructions
- `docs/FRONTEND_ARCHITECTURE.md` - Frontend design and component strategy
- `docs/DATABASE_SCHEMA.md` - Complete Supabase schema with SQL
- `docs/SECURITY_FRAMEWORK.md` - Security implementation details
- `docs/UI_COMPONENT_LIBRARY.md` - Design system and component library
- `docs/BUSINESS_REQUIREMENTS.md` - Business analysis and requirements
- `docs/PROJECT_STATUS.md` - Current project status and roadmap

### Current Implementation Status
**⚠️ No implementation code exists yet - project is in planning/documentation phase**

All documentation is complete and ready for development team to begin implementation following the 16-week roadmap outlined in `docs/PROJECT_STATUS.md`.

## Next Steps for Implementation
1. Set up Next.js 15.4.4 project with TypeScript and Tailwind CSS
2. Configure shadcn/ui with restaurant branding
3. Create Supabase project and implement database schema
4. Build PIN-based authentication system
5. Implement core SOP management features
6. Add bilingual content support
7. Optimize for tablet usage
8. Deploy to Vercel with proper environment configuration

---

**Note**: This CLAUDE.md will be updated as implementation progresses. Current focus should be on following the installation guide and beginning core feature development.