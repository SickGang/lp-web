# 🚗 Carwash Admin Panel

React-приложение для управления автомойкой с функционалом для администраторов и владельцев.

## 🎯 Функциональность

### Для администраторов (ADMIN)

- ✅ Просмотр записей на мойку (календарь и список)
- ✅ Управление записями
- ✅ Учет использования химии
- ✅ Просмотр статистики

### Для владельца (OWNER)

- ✅ Все возможности администратора
- ✅ Управление пользователями
- ✅ Изменение ролей
- ✅ Удаление пользователей
- ✅ Просмотр финансовой статистики

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- npm или yarn

### Установка

```bash
# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev
```

Приложение откроется на `http://localhost:5173`

### Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```env
# API URL для production
VITE_API_URL=https://your-api-url.com

# Для локальной разработки можно оставить пустым (будет использоваться proxy)
# VITE_API_URL=
```

## 📦 Сборка для production

```bash
# Билд проекта
npm run build

# Превью production билда
npm run preview
```

## 🐳 Docker деплой

### Локальный билд

```bash
docker build -t carwash-admin .
docker run -p 80:80 -e VITE_API_URL=https://your-api-url.com carwash-admin
```

### Railway деплой

1. Создайте новый сервис в Railway
2. Подключите Git репозиторий
3. Добавьте переменную окружения:
   ```
   VITE_API_URL=https://your-api-url.com
   ```
4. Railway автоматически обнаружит `Dockerfile` и начнет деплой

## 🔑 Учетные данные по умолчанию

> **Важно:** при ответе API `403 Forbidden` проверьте в базе данных, что у пользователя роль **OWNER** или **ADMIN**, а не CLIENT. Админ-эндпоинты доступны только этим ролям.

### Владелец

- Телефон: `+79001111111`
- Пароль: `owner123`

### Администратор

- Телефон: `+79001234561`
- Пароль: `admin123`

## 🛠 Технологии

- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик
- **React Router** - маршрутизация
- **TanStack Query** - кэширование данных
- **Zustand** - state management
- **Axios** - HTTP клиент
- **date-fns** - работа с датами

## 📁 Структура проекта

```
src/
├── components/       # Переиспользуемые компоненты
│   └── Layout.tsx   # Основной layout с навигацией
├── pages/           # Страницы приложения
│   ├── Dashboard.tsx    # Главная страница со статистикой
│   ├── Bookings.tsx     # Календарь записей
│   ├── Users.tsx        # Управление пользователями (только OWNER)
│   ├── Chemistry.tsx    # Учет химии
│   └── Login.tsx        # Страница авторизации
├── services/        # API клиенты
│   └── api.ts       # Axios конфигурация и эндпоинты
├── hooks/           # Custom hooks
│   └── useAuth.tsx  # Авторизация (Zustand store)
├── App.tsx          # Главный компонент с роутингом
└── main.tsx         # Entry point

```

## 🔐 Авторизация

Приложение использует JWT токены для авторизации. При логине токен сохраняется в localStorage через Zustand persist middleware.

Доступ к админ-панели имеют только пользователи с ролями:

- `ADMIN` - администратор
- `OWNER` - владелец

Пользователи с ролью `CLIENT` не могут войти в админ-панель.

## 📡 API интеграция

Все API запросы проходят через централизованный клиент в `src/services/api.ts`:

```typescript
// Примеры использования
import { adminAPI, usersAPI, chemicalsAPI } from "./services/api";

// Dashboard статистика
const stats = await adminAPI.getDashboardStats();

// Список пользователей
const users = await usersAPI.getAll();

// Учет химии
const chemicals = await chemicalsAPI.getAll();
```

## 🌐 Production

- **API**: https://carwashapi-production-8b7d.up.railway.app
- **Web**: Задеплоить на Railway/Vercel/Netlify

## 📝 Лицензия

Private
