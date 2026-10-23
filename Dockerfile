FROM node:24.21.0-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
# db・files・log はボリュームとして保存する。node ユーザーが書き込めるよう先に作っておく
RUN mkdir -p db files log && chown node:node db files log

USER node
CMD ["node", "index.js"]
