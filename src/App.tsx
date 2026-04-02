import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import Chemistry from './pages/Chemistry';
import ServicesPage from './pages/Services';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bookings" element={<Bookings />} />
        <Route
          path="users"
          element={user?.role === "OWNER" ? <Users /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="services"
          element={user?.role === "OWNER" ? <ServicesPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route path="chemistry" element={<Chemistry />} />
      </Route>
    </Routes>
  );
}

export default App;
