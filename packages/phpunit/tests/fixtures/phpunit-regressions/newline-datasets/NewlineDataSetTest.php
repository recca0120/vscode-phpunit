<?php

namespace Regressions;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class NewlineDataSetTest extends TestCase
{
    /**
     * @dataProvider provider
     */
    #[DataProvider('provider')]
    public function test_key(int $value): void
    {
        $this->assertGreaterThan(0, $value);
    }

    public static function provider(): array
    {
        return ["first\nsecond" => [1], 'plain' => [2]];
    }
}
