import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  Stack,
} from '@chakra-ui/react';
import { adminAPI } from '../services/api';

interface ApiBooking {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  user: { name?: string; phone?: string };
  car?: { brand: string; model: string };
  services?: Array<{ service?: { name?: string } }>;
}

const Dashboard = () => {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await adminAPI.getDashboardStats();
      return response.data;
    },
    retry: 1,
  });

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    isError: bookingsError,
  } = useQuery({
    queryKey: ['upcoming-bookings'],
    queryFn: async () => {
      const response = await adminAPI.getUpcomingBookings(10);
      return response.data;
    },
    retry: 1,
  });

  const rawBookings = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData as { data?: ApiBooking[] })?.data ?? [];
  // Время в UTC, как в БД (без сдвига по часовому поясу браузера)
  const formatTimeUtc = (isoString: string) => {
    const d = new Date(isoString);
    return d.toISOString().slice(11, 16);
  };
  const upcomingBookings = rawBookings.map((booking: ApiBooking) => ({
    id: booking.id,
    time: formatTimeUtc(booking.startTime),
    client: booking.user?.name || booking.user?.phone || '—',
    phone: booking.user?.phone || '—',
    car: booking.car
      ? `${booking.car.brand} ${booking.car.model}`
      : 'Не указан',
    services: (booking.services ?? [])
      .map((s) => s?.service?.name)
      .filter(Boolean)
      .join(', ') || '—',
  }));

  if (statsLoading || bookingsLoading) {
    return (
      <Box>
        <Heading size="lg" mb={4}>Загрузка...</Heading>
      </Box>
    );
  }

  if (statsError || bookingsError) {
    return (
      <Box>
        <Heading size="lg" mb={2}>Ошибка загрузки данных</Heading>
        <Text color="lp.textSecondary">Убедитесь, что API сервер запущен.</Text>
      </Box>
    );
  }

  const statCards = [
    { label: 'Записей сегодня', value: stats?.todayBookings ?? 0, icon: '📅' },
    { label: 'Записей на неделю', value: stats?.weekBookings ?? 0, icon: '📊' },
    {
      label: 'Доход за месяц',
      value: `${((stats?.monthRevenue ?? 0) / 100).toLocaleString('ru-RU')} ₽`,
      icon: '💰',
    },
    { label: 'Активных клиентов', value: stats?.activeClients ?? 0, icon: '👥' },
  ];

  return (
    <Box>
      <Heading size="lg" mb={1} color="lp.textPrimary">Дашборд</Heading>
      <Text color="lp.textSecondary" fontSize="sm" mb={6}>
        {format(new Date(), 'd MMMM yyyy, EEEE', { locale: ru })}
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
        {statCards.map(({ label, value, icon }) => (
          <Card key={label}>
            <CardBody>
              <Text fontSize="2xl" mb={1}>{icon}</Text>
              <Text fontSize="2xl" fontWeight="bold" color="lp.textPrimary">{value}</Text>
              <Text fontSize="sm" color="lp.textSecondary">{label}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <Heading size="md" mb={4} color="lp.textPrimary">Ближайшие записи</Heading>
      <VStack align="stretch" spacing={3}>
        {upcomingBookings.map((booking) => (
          <Card key={booking.id}>
            <CardBody py={3} px={4}>
              <Stack direction={{ base: 'column', md: 'row' }} align={{ base: 'flex-start', md: 'center' }} gap={4}>
                <Text
                  fontWeight="bold"
                  minW="48px"
                  color="lp.textPrimary"
                  fontSize="lg"
                >
                  {booking.time}
                </Text>
                <Box flex={1}>
                  <Text fontWeight="semibold" color="lp.textPrimary">{booking.client}</Text>
                  <Text fontSize="sm" color="lp.textSecondary">{booking.phone}</Text>
                </Box>
                <Text fontSize="sm" color="lp.textSecondary">{booking.car}</Text>
                <Text fontSize="sm" color="lp.textMuted">{booking.services}</Text>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </VStack>
    </Box>
  );
};

export default Dashboard;
