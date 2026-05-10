import { useEffect, useMemo, useReducer } from "react"
import { nanoid } from "nanoid"

import {
  DEFAULT_DAY30_FALLBACK,
  DEFAULT_LEAP_FALLBACK,
  EMPTY_STATE,
  MAX_PERSON_COUNT,
  SCHEMA_VERSION,
} from "@/lib/constants"
import { PERSON_COLORS } from "@/lib/colors"
import { loadStoredState, saveStoredState } from "@/lib/storage"
import type { PersistedState, PersonInput } from "@/lib/types"

type AddAction = { type: "ADD" }
type RemoveAction = { type: "REMOVE"; id: string }
type SelectAction = { type: "SELECT"; id: string }
type UpdateAction = {
  type: "UPDATE"
  id: string
  patch: Partial<Omit<PersonInput, "id" | "colorIndex">>
}
type HydrateAction = { type: "HYDRATE"; state: PersistedState }

export type PersonAction =
  | AddAction
  | RemoveAction
  | SelectAction
  | UpdateAction
  | HydrateAction

function createPerson(colorCounter: number): PersonInput {
  return {
    id: nanoid(),
    name: "",
    colorIndex: colorCounter % PERSON_COLORS.length,
    mode: "lunar",
    lunarMonth: null,
    lunarDay: null,
    isLeap: false,
    leapFallback: DEFAULT_LEAP_FALLBACK,
    day30Fallback: DEFAULT_DAY30_FALLBACK,
    solarYear: null,
    solarMonth: null,
    solarDay: null,
    description: "",
  }
}

function normalizePatch(
  person: PersonInput,
  patch: Partial<Omit<PersonInput, "id" | "colorIndex">>,
): PersonInput {
  const nextPerson = { ...person, ...patch }

  if (
    patch.lunarMonth !== undefined &&
    patch.lunarMonth !== person.lunarMonth &&
    patch.lunarDay === undefined
  ) {
    nextPerson.lunarDay = null
  }

  if (nextPerson.lunarDay !== 30) {
    nextPerson.day30Fallback = DEFAULT_DAY30_FALLBACK
  }

  if (!nextPerson.isLeap) {
    nextPerson.leapFallback = DEFAULT_LEAP_FALLBACK
  }

  if (patch.solarYear !== undefined && patch.solarYear !== person.solarYear) {
    nextPerson.solarMonth = null
    nextPerson.solarDay = null
  }

  if (patch.solarMonth !== undefined && patch.solarMonth !== person.solarMonth) {
    nextPerson.solarDay = null
  }

  return nextPerson
}

export function personReducer(
  state: PersistedState,
  action: PersonAction,
): PersistedState {
  switch (action.type) {
    case "ADD": {
      if (state.persons.length >= MAX_PERSON_COUNT) {
        return state
      }

      const person = createPerson(state.colorCounter)

      return {
        ...state,
        persons: [...state.persons, person],
        selectedId: person.id,
        colorCounter: state.colorCounter + 1,
      }
    }

    case "REMOVE": {
      const persons = state.persons.filter((person) => person.id !== action.id)

      return {
        ...state,
        persons,
        selectedId: persons.at(-1)?.id ?? null,
      }
    }

    case "SELECT":
      if (!state.persons.some((person) => person.id === action.id)) {
        return state
      }

      return { ...state, selectedId: action.id }

    case "UPDATE":
      return {
        ...state,
        persons: state.persons.map((person) =>
          person.id === action.id ? normalizePatch(person, action.patch) : person,
        ),
      }

    case "HYDRATE":
      return {
        ...action.state,
        schemaVersion: SCHEMA_VERSION,
      }

    default:
      return state
  }
}

function initState(): PersistedState {
  if (typeof window === "undefined") {
    return EMPTY_STATE
  }

  return loadStoredState()
}

export function usePersonStore() {
  const [state, dispatch] = useReducer(personReducer, undefined, initState)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      saveStoredState(state)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [state])

  const selectedPerson = useMemo(
    () => state.persons.find((person) => person.id === state.selectedId) ?? null,
    [state.persons, state.selectedId],
  )

  return {
    state,
    selectedPerson,
    dispatch,
    canAddPerson: state.persons.length < MAX_PERSON_COUNT,
  }
}
