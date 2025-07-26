# Restaurant Krong Thai SOP Management Agents

This directory contains specialized Claude agents for the Restaurant Krong Thai SOP Management System project.

## Available Agents

### Development Team
- **[frontend-specialist.md](./frontend-specialist.md)** - React/Next.js development, tablet-optimized UI, bilingual support
- **[principal-developer.md](./principal-developer.md)** - Full-stack implementation, architecture, Supabase integration
- **[technical-writer.md](./technical-writer.md)** - Documentation, user guides, staff training materials

## Project Context

These agents are customized for:
- **Technology Stack**: Next.js 15.4.4, React 19.1.0, TypeScript, Tailwind CSS 4.1, Supabase
- **Purpose**: Internal SOP management system for restaurant staff
- **Target Devices**: Tablet-optimized interface
- **Languages**: Bilingual (English/Thai) support
- **Authentication**: PIN-based system (4-digit PINs)
- **Database**: Supabase PostgreSQL with Row Level Security

## Agent Template Structure

Each agent follows this consistent structure:
```yaml
---
name: agent-name
tools: ["Tool1", "Tool2", ...]
description: "Brief description of agent's role and focus"
---

# System Prompt
[Detailed agent instructions and context]
```

## Usage

Use the Task tool to invoke agents by name:
```
Task(description="Implement SOP component", prompt="Create a bilingual SOP display component", subagent_type="frontend-specialist")
```

## Key Features to Implement

- PIN-based authentication for staff
- 16 SOP categories with bilingual content
- Form submissions with audit trails
- Tablet-first responsive design
- Restaurant Krong Thai branding (#E31B23, #231F20, #FCFCFC)