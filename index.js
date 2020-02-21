const util = require('util');
const tty = require('tty');
const readline = require('readline');
const File = require('./src/file');

const sleep = util.promisify(function timeout(milisseconds, callback) {
    setTimeout(callback, milisseconds);
});

const file = new File();

function displayRender(text) {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    process.stdout.write(`${text}`);
}

function displayRefresh() {
    // must respect window size, apply colors
    // and replace special chars
    const display = file.getDisplayLines()
        .map((l) => l == null ? '~' : l)
        .join('\n');

    displayRender(display);
}

function displayResize() {
    file.resizeRows(process.stdout.rows - 3);
    displayRefresh();
}

function terminalSetup() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.write('\x1B[?25l');
    readline.emitKeypressEvents(process.stdin);
    displayRefresh();
}

function terminalFinish(status = 0) {
    process.stdin.write('\x1B[?25h');
    displayRender('');
    process.exit(status);
}

process.stdin.on('keypress', function (char, key) {
    if (!key) { return; }

    if (key.ctrl) {
        if (key.name === 'c') {
            return terminalFinish();
        }
        return;
    }

    file.add(key.name);

    displayRefresh();
});

process.stdout.on('resize', displayResize);

function main() {
    terminalSetup();
    displayResize();
}

main();
