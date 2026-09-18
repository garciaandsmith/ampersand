import { notFound } from "next/navigation";
import Image from "next/image";
import {
  getArchiveFileSignedUrl,
  getArchiveItem,
  getValuesForItems,
} from "@/lib/data/archive";
import { listFields } from "@/lib/data/fields";
import { Button, Card } from "@/components/ui";
import { ItemEditor } from "./ItemEditor";
import { deleteArchiveItemAction } from "./actions";

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
  const fileMeta = fileValue?.value_jsonb as { name?: string; type?: string } | undefined;
  // Fall back to the legacy single-file columns for records created before file
  // fields moved into the generic field/value model.
  const filePath = fileValue?.value_text ?? item.file_path;
  const fileName = fileMeta?.name ?? item.file_name;
  const fileType = fileMeta?.type ?? item.file_type;

  const signedUrl = filePath ? await getArchiveFileSignedUrl(filePath) : null;
  const isImage = fileType?.startsWith("image/");

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
        <form action={deleteArchiveItemAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="itemId" value={itemId} />
          <Button variant="danger" type="submit">
            Delete record
          </Button>
        </form>
      </div>

      {signedUrl ? (
        <Card className="max-w-md">
          {isImage ? (
            <Image
              src={signedUrl}
              alt={fileName ?? ""}
              width={640}
              height={480}
              unoptimized
              className="h-auto w-full rounded"
            />
          ) : (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-charcoal underline"
            >
              Download {fileName}
            </a>
          )}
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
