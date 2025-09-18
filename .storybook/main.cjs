/** @type { import('@storybook/nextjs').StorybookConfig } */
module.exports = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/react',
    options: {},
  },
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: false,
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  features: {
    buildStoriesJson: true,
    storyStoreV7: true,
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      http: false,
      https: false,
      zlib: false,
    }
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'next/image': require('path').resolve(__dirname, './mocks/NextImage.tsx'),
      'next/link': require('path').resolve(__dirname, './mocks/NextLink.tsx'),
      'next/router': require('path').resolve(__dirname, './mocks/NextRouter.ts'),
      'next/navigation': require('path').resolve(__dirname, './mocks/NextNavigation.ts'),
    }
    return config
  }
}
