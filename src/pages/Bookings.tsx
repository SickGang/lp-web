import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminAPI } from '../services/api';
import './Bookings.css';

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
  
  // Загружаем записи на выбранную дату
  const { data: bookingsData, isLoading, isError } = useQuery({
    queryKey: ['bookings-by-date', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await adminAPI.getBookingsByDate(format(selectedDate, 'yyyy-MM-dd'));
      return response.data;
    },
    retry: 1,
  });

  // Генерируем слоты с 9:00 до 18:30 с шагом 90 минут
  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00'];
    
    // Проверяем, что bookingsData существует и это массив
    const bookings = Array.isArray(bookingsData) ? bookingsData : [];
    
    times.forEach(time => {
      const booking = bookings.find((b: any) => {
        const bookingTime = format(new Date(b.startTime), 'HH:mm');
        return bookingTime === time;
      });

      if (booking) {
        slots.push({
          time,
          booking: {
            id: booking.id,
            client: booking.user.name || booking.user.firstName || booking.user.phone,
            car: booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Не указан',
            services: booking.selectedServices.map((s: any) => s.service.name).join(', '),
            phone: booking.user.phone,
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
    <div className="bookings-page">
      <h1>Записи на мойку</h1>

      <div className="date-selector">
        {dates.map((date) => {
          const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          return (
            <button
              key={date.toISOString()}
              className={`date-btn ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="date-day">{format(date, 'EEE', { locale: ru })}</div>
              <div className="date-number">{format(date, 'd')}</div>
              <div className="date-month">{format(date, 'MMM', { locale: ru })}</div>
            </button>
          );
        })}
      </div>

      <div className="slots-container">
        <h2>Слоты на {format(selectedDate, 'd MMMM', { locale: ru })}</h2>
        {isLoading ? (
          <p>Загрузка...</p>
        ) : isError ? (
          <p>Ошибка загрузки данных. Убедитесь, что API сервер запущен.</p>
        ) : (
          <div className="slots-grid">
          {timeSlots.map((slot) => (
            <div
              key={slot.time}
              className={`slot-card ${slot.booking ? 'booked' : 'free'}`}
            >
              <div className="slot-time">{slot.time}</div>
              {slot.booking ? (
                <div className="slot-booking">
                  <div className="slot-client">
                    <strong>{slot.booking.client}</strong>
                    <span>{slot.booking.phone}</span>
                  </div>
                  <div className="slot-car">{slot.booking.car}</div>
                  <div className="slot-services">{slot.booking.services}</div>
                  <button className="cancel-btn">Отменить</button>
                </div>
              ) : (
                <div className="slot-free">
                  <span>Свободно</span>
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
