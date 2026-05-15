import { defineConfig } from "vite"
import { builtinModules } from 'module'

export default defineConfig({
  ssr: {
    noExternal: true, // bundle every dependency
  },
  build: {
    target: 'node24',           // match your Node.js version
    outDir: 'build-server',
    emptyOutDir: false,         // don't wipe the frontend build output
    ssr: true,                  // tells Vite this is a server-side build
    minify: 'esbuild',          // minify the output
    lib: {
      entry: 'server.js',       // your server entry point
      formats: ['es'],
      fileName: () => 'server.js',
    },
    rollupOptions: {
      // Externalize only Node.js built-ins, bundle everything else
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
    },
  },
})
