import { useState, type Dispatch, type SetStateAction } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlertTriangle,
  ClipboardList,
  ClipboardPen,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
} from "lucide-react";
import {
  Box,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  TableContainer,
  HStack,
  VStack,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  useDisclosure,
} from "@chakra-ui/react";
import { stockAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";

type TrackingMode = "PER_CHECK" | "PER_PERIOD";

interface StockItem {
  id: number;
  name: string;
  brand?: string | null;
  category: string;
  unit: string;
  trackingMode: TrackingMode;
  pricePerUnit: number;
  currentStock: number;
  minStock: number;
}

interface UsageRow {
  id: number;
  itemName: string;
  trackingMode: TrackingMode;
  quantity: number;
  unit: string;
  cost: number;
  recordedAt: string;
  recordedBy: string;
  bookingId?: number | null;
  notes?: string;
}

const PERIOD_CATEGORIES = [
  { value: "shampoo", label: "Шампунь" },
  { value: "wax", label: "Воск" },
  { value: "polish", label: "Полироль" },
  { value: "tire_cleaner", label: "Очиститель дисков" },
  { value: "interior_cleaner", label: "Очиститель салона" },
  { value: "other", label: "Прочее" },
] as const;

const CHECK_CATEGORIES = [
  { value: "sponge", label: "Губки и аксессуары" },
  { value: "water", label: "Напитки" },
  { value: "retail", label: "Товар на чек" },
  { value: "other", label: "Прочее" },
] as const;

const TRACKING_LABEL: Record<TrackingMode, string> = {
  PER_CHECK: "На чек",
  PER_PERIOD: "За период",
};

function emptyForm(mode: TrackingMode) {
  return {
    name: "",
    brand: "",
    category: mode === "PER_CHECK" ? "retail" : "shampoo",
    unit: mode === "PER_CHECK" ? "шт" : "л",
    trackingMode: mode,
    pricePerUnit: "",
    currentStock: "",
    minStock: "",
  };
}

type StockFormState = ReturnType<typeof emptyForm>;

function ItemFormFields({
  form,
  setForm,
  mode,
}: {
  form: StockFormState;
  setForm: Dispatch<SetStateAction<StockFormState>>;
  mode: TrackingMode;
}) {
  const categories = mode === "PER_CHECK" ? CHECK_CATEGORIES : PERIOD_CATEGORIES;
  return (
    <VStack spacing={4} align="stretch">
      <FormControl isRequired>
        <FormLabel>Название</FormLabel>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={mode === "PER_CHECK" ? "Бутылка воды 0.5л" : "Активная пена"}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Бренд</FormLabel>
        <Input
          value={form.brand}
          onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
          placeholder="Необязательно"
        />
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Категория</FormLabel>
        <Select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Единица</FormLabel>
        <Input
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          placeholder={mode === "PER_CHECK" ? "шт" : "л"}
        />
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Цена за ед. (₽)</FormLabel>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={form.pricePerUnit}
          onChange={(e) =>
            setForm((f) => ({ ...f, pricePerUnit: e.target.value }))
          }
        />
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Текущий остаток</FormLabel>
        <Input
          type="number"
          min={0}
          value={form.currentStock}
          onChange={(e) =>
            setForm((f) => ({ ...f, currentStock: e.target.value }))
          }
        />
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Мин. остаток</FormLabel>
        <Input
          type="number"
          min={0}
          value={form.minStock}
          onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
        />
      </FormControl>
    </VStack>
  );
}

function StockCard({
  item,
  onIssue,
  onEdit,
  issueLabel,
}: {
  item: StockItem;
  onIssue: () => void;
  onEdit: () => void;
  issueLabel: string;
}) {
  const isLow = item.currentStock <= item.minStock;
  const categories =
    item.trackingMode === "PER_CHECK" ? CHECK_CATEGORIES : PERIOD_CATEGORIES;
  const categoryLabel =
    categories.find((c) => c.value === item.category)?.label ?? item.category;

  return (
    <Box
      p={4}
      borderRadius="md"
      borderWidth="1px"
      borderColor={isLow ? "lp.warning" : "lp.border"}
      bg="lp.surface"
    >
      <HStack justify="space-between" mb={2}>
        <Heading size="sm">{item.name}</Heading>
        {isLow && (
          <Badge bg="lp.badgeAccentBg" color="lp.badgeAccentText">
            <HStack spacing={1}>
              <AlertTriangle size={12} />
              <span>Мало</span>
            </HStack>
          </Badge>
        )}
      </HStack>
      {item.brand && (
        <Text fontSize="sm" color="lp.textSecondary">
          {item.brand}
        </Text>
      )}
      <Text fontSize="sm" color="lp.textMuted">
        {categoryLabel}
      </Text>
      <Box mt={3} fontSize="sm">
        <Text>
          Остаток: {item.currentStock} {item.unit}
        </Text>
        <Text>
          Цена: {(item.pricePerUnit / 100).toLocaleString("ru-RU")} ₽/
          {item.unit}
        </Text>
      </Box>
      <Stack mt={3} spacing={2} direction={{ base: "column", sm: "row" }}>
        <Button size="xs" variant="outline" onClick={onIssue}>
          <ClipboardPen size={14} className="mr-1.5" />
          {issueLabel}
        </Button>
        <Button size="xs" variant="ghost" onClick={onEdit}>
          <Pencil size={14} className="mr-1.5" />
          Изменить
        </Button>
      </Stack>
    </Box>
  );
}

const Production = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const usageModal = useDisclosure();

  const [addMode, setAddMode] = useState<TrackingMode>("PER_PERIOD");
  const [addForm, setAddForm] = useState(emptyForm("PER_PERIOD"));
  const [editForm, setEditForm] = useState(emptyForm("PER_PERIOD"));
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [usageItem, setUsageItem] = useState<StockItem | null>(null);
  const [usageForm, setUsageForm] = useState({
    quantity: "",
    bookingId: "",
    notes: "",
  });
  const [historyFilter, setHistoryFilter] = useState<"" | TrackingMode>("");

  const { data: checkItems = [], isLoading: checkLoading } = useQuery({
    queryKey: ["stock", "PER_CHECK"],
    queryFn: async () => {
      const res = await stockAPI.getAll("PER_CHECK");
      return res.data as StockItem[];
    },
  });

  const { data: periodItems = [], isLoading: periodLoading } = useQuery({
    queryKey: ["stock", "PER_PERIOD"],
    queryFn: async () => {
      const res = await stockAPI.getAll("PER_PERIOD");
      return res.data as StockItem[];
    },
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["stock-usage", historyFilter],
    queryFn: async () => {
      const res = await stockAPI.getUsageHistory({
        limit: 80,
        ...(historyFilter ? { trackingMode: historyFilter } : {}),
      });
      return res.data;
    },
  });

  const { data: periodStats } = useQuery({
    queryKey: ["stock-stats-period"],
    queryFn: async () => {
      const today = new Date();
      const monthStart = startOfDay(
        new Date(today.getFullYear(), today.getMonth(), 1),
      );
      const monthEnd = endOfMonth(today);
      const res = await stockAPI.getUsageStats(
        monthStart.toISOString(),
        monthEnd.toISOString(),
        "PER_PERIOD",
      );
      return res.data;
    },
  });

  const { data: checkStats } = useQuery({
    queryKey: ["stock-stats-check"],
    queryFn: async () => {
      const today = new Date();
      const monthStart = startOfDay(
        new Date(today.getFullYear(), today.getMonth(), 1),
      );
      const monthEnd = endOfMonth(today);
      const res = await stockAPI.getUsageStats(
        monthStart.toISOString(),
        monthEnd.toISOString(),
        "PER_CHECK",
      );
      return res.data;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["stock"] });
    queryClient.invalidateQueries({ queryKey: ["stock-usage"] });
    queryClient.invalidateQueries({ queryKey: ["stock-stats-period"] });
    queryClient.invalidateQueries({ queryKey: ["stock-stats-check"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof stockAPI.create>[0]) =>
      stockAPI.create(data),
    onSuccess: () => {
      invalidateAll();
      addModal.onClose();
      setAddForm(emptyForm(addMode));
      toast({ title: "Позиция добавлена", status: "success", duration: 3000 });
    },
    onError: (err: unknown) => {
      toast({
        title:
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Ошибка добавления",
        status: "error",
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      stockAPI.update(id, data),
    onSuccess: () => {
      invalidateAll();
      editModal.onClose();
      setEditingItem(null);
      toast({ title: "Сохранено", status: "success", duration: 3000 });
    },
    onError: (err: unknown) => {
      toast({
        title:
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Ошибка сохранения",
        status: "error",
        duration: 5000,
      });
    },
  });

  const recordUsageMutation = useMutation({
    mutationFn: (data: Parameters<typeof stockAPI.recordUsage>[0]) =>
      stockAPI.recordUsage(data),
    onSuccess: () => {
      invalidateAll();
      usageModal.onClose();
      setUsageItem(null);
      setUsageForm({ quantity: "", bookingId: "", notes: "" });
      toast({ title: "Списание записано", status: "success", duration: 3000 });
    },
    onError: (err: unknown) => {
      toast({
        title:
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Ошибка списания",
        status: "error",
        duration: 5000,
      });
    },
  });

  const usageHistory: UsageRow[] =
    usageData?.map((usage: Record<string, unknown>) => {
      const chemical = usage.chemical as Record<string, unknown> | undefined;
      const userRow = usage.user as Record<string, unknown> | undefined;
      return {
        id: usage.id as number,
        itemName: (chemical?.name as string) ?? "—",
        trackingMode: (chemical?.trackingMode as TrackingMode) ?? "PER_PERIOD",
        quantity: usage.quantity as number,
        unit: (chemical?.unit as string) ?? "",
        cost: usage.cost as number,
        recordedAt: usage.recordedAt as string,
        recordedBy:
          (userRow?.name as string) || (userRow?.phone as string) || "—",
        bookingId: usage.bookingId as number | null | undefined,
        notes: usage.notes as string | undefined,
      };
    }) ?? [];

  const openAdd = (mode: TrackingMode) => {
    setAddMode(mode);
    setAddForm(emptyForm(mode));
    addModal.onOpen();
  };

  const openEdit = (item: StockItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      brand: item.brand ?? "",
      category: item.category,
      unit: item.unit,
      trackingMode: item.trackingMode,
      pricePerUnit: String(item.pricePerUnit / 100),
      currentStock: String(item.currentStock),
      minStock: String(item.minStock),
    });
    editModal.onOpen();
  };

  const openUsage = (item: StockItem) => {
    setUsageItem(item);
    setUsageForm({ quantity: item.trackingMode === "PER_CHECK" ? "1" : "", bookingId: "", notes: "" });
    usageModal.onOpen();
  };

  const buildPayload = (form: typeof addForm) => ({
    name: form.name.trim(),
    brand: form.brand.trim() || undefined,
    category: form.category,
    unit: form.unit.trim() || (form.trackingMode === "PER_CHECK" ? "шт" : "л"),
    trackingMode: form.trackingMode,
    pricePerUnit: Math.round(parseFloat(form.pricePerUnit || "0") * 100),
    currentStock: parseInt(form.currentStock || "0", 10),
    minStock: parseInt(form.minStock || "0", 10),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(buildPayload(addForm));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMutation.mutate({ id: editingItem.id, data: buildPayload(editForm) });
  };

  const handleUsageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageItem || !user?.id) return;
    const quantity = parseFloat(usageForm.quantity.replace(",", "."));
    if (!quantity || quantity <= 0) {
      toast({ title: "Укажите количество", status: "warning" });
      return;
    }
    const bookingId = usageForm.bookingId.trim()
      ? parseInt(usageForm.bookingId, 10)
      : undefined;
    recordUsageMutation.mutate({
      chemicalId: usageItem.id,
      quantity,
      recordedBy: user.id,
      ...(bookingId ? { bookingId } : {}),
      notes: usageForm.notes.trim() || undefined,
    });
  };

  const closeAddModal = () => {
    addModal.onClose();
    setAddForm(emptyForm(addMode));
  };

  const closeEditModal = () => {
    editModal.onClose();
    setEditingItem(null);
  };

  const closeUsageModal = () => {
    usageModal.onClose();
    setUsageItem(null);
    setUsageForm({ quantity: "", bookingId: "", notes: "" });
  };

  return (
    <Box>
      <Heading size="lg" mb={1} color="lp.textPrimary">
        Склад и производство
      </Heading>
      <Text color="lp.textSecondary" fontSize="sm" mb={6}>
        Учёт товаров на чек (шт) и расходников за период (химия и т.п.)
      </Text>

      <Tabs>
        <TabList borderColor="lp.border" mb={4} overflowX="auto">
          <Tab>
            <HStack spacing={2}>
              <Package size={16} />
              <span>Склад</span>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <ClipboardList size={16} />
              <span>История</span>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <Box mb={8}>
              <HStack justify="space-between" mb={3} wrap="wrap" gap={2}>
                <HStack>
                  <ShoppingBag size={18} />
                  <Heading size="sm">На чек (единицы)</Heading>
                </HStack>
                <Button size="sm" variant="outline" onClick={() => openAdd("PER_CHECK")}>
                  <Plus size={14} className="mr-1.5" />
                  Добавить позицию
                </Button>
              </HStack>
              <Text fontSize="sm" color="lp.textMuted" mb={3}>
                Губки, вода и другие товары, которые выдаются поштучно на чек или заказ.
                За месяц выдано на{" "}
                {((checkStats?.totalCost ?? 0) / 100).toLocaleString("ru-RU")} ₽ (
                {checkStats?.recordsCount ?? 0} операций).
              </Text>
              {checkLoading ? (
                <Text>Загрузка...</Text>
              ) : checkItems.length === 0 ? (
                <Text color="lp.textMuted">Позиций пока нет</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {checkItems.map((item) => (
                    <StockCard
                      key={item.id}
                      item={item}
                      issueLabel="Выдать на чек"
                      onIssue={() => openUsage(item)}
                      onEdit={() => openEdit(item)}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Box>

            <Box>
              <HStack justify="space-between" mb={3} wrap="wrap" gap={2}>
                <HStack>
                  <Package size={18} />
                  <Heading size="sm">За период</Heading>
                </HStack>
                <Button size="sm" variant="outline" onClick={() => openAdd("PER_PERIOD")}>
                  <Plus size={14} className="mr-1.5" />
                  Добавить позицию
                </Button>
              </HStack>
              <Text fontSize="sm" color="lp.textMuted" mb={3}>
                Химия и расходники, расход которых фиксируется за период (л, мл, кг).
                Расход за месяц: {((periodStats?.totalCost ?? 0) / 100).toLocaleString("ru-RU")} ₽.
              </Text>
              {periodLoading ? (
                <Text>Загрузка...</Text>
              ) : periodItems.length === 0 ? (
                <Text color="lp.textMuted">Позиций пока нет</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {periodItems.map((item) => (
                    <StockCard
                      key={item.id}
                      item={item}
                      issueLabel="Записать расход"
                      onIssue={() => openUsage(item)}
                      onEdit={() => openEdit(item)}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Box>
          </TabPanel>

          <TabPanel px={0}>
            <HStack mb={4} spacing={2} wrap="wrap">
              <Text fontSize="sm" color="lp.textMuted">
                Фильтр:
              </Text>
              {(["", "PER_CHECK", "PER_PERIOD"] as const).map((value) => (
                <Button
                  key={value || "all"}
                  size="xs"
                  variant={historyFilter === value ? "default" : "outline"}
                  className={
                    historyFilter === value
                      ? "bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
                      : ""
                  }
                  onClick={() => setHistoryFilter(value)}
                >
                  {value === "" ? "Все" : TRACKING_LABEL[value]}
                </Button>
              ))}
            </HStack>

            {usageLoading ? (
              <Text>Загрузка...</Text>
            ) : (
              <TableContainer
                bg="lp.surface"
                borderRadius="md"
                borderWidth="1px"
                borderColor="lp.border"
                overflowX="auto"
              >
                <Table size="sm" minW="860px">
                  <Thead bg="lp.input">
                    <Tr>
                      <Th>Дата</Th>
                      <Th>Тип</Th>
                      <Th>Позиция</Th>
                      <Th>Кол-во</Th>
                      <Th>Сумма</Th>
                      <Th>Заказ</Th>
                      <Th>Кто</Th>
                      <Th>Заметки</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {usageHistory.map((row) => (
                      <Tr key={row.id}>
                        <Td>
                          {format(new Date(row.recordedAt), "d MMM yyyy, HH:mm", {
                            locale: ru,
                          })}
                        </Td>
                        <Td>
                          <Badge>{TRACKING_LABEL[row.trackingMode]}</Badge>
                        </Td>
                        <Td>{row.itemName}</Td>
                        <Td>
                          {row.quantity} {row.unit}
                        </Td>
                        <Td>{(row.cost / 100).toLocaleString("ru-RU")} ₽</Td>
                        <Td>{row.bookingId ? `#${row.bookingId}` : "—"}</Td>
                        <Td>{row.recordedBy}</Td>
                        <Td>{row.notes || "—"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={addModal.isOpen} onClose={closeAddModal} size={{ base: "full", md: "md" }}>
        <ModalOverlay />
        <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border">
          <ModalHeader>
            Добавить — {TRACKING_LABEL[addMode]}
          </ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleAddSubmit}>
            <ModalBody>
              <ItemFormFields form={addForm} setForm={setAddForm} mode={addMode} />
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="ghost" className="mr-3" onClick={closeAddModal}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Добавить
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={closeEditModal} size={{ base: "full", md: "md" }}>
        <ModalOverlay />
        <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border">
          <ModalHeader>Изменить: {editingItem?.name}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleEditSubmit}>
            <ModalBody>
              {editingItem && (
                <ItemFormFields
                  form={editForm}
                  setForm={setEditForm}
                  mode={editingItem.trackingMode}
                />
              )}
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="ghost" className="mr-3" onClick={closeEditModal}>
                Отмена
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Сохранить
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <Modal isOpen={usageModal.isOpen} onClose={closeUsageModal} size={{ base: "full", md: "md" }}>
        <ModalOverlay />
        <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border">
          <ModalHeader>
            {usageItem?.trackingMode === "PER_CHECK"
              ? `Выдать на чек: ${usageItem?.name}`
              : `Расход: ${usageItem?.name}`}
          </ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleUsageSubmit}>
            <ModalBody>
              <VStack spacing={4} align="stretch">
                {usageItem && (
                  <Text fontSize="sm" color="lp.textSecondary">
                    Остаток: {usageItem.currentStock} {usageItem.unit}
                  </Text>
                )}
                <FormControl isRequired>
                  <FormLabel>
                    Количество ({usageItem?.unit})
                    {usageItem?.trackingMode === "PER_CHECK" ? ", целое" : ""}
                  </FormLabel>
                  <Input
                    type="number"
                    min={usageItem?.trackingMode === "PER_CHECK" ? 1 : 0.01}
                    step={usageItem?.trackingMode === "PER_CHECK" ? 1 : "any"}
                    value={usageForm.quantity}
                    onChange={(e) =>
                      setUsageForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                  />
                </FormControl>
                {usageItem?.trackingMode === "PER_CHECK" && (
                  <FormControl>
                    <FormLabel>№ заказа (необязательно)</FormLabel>
                    <Input
                      type="number"
                      min={1}
                      value={usageForm.bookingId}
                      onChange={(e) =>
                        setUsageForm((f) => ({ ...f, bookingId: e.target.value }))
                      }
                      placeholder="Привязка к записи"
                    />
                  </FormControl>
                )}
                <FormControl>
                  <FormLabel>Заметки</FormLabel>
                  <Input
                    value={usageForm.notes}
                    onChange={(e) =>
                      setUsageForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="ghost" className="mr-3" onClick={closeUsageModal}>
                Отмена
              </Button>
              <Button type="submit" disabled={recordUsageMutation.isPending}>
                Записать
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Production;
