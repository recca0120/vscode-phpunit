#!/bin/sh

ssh-keygen -A
chmod 600 /root/.ssh/authorized_keys

# do not detach (-D), log to stderr (-e), passthrough other arguments
exec /usr/sbin/sshd -D -e "$@"