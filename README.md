# mapbiomas-zonal-stats
# MapBiomas zonal statistics  Area of each land-use class inside an area of interest, per year, using the MapBiomas Collection 9 integration asset in Google Earth Engine.  ## What it computes `ee.Image.pixelArea()` assigns an area in square metres to every pixel. `ee.Reducer.sum().group()` sums those areas grouped by `class_id`. 
