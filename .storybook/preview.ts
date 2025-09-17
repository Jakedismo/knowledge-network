import type { Preview } from '@storybook/nextjs'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
    viewport: {
      viewports: {
        xs: {
          name: 'XS (475px)',
          styles: {
            width: '475px',
            height: '100%',
          },
        },
        sm: {
          name: 'SM (640px)',
          styles: {
            width: '640px',
            height: '100%',
          },
        },
        md: {
          name: 'MD (768px)',
          styles: {
            width: '768px',
            height: '100%',
          },
        },
        lg: {
          name: 'LG (1024px)',
          styles: {
            width: '1024px',
            height: '100%',
          },
        },
        xl: {
          name: 'XL (1280px)',
          styles: {
            width: '1280px',
            height: '100%',
          },
        },
        '2xl': {
          name: '2XL (1536px)',
          styles: {
            width: '1536px',
            height: '100%',
          },
        },
      },
    },
  },
  globalTypes: {
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
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme

      return (
        <div className={theme === 'dark' ? 'dark' : ''}>
          <div className="min-h-screen bg-background text-foreground p-4">
            <Story />
          </div>
        </div>
      )
    },
  ],
}

export default preview