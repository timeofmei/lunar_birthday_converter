import type { Day30Fallback, LeapFallback, PersistedState } from "@/lib/types"

export const MAX_PERSON_COUNT = 8

export const STORAGE_KEY = "lunar-birthday-ics:state"

export const SCHEMA_VERSION = 1

export const SOLAR_YEAR_MIN = 1900

export const SOLAR_TODAY = new Date()

export const SOLAR_YEAR_MAX = SOLAR_TODAY.getFullYear()

export const BIRTHDAY_EVENT_YEAR_COUNT = 100

export const DEFAULT_LEAP_FALLBACK: LeapFallback = "sameMonth"

export const DEFAULT_DAY30_FALLBACK: Day30Fallback = "use29"

export const EMPTY_STATE: PersistedState = {
  persons: [],
  selectedId: null,
  colorCounter: 0,
  schemaVersion: SCHEMA_VERSION,
}
