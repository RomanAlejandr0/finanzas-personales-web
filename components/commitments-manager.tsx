"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Check,
  CircleAlert,
  Ellipsis,
  Pause,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { getBusinessDate } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/client";

type CommitmentKind =
  | "subscription"
  | "bill"
  | "debt_payment"
  | "planned_expense"
  | "expected_income";
type CommitmentRecurrence = "none" | "weekly" | "monthly" | "yearly";
type CommitmentStatus = "active" | "paused" | "cancelled";

export type ManagedCommitment = {
  id: string;
  name: string;
  kind: CommitmentKind;
  flowDirection: "inflow" | "outflow";
  defaultAmount: number;
  recurrence: CommitmentRecurrence;
  status: CommitmentStatus;
  nextOccurrence: {
    id: string;
    amount: number;
    scheduledFor: string;
  } | null;
};

type CommitmentsManagerProps = {
  accountId: string;
  commitments: ManagedCommitment[];
  currencyCode: string;
};

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
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function getStatusLabel(status: CommitmentStatus) {
  switch (status) {
    case "active":
      return "Activo";
    case "paused":
      return "Pausado";
    case "cancelled":
      return "Cancelado";
  }
}

function getKindLabel(kind: CommitmentKind) {
  switch (kind) {
    case "subscription":
      return "Suscripción";
    case "bill":
      return "Servicio o recibo";
    case "debt_payment":
      return "Pago de deuda";
    case "planned_expense":
      return "Gasto planeado";
    case "expected_income":
      return "Ingreso esperado";
  }
}

function getRecurrenceLabel(recurrence: CommitmentRecurrence) {
  switch (recurrence) {
    case "none":
      return "Una sola vez";
    case "weekly":
      return "Cada semana";
    case "monthly":
      return "Cada mes";
    case "yearly":
      return "Cada año";
  }
}

function getOccurrenceLabel(date: string) {
  const today = getBusinessDate();

  if (date < today) {
    return `Venció el ${formatDate(date)}`;
  }

  if (date === today) {
    return "Vence hoy";
  }

  return `Próximo: ${formatDate(date)}`;
}

function getStatusVariant(status: CommitmentStatus) {
  switch (status) {
    case "active":
      return "secondary" as const;
    case "paused":
      return "outline" as const;
    case "cancelled":
      return "destructive" as const;
  }
}

export function CommitmentsManager({
  accountId,
  commitments,
  currencyCode,
}: CommitmentsManagerProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [anchorDate, setAnchorDate] = useState(getBusinessDate);
  const [kind, setKind] = useState<CommitmentKind>("subscription");
  const [recurrence, setRecurrence] =
    useState<CommitmentRecurrence>("monthly");
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateOpenChange = (open: boolean) => {
    if (isPending) {
      return;
    }

    setIsCreateOpen(open);

    if (!open) {
      setCreateErrorMessage(null);
    }
  };

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAmount = Number(amount);

    if (
      !name.trim() ||
      !anchorDate ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setCreateErrorMessage(
        "Completa un nombre, una fecha y un importe mayor a cero.",
      );
      return;
    }

    setCreateErrorMessage(null);

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
        setCreateErrorMessage(
          "No se pudo guardar el compromiso. Inténtalo de nuevo.",
        );
        return;
      }

      setName("");
      setAmount("");
      setAnchorDate(getBusinessDate());
      setKind("subscription");
      setRecurrence("monthly");
      setIsCreateOpen(false);
      router.refresh();
    });
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

  const updateCommitmentStatus = (
    commitmentId: string,
    action: "pause" | "cancel",
  ) => {
    setActionErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const functionName = action === "pause" ? "pause_commitment" : "cancel_commitment";
      const { error } = await supabase.rpc(functionName, {
        p_commitment_id: commitmentId,
      });

      if (error) {
        setActionErrorMessage(
          "No se pudo actualizar el compromiso. Inténtalo de nuevo.",
        );
        return;
      }

      router.refresh();
    });
  };

  const hasDueOccurrence = (commitment: ManagedCommitment) =>
    commitment.status === "active" &&
    commitment.nextOccurrence !== null &&
    commitment.nextOccurrence.scheduledFor <= getBusinessDate();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Compromisos</CardTitle>
          <CardDescription>
            Administra lo que está previsto para esta cuenta y confirma lo que ya ocurrió.
          </CardDescription>
          <CardAction>
            <Button onClick={() => setIsCreateOpen(true)} type="button">
              <Plus data-icon="inline-start" />
              Agregar
            </Button>
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
            <ol className="flex flex-col">
              {commitments.map((commitment, index) => {
                const amountToDisplay =
                  commitment.nextOccurrence?.amount ?? commitment.defaultAmount;

                return (
                  <li className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0" key={commitment.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{commitment.name}</p>
                          <Badge variant={getStatusVariant(commitment.status)}>
                            {getStatusLabel(commitment.status)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span>{getKindLabel(commitment.kind)}</span>
                          <span>{getRecurrenceLabel(commitment.recurrence)}</span>
                          {commitment.nextOccurrence && (
                            <span>{getOccurrenceLabel(commitment.nextOccurrence.scheduledFor)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="font-medium tabular-nums">
                          {commitment.flowDirection === "outflow" ? "−" : "+"}
                          {formatCurrency(amountToDisplay, currencyCode)}
                        </p>
                        {commitment.status !== "cancelled" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-label={`Acciones para ${commitment.name}`}
                                disabled={isPending}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <Ellipsis data-icon="inline-start" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                {commitment.status === "active" && (
                                  <DropdownMenuItem
                                    disabled={isPending}
                                    onSelect={() =>
                                      updateCommitmentStatus(commitment.id, "pause")
                                    }
                                  >
                                    <Pause />
                                    Pausar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={isPending}
                                onSelect={() =>
                                  updateCommitmentStatus(commitment.id, "cancel")
                                }
                              >
                                <Trash2 />
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {hasDueOccurrence(commitment) && commitment.nextOccurrence && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                        <p className="text-sm text-muted-foreground">
                          Al confirmarlo, se registrará como una transacción real.
                        </p>
                        <Button
                          disabled={isPending}
                          onClick={() => fulfillOccurrence(commitment.nextOccurrence!.id)}
                          size="sm"
                          type="button"
                        >
                          {isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                          Marcar como pagado
                        </Button>
                      </div>
                    )}

                    {index < commitments.length - 1 && <Separator />}
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>Aún no hay compromisos</EmptyTitle>
                <EmptyDescription>
                  Agrega un pago, una suscripción o un ingreso esperado para incluirlo en la proyección.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setIsCreateOpen(true)} type="button">
                  <Plus data-icon="inline-start" />
                  Agregar compromiso
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar compromiso</DialogTitle>
            <DialogDescription>
              Se incluirá en la proyección de saldo a partir de la fecha indicada.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-6" onSubmit={handleCreateSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="managed-commitment-name">Nombre</FieldLabel>
                <Input
                  autoFocus
                  id="managed-commitment-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Spotify"
                  required
                  value={name}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="managed-commitment-amount">Importe</FieldLabel>
                <Input
                  id="managed-commitment-amount"
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
                <FieldLabel htmlFor="managed-commitment-date">Primera fecha</FieldLabel>
                <Input
                  id="managed-commitment-date"
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
            <FieldError>{createErrorMessage}</FieldError>

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
    </>
  );
}
