import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAPI, servicesAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentStatus =
  | "UNPAID"
  | "PAID_CASH"
  | "PAID_CARD"
  | "PAID_DEPOSIT"
  | "PARTIAL";

type AdditionalLine = {
  key: string;
  serviceId?: number;
  name: string;
  priceRub: string;
};

type ServiceItem = {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
};

type BookingDetail = {
  id: number;
  totalPrice: number;
  userId?: number | null;
  guestName?: string | null;
  guestPhone?: string | null;
  carDisplay?: string | null;
  user?: { name?: string | null; firstName?: string | null; phone?: string | null };
  selectedServices?: Array<{
    price: number;
    service?: { name?: string; price?: number };
  }>;
};

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PAID_CASH", label: "Наличные" },
  { value: "PAID_CARD", label: "Карта" },
  { value: "PAID_DEPOSIT", label: "С депозита" },
  { value: "PARTIAL", label: "Частично" },
  { value: "UNPAID", label: "Не оплачено" },
];

function formatRub(kopeks: number): string {
  return `${(kopeks / 100).toLocaleString("ru-RU")} ₽`;
}

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

const CloseOrderModal = ({ bookingId, onClose, onSuccess }: Props) => {
  const queryClient = useQueryClient();
  const paymentTouched = useRef(false);
  const [additionalItems, setAdditionalItems] = useState<AdditionalLine[]>([]);
  const [finalTotalRub, setFinalTotalRub] = useState("");
  const [finalTotalManual, setFinalTotalManual] = useState(false);
  const [paidAmountRub, setPaidAmountRub] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID_CASH");
  const [closeNote, setCloseNote] = useState("");
  const [pickServiceId, setPickServiceId] = useState<number | "">("");
  const [customName, setCustomName] = useState("");
  const [customPriceRub, setCustomPriceRub] = useState("");
  const [error, setError] = useState("");

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["admin-booking", bookingId],
    queryFn: async () => {
      const res = await adminAPI.getBooking(bookingId);
      return res.data as BookingDetail;
    },
  });

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

  const { data: services = [] } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const res = await servicesAPI.getAll(false);
      return (res.data as ServiceItem[]).filter((s) => s.isActive);
    },
  });

  const additionalKopeks = useMemo(
    () => additionalItems.reduce((sum, item) => sum + rubToKopeks(item.priceRub), 0),
    [additionalItems],
  );

  const autoFinalKopeks = (booking?.totalPrice ?? 0) + additionalKopeks;
  const finalKopeksNow = rubToKopeks(finalTotalRub);
  const canPayFromDeposit =
    Boolean(depositIdentityKey) && depositBalance > 0 && autoFinalKopeks > 0;

  useEffect(() => {
    if (!booking || paymentTouched.current || !canPayFromDeposit) return;
    if (depositBalance >= autoFinalKopeks) {
      setPaymentStatus("PAID_DEPOSIT");
    }
  }, [booking, canPayFromDeposit, depositBalance, autoFinalKopeks]);

  useEffect(() => {
    if (!booking) return;
    if (!finalTotalManual) {
      setFinalTotalRub(kopeksToRubInput(autoFinalKopeks));
    }
  }, [booking, autoFinalKopeks, finalTotalManual]);

  useEffect(() => {
    const finalKopeks = rubToKopeks(finalTotalRub);
    if (paymentStatus === "UNPAID") {
      setPaidAmountRub("0");
    } else if (paymentStatus === "PARTIAL") {
      if (paidAmountRub === "" || paidAmountRub === "0") {
        setPaidAmountRub(kopeksToRubInput(Math.min(finalKopeks, Math.max(1, Math.floor(finalKopeks / 2)))));
      }
    } else {
      setPaidAmountRub(kopeksToRubInput(finalKopeks));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync paid amount when payment type or total changes
  }, [paymentStatus, finalTotalRub]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      const finalTotal = rubToKopeks(finalTotalRub);
      const paidAmount = rubToKopeks(paidAmountRub);

      return adminAPI.closeBooking(bookingId, {
        additionalItems: additionalItems.map((item) => ({
          serviceId: item.serviceId,
          name: item.name.trim(),
          price: rubToKopeks(item.priceRub),
        })),
        finalTotal: finalTotalManual ? finalTotal : undefined,
        paidAmount,
        paymentStatus,
        closeNote: closeNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      if (clientPhone) {
        await queryClient.invalidateQueries({
          queryKey: ["client-deposit", clientPhone],
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ??
        (err as Error)?.message ??
        "Не удалось закрыть заказ";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    },
  });

  const addCatalogService = () => {
    if (pickServiceId === "") return;
    const service = services.find((s) => s.id === pickServiceId);
    if (!service) return;
    setAdditionalItems((prev) => [
      ...prev,
      {
        key: `svc-${service.id}-${Date.now()}`,
        serviceId: service.id,
        name: service.name,
        priceRub: kopeksToRubInput(service.price),
      },
    ]);
    setPickServiceId("");
  };

  const addCustomItem = () => {
    const name = customName.trim();
    const price = rubToKopeks(customPriceRub);
    if (!name || price <= 0) {
      setError("Укажите название и цену доп. услуги");
      return;
    }
    setError("");
    setAdditionalItems((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        name,
        priceRub: customPriceRub,
      },
    ]);
    setCustomName("");
    setCustomPriceRub("");
  };

  const removeAdditional = (key: string) => {
    setAdditionalItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rubToKopeks(finalTotalRub) <= 0) {
      setError("Итоговая сумма должна быть больше 0");
      return;
    }
    if (paymentStatus === "PAID_DEPOSIT") {
      if (!clientPhone) {
        setError("Для оплаты с депозита нужен телефон клиента в записи");
        return;
      }
      const finalTotal = rubToKopeks(finalTotalRub);
      if (depositBalance < finalTotal) {
        setError(
          `Недостаточно средств на депозите (доступно ${formatRub(depositBalance)})`,
        );
        return;
      }
    } else if (
      canPayFromDeposit &&
      depositBalance >= rubToKopeks(finalTotalRub)
    ) {
      const ok = window.confirm(
        `У клиента на депозите ${formatRub(depositBalance)} — достаточно для оплаты заказа. Закрыть без списания с депозита?`,
      );
      if (!ok) return;
    }
    closeMutation.mutate();
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold text-foreground">Закрыть заказ</h2>
        {bookingLoading ? (
          <p className="text-muted-foreground">Загрузка...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">{clientLabel}</p>
              {booking?.carDisplay && (
                <p className="text-muted-foreground">{booking.carDisplay}</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Услуги при записи</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(booking?.selectedServices ?? []).map((line, idx) => (
                  <li key={idx} className="flex justify-between gap-2">
                    <span>{line.service?.name ?? "Услуга"}</span>
                    <span>{formatRub(line.price)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-2 border-t border-border pt-1 font-medium text-foreground">
                  <span>Сумма при записи</span>
                  <span>{formatRub(booking?.totalPrice ?? 0)}</span>
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Дополнительные услуги</p>
              <div className="mb-2 flex flex-wrap gap-2">
                <select
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={pickServiceId === "" ? "" : String(pickServiceId)}
                  onChange={(e) =>
                    setPickServiceId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  <option value="">Из каталога...</option>
                  {services.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} — {formatRub(s.price)}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={addCatalogService}>
                  Добавить
                </Button>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Input
                  placeholder="Своё название"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="min-w-0 flex-1"
                />
                <Input
                  placeholder="Цена, ₽"
                  value={customPriceRub}
                  onChange={(e) => setCustomPriceRub(e.target.value)}
                  className="w-28"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomItem}>
                  +
                </Button>
              </div>
              {additionalItems.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {additionalItems.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1"
                    >
                      <span className="text-foreground">{item.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.priceRub} ₽</span>
                        <button
                          type="button"
                          className="text-red-500 hover:underline"
                          onClick={() => removeAdditional(item.key)}
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                Итоговая сумма, ₽
              </label>
              <Input
                value={finalTotalRub}
                onChange={(e) => {
                  setFinalTotalManual(true);
                  setFinalTotalRub(e.target.value);
                }}
              />
              {!finalTotalManual && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Авто: {formatRub(autoFinalKopeks)}
                </p>
              )}
            </div>

            {canPayFromDeposit && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  paymentStatus === "PAID_DEPOSIT"
                    ? "border-[#D9E57F]/40 bg-[#D9E57F]/10"
                    : "border-amber-500/40 bg-amber-500/10"
                }`}
              >
                <p className="font-medium text-foreground">
                  Депозит клиента: {formatRub(depositBalance)}
                </p>
                {depositBalance >= finalKopeksNow && finalKopeksNow > 0 ? (
                  <p className="text-muted-foreground">
                    {paymentStatus === "PAID_DEPOSIT"
                      ? "Сумма будет списана с депозита при закрытии заказа"
                      : "Достаточно для оплаты — выберите «С депозита»"}
                  </p>
                ) : (
                  <p className="text-amber-600">
                    Недостаточно для полной оплаты заказа ({formatRub(finalKopeksNow)})
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Оплата</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={paymentStatus}
                onChange={(e) => {
                  paymentTouched.current = true;
                  setPaymentStatus(e.target.value as PaymentStatus);
                }}
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
                  Оплачено, ₽
                </label>
                <Input
                  value={paidAmountRub}
                  onChange={(e) => setPaidAmountRub(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Комментарий</label>
              <textarea
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? "Закрытие..." : "Закрыть заказ"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CloseOrderModal;
