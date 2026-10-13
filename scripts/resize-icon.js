/**
 * Resize RDN STREET STOCK MARKET icon so the logo fills ~80% of a 1024x1024 black canvas.
 *
 * Usage: node scripts/resize-icon.js
 */

/* eslint-disable no-undef */
const sharp = require('sharp');
const path = require('path');

const INPUT = path.resolve(__dirname, '../assets/images/rdnstreetstockmarket-icon.png');
const OUTPUT = INPUT;
const CANVAS = 1024;
const LOGO_SIZE = Math.round(CANVAS * 0.80); // 819

async function main() {
  console.log('Reading original icon…');
  const meta = await sharp(INPUT).metadata();
  console.log(`Original size: ${meta.width}x${meta.height}, format: ${meta.format}`);

  // Step 1: trim dark border to isolate the logo, output as PNG buffer
  const trimmedBuf = await sharp(INPUT)
    .trim({ background: '#000000', threshold: 20 })
    .png()
    .toBuffer();

  const trimMeta = await sharp(trimmedBuf).metadata();
  console.log(`Trimmed size: ${trimMeta.width}x${trimMeta.height}`);

  // Step 2: resize trimmed logo to fit inside LOGO_SIZE x LOGO_SIZE, output as PNG buffer
  const resizedBuf = await sharp(trimmedBuf)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'inside', background: '#000000' })
    .png()
    .toBuffer();

  const resizeMeta = await sharp(resizedBuf).metadata();
  console.log(`Resized logo: ${resizeMeta.width}x${resizeMeta.height}`);

  const centreLeft = Math.round((CANVAS - resizeMeta.width) / 2);
  const centreTop = Math.round((CANVAS - resizeMeta.height) / 2);

  // Step 3: composite centred on a 1024x1024 black canvas
  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: resizedBuf, left: centreLeft, top: centreTop }])
    .png()
    .toFile(OUTPUT);

  console.log(`Done! Icon saved to ${OUTPUT}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
