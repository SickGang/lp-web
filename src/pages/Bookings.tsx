import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Box,
  Heading,
  Text,
  Button,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { adminAPI } from '../services/api';

interface TimeSlot {
  time: string;
  booking?: {
    id: number;
    client: string;
    car: string;
    services: string;
    phone: string;
  };
}

const Bookings = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const cardBg = useColorModeValue('white', 'gray.800');
  const freeBorder = useColorModeValue('gray.200', 'gray.600');
  const bookedBorder = useColorModeValue('gray.400', 'gray.500');

  const { data: bookingsData, isLoading, isError } = useQuery({
    queryKey: ['bookings-by-date', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await adminAPI.getBookingsByDate(format(selectedDate, 'yyyy-MM-dd'));
      return response.data;
    },
    retry: 1,
  });

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00'];
    const raw = bookingsData;
    const bookings = Array.isArray(raw)
      ? raw
      : (raw as { data?: any[] })?.data ?? (raw as { bookings?: any[] })?.bookings ?? [];

    const getTimeUtc = (isoString: string) => new Date(isoString).toISOString().slice(11, 16);

    times.forEach((time) => {
      const booking = bookings.find((b: any) => {
        if (!b?.startTime) return false;
        const bookingTime = getTimeUtc(b.startTime);
        return bookingTime === time;
      });

      if (booking) {
        const user = booking.user ?? {};
        const services = (booking.services ?? booking.selectedServices ?? [])
          .map((s: any) => s?.service?.name ?? s?.name)
          .filter(Boolean)
          .join(', ');
        slots.push({
          time,
          booking: {
            id: booking.id,
            client: user.name || user.firstName || user.phone || '—',
            car: booking.car
              ? `${booking.car.brand} ${booking.car.model}`
              : 'Не указан',
            services: services || '—',
            phone: user.phone || '—',
          },
        });
      } else {
        slots.push({ time });
      }
    });
    return slots;
  };

  const timeSlots = isLoading ? [] : generateTimeSlots();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  return (
    <Box>
      <Heading size="lg" mb={6} color="gray.800">Записи на мойку</Heading>

      <SimpleGrid columns={{ base: 4, md: 7 }} spacing={3} mb={8}>
        {dates.map((date) => {
          const isSelected =
            format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          return (
            <Button
              key={date.toISOString()}
              variant={isSelected ? 'solid' : 'outline'}
              colorScheme="gray"
              size="sm"
              py={4}
              flexDirection="column"
              onClick={() => setSelectedDate(date)}
            >
              <Text fontSize="xs">{format(date, 'EEE', { locale: ru })}</Text>
              <Text fontWeight="bold">{format(date, 'd')}</Text>
              <Text fontSize="xs">{format(date, 'MMM', { locale: ru })}</Text>
            </Button>
          );
        })}
      </SimpleGrid>

      <Heading size="md" mb={4} color="gray.700">
        Слоты на {format(selectedDate, 'd MMMM', { locale: ru })}
      </Heading>

      {isLoading ? (
        <Text>Загрузка...</Text>
      ) : isError ? (
        <Text color="red.500">Ошибка загрузки данных. Убедитесь, что API сервер запущен.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {timeSlots.map((slot) => (
            <Box
              key={slot.time}
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor={slot.booking ? bookedBorder : freeBorder}
              bg={cardBg}
            >
              <Text fontWeight="bold" mb={3}>{slot.time}</Text>
              {slot.booking ? (
                <Box fontSize="sm">
                  <Text fontWeight="semibold">{slot.booking.client}</Text>
                  <Text color="gray.600">{slot.booking.phone}</Text>
                  <Text color="gray.600">{slot.booking.car}</Text>
                  <Text color="gray.500" mb={2}>{slot.booking.services}</Text>
                  <Button size="xs" colorScheme="red" variant="outline">
                    Отменить
                  </Button>
                </Box>
              ) : (
                <Text color="gray.500">Свободно</Text>
              )}
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default Bookings;
