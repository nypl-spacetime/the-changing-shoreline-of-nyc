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
var areas
var lastScrollY = 0
var ticking = false

function fetchJSON (url) {
  // TODO: add fetch
  return fetch(url)
    .then(checkStatus)
    .then(parseJSON)
}

// addShorelines(1609)
// function addShorelines (year) {
//   fetchJSON('shorelines/' + year + '.geojson')
//     .then(function (json) {
//       var id = 'shorelines' + year

//       map.addSource(id, {
//         type: 'geojson',
//         data: json
//       })

//       map.addLayer({
//         id: id,
//         type: 'line',
//         source: id,
//           'layout': {
//           'line-join': 'round',
//           'line-cap': 'round'
//         },
//         paint: {
//           'line-color': '#ff600b',
//           'line-opacity': 0.5,
//           'line-width': 2
//         }
//       })
//     })
// }

function updateMap (scrollY) {
  var scrollRatio = scrollY / (document.body.clientHeight - window.innerHeight)
  var alongMeters = scrollRatio * lineDistance
  var d = 100

  var sliced = turf.lineSliceAlong(route, Math.max(alongMeters - d, 0), Math.min(alongMeters + d, lineDistance), 'meters');
  var segmentCount = sliced.geometry.coordinates.length - 1

  var bearingTotal = 0
  for (var i = 0; i < segmentCount; i++) {
    bearingTotal += turf.bearing(sliced.geometry.coordinates[i], sliced.geometry.coordinates[i + 1])
  }
  var bearing = (bearingTotal / segmentCount) + 180 //+ 90
console.log(bearing)
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





var lastAreaIndex

// window.addEventListener('scroll', function (event) {
//   var scrollRatio = window.scrollY / (document.body.clientHeight - window.innerHeight)
//   var areaIndex = Math.min(areas.length - 1, Math.floor(scrollRatio * areas.length))

//   if (areaIndex !== lastAreaIndex) {

//     lastAreaIndex = areaIndex

//     map.flyTo({
//       center: areas[areaIndex].geometry.coordinates,
//       zoom: 14
//       // bearing: bearing
//       // https://www.mapbox.com/mapbox-gl-js/api/#cameraoptions
//     })
//   }
// })







function processRoute (geojson) {
  route = geojson.features[0]
  lineDistance = turf.lineDistance(route, 'meters')
  addScrollListener()
}

function processAreas (geojson) {
  areas = geojson.features.map(function (area) {
    var snapped = turf.pointOnLine(route, area.geometry, 'meters');
    area.properties.order = snapped.properties.index
    return area
  })
  .sort(function (a, b) {
    return a.properties.order - b.properties.order
  })

  var area = d3.select('#areas').selectAll('li').data(areas)
    .enter().append('li')
    .attr('class', 'area')

  area
    .append('h3')
    .text(function (d) {
      return d.properties.coastlineproject
    })

  // areas.forEach(function (area) {
  //   console.log(area.properties.order, area.properties.id)
  // })
}

// http://turfjs.org/docs/#along
function addScrollListener () {
  window.addEventListener('scroll', function (event) {
    lastScrollY = window.scrollY
    console.log(lastScrollY)
    if (!ticking) {
      window.requestAnimationFrame(function () {
        updateMap(lastScrollY)
        ticking = false
      })
    }
    ticking = true
  })
}


// map.addSource('mapwarper', {
//   type: 'raster',
//   url: 'https://s3.amazonaws.com/maptiles.nypl.org/859/859spec.json',
//   tileSize: 256
// })

function fetchRoute () {
  return fetchJSON('route.json')
}

function fetchAreas () {
  return fetchJSON('areas/areas.geojson')
}

fetchJSON('route.json')
  .then(processRoute)
  .then(fetchAreas)
  .then(processAreas)

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
  mapLoaded = true
})