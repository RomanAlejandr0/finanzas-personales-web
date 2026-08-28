"use client";

import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import {
  CreditCardDebtProjectionChart,
  type CreditCardDebtProjectionPoint,
} from "@/components/dashboard/credit-card-debt-projection-chart";
import { createClient } from "@/lib/supabase/client";

type AccountBalanceCardProps = {
  accountId: string;
  accountName: string;
  accountType: "asset" | "liability";
  accountSubtype: string;
  creditLimit?: number;
  currencyCode: string;
  currentBalance: number | null;
  debtProjectionData?: CreditCardDebtProjectionPoint[];
  projectionData: BalanceProjectionPoint[];
};

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function roundToCents(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function formatAmountForInput(amount: number) {
  return roundToCents(amount).toFixed(2);
}

function formatMonthAndYear(date: string) {
  const dateParts = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).formatToParts(new Date(`${date}T12:00:00`));
  const month = dateParts.find((part) => part.type === "month")?.value;
  const year = dateParts.find((part) => part.type === "year")?.value;

  return month && year
    ? `${month.charAt(0).toLocaleUpperCase("es-MX")}${month.slice(1)} ${year}`
    : "";
}

export function AccountBalanceCard({
  accountId,
  accountName,
  accountType,
  accountSubtype,
  creditLimit = 0,
  currencyCode,
  currentBalance,
  debtProjectionData = [],
  projectionData,
}: AccountBalanceCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasSnapshot = currentBalance !== null;
  const isCreditCard = accountType === "liability" && accountSubtype === "credit_card";
  const currentDebt = currentBalance ?? 0;
  const availableCredit = Math.max(creditLimit - currentDebt, 0);
  const projectionPeriod = projectionData[0]?.date;

  const handleOpenChange = (open: boolean) => {
    if (isPending) {
      return;
    }

    setIsOpen(open);

    if (open && isCreditCard) {
      setAmount(formatAmountForInput(availableCredit));
    }

    if (!open) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (amount.trim() === "") {
      setErrorMessage(isCreditCard ? "Ingresa el crédito disponible." : "Ingresa un importe.");
      return;
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount)) {
      setErrorMessage(
        isCreditCard ? "Ingresa un crédito disponible válido." : "Ingresa un importe válido.",
      );
      return;
    }

    if (isCreditCard && (parsedAmount < 0 || parsedAmount > creditLimit)) {
      setErrorMessage("El crédito disponible debe estar entre $0 y tu límite de crédito.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = isCreditCard
          ? await supabase.rpc("record_credit_card_balance_snapshot", {
            p_account_id: accountId,
            p_amount: roundToCents(creditLimit - parsedAmount),
            p_client_request_id: crypto.randomUUID(),
          })
        : await supabase.rpc("record_balance_snapshot", {
            p_account_id: accountId,
            p_amount: parsedAmount,
            p_client_request_id: crypto.randomUUID(),
          });

      if (error) {
        setErrorMessage(
          isCreditCard
            ? "No se pudo guardar el saldo disponible. Inténtalo de nuevo."
            : "No se pudo guardar el saldo. Inténtalo de nuevo.",
        );
        return;
      }

      setAmount("");
      setIsOpen(false);
      router.refresh();
    });
  };

  const actionLabel = isCreditCard
    ? hasSnapshot
      ? "Actualizar saldo disponible"
      : "Registrar saldo disponible"
    : hasSnapshot
      ? "Actualizar saldo"
      : "Registrar saldo";
  const dialogTitle = hasSnapshot
    ? `Actualizar ${isCreditCard ? "saldo disponible" : "saldo"} de ${accountName}`
    : `Registrar ${isCreditCard ? "saldo disponible" : "saldo"} de ${accountName}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{accountName}</CardTitle>
          <CardDescription>{isCreditCard ? "Deuda actual" : "Saldo actual"}</CardDescription>
          {projectionPeriod && (
            <CardAction>
              <span className="text-sm text-muted-foreground">
                {formatMonthAndYear(projectionPeriod)}
              </span>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {hasSnapshot && isCreditCard ? (
            <>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(currentDebt, currencyCode)}
              </p>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>
                  Límite de crédito: {formatCurrency(creditLimit, currencyCode)}
                </span>
                <span>
                  Crédito disponible: {formatCurrency(availableCredit, currencyCode)}
                </span>
              </div>
              <CreditCardDebtProjectionChart
                creditLimit={creditLimit}
                currencyCode={currencyCode}
                data={debtProjectionData}
              />
            </>
          ) : hasSnapshot ? (
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
              {isCreditCard
                ? "Aún no has registrado la deuda actual de esta tarjeta."
                : "Aún no has registrado un saldo."}
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
              ? isCreditCard
                ? "Registra el crédito disponible que ves actualmente en esta tarjeta."
                : "Registra el saldo que ves actualmente en esta cuenta."
              : isCreditCard
                ? "¿Cuánto crédito disponible tienes actualmente en esta tarjeta?"
                : "¿Cuánto dinero tienes actualmente en esta cuenta?"}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(errorMessage)}>
              <FieldLabel htmlFor="account-balance">
                {isCreditCard ? "Crédito disponible" : "Saldo"}
              </FieldLabel>
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
                {isCreditCard
                  ? "La deuda se calculará con base en este monto y tu límite de crédito."
                  : "Puedes registrar $0 o un saldo negativo si aplica."}
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
              {isCreditCard ? "Guardar saldo disponible" : "Guardar saldo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
