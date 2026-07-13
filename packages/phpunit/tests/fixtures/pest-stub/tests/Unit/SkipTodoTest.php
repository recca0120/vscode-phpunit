<?php

it('is skipped', function () {
    expect(true)->toBe(true);
})->skip('not ready yet');

it('is a todo', function () {
    expect(true)->toBe(true);
})->todo();
