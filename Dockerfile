FROM node:16

WORKDIR /app/

# install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .
RUN pnpm build


FROM node:16-alpine
WORKDIR /app/
# copy from build image
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["yarn", "start:prod"]
