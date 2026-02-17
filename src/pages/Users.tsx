import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Button,
  TableContainer,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { usersAPI } from '../services/api';

interface User {
  id: number;
  phone: string;
  name: string;
  role: 'CLIENT' | 'ADMIN' | 'OWNER';
  createdAt: string;
  bookingsCount: number;
}

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const tableBg = useColorModeValue('white', 'gray.800');

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
    })) ?? [];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CLIENT': return 'Клиент';
      case 'ADMIN': return 'Администратор';
      case 'OWNER': return 'Владелец';
      default: return role;
    }
  };

  const getRoleColorScheme = (role: string) => {
    switch (role) {
      case 'CLIENT': return 'gray';
      case 'ADMIN': return 'blue';
      case 'OWNER': return 'blackAlpha';
      default: return 'gray';
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
        <Heading size="lg" color="gray.800">Управление пользователями</Heading>
        <Button size="sm" colorScheme="gray" variant="outline" isDisabled title="В разработке">
          + Добавить администратора
        </Button>
      </HStack>

      <HStack spacing={4} mb={6}>
        <Input
          placeholder="Поиск по имени или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxW="320px"
          bg="white"
          borderColor="gray.300"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          maxW="200px"
          bg="white"
          borderColor="gray.300"
        >
          <option value="all">Все роли</option>
          <option value="CLIENT">Клиенты</option>
          <option value="ADMIN">Администраторы</option>
          <option value="OWNER">Владельцы</option>
        </Select>
      </HStack>

      {isLoading ? (
        <Box py={8}>Загрузка...</Box>
      ) : isError ? (
        <Box py={8} color="red.500">
          Ошибка загрузки данных. Убедитесь, что API сервер запущен.
        </Box>
      ) : (
        <TableContainer bg={tableBg} borderRadius="md" borderWidth="1px" borderColor="gray.200">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Имя</Th>
                <Th>Телефон</Th>
                <Th>Роль</Th>
                <Th>Дата регистрации</Th>
                <Th>Записей</Th>
                <Th>Действия</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredUsers.map((user) => (
                <Tr key={user.id}>
                  <Td fontWeight="medium">{user.name}</Td>
                  <Td>{user.phone}</Td>
                  <Td>
                    <Badge colorScheme={getRoleColorScheme(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </Td>
                  <Td>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</Td>
                  <Td>{user.bookingsCount}</Td>
                  <Td>
                    {user.role !== 'OWNER' && (
                      <HStack spacing={2}>
                        <Button size="xs" variant="outline" colorScheme="gray">
                          Изменить роль
                        </Button>
                        <Button size="xs" variant="outline" colorScheme="red">
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
    </Box>
  );
};

export default Users;
