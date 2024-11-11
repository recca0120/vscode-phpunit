FROM php:8.1-cli-alpine

WORKDIR /app

ENV TZ=UTC

RUN apk update && apk add --no-cache tzdata git && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    apk del tzdata && rm -rf /var/cache/apk/*

ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions && \
    install-php-extensions xdebug && \
    install-php-extensions @composer