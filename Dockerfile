FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source and assets
COPY public ./public
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/server.js"]
