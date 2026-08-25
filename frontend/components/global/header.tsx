"use client"

import * as React from "react"
import Link from "next/link"
import { ModeToggle } from "./theme-switcher"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { HeaderConfig } from "@/lib/config/header"
import { useIsAdmin } from "@/hooks/use-is-admin"
import UserProfile from "@/components/supaauth/user-profile"
import { NavigationMobile } from "./header-mobile"
import { Button } from "@/components/ui/button"
import { ShieldCheck, LogIn, Sparkles } from "lucide-react"

interface HeaderProps {
  config?: HeaderConfig
}

export function Header({ config }: HeaderProps) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = React.useState(false)
  const { isAdmin, isAuthenticated } = useIsAdmin()

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <div className="m-8" />

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed left-0 right-0 top-0 z-40"
      >
        <motion.div
          animate={{
            maxWidth: isScrolled ? "64rem" : "100%",
            margin: isScrolled ? "0.75rem auto" : "0 auto",
            borderRadius: isScrolled ? "9999px" : "0",
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
          className={cn(
            "bg-background/85 border backdrop-blur-xl transition-all duration-500",
            isScrolled 
              ? "mx-4 md:mx-auto shadow-md border-border/80" 
              : "border-b border-border/40 shadow-xs"
          )}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className={cn(
              "flex items-center justify-between",
              isScrolled ? "h-14" : "h-16"
            )}>
              {/* Brand Logo (Left) */}
              <Link href="/" className="group relative flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  M
                </div>
                <span className="font-bold tracking-tight text-foreground text-sm sm:text-base">
                  {config?.brand?.title || "MCPPro"}
                </span>
              </Link>

              {/* Center Option (Admin Panel link only visible when logged in as Admin) */}
              <div className="flex items-center justify-center">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs",
                      pathname.startsWith("/admin")
                        ? "bg-blue-600 text-white shadow-blue-500/20"
                        : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-600 hover:text-white"
                    )}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Admin Panel</span>
                  </Link>
                )}
              </div>

              {/* Right End: Theme Toggle, Login / First Letter Avatar, Mobile Menu */}
              <div className="flex items-center gap-2 sm:gap-3">
                <ModeToggle />

                {isAuthenticated ? (
                  <UserProfile />
                ) : (
                  <Button asChild size="sm" className="h-8 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full gap-1.5 shadow-xs">
                    <Link href="/signin">
                      <LogIn className="h-3.5 w-3.5" />
                      <span>Login</span>
                    </Link>
                  </Button>
                )}

                <div className="md:hidden">
                  <NavigationMobile />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.header>
    </>
  )
}