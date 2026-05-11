# Build and run the Flotilla web server.
#
#   docker build -t flotilla .
#   docker run -p 3000:3000 flotilla
#
# Pass --build-arg VITE_BUILD_HASH=$(git rev-parse --short HEAD) to stamp the build.
# A .env in the build context is picked up by build.sh for branding config.

FROM node:22-bookworm

RUN npm install -g pnpm@10.33.0

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm i --frozen-lockfile

ENV NODE_OPTIONS=--max_old_space_size=16384

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["node", "server.js"]
