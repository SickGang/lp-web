import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Heading,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  TableContainer,
  HStack,
  Stack,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  useDisclosure,
} from '@chakra-ui/react';
import { Trash2, UserPlus } from 'lucide-react';
import { usersAPI } from '../services/api';
import ClientDepositModal from '../components/ClientDepositModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: number;
  phone: string;
  name: string;
  role: 'CLIENT' | 'ADMIN' | 'OWNER';
  createdAt: string;
  bookingsCount: number;
  depositBalance: number;
}

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  type NonOwnerRole = 'CLIENT' | 'ADMIN';
  const getOtherRole = (role: User['role']): NonOwnerRole =>
    role === 'CLIENT' ? 'ADMIN' : 'CLIENT';
  const getAllowedNextRoles = (role: User['role']): NonOwnerRole[] => {
    if (role === 'CLIENT') return ['ADMIN'];
    if (role === 'ADMIN') return ['CLIENT'];
    return ['CLIENT', 'ADMIN'];
  };

  const roleModal = useDisclosure();
  const [roleTargetUser, setRoleTargetUser] = useState<User | null>(null);
  const [nextRole, setNextRole] = useState<NonOwnerRole>('ADMIN');
  const [depositTarget, setDepositTarget] = useState<User | null>(null);

  const { data: usersData, isLoading, isError } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const response = await usersAPI.getAll(roleFilter === 'all' ? undefined : roleFilter);
      return response.data;
    },
    retry: 1,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { id: number; nextRole: User['role'] }) => {
      return usersAPI.updateRole(payload.id, payload.nextRole);
    },
    onSuccess: () => {
      // Обновляем список после смены роли
      queryClient.invalidateQueries({ queryKey: ['users'] });
      roleModal.onClose();
      setRoleTargetUser(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ??
        (err as Error)?.message ??
        'Не удалось обновить роль';
      window.alert(Array.isArray(msg) ? msg.join(', ') : String(msg));
    },
  });

  const users: User[] =
    usersData?.map((user: any) => ({
      id: user.id,
      phone: user.phone || 'Не указан',
      name: user.name || user.firstName || 'Без имени',
      role: user.role,
      createdAt: user.createdAt,
      bookingsCount: user._count?.bookings || 0,
      depositBalance: user.clientAccount?.balance ?? 0,
    })) ?? [];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CLIENT': return 'Клиент';
      case 'ADMIN': return 'Администратор';
      case 'OWNER': return 'Владелец';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'CLIENT':
        return { bg: 'lp.input', color: 'lp.textSecondary' };
      case 'ADMIN':
        return { bg: 'rgba(0, 136, 204, 0.2)', color: '#8bd9ff' };
      case 'OWNER':
        return { bg: 'rgba(255, 215, 0, 0.16)', color: '#ffe580' };
      default:
        return { bg: 'lp.input', color: 'lp.textSecondary' };
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Box>
      <HStack justify="space-between" mb={6} wrap="wrap" gap={4}>
        <Heading size="lg" color="lp.textPrimary">Управление пользователями</Heading>
        <Button size="sm" variant="outline" disabled title="В разработке">
          <UserPlus size={16} strokeWidth={2} className="mr-2" />
          Добавить администратора
        </Button>
      </HStack>

      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} mb={6}>
        <Input
          placeholder="Поиск по имени или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxW={{ base: '100%', md: '320px' }}
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          maxW={{ base: '100%', md: '200px' }}
        >
          <option value="all">Все роли</option>
          <option value="CLIENT">Клиенты</option>
          <option value="ADMIN">Администраторы</option>
          <option value="OWNER">Владельцы</option>
        </Select>
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
          <Table size="sm" minW="760px">
            <Thead bg="lp.input">
              <Tr>
                <Th color="lp.textMuted">Имя</Th>
                <Th color="lp.textMuted">Телефон</Th>
                <Th color="lp.textMuted">Роль</Th>
                <Th color="lp.textMuted">Дата регистрации</Th>
                <Th color="lp.textMuted">Записей</Th>
                <Th color="lp.textMuted">Депозит</Th>
                <Th color="lp.textMuted">Действия</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredUsers.map((user) => (
                <Tr key={user.id}>
                  <Td fontWeight="medium" color="lp.textPrimary">{user.name}</Td>
                  <Td color="lp.textSecondary">{user.phone}</Td>
                  <Td>
                    <Badge {...getRoleBadgeStyle(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </Td>
                  <Td color="lp.textSecondary">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</Td>
                  <Td color="lp.textSecondary">{user.bookingsCount}</Td>
                  <Td color="lp.textSecondary">
                    {user.role === 'CLIENT'
                      ? `${(user.depositBalance / 100).toLocaleString('ru-RU')} ₽`
                      : '—'}
                  </Td>
                  <Td>
                    {user.role !== 'OWNER' && (
                      <HStack spacing={2}>
                        {user.role === 'CLIENT' && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="border-[#D9E57F] text-[#D9E57F] hover:bg-[#D9E57F]/10"
                            onClick={() => setDepositTarget(user)}
                          >
                            Депозит
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-[#D9E57F] text-[#D9E57F] hover:bg-[#D9E57F]/10"
                          disabled={currentUser?.role !== 'OWNER' || updateRoleMutation.isPending}
                          onClick={() => {
                            setRoleTargetUser(user);
                            setNextRole(getOtherRole(user.role));
                            roleModal.onOpen();
                          }}
                        >
                          Изменить роль
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10"
                        >
                          <Trash2 size={14} strokeWidth={2} className="mr-1.5" />
                          Удалить
                        </Button>
                      </HStack>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      <Modal
        isOpen={roleModal.isOpen}
        onClose={() => {
          roleModal.onClose();
          setRoleTargetUser(null);
        }}
        size={{ base: 'full', md: 'md' }}
      >
        <ModalOverlay />
        <ModalContent bg="lp.surface" border="1px solid" borderColor="lp.border">
          <ModalHeader>Изменение роли</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Box>
                <Text fontWeight="600" color="lp.textPrimary">
                  {roleTargetUser ? roleTargetUser.name : '—'}
                </Text>
                <Text fontSize="sm" color="lp.textSecondary">
                  {roleTargetUser ? roleTargetUser.phone : ''}
                </Text>
              </Box>

              {roleTargetUser && (
                <Box>
                  <Text fontSize="sm" color="lp.textMuted" mb={2}>
                    Текущая роль
                  </Text>
                  <Badge {...getRoleBadgeStyle(roleTargetUser.role)}>
                    {getRoleLabel(roleTargetUser.role)}
                  </Badge>
                </Box>
              )}

              <Box>
                <Text fontSize="sm" color="lp.textMuted" mb={2}>
                  Новая роль
                </Text>
                <Select
                  value={nextRole}
                  onChange={(e) => setNextRole(e.target.value as NonOwnerRole)}
                  disabled={updateRoleMutation.isPending}
                  maxW="240px"
                >
                  {getAllowedNextRoles(roleTargetUser?.role ?? 'CLIENT').map((r) => (
                    <option key={r} value={r}>
                      {getRoleLabel(r)}
                    </option>
                  ))}
                </Select>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              className="mr-3"
              onClick={() => {
                roleModal.onClose();
                setRoleTargetUser(null);
              }}
              disabled={updateRoleMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!roleTargetUser) return;
                if (roleTargetUser.role === nextRole) return;

                const ok = window.confirm(
                  `Изменить роль на "${getRoleLabel(nextRole)}"?`,
                );
                if (!ok) return;

                updateRoleMutation.mutate({
                  id: roleTargetUser.id,
                  nextRole,
                });
              }}
              disabled={
                updateRoleMutation.isPending ||
                !roleTargetUser ||
                roleTargetUser.role === nextRole
              }
            >
              {updateRoleMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {depositTarget && (
        <ClientDepositModal
          userId={depositTarget.id}
          phone={
            depositTarget.phone !== 'Не указан'
              ? depositTarget.phone
              : undefined
          }
          clientName={depositTarget.name}
          onClose={() => setDepositTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </Box>
  );
};

export default Users;
