const R = require('ramda')
const slurper = require('spreadsheet-slurper')

const spreadsheetKey = '1L4BNqcA9T29zvkAay9zPUf1b0t8tjzJlQwlRTrogdOs'

slurper.slurp(spreadsheetKey)
  .toArray((areas) => {
    const features = areas
      .filter(R.prop('coordinates'))
      .map((area) => {
        let mapId
        if (area.maps.includes('maps.nypl.org')) {
          const match = area.maps.match(/maps\/(\d+)/)
          mapId = match[1]

        }

        return {
          type: 'Feature',
          properties: {
            id: area.id,
            mapId
          },
          geometry: {
            type: 'Point',
            coordinates: area.coordinates
              .split(',')
              .reverse()
              .map(parseFloat)
          }
        }
      })

    console.log(JSON.stringify({
      type: 'FeatureCollection',
      features
    }, null, 2))
  })
