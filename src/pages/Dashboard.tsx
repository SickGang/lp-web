import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminAPI } from '../services/api';
import './Dashboard.css';

interface ApiBooking {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  user: {
    name: string;
    phone: string;
  };
  car?: {
    brand: string;
    model: string;
  };
  services: Array<{
    service: {
      name: string;
    };
  }>;
}

const Dashboard = () => {
  // Загружаем статистику из API
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await adminAPI.getDashboardStats();
      return response.data;
    },
    retry: 1,
  });

  // Загружаем ближайшие записи из API
  const { data: bookingsData, isLoading: bookingsLoading, isError: bookingsError } = useQuery({
    queryKey: ['upcoming-bookings'],
    queryFn: async () => {
      const response = await adminAPI.getUpcomingBookings(10);
      return response.data;
    },
    retry: 1,
  });

  const upcomingBookings = bookingsData?.map((booking: ApiBooking) => ({
    id: booking.id,
    time: format(new Date(booking.startTime), 'HH:mm'),
    client: booking.user.name || booking.user.firstName || booking.user.phone,
    phone: booking.user.phone,
    car: booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Не указан',
    services: booking.selectedServices.map((s: any) => s.service.name).join(', '),
  })) || [];

  if (statsLoading || bookingsLoading) {
    return (
      <div className="dashboard">
        <h1>Загрузка...</h1>
      </div>
    );
  }

  if (statsError || bookingsError) {
    return (
      <div className="dashboard">
        <h1>Ошибка загрузки данных</h1>
        <p>Убедитесь, что API сервер запущен (yarn api:dev)</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Дашборд</h1>
      <p className="date">{format(new Date(), 'd MMMM yyyy, EEEE', { locale: ru })}</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.todayBookings || 0}</div>
            <div className="stat-label">Записей сегодня</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.weekBookings || 0}</div>
            <div className="stat-label">Записей на неделю</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{((stats?.monthRevenue || 0) / 100).toLocaleString('ru-RU')} ₽</div>
            <div className="stat-label">Доход за месяц</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.activeClients || 0}</div>
            <div className="stat-label">Активных клиентов</div>
          </div>
        </div>
      </div>

      <div className="upcoming-section">
        <h2>Ближайшие записи</h2>
        <div className="bookings-list">
          {upcomingBookings.map((booking) => (
            <div key={booking.id} className="booking-card">
              <div className="booking-time">{booking.time}</div>
              <div className="booking-details">
                <div className="booking-client">
                  <strong>{booking.client}</strong>
                  <span className="booking-phone">{booking.phone}</span>
                </div>
                <div className="booking-car">{booking.car}</div>
                <div className="booking-services">{booking.services}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
