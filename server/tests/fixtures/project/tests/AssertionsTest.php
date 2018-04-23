<?php

namespace Tests;

use PHPUnit\Framework\TestCase;

class AssertionsTest extends TestCase
{
    public function test_passed()
    {
        $this->assertTrue(true);
    }

    public function test_error()
    {
        $this->assertTrue(false);
    }

    public function test_assertion_isnt_same()
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
    public function it_should_be_annotation_test()
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

    public function test_no_assertion()
    {
    }

    /**
    * @dataProvider additionProvider
    */
    public function test_addition_provider($a, $b, $expected)
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
