# output frontend code in /app/dist
FROM node:11 AS build-frontend
COPY frontend/package.json frontend/package-lock.json /app/
WORKDIR /app
RUN npm install
COPY frontend /app
RUN npm run build

# output backend code in /app/target
FROM rust:stretch AS build-backend
COPY backend/Cargo.toml backend/Cargo.lock /app/
RUN mkdir /app/src && echo "fn main() {}" > /app/src/main.rs
WORKDIR /app
RUN cargo build --release
COPY backend /app
RUN cargo build --release
RUN find /app | grep shishbox-be

# copy to /app/backend and /app/frontend
FROM debian:stable-slim
EXPOSE 8000
HEALTHCHECK --interval=5m --timeout=3s CMD curl --fail http://127.0.0.1:8000/ || exit 1
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=build-backend /app/target/release/shishbox-be /app/backend/
COPY --from=build-frontend /app/dist /app/frontend/dist/

WORKDIR /app/backend
CMD ["/app/backend/shishbox-be"]
