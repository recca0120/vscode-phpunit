<?php

namespace Recca0120\VSCode\Tests\SubFolder;

use PHPUnit\Framework\TestCase;

class UseTraitTest extends TestCase
{
    use UseTrait;
}

trait UseTrait
{
    /** @test */
    public function use_trait()
    {
        $this->assertTrue(true);
    }
}