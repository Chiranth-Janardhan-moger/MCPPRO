import Icons from "@/components/global/icons";
import { SidebarConfig } from "@/components/global/app-sidebar";

const sidebarConfig: SidebarConfig = {
  brand: {
    title: "MCPPro",
    icon: Icons.shield,
    href: "/"
  },
  sections: [
    {
      label: "Navigation",
      items: [
        {
          title: "Chat Studio",
          href: "/chat",
          icon: Icons.brainCircuit
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