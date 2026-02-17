import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

interface User {
  id: number;
  phone: string;
  name?: string;
  role: 'CLIENT' | 'ADMIN' | 'OWNER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (phone: string, password: string) => {
        try {
          const response = await authAPI.login(phone, password);
          const { accessToken, user } = response.data;
          
          // Проверяем, что пользователь имеет права администратора
          if (user.role === 'CLIENT') {
            throw new Error('У вас нет прав доступа к админ-панели');
          }
          
          set({ 
            user: {
              id: user.id,
              phone: user.phone,
              name: user.name,
              role: user.role,
            }, 
            token: accessToken, 
            isAuthenticated: true 
          });
        } catch (error: any) {
          console.error('Login error:', error);
          throw new Error(error.response?.data?.message || error.message || 'Ошибка авторизации');
        }
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
