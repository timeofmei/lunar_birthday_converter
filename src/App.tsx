import {
  Calendar,
  Download,
  FileText,
  Gift,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { Textarea } from "@/components/ui/textarea"
import { PERSON_COLORS } from "@/lib/colors"
import { MAX_PERSON_COUNT, SOLAR_TODAY, SOLAR_YEAR_MAX, SOLAR_YEAR_MIN } from "@/lib/constants"
import { getSolarMonthDayCount, solarToLunar } from "@/lib/converter"
import { downloadTextFile, isWechatBrowser } from "@/lib/download"
import { buildIcsCalendar, ICS_FILENAME } from "@/lib/icsBuilder"
import { buildBirthdayText, TEXT_FILENAME } from "@/lib/textBuilder"
import type { PersonInput } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePersonStore } from "@/hooks/usePersonStore"

const LUNAR_MONTHS = [
  "正月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "冬月",
  "腊月",
]

const LUNAR_DAYS = [
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十",
]

const SOLAR_YEARS = Array.from(
  { length: SOLAR_YEAR_MAX - SOLAR_YEAR_MIN + 1 },
  (_, index) => SOLAR_YEAR_MAX - index,
)

function getSolarMonths(year: number | null) {
  if (!year) {
    return []
  }

  const monthCount = year === SOLAR_YEAR_MAX ? SOLAR_TODAY.getMonth() + 1 : 12

  return Array.from({ length: monthCount }, (_, index) => index + 1)
}

function getSolarDays(year: number | null, month: number | null) {
  if (!year || !month) {
    return []
  }

  const monthDayCount = getSolarMonthDayCount(year, month)
  const dayCount =
    year === SOLAR_YEAR_MAX && month === SOLAR_TODAY.getMonth() + 1
      ? Math.min(monthDayCount, SOLAR_TODAY.getDate())
      : monthDayCount

  return Array.from({ length: dayCount }, (_, index) => index + 1)
}

function buildSolarPatch(
  person: PersonInput,
  patch: Partial<
    Pick<PersonInput, "solarYear" | "solarMonth" | "solarDay">
  >,
): Partial<Omit<PersonInput, "id" | "colorIndex">> {
  const nextYear = patch.solarYear ?? person.solarYear
  const nextMonth =
    patch.solarYear !== undefined ? null : patch.solarMonth ?? person.solarMonth
  const nextDay =
    patch.solarYear !== undefined || patch.solarMonth !== undefined
      ? null
      : patch.solarDay ?? person.solarDay
  const nextPatch: Partial<Omit<PersonInput, "id" | "colorIndex">> = patch

  if (nextYear && nextMonth && nextDay) {
    const lunar = solarToLunar(nextYear, nextMonth, nextDay)

    nextPatch.lunarMonth = lunar.lunarMonth
    nextPatch.lunarDay = lunar.lunarDay
    nextPatch.isLeap = lunar.isLeap
  }

  return nextPatch
}

function getExportBlockReason(persons: PersonInput[]) {
  if (persons.length === 0) {
    return "请先添加至少一个人"
  }

  if (persons.some((person) => !person.name.trim())) {
    return "请先补全所有人员姓名"
  }

  if (
    persons.some((person) =>
      person.mode === "lunar"
        ? person.lunarMonth === null || person.lunarDay === null
        : person.solarYear === null ||
          person.solarMonth === null ||
          person.solarDay === null,
    )
  ) {
    return "请先补全所有人员生日日期"
  }

  return null
}

type ExportFormat = "ics" | "txt"

function App() {
  const { state, selectedPerson, dispatch, canAddPerson } = usePersonStore()
  const [exportSheetOpen, setExportSheetOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("ics")
  const [wechatSheet, setWechatSheet] = useState<{ open: boolean; content: string; format: ExportFormat }>({ open: false, content: "", format: "ics" })
  const [showAllYears, setShowAllYears] = useState(false)
  const [yearInput, setYearInput] = useState("")

  useEffect(() => {
    if (showAllYears) {
      setYearInput(selectedPerson?.solarYear?.toString() ?? "")
    }
  }, [selectedPerson?.id])

  const selectedColor = selectedPerson
    ? PERSON_COLORS[selectedPerson.colorIndex]
    : null
  const solarMonths = getSolarMonths(selectedPerson?.solarYear ?? null)
  const solarDays = getSolarDays(
    selectedPerson?.solarYear ?? null,
    selectedPerson?.solarMonth ?? null,
  )
  const solarConversion =
    selectedPerson?.solarYear &&
    selectedPerson.solarMonth &&
    selectedPerson.solarDay
      ? solarToLunar(
          selectedPerson.solarYear,
          selectedPerson.solarMonth,
          selectedPerson.solarDay,
        )
      : null
  const showLeapFallback =
    selectedPerson?.mode === "lunar"
      ? selectedPerson.isLeap
      : solarConversion?.isLeap === true
  const showDay30Fallback =
    selectedPerson?.mode === "lunar"
      ? selectedPerson.lunarDay === 30
      : solarConversion?.lunarDay === 30
  const exportBlockReason = getExportBlockReason(state.persons)

  const getPersonButtonStyle = (
    color: (typeof PERSON_COLORS)[number],
  ): CSSProperties & { "--tw-ring-color": string } => ({
    backgroundColor: color.bg,
    color: color.text,
    "--tw-ring-color": color.ring,
  })

  const handleExportClick = () => {
    if (exportBlockReason) {
      toast.warning(exportBlockReason)
      return
    }

    setExportSheetOpen(true)
  }

  const handleAddPerson = () => {
    if (!canAddPerson) {
      toast.info(`最多 ${MAX_PERSON_COUNT} 人`)
      return
    }

    dispatch({ type: "ADD" })
  }

  const handleConfirmExport = () => {
    const content =
      exportFormat === "ics"
        ? buildIcsCalendar(state.persons)
        : buildBirthdayText(state.persons)

    setExportSheetOpen(false)

    if (isWechatBrowser()) {
      setWechatSheet({ open: true, content, format: exportFormat })
      return
    }

    if (exportFormat === "ics") {
      downloadTextFile(ICS_FILENAME, content, "text/calendar;charset=utf-8")
    } else {
      downloadTextFile(TEXT_FILENAME, content, "text/plain;charset=utf-8")
    }
  }

  return (
    <main className="mx-auto flex h-dvh w-full flex-col bg-background text-left sm:max-w-sm sm:border-x sm:shadow-sm">
      <header className="flex flex-none items-center gap-3 border-b px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Gift className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="!m-0 truncate !text-lg font-semibold !tracking-normal">
            农历生日 → 日历提醒
          </h1>
          <p className="text-xs text-muted-foreground">
            生成日历文件，导入提醒
          </p>
        </div>
      </header>

      <section className="flex min-h-0 flex-1">
        <aside className="flex w-[52px] flex-none flex-col items-center gap-2 overflow-y-auto border-r py-3">
          {state.persons.map((person, index) => {
            const color = PERSON_COLORS[person.colorIndex]
            const isSelected = person.id === state.selectedId

            return (
              <button
                key={person.id}
                type="button"
                aria-label={`选择 ${person.name || `第 ${index + 1} 人`}`}
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl text-sm font-semibold outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring/50",
                  isSelected && "ring-2 ring-offset-1",
                )}
                style={getPersonButtonStyle(color)}
                onClick={() => dispatch({ type: "SELECT", id: person.id })}
              >
                {person.name.trim().charAt(0) || index + 1}
              </button>
            )
          })}

          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className={cn(
              "border-dashed",
              !canAddPerson && "cursor-not-allowed opacity-50",
            )}
            aria-disabled={!canAddPerson}
            title={canAddPerson ? "添加人员" : `最多 ${MAX_PERSON_COUNT} 人`}
            onClick={handleAddPerson}
          >
            <Plus />
          </Button>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto px-3 py-3">
          {!selectedPerson ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
                <Plus className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                点击左侧 + 添加第一个人
              </p>
              <Button type="button" size="sm" onClick={handleAddPerson}>
                <Plus />
                添加人员
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: selectedColor?.ring }}
                  />
                  <h2 className="truncate text-base font-semibold tracking-normal">
                    {selectedPerson.name || "未命名"}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    dispatch({ type: "REMOVE", id: selectedPerson.id })
                  }
                >
                  <Trash2 />
                  删除
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="person-name">姓名</Label>
                <Input
                  id="person-name"
                  value={selectedPerson.name}
                  placeholder="请输入姓名"
                  onChange={(event) =>
                    dispatch({
                      type: "UPDATE",
                      id: selectedPerson.id,
                      patch: { name: event.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>生日输入方式</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={selectedPerson.mode === "lunar" ? "default" : "outline"}
                    className="h-9"
                    onClick={() =>
                      dispatch({
                        type: "UPDATE",
                        id: selectedPerson.id,
                        patch: { mode: "lunar" },
                      })
                    }
                  >
                    农历
                  </Button>
                  <Button
                    type="button"
                    variant={selectedPerson.mode === "solar" ? "default" : "outline"}
                    className="h-9"
                    onClick={() =>
                      dispatch({
                        type: "UPDATE",
                        id: selectedPerson.id,
                        patch: { mode: "solar" },
                      })
                    }
                  >
                    公历
                  </Button>
                </div>
              </div>

              {selectedPerson.mode === "lunar" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0 space-y-2">
                      <Label>农历月份</Label>
                      <Select
                        value={selectedPerson.lunarMonth?.toString() ?? ""}
                        onValueChange={(value) =>
                          dispatch({
                            type: "UPDATE",
                            id: selectedPerson.id,
                            patch: { lunarMonth: Number(value) },
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择月份" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="max-h-64 w-(--radix-select-trigger-width)"
                        >
                          {LUNAR_MONTHS.map((month, index) => (
                            <SelectItem key={month} value={(index + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Label>农历日期</Label>
                      <Select
                        value={selectedPerson.lunarDay?.toString() ?? ""}
                        disabled={!selectedPerson.lunarMonth}
                        onValueChange={(value) =>
                          dispatch({
                            type: "UPDATE",
                            id: selectedPerson.id,
                            patch: { lunarDay: Number(value) },
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              selectedPerson.lunarMonth
                                ? "选择日期"
                                : "请先选月份"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="max-h-60 w-(--radix-select-trigger-width)"
                        >
                          {LUNAR_DAYS.map((day, index) => (
                            <SelectItem key={day} value={(index + 1).toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <label className="flex min-h-8 items-center gap-2 rounded-lg border bg-muted/30 px-2.5 text-sm">
                    <Checkbox
                      checked={selectedPerson.isLeap}
                      onCheckedChange={(checked) =>
                        dispatch({
                          type: "UPDATE",
                          id: selectedPerson.id,
                          patch: { isLeap: checked === true },
                        })
                      }
                    />
                    此日期为闰月生日
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="min-w-0 space-y-2">
                      <Label>{showAllYears ? "公元" : "年"}</Label>
                      {showAllYears ? (
                        <Input
                          type="number"
                          min={1}
                          max={SOLAR_YEAR_MAX}
                          placeholder="年份"
                          value={yearInput}
                          aria-invalid={
                            yearInput !== "" &&
                            (!/^\d+$/.test(yearInput) ||
                              Number(yearInput) < 1 ||
                              Number(yearInput) > SOLAR_YEAR_MAX)
                          }
                          onChange={(e) => {
                            const raw = e.target.value
                            setYearInput(raw)
                            const year = Number(raw)
                            if (
                              /^\d+$/.test(raw) &&
                              year >= 1 &&
                              year <= SOLAR_YEAR_MAX
                            ) {
                              dispatch({
                                type: "UPDATE",
                                id: selectedPerson.id,
                                patch: buildSolarPatch(selectedPerson, {
                                  solarYear: year,
                                }),
                              })
                            }
                          }}
                        />
                      ) : (
                        <Select
                          value={selectedPerson.solarYear?.toString() ?? ""}
                          onValueChange={(value) =>
                            dispatch({
                              type: "UPDATE",
                              id: selectedPerson.id,
                              patch: buildSolarPatch(selectedPerson, {
                                solarYear: Number(value),
                              }),
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="年份" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="max-h-60 w-(--radix-select-trigger-width)"
                          >
                            {SOLAR_YEARS.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Label>月</Label>
                      <Select
                        value={selectedPerson.solarMonth?.toString() ?? ""}
                        disabled={!selectedPerson.solarYear}
                        onValueChange={(value) =>
                          dispatch({
                            type: "UPDATE",
                            id: selectedPerson.id,
                            patch: buildSolarPatch(selectedPerson, {
                              solarMonth: Number(value),
                            }),
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="月份" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="max-h-64 w-(--radix-select-trigger-width)"
                        >
                          {solarMonths.map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {month} 月
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Label>日</Label>
                      <Select
                        value={selectedPerson.solarDay?.toString() ?? ""}
                        disabled={!selectedPerson.solarMonth}
                        onValueChange={(value) =>
                          dispatch({
                            type: "UPDATE",
                            id: selectedPerson.id,
                            patch: buildSolarPatch(selectedPerson, {
                              solarDay: Number(value),
                            }),
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="日期" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="max-h-60 w-(--radix-select-trigger-width)"
                        >
                          {solarDays.map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day} 日
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <label className="flex min-h-8 items-center gap-2 rounded-lg border bg-muted/30 px-2.5 text-sm">
                    <Checkbox
                      checked={showAllYears}
                      onCheckedChange={(checked) => {
                        const next = checked === true
                        setShowAllYears(next)
                        setYearInput(next ? (selectedPerson.solarYear?.toString() ?? "") : "")
                      }}
                    />
                    显示所有年份
                  </label>

                  {solarConversion ? (
                    <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950">
                      <Sparkles className="size-4 text-violet-600" />
                      <span>
                        农历 {solarConversion.lunarYearName}年{" "}
                        {solarConversion.label}
                        {solarConversion.isLeap ? "（闰月）" : "（非闰月）"}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {showLeapFallback ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <Label>闰月降级策略</Label>
                  <Select
                    value={selectedPerson.leapFallback}
                    onValueChange={(value) =>
                      dispatch({
                        type: "UPDATE",
                        id: selectedPerson.id,
                        patch: {
                          leapFallback: value as PersonInput["leapFallback"],
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sameMonth">用普通月代替</SelectItem>
                      <SelectItem value="nextMonth">用后一月代替</SelectItem>
                      <SelectItem value="skip">跳过该年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {showDay30Fallback ? (
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm text-muted-foreground">
                    某些年份该农历月没有三十日，请选择处理方式。
                  </p>
                  <Select
                    value={selectedPerson.day30Fallback}
                    onValueChange={(value) =>
                      dispatch({
                        type: "UPDATE",
                        id: selectedPerson.id,
                        patch: {
                          day30Fallback: value as PersonInput["day30Fallback"],
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="use29">用 29 日代替</SelectItem>
                      <SelectItem value="skip">跳过该年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="person-description">备注</Label>
                <Textarea
                  id="person-description"
                  rows={3}
                  value={selectedPerson.description}
                  placeholder="如：喜欢巧克力蛋糕，讨厌惊喜派对"
                  onChange={(event) =>
                    dispatch({
                      type: "UPDATE",
                      id: selectedPerson.id,
                      patch: { description: event.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}
        </section>
      </section>

      <footer className="border-t p-3">
        <Button
          type="button"
          className={cn(
            "h-10 w-full",
            exportBlockReason && "cursor-not-allowed opacity-60",
          )}
          aria-disabled={Boolean(exportBlockReason)}
          onClick={handleExportClick}
        >
          <Download />
          导出（{state.persons.length} 人）
        </Button>
      </footer>

      <Sheet open={exportSheetOpen} onOpenChange={setExportSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-sm rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>选择导出格式</SheetTitle>
            <SheetDescription>
              选择 ICS 可导入日历；选择 TXT 可查看每年日期清单
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 px-4">
            <button
              type="button"
              className={cn(
                "min-h-24 rounded-lg border p-3 text-left transition hover:bg-muted/50",
                exportFormat === "ics" &&
                  "border-primary bg-muted/50 ring-2 ring-ring/30",
              )}
              onClick={() => setExportFormat("ics")}
            >
              <Calendar className="mb-2 size-5" />
              <div className="font-medium">.ics 日历</div>
              <div className="text-xs text-muted-foreground">
                导入 Google Calendar
              </div>
            </button>
            <button
              type="button"
              className={cn(
                "min-h-24 rounded-lg border p-3 text-left transition hover:bg-muted/50",
                exportFormat === "txt" &&
                  "border-primary bg-muted/50 ring-2 ring-ring/30",
              )}
              onClick={() => setExportFormat("txt")}
            >
              <FileText className="mb-2 size-5" />
              <div className="font-medium">.txt 文本</div>
              <div className="text-xs text-muted-foreground">纯文本每年一行</div>
            </button>
          </div>

          <div className="space-y-1 px-4 text-xs text-muted-foreground">
            <p>建议在 Google Calendar 中新建独立日历后再导入。</p>
            <p>数据仅保存在本浏览器，不会上传任何服务器。</p>
          </div>

          <SheetFooter className="grid grid-cols-2 gap-2">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </SheetClose>
            <Button type="button" onClick={handleConfirmExport}>
              确认导出
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={wechatSheet.open} onOpenChange={(open) => setWechatSheet((s) => ({ ...s, open }))}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[80dvh] max-w-sm flex-col rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>
              {wechatSheet.format === "ics" ? "复制 ICS 内容" : "复制文本内容"}
            </SheetTitle>
            <SheetDescription>
              {wechatSheet.format === "ics"
                ? "复制后，在电脑浏览器中粘贴到日历导入工具，或发送给自己再导入。"
                : "复制后粘贴到任意文本编辑器保存。"}
            </SheetDescription>
          </SheetHeader>
          <textarea
            readOnly
            className="min-h-0 flex-1 resize-none rounded-lg border bg-muted/30 p-3 font-mono text-xs"
            value={wechatSheet.content}
            onFocus={(e) => e.target.select()}
          />
          <SheetFooter className="grid grid-cols-2 gap-2">
            <SheetClose asChild>
              <Button type="button" variant="outline">关闭</Button>
            </SheetClose>
            <Button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(wechatSheet.content.replace(/^﻿/, "")).then(() => {
                  toast.success("已复制到剪贴板")
                }).catch(() => {
                  toast.error("复制失败，请手动长按选择全部")
                })
              }}
            >
              复制全部
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Toaster position="top-center" richColors closeButton />
    </main>
  )
}

export default App
