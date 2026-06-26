# Estate map — Quaternius buildings

Extra low-poly buildings mixed into the district building pools
(`DISTRICT_BUILDINGS` in `src/pages/academy/cityModels.js`) for skyline variety.
These are multi-material, so they render via `MultiMatInstancedModel` /
`extractParts` to keep their colours when GPU-instanced.

- **Author:** Quaternius (https://quaternius.com)
- **License:** **CC0 1.0 Universal** (public domain). Free for personal and
  commercial use, no attribution required. Given here as a courtesy.
- **Packs:** "Buildings" (`q-building1-large`, `q-building2-large`,
  `q-building3-big`, `q-house1`), "Modular Buildings" (`q-4story`,
  `q-2story-sign`, `q-6story-stack`) and "Modular Streets" — modern road signs
  (`sign-stop`, `sign-noparking`, `sign-triangle`).
- Vendored as GLB (mirrored from the `trebeljahr/quaternius-showcase` repo).

## Additional packs (added for world variety)

All Quaternius, all **CC0 1.0** (public domain, no attribution required),
mirrored from the same `trebeljahr/quaternius-showcase` repo. Multi-material, so
they render via `MultiMatInstancedModel` / `extractParts`.

- **`medieval/`** — "Medieval Village Pack". Real 3D buildings for the Heritage
  quarter (replacing the flat isometric billboards): `House_1`–`House_4`, `Inn`,
  `Blacksmith`, `Mill`, `Stable`, `Bell_Tower`, plus props `Well`, `Gazebo`,
  `MarketStand_1`.
- **`animals/`** — "Animated Animals Pack". Scattered across the countryside,
  forest and farmland (rendered static, in bind pose): `Cow`, `Deer`, `Horse`,
  `Stag`, `Alpaca`, `Fox`.
- **`more/`** — "Buildings Pack 2/3". Extra modern buildings mixed into the
  district pools: `Building1_Small`, `Building2_Small`, `Building3_Small`,
  `Building4`, `House2`, `2Story_Balcony`, `3Story_Balcony`.

## More packs (themed districts + landmarks)

Same author/licence/source (Quaternius, **CC0 1.0**, mirrored from
`trebeljahr/quaternius-showcase`). Multi-material → `MultiMatInstancedModel`.

- **`future/`** — "Ultimate Space Kit". Futuristic colony buildings for the
  outer **Frontier** ring (`Building_L`, `Base_Large`, `GeodesicDome`,
  `House_Cylinder`, `House_Long/Open/Single`, `House_Single_Support`,
  `Connector`). Draco-compressed; drei `useGLTF` decodes them.
- **`castle/`** — "Modular Medieval (Castle)". Stone towers mixed into the
  Heritage quarter (`LargeTower`, `PointyTower`, `Watchtower`, `WatchTowerWRoof`,
  `LargeSquareTowerBricks`, `SimpleTowerBricks`).
