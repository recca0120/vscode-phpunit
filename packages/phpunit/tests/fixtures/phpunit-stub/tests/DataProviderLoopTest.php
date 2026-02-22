<?php

namespace Tests;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DataProviderLoopTest extends TestCase
{
    const CASES = ['alpha', 'beta', 'gamma'];

    #[DataProvider('forLoopProvider')]
    public function test_for_loop_provider(int $i): void
    {
        $this->assertIsInt($i);
    }

    public static function forLoopProvider(): Generator
    {
        for ($i = 0; $i < 3; $i++) {
            yield "case $i" => [$i];
        }
    }

    #[DataProvider('foreachArrayProvider')]
    public function test_foreach_array_provider(string $v): void
    {
        $this->assertIsString($v);
    }

    public static function foreachArrayProvider(): Generator
    {
        foreach (['alpha', 'beta', 'gamma'] as $v) {
            yield $v => [$v];
        }
    }

    #[DataProvider('foreachConstProvider')]
    public function test_foreach_const_provider(string $v): void
    {
        $this->assertIsString($v);
    }

    public static function foreachConstProvider(): Generator
    {
        foreach (self::CASES as $v) {
            yield $v => [$v];
        }
    }
}
