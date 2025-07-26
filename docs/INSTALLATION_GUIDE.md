# Installation Guide - Restaurant Krong Thai SOP Website

Complete setup instructions for the Restaurant Krong Thai Standard Operating Procedures website using the latest 2025 technology stack with Next.js 15.4.4, React 19.1.0, and shadcn/ui.

## ⚠️ CRITICAL INSTALLATION ISSUES

**Current Status**: Installation process has critical issues that must be resolved  
**Project Health**: 4/10 - Requires significant troubleshooting  
**Build Status**: FAILING - Prerender errors prevent production builds  
**Last Updated**: July 26, 2025

### Known Issues
- ❌ **Build Failures**: Prerender errors on dashboard pages
- ❌ **Dependency Bloat**: 1.2GB project size with 34,053 files
- ⚠️ **Environment Security**: Configuration hardening required
- ⚠️ **Schema Misalignment**: Database types don't match implementation

## Prerequisites

### System Requirements
- **Node.js 20.x LTS** (recommended: 20.11.0 or later)
- **pnpm** (recommended) or **npm**
- **Git** for version control
- **VS Code** or preferred code editor
- **GitHub account** for version control and CI/CD
- **Vercel account** for deployment
- **Supabase account** for database and authentication

### Technology Stack Overview
- **Frontend**: Next.js 15.4.4 with App Router
- **UI Components**: shadcn/ui with Tailwind CSS 4.1
- **Database**: Supabase PostgreSQL
- **Authentication**: Custom PIN-based system
- **Deployment**: Vercel
- **Language**: TypeScript 5.8.3

## Step 1: Environment Setup

### 1.1 Install Node.js 20.x

#### Using Node Version Manager (Recommended)
```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source your profile
source ~/.bashrc  # or ~/.zshrc

# Install and use Node.js 20.x
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or later
```

### 1.2 Install pnpm (Recommended)
```bash
npm install -g pnpm@latest

# Verify installation
pnpm --version
```

### 1.3 Install Global Development Tools
```bash
pnpm add -g @vercel/cli
pnpm add -g supabase
pnpm add -g typescript
```

## Step 2: Project Setup

### 2.1 Clone and Initialize Project
```bash
# Clone the repository
git clone <repository-url>
cd krong-thai-internal

# Install dependencies
pnpm install
```

### 2.2 Create Next.js Project (If Starting Fresh)
```bash
# Create Next.js project with TypeScript
npx create-next-app@15.4.4 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install additional dependencies
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
pnpm add lucide-react class-variance-authority clsx tailwind-merge
pnpm add @hookform/resolvers react-hook-form zod
pnpm add zustand @tanstack/react-query

# Install development dependencies
pnpm add -D @types/node @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add -D prettier prettier-plugin-tailwindcss
pnpm add -D husky lint-staged
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test
```

## Step 3: shadcn/ui Setup

### 3.1 Initialize shadcn/ui
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Configuration options:
# ✔ Which style would you like to use? › Default
# ✔ Which color would you like to use as base color? › Slate  
# ✔ Would you like to use CSS variables for colors? › yes
```

### 3.2 Install Essential UI Components
```bash
# Install core components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add checkbox
```

### 3.3 Configure Tailwind for Thai Restaurant Theme
Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Thai Restaurant Brand Colors
        thai: {
          red: {
            50: '#fef2f2',
            500: '#dc2626', // Primary
            600: '#b91c1c',
            700: '#991b1b',
          },
          gold: {
            50: '#fffbeb',
            500: '#f59e0b', // Secondary
            600: '#d97706',
            700: '#b45309',
          },
          green: {
            50: '#f0fdf4',
            500: '#22c55e', // Accent
            600: '#16a34a',
            700: '#15803d',
          },
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... other shadcn/ui colors
      },
      spacing: {
        'touch': '44px',  // Minimum touch target
        'tablet-safe': '20px',  // Safe area padding
      },
      screens: {
        'tablet': '768px',      // iPad portrait
        'tablet-lg': '1024px',  // iPad landscape
      },
      fontFamily: {
        thai: ['Noto Sans Thai', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

## Step 4: Supabase Setup

### 4.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Set project name: "krong-thai-sop"
4. Set database password (save securely)
5. Choose region closest to Thailand
6. Click "Create new project"

### 4.2 Configure Environment Variables
Create `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Optional: Analytics
VERCEL_ANALYTICS_ID=your_vercel_analytics_id
```

### 4.3 Initialize Supabase CLI
```bash
# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Initialize local development
npx supabase init
```

### 4.4 Database Schema Setup
Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create auth_users table for PIN-based authentication
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_hash TEXT NOT NULL UNIQUE,
    staff_id VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    language_preference VARCHAR(2) DEFAULT 'th',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create SOP categories
CREATE TABLE sop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_th TEXT NOT NULL,
    description_en TEXT,
    description_th TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create SOPs table
CREATE TABLE sop_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES sop_categories(id),
    title_en TEXT NOT NULL,
    title_th TEXT NOT NULL,
    content_en TEXT NOT NULL,
    content_th TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    estimated_time INTEGER,
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_auth_users_staff_id ON auth_users(staff_id);
CREATE INDEX idx_sop_documents_category ON sop_documents(category_id);
CREATE INDEX idx_sop_documents_status ON sop_documents(status);

-- Enable Row Level Security
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Published SOPs are viewable by authenticated users" ON sop_documents
    FOR SELECT USING (status = 'published');

-- Insert sample data
INSERT INTO sop_categories (slug, name_en, name_th, description_en, description_th, icon, sort_order) VALUES
('food-safety', 'Food Safety & HACCP', 'ความปลอดภัยอาหารและ HACCP', 'Food safety procedures', 'ขั้นตอนความปลอดภัยอาหาร', 'shield-check', 1),
('kitchen-ops', 'Kitchen Operations', 'การดำเนินงานครัว', 'Kitchen procedures', 'ขั้นตอนการทำงานในครัว', 'chef-hat', 2),
('service', 'Customer Service', 'การบริการลูกค้า', 'Service standards', 'มาตรฐานการบริการ', 'users', 3);
```

### 4.5 Run Database Migration
```bash
# Apply the migration
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --project-id your-project-ref > src/types/supabase.ts
```

### 4.6 Configure Supabase Client
Create `src/lib/supabase.ts`:

```typescript
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export const createClient = () => createClientComponentClient<Database>()

export const createServerClient = () => createServerComponentClient<Database>({ cookies })
```

## Step 5: Project Structure Setup

### 5.1 Create Directory Structure
```bash
mkdir -p src/{components,lib,hooks,types,stores}
mkdir -p src/components/{ui,restaurant,layout}
mkdir -p src/app/{auth,dashboard,sop}
mkdir -p public/{images,icons}
mkdir -p docs
```

### 5.2 Configure TypeScript
Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5.3 Configure ESLint and Prettier
Create `.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

Create `.prettierrc`:

```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

## Step 6: Basic Application Setup

### 6.1 Create Root Layout
Create `src/app/layout.tsx`:

```typescript
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Restaurant Krong Thai - SOP Management',
  description: 'Standard Operating Procedures for Restaurant Krong Thai',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
```

### 6.2 Create Home Page
Create `src/app/page.tsx`:

```typescript
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold">
          Restaurant Krong Thai SOP System
        </h1>
        <p className="text-xl text-muted-foreground">
          ระบบขั้นตอนการปฏิบัติงานมาตรฐาน
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/auth/login">Login / เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
```

### 6.3 Update Global Styles
Update `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap');

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 0 84% 60%;
    --primary-foreground: 210 40% 98%;
    /* ... other CSS variables */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables */
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
  }
  
  .font-thai {
    font-family: 'Noto Sans Thai', 'Inter', system-ui, sans-serif;
  }
}

/* Tablet-specific optimizations */
@media (min-width: 768px) {
  .tablet-optimized {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
  
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}
```

## Step 7: Development Scripts

### 7.1 Update package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "db:generate-types": "npx supabase gen types typescript --project-id your-project-ref > src/types/supabase.ts",
    "db:reset": "npx supabase db reset",
    "db:migrate": "npx supabase migration up"
  }
}
```

### 7.2 Setup Git Hooks
```bash
# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

Create `.lintstagedrc.js`:

```javascript
module.exports = {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,css,md}': [
    'prettier --write',
  ],
}
```

## Step 8: Vercel Deployment

### 8.1 Install and Configure Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel@latest

# Login to Vercel
vercel login

# Link your project
vercel link
```

### 8.2 Configure Environment Variables in Vercel
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`

### 8.3 Deploy to Production
```bash
# Deploy to production
vercel --prod

# Or push to main branch for automatic deployment
git add .
git commit -m "Initial setup complete"
git push origin main
```

## Step 9: Testing & Verification

### 9.1 Start Development Server
```bash
# Start the development server
pnpm dev

# Visit http://localhost:3000
```

### 9.2 Verify Installation
1. ✅ Application loads at `http://localhost:3000`
2. ✅ Tailwind CSS styling works
3. ✅ Thai fonts render correctly
4. ✅ shadcn/ui components display properly
5. ✅ Supabase connection established
6. ✅ TypeScript compilation successful

### 9.3 Run Tests
```bash
# Run linting
pnpm lint

# Check TypeScript
pnpm type-check

# Run unit tests
pnpm test

# Build for production
pnpm build
```

## Troubleshooting

### Common Issues

1. **Node.js Version**: Ensure using Node.js 20.x
   ```bash
   node --version  # Should be v20.x.x
   ```

2. **Supabase Connection**: Verify environment variables
   ```bash
   # Check .env.local file exists and has correct values
   cat .env.local
   ```

3. **shadcn/ui Components**: Ensure proper installation
   ```bash
   # Reinstall if needed
   npx shadcn-ui@latest add button --overwrite
   ```

4. **Thai Font Issues**: Verify font loading
   ```css
   /* Check if fonts are loaded in globals.css */
   @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap');
   ```

### Useful Commands
```bash
# Reset dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Reset Supabase
npx supabase stop
npx supabase start

# Generate fresh types
pnpm db:generate-types
```

## Next Steps

After successful installation:

1. 🏗️ Create authentication pages with PIN entry
2. 📋 Build SOP management interfaces
3. 👥 Implement user roles and permissions
4. 🎨 Customize UI components for restaurant needs
5. 📊 Add analytics and reporting features
6. 🔒 Implement security measures
7. 🧪 Write comprehensive tests
8. 📱 Optimize for tablet usage

---

**Installation Complete!** 🎉

Your Restaurant Krong Thai SOP website is now ready for development with the latest 2025 technology stack.