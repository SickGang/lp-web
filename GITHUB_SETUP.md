# 📦 Создание GitHub репозитория

## Шаг 1: Создайте репозиторий на GitHub

1. Откройте [GitHub](https://github.com/new)
2. Заполните:
   - **Repository name**: `carwash-admin-panel` (или любое другое имя)
   - **Description**: "Admin panel for Carwash Management System"
   - **Visibility**: Private или Public
3. **НЕ** добавляйте README, .gitignore, license (уже есть локально)
4. Нажмите **"Create repository"**

## Шаг 2: Подключите локальный репозиторий

Скопируйте URL вашего нового репозитория (например: `https://github.com/username/carwash-admin-panel.git`)

Выполните команды:

```bash
# Добавить remote origin
git remote add origin https://github.com/username/carwash-admin-panel.git

# Переименовать ветку в main (если нужно)
git branch -M main

# Запушить код
git push -u origin main
```

## Шаг 3: Проверка

Обновите страницу репозитория на GitHub - должны увидеть все файлы!

## 🚀 Деплой на Railway

После создания репозитория:

1. Откройте [Railway](https://railway.app)
2. Создайте новый проект: **"+ New Project"**
3. Выберите **"Deploy from GitHub repo"**
4. Найдите репозиторий `carwash-admin-panel`
5. Railway автоматически обнаружит `Dockerfile`
6. Добавьте переменную окружения:
   ```
   VITE_API_URL=https://carwashapi-production-8b7d.up.railway.app
   ```
7. Deploy!

## 🎉 Готово!

Ваше приложение будет доступно по адресу:
```
https://your-app-name.up.railway.app
```
