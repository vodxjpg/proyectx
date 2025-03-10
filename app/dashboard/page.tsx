"use client"
import { CategoryBarCard } from "@/components/ui/overview/DashboardCategoryBarCard"
import { ChartCard } from "@/components/ui/overview/DashboardChartCard"
import { Filterbar } from "@/components/ui/overview/DashboardFilterbar"
import { ProgressBarCard } from "@/components/ui/overview/DashboardProgressBarCard"
import { overviews } from "@/data/overview-data"
import { OverviewData } from "@/data/schema"
import { cx } from "@/components/lib/utils"
import { subDays, toDate } from "date-fns"
import React from "react"
import { DateRange } from "react-day-picker"

export type PeriodValue = "previous-period" | "last-year" | "no-comparison"

const categories: {
  title: keyof OverviewData
  type: "currency" | "unit"
}[] = [
  {
    title: "Rows read",
    type: "unit",
  },
  {
    title: "Rows written",
    type: "unit",
  },
  {
    title: "Queries",
    type: "unit",
  },
  {
    title: "Payments completed",
    type: "currency",
  },
  {
    title: "Sign ups",
    type: "unit",
  },
  {
    title: "Logins",
    type: "unit",
  },
  {
    title: "Sign outs",
    type: "unit",
  },
  {
    title: "Support calls",
    type: "unit",
  },
]

export type KpiEntry = {
  title: string
  percentage: number
  current: number
  allowed: number
  unit?: string
}

const data: KpiEntry[] = [
  {
    title: "Rows read",
    percentage: 48.1,
    current: 48.1,
    allowed: 100,
    unit: "M",
  },
  {
    title: "Rows written",
    percentage: 78.3,
    current: 78.3,
    allowed: 100,
    unit: "M",
  },
  {
    title: "Storage",
    percentage: 26,
    current: 5.2,
    allowed: 20,
    unit: "GB",
  },
]

const data2: KpiEntry[] = [
  {
    title: "Weekly active users",
    percentage: 21.7,
    current: 21.7,
    allowed: 100,
    unit: "%",
  },
  {
    title: "Total users",
    percentage: 70,
    current: 28,
    allowed: 40,
  },
  {
    title: "Uptime",
    percentage: 98.3,
    current: 98.3,
    allowed: 100,
    unit: "%",
  },
]

export type KpiEntryExtended = Omit<
  KpiEntry,
  "current" | "allowed" | "unit"
> & {
  value: string
  color: string
}

const data3: KpiEntryExtended[] = [
  {
    title: "Base tier",
    percentage: 68.1,
    value: "$200",
    color: "bg-indigo-600 dark:bg-indigo-500",
  },
  {
    title: "On-demand charges",
    percentage: 20.8,
    value: "$61.1",
    color: "bg-purple-600 dark:bg-purple-500",
  },
  {
    title: "Caching",
    percentage: 11.1,
    value: "$31.9",
    color: "bg-gray-400 dark:bg-gray-600",
  },
]

const overviewsDates = overviews.map((item) => toDate(item.date).getTime())
const maxDate = toDate(Math.max(...overviewsDates))

export default function Overview() {
  const [selectedDates, setSelectedDates] = React.useState<
    DateRange | undefined
  >({
    from: subDays(maxDate, 30),
    to: maxDate,
  })
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<PeriodValue>("last-year")

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    categories.map((category) => category.title),
  )

  return (
    <>
      <div className="mx-auto flex flex-1 flex-col items-center px-lg-32 px-8 mt-10">
        <div className="text-center w-full">
          <section aria-labelledby="usage-overview">
            <div className="sticky top-16 z-20 flex items-center justify-between border-b border-gray-200 bg-white pb-4 pt-4 sm:pt-6 lg:top-0 lg:mx-0 lg:px-0 lg:pt-8 dark:border-gray-800 dark:bg-gray-950">
              <Filterbar
                maxDate={maxDate}
                minDate={new Date(2024, 0, 1)}
                selectedDates={selectedDates}
                onDatesChange={(dates) => setSelectedDates(dates)}
                selectedPeriod={selectedPeriod}
                onPeriodChange={(period) => setSelectedPeriod(period)}
                categories={categories}
                setSelectedCategories={setSelectedCategories}
                selectedCategories={selectedCategories}
              />
            </div>
            <dl
              className={cx(
                "mt-10 grid grid-cols-1 gap-14 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
              )}
            >
              {categories
                .filter((category) => selectedCategories.includes(category.title))
                .map((category) => {
                  return (
                    <ChartCard
                      key={category.title}
                      title={category.title}
                      type={category.type}
                      selectedDates={selectedDates}
                      selectedPeriod={selectedPeriod}
                    />
                  )
                })}
            </dl>
          </section>  
        </div>
      </div>
    </>
  )
}