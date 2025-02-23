<?php

namespace Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Depends;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;

class AttributeTest extends TestCase
{
    #[Test]
    public function hi(): void
    {
        self::assertTrue(true);
    }

    #[DataProvider('additionProvider')]
    public function testAdd(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function additionProvider(): array
    {
        return [
            [0, 0, 0],
            [0, 1, 1],
            [1, 0, 1],
            [1, 1, 3],
        ];
    }

    public function testEmpty(): array
    {
        $stack = [];
        $this->assertEmpty($stack);

        return $stack;
    }

    #[Depends('testEmpty')]
    public function testPush(array $stack): array
    {
        array_push($stack, 'foo');
        $this->assertSame('foo', $stack[count($stack) - 1]);
        $this->assertNotEmpty($stack);

        return $stack;
    }

    #[Test]
    #[TestDox('has an initial balance of zero')]
    public function balanceIsInitiallyZero(): void
    {
        $this->assertSame(0, 0);
    }
}
