import {
  Calendar,
  Download,
  FileText,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { toast } from "sonner"

import {
  Button,
  Card,
  Cursor,
  Footer,
  Input,
  Modal,
  Select,
  Switch,
  Title,
} from "animal-island-ui"
import { Toaster } from "@/components/ui/sonner"
import { PERSON_COLORS } from "@/lib/colors"
import { MAX_PERSON_COUNT, SOLAR_TODAY, SOLAR_YEAR_MAX, SOLAR_YEAR_MIN } from "@/lib/constants"
import { getSolarMonthDayCount, solarToLunar } from "@/lib/converter"
import { downloadTextFile, isWechatBrowser } from "@/lib/download"
import { buildIcsCalendar, ICS_FILENAME } from "@/lib/icsBuilder"
import { buildBirthdayText, TEXT_FILENAME } from "@/lib/textBuilder"
import type { PersonInput } from "@/lib/types"
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

const LEAP_FALLBACK_OPTIONS = [
  { key: "sameMonth", label: "用普通月代替" },
  { key: "nextMonth", label: "用后一月代替" },
  { key: "skip", label: "跳过该年" },
]

const DAY30_FALLBACK_OPTIONS = [
  { key: "use29", label: "用 29 日代替" },
  { key: "skip", label: "跳过该年" },
]

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

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block text-sm font-bold" style={{ color: "#794f27" }}>
      {children}
    </span>
  )
}

const TEXTAREA_STYLE: CSSProperties = {
  background: "rgb(247, 243, 223)",
  border: "2.5px solid #c4b89e",
  color: "#725d42",
  fontFamily: "inherit",
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

  const lunarMonthOptions = LUNAR_MONTHS.map((month, index) => ({
    key: (index + 1).toString(),
    label: month,
  }))
  const lunarDayOptions = LUNAR_DAYS.map((day, index) => ({
    key: (index + 1).toString(),
    label: day,
  }))
  const solarYearOptions = SOLAR_YEARS.map((year) => ({
    key: year.toString(),
    label: year.toString(),
  }))
  const solarMonthOptions = solarMonths.map((month) => ({
    key: month.toString(),
    label: `${month} 月`,
  }))
  const solarDayOptions = solarDays.map((day) => ({
    key: day.toString(),
    label: `${day} 日`,
  }))

  const getPersonButtonStyle = (
    color: (typeof PERSON_COLORS)[number],
  ): CSSProperties => ({
    backgroundColor: color.bg,
    color: color.text,
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
    <Cursor>
      <main
        className="mx-auto flex h-dvh w-full flex-col text-left sm:max-w-sm"
        style={{ background: "var(--parchment)" }}
      >
        <header
          className="flex flex-none flex-col items-start gap-3 px-4 py-4"
          style={{ borderBottom: "2px solid #e8dcc8" }}
        >
          <Title size="small" color="app-green">
            农历生日 → 日历提醒
          </Title>
          <p className="text-xs" style={{ color: "#8a7b66" }}>
            生成日历文件，导入提醒
          </p>
        </header>

        <section className="flex min-h-0 flex-1">
          <aside
            className="flex w-[56px] flex-none flex-col items-center gap-2 overflow-y-auto py-3"
            style={{ borderRight: "2px solid #e8dcc8" }}
          >
            {state.persons.map((person, index) => {
              const color = PERSON_COLORS[person.colorIndex]
              const isSelected = person.id === state.selectedId

              return (
                <button
                  key={person.id}
                  type="button"
                  aria-label={`选择 ${person.name || `第 ${index + 1} 人`}`}
                  className="flex size-10 items-center justify-center rounded-2xl text-sm font-bold outline-none transition hover:scale-[1.05]"
                  style={{
                    ...getPersonButtonStyle(color),
                    boxShadow: isSelected
                      ? `0 0 0 2.5px var(--parchment), 0 0 0 5px ${color.ring}`
                      : undefined,
                  }}
                  onClick={() => dispatch({ type: "SELECT", id: person.id })}
                >
                  {person.name.trim().charAt(0) || index + 1}
                </button>
              )
            })}

            <button
              type="button"
              aria-label="添加人员"
              title={canAddPerson ? "添加人员" : `最多 ${MAX_PERSON_COUNT} 人`}
              className="flex size-10 items-center justify-center rounded-2xl outline-none transition hover:scale-[1.05]"
              style={{
                border: "2px dashed #c4b89e",
                color: "#a0936e",
                opacity: canAddPerson ? 1 : 0.5,
                cursor: canAddPerson ? "pointer" : "not-allowed",
              }}
              onClick={handleAddPerson}
            >
              <Plus className="size-5" />
            </button>
          </aside>

          <section className="min-w-0 flex-1 overflow-y-auto px-4 py-4">
            {!selectedPerson ? (
              <Card
                type="dashed"
                className="flex flex-col items-center gap-3 py-10 text-center"
              >
                <div
                  className="flex size-12 items-center justify-center rounded-2xl"
                  style={{ background: "#f0ece2" }}
                >
                  <Plus className="size-5" style={{ color: "#a0936e" }} />
                </div>
                <p className="text-sm" style={{ color: "#8a7b66" }}>
                  点击左侧 + 添加第一个人
                </p>
                <Button
                  type="primary"
                  icon={<Plus className="size-4" />}
                  onClick={handleAddPerson}
                >
                  添加人员
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: selectedColor?.ring }}
                    />
                    <h2
                      className="truncate text-base font-bold"
                      style={{ color: "#794f27" }}
                    >
                      {selectedPerson.name || "未命名"}
                    </h2>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    aria-label="删除"
                    title="删除"
                    icon={<Trash2 className="size-4" />}
                    onClick={() =>
                      dispatch({ type: "REMOVE", id: selectedPerson.id })
                    }
                  />
                </div>

                <div>
                  <FieldLabel>姓名</FieldLabel>
                  <Input
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

                <div>
                  <FieldLabel>生日输入方式</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      block
                      type={selectedPerson.mode === "lunar" ? "primary" : "default"}
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
                      block
                      type={selectedPerson.mode === "solar" ? "primary" : "default"}
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
                      <div className="min-w-0">
                        <FieldLabel>农历月份</FieldLabel>
                        <Select
                          placeholder="选择月份"
                          value={selectedPerson.lunarMonth?.toString() ?? ""}
                          options={lunarMonthOptions}
                          onChange={(key) =>
                            dispatch({
                              type: "UPDATE",
                              id: selectedPerson.id,
                              patch: { lunarMonth: Number(key) },
                            })
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <FieldLabel>农历日期</FieldLabel>
                        <Select
                          placeholder={
                            selectedPerson.lunarMonth ? "选择日期" : "请先选月份"
                          }
                          disabled={!selectedPerson.lunarMonth}
                          value={selectedPerson.lunarDay?.toString() ?? ""}
                          options={lunarDayOptions}
                          onChange={(key) =>
                            dispatch({
                              type: "UPDATE",
                              id: selectedPerson.id,
                              patch: { lunarDay: Number(key) },
                            })
                          }
                        />
                      </div>
                    </div>

                    <Card
                      className="flex items-center justify-between gap-3"
                      style={{ padding: "10px 16px" }}
                    >
                      <span className="text-sm" style={{ color: "#725d42" }}>
                        此日期为闰月生日
                      </span>
                      <Switch
                        checked={selectedPerson.isLeap}
                        onChange={(checked) =>
                          dispatch({
                            type: "UPDATE",
                            id: selectedPerson.id,
                            patch: { isLeap: checked },
                          })
                        }
                      />
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="min-w-0">
                        <FieldLabel>{showAllYears ? "公元" : "年"}</FieldLabel>
                        {showAllYears ? (
                          <Input
                            type="number"
                            min={1}
                            max={SOLAR_YEAR_MAX}
                            placeholder="年份"
                            value={yearInput}
                            status={
                              yearInput !== "" &&
                              (!/^\d+$/.test(yearInput) ||
                                Number(yearInput) < 1 ||
                                Number(yearInput) > SOLAR_YEAR_MAX)
                                ? "error"
                                : undefined
                            }
                            onChange={(event) => {
                              const raw = event.target.value
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
                            placeholder="年份"
                            value={selectedPerson.solarYear?.toString() ?? ""}
                            options={solarYearOptions}
                            onChange={(key) =>
                              dispatch({
                                type: "UPDATE",
                                id: selectedPerson.id,
                                patch: buildSolarPatch(selectedPerson, {
                                  solarYear: Number(key),
                                }),
                              })
                            }
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <FieldLabel>月</FieldLabel>
                        <Select
                          placeholder="月份"
                          disabled={!selectedPerson.solarYear}
                          value={selectedPerson.solarMonth?.toString() ?? ""}
                          options={solarMonthOptions}
                          onChange={(key) =>
                            dispatch({
                              type: "UPDATE",
                              id: selectedPerson.id,
                              patch: buildSolarPatch(selectedPerson, {
                                solarMonth: Number(key),
                              }),
                            })
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <FieldLabel>日</FieldLabel>
                        <Select
                          placeholder="日期"
                          disabled={!selectedPerson.solarMonth}
                          value={selectedPerson.solarDay?.toString() ?? ""}
                          options={solarDayOptions}
                          onChange={(key) =>
                            dispatch({
                              type: "UPDATE",
                              id: selectedPerson.id,
                              patch: buildSolarPatch(selectedPerson, {
                                solarDay: Number(key),
                              }),
                            })
                          }
                        />
                      </div>
                    </div>

                    <Card
                      className="flex items-center justify-between gap-3"
                      style={{ padding: "10px 16px" }}
                    >
                      <span className="text-sm" style={{ color: "#725d42" }}>
                        显示所有年份
                      </span>
                      <Switch
                        checked={showAllYears}
                        onChange={(checked) => {
                          setShowAllYears(checked)
                          setYearInput(
                            checked
                              ? (selectedPerson.solarYear?.toString() ?? "")
                              : "",
                          )
                        }}
                      />
                    </Card>

                    {solarConversion ? (
                      <Card color="purple" className="flex items-start gap-2">
                        <Sparkles
                          className="size-4 shrink-0"
                          style={{ marginTop: 2 }}
                        />
                        <span className="text-sm">
                          农历 {solarConversion.lunarYearName}年{" "}
                          {solarConversion.label}
                          {solarConversion.isLeap ? "（闰月）" : "（非闰月）"}
                        </span>
                      </Card>
                    ) : null}
                  </div>
                )}

                {showLeapFallback ? (
                  <Card style={{ padding: "12px 16px" }}>
                    <FieldLabel>闰月降级策略</FieldLabel>
                    <Select
                      value={selectedPerson.leapFallback}
                      options={LEAP_FALLBACK_OPTIONS}
                      onChange={(key) =>
                        dispatch({
                          type: "UPDATE",
                          id: selectedPerson.id,
                          patch: {
                            leapFallback: key as PersonInput["leapFallback"],
                          },
                        })
                      }
                    />
                  </Card>
                ) : null}

                {showDay30Fallback ? (
                  <Card style={{ padding: "12px 16px" }}>
                    <p className="mb-2 text-sm" style={{ color: "#8a7b66" }}>
                      某些年份该农历月没有三十日，请选择处理方式。
                    </p>
                    <Select
                      value={selectedPerson.day30Fallback}
                      options={DAY30_FALLBACK_OPTIONS}
                      onChange={(key) =>
                        dispatch({
                          type: "UPDATE",
                          id: selectedPerson.id,
                          patch: {
                            day30Fallback: key as PersonInput["day30Fallback"],
                          },
                        })
                      }
                    />
                  </Card>
                ) : null}

                <div>
                  <FieldLabel>备注</FieldLabel>
                  <textarea
                    rows={3}
                    value={selectedPerson.description}
                    placeholder="如：喜欢巧克力蛋糕，讨厌惊喜派对"
                    className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none"
                    style={TEXTAREA_STYLE}
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

            <Footer type="tree" className="mt-6" />
          </section>
        </section>

        <footer
          className="flex-none p-3"
          style={{ borderTop: "2px solid #e8dcc8" }}
        >
          <Button
            type="primary"
            block
            icon={<Download className="size-4" />}
            style={exportBlockReason ? { opacity: 0.6 } : undefined}
            onClick={handleExportClick}
          >
            导出（{state.persons.length} 人）
          </Button>
        </footer>

        <Modal
          open={exportSheetOpen}
          title="选择导出格式"
          typewriter={false}
          onClose={() => setExportSheetOpen(false)}
          footer={
            <>
              <Button onClick={() => setExportSheetOpen(false)}>取消</Button>
              <Button type="primary" onClick={handleConfirmExport}>
                确认导出
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "#8a7b66" }}>
              选择 ICS 可导入日历；选择 TXT 可查看每年日期清单
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  format: "ics" as const,
                  icon: <Calendar className="size-5" />,
                  title: ".ics 日历",
                  desc: "导入 Google Calendar",
                },
                {
                  format: "txt" as const,
                  icon: <FileText className="size-5" />,
                  title: ".txt 文本",
                  desc: "纯文本每年一行",
                },
              ].map(({ format, icon, title, desc }) => (
                <Card
                  key={format}
                  onClick={() => setExportFormat(format)}
                  style={{
                    cursor: "pointer",
                    padding: "14px",
                    ...(exportFormat === format
                      ? { outline: "2.5px solid #19c8b9", outlineOffset: "2px" }
                      : {}),
                  }}
                >
                  <div className="mb-2" style={{ color: "#725d42" }}>
                    {icon}
                  </div>
                  <div className="font-bold" style={{ color: "#794f27" }}>
                    {title}
                  </div>
                  <div className="text-xs" style={{ color: "#8a7b66" }}>
                    {desc}
                  </div>
                </Card>
              ))}
            </div>
            <div className="space-y-1 text-xs" style={{ color: "#8a7b66" }}>
              <p>建议在 Google Calendar 中新建独立日历后再导入。</p>
              <p>数据仅保存在本浏览器，不会上传任何服务器。</p>
            </div>
          </div>
        </Modal>

        <Modal
          open={wechatSheet.open}
          title={wechatSheet.format === "ics" ? "复制 ICS 内容" : "复制文本内容"}
          typewriter={false}
          onClose={() => setWechatSheet((s) => ({ ...s, open: false }))}
          footer={
            <>
              <Button onClick={() => setWechatSheet((s) => ({ ...s, open: false }))}>
                关闭
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  navigator.clipboard
                    .writeText(wechatSheet.content.replace(/^﻿/, ""))
                    .then(() => {
                      toast.success("已复制到剪贴板")
                    })
                    .catch(() => {
                      toast.error("复制失败，请手动长按选择全部")
                    })
                }}
              >
                复制全部
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "#8a7b66" }}>
              {wechatSheet.format === "ics"
                ? "复制后，在电脑浏览器中粘贴到日历导入工具，或发送给自己再导入。"
                : "复制后粘贴到任意文本编辑器保存。"}
            </p>
            <textarea
              readOnly
              value={wechatSheet.content}
              className="w-full resize-none rounded-2xl p-3 font-mono text-xs outline-none"
              style={{ minHeight: "40dvh", ...TEXTAREA_STYLE }}
              onFocus={(event) => event.target.select()}
            />
          </div>
        </Modal>

        <Toaster position="top-center" richColors closeButton />
      </main>
    </Cursor>
  )
}

export default App
