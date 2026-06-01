#!/usr/bin/env node

/**
 * CLI Wrapper - umożliwia działanie CLI bez budowania projektu
 * 
 * Po npm install:
 * - Próbuje użyć skompilowanej wersji (dist/) jeśli istnieje
 * - Fallback: ts-node (development) - wykonuje TypeScript bezpośrednio
 * 
 * Dzięki temu CLI jest dostępne natychmiast po instalacji dependencies.
 */

const path = require('path');
const fs = require('fs');

const distEntry = path.join(__dirname, '../dist/bin/gateway-cli.js');
const tsEntry = path.join(__dirname, 'gateway-cli.ts');

if (fs.existsSync(distEntry)) {
    // console.log('[Gateway CLI] Using compiled version');
    require(distEntry);
} else {
    // console.log('[Gateway CLI] Running via ts-node (no build required)');

    require('tsconfig-paths/register');

    require('ts-node').register({
        project: path.join(__dirname, '../tsconfig.json'),
        transpileOnly: true,
    });

    require(tsEntry);
}

