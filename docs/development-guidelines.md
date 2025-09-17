# Development Guidelines
# Knowledge Network React Application

## Overview

This document provides comprehensive development guidelines for the Knowledge Network React Application. These guidelines ensure code quality, consistency, and maintainability across the development team.

## Getting Started

### Prerequisites

- **Node.js**: Version 18.17.0 or higher
- **Bun**: Latest version (1.x)
- **Git**: Version 2.30 or higher
- **Docker**: For local development environment
- **VS Code**: Recommended IDE with extensions

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/knowledge-network.git
   cd knowledge-network
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database:**
   ```bash
   # Start PostgreSQL with Docker
   docker-compose up -d postgres

   # Run database migrations
   bunx prisma migrate dev
   ```

5. **Start the development server:**
   ```bash
   bun run dev
   ```

### VS Code Extensions

Install these recommended extensions:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "GraphQL.vscode-graphql",
    "Prisma.prisma",
    "ms-vscode.test-adapter-converter"
  ]
}
```

## Code Style and Standards

### TypeScript Guidelines

1. **Use strict TypeScript configuration:**
   - Enable `strict: true` in tsconfig.json
   - No `any` types unless absolutely necessary
   - Use type assertions sparingly

2. **Naming Conventions:**
   ```typescript
   // Interfaces and Types
   interface UserProfile {
     id: string
     displayName: string
   }

   // Enums
   enum DocumentStatus {
     DRAFT = 'draft',
     PUBLISHED = 'published'
   }

   // Functions and Variables
   const getUserProfile = (userId: string): UserProfile => {
     // implementation
   }

   // Constants
   const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB
   ```

3. **Type Definition Organization:**
   ```typescript
   // src/types/user.ts
   export interface User {
     id: string
     email: string
     displayName: string
   }

   // src/types/index.ts
   export type { User } from './user'
   export type { Document } from './document'
   ```

### React Component Guidelines

1. **Component Structure:**
   ```typescript
   // src/components/user-profile.tsx
   import { useState, useEffect } from 'react'
   import { cn } from '@/lib/utils'

   interface UserProfileProps {
     userId: string
     className?: string
   }

   export function UserProfile({ userId, className }: UserProfileProps) {
     const [user, setUser] = useState<User | null>(null)

     // Component logic here

     return (
       <div className={cn('user-profile', className)}>
         {/* JSX content */}
       </div>
     )
   }
   ```

2. **Custom Hooks:**
   ```typescript
   // src/hooks/use-user-profile.ts
   import { useState, useEffect } from 'react'
   import { useQuery } from '@apollo/client'
   import { GET_USER } from '@/lib/graphql/queries'

   export function useUserProfile(userId: string) {
     const { data, loading, error } = useQuery(GET_USER, {
       variables: { id: userId }
     })

     return {
       user: data?.user,
       loading,
       error
     }
   }
   ```

3. **Component Composition:**
   ```typescript
   // Prefer composition over inheritance
   interface ButtonProps {
     variant?: 'primary' | 'secondary'
     size?: 'sm' | 'md' | 'lg'
     children: React.ReactNode
   }

   export function Button({ variant = 'primary', size = 'md', children }: ButtonProps) {
     return (
       <button className={cn(buttonVariants({ variant, size }))}>
         {children}
       </button>
     )
   }
   ```

### Styling Guidelines

1. **Tailwind CSS Usage:**
   ```typescript
   // Use utility classes for styling
   <div className="flex items-center space-x-4 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
     <img className="w-12 h-12 rounded-full" src={user.avatar} alt={user.name} />
     <div className="flex-1 min-w-0">
       <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
         {user.name}
       </h3>
     </div>
   </div>
   ```

2. **Theme Variables:**
   ```css
   /* Use CSS custom properties for theming */
   :root {
     --color-primary: 262.1 83.3% 57.8%;
     --color-background: 0 0% 100%;
     --color-foreground: 224 71.4% 4.1%;
   }

   .dark {
     --color-background: 224 71.4% 4.1%;
     --color-foreground: 210 20% 98%;
   }
   ```

3. **Component Variants:**
   ```typescript
   // Use class-variance-authority for component variants
   import { cva } from 'class-variance-authority'

   const buttonVariants = cva(
     'inline-flex items-center justify-center rounded-md font-medium transition-colors',
     {
       variants: {
         variant: {
           primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
           secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
         },
         size: {
           sm: 'h-8 px-3 text-sm',
           md: 'h-10 px-4',
           lg: 'h-12 px-6'
         }
       },
       defaultVariants: {
         variant: 'primary',
         size: 'md'
       }
     }
   )
   ```

## Testing Guidelines

### Unit Testing

1. **Test Structure:**
   ```typescript
   // src/components/__tests__/user-profile.test.tsx
   import { render, screen } from '@testing-library/react'
   import { UserProfile } from '../user-profile'

   describe('UserProfile', () => {
     it('should render user information', () => {
       render(<UserProfile userId="123" />)

       expect(screen.getByText('John Doe')).toBeInTheDocument()
       expect(screen.getByRole('img')).toHaveAttribute('alt', 'John Doe')
     })

     it('should handle loading state', () => {
       // Test loading state
     })

     it('should handle error state', () => {
       // Test error state
     })
   })
   ```

2. **Hook Testing:**
   ```typescript
   // src/hooks/__tests__/use-user-profile.test.ts
   import { renderHook, waitFor } from '@testing-library/react'
   import { useUserProfile } from '../use-user-profile'

   describe('useUserProfile', () => {
     it('should fetch user profile', async () => {
       const { result } = renderHook(() => useUserProfile('123'))

       await waitFor(() => {
         expect(result.current.user).toBeDefined()
       })
     })
   })
   ```

### Integration Testing

1. **API Integration:**
   ```typescript
   // src/lib/graphql/__tests__/queries.test.ts
   import { MockedProvider } from '@apollo/client/testing'
   import { render, screen, waitFor } from '@testing-library/react'
   import { GET_USER } from '../queries'

   const mocks = [
     {
       request: {
         query: GET_USER,
         variables: { id: '123' }
       },
       result: {
         data: {
           user: { id: '123', name: 'John Doe' }
         }
       }
     }
   ]

   describe('User Queries', () => {
     it('should fetch user data', async () => {
       render(
         <MockedProvider mocks={mocks}>
           <UserProfile userId="123" />
         </MockedProvider>
       )

       await waitFor(() => {
         expect(screen.getByText('John Doe')).toBeInTheDocument()
       })
     })
   })
   ```

### End-to-End Testing

1. **Playwright Tests:**
   ```typescript
   // tests/e2e/user-profile.spec.ts
   import { test, expect } from '@playwright/test'

   test.describe('User Profile', () => {
     test('should display user information', async ({ page }) => {
       await page.goto('/users/123')

       await expect(page.locator('[data-testid="user-name"]')).toContainText('John Doe')
       await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
     })

     test('should allow editing profile', async ({ page }) => {
       await page.goto('/users/123/edit')

       await page.fill('[data-testid="name-input"]', 'Jane Doe')
       await page.click('[data-testid="save-button"]')

       await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
     })
   })
   ```

## State Management Guidelines

### Apollo Client (Server State)

1. **Query Organization:**
   ```typescript
   // src/lib/graphql/queries/user.ts
   import { gql } from '@apollo/client'

   export const GET_USER = gql`
     query GetUser($id: ID!) {
       user(id: $id) {
         id
         email
         displayName
         avatarUrl
       }
     }
   `
   ```

2. **Mutation Handling:**
   ```typescript
   // src/hooks/use-update-user.ts
   import { useMutation } from '@apollo/client'
   import { UPDATE_USER } from '@/lib/graphql/mutations'

   export function useUpdateUser() {
     const [updateUser, { loading, error }] = useMutation(UPDATE_USER, {
       onCompleted: (data) => {
         // Handle success
       },
       onError: (error) => {
         // Handle error
       },
       update: (cache, { data }) => {
         // Update cache
         cache.writeQuery({
           query: GET_USER,
           variables: { id: data.updateUser.id },
           data: { user: data.updateUser }
         })
       }
     })

     return { updateUser, loading, error }
   }
   ```

### Zustand (Client State)

1. **Store Definition:**
   ```typescript
   // src/stores/ui-store.ts
   import { create } from 'zustand'
   import { devtools, persist } from 'zustand/middleware'

   interface UIState {
     sidebarOpen: boolean
     theme: 'light' | 'dark' | 'system'
     setSidebarOpen: (open: boolean) => void
     setTheme: (theme: 'light' | 'dark' | 'system') => void
   }

   export const useUIStore = create<UIState>()(
     devtools(
       persist(
         (set) => ({
           sidebarOpen: true,
           theme: 'system',
           setSidebarOpen: (open) => set({ sidebarOpen: open }),
           setTheme: (theme) => set({ theme })
         }),
         { name: 'ui-store' }
       )
     )
   )
   ```

2. **Store Usage:**
   ```typescript
   // In component
   import { useUIStore } from '@/stores/ui-store'

   export function Sidebar() {
     const { sidebarOpen, setSidebarOpen } = useUIStore()

     return (
       <aside className={cn('sidebar', { 'sidebar-open': sidebarOpen })}>
         {/* Sidebar content */}
       </aside>
     )
   }
   ```

## Performance Guidelines

### React Performance

1. **Memoization:**
   ```typescript
   // Use React.memo for expensive components
   const UserList = React.memo(({ users }: { users: User[] }) => {
     return (
       <div>
         {users.map(user => (
           <UserCard key={user.id} user={user} />
         ))}
       </div>
     )
   })

   // Use useMemo for expensive calculations
   const sortedUsers = useMemo(() => {
     return users.sort((a, b) => a.name.localeCompare(b.name))
   }, [users])

   // Use useCallback for stable function references
   const handleUserClick = useCallback((userId: string) => {
     // Handle click
   }, [])
   ```

2. **Code Splitting:**
   ```typescript
   // Dynamic imports for heavy components
   const HeavyComponent = lazy(() => import('./heavy-component'))

   function App() {
     return (
       <Suspense fallback={<Loading />}>
         <HeavyComponent />
       </Suspense>
     )
   }
   ```

3. **Virtualization:**
   ```typescript
   // For large lists, use virtualization
   import { FixedSizeList as List } from 'react-window'

   function VirtualizedUserList({ users }: { users: User[] }) {
     const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
       <div style={style}>
         <UserCard user={users[index]} />
       </div>
     )

     return (
       <List
         height={600}
         itemCount={users.length}
         itemSize={100}
         width="100%"
       >
         {Row}
       </List>
     )
   }
   ```

### Bundle Optimization

1. **Tree Shaking:**
   ```typescript
   // Import only what you need
   import { debounce } from 'lodash/debounce' // Good
   import _ from 'lodash' // Bad - imports entire library
   ```

2. **Bundle Analysis:**
   ```bash
   # Analyze bundle size
   ANALYZE=true bun run build
   ```

## Error Handling Guidelines

### Error Boundaries

1. **Component Error Boundary:**
   ```typescript
   // src/components/error-boundary.tsx
   import React from 'react'

   interface ErrorBoundaryState {
     hasError: boolean
     error?: Error
   }

   export class ErrorBoundary extends React.Component<
     React.PropsWithChildren<{}>,
     ErrorBoundaryState
   > {
     constructor(props: React.PropsWithChildren<{}>) {
       super(props)
       this.state = { hasError: false }
     }

     static getDerivedStateFromError(error: Error): ErrorBoundaryState {
       return { hasError: true, error }
     }

     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
       console.error('Error caught by boundary:', error, errorInfo)
       // Log to error reporting service
     }

     render() {
       if (this.state.hasError) {
         return (
           <div className="error-boundary">
             <h2>Something went wrong</h2>
             <details>
               {this.state.error?.message}
             </details>
           </div>
         )
       }

       return this.props.children
     }
   }
   ```

### GraphQL Error Handling

1. **Apollo Error Handling:**
   ```typescript
   // src/components/user-profile.tsx
   import { useQuery } from '@apollo/client'
   import { GET_USER } from '@/lib/graphql/queries'

   export function UserProfile({ userId }: { userId: string }) {
     const { data, loading, error } = useQuery(GET_USER, {
       variables: { id: userId },
       errorPolicy: 'all' // Handle partial errors
     })

     if (loading) return <UserProfileSkeleton />

     if (error) {
       // Handle different error types
       if (error.networkError) {
         return <NetworkError retry={() => refetch()} />
       }

       if (error.graphQLErrors.length > 0) {
         return <GraphQLError errors={error.graphQLErrors} />
       }
     }

     return <UserProfileContent user={data?.user} />
   }
   ```

## Security Guidelines

### Input Validation

1. **Form Validation:**
   ```typescript
   // src/components/user-form.tsx
   import { useForm } from 'react-hook-form'
   import { zodResolver } from '@hookform/resolvers/zod'
   import { z } from 'zod'

   const userSchema = z.object({
     email: z.string().email('Invalid email address'),
     displayName: z.string().min(2, 'Name must be at least 2 characters'),
     bio: z.string().max(500, 'Bio must be less than 500 characters').optional()
   })

   type UserFormData = z.infer<typeof userSchema>

   export function UserForm() {
     const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
       resolver: zodResolver(userSchema)
     })

     const onSubmit = (data: UserFormData) => {
       // Handle form submission
     }

     return (
       <form onSubmit={handleSubmit(onSubmit)}>
         {/* Form fields */}
       </form>
     )
   }
   ```

2. **Sanitization:**
   ```typescript
   // src/utils/sanitize.ts
   import DOMPurify from 'dompurify'

   export function sanitizeHTML(html: string): string {
     return DOMPurify.sanitize(html, {
       ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
       ALLOWED_ATTR: ['href']
     })
   }
   ```

### Environment Variables

1. **Environment Configuration:**
   ```typescript
   // src/lib/env.ts
   import { z } from 'zod'

   const envSchema = z.object({
     NEXT_PUBLIC_APP_URL: z.string().url(),
     NEXT_PUBLIC_GRAPHQL_ENDPOINT: z.string().url(),
     DATABASE_URL: z.string(),
     JWT_SECRET: z.string().min(32)
   })

   export const env = envSchema.parse(process.env)
   ```

## Accessibility Guidelines

### ARIA and Semantic HTML

1. **Proper HTML Structure:**
   ```typescript
   // Use semantic HTML elements
   <main>
     <header>
       <h1>Knowledge Network</h1>
       <nav aria-label="Main navigation">
         <ul>
           <li><a href="/documents">Documents</a></li>
           <li><a href="/collections">Collections</a></li>
         </ul>
       </nav>
     </header>

     <section aria-labelledby="recent-documents">
       <h2 id="recent-documents">Recent Documents</h2>
       <article>
         <h3>Document Title</h3>
         <p>Document excerpt...</p>
       </article>
     </section>
   </main>
   ```

2. **ARIA Labels:**
   ```typescript
   // Provide proper ARIA labels
   <button
     aria-label="Delete document"
     aria-describedby="delete-help"
     onClick={handleDelete}
   >
     <TrashIcon />
   </button>
   <div id="delete-help" className="sr-only">
     This action cannot be undone
   </div>
   ```

3. **Focus Management:**
   ```typescript
   // Manage focus for accessibility
   const dialogRef = useRef<HTMLDialogElement>(null)

   const openDialog = () => {
     dialogRef.current?.showModal()
     // Focus first focusable element
     const firstFocusable = dialogRef.current?.querySelector('button, input, select, textarea')
     ;(firstFocusable as HTMLElement)?.focus()
   }
   ```

## Git Workflow

### Branch Naming

- **Feature branches**: `feature/add-user-authentication`
- **Bug fixes**: `fix/resolve-login-issue`
- **Hot fixes**: `hotfix/security-patch`
- **Release branches**: `release/v1.2.0`

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(auth): add user authentication`
- `fix(ui): resolve button alignment issue`
- `docs(api): update GraphQL schema documentation`
- `refactor(components): extract reusable button component`

### Pull Request Process

1. **Create feature branch from main**
2. **Implement feature with tests**
3. **Run quality checks locally**
4. **Create pull request with description**
5. **Address review feedback**
6. **Merge after approval**

### Code Review Guidelines

**Reviewers should check:**
- Code follows style guidelines
- Tests are comprehensive
- Performance implications
- Security considerations
- Accessibility compliance
- Documentation updates

## Documentation Standards

### Code Documentation

1. **JSDoc Comments:**
   ```typescript
   /**
    * Formats a date string for display in the UI
    * @param date - The date to format
    * @param locale - The locale to use for formatting
    * @returns Formatted date string
    * @example
    * ```typescript
    * formatDate(new Date(), 'en-US') // "January 1, 2024"
    * ```
    */
   export function formatDate(date: Date, locale = 'en-US'): string {
     return date.toLocaleDateString(locale, {
       year: 'numeric',
       month: 'long',
       day: 'numeric'
     })
   }
   ```

2. **README Files:**
   - Each major component/feature should have documentation
   - Include usage examples
   - Document props and APIs
   - Provide troubleshooting guides

### API Documentation

1. **GraphQL Schema:**
   - Document all types, queries, and mutations
   - Provide usage examples
   - Include deprecation notices

2. **Component Documentation:**
   - Use Storybook for component documentation
   - Include all variants and states
   - Provide interaction examples

## Monitoring and Debugging

### Development Tools

1. **React Developer Tools**
2. **Apollo Client Developer Tools**
3. **Redux DevTools (for Zustand)**
4. **React Query DevTools**

### Logging

```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data)
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error)
    // Send to error reporting service in production
  }
}
```

These development guidelines ensure consistent, high-quality code across the Knowledge Network application while maintaining excellent developer experience and application performance.