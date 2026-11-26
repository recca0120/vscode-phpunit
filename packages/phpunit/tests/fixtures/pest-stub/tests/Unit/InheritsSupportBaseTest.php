<?php

namespace Tests\Unit;

use Tests\Support\AbstractSharedTestCase;

class InheritsSupportBaseTest extends AbstractSharedTestCase
{
    public function test_own(): void
    {
        $this->assertTrue(true);
    }
}
