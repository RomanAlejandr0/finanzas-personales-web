"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, CircleAlert, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export type UpcomingCommitment = {
  id: string;
  name: string;
  amount: number;
  scheduledFor: string;
  flowDirection: "inflow" | "outflow";
};

type UpcomingCommitmentsCardProps = {
  accountId: string;
  commitments: UpcomingCommitment[];
  currencyCode: string;
};

type CommitmentKind =
  | "subscription"
  | "bill"
  | "debt_payment"
  | "planned_expense"
  | "expected_income";
type CommitmentRecurrence = "none" | "weekly" | "monthly" | "yearly";

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function getTodayInputValue() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function UpcomingCommitmentsCard({
  accountId,
  commitments,
  currencyCode,
}: UpcomingCommitmentsCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [anchorDate, setAnchorDate] = useState(getTodayInputValue());
  const [kind, setKind] = useState<CommitmentKind>("subscription");
  const [recurrence, setRecurrence] =
    useState<CommitmentRecurrence>("monthly");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = getTodayInputValue();

  const handleOpenChange = (open: boolean) => {
    if (isPending) {
      return;
    }

    setIsOpen(open);

    if (!open) {
      setErrorMessage(null);
    }
  };

  const fulfillOccurrence = (occurrenceId: string) => {
    setActionErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("fulfill_commitment_occurrence", {
        p_client_request_id: crypto.randomUUID(),
        p_occurrence_id: occurrenceId,
      });

      if (error) {
        setActionErrorMessage(
          "No se pudo registrar el movimiento. Inténtalo de nuevo.",
        );
        return;
      }

      router.refresh();
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAmount = Number(amount);

    if (!name.trim() || !anchorDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Completa un nombre, una fecha y un importe mayor a cero.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("create_commitment", {
        p_account_id: accountId,
        p_anchor_date: anchorDate,
        p_amount: parsedAmount,
        p_kind: kind,
        p_name: name.trim(),
        p_recurrence: recurrence,
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
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Próximos compromisos</CardTitle>
          <CardDescription>
            Lo que ya está considerado en tu proyección.
          </CardDescription>
          <CardAction>
            <DialogTrigger asChild>
              <Button aria-label="Agregar compromiso" size="icon" variant="outline">
                <Plus />
              </Button>
            </DialogTrigger>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {actionErrorMessage && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>No se pudo completar la acción</AlertTitle>
              <AlertDescription>{actionErrorMessage}</AlertDescription>
            </Alert>
          )}

          {commitments.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {commitments.map((commitment, index) => (
                <li className="flex flex-col gap-4" key={commitment.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <CalendarDays className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{commitment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(commitment.scheduledFor)}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {commitment.flowDirection === "outflow" ? "−" : "+"}
                      {formatCurrency(commitment.amount, currencyCode)}
                    </p>
                  </div>
                  {commitment.scheduledFor <= today && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        {commitment.scheduledFor === today
                          ? "Vence hoy."
                          : "Vencido."}
                      </p>
                      <Button
                        disabled={isPending}
                        onClick={() => fulfillOccurrence(commitment.id)}
                        size="sm"
                        type="button"
                      >
                        {isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <Check data-icon="inline-start" />
                        )}
                        Marcar como pagado
                      </Button>
                    </div>
                  )}
                  {index < commitments.length - 1 && <Separator />}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no tienes pagos ni ingresos previstos.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button asChild className="w-full" variant="outline">
            <Link href={`/protected/commitments?account=${encodeURIComponent(accountId)}`}>
              Ver todos
            </Link>
          </Button>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              <Plus data-icon="inline-start" />
              Agregar compromiso
            </Button>
          </DialogTrigger>
        </CardFooter>
      </Card>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar compromiso</DialogTitle>
          <DialogDescription>
            Se incluirá en la proyección de saldo a partir de la fecha indicada.
          </DialogDescription>
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
                    <SelectItem value="expected_income">Ingreso esperado</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
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
