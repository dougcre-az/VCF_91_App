import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** HtmlService cannot execute ES modules or modulepreload. Flatten to a classic script. */
function gasHtmlService() {
  return {
    name: 'gas-htmlservice',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const lower = path.join(distDir, 'index.html');
      const upper = path.join(distDir, 'Index.html');
      if (!fs.existsSync(lower) && !fs.existsSync(upper)) {
        throw new Error('Vite build did not emit dist/index.html');
      }
      const srcPath = fs.existsSync(lower) ? lower : upper;
      let html = fs.readFileSync(srcPath, 'utf8');
      html = html.replace(/<link rel="modulepreload"[^>]*>\s*/gi, '');
      html = html.replace(/\s+crossorigin(?:="[^"]*")?/gi, '');
      html = html.replace(/<script(\s[^>]*)?type=["']module["']/gi, '<script$1');
      html = html.replace(/<script\s+>/g, '<script>');
      if (!/<base\s/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  <base target="_top">`);
      }
      // Classic scripts in <head> run before #root exists. HtmlService needs them at end of <body>.
      const scriptRe = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
      const scripts = html.match(scriptRe) || [];
      if (scripts.length) {
        html = html.replace(scriptRe, '');
        if (/<\/body>/i.test(html)) {
          html = html.replace(/<\/body>/i, `${scripts.join('\n')}\n</body>`);
        } else {
          html += scripts.join('\n');
        }
      }
      fs.writeFileSync(srcPath, html);
      fs.writeFileSync(upper, html);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile({
      useRecommendedBuildConfig: true,
      removeViteModuleLoader: true,
    }),
    gasHtmlService(),
  ],
  css: {
    postcss: './postcss.config.cjs',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
