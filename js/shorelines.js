var FADE_MS = 1000
var MAX_GEOJSON_OPACITY = 0.85

function polygonToBounds (polygon) {
  var outerRing = polygon.coordinates[0]

  var bounds = outerRing.reduce(function (bounds, coord) {
    return bounds.extend(coord)
  }, new mapboxgl.LngLatBounds(outerRing[0], outerRing[0]))

  return bounds
}

var featuresById = {}
geojson.features.forEach(function (feature) {
  feature.properties.bounds = polygonToBounds(feature.geometry)

  // extend(obj)

  featuresById[feature.properties.id] = feature
})

function getFeature (areaId) {
  var feature = featuresById[areaId]

  if (!feature) {
    console.error('Feature not found:', areaId)
  }

  return feature
}

function forEach (array, callback) {
  for (var index = 0; index < array.length; index++) {
    callback.call(array[index], index)
  }
}

function getBounds (areaId) {
  var feature = getFeature(areaId)

  if (feature) {
    return feature.properties.bounds
  }
}

function addScrollListeners () {
  forEach(document.querySelectorAll('.trigger-area'), function () {
    var areaId = this.getAttribute('data-area-id')
    var elementWatcher = scrollMonitor.create(this)

    elementWatcher.enterViewport(function () {
      fitBounds(getBounds(areaId))
    })
  })

  forEach(document.querySelectorAll('.trigger-geojson'), function () {
    var areaId = this.getAttribute('data-area-id')
    var feature = getFeature(areaId)
    var elementWatcher = scrollMonitor.create(this)

    if (!feature) {
      return
    }

    elementWatcher.enterViewport(function () {
      showGeoJSON(feature.geometry)
    })

    elementWatcher.exitViewport(function () {
      hideGeoJSON()
    })
  })

  forEach(document.querySelectorAll('.trigger-mapwarper'), function () {
    var mapId = this.getAttribute('data-map-id')
    var areaId = this.getAttribute('data-area-id')

    var elementWatcher = scrollMonitor.create(this)

    elementWatcher.enterViewport(function () {
      showMapWarperMap(mapId)
      fitBounds(getBounds(areaId))
    })
    elementWatcher.exitViewport(function () {
      hideMapWarperMap()
    })
  })

  forEach(document.querySelectorAll('.trigger-overview'), function () {
    var elementWatcher = scrollMonitor.create(this)

    elementWatcher.enterViewport(function () {
      flyTo([-73.9414, 40.7703], 11)
      showGeoJSON(geojson)
    })

    elementWatcher.exitViewport(function () {
      hideGeoJSON()
    })
  })
}

function fitBounds (bounds) {
  if (!bounds) {
    return
  }

  map.fitBounds(bounds, {
    padding: 100
  })
}

function flyTo (center, zoom) {
  map.flyTo({
    center: center,
    zoom: zoom
  })
}

var geojsonTimeout

function showGeoJSON (geometry) {
  if (geojsonTimeout) {
    clearTimeout(geojsonTimeout)
  }

  if (geometry.type !== 'Point') {
    map.getSource('geojson').setData(geometry)

    map.setPaintProperty('geojson', 'line-opacity', MAX_GEOJSON_OPACITY)
    map.setLayoutProperty('geojson', 'visibility', 'visible')
  }
}

function hideGeoJSON () {
  map.setPaintProperty('geojson', 'line-opacity', 0)
  geojsonTimeout = setTimeout(function() {
    geojsonTimeout = undefined
    map.setLayoutProperty('geojson', 'visibility', 'none')
  }, FADE_MS)
}

function showMapWarperMap (mapId) {
  if (map.getLayer('mapwarper')) {
    hideMapWarperMap(true)
  }

  if (mapId) {
    map.addSource('mapwarper', {
      type: 'raster',
      tileSize: 256,
      tiles: [
        'http://maps.nypl.org/warper/maps/tile/' + mapId + '/{z}/{x}/{y}.png'
      ]
    })

    map.addLayer({
      id: 'mapwarper',
      type: 'raster',
      source: 'mapwarper',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0,
        'raster-opacity-transition': {
          duration: FADE_MS / 4
        }
      }
    })

    map.setPaintProperty('mapwarper', 'raster-opacity', 1)
  }
}

function hideMapWarperMap (immediately) {
  if (map.getLayer('mapwarper')) {
    map.setPaintProperty('mapwarper', 'raster-opacity', 0)

    if (immediately) {
      map.removeLayer('mapwarper')
      map.removeSource('mapwarper')
    } else {
      setTimeout(function() {
        hideMapWarperMap(true)
      }, FADE_MS)
    }
  }
}

mapboxgl.accessToken = 'pk.eyJ1IjoibnlwbGxhYnMiLCJhIjoiSFVmbFM0YyJ9.sl0CRaO71he1XMf_362FZQ'

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/nypllabs/cj9n35rvp33g52srug5gwa98c',
  center: [-73.98579, 40.71571],
  zoom: 14
})

var navigationControl = new mapboxgl.NavigationControl()
var navigationControlEnabled = false

map.scrollZoom.disable()
map.boxZoom.disable()
map.dragRotate.disable()
map.touchZoomRotate.disable()



function disableMapInteraction () {
  map.keyboard.disable()
  map.doubleClickZoom.disable()
  map.dragPan.disable()

  if (navigationControlEnabled) {
    map.removeControl(navigationControl)
  }

  navigationControlEnabled = false
}

function enableMapInteraction () {
  map.keyboard.enable()
  map.doubleClickZoom.enable()
  map.dragPan.enable()

  if (!navigationControlEnabled) {
    map.addControl(navigationControl)
  }

  navigationControlEnabled = true
}

enableMapInteraction()

map.on('load', function () {
  map.addSource('geojson', {
    type: 'geojson',
    data: geojson
  })

  map.addLayer({
    id: 'geojson',
    type: 'line',
    source: 'geojson',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
      'visibility': 'none'
    },
    paint: {
      'line-color': '#F99B21',
      // 'line-color': '#CB430E',
      'line-opacity': MAX_GEOJSON_OPACITY,
      'line-width': {
        base: 1,
        stops: [
          [
            12,
            4
          ],
          [
            15,
            30
          ]
        ]
      },
      'line-opacity-transition': {
        duration: FADE_MS
      }
    }
  })

  map.addLayer({
    id: 'geojson-fill',
    type: 'fill',
    source: 'geojson',
    layout: {},
    paint: {
      'fill-color': '#F99B21',
      'fill-opacity': 0.1
    }
  })

  map.on('click', 'geojson-fill', function (e) {
    var areaId = e.features[0].properties.id
    document.getElementById(areaId).scrollIntoView()
  })

  map.on('mouseenter', 'geojson-fill', function () {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'geojson-fill', function () {
    map.getCanvas().style.cursor = ''
  })

  addScrollListeners()
})

forEach(document.querySelectorAll('.opacity-slider'), function () {
  this.addEventListener('input', function () {
    if (map.getLayer('mapwarper')) {
      map.setPaintProperty('mapwarper', 'raster-opacity', this.value / 100)
    }
  })
})
