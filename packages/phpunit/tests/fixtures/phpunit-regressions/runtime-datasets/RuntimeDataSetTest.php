<?php

namespace Regressions;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RuntimeDataSetTest extends TestCase
{
    /**
     * @dataProvider provider
     */
    #[DataProvider('provider')]
    public function test_runtime_keys(int $value): void
    {
        $this->assertGreaterThan(0, $value);
    }

    public static function provider(): array
    {
        return [strrev('ab') => [1], strrev('cd') => [2]];
    }
}
