import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRub, getPaymentStatusLabel } from "@/lib/reportFormat";

type PaymentStatus =
  | "PAID_CASH"
  | "PAID_CARD"
  | "PAID_DEPOSIT"
  | "PARTIAL";

type BookingDetail = {
  id: number;
  userId?: number | null;
  finalTotal?: number | null;
  paidAmount: number;
  paymentStatus: string;
  guestPhone?: string | null;
  guestName?: string | null;
  carDisplay?: string | null;
  user?: {
    name?: string | null;
    firstName?: string | null;
    phone?: string | null;
  } | null;
};

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PAID_DEPOSIT", label: "С депозита" },
  { value: "PAID_CASH", label: "Наличные" },
  { value: "PAID_CARD", label: "Карта" },
  { value: "PARTIAL", label: "Частично" },
];

function rubToKopeks(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100);
}

function kopeksToRubInput(kopeks: number): string {
  return (kopeks / 100).toFixed(2).replace(/\.?0+$/, "");
}

type Props = {
  bookingId: number;
  onClose: () => void;
  onSuccess: () => void;
};

const UpdatePaymentModal = ({ bookingId, onClose, onSuccess }: Props) => {
  const queryClient = useQueryClient();
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("PAID_DEPOSIT");
  const [paidAmountRub, setPaidAmountRub] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["admin-booking", bookingId],
    queryFn: async () => {
      const res = await adminAPI.getBooking(bookingId);
      return res.data as BookingDetail;
    },
  });

  const finalTotal = booking?.finalTotal ?? booking?.paidAmount ?? 0;
  const alreadyPaid = booking?.paidAmount ?? 0;
  const debt = Math.max(0, finalTotal - alreadyPaid);
  const clientPhone =
    booking?.guestPhone?.trim() || booking?.user?.phone?.trim() || "";
  const clientUserId = booking?.userId ?? null;
  const depositIdentityKey =
    clientUserId != null
      ? `user:${clientUserId}`
      : clientPhone
        ? `phone:${clientPhone}`
        : "";

  const { data: depositData } = useQuery({
    queryKey: ["client-deposit", depositIdentityKey],
    queryFn: async () => {
      const res = await adminAPI.getDeposit(
        clientUserId != null
          ? { userId: clientUserId, phone: clientPhone || undefined }
          : { phone: clientPhone },
      );
      return res.data as { balance: number };
    },
    enabled: Boolean(depositIdentityKey),
  });

  const depositBalance = depositData?.balance ?? 0;

  useEffect(() => {
    if (!booking) return;
    setPaidAmountRub(kopeksToRubInput(finalTotal));
    setPaymentStatus("PAID_DEPOSIT");
  }, [booking, finalTotal]);

  useEffect(() => {
    if (!booking) return;
    if (paymentStatus === "PARTIAL") {
      const suggested = Math.max(
        alreadyPaid + 1,
        Math.min(finalTotal - 1, alreadyPaid + Math.floor(debt / 2) || alreadyPaid + 1),
      );
      setPaidAmountRub(kopeksToRubInput(suggested));
    } else {
      setPaidAmountRub(kopeksToRubInput(finalTotal));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus]);

  const mutation = useMutation({
    mutationFn: async () => {
      const paidAmount = rubToKopeks(paidAmountRub);
      return adminAPI.updateBookingPayment(bookingId, {
        paidAmount,
        paymentStatus,
        note: note.trim() || undefined,
      });
    },
    onSuccess: async () => {
      if (clientPhone) {
        await queryClient.invalidateQueries({
          queryKey: ["client-deposit", clientPhone],
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ??
        (err as Error)?.message ??
        "Не удалось обновить оплату";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const paidAmount = rubToKopeks(paidAmountRub);
    if (paidAmount < alreadyPaid) {
      setError("Сумма оплаты не может быть меньше уже оплаченной");
      return;
    }
    if (paymentStatus === "PAID_DEPOSIT") {
      if (!clientPhone) {
        setError("Для оплаты с депозита нужен телефон клиента");
        return;
      }
      const delta = paidAmount - alreadyPaid;
      if (depositBalance < delta) {
        setError(
          `Недостаточно на депозите (нужно ${formatRub(delta)}, доступно ${formatRub(depositBalance)})`,
        );
        return;
      }
    }
    mutation.mutate();
  };

  const clientLabel = booking
    ? booking.guestName?.trim() ||
      booking.user?.name ||
      booking.user?.firstName ||
      booking.guestPhone ||
      booking.user?.phone ||
      "—"
    : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold text-foreground">
          Оплатить долг
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Заказ #{bookingId}
        </p>

        {isLoading || !booking ? (
          <p className="text-muted-foreground">Загрузка...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">{clientLabel}</p>
              {booking.carDisplay && (
                <p className="text-muted-foreground">{booking.carDisplay}</p>
              )}
              <p className="mt-2 text-muted-foreground">
                Было: {getPaymentStatusLabel(booking.paymentStatus)} · оплачено{" "}
                {formatRub(alreadyPaid)}
              </p>
              <p className="font-medium text-foreground">
                Долг: {formatRub(debt)} из {formatRub(finalTotal)}
              </p>
            </div>

            {clientPhone && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  paymentStatus === "PAID_DEPOSIT"
                    ? "border-[#D9E57F]/40 bg-[#D9E57F]/10"
                    : "border-border bg-muted/20"
                }`}
              >
                <p className="font-medium text-foreground">
                  Депозит клиента: {formatRub(depositBalance)}
                </p>
                {paymentStatus === "PAID_DEPOSIT" && (
                  <p className="text-muted-foreground">
                    {depositBalance >= debt
                      ? `Будет списано ${formatRub(debt)}`
                      : `Не хватает ${formatRub(debt - depositBalance)}`}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                Способ оплаты
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as PaymentStatus)
                }
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {paymentStatus === "PARTIAL" && (
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">
                  Оплачено всего, ₽
                </label>
                <Input
                  value={paidAmountRub}
                  onChange={(e) => setPaidAmountRub(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Уже оплачено {formatRub(alreadyPaid)}, итого{" "}
                  {formatRub(finalTotal)}
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                Комментарий
              </label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Например: доплата с депозита при повторном визите"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
                disabled={mutation.isPending || debt <= 0}
              >
                {mutation.isPending ? "Сохранение..." : "Применить оплату"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdatePaymentModal;
