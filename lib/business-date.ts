export const BUSINESS_TIME_ZONE = "America/Mexico_City";

type DateParts = {
  day: number;
  month: number;
  year: number;
};

function getBusinessDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);

  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const day = Number(valueFor("day"));
  const month = Number(valueFor("month"));
  const year = Number(valueFor("year"));

  if (!day || !month || !year) {
    throw new Error("No se pudo determinar la fecha del espacio de trabajo.");
  }

  return { day, month, year };
}

function formatDate({ day, month, year }: DateParts) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Fecha calendario del espacio de trabajo, no una fecha UTC. */
export function getBusinessDate(date = new Date()) {
  return formatDate(getBusinessDateParts(date));
}

export function getBusinessMonthEnd(date = new Date()) {
  const { month, year } = getBusinessDateParts(date);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return formatDate({ day: lastDay, month, year });
}
