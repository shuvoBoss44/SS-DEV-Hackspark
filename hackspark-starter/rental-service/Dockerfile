# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
# Copy package manifests first for layer caching
COPY package*.json ./
# Clean install, omitting devDependencies to save space
RUN npm install --omit=dev
# Copy the rest of the source code
COPY . .

# Stage 2: Lean Runtime
FROM node:20-alpine
WORKDIR /app
# Copy only the built modules and source from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app ./

# Default command (Make sure your package.json has a "start" script)
CMD ["npm", "start"]