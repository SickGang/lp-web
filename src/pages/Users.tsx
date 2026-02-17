import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../services/api';
import './Users.css';

interface User {
  id: number;
  phone: string;
  name: string;
  role: 'CLIENT' | 'ADMIN' | 'OWNER';
  createdAt: string;
  bookingsCount: number;
}

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Загружаем пользователей из API
  const { data: usersData, isLoading, isError } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const response = await usersAPI.getAll(roleFilter === 'all' ? undefined : roleFilter);
      return response.data;
    },
    retry: 1,
  });

  const users: User[] = usersData?.map((user: any) => ({
    id: user.id,
    phone: user.phone || 'Не указан',
    name: user.name || user.firstName || 'Без имени',
    role: user.role,
    createdAt: user.createdAt,
    bookingsCount: user._count?.bookings || 0,
  })) || [];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CLIENT': return 'Клиент';
      case 'ADMIN': return 'Администратор';
      case 'OWNER': return 'Владелец';
      default: return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'CLIENT': return 'role-client';
      case 'ADMIN': return 'role-admin';
      case 'OWNER': return 'role-owner';
      default: return '';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Управление пользователями</h1>
        <button className="add-admin-btn">+ Добавить администратора</button>
      </div>

      <div className="users-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по имени или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Все роли</option>
          <option value="CLIENT">Клиенты</option>
          <option value="ADMIN">Администраторы</option>
          <option value="OWNER">Владельцы</option>
        </select>
      </div>

      {isLoading ? (
        <p>Загрузка...</p>
      ) : isError ? (
        <p>Ошибка загрузки данных. Убедитесь, что API сервер запущен.</p>
      ) : (
        <div className="users-table">
          <table>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Дата регистрации</th>
              <th>Записей</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="user-name">{user.name}</td>
                <td>{user.phone}</td>
                <td>
                  <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                <td>{user.bookingsCount}</td>
                <td>
                  <div className="action-buttons">
                    {user.role !== 'OWNER' && (
                      <>
                        <button className="action-btn edit">Изменить роль</button>
                        <button className="action-btn delete">Удалить</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;
