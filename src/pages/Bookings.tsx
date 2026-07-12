import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { addDays, format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminAPI, bookingsAPI } from '../services/api';
import AdminCreateBookingModal from '@/components/AdminCreateBookingModal';
import CloseOrderModal from '@/components/CloseOrderModal';
import ClientDepositModal from '@/components/ClientDepositModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getBookingStatusLabel } from '@/lib/bookingStatus';

type Employee = { id: number; name: string };

interface TimeSlot {
  startTime: string;
  endTime: string;
  booking?: {
    id: number;
    status: string;
    closeStatus?: string;
    client: string;
    car: string;
    services: string;
    phone: string;
    notes?: string;
    employeeId?: number | null;
    employee?: { id: number; name: string } | null;
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

/** Для отображения: определяем, что слот уже прошёл (локальное время). */
const isSlotPast = (date: Date, slotStartTime: string, now: Date): boolean => {
  const todayKey = format(now, 'yyyy-MM-dd');
  const selectedKey = format(date, 'yyyy-MM-dd');
  if (selectedKey < todayKey) return true;
  if (selectedKey > todayKey) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= timeToMinutes(slotStartTime);
};

const Bookings = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [createSlot, setCreateSlot] = useState<{
    dateKey: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [closeBooking, setCloseBooking] = useState<{
    id: number;
    dateKey: string;
  } | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const queryClient = useQueryClient();
  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await adminAPI.getEmployees();
      return res.data as Employee[];
    },
    retry: 1,
  });

  const [employeeSelectionByBookingId, setEmployeeSelectionByBookingId] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }), // Пн
    [selectedDate],
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekDateKeys = useMemo(
    () => weekDates.map((d) => format(d, 'yyyy-MM-dd')),
    [weekDates],
  );

  const calendarSelected = viewMode === 'week' ? weekStart : selectedDate;

  const { data: bookingsData, isLoading, isError } = useQuery({
    queryKey: ['bookings-by-date', dateKey],
    queryFn: async () => {
      const response = await adminAPI.getBookingsByDate(dateKey);
      return response.data;
    },
    retry: 1,
    enabled: viewMode === 'day',
  });

  const weekQueries = useQueries({
    queries: weekDateKeys.map((key) => ({
      queryKey: ['bookings-by-date', key],
      queryFn: async () => {
        const response = await adminAPI.getBookingsByDate(key);
        return response.data;
      },
      retry: 1,
      enabled: viewMode === 'week',
    })),
  });

  const isWeekLoading = viewMode === 'week' && weekQueries.some((q) => q.isLoading);
  const isWeekError = viewMode === 'week' && weekQueries.some((q) => q.isError);

  const generateTimeSlots = (raw: any): TimeSlot[] => {
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
      const guestName = booking.guestName as string | undefined;
      const guestPhone = booking.guestPhone as string | undefined;
      const services = (booking.services ?? booking.selectedServices ?? [])
        .map((s: any) => s?.service?.name ?? s?.name)
        .filter(Boolean)
        .join(', ');

      const carLabel =
        booking.carDisplay ??
        (booking.car
          ? `${booking.car.brand} ${booking.car.model}`
          : booking.guestCarBrand || booking.guestCarModel
            ? `${booking.guestCarBrand ?? ""} ${booking.guestCarModel ?? ""}`.trim()
            : "Не указан");

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        booking: {
          id: booking.id,
          status: booking.status || "pending",
          closeStatus: booking.closeStatus ?? "OPEN",
          client:
            guestName ||
            user.name ||
            user.firstName ||
            user.phone ||
            "—",
          car: carLabel || "Не указан",
          services: services || '—',
          phone: guestPhone || user.phone || '—',
          notes: typeof booking.notes === 'string' ? booking.notes.trim() : '',
          employeeId: booking.employeeId ?? null,
          employee: booking.employee ?? null,
        },
      };
    });
  };

  const timeSlots = isLoading ? [] : generateTimeSlots(bookingsData);

  const cancelBookingMutation = useMutation({
    mutationFn: async (payload: { id: number; dateKey: string }) => {
      return bookingsAPI.cancel(payload.id);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['bookings-by-date', variables.dateKey],
      });
    },
  });

  const confirmBookingMutation = useMutation({
    mutationFn: async (payload: { id: number; dateKey: string; employeeId: number | null }) => {
      return bookingsAPI.updateStatus(payload.id, 'confirmed', payload.employeeId);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['bookings-by-date', variables.dateKey],
      });
    },
  });

  const invalidateBookings = (key: string) => {
    queryClient.invalidateQueries({ queryKey: ['bookings-by-date', key] });
  };

  const handleCancelBooking = async (bookingId: number, forDateKey: string) => {
    const isConfirmed = window.confirm('Отменить это бронирование?');
    if (!isConfirmed) return;

    try {
      await cancelBookingMutation.mutateAsync({ id: bookingId, dateKey: forDateKey });
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      window.alert('Не удалось отменить бронирование. Попробуйте снова.');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-4xl font-bold text-foreground">Записи на мойку</h1>

      <Card className="mb-8 w-fit">
        <CardContent className="p-2">
          <Calendar
            mode="single"
            selected={calendarSelected}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelect={(date) => {
              if (date) {
                if (viewMode === 'week') {
                  // В режиме "Неделя" выбираем неделю, а не конкретный день:
                  // фиксируем якорь на начало недели (Пн).
                  const nextWeekStart = startOfWeek(date, { weekStartsOn: 1 });
                  setSelectedDate(nextWeekStart);
                } else {
                  setSelectedDate(date);
                }
                setCalendarMonth(date);
              }
            }}
            className="rounded-md"
          />
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={viewMode === 'day' ? 'default' : 'outline'}
          className={viewMode === 'day' ? 'bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]' : ''}
          onClick={() => setViewMode('day')}
        >
          День
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'week' ? 'default' : 'outline'}
          className={viewMode === 'week' ? 'bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]' : ''}
          onClick={() => setViewMode('week')}
        >
          Неделя
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowDepositModal(true)}
        >
          Депозит клиента
        </Button>
      </div>

      <h2 className="mb-6 text-3xl font-semibold text-foreground">
        {viewMode === 'day' ? (
          <>Слоты на {format(selectedDate, 'd MMMM', { locale: ru })}</>
        ) : (
          <>
            Слоты на неделе ({format(weekStart, 'd MMMM', { locale: ru })} –{' '}
            {format(addDays(weekStart, 6), 'd MMMM', { locale: ru })})
          </>
        )}
      </h2>

      {viewMode === 'day' && (isLoading || employeesLoading) ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : viewMode === 'day' && isError ? (
        <p className="text-red-500">Ошибка загрузки данных. Убедитесь, что API сервер запущен.</p>
      ) : viewMode === 'day' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {timeSlots.map((slot) => {
            const isPast = !slot.booking && isSlotPast(selectedDate, slot.startTime, now);
            const isSelectable = !slot.booking;

            return (
              <Card
                key={slot.startTime}
                role={isSelectable ? 'button' : undefined}
                tabIndex={isSelectable ? 0 : undefined}
                onClick={() => {
                  if (isSelectable) {
                    setCreateSlot({
                      dateKey,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (isSelectable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setCreateSlot({
                      dateKey,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                    });
                  }
                }}
                className={cn(
                  'rounded-2xl',
                  slot.booking
                    ? 'border-muted-foreground/50'
                    : 'cursor-pointer hover:border-[#D9E57F]/50',
                )}
              >
                <CardContent className="p-4">
                  <p className="mb-3 text-xl font-bold text-foreground">
                    {slot.startTime} - {slot.endTime}
                  </p>
                  {slot.booking ? (
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">{slot.booking.client}</p>
                      <p className="text-muted-foreground">{slot.booking.phone}</p>
                      <p className="text-muted-foreground">{slot.booking.car}</p>
                      <p className="mb-2 text-muted-foreground">{slot.booking.services}</p>
                      {slot.booking.notes && (
                        <p className="mb-2 text-muted-foreground">Комментарий: {slot.booking.notes}</p>
                      )}
                      <p className="mb-2 text-muted-foreground">
                        Статус: {getBookingStatusLabel(slot.booking.status)}
                      </p>
                      {slot.booking.status === 'pending' && (
                        <Button
                          size="sm"
                          className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                          onClick={() =>
                            confirmBookingMutation.mutate({
                              id: slot.booking!.id,
                              dateKey,
                              employeeId:
                                employeeSelectionByBookingId[slot.booking!.id] === undefined
                                  ? slot.booking!.employeeId ?? null
                                  : employeeSelectionByBookingId[slot.booking!.id] === ""
                                    ? null
                                    : Number(employeeSelectionByBookingId[slot.booking!.id]),
                            })
                          }
                          disabled={confirmBookingMutation.isPending}
                        >
                          {confirmBookingMutation.isPending ? 'Подтверждение...' : 'Подтвердить'}
                        </Button>
                      )}
                      {slot.booking.status === 'confirmed' &&
                        slot.booking.closeStatus !== 'CLOSED' && (
                          <Button
                            size="sm"
                            className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCloseBooking({ id: slot.booking!.id, dateKey });
                            }}
                          >
                            Закрыть заказ
                          </Button>
                        )}
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Сотрудник
                          </label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[#D9E57F]/60 focus:ring-1 focus:ring-[#D9E57F]/30 disabled:opacity-50"
                            value={
                              employeeSelectionByBookingId[slot.booking!.id] ??
                              (slot.booking!.employeeId == null
                                ? ""
                                : String(slot.booking!.employeeId))
                            }
                            onChange={(e) => {
                              const next = e.target.value;
                              setEmployeeSelectionByBookingId((prev) => ({
                                ...prev,
                                [slot.booking!.id]: next,
                              }));
                            }}
                            disabled={employeesLoading}
                            aria-label="Выбор сотрудника"
                          >
                            <option value="">Без назначения</option>
                            {employees.map((e) => (
                              <option key={e.id} value={String(e.id)}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10 sm:w-auto"
                          onClick={() => handleCancelBooking(slot.booking!.id, dateKey)}
                          disabled={cancelBookingMutation.isPending}
                        >
                          {cancelBookingMutation.isPending ? 'Отмена...' : 'Отменить'}
                        </Button>
                      </div>
                    </div>
                  ) : isPast ? (
                    <>
                      <p className="text-[#4CAF50]">Свободно</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Время прошло — админ может записать
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[#4CAF50]">Свободно</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Нажмите, чтобы записать
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          {isWeekLoading || employeesLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : isWeekError ? (
            <p className="text-red-500">Ошибка загрузки данных. Убедитесь, что API сервер запущен.</p>
          ) : (
            <div className="space-y-6">
              {weekDates.map((day, idx) => {
                const dayKey = weekDateKeys[idx];
                const dayRaw = weekQueries[idx]?.data;
                const daySlots = dayRaw ? generateTimeSlots(dayRaw) : [];

                return (
                  <div key={dayKey}>
                    <h3 className="mb-3 text-xl font-semibold text-foreground">
                      {format(day, 'd MMMM', { locale: ru })}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {daySlots.map((slot) => {
                        const isPast = !slot.booking && isSlotPast(day, slot.startTime, now);
                        const isSelectable = !slot.booking;

                        return (
                          <Card
                            key={`${dayKey}_${slot.startTime}`}
                            role={isSelectable ? 'button' : undefined}
                            tabIndex={isSelectable ? 0 : undefined}
                            onClick={() => {
                              if (isSelectable) {
                                setCreateSlot({
                                  dateKey: dayKey,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (isSelectable && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                setCreateSlot({
                                  dateKey: dayKey,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                });
                              }
                            }}
                            className={cn(
                              'rounded-2xl',
                              slot.booking
                                ? 'border-muted-foreground/50'
                                : 'cursor-pointer hover:border-[#D9E57F]/50',
                            )}
                          >
                            <CardContent className="p-4">
                              <p className="mb-3 text-xl font-bold text-foreground">
                                {slot.startTime} - {slot.endTime}
                              </p>
                              {slot.booking ? (
                                <div className="text-sm">
                                  <p className="font-semibold text-foreground">
                                    {slot.booking.client}
                                  </p>
                                  <p className="text-muted-foreground">{slot.booking.phone}</p>
                                  <p className="text-muted-foreground">{slot.booking.car}</p>
                                  <p className="mb-2 text-muted-foreground">
                                    {slot.booking.services}
                                  </p>
                                  {slot.booking.notes && (
                                    <p className="mb-2 text-muted-foreground">
                                      Комментарий: {slot.booking.notes}
                                    </p>
                                  )}
                                  <p className="mb-2 text-muted-foreground">
                                    Статус: {getBookingStatusLabel(slot.booking.status)}
                                  </p>
                                  {slot.booking.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                                      onClick={() =>
                                        confirmBookingMutation.mutate({
                                          id: slot.booking!.id,
                                          dateKey: dayKey,
                                          employeeId:
                                            employeeSelectionByBookingId[slot.booking!.id] === undefined
                                              ? slot.booking!.employeeId ?? null
                                              : employeeSelectionByBookingId[slot.booking!.id] === ""
                                                ? null
                                                : Number(employeeSelectionByBookingId[slot.booking!.id]),
                                        })
                                      }
                                      disabled={confirmBookingMutation.isPending}
                                    >
                                      {confirmBookingMutation.isPending ? 'Подтверждение...' : 'Подтвердить'}
                                    </Button>
                                  )}
                                  {slot.booking.status === 'confirmed' &&
                                    slot.booking.closeStatus !== 'CLOSED' && (
                                      <Button
                                        size="sm"
                                        className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCloseBooking({ id: slot.booking!.id, dateKey: dayKey });
                                        }}
                                      >
                                        Закрыть заказ
                                      </Button>
                                    )}
                                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                      <label className="mb-1 block text-xs text-muted-foreground">
                                        Сотрудник
                                      </label>
                                      <select
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[#D9E57F]/60 focus:ring-1 focus:ring-[#D9E57F]/30 disabled:opacity-50"
                                        value={
                                          employeeSelectionByBookingId[slot.booking!.id] ??
                                          (slot.booking!.employeeId == null
                                            ? ""
                                            : String(slot.booking!.employeeId))
                                        }
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setEmployeeSelectionByBookingId((prev) => ({
                                            ...prev,
                                            [slot.booking!.id]: next,
                                          }));
                                        }}
                                        disabled={employeesLoading}
                                        aria-label="Выбор сотрудника"
                                      >
                                        <option value="">Без назначения</option>
                                        {employees.map((e) => (
                                          <option key={e.id} value={String(e.id)}>
                                            {e.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10 sm:w-auto"
                                      onClick={() => handleCancelBooking(slot.booking!.id, dayKey)}
                                      disabled={cancelBookingMutation.isPending}
                                    >
                                      {cancelBookingMutation.isPending ? 'Отмена...' : 'Отменить'}
                                    </Button>
                                  </div>
                                </div>
                              ) : isPast ? (
                                <>
                                  <p className="text-[#4CAF50]">Свободно</p>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    Время прошло — админ может записать
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-[#4CAF50]">Свободно</p>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    Нажмите, чтобы записать
                                  </p>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {createSlot && (
        <AdminCreateBookingModal
          date={createSlot.dateKey}
          slotStart={createSlot.startTime}
          slotEnd={createSlot.endTime}
          onClose={() => setCreateSlot(null)}
          onSuccess={() => invalidateBookings(createSlot.dateKey)}
        />
      )}

      {closeBooking && (
        <CloseOrderModal
          bookingId={closeBooking.id}
          onClose={() => setCloseBooking(null)}
          onSuccess={() => {
            invalidateBookings(closeBooking.dateKey);
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          }}
        />
      )}

      {showDepositModal && (
        <ClientDepositModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => setShowDepositModal(false)}
        />
      )}
    </div>
  );
};

export default Bookings;
