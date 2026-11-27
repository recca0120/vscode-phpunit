<?php

namespace Regressions;

use PHPUnit\Framework\TestCase;

trait FarewellTrait
{
    public function test_bye(): void
    {
        $this->assertTrue(true);
    }
}

class TraitQualifiedAliasTest extends TestCase
{
    use FarewellTrait {
        FarewellTrait::test_bye as test_farewell;
    }
}
