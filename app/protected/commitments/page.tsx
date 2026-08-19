import { AccountContextSelector, type AssetAccount } from "@/components/dashboard/account-context-selector";
import {
  CommitmentsManager,
  type ManagedCommitment,
} from "@/components/dashboard/commitments-manager";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type CommitmentRecord = {
  id: string;
  name: string;
  kind: ManagedCommitment["kind"];
  flow_direction: ManagedCommitment["flowDirection"];
  default_amount: number | string;
  recurrence: ManagedCommitment["recurrence"];
  status: ManagedCommitment["status"];
};

type OccurrenceRecord = {
  id: string;
  commitment_id: string;
  amount: number | string;
  scheduled_for: string;
};

type PageProps = {
  searchParams: Promise<{ account?: string | string[] }>;
};

export default async function CommitmentsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { account: requestedAccount } = await searchParams;
  const requestedAccountId =
    typeof requestedAccount === "string" ? requestedAccount : undefined;

  const { data: universe, error: universeError } = await supabase
    .from("universes")
    .select("id, currency_code")
    .eq("type", "personal")
    .maybeSingle();

  if (universeError || !universe) {
    throw new Error("No se pudo obtener el universo personal.");
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, name, subtype")
    .eq("universe_id", universe.id)
    .eq("type", "asset")
    .order("created_at", { ascending: true });

  if (accountsError || !accounts || accounts.length === 0) {
    throw new Error("No se pudieron obtener las cuentas.");
  }

  const assetAccounts = accounts as AssetAccount[];
  const selectedAccount =
    assetAccounts.find((account) => account.id === requestedAccountId) ??
    assetAccounts.find((account) => account.subtype === "cash") ??
    assetAccounts[0];

  const { data: commitments, error: commitmentsError } = await supabase
    .from("commitments")
    .select("id, name, kind, flow_direction, default_amount, recurrence, status")
    .eq("universe_id", universe.id)
    .eq("account_id", selectedAccount.id)
    .order("created_at", { ascending: false });

  if (commitmentsError) {
    throw new Error("No se pudieron obtener los compromisos.");
  }

  const commitmentRecords = (commitments as CommitmentRecord[] | null) ?? [];
  const activeCommitmentIds = commitmentRecords
    .filter((commitment) => commitment.status === "active")
    .map((commitment) => commitment.id);

  const occurrenceByCommitmentId = new Map<string, OccurrenceRecord>();

  if (activeCommitmentIds.length > 0) {
    const { data: occurrences, error: occurrencesError } = await supabase
      .from("commitment_occurrences")
      .select("id, commitment_id, amount, scheduled_for")
      .eq("universe_id", universe.id)
      .eq("status", "planned")
      .in("commitment_id", activeCommitmentIds)
      .order("scheduled_for", { ascending: true });

    if (occurrencesError) {
      throw new Error("No se pudieron obtener las fechas de los compromisos.");
    }

    for (const occurrence of (occurrences as OccurrenceRecord[] | null) ?? []) {
      if (!occurrenceByCommitmentId.has(occurrence.commitment_id)) {
        occurrenceByCommitmentId.set(occurrence.commitment_id, occurrence);
      }
    }
  }

  const managedCommitments: ManagedCommitment[] = commitmentRecords.map(
    (commitment) => {
      const occurrence = occurrenceByCommitmentId.get(commitment.id);

      return {
        id: commitment.id,
        name: commitment.name,
        kind: commitment.kind,
        flowDirection: commitment.flow_direction,
        defaultAmount: Number(commitment.default_amount),
        recurrence: commitment.recurrence,
        status: commitment.status,
        nextOccurrence: occurrence
          ? {
              id: occurrence.id,
              amount: Number(occurrence.amount),
              scheduledFor: occurrence.scheduled_for,
            }
          : null,
      };
    },
  );

  const dashboardHref = `/protected?account=${encodeURIComponent(selectedAccount.id)}`;

  return (
    <section aria-label="Gestión de compromisos" className="flex flex-1 flex-col gap-6 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Gestión de cuenta</p>
          <h2 className="text-xl font-semibold tracking-tight">Compromisos</h2>
          <p className="text-sm text-muted-foreground">
            Planes y pagos previstos de {selectedAccount.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={dashboardHref}>
            <ArrowLeft data-icon="inline-start" />
            Volver al resumen
          </Link>
        </Button>
      </div>

      <AccountContextSelector
        accounts={assetAccounts}
        destinationPath="/protected/commitments"
        selectedAccountId={selectedAccount.id}
      />
      <CommitmentsManager
        accountId={selectedAccount.id}
        commitments={managedCommitments}
        currencyCode={universe.currency_code}
      />
    </section>
  );
}
