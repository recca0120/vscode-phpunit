<?php

namespace Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DataProviderAttributeTest extends TestCase
{
    #[DataProvider('attributeProvider')]
    public function testAttributeProvider(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function attributeProvider(): array
    {
        return [
            'two plus three' => [2, 3, 5],
            [4, 5, 9],
        ];
    }
}
