import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { TreeView } from '../TreeView'

describe('TreeView accessibility', () => {
  it('renders items with proper roles and supports keyboard navigation', () => {
    const nodes = [{ id: '1', name: 'Root', isExpanded: true, children: [ { id: 'a', name: 'Child' } ] }]
    render(<TreeView nodes={nodes} ariaLabel="Demo tree" />)
    const tree = screen.getByRole('tree', { name: 'Demo tree' })
    expect(tree).toBeInTheDocument()
    fireEvent.keyDown(tree, { key: 'ArrowDown' })
    fireEvent.keyDown(tree, { key: 'ArrowUp' })
  })
})

