<?php

namespace Tests;

use Mockery\Adapter\Phpunit\MockeryTestCase;

abstract class VendorBaseTestCase extends MockeryTestCase
{
    public function test_from_vendor_base(): void
    {
        $this->assertTrue(true);
    }
}
