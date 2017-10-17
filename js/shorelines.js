var FADE_MS = 1000

function checkStatus (response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function parseJSON (response) {
  return response.json()
}

function fetchJSON (url) {
  return fetch(url)
    .then(checkStatus)
    .then(parseJSON)
}

function processRoute (geojson) {
  route = geojson.features[0]
}

function processAreas (areas) {
  var li = d3.select('#areas').selectAll('li').data(areas.features)
    .enter().append('li')

  var element = li
    .append('div')
    .attr('class', 'area trigger-area')
    .each(function (area) {
      var elementWatcher = scrollMonitor.create(this)
      elementWatcher.enterViewport(function () {
        flyTo(area.properties.center, 14)
      })
    })

  element
    .append('div')
    .attr('class', 'page')

  element
    .append('div')
    .attr('class', 'page trigger-geojson')
    .each(function (area) {
      var elementWatcher = scrollMonitor.create(this)

      elementWatcher.enterViewport(function () {
        console.log('showGeoJSON', area.properties.id)
        showGeoJSON(area.geometry)
      })
      elementWatcher.exitViewport(function () {
        console.log('hideGeoJSON', area.properties.id)
        hideGeoJSON()
      })
    })

  element
    .append('article')
    .html(function (area) {
      return area.properties.story
    })

  element
    .append('div')
    .attr('class', 'page trigger-mapwarper')
    .each(function (area) {
      var elementWatcher = scrollMonitor.create(this)

      elementWatcher.enterViewport(function () {
        showMapWarperMap(area)
        flyTo(area.properties.center, 15)
      })
      elementWatcher.exitViewport(function () {
        hideMapWarperMap()
      })
    })

  li.append('div')
    .attr('class', 'page')

  d3.selectAll('.trigger-overview')
    .each(function () {
      var elementWatcher = scrollMonitor.create(this)

      elementWatcher.enterViewport(function () {
        flyTo([-73.9414, 40.7703], 11)
        console.log('showGeoJSON',  'overview')
        showGeoJSON(areas)
      })
      elementWatcher.exitViewport(function () {
        console.log('hideGeoJSON', 'overview')
        hideGeoJSON()
      })
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

    map.setPaintProperty('geojson', 'line-opacity', 0.8)
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

function showMapWarperMap (area) {
  if (map.getLayer('mapwarper')) {
    hideMapWarperMap(true)
  }

  var mapId = area.properties.mapId
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
          duration: FADE_MS
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

function fetchAreas () {
  return fetchJSON('areas/areas.json')
}

mapboxgl.accessToken = 'pk.eyJ1IjoibnlwbGxhYnMiLCJhIjoiSFVmbFM0YyJ9.sl0CRaO71he1XMf_362FZQ'

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/nypllabs/cj5wa74st78dr2so2bdclte0g',
  center: [-73.98579, 40.71571],
  zoom: 14
})

map.scrollZoom.disable()
map.boxZoom.disable()
map.dragRotate.disable()
map.dragPan.disable()
map.keyboard.disable()
map.doubleClickZoom.disable()
map.touchZoomRotate.disable()

map.on('load', function () {
  fetchAreas()
    .then(processAreas)

  map.addSource('geojson', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
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
      'line-color': '#ff600b',
      'line-opacity': 0,
      'line-width': 8,
      'line-opacity-transition': {
        duration: FADE_MS
      }
    }
  })
})
