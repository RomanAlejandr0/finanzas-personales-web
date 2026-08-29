import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : "Usuario";

  return (
    <section aria-label="Perfil" className="flex flex-1 flex-col gap-6 pt-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Perfil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Información de tu cuenta.
        </p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
          <CardDescription>Correo electrónico asociado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{email}</p>
        </CardContent>
      </Card>
    </section>
  );
}
