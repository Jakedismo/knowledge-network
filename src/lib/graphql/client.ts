import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client'
import { logger } from '@/lib/logger'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getMainDefinition } from '@apollo/client/utilities'
// Subscriptions (browser only)
let GraphQLWsLink: any = null
let createWsClient: any = null
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    GraphQLWsLink = require('@apollo/client/link/subscriptions').GraphQLWsLink
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createWsClient = require('graphql-ws').createClient
  } catch {
    // subscriptions not available
  }
}

// GraphQL endpoint configuration
const httpUri =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  process.env.GRAPHQL_ENDPOINT ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/api/graphql`
    : 'http://localhost:3005/api/graphql')
const httpLink = createHttpLink({ uri: httpUri })

function resolveWsUrl(fallbackHttpUrl: string): string {
  const env = process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT
  if (env) return env
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : fallbackHttpUrl
    const u = new URL('/api/graphql', base)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    return u.toString()
  } catch {
    return 'ws://localhost:3005/api/graphql'
  }
}

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
      logger.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)

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
    logger.error(`[Network error]: ${networkError}`)

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

// Subscriptions link (browser)
let splitLink = httpLink
const explicitWsEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT
if (typeof window !== 'undefined' && GraphQLWsLink && createWsClient && explicitWsEndpoint) {
  const wsUrl = resolveWsUrl(explicitWsEndpoint)
  const wsClient = createWsClient({
    url: wsUrl,
    connectionParams: () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    },
  })
  const wsLink = new GraphQLWsLink(wsClient)
  splitLink = split(
    ({ query }) => {
      const def = getMainDefinition(query)
      return def.kind === 'OperationDefinition' && def.operation === 'subscription'
    },
    wsLink,
    httpLink,
  )
}

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, splitLink]),
  cache,
  defaultOptions: {
    watchQuery: { errorPolicy: 'all', notifyOnNetworkStatusChange: true },
    query: { errorPolicy: 'all' },
    mutate: { errorPolicy: 'all' },
  },
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
    logger.error('Error parsing auth token:', error)
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
