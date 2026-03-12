<?php

namespace App\Domain;

enum PeName: string
{
    case Standard = 'Standard';
    case Dynamic = 'Dynamic';
    case Legacy = 'Legacy';
}
