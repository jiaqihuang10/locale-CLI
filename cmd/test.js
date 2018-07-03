const readline = require('readline');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');

process.stdin.on('end', () => {
    process.stdout.write('end');
});