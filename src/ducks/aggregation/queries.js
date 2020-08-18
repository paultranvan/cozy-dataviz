import { useQuery, Q } from 'cozy-client'

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

const buildQueryDefinition = (type, aggregationLevel, startDate, endDate) => {
  return Q('io.cozy.timeseries')
    .select(['date', 'sum', 'count'])
    .where({
      date: dateRangeQuery(startDate, endDate),
      type: type,
      aggregationLevel: aggregationLevel
    })
    .sortBy([{ date: 'asc' }])
}

export const QueryTimeSerie = ({
  type,
  aggregationLevel,
  startDate,
  endDate
}) => {
  console.log(`query with ${type} - ${aggregationLevel}`)

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
