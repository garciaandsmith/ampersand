import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Card } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/brand/icon-yellow.png" alt="" width={40} height={40} />
          <h1 className="font-sans text-lg font-extrabold text-charcoal">Sign in to AMPERSAND</h1>
          <p className="text-center text-xs text-charcoal/50">
            Invite-only. Ask an admin if you need access.
          </p>
        </div>
        <LoginForm />
      </Card>
    </div>
  );
}
