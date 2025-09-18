'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Smartphone,
} from 'lucide-react'
import { useTheme } from '@/lib/theme-provider'

const notificationSettings = [
  { label: 'Daily digest', description: 'Summary of collaboration activity and key updates.' },
  { label: 'Review requests', description: 'Alerts when you are assigned as reviewer or blocker.' },
  { label: 'Assistant suggestions', description: 'AI curated knowledge surfaced for your domain.' },
]

const deviceSessions = [
  { device: 'MacBook Pro · Safari', lastSeen: 'Active now' },
  { device: 'iPhone 15 · PWA', lastSeen: '3 hours ago' },
  { device: 'iPad Pro · App', lastSeen: 'Yesterday' },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Personalize notifications, security preferences, and theming to match your workflow.
            </p>
          </div>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Open preferences JSON
          </Button>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationSettings.map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{setting.label}</p>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                    <Button size="sm" variant="secondary">Enabled</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>Review active sessions and enforce multi-factor authentication across devices.</p>
                <div className="space-y-2">
                  {deviceSessions.map((session) => (
                    <div key={session.device} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                      <span>{session.device}</span>
                      <span className="text-xs text-muted-foreground">{session.lastSeen}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="secondary">
                  Sign out of other devices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="text-sm font-medium text-foreground">Desktop theme</h3>
                  <p className="text-xs text-muted-foreground">Align with system preferences or set explicit mode.</p>
                  <div className="mt-3 flex gap-2 text-xs">
                    <Button
                      size="sm"
                      variant={theme === 'light' ? 'secondary' : 'outline'}
                      onClick={() => setTheme('light')}
                    >
                      Light
                    </Button>
                    <Button
                      size="sm"
                      variant={theme === 'dark' ? 'secondary' : 'outline'}
                      onClick={() => setTheme('dark')}
                    >
                      Dark
                    </Button>
                    <Button
                      size="sm"
                      variant={theme === 'system' ? 'secondary' : 'outline'}
                      onClick={() => setTheme('system')}
                    >
                      System
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="text-sm font-medium text-foreground">Mobile layout</h3>
                  <p className="text-xs text-muted-foreground">Choose between compact or spacious navigation.</p>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Mobile optimized bottom navigation enabled.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
