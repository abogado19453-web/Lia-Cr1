import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  experimental: { serverActions: { bodySizeLimit: '20mb' } },
  outputFileTracingRoot: raiz,
  webpack(config) {
    config.resolve.alias['@'] = path.join(raiz, 'src');
    return config;
  },
};
export default nextConfig;
