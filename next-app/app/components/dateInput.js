export const formatDateInput = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "")
    ? value.replaceAll("-", "/")
    : value || "";

export const parseDateInput = (value) => {
  const match = /^(\d{4})([-/])(\d{2})\2(\d{2})$/.exec(value || "");
  if (!match) return null;

  const [, year, , month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

export const formatDateRangeInput = (startDate, endDate) =>
  `${formatDateInput(startDate)} - ${formatDateInput(endDate)}`;

export const parseDateRangeInput = (value) => {
  const parts = (value || "").split(/\s+-\s+/);
  if (parts.length !== 2) return null;

  const startDate = parseDateInput(parts[0].trim().replaceAll("-", "/"));
  const endDate = parseDateInput(parts[1].trim().replaceAll("-", "/"));
  if (!startDate || !endDate) return null;

  return { start_date: startDate, end_date: endDate };
};
