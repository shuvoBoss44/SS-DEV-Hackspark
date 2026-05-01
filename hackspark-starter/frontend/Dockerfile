FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM busybox:1.37.0
WORKDIR /www
COPY --from=builder /app/dist ./
COPY httpd.conf /etc/httpd.conf
EXPOSE 80
CMD ["httpd", "-f", "-p", "80", "-h", "/www", "-c", "/etc/httpd.conf"]
