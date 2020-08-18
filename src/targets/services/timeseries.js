import CozyClient from 'cozy-client'
import log from 'cozy-logger'

import {
  formatISO,
  parseISO,
  differenceInCalendarYears,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarDays
} from 'date-fns'
import {
  AGG_BY_DAY,
  AGG_BY_WEEK,
  AGG_BY_MONTH,
  AGG_BY_YEAR
} from '../../ducks/aggregation/consts'

const mapAggregationLevelToFunc = {
  [AGG_BY_DAY]: differenceInCalendarDays,
  [AGG_BY_WEEK]: differenceInCalendarWeeks,
  [AGG_BY_MONTH]: differenceInCalendarMonths,
  [AGG_BY_YEAR]: differenceInCalendarYears
}

/* 
  Determine which min agg level should be run.

  For instance, we aggregate to the day if : 
    - the start / end dates interval is less than a day, OR
    - the start / second dates interval is 1 (suppose completeness)
*/
const minAggregationLevel = dataseries => {
  const startDate = parseISO(dataseries.startDate)
  const endDate = parseISO(dataseries.endDate)
  const secondDate = parseISO(dataseries.dates[1])

  if (
    differenceInCalendarDays(endDate, startDate) < 1 ||
    differenceInCalendarDays(secondDate, startDate) === 1
  ) {
    return AGG_BY_DAY
  }
  if (
    differenceInCalendarWeeks(endDate, startDate) < 1 ||
    differenceInCalendarWeeks(secondDate, startDate) === 1
  ) {
    return AGG_BY_WEEK
  }
  if (
    differenceInCalendarMonths(endDate, startDate) < 1 ||
    differenceInCalendarMonths(secondDate, startDate) === 1
  ) {
    return AGG_BY_MONTH
  }
  return AGG_BY_YEAR
}

/*
  Apply aggregation functions on data series. The given interval function
  is used to determine how to group data: per week, month, etc.
*/
const applyAggregation = (dataseries, aggLevel, dbSource, dataSource) => {
  const compareIntervalFct = mapAggregationLevelToFunc[aggLevel]
  console.log('compare interval fct : ', compareIntervalFct)
  return dataseries.series.map(serie => {
    const aggSerie = {}
    let sum = 0
    let count = 0
    let currDateAgg = parseISO(dataseries.dates[0])
    for (let i = 0; i < serie.values.length; i++) {
      if (compareIntervalFct(parseISO(dataseries.dates[i]), currDateAgg) > 0) {
        aggSerie[formatISO(currDateAgg)] = {
          sum,
          count,
          type: serie.type,
          aggregationLevel: aggLevel,
          dbSource,
          dataSource
        }
        sum = 0
        count = 0
        currDateAgg = parseISO(dataseries.dates[i])
      }
      sum += serie.values[i]
      count++
    }
    return aggSerie
  })
}

/*
  Aggregate data series on the computed times intervals
*/
const aggregateSeries = doc => {
  const minAggLevel = minAggregationLevel(doc.dataseries)
  const aggregationRuns = {
    [AGG_BY_DAY]: [AGG_BY_DAY, AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR],
    [AGG_BY_WEEK]: [AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR],
    [AGG_BY_MONTH]: [AGG_BY_MONTH, AGG_BY_YEAR],
    [AGG_BY_YEAR]: AGG_BY_YEAR
  }
  return aggregationRuns[minAggLevel].map(aggLevel =>
    applyAggregation(doc.dataseries, aggLevel, doc.dbSource, doc.dataSource)
  )
}

const saveAggregations = async (client, aggregatedSeries) => {
  console.log('aggs : ', aggregatedSeries)
  aggregatedSeries.forEach(singleAggregationSeries => {
    singleAggregationSeries.forEach(singleAgg => {
      const dates = Object.keys(singleAgg)
      dates.map(date => {
        const docAgg = {
          date,
          ...singleAgg[date]
        }
        client.save({
          _type: 'io.cozy.timeseries',
          ...docAgg
        })
      })
    })
  })
}

const main = async () => {
  const client = CozyClient.fromEnv()
  console.log('hello world')

  const energyQ = client.find('io.cozy.timeseries.fr.edf').where({
    'cozyMetadata.updatedAt': {
      $gt: null
    }
  })

  const energyDocs = await client.queryAll(energyQ)
  console.log('elec : ', energyDocs)

  const aggDocsQ = client.find('io.cozy.timeseries').where({
    source: 'fr.edf',
    date: {
      $and: [
        {
          $gt: energyDocs[0].dataseries.startDate
        },
        {
          $lt: energyDocs[energyDocs.length - 1].dataseries.endDate
        }
      ]
    }
  })

  const aggDocs = await client.queryAll(aggDocsQ)
  if (aggDocs.length < 1) {
    energyDocs.forEach(doc => {
      const agg = aggregateSeries(doc)
      saveAggregations(client, agg)
    })
  }
}

main().catch(e => {
  log('critical', e.message)
  process.exit(1)
})
