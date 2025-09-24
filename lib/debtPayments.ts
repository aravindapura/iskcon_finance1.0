export const DEBT_PAYMENT_PREFIX = "debt-payment:" as const;

const SEPARATOR = "|";

export const appendDebtPaymentSource = (
  existingSource: string | null | undefined,
  amount: string
): string => {
  const normalizedAmount = amount.trim();

  if (!normalizedAmount) {
    return existingSource?.trim() ?? "";
  }

  const entry = `${DEBT_PAYMENT_PREFIX}${normalizedAmount}`;
  const trimmedSource = existingSource?.trim();

  if (!trimmedSource) {
    return entry;
  }

  const segments = trimmedSource.split(SEPARATOR).map((segment) => segment.trim());

  if (segments.some((segment) => segment.startsWith(DEBT_PAYMENT_PREFIX))) {
    return trimmedSource;
  }

  return `${trimmedSource}${SEPARATOR}${entry}`;
};

export const extractDebtPaymentAmount = (source?: string | null): number => {
  if (!source) {
    return 0;
  }

  const segments = source
    .split(SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (!segment.startsWith(DEBT_PAYMENT_PREFIX)) {
      continue;
    }

    const rawValue = segment.slice(DEBT_PAYMENT_PREFIX.length).trim();

    if (!rawValue) {
      continue;
    }

    const parsed = Number.parseFloat(rawValue);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
};
