<?php

namespace Tests;

use PHPUnit\Framework\TestCase;
use Tests\Concerns\SharedTests;

class SharedTraitUserTest extends TestCase
{
    use SharedTests;

    public function test_own(): void
    {
        $this->assertTrue(true);
    }
}
