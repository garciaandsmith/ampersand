import { notFound } from "next/navigation";
import Image from "next/image";
import {
  getArchiveFileSignedUrl,
  getArchiveItem,
  getValuesForItems,
} from "@/lib/data/archive";
import { listFields } from "@/lib/data/fields";
import { Card } from "@/components/ui";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import type { StoredFileMeta } from "@/lib/types";
import { ItemEditor } from "./ItemEditor";
import { deleteArchiveItemAction } from "./actions";

// Server actions on this page run AI calls (e.g. transcription) that can outlast the platform's default timeout.
export const maxDuration = 300;

export default async function ArchiveItemPage({
  params,
}: {
  params: Promise<{ projectId: string; itemId: string }>;
}) {
  const { projectId, itemId } = await params;

  const [item, fields] = await Promise.all([
    getArchiveItem(itemId),
    listFields(projectId),
  ]);
  if (!item || item.project_id !== projectId) notFound();

  const valuesByItem = await getValuesForItems([itemId]);
  const values = valuesByItem[itemId] ?? [];
  const initialValues = Object.fromEntries(values.map((v) => [v.field_id, v.value_text ?? ""]));

  const fileField = fields.find((f) => f.data_type === "file");
  const fileValue = fileField ? values.find((v) => v.field_id === fileField.id) : undefined;
  const fileMeta = fileValue?.value_jsonb as StoredFileMeta | undefined;
  // Fall back to the legacy single-file columns for records created before file
  // fields moved into the generic field/value model.
  const filePath = fileValue?.value_text ?? item.file_path;
  const fileName = fileMeta?.name ?? item.file_name;
  const fileType = fileMeta?.type ?? item.file_type;

  const [signedUrl, thumbUrl] = await Promise.all([
    filePath ? getArchiveFileSignedUrl(filePath) : null,
    fileMeta?.thumbPath ? getArchiveFileSignedUrl(fileMeta.thumbPath) : null,
  ]);
  const isImage = fileType?.startsWith("image/");
  const isVideo = fileType?.startsWith("video/");
  const isAudio = fileType?.startsWith("audio/");
  const hasPreview = isImage || isVideo || isAudio;

  const manualFields = fields.filter((f) => f.input_type === "manual");
  const automatedFields = fields.filter((f) => f.input_type === "automated");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-sans text-lg font-extrabold">{item.title ?? "Untitled record"}</h2>
          <p className="text-xs text-charcoal/50">
            Created {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
        <ConfirmDeleteButton
          action={deleteArchiveItemAction}
          fields={{ projectId, itemId }}
          confirmMessage={`Delete "${item.title ?? "this record"}"? This permanently removes it and its uploaded files.`}
          label="Delete record"
        />
      </div>

      {signedUrl ? (
        <Card className="max-w-xl">
          {isVideo ? (
            <video
              src={signedUrl}
              poster={thumbUrl ?? undefined}
              controls
              preload="none"
              className="max-h-96 w-full rounded bg-charcoal/5"
            />
          ) : isImage ? (
            <Image
              src={signedUrl}
              alt={fileName ?? ""}
              width={960}
              height={720}
              unoptimized
              className="h-auto max-h-96 w-full rounded object-contain"
            />
          ) : isAudio ? (
            <audio src={signedUrl} controls className="w-full" />
          ) : null}
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className={`font-bold text-charcoal underline ${hasPreview ? "mt-3 block text-xs" : ""}`}
          >
            {hasPreview ? `Open original — ${fileName}` : `Download ${fileName}`}
          </a>
        </Card>
      ) : null}

      <ItemEditor
        projectId={projectId}
        itemId={itemId}
        manualFields={manualFields}
        automatedFields={automatedFields}
        initialValues={initialValues}
        initialTitle={item.title ?? ""}
      />
    </div>
  );
}
