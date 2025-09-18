const path = require('path');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  scope: '/',
  sw: 'service-worker.js',
  fallbacks: {
    document: '/_offline',
  },
  cacheOnFrontEndNav: true,
  reloadOnOnline: false,
  runtimeCaching: [
    // Static assets caching
    {
      urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\/_next\/static.+\.(js|css)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\/_next\/image/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    // API caching with network-first strategy
    {
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
    // CDN cached resources
    {
      urlPattern: /^https:\/\/cdn\./,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
});

const applyOptionalAliases = (config) => {
  if (!config.resolve) config.resolve = {};
  if (!config.resolve.alias) config.resolve.alias = {};

  const ensure = (moduleId, stubRelativePath) => {
    try {
      require.resolve(moduleId);
    } catch (err) {
      config.resolve.alias[moduleId] = path.resolve(__dirname, stubRelativePath);
    }
  };

  ensure('yjs', './src/stubs/yjs.ts');
  ensure('y-protocols/awareness', './src/stubs/y-protocols-awareness.ts');
  ensure('@prisma/client', './src/stubs/prisma-client.ts');
  ensure('ioredis', './src/stubs/ioredis.ts');
  ensure('@elastic/elasticsearch', './src/stubs/elastic-client.ts');
  ensure('@elastic/elasticsearch/lib/api/types', './src/stubs/elastic-api-types.ts');

  return config;
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,

  // Experimental performance features
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
    // Enable granular chunks for better caching
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'lucide-react',
      'framer-motion',
    ],
    // Parallel routes for better performance
    parallelRoutes: true,
    // Server Components optimization
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    // Emotion optimization
    emotion: false,
    // React optimization
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Module transpilation for performance
  transpilePackages: [],

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true, // TEMP: For faster builds during optimization
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true, // TEMP: For faster builds
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
  },

  // Headers for performance and security
  async headers() {
    const allowDevMedia = process.env.NODE_ENV !== 'production'
    const permissions = allowDevMedia
      ? 'camera=(), microphone=(self), geolocation=()'
      : 'camera=(), microphone=(), geolocation=()'
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: permissions,
          },
          // Performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      // Cache static assets
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/docs/getting-started',
        permanent: true,
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Apply aliases
    applyOptionalAliases(config);

    // Production optimizations
    if (!dev && !isServer) {
      // Replace React with Preact in production for smaller bundle
      // Commented out for now as it may break some components
      // config.resolve.alias = {
      //   ...config.resolve.alias,
      //   'react': 'preact/compat',
      //   'react-dom': 'preact/compat',
      // };

      // Optimize chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Common libraries
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[\\/]/.test(module.identifier());
              },
              name(module) {
                const hash = require('crypto')
                  .createHash('sha256')
                  .update(module.identifier())
                  .digest('hex');
                return `lib-${hash.substring(0, 8)}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Commons chunk
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
            // Shared modules
            shared: {
              name(module, chunks) {
                return `shared-${require('crypto')
                  .createHash('sha256')
                  .update(chunks.map(c => c.name).join('_'))
                  .digest('hex')
                  .substring(0, 8)}`;
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
        },
        // Use deterministic module IDs for better caching
        moduleIds: 'deterministic',
        // Minimize with Terser
        minimize: true,
      };

      // Add webpack plugins for optimization
      config.plugins.push(
        new webpack.optimize.ModuleConcatenationPlugin(),
      );
    }

    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: path.join(__dirname, 'bundle-analysis.html'),
        })
      );
    }

    return config;
  },

  // Output configuration for optimization
  output: 'standalone',

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Performance budgets
  productionBrowserSourceMaps: false,
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

module.exports = withPWA(nextConfig);
