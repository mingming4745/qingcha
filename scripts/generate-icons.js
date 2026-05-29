import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgBuffer = readFileSync('public/favicon.svg');

async function generateIcons() {
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');

  console.log('Icons generated: icon-192.png, icon-512.png');
}

generateIcons().catch(console.error);
