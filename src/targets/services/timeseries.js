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
        aggSerie[new Date(currDateAgg).toISOString()] = {
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

// TODO: this might be simplified / splitted in functions
// to avoid multiples loops
const saveAggregations = async (client, aggregatedSeries) => {
  console.log('aggs : ', aggregatedSeries)
    aggregatedSeries.forEach(singleAggregationSeries => {
      singleAggregationSeries.forEach(async singleAgg => {
        const dates = Object.keys(singleAgg)
        if (dates.length > 0) {
          try {
            const docs = dates.map( date => {
              return {
                date,
                ...singleAgg[date]
              }
            })
            await client.stackClient.collection('io.cozy.timeseries').updateAll(docs)
          } catch (err) {
            console.error(err)
          }
        }
      })
    })

}

const main = async () => {
  const client = CozyClient.fromEnv()

  const edfQ = client.find('io.cozy.timeseries.fr.edf').where({
    'cozyMetadata.updatedAt': {
      $gt: null
    }
  })

  const enedisQ = client.find('io.cozy.timeseries.fr.enedis').where({
    'cozyMetadata.updatedAt': {
      $gt: null
    }
  })

  const edfDocs = await client.queryAll(edfQ)
  const enedisDocs = await client.queryAll(enedisQ)
  console.log('edf : ', edfDocs)
  console.log('enedis : ', enedisDocs)

  const aggDocsQ = client.find('io.cozy.timeseries').where({
    source: 'fr.edf',
    date: {
      $and: [
        {
          $gt: edfDocs[0].dataseries.startDate
        },
        {
          $lt: edfDocs[edfDocs.length - 1].dataseries.endDate
        }
      ]
    }
  })

  const aggDocs = await client.queryAll(aggDocsQ)

  // TODO: deal with updates
  if (aggDocs.length < 1) {
    edfDocs.forEach(doc => {
      const aggregations = aggregateSeries(doc)
      saveAggregations(client, aggregations)
    })
    enedisDocs.forEach(doc => {
      const aggregations = aggregateSeries(doc)
      saveAggregations(client, aggregations)
    })
  }
}

main().catch(e => {
  log('critical', e.message)
  process.exit(1)
})
