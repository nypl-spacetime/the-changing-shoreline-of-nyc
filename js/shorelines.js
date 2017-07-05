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

var mapLoaded = false
var route
var lineDistance
var lastScrollY = 0
var ticking = false

function doSomething (scrollY) {
  var scrollRatio = scrollY / (document.body.clientHeight - window.innerHeight)
  var alongMeters = scrollRatio * lineDistance
  var d = 10

  var sliced = turf.lineSliceAlong(route, Math.max(alongMeters - d, 0), Math.min(alongMeters + d, lineDistance), 'meters');
  var segmentCount = sliced.geometry.coordinates.length - 1

  var bearingTotal = 0
  for (var i = 0; i < segmentCount; i++) {
    bearingTotal += turf.bearing(sliced.geometry.coordinates[i], sliced.geometry.coordinates[i + 1])
  }
  var bearing = (bearingTotal / segmentCount) + 180 //+ 90

  // console.log(sliced.geometry.coordinates.length)

  var pointAlong = turf.along(route, scrollRatio * lineDistance, 'meters')

  // var offsetLine = turf.lineOffset(route, scrollRatio * lineDistance, 'meters')
  // console.log(sliced)

  if (mapLoaded) {
    var point = pointAlong.geometry.coordinates
    // console.log(point)
    map.easeTo({
      center: point,
      bearing: bearing
      // https://www.mapbox.com/mapbox-gl-js/api/#cameraoptions
    })
  }


}

function processRoute (geojson) {
  route = geojson.features[0]
  lineDistance = turf.lineDistance(route, 'meters')
  addScrollListener()
}

// http://turfjs.org/docs/#along
function addScrollListener () {
  window.addEventListener('scroll', function (event) {
    lastScrollY = window.scrollY
    if (!ticking) {
      window.requestAnimationFrame(function () {
        doSomething(lastScrollY)
        ticking = false
      })
    }
    ticking = true
  })
}

fetch('route.json')
  .then(checkStatus)
  .then(parseJSON)
  .then(function (json) {
    processRoute(json)
  })

mapboxgl.accessToken = 'pk.eyJ1IjoibnlwbGxhYnMiLCJhIjoiSFVmbFM0YyJ9.sl0CRaO71he1XMf_362FZQ'

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/nypllabs/cj2gmix25005o2rpapartqm07',
  center: [-73.98579, 40.71571],
  zoom: 15
})

map.scrollZoom.disable()
map.boxZoom.disable()
map.dragRotate.disable()
map.dragPan.disable()
map.keyboard.disable()
map.doubleClickZoom.disable()
map.touchZoomRotate.disable()

map.on('load', function () {
  mapLoaded = true
})