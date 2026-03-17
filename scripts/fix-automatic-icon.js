const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '..', 'icon', 'Automatic.png');
const dest = path.join(__dirname, '..', 'icon', 'Automatic.png');

if (!fs.existsSync(src)) {
  console.error('Automatic.png not found');
  process.exit(1);
}

async function run() {
  const meta = await sharp(src).metadata();
  const w = meta.width || 128;
  const h = meta.height || 128;
  const pad = Math.min(w, h) * 0.15;
  await sharp(src)
    .extend({
      top: Math.round(pad),
      bottom: Math.round(pad),
      left: Math.round(pad),
      right: Math.round(pad),
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile(dest.replace('.png', '_temp.png'));
  fs.renameSync(dest.replace('.png', '_temp.png'), dest);
  console.log('Icon updated with white background');
}

run().catch(e => { console.error(e); process.exit(1); });
