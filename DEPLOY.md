# 🚀 Деплой веб-приложения на Railway

## Шаги для деплоя:

### 1. Создайте новый сервис в Railway

1. Откройте ваш проект на Railway
2. Нажмите **"+ New"** → **"GitHub Repo"**
3. Выберите репозиторий `SickGang/lp`
4. Railway автоматически обнаружит `packages/web/railway.json`

### 2. Настройте переменные окружения

В Railway Dashboard → Settings → Variables добавьте:

```
VITE_API_URL=https://carwashapi-production-8b7d.up.railway.app
```

### 3. Настройте Root Directory

В Railway Dashboard → Settings → Build:

```
Root Directory: /packages/web
```

### 4. Deploy

Railway автоматически начнет деплой. После завершения вы получите URL вида:

```
https://your-web-app.up.railway.app
```

## 🔧 Структура файлов

- `Dockerfile` - multi-stage build (Node.js builder + Nginx production)
- `nginx.conf` - конфигурация Nginx для SPA routing
- `railway.json` - настройки Railway
- `.dockerignore` - исключения для Docker build

## 📝 Примечания

- Приложение работает на порту 80 внутри контейнера
- Nginx обрабатывает все маршруты через `index.html` (SPA режим)
- Статические файлы кэшируются на 1 год
- Health check endpoint: `/health`
