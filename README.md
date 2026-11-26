# mapbiomas-zonal-stats

Zonal statistics of land-use and land-cover classes from the MapBiomas
Collection 9 integration asset in Google Earth Engine.

Given a polygon, the script returns the area of each land-use class for a set of
years, flags classes below the collection's minimum mappable unit, and writes
provenance into every output row.

## What it computes

`ee.Image.pixelArea()` assigns an area in square metres to every pixel.
`ee.Reducer.sum().group()` sums those areas grouped by `class_id`. Each class is
then reported in hectares, together with two quality columns:

- `<class>_ha` — area in hectares.
- `<class>_abaixo_mmu` — `1` when the class exists and its area is below the
  minimum mappable unit, `0` otherwise.
- `extraido_ha` — sum of the areas of the selected classes.
- `nao_atribuido_ha` — `total_ha` minus `extraido_ha`, i.e. how much of the
  area of interest falls outside the selected class list.

## Requirements

A Google Earth Engine account and access to the Code Editor. No local
installation.

## How to run

1. Open the Google Earth Engine Code Editor.
2. Paste `zonal_stats.js`.
3. Edit `CFG` (asset, years, scale, minimum mappable unit) and the
   `CLASS_IDS` list.
4. Set the area of interest. The script ships with a public municipal boundary
   from FAO/GAUL/2015/level2 so the result is reproducible by a reviewer with no
   private assets.
5. Run. Two files are exported to the Drive folder `gee_mapbiomas`: a CSV with
   one row per year and a GeoTIFF with the classified raster.

## Reference run

Municipality of Santo Antônio do Amparo, Minas Gerais, Brazil.
Area: 49,186.59 ha. Seventeen classes, nine years.

| Year | Pasture | Native forest | Mosaic | Coffee | Planted forest | Urban | Unassigned |
| ---- | ------: | ------------: | -----: | -----: | -------------: | ----: | ---------: |
| 1985 | 32,114.03 | 8,680.76 | 5,273.21 | 1,498.44 | 62.48 | 119.84 | 1,748.32 |
| 1990 | 31,744.23 | 8,454.58 | 5,513.47 | 1,905.22 | 60.29 | 179.48 | 0.00 |
| 1995 | 32,952.01 | 8,828.28 | 3,553.96 | 1,882.36 | 211.91 | 270.72 | 0.00 |
| 2000 | 29,586.08 | 9,295.89 | 5,478.92 | 2,391.28 | 248.95 | 335.11 | 0.00 |
| 2005 | 27,470.06 | 9,644.77 | 6,611.48 | 3,032.29 | 339.87 | 358.11 | 0.00 |
| 2010 | 25,764.73 | 9,997.25 | 6,018.27 | 3,840.76 | 1,438.42 | 396.16 | 0.00 |
| 2015 | 21,514.51 | 10,700.64 | 6,723.11 | 5,669.54 | 2,778.98 | 424.01 | 0.00 |
| 2020 | 21,174.25 | 10,527.76 | 6,383.27 | 5,704.32 | 2,695.33 | 448.59 | 0.00 |
| 2023 | 21,063.95 | 10,574.99 | 6,264.45 | 5,705.12 | 2,633.63 | 457.96 | 0.00 |

### What the numbers show

Pasture lost 11,050.08 ha between 1985 and 2023, a 34.4% decline, falling from
65.3% to 42.8% of the municipal area. The area released by pasture was absorbed
by coffee (4,206.68 ha, +280.7%), planted forest (2,571.15 ha, +4,115%), natural
forest regeneration (1,894.23 ha, +21.8%), other temporary crops (1,396.89 ha,
+836.8%) and mosaic areas (991.23 ha, +18.8%).

Urban infrastructure grew from 119.84 ha to 457.96 ha. In absolute terms this is
338.12 ha in 38 years — roughly 3% of what pasture released. Urbanisation is not
the driver of land-use change in this municipality.

In 2023 the four largest classes are pasture (42.82%), native forest (21.50%),
mosaic of agriculture and pasture (12.74%) and coffee (11.60%).

Soy (39), sugarcane (20), flooded field (11) and rocky outcrop (29) are zero in
every year.

## Data quality controls

- Area comes from `pixelArea`, not pixel counting, so partial pixels at polygon
  edges are handled correctly.
- Classes below the minimum mappable unit are flagged, so a reviewer can see
  which values are not reliable.
- `extraido_ha + nao_atribuido_ha = total_ha` holds for every year, with a
  residual of zero apart from floating-point noise in the order of 1e-12.
- The export declares `crs: EPSG:31983` and `scale: 30` explicitly. Nothing is
  left to the engine default.
- Provenance (asset id, scale, minimum mappable unit, CRS, script version, run
  date) is written into every row of the output table.

## Known limitations

- MapBiomas resolution is 30 m. A single pixel covers 0.09 ha. Classes smaller
  than that are not resolved.
- Pixel edges do not follow legal or property boundaries. Edge classes are mixed
  pixels.
- Class areas below the minimum mappable unit must not be read as measured land
  cover.
- MapBiomas assigns a class to every pixel, so with a complete class list the
  unassigned area is zero by construction. A large `nao_atribuido_ha` therefore
  means the `CLASS_IDS` list is incomplete — not that the land is unclassified.
- The classification carries its own accuracy. This script does not re-estimate
  it; refer to the collection ATBD.
- Minimum mappable unit is fixed at 0.5 ha in `CFG`. Confirm the per-class value
  in the collection documentation before using the flags in a regulatory
  context.
- In this reference run every `_abaixo_mmu` flag is 0. This is consistent with
  the current implementation but does not exercise it: the smallest positive
  class area is 0.84 ha, above the 0.5 ha threshold. No case exists in this
  dataset to trigger the flag.

## Version history

- **v1.1** — the Collection 9 integration asset is a single multi-band Image,
  not an ImageCollection. `ee.ImageCollection()` on it fails with
  `Expected asset ... to be an ImageCollection, found 'Image'`. Years are bands
  named `classification_YYYY`, so the script selects a band instead of filtering
  a collection. This also removed a dead branch: `first()` on an empty
  collection returns a band-less image, never `null`, so `if (!image)` could not
  fire.
- **v1.2** — removed `ee.Algorithms.If` and the self-invoking function, which
  are hard to paste and debug. Coverage of 1985–2023 makes the empty-band check
  unnecessary.
- **v1.3** — the municipality name filter used exact equality and returned zero
  features. GAUL spells the name differently from the local convention, so the
  filter now matches on fragments and excludes homonyms.
- **v1.4** — variable names in Portuguese, for local review.
- **v1.5** — added coffee (46) and six other classes, which reduced the
  unassigned area from 7,374.31 ha to zero. Fixed the minimum-mappable-unit
  flag, which previously marked absent classes (area 0) as if they were small
  areas. Added `extraido_ha` and `nao_atribuido_ha`, which exposed a 0.5 ha
  error in v1.4 where the `mmu_ha` parameter was being summed as if it were a
  class.

## Author

Max Lino Machado — Biologist, CRBio 076313/04-D
GitHub: [engenhariaprobatoria-cloud](https://github.com/engenhariaprobatoria-cloud)

## License

MIT. See [LICENSE](LICENSE).
