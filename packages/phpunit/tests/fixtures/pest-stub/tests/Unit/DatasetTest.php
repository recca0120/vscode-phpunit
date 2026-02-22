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

it('multiplies numbers', function (int $a, int $b, int $expected) {
    expect($a * $b)->toBe($expected);
})->with([
    [2, 3, 6],
    [4, 5, 20],
]);

it('business closed', function (string $business, string $day) {
    expect(true)->toBeTrue();
})->with(['Office', 'Bank'])->with(['Saturday', 'Sunday']);

it('generates numbers', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with(function () {
    yield 'gen one' => [1, 0, 1];
    yield 'gen two' => [0, 1, 1];
});
