//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../src/extension';
import { PHPUnit } from '../src/phpunit';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {

    test("PHPUnit Test", async () => {
        const runner = new PHPUnit({
            rootPath: __dirname,
            tmpdir: __dirname,
        });
        const xml = await runner.run(
            join(__dirname, '../../test/fixtures/PHPUnitTest.php')
        );
        assert.ok(existsSync(xml));
        unlinkSync(xml);
    });

    // Defines a Mocha unit test
    // test("Something 1", () => {
    //     assert.equal(-1, [1, 2, 3].indexOf(5));
    //     assert.equal(-1, [1, 2, 3].indexOf(0));
    // });
});