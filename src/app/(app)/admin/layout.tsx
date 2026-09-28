import { requireAdminPage } from "@/lib/auth/session";
import { Shell } from "@/components/Shell";
import { Tabs } from "@/components/Tabs";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <Shell roleLabel="admin" title="AMPERSAND admin" headerActions={<SignOutButton />}>
      <Tabs
        items={[
          { label: "Projects", href: "/admin/projects" },
          { label: "Users", href: "/admin/users" },
          { label: "Settings", href: "/admin/settings" },
        ]}
      />
      <div className="pt-8">{children}</div>
    </Shell>
  );
}
