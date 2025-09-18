import React from 'react'
import '../src/app/globals.css'

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
  docs: { toc: true },
}

export const decorators = [
  (Story, context) => {
    const theme = context.globals?.theme === 'dark' ? 'dark' : 'light'

    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark', theme === 'dark')

      const frame = document.getElementById('storybook-preview-iframe')
      const contentDoc = frame && frame instanceof HTMLIFrameElement ? frame.contentDocument : null
      if (contentDoc) {
        contentDoc.documentElement.classList.toggle('dark', theme === 'dark')
        contentDoc.body.style.background = 'hsl(var(--background))'
        contentDoc.body.style.color = 'hsl(var(--foreground))'
      }
    }

    return (
      <div className={`${theme === 'dark' ? 'dark' : ''} theme-transition`}>
        <div className="min-h-screen bg-background text-foreground p-4">
          <Story {...context} />
        </div>
      </div>
    )
  },
]

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', icon: 'sun', title: 'Light' },
        { value: 'dark', icon: 'moon', title: 'Dark' },
      ],
      showName: true,
      dynamicTitle: true,
    },
  },
}
