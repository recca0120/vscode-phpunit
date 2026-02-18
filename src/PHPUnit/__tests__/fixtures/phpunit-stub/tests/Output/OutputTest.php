<?php

namespace Tests\Output;

use PHPUnit\Framework\TestCase;

class OutputTest extends TestCase
{
    public function test_echo()
    {
        echo 'printed output';
        self::assertTrue(true);
    }

    public function test_die()
    {
        exit('printed output when die');
        self::assertTrue(true);
    }

    public function test_dump()
    {
        dump([
            'name' => 'PHPUnit',
            'version' => 12,
            'active' => true,
            'config' => null,
            'tags' => ['testing', 'php'],
            'nested' => [
                'pi' => 3.14,
                'enabled' => false,
            ],
        ]);

        self::assertTrue(true);
    }
}
