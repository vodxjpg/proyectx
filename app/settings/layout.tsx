"use client"

import { TabNavigation, TabNavigationLink } from "@/components/ui/TabNavigation"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigationSettings = [
  { name: "General", href: '/settings/general' },
  { name: "Billing & Usage", href: '/settings/billing' },
  { name: "Users", href: '/settings/users'},
]

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  return (
    <div className="mx-auto flex flex-1 flex-col px-8 px-lg-32 mt-10">
      <h1 className="text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
        Settings
      </h1>
      <TabNavigation className="mt-4 sm:mt-6 lg:mt-10">
        {navigationSettings.map((item) => (
          <TabNavigationLink
            key={item.name}
            asChild
            active={pathname === item.href}
          >
            <Link href={item.href}>{item.name}</Link>
          </TabNavigationLink>
        ))}
      </TabNavigation>
      <div className="pt-6">{children}</div>
    </div>
  )
}