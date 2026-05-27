import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { adminAPI, servicesAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatRuPhoneDisplay,
  isRuPhoneComplete,
  ruPhoneToE164,
} from "@/lib/ruPhoneMask";
import { cn } from "@/lib/utils";

type ClientCar = {
  id: number;
  brand: string;
  model: string;
  licensePlate?: string | null;
  hasNoPlate: boolean;
};

type ServiceItem = {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
};

type Props = {
  date: string;
  slotStart: string;
  slotEnd: string;
  onClose: () => void;
  onSuccess: () => void;
};

const AdminCreateBookingModal = ({
  date,
  slotStart,
  slotEnd,
  onClose,
  onSuccess,
}: Props) => {
  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [carId, setCarId] = useState<number | "">("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [lookupCars, setLookupCars] = useState<ClientCar[]>([]);
  const [error, setError] = useState("");

  const phoneE164 = isRuPhoneComplete(phone) ? ruPhoneToE164(phone) : "";

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const res = await servicesAPI.getAll(false);
      return (res.data ?? []) as ServiceItem[];
    },
  });

  useEffect(() => {
    if (!phoneE164) {
      setLookupCars([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await adminAPI.lookupClient(phoneE164);
        const data = res.data as {
          found: boolean;
          name?: string | null;
          cars?: ClientCar[];
        };
        if (data.found) {
          setClientName((prev) => (prev.trim() ? prev : data.name ?? ""));
          setLookupCars(data.cars ?? []);
          if ((data.cars ?? []).length === 1) {
            setCarId(data.cars![0].id);
            setCarBrand("");
            setCarModel("");
          }
        } else {
          setLookupCars([]);
          setCarId("");
        }
      } catch {
        setLookupCars([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phoneE164]);

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof adminAPI.createBooking>[0] = {
        phone: phoneE164,
        serviceIds,
        date,
        slotStart,
        confirmImmediately: true,
      };
      if (clientName.trim()) payload.clientName = clientName.trim();
      if (notes.trim()) payload.notes = notes.trim();
      if (carId !== "") payload.carId = carId;
      else if (carBrand.trim() && carModel.trim()) {
        payload.carBrand = carBrand.trim();
        payload.carModel = carModel.trim();
      }
      return adminAPI.createBooking(payload);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "Не удалось создать запись";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    },
  });

  const toggleService = (id: number) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isRuPhoneComplete(phone)) {
      setError("Введите полный номер телефона");
      return;
    }
    if (serviceIds.length === 0) {
      setError("Выберите хотя бы одну услугу");
      return;
    }
    createMutation.mutate();
  };

  const carLabel = (car: ClientCar) => {
    const plate =
      car.hasNoPlate || !car.licensePlate
        ? "без номера"
        : car.licensePlate;
    return `${car.brand} ${car.model} (${plate})`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-xl font-bold text-white">Новая запись</h3>
        <p className="mb-4 text-sm text-[#CCCCCC]">
          {date} · {slotStart} – {slotEnd}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#CCCCCC]">Телефон</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(formatRuPhoneDisplay(e.target.value))}
              placeholder="+7 (999) 999-99-99"
              className="border-[#3A3A3C] bg-[#1C1C1E] text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#CCCCCC]">Имя клиента</label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Иван"
              className="border-[#3A3A3C] bg-[#1C1C1E] text-white"
            />
          </div>

          {lookupCars.length > 0 && (
            <div>
              <label className="mb-1 block text-sm text-[#CCCCCC]">Автомобиль</label>
              <select
                value={carId}
                onChange={(e) => {
                  const v = e.target.value;
                  setCarId(v === "" ? "" : Number(v));
                  if (v !== "") {
                    setCarBrand("");
                    setCarModel("");
                  }
                }}
                className="w-full rounded-md border border-[#3A3A3C] bg-[#1C1C1E] px-3 py-2 text-white"
              >
                <option value="">Не выбран</option>
                {lookupCars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {carLabel(car)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {lookupCars.length === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-[#CCCCCC]">Марка</label>
                <Input
                  value={carBrand}
                  onChange={(e) => setCarBrand(e.target.value)}
                  className="border-[#3A3A3C] bg-[#1C1C1E] text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#CCCCCC]">Модель</label>
                <Input
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  className="border-[#3A3A3C] bg-[#1C1C1E] text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-[#CCCCCC]">Услуги</label>
            {servicesLoading ? (
              <p className="text-sm text-[#8E8E93]">Загрузка...</p>
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {services.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      serviceIds.includes(s.id)
                        ? "border-[#D9E57F] bg-[#D9E57F]/10 text-white"
                        : "border-[#3A3A3C] text-[#CCCCCC]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="accent-[#D9E57F]"
                    />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-[#8E8E93]">
                      {(s.price / 100).toLocaleString("ru-RU")} ₽
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#CCCCCC]">Комментарий</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-[#3A3A3C] bg-[#1C1C1E] px-3 py-2 text-sm text-white"
            />
          </div>

          {error && <p className="text-sm text-[#FF3B30]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-[#3A3A3C] text-white"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Сохранение..." : "Записать"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCreateBookingModal;
