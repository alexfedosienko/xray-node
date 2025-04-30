FROM node:20-alpine

RUN apk add --no-cache curl unzip \
    && mkdir -p /usr/local/xray \
    && curl -L https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip -o /tmp/xray.zip \
    && unzip /tmp/xray.zip -d /usr/local/xray \
    && rm -f /tmp/xray.zip \
    && chmod +x /usr/local/xray/xray

WORKDIR /app
COPY app/package*.json ./

RUN npm install

COPY /app /app

EXPOSE 3000 443

CMD ["node", "server.js"]