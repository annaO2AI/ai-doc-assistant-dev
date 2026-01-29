# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app (with standalone output - very important for small images)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_STANDALONE=true
RUN npm run build

# Stage 2: Runner (very small image)
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8090

EXPOSE 8090

# Start the app
CMD ["node", "server.js"]