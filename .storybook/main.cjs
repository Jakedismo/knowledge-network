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
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
      'react-dom/client': require.resolve('react-dom/client'),
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
      '@': require('path').resolve(__dirname, '../src'),
      'next/image': require('path').resolve(__dirname, './mocks/NextImage.js'),
      'next/link': require('path').resolve(__dirname, './mocks/NextLink.js'),
      'next/router': require('path').resolve(__dirname, './mocks/NextRouter.js'),
      'next/navigation': require('path').resolve(__dirname, './mocks/NextNavigation.js'),
      'next/head': require('path').resolve(__dirname, './mocks/NextHead.js'),
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
      },
      {
        test: /\.mdx?$/,
        use: [
          {
            loader: require.resolve('@mdx-js/loader'),
            options: {
              jsx: true,
              providerImportSource: '@mdx-js/react',
            },
          },
        ],
      }
    )
    return config
  }
}
