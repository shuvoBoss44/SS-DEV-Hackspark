FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM alpine:3.20
RUN apk add --no-cache nodejs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY app.js ./
COPY controllers ./controllers
COPY middlewares ./middlewares
COPY models ./models
COPY routes ./routes
EXPOSE 8001
CMD ["node", "app.js"]
