"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getCommunity,
  resolveCommunityErrorMessage,
  updateCommunityAdmin,
  uploadCommunityAvatarAdmin,
  validateCommunityAvatarFile,
} from "@/lib/communities";
import { useLocale } from "@/lib/locale-context";
import type { Community } from "@/types/community";

export default function AdminCommunityEditPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = typeof params?.slug === "string" ? params.slug : "";
  const { t } = useLocale();

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const load = useCallback(async () => {
    if (!slugParam) return;
    setLoading(true);
    try {
      const c = await getCommunity(slugParam);
      setCommunity(c);
      setName(c.name);
      setSlug(c.slug);
      setDescription(c.description ?? "");
      setAvatarUrl(c.avatarUrl ?? "");
    } catch {
      toast.error(t("communities.errorNotFound"));
      router.replace("/admin/communities");
    } finally {
      setLoading(false);
    }
  }, [slugParam, t, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!community || !name.trim() || !slug.trim()) {
      toast.error(t("admin.communitiesValidationNameSlug"));
      return;
    }
    setSaving(true);
    try {
      const nextSlug = slug.trim();
      const payload: Parameters<typeof updateCommunityAdmin>[1] = {
        name: name.trim(),
        description: description.trim() || null,
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
      };
      if (nextSlug !== community.slug) payload.slug = nextSlug;
      const updated = await updateCommunityAdmin(community.id, payload);
      toast.success(t("admin.communitiesUpdated"));
      if (updated.slug !== slugParam) {
        router.replace(`/admin/communities/${encodeURIComponent(updated.slug)}`);
      } else {
        await load();
      }
    } catch (err) {
      toast.error(resolveCommunityErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setPendingAvatarFile(null);
      return;
    }
    const clientErr = validateCommunityAvatarFile(file);
    if (clientErr === "size") {
      toast.error(t("admin.communitiesAvatarClientSize"));
      e.target.value = "";
      setPendingAvatarFile(null);
      return;
    }
    if (clientErr === "type") {
      toast.error(t("admin.communitiesAvatarClientType"));
      e.target.value = "";
      setPendingAvatarFile(null);
      return;
    }
    setPendingAvatarFile(file);
  }

  async function handleAvatarUploadClick() {
    if (!community || !pendingAvatarFile) {
      toast.error(t("admin.communitiesAvatarNoFileSelected"));
      return;
    }
    setUploadingAvatar(true);
    try {
      const updated = await uploadCommunityAvatarAdmin(community.id, pendingAvatarFile);
      setCommunity(updated);
      setAvatarUrl(updated.avatarUrl ?? "");
      setPendingAvatarFile(null);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
      toast.success(t("admin.communitiesAvatarUploadSuccess"));
      if (updated.slug !== slugParam) {
        router.replace(`/admin/communities/${encodeURIComponent(updated.slug)}`);
      }
    } catch (err) {
      toast.error(resolveCommunityErrorMessage(t, err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading || !community) {
    return (
      <div className="py-12 text-center text-gray-500">{t("common.loading")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/admin/communities" className="text-amber-400 hover:underline">
          ← {t("admin.communitiesBackToList")}
        </Link>
        <Link
          href={`/communities/${encodeURIComponent(community.slug)}`}
          className="text-blue-400 hover:underline"
        >
          {t("admin.communitiesViewPublic")}
        </Link>
      </div>

      <header>
        <h2 className="text-xl font-semibold text-white">{t("admin.communitiesEditTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500">ID: {community.id}</p>
      </header>

      <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-400/90">{t("admin.communitiesAvatarUploadHeading")}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{t("admin.communitiesAvatarUploadHint")}</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          {community.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.avatarUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-lg border border-gray-600 object-cover"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-400">{t("admin.communitiesAvatarChooseFile")}</span>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploadingAvatar}
                onChange={handleAvatarFilePick}
                className="max-w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-200 hover:file:bg-gray-600 disabled:opacity-50"
              />
            </label>
            {pendingAvatarFile && (
              <p className="truncate text-xs text-gray-500" title={pendingAvatarFile.name}>
                {pendingAvatarFile.name}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={uploadingAvatar || !pendingAvatarFile}
              onClick={handleAvatarUploadClick}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploadingAvatar ? t("admin.communitiesAvatarUploading") : t("admin.communitiesAvatarUploadButton")}
            </button>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <div>
          <label className="block text-xs font-medium text-gray-500">{t("admin.communitiesFieldName")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">{t("admin.communitiesFieldSlug")}</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
            required
            pattern="[a-z0-9_\-]+"
          />
          <p className="mt-1 text-[11px] text-gray-600">{t("admin.communitiesSlugHint")}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">{t("admin.communitiesFieldDescription")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">{t("admin.communitiesFieldAvatarUrl")}</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            type="url"
            placeholder="https://"
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
          />
          <p className="mt-1 text-[11px] text-gray-600">{t("admin.communitiesAvatarClearHint")}</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? t("common.loading") : t("admin.save")}
        </button>
      </form>
    </div>
  );
}
