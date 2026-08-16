import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { error: initializationError } = await supabase.rpc(
    "initialize_personal_universe",
  );

  if (initializationError) {
    throw new Error("No se pudo inicializar el universo personal.");
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Usuario";

  return (
    <div className="min-h-svh bg-background">
      <div className="grid min-h-svh md:grid-cols-[16rem_1fr]">
        <aside className="hidden border-r md:flex md:flex-col">
          <div className="flex flex-1 flex-col gap-6 p-4">
            <div className="flex flex-col gap-2">
              <p className="px-2 text-xs font-medium text-muted-foreground">
                Universos
              </p>
              <Button asChild className="justify-start" variant="secondary">
                <Link aria-current="page" href="/protected">
                  <CircleUserRound data-icon="inline-start" />
                  Personal
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <Separator />
            <p className="truncate px-2 text-sm text-muted-foreground" title={email}>
              {email}
            </p>
            <LogoutButton className="w-full justify-start" variant="ghost" />
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-6 py-8 md:px-10">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">Personal</h1>
            </header>
            <div className="flex-1">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
