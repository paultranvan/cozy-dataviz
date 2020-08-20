import { useQuery, Q } from 'cozy-client'
import log from 'cozy-logger'

const dateRangeQuery = (startDate, endDate) => {
  return endDate
    ? {
        $gt: startDate,
        $lt: endDate
      }
    : {
        $gt: null
      }
}

/*
  The sort order is important for performances: the date must at the end
  so the range evaluation is performed on [type, agg] sorted data.
*/
const buildQueryDefinition = (type, aggregationLevel, startDate, endDate) => {
  return Q('io.cozy.timeseries')
    .select(['date', 'sum', 'count'])
    .where({
      type: type,
      aggregationLevel: aggregationLevel,
      date: dateRangeQuery(startDate, endDate)
    })
    .sortBy([{ type: 'asc' }, { aggregationLevel: 'asc' }, { date: 'asc' }])
}

export const QueryTimeSerie = ({
  type,
  aggregationLevel,
  startDate,
  endDate
}) => {
  log(
    'info',
    `query with ${type} - ${aggregationLevel} from ${startDate} to ${endDate}`
  )
  const queryDef = buildQueryDefinition(
    type,
    aggregationLevel,
    startDate,
    endDate
  )
  const options = {
    as: `load-${type}-${aggregationLevel}-${startDate}-${endDate}`
  }
  const results = useQuery(() => queryDef, options)
  return results.data ? results.data : null
}
