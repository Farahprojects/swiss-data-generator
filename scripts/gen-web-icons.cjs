/*
  Regenerate PWA/web icons from assets/icon.png
  - Outputs WebP icons to ./icons at standard sizes
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function generateWebIcons() {
  const srcPath = path.resolve(__dirname, '..', 'assets', 'icon.png');
  const outDir = path.resolve(__dirname, '..', 'icons');
  const sizes = [48, 72, 96, 128, 192, 256, 512];

  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source icon not found at ${srcPath}`);
  }

  await ensureDir(outDir);

  const base = sharp(srcPath)
    .flatten({ background: '#ffffff' }) // remove any transparency with white
    .removeAlpha();

  await Promise.all(
    sizes.map(async (size) => {
      const outPath = path.join(outDir, `icon-${size}.webp`);
      const pipeline = base.clone().resize(size, size, { fit: 'cover' }).webp({ quality: 95 });
      await pipeline.toFile(outPath);
    })
  );

  // eslint-disable-next-line no-console
  console.log('Web icons generated in ./icons');
}

generateWebIcons().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


