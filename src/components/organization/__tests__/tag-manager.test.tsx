import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { TagManager } from '../TagManager'

describe('TagManager', () => {
  it('adds a new tag from input', () => {
    const handle = vi.fn()
    render(<TagManager value={[]} onChange={handle} suggestions={[]} />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Docs' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(handle).toHaveBeenCalled()
    const next = handle.mock.calls[0][0]
    expect(next[0].label).toBe('Docs')
  })
})

