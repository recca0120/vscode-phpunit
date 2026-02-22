<?php

namespace Tests;

use Generator;
use PHPUnit\Framework\TestCase;

class DataProviderAnnotationTest extends TestCase
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
            'one plus one' => [1, 1, 2],
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

    /**
     * @dataProvider multiProviderA
     * @dataProvider multiProviderB
     */
    public function test_multi_provider(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function multiProviderA(): array
    {
        return ['one plus one' => [1, 1, 2]];
    }

    public static function multiProviderB(): array
    {
        return [[2, 3, 5]];
    }
}
