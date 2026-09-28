import { listFields } from "@/lib/data/fields";
import { getValuesForItems, listArchiveItems } from "@/lib/data/archive";
import { ArchiveExplorer } from "./ArchiveExplorer";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [fields, items] = await Promise.all([
    listFields(projectId),
    listArchiveItems(projectId),
  ]);
  const valuesByItem = await getValuesForItems(items.map((i) => i.id));

  return (
    <ArchiveExplorer
      projectId={projectId}
      fields={fields}
      items={items}
      valuesByItem={valuesByItem}
    />
  );
}
