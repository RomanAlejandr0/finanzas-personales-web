import { Button } from "@/components/ui/button";
import { UniverseParticles } from "@/components/landing/universe-particles";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6">
      <UniverseParticles />
      <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
        <p className="text-sm font-semibold tracking-tight">Finanzas Bin</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Una visión clara de tu posición financiera.
        </h1>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/auth/sign-up">Crear cuenta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/login">Iniciar sesión</Link>
          </Button>
        </div>
        <div className="mt-8">
          <ThemeSwitcher />
        </div>
      </div>
    </main>
  );
}
