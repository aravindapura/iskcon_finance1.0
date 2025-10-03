export const DEBT_PAYMENT_PREFIX = "debt-payment:" as const;
const DEBT_ADJUSTMENT_PREFIX = "debt-adjustment:" as const;

const SEPARATOR = "|";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export type StoredDebtAdjustment = {
  id: string;
  type: string;
  status: string;
  amountBefore: string;
  amountAfter: string | null;
  currency: string;
  wallet: string;
  from_contact?: string | null;
  to_contact?: string | null;
  comment?: string | null;
  registered_at: string;
};

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

export const appendDebtAdjustmentSource = (
  existingSource: string | null | undefined,
  adjustments: StoredDebtAdjustment[]
): string => {
  if (!adjustments || adjustments.length === 0) {
    return existingSource?.trim() ?? "";
  }

  const entry = `${DEBT_ADJUSTMENT_PREFIX}${JSON.stringify(adjustments)}`;
  const trimmedSource = existingSource?.trim();

  if (!trimmedSource) {
    return entry;
  }

  const segments = trimmedSource.split(SEPARATOR).map((segment) => segment.trim());

  if (segments.some((segment) => segment.startsWith(DEBT_ADJUSTMENT_PREFIX))) {
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

export const extractDebtAdjustments = (source?: string | null): StoredDebtAdjustment[] => {
  if (!source) {
    return [];
  }

  const segments = source
    .split(SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (!segment.startsWith(DEBT_ADJUSTMENT_PREFIX)) {
      continue;
    }

    const rawValue = segment.slice(DEBT_ADJUSTMENT_PREFIX.length).trim();

    if (!rawValue) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown;

      if (!Array.isArray(parsed)) {
        continue;
      }

      const adjustments: StoredDebtAdjustment[] = [];

      for (const item of parsed) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const candidate = item as Record<string, unknown>;
        const id = candidate.id;
        const type = candidate.type;
        const status = candidate.status;
        const amountBefore = candidate.amountBefore;
        const amountAfter = candidate.amountAfter;
        const currency = candidate.currency;
        const wallet = candidate.wallet;
        const registeredAt = candidate.registered_at;

        if (
          !isNonEmptyString(id) ||
          !isNonEmptyString(type) ||
          !isNonEmptyString(status) ||
          !isNonEmptyString(amountBefore) ||
          !isNonEmptyString(currency) ||
          !isNonEmptyString(wallet) ||
          !isNonEmptyString(registeredAt)
        ) {
          continue;
        }

        const normalizedAfter = isNonEmptyString(amountAfter) ? amountAfter : null;

        adjustments.push({
          id,
          type,
          status,
          amountBefore,
          amountAfter: normalizedAfter,
          currency,
          wallet,
          from_contact: isNonEmptyString(candidate.from_contact)
            ? candidate.from_contact
            : null,
          to_contact: isNonEmptyString(candidate.to_contact) ? candidate.to_contact : null,
          comment:
            typeof candidate.comment === "string"
              ? candidate.comment
              : candidate.comment === null
                ? null
                : undefined,
          registered_at: registeredAt
        });
      }

      if (adjustments.length > 0) {
        return adjustments;
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  return [];
};
