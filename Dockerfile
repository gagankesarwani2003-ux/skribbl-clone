# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm --prefix server ci
RUN npm --prefix client ci

# Copy full source
COPY . .

# Build client and server
RUN npm --prefix client run build
RUN npm --prefix server run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package.json ./
COPY server/package*.json ./server/
RUN npm --prefix server ci --only=production

# Copy built server and static client dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 4000

CMD ["node", "server/dist/index.js"]
