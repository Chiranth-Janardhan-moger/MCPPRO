"use client";

import { LogOut, MoreHorizontal, Settings, User, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Avatar from "@/components/supaauth/avatar";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

export function NavProfile({ user }: { user: any }) {
  const router = useRouter();
  const [isSignOut, startSignOut] = useTransition();
  const { isAdmin } = useIsAdmin();

  const signout = () => {
    startSignOut(async () => {
      const supabase = createSupabaseBrowser();
      await supabase.auth.signOut();
      router.push("/signin");
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                {
                  "animate-pulse": isSignOut,
                },
              )}
            >
              <Avatar />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate font-semibold text-xs">{user.email}</span>
                  {isAdmin && (
                    <Badge className="bg-blue-600 text-white text-[9px] px-1 py-0 font-bold">
                      Admin
                    </Badge>
                  )}
                </div>
                <span className="truncate text-[10px] text-muted-foreground">{user.email}</span>
              </div>
              <MoreHorizontal className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 p-1.5"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {isAdmin && (
              <DropdownMenuItem asChild className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">
                <Link href="/admin" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Admin Console
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => document.getElementById("manage-profile")?.click()}
            >
              <User className="mr-2 h-4 w-4" />
              Manage Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signout} className="cursor-pointer text-red-600 dark:text-red-400">
              {!isSignOut ? (
                <LogOut className="mr-2 h-4 w-4" />
              ) : (
                <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
