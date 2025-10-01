import { djs } from 'faktorio-shared/src/djs'

// Czech public holidays
const getCzechHolidays = (year: number): Date[] => {
  const holidays: Date[] = [
    new Date(year, 0, 1), // New Year's Day
    new Date(year, 4, 1), // Labour Day
    new Date(year, 4, 8), // Victory Day
    new Date(year, 6, 5), // Saints Cyril and Methodius
    new Date(year, 6, 6), // Jan Hus Day
    new Date(year, 8, 28), // Czech Statehood Day
    new Date(year, 9, 28), // Independent Czechoslovak State Day
    new Date(year, 10, 17), // Struggle for Freedom and Democracy Day
    new Date(year, 11, 24), // Christmas Eve
    new Date(year, 11, 25), // Christmas Day
    new Date(year, 11, 26) // St. Stephen's Day
  ]

  // Easter Monday (movable holiday)
  const easterMonday = getEasterMonday(year)
  holidays.push(easterMonday)

  // Good Friday (movable holiday, from 2016)
  if (year >= 2016) {
    const goodFriday = new Date(easterMonday)
    goodFriday.setDate(easterMonday.getDate() - 3)
    holidays.push(goodFriday)
  }

  return holidays
}

// Calculate Easter Monday using Meeus's algorithm
const getEasterMonday = (year: number): Date => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1

  const easterSunday = new Date(year, month, day)
  const easterMonday = new Date(easterSunday)
  easterMonday.setDate(easterSunday.getDate() + 1)

  return easterMonday
}

const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

const isHoliday = (date: Date, holidays: Date[]): boolean => {
  return holidays.some(
    (holiday) =>
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
  )
}

export const getWorkingDaysInMonth = (year: number, month: number): number => {
  const holidays = getCzechHolidays(year)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let workingDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    if (!isWeekend(date) && !isHoliday(date, holidays)) {
      workingDays++
    }
  }

  return workingDays
}

const czechMonths = [
  'leden',
  'únor',
  'březen',
  'duben',
  'květen',
  'červen',
  'červenec',
  'srpen',
  'září',
  'říjen',
  'listopad',
  'prosinec'
]

export const getCurrentMonthWorkingDays = (): {
  workingDays: number
  hours: number
  month: string
} => {
  const now = djs()
  const year = now.year()
  const month = now.month()
  const workingDays = getWorkingDaysInMonth(year, month)
  const hours = workingDays * 8

  return {
    workingDays,
    hours,
    month: `${czechMonths[month]} ${year}`
  }
}
