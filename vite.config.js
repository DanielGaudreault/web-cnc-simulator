import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'threejs': ['three'],
                    'vendors': ['js/vendors/orbit-controls.js']
                }
            }
        }
    },
    optimizeDeps: {
        include: ['three']
    }
});
