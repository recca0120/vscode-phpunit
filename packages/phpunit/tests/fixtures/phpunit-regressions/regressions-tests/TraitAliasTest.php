<?php

namespace Regressions;

use PHPUnit\Framework\TestCase;

trait GreetingTrait
{
    public function test_hello(): void
    {
        $this->assertTrue(true);
    }
}

class TraitAliasTest extends TestCase
{
    use GreetingTrait {
        test_hello as test_greeting;
    }
}
