// @ts-nocheck
import { defineConfig } from 'astro/config';

import 'dotenv/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import playformCompress from '@playform/compress'
import path from 'path';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '@styles':path.resolve('../../packages/styles'),
      }
    }
  },
  integrations: [sanity(
    { projectId: '366sb9yi',
      dataset: 'production',
      useCdn: false,
      apiVersion: '2025-01-28',
      studioBasePath: '/admin',
    }
  ), react(), playformCompress()],

  output: 'server',
  adapter: vercel(),
});