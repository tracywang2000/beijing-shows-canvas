/* eslint-env browser */
/* eslint-disable no-restricted-properties */
/* This is how you use the environments letiables passed by the webpack.DefinePlugin */

import * as d3 from 'd3';
import * as d3GeoProjection from 'd3-geo-projection';

const Trianglify = require('trianglify');
const timeline = require('./timeline');
const world = require('./data-countries.json').features;
const countryMapping = require('./data-country-mapping.json');
let data = require('./data.json');

const processTimeline = timeline.processTimeline;
const renderTimeline = timeline.renderTimeline;
const findFilteredData = timeline.findFilteredData;

/** This is where the 'real code' start */
// approval-year,approval-number,key,name,host,actors,category,origin,show-start,
// show-end,location,number-of-shows,actors,program,date-approval


const fromHSVtoRGB = colorObj => {
  const h = colorObj.h;
  const s = colorObj.s;
  const v = colorObj.v;
  const i = Math.round(h / 60);
  const f = (h / 60) - i;
  let r;
  let g;
  let b;

  switch (i) {
    case 0:
      r = v;
      g = v * (1 - (s * (1 - f)));
      b = v * (1 - s);
      break;
    case 1:
      r = v * (1 - (s * f));
      g = v;
      b = v * (1 - s);
      break;
    case 2:
      r = v * (1 - s);
      g = v;
      b = v * (1 - (s * (1 - f)));
      break;
    case 3:
      r = v * (1 - s);
      g = v * (1 - (s * f));
      b = v;
      break;
    case 4:
      r = v * (1 - (s * (1 - f)));
      g = v * (1 - s);
      b = v;
      break;
    case 5:
      r = v;
      g = v * (1 - s);
      b = v * (1 - (s * f));
      break;
    default:
      break;
  }

  const obj = {
    r: r > 1 ? 255 : Math.round(r * 255),
    g: g > 1 ? 255 : Math.round(g * 255),
    b: b > 1 ? 255 : Math.round(b * 255)
  };
  return `rgb(${obj.r}, ${obj.g}, ${obj.b})`;
};

const clean = rawData => rawData.map(rawShow => {
  const show = rawShow;
  show.origin = ['', '演员', '非洲'].indexOf(rawShow.origin) !== -1 ?
    [] :
    rawShow.origin.split(' ').map(origin =>
      countryMapping.countryIdMaps.filter(el =>
        el[0] === countryMapping.countryTranslates[origin])[0][1]);
  return show;
});

const renderBackground = () => {
  const pattern = Trianglify({
    width: window.innerWidth,
    height: window.innerHeight,
    x_colors: 'Spectral',
    y_colors: 'BuGn'
  });
  document.getElementById('background').appendChild(pattern.canvas());
};

const countsByCountry = dataChunk => {
  // let countries = world.map(el => el.properties.name);
  const countriesCount = {};
  for (let i = 0; i < dataChunk.length; i += 1) {
    if (dataChunk[i].origin) {
      for (let j = 0; j < dataChunk[i].origin.length; j += 1) {
        const country = dataChunk[i].origin[j];
        if (countriesCount[country]) {
          countriesCount[country] += 1.0 / dataChunk[i].origin.length;
        }
        else {
          countriesCount[country] = 1.0 / dataChunk[i].origin.length;
        }
      }
    }
  }
  const max = Math.max(...Object.values(countriesCount));
  const keys = Object.keys(countriesCount);
  for (let k = 0; k < keys.length; k += 1) {
    countriesCount[keys[k]] /= max;
  }
  return countriesCount;
};

let currentRotation = [-144, 0];

const showTip = (country, number, position) => {
  const node = d3.select('.mouse-tip-template').node().cloneNode(true);
  const tip = d3.select(node)
    .classed('mouse-tip', true)
    .classed('mouse-tip-template', false)
    .attr('data-country', country)
    .attr('style', `bottom: ${position.bottom}px; left: ${position.left}px`);

  tip.select('.country-name').text(country);
  tip.select('.number-of-shows').text(`${number}`);

  d3.select('#wrapper').node().appendChild(tip.node());
  tip.classed('show', true);
  return tip;
};

const renderGlobe = () => {
  const filteredData = findFilteredData();
  const canvasWrapper = d3.select('#canvas').node().getBoundingClientRect();
  const countsByCountryData = countsByCountry(filteredData);

  d3.select('.globe-info .counts-total').text(data.length);
  d3.select('.globe-info .counts-current').text(filteredData.length);

  const projection = d3GeoProjection.geoRobinson()
    .rotate(currentRotation)
    .scale(Math.pow((Math.pow(canvasWrapper.height, 3) * canvasWrapper.width), 0.25) / 5)
    .translate([canvasWrapper.width * 0.56, canvasWrapper.height / 2])
    .precision(0.1);

  const path = d3.geoPath()
    .projection(projection);

  const graticule = d3.geoGraticule();
  let mouseOrigin = [0, 0];
  let projectionOrigin;

  d3.select('#canvas svg').remove();
  const svg = d3.select('#canvas')
    .append('svg')
    .attr('width', canvasWrapper.width)
    .attr('height', canvasWrapper.height * 0.9)
    .call(d3.drag()
      .on('start', () => {
        const currentProjection = projection.rotate();
        mouseOrigin = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
        projectionOrigin = [-currentProjection[0], -currentProjection[1]];
      })
      .on('drag', () => {
        const mouseTarget = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
        const projectionTarget = [
          projectionOrigin[0] + ((mouseOrigin[0] - mouseTarget[0]) / 4),
          projectionOrigin[1] + ((mouseTarget[1] - mouseOrigin[1]) / 4)
        ];
        currentRotation = [-projectionTarget[0], -projectionTarget[1]];
        projection.rotate(currentRotation);

        svg.select('.graticule').attr('d', path);
        svg.selectAll('.country').attr('d', path);
      }));

  svg.append('defs').append('path')
    .datum({ type: 'Sphere' })
    .attr('id', 'sphere')
    .attr('d', path);

  svg.append('use')
    .classed('stroke', true)
    .attr('xlink:href', '#sphere');

  svg.append('use')
    .classed('fill', true)
    .attr('xlink:href', '#sphere');

  svg.append('path')
    .datum(graticule)
    .classed('graticule', true)
    .attr('d', path);

  svg.append('g')
    .classed('countries', true)
    .selectAll('path')
    .data(world)
    .enter()
    .append('path')
    .attr('d', path)
    .classed('country', true)
    .style('fill', d => {
      if (countsByCountryData[d.properties.name]) {
        return fromHSVtoRGB({ h: 207, s: countsByCountryData[d.properties.name], v: 1 });
      }
      return null;
    })
    .style('stroke', d => {
      if (countsByCountryData[d.properties.name]) {
        return fromHSVtoRGB({
          h: 207,
          s: 0.7 + (0.3 * countsByCountryData[d.properties.name]),
          v: 1
        });
      }
      return null;
    })
    .classed('hasShow', d => !!countsByCountryData[d.properties.name])
    .on('mouseover', (d, i, nodes) => {
      // console.log(d.properties.name, countsByCountryData[d.properties.name]);
      if (countsByCountryData[d.properties.name]) {
        const nodePosition = nodes[i].getBoundingClientRect();
        const boxPosition = {
          bottom: (window.innerHeight + 5) -
            (((nodePosition.top + nodePosition.bottom) / 2) -
              ((nodePosition.bottom - nodePosition.top) * 0.2)),
          left: ((nodePosition.left + nodePosition.right) / 2) - 132
        };
        showTip(d.properties.name, filteredData.filter(el =>
          el.origin.indexOf(d.properties.name) !== -1).length, boxPosition);
        d3.select(nodes[i]).classed('hover', true);
      }
    })
    .on('mouseout', (d, i, nodes) => {
      const tip = d3.selectAll(`.mouse-tip[data-country="${d.properties.name}"]`);
      tip.classed('show', false);
      window.setTimeout(() => {
        tip.remove();
      }, 500);
      d3.select(nodes[i])
        .classed('hover', false);
    });

};

const main = () => {
  data = clean(data);
  const timelineData = processTimeline(data);
  renderBackground();
  renderTimeline(timelineData, () => {
    renderGlobe();
  });
  renderGlobe();
  // let pattern2 = Trianglify({
  //   width: window.innerWidth,
  //   height: 100,
  //   x_colors: 'Reds',
  //   y_colors: 'Reds'
  // });
  // document.getElementById('header').appendChild(pattern2.canvas());

  // console.log(pattern2);

  // d3.select(self.frameElement).style('height', height + 'px');
};

main();

