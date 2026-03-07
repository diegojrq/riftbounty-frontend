"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

const inputClass = "w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export default function LoginPage() {
  const router = useRouter();
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Signed in successfully. Welcome back!");
      router.push("/");
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-white">Sign in</h1>
      {error && (
        <div className="mb-4 rounded border border-red-700/50 bg-red-900/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-emerald-400 hover:text-emerald-300 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
