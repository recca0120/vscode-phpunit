<?php

namespace Tests\SubFolder;

use PHPUnit\Framework\TestCase;

trait TestMethodTrait
{
    public function test_from_trait(): void
    {
        $this->assertTrue(true);
    }

    public function test_shared(): void
    {
        $this->assertTrue(true);
    }
}

trait AnotherTrait
{
    public function test_from_another(): void
    {
        $this->assertTrue(true);
    }

    public function test_shared(): void
    {
        $this->assertTrue(true);
    }
}

class UseTraitTest extends TestCase
{
    use TestMethodTrait, AnotherTrait {
        TestMethodTrait::test_shared insteadof AnotherTrait;
        AnotherTrait::test_shared as test_shared_alias;
    }

    /** @test */
    public function use_trait(): void
    {
        $this->assertTrue(true);
    }
}

trait UseTrait
{
}
