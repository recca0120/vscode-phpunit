<?php

it('adds numbers', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with([
    'one plus one' => [1, 1, 2],
    'two plus three' => [2, 3, 5],
]);

it('validates emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with(['alice@example.com', 'bob@example.com']);
