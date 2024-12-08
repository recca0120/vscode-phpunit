FROM php:8.3-cli-alpine

WORKDIR /app

ENV TZ=UTC

RUN apk update && apk add --no-cache tzdata git openssh && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    apk del tzdata && rm -rf /var/cache/apk/*

ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions && \
    install-php-extensions xdebug && \
    install-php-extensions @composer

RUN mkdir -p /root/.ssh \
    && chmod 0700 /root/.ssh \
    && ssh-keygen -A \
    && echo -e "PasswordAuthentication no" >> /etc/ssh/sshd_config

COPY entrypoint.sh /

EXPOSE 22
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]