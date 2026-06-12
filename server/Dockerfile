FROM node:20-alpine

# yt-dlp requires python3
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install yt-dlp --break-system-packages

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

EXPOSE 3001

CMD ["node", "dist/index.js"]
