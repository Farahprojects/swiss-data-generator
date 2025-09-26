import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine entry point based on mode
  const isMobile = mode === 'mobile';
  const entry = isMobile ? 'src/main.mobile.tsx' : 'src/main.web.tsx';
  
  return {
    server: {
      host: "::",
      port: 8080,
      cors: {
        origin: true,
        credentials: true
      }
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    worker: {
      format: 'es'
    },
    optimizeDeps: {
      exclude: ['src/workers/audio/ConversationAudioProcessor.js']
    },
    build: {
      rollupOptions: {
        input: entry,
        // Externalize Capacitor modules only for web builds
        external: isMobile ? [] : [
          '@capacitor/app',
          '@capacitor/browser',
          '@capacitor/core'
        ]
      }
    }
  };
});
