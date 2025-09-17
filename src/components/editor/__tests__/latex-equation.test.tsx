import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Equation } from '@/components/editor/plugins/latex-equation'

describe('Equation', () => {
  it('falls back to code when KaTeX not present', () => {
    render(<Equation tex={'a^2 + b^2 = c^2'} />)
    const code = screen.getByLabelText('LaTeX equation (fallback)')
    expect(code).toBeTruthy()
  })
})

