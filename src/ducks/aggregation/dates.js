import { AGG_BY_DAY, AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR } from './consts'
import {
  parseISO,
  formatISO,
  startOfWeek,
  startOfMonth,
  startOfYear,
  lastDayOfWeek,
  lastDayOfMonth,
  lastDayOfYear
} from 'date-fns'

export const decreaseAggregationLevel = aggregationLevel => {
  if (aggregationLevel === AGG_BY_DAY) {
    throw new Error(
      'Aggregation by day is the minimal supported granularity yet.'
    )
  }
  if (aggregationLevel === AGG_BY_WEEK) {
    return AGG_BY_DAY
  }
  if (aggregationLevel === AGG_BY_MONTH) {
    return AGG_BY_WEEK
  }
  if (aggregationLevel === AGG_BY_YEAR) {
    return AGG_BY_MONTH
  }
  throw new Error('Aggregation level not known')
}

export const increaseAggregationLevel = aggregationLevel => {
  if (aggregationLevel === AGG_BY_DAY) {
    return AGG_BY_WEEK
  }
  if (aggregationLevel === AGG_BY_WEEK) {
    return AGG_BY_MONTH
  }
  if (aggregationLevel === AGG_BY_MONTH) {
    return AGG_BY_YEAR
  }
  if (aggregationLevel === AGG_BY_YEAR) {
    throw new Error(
      'Aggregation by year is the maximal supported granularity yet.'
    )
  }
  throw new Error('Aggregation level not known')
}

export const increaseAggregationDate = (date, aggregationLevel) => {
  date = parseISO(date)
  if (aggregationLevel === AGG_BY_DAY) {
    return formatISO(startOfWeek(date))
  }
  if (aggregationLevel === AGG_BY_WEEK) {
    return formatISO(startOfMonth(date))
  }
  if (aggregationLevel === AGG_BY_MONTH) {
    // Special case: we want all the years
    return null
  }
  if (aggregationLevel === AGG_BY_YEAR) {
    throw new Error(
      'Aggregation by year is the maximal supported granularity yet.'
    )
  }
  throw new Error('Aggregation level not known')
}

export const getLastAggregationDate = (date, aggregationLevel) => {
  if (!date) {
    return null
  }
  date = parseISO(date)
  if (aggregationLevel === AGG_BY_DAY) {
    throw new Error(
      'Aggregation by day is the minimal supported granularity yet.'
    )
  }
  if (aggregationLevel === AGG_BY_WEEK) {
    return formatISO(lastDayOfWeek(date))
  }
  if (aggregationLevel === AGG_BY_MONTH) {
    return formatISO(lastDayOfMonth(date))
  }
  if (aggregationLevel === AGG_BY_YEAR) {
    return formatISO(lastDayOfYear(date))
  }
  throw new Error('Aggregation level not known')
}
