/*
  Generate Capacitor assets from existing SVG logo.
  - Reads public/bimi-logo.svg
  - Produces assets/icon.png (1024x1024)
  - Produces assets/splash.png (2732x2732)
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  const svgPath = path.resolve(__dirname, '..', 'public', 'bimi-logo.svg');
  const assetsDir = path.resolve(__dirname, '..', 'assets');
  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG not found at ${svgPath}`);
  }
  await ensureDir(assetsDir);

  const svgBuffer = await fs.promises.readFile(svgPath);

  // ICON 1024x1024, white background, centered logo
  const iconSize = 1024;
  const iconLogoSize = Math.round(iconSize * 0.74); // leave padding
  const iconBg = await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const iconLogo = await sharp(svgBuffer)
    .resize(iconLogoSize, iconLogoSize, { fit: 'contain' })
    .png()
    .toBuffer();

  const icon = await sharp(iconBg)
    .composite([
      {
        input: iconLogo,
        left: Math.round((iconSize - iconLogoSize) / 2),
        top: Math.round((iconSize - iconLogoSize) / 2),
      },
    ])
    .png()
    .toBuffer();

  await fs.promises.writeFile(path.join(assetsDir, 'icon.png'), icon);

  // SPLASH 2732x2732, white background, centered logo ~38%
  const splashSize = 2732;
  const splashLogoSize = Math.round(splashSize * 0.38);
  const splashBg = await sharp({
    create: {
      width: splashSize,
      height: splashSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const splashLogo = await sharp(svgBuffer)
    .resize(splashLogoSize, splashLogoSize, { fit: 'contain' })
    .png()
    .toBuffer();

  const splash = await sharp(splashBg)
    .composite([
      {
        input: splashLogo,
        left: Math.round((splashSize - splashLogoSize) / 2),
        top: Math.round((splashSize - splashLogoSize) / 2),
      },
    ])
    .png()
    .toBuffer();

  await fs.promises.writeFile(path.join(assetsDir, 'splash.png'), splash);

  // Optional: also place monochrome foreground for adaptive icons
  await fs.promises.writeFile(path.join(assetsDir, 'icon-foreground.png'), iconLogo);

  // Provide a minimal JSON manifest for @capacitor/assets v3+ autodiscovery
  const manifest = {
    images: {
      icon: 'assets/icon.png',
      splash: 'assets/splash.png',
      'icon-foreground': 'assets/icon-foreground.png',
    },
  };
  await fs.promises.writeFile(
    path.join(assetsDir, 'assets.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Done
  // eslint-disable-next-line no-console
  console.log('Assets generated in ./assets');
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


