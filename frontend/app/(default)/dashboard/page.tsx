'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequestSelector } from '@/components/dashboard/request-selector';
import { ComparisonView } from '@/components/dashboard/comparison-view';
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Dashboard() {
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const { isAdmin, isLoading, isAuthenticated } = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/chat');
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-muted-foreground font-medium">Verifying authorization...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-xl border border-border bg-card text-center space-y-4 shadow-lg">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-xs text-muted-foreground">
          The QA Response Dashboard is reserved for system administrators.
        </p>
        <Button asChild className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/chat">Return to Chat</Link>
        </Button>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="bg-background animate-in fade-in-50">
        <div className="p-2 lg:p-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              LLM QA Response Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Compare and analyze responses from your LLM question-answering system
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4">
            {/* Left Panel - Request Selector */}
            <div className="lg:col-span-4">
              <RequestSelector
                selectedRequests={selectedRequests}
                onSelectionChange={setSelectedRequests}
              />
            </div>
            
            {/* Right Panel - Comparison View */}
            <div className="lg:col-span-8">
              <ComparisonView selectedRequests={selectedRequests} />
            </div>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
