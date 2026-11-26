<?php

namespace Tests\Support;

use PHPUnit\Framework\TestCase;

abstract class AbstractSharedTestCase extends TestCase
{
    public function test_from_support_base(): void
    {
        $this->assertTrue(true);
    }
}
