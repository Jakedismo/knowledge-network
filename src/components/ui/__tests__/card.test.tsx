import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card Components', () => {
  it('renders card with all sub-components', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="card-header">
          <CardTitle data-testid="card-title">Test Title</CardTitle>
          <CardDescription data-testid="card-description">Test Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="card-content">
          Test Content
        </CardContent>
        <CardFooter data-testid="card-footer">
          Test Footer
        </CardFooter>
      </Card>
    )

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByTestId('card-header')).toBeInTheDocument()
    expect(screen.getByTestId('card-title')).toBeInTheDocument()
    expect(screen.getByTestId('card-description')).toBeInTheDocument()
    expect(screen.getByTestId('card-content')).toBeInTheDocument()
    expect(screen.getByTestId('card-footer')).toBeInTheDocument()
  })

  it('applies correct CSS classes', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="card-header">
          <CardTitle data-testid="card-title">Title</CardTitle>
          <CardDescription data-testid="card-description">Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="card-content">Content</CardContent>
        <CardFooter data-testid="card-footer">Footer</CardFooter>
      </Card>
    )

    expect(screen.getByTestId('card')).toHaveClass('rounded-xl', 'border', 'bg-card', 'shadow')
    expect(screen.getByTestId('card-header')).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    expect(screen.getByTestId('card-title')).toHaveClass('font-semibold', 'leading-none', 'tracking-tight')
    expect(screen.getByTestId('card-description')).toHaveClass('text-sm', 'text-muted-foreground')
    expect(screen.getByTestId('card-content')).toHaveClass('p-6', 'pt-0')
    expect(screen.getByTestId('card-footer')).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
  })

  it('accepts custom className', () => {
    render(
      <Card className="custom-card" data-testid="card">
        <CardHeader className="custom-header" data-testid="card-header">
          <CardTitle className="custom-title" data-testid="card-title">Title</CardTitle>
          <CardDescription className="custom-description" data-testid="card-description">
            Description
          </CardDescription>
        </CardHeader>
        <CardContent className="custom-content" data-testid="card-content">
          Content
        </CardContent>
        <CardFooter className="custom-footer" data-testid="card-footer">
          Footer
        </CardFooter>
      </Card>
    )

    expect(screen.getByTestId('card')).toHaveClass('custom-card')
    expect(screen.getByTestId('card-header')).toHaveClass('custom-header')
    expect(screen.getByTestId('card-title')).toHaveClass('custom-title')
    expect(screen.getByTestId('card-description')).toHaveClass('custom-description')
    expect(screen.getByTestId('card-content')).toHaveClass('custom-content')
    expect(screen.getByTestId('card-footer')).toHaveClass('custom-footer')
  })

  it('supports semantic HTML structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Accessible Title</CardTitle>
          <CardDescription>Accessible Description</CardDescription>
        </CardHeader>
        <CardContent>
          Accessible Content
        </CardContent>
      </Card>
    )

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Accessible Title')
  })

  it('can be used standalone', () => {
    render(
      <Card data-testid="standalone-card">
        Simple card content
      </Card>
    )

    expect(screen.getByTestId('standalone-card')).toBeInTheDocument()
    expect(screen.getByTestId('standalone-card')).toHaveTextContent('Simple card content')
  })
})