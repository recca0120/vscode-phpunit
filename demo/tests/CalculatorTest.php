<?php

use PHPUnit\Framework\TestCase;

require __DIR__.'/../src/Calculator.php';

class CalculatorTest extends TestCase
{
    public function testAdd()
    {
        $calculator = new Calculator();

        $this->assertEquals(9, $calculator->add(4, 5));
    }

    public function testMltiply()
    {
        $calculator = new Calculator();

        $this->assertEquals(20, $calculator->multiply(4, 5));
    }

    public function testDivide()
    {
        $calculator = new Calculator();

        $this->assertEquals(4, $calculator->divide(20, 5));
    }

    public function testSubtract()
    {
        $calculator = new Calculator();

        $this->assertEquals(-1, $calculator->subtract(4, 5));
    }
}
