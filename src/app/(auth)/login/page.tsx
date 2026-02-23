import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; from?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const isIdleTimeout = params.reason === "idle_timeout";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mint-50 to-mint-100">
      <div className="w-full max-w-md space-y-8 p-8">
        {/* Logo / Brand */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">MV</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mint Vision Optique</h1>
          <p className="text-sm text-gray-500 mt-1">Staff Portal</p>
        </div>

        {isIdleTimeout && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            You were signed out due to inactivity.
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  );
}
