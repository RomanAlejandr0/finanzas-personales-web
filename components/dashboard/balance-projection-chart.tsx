"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

type BalanceAxis = {
  domain: [number, number];
  ticks: number[];
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

function formatCompactCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(amount);
}

function getNiceStep(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 2.5) return 2.5 * magnitude;
  if (normalized <= 5) return 5 * magnitude;

  return 10 * magnitude;
}

function getBalanceAxis(values: number[]): BalanceAxis {
  const balances = values.filter(Number.isFinite);

  if (balances.length === 0) {
    return { domain: [0, 1], ticks: [0, 0.5, 1] };
  }

  const minimum = Math.min(...balances);
  const maximum = Math.max(...balances);
  const spread = Math.max(
    maximum - minimum,
    Math.max(Math.abs(minimum), Math.abs(maximum), 1) * 0.06,
  );
  const padding = spread * 0.12;
  const step = getNiceStep((spread + padding * 2) / 3);
  const domainMin = Math.floor((minimum - padding) / step) * step;
  const domainMax = Math.ceil((maximum + padding) / step) * step;
  const ticks: number[] = [];

  for (let value = domainMin; value <= domainMax; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }

  return { domain: [domainMin, domainMax], ticks };
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
        ...data.map((point) => ({
          ...point,
          label: formatDate(point.date),
        })),
      ]
    : [];
  const balanceAxis = getBalanceAxis(chartData.map((point) => point.balance));

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
          margin={{ right: 4, top: 8 }}
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
            tickMargin={8}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={balanceAxis.domain}
            tickFormatter={(value) =>
              formatCompactCurrency(Number(value), currencyCode)
            }
            tickLine={false}
            tickMargin={8}
            ticks={balanceAxis.ticks}
            width={56}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  formatCurrency(Number(value), currencyCode)
                }
                indicator="dot"
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
