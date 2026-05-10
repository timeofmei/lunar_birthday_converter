import ical from "ical-generator"

import { generateBirthdayEvents } from "@/lib/converter"
import type { BirthdayEvent, PersonInput } from "@/lib/types"

export const ICS_FILENAME = "lunar-birthdays.ics"

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function buildDescription(event: BirthdayEvent) {
  return [event.lunarLabel + event.fallbackNote, event.description.trim()]
    .filter(Boolean)
    .join("\n")
}

export function buildIcsCalendar(persons: PersonInput[]) {
  const calendar = ical({
    name: "农历生日",
    prodId: {
      company: "lunar-birthday-ics",
      product: "lunar-birthday-converter",
      language: "ZH-CN",
    },
  })

  for (const event of generateBirthdayEvents(persons)) {
    calendar.createEvent({
      allDay: true,
      start: event.date,
      end: addDays(event.date, 1),
      summary: `${event.name} 生日`,
      description: buildDescription(event),
    })
  }

  return calendar.toString()
}
