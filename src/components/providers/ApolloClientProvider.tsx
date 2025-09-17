"use client"
import * as React from 'react'
import { ApolloProvider } from '@apollo/client'
import apolloClient from '@/lib/graphql/client'

export function ApolloClientProvider({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
}

