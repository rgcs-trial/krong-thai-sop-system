/**
 * Type declarations for next-pwa
 */

declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAConfig {
    dest: string;
    register: boolean;
    skipWaiting: boolean;
    disable?: boolean;
    scope?: string;
    sw?: string;
    reloadOnOnline?: boolean;
    cacheStartUrl?: boolean;
    dynamicStartUrl?: boolean;
    workboxOptions?: {
      disableDevLogs?: boolean;
      cleanupOutdatedCaches?: boolean;
      skipWaiting?: boolean;
      clientsClaim?: boolean;
      maximumFileSizeToCacheInBytes?: number;
    };
    runtimeCaching?: Array<{
      urlPattern: RegExp | string | ((context: { request: Request; url: URL }) => boolean);
      handler: string;
      options?: {
        cacheName: string;
        expiration?: {
          maxEntries: number;
          maxAgeSeconds: number;
        };
        cacheKeyWillBeUsed?: (context: { request: Request }) => Promise<string>;
        networkTimeoutSeconds?: number;
      };
    }>;
  }
  
  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}