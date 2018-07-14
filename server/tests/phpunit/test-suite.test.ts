import { TestSuite } from '../../src/phpunit/test-suite';
import { Method } from '../../src/phpunit/common';
import { Filesystem, Factory as FilesystemFactory } from '../../src/filesystem';

describe('TestSuite Test', () => {
    it('it should parse methods', () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: Method[] = testSuite.parse(
            `
<?php
use PHPUnit\\Framework\\TestCase;

class AssertionsTest extends TestCase
{
    public function test_method()
    {
        $this->assertTrue(true);
    }
}
        `,
            'PHPUnitTest.php'
        );

        expect(methods).toEqual([
            {
                kind: 'class',
                namespace: '',
                name: 'AssertionsTest',
                range: { end: { character: 1, line: 10 }, start: { character: 0, line: 4 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                namespace: 'AssertionsTest',
                name: 'test_method',
                range: { end: { character: 5, line: 9 }, start: { character: 11, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });

    it('it should parse methods with namespace', () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: Method[] = testSuite.parse(
            `
<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class AssertionsTest extends TestCase
{
    public function test_method()
    {
        $this->assertTrue(true);
    }

    private function test_method2() {}
}
        `,
            'PHPUnitTest.php'
        );

        expect(methods).toEqual([
            {
                kind: 'class',
                namespace: 'Tests',
                name: 'AssertionsTest',
                range: { end: { character: 1, line: 14 }, start: { character: 0, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                namespace: 'Tests\\AssertionsTest',
                name: 'test_method',
                range: { end: { character: 5, line: 11 }, start: { character: 11, line: 8 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });

    it('it should parse methods with annotation', () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: Method[] = testSuite.parse(
            `
<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class AssertionsTest extends TestCase
{
    /** @test */
    public function method()
    {
        $this->assertTrue(true);
    }

    /** @test */
    private function method2() {}
}
        `,
            'PHPUnitTest.php'
        );

        expect(methods).toEqual([
            {
                kind: 'class',
                namespace: 'Tests',
                name: 'AssertionsTest',
                range: { end: { character: 1, line: 16 }, start: { character: 0, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                namespace: 'Tests\\AssertionsTest',
                name: 'method',
                range: { end: { character: 5, line: 12 }, start: { character: 11, line: 9 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });

    it('it should return no method when class is abstract', () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: Method[] = testSuite.parse(
            `
<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

abstract class AssertionsTest extends TestCase
{
    /** @test */
    public function method()
    {
        $this->assertTrue(true);
    }
}
        `,
            'PHPUnitTest.php'
        );

        expect(methods).toEqual([]);
    });

    it('it should parse methods with depends', () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: Method[] = testSuite.parse(
            `
<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class AssertionsTest extends TestCase
{
    /** @test */
    public function method()
    {
        $this->assertTrue(true);
    }

    /**
     * @test
     * @depends method
     */
    public function method2() {}

    /**
     * @test
     * @depends method2
     */
    public function method3() {}

    /**
     * @test
     * @depends method
     * @depends method2
     */
    public function method4() {}
}
        `,
            'PHPUnitTest.php'
        );

        expect(methods).toEqual([
            {
                kind: 'class',
                name: 'AssertionsTest',
                namespace: 'Tests',
                range: { end: { character: 1, line: 32 }, start: { character: 0, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                name: 'method',
                namespace: 'Tests\\AssertionsTest',
                range: { end: { character: 5, line: 12 }, start: { character: 11, line: 9 } },
                uri: 'PHPUnitTest.php',
            },
            {
                depends: ['method'],
                kind: 'method',
                name: 'method2',
                namespace: 'Tests\\AssertionsTest',
                range: { end: { character: 32, line: 18 }, start: { character: 11, line: 18 } },
                uri: 'PHPUnitTest.php',
            },
            {
                depends: ['method', 'method2'],
                kind: 'method',
                name: 'method3',
                namespace: 'Tests\\AssertionsTest',
                range: {
                    end: { character: 32, line: 24 },
                    start: { character: 11, line: 24 },
                },
                uri: 'PHPUnitTest.php',
            },
            {
                depends: ['method', 'method2'],
                kind: 'method',
                name: 'method4',
                namespace: 'Tests\\AssertionsTest',
                range: { end: { character: 32, line: 31 }, start: { character: 11, line: 31 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });

    it('it should parse file', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const testSuite: TestSuite = new TestSuite(files);

        spyOn(files, 'get').and.returnValue(`
<?php
use PHPUnit\\Framework\\TestCase;

class AssertionsTest extends TestCase
{
    public function test_method()
    {
        $this->assertTrue(true);
    }
}
        `);

        const methods: Method[] = await testSuite.parseFile('PHPUnitTest.php');

        expect(methods).toEqual([
            {
                kind: 'class',
                namespace: '',
                name: 'AssertionsTest',
                range: { end: { character: 1, line: 10 }, start: { character: 0, line: 4 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                namespace: 'AssertionsTest',
                name: 'test_method',
                range: { end: { character: 5, line: 9 }, start: { character: 11, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });
});
