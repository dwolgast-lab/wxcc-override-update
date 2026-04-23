"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { FeedbackForm } from "@/components/layout/FeedbackForm";
import { MessageSquare, LogOut, Menu } from "lucide-react";

interface UserInfo {
  displayName?: string;
  email?: string;
  orgId?: string;
}

function initials(user: UserInfo): string {
  if (user.displayName) {
    const parts = user.displayName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  // Fall back to the username portion of the email
  const emailUser = user.email?.split("@")[0];
  return (emailUser?.[0] ?? "?").toUpperCase();
}

function UserAvatar({ user }: { user: UserInfo }) {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
      {initials(user)}
    </div>
  );
}

export function TopNav() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.authenticated && setUser(d))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">WX</span>
          </div>
          <span className="font-semibold text-gray-900 hidden sm:block">
            Override Manager
          </span>
        </div>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2 mr-2">
              <UserAvatar user={user} />
              <span className="text-sm font-medium text-gray-700">
                {user.displayName ?? user.email}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedbackOpen(true)}
            className="gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            Feedback
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-gray-600">
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>

        {/* Mobile: avatar visible in header, full menu in sheet */}
        <div className="sm:hidden flex items-center gap-2">
          {user && <UserAvatar user={user} />}
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {user && (
                  <>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{user.displayName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => setFeedbackOpen(true)}
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Feedback
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-gray-600"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <FeedbackForm open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </header>
  );
}
