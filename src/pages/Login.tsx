import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forbiddenMessage, setForbiddenMessage] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    if (searchParams.get('reason') === 'forbidden') {
      setForbiddenMessage('Недостаточно прав. У пользователя должна быть роль OWNER или ADMIN в базе данных.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(phone, password);
    } catch (err) {
      setError('Неверный номер телефона или пароль');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🚗 CarWash Admin</h1>
        <p className="login-subtitle">Панель администратора</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Номер телефона</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 999-99-99"
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>
          {forbiddenMessage && <div className="error-message" role="alert">{forbiddenMessage}</div>}
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-btn">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
