import { Index } from 'pondjs'
import { QueryTimeSerie } from './queries'
import { AGG_BY_DAY, AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR } from './consts'

const timeInterval = aggregationLevel => {
  if (aggregationLevel === AGG_BY_DAY) {
    return '1d'
  }
  if (aggregationLevel === AGG_BY_WEEK) {
    return '1w'
  }
  if (aggregationLevel === AGG_BY_MONTH) {
    return '1m'
  }
  if (aggregationLevel === AGG_BY_YEAR) {
    return '1y'
  }
  return null
}

export const loadDataGraph = ({ dataType, aggregationLevel }) => {
  const data = QueryTimeSerie({
    type: dataType,
    aggregationLevel
  })
  const interval = timeInterval(aggregationLevel)
  return data && interval
    ? data.map(point => {
        return [Index.getIndexString(interval, new Date(point.date)), point.sum]
      })
    : null
}
