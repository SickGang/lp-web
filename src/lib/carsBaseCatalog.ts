import axios from "axios";

export type CarCatalogModel = {
  id: string;
  mark_id: string;
  name: string;
  cyrillic_name?: string;
  class?: string;
};

export type CarCatalogBrand = {
  id: string;
  name: string;
  cyrillic_name?: string;
  popular?: number;
  models: CarCatalogModel[];
};

/** В dev — через proxy Vite (`/cars-base`), в prod — напрямую */
const CARS_BASE_URL = import.meta.env.DEV
  ? "/cars-base/full"
  : "https://api.cars-base.ru/full";

export async function fetchCarsBaseCatalog(): Promise<CarCatalogBrand[]> {
  const response = await axios.get<{ data?: CarCatalogBrand[] }>(CARS_BASE_URL);
  const brands = response.data?.data ?? [];
  return brands
    .filter((b) => b.name && Array.isArray(b.models))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function filterBrands(
  brands: CarCatalogBrand[],
  search: string,
): CarCatalogBrand[] {
  const q = search.trim().toLowerCase();
  if (!q) return brands;
  return brands.filter((b) => b.name.toLowerCase().includes(q));
}

export function getModelsForBrand(
  brands: CarCatalogBrand[],
  brandId: string,
): CarCatalogModel[] {
  const brand = brands.find((b) => b.id === brandId);
  if (!brand) return [];
  return [...brand.models].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function filterModels(
  models: CarCatalogModel[],
  search: string,
): CarCatalogModel[] {
  const q = search.trim().toLowerCase();
  if (!q) return models;
  return models.filter((m) => m.name.toLowerCase().includes(q));
}
