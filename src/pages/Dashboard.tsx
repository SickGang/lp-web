import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Box,
  Button,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  Stack,
} from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Calendar, RussianRuble, Users } from 'lucide-react';
import { adminAPI, bookingsAPI } from '../services/api';

interface ApiBooking {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string | null;
  carDisplay?: string | null;
  user: { name?: string; phone?: string };
  car?: { brand: string; model: string };
  selectedServices?: Array<{ service?: { name?: string } }>;
}

const Dashboard = () => {
  const queryClient = useQueryClient();
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
      const response = await adminAPI.getUpcomingBookings();
      return response.data;
    },
    retry: 1,
  });

  const confirmBookingMutation = useMutation({
    mutationFn: async (id: number) => bookingsAPI.updateStatus(id, 'confirmed'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: number) => bookingsAPI.cancel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleCancelBooking = async (bookingId: number) => {
    const isConfirmed = window.confirm('Удалить эту запись?');
    if (!isConfirmed) return;

    try {
      await cancelBookingMutation.mutateAsync(bookingId);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      window.alert('Не удалось удалить запись. Попробуйте снова.');
    }
  };

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
    status: booking.status,
    time: formatTimeUtc(booking.startTime),
    client: booking.user?.name || booking.user?.phone || '—',
    phone: booking.user?.phone || '—',
    car: booking.carDisplay
      ? booking.carDisplay
      : booking.car
      ? `${booking.car.brand} ${booking.car.model}`
      : 'Не указан',
    services: (booking.selectedServices ?? [])
      .map((s) => s?.service?.name)
      .filter(Boolean)
      .join(', ') || '—',
    notes: booking.notes?.trim() || '',
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

  const statCards: {
    label: string;
    value: string | number;
    icon: LucideIcon;
  }[] = [
    { label: 'Записей сегодня', value: stats?.todayBookings ?? 0, icon: Calendar },
    { label: 'Записей на неделю', value: stats?.weekBookings ?? 0, icon: BarChart3 },
    {
      label: 'Доход за месяц',
      value: `${((stats?.monthRevenue ?? 0) / 100).toLocaleString('ru-RU')} ₽`,
      icon: RussianRuble,
    },
    { label: 'Активных клиентов', value: stats?.activeClients ?? 0, icon: Users },
  ];

  return (
    <Box>
      <Heading size="lg" mb={1} color="lp.textPrimary">Дашборд</Heading>
      <Text color="lp.textSecondary" fontSize="sm" mb={6}>
        {format(new Date(), 'd MMMM yyyy, EEEE', { locale: ru })}
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardBody>
              <Box mb={2} color="lp.textSecondary">
                <Icon size={28} strokeWidth={1.75} aria-hidden />
              </Box>
              <Text fontSize="2xl" fontWeight="bold" color="lp.textPrimary">{value}</Text>
              <Text fontSize="sm" color="lp.textSecondary">{label}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <Heading size="md" mb={4} color="lp.textPrimary">Ближайшие активные записи</Heading>
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
                  <Text mt={1} fontSize="sm" color="lp.textSecondary">{booking.car}</Text>
                  <Text mt={1} fontSize="sm" color="lp.textMuted">Услуги: {booking.services}</Text>
                  <Text mt={1} fontSize="sm" color="lp.textSecondary">
                    Статус: {booking.status === 'pending' ? 'В ожидании' : booking.status === 'confirmed' ? 'Подтверждено' : booking.status}
                  </Text>
                  {booking.notes && (
                    <Text mt={1} fontSize="sm" color="lp.textMuted">
                      Комментарий: {booking.notes}
                    </Text>
                  )}
                </Box>
                <Stack direction={{ base: 'column', md: 'row' }} spacing={2}>
                  {booking.status === 'pending' && (
                    <Button
                      size="sm"
                      className="w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                      onClick={() => confirmBookingMutation.mutate(booking.id)}
                      isLoading={confirmBookingMutation.isPending}
                    >
                      {confirmBookingMutation.isPending ? 'Подтверждение...' : 'Подтвердить'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10 sm:w-auto"
                    onClick={() => handleCancelBooking(booking.id)}
                    isLoading={cancelBookingMutation.isPending}
                  >
                    {cancelBookingMutation.isPending ? 'Удаление...' : 'Удалить'}
                  </Button>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </VStack>
    </Box>
  );
};

export default Dashboard;
