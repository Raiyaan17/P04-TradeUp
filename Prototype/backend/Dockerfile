FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files AND prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy rest of source and build
COPY . .
RUN npm run build

# Remove dev dependencies to slim down the image
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine
WORKDIR /app

# Copy necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Start production server
CMD ["npm", "run", "start:prod"]
