import { useEffect, useMemo, useState } from "react";
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
import CarCatalogPicker from "@/components/CarCatalogPicker";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";

type ClientCar = {
  id: number;
  brand: string;
  model: string;
  licensePlate?: string | null;
  hasNoPlate: boolean;
};

type ClientListItem = {
  id: number;
  phone?: string | null;
  name?: string | null;
  cars: ClientCar[];
};

type ServiceItem = {
  id: number;
  name: string;
  price: number;
  resolvedPrice?: number;
  resolvedPricingTierLabel?: string;
  useClassPricing?: boolean;
  isActive: boolean;
};

function serviceDisplayPrice(s: ServiceItem): number {
  return typeof s.resolvedPrice === "number" ? s.resolvedPrice : s.price;
}

function formatRub(kopeks: number): string {
  return `${(kopeks / 100).toLocaleString("ru-RU")} ₽`;
}

type BookingMode = "existing" | "walkin";

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
  const [mode, setMode] = useState<BookingMode>("existing");
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [carId, setCarId] = useState<number | "">("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [catalogClass, setCatalogClass] = useState("");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const phoneE164 = isRuPhoneComplete(phone) ? ruPhoneToE164(phone) : "";

  const carLabel = (car: ClientCar) => {
    const plate =
      car.hasNoPlate || !car.licensePlate
        ? "без номера"
        : car.licensePlate;
    return `${car.brand} ${car.model} (${plate})`;
  };

  const clientLabel = (c: ClientListItem) => {
    const name = c.name?.trim() || "Без имени";
    const ph = c.phone ? formatRuPhoneDisplay(c.phone) : "—";
    return `${name} · ${ph}`;
  };

  useEffect(() => {
    const timer = setTimeout(() => setClientSearch(clientSearchInput), 300);
    return () => clearTimeout(timer);
  }, [clientSearchInput]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["admin-clients", clientSearch],
    queryFn: async () => {
      const res = await adminAPI.listClients(
        clientSearch.trim() ? clientSearch.trim() : undefined,
      );
      return (res.data ?? []) as ClientListItem[];
    },
  });

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedUserId),
    [clients, selectedUserId],
  );

  const clientCars = selectedClient?.cars ?? [];

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: String(c.id),
        label: clientLabel(c),
      })),
    [clients],
  );

  const selectedClientLabel = selectedClient
    ? clientLabel(selectedClient)
    : undefined;

  const carOptions = useMemo(
    () =>
      clientCars.map((car) => ({
        value: String(car.id),
        label: carLabel(car),
      })),
    [clientCars],
  );

  const selectedCar =
    carId !== "" ? clientCars.find((c) => c.id === carId) : undefined;
  const selectedCarLabel = selectedCar ? carLabel(selectedCar) : undefined;

  const servicesPricing = useMemo(() => {
    if (mode === "existing" && carId !== "") {
      return { carId: Number(carId) };
    }
    if (mode === "walkin" && carBrand.trim() && carModel.trim()) {
      return {
        carBrand: carBrand.trim(),
        carModel: carModel.trim(),
        ...(catalogClass ? { catalogClass } : {}),
      };
    }
    return undefined;
  }, [mode, carId, carBrand, carModel, catalogClass]);

  const canLoadServices =
    mode === "walkin"
      ? !!(carBrand.trim() && carModel.trim())
      : selectedUserId !== "" &&
        (clientCars.length === 0 || carId !== "");

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services-active", servicesPricing],
    queryFn: async () => {
      const res = await servicesAPI.getAll(false, servicesPricing);
      return (res.data ?? []) as ServiceItem[];
    },
    enabled: canLoadServices,
  });

  const pricingTierLabel = services[0]?.resolvedPricingTierLabel;

  const selectedTotalKopeks = useMemo(
    () =>
      services
        .filter((s) => serviceIds.includes(s.id))
        .reduce((sum, s) => sum + serviceDisplayPrice(s), 0),
    [services, serviceIds],
  );

  useEffect(() => {
    setServiceIds([]);
  }, [servicesPricing, mode]);

  useEffect(() => {
    if (mode !== "existing") return;
    setCarId("");
    if (selectedClient) {
      setPhone(
        selectedClient.phone
          ? formatRuPhoneDisplay(selectedClient.phone)
          : "",
      );
      setClientName(selectedClient.name ?? "");
      if (selectedClient.cars.length === 1) {
        setCarId(selectedClient.cars[0].id);
      }
    }
  }, [selectedUserId, selectedClient, mode]);

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof adminAPI.createBooking>[0] = {
        serviceIds,
        date,
        slotStart,
        confirmImmediately: true,
      };

      if (mode === "existing") {
        if (selectedUserId === "") {
          throw new Error("Выберите клиента");
        }
        payload.userId = selectedUserId;
        if (carId !== "") payload.carId = carId;
        if (notes.trim()) payload.notes = notes.trim();
        return adminAPI.createBooking(payload);
      }

      if (!isRuPhoneComplete(phone)) {
        throw new Error("Введите полный номер телефона");
      }
      payload.guestOnly = true;
      payload.phone = phoneE164;
      payload.clientName = clientName.trim() || "Гость";
      if (notes.trim()) payload.notes = notes.trim();
      if (carBrand.trim() && carModel.trim()) {
        payload.carBrand = carBrand.trim();
        payload.carModel = carModel.trim();
        if (catalogClass) payload.catalogClass = catalogClass;
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
          ?.response?.data?.message ??
        (err as Error)?.message ??
        "Не удалось создать запись";
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
    if (mode === "existing" && selectedUserId === "") {
      setError("Выберите клиента из списка");
      return;
    }
    if (mode === "walkin" && !isRuPhoneComplete(phone)) {
      setError("Введите полный номер телефона");
      return;
    }
    if (serviceIds.length === 0) {
      setError("Выберите хотя бы одну услугу");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-xl font-bold text-foreground">Новая запись</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {date} · {slotStart} – {slotEnd}
        </p>

        <div className="mb-4 flex gap-2 rounded-lg bg-muted p-1">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              mode === "existing"
                ? "bg-[#D9E57F] text-[#17181C]"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setMode("existing");
              setError("");
            }}
          >
            Клиент из базы
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              mode === "walkin"
                ? "bg-[#D9E57F] text-[#17181C]"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setMode("walkin");
              setSelectedUserId("");
              setCarId("");
              setCarBrand("");
              setCarModel("");
              setCatalogClass("");
              setError("");
            }}
          >
            Разовая запись
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "existing" ? (
            <>
              <SearchableCombobox
                label="Клиент"
                placeholder="Имя или телефон"
                options={clientOptions}
                value={selectedUserId === "" ? "" : String(selectedUserId)}
                selectedLabel={selectedClientLabel}
                onChange={(id) => {
                  setSelectedUserId(id === "" ? "" : Number(id));
                }}
                onSearchChange={setClientSearchInput}
                emptyText={
                  clientsLoading
                    ? "Загрузка..."
                    : "Клиенты не найдены. Используйте «Разовая запись»."
                }
              />

              {selectedUserId !== "" && clientCars.length > 0 && (
                <SearchableCombobox
                  label="Автомобиль"
                  placeholder="Выберите автомобиль"
                  options={carOptions}
                  value={carId === "" ? "" : String(carId)}
                  selectedLabel={selectedCarLabel}
                  onChange={(id) => {
                    setCarId(id === "" ? "" : Number(id));
                    setServiceIds([]);
                  }}
                  emptyText="Нет автомобилей"
                />
              )}

              {selectedUserId !== "" && clientCars.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  У клиента нет автомобилей в приложении — запись без авто.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Данные сохраняются только в записи, клиент в базу не добавляется.
              </p>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">
                  Телефон
                </label>
                <Input
                  value={phone}
                  onChange={(e) =>
                    setPhone(formatRuPhoneDisplay(e.target.value))
                  }
                  placeholder="+7 (999) 999-99-99"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">
                  Имя клиента
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Иван"
                />
              </div>
              <CarCatalogPicker
                brand={carBrand}
                model={carModel}
                onBrandChange={(name) => {
                  setCarBrand(name);
                  setCarModel("");
                  setCatalogClass("");
                  setServiceIds([]);
                }}
                onModelChange={(name, _modelId, cls) => {
                  setCarModel(name);
                  setCatalogClass(cls);
                  setServiceIds([]);
                }}
              />
            </>
          )}

          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Услуги</label>
            {!canLoadServices ? (
              <p className="text-sm text-muted-foreground">
                {mode === "walkin"
                  ? "Укажите марку и модель автомобиля для расчёта цен"
                  : selectedUserId === ""
                    ? "Сначала выберите клиента"
                    : "Выберите автомобиль для расчёта цен по классу"}
              </p>
            ) : servicesLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : (
              <>
                {pricingTierLabel && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {pricingTierLabel}
                    {selectedCar
                      ? ` · ${selectedCar.brand} ${selectedCar.model}`
                      : mode === "walkin" && carBrand && carModel
                        ? ` · ${carBrand} ${carModel}`
                        : ""}
                  </p>
                )}
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        serviceIds.includes(s.id)
                          ? "border-[#D9E57F] bg-[#D9E57F]/10 text-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={serviceIds.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="accent-[#D9E57F]"
                      />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-muted-foreground">
                        {formatRub(serviceDisplayPrice(s))}
                      </span>
                    </label>
                  ))}
                </div>
                {serviceIds.length > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-[#D9E57F]/40 bg-[#D9E57F]/10 px-3 py-2">
                    <span className="text-sm font-medium text-foreground">
                      Итого
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {formatRub(selectedTotalKopeks)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Комментарий
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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
