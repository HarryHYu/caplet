// Client-side plot derivation. At v5 scale (~50k plots) the server only sends
// OWNED rows + landmark deeds; every unowned plot is reconstructed here from
// `layout.cells` + `layout.districtGeo` using the SAME deterministic rules
// (and the same y-outer/x-inner scan order for lot numbering) as
// backend/services/cityPlan.js. If you change pricing or districts, change
// BOTH sides.
import { hashCell } from './cityModels.js';

const inRect = (x, y, r) => r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

export function derivePlots(layout) {
  const { gridW, gridH, cells, districtGeo: geo } = layout;
  const grid = cells.split('\n');
  const at = (x, y) => (x >= 0 && x < gridW && y >= 0 && y < gridH ? grid[y][x] : null);

  const districtFor = (x, y) => {
    if (inRect(x, y, geo.industrial)) return 'Industrial';
    if (inRect(x, y, geo.oldTown)) return 'Old Town';
    const r = Math.max(Math.abs(x - geo.cc), Math.abs(y - geo.cc));
    for (const [rad, name] of geo.radii) if (r <= rad) return name;
    return geo.outer;
  };

  const list = [];
  const byKey = new Map();
  let counter = 0;
  for (let y = 0; y < gridH; y += 1) {
    for (let x = 0; x < gridW; x += 1) {
      if (grid[y][x] !== '.') continue;
      const district = districtFor(x, y);
      const d = geo.pricing[district];
      const variety = hashCell(x, y) % 5;
      let price = d.base + variety * d.step;
      const wf = (xx, yy) => ['W', 'S'].includes(at(xx, yy));
      if (wf(x + 1, y) || wf(x - 1, y) || wf(x, y + 1) || wf(x, y - 1) || wf(x + 2, y) || wf(x - 2, y)) {
        price = Math.round(price * geo.waterfrontMult);
      }
      counter += 1;
      const plot = {
        key: `${x},${y}`,
        gridX: x,
        gridY: y,
        neighborhood: district,
        tier: d.tier,
        name: `${district} Lot #${counter}`,
        price,
        marketValue: price,
        owner: null,
        mine: false,
        houseStyle: 'cottage',
        houseColor: '#cbd5e1',
      };
      list.push(plot);
      byKey.set(plot.key, plot);
    }
  }
  return { list, byKey };
}

// Merge the server's owned/deed rows over the derived map. Returns accessors
// the page and the 3D map share.
export function mergePlots(derived, serverRows) {
  const ownedByKey = new Map();
  for (const row of serverRows) {
    ownedByKey.set(`${row.gridX},${row.gridY}`, { ...row, key: `${row.gridX},${row.gridY}` });
  }
  const plotAt = (key) => ownedByKey.get(key) || derived.byKey.get(key) || null;
  return { ownedByKey, plotAt };
}
