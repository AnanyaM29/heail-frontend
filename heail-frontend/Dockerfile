# ---------- Stage 1: Build Angular ----------
FROM node:22 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# ---------- Stage 2: Serve with Nginx ----------
FROM nginx:alpinee

COPY --from=builder /app/dist/heail-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]