import { AccountBalanceCard } from "@/components/account-balance-card";
import {
  AccountContextSelector,
  type AssetAccount,
} from "@/components/account-context-selector";
import type { BalanceProjectionPoint } from "@/components/balance-projection-chart";
import {
  type UpcomingCommitment,
  UpcomingCommitmentsCard,
} from "@/components/upcoming-commitments-card";
import { getBusinessDate, getBusinessMonthEnd } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/server";

type ProjectedBalanceSeries = {
  date: string;
  account_id: string;
  balance: number | string;
  planned_change: number | string;
};

type Commitment = {
  id: string;
  name: string;
  flow_direction: "inflow" | "outflow";
};

type CommitmentOccurrence = {
  id: string;
  commitment_id: string;
  scheduled_for: string;
  amount: number | string;
};

type PageProps = {
  searchParams: Promise<{ account?: string | string[] }>;
};

export default async function ProtectedPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const businessDate = getBusinessDate();
  const projectionThroughDate = getBusinessMonthEnd();
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

  const { data: balanceSeries, error: balanceSeriesError } = await supabase.rpc(
    "get_projected_balance_series",
    { p_through_date: projectionThroughDate },
  );

  if (balanceSeriesError) {
    throw new Error("No se pudo obtener la proyección de saldo.");
  }

  const cashBalanceSeries = (balanceSeries as ProjectedBalanceSeries[] | null)
    ?.filter((balance) => balance.account_id === selectedAccount.id)
    .map<BalanceProjectionPoint>((balance) => ({
      date: balance.date,
      balance: Number(balance.balance),
      plannedChange: Number(balance.planned_change),
    })) ?? [];
  const firstProjectionPoint = cashBalanceSeries[0];
  const currentBalance = firstProjectionPoint
    ? firstProjectionPoint.balance - firstProjectionPoint.plannedChange
    : null;

  const { data: commitments, error: commitmentsError } = await supabase
    .from("commitments")
    .select("id, name, flow_direction")
    .eq("universe_id", universe.id)
    .eq("account_id", selectedAccount.id)
    .eq("status", "active");

  if (commitmentsError) {
    throw new Error("No se pudieron obtener los compromisos.");
  }

  const commitmentById = new Map(
    (commitments as Commitment[] | null)?.map((commitment) => [
      commitment.id,
      commitment,
    ]) ?? [],
  );
  const commitmentIds = [...commitmentById.keys()];

  const upcomingCommitments: UpcomingCommitment[] =
    commitmentIds.length === 0
      ? []
      : await getUpcomingCommitments(
          supabase,
          universe.id,
          commitmentIds,
          commitmentById,
          businessDate,
          projectionThroughDate,
        );

  return (
    <section aria-label="Espacio de trabajo" className="flex flex-1 flex-col gap-6 pt-8">
      <AccountContextSelector
        accounts={assetAccounts}
        selectedAccountId={selectedAccount.id}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <AccountBalanceCard
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          currencyCode={universe.currency_code}
          currentBalance={currentBalance}
          projectionData={cashBalanceSeries}
        />
        <UpcomingCommitmentsCard
          accountId={selectedAccount.id}
          commitments={upcomingCommitments}
          currencyCode={universe.currency_code}
        />
      </div>
    </section>
  );
}

async function getUpcomingCommitments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  universeId: string,
  commitmentIds: string[],
  commitmentById: Map<string, Commitment>,
  startDate: string,
  throughDate: string,
) {
  const { data: occurrences, error } = await supabase
    .from("commitment_occurrences")
    .select("id, commitment_id, scheduled_for, amount")
    .eq("universe_id", universeId)
    .eq("status", "planned")
    .gte("scheduled_for", startDate)
    .lte("scheduled_for", throughDate)
    .in("commitment_id", commitmentIds)
    .order("scheduled_for", { ascending: true })
    .limit(5);

  if (error) {
    throw new Error("No se pudieron obtener los próximos compromisos.");
  }

  return (occurrences as CommitmentOccurrence[] | null)
    ?.flatMap<UpcomingCommitment>((occurrence) => {
      const commitment = commitmentById.get(occurrence.commitment_id);

      if (!commitment) {
        return [];
      }

      return {
        id: occurrence.id,
        name: commitment.name,
        amount: Number(occurrence.amount),
        scheduledFor: occurrence.scheduled_for,
        flowDirection: commitment.flow_direction,
      };
    }) ?? [];
}
