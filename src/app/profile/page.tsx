"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { checkSlugAvailable, getProfile, updateProfile, type UpdateProfilePayload } from "@/lib/profile";
import type { User, UserAddress } from "@/types/auth";

const BR_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
] as const;

const emptyAddress: UserAddress = {
  countryCode: null,
  postalCode: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
};

import { normalizeSlugInput, validateSlug, SLUG_REGEX } from "@/lib/slug";

function toFormAddress(a: User["address"]): UserAddress {
  if (!a) return { ...emptyAddress };
  return {
    countryCode: a.countryCode ?? null,
    postalCode: a.postalCode ?? null,
    street: a.street ?? null,
    number: a.number ?? null,
    complement: a.complement ?? null,
    neighborhood: a.neighborhood ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState<UserAddress>(emptyAddress);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [addressLockedFromCep, setAddressLockedFromCep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBounce, setErrorBounce] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  async function fetchViaCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    setAddressLockedFromCep(false);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setAddress((prev) => ({
        ...prev,
        street: data.logradouro ?? prev.street,
        neighborhood: data.bairro ?? prev.neighborhood,
        city: data.localidade ?? prev.city,
        state: data.uf ?? prev.state,
      }));
      setAddressLockedFromCep(true);
    } finally {
      setCepLoading(false);
    }
  }

  function handleCepBlur() {
    const cep = address.postalCode ?? "";
    if (cep.replace(/\D/g, "").length === 8) fetchViaCep(cep);
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        setSlug(data.slug ?? "");
        setSlugAvailability(null);
        setAddress(toFormAddress(data.address));
        setAddressLockedFromCep(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error loading profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const buildPayload = useCallback((): UpdateProfilePayload => {
    const normalizedSlug = normalizeSlugInput(slug.trim());
    const payload: UpdateProfilePayload = {
      displayName: displayName || undefined,
      ...(normalizedSlug.length >= 3 && normalizedSlug.length <= 30 && { slug: normalizedSlug }),
    };
    payload.countryCode = address.countryCode || null;
    payload.postalCode = address.postalCode || null;
    payload.street = address.street || null;
    payload.number = address.number || null;
    payload.complement = address.complement || null;
    payload.neighborhood = address.neighborhood || null;
    payload.city = address.city || null;
    payload.state = address.state || null;
    return payload;
  }, [displayName, slug, address]);

  function focusErrorAndBounce(message: string) {
    setError(message);
    setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setErrorBounce(true);
      setTimeout(() => setErrorBounce(false), 2000);
    }, 100);
  }

  const normalizedSlug = normalizeSlugInput(slug.trim());
  const slugValid = normalizedSlug.length >= 3 && normalizedSlug.length <= 30 && SLUG_REGEX.test(normalizedSlug);
  const slugUnchanged = normalizedSlug === (user?.slug ?? "");
  const slugMustBeChecked = slugValid && !slugUnchanged && slugAvailability !== true;

  async function handleCheckAvailability() {
    const err = validateSlug(slug);
    if (err) {
      focusErrorAndBounce(err);
      return;
    }
    setSlugChecking(true);
    setError(null);
    try {
      const res = await checkSlugAvailable(normalizedSlug);
      setSlugAvailability(res.available);
      if (!res.available) {
        const msg = "This slug is already taken.";
        focusErrorAndBounce(msg);
        toast.error(msg);
      } else {
        toast.success("This username is available.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not check availability";
      focusErrorAndBounce(msg);
      toast.error(msg);
    } finally {
      setSlugChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const slugErr = validateSlug(slug);
    if (slugErr) {
      focusErrorAndBounce(slugErr);
      toast.error(slugErr);
      return;
    }
    if (slugMustBeChecked) {
      const msg = "Check slug availability before saving.";
      focusErrorAndBounce(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      await updateProfile(buildPayload());
      await refreshUser();
      setSlugAvailability(true);
      toast.success("Profile saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving";
      focusErrorAndBounce(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const inputReadOnlyClass =
    "w-full rounded border border-amber-600/50 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 cursor-not-allowed opacity-90";
  const labelClass = "mb-1 block text-sm font-medium text-gray-300";
  const sectionCardClass =
    "overflow-hidden rounded-xl border border-gray-700 bg-gray-800";

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/decks"
          className="mb-6 inline-block text-sm font-medium text-gray-400 transition hover:text-white"
        >
          ← My decks
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-white">Profile</h1>
        {error && (
          <div
            ref={errorRef}
            className={`mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200 ${errorBounce ? "animate-tremble" : ""}`}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className={sectionCardClass}>
            <div className="border-b border-gray-700 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Name</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="profileEmail" className={labelClass}>
                  Email
                </label>
                <input
                  id="profileEmail"
                  type="email"
                  value={user.email}
                  readOnly
                  className={inputReadOnlyClass}
                  aria-readonly
                />
              </div>
              <div>
                <label htmlFor="profileSlug" className={labelClass}>
                  Username
                </label>
                <div className="flex gap-2">
                  <input
                    id="profileSlug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(normalizeSlugInput(e.target.value));
                      setSlugAvailability(null);
                    }}
                    className={inputClass}
                    placeholder="my_username"
                    minLength={3}
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={handleCheckAvailability}
                    disabled={!slugValid || slugChecking}
                    className="shrink-0 rounded bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-500 disabled:opacity-50"
                  >
                    {slugChecking ? "Checking…" : "Check availability"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  3–30 characters: letters, numbers, underscores. Used in riftbounty.com/username
                  {slugAvailability === true && (
                    <span className="ml-2 text-emerald-400">· Available</span>
                  )}
                  {slugAvailability === false && (
                    <span className="ml-2 text-red-400">· Taken</span>
                  )}
                </p>
              </div>
              <div>
                <label htmlFor="displayName" className={labelClass}>
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                  placeholder={user.email}
                />
              </div>
            </div>
          </section>
          <section className={sectionCardClass}>
            <div className="border-b border-gray-700 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">
                Address
                <span className="ml-1 rounded border border-gray-600 bg-gray-700/50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-wide">Optional</span>
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Your address helps match you with players near you.
              </p>
              {addressLockedFromCep && (
                <p className="mt-1 text-xs text-amber-400/90">
                  Street, neighborhood, city and state were filled by postal code lookup and are read-only.
                </p>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="countryCode" className={labelClass}>
                    Country (code)
                  </label>
                  <select
                    id="countryCode"
                    value={address.countryCode ?? ""}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, countryCode: e.target.value || null }))
                    }
                    className={inputClass}
                  >
                    <option value="">—</option>
                    <option value="BR">BR</option>
                    <option value="US">US</option>
                    <option value="PT">PT</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="postalCode" className={labelClass}>
                    Postal code (CEP)
                    {cepLoading && (
                      <span className="ml-2 text-xs text-gray-500">Searching…</span>
                    )}
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={address.postalCode ?? ""}
                    onChange={(e) => {
                      setAddress((a) => ({ ...a, postalCode: e.target.value || null }));
                      setAddressLockedFromCep(false);
                    }}
                    onBlur={handleCepBlur}
                    className={inputClass}
                    placeholder="00000-000"
                    disabled={cepLoading}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="street" className={labelClass}>
                  Street
                </label>
                <input
                  id="street"
                  type="text"
                  value={address.street ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, street: e.target.value || null }))
                  }
                  readOnly={addressLockedFromCep}
                  className={addressLockedFromCep ? inputReadOnlyClass : inputClass}
                  aria-readonly={addressLockedFromCep}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="number" className={labelClass}>
                    Number
                  </label>
                  <input
                    id="number"
                    type="text"
                    value={address.number ?? ""}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, number: e.target.value || null }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="complement" className={labelClass}>
                    Complement
                  </label>
                  <input
                    id="complement"
                    type="text"
                    value={address.complement ?? ""}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, complement: e.target.value || null }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="neighborhood" className={labelClass}>
                  Neighborhood
                </label>
                <input
                  id="neighborhood"
                  type="text"
                  value={address.neighborhood ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, neighborhood: e.target.value || null }))
                  }
                  readOnly={addressLockedFromCep}
                  className={addressLockedFromCep ? inputReadOnlyClass : inputClass}
                  aria-readonly={addressLockedFromCep}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className={labelClass}>
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={address.city ?? ""}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, city: e.target.value || null }))
                    }
                    readOnly={addressLockedFromCep}
                    className={addressLockedFromCep ? inputReadOnlyClass : inputClass}
                    aria-readonly={addressLockedFromCep}
                  />
                </div>
                <div>
                  <label htmlFor="state" className={labelClass}>
                    State
                  </label>
                  <select
                    id="state"
                    value={address.state ?? ""}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, state: e.target.value || null }))
                    }
                    disabled={addressLockedFromCep}
                    className={addressLockedFromCep ? inputReadOnlyClass : inputClass}
                    aria-readonly={addressLockedFromCep}
                  >
                    <option value="">—</option>
                    {BR_STATES.map((s) => (
                      <option key={s.uf} value={s.uf}>
                        {s.uf} – {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || slugMustBeChecked}
              className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
