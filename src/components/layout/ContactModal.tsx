"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { submitContact } from "@/lib/contact";

const MIN_MESSAGE_LEN = 10;

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(user?.email ?? "");
    }
  }, [open, user?.email]);

  const reset = useCallback(() => {
    setSubject("");
    setMessage("");
    setEmail(user?.email ?? "");
  }, [user?.email]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      reset();
      onClose();
    }
  }, [submitting, onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, handleClose]);

  if (!open) return null;

  const messageOk = message.trim().length >= MIN_MESSAGE_LEN;
  const canSubmit =
    email.trim().length > 0 && subject.trim().length > 0 && messageOk && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await submitContact({
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      toast.success(res.message ?? t("contact.success"));
      reset();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("contact.error");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label={t("contact.close")}
        onClick={handleClose}
      />
      <div
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl border border-gray-700 bg-gray-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3 sm:px-5">
          <h2 id="contact-modal-title" className="text-lg font-semibold text-white">
            {t("contact.title")}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            aria-label={t("contact.close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-5">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
            {t("contact.email")}
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={t("contact.emailPlaceholder")}
          />
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
            {t("contact.subject")}
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={t("contact.subjectPlaceholder")}
          />
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
            {t("contact.message")}
          </label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mb-1 w-full resize-y rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={t("contact.messagePlaceholder")}
          />
          <p className={`mb-4 text-xs ${messageOk ? "text-gray-600" : "text-amber-400/90"}`}>
            {t("contact.messageHint", { min: MIN_MESSAGE_LEN })}
          </p>
          <div className="mt-auto flex flex-col gap-2 border-t border-gray-700 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
            >
              {t("contact.cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t("contact.sending") : t("contact.send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
