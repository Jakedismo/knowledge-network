import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalTrigger,
  ModalClose,
} from '../modal'
import { Button } from '../button'

describe('Modal', () => {
  it('renders modal with trigger', async () => {
    const user = userEvent.setup()

    render(
      <Modal>
        <ModalTrigger asChild>
          <Button>Open Modal</Button>
        </ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Test Modal</ModalTitle>
            <ModalDescription>This is a test modal</ModalDescription>
          </ModalHeader>
          <div>Modal content</div>
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline">Close</Button>
            </ModalClose>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )

    // Modal should not be visible initially
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()

    // Click trigger to open modal
    await user.click(screen.getByRole('button', { name: 'Open Modal' }))

    // Modal should now be visible
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('This is a test modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <Modal defaultOpen>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Test Modal</ModalTitle>
          </ModalHeader>
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline">Close</Button>
            </ModalClose>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )

    // Modal should be visible
    expect(screen.getByText('Test Modal')).toBeInTheDocument()

    // Click close button
    await user.click(screen.getByRole('button', { name: 'Close' }))

    // Modal should be closed
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('closes modal when X button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <Modal defaultOpen>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Test Modal</ModalTitle>
          </ModalHeader>
        </ModalContent>
      </Modal>
    )

    // Modal should be visible
    expect(screen.getByText('Test Modal')).toBeInTheDocument()

    // Click X button (close button in top-right)
    await user.click(screen.getByRole('button', { name: 'Close' }))

    // Modal should be closed
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('closes modal when escape key is pressed', async () => {
    const user = userEvent.setup()

    render(
      <Modal defaultOpen>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Test Modal</ModalTitle>
          </ModalHeader>
        </ModalContent>
      </Modal>
    )

    // Modal should be visible
    expect(screen.getByText('Test Modal')).toBeInTheDocument()

    // Press escape key
    await user.keyboard('{Escape}')

    // Modal should be closed
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('handles controlled open state', async () => {
    const user = userEvent.setup()
    let isOpen = false
    const setIsOpen = vi.fn((open: boolean) => {
      isOpen = open
    })

    const { rerender } = render(
      <Modal open={isOpen} onOpenChange={setIsOpen}>
        <ModalTrigger asChild>
          <Button>Open Modal</Button>
        </ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Test Modal</ModalTitle>
          </ModalHeader>
        </ModalContent>
      </Modal>
    )

    // Modal should not be visible
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()

    // Click trigger
    await user.click(screen.getByRole('button', { name: 'Open Modal' }))
    expect(setIsOpen).toHaveBeenCalledWith(true)

    // Rerender with open state
    isOpen = true
    rerender(
      <Modal open={isOpen} onOpenChange={setIsOpen}>
        <ModalTrigger asChild>
          <Button>Open Modal</Button>
        </ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Test Modal</ModalTitle>
          </ModalHeader>
        </ModalContent>
      </Modal>
    )

    // Modal should now be visible
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })
})