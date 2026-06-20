/* eslint-disable */
// One-off: turn the user's 1024x1024 opaque iso-building PNGs into 512x512 RGBA
// cards with the white/cream background removed (flood-fill from the edges), so
// they can be used as transparent billboards in the 3D city.
//
//   node scripts/process-building-images.cjs "<src dir>"
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = process.argv[2] || 'C:/claude code/image collection';
const OUT = path.join(__dirname, '..', 'public', 'estate', 'custom');
const SIZE = 512;
const TOL = 36; // colour distance from the background colour to treat as background

fs.mkdirSync(OUT, { recursive: true });

function downscale(src) {
  // exact box filter (works for any integer-ish ratio; here ~2x)
  const dst = new PNG({ width: SIZE, height: SIZE });
  const sx = src.width / SIZE;
  const sy = src.height / SIZE;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const x0 = Math.floor(x * sx); const x1 = Math.min(src.width, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy); const y1 = Math.min(src.height, Math.floor((y + 1) * sy));
      let r = 0; let g = 0; let b = 0; let n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (src.width * yy + xx) << 2;
        r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++;
      }
      const di = (SIZE * y + x) << 2;
      dst.data[di] = r / n; dst.data[di + 1] = g / n; dst.data[di + 2] = b / n; dst.data[di + 3] = 255;
    }
  }
  return dst;
}

function removeBackground(img) {
  const { width: w, height: h, data } = img;
  // background colour = average of the four corners
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map((p) => p << 2);
  let br = 0; let bg = 0; let bb = 0;
  for (const c of corners) { br += data[c]; bg += data[c + 1]; bb += data[c + 2]; }
  br /= 4; bg /= 4; bb /= 4;
  const isBg = (i) => {
    const dr = data[i] - br; const dg = data[i + 1] - bg; const db = data[i + 2] - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db) < TOL;
  };
  // flood fill from every border pixel
  const visited = new Uint8Array(w * h);
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    if (isBg(p << 2)) { data[(p << 2) + 3] = 0; stack.push(x, y); }
  };
  for (let x = 0; x < w; x++) { pushIf(x, 0); pushIf(x, h - 1); }
  for (let y = 0; y < h; y++) { pushIf(0, y); pushIf(w - 1, y); }
  while (stack.length) {
    const y = stack.pop(); const x = stack.pop();
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
  }
  // soften the alpha edge a touch (1px)
  return img;
}

const files = fs.readdirSync(SRC).filter((f) => /\.png$/i.test(f)).sort();
let idx = 0;
const names = [];
for (const f of files) {
  const src = PNG.sync.read(fs.readFileSync(path.join(SRC, f)));
  const small = downscale(src);
  removeBackground(small);
  const outName = `building-${String(idx + 1).padStart(2, '0')}.png`;
  fs.writeFileSync(path.join(OUT, outName), PNG.sync.write(small));
  names.push(outName);
  console.log(`  ${f} -> custom/${outName}`);
  idx++;
}
console.log(`Done: ${idx} images -> public/estate/custom/`);
console.log(JSON.stringify(names));
