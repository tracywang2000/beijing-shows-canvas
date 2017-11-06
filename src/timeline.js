/* eslint-env browser */

import * as d3 from 'd3';
import moment from 'moment';


const ONE_DAY = 24 * 60 * 60 * 1000;
const TIMELINE_START = 1433088000000;
const TIMELINE_END = 1514736000000;
let timelineFilterStart = TIMELINE_START + ((TIMELINE_END - TIMELINE_START) * 0.2);
let timelineFilterEnd = TIMELINE_START + ((TIMELINE_END - TIMELINE_START) * 0.6);
let timelineCallback;
let timelineHeight;
let timelineScale;
let timelineData;
let timelineRendered = false;
let originalData;

const processTimeline = data => {
  originalData = data;

  const showsByDate = {};
  let showCountsByDate = {};

  const countShowsByDate = (show, date, count) => {
    if (showsByDate[date]) {
      showsByDate[date].push(show.key);
    }
    else {
      showsByDate[date] = [show.key];
    }
    if (showCountsByDate[date]) {
      showCountsByDate[date] += count;
    }
    else {
      showCountsByDate[date] = count;
    }
  };

  const toArray = object => Object.keys(object)
    .map(a => parseInt(a, 10)).sort()
    .map(item => [item, object[`${item}`]]);

  const ids = Object.keys(data);
  for (let j = 1; j < ids.length; j += 1) {
    const show = data[ids[j]];
    const startDate = new Date(show['show-start']);
    const endDate = show['show-end'] ? new Date(show['show-end']) : startDate;
    const duration = ((endDate - startDate) / ONE_DAY) + 1;
    const numShows = parseInt(show['number-of-shows'], 10);
    show['shows-by-day'] = [];
    if (numShows >= duration) {
      for (let i = 0; i < duration; i += 1) {
        if (i < numShows % duration) {
          const date = startDate.getTime() + (i * ONE_DAY);
          const count = Math.round(numShows / duration) + 1;
          countShowsByDate(show, date, count);
          show['shows-by-day'].push([date, count]);
        }
        else {
          const date = startDate.getTime() + (i * ONE_DAY);
          const count = Math.round(numShows / duration);
          countShowsByDate(show, date, count);
          show['shows-by-day'].push([date, count]);
        }
      }
    }
    else {
      for (let i = 0; i < numShows; i += 1) {
        if (i < duration % numShows) {
          const date = startDate.getTime() + (i * Math.round(duration / numShows) * ONE_DAY);
          countShowsByDate(show, date, 1);
          show['shows-by-day'].push([date, 1]);
        }
        else {
          const date = startDate.getTime() +
            (((i * (Math.round(duration / numShows) + 1)) - 1) * ONE_DAY);
          countShowsByDate(show, date, 1);
          show['shows-by-day'].push([date, 1]);
        }
      }
    }
  }

  showCountsByDate = toArray(showCountsByDate);
  const maxShowCountsByDate = Math.max(...showCountsByDate.map(a => parseInt(a[1], 10)));

  return { showsByDate, showCountsByDate, maxShowCountsByDate };
};

const renderTimelineFilter = () => {
  const filterStartEl = d3.select('#timeline-filter-start');
  filterStartEl.style('top', `${timelineScale(timelineFilterStart)}px`);
  filterStartEl.select('.date').text(moment(new Date(timelineFilterStart)).format('MMM DD, YYYY'));
  const filterEndEl = d3.select('#timeline-filter-end');
  filterEndEl.style('top', `${timelineScale(timelineFilterEnd)}px`);
  filterEndEl.select('.date').text(moment(new Date(timelineFilterEnd)).format('MMM DD, YYYY'));
};

const renderTimelineFilterArea = () => {
  const filteredData = timelineData.showCountsByDate
    .filter(el => el[0] >= timelineFilterStart && el[0] <= timelineFilterEnd);
  timelineHeight = window.innerHeight < 720 ? 440 : window.innerHeight - 280;
  timelineScale = d3.scaleLinear()
    .domain([TIMELINE_START, TIMELINE_END])
    .range([0, timelineHeight]);
  const svg = d3.select('#timeline svg').attr('width', window.innerWidth * 0.15).attr('height', timelineHeight);
  const xRight = d3.scaleLinear()
    .domain([0, timelineData.maxShowCountsByDate])
    .range([+svg.attr('width') / 2, +svg.attr('width')]);
  const xLeft = d3.scaleLinear()
    .domain([0, timelineData.maxShowCountsByDate])
    .range([+svg.attr('width') / 2, 0]);
  const area = d3.area().x0(d => xLeft(d[1])).x1(d => xRight(d[1])).y(d => timelineScale(d[0]))
    .curve(d3.curveBasis);
  const lineRight = d3.line().x(d => xRight(d[1])).y(d => timelineScale(d[0])).curve(d3.curveBasis);
  const lineLeft = d3.line().x(d => xLeft(d[1])).y(d => timelineScale(d[0])).curve(d3.curveBasis);

  if (timelineRendered) {
    svg.select('.timelineFilterArea').datum(filteredData).attr('d', area);
    svg.select('.timelineFilterCurveRight').datum(filteredData).attr('d', lineRight);
    svg.select('.timelineFilterCurveLeft').datum(filteredData).attr('d', lineLeft);
  }
  else {
    svg.append('path').datum(filteredData)
      .classed('timelineFilterArea', true)
      .attr('d', area);

    svg.append('path').datum(filteredData)
      .classed('timelineFilterCurve', true)
      .classed('timelineFilterCurveRight', true)
      .attr('d', lineRight);

    svg.append('path').datum(filteredData)
      .classed('timelineFilterCurve', true)
      .classed('timelineFilterCurveLeft', true)
      .attr('d', lineLeft);
  }
  timelineRendered = true;
};

const renderTimelineBody = () => {
  timelineHeight = window.innerHeight < 720 ? 440 : window.innerHeight - 280;
  timelineScale = d3.scaleLinear()
    .domain([TIMELINE_START, TIMELINE_END])
    .range([0, timelineHeight]);
  const svg = d3.select('#timeline svg').attr('width', window.innerWidth * 0.15).attr('height', timelineHeight);
  const xRight = d3.scaleLinear()
    .domain([0, timelineData.maxShowCountsByDate])
    .range([+svg.attr('width') / 2, +svg.attr('width')]);
  const xLeft = d3.scaleLinear()
    .domain([0, timelineData.maxShowCountsByDate])
    .range([+svg.attr('width') / 2, 0]);
  const area = d3.area().x0(d => xLeft(d[1])).x1(d => xRight(d[1])).y(d => timelineScale(d[0]))
    .curve(d3.curveBasis);
  const lineRight = d3.line().x(d => xRight(d[1])).y(d => timelineScale(d[0])).curve(d3.curveBasis);
  const lineLeft = d3.line().x(d => xLeft(d[1])).y(d => timelineScale(d[0])).curve(d3.curveBasis);

  svg.append('path').datum(timelineData.showCountsByDate)
    .classed('timelineArea', true)
    .attr('d', area);

  svg.append('path').datum(timelineData.showCountsByDate)
    .classed('timelineCurve', true)
    .attr('d', lineRight);

  svg.append('path').datum(timelineData.showCountsByDate)
    .classed('timelineCurve', true)
    .attr('d', lineLeft);

  d3.select('#axis-endpoint-start')
    .text(moment(new Date(TIMELINE_START))
      .format('MMM DD, YYYY')).style('top', `${80 - 44}px`);
  d3.select('#axis-endpoint-end')
    .text(moment(new Date(TIMELINE_END))
      .format('MMM DD, YYYY')).style('top', `${timelineHeight + 80}px`);
};

const filterDragCaller = type => {
  let mouseOriginY;
  let filterOrigin;
  return d3.drag()
    .on('start', () => {
      mouseOriginY = d3.event.sourceEvent.pageY;
      filterOrigin = type === 'START' ? timelineFilterStart : timelineFilterEnd;
    })
    .on('drag', () => {
      const move = d3.event.sourceEvent.pageY - mouseOriginY;
      let filterTarget = filterOrigin +
        ((move / timelineHeight) * (TIMELINE_END - TIMELINE_START));
      if (type === 'START') {
        if (filterTarget > timelineFilterEnd) {
          filterTarget = timelineFilterEnd;
        }
        else if (filterTarget < TIMELINE_START) {
          filterTarget = TIMELINE_START;
        }
        timelineFilterStart = filterTarget;
      }
      if (type === 'END') {
        if (filterTarget < timelineFilterStart) {
          filterTarget = timelineFilterStart;
        }
        else if (filterTarget > TIMELINE_END) {
          filterTarget = TIMELINE_END;
        }
        timelineFilterEnd = filterTarget;
      }
      renderTimelineFilter();
      renderTimelineFilterArea();
    })
    .on('end', () => {
      timelineCallback();
    });
};

const renderTimeline = (newTimelineData, timelineFilterUpdateCallback) => {
  timelineCallback = timelineFilterUpdateCallback;
  timelineData = newTimelineData;

  d3.select('#timeline-filter-start').call(filterDragCaller('START'));
  d3.select('#timeline-filter-end').call(filterDragCaller('END'));

  renderTimelineBody();
  renderTimelineFilter();
  renderTimelineFilterArea();
};

const findFilteredData = () => originalData.filter(show => {
  const startDate = new Date(show['show-start']);
  const endDate = show['show-end'] ? new Date(show['show-end']) : startDate;
  return (startDate >= timelineFilterStart && startDate <= timelineFilterEnd) ||
    (endDate >= timelineFilterStart && endDate <= timelineFilterEnd);
});

export { processTimeline, renderTimeline, findFilteredData };
