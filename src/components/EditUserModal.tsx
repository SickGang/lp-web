import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  Select,
  Badge,
  Divider,
} from "@chakra-ui/react";
import { Trash2 } from "lucide-react";
import { usersAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientDepositPanel from "./ClientDepositPanel";
import AdminClientCarsPanel from "./AdminClientCarsPanel";
import {
  formatRuPhoneDisplay,
  isRuPhoneComplete,
  ruPhoneToE164,
} from "@/lib/ruPhoneMask";

export type EditUserTarget = {
  id: number;
  phone: string;
  name: string;
  role: "CLIENT" | "ADMIN" | "OWNER";
};

type NonOwnerRole = "CLIENT" | "ADMIN";

type Props = {
  user: EditUserTarget;
  currentUserId?: number;
  currentUserRole?: "CLIENT" | "ADMIN" | "OWNER";
  onClose: () => void;
  onSuccess: () => void;
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case "CLIENT":
      return "Клиент";
    case "ADMIN":
      return "Администратор";
    case "OWNER":
      return "Владелец";
    default:
      return role;
  }
};

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case "CLIENT":
      return { bg: "lp.input", color: "lp.textSecondary" };
    case "ADMIN":
      return { bg: "rgba(0, 136, 204, 0.2)", color: "#8bd9ff" };
    case "OWNER":
      return { bg: "rgba(255, 215, 0, 0.16)", color: "#ffe580" };
    default:
      return { bg: "lp.input", color: "lp.textSecondary" };
  }
};

const getAllowedNextRoles = (role: EditUserTarget["role"]): NonOwnerRole[] => {
  if (role === "CLIENT") return ["ADMIN"];
  if (role === "ADMIN") return ["CLIENT"];
  return ["CLIENT", "ADMIN"];
};

const EditUserModal = ({
  user,
  currentUserId,
  currentUserRole,
  onClose,
  onSuccess,
}: Props) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);
  const [phoneInput, setPhoneInput] = useState(
    user.phone !== "Не указан" ? formatRuPhoneDisplay(user.phone) : "",
  );
  const [role, setRole] = useState<NonOwnerRole>(
    user.role === "OWNER" ? "ADMIN" : user.role,
  );
  const [error, setError] = useState("");

  const isOwner = currentUserRole === "OWNER";
  const canEditRole = isOwner && user.role !== "OWNER";
  const canDelete =
    isOwner && user.role !== "OWNER" && user.id !== currentUserId;

  useEffect(() => {
    setName(user.name);
    setPhoneInput(user.phone !== "Не указан" ? formatRuPhoneDisplay(user.phone) : "");
    setRole(user.role === "OWNER" ? "ADMIN" : user.role);
    setError("");
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Укажите имя клиента");
      }

      const nextPhoneE164 =
        phoneInput.trim() === ""
          ? undefined
          : (() => {
              if (!isRuPhoneComplete(phoneInput)) {
                throw new Error("Введите полный номер телефона");
              }
              return ruPhoneToE164(phoneInput);
            })();

      const payload: { name?: string; phone?: string } = {};
      if (trimmedName !== user.name) payload.name = trimmedName;
      if (
        (nextPhoneE164 ?? undefined) !==
        (user.phone !== "Не указан" ? ruPhoneToE164(user.phone) : undefined)
      ) {
        payload.phone = nextPhoneE164;
      }

      const tasks: Promise<unknown>[] = [];
      if (Object.keys(payload).length > 0) {
        tasks.push(usersAPI.update(user.id, payload));
      }
      if (canEditRole && role !== user.role) {
        tasks.push(usersAPI.updateRole(user.id, role));
      }

      await Promise.all(tasks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      setError(extractError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersAPI.delete(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      setError(extractError(err));
    },
  });

  const hasProfileChanges =
    name.trim() !== user.name ||
    (phoneInput !== (user.phone !== "Не указан" ? formatRuPhoneDisplay(user.phone) : "")) ||
    (canEditRole && role !== user.role);

  const handleDelete = () => {
    const ok = window.confirm(
      `Удалить пользователя «${user.name}»? Это действие нельзя отменить.`,
    );
    if (!ok) return;
    deleteMutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} size={{ base: "full", md: "xl" }} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border" maxH="90vh">
        <ModalHeader color="lp.textPrimary">Редактирование клиента</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mb={4}>
            <Text fontSize="sm" color="lp.textMuted" mb={1}>
              Телефон
            </Text>
            <Input
              value={phoneInput}
              onChange={(e) => setPhoneInput(formatRuPhoneDisplay(e.target.value))}
              placeholder="+7 (999) 999-99-99"
            />
          </Box>

          <Box mb={4}>
            <Text fontSize="sm" color="lp.textMuted" mb={2}>
              ФИО
            </Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя клиента"
            />
          </Box>

          {canEditRole && (
            <Box mb={4}>
              <Text fontSize="sm" color="lp.textMuted" mb={2}>
                Роль
              </Text>
              <Box mb={2}>
                <Badge {...getRoleBadgeStyle(user.role)}>
                  Сейчас: {getRoleLabel(user.role)}
                </Badge>
              </Box>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as NonOwnerRole)}
                maxW="240px"
                disabled={saveMutation.isPending}
              >
                {getAllowedNextRoles(user.role).map((r) => (
                  <option key={r} value={r}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </Select>
            </Box>
          )}

          {user.role === "CLIENT" && (
            <>
              <Divider my={4} borderColor="lp.border" />
              <Text fontSize="md" fontWeight="semibold" color="lp.textPrimary" mb={3}>
                Автомобили
              </Text>
              <AdminClientCarsPanel userId={user.id} />

              <Divider my={4} borderColor="lp.border" />
              <Text fontSize="md" fontWeight="semibold" color="lp.textPrimary" mb={3}>
                Депозит
              </Text>
              <ClientDepositPanel
                userId={user.id}
                phone={user.phone !== "Не указан" ? user.phone : undefined}
                onUpdated={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
              />
            </>
          )}

          {canDelete && (
            <>
              <Divider my={4} borderColor="lp.border" />
              <Text fontSize="md" fontWeight="semibold" color="lp.textPrimary" mb={2}>
                Удаление
              </Text>
              <Button
                type="button"
                variant="outline"
                className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                <Trash2 size={14} strokeWidth={2} className="mr-1.5" />
                {deleteMutation.isPending ? "Удаление..." : "Удалить клиента"}
              </Button>
            </>
          )}

          {error && (
            <Text mt={4} fontSize="sm" color="lp.error">
              {error}
            </Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            className="mr-3"
            onClick={onClose}
            disabled={saveMutation.isPending || deleteMutation.isPending}
          >
            Закрыть
          </Button>
          <Button
            type="button"
            className="bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
            disabled={saveMutation.isPending || !hasProfileChanges}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
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

export default EditUserModal;
