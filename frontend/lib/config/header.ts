import { LucideIcon } from "lucide-react"

export interface HeaderLink {
  href: string
  label: string
  icon?: LucideIcon
  description?: string
}

export interface HeaderConfig {
  brand: {
    title: string
    icon: string
  }
  navigationLinks: HeaderLink[]
}

export const headerConfig: HeaderConfig = {
  brand: {
    title: "Max-Agent",
    icon: "/logos/omni-logo.webp"
  },
  navigationLinks: [
    { 
    href: "/", 
    label: "Home" 
  },
  { 
    href: "/chat", 
    label: "Chat" 
  }
  ]
}