"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onSidebarToggle: () => void
}

export function EditorNavbar({
  isSidebarOpen,
  onSidebarToggle,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-surface-border bg-surface px-4">
      <div className="flex flex-1 items-center">
        <Button
          aria-label={isSidebarOpen ? "Close projects sidebar" : "Open projects sidebar"}
          aria-expanded={isSidebarOpen}
          onClick={onSidebarToggle}
          size="icon"
          variant="ghost"
        >
          <SidebarIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 justify-center">
        <span className="text-sm font-semibold tracking-wide text-copy-primary">
          Ghost AI
        </span>
      </div>
      <div className="flex flex-1 justify-end">
        <UserButton
          appearance={{
            elements: {
              rootBox: "!w-fit !justify-end",
            },
          }}
        />
      </div>
    </header>
  )
}
