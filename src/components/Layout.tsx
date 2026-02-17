import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🚗 CarWash Admin</h2>
          <div className="user-info">
            <p className="user-name">{user?.name || user?.phone}</p>
            <p className="user-role">{user?.role === 'OWNER' ? 'Владелец' : 'Администратор'}</p>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            📊 Дашборд
          </NavLink>
          <NavLink to="/bookings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            📅 Записи на мойку
          </NavLink>
          {user?.role === 'OWNER' && (
            <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              👥 Пользователи
            </NavLink>
          )}
          <NavLink to="/chemistry" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            🧪 Учет химии
          </NavLink>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Выйти
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
