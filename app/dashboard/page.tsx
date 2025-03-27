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
import { authClient } from "@/utils/auth-client" // Add this import

export type PeriodValue = "previous-period" | "last-year" | "no-comparison"

const categories: {
  title: keyof OverviewData
  type: "currency" | "unit"
}[] = [
  // ... (unchanged)
]

export type KpiEntry = {
  title: string
  percentage: number
  current: number
  allowed: number
  unit?: string
}

// ... (rest of the types and data unchanged)

const overviewsDates = overviews.map((item) => toDate(item.date).getTime())
const maxDate = toDate(Math.max(...overviewsDates))

export default function Overview() {
  const { data: activeOrganization } = authClient.useActiveOrganization() // Get the active organization

  const [selectedDates, setSelectedDates] = React.useState<DateRange | undefined>({
    from: subDays(maxDate, 30),
    to: maxDate,
  })
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodValue>("last-year")
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    categories.map((category) => category.title),
  )

  return (
    <>
      <div className="mx-auto flex flex-1 flex-col items-center px-lg-32 px-8 mt-10">
        <div className="text-center w-full">
          <section aria-labelledby="usage-overview">
            <h2 id="usage-overview">
              {activeOrganization ? `${activeOrganization.name} Dashboard` : "Dashboard"}
            </h2>
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
                .map((category) => (
                  <ChartCard
                    key={category.title}
                    title={category.title}
                    type={category.type}
                    selectedDates={selectedDates}
                    selectedPeriod={selectedPeriod}
                  />
                ))}
            </dl>
          </section>
        </div>
      </div>
    </>
  )
}