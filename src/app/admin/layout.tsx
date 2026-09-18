import { Shell } from "@/components/Shell";
import { Tabs } from "@/components/Tabs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Shell roleLabel="admin" title="AMPERSAND admin">
      <Tabs
        items={[
          { label: "Projects", href: "/admin/projects" },
          { label: "Settings", href: "/admin/settings" },
        ]}
      />
      <div className="pt-8">{children}</div>
    </Shell>
  );
}
