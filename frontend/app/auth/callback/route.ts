import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

const DEFAULT_NEXT = '/chat';

function safeNext(next: string | null): string {
  if (!next) return DEFAULT_NEXT;
  // Only allow same-origin relative paths to prevent open redirects.
  return next.startsWith('/') && !next.startsWith('//') ? next : DEFAULT_NEXT;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=oauth_callback_failed`);
}
