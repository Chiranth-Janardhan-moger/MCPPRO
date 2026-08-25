"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, ShieldCheck, MessageSquare, Home, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useIsAdmin } from "@/hooks/use-is-admin"

export function NavigationMobile() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const { isAdmin } = useIsAdmin()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-[280px] sm:w-[280px] p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-bold text-xs">
            M
          </div>
          <span className="font-bold text-sm">MCPPro</span>
        </div>

        <nav className="flex flex-col gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          )}

          <Link
            href="/chat"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
              pathname === "/chat"
                ? "bg-muted font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <span>Chat Studio</span>
          </Link>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
              pathname === "/"
                ? "bg-muted font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Home className="h-4 w-4 text-gray-500" />
            <span>Home</span>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}