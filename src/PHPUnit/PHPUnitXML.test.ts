import { join } from 'node:path';
import { URI } from 'vscode-uri';
import { generateXML, phpUnitProject } from './__tests__/utils';
import { Element } from './Element';
import { PHPUnitXML } from './PHPUnitXML';

describe('PHPUnit XML Test', () => {
    const root = phpUnitProject('');

    const phpUnitXML = new PHPUnitXML();
    const parse = (text: Buffer | string) => {
        return phpUnitXML.load(text, phpUnitProject('phpunit.xml'));
    };

    afterEach(() => {
        expect(phpUnitXML.file()).toEqual(phpUnitProject('phpunit.xml'));
        expect(phpUnitXML.root()).toEqual(root);
    });

    it('without tags', () => {
        const phpUnitXml = parse(generateXML(``));
        expect(phpUnitXml.getTestSuites()).toEqual([
            { tag: 'directory', name: 'default', value: '', suffix: '.php' },
            { tag: 'exclude', name: 'default', value: 'vendor' },
        ]);
        expect(phpUnitXml.getIncludes()).toEqual([]);
        expect(phpUnitXml.getExcludes()).toEqual([]);
    });

    it('one testsuites one directory', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite>
            </testsuites>
        `);

        expect(parse(xml).getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
        ]);
    });

    it('one testsuites two directories', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                    <directory>tests/Unit2</directory>
                </testsuite>
            </testsuites>
        `);

        const parsed = parse(xml);

        expect(parsed.getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Unit', value: 'tests/Unit2' },
        ]);

        const { includes, excludes } = parsed.getPatterns(root);
        expect(includes.toGlobPattern()).toEqual({
            uri: URI.file(join(phpUnitXML.root(), 'tests')),
            pattern: '{Unit/**/*.php,Unit2/**/*.php}',
        });
        expect(excludes.toGlobPattern()).toEqual({
            uri: URI.file(phpUnitXML.root()),
            pattern: '{**/.git/**,**/node_modules/**}',
        });
    });

    it('two testsuites one directory', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite>
                <testsuite name="Feature">
                    <directory>tests/Feature</directory>
                </testsuite>
            </testsuites>
        `);

        const parsed = parse(xml);

        expect(parsed.getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Feature', value: 'tests/Feature' },
        ]);

        const { includes, excludes } = parsed.getPatterns(root);
        expect(includes.toGlobPattern()).toEqual({
            uri: URI.file(join(phpUnitXML.root(), 'tests')),
            pattern: '{Unit/**/*.php,Feature/**/*.php}',
        });
        expect(excludes.toGlobPattern()).toEqual({
            uri: URI.file(phpUnitXML.root()),
            pattern: '{**/.git/**,**/node_modules/**}',
        });
    });

    it('two testsuites two directory', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                    <directory>tests/Unit2</directory>
                </testsuite>
                <testsuite name="Feature">
                    <directory>tests/Feature</directory>
                    <directory>tests/Feature2</directory>
                </testsuite>
            </testsuites>
        `);

        const parsed = parse(xml);

        expect(parsed.getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { tag: 'directory', name: 'Feature', value: 'tests/Feature' },
            { tag: 'directory', name: 'Feature', value: 'tests/Feature2' },
        ]);

        const { includes, excludes } = parsed.getPatterns(root);
        expect(includes.toGlobPattern()).toEqual({
            uri: URI.file(join(phpUnitXML.root(), 'tests')),
            pattern: '{Unit/**/*.php,Unit2/**/*.php,Feature/**/*.php,Feature2/**/*.php}',
        });
        expect(excludes.toGlobPattern()).toEqual({
            uri: URI.file(phpUnitXML.root()),
            pattern: '{**/.git/**,**/node_modules/**}',
        });
    });

    it('one testsuites two directory two file', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                    <directory>tests/Unit2</directory>
                    <file>./vendor/someone/tests/MyClassTest.php</file>
                    <file>./vendor/someone/tests/MyClassTest2.php</file>
                </testsuite>
            </testsuites>
        `);

        const parsed = parse(xml);

        expect(parsed.getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { tag: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest.php' },
            { tag: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest2.php' },
        ]);

        const { includes, excludes } = parsed.getPatterns(root);
        expect(includes.toGlobPattern()).toEqual({
            uri: URI.file(phpUnitXML.root()),
            pattern: '{tests/Unit/**/*.php,tests/Unit2/**/*.php,vendor/someone/tests/MyClassTest.php,vendor/someone/tests/MyClassTest2.php}',
        });
        expect(excludes.toGlobPattern()).toEqual({
            uri: URI.file(phpUnitXML.root()),
            pattern: '{**/.git/**,**/node_modules/**}',
        });
    });

    it('one testsuites one directory and one exclude', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                    <exclude>./tests/Integration/OldTests</exclude>
                </testsuite>
            </testsuites>
        `);

        const parsed = parse(xml);

        expect(parsed.getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'exclude', name: 'Unit', value: './tests/Integration/OldTests' },
        ]);

        const { includes, excludes } = parsed.getPatterns(root);
        expect(includes.toGlobPattern()).toEqual({
            uri: URI.file(join(phpUnitXML.root(), 'tests')),
            pattern: '{Unit/**/*.php}',
        });
        expect(excludes.toGlobPattern()).toEqual({
            uri: URI.file(phpUnitXML.root()),
            pattern: '{**/.git/**,**/node_modules/**,tests/Integration/OldTests/**/*}',
        });
    });

    it('testsuite directory has suffix', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory suffix=".phpt">tests/Unit</directory>
                </testsuite>
            </testsuites>
        `);

        const parsed = parse(xml);

        expect(parsed.getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', prefix: undefined, suffix: '.phpt', value: 'tests/Unit' },
        ]);

        const { includes, excludes } = parsed.getPatterns(root);
        expect(includes.toGlobPattern()).toEqual({
            uri: URI.file(join(phpUnitXML.root(), 'tests')),
            pattern: '{Unit/**/*.phpt}',
        });
        expect(excludes.toGlobPattern()).toEqual({
            uri: URI.file(phpUnitXML.root()),
            pattern: '{**/.git/**,**/node_modules/**}',
        });
    });

    it('source include one directory', () => {
        const xml = generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                </include>
            </source>
        `);

        expect(parse(xml).getIncludes()).toEqual([
            { tag: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
        ]);
    });

    it('source include two directory', () => {
        const xml = generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                    <directory prefix="hello">app2</directory>
                </include>
            </source>
        `);

        expect(parse(xml).getIncludes()).toEqual([
            { tag: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { tag: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
        ]);
    });

    it('source include one directory and one file', () => {
        const xml = generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                    <file>src/autoload.php</file>
                </include>
            </source>
        `);

        expect(parse(xml).getIncludes()).toEqual([
            { tag: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { tag: 'file', value: 'src/autoload.php' },
        ]);
    });

    it('source include two directory and two file', () => {
        const xml = generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                    <directory prefix="hello">app2</directory>
                    <file>src/autoload.php</file>
                    <file>src/autoload2.php</file>
                </include>
            </source>
        `);

        expect(parse(xml).getIncludes()).toEqual([
            { tag: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { tag: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
            { tag: 'file', value: 'src/autoload.php' },
            { tag: 'file', value: 'src/autoload2.php' },
        ]);
    });

    it('source exclude one directory and one file', () => {
        const xml = generateXML(`
        <source>
            <exclude>
                    <directory suffix=".php">src/generated</directory>
                    <file>src/autoload.php</file>
                </exclude>
            </source>
        `);

        expect(parse(xml).getExcludes()).toEqual([
            { tag: 'directory', prefix: undefined, suffix: '.php', value: 'src/generated' },
            { tag: 'file', value: 'src/autoload.php' },
        ]);
    });

    it('sources', () => {
        const xml = generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                    <directory prefix="hello">app2</directory>
                    <file>src/autoload.php</file>
                    <file>src/autoload2.php</file>
                </include>

                <exclude>
                    <directory suffix=".php">src/generated</directory>
                    <file>src/autoload.php</file>
                </exclude>
            </source>
        `);

        expect(parse(xml).getSources()).toEqual([
            { type: 'include', tag: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { type: 'include', tag: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
            { type: 'include', tag: 'file', value: 'src/autoload.php' },
            { type: 'include', tag: 'file', value: 'src/autoload2.php' },
            { type: 'exclude', tag: 'directory', prefix: undefined, suffix: '.php', value: 'src/generated' },
            { type: 'exclude', tag: 'file', value: 'src/autoload.php' },
        ]);
    });

    it('coverage with multiple namespaces (intermediate array)', () => {
        // XML where 'package' repeats, creating an array structure in the parser
        const xml = generateXML(`
            <coverage>
                <project>
                    <package name="NamespaceA">
                        <file name="A.php"/>
                    </package>
                    <package name="NamespaceB">
                        <file name="B.php"/>
                    </package>
                </project>
            </coverage>
        `);

        // We need to access private method or verify via side effect if getCoverage isn't public.
        // Assuming we can test Element traversal via the loaded instance:
        const phpUnitXml = new PHPUnitXML();
        phpUnitXml.load(xml, 'phpunit.xml');

        // Access the underlying element to verify traversal logic in this context
        // Note: strict property access might require casting or internal testing
        const element = (phpUnitXml as any).element as Element; // Accessing private element for verification

        const files = element.querySelectorAll('phpunit coverage project package file');
        expect(files.length).toEqual(2);
        expect(files[0].getAttribute('name')).toEqual('A.php');
        expect(files[1].getAttribute('name')).toEqual('B.php');
    });

    it('load file', async () => {
        await phpUnitXML.loadFile(phpUnitProject('phpunit.xml'));

        expect(phpUnitXML.getTestSuites().length).not.toEqual(0);
    });
});
