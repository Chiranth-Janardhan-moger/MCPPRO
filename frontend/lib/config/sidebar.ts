import Icons from "@/components/global/icons";
import { SidebarConfig } from "@/components/global/app-sidebar";

const sidebarConfig: SidebarConfig = {
  brand: {
    title: "MCPPro API",
    icon: Icons.shield,
    href: "/"
  },
  sections: [
    {
      label: "Navigation",
      items: [
        {
          title: "Home",
          href: "/",
          icon: Icons.home
        },
        {
          title: "Chat Studio",
          href: "/chat",
          icon: Icons.brainCircuit
        },
        {
          title: "QA Dashboard",
          href: "/dashboard",
          icon: Icons.layoutDashboard
        },
        {
          title: "Admin Panel",
          href: "/admin",
          icon: Icons.shield
        }
      ]
    },
  ]
}

export default sidebarConfig