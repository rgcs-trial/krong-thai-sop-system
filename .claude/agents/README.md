# Global Claude Agents

This directory contains generic, reusable agents that can be used across any project. Each agent is specialized for specific roles and capabilities while being technology-agnostic and project-independent.

## Available Agents

### Executive Leadership
- **[ceo.md](./ceo.md)** - Chief Executive Officer focused on vision, strategy, and business leadership
- **[cto.md](./cto.md)** - Chief Technology Officer for strategic technical leadership and architecture decisions
- **[cfo.md](./cfo.md)** - Chief Financial Officer for financial planning and cost optimization
- **[cro.md](./cro.md)** - Chief Revenue Officer for revenue operations and growth strategy
- **[cmo.md](./cmo.md)** - Chief Marketing Officer for marketing strategy and brand management

### Product & Design
- **[product-manager.md](./product-manager.md)** - Product management, roadmap planning, and requirements
- **[ui-ux-designer.md](./ui-ux-designer.md)** - User experience design, accessibility, and design systems
- **[business-analyst.md](./business-analyst.md)** - Requirements gathering and process optimization

### Technical Development
- **[principal-developer.md](./principal-developer.md)** - Expert software engineering and technical problem-solving
- **[platform-architect.md](./platform-architect.md)** - System architecture, scalability, and integration patterns
- **[frontend-specialist.md](./frontend-specialist.md)** - Frontend development, React, and UI implementation
- **[api-specialist.md](./api-specialist.md)** - API design, GraphQL, RESTful services, and developer experience
- **[mobile-developer.md](./mobile-developer.md)** - React Native, PWA, and mobile-first development
- **[ai-ml-engineer.md](./ai-ml-engineer.md)** - Machine learning integration and intelligent features

### Infrastructure & Operations
- **[devops-engineer.md](./devops-engineer.md)** - CI/CD, containerization, and deployment automation
- **[platform-architect.md](./platform-architect.md)** - Infrastructure architecture and scalability patterns
- **[sre.md](./sre.md)** - Site reliability, monitoring, and operational excellence
- **[performance-engineer.md](./performance-engineer.md)** - Performance optimization and load testing
- **[database-administrator.md](./database-administrator.md)** - Database optimization, migrations, and data integrity

### Security & Compliance
- **[security-engineer.md](./security-engineer.md)** - Security assessment, vulnerability analysis, and defensive measures
- **[compliance-officer.md](./compliance-officer.md)** - Regulatory compliance, data governance, and privacy protection
- **[legal-counsel.md](./legal-counsel.md)** - Legal compliance, contracts, and terms of service

### Quality & Documentation
- **[qa-engineer.md](./qa-engineer.md)** - Testing strategy, automation, and quality assurance
- **[technical-writer.md](./technical-writer.md)** - Documentation, API docs, and user guides

### Business Operations
- **[operations-manager.md](./operations-manager.md)** - Business process optimization and vendor management
- **[customer-success-manager.md](./customer-success-manager.md)** - Customer onboarding, retention, and success
- **[data-analyst.md](./data-analyst.md)** - Business intelligence, reporting, and data-driven insights
- **[integration-specialist.md](./integration-specialist.md)** - Third-party APIs, webhooks, and system connectivity
- **[social-media-manager.md](./social-media-manager.md)** - Social media strategy and community building

## Agent Design Principles

### 1. Technology Agnostic
All agents are designed to work with any technology stack - React/Vue/Angular, Node.js/Python/Java, AWS/GCP/Azure, etc.

### 2. Project Independent
Agents contain no project-specific references and can be used for SaaS products, e-commerce, mobile apps, enterprise software, etc.

### 3. Enhanced Capabilities
Each agent includes:
- Comprehensive domain expertise
- Practical implementation examples
- Best practices and patterns
- Security and performance considerations
- Communication style guidelines

### 4. Tool Optimization
Agents are equipped with appropriate tools for their role:
- **Research agents**: WebSearch, WebFetch, Read, Grep, Glob
- **Development agents**: Edit, MultiEdit, Write, Bash, IDE diagnostics
- **Strategic agents**: TodoWrite, WebSearch, documentation tools

## Usage Guidelines

### Single Agent Consultation
Use individual agents for:
- Domain-specific expertise and advice
- Role-specific task execution
- Specialized knowledge requirements
- Quick consultations and reviews

### Multi-Agent Orchestration
Use multiple agents together for:
- Complex feature development
- Strategic planning and decision-making
- Cross-functional project requirements
- Comprehensive analysis and review

### Agent Selection
Choose agents based on:
- **Task complexity**: Simple tasks → single agent, complex → multiple agents
- **Domain expertise**: Match agent specialization to task requirements
- **Project phase**: Different agents for planning, implementation, testing, deployment

## Communication Patterns

Each agent follows consistent communication patterns:
- **Expertise-focused**: Deep knowledge in their domain
- **Actionable advice**: Practical, implementable recommendations
- **Context-aware**: Adapts to project type and requirements
- **Collaborative**: Works well with other agents
- **Professional**: Business-appropriate communication style

## Customization

To customize agents for specific projects:
1. Copy agent files to project-specific `.claude/agents/` directory
2. Modify context sections for project-specific needs
3. Add project-specific tools or constraints
4. Update examples and patterns for your technology stack

## Contributing

When creating new agents:
1. Follow the established YAML frontmatter format
2. Include comprehensive role description and responsibilities
3. Add practical examples and implementation patterns
4. Ensure technology and project agnosticism
5. Include appropriate tool selections
6. Follow consistent communication style guidelines

## Integration with Projects

To use these global agents in your projects:
1. Reference them in your project's `.claude/CLAUDE.md` file
2. Create project-specific agent variants if needed
3. Use the Task tool to invoke agents by name
4. Combine agents for complex, multi-perspective tasks

## Agent Versioning

Agents are continuously improved with:
- Enhanced domain expertise
- Updated best practices
- New technology patterns
- Improved tool utilization
- Better communication styles

Check the global agents directory regularly for updates and improvements.