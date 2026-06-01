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

function normalizeSession(
  user: User | null,
  token: string | null,
): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> {
  if (!token || !user) {
    return { user: null, token: null, isAuthenticated: false };
  }
  return { user, token, isAuthenticated: true };
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
          const data = response.data;
          const user = data.user;
          const token = data.accessToken ?? data.token;
          if (!token || !user) {
            throw new Error('Неверный формат ответа от сервера');
          }
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
            token,
            isAuthenticated: true,
          });
        } catch (error: unknown) {
          console.error('Login error:', error);
          const err = error as { response?: { data?: { message?: string } }; message?: string };
          throw new Error(
            err.response?.data?.message || err.message || 'Ошибка авторизации',
          );
        }
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user: User, token: string) => {
        set(normalizeSession(user, token));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

if (typeof window !== 'undefined') {
  window.addEventListener('lp-auth-session-expired', () => {
    useAuth.getState().logout();
  });
}
