# push-service Dockerfile
# Node 20 Alpine — lightweight production image

FROM node:20-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package.json ./

# Install production dependencies. Using `npm install` (not `npm ci`) since
# this micro-service has no committed package-lock.yaml; deps are minimal
# (express + web-push + pocketbase + dotenv) and resolved fresh on build.
RUN npm install --omit=dev

# Copy application source
COPY index.js ./

EXPOSE 3001

CMD ["node", "index.js"]
