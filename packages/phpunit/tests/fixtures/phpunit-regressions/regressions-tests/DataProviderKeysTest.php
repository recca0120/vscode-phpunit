<?php

namespace Regressions;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DataProviderKeysTest extends TestCase
{
    const CASES = ['alpha', 'beta'];

    /**
     * @dataProvider substrProvider
     */
    #[DataProvider('substrProvider')]
    public function test_substr_keys(int $value): void
    {
        $this->assertGreaterThan(0, $value);
    }

    public static function substrProvider(): array
    {
        return [
            substr('hello', 1, -1) => [1],
            substr('hello', -3, -1) => [2],
            substr('hello', -3, 3) => [3],
        ];
    }

    /**
     * @dataProvider nestedLoopProvider
     */
    #[DataProvider('nestedLoopProvider')]
    public function test_nested_loop_keys(int $value): void
    {
        $this->assertGreaterThan(0, $value);
    }

    public static function nestedLoopProvider(): iterable
    {
        foreach ([1, 2] as $i) {
            foreach (self::CASES as $case) {
                yield $case.$i => [$i];
            }
        }
    }

    /**
     * @dataProvider rowElementProvider
     */
    #[DataProvider('rowElementProvider')]
    public function test_row_element_keys(int $value): void
    {
        $this->assertGreaterThan(0, $value);
    }

    public static function rowElementProvider(): iterable
    {
        foreach ([['a', 1], ['b', 2]] as $row) {
            yield $row[0] => [$row[1]];
        }
    }

    /**
     * @dataProvider escapedKeyProvider
     */
    #[DataProvider('escapedKeyProvider')]
    public function test_escaped_keys(int $value): void
    {
        $this->assertGreaterThan(0, $value);
    }

    public static function escapedKeyProvider(): array
    {
        return ["tab\there" => [1]];
    }
}
