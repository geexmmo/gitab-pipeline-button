FROM node:19.4-bullseye

COPY ./ ./

WORKDIR /app

ENV NODE_ENV production

RUN npm clean-install

EXPOSE 8080

CMD ["npm", "start"]