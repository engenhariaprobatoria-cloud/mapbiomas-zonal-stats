# MapBiomas zonal statistics

Area of each land-use class inside an area of interest, per year, using the
MapBiomas Collection 9 integration asset in Google Earth Engine.

## What it computes
`ee.Image.pixelArea()` assigns an area in square metres to every pixel.
`ee.Reducer.sum().group()` sums those areas grouped by `class_id`.
Each class is then reported in hectares and flagged against the collection's
minimum mappable unit.

## How to run
1. Open the Google Earth Engine Code Editor.
2. Paste `zonal_stats.js`.
3. Set `CFG.asset`, `CFG.years` and the area of interest.
4. Run. Two files are exported to your Drive folder `gee_mapbiomas`.

## Data quality controls
- Area is computed from `pixelArea`, not from pixel counting, so partial pixels
  at polygon edges are handled correctly.
- Every class is flagged `_below_mmu` when its area falls under the minimum
  mappable unit. These values are not reliable and are reported as such.
- The export declares `crs: EPSG:31983` and `scale: 30` explicitly.
- Provenance (asset id, collection, scale, script version, run date) is written
  into every row of the output table.

## Known limitations
- MapBiomas resolution is 30 m. A single pixel covers 0.09 ha.
- Pixel edges do not follow legal or property boundaries. Edge classes are
  mixed pixels.
- Class areas below the minimum mappable unit must not be interpreted as
  measured land cover.
- The classification carries its own accuracy; this script does not re-estimate
  it. Refer to the collection ATBD.

## Author
Max Lino Machado - Biologist, CRBio 076313/04-D