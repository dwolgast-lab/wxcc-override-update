"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { APP_VERSION } from "@/lib/version";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Login session expired. Please try again.",
  auth_failed: "Authentication failed. Check your Webex credentials.",
  access_denied: "Access was denied.",
  invalid_scope: "The app is not authorized for the required scopes. Contact your administrator.",
};

function LoginCard() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="text-center space-y-4">
        {/* Dual logos */}
        <div className="flex items-center justify-center gap-5 py-2">
          <img
            src="/logos/ttec-digital.svg"
            alt="TTEC Digital"
            className="h-10 w-auto object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-gray-300 text-xl select-none">|</span>
          <img
            src="/logos/webex-cc.png"
            alt="Webex Contact Center"
            className="h-10 w-auto object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        <div>
          <CardTitle className="text-xl font-semibold">Override Manager</CardTitle>
          <CardDescription className="mt-1">
            Sign in with your Webex account to manage Business Hours Overrides for your contact center.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {ERROR_MESSAGES[error] ?? `An error occurred (${error}). Please try again.`}
          </div>
        )}
        <a href="/api/auth/login" className="block w-full">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
            Sign in with Webex
          </Button>
        </a>
        <p className="text-center text-xs text-gray-500">
          You must have a Webex Contact Center administrator role to use this app.
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Suspense>
        <LoginCard />
      </Suspense>
      <p className="mt-6 text-xs text-gray-400">
        v{APP_VERSION} &mdash; Built by TTEC Digital
      </p>
    </div>
  );
}
