import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { addDays, format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminAPI, bookingsAPI } from '../services/api';
import AdminCreateBookingModal from '@/components/AdminCreateBookingModal';
import CloseOrderModal from '@/components/CloseOrderModal';
import ClientDepositModal from '@/components/ClientDepositModal';
import UpdatePaymentModal from '@/components/UpdatePaymentModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getBookingStatusLabel } from '@/lib/bookingStatus';
import { getPaymentStatusLabel } from '@/lib/reportFormat';

type Employee = { id: number; name: string };

type SlotBooking = {
  id: number;
  status: string;
  closeStatus?: string;
  paymentStatus?: string;
  paidAmount?: number;
  finalTotal?: number | null;
  client: string;
  car: string;
  services: string;
  phone: string;
  notes?: string;
  employeeId?: number | null;
  employee?: { id: number; name: string } | null;
  boxId: number;
};

type BoxCell = {
  boxId: number;
  booking?: SlotBooking;
};

interface TimeSlot {
  startTime: string;
  endTime: string;
  boxes: BoxCell[];
}

const BOX_IDS = [1, 2] as const;

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
    boxId: number;
  } | null>(null);
  const [closeBooking, setCloseBooking] = useState<{
    id: number;
    dateKey: string;
  } | null>(null);
  const [payBooking, setPayBooking] = useState<{
    id: number;
    dateKey: string;
  } | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [now, setNow] = useState(() => new Date());
  /** Выбранный бокс внутри слота: `${dateKey}_${startTime}` → 1 | 2 */
  const [selectedBoxBySlot, setSelectedBoxBySlot] = useState<
    Record<string, number>
  >({});
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

    const mapBooking = (booking: any): SlotBooking => {
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
        id: booking.id,
        status: booking.status || "pending",
        closeStatus: booking.closeStatus ?? "OPEN",
        paymentStatus: booking.paymentStatus ?? "UNPAID",
        paidAmount: booking.paidAmount ?? 0,
        finalTotal: booking.finalTotal ?? null,
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
        boxId: booking.boxId ?? 1,
      };
    };

    return SLOTS_2H.map((slot) => {
      const overlapping = bookings.filter((b: any) => {
        if (!b?.startTime || !b?.endTime) return false;
        const bookingStart = getTimeUtc(b.startTime);
        const bookingEnd = getTimeUtc(b.endTime);
        return intervalsOverlap(slot.startTime, slot.endTime, bookingStart, bookingEnd);
      });

      const boxes: BoxCell[] = BOX_IDS.map((boxId) => {
        const booking = overlapping.find(
          (b: any) => (b.boxId ?? 1) === boxId,
        );
        return {
          boxId,
          booking: booking ? mapBooking(booking) : undefined,
        };
      });

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        boxes,
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

  const openCreate = (
    forDateKey: string,
    startTime: string,
    endTime: string,
    boxId: number,
  ) => {
    setCreateSlot({ dateKey: forDateKey, startTime, endTime, boxId });
  };

  const defaultBoxId = (slot: TimeSlot): number => {
    const free = slot.boxes.find((b) => !b.booking);
    return free?.boxId ?? slot.boxes[0]?.boxId ?? 1;
  };

  const renderSlotCard = (
    slot: TimeSlot,
    forDateKey: string,
    dayDate: Date,
  ) => {
    const slotKey = `${forDateKey}_${slot.startTime}`;
    const activeBoxId = selectedBoxBySlot[slotKey] ?? defaultBoxId(slot);
    const activeBox =
      slot.boxes.find((b) => b.boxId === activeBoxId) ?? slot.boxes[0];
    const booking = activeBox?.booking;
    const freeBoxes = slot.boxes.filter((b) => !b.booking);
    const occupiedCount = slot.boxes.length - freeBoxes.length;
    const isPast = !booking && isSlotPast(dayDate, slot.startTime, now);
    const canBookActive = !booking;

    return (
      <Card
        key={slotKey}
        className={cn(
          'rounded-2xl',
          occupiedCount === slot.boxes.length
            ? 'border-muted-foreground/50'
            : occupiedCount > 0
              ? 'border-[#D9E57F]/40'
              : 'border-border',
        )}
      >
        <CardContent className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-xl font-bold text-foreground">
              {slot.startTime} - {slot.endTime}
            </p>
            <p className="text-xs text-muted-foreground">
              {occupiedCount === 0
                ? 'Оба бокса свободны'
                : freeBoxes.length === 0
                  ? 'Оба бокса заняты'
                  : `Свободен бокс ${freeBoxes.map((b) => b.boxId).join(', ')}`}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {slot.boxes.map((box) => {
              const occupied = !!box.booking;
              const isActive = box.boxId === activeBoxId;
              return (
                <button
                  key={box.boxId}
                  type="button"
                  onClick={() =>
                    setSelectedBoxBySlot((prev) => ({
                      ...prev,
                      [slotKey]: box.boxId,
                    }))
                  }
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-colors',
                    isActive
                      ? 'border-[#D9E57F] bg-[#D9E57F]/15'
                      : 'border-border bg-background hover:border-muted-foreground/40',
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">
                    Бокс {box.boxId}
                  </p>
                  {occupied ? (
                    <>
                      <p className="text-xs font-medium text-orange-400">
                        Занят
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {box.booking!.client}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-medium text-[#4CAF50]">
                      Свободен
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {booking ? (
            <div className="text-sm">
              <p className="font-semibold text-foreground">{booking.client}</p>
              <p className="text-muted-foreground">{booking.phone}</p>
              <p className="text-muted-foreground">{booking.car}</p>
              <p className="mb-2 text-muted-foreground">{booking.services}</p>
              {booking.notes && (
                <p className="mb-2 text-muted-foreground">
                  Комментарий: {booking.notes}
                </p>
              )}
              <p className="mb-2 text-muted-foreground">
                Статус: {getBookingStatusLabel(booking.status)}
                {booking.closeStatus === 'CLOSED' &&
                  booking.paymentStatus &&
                  ` · ${getPaymentStatusLabel(booking.paymentStatus)}`}
              </p>
              {freeBoxes.length > 0 && (
                <p className="mb-2 text-sm text-[#D9E57F]">
                  Можно записать только в бокс{' '}
                  {freeBoxes.map((b) => b.boxId).join(' или ')}
                </p>
              )}
              {booking.status === 'pending' && (
                <Button
                  size="sm"
                  className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                  onClick={() =>
                    confirmBookingMutation.mutate({
                      id: booking.id,
                      dateKey: forDateKey,
                      employeeId:
                        employeeSelectionByBookingId[booking.id] === undefined
                          ? booking.employeeId ?? null
                          : employeeSelectionByBookingId[booking.id] === ''
                            ? null
                            : Number(employeeSelectionByBookingId[booking.id]),
                    })
                  }
                  disabled={confirmBookingMutation.isPending}
                >
                  {confirmBookingMutation.isPending
                    ? 'Подтверждение...'
                    : 'Подтвердить'}
                </Button>
              )}
              {booking.status === 'confirmed' &&
                booking.closeStatus !== 'CLOSED' && (
                  <Button
                    size="sm"
                    className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                    onClick={() =>
                      setCloseBooking({ id: booking.id, dateKey: forDateKey })
                    }
                  >
                    Закрыть заказ
                  </Button>
                )}
              {booking.closeStatus === 'CLOSED' &&
                (() => {
                  const finalTotal =
                    booking.finalTotal ?? booking.paidAmount ?? 0;
                  const debt = finalTotal - (booking.paidAmount ?? 0);
                  return debt > 0 ? (
                    <Button
                      size="sm"
                      className="mb-2 mr-2 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                      onClick={() =>
                        setPayBooking({ id: booking.id, dateKey: forDateKey })
                      }
                    >
                      Оплатить долг
                    </Button>
                  ) : null;
                })()}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Сотрудник
                  </label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[#D9E57F]/60 focus:ring-1 focus:ring-[#D9E57F]/30 disabled:opacity-50"
                    value={
                      employeeSelectionByBookingId[booking.id] ??
                      (booking.employeeId == null
                        ? ''
                        : String(booking.employeeId))
                    }
                    onChange={(e) => {
                      const next = e.target.value;
                      setEmployeeSelectionByBookingId((prev) => ({
                        ...prev,
                        [booking.id]: next,
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
                  onClick={() => handleCancelBooking(booking.id, forDateKey)}
                  disabled={cancelBookingMutation.isPending}
                >
                  {cancelBookingMutation.isPending ? 'Отмена...' : 'Отменить'}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[#4CAF50]">Свободно — бокс {activeBoxId}</p>
              {occupiedCount > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Второй бокс занят. Запись только сюда.
                </p>
              ) : isPast ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Время прошло — админ может записать
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Нажмите «Записать», чтобы создать запись
                </p>
              )}
              {canBookActive && (
                <Button
                  size="sm"
                  className="mt-3 w-full bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b] sm:w-auto"
                  onClick={() =>
                    openCreate(
                      forDateKey,
                      slot.startTime,
                      slot.endTime,
                      activeBoxId,
                    )
                  }
                >
                  Записать в бокс {activeBoxId}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
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
          {timeSlots.map((slot) =>
            renderSlotCard(slot, dateKey, selectedDate),
          )}
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
                      {daySlots.map((slot) =>
                        renderSlotCard(slot, dayKey, day),
                      )}
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
          boxId={createSlot.boxId}
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

      {payBooking && (
        <UpdatePaymentModal
          bookingId={payBooking.id}
          onClose={() => setPayBooking(null)}
          onSuccess={() => {
            invalidateBookings(payBooking.dateKey);
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
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
