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
const minAggregationLevel = dataserie => {
  const startDate = parseISO(dataserie.startDate)
  const endDate = parseISO(dataserie.endDate)
  const secondDate = parseISO(dataserie.dates[1])

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
const applyAggregation = (dataserie, aggLevel, dbSource, dataSource) => {
  const compareIntervalFct = mapAggregationLevelToFunc[aggLevel]
  const aggSerie = {}
  let sum = dataserie.values[0]
  let count = 1
  let currDateAgg = parseISO(dataserie.dates[0])

  for (let i = 0; i < dataserie.dates.length; i++) {
    if (compareIntervalFct(parseISO(dataserie.dates[i]), currDateAgg) > 0) {
      aggSerie[new Date(currDateAgg).toISOString()] = {
        sum,
        count,
        type: dataserie.type,
        aggregationLevel: aggLevel,
        dbSource,
        dataSource
      }
      sum = dataserie.values[i]
      count = 1
      currDateAgg = parseISO(dataserie.dates[i])
    } else {
      sum += dataserie.values[i]
      count++
    }
  }
  return aggSerie
}

/*
  Aggregate data series on the computed times intervals
*/
const aggregateSeries = doc => {
  // TODO: change this: should return the values to aggregate for each agg level
  // in order to support irregulate data (such as running sessions records)
  const minAggLevel = minAggregationLevel(doc.dataserie)
  const aggregationRuns = {
    [AGG_BY_DAY]: [AGG_BY_DAY, AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR],
    [AGG_BY_WEEK]: [AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR],
    [AGG_BY_MONTH]: [AGG_BY_MONTH, AGG_BY_YEAR],
    [AGG_BY_YEAR]: AGG_BY_YEAR
  }
  return aggregationRuns[minAggLevel].map(aggLevel =>
    applyAggregation(doc.dataserie, aggLevel, doc.dbSource, doc.dataSource)
  )
}

const saveAggregations = async (client, aggregatedSeries) => {
  aggregatedSeries.forEach(async aggSerie => {
    const dates = Object.keys(aggSerie)
    if (dates.length > 0) {
      try {
        const docs = dates.map(date => {
          return {
            date,
            ...aggSerie[date]
          }
        })
        await client.stackClient
          .collection('io.cozy.timeseries')
          .updateAll(docs)
      } catch (err) {
        console.error(err)
      }
    }
  })
}

const main = async () => {
  const client = CozyClient.fromEnv()

  const edfQ = client
    .find('io.cozy.timeseries.fr.edf')
    .where({
      $and: [
        {
          'cozyMetadata.updatedAt': {
            $gt: null
          }
        },
        {
          $or: [
            {
              'dataserie.type': 'electricity'
            },
            {
              'dataserie.type': 'gas'
            }
          ]
        }
      ]
    })
  .indexFields(['cozyMetadata.updatedAt', 'dataserie.type'])

  const enedisQ = client.find('io.cozy.timeseries.fr.enedis').where({
    'cozyMetadata.updatedAt': {
      $gt: null
    }
  })

  const edfDocs = await client.queryAll(edfQ)
  const enedisDocs = await client.queryAll(enedisQ)
  console.log('edf : ', edfDocs)
  console.log('enedis : ', enedisDocs)

  // Here, we suppose the docs are sorted on the dataserie dates,
  // which is not always the case
  const aggDocsQ = client.find('io.cozy.timeseries').where({
    dbSource: 'io.cozy.timeseries.fr.edf', //TODO support enedis
    date: {
      $and: [
        {
          $gt: edfDocs[0].dataserie.startDate
        },
        {
          $lt: edfDocs[edfDocs.length - 1].dataserie.endDate
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
  } else {
    console.log(`${aggDocs.length} docs retrieved`)
  }
}

main().catch(e => {
  log('critical', e.message)
  process.exit(1)
})
