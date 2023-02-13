<?php

namespace Recca0120\VSCode\Tests;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class AttributeTest extends TestCase
{
    #[Test]
    public function hi(): void
    {
        self::assertTrue(true);
    }
}
