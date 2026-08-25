'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Upload,
  UserPlus,
  Trash2,
  Lock,
  Loader2,
  Check,
  Users,
} from 'lucide-react';
import { SystemSettings } from '@/lib/services/admin-settings';

interface AccessControlTabProps {
  settings: SystemSettings | null;
  onUpdate: (updated: Partial<SystemSettings>) => Promise<boolean>;
}

export function AccessControlTab({ settings, onUpdate }: AccessControlTabProps) {
  const [allowUploads, setAllowUploads] = useState(
    settings?.features?.allow_user_uploads ?? true
  );
  const [adminEmails, setAdminEmails] = useState<string[]>(
    settings?.admin_emails || []
  );
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddEmail = () => {
    const clean = newEmail.trim().toLowerCase();
    if (!clean) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (adminEmails.includes(clean)) {
      toast.error('Email is already an administrator.');
      return;
    }

    setAdminEmails([...adminEmails, clean]);
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAdminEmails(adminEmails.filter((e) => e !== emailToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const success = await onUpdate({
      features: {
        allow_user_uploads: allowUploads,
      },
      admin_emails: adminEmails,
    });

    setIsSaving(false);
    if (success) {
      toast.success('Access control and feature flags updated!');
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* File Upload Feature Flag */}
      <Card className="bg-card/70 backdrop-blur-sm border-blue-100/70 dark:border-blue-900/40">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Standard User File Upload Capability
                </CardTitle>
                <CardDescription className="text-xs">
                  Control whether regular users can upload custom files or are restricted to fixed knowledge documents.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="upload-switch" className="text-xs font-semibold">
                {allowUploads ? 'Uploads Allowed' : 'Uploads Blocked'}
              </Label>
              <Switch
                id="upload-switch"
                checked={allowUploads}
                onCheckedChange={setAllowUploads}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Lock className="h-3.5 w-3.5 text-blue-500" />
              <span>Policy Enforcement Rule:</span>
            </div>
            {allowUploads ? (
              <p className="text-muted-foreground leading-relaxed">
                Standard users <strong>can</strong> upload their own personal files via the "My Documents" menu in the sidebar and query both personal and fixed system knowledge documents.
              </p>
            ) : (
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                The file upload option is <strong>hidden and blocked</strong> for standard users. Standard users are restricted to querying the fixed documents uploaded by the administrator in the Global Knowledge Base.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Email Accounts */}
      <Card className="bg-card/70 backdrop-blur-sm">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Administrator Accounts</CardTitle>
              <CardDescription className="text-xs">
                Users with admin privileges can view the Admin Panel, manage API keys, configure routing, and upload fixed files.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {/* Add Admin */}
          <div className="flex items-center gap-2 max-w-md">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="h-9 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAddEmail}
              className="h-9 text-xs gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Admin
            </Button>
          </div>

          {/* Admin list */}
          <div className="space-y-2 max-w-xl">
            <Label className="text-xs font-semibold text-muted-foreground">
              Authorized Administrators ({adminEmails.length})
            </Label>

            {adminEmails.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 italic">
                No specific admin emails configured. The current project owner / signed-in user has administrative rights.
              </p>
            ) : (
              <div className="space-y-1.5">
                {adminEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium">{email}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        Admin Role
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEmail(email)}
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                      title="Remove Admin Rights"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 px-6 text-xs bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white font-semibold shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Saving Access Rules...
                </>
              ) : (
                'Save Access Control'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
