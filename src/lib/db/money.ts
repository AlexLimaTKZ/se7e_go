export function moneyToCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Valor monetario invalido.");
  }

  const cents = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Valor monetario excede o limite seguro.");
  }
  return cents;
}

export function centsToMoney(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Valor monetario armazenado invalido.");
  }
  return value / 100;
}
