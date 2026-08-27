"use client";

import React, { useTransition } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { IoMdSettings } from "react-icons/io";
import { PiSignOutFill } from "react-icons/pi";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import useUser from "@/hooks/use-user";
import { useIsAdmin } from "@/hooks/use-is-admin";
import ManageProfile from "./manage-profile";
import Avatar from "./avatar";
import { ShieldCheck, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

export default function UserProfile() {
  const [isSignOut, startSignOut] = useTransition();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useUser();
  const { isAdmin } = useIsAdmin();

  const signout = () => {
    startSignOut(async () => {
      const supabase = createSupabaseBrowser();
      await supabase.auth.signOut();
      queryClient.setQueryData(['admin-check'], {
        authenticated: false,
        isAdmin: false,
        allowUserUploads: true,
      });
      queryClient.setQueryData(['user'], null);
      queryClient.invalidateQueries({ queryKey: ['admin-check'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      router.push("/signin");
    });
  };

  return (
    <div className="flex items-center justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <div className="cursor-pointer flex items-center justify-center">
            <Avatar />
          </div>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[90%] sm:w-[26rem] p-4">
          <div
            className={cn("flex gap-4 items-start w-full", {
              "animate-pulse": isSignOut,
            })}
          >
            <div className="shrink-0 pt-0.5">
              <Avatar />
            </div>
            <div className="space-y-3 w-full flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-semibold text-sm truncate max-w-[180px]">{data?.email}</h1>
                {isAdmin && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-1.5 py-0 font-bold">
                    Admin
                  </Badge>
                )}
              </div>

              {/* Admin Panel Direct Link */}
              {isAdmin && (
                <Button
                  asChild
                  className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Link href="/admin">
                    <ShieldCheck className="size-4" />
                    Open Admin Console
                  </Link>
                </Button>
              )}

              <div className="flex gap-2 w-full">
                <Button
                  className="w-1/2 h-8 rounded-xl flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-200 text-xs"
                  variant="outline"
                  onClick={() => {
                    document.getElementById("manage-profile")?.click();
                  }}
                >
                  <IoMdSettings className="size-4" />
                  Account
                </Button>
                <Button
                  className="w-1/2 h-8 rounded-xl flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400 text-xs"
                  variant="outline"
                  onClick={signout}
                >
                  {!isSignOut ? (
                    <PiSignOutFill className="size-4" />
                  ) : (
                    <AiOutlineLoading3Quarters className="size-3.5 animate-spin" />
                  )}
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <ManageProfile />
    </div>
  );
}
