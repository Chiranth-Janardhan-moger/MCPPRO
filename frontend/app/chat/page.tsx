import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateUUID } from "./lib/utils/generate-uuid";

export default async function ChatIndexPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/signin");
  }

  // 1. If user already has an existing conversation, open their most recent one
  const { data: latestConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestConv?.id) {
    return redirect(`/chat/${latestConv.id}`);
  }

  // 2. Only create a new conversation if user has 0 conversations
  const { data: conversation } = await supabase
    .from("conversations")
    .insert({
      id: generateUUID(),
      title: "New Chat",
      user_id: user.id,
    })
    .select()
    .single();

  if (!conversation) {
    throw new Error("Failed to create conversation");
  }

  return redirect(`/chat/${conversation.id}`);
}
