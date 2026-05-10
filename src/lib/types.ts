export type BirthdayMode = "lunar" | "solar"

export type LeapFallback = "sameMonth" | "nextMonth" | "skip"

export type Day30Fallback = "use29" | "skip"

export type PersonInput = {
  id: string
  name: string
  colorIndex: number
  mode: BirthdayMode
  lunarMonth: number | null
  lunarDay: number | null
  isLeap: boolean
  leapFallback: LeapFallback
  day30Fallback: Day30Fallback
  solarYear: number | null
  solarMonth: number | null
  solarDay: number | null
  description: string
}

export type BirthdayEvent = {
  name: string
  date: Date
  lunarLabel: string
  fallbackNote: string
  description: string
}

export type PersistedState = {
  persons: PersonInput[]
  selectedId: string | null
  colorCounter: number
  schemaVersion: number
}
