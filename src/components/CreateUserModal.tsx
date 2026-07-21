import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  SimpleGrid,
} from "@chakra-ui/react";
import { usersAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatRuPhoneDisplay,
  isRuPhoneComplete,
  ruPhoneToE164,
} from "@/lib/ruPhoneMask";

type UserRole = "CLIENT" | "ADMIN" | "OWNER";

type FormState = {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  email: string;
};

const emptyForm = (): FormState => ({
  name: "",
  phone: "",
  password: "",
  role: "CLIENT",
  email: "",
});

type Props = {
  currentUserRole?: UserRole;
  onClose: () => void;
  onSuccess: () => void;
};

const getRoleLabel = (role: UserRole) => {
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

const CreateUserModal = ({ currentUserRole, onClose, onSuccess }: Props) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  const isOwner = currentUserRole === "OWNER";
  const roleOptions: UserRole[] = isOwner
    ? ["CLIENT", "ADMIN", "OWNER"]
    : ["CLIENT"];

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) {
        throw new Error("Укажите ФИО");
      }

      if (form.phone.trim() && !isRuPhoneComplete(form.phone)) {
        throw new Error("Введите полный номер телефона или оставьте поле пустым");
      }

      if (form.password.trim() && form.password.trim().length < 4) {
        throw new Error("Пароль должен быть не короче 4 символов");
      }

      const payload: Parameters<typeof usersAPI.create>[0] = {
        name,
        role: form.role,
      };

      if (form.phone.trim()) payload.phone = ruPhoneToE164(form.phone);
      if (form.password.trim()) payload.password = form.password.trim();
      if (form.email.trim()) payload.email = form.email.trim();

      return usersAPI.create(payload);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      setError(extractError(err));
    },
  });

  return (
    <Modal isOpen onClose={onClose} size={{ base: "full", md: "xl" }} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border" maxH="90vh">
        <ModalHeader color="lp.textPrimary">Новый пользователь</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text fontSize="sm" color="lp.textMuted" mb={4}>
            Обязательно только ФИО; остальные поля — по необходимости.
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={4}>
            <Box>
              <Text fontSize="xs" color="lp.textMuted" mb={1}>
                ФИО *
              </Text>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Иван Иванов"
              />
            </Box>
            <Box>
              <Text fontSize="xs" color="lp.textMuted" mb={1}>
                Роль
              </Text>
              <Select
                value={form.role}
                onChange={(e) => setField("role", e.target.value as UserRole)}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" color="lp.textMuted" mb={1}>
                Телефон
              </Text>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setField("phone", formatRuPhoneDisplay(e.target.value))
                }
                placeholder="+7 (___) ___-__-__"
              />
            </Box>
            <Box>
              <Text fontSize="xs" color="lp.textMuted" mb={1}>
                Пароль для входа
              </Text>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="Необязательно"
              />
            </Box>
            <Box gridColumn={{ md: "span 2" }}>
              <Text fontSize="xs" color="lp.textMuted" mb={1}>
                Email
              </Text>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Box>
          </SimpleGrid>

          {error && (
            <Text fontSize="sm" color="lp.error">
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
            disabled={createMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
            disabled={createMutation.isPending}
            onClick={() => {
              setError("");
              createMutation.mutate();
            }}
          >
            {createMutation.isPending ? "Создание..." : "Создать пользователя"}
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
    "Не удалось создать пользователя";
  return Array.isArray(msg) ? msg.join(", ") : String(msg);
}

export default CreateUserModal;
