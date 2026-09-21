"use server";

import {
  createUploadTargets,
  isProjectStoragePath,
  removeArchiveFiles,
} from "@/lib/data/archive";

/**
 * Step 1 of an upload: hand the browser signed tokens so it can put the file
 * (and its thumbnail) directly into storage. The file exists in storage from
 * this point on, before the record is saved — that is what lets AI skills read
 * it (any size) as soon as it's picked.
 */
export async function createUploadTargetsAction(input: {
  projectId: string;
  fileName: string;
  withThumbnail: boolean;
}) {
  if (!input.projectId) throw new Error("Missing project id");
  return createUploadTargets(input.projectId, input.fileName, input.withThumbnail);
}

/** Deletes files that were uploaded but never attached to a saved record (replaced or removed by the user). */
export async function discardStagedFilesAction(input: { projectId: string; paths: string[] }) {
  const paths = input.paths.filter((p) => isProjectStoragePath(input.projectId, p));
  await removeArchiveFiles(paths);
}
