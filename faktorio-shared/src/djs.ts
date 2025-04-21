import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOfBefore from 'dayjs/plugin/isSameOrBefore'
import duration from 'dayjs/plugin/duration'
import isBetween from 'dayjs/plugin/isBetween'
import dayOfYear from 'dayjs/plugin/dayOfYear'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import isoWeek from 'dayjs/plugin/isoWeek'

// Most used dayjs extensions
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(localizedFormat)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOfBefore)
dayjs.extend(isBetween)
dayjs.extend(duration)
dayjs.extend(dayOfYear)
dayjs.extend(weekday)
dayjs.extend(localeData)
dayjs.extend(isoWeek)

export function dayjsFromNow(value: string | Date): string {
  return dayjs(value).fromNow()
}

// @deprecated prefer djs over dayjs, dayjs is problematic, because vscode can easily import the wrong dayjs, which is not extended with plugins
export { dayjs }
/**
 * Alway use this export when importing dayjs so that you get all the needed plugins loaded
 */
export { dayjs as djs }
export type { Dayjs } from 'dayjs'
