#! /usr/bin/env node

process.title = 'phpunit language server';

if (process.argv.some(arg => ['--stdio', '--node-ipc'].indexOf(arg) !== -1) === false) {
    process.argv.push('--stdio');
}

require('../dist/server');
