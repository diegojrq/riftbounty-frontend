"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { normalizeSlugInput, validateSlug } from "@/lib/slug";

const inputClass = "w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const inputErrorClass = "border-red-500 bg-red-950/20 focus:border-red-400 focus:ring-red-400";

function safeReturnTo(value: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value.trim());
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\0")) return null;
  return decoded;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const { register, error, clearError } = useAuth();
  const { t, locale } = useLocale();
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"email" | "slug" | "password" | "confirmPassword" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setErrorField(null);
    const slugErr = validateSlug(slug);
    if (slugErr) {
      setLocalError(slugErr);
      setErrorField("slug");
      return;
    }
    if (password.length < 8) {
      setLocalError(t("auth.passwordMinLength"));
      setErrorField("password");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(t("auth.passwordsDoNotMatch"));
      setErrorField("confirmPassword");
      return;
    }
    setLoading(true);
    try {
      await register({
        email,
        password,
        slug: normalizeSlugInput(slug.trim()),
        ...(displayName.trim() && { displayName: displayName.trim() }),
      });
      toast.success(t("auth.accountCreatedSuccess"));
      router.push(returnTo ?? "/");
    } catch {
      setLoading(false);
    }
  }

  const err = error ?? localError;
  const resolvedErrorField = (() => {
    if (errorField) return errorField;
    const msg = (err ?? "").toLowerCase();
    if (msg.includes("slug") || msg.includes("username") || msg.includes("user name")) return "slug";
    if (msg.includes("email")) return "email";
    if (msg.includes("password")) return "password";
    return null;
  })();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-white">{t("auth.createAccount")}</h1>
      {err && (
        <div className="mb-4 rounded border border-red-700/50 bg-red-900/40 p-3 text-sm text-red-300">
          {err}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-gray-300">
            {t("auth.nameOptional")}
          </label>
          <input
            id="displayName"
            type="text"
            maxLength={120}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (resolvedErrorField === "email") {
                clearError();
                setLocalError(null);
                setErrorField(null);
              }
            }}
            className={`${inputClass} ${resolvedErrorField === "email" ? inputErrorClass : ""}`}
            aria-invalid={resolvedErrorField === "email"}
          />
        </div>
        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-300">
            {t("auth.username")}
          </label>
          <input
            id="slug"
            type="text"
            required
            minLength={3}
            maxLength={30}
            value={slug}
            onChange={(e) => {
              setSlug(normalizeSlugInput(e.target.value));
              if (resolvedErrorField === "slug") {
                clearError();
                setLocalError(null);
                setErrorField(null);
              }
            }}
            className={`${inputClass} ${resolvedErrorField === "slug" ? inputErrorClass : ""}`}
            placeholder={locale === "pt-BR" ? "nome_de_usuario_insano" : "insanely_nice_username"}
            aria-invalid={resolvedErrorField === "slug"}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t("auth.usernameHint")}
          </p>
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
            {t("auth.passwordMinHint")}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (resolvedErrorField === "password" || resolvedErrorField === "confirmPassword") {
                clearError();
                setLocalError(null);
                setErrorField(null);
              }
            }}
            className={`${inputClass} ${
              resolvedErrorField === "password" || resolvedErrorField === "confirmPassword"
                ? inputErrorClass
                : ""
            }`}
            aria-invalid={resolvedErrorField === "password" || resolvedErrorField === "confirmPassword"}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-300">
            {t("auth.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (resolvedErrorField === "confirmPassword" || resolvedErrorField === "password") {
                clearError();
                setLocalError(null);
                setErrorField(null);
              }
            }}
            className={`${inputClass} ${
              resolvedErrorField === "confirmPassword" || resolvedErrorField === "password"
                ? inputErrorClass
                : ""
            }`}
            aria-invalid={resolvedErrorField === "confirmPassword" || resolvedErrorField === "password"}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? t("auth.creatingAccount") : t("nav.register")}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-400">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-gray-700" />
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded bg-gray-700" />
        <div className="h-10 animate-pulse rounded bg-gray-700" />
        <div className="h-10 animate-pulse rounded bg-gray-700" />
        <div className="h-10 animate-pulse rounded bg-gray-700" />
        <div className="h-10 animate-pulse rounded bg-gray-700" />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
