"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { caseLinkTypeLabels } from "@/lib/labels";
import { formatBytes } from "@/lib/format";

interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: string | null;
  description: string | null;
}

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx";

interface Props {
  caseId: string;
  links: LinkItem[];
  files?: FileItem[];
  canManage: boolean;
}

export default function LinksSection({ caseId, links: initialLinks, files: initialFiles, canManage }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [files, setFiles] = useState(initialFiles ?? []);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !url.trim()) {
      setError("Tittel og URL er påkrevd.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, type: type || null, description: description || null }),
      });
      if (!res.ok) { setError((await res.json()).error ?? "Feil"); return; }
      const link = await res.json();
      setLinks((prev) => [...prev, link]);
      setTitle(""); setUrl(""); setType(""); setDescription("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Noe gikk galt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(linkId: string) {
    try {
      await fetch(`/api/cases/${caseId}/links/${linkId}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      router.refresh();
    } catch {
      // silent
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/cases/${caseId}/files`, { method: "POST", body: formData });
      if (!res.ok) {
        setUploadError((await res.json()).error ?? "Kunne ikke laste opp filen.");
        return;
      }
      const uploaded = await res.json();
      setFiles((prev) => [...prev, uploaded]);
      router.refresh();
    } catch {
      setUploadError("Noe gikk galt.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    try {
      await fetch(`/api/cases/${caseId}/files/${fileId}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      router.refresh();
    } catch {
      // silent
    }
  }

  if (links.length === 0 && files.length === 0 && !canManage) return null;

  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Materiale
        </p>
        {canManage && !showForm && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm disabled:opacity-60"
              style={{ color: "var(--color-accent)" }}
            >
              {uploading ? "Laster opp..." : "+ Last opp fil"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-sm"
              style={{ color: "var(--color-accent)" }}
            >
              + Legg til lenke
            </button>
          </div>
        )}
      </div>

      {links.length > 0 && (
        <ul className="space-y-2 mb-4">
          {links.map((link) => (
            <li key={link.id} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {link.title}
                  </a>
                  {link.type && (
                    <span
                      className="px-1.5 py-0.5 text-xs rounded"
                      style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}
                    >
                      {caseLinkTypeLabels[link.type as keyof typeof caseLinkTypeLabels] ?? link.type}
                    </span>
                  )}
                </div>
                {link.description && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {link.description}
                  </p>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(link.id)}
                  className="text-xs flex-shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                  title="Slett lenke"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="space-y-2 mb-4">
          {files.map((file) => (
            <li key={file.id} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <a
                  href={`/api/cases/${caseId}/files/${file.id}`}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  {file.filename}
                </a>
                <span className="text-xs ml-2" style={{ color: "var(--color-text-muted)" }}>
                  {formatBytes(file.sizeBytes)}
                </span>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDeleteFile(file.id)}
                  className="text-xs flex-shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                  title="Slett fil"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (files.length > 0 || uploadError) && (
        <p className="text-xs mb-3" style={{ color: uploadError ? "var(--color-error-text)" : "var(--color-text-muted)" }}>
          {uploadError || `${formatBytes(totalBytes)} av ${formatBytes(MAX_TOTAL_BYTES)} brukt`}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 pt-3" style={{ borderTop: links.length > 0 ? "1px solid var(--color-border-subtle)" : "none" }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                Tittel <span style={{ color: "var(--color-error-text)" }}>*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Presentasjon Q4"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                URL <span style={{ color: "var(--color-error-text)" }}>*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg"
                style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-secondary)" }}
              >
                <option value="">— Velg type —</option>
                {Object.entries(caseLinkTypeLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Beskrivelse</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
              />
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: "var(--color-error-text)" }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {saving ? "Lagrer..." : "Legg til"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-1.5 text-sm rounded-lg"
              style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text-secondary)" }}
            >
              Avbryt
            </button>
          </div>
        </form>
      )}

      {links.length === 0 && files.length === 0 && !showForm && canManage && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Ingen lenker eller filer lagt til ennå.
        </p>
      )}
    </div>
  );
}
