import { parse } from './parser';

describe('PHPUnit XML Test', () => {
    const generateXML = (xml: string) => {
        return `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
>
    ${xml.trim()}
</phpunit>`;
    };

    it('without tags', () => {
        const phpUnitXML = parse(generateXML(``));
        expect(phpUnitXML.getTestSuites()).toEqual([]);
        expect(phpUnitXML.getIncludes()).toEqual([]);
        expect(phpUnitXML.getExcludes()).toEqual([]);
    });

    it('get one testsuites one directory', () => {
        expect(parse(generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite>
            </testsuites>
        `)).getTestSuites()).toEqual([
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit' },
        ]);
    });

    it('get one testsuites two directories', () => {
        expect(parse(generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                    <directory>tests/Unit2</directory>
                </testsuite>
            </testsuites>
        `)).getTestSuites()).toEqual([
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit2' },
        ]);
    });

    it('get two testsuites one directory', () => {
        expect(parse(generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite>
                <testsuite name="Feature">
                    <directory>tests/Feature</directory>
                </testsuite>
            </testsuites>
        `)).getTestSuites()).toEqual([
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tagName: 'directory', name: 'Feature', value: 'tests/Feature' },
        ]);
    });

    it('get two testsuites two directory', () => {
        expect(parse(generateXML(`
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
        `)).getTestSuites()).toEqual([
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { tagName: 'directory', name: 'Feature', value: 'tests/Feature' },
            { tagName: 'directory', name: 'Feature', value: 'tests/Feature2' },
        ]);
    });

    it('get one testsuites two directory two file', () => {
        expect(parse(generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                    <directory>tests/Unit2</directory>
                    <file>./vendor/someone/tests/MyClassTest.php</file>
                    <file>./vendor/someone/tests/MyClassTest2.php</file>
                </testsuite>
            </testsuites>
        `)).getTestSuites()).toEqual([
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { tagName: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest.php' },
            { tagName: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest2.php' },
        ]);
    });

    it('get one testsuites one directory and one exclude', () => {
        expect(parse(generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                    <exclude>./tests/Integration/OldTests</exclude>
                </testsuite>
            </testsuites>
        `)).getTestSuites()).toEqual([
            { tagName: 'directory', name: 'Unit', value: 'tests/Unit' },
            { tagName: 'exclude', name: 'Unit', value: './tests/Integration/OldTests' },
        ]);
    });

    it('get source include one directory', () => {
        expect(parse(generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                </include>
            </source>
        `)).getIncludes()).toEqual([
            { tagName: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
        ]);
    });

    it('get source include two directory', () => {
        expect(parse(generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                    <directory prefix="hello">app2</directory>
                </include>
            </source>
        `)).getIncludes()).toEqual([
            { tagName: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { tagName: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
        ]);
    });

    it('get source include one directory and one file', () => {
        expect(parse(generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                    <file>src/autoload.php</file>
                </include>
            </source>
        `)).getIncludes()).toEqual([
            { tagName: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { tagName: 'file', value: 'src/autoload.php' },
        ]);
    });

    it('get source include two directory and two file', () => {
        expect(parse(generateXML(`
            <source>
                <include>
                    <directory suffix=".php">app</directory>
                    <directory prefix="hello">app2</directory>
                    <file>src/autoload.php</file>
                    <file>src/autoload2.php</file>
                </include>
            </source>
        `)).getIncludes()).toEqual([
            { tagName: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { tagName: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
            { tagName: 'file', value: 'src/autoload.php' },
            { tagName: 'file', value: 'src/autoload2.php' },
        ]);
    });

    it('get source exclude one directory and one file', () => {
        expect(parse(generateXML(`
            <source>
                <exclude>
                    <directory suffix=".php">src/generated</directory>
                    <file>src/autoload.php</file>
                </exclude>
            </source>
        `)).getExcludes()).toEqual([
            { tagName: 'directory', prefix: undefined, suffix: '.php', value: 'src/generated' },
            { tagName: 'file', value: 'src/autoload.php' },
        ]);
    });

    it('get sources', () => {
        expect(parse(generateXML(`
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
        `)).getSources()).toEqual([
            { type: 'include', tagName: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { type: 'include', tagName: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
            { type: 'include', tagName: 'file', value: 'src/autoload.php' },
            { type: 'include', tagName: 'file', value: 'src/autoload2.php' },

            { type: 'exclude', tagName: 'directory', prefix: undefined, suffix: '.php', value: 'src/generated' },
            { type: 'exclude', tagName: 'file', value: 'src/autoload.php' },
        ]);
    });
});