import { extname, join } from 'node:path';
import { Minimatch } from 'minimatch';
import { URI } from 'vscode-uri';
import type { PHPUnitXML, TestSuite } from '../PHPUnitXML/PHPUnitXML';

export class TestSuiteMatcher {
    private matcherCache = new Map<string, Map<string, Minimatch>>();

    constructor(private phpUnitXML: PHPUnitXML) {}

    testsuiteOf(uri: URI, suffix?: string) {
        const testSuites = this.phpUnitXML.getTestSuites();
        const testsuite = testSuites.find((item) => {
            return ['directory', 'file'].includes(item.tag) && this.match(item, uri, suffix);
        });

        if (!testsuite) {
            return;
        }

        const exclude = testSuites.find((item) => {
            return item.name === testsuite.name && item.tag === 'exclude' && this.match(item, uri);
        });

        if (exclude) {
            return;
        }

        return testsuite.name;
    }

    isInTestsuiteDirectory(uri: URI): boolean {
        return !!this.testsuiteOf(uri, '.php');
    }

    reset(): void {
        this.matcherCache.clear();
    }

    private match(testSuite: TestSuite, uri: URI, suffixOverride?: string) {
        const workspace = URI.file(this.phpUnitXML.root());
        const isFile =
            testSuite.tag === 'file' || (testSuite.tag === 'exclude' && extname(testSuite.value));

        if (isFile) {
            return join(workspace.fsPath, testSuite.value) === uri.fsPath;
        }

        const suffix = suffixOverride ?? testSuite.suffix ?? 'Test.php';

        let suffixMap = this.matcherCache.get(testSuite.value);
        if (!suffixMap) {
            suffixMap = new Map();
            this.matcherCache.set(testSuite.value, suffixMap);
        }

        let minimatch = suffixMap.get(suffix);
        if (!minimatch) {
            minimatch = new Minimatch(
                URI.file(join(workspace.fsPath, testSuite.value, `/**/*${suffix}`)).toString(true),
                { matchBase: true, nocase: true },
            );
            suffixMap.set(suffix, minimatch);
        }

        return minimatch.match(uri.toString(true));
    }
}
