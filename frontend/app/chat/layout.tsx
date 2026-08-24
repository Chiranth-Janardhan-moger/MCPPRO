import { createSupabaseServer } from "@/lib/supabase/server";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ConversationsProvider } from "./hooks/conversations-context";
import { AppSidebar } from "./components/sidebar/app-sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50/80 via-white to-sky-50/60 dark:from-zinc-950 dark:via-zinc-900 dark:to-blue-950/20 text-foreground antialiased">
      <ConversationsProvider userId={user?.id ?? ""}>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar user={user} />
          <div className="flex-1 flex flex-col min-w-0 bg-transparent">{children}</div>
        </SidebarProvider>
      </ConversationsProvider>
    </div>
  );
}
