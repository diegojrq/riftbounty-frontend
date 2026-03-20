"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getCollection, setCollectionVisibility } from "@/lib/collections";
import { checkSlugAvailable, getProfile, updateProfile, type UpdateProfilePayload } from "@/lib/profile";
import { useLocale } from "@/lib/locale-context";
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
  const { t } = useLocale();
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
  const [collectionIsPublic, setCollectionIsPublic] = useState(false);
  const [collectionMinKeepPrivate, setCollectionMinKeepPrivate] = useState(0);
  const [collectionMaxPublicCopies, setCollectionMaxPublicCopies] = useState<number | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
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

  function clampInt(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.trunc(value)));
  }

  function buildVisibilityRulesPayload() {
    return {
      minKeepPrivate: clampInt(collectionMinKeepPrivate || 0, 0, 999),
      maxPublicCopies:
        collectionMaxPublicCopies == null
          ? null
          : clampInt(collectionMaxPublicCopies, 1, 999),
    };
  }

  async function handleVisibilityToggle() {
    if (!user) return;
    setVisibilityLoading(true);
    try {
      const next = !collectionIsPublic;
      const rules = buildVisibilityRulesPayload();
      await setCollectionVisibility(next, rules.minKeepPrivate, rules.maxPublicCopies);
      setCollectionIsPublic(next);
      toast.success(t("profile.visibilitySaved"));
    } catch {
      toast.error(t("profile.errorLoadingProfile"));
    } finally {
      setVisibilityLoading(false);
    }
  }

  async function handleSavePublicCollectionRules() {
    if (!user) return;
    setVisibilityLoading(true);
    try {
      const rules = buildVisibilityRulesPayload();
      setCollectionMinKeepPrivate(rules.minKeepPrivate);
      setCollectionMaxPublicCopies(rules.maxPublicCopies);
      await setCollectionVisibility(collectionIsPublic, rules.minKeepPrivate, rules.maxPublicCopies);
      toast.success(t("profile.visibilitySaved"));
    } catch {
      toast.error(t("profile.errorLoadingProfile"));
    } finally {
      setVisibilityLoading(false);
    }
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
        setError(err instanceof Error ? err.message : t("profile.errorLoadingProfile"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getCollection()
      .then((data) => {
        setCollectionIsPublic(data.collection.isPublic ?? false);
        const rawMin = data.collection.minKeepPrivate;
        const rawMax = data.collection.maxPublicCopies ?? data.collection.max_public_copies;
        setCollectionMinKeepPrivate(
          typeof rawMin === "number" && Number.isFinite(rawMin)
            ? clampInt(rawMin, 0, 999)
            : 0
        );
        setCollectionMaxPublicCopies(
          typeof rawMax === "number" && Number.isFinite(rawMax)
            ? clampInt(rawMax, 1, 999)
            : null
        );
      })
      .catch(() => {});
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
        const msg = t("profile.slugTaken");
        focusErrorAndBounce(msg);
        toast.error(msg);
      } else {
        toast.success(t("profile.slugAvailable"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("profile.checkAvailability");
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
      const msg = t("profile.checkSlugFirst");
      focusErrorAndBounce(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      await updateProfile(buildPayload());
      await refreshUser();
      setSlugAvailability(true);
      toast.success(t("profile.profileSaved"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("profile.errorLoadingProfile");
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

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="mb-6 h-8 w-24 animate-pulse rounded bg-gray-700" />
          <div className="space-y-6">
            {/* Name section */}
            <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
              <div className="border-b border-gray-700 px-5 py-4">
                <div className="h-5 w-16 animate-pulse rounded bg-gray-700" />
              </div>
              <div className="space-y-4 p-5">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="mb-1.5 h-3 w-20 animate-pulse rounded bg-gray-700" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-700/60" />
                  </div>
                ))}
              </div>
            </div>
            {/* Address section */}
            <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
              <div className="border-b border-gray-700 px-5 py-4">
                <div className="h-5 w-20 animate-pulse rounded bg-gray-700" />
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-gray-700" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-700/60" />
                  </div>
                  <div>
                    <div className="mb-1.5 h-3 w-28 animate-pulse rounded bg-gray-700" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-700/60" />
                  </div>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="mb-1.5 h-3 w-16 animate-pulse rounded bg-gray-700" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-700/60" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1.5 h-3 w-16 animate-pulse rounded bg-gray-700" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-700/60" />
                  </div>
                  <div>
                    <div className="mb-1.5 h-3 w-12 animate-pulse rounded bg-gray-700" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-700/60" />
                  </div>
                </div>
              </div>
            </div>
            {/* Save button */}
            <div className="flex justify-end">
              <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

        <h1 className="mb-6 text-2xl font-bold text-white">{t("profile.profile")}</h1>
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
              <h2 className="text-lg font-semibold text-white">{t("profile.nameSection")}</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="profileEmail" className={labelClass}>
                  {t("profile.email")}
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
                  {t("profile.username")}
                </label>
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <input
                    id="profileSlug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(normalizeSlugInput(e.target.value));
                      setSlugAvailability(null);
                    }}
                    className={`${inputClass} min-w-0 flex-1`}
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
                    {slugChecking ? t("profile.checking") : t("profile.checkAvailability")}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t("profile.slugHint")}
                  {slugAvailability === true && (
                    <span className="ml-2 text-emerald-400">· {t("profile.available")}</span>
                  )}
                  {slugAvailability === false && (
                    <span className="ml-2 text-red-400">· {t("profile.taken")}</span>
                  )}
                </p>
              </div>
              <div>
                <label htmlFor="displayName" className={labelClass}>
                  {t("profile.displayName")}
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
              <h2 className="text-lg font-semibold text-white">{t("profile.publicCollectionSection")}</h2>
              <p className="mt-1 text-xs text-gray-500">{t("profile.publicCollectionSectionHint")}</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-300">{t("profile.visibleOnProfile")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={collectionIsPublic}
                  disabled={visibilityLoading}
                  onClick={handleVisibilityToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${collectionIsPublic ? "border-emerald-500 bg-emerald-600" : "border-gray-600 bg-gray-700"} ${visibilityLoading ? "opacity-50" : ""}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${collectionIsPublic ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {collectionIsPublic && (
                <div className="space-y-3 rounded border border-gray-700/70 bg-gray-800/50 p-3">
                  <div>
                    <label htmlFor="minKeepPrivate" className={labelClass}>
                      {t("profile.minKeepPrivate")}
                    </label>
                    <input
                      id="minKeepPrivate"
                      type="number"
                      min={0}
                      max={999}
                      value={collectionMinKeepPrivate}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        setCollectionMinKeepPrivate(
                          Number.isFinite(raw) ? raw : 0
                        );
                      }}
                      disabled={visibilityLoading}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-500">{t("profile.minKeepPrivateHint")}</p>
                  </div>
                  <div>
                    <label htmlFor="maxPublicCopies" className={labelClass}>
                      {t("profile.maxPublicCopies")}
                    </label>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                      <input
                        id="maxPublicCopies"
                        type="number"
                        min={1}
                        max={999}
                        value={collectionMaxPublicCopies ?? ""}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          if (!value) {
                            setCollectionMaxPublicCopies(null);
                            return;
                          }
                          const parsed = Number(value);
                          setCollectionMaxPublicCopies(Number.isFinite(parsed) ? parsed : null);
                        }}
                        disabled={visibilityLoading}
                        className={`${inputClass} min-w-0 flex-1`}
                        placeholder="Sem limite"
                      />
                      <button
                        type="button"
                        onClick={() => setCollectionMaxPublicCopies(null)}
                        disabled={visibilityLoading || collectionMaxPublicCopies == null}
                        className="shrink-0 rounded border border-gray-600 bg-gray-700 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-600 disabled:opacity-50"
                      >
                        {t("common.clearAll")}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{t("profile.maxPublicCopiesHint")}</p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSavePublicCollectionRules}
                      disabled={visibilityLoading}
                      className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {visibilityLoading ? t("common.loading") : t("profile.save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
          <section className={sectionCardClass}>
            <div className="border-b border-gray-700 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">
                {t("profile.addressSection")}
                <span className="ml-1 rounded border border-gray-600 bg-gray-700/50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-wide">{t("profile.addressOptional")}</span>
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {t("profile.addressHint")}
              </p>
              {addressLockedFromCep && (
                <p className="mt-1 text-xs text-amber-400/90">
                  {t("profile.addressLockedByCep")}
                </p>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="countryCode" className={labelClass}>
                    {t("profile.countryCode")}
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
                    {t("profile.postalCode")}
                    {cepLoading && (
                      <span className="ml-2 text-xs text-gray-500">{t("profile.searchingCep")}</span>
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
                  {t("profile.street")}
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
                    {t("profile.number")}
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
                    {t("profile.complement")}
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
                  {t("profile.neighborhood")}
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
                    {t("profile.city")}
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
                    {t("profile.state")}
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
              {saving ? t("profile.saving") : t("profile.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
