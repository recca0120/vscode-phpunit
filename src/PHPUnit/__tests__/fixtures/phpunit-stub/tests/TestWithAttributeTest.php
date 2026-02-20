<?php

namespace Tests;

use PHPUnit\Framework\Attributes\TestWith;
use PHPUnit\Framework\Attributes\TestWithJson;
use PHPUnit\Framework\TestCase;

class TestWithAttributeTest extends TestCase
{
    #[TestWith([1, 2, 3])]
    #[TestWith([0, 0, 0])]
    public function testWithInline(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    #[TestWithJson('[1, 1, 2]')]
    #[TestWithJson('[3, 4, 7]')]
    public function testWithJson(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }
}
