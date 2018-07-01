import { TestSuite } from '../../src/phpunit/test-suite';

describe('TestSuite Test', () => {
    it('it should parse methods', async () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: any[] = testSuite.parse(
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
                name: 'AssertionsTest',
                range: { end: { character: 14, line: 4 }, start: { character: 0, line: 4 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                name: 'test_method',
                range: { end: { character: 22, line: 6 }, start: { character: 11, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });

    it('it should parse methods with namespace', async () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: any[] = testSuite.parse(
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
                name: 'AssertionsTest',
                range: { end: { character: 14, line: 6 }, start: { character: 0, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                name: 'test_method',
                range: { end: { character: 22, line: 8 }, start: { character: 11, line: 8 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });

    it('it should parse methods with annotation', async () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: any[] = testSuite.parse(
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
                name: 'AssertionsTest',
                range: { end: { character: 14, line: 6 }, start: { character: 0, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                name: 'method',
                range: { end: { character: 17, line: 9 }, start: { character: 11, line: 9 } },
                uri: 'PHPUnitTest.php',
            },
        ]);
    });

    it('it should return no method when class is abstract', async () => {
        const testSuite: TestSuite = new TestSuite();

        const methods: any[] = testSuite.parse(
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
});
