// =====================================================================
// MapBiomas zonal statistics - area by land-use class, with QC flags
// Author  : Max Lino Machado - Biologist, CRBio 076313/04-D
// Version : 1.0
// Runs in : Google Earth Engine Code Editor (JavaScript API)
// License : MIT
// =====================================================================

// ------------------------------ 1. CONFIG ------------------------------

var CFG = {
  asset   : 'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1',
  years   : [1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2023],
  scale   : 30,                 // MapBiomas native resolution, metres
  mmu_ha  : 0.5,                // minimum mappable unit - confirm per class in the collection ATBD
  epsg    : 'EPSG:31983',       // SIRGAS 2000 / UTM 23S
  version : '1.0',
  runDate : '2026-11-26'
};

var MB = ee.ImageCollection(CFG.asset);

// Class ids analysed here. Edit the list to match your own question.
var CLASS_IDS = [3, 4, 9, 12, 15, 21, 24, 25, 30, 33];

// Distinct colour per class. The original script reused one colour for four
// classes, which erases forest boundaries on the map.
var CLASS_COLORS = [
  '1f8d49', '7dc975', '7a5900', 'd6bc74', 'edde8e',
  'ffefc3', 'd4271e', 'db4d4f', '9c0027', '2532e4'
];

// ------------------------------ 2. AREA OF INTEREST ------------------------------
// Option A - your own asset:
//   var AOI = ee.FeatureCollection('users/YOUR_ACCOUNT/your_public_polygon');
//
// Option B - public municipal boundary, reproducible by any reviewer:
var AOI = ee.FeatureCollection('FAO/GAUL/2015/level2')
  .filter(ee.Filter.eq('ADM1_NAME', 'Minas Gerais'))
  .filter(ee.Filter.eq('ADM2_NAME', 'Santo Antonio do Amparo'));

// Verify the string before running. If size is 0, the name differs.
print('AOI feature count:', AOI.size());
print('Sample ADM2 names in Minas Gerais:',
  ee.FeatureCollection('FAO/GAUL/2015/level2')
    .filter(ee.Filter.eq('ADM1_NAME', 'Minas Gerais'))
    .limit(20)
    .aggregate_array('ADM2_NAME'));

// ------------------------------ 3. HELPERS ------------------------------

// Converts the grouped reducer output into one Dictionary keyed by class_id.
var groupsToDict = function (groups) {
  groups = ee.List(groups);
  var keys = groups.map(function (g) {
    return ee.Number(ee.Dictionary(g).get('class_id')).format('%d');
  });
  var values = groups.map(function (g) {
    return ee.Number(ee.Dictionary(g).get('sum')); // square metres
  });
  return ee.Dictionary.fromLists(keys, values);
};

// ------------------------------ 4. AREA BY CLASS, PER YEAR ------------------------------

var rowForYear = function (year) {
  var img = ee.Image(MB.filter(ee.Filter.eq('year', year)).first());

  // first() on an empty collection returns an image with zero bands.
  var isEmpty = img.bandNames().size().eq(0);

  var props = ee.Dictionary(ee.Algorithms.If(
    isEmpty,
    {year: year, has_data: 0},
    (function () {
      var groups = ee.Image.pixelArea()
        .addBands(img.select('classification'))
        .reduceRegion({
          reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class_id'}),
          geometry: AOI,
          scale: CFG.scale,
          maxPixels: 1e13,
          bestEffort: false
        })
        .get('groups');

      var dict = groupsToDict(groups);
      var total_m2 = ee.Number(dict.values().reduce(ee.Reducer.sum()));

      var out = ee.Dictionary({
        year: year,
        has_data: 1,
        total_ha: total_m2.divide(10000),
        total_px: total_m2.divide(CFG.scale * CFG.scale)
      });

      CLASS_IDS.forEach(function (id) {
        var ha = ee.Number(dict.get(ee.Number(id).format('%d'), 0)).divide(10000);
        out = out.set('c' + id + '_ha', ha);
        out = out.set('c' + id + '_below_mmu', ha.lt(CFG.mmu_ha));
      });

      return out;
    })()
  ));

  return ee.Feature(null, props);
};

var table = ee.FeatureCollection(CFG.years.map(rowForYear));

// Provenance travels with the data, not with your memory.
var tableWithMeta = table.map(function (f) {
  return f.set({
    collection      : 'MapBiomas Collection 9',
    asset_id        : CFG.asset,
    scale_m         : CFG.scale,
    mmu_ha          : CFG.mmu_ha,
    crs             : CFG.epsg,
    aoi             : 'FAO GAUL 2015 level 2 - Santo Antonio do Amparo/MG',
    script_version  : CFG.version,
    run_date        : CFG.runDate
  });
});

print('Result table (first rows):', tableWithMeta.limit(5));

// ------------------------------ 5. MAP + LEGEND ------------------------------

var LAST_YEAR = CFG.years[CFG.years.length - 1];
var lastImg = ee.Image(MB.filter(ee.Filter.eq('year', LAST_YEAR)).first())
  .select('classification');

var remapped = lastImg.remap(CLASS_IDS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

Map.addLayer(remapped.clip(AOI), {min: 1, max: 10, palette: CLASS_COLORS},
  'Land use / cover ' + LAST_YEAR, true);
Map.addLayer(AOI, {color: 'red'}, 'Area of interest', false);
Map.centerObject(AOI, 11);

// ------------------------------ 6. EXPORT ------------------------------

Export.table.toDrive({
  collection    : tableWithMeta,
  description   : 'mapbiomas_zonal_stats_v1',
  folder        : 'gee_mapbiomas',
  fileNamePrefix: 'mapbiomas_zonal_stats_v1',
  fileFormat    : 'CSV'
});

Export.image.toDrive({
  image         : lastImg.clip(AOI).byte(),
  description   : 'mapbiomas_lulc_' + LAST_YEAR + '_v1',
  folder        : 'gee_mapbiomas',
  fileNamePrefix: 'mapbiomas_lulc_' + LAST_YEAR + '_v1',
  scale         : CFG.scale,
  crs           : CFG.epsg,
  region        : AOI.geometry().bounds(),
  maxPixels     : 1e13
});
