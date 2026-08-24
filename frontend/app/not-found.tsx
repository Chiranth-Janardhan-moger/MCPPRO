import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        This page could not be found
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The conversation or page you are looking for does not exist, was
        deleted, or belongs to another account.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/chat">Back to chat</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
