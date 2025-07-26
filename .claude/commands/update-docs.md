# Auto-Update Documentation

You are tasked with automatically updating all documentation files in the Krong Thai SOP Management System project after successful changes have been made. This includes:

## Files to Update

### Core Documentation
- `CLAUDE.md` - Project instructions and development guide
- `README.md` - Main project overview and setup instructions
- `docs/README.md` - Documentation index

### Technical Documentation  
- `docs/TECHNICAL_SPECIFICATION.md` - Detailed technical specifications
- `docs/DATABASE_SCHEMA.md` - Database structure and relationships
- `docs/FRONTEND_ARCHITECTURE.md` - Frontend design patterns and structure
- `docs/SECURITY_ARCHITECTURE.md` - Security implementation details

### Operational Documentation
- `docs/INSTALLATION_GUIDE.md` - Setup and installation procedures
- `docs/DEPLOYMENT_GUIDE.md` - Production deployment instructions
- `docs/MAINTENANCE_SCHEDULE.md` - Regular maintenance tasks
- `docs/PROJECT_STATUS.md` - Current implementation status

### User Guides
- `docs/MANAGER_OPERATIONS_MANUAL.md` - Manager interface guide
- `docs/STAFF_ONBOARDING_GUIDE.md` - Staff training documentation  
- `docs/RESTAURANT_OPERATIONS_CHECKLIST.md` - Daily operational procedures
- `docs/EMERGENCY_PROCEDURES_GUIDE.md` - Emergency response protocols

### Reference Materials
- `docs/SUPABASE_SETUP_GUIDE.md` - Database setup instructions
- `docs/UI_COMPONENT_LIBRARY.md` - Component documentation
- `docs/QUICK_REFERENCE_CARDS.md` - Quick reference materials
- `docs/AGENT_CONFIGURATIONS.md` - AI agent configurations

## Update Process

1. **Analyze Recent Changes**: Review git commits, modified files, and implementation status
2. **Check Consistency**: Ensure all documentation reflects current codebase state
3. **Update Content**: Refresh outdated information, add new features, remove deprecated content
4. **Maintain Structure**: Keep existing organization and formatting conventions
5. **Verify Links**: Ensure all internal references and file paths are correct
6. **Update Status**: Reflect current implementation progress accurately

## Key Areas to Check

- **Package versions** in package.json vs documentation
- **File structure changes** vs documented architecture
- **New features implemented** vs specification documents  
- **Database schema changes** vs schema documentation
- **Security implementations** vs security documentation
- **API endpoints** vs technical specifications
- **Component additions/changes** vs UI library docs
- **Configuration changes** vs setup guides

## Output Requirements

- Update each file that needs changes
- Provide a brief summary of what was updated in each file
- Ensure all cross-references between documents remain valid
- Maintain the established tone and style of each document type
- Keep documentation practical and actionable for the target audience

## Guidelines

- Use tablet-first responsive design principles in technical docs
- Maintain bilingual (EN/FR) context where relevant  
- Follow the brand guidelines (colors, typography) in styling references
- Keep operational docs focused on restaurant staff capabilities
- Ensure security documentation reflects current threat models
- Update version numbers and dates where appropriate

Start by examining the current state of the codebase and identifying which documentation files need updates based on recent changes.