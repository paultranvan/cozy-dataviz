import React, { useState } from 'react'
import Icon from 'cozy-ui/transpiled/react/Icon'
import IconZoomOut from '../assets/icons/zoom-out.svg'
import { TimeSeries } from 'pondjs'
import {
  Resizable,
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
  increaseAggregationDate,
  getLastAggregationDate
} from '../ducks/aggregation/dates'

const selectionChange = (
  selection,
  aggLevel,
  setAggregationLevel,
  setStartDate,
  setEndDate,
  setSelection
) => {
  try {
    const newAggLevel = decreaseAggregationLevel(aggLevel)
    console.log('new agg level : ', newAggLevel)
    setAggregationLevel(newAggLevel)
    setStartDate(new Date(selection.event.begin()).toISOString())
    setEndDate(new Date(selection.event.end()).toISOString())
    setSelection(selection)
  } catch (e) {
    console.error(e)
  }
}

const zoomOut = (
  startDate,
  aggLevel,
  setStartDate,
  setEndDate,
  setAggregationLevel
) => {
  console.log('its a zoom out')
  try {
    const newAggLevel = increaseAggregationLevel(aggLevel)
    console.log('new agg level : ', newAggLevel)
    console.log('start date : ', startDate)
    const newStartDate = increaseAggregationDate(startDate, aggLevel)
    const newEndDate = newStartDate
      ? getLastAggregationDate(startDate, newAggLevel)
      : null
    console.log('new start date : ', newStartDate)
    console.log('new end date : ', newEndDate)
    setAggregationLevel(newAggLevel)
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  } catch (e) {
    console.error(e)
  }
}

const Graph = ({ dataType, aggregationLevel }) => {
  const [aggLevel, setAggregationLevel] = useState(aggregationLevel)
  const [selection, setSelection] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  console.log('agg level : ', aggLevel)
  const points = loadDataGraph({
    dataType,
    aggregationLevel: aggLevel,
    startDate,
    endDate
  })

  if (!points || points.length < 1) {
    return (
      <div>
        <p>No value to display</p>
      </div>
    )
  }

  const series = new TimeSeries({
    name: `${dataType} ${aggregationLevel}`,
    columns: ['index', dataType],
    points
  })

  console.log('series range : ', series.range())

  // const style = (event, column) => {
  //   // console.log('style event : ', event)
  //   // console.log('style column : ', column)

  //   const styles = columns.map(column => {
  //     return {
  //       key: column,
  //       color: '#1fa8f1',
  //       selected: '#2CB1CF'
  //     }
  //   })
  //   return styler(styles)
  // }
  const style = styler([
    {
      key: dataType,
      color: '#1fa8f1',
      selected: '#2CB1CF'
    }
  ])
  const columns = points.map(p => p[0])
  console.log('columns : ', columns)

  // const style = styler(
  //   columns.map(column => {
  //     return {
  //       key: column,
  //       color: '#1fa8f1',
  //       selected: '#2CB1CF'
  //     }
  //   })
  // )

  const maxValue = Math.max(...points.map(p => p[1]))
  const title =
    startDate && endDate
      ? `${dataType} ${aggLevel}: from ${startDate} to ${endDate}`
      : `${dataType} ${aggLevel}`
  const titleStyle = {
    fill: '#5d6165',
    fontWeight: 400
  }
  console.log('title : ', title)
  return (
    <div>
      <button
        onClick={() =>
          zoomOut(
            startDate,
            aggLevel,
            setStartDate,
            setEndDate,
            setAggregationLevel
          )
        }
      >
        <Icon icon={IconZoomOut} />
      </button>
      <ChartContainer titleStyle={titleStyle} timeRange={series.range()}>
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
              onSelectionChange={selection =>
                selectionChange(
                  selection,
                  aggLevel,
                  setAggregationLevel,
                  setStartDate,
                  setEndDate,
                  setSelection
                )
              }
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
