"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { FeedbackForm } from "@/components/layout/FeedbackForm";
import { MessageSquare, LogOut, User, Menu } from "lucide-react";

interface UserInfo {
  displayName?: string;
  email?: string;
  orgId?: string;
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
            <div className="flex items-center gap-2 text-sm text-gray-600 mr-2">
              <User className="w-4 h-4" />
              <span>{user.displayName ?? user.email}</span>
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

        {/* Mobile menu */}
        <div className="sm:hidden">
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
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
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
