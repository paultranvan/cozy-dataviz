import { Index } from 'pondjs'
import { QueryTimeSerie } from './queries'
import { AGG_BY_DAY, AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR } from './consts'

const groupByDate = (date, aggregationLevel) => {
  if (aggregationLevel === AGG_BY_DAY) {
    return Index.getDailyIndexString(date)
  }
  if (aggregationLevel === AGG_BY_WEEK) {
    return Index.getIndexString('7d', date)
  }
  if (aggregationLevel === AGG_BY_MONTH) {
    return Index.getMonthlyIndexString(date)
  }
  if (aggregationLevel === AGG_BY_YEAR) {
    return Index.getYearlyIndexString(date)
  }
  return null
}

export const loadDataGraph = ({
  dataType,
  aggregationLevel,
  startDate,
  endDate
}) => {
  const data = QueryTimeSerie({
    type: dataType,
    aggregationLevel,
    startDate,
    endDate
  })
  return data
    ? data.map(point => {
        const timeIndex = groupByDate(new Date(point.date), aggregationLevel)
        const value = point.sum
        return [timeIndex, value]
      })
    : null
}
