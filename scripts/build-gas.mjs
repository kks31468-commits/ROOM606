import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist-gas');
const gasDir = path.resolve(rootDir, 'gas');

async function buildGasHtml() {
  fs.rmSync(outDir, { recursive: true, force: true });

  await build({
    root: rootDir,
    mode: 'production',
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 1024 * 1024,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true,
          entryFileNames: 'assets/app.js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  });

  const indexHtmlPath = path.join(outDir, 'index.html');
  const rawHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  const assetsDir = path.join(outDir, 'assets');
  const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];

  const cssParts = assetFiles
    .filter((f) => f.endsWith('.css'))
    .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf8'));

  const jsParts = assetFiles
    .filter((f) => f.endsWith('.js'))
    .map((f) =>
      fs
        .readFileSync(path.join(assetsDir, f), 'utf8')
        .replace(/<\/script>/gi, '<\\/script>')
    );

  const scheduleImgPath = path.resolve(
    rootDir,
    'public/assets/aistudio/AISelect_20261109_104523_Drive_75742c06.jpg'
  );
  let scheduleImgScript = '';
  if (fs.existsSync(scheduleImgPath)) {
    const imgB64 = fs.readFileSync(scheduleImgPath).toString('base64');
    scheduleImgScript = `<script>window.__M66_GAS_SCHEDULE_IMG__="data:image/jpeg;base64,${imgB64}";</script>\n    `;
  }

  let headContent = rawHtml
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/gi, '')
    .replace(/<link[^>]*rel="stylesheet"[^>]*href="\/assets\/[^"]*"[^>]*>/gi, '');

  const styleBlock = cssParts.length
    ? `<style>\n${cssParts.join('\n')}\n</style>\n  </head>`
    : '</head>';

  headContent = headContent.replace('</head>', () => styleBlock);

  const appScript = `${scheduleImgScript}<script>\n${jsParts.join('\n')}\n</script>\n  </body>`;
  const finalHtml = headContent.replace('</body>', () => appScript);

  fs.mkdirSync(gasDir, { recursive: true });
  const targetHtmlPath = path.join(gasDir, 'Index.html');
  fs.writeFileSync(targetHtmlPath, finalHtml, 'utf8');

  fs.rmSync(outDir, { recursive: true, force: true });

  const sizeKb = (Buffer.byteLength(finalHtml, 'utf8') / 1024).toFixed(1);
  console.log(`Built gas/Index.html successfully (${sizeKb} KB)`);
}

buildGasHtml().catch((err) => {
  console.error('Failed to build GAS bundle:', err);
  process.exit(1);
});
