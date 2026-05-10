import { EMPTY_STATE, SCHEMA_VERSION, STORAGE_KEY } from "@/lib/constants"
import type { PersistedState, PersonInput } from "@/lib/types"

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isPersonInput(value: unknown): value is PersonInput {
  if (!isObject(value)) {
    return false
  }

  const mode = value.mode
  const leapFallback = value.leapFallback
  const day30Fallback = value.day30Fallback

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.colorIndex === "number" &&
    (mode === "lunar" || mode === "solar") &&
    (typeof value.lunarMonth === "number" || value.lunarMonth === null) &&
    (typeof value.lunarDay === "number" || value.lunarDay === null) &&
    typeof value.isLeap === "boolean" &&
    (leapFallback === "sameMonth" ||
      leapFallback === "nextMonth" ||
      leapFallback === "skip") &&
    (day30Fallback === "use29" || day30Fallback === "skip") &&
    (typeof value.solarYear === "number" || value.solarYear === null) &&
    (typeof value.solarMonth === "number" || value.solarMonth === null) &&
    (typeof value.solarDay === "number" || value.solarDay === null) &&
    typeof value.description === "string"
  )
}

function normalizeState(value: unknown): PersistedState | null {
  if (!isObject(value) || value.schemaVersion !== SCHEMA_VERSION) {
    return null
  }

  if (
    !Array.isArray(value.persons) ||
    !value.persons.every(isPersonInput) ||
    (typeof value.selectedId !== "string" && value.selectedId !== null) ||
    typeof value.colorCounter !== "number"
  ) {
    return null
  }

  const selectedPerson = value.persons.find(
    (person) => person.id === value.selectedId,
  )

  return {
    persons: value.persons,
    selectedId: selectedPerson?.id ?? value.persons.at(-1)?.id ?? null,
    colorCounter: value.colorCounter,
    schemaVersion: SCHEMA_VERSION,
  }
}

export function loadStoredState(): PersistedState {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY)

    if (!rawState) {
      return EMPTY_STATE
    }

    const state = normalizeState(JSON.parse(rawState))

    if (!state) {
      localStorage.removeItem(STORAGE_KEY)
      return EMPTY_STATE
    }

    return state
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return EMPTY_STATE
  }
}

export function saveStoredState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
