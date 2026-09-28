import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/authServer";
import { Card } from "@/components/ui";
import { SetPasswordForm } from "./SetPasswordForm";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-sans text-lg font-extrabold text-charcoal">Set your password</h1>
        <p className="mb-6 text-sm text-charcoal/60">
          {user.email} — choose a password to finish setting up your account. You
          can still sign in with an emailed link anytime instead of a password.
        </p>
        <SetPasswordForm />
      </Card>
    </div>
  );
}
