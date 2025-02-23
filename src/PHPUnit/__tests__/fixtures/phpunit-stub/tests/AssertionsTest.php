<?php

namespace Tests;

use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase;

class AssertionsTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_passed()
    {
        $this->assertTrue(true);
    }

    /**
     * @depends test_passed
     */
    public function test_failed()
    {
        $this->assertTrue(false);
    }

    public function test_is_not_same()
    {
        $this->assertSame(['a' => 'b', 'c' => 'd'], ['e' => 'f', 'g', 'h']);
    }

    public function test_risky()
    {
        $a = 1;
    }

    /**
     * @test
     */
    public function annotation_test()
    {
        $this->assertTrue(true);
    }

    public function test_skipped()
    {
        $this->markTestSkipped('The MySQLi extension is not available.');
    }

    public function test_incomplete()
    {
        $this->markTestIncomplete('This test has not been implemented yet.');
    }

    /**
     * @test
     *
     * @depends test_passed
     *
     * @dataProvider additionProvider
     */
    public function addition_provider($a, $b, $expected)
    {
        $this->assertEquals($expected, $a + $b);
    }

    public static function additionProvider()
    {
        return [
            '"foo-bar_%$' => [0, 0, 0],
            [0, 1, 1],
            [1, 0, 2],
        ];
    }

    /**
     * @test
     *
     * @testdox has an initial balance of zero
     */
    public function balanceIsInitiallyZero(): void
    {
        $this->assertSame(0, 0);
    }
}
