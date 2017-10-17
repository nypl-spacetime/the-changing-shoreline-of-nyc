const fs = require('fs')
const path = require('path')
const R = require('ramda')
const slurper = require('spreadsheet-slurper')
const showdown = require('showdown')
const converter = new showdown.Converter()

const spreadsheetKey = '1L4BNqcA9T29zvkAay9zPUf1b0t8tjzJlQwlRTrogdOs'

function loadFile (dir, id, extension) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', dir, `${id}.${extension}`), 'utf8')
  } catch (err) {
    return
  }
}

function addStory (area) {
  const markdown = loadFile('stories', area.id, 'md')

  if (!markdown) {
    return area
  }

  return Object.assign(area, {
    story: converter.makeHtml(markdown)
  })
}

function addGeoJSON (area) {
  const geojson = loadFile('geojson', area.id, 'geojson')

  if (!geojson) {
    return area
  }

  return Object.assign(area, {
    geojson: JSON.parse(geojson)
  })
}

function toFeature (area) {
  const coordinates = area.coordinates
    .split(',')
    .reverse()
    .map(parseFloat)

  const geometry = area.geojson || {
    type: 'Point',
    coordinates
  }

  return {
    type: 'Feature',
    properties: {
      id: area.id,
      mapId: parseInt(area.mapid),
      story: area.story,
      center: coordinates,
    },
    geometry
  }
}

slurper.slurp(spreadsheetKey)
  .filter((area) => area.mapid)
  .map(addStory)
  .map(addGeoJSON)
  .filter((area) => area.geojson && area.story)
  .map(toFeature)
  .toArray((features) => {
    fs.writeFileSync(path.join(__dirname, 'areas.json'), JSON.stringify({
      type: 'FeatureCollection',
      features
    }, null, 2))
  })
