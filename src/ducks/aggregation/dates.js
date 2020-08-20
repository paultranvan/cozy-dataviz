import { AGG_BY_DAY, AGG_BY_WEEK, AGG_BY_MONTH, AGG_BY_YEAR } from './consts'
import {
  parseISO,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear
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

export const getFirstIncreasedAggregationDate = (date, newAggLevel) => {
  date = parseISO(date)
  if (newAggLevel === AGG_BY_DAY) {
    return new Date(startOfWeek(date)).toISOString()
  }
  if (newAggLevel === AGG_BY_WEEK) {
    return new Date(startOfMonth(date)).toISOString()
  }
  if (newAggLevel === AGG_BY_MONTH) {
    return new Date(startOfYear(date)).toISOString()
  }
  if (newAggLevel === AGG_BY_YEAR) {
    // Special case: we want all the years
    return null
  }
  throw new Error('Aggregation level not known')
}

export const getLastIncreasedAggregationDate = (date, newAggLevel) => {
  if (!date) {
    return null
  }
  date = parseISO(date)
  if (newAggLevel === AGG_BY_DAY) {
    return new Date(endOfWeek(date)).toISOString()
  }
  if (newAggLevel === AGG_BY_WEEK) {
    return new Date(endOfMonth(date)).toISOString()
  }
  if (newAggLevel === AGG_BY_MONTH) {
    return new Date(endOfYear(date)).toISOString()
  }
  if (newAggLevel === AGG_BY_YEAR) {
    // Special case: we want all the years
    return null
  }
  throw new Error('Aggregation level not known')
}
