FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV ADMIN_PASSWORD=santanna123

CMD ["npm", "start"]
