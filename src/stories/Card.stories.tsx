import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component for displaying content in a contained, elevated surface.',
      },
    },
  },
  argTypes: {
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Here you can add the main content of your card.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithoutFooter: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Knowledge Article</CardTitle>
        <CardDescription>Understanding React State Management</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          State management is crucial for building scalable React applications.
          This article covers the fundamental concepts and best practices.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            React
          </span>
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
            State Management
          </span>
        </div>
      </CardContent>
    </Card>
  ),
}

export const MinimalCard: Story = {
  render: () => (
    <Card className="w-64">
      <CardContent className="pt-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">$2,340</h3>
          <p className="text-sm text-muted-foreground">Total Revenue</p>
        </div>
      </CardContent>
    </Card>
  ),
}

export const ComplexCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div>
            <CardTitle className="text-base">Advanced React Patterns</CardTitle>
            <CardDescription>Updated 2 hours ago</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Explore advanced patterns like render props, higher-order components,
          and custom hooks to write more reusable and maintainable React code.
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>75%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Continue Reading</Button>
      </CardFooter>
    </Card>
  ),
}

export const InteractiveCard: Story = {
  render: () => (
    <Card className="w-80 hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>This card responds to hover interactions</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Cards can be made interactive by adding hover effects and click handlers.
        </p>
      </CardContent>
    </Card>
  ),
}

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Article {i + 1}</CardTitle>
            <CardDescription>Sample knowledge article description</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a sample article that demonstrates how cards work in a grid layout.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">Read More</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Cards arranged in a responsive grid layout.',
      },
    },
  },
}