'use server'

import { createSupabaseServer } from '@/lib/supabase/server'
import { type Message } from 'ai'

export async function saveMessages(messages: Message[], conversationId: string) {
  try {
    const supabase = await createSupabaseServer()

    const messagesToInsert = messages.map((message) => ({
      conversation_id: conversationId,
      content: message.content,
      role: message.role,
      tool_invocations: message.toolInvocations,
    }))

    const { error } = await supabase.from('messages').insert(messagesToInsert)

    if (error) {
      console.warn('[saveMessages] Notice saving messages:', error.message)
    }
  } catch (err: any) {
    console.warn('[saveMessages] Error saving messages:', err?.message)
  }
}
