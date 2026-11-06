"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeft, Download, FileText, Code } from "lucide-react";
import { ModeToggle } from "@/components/global/theme-switcher";
import { ApiKeysDialog } from "@/components/global/api-keys-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { memo, useEffect, useState } from "react";

interface ChatHeaderProps {
  chatId: string;
  messages?: any[];
}

function PureChatHeader({ chatId, messages = [] }: ChatHeaderProps) {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/rag/status", {
          signal: AbortSignal.timeout(4000),
        });
        if (isMounted) {
          setBackendStatus(res.ok ? "online" : "offline");
        }
      } catch {
        if (isMounted) {
          setBackendStatus("offline");
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleExport = (format: "markdown" | "json") => {
    if (!messages || messages.length === 0) {
      toast.error("No messages to export");
      return;
    }

    let fileContent = "";
    let mimeType = "text/plain";
    let fileName = `MCPPRO-chat-${chatId.slice(0, 8)}`;

    if (format === "markdown") {
      fileContent = `# MCPPRO Conversation Export\n**Date:** ${new Date().toLocaleString()}\n**Chat ID:** \`${chatId}\`\n\n---\n\n` +
        messages.map((m: any) => {
          const role = m.role === "user" ? "### User" : "### Assistant";
          return `${role}\n\n${m.content || "(tool execution)"}\n`;
        }).join("\n---\n\n");
      mimeType = "text/markdown";
      fileName += ".md";
    } else {
      fileContent = JSON.stringify({ chatId, exportedAt: new Date().toISOString(), messages }, null, 2);
      mimeType = "application/json";
      fileName += ".json";
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported conversation as ${format.toUpperCase()}`);
  };

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

      <div className="flex-1 flex justify-center">
        {backendStatus === "online" ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>RAG Engine Online</span>
          </div>
        ) : backendStatus === "offline" ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Connecting to Compute...</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Export Conversation"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => handleExport("markdown")} className="gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              <span>Export as Markdown</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json")} className="gap-2 text-xs">
              <Code className="h-3.5 w-3.5 text-emerald-500" />
              <span>Export as JSON</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ApiKeysDialog />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
