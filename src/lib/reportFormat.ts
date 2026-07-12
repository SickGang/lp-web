export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case "PAID_CASH":
      return "Наличные";
    case "PAID_CARD":
      return "Карта";
    case "PAID_DEPOSIT":
      return "С депозита";
    case "PARTIAL":
      return "Частично";
    case "UNPAID":
      return "Не оплачено";
    default:
      return status;
  }
}

export function formatRub(kopeks: number): string {
  return `${(kopeks / 100).toLocaleString("ru-RU")} ₽`;
}
