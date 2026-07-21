import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRuPhoneDisplay } from "@/lib/ruPhoneMask";

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
  phone?: string | null;
  userId?: number | null;
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
  userId?: number;
  phone?: string;
  onUpdated?: () => void;
};

const ClientDepositPanel = ({ userId, phone, onUpdated }: Props) => {
  const queryClient = useQueryClient();
  const [depositRub, setDepositRub] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [adjustRub, setAdjustRub] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"deposit" | "adjust">("deposit");

  const depositKey =
    userId != null ? `user:${userId}` : phone ? `phone:${phone}` : "";

  const { data: account, isLoading } = useQuery({
    queryKey: ["client-deposit", depositKey],
    queryFn: async () => {
      const res = await adminAPI.getDeposit(
        userId != null
          ? { userId, phone: phone || undefined }
          : { phone: phone! },
      );
      return res.data as AccountDetail;
    },
    enabled: Boolean(depositKey),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["client-deposit"] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    onUpdated?.();
  };

  const identityPayload = () => {
    if (userId != null) {
      return { userId, phone: phone || undefined };
    }
    return { phone: phone! };
  };

  const depositMutation = useMutation({
    mutationFn: async () => {
      const amount = rubToKopeks(depositRub);
      if (amount <= 0) throw new Error("Укажите сумму пополнения");
      return adminAPI.deposit({
        ...identityPayload(),
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
    onError: (err: unknown) => setError(extractError(err)),
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const delta = rubToKopeks(adjustRub, true);
      if (delta === 0) throw new Error("Укажите сумму корректировки");
      if (!adjustNote.trim()) throw new Error("Укажите причину корректировки");
      return adminAPI.adjustDeposit({
        ...identityPayload(),
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
    onError: (err: unknown) => setError(extractError(err)),
  });

  const balance = account?.balance ?? 0;
  const displayPhone = phone || account?.phone || null;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка депозита...</p>;
  }

  return (
    <div>
      {displayPhone && (
        <p className="mb-2 text-sm text-muted-foreground">
          {formatRuPhoneDisplay(displayPhone)}
        </p>
      )}
      {!displayPhone && userId != null && (
        <p className="mb-2 text-sm text-muted-foreground">без телефона (Apple ID)</p>
      )}

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

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">История</p>
        {(account?.ledger ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Операций пока нет</p>
        ) : (
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {(account?.ledger ?? []).map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-border px-3 py-2"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-foreground">{ledgerTypeLabel[entry.type]}</span>
                  <span
                    className={entry.delta >= 0 ? "text-[#4CAF50]" : "text-red-500"}
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

export default ClientDepositPanel;
