import { parse } from './xml-parser';

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

    it('get one testsuites one directory', () => {
        expect(parse(generateXML(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite>
            </testsuites>
        `)).getTestSuites()).toEqual([
            { type: 'directory', name: 'Unit', value: 'tests/Unit' },
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
            { type: 'directory', name: 'Unit', value: 'tests/Unit' },
            { type: 'directory', name: 'Unit', value: 'tests/Unit2' },
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
            { type: 'directory', name: 'Unit', value: 'tests/Unit' },
            { type: 'directory', name: 'Feature', value: 'tests/Feature' },
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
            { type: 'directory', name: 'Unit', value: 'tests/Unit' },
            { type: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { type: 'directory', name: 'Feature', value: 'tests/Feature' },
            { type: 'directory', name: 'Feature', value: 'tests/Feature2' },
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
            { type: 'directory', name: 'Unit', value: 'tests/Unit' },
            { type: 'directory', name: 'Unit', value: 'tests/Unit2' },
            { type: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest.php' },
            { type: 'file', name: 'Unit', value: './vendor/someone/tests/MyClassTest2.php' },
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
            { type: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
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
            { type: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { type: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
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
            { type: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { type: 'file', value: 'src/autoload.php' },
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
            { type: 'directory', prefix: undefined, suffix: '.php', value: 'app' },
            { type: 'directory', prefix: 'hello', suffix: undefined, value: 'app2' },
            { type: 'file', value: 'src/autoload.php' },
            { type: 'file', value: 'src/autoload2.php' },
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
            { type: 'directory', prefix: undefined, suffix: '.php', value: 'src/generated' },
            { type: 'file', value: 'src/autoload.php' },
        ]);
    });
});