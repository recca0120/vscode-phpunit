<?php

use Mockery as m;
use PHPUnit\Framework\TestCase;

class PHPUnitTest extends TestCase
{
    protected function tearDown()
    {
        m::close();
    }

    public function testPassed()
    {
        $this->assertTrue(true);
    }

    public function testFailed()
    {
        $this->assertTrue(false);
    }

    public function testSkipped()
    {
        $this->markTestSkipped('The MySQLi extension is not available.');
    }

    public function testIncomplete()
    {
        $this->markTestIncomplete('This test has not been implemented yet.');
    }

    public function testNoAssertions()
    {

    }

    public function testAssertNotEquals() {
        $this->assertSame(['a' => 'b', 'c' => 'd'], ['e' => 'f', 'g', 'h']);
    }

    /**
     * @test
     *
     * @return void
     */
    public function it_should_be_test_case() {

    }
}