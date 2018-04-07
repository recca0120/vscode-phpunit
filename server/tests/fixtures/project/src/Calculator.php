<?php

namespace App;

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
}
