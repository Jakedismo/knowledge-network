const path = require('path');

// PWA configuration - temporarily simplified for compatibility
const withPWA = process.env.NODE_ENV === 'production'
  ? require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: false,
      buildExcludes: [/middleware-manifest\.json$/],
      scope: '/',
      sw: 'service-worker.js',
      fallbacks: {
        document: '/_offline',
      },
      cacheOnFrontEndNav: true,
      reloadOnOnline: false,
      runtimeCaching: [
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
      urlPattern: /\/_next\/static.+\.js$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-js',
        expiration: {
          maxEntries: 50,
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
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
    })
  : (config) => config; // Pass through config in development

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
  // External packages configuration for server components
  serverExternalPackages: ['@prisma/client'],

  // TypeScript configuration
  typescript: {
    // TEMP: Allow builds to pass while Phase 1 TS strictness fixes land
    // NOTE: Keep `tsc --noEmit` in CI to track errors separately.
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    // Allow builds to succeed while we fix lint issues in parallel
    ignoreDuringBuilds: true,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security
  async headers() {
    const allowDevMedia = process.env.NODE_ENV !== 'production'
    const permissions = allowDevMedia
      ? 'camera=(), microphone=(self), geolocation=()'
      : 'camera=(), microphone=(), geolocation=()'
    return [
      {
        source: '/(.*)',
        headers: [
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

  webpack: (config) => {
    applyOptionalAliases(config);

    if (process.env.ANALYZE === 'true') {
      const withAnalyzer = require('@next/bundle-analyzer')();
      config.plugins.push(new withAnalyzer({ enabled: true }));
    }

    return config;
  },
};

module.exports = withPWA(nextConfig);
