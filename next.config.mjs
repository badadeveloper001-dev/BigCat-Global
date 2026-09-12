import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
    ],
  },
}

const sentryOptions = {
  // Suppresses the Sentry CLI update nag
  silent: true,
  // Only upload source maps when SENTRY_AUTH_TOKEN is set
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Disable source map upload if token not provided
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Disable telemetry (not needed)
  telemetry: false,
}

// Keep unconfigured local builds free of Sentry webpack hooks.
export default (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_AUTH_TOKEN) ? withSentryConfig(nextConfig, sentryOptions) : nextConfig
