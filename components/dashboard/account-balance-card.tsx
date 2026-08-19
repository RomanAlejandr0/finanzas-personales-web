"use client";

import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  BalanceProjectionChart,
  type BalanceProjectionPoint,
} from "@/components/dashboard/balance-projection-chart";
import { createClient } from "@/lib/supabase/client";

type AccountBalanceCardProps = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  currentBalance: number | null;
  projectionData: BalanceProjectionPoint[];
};

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function AccountBalanceCard({
  accountId,
  accountName,
  currencyCode,
  currentBalance,
  projectionData,
}: AccountBalanceCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasSnapshot = currentBalance !== null;

  const handleOpenChange = (open: boolean) => {
    if (isPending) {
      return;
    }

    setIsOpen(open);

    if (!open) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (amount.trim() === "") {
      setErrorMessage("Ingresa un importe.");
      return;
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount)) {
      setErrorMessage("Ingresa un importe válido.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("record_balance_snapshot", {
        p_account_id: accountId,
        p_amount: parsedAmount,
        p_client_request_id: crypto.randomUUID(),
      });

      if (error) {
        setErrorMessage("No se pudo guardar el saldo. Inténtalo de nuevo.");
        return;
      }

      setAmount("");
      setIsOpen(false);
      router.refresh();
    });
  };

  const actionLabel = hasSnapshot ? "Actualizar saldo" : "Registrar saldo";
  const dialogTitle = hasSnapshot
    ? `Actualizar saldo de ${accountName}`
    : `Registrar saldo de ${accountName}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{accountName}</CardTitle>
          <CardDescription>Saldo actual</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {hasSnapshot ? (
            <>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(currentBalance, currencyCode)}
              </p>
              <BalanceProjectionChart
                currencyCode={currencyCode}
                data={projectionData}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no has registrado un saldo.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <DialogTrigger asChild>
            <Button variant={hasSnapshot ? "outline" : "default"}>
              <PencilLine data-icon="inline-start" />
              {actionLabel}
            </Button>
          </DialogTrigger>
        </CardFooter>
      </Card>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {hasSnapshot
              ? "Registra el saldo que ves actualmente en esta cuenta."
              : "¿Cuánto dinero tienes actualmente en esta cuenta?"}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(errorMessage)}>
              <FieldLabel htmlFor="account-balance">Saldo</FieldLabel>
              <Input
                aria-invalid={Boolean(errorMessage)}
                autoFocus
                id="account-balance"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
              />
              <FieldDescription>
                Puedes registrar $0 o un saldo negativo si aplica.
              </FieldDescription>
              <FieldError>{errorMessage}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isPending} type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button disabled={isPending} type="submit">
              {isPending && <Spinner data-icon="inline-start" />}
              Guardar saldo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
