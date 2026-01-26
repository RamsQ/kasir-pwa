import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            devOptions: {
                enabled: true,
                type: 'module'
            },
            workbox: {
                // 1. Matikan navigateFallback agar tidak mencari /index.php di aset statis
                navigateFallback: null,
                
                // 2. Tentukan aset statis yang akan di-cache (pre-caching)
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                
                // 3. Gunakan Runtime Caching untuk menangani navigasi halaman Laravel
                runtimeCaching: [
                    {
                        // Menangani navigasi halaman (HTML/Inertia responses)
                        urlPattern: ({ request }) => request.mode === 'navigate',
                        handler: 'NetworkFirst', // Coba jaringan dulu, jika gagal gunakan cache
                        options: {
                            cacheName: 'pages-cache',
                            networkTimeoutSeconds: 3, // Tunggu jaringan selama 3 detik sebelum fallback ke cache
                            expiration: {
                                maxEntries: 50,
                            },
                        },
                    },
                    {
                        // Menangani aset gambar atau eksternal lainnya
                        urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 60,
                                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
                            },
                        },
                    },
                ],
            },
            manifest: {
                name: 'Kasir PWA',
                short_name: 'Kasir',
                description: 'Aplikasi Kasir Digital PWA',
                theme_color: '#4B5563',
                background_color: '#f8fafc',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/assets/icon/logo-52.svg',
                        sizes: '52x52',
                        type: 'image/svg+xml'
                    },
                    {
                        src: '/assets/icon/Logo.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/assets/icon/Logo.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    }
                ]
            }
        })
    ],
    build: {
        chunkSizeWarningLimit: 1600,
    },
});