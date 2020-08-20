import React, { useState } from 'react'
import Icon from 'cozy-ui/transpiled/react/Icon'
import IconZoomOut from '../assets/icons/zoom-out.svg'
import { TimeSeries } from 'pondjs'
import {
  Charts,
  ChartContainer,
  ChartRow,
  YAxis,
  BarChart,
  styler
} from 'react-timeseries-charts'
import { loadDataGraph } from '../ducks/aggregation/dataGraph'
import {
  decreaseAggregationLevel,
  increaseAggregationLevel,
  getFirstIncreasedAggregationDate,
  getLastIncreasedAggregationDate
} from '../ducks/aggregation/dates'
import { format, parseISO } from 'date-fns'
import log from 'cozy-logger'

const Graph = ({ dataType, aggregationLevel }) => {
  const [aggLevel, setAggregationLevel] = useState(aggregationLevel)
  const [selection, setSelection] = useState(null)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  const selectionChange = selection => {
    try {
      const newAggLevel = decreaseAggregationLevel(aggLevel)
      setAggregationLevel(newAggLevel)
      setStartDate(new Date(selection.event.begin()).toISOString())
      setEndDate(new Date(selection.event.end()).toISOString())
      setSelection(selection)
    } catch (e) {
      log('error', e)
    }
  }

  const zoomOut = () => {
    try {
      const newAggLevel = increaseAggregationLevel(aggLevel)
      const newStartDate = getFirstIncreasedAggregationDate(
        startDate,
        newAggLevel
      )
      const newEndDate = newStartDate
        ? getLastIncreasedAggregationDate(startDate, newAggLevel)
        : null
      setAggregationLevel(newAggLevel)
      setStartDate(newStartDate)
      setEndDate(newEndDate)
    } catch (e) {
      log('error', e)
    }
  }

  const points = loadDataGraph({
    dataType,
    aggregationLevel: aggLevel,
    startDate,
    endDate
  })
  if (!points || points.length < 1) {
    return <div />
  }

  const series = new TimeSeries({
    name: `${dataType} ${aggregationLevel}`,
    columns: ['index', dataType],
    points
  })

  const style = styler([
    {
      key: dataType,
      color: '#297ef1',
      selected: '#2CB1CF'
    }
  ])

  const maxValue = Math.max(...points.map(p => p[1]))
  const title =
    startDate && endDate
      ? `${dataType} ${aggLevel}: from ${format(
          parseISO(startDate),
          'dd/MM/yyyy'
        )} to ${format(parseISO(endDate), 'dd/MM/yyyy')}`
      : `${dataType} ${aggLevel}`
  const titleStyle = {
    fill: '#5d6165',
    fontWeight: 400
  }
  return (
    <div>
      <button onClick={zoomOut}>
        <Icon icon={IconZoomOut} />
      </button>
      <ChartContainer
        title={title}
        titleStyle={titleStyle}
        timeRange={series.range()}
      >
        <ChartRow height="150">
          <YAxis
            id={dataType}
            format=".5"
            min={0}
            max={maxValue}
            label="Kw/h"
            width="70"
            type="linear"
          />
          <Charts>
            <BarChart
              axis={dataType}
              style={style}
              spacing={1}
              columns={[dataType]}
              series={series}
              minBarHeight={1}
              selection={selection}
              onSelectionChange={selection => selectionChange(selection)}
              //highlight={highlight}
              //onHighlightChange={highlight => setHighlight({ highlight })}
            />
          </Charts>
        </ChartRow>
      </ChartContainer>
    </div>
  )
}

export default Graph
