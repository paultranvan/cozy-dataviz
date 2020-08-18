import { useQuery, Q } from 'cozy-client'

const buildQueryDefinition = (type, aggregationLevel) => {
  return Q('io.cozy.timeseries')
    .select(['date', 'sum', 'count'])
    .where({
      type: type,
      aggregationLevel: aggregationLevel
    })
    .sortBy([{ date: 'asc' }])
}

export const QueryTimeSerie = ({ type, aggregationLevel }) => {
  console.log(`query with ${type} - ${aggregationLevel}`)

  const queryDef = buildQueryDefinition(type, aggregationLevel)
  const options = {
    as: `load-${type}-${aggregationLevel}`
  }
  const results = useQuery(() => queryDef, options)
  return results.data ? results.data : null
}
