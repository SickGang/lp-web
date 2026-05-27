import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminAPI, bookingsAPI } from '../services/api';
import AdminCreateBookingModal from '@/components/AdminCreateBookingModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface TimeSlot {
  startTime: string;
  endTime: string;
  booking?: {
    id: number;
    status: string;
    client: string;
    car: string;
    services: string;
    phone: string;
    notes?: string;
  };
}

const SLOTS_2H: Array<{ startTime: string; endTime: string }> = [
  { startTime: '09:00', endTime: '11:00' },
  { startTime: '11:00', endTime: '13:00' },
  { startTime: '13:00', endTime: '15:00' },
  { startTime: '15:00', endTime: '17:00' },
  { startTime: '17:00', endTime: '19:00' },
  { startTime: '19:00', endTime: '21:00' },
];

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const intervalsOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && e1 > s2;
};

const Bookings = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [createSlot, setCreateSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const queryClient = useQueryClient();
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: bookingsData, isLoading, isError } = useQuery({
    queryKey: ['bookings-by-date', dateKey],
    queryFn: async () => {
      const response = await adminAPI.getBookingsByDate(dateKey);
      return response.data;
    },
    retry: 1,
  });

  const generateTimeSlots = (): TimeSlot[] => {
    const raw = bookingsData;
    const bookings = Array.isArray(raw)
      ? raw
      : (raw as { data?: any[] })?.data ?? (raw as { bookings?: any[] })?.bookings ?? [];

    const getTimeUtc = (isoString: string) => new Date(isoString).toISOString().slice(11, 16);
    return SLOTS_2H.map((slot) => {
      const booking = bookings.find((b: any) => {
        if (!b?.startTime || !b?.endTime) return false;
        const bookingStart = getTimeUtc(b.startTime);
        const bookingEnd = getTimeUtc(b.endTime);
        return intervalsOverlap(slot.startTime, slot.endTime, bookingStart, bookingEnd);
      });

      if (!booking) {
        return { startTime: slot.startTime, endTime: slot.endTime };
      }

      const user = booking.user ?? {};
      const services = (booking.services ?? booking.selectedServices ?? [])
        .map((s: any) => s?.service?.name ?? s?.name)
        .filter(Boolean)
        .join(', ');

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        booking: {
          id: booking.id,
          status: booking.status || "pending",
          client: user.name || user.firstName || user.phone || '—',
          car: booking.car
            ? `${booking.car.brand} ${booking.car.model}`
            : 'Не указан',
          services: services || '—',
          phone: user.phone || '—',
          notes: typeof booking.notes === 'string' ? booking.notes.trim() : '',
        },
      };
    });
  };

  const timeSlots = isLoading ? [] : generateTimeSlots();

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: number) => bookingsAPI.cancel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['bookings-by-date', dateKey],
      });
    },
  });

  const confirmBookingMutation = useMutation({
    mutationFn: async (id: number) => bookingsAPI.updateStatus(id, "confirmed"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['bookings-by-date', dateKey],
      });
    },
  });

  const invalidateBookings = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings-by-date', dateKey] });
  };

  const handleCancelBooking = async (bookingId: number) => {
    const isConfirmed = window.confirm('Отменить это бронирование?');
    if (!isConfirmed) return;

    try {
      await cancelBookingMutation.mutateAsync(bookingId);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      window.alert('Не удалось отменить бронирование. Попробуйте снова.');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-4xl font-bold text-white">Записи на мойку</h1>

      <Card className="mb-8 w-fit border-[#3A3A3C] bg-[#2C2C2E]">
        <CardContent className="p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setCalendarMonth(date);
              }
            }}
            className="rounded-md"
          />
        </CardContent>
      </Card>

      <h2 className="mb-4 text-3xl font-semibold text-white">
        Слоты на {format(selectedDate, 'd MMMM', { locale: ru })}
      </h2>

      {isLoading ? (
        <p className="text-[#CCCCCC]">Загрузка...</p>
      ) : isError ? (
        <p className="text-[#FF3B30]">Ошибка загрузки данных. Убедитесь, что API сервер запущен.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {timeSlots.map((slot) => (
            <Card
              key={slot.startTime}
              role={!slot.booking ? 'button' : undefined}
              tabIndex={!slot.booking ? 0 : undefined}
              onClick={() => {
                if (!slot.booking) {
                  setCreateSlot({ startTime: slot.startTime, endTime: slot.endTime });
                }
              }}
              onKeyDown={(e) => {
                if (!slot.booking && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setCreateSlot({ startTime: slot.startTime, endTime: slot.endTime });
                }
              }}
              className={cn(
                'rounded-2xl border bg-[#2C2C2E]',
                slot.booking ? 'border-[#8E8E93]' : 'cursor-pointer border-[#3A3A3C] hover:border-[#D9E57F]/50',
              )}
            >
              <CardContent className="p-4">
                <p className="mb-3 text-xl font-bold text-white">{slot.startTime} - {slot.endTime}</p>
                {slot.booking ? (
                  <div className="text-sm">
                    <p className="font-semibold text-white">{slot.booking.client}</p>
                    <p className="text-[#CCCCCC]">{slot.booking.phone}</p>
                    <p className="text-[#CCCCCC]">{slot.booking.car}</p>
                    <p className="mb-2 text-[#8E8E93]">{slot.booking.services}</p>
                    {slot.booking.notes && (
                      <p className="mb-2 text-[#B0B0B0]">Комментарий: {slot.booking.notes}</p>
                    )}
                    <p className="mb-2 text-[#CCCCCC]">
                      Статус: {slot.booking.status === "confirmed" ? "Подтверждено" : slot.booking.status === "pending" ? "В ожидании" : slot.booking.status}
                    </p>
                    {slot.booking.status === "pending" && (
                      <Button
                        size="sm"
                        className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                        onClick={() => confirmBookingMutation.mutate(slot.booking!.id)}
                        disabled={confirmBookingMutation.isPending}
                      >
                        {confirmBookingMutation.isPending ? 'Подтверждение...' : 'Подтвердить'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10 sm:w-auto"
                      onClick={() => handleCancelBooking(slot.booking!.id)}
                      disabled={cancelBookingMutation.isPending}
                    >
                      {cancelBookingMutation.isPending ? 'Отмена...' : 'Отменить'}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-[#4CAF50]">Свободно</p>
                    <p className="mt-2 text-sm text-[#8E8E93]">Нажмите, чтобы записать</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {createSlot && (
        <AdminCreateBookingModal
          date={dateKey}
          slotStart={createSlot.startTime}
          slotEnd={createSlot.endTime}
          onClose={() => setCreateSlot(null)}
          onSuccess={invalidateBookings}
        />
      )}
    </div>
  );
};

export default Bookings;
