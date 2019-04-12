<?php

namespace Recca0120\VSCode\Tests;

use PHPUnit\Framework\TestCase;

class AssertionsTest extends TestCase
{
    public function test_assert_true()
    {
        $this->assertTrue(true);
    }

    public function test_assert_true_is_fail()
    {
        $this->assertTrue(false);
    }

    public function test_assert_false()
    {
        $this->assertFalse(false);
    }

    public function test_assert_false_is_fail()
    {
        $this->assertFalse(true);
    }
}
