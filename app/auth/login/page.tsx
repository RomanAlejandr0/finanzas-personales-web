import { LoginForm } from "@/components/auth/login-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Link
        aria-label="Volver al inicio"
        className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:left-10 md:top-10"
        href="/"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
