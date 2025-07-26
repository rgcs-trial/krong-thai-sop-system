# CLAUDE.md

# Restaurant Krong Thai SOP Management System

Tablet-optimized internal SOP management website with bilingual (EN/FR) content, PIN-based authentication, and 16 SOP categories.

**Status**: Basic Next.js setup complete, automatic documentation system implemented  
**Stack**: Next.js 15.4.4, React 19.1.0, TypeScript 5.8.3, Tailwind CSS 4.1

## Development Commands

```bash
# Development server
pnpm dev                   # Start development server on http://localhost:3000

# Build and deployment  
pnpm build                 # Build for production
pnpm start                 # Start production server
pnpm lint                  # ESLint code quality check
pnpm lint:fix              # Auto-fix ESLint issues
pnpm type-check            # TypeScript type checking

# Testing
pnpm test                  # Run unit tests with Vitest
pnpm test:ui               # Run tests with UI
pnpm test:e2e              # Run end-to-end tests with Playwright

# Database operations (Supabase)
pnpm db:generate-types     # Generate TypeScript types from Supabase schema
pnpm db:reset              # Reset local Supabase database
pnpm db:migrate            # Run database migrations

# Package management
pnpm install               # Install dependencies using pnpm
```

## Architecture

**Frontend**: Next.js 15.4.4 App Router, React 19.1.0, TypeScript 5.8.3  
**Styling**: Tailwind CSS 4.1, shadcn/ui components  
**Database**: Supabase PostgreSQL with RLS  
**Auth**: Custom PIN-based system (4-digit PINs, 8-hour sessions)  
**State**: Zustand + TanStack Query  
**i18n**: Bilingual EN/FR support

## Implementation Status

**Complete**: Basic Next.js setup, TypeScript/ESLint config, documentation  
**Pending**: Supabase setup, PIN auth, shadcn/ui, SOP features, responsive design

## Brand Guidelines

**Colors**: Primary: #E31B23 (red), #231F20 (black), #FCFCFC (white) | Accent: #D4AF37 (saffron), #008B8B (jade), #D2B48C (beige)  
**Typography**: Headings: EB Garamond SC | Body: Source Serif Pro | UI: Inter | Thai: Noto Sans Thai

## File Structure

```
src/app/          # Next.js App Router, layouts, pages
src/components/   # React components  
src/lib/          # Utilities, Supabase client
src/hooks/        # Custom React hooks
src/types/        # TypeScript definitions
docs/             # Project documentation
```

## Database Schema (Supabase)

**Tables**: `auth_users` (PIN auth), `sop_categories` (16 categories), `sop_documents` (bilingual EN/FR SOPs), `form_submissions`, `audit_logs`

## Development Workflow

1. Set up Supabase project + schema
2. Install dependencies (Supabase, shadcn/ui, Zustand, TanStack Query)  
3. Implement PIN authentication
4. Build SOP management features
5. Add bilingual EN/FR support
6. Optimize for tablet experience

## Code Standards

TypeScript strict mode, ESLint Next.js rules, path aliases (@/*), tablet-first responsive design

## Documentation

**Key docs**: `docs/TECHNICAL_SPECIFICATION.md`, `docs/DATABASE_SCHEMA.md`, `docs/INSTALLATION_GUIDE.md`

Reference comprehensive documentation in `docs/` folder for detailed specifications and requirements.