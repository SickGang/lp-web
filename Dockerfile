# Используем Node.js 20
FROM node:20-alpine as builder

# Устанавливаем yarn глобально
RUN corepack enable && corepack prepare yarn@stable --activate

WORKDIR /app

# Копируем конфиги yarn
COPY .yarnrc.yml* ./
COPY package.json ./

# Устанавливаем зависимости
RUN yarn install

# Копируем исходный код
COPY . .

# Создаем .env файл с переменной окружения для production
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Собираем приложение
RUN yarn build

# Production stage
FROM nginx:alpine

# Копируем built файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем nginx конфиг
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
