var FADE_MS = 1000
var MAX_GEOJSON_OPACITY = 0.85

var overviewShown = true

var dragPanEnabled = true

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

var watchers = []

function addScrollListeners () {
  forEach(document.querySelectorAll('.trigger-area'), function () {
    var areaId = this.getAttribute('data-area-id')
    var elementWatcher = scrollMonitor.create(this)

    elementWatcher.enterViewport(function () {
      fitBounds(getBounds(areaId))
    })

    watchers.push(elementWatcher)
  })

  forEach(document.querySelectorAll('.trigger-geojson'), function () {
    var areaId = this.getAttribute('data-area-id')
    var feature = getFeature(areaId)
    var elementWatcher = scrollMonitor.create(this)

    if (!feature) {
      return
    }

    elementWatcher.enterViewport(function () {
      highlightArea(feature.properties.id)
    })

    elementWatcher.exitViewport(function () {
      hideGeoJSON()
    })

    watchers.push(elementWatcher)
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

    watchers.push(elementWatcher)
  })

  forEach(document.querySelectorAll('.trigger-overview'), function () {
    var elementWatcher = scrollMonitor.create(this)

    elementWatcher.enterViewport(function () {
      overviewShown = true
      flyTo([-73.9414, 40.7703], 11)
      highlightArea()
    })

    elementWatcher.exitViewport(function () {
      hideGeoJSON()
      overviewShown = false
    })

    watchers.push(elementWatcher)
  })
}

function removeScrollListeners () {
  watchers.forEach(function (watcher) {
    watcher.destroy()
  })

  watchers = []
}

function fitBounds (bounds) {
  if (!bounds) {
    return
  }

  map.fitBounds(bounds, {
    padding: 100,
    maxZoom: 16
  })
}

function flyTo (center, zoom) {
  map.flyTo({
    center: center,
    zoom: zoom
  })
}

var geojsonTimeout

function highlightArea (areaId) {
  if (geojsonTimeout) {
    clearTimeout(geojsonTimeout)
  }

  if (areaId) {
    map.setFilter('geojson', ['==', 'id', areaId])
  } else {
    map.setFilter('geojson', ['!=', 'id', ''])
  }

  map.setPaintProperty('geojson', 'line-opacity', MAX_GEOJSON_OPACITY)
}

function hideGeoJSON () {
  map.setPaintProperty('geojson', 'line-opacity', 0)
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

map.scrollZoom.disable()
map.boxZoom.disable()
map.dragRotate.disable()
map.touchZoomRotate.disable()

map.dragRotate.disable()

map.keyboard.enable()
map.doubleClickZoom.enable()

function enableDragPan () {
  dragPanEnabled = true
  map.dragPan.enable()
}

function disableDragPan () {
  dragPanEnabled = false
  map.dragPan.disable()
}

enableDragPan()

map.addControl(navigationControl, 'bottom-right')

var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
})

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
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#f99b21',
      'line-opacity': MAX_GEOJSON_OPACITY,
      'line-width': {
        base: 1,
        stops: [
          [12, 4],
          [15, 20]
        ]
      },
      'line-opacity-transition': {
        duration: FADE_MS
      }
    },
    filter: ['!=', 'id', '']
  })

  map.addLayer({
    id: 'geojson-fill',
    type: 'fill',
    source: 'geojson',
    layout: {},
    paint: {
      'fill-color': '#F99B21',
      'fill-opacity': 0.05
    }
  })

  map.on('mouseenter', 'geojson-fill', function (event) {
    map.getCanvas().style.cursor = 'pointer'

    if (overviewShown) {
      var areaId = event.features[0].properties.id

      popup.setLngLat(event.lngLat)
        .setHTML(areaTitles[areaId])
        .addTo(map)
    }
  })

  map.on('mouseleave', 'geojson-fill', function() {
    map.getCanvas().style.cursor = ''
    popup.remove()
  })

  map.on('click', 'geojson-fill', function (event) {
    if (!overviewShown) {
      return
    }

    removeScrollListeners()
    popup.remove()

    var areaId = event.features[0].properties.id
    location.href = '#' + areaId

    fitBounds(getBounds(areaId))
    highlightArea(areaId)

    window.setTimeout(addScrollListeners, 1000)
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

function PanControl() { }

PanControl.prototype.onAdd = function (map) {
  this._map = map
  this._container = document.createElement('div')
  this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'

  var button = document.createElement('button')

  button.className = 'mapboxgl-ctrl-icon'
  button.style.backgroundImage = 'url(images/arrows-ns.svg)'

  button.setAttribute('aria-label', 'Toggle map panning')

  button.addEventListener('click', function () {
    if (dragPanEnabled) {
      disableDragPan()
      button.style.backgroundImage = 'url(images/arrows-ns.svg)'
    } else {
      enableDragPan()
      button.style.backgroundImage = 'url(images/arrows-nswe.svg)'
    }
  })

  this._container.appendChild(button)

  return this._container
}

PanControl.prototype.onRemove = function () {
  this._container.parentNode.removeChild(this._container)
  this._map = undefined
}

var panControl = new PanControl()

if ('ontouchstart' in window) {
  disableDragPan()
  map.addControl(panControl, 'bottom-right')
}
