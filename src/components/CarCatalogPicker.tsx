import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { fetchCarsBaseCatalog, getModelsForBrand } from "@/lib/carsBaseCatalog";

type Props = {
  brand: string;
  model: string;
  onBrandChange: (brand: string, brandId: string) => void;
  onModelChange: (
    model: string,
    modelId: string,
    catalogClass: string,
  ) => void;
};

const CarCatalogPicker = ({
  brand,
  model,
  onBrandChange,
  onModelChange,
}: Props) => {
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");

  const { data: catalog = [], isLoading, isError } = useQuery({
    queryKey: ["cars-base-catalog"],
    queryFn: fetchCarsBaseCatalog,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const brandOptions = useMemo(
    () =>
      catalog.map((b) => ({
        value: b.id,
        label: b.name,
      })),
    [catalog],
  );

  const models = useMemo(
    () => getModelsForBrand(catalog, brandId),
    [catalog, brandId],
  );

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        value: m.id,
        label: m.name,
      })),
    [models],
  );

  const handleBrandSelect = (id: string, name: string) => {
    setBrandId(id);
    setModelId("");
    if (id) {
      onBrandChange(name, id);
      onModelChange("", "", "");
    } else {
      onBrandChange("", "");
      onModelChange("", "", "");
    }
  };

  const handleModelSelect = (id: string, _name: string) => {
    setModelId(id);
    const selected = models.find((m) => m.id === id);
    if (selected) {
      onModelChange(selected.name, selected.id, selected.class ?? "");
    } else {
      onModelChange("", "", "");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-[#8E8E93]">Загрузка каталога авто...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-[#FF3B30]">
        Не удалось загрузить каталог. Проверьте интернет.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <SearchableCombobox
        label="Марка автомобиля"
        placeholder="Введите или выберите марку"
        options={brandOptions}
        value={brandId}
        selectedLabel={brand || undefined}
        onChange={handleBrandSelect}
      />

      <SearchableCombobox
        label="Модель"
        placeholder={
          brandId ? "Введите или выберите модель" : "Сначала выберите марку"
        }
        options={modelOptions}
        value={modelId}
        selectedLabel={model || undefined}
        onChange={handleModelSelect}
        disabled={!brandId}
        emptyText="Модель не найдена"
      />
    </div>
  );
};

export default CarCatalogPicker;
