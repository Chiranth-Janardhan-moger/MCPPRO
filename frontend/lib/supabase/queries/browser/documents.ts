import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface UserDocument {
  id: string;
  file_name: string;
  status: string;
  chunk_count?: number;
  created_at: string;
}

export async function getUserDocuments(userId: string): Promise<UserDocument[]> {
  const supabase = createSupabaseBrowser();
  const { data, error } = await supabase
    .from("user_documents")
    .select("id, file_name, status, chunk_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }

  return (data ?? []) as UserDocument[];
}
