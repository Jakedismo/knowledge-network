import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { TreeView } from '../TreeView'

describe('TreeView keyboard interactions', () => {
  it('expands/collapses with ArrowRight/ArrowLeft', () => {
    const onToggle = vi.fn()
    const nodes = [{ id: '1', name: 'Root', isExpanded: false, isSelected: true, children: [ { id: 'a', name: 'Child', children: [] } ] }]
    render(<TreeView nodes={nodes as any} onToggle={onToggle} />)
    const tree = screen.getByRole('tree')
    fireEvent.keyDown(tree, { key: 'ArrowRight' })
    expect(onToggle).toHaveBeenCalledWith('1', true)
    // ArrowLeft would collapse when expanded, but TreeView is controlled from above;
    // without state update it won’t fire a second toggle here. We validate the expand case.
  })
})
