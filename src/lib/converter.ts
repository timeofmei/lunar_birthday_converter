import { LunarDay, LunarMonth, SolarDay } from "tyme4ts"

import {
  BIRTHDAY_EVENT_YEAR_COUNT,
  SOLAR_YEAR_MAX,
} from "@/lib/constants"
import type { BirthdayEvent, PersonInput } from "@/lib/types"

export type LunarConversion = {
  lunarYearName: string
  lunarMonth: number
  lunarDay: number
  isLeap: boolean
  label: string
}

export function solarToLunar(
  year: number,
  month: number,
  day: number,
): LunarConversion {
  const lunarDay = SolarDay.fromYmd(year, month, day).getLunarDay()
  const lunarMonth = lunarDay.getLunarMonth()
  const monthName = lunarMonth.getName()
  const dayName = lunarDay.getName()

  return {
    lunarYearName: lunarDay.getYearSixtyCycle().toString(),
    lunarMonth: lunarMonth.getMonth(),
    lunarDay: lunarDay.getDay(),
    isLeap: lunarMonth.isLeap(),
    label: `${lunarMonth.isLeap() ? "闰" : ""}${monthName}${dayName}`,
  }
}

export function getSolarMonthDayCount(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function isCompletePerson(person: PersonInput) {
  return Boolean(
    person.name.trim() && person.lunarMonth !== null && person.lunarDay !== null,
  )
}

function tryCreateLunarDay(
  year: number,
  monthWithLeap: number,
  day: number,
) {
  try {
    return LunarDay.fromYmd(year, monthWithLeap, day)
  } catch {
    return null
  }
}

function createLunarDayWithDayFallback(
  year: number,
  monthWithLeap: number,
  day: number,
  person: PersonInput,
) {
  const lunarDay = tryCreateLunarDay(year, monthWithLeap, day)

  if (lunarDay) {
    return { lunarDay, fallbackNotes: [] }
  }

  if (day !== 30 || person.day30Fallback === "skip") {
    return null
  }

  const fallbackDay = tryCreateLunarDay(year, monthWithLeap, 29)

  if (!fallbackDay) {
    return null
  }

  return { lunarDay: fallbackDay, fallbackNotes: ["29 日代替"] }
}

function getNextLunarMonth(year: number, month: number) {
  try {
    return LunarMonth.fromYm(year, month).next(1)
  } catch {
    return null
  }
}

function resolveBirthdayLunarDay(person: PersonInput, year: number) {
  if (person.lunarMonth === null || person.lunarDay === null) {
    return null
  }

  const monthWithLeap = person.isLeap
    ? -person.lunarMonth
    : person.lunarMonth
  const directResult = createLunarDayWithDayFallback(
    year,
    monthWithLeap,
    person.lunarDay,
    person,
  )

  if (directResult) {
    return directResult
  }

  if (!person.isLeap || person.leapFallback === "skip") {
    return null
  }

  if (person.leapFallback === "sameMonth") {
    const fallbackResult = createLunarDayWithDayFallback(
      year,
      person.lunarMonth,
      person.lunarDay,
      person,
    )

    if (!fallbackResult) {
      return null
    }

    return {
      lunarDay: fallbackResult.lunarDay,
      fallbackNotes: ["普通月代替", ...fallbackResult.fallbackNotes],
    }
  }

  const nextMonth = getNextLunarMonth(year, person.lunarMonth)

  if (!nextMonth) {
    return null
  }

  const fallbackResult = createLunarDayWithDayFallback(
    nextMonth.getYear(),
    nextMonth.getMonthWithLeap(),
    person.lunarDay,
    person,
  )

  if (!fallbackResult) {
    return null
  }

  return {
    lunarDay: fallbackResult.lunarDay,
    fallbackNotes: ["后一月代替", ...fallbackResult.fallbackNotes],
  }
}

function toLunarLabel(lunarDay: LunarDay) {
  const lunarMonth = lunarDay.getLunarMonth()

  return `${lunarMonth.isLeap() ? "闰" : ""}${lunarMonth.getName()}${lunarDay.getName()}`
}

function toDate(solarDay: SolarDay) {
  return new Date(
    solarDay.getYear(),
    solarDay.getMonth() - 1,
    solarDay.getDay(),
  )
}

function toFallbackNote(fallbackNotes: string[]) {
  return fallbackNotes.length > 0 ? `（${fallbackNotes.join("，")}）` : ""
}

export function generatePersonBirthdayEvents(
  person: PersonInput,
  startYear = SOLAR_YEAR_MAX,
  yearCount = BIRTHDAY_EVENT_YEAR_COUNT,
): BirthdayEvent[] {
  if (!isCompletePerson(person)) {
    return []
  }

  const events: BirthdayEvent[] = []

  for (let year = startYear; year < startYear + yearCount; year += 1) {
    const result = resolveBirthdayLunarDay(person, year)

    if (!result) {
      continue
    }

    events.push({
      name: person.name.trim(),
      date: toDate(result.lunarDay.getSolarDay()),
      lunarLabel: toLunarLabel(result.lunarDay),
      fallbackNote: toFallbackNote(result.fallbackNotes),
      description: person.description,
    })
  }

  return events
}

export function generateBirthdayEvents(
  persons: PersonInput[],
  startYear = SOLAR_YEAR_MAX,
  yearCount = BIRTHDAY_EVENT_YEAR_COUNT,
): BirthdayEvent[] {
  return persons
    .flatMap((person) =>
      generatePersonBirthdayEvents(person, startYear, yearCount),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}
