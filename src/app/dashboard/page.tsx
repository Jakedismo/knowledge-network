'use client'

import React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the Knowledge Network Dashboard
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="text-2xl font-bold">1,284</div>
            <p className="text-sm text-muted-foreground">Total Documents</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-2xl font-bold">573</div>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-2xl font-bold">8.2K</div>
            <p className="text-sm text-muted-foreground">Search Queries</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-2xl font-bold">147</div>
            <p className="text-sm text-muted-foreground">Collaboration Sessions</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Q4 2024 Product Roadmap</span>
                <span className="text-sm text-muted-foreground">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Engineering Best Practices</span>
                <span className="text-sm text-muted-foreground">5 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Meeting Notes Template</span>
                <span className="text-sm text-muted-foreground">1 day ago</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Team Activity</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 rounded-full bg-blue-600 mt-2"></div>
                <div>
                  <p className="text-sm">Sarah Johnson edited Q4 2024 Product Roadmap</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 rounded-full bg-green-600 mt-2"></div>
                <div>
                  <p className="text-sm">Mike Chen commented on Engineering Best Practices</p>
                  <p className="text-xs text-muted-foreground">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 rounded-full bg-yellow-600 mt-2"></div>
                <div>
                  <p className="text-sm">Emily Davis starred Meeting Notes Template</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}