import { useMemo, useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Switch,
  Text,
  VStack,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Badge,
} from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesAPI } from "../services/api";
import { Button } from "@/components/ui/button";

type ServiceItem = {
  id: number;
  name: string;
  description?: string;
  price: number; // kopeks
  duration: number;
  category: string;
  isActive: boolean;
};

type CategoryItem = {
  id: number;
  name: string;
  servicesCount: number;
};

const toRub = (kopeks: number) => (kopeks / 100).toLocaleString("ru-RU");

const ServicesPage = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const categoryModal = useDisclosure();

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    category: "",
    duration: "120",
    priceRub: "",
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    duration: "120",
    priceRub: "",
    isActive: true,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["services-admin"],
    queryFn: async () => {
      const res = await servicesAPI.getAll(true);
      return (res.data ?? []) as ServiceItem[];
    },
    retry: 1,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const res = await servicesAPI.getCategories();
      return (res.data ?? []) as CategoryItem[];
    },
    retry: 1,
  });

  const grouped = useMemo(() => {
    const items = data ?? [];
    return items.reduce<Record<string, ServiceItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [data]);

  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await servicesAPI.create({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        category: createForm.category.trim(),
        duration: parseInt(createForm.duration || "120", 10),
        price: Math.round(parseFloat(createForm.priceRub || "0") * 100),
        isActive: createForm.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-admin"] });
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      createModal.onClose();
      setCreateForm({
        name: "",
        description: "",
        category: "",
        duration: "120",
        priceRub: "",
        isActive: true,
      });
      toast({ title: "Услуга добавлена", status: "success" });
    },
    onError: (e: any) => {
      toast({ title: e?.response?.data?.message || "Ошибка добавления", status: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingService) return;
      await servicesAPI.update(editingService.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        category: editForm.category.trim(),
        duration: parseInt(editForm.duration || "120", 10),
        price: Math.round(parseFloat(editForm.priceRub || "0") * 100),
        isActive: editForm.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-admin"] });
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      editModal.onClose();
      setEditingService(null);
      toast({ title: "Услуга обновлена", status: "success" });
    },
    onError: (e: any) => {
      toast({ title: e?.response?.data?.message || "Ошибка обновления", status: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await servicesAPI.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-admin"] });
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast({ title: "Услуга удалена", status: "success" });
    },
    onError: (e: any) => {
      toast({ title: e?.response?.data?.message || "Ошибка удаления", status: "error" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      await servicesAPI.createCategory(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      categoryModal.onClose();
      toast({ title: "Категория добавлена", status: "success" });
    },
    onError: (e: any) => {
      toast({ title: e?.response?.data?.message || "Ошибка добавления категории", status: "error" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await servicesAPI.deleteCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast({ title: "Категория удалена", status: "success" });
    },
    onError: (e: any) => {
      toast({ title: e?.response?.data?.message || "Ошибка удаления категории", status: "error" });
    },
  });

  const openEdit = (s: ServiceItem) => {
    setEditingService(s);
    setEditForm({
      name: s.name,
      description: s.description ?? "",
      category: s.category,
      duration: String(s.duration),
      priceRub: String((s.price / 100).toFixed(0)),
      isActive: s.isActive,
    });
    editModal.onOpen();
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6} wrap="wrap" gap={4}>
        <Heading size="lg" color="lp.textPrimary">
          Услуги
        </Heading>
        <Button variant="outline" onClick={categoryModal.onOpen}>
          + Добавить категорию
        </Button>
      </HStack>

      {isLoading ? (
        <Text>Загрузка...</Text>
      ) : isError ? (
        <Text color="lp.error">Ошибка загрузки услуг</Text>
      ) : (
        <VStack align="stretch" spacing={5}>
          {categories.map((category) => {
            const items = grouped[category.name] ?? [];
            return (
            <Box key={category.id} bg="lp.surface" border="1px solid" borderColor="lp.border" borderRadius="16px" p={4}>
              <HStack justify="space-between" mb={3} align="center">
                <Heading size="sm">
                  {category.name}
                </Heading>
                <HStack>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      setCreateForm({
                        name: "",
                        description: "",
                        category: category.name,
                        duration: "120",
                        priceRub: "",
                        isActive: true,
                      });
                      createModal.onOpen();
                    }}
                  >
                    +
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10"
                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                    title="Удалить категорию"
                  >
                    🗑
                  </Button>
                </HStack>
              </HStack>
              <VStack align="stretch" spacing={3}>
                {items.length === 0 ? (
                  <Text color="lp.textMuted" fontSize="sm">Нет услуг в этой категории</Text>
                ) : null}
                {items.map((s) => (
                  <Grid
                    key={s.id}
                    templateColumns={{ base: "1fr", md: "2fr 1fr auto" }}
                    gap={3}
                    p={3}
                    bg="lp.input"
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="lp.border"
                  >
                    <Box>
                      <HStack mb={1} wrap="wrap">
                        <Text fontWeight="600">{s.name}</Text>
                        <Badge bg={s.isActive ? "rgba(76,175,80,0.2)" : "rgba(255,59,48,0.2)"} color={s.isActive ? "#8fe39a" : "#ffb4ac"}>
                          {s.isActive ? "Включена" : "Выключена"}
                        </Badge>
                      </HStack>
                      {s.description ? <Text color="lp.textSecondary" fontSize="sm">{s.description}</Text> : null}
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="lp.textSecondary">Цена: {toRub(s.price)} ₽</Text>
                      <Text fontSize="sm" color="lp.textSecondary">Длительность: {s.duration} мин</Text>
                    </Box>
                    <HStack justifySelf={{ base: "start", md: "end" }}>
                      <Button size="xs" variant="outline" onClick={() => openEdit(s)}>Изменить</Button>
                      <Button size="xs" variant="outline" className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10" onClick={() => deleteMutation.mutate(s.id)}>
                        Удалить
                      </Button>
                    </HStack>
                  </Grid>
                ))}
              </VStack>
            </Box>
          );
          })}
        </VStack>
      )}

      <Modal isOpen={categoryModal.isOpen} onClose={categoryModal.onClose} size={{ base: "full", md: "md" }}>
        <ModalOverlay />
        <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border">
          <ModalHeader>Новая категория</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>Название категории</FormLabel>
              <Input
                placeholder="Например: Сервисная мойка"
                value={createForm.category}
                onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" className="mr-3" onClick={categoryModal.onClose}>Отмена</Button>
            <Button onClick={() => createCategoryMutation.mutate(createForm.category.trim())} disabled={createCategoryMutation.isPending}>
              Создать
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} size={{ base: "full", md: "md" }}>
        <ModalOverlay />
        <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border">
          <ModalHeader>Новая услуга</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl isRequired>
                <FormLabel>Название</FormLabel>
                <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Описание</FormLabel>
                <Input value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Категория (блок)</FormLabel>
                <Input
                  placeholder="Например: Полировка или Сервисная мойка"
                  value={createForm.category}
                  onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
                />
              </FormControl>
              <HStack>
                <FormControl isRequired>
                  <FormLabel>Цена, ₽</FormLabel>
                  <Input type="number" min={0} value={createForm.priceRub} onChange={(e) => setCreateForm((p) => ({ ...p, priceRub: e.target.value }))} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Длительность, мин</FormLabel>
                  <Input type="number" min={1} value={createForm.duration} onChange={(e) => setCreateForm((p) => ({ ...p, duration: e.target.value }))} />
                </FormControl>
              </HStack>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Активна</FormLabel>
                <Switch isChecked={createForm.isActive} onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" className="mr-3" onClick={createModal.onClose}>Отмена</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Сохранить</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} size={{ base: "full", md: "md" }}>
        <ModalOverlay />
        <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border">
          <ModalHeader>Редактирование услуги</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl isRequired>
                <FormLabel>Название</FormLabel>
                <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Описание</FormLabel>
                <Input value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Категория (блок)</FormLabel>
                <Input
                  placeholder="Например: Полировка или Сервисная мойка"
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                />
              </FormControl>
              <HStack>
                <FormControl isRequired>
                  <FormLabel>Цена, ₽</FormLabel>
                  <Input type="number" min={0} value={editForm.priceRub} onChange={(e) => setEditForm((p) => ({ ...p, priceRub: e.target.value }))} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Длительность, мин</FormLabel>
                  <Input type="number" min={1} value={editForm.duration} onChange={(e) => setEditForm((p) => ({ ...p, duration: e.target.value }))} />
                </FormControl>
              </HStack>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Активна</FormLabel>
                <Switch isChecked={editForm.isActive} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" className="mr-3" onClick={editModal.onClose}>Отмена</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>Сохранить</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ServicesPage;
