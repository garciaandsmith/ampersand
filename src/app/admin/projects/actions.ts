"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProject } from "@/lib/data/projects";

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const users = String(formData.get("users") ?? "").trim();

  if (!name) {
    throw new Error("Project name is required");
  }

  const project = await createProject({ name, users: users || null });

  revalidatePath("/admin/projects");
  redirect(`/projects/${project.id}`);
}
