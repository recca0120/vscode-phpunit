<?php

use function Pest\version;

arch('preset  → php ')->preset()->php();
arch('preset  → strict ')->preset()->strict();
arch('preset  → security ')->preset()->security();

describe('Given a project', function () {
    describe('When the architecture is tested', function () {
        arch('Then should pass the PHP preset')->preset()->php();
    });
});
