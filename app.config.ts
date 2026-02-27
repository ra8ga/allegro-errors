import { defineConfig } from '@tanstack/react-start/config'

export default defineConfig({
    server: {
        preset: 'cloudflare-module',
        // Use 'dist' layout matching the monorepo pattern
        output: {
            dir: 'dist',
            publicDir: 'dist/client',
            serverDir: 'dist/server',
        },
    },
})
