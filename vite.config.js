import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
// ESM-compatible __dirname replacement
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
// Note: For future deployments to different paths, consider using environment variables:
// base: process.env.VITE_BASE_PATH || '/pst-toolings/',
// This allows flexibility: VITE_BASE_PATH=/ for root deployment, or VITE_BASE_PATH=/custom-path/ for subpaths
export default defineConfig({
    plugins: [react()],
    base: '/pst-toolings/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        emptyOutDir: true,
    },
});
