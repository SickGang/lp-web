import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import Chemistry from './pages/Chemistry';
import ServicesPage from './pages/Services';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { useAuthHydrated } from './hooks/useAuthHydrated';

function App() {
  const hydrated = useAuthHydrated();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const isAuthed = Boolean(token && user);

  if (!hydrated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthed ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />
      <Route
        path="/"
        element={
          isAuthed ? <Layout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bookings" element={<Bookings />} />
        <Route
          path="users"
          element={
            user?.role === 'OWNER' ? (
              <Users />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="services"
          element={
            user?.role === 'OWNER' ? (
              <ServicesPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route path="chemistry" element={<Chemistry />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route
        path="*"
        element={
          <Navigate to={isAuthed ? '/dashboard' : '/login'} replace />
        }
      />
    </Routes>
  );
}

export default App;
