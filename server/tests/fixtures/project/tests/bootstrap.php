<?php

require __DIR__.'/../vendor/autoload.php';

if (class_exists('PHPUnit\Framework\TestCase') === false) {
    class_alias('PHPUnit_Framework_TestCase', 'PHPUnit\Framework\TestCase');
}
