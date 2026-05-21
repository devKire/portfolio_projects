import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gudqtxvqbcdmtamnilpl.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '1hcgs7spbatxhpzg.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;
