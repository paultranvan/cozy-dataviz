import React from 'react'
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

const Graph = ({ dataType, aggregationLevel }) => {
  const points = loadDataGraph({ dataType, aggregationLevel })
  if (!points || points.length < 1) {
    return null
  }

  const series = new TimeSeries({
    name: `${dataType} ${aggregationLevel}`,
    columns: ['index', dataType],
    points
  })

  const style = styler([
    {
      key: dataType,
      color: '#A5C8E1',
      selected: '#2CB1CF'
    }
  ])
  const maxValue = Math.max(...points.map(p => p[1]))
  console.log('max value : ', maxValue)
  return (
    <ChartContainer timeRange={series.range()}>
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
          />
        </Charts>
      </ChartRow>
    </ChartContainer>
  )
}

export default Graph
