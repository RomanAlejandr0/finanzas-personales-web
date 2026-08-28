"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export type UpcomingCommitment = {
  id: string;
  name: string;
  amount: number;
  scheduledFor: string;
  kind: "subscription" | "bill" | "debt_payment" | "planned_expense" | "expected_income";
  flowDirection: "inflow" | "outflow";
};

type UpcomingCommitmentsCardProps = {
  commitments: UpcomingCommitment[];
  currencyCode: string;
  isCreditCard?: boolean;
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
  }).format(new Date(`${date}T12:00:00`));
}

function getTodayInputValue() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function UpcomingCommitmentsCard({
  commitments,
  currencyCode,
  isCreditCard = false,
}: UpcomingCommitmentsCardProps) {
  const router = useRouter();
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = getTodayInputValue();

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Compromisos</CardTitle>
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
            {commitments.map((commitment, index) => {
              const amountPrefix = isCreditCard
                ? commitment.kind === "debt_payment"
                  ? "−"
                  : "+"
                : commitment.flowDirection === "outflow"
                  ? "−"
                  : "+";

              return (
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
                    {amountPrefix}
                    {formatCurrency(commitment.amount, currencyCode)}
                  </p>
                </div>
                {!isCreditCard && commitment.scheduledFor <= today && (
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
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no hay compromisos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
