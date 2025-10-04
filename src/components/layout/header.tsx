"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Bell, User, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const [searchValue, setSearchValue] = React.useState("")

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container flex h-14 items-center">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="hidden font-bold sm:inline-block">
              Knowledge Network
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Dashboard
          </Link>
          <Link
            href="/knowledge"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Knowledge Base
          </Link>
          <Link
            href="/search"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Search
          </Link>
          <Link
            href="/analytics"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Analytics
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Search */}
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search knowledge..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-8 md:w-[300px] lg:w-[400px]"
              />
            </div>
          </div>

          {/* Actions */}
          <nav className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="User profile"
            >
              <User className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}