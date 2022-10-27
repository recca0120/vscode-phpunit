<?php

namespace Recca0120\VSCode\Tests;

use PHPUnit\Framework\TestCase;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;

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
     * @depends test_passed
     * @dataProvider additionProvider
     */
    public function addition_provider($a, $b, $expected)
    {
        $this->assertEquals($expected, $a + $b);
    }

    public function additionProvider()
    {
        return [
            [0, 0, 0],
            [0, 1, 1],
            [1, 0, 2],
        ];
    }
}