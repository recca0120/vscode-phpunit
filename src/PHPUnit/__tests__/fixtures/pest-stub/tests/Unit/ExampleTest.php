<?php

test('example', function () {
    expect(true)->toBeTrue();
});

it('test example', function () {
    expect(true)->toBeTrue();
});

function hello(string $description,  callable $closure) {}

hello('hello', function () {
    expect(true)->toBeTrue();
});
