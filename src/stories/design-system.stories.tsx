/**
 * Design System Overview Story
 *
 * Showcases the complete design system including colors, typography,
 * spacing, and component examples in Storybook.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Grid, GridItem } from '@/components/ui/grid'
import { Container, Section, Stack, HStack } from '@/components/ui/layout'

const meta: Meta = {
  title: 'Design System/Overview',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Complete overview of the Knowledge Network design system including colors, typography, spacing, and components.',
      },
    },
  },
}

export default meta
type Story = StoryObj

// Color Palette Story
export const ColorPalette: Story = {
  render: () => (
    <Container size="xl">
      <Section spacing="lg">
        <Stack spacing={8}>
          <div>
            <h1 className="text-4xl font-bold mb-2">Design System</h1>
            <p className="text-muted-foreground text-lg">Knowledge Network React Application</p>
          </div>

          {/* Theme Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Theme System</CardTitle>
              <CardDescription>
                Switch between light and dark modes to see the design system adapt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HStack spacing={4}>
                <ThemeToggle variant="dropdown" />
                <ThemeToggle variant="simple" />
                <ThemeToggle variant="button" />
              </HStack>
            </CardContent>
          </Card>

          {/* Color System */}
          <Card>
            <CardHeader>
              <CardTitle>Color System</CardTitle>
              <CardDescription>
                Semantic colors that adapt to light and dark themes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Grid cols={4} gap={4}>
                <div className="space-y-2">
                  <h3 className="font-semibold">Primary</h3>
                  <div className="space-y-2">
                    <div className="h-12 rounded bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                      Primary
                    </div>
                    <div className="h-8 rounded bg-primary/80 flex items-center justify-center text-primary-foreground text-xs">
                      Primary/80
                    </div>
                    <div className="h-8 rounded bg-primary/60 flex items-center justify-center text-primary-foreground text-xs">
                      Primary/60
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Secondary</h3>
                  <div className="space-y-2">
                    <div className="h-12 rounded bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-medium">
                      Secondary
                    </div>
                    <div className="h-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      Muted
                    </div>
                    <div className="h-8 rounded bg-accent flex items-center justify-center text-accent-foreground text-xs">
                      Accent
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Semantic</h3>
                  <div className="space-y-2">
                    <div className="h-8 rounded bg-success-500 flex items-center justify-center text-white text-xs">
                      Success
                    </div>
                    <div className="h-8 rounded bg-warning-500 flex items-center justify-center text-white text-xs">
                      Warning
                    </div>
                    <div className="h-8 rounded bg-error-500 flex items-center justify-center text-white text-xs">
                      Error
                    </div>
                    <div className="h-8 rounded bg-info-500 flex items-center justify-center text-white text-xs">
                      Info
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Destructive</h3>
                  <div className="space-y-2">
                    <div className="h-12 rounded bg-destructive flex items-center justify-center text-destructive-foreground text-sm font-medium">
                      Destructive
                    </div>
                    <div className="h-8 rounded bg-destructive/80 flex items-center justify-center text-destructive-foreground text-xs">
                      Destructive/80
                    </div>
                  </div>
                </div>
              </Grid>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>
                Font sizes, weights, and hierarchy for consistent text styling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Stack spacing={4}>
                <div className="text-6xl font-bold">Heading 1</div>
                <div className="text-5xl font-bold">Heading 2</div>
                <div className="text-4xl font-bold">Heading 3</div>
                <div className="text-3xl font-semibold">Heading 4</div>
                <div className="text-2xl font-semibold">Heading 5</div>
                <div className="text-xl font-semibold">Heading 6</div>
                <div className="text-lg">Large body text</div>
                <div className="text-base">Regular body text</div>
                <div className="text-sm text-muted-foreground">Small body text</div>
                <div className="text-xs text-muted-foreground">Extra small text</div>
                <div className="font-mono text-sm">Monospace text for code</div>
              </Stack>
            </CardContent>
          </Card>

          {/* Component Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Component Examples</CardTitle>
              <CardDescription>
                Key components showcasing the design system in action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Grid cols={2} gap={6}>
                {/* Buttons */}
                <Stack spacing={4}>
                  <h3 className="font-semibold">Buttons</h3>
                  <HStack spacing={2} wrap="wrap">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                  </HStack>
                  <HStack spacing={2} wrap="wrap">
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                    <Button variant="info">Info</Button>
                    <Button variant="link">Link</Button>
                  </HStack>
                </Stack>

                {/* Badges */}
                <Stack spacing={4}>
                  <h3 className="font-semibold">Badges</h3>
                  <HStack spacing={2} wrap="wrap">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </HStack>
                  <HStack spacing={2} wrap="wrap">
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="info">Info</Badge>
                  </HStack>
                </Stack>

                {/* Form Elements */}
                <Stack spacing={4}>
                  <h3 className="font-semibold">Form Elements</h3>
                  <Stack spacing={2}>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="Enter your password" />
                    </div>
                  </Stack>
                </Stack>

                {/* Card Example */}
                <Card>
                  <CardHeader>
                    <CardTitle>Card Component</CardTitle>
                    <CardDescription>
                      This is a card component showcasing the design system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Cards are flexible containers for grouping related content and actions.
                    </p>
                  </CardContent>
                </Card>
              </Grid>
            </CardContent>
          </Card>

          {/* Spacing System */}
          <Card>
            <CardHeader>
              <CardTitle>Spacing System</CardTitle>
              <CardDescription>
                Consistent spacing using an 8pt grid system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Stack spacing={4}>
                {[1, 2, 3, 4, 6, 8, 12].map((space) => (
                  <div key={space} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-mono">{space * 4}px</div>
                    <div
                      className="bg-primary h-4"
                      style={{ width: `${space * 4}px` }}
                    />
                    <div className="text-sm text-muted-foreground">
                      gap-{space} / p-{space} / m-{space}
                    </div>
                  </div>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Section>
    </Container>
  ),
}

// Grid System Story
export const GridSystem: Story = {
  render: () => (
    <Container size="xl">
      <Section spacing="lg">
        <Stack spacing={8}>
          <div>
            <h1 className="text-3xl font-bold mb-2">Grid System</h1>
            <p className="text-muted-foreground">
              Responsive grid system with auto-fit columns and flexible layouts
            </p>
          </div>

          {/* Auto Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Auto Grid</CardTitle>
              <CardDescription>
                Automatically adjusts columns based on content width
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Grid cols="auto" gap={4}>
                {Array.from({ length: 6 }, (_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="font-semibold">Item {i + 1}</div>
                        <div className="text-sm text-muted-foreground">Auto sized</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Fixed Columns */}
          <Card>
            <CardHeader>
              <CardTitle>Fixed Columns</CardTitle>
              <CardDescription>
                Fixed number of columns with responsive breakpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Grid cols={3} gap={4}>
                {Array.from({ length: 9 }, (_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="font-semibold">Item {i + 1}</div>
                        <div className="text-sm text-muted-foreground">3 columns</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Complex Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Complex Grid Layout</CardTitle>
              <CardDescription>
                Using grid items with different spans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Grid cols={4} gap={4}>
                <GridItem colSpan={2}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="font-semibold">Wide Item</div>
                        <div className="text-sm text-muted-foreground">Spans 2 columns</div>
                      </div>
                    </CardContent>
                  </Card>
                </GridItem>
                <GridItem>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="font-semibold">Item</div>
                        <div className="text-sm text-muted-foreground">1 column</div>
                      </div>
                    </CardContent>
                  </Card>
                </GridItem>
                <GridItem>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="font-semibold">Item</div>
                        <div className="text-sm text-muted-foreground">1 column</div>
                      </div>
                    </CardContent>
                  </Card>
                </GridItem>
                <GridItem colSpan={4}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="font-semibold">Full Width</div>
                        <div className="text-sm text-muted-foreground">Spans all 4 columns</div>
                      </div>
                    </CardContent>
                  </Card>
                </GridItem>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </Section>
    </Container>
  ),
}