"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type BalanceProjectionPoint = {
  date: string;
  balance: number;
  plannedChange: number;
};

type BalanceProjectionChartProps = {
  currencyCode: string;
  data: BalanceProjectionPoint[];
};

const chartConfig = {
  balance: {
    label: "Saldo",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type ChartPoint = BalanceProjectionPoint & {
  label: string;
};

function toLocalDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(toLocalDate(date));
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function BalanceProjectionChart({
  currencyCode,
  data,
}: BalanceProjectionChartProps) {
  const lastDate = data.at(-1)?.date;
  const firstPoint = data[0];
  const chartData: ChartPoint[] = firstPoint
    ? [
        {
          ...firstPoint,
          balance: firstPoint.balance - firstPoint.plannedChange,
          label: "Ahora",
          plannedChange: 0,
        },
        ...data.map((point, index) => ({
          ...point,
          label: index === 0 ? "Hoy" : formatDate(point.date),
        })),
      ]
    : [];

  return (
    <section aria-label="Proyección de saldo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Proyección de saldo</p>
          <p className="text-sm text-muted-foreground">
            Considera los compromisos pendientes hasta fin de mes.
          </p>
        </div>
        {lastDate && (
          <p className="text-sm text-muted-foreground">
            Hasta {formatDate(lastDate)}
          </p>
        )}
      </div>

      <ChartContainer config={chartConfig} className="h-56 w-full">
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{ left: 4, right: 4, top: 8 }}
        >
          <defs>
            <linearGradient id="balance-projection" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            minTickGap={28}
            tickLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  formatCurrency(Number(value), currencyCode)
                }
                indicator="line"
                labelFormatter={(label) => String(label)}
              />
            }
            cursor={false}
          />
          <Area
            dataKey="balance"
            fill="url(#balance-projection)"
            fillOpacity={1}
            stroke="var(--color-balance)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
