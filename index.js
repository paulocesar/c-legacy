const util = require('util');
const tty = require('tty');
const readline = require('readline');
const Editor = require('./src/editor');

let editor = null;

let previousLines = [ ];

function displayRender(lines) {
    for (let y = 0; y < process.stdout.rows; y++) {
        if (lines[y] == null) { continue; }
        if (lines[y] === previousLines[y]) { continue; }
        readline.cursorTo(process.stdout, 0, y);
        process.stdout.write(lines[y]);
    }

    previousLines = lines;
}

function displayRefresh() {
    const lines = editor.getDisplayLines();

    displayRender(lines);
}

function displayClear() {
    previousLines = [ ];
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
}

function displayResize() {
    editor.resizeRows(process.stdout.columns, process.stdout.rows - 2);
    displayClear();
    displayRefresh();
}

function terminalSetup() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.write('\x1B[?25l');
    readline.emitKeypressEvents(process.stdin);

    displayClear();

    displayRefresh();

    process.stdin.on('keypress', function (char, key) {
        if (!key) { return; }

        if (key.ctrl) {
            if (key.name === 'c') { return terminalFinish(); }
            if (key.name === 's') { return terminalSave(); }
        }

        editor.processKey(char, key);
        displayRefresh();
    });

    process.stdout.on('resize', displayResize);
}

function terminalLoad(filename) {
    editor = new Editor(filename);
}

function terminalSave() {
    const filename = process.argv[2];
}

function terminalFinish(status = 0) {
    displayClear();
    process.stdin.write('\x1B[?25h');
    process.exit(status);
}
function main() {
    terminalLoad(process.argv[2]);
    terminalSetup();
    displayResize();
}

main();
