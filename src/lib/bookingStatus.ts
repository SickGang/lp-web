export function getBookingStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "В ожидании";
    case "confirmed":
      return "Подтверждено";
    case "completed":
      return "Завершено";
    case "cancelled":
      return "Отменено";
    default:
      return status;
  }
}
