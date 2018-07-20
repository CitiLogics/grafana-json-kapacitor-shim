from node:carbon-alpine

WORKDIR /app
COPY package*.json ./
RUN npm i

COPY . .

EXPOSE 3333
CMD ["npm", "start"]
