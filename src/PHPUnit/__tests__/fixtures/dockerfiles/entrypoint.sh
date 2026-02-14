#!/bin/sh

# Auto-install dependencies if vendor is stale or missing
php_version=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
for dir in /app/*/; do
  [ -f "$dir/composer.json" ] || continue

  current="${php_version}:$(md5sum "$dir/composer.lock" 2>/dev/null | cut -d' ' -f1)"
  cached=$(cat "$dir/vendor/.entrypoint-marker" 2>/dev/null)

  if [ "$current" != "$cached" ]; then
    echo "Installing dependencies in $dir (PHP $php_version)..."
    composer install --no-interaction --working-dir="$dir"
    echo "$current" > "$dir/vendor/.entrypoint-marker"
  fi
done

# If extra arguments were passed, run them instead of sshd
if [ $# -gt 0 ]; then
  exec "$@"
fi

ssh-keygen -A
chmod 600 /root/.ssh/authorized_keys

# do not detach (-D), log to stderr (-e), passthrough other arguments
exec /usr/sbin/sshd -D -e
