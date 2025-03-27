// components/FormDrawer.tsx
"use client"

import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/Drawer"
import { Button } from "@/components/ui/Button"
import React from "react"

interface FormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  onDelete?: () => void
}

export function FormDrawer({
  open,
  onOpenChange,
  title,
  children,
  onDelete,
}: FormDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="overflow-x-hidden sm:max-w-lg dark:bg-gray-925">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>{children}</DrawerBody>
        {onDelete && (
          <DrawerFooter>
            <Button variant="destructive" className="w-full" onClick={onDelete}>
              Delete
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}