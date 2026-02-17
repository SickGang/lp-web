import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Box,
  Heading,
  Button,
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
  useColorModeValue,
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
import { chemicalsAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";

interface Chemical {
  id: number;
  name: string;
  brand: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  currentStock: number;
  minStock: number;
}

interface ChemicalUsage {
  id: number;
  chemicalName: string;
  quantity: number;
  cost: number;
  recordedAt: string;
  recordedBy: string;
  notes?: string;
}

const CATEGORIES = [
  { value: "shampoo", label: "Шампунь" },
  { value: "wax", label: "Воск" },
  { value: "polish", label: "Полироль" },
  { value: "tire_cleaner", label: "Очиститель дисков" },
  { value: "interior_cleaner", label: "Очиститель салона" },
  { value: "other", label: "Прочее" },
] as const;

const Chemistry = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.800");
  const [activeTab, setActiveTab] = useState(0);

  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const usageModal = useDisclosure();
  const [editingChemical, setEditingChemical] = useState<Chemical | null>(null);
  const [usageChemical, setUsageChemical] = useState<Chemical | null>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    brand: "",
    category: "shampoo",
    unit: "л",
    pricePerUnit: "",
    currentStock: "",
    minStock: "",
  });
  const [editForm, setEditForm] = useState({ ...addForm });
  const [usageForm, setUsageForm] = useState({ quantity: "", notes: "" });

  const {
    data: chemicalsData,
    isLoading: chemicalsLoading,
    isError: chemicalsError,
  } = useQuery({
    queryKey: ["chemicals"],
    queryFn: async () => {
      const response = await chemicalsAPI.getAll();
      return response.data;
    },
    retry: 1,
  });

  const {
    data: usageData,
    isLoading: usageLoading,
    isError: usageError,
  } = useQuery({
    queryKey: ["chemical-usage"],
    queryFn: async () => {
      const response = await chemicalsAPI.getUsageHistory({ limit: 50 });
      return response.data;
    },
    retry: 1,
  });

  const { data: statsData } = useQuery({
    queryKey: ["chemical-stats"],
    queryFn: async () => {
      const today = new Date();
      const monthStart = startOfDay(
        new Date(today.getFullYear(), today.getMonth(), 1),
      );
      const monthEnd = endOfMonth(today);
      const response = await chemicalsAPI.getUsageStats(
        monthStart.toISOString(),
        monthEnd.toISOString(),
      );
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => chemicalsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemicals"] });
      addModal.onClose();
      setAddForm({
        name: "",
        brand: "",
        category: "shampoo",
        unit: "л",
        pricePerUnit: "",
        currentStock: "",
        minStock: "",
      });
      toast({ title: "Химия добавлена", status: "success", duration: 3000 });
    },
    onError: (err: any) => {
      toast({
        title: err.response?.data?.message || "Ошибка добавления",
        status: "error",
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      chemicalsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemicals"] });
      editModal.onClose();
      setEditingChemical(null);
      toast({
        title: "Изменения сохранены",
        status: "success",
        duration: 3000,
      });
    },
    onError: (err: any) => {
      toast({
        title: err.response?.data?.message || "Ошибка сохранения",
        status: "error",
        duration: 5000,
      });
    },
  });

  const recordUsageMutation = useMutation({
    mutationFn: (data: any) => chemicalsAPI.recordUsage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemicals"] });
      queryClient.invalidateQueries({ queryKey: ["chemical-usage"] });
      queryClient.invalidateQueries({ queryKey: ["chemical-stats"] });
      usageModal.onClose();
      setUsageChemical(null);
      setUsageForm({ quantity: "", notes: "" });
      toast({ title: "Расход записан", status: "success", duration: 3000 });
    },
    onError: (err: any) => {
      toast({
        title: err.response?.data?.message || "Ошибка записи расхода",
        status: "error",
        duration: 5000,
      });
    },
  });

  const chemicals: Chemical[] = chemicalsData ?? [];
  const usageHistory: ChemicalUsage[] =
    usageData?.map((usage: any) => ({
      id: usage.id,
      chemicalName: usage.chemical?.name ?? "—",
      quantity: usage.quantity,
      cost: usage.cost,
      recordedAt: usage.recordedAt,
      recordedBy: usage.user?.name || usage.user?.phone || "—",
      notes: usage.notes,
    })) ?? [];

  const getCategoryLabel = (category: string) => {
    const found = CATEGORIES.find((c) => c.value === category);
    return found ? found.label : "Прочее";
  };

  const openEdit = (chemical: Chemical) => {
    setEditingChemical(chemical);
    setEditForm({
      name: chemical.name,
      brand: chemical.brand,
      category: chemical.category,
      unit: chemical.unit,
      pricePerUnit: String(chemical.pricePerUnit / 100),
      currentStock: String(chemical.currentStock),
      minStock: String(chemical.minStock),
    });
    editModal.onOpen();
  };

  const openUsage = (chemical: Chemical) => {
    setUsageChemical(chemical);
    setUsageForm({ quantity: "", notes: "" });
    usageModal.onOpen();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.round(parseFloat(addForm.pricePerUnit || "0") * 100);
    createMutation.mutate({
      name: addForm.name.trim(),
      brand: addForm.brand.trim(),
      category: addForm.category,
      unit: addForm.unit.trim() || "л",
      pricePerUnit: price,
      currentStock: parseInt(addForm.currentStock || "0", 10),
      minStock: parseInt(addForm.minStock || "0", 10),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChemical) return;
    const price = Math.round(parseFloat(editForm.pricePerUnit || "0") * 100);
    updateMutation.mutate({
      id: editingChemical.id,
      data: {
        name: editForm.name.trim(),
        brand: editForm.brand.trim(),
        category: editForm.category,
        unit: editForm.unit.trim() || "л",
        pricePerUnit: price,
        currentStock: parseInt(editForm.currentStock || "0", 10),
        minStock: parseInt(editForm.minStock || "0", 10),
      },
    });
  };

  const handleUsageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageChemical || !user?.id) {
      toast({ title: "Не удалось определить пользователя", status: "error" });
      return;
    }
    const quantity = parseFloat(usageForm.quantity.replace(",", "."));
    if (!quantity || quantity <= 0) {
      toast({ title: "Укажите количество", status: "warning" });
      return;
    }
    recordUsageMutation.mutate({
      chemicalId: usageChemical.id,
      quantity,
      recordedBy: user.id,
      notes: usageForm.notes.trim() || undefined,
    });
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6} wrap="wrap" gap={4}>
        <Heading size="lg" color="gray.800">
          Учет химии
        </Heading>
        <Button colorScheme="gray" variant="outline" onClick={addModal.onOpen}>
          + Добавить химию
        </Button>
      </HStack>

      <Tabs index={activeTab} onChange={setActiveTab} colorScheme="gray">
        <TabList borderColor="gray.200" mb={4}>
          <Tab>📦 Склад</Tab>
          <Tab>📊 История расхода</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            {chemicalsLoading ? (
              <Text>Загрузка...</Text>
            ) : chemicalsError ? (
              <Text color="red.500">
                Ошибка загрузки данных. Убедитесь, что API сервер запущен.
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {chemicals.map((chemical) => {
                  const isLowStock = chemical.currentStock <= chemical.minStock;
                  return (
                    <Box
                      key={chemical.id}
                      p={4}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={isLowStock ? "red.300" : "gray.200"}
                      bg={cardBg}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Heading size="sm">{chemical.name}</Heading>
                        {isLowStock && <Badge colorScheme="red">⚠️ Мало</Badge>}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {chemical.brand}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {getCategoryLabel(chemical.category)}
                      </Text>
                      <Box mt={3} fontSize="sm">
                        <Text>
                          Остаток: {chemical.currentStock} {chemical.unit}
                        </Text>
                        <Text>
                          Цена:{" "}
                          {(chemical.pricePerUnit / 100).toLocaleString(
                            "ru-RU",
                          )}{" "}
                          ₽/{chemical.unit}
                        </Text>
                      </Box>
                      <HStack mt={3} spacing={2}>
                        <Button
                          size="xs"
                          colorScheme="gray"
                          variant="outline"
                          onClick={() => openUsage(chemical)}
                        >
                          Записать расход
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="gray"
                          onClick={() => openEdit(chemical)}
                        >
                          Изменить
                        </Button>
                      </HStack>
                    </Box>
                  );
                })}
              </SimpleGrid>
            )}
          </TabPanel>

          <TabPanel px={0}>
            {usageLoading ? (
              <Text>Загрузка...</Text>
            ) : usageError ? (
              <Text color="red.500">
                Ошибка загрузки данных. Убедитесь, что API сервер запущен.
              </Text>
            ) : (
              <Box>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                  <Box
                    p={4}
                    bg={cardBg}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Text fontSize="sm" color="gray.600">
                      Расход за месяц
                    </Text>
                    <Text fontSize="xl" fontWeight="bold">
                      {((statsData?.totalCost ?? 0) / 100).toLocaleString(
                        "ru-RU",
                      )}{" "}
                      ₽
                    </Text>
                  </Box>
                  <Box
                    p={4}
                    bg={cardBg}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Text fontSize="sm" color="gray.600">
                      Записей расхода
                    </Text>
                    <Text fontSize="xl" fontWeight="bold">
                      {statsData?.recordsCount ?? 0}
                    </Text>
                  </Box>
                </SimpleGrid>

                <TableContainer
                  bg={cardBg}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <Table size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Дата и время</Th>
                        <Th>Химия</Th>
                        <Th>Количество</Th>
                        <Th>Стоимость</Th>
                        <Th>Записал</Th>
                        <Th>Заметки</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {usageHistory.map((usage) => (
                        <Tr key={usage.id}>
                          <Td>
                            {format(
                              new Date(usage.recordedAt),
                              "d MMM yyyy, HH:mm",
                              { locale: ru },
                            )}
                          </Td>
                          <Td>{usage.chemicalName}</Td>
                          <Td>{usage.quantity}</Td>
                          <Td>
                            {(usage.cost / 100).toLocaleString("ru-RU")} ₽
                          </Td>
                          <Td>{usage.recordedBy}</Td>
                          <Td>{usage.notes || "—"}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Модалка: Добавить химию */}
      <Modal isOpen={addModal.isOpen} onClose={addModal.onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Добавить химию</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleAddSubmit}>
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Название</FormLabel>
                  <Input
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Например: Активная пена"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Бренд</FormLabel>
                  <Input
                    value={addForm.brand}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, brand: e.target.value }))
                    }
                    placeholder="Например: Koch Chemie"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Категория</FormLabel>
                  <Select
                    value={addForm.category}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, category: e.target.value }))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Единица измерения</FormLabel>
                  <Input
                    value={addForm.unit}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, unit: e.target.value }))
                    }
                    placeholder="л"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Цена за ед. (₽)</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={addForm.pricePerUnit}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        pricePerUnit: e.target.value,
                      }))
                    }
                    placeholder="1500"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Текущий остаток</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    value={addForm.currentStock}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        currentStock: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Мин. остаток (предупреждение)</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    value={addForm.minStock}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, minStock: e.target.value }))
                    }
                    placeholder="5"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={addModal.onClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                colorScheme="gray"
                bg="gray.800"
                _hover={{ bg: "gray.700" }}
                isLoading={createMutation.isPending}
              >
                Добавить
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Модалка: Изменить */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.onClose();
          setEditingChemical(null);
        }}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Изменить: {editingChemical?.name}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleEditSubmit}>
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Название</FormLabel>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Бренд</FormLabel>
                  <Input
                    value={editForm.brand}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, brand: e.target.value }))
                    }
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Категория</FormLabel>
                  <Select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, category: e.target.value }))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Единица измерения</FormLabel>
                  <Input
                    value={editForm.unit}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, unit: e.target.value }))
                    }
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Цена за ед. (₽)</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editForm.pricePerUnit}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        pricePerUnit: e.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Текущий остаток</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.currentStock}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        currentStock: e.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Мин. остаток</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.minStock}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, minStock: e.target.value }))
                    }
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={editModal.onClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                colorScheme="gray"
                bg="gray.800"
                _hover={{ bg: "gray.700" }}
                isLoading={updateMutation.isPending}
              >
                Сохранить
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Модалка: Записать расход */}
      <Modal
        isOpen={usageModal.isOpen}
        onClose={() => {
          usageModal.onClose();
          setUsageChemical(null);
        }}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Записать расход: {usageChemical?.name}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleUsageSubmit}>
            <ModalBody>
              <VStack spacing={4} align="stretch">
                {usageChemical && (
                  <Text fontSize="sm" color="gray.600">
                    Остаток: {usageChemical.currentStock} {usageChemical.unit}
                  </Text>
                )}
                <FormControl isRequired>
                  <FormLabel>
                    Количество ({usageChemical?.unit || "л"})
                  </FormLabel>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={usageForm.quantity}
                    onChange={(e) =>
                      setUsageForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    placeholder="1,5"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Заметки</FormLabel>
                  <Input
                    value={usageForm.notes}
                    onChange={(e) =>
                      setUsageForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Необязательно"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={usageModal.onClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                colorScheme="gray"
                bg="gray.800"
                _hover={{ bg: "gray.700" }}
                isLoading={recordUsageMutation.isPending}
              >
                Записать
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Chemistry;
