/** Формат отображения: +7 (999) 999-99-99 */
export function formatRuPhoneDisplay(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }
  if (!digits.startsWith("7") && digits.length > 0) {
    digits = "7" + digits;
  }
  digits = digits.slice(0, 11);

  const local = digits.startsWith("7") ? digits.slice(1) : digits;

  let out = "+7";
  if (local.length === 0) return out;

  out += " (" + local.slice(0, 3);
  if (local.length < 3) return out;

  out += ")";
  if (local.length <= 3) return out;

  out += " " + local.slice(3, 6);
  if (local.length <= 6) return out;

  out += "-" + local.slice(6, 8);
  if (local.length <= 8) return out;

  out += "-" + local.slice(8, 10);
  return out;
}

/** Для API: +79001234567 */
export function ruPhoneToE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  return formatted.trim();
}

export function isRuPhoneComplete(formatted: string): boolean {
  const digits = formatted.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("7");
}
