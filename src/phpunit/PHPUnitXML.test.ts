import 'jest';
import { PHPUnitXML } from './PHPUnitXML';

describe('PHPUnit XML Test', () => {
    const parse = (text: Buffer | string) => new PHPUnitXML(text);
    const generateXML = (text: string) => {
        return `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
>
    ${text.trim()}
</phpunit>`;
    };

    it('without tags', () => {
        const phpUnitXml = parse(generateXML(``));
        expect(phpUnitXml.getTestSuites()).toEqual([]);
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

        expect(parse(xml).getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Unit', value: 'tests/Unit2' },
        ]);
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

        expect(parse(xml).getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Feature', value: 'tests/Feature' },
        ]);
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

        expect(parse(xml).getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { tag: 'directory', name: 'Feature', value: 'tests/Feature' },
            { tag: 'directory', name: 'Feature', value: 'tests/Feature2' },
        ]);
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

        expect(parse(xml).getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { tag: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest.php' },
            { tag: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest2.php' },
        ]);
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

        expect(parse(xml).getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tag: 'exclude', name: 'Unit', value: './tests/Integration/OldTests' },
        ]);
    });

    it('testsuite directory has suffix', () => {
        const xml = generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory suffix=".phpt">tests/Unit</directory>
                </testsuite>
            </testsuites>
        `);

        expect(parse(xml).getTestSuites()).toEqual([
            { tag: 'directory', name: 'Unit', prefix: undefined, suffix: '.phpt', value: 'tests/Unit' },
        ]);
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
});
