import React, { useEffect, useRef, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from 'react-use';
import { Selection, select } from 'd3';
import * as colors from '../../../theme/color';
import { hideBubble, highlightLegend, showBubble, toggleQuadrant, translate } from '../../utils/radarUtils';
import { FilterType } from '../../../modules/filters/filters.types';
import { setArea, setLevel } from '../../../modules/filters/filters.actions';
import { closeTechnologyPopup, openTechnologyPopup } from '../../../modules/technologyPopup/technologyPopup.actions';
import { TechnologyId } from '../../../modules/technologyPopup/technologyPopup.types';
import { selectTechnologyId } from '../../../modules/technologyPopup/technologyPopup.selectors';
import { RadarTechnology, RadarQuadrant, RadarRing } from './radar.types';
import { RADAR_RADIUS, VERTICAL_RADAR_MARGIN, HORIZONTAL_RADAR_MARGIN } from './radar.constants';
import {
  hideTooltip,
  renderBubble,
  renderGrid,
  renderAreaLabels,
  renderQuadrantSectors,
  renderRingLabels,
  renderTechnologies,
  showTooltip,
} from './radar.helpers';
import { SVG } from './radar.styles';

interface RadarProps {
  technologies: RadarTechnology[];
  rings: RadarRing[];
  quadrants: RadarQuadrant[];
  activeQuadrant: number | null;
  activeRing: number | null;
  viewerHeight: number;
  viewerWidth: number;
  hasFilters: boolean;
}

export const Radar = ({
  technologies,
  rings: radarRings,
  quadrants,
  activeQuadrant,
  activeRing,
  viewerHeight,
  viewerWidth,
  hasFilters,
}: RadarProps) => {
  const [quadrantSectors, setQuadrantSectors] = useState<Selection<SVGGElement, any, SVGGElement, unknown> | null>(
    null
  );
  const [areaLabels, setAreaLabels] = useState<Selection<SVGGElement, any, SVGGElement, unknown> | null>(null);
  const [blips, setBlips] = useState<Selection<any, any, SVGGElement, unknown> | null>(null);
  const [ringLabels, setRingLabels] = useState<Selection<
    SVGTextElement,
    { radius: number; description: string; name: string },
    any,
    unknown
  > | null>(null);
  const radarRef = useRef(null);

  const dispatch = useDispatch();
  const handleCloseTechnologyPopup = () => dispatch(closeTechnologyPopup());
  const handleAreaSelect = (option: FilterType) => dispatch(setArea(option));
  const handleLevelSelect = (option: FilterType) => dispatch(setLevel(option));
  const handleOpenPopup = (technologyId: TechnologyId) => dispatch(openTechnologyPopup(technologyId));

  const technologyId = useSelector(selectTechnologyId);

  const renderRadar = () => {
    const height = viewerHeight - VERTICAL_RADAR_MARGIN;
    const width = viewerWidth - HORIZONTAL_RADAR_MARGIN;
    const radarSize = width < height ? width : height;

    const scale = (radarSize - 1) / (RADAR_RADIUS * 2);
    const ringRadius = [180 * scale, 270 * scale, 360 * scale, RADAR_RADIUS * scale];
    const rings = radarRings.map((ring, index) => ({ ...ring, radius: ringRadius[index] }));
    const container = select(radarRef.current);
    container.selectAll('*').remove();
    container.style('background-color', colors.codGray).attr('width', radarSize).attr('height', radarSize);

    const radar = container.append('g').attr('class', 'radar');
    const areaLabelsContainer = container.append('g').attr('class', 'area-labels');
    const ringLabelsContainer = container.append('g').attr('class', 'ring-labels');
    const bubbleContainer = container.append('g').attr('class', 'bubble-container');
    container.attr('viewBox', `0 0 ${radarSize} ${radarSize}`);
    radar.attr('transform', translate({ x: radarSize / 2, y: Math.ceil(rings[3].radius) }));
    areaLabelsContainer.attr('transform', translate({ x: radarSize / 2, y: Math.ceil(rings[3].radius) }));
    ringLabelsContainer.attr('transform', translate({ x: radarSize / 2, y: Math.ceil(rings[3].radius) }));
    bubbleContainer.attr('transform', translate({ x: radarSize / 2, y: Math.ceil(rings[3].radius) }));

    renderGrid({ radar, scale, rings });
    const renderedSectors = renderQuadrantSectors({ rings, radar });
    const renderedTechnologies = renderTechnologies({ radar, technologies, rings });
    const renderedRingLabels = renderRingLabels({ ringLabelsContainer, radarRings, rings, quadrants });
    const renderedAreaLabels = renderAreaLabels({ quadrants, rings, areaLabelsContainer });
    renderBubble(bubbleContainer);

    setBlips(renderedTechnologies);
    setRingLabels(renderedRingLabels);
    setAreaLabels(renderedAreaLabels);
    setQuadrantSectors(renderedSectors);

    renderedTechnologies
      .on('mouseover', (event: MouseEvent, d) => {
        toggleQuadrant(d.quadrant, true);
        highlightLegend({ id: d.id });
        showBubble(d);
      })
      .on('mouseout', (event: MouseEvent, d) => {
        toggleQuadrant(d.quadrant, false);
        highlightLegend({ id: d.id, mode: 'off' });
        hideBubble();
      })
      .on('click', (event: MouseEvent, d) => {
        if (d.description) {
          handleOpenPopup(d.id);
        }

        if (activeQuadrant !== undefined && d.inactive) {
          handleAreaSelect(quadrants[d.quadrant].name);
        }
      });

    renderedSectors
      .on('click', (event, d) => {
        handleCloseTechnologyPopup();
        handleAreaSelect(quadrants[d.quadrant].name);
      })
      .on('mouseover', (event: MouseEvent, d) => {
        toggleQuadrant(d.quadrant, true);
      })
      .on('mouseout', (event: MouseEvent, d) => {
        toggleQuadrant(d.quadrant, false);
      });

    renderedAreaLabels
      .on('click', (event, d) => {
        quadrants.map((el) => (el.name !== quadrants[d.quadrant].name ? toggleQuadrant(el.position, false) : null));
        handleCloseTechnologyPopup();
        handleAreaSelect(quadrants[d.quadrant].name);
      })
      .on('mouseover', (event: MouseEvent, d) => {
        const text = quadrants[d.quadrant].description;
        if (!text.length) {
          return;
        }
        const target = renderedAreaLabels.select(`#area-label-${d.quadrant} rect`).node() as Element;
        if (target) {
          showTooltip(target, text, d.factor_x);
        }
        renderedAreaLabels.classed('not-hovered', ({ quadrant }) => d.quadrant !== quadrant);
        radar.classed('not-hovered', true);
        ringLabelsContainer.classed('not-hovered', true);
      })
      .on('mouseout', () => {
        hideTooltip();
        renderedAreaLabels.classed('not-hovered', false);
        radar.classed('not-hovered', false);
        ringLabelsContainer.classed('not-hovered', false);
      });

    renderedRingLabels
      .on('click', (event, d) => {
        quadrants.map((el) => toggleQuadrant(el.position, false));
        handleCloseTechnologyPopup();
        handleLevelSelect(d.name);
      })
      .on('mouseover', (event: MouseEvent, d) => {
        if (!d.description.length) {
          return;
        }
        const target = event.target as Element;

        if (target) {
          showTooltip(target, d.description, -1, 0);
        }
        renderedRingLabels.classed('not-hovered', ({ name }) => name !== d.name);
        radar.classed('not-hovered', true);
        areaLabelsContainer.classed('not-hovered', true);
      })
      .on('mouseout', () => {
        hideTooltip();
        renderedRingLabels.classed('not-hovered', false);
        radar.classed('not-hovered', false);
        areaLabelsContainer.classed('not-hovered', false);
      });
  };

  useDebounce(renderRadar, 200, [viewerWidth, viewerHeight]);

  useEffect(() => {
    if (quadrantSectors && areaLabels) {
      if (typeof activeQuadrant === 'number') {
        toggleQuadrant(activeQuadrant, false);
      }

      quadrantSectors.classed('active', (d) => d.quadrant === activeQuadrant);
      areaLabels.classed('active', (d) => d.quadrant === activeQuadrant);
      blips
        ?.classed('active', (d) => hasFilters && !technologies[d.index].inactive)
        .classed('hover-active', !hasFilters);
      ringLabels?.classed('active', (d, i) => i + 1 === activeRing || !activeRing);
    }
  }, [quadrantSectors, technologies]);

  const applySelectedByTechnology = (d: any) => {
    const selectedTechnology = technologies.filter((el) => el.id === technologyId);

    if (selectedTechnology.length) {
      return d.quadrant === selectedTechnology[0].quadrant;
    }

    return false;
  };

  useEffect(() => {
    blips?.classed('selected', (d) => technologyId === d.id);
    quadrantSectors?.classed('selected', (d) => applySelectedByTechnology(d));
    areaLabels?.classed('selected', (d) => applySelectedByTechnology(d));
  }, [technologyId]);

  return <SVG ref={radarRef} />;
};
