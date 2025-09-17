# Task instructions

Orchestrate the build a comprehensive Knowledge Network React Application that serves as an intelligent knowledge management platform with advanced features for capturing, organizing, analyzing, and sharing knowledge across teams and projects. The system should leverage modern React patterns, AI capabilities, and provide seamless integration with external knowledge sources.

## System Architecture & Core Requirements

The application must be built as a modern, scalable React application with the following architectural components:

### Frontend Architecture:

- React 18+ with TypeScript for type safety
- Next.js 15+ for server-side rendering and optimal performance
- Tailwind CSS with custom design system for consistent UI
- Zustand for lightweight state management
- React Query (TanStack Query) for server state synchronization
- Framer Motion for smooth animations and micro-interactions
- React Hook Form with Zod validation for robust form handling
- OpenAI Agents SDK for AI features with gpt-5 models

### Backend Services (to be coordinated separately):

- Node.js/Express API server with GraphQL support
- PostgreSQL database with Prisma ORM
- Redis for caching and session management
- ElasticSearch for full-text search capabilities
- WebSocket server for real-time collaboration
- S3-compatible storage for document attachments

## Feature Specifications

### 1. Knowledge Capture & Creation

- **Rich Text Editor**: Implement a powerful WYSIWYG editor with:
  - Markdown support with live preview
  - Code syntax highlighting for 20+ languages
  - Drag-and-drop image upload with automatic optimization
  - Embedded media support (YouTube, Vimeo, Twitter embeds)
  - Mathematical equation rendering (LaTeX support)
  - Collaborative editing with real-time cursor tracking
  - Version history with diff visualization
  - Auto-save with conflict resolution

- **Template System**: Create reusable knowledge templates for:
  - Technical documentation
  - Meeting notes
  - Project retrospectives
  - Research findings
  - Best practices guides
  - Troubleshooting guides
  - Custom user-defined templates

### 2. Knowledge Organization

- **Hierarchical Structure**:
  - Workspaces for team/project separation
  - Collections for topic grouping
  - Nested folder system with drag-and-drop reorganization
  - Tag-based categorization with auto-suggestions
  - Custom metadata fields per knowledge type
  
- **Smart Linking**:
  - Bi-directional links between documents
  - Automatic backlink detection
  - Knowledge graph visualization (force-directed graph)
  - Related content suggestions using AI
  - Citation management with bibliography generation

### 3. Search & Discovery

- **Advanced Search Interface**:
  - Full-text search with ElasticSearch
  - Faceted search with filters (date, author, tags, type)
  - Search query builder with boolean operators
  - Saved search queries
  - Search analytics dashboard
  - Voice search capability
  - Semantic search using embeddings

- **AI-Powered Discovery**:
  - Content recommendations based on user activity
  - Trending topics detection
  - Knowledge gap identification
  - Duplicate content detection
  - Expert identification within the network

### 4. Collaboration Features

- **Real-time Collaboration**:
  - Multiple users editing simultaneously
  - Presence indicators showing active users
  - Comments with threaded discussions
  - @mentions with notifications
  - Suggested edits workflow
  - Activity feed with filtering options

- **Review & Approval System**:
  - Customizable review workflows
  - Role-based permissions (viewer, editor, reviewer, admin)
  - Change request management
  - Approval chains with escalation
  - Audit trail for compliance

### 5. AI Integration

- **Content Intelligence**:
  - Auto-tagging using NLP
  - Summary generation for long documents
  - Key concept extraction
  - Sentiment analysis for feedback
  - Translation support for 10+ languages
  - Content quality scoring
  - Readability analysis

- **Knowledge Assistant**:
  - Q&A chatbot trained on knowledge base
  - Smart content suggestions while writing
  - Fact-checking against existing knowledge
  - Research assistant for gathering external information
  - Meeting transcription with action item extraction

### 6. Analytics & Insights

- **Usage Analytics Dashboard**:
  - User engagement metrics
  - Content performance tracking
  - Search query analysis
  - Knowledge coverage maps
  - Team collaboration patterns
  - Time-to-resolution metrics
  - Custom report builder

- **Knowledge Health Monitoring**:
  - Outdated content detection
  - Broken link checker
  - Content accuracy scoring
  - Review cycle tracking
  - Knowledge base completeness metrics

### 7. Integration Capabilities

- **External Integrations**:
  - Slack/Microsoft Teams for notifications
  - JIRA/GitHub for issue linking
  - Google Drive/OneDrive for document import
  - Confluence/Notion migration tools
  - API webhooks for custom integrations
  - SAML/OAuth for SSO
  - LDAP/Active Directory sync

### 8. Mobile & Offline Support

- **Progressive Web App**:
  - Responsive design for all screen sizes
  - Offline mode with sync capabilities
  - Push notifications
  - Native app feel with PWA installation
  - Touch-optimized interactions
  - Voice note capture

## Technical Implementation Requirements

### Performance Standards:

- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Core Web Vitals: All metrics in "Good" range
- Support for 10,000+ documents without degradation
- Real-time sync latency < 100ms
- Search results < 500ms

### Security Requirements:

- End-to-end encryption for sensitive content
- Row-level security in database
- Rate limiting on all APIs
- XSS and CSRF protection
- Content Security Policy implementation
- Regular security audit logging
- GDPR compliance tools

### Testing Requirements:

- Unit test coverage > 80%
- Integration test coverage > 70%
- E2E test coverage for critical user journeys
- Performance testing for all major features
- Accessibility testing (WCAG 2.1 AA compliance)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iOS and Android)

### Development Workflow:

- Component library with Storybook documentation
- Automated CI/CD pipeline with GitHub Actions
- Feature flag system for gradual rollouts
- Error tracking with Sentry integration
- Application monitoring with DataDog/NewRelic
- Automated dependency updates
- Code quality checks (ESLint, Prettier, TypeScript strict mode)

## Cross-Project Coordination Points

The system should establish A2A communication channels for:

1. **Backend API Development**: Coordinate with backend team for API specifications, GraphQL schema evolution, and WebSocket protocol design

2. **Search Service**: Collaborate with search infrastructure team for ElasticSearch index configuration and query optimization

3. **AI Services**: Interface with ML team for model integration, training data preparation, and inference API design

4. **Mobile Development**: Sync with mobile team for API compatibility and feature parity

5. **DevOps Infrastructure**: Coordinate deployment strategies, monitoring setup, and scaling policies

## Quality Gates & Success Criteria

Each major feature must pass the following quality gates:

- Architecture review approval (Score ≥ 8.5/10)
- Code review by senior developers (Score ≥ 8.5/10)
- Performance benchmarks met (All metrics green)
- Security review passed (No critical vulnerabilities)
- Accessibility audit passed (WCAG 2.1 AA)
- User acceptance testing completed (≥ 90% satisfaction)

## Delivery Milestones

Phase 1 (Week 1-2): Core foundation

- Project setup with all tooling
- Component library foundation
- Authentication system
- Basic CRUD for knowledge items

Phase 2 (Week 3-4): Knowledge Management

- Rich text editor implementation
- Folder/collection structure
- Basic search functionality
- Version control system

Phase 3 (Week 5-6): Collaboration

- Real-time editing
- Comments and mentions
- Activity feeds
- Permission system

Phase 4 (Week 7-8): AI & Intelligence

- AI integration framework
- Auto-tagging and summarization
- Smart recommendations
- Knowledge assistant MVP

Phase 5 (Week 9-10): Polish & Performance

- Performance optimization
- Mobile responsiveness
- Offline support
- Analytics dashboard

Phase 6 (Week 11-12): Integration & Deployment

- External integrations
- Security hardening
- Production deployment
- Documentation completion

The system should leverage parallel development streams where possible, with designated convergence points for integration testing. Maintain continuous communication through A2A channels for cross-team coordination and ensure all deliverables meet the 8.5/10 quality threshold before progression to the next phase.