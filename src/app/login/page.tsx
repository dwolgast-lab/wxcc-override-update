"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Login session expired. Please try again.",
  auth_failed: "Authentication failed. Check your Webex credentials.",
  access_denied: "Access was denied.",
};

function LoginCard() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
          <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>
        <CardTitle className="text-xl font-semibold">WxCC Override Manager</CardTitle>
        <CardDescription>
          Sign in with your Webex account to manage Business Hours Overrides for your contact center.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {ERROR_MESSAGES[error] ?? "An error occurred. Please try again."}
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
        WxCC Override Manager &mdash; Not affiliated with Cisco
      </p>
    </div>
  );
}
