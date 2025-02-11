<?php

use function Pest\version;

arch('preset  → php ')->preset()->php();
arch('preset  → strict ')->preset()->strict();
arch('preset  → security ')->preset()->security();
arch('')->preset()->php();
