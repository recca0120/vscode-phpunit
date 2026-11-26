<?php

namespace Tests;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../support/RequiredTrait.php';

class RequireTraitTest extends TestCase
{
    use \RequiredTrait;

    public function test_own(): void
    {
        $this->assertTrue(true);
    }
}
