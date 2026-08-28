"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { FinancialAccount } from "@/components/dashboard/account-context-selector";
import { createClient } from "@/lib/supabase/client";

type CommitmentKind =
  | "subscription"
  | "bill"
  | "debt_payment"
  | "planned_expense"
  | "expected_income";
type CommitmentRecurrence = "none" | "weekly" | "monthly" | "yearly";

type CommitmentActionsProps = {
  account: FinancialAccount;
  moneyAccounts: FinancialAccount[];
};

function getTodayInputValue() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function CommitmentActions({ account, moneyAccounts }: CommitmentActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [anchorDate, setAnchorDate] = useState(getTodayInputValue());
  const [kind, setKind] = useState<CommitmentKind>("subscription");
  const [recurrence, setRecurrence] =
    useState<CommitmentRecurrence>("monthly");
  const [settlementAccountId, setSettlementAccountId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isCreditCard =
    account.type === "liability" && account.subtype === "credit_card";
  const requiresSettlementAccount = isCreditCard && kind === "debt_payment";

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

    const parsedAmount = Number(amount);

    if (!name.trim() || !anchorDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Completa un nombre, una fecha y un importe mayor a cero.");
      return;
    }

    if (requiresSettlementAccount && !settlementAccountId) {
      setErrorMessage("Selecciona la cuenta desde la que se pagará la tarjeta.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("create_commitment", {
        p_account_id: account.id,
        p_anchor_date: anchorDate,
        p_amount: parsedAmount,
        p_kind: kind,
        p_name: name.trim(),
        p_recurrence: recurrence,
        ...(requiresSettlementAccount
          ? { p_settlement_account_id: settlementAccountId }
          : {}),
      });

      if (error) {
        setErrorMessage("No se pudo guardar el compromiso. Inténtalo de nuevo.");
        return;
      }

      setName("");
      setAmount(""); 
      setAnchorDate(getTodayInputValue());
      setKind("subscription");
      setRecurrence("monthly");
      setSettlementAccountId("");
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href={`/protected/commitments?account=${encodeURIComponent(account.id)}`}>
            Ver compromisos
          </Link>
        </Button>
        <DialogTrigger asChild>
          <Button type="button">
            <Plus data-icon="inline-start" />
            Agregar compromiso
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar compromiso</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="commitment-name">Nombre</FieldLabel>
              <Input
                autoFocus
                id="commitment-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Spotify"
                required
                value={name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="commitment-amount">Importe</FieldLabel>
              <Input
                id="commitment-amount"
                inputMode="decimal"
                min="0.01"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="commitment-date">Primera fecha</FieldLabel>
              <Input
                id="commitment-date"
                onChange={(event) => setAnchorDate(event.target.value)}
                required
                type="date"
                value={anchorDate}
              />
            </Field>
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Select
                onValueChange={(value) => setKind(value as CommitmentKind)}
                value={kind}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="subscription">Suscripción</SelectItem>
                    <SelectItem value="bill">Servicio o recibo</SelectItem>
                    <SelectItem value="debt_payment">Pago de deuda</SelectItem>
                    <SelectItem value="planned_expense">Gasto planeado</SelectItem>
                    {!isCreditCard && (
                      <SelectItem value="expected_income">Ingreso esperado</SelectItem>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {requiresSettlementAccount && (
              <Field data-invalid={Boolean(errorMessage) && !settlementAccountId}>
                <FieldLabel>Pagar desde</FieldLabel>
                <Select
                  onValueChange={setSettlementAccountId}
                  value={settlementAccountId}
                >
                  <SelectTrigger
                    aria-invalid={Boolean(errorMessage) && !settlementAccountId}
                  >
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {moneyAccounts.map((moneyAccount) => (
                        <SelectItem key={moneyAccount.id} value={moneyAccount.id}>
                          {moneyAccount.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel>Repetición</FieldLabel>
              <Select
                onValueChange={(value) =>
                  setRecurrence(value as CommitmentRecurrence)
                }
                value={recurrence}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Una sola vez</SelectItem>
                    <SelectItem value="weekly">Cada semana</SelectItem>
                    <SelectItem value="monthly">Cada mes</SelectItem>
                    <SelectItem value="yearly">Cada año</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <FieldError>{errorMessage}</FieldError>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isPending} type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button disabled={isPending} type="submit">
              {isPending && <Spinner data-icon="inline-start" />}
              Guardar compromiso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
