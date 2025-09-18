/** @type { import('@storybook/nextjs').StorybookConfig } */
module.exports = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-webpack5-compiler-swc'
  ],
  framework: {
    name: '@storybook/react-webpack5',
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
      'react-dom/client': false,
    }
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    config.module.rules.push(
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('swc-loader'),
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    importSource: 'react',
                  },
                },
              },
            },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('swc-loader'),
            options: {
              jsc: {
                parser: {
                  syntax: 'ecmascript',
                  jsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    importSource: 'react',
                  },
                },
              },
            },
          },
        ],
      }
    )
    return config
  }
}
