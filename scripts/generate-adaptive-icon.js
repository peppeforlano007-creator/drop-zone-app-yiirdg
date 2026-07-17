// scripts/generate-adaptive-icon.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
/* global __dirname */

const INPUT = path.join(__dirname, '../assets/images/95CE18FD-0FF0-4419-B1D2-85A9F1D7815D.png');
const OUTPUT = path.join(__dirname, '../assets/images/adaptive-icon-foreground.png');
const CANVAS = 1024;
const LOGO_SIZE = Math.round(CANVAS * 0.60); // 60% of canvas

async function main() {
  const resized = await sharp(INPUT)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const padding = Math.round((CANVAS - LOGO_SIZE) / 2);

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: resized, top: padding, left: padding }])
  .png()
  .toFile(OUTPUT);

  console.log('Done:', OUTPUT);
}

main().catch(console.error);
