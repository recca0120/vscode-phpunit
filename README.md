# PHPUnit Test Explorer for Visual Studio Code

Run your PHPUnit tests in Node using the
[Test Explorer UI](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer).

![Screenshot](img/screenshot.png)

## Features

-   Shows a Test Explorer in the Test view in VS Code's sidebar with all detected tests and suites and their state
-   Adds CodeLenses to your test files for starting and debugging tests
-   Adds Gutter decorations to your test files showing the tests' state
-   Adds line decorations to the source line where a test failed
-   Shows a failed test's log when the test is selected in the explorer
-   Lets you choose test suites or individual tests in the explorer that should be run automatically after each file change
-   Forwards the console output from PHPUnit to a VS Code output channel

## Getting started

-   Install the extension
-   Restart VS Code and open the Test view
-   Run your tests using the ![Run](img/run.png) icons in the Test Explorer or the CodeLenses in your test file
-   For running phpunit on a remote system or using vagrant see Troubleshooting

## Configuration

### Custom debugger configuration

### Other options

| Property                        | Description                                                                 |
| ------------------------------- | --------------------------------------------------------------------------- |
| `testExplorer.codeLens`         | Show a CodeLens above each test or suite for running or debugging the tests |
| `testExplorer.gutterDecoration` | Show the state of each test in the editor using Gutter Decorations          |
| `testExplorer.onStart`          | Retire or reset all test states whenever a test run is started              |
| `testExplorer.onReload`         | Retire or reset all test states whenever the test tree is reloaded          |

## Commands

The following commands are available in VS Code's command palette, use the ID to add them to your keyboard shortcuts:

| ID                                 | Command                                     |
| ---------------------------------- | ------------------------------------------- |
| `test-explorer.reload`             | Reload tests                                |
| `test-explorer.run-all`            | Run all tests                               |
| `test-explorer.run-file`           | Run tests in current file                   |
| `test-explorer.run-test-at-cursor` | Run the test at the current cursor position |
| `test-explorer.cancel`             | Cancel running tests                        |

## Troubleshooting

### All tests are appearing twice with "\*** duplicate ID **\*" found.

You likely have a file sensitive file system. The default value of `"phpunit.files": "{test,tests,Test,Tests}/**/*Test.php",` should be changed to `"phpunit.files": "{test,tests}/**/*Test.php",`

### I'm using Vagrant / Homestead for remote execution

Your tests will list in the explorer for reading locally, but you need to run your tests remotely using PHP on your vagrant machine.

To do this you need to configure the following settings:

`"phpunit.relativeFilePath": true,` - This will ensure your files are located correctly for local checks

`"phpunit.phpunit": "/FULL_PATH_TO/vendor/bin/phpunit",` - your remote path, likely in `/var/www/html/`

`"phpunit.php": "/usr/local/bin/vagrant exec php",` this is to execute PHP on the remote machine. You'll need to install and configure https://github.com/p0deje/vagrant-exec - this wraps the command like using `ssh -C`

You can also use the method above to execute on Docker remotely

### My `/usr/local/bin/vagrant` isn't found?

Spawn likely can't find vagrant locally. You need to switch to using your regular terminal using something like `"phpunit.shell": "/bin/bash",` or `"phpunit.shell": "/bin/zsh",`

## Wallaby.js

[![Wallaby.js](https://img.shields.io/badge/wallaby.js-powered-blue.svg?style=for-the-badge&logo=github)](https://wallabyjs.com/oss/)

This repository contributors are welcome to use
[Wallaby.js OSS License](https://wallabyjs.com/oss/) to get
test results immediately as you type, and see the results in
your editor right next to your code.
