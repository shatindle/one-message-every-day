FROM node:16-alpine

LABEL org.opencontainers.image.title="Discord bot for one message every day" \
      org.opencontainers.image.description="Only allows all users to post one message in a channel per day" \
      org.opencontainers.image.authors="@shane on Discord"

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY index.js ./

USER node

COPY --chown=node:node . .

RUN npm install

ENTRYPOINT ["node", "index.js"]