# phpunit-language-server

phpunit-language-server is a server implementation that provides PHPUnit smartness.
The server adheres to the [language server protocol](https://github.com/Microsoft/language-server-protocol)
and can be used with any editor that supports the protocol. The server utilizes [PHPUnit](https://phpunit.de).

## Clients

These clients are available:
* [VS Code](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)

## Features

In the current implementation we support following language features.

- [x] Code lens

![CodeLens](https://github.com/recca0120/vscode-phpunit/raw/master/screenshots/codelens.png)

- [x] Document Symbol

![CodeLens](https://github.com/recca0120/vscode-phpunit/raw/master/screenshots/documentsymbol.gif)

- [x] Publish Diagnostics

![Publish Diagnostics](https://github.com/recca0120/vscode-phpunit/raw/master/screenshots/diagnostic.gif)

- [ ] Code completion

## Features planned

- As you type reporting of parsing and compilation errors

## Installation

```bash
npm i -g phpunit-language-server
```

## Execute

```bash
phpunit-language-server
```

## Feedback

* File a bug in [GitHub Issues](https://github.com/recca0120/phpunit-language-server/issues).

## License

MIT, See [LICENSE](https://github.com/recca0120/vscode-phpunit/blob/master/License.txt) file.