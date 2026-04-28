"use client";

import { useEffect, useRef, useState } from "react";
import { OverridesDashboard } from "@/components/overrides/OverridesDashboard";

type Status = "checking" | "waiting" | "authenticating" | "ready" | "needs-signin" | "error";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

export default function EmbedPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const authInFlight = useRef(false);

  // On mount: check for an existing session first (e.g. from a recent standalone login).
  // If none, wait up to 4s for a postMessage token from the desktop web component.
  // If neither arrives, show the sign-in prompt.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.authenticated) {
          setStatus("ready");
        } else {
          setStatus("waiting");
          timeoutId = setTimeout(() => {
            setStatus((s) => (s === "waiting" ? "needs-signin" : s));
          }, 4000);
        }
      })
      .catch(() => {
        setStatus("waiting");
        timeoutId = setTimeout(() => {
          setStatus((s) => (s === "waiting" ? "needs-signin" : s));
        }, 4000);
      });

    return () => clearTimeout(timeoutId);
  }, []);

  // Also listen for a token from the wxcc-override-manager web component.
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== "wxcc-override-token") return;
      const { accessToken } = event.data as { accessToken?: string };
      if (!accessToken || authInFlight.current) return;

      authInFlight.current = true;
      setStatus("authenticating");
      try {
        const res = await fetch("/api/auth/widget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Authentication failed");
        setStatus("ready");
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message);
      } finally {
        authInFlight.current = false;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (status === "checking" || status === "authenticating") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-sm text-gray-400 gap-2">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        {status === "checking" ? "Loading…" : "Authenticating…"}
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-sm text-gray-400 gap-2">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        Connecting to Webex desktop…
      </div>
    );
  }

  if (status === "needs-signin") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
        <p className="text-sm text-gray-600 font-medium">Sign in to use Override Manager</p>
        <p className="text-xs text-gray-400">
          Open the app in a new tab to sign in. Once signed in, return here and refresh.
        </p>
        <a
          href={APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Open Override Manager ↗
        </a>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-sm text-red-600 gap-2 px-6 text-center">
        <p className="font-semibold">Authentication error</p>
        <p className="text-red-400">{errorMsg}</p>
        <p className="text-gray-400 text-xs mt-2">
          Ensure the desktop OAuth app has <code>cjp:config</code> and{" "}
          <code>cjp:config_write</code> scopes.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen">
      <OverridesDashboard />
    </div>
  );
}
