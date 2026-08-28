"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type CreditCardDebtProjectionPoint = {
  date: string;
  debt: number;
  plannedChange: number;
};

type CreditCardDebtProjectionChartProps = {
  creditLimit: number;
  currencyCode: string;
  data: CreditCardDebtProjectionPoint[];
};

const chartConfig = {
  debt: {
    label: "Deuda",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

type ChartPoint = CreditCardDebtProjectionPoint & { label: string };

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

function getAxisMaximum(values: number[], creditLimit: number) {
  const maximum = Math.max(creditLimit, ...values.filter(Number.isFinite), 1);
  const padding = Math.max(maximum * 0.06, 1);

  return maximum + padding;
}

export function CreditCardDebtProjectionChart({
  creditLimit,
  currencyCode,
  data,
}: CreditCardDebtProjectionChartProps) {
  const firstPoint = data[0];
  const lastDate = data.at(-1)?.date;
  const chartData: ChartPoint[] = firstPoint
    ? [
        {
          ...firstPoint,
          debt: firstPoint.debt - firstPoint.plannedChange,
          label: "Ahora",
          plannedChange: 0,
        },
        ...data.map((point) => ({ ...point, label: formatDate(point.date) })),
      ]
    : [];
  const axisMaximum = getAxisMaximum(
    chartData.map((point) => point.debt),
    creditLimit,
  );

  return (
    <section aria-label="Proyección de deuda" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Proyección de deuda</p>
        {lastDate && <p className="text-sm text-muted-foreground">Hasta {formatDate(lastDate)}</p>}
      </div>

      <ChartContainer config={chartConfig} className="h-56 w-full">
        <LineChart accessibilityLayer data={chartData} margin={{ right: 4, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            minTickGap={28}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            axisLine={false}
            domain={[0, axisMaximum]}
            tickFormatter={(value) => formatCompactCurrency(Number(value), currencyCode)}
            tickLine={false}
            tickMargin={8}
            width={56}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(Number(value), currencyCode)}
                indicator="dot"
                labelFormatter={(label) => String(label)}
              />
            }
            cursor={false}
          />
          <ReferenceLine
            ifOverflow="extendDomain"
            strokeDasharray="4 4"
            stroke="var(--muted-foreground)"
            y={creditLimit}
          />
          <Line
            activeDot={{ r: 4 }}
            dataKey="debt"
            dot={{ r: 3 }}
            stroke="var(--color-debt)"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
}
