FROM php:8.1-cli-alpine

WORKDIR /var/www/html

ENV TZ=UTC

RUN apk update && apk add --no-cache tzdata git openssh && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    apk del tzdata && rm -rf /var/cache/apk/*

ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions && \
    install-php-extensions bcmath curl exif gd intl mbstring opcache pdo pdo_mysql pdo_sqlite pcntl posix redis swoole tokenizer xml zip xdebug && \
    install-php-extensions @composer
