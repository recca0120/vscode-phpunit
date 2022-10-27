<?php

namespace Recca0120\VSCode;

use Exception;

class Calculator
{
    public function sum($a, $b)
    {
        return $a + $b;
    }

    public function sumItem(Item $a, Item $b)
    {
        return $a->value() + $b->value();
    }

    public function throwException()
    {
        throw new Exception;
    }
}
