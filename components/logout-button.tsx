"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type LogoutButtonProps = Omit<ButtonProps, "onClick">;

export function LogoutButton({
  children = "Cerrar sesión",
  className,
  ...props
}: LogoutButtonProps) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button className={className} onClick={logout} {...props}>
      {children}
    </Button>
  );
}
