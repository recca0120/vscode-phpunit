<?php

namespace Tests;

use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    public function test_addition()
    {
        $this->assertSame(4, 2 + 2);
    }

    public function test_subtraction()
    {
        $this->assertSame(0, 2 - 2);
    }
}
