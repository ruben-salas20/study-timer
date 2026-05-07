# push-service Dockerfile
# Node 20 Alpine — lightweight production image

FROM node:20-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source
COPY index.js ./

EXPOSE 3001

CMD ["node", "index.js"]
