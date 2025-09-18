const path = require('path')
const webpack = require('webpack')

/** @type { import('@storybook/nextjs').StorybookConfig } */
module.exports = {
  stories: [
    '../src/stories/generated/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: ['@storybook/addon-a11y'],
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
    defaultName: 'Documentation'
  },
  features: {
    buildStoriesJson: true,
    storyStoreV7: true,
    backgrounds: false,
    measure: false,
    outline: false
  },
  webpackFinal: async (config) => {
   config.resolve = config.resolve || {}
    config.resolve.fullySpecified = false
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
      'react-dom/client': path.resolve(__dirname, './mocks/reactDomClient.js'),
      'react-dom/client.js': path.resolve(__dirname, './mocks/reactDomClient.js'),
      'react-dom/test-utils': path.resolve(__dirname, './mocks/reactDomTestUtils.js'),
      'react-dom/test-utils.js': path.resolve(__dirname, './mocks/reactDomTestUtils.js'),
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
      'react/jsx-runtime.js': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime.js': require.resolve('react/jsx-dev-runtime'),
      '@': path.resolve(__dirname, '../src'),
      'next/image': path.resolve(__dirname, './mocks/NextImage.js'),
      'next/link': path.resolve(__dirname, './mocks/NextLink.js'),
      'next/router': path.resolve(__dirname, './mocks/NextRouter.js'),
      'next/navigation': path.resolve(__dirname, './mocks/NextNavigation.js'),
      'next/head': path.resolve(__dirname, './mocks/NextHead.js'),
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
                    runtime: 'classic'
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
                    runtime: 'classic'
                  },
                },
              },
            },
          },
        ],
      }
    )
    config.plugins = config.plugins || []
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/react-dom\/test-utils$/, path.resolve(__dirname, './mocks/reactDomTestUtils.js')),
      new webpack.NormalModuleReplacementPlugin(/react-dom\/client$/, path.resolve(__dirname, './mocks/reactDomClient.js'))
    )
    return config
  }
}
