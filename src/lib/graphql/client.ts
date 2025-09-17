import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
// import { createUploadLink } from 'apollo-upload-client'

// GraphQL endpoint configuration
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
})

// Upload link for file uploads (using httpLink for now)
const uploadLink = httpLink

// Authentication link
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  let token: string | null = null

  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth-token')
  }

  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'Apollo-Require-Preflight': 'true',
    },
  }
})

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      // eslint-disable-next-line no-console
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token')
          window.location.href = '/login'
        }
      }
    })
  }

  if (networkError) {
    // eslint-disable-next-line no-console
    console.error(`[Network error]: ${networkError}`)

    // Handle network errors
    if (networkError.message.includes('401')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token')
        window.location.href = '/login'
      }
    }
  }
})

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        allKnowledge: {
          keyArgs: ['workspaceId', 'collectionId', 'tagIds', 'status', 'authorIds'],
          merge(existing, incoming) {
            if (!existing) return incoming

            const merged = { ...incoming }
            if (existing.edges && incoming.edges) {
              merged.edges = [...existing.edges, ...incoming.edges]
            }
            return merged
          },
        },
        comments: {
          keyArgs: ['knowledgeId'],
          merge(existing, incoming) {
            if (!existing) return incoming

            const merged = { ...incoming }
            if (existing.edges && incoming.edges) {
              merged.edges = [...existing.edges, ...incoming.edges]
            }
            return merged
          },
        },
      },
    },
    Knowledge: {
      fields: {
        comments: {
          merge(existing = [], incoming = []) {
            return [...existing, ...incoming]
          },
        },
        collaborationSessions: {
          merge(existing = [], incoming = []) {
            return incoming // Always use latest collaboration sessions
          },
        },
      },
    },
    Workspace: {
      fields: {
        knowledge: {
          merge(existing = [], incoming = []) {
            return [...existing, ...incoming]
          },
        },
        collections: {
          merge(existing = [], incoming = []) {
            return [...existing, ...incoming]
          },
        },
      },
    },
    User: {
      fields: {
        authoredKnowledge: {
          merge(existing = [], incoming = []) {
            return [...existing, ...incoming]
          },
        },
      },
    },
  },
})

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([
    errorLink,
    authLink,
    // Use upload link for mutations that might include files
    uploadLink,
  ]),
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
})

// Helper function to get authenticated user
export const getAuthenticatedUser = () => {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('auth-token')
  if (!token) return null

  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error parsing auth token:', error)
    localStorage.removeItem('auth-token')
    return null
  }
}

// Helper function to set authentication token
export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth-token', token)
    // Reset Apollo Client cache to refetch data with new auth context
    apolloClient.resetStore()
  }
}

// Helper function to clear authentication
export const clearAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-token')
    apolloClient.clearStore()
  }
}

export default apolloClient