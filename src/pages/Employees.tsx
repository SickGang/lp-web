import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  TableContainer,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Trash2, UserPlus } from "lucide-react";
import { adminAPI } from "../services/api";
import { Button } from "@/components/ui/button";

type Employee = {
  id: number;
  name: string;
  createdAt: string;
};

const Employees = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: employees = [], isLoading, isError } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await adminAPI.getEmployees();
      return res.data as Employee[];
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      return adminAPI.createEmployee(payload);
    },
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ??
        (err as Error)?.message ??
        "Не удалось добавить сотрудника";
      window.alert(Array.isArray(msg) ? msg.join(", ") : String(msg));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => adminAPI.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return (
    <Box>
      <HStack justify="space-between" mb={6} wrap="wrap" gap={4}>
        <Heading size="lg" color="lp.textPrimary">
          Сотрудники
        </Heading>
        <Button size="sm" variant="outline" className="opacity-70" disabled>
          <UserPlus size={16} strokeWidth={2} className="mr-2" />
          Управление
        </Button>
      </HStack>

      <Stack direction={{ base: "column", md: "row" }} spacing={4} mb={6}>
        <Input
          placeholder="Имя сотрудника"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxW={{ base: "100%", md: "360px" }}
        />
        <Button
          size="sm"
          variant="default"
          className="bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
          disabled={createMutation.isPending || !name.trim()}
          onClick={() => createMutation.mutate({ name })}
        >
          Добавить
        </Button>
      </Stack>

      {isLoading ? (
        <Box py={8}>Загрузка...</Box>
      ) : isError ? (
        <Box py={8} color="lp.error">
          Ошибка загрузки данных. Убедитесь, что API сервер запущен.
        </Box>
      ) : (
        <TableContainer
          bg="lp.surface"
          borderRadius="16px"
          borderWidth="1px"
          borderColor="lp.border"
          overflowX="auto"
        >
          <Table size="sm" minW="520px">
            <Thead bg="lp.input">
              <Tr>
                <Th color="lp.textMuted">Имя</Th>
                <Th color="lp.textMuted">Дата добавления</Th>
                <Th color="lp.textMuted">Действия</Th>
              </Tr>
            </Thead>
            <Tbody>
              {employees.map((e) => (
                <Tr key={e.id}>
                  <Td fontWeight="medium" color="lp.textPrimary">
                    {e.name}
                  </Td>
                  <Td color="lp.textSecondary">
                    {new Date(e.createdAt).toLocaleDateString("ru-RU")}
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          const ok = window.confirm(
                            `Удалить сотрудника "${e.name}"? Назначение на существующие записи будет снято.`,
                          );
                          if (!ok) return;
                          deleteMutation.mutate(e.id);
                        }}
                      >
                        <Trash2 size={14} strokeWidth={2} className="mr-1.5" />
                        Удалить
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}
              {employees.length === 0 && (
                <Tr>
                  <Td colSpan={3}>
                    <Text color="lp.textSecondary" py={6}>
                      Сотрудников пока нет
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Employees;

