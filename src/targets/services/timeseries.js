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

/* 
  Determine which min agg level should be run.

  For instance, we aggregate to the day if : 
    - the start / end dates interval is less than a day, OR
    - the start / second dates interval is 1 (suppose completeness)
*/
const minAggLevel = dataseries => {
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

const applyAggregation = (dataseries, compareIntervalFct) => {
  const agg = dataseries.series.map(serie => {
    const aggSerie = {}
    let sum = 0
    let count = 0
    let currDateAgg = parseISO(dataseries.dates[0])
    for (let i = 0; i < serie.values.length; i++) {
      if (compareIntervalFct(parseISO(dataseries.dates[i]), currDateAgg) > 0) {
        aggSerie[formatISO(currDateAgg)] = {
          sum,
          count,
          type: serie.type
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
  console.log('agg : ', agg)
}

const aggSeries = dataseries => {
  const aggLevel = minAggLevel(dataseries)
  const aggregationRuns = {
    [AGG_BY_DAY]: [
      differenceInCalendarDays,
      differenceInCalendarWeeks,
      differenceInCalendarMonths,
      differenceInCalendarYears
    ],
    [AGG_BY_WEEK]: [
      differenceInCalendarWeeks,
      differenceInCalendarMonths,
      differenceInCalendarYears
    ],
    [AGG_BY_MONTH]: [differenceInCalendarMonths, differenceInCalendarYears],
    [AGG_BY_YEAR]: [differenceInCalendarYears]
  }
  aggregationRuns[aggLevel].forEach(diffFct => {
    applyAggregation(dataseries, diffFct)
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
  console.log('agg docs : ', aggDocs)
  if (aggDocs.length < 1) {
    energyDocs.forEach(doc => {
      aggSeries(doc.dataseries)
    })
  }
}

main().catch(e => {
  log('critical', e.message)
  process.exit(1)
})
