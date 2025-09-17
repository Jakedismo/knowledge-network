import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import {
  MoreHorizontal,
  User,
  Settings,
  LogOut,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loading, Skeleton } from '@/components/ui/loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const meta: Meta = {
  title: 'UI/Advanced Components',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Showcase of complex UI components working together.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const DropdownMenuExample: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <User className="mr-2 h-4 w-4" />
          Profile
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const TabsExample: Story = {
  render: () => (
    <div className="w-[400px]">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Your knowledge network at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <strong>Total Articles:</strong> 1,234
              </div>
              <div className="text-sm">
                <strong>Contributors:</strong> 56
              </div>
              <div className="text-sm">
                <strong>Views this month:</strong> 45,231
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Detailed insights and metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analytics dashboard with charts and graphs would go here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Configure your preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email notifications</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Privacy settings</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  ),
}

export const AccordionExample: Story = {
  render: () => (
    <div className="w-[500px]">
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>How do I create a new knowledge article?</AccordionTrigger>
          <AccordionContent>
            To create a new knowledge article, navigate to the &quot;Create&quot; section in the main menu,
            select &quot;New Article,&quot; and use our rich text editor to compose your content. You can
            add images, code blocks, and links to make your article comprehensive.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Can I collaborate with others on articles?</AccordionTrigger>
          <AccordionContent>
            Yes! Our platform supports real-time collaboration. You can invite team members to
            co-author articles, leave comments, and suggest edits. All changes are tracked with
            version history for easy review.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>How does the search functionality work?</AccordionTrigger>
          <AccordionContent>
            Our advanced search uses AI-powered semantic search to find relevant content even when
            you don&apos;t use exact keywords. You can filter by tags, authors, date ranges, and content
            types to narrow down results.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const AlertsShowcase: Story = {
  render: () => (
    <div className="w-[500px] space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          This is an informational message to keep you updated.
        </AlertDescription>
      </Alert>

      <Alert variant="success">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>
          Your knowledge article has been published successfully!
        </AlertDescription>
      </Alert>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Please review your article for accuracy before publishing.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to save changes. Please try again.
        </AlertDescription>
      </Alert>
    </div>
  ),
}

export const LoadingStates: Story = {
  render: () => (
    <div className="w-[500px] space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Loading Spinners</h3>
        <div className="flex items-center gap-4">
          <Loading size="sm" text="Small" />
          <Loading size="md" text="Medium" />
          <Loading size="lg" text="Large" />
          <Loading size="xl" text="Extra Large" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Loading Variants</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Loading variant="spinner" size="md" />
            <span className="text-sm">Spinner</span>
          </div>
          <div className="flex items-center gap-4">
            <Loading variant="dots" size="md" />
            <span className="text-sm">Dots</span>
          </div>
          <div className="flex items-center gap-4">
            <Loading variant="bars" size="md" />
            <span className="text-sm">Bars</span>
          </div>
          <div className="flex items-center gap-4">
            <Loading variant="pulse" size="md" />
            <span className="text-sm">Pulse</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Skeleton Loading</h3>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-[60%]" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const ComplexDashboard: Story = {
  render: () => (
    <div className="w-[800px] space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Knowledge Dashboard</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Export Data</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Help</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Articles</CardTitle>
                <CardDescription>Latest knowledge articles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Article {i + 1}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start">Create Article</Button>
                <Button variant="outline" className="w-full justify-start">Import Content</Button>
                <Button variant="ghost" className="w-full justify-start">View Analytics</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Analytics Overview</AlertTitle>
            <AlertDescription>
              Your content performance metrics would be displayed here.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="members">
              <AccordionTrigger>Team Members (5)</AccordionTrigger>
              <AccordionContent>
                List of team members and their roles would be shown here.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="permissions">
              <AccordionTrigger>Permissions</AccordionTrigger>
              <AccordionContent>
                Permission settings and access controls would be configured here.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'A complex dashboard combining multiple components to demonstrate real-world usage patterns.',
      },
    },
  },
}