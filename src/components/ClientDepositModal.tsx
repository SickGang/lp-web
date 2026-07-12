import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatRuPhoneDisplay,
  isRuPhoneComplete,
  ruPhoneToE164,
} from "@/lib/ruPhoneMask";

type LedgerEntry = {
  id: number;
  type: "DEPOSIT" | "BOOKING_PAYMENT" | "ADJUSTMENT";
  delta: number;
  balanceAfter: number;
  bookingId?: number | null;
  note?: string | null;
  createdAt: string;
};

type AccountDetail = {
  id?: number;
  phone: string;
  balance: number;
  ledger: LedgerEntry[];
};

function formatRub(kopeks: number): string {
  return `${(kopeks / 100).toLocaleString("ru-RU")} ₽`;
}

function rubToKopeks(value: string, allowNegative = false): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num)) return 0;
  if (!allowNegative && num < 0) return 0;
  if (num === 0) return 0;
  return Math.round(num * 100);
}

const ledgerTypeLabel: Record<LedgerEntry["type"], string> = {
  DEPOSIT: "Пополнение",
  BOOKING_PAYMENT: "Оплата заказа",
  ADJUSTMENT: "Корректировка",
};

type Props = {
  phone?: string;
  clientName?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

const ClientDepositModal = ({
  phone: phoneProp,
  clientName,
  onClose,
  onSuccess,
}: Props) => {
  const queryClient = useQueryClient();
  const [phoneInput, setPhoneInput] = useState("");
  const [resolvedPhone, setResolvedPhone] = useState(phoneProp ?? "");
  const activePhone = phoneProp ?? resolvedPhone;
  const [depositRub, setDepositRub] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [adjustRub, setAdjustRub] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"deposit" | "adjust">("deposit");

  const { data: account, isLoading } = useQuery({
    queryKey: ["client-deposit", activePhone],
    queryFn: async () => {
      const res = await adminAPI.getDeposit(activePhone);
      return res.data as AccountDetail;
    },
    enabled: Boolean(activePhone),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["client-deposit", activePhone] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    onSuccess?.();
  };

  const depositMutation = useMutation({
    mutationFn: async () => {
      const amount = rubToKopeks(depositRub);
      if (amount <= 0) throw new Error("Укажите сумму пополнения");
      return adminAPI.deposit({
        phone: activePhone,
        amount,
        note: depositNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setDepositRub("");
      setDepositNote("");
      setError("");
      await invalidate();
    },
    onError: (err: unknown) => {
      setError(extractError(err));
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const delta = rubToKopeks(adjustRub, true);
      if (delta === 0) throw new Error("Укажите сумму корректировки");
      if (!adjustNote.trim()) throw new Error("Укажите причину корректировки");
      return adminAPI.adjustDeposit({
        phone: activePhone,
        delta,
        note: adjustNote.trim(),
      });
    },
    onSuccess: async () => {
      setAdjustRub("");
      setAdjustNote("");
      setError("");
      await invalidate();
    },
    onError: (err: unknown) => {
      setError(extractError(err));
    },
  });

  const balance = account?.balance ?? 0;

  if (!activePhone) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-4 text-xl font-bold text-foreground">Депозит клиента</h2>
          <Input
            placeholder="Телефон клиента"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="mb-3"
          />
          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
              onClick={() => {
                setError("");
                if (!isRuPhoneComplete(phoneInput)) {
                  setError("Введите полный номер телефона");
                  return;
                }
                setResolvedPhone(ruPhoneToE164(phoneInput));
              }}
            >
              Продолжить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold text-foreground">Депозит клиента</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {clientName ? `${clientName} · ` : ""}
          {formatRuPhoneDisplay(activePhone)}
        </p>

        {isLoading ? (
          <p className="text-muted-foreground">Загрузка...</p>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-[#D9E57F]/40 bg-[#D9E57F]/10 px-4 py-3">
              <p className="text-sm text-muted-foreground">Текущий баланс</p>
              <p className="text-2xl font-bold text-foreground">{formatRub(balance)}</p>
            </div>

            <div className="mb-4 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "deposit" ? "default" : "outline"}
                className={mode === "deposit" ? "bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]" : ""}
                onClick={() => setMode("deposit")}
              >
                Пополнить
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "adjust" ? "default" : "outline"}
                className={mode === "adjust" ? "bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]" : ""}
                onClick={() => setMode("adjust")}
              >
                Корректировка
              </Button>
            </div>

            {mode === "deposit" ? (
              <div className="mb-4 space-y-2">
                <Input
                  placeholder="Сумма, ₽"
                  value={depositRub}
                  onChange={(e) => setDepositRub(e.target.value)}
                />
                <Input
                  placeholder="Комментарий (необязательно)"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                />
                <Button
                  className="w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
                  disabled={depositMutation.isPending}
                  onClick={() => depositMutation.mutate()}
                >
                  {depositMutation.isPending ? "Сохранение..." : "Пополнить депозит"}
                </Button>
              </div>
            ) : (
              <div className="mb-4 space-y-2">
                <Input
                  placeholder="Сумма +/-, ₽ (например -500 или 500)"
                  value={adjustRub}
                  onChange={(e) => setAdjustRub(e.target.value)}
                />
                <Input
                  placeholder="Причина корректировки"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                />
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={adjustMutation.isPending}
                  onClick={() => adjustMutation.mutate()}
                >
                  {adjustMutation.isPending ? "Сохранение..." : "Применить корректировку"}
                </Button>
              </div>
            )}

            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-foreground">История</p>
              {(account?.ledger ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Операций пока нет</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                  {(account?.ledger ?? []).map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-md border border-border px-3 py-2"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-foreground">
                          {ledgerTypeLabel[entry.type]}
                        </span>
                        <span
                          className={
                            entry.delta >= 0 ? "text-[#4CAF50]" : "text-red-500"
                          }
                        >
                          {entry.delta >= 0 ? "+" : ""}
                          {formatRub(entry.delta)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString("ru-RU")} · баланс{" "}
                        {formatRub(entry.balanceAfter)}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground">{entry.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={onClose}>
              Закрыть
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

function extractError(err: unknown): string {
  const msg =
    (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message ??
    (err as Error)?.message ??
    "Ошибка операции";
  return Array.isArray(msg) ? msg.join(", ") : String(msg);
}

export default ClientDepositModal;
