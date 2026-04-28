"use client";

import { useEffect, useRef, useState } from "react";
import { OverridesDashboard } from "@/components/overrides/OverridesDashboard";

type Status = "waiting" | "authenticating" | "ready" | "error";

export default function EmbedPage() {
  const [status, setStatus] = useState<Status>("waiting");
  const [errorMsg, setErrorMsg] = useState("");
  const authInFlight = useRef(false);

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
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

  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-sm text-gray-400 gap-2">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        Connecting to Webex desktop…
      </div>
    );
  }

  if (status === "authenticating") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-sm text-gray-400 gap-2">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        Authenticating…
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
