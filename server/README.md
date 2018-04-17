phpunit-language-server
=====================

phpunit-language-server is a server implementation that provides PHPUnit smartness.
The server adheres to the [language server protocol](https://github.com/Microsoft/language-server-protocol)
and can be used with any editor that supports the protocol. The server utilizes [PHPUnit](https://phpunit.de).

Clients
--------------

These clients are available:
* [VS Code](https://marketplace.visualstudio.com/items?temName=recca0120.vscode-phpunit)

Features
--------------
* Code lens (references)

![CodeLens](screenshots/codelens.png)

* Publish Diagnostics

![Publish Diagnostics](screenshots/diagnostic.gif)


Features planned
--------------
* As you type reporting of parsing and compilation errors
* Code completion

Feedback
---------
* File a bug in [GitHub Issues](https://github.com/recca0120/phpunit-language-server/issues).

License
-------
MIT, See [LICENSE](LICENSE.txt) file.