import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatRuPhoneDisplay,
  isRuPhoneComplete,
  ruPhoneToE164,
} from "@/lib/ruPhoneMask";
import ClientDepositPanel from "./ClientDepositPanel";

type Props = {
  phone?: string;
  userId?: number;
  clientName?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

const ClientDepositModal = ({
  phone: phoneProp,
  userId: userIdProp,
  clientName,
  onClose,
  onSuccess,
}: Props) => {
  const [phoneInput, setPhoneInput] = useState("");
  const [resolvedPhone, setResolvedPhone] = useState(phoneProp ?? "");
  const [error, setError] = useState("");

  const activePhone = phoneProp ?? resolvedPhone;
  const activeUserId = userIdProp;
  const hasIdentity = Boolean(activePhone) || activeUserId != null;

  if (!hasIdentity) {
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

  const displayPhone =
    activePhone || (activeUserId != null ? null : null);

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
          {clientName ? `${clientName}` : ""}
          {clientName && displayPhone ? " · " : ""}
          {displayPhone
            ? formatRuPhoneDisplay(displayPhone)
            : activeUserId != null
              ? "без телефона (Apple ID)"
              : ""}
        </p>

        <ClientDepositPanel
          userId={activeUserId}
          phone={activePhone || undefined}
          onUpdated={onSuccess}
        />

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={onClose}
        >
          Закрыть
        </Button>
      </div>
    </div>
  );
};

export default ClientDepositModal;
