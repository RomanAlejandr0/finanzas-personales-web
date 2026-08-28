import { AccountBalanceCard } from "@/components/dashboard/account-balance-card";
import {
  AccountContextSelector,
  type FinancialAccount,
} from "@/components/dashboard/account-context-selector";
import { CommitmentActions } from "@/components/dashboard/commitment-actions";
import type { BalanceProjectionPoint } from "@/components/dashboard/balance-projection-chart";
import type { CreditCardDebtProjectionPoint } from "@/components/dashboard/credit-card-debt-projection-chart";
import {
  type UpcomingCommitment,
  UpcomingCommitmentsCard,
} from "@/components/dashboard/upcoming-commitments-card";
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
  kind: UpcomingCommitment["kind"];
  flow_direction: "inflow" | "outflow";
};

type CommitmentOccurrence = {
  id: string;
  commitment_id: string;
  scheduled_for: string;
  amount: number | string;
};

type ProjectedDebtSeries = {
  date: string;
  account_id: string;
  debt: number | string;
  planned_change: number | string;
};

type PageProps = {
  searchParams: Promise<{ account?: string | string[] }>;
};

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getStartOfCurrentMonth() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  return formatLocalDate(firstDay);
}

function getEndOfCurrentMonth() {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return formatLocalDate(lastDay);
}

export default async function ProtectedPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const projectionThroughDate = getEndOfCurrentMonth();
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
    .select("id, name, type, subtype, properties")
    .eq("universe_id", universe.id)
    .order("created_at", { ascending: true });

  const financialAccounts = ((accounts as FinancialAccount[] | null) ?? []).filter(
    (account) =>
      account.type === "asset" ||
      (account.type === "liability" && account.subtype === "credit_card"),
  );

  if (accountsError || financialAccounts.length === 0) {
    throw new Error("No se pudieron obtener las cuentas.");
  }

  const selectedAccount =
    financialAccounts.find((account) => account.id === requestedAccountId) ??
    financialAccounts.find((account) => account.type === "asset" && account.subtype === "cash") ??
    financialAccounts.find((account) => account.type === "asset") ??
    financialAccounts[0];
  const isCreditCard =
    selectedAccount.type === "liability" && selectedAccount.subtype === "credit_card";

  let cashBalanceSeries: BalanceProjectionPoint[] = [];
  let debtProjectionData: CreditCardDebtProjectionPoint[] = [];
  let currentBalance: number | null = null;

  if (isCreditCard) {
    const { data: debtSeries, error: debtSeriesError } = await supabase.rpc(
      "get_credit_card_debt_series",
      {
        p_account_id: selectedAccount.id,
        p_through_date: projectionThroughDate,
      },
    );

    if (debtSeriesError) {
      throw new Error("No se pudo obtener la proyección de deuda de la tarjeta.");
    }

    debtProjectionData = (debtSeries as ProjectedDebtSeries[] | null)?.map(
      (point) => ({
        date: point.date,
        debt: Number(point.debt),
        plannedChange: Number(point.planned_change),
      }),
    ) ?? [];
    const firstProjectionPoint = debtProjectionData[0];
    currentBalance = firstProjectionPoint
      ? firstProjectionPoint.debt - firstProjectionPoint.plannedChange
      : null;
  } else {
    const { data: balanceSeries, error: balanceSeriesError } = await supabase.rpc(
      "get_projected_balance_series",
      { p_through_date: projectionThroughDate },
    );

    if (balanceSeriesError) {
      throw new Error("No se pudo obtener la proyección de saldo.");
    }

    cashBalanceSeries = (balanceSeries as ProjectedBalanceSeries[] | null)
      ?.filter((balance) => balance.account_id === selectedAccount.id)
      .map<BalanceProjectionPoint>((balance) => ({
        date: balance.date,
        balance: Number(balance.balance),
        plannedChange: Number(balance.planned_change),
      })) ?? [];
    const firstProjectionPoint = cashBalanceSeries[0];
    currentBalance = firstProjectionPoint
      ? firstProjectionPoint.balance - firstProjectionPoint.plannedChange
      : null;
  }

  const { data: commitments, error: commitmentsError } = await supabase
    .from("commitments")
    .select("id, name, kind, flow_direction")
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
          projectionThroughDate,
        );

  return (
    <section aria-label="Espacio de trabajo" className="flex flex-1 flex-col gap-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AccountContextSelector
          accounts={financialAccounts}
          selectedAccountId={selectedAccount.id}
        />
        <CommitmentActions
          account={selectedAccount}
          moneyAccounts={financialAccounts.filter((account) => account.type === "asset")}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <AccountBalanceCard
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountSubtype={selectedAccount.subtype}
          accountType={selectedAccount.type}
          creditLimit={Number(selectedAccount.properties.credit_limit) || 0}
          currencyCode={universe.currency_code}
          currentBalance={currentBalance}
          debtProjectionData={debtProjectionData}
          projectionData={cashBalanceSeries}
        />
        <UpcomingCommitmentsCard
          commitments={upcomingCommitments}
          currencyCode={universe.currency_code}
          isCreditCard={isCreditCard}
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
  throughDate: string,
) {
  const { data: occurrences, error } = await supabase
    .from("commitment_occurrences")
    .select("id, commitment_id, scheduled_for, amount")
    .eq("universe_id", universeId)
    .eq("status", "planned")
    .gte("scheduled_for", getStartOfCurrentMonth())
    .lte("scheduled_for", throughDate)
    .in("commitment_id", commitmentIds)
    .order("scheduled_for", { ascending: true });

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
        kind: commitment.kind,
        scheduledFor: occurrence.scheduled_for,
        flowDirection: commitment.flow_direction,
      };
    }) ?? [];
}
