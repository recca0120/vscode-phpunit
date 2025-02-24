<?php

namespace Tests;

use PHPUnit\Framework\TestCase;

class StaticMethodTest extends TestCase
{
    public static function test_static_public_fail()
    {
    }

    protected static function test_protected_fail()
    {
    }

    private static function test_private_fail()
    {
    }
}
