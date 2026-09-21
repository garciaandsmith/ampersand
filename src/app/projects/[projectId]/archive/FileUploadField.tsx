"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Music, Play, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { makeThumbnail } from "@/lib/media/thumbnail";
import { Button } from "@/components/ui";
import { createUploadTargetsAction, discardStagedFilesAction } from "./upload-actions";
import type { StagedFile } from "./new/actions";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * A file picker that uploads straight to storage the moment a file is chosen
 * and shows a recognisable preview (a still for images, a frame for videos).
 * Because the file is already stored, AI skills can read it right away — no
 * "save first" step, and no size limit from the app server's request body.
 */
export function FileUploadField({
  projectId,
  value,
  onChange,
  onBusyChange,
}: {
  projectId: string;
  value: StagedFile | null;
  onChange: (file: StagedFile | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; type: string; size: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function setBusyState(v: boolean) {
    setBusy(v);
    onBusyChange(v);
  }

  function discard(file: StagedFile | null) {
    if (!file) return;
    const paths = [file.path, file.thumbPath].filter((p): p is string => !!p);
    void discardStagedFilesAction({ projectId, paths }).catch(() => {});
  }

  function clear() {
    discard(value);
    onChange(null);
    setPreview(null);
    setMeta(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handlePick(file: File) {
    setError(null);
    discard(value);
    onChange(null);
    setPreview(null);
    setMeta({ name: file.name, type: file.type, size: file.size });
    setBusyState(true);
    try {
      const thumb = await makeThumbnail(file);
      // Images the browser can't decode into a thumbnail can still be shown as-is.
      if (thumb) setPreview(URL.createObjectURL(thumb));
      else if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file));

      const targets = await createUploadTargetsAction({
        projectId,
        fileName: file.name,
        withThumbnail: !!thumb,
      });
      const bucket = supabaseBrowser().storage.from("archive");

      const uploaded = await bucket.uploadToSignedUrl(targets.file.path, targets.file.token, file, {
        contentType: file.type || undefined,
      });
      if (uploaded.error) throw new Error(uploaded.error.message);

      let thumbPath: string | null = null;
      if (thumb && targets.thumb) {
        const t = await bucket.uploadToSignedUrl(targets.thumb.path, targets.thumb.token, thumb, {
          contentType: "image/jpeg",
        });
        if (!t.error) thumbPath = targets.thumb.path;
      }

      onChange({ path: targets.file.path, name: file.name, type: file.type, thumbPath });
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
      setPreview(null);
      setMeta(null);
    } finally {
      setBusyState(false);
    }
  }

  const isVideo = meta?.type.startsWith("video/");
  const isAudio = meta?.type.startsWith("audio/");

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePick(file);
        }}
        className="w-full rounded border border-coral/40 bg-white px-3 py-2 text-sm"
      />

      {meta ? (
        <div className="mt-3 max-w-md overflow-hidden rounded border border-charcoal/15 bg-charcoal/[0.03]">
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing for next/image to optimise */}
              <img
                src={preview}
                alt={`Preview of ${meta.name}`}
                className="max-h-80 w-full bg-charcoal/5 object-contain"
              />
              {isVideo ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-charcoal/70 p-3 text-paper">
                    <Play className="h-6 w-6" />
                  </span>
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center bg-charcoal/5 text-charcoal/40">
              {isAudio ? <Music className="h-10 w-10" /> : isVideo ? <Play className="h-10 w-10" /> : <FileText className="h-10 w-10" />}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0 text-xs">
              <p className="truncate font-bold text-charcoal">{meta.name}</p>
              <p className="text-charcoal/50">
                {formatSize(meta.size)}
                {busy ? " · uploading…" : value ? " · uploaded" : ""}
              </p>
            </div>
            {busy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-charcoal/50" />
            ) : (
              <Button variant="ghost" type="button" onClick={clear} className="px-2 py-1 text-xs">
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-coral">{error}</p> : null}
    </div>
  );
}
