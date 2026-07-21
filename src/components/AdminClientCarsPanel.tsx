import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { adminAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CarCatalogPicker from "@/components/CarCatalogPicker";

type ClientCar = {
  id: number;
  brand: string;
  model: string;
  licensePlate?: string | null;
  hasNoPlate: boolean;
  pricingTierLabel?: string | null;
};

type Props = {
  userId: number;
};

const AdminClientCarsPanel = ({ userId }: Props) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [catalogModelId, setCatalogModelId] = useState("");
  const [catalogClass, setCatalogClass] = useState("");
  const [hasNoPlate, setHasNoPlate] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [error, setError] = useState("");

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["admin-client-cars", userId],
    queryFn: async () => {
      const res = await adminAPI.listClientCars(userId);
      return (res.data ?? []) as ClientCar[];
    },
  });

  const resetForm = () => {
    setBrand("");
    setModel("");
    setCatalogModelId("");
    setCatalogClass("");
    setHasNoPlate(false);
    setLicensePlate("");
    setError("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!brand.trim() || !model.trim()) {
        throw new Error("Выберите марку и модель");
      }
      if (!hasNoPlate && !licensePlate.trim()) {
        throw new Error("Укажите госномер или отметьте «Без номера»");
      }

      return adminAPI.createClientCar(userId, {
        brand: brand.trim(),
        model: model.trim(),
        catalogModelId: catalogModelId || undefined,
        catalogClass: catalogClass || undefined,
        hasNoPlate,
        licensePlate: hasNoPlate ? undefined : licensePlate.trim().toUpperCase(),
      });
    },
    onSuccess: async () => {
      resetForm();
      setShowForm(false);
      await queryClient.invalidateQueries({
        queryKey: ["admin-client-cars", userId],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (err: unknown) => setError(extractError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (carId: number) => adminAPI.deleteClientCar(userId, carId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-client-cars", userId],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (err: unknown) => setError(extractError(err)),
  });

  const carLabel = (car: ClientCar) => {
    const plate =
      car.hasNoPlate || !car.licensePlate ? "без номера" : car.licensePlate;
    return `${car.brand} ${car.model} (${plate})`;
  };

  return (
    <div>
      {isLoading ? (
        <p className="mb-3 text-sm text-muted-foreground">Загрузка авто...</p>
      ) : cars.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">
          У клиента пока нет автомобилей
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {cars.map((car) => (
            <li
              key={car.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="text-foreground">{carLabel(car)}</p>
                {car.pricingTierLabel && (
                  <p className="text-xs text-muted-foreground">
                    {car.pricingTierLabel}
                  </p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  const ok = window.confirm(
                    `Удалить ${car.brand} ${car.model}?`,
                  );
                  if (!ok) return;
                  deleteMutation.mutate(car.id);
                }}
              >
                <Trash2 size={14} strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!showForm ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-[#D9E57F] text-[#D9E57F] hover:bg-[#D9E57F]/10"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Добавить автомобиль
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-foreground">Новый автомобиль</p>
          <CarCatalogPicker
            brand={brand}
            model={model}
            onBrandChange={(name) => {
              setBrand(name);
              setModel("");
              setCatalogModelId("");
              setCatalogClass("");
            }}
            onModelChange={(name, modelId, cls) => {
              setModel(name);
              setCatalogModelId(modelId);
              setCatalogClass(cls);
            }}
          />

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={hasNoPlate}
              onChange={(e) => {
                setHasNoPlate(e.target.checked);
                if (e.target.checked) setLicensePlate("");
              }}
              className="accent-[#D9E57F]"
            />
            Без госномера
          </label>

          {!hasNoPlate && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Госномер
              </label>
              <Input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="А123БВ77"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={createMutation.isPending}
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
              disabled={createMutation.isPending}
              onClick={() => {
                setError("");
                createMutation.mutate();
              }}
            >
              {createMutation.isPending ? "Сохранение..." : "Сохранить авто"}
            </Button>
          </div>
        </div>
      )}
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

export default AdminClientCarsPanel;
