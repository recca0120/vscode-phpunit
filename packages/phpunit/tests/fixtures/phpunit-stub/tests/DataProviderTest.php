<?php

namespace Tests;

use Generator;
use PHPUnit\Framework\TestCase;

class DataProviderTest extends TestCase
{
    /**
     * @dataProvider annotationProvider
     */
    public function test_annotation_provider(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function annotationProvider(): array
    {
        return [
            'zero plus zero' => [0, 0, 0],
            'one plus one'   => [1, 1, 2],
        ];
    }

    /**
     * @dataProvider generatorProvider
     */
    public function test_generator_provider(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function generatorProvider(): Generator
    {
        yield 'yield one' => [1, 0, 1];
        yield 'yield two' => [0, 1, 1];
    }
}
