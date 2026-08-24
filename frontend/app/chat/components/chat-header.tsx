"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeft } from "lucide-react";
import { ModeToggle } from "@/components/global/theme-switcher";
import { ApiKeysDialog } from "@/components/global/api-keys-dialog";
import { memo } from "react";

interface ChatHeaderProps {
  chatId: string;
}

function PureChatHeader({ chatId }: ChatHeaderProps) {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100/70 dark:border-zinc-800 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => toggleSidebar()}
          title="Toggle Sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <ApiKeysDialog />
        <ModeToggle />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
