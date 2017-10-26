/* eslint-disable max-len */
/* eslint-disable prefer-const */
/* This is how you use the environments variables passed by the webpack.DefinePlugin */

import * as d3 from 'd3';
import * as d3GeoProjection from 'd3-geo-projection';
import * as topojson from 'topojson';

import * as world from './world-50m.json';

/** This is where the 'real code' start */

const main = () => {
  console.log(d3GeoProjection);

  const width = 960;
  const height = 960;
  let projection = d3GeoProjection.geoAiry()
    .rotate([90, -40])
    .scale(340)
    .translate([width / 2, height / 2])
    .precision(0.1)
    .clipAngle(90)
    .radius(90);

  let path = d3.geoPath()
    .projection(projection);

  let graticule = d3.geoGraticule();

  let svg = d3.select('body').append('svg').attr('width', width).attr('height', height);

  svg.append('defs').append('path')
    .datum({ type: 'Sphere' })
    .attr('id', 'sphere')
    .attr('d', path);

  svg.append('use')
    .attr('class', 'stroke')
    .attr('xlink:href', '#sphere');

  svg.append('use')
    .attr('class', 'fill')
    .attr('xlink:href', '#sphere');

  svg.append('path')
    .datum(graticule)
    .attr('class', 'graticule')
    .attr('d', path);

  svg.insert('path', '.graticule')
    .datum(topojson.feature(world, world.objects.land))
    .attr('class', 'land')
    .attr('d', path);

  svg.insert('path', '.graticule')
    .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
    .attr('class', 'boundary')
    .attr('d', path);

  // d3.select(self.frameElement).style('height', height + 'px');
};

main();

