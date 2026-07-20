FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn workspace frontend build
RUN yarn workspace backend build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
