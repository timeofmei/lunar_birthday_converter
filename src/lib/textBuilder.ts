import { generateBirthdayEvents } from "@/lib/converter"
import type { PersonInput } from "@/lib/types"

export const TEXT_FILENAME = "lunar-birthdays.txt"

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function buildBirthdayText(persons: PersonInput[]) {
  const createdDate = formatDate(new Date())
  const lines = [`# 由 农历生日→日历提醒 生成于 ${createdDate}`]

  for (const event of generateBirthdayEvents(persons)) {
    lines.push(
      [
        formatDate(event.date),
        event.name,
        `农历${event.lunarLabel}${event.fallbackNote}`,
        event.description.trim(),
      ]
        .filter(Boolean)
        .join("  "),
    )
  }

  return `${lines.join("\n")}\n`
}
