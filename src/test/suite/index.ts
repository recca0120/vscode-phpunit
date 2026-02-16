import * as path from 'node:path';
import * as glob from 'glob';
import Mocha from 'mocha';

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 30_000,
    });

    const testsRoot = __dirname;

    return new Promise((c, e) => {
        const files = glob.globSync('**/*.test.js', { cwd: testsRoot });

        // Add files to the test suite
        for (const f of files) {
            mocha.addFile(path.resolve(testsRoot, f));
        }

        try {
            // Run the mocha test
            mocha.run((failures: number) => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            console.error(err);
            e(err);
        }
    });
}
