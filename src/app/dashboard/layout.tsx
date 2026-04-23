import { TopNav } from "@/components/layout/TopNav";
import { getSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const firstName = session.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      {firstName && (
        <div className="bg-blue-600 text-white text-sm text-center py-1.5">
          Welcome, {firstName}!
        </div>
      )}
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
