import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
} from '@chakra-ui/react';
import { UserPlus } from 'lucide-react';
import { usersAPI } from '../services/api';
import EditUserModal, { type EditUserTarget } from '../components/EditUserModal';
import CreateUserModal from '../components/CreateUserModal';
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
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const canManageUsers =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER';

  const { data: usersData, isLoading, isError } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const response = await usersAPI.getAll(roleFilter === 'all' ? undefined : roleFilter);
      return response.data;
    },
    retry: 1,
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

  const toEditTarget = (user: User): EditUserTarget => ({
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
  });

  return (
    <Box>
      <HStack justify="space-between" mb={6} wrap="wrap" gap={4}>
        <Heading size="lg" color="lp.textPrimary">Управление пользователями</Heading>
        <Button
          size="sm"
          variant="outline"
          className="border-[#D9E57F] text-[#D9E57F] hover:bg-[#D9E57F]/10"
          disabled={!canManageUsers}
          onClick={() => setShowCreateModal(true)}
        >
          <UserPlus size={16} strokeWidth={2} className="mr-2" />
          Добавить пользователя
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
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-[#D9E57F] text-[#D9E57F] hover:bg-[#D9E57F]/10"
                        onClick={() => setEditTarget(user)}
                      >
                        Редактировать
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {editTarget && (
        <EditUserModal
          user={toEditTarget(editTarget)}
          currentUserId={currentUser?.id}
          currentUserRole={currentUser?.role}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}

      {showCreateModal && (
        <CreateUserModal
          currentUserRole={currentUser?.role}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </Box>
  );
};

export default Users;
