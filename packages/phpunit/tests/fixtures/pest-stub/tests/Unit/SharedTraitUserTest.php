<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Tests\Unit\Concerns\SharedTests;

class SharedTraitUserTest extends TestCase
{
    use SharedTests;

    public function test_own(): void
    {
        $this->assertTrue(true);
    }
}
