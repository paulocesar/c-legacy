const util = require('util');
const tty = require('tty');
const readline = require('readline');
const Editor = require('./src/editor');

let editor = null;
global.lastText = '';

let previousLines = [ ];

function displayRender(lines) {
    for (let y = 0; y < process.stdout.rows; y++) {
        if (lines[y] === previousLines[y]) { continue; }
        readline.cursorTo(process.stdout, 0, y);
        process.stdout.write(lines[y]);
    }

    previousLines = lines;
}

function displayRefresh() {
    // must respect window size, apply colors
    // and replace special chars

    const lines = editor.getDisplayLines();
    lines.push(global.lastText);

    displayRender(lines);
}

function displayResize() {
    editor.resizeRows(process.stdout.columns, process.stdout.rows - 3);
    displayRefresh();
}

function terminalSetup() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.write('\x1B[?25l');
    readline.emitKeypressEvents(process.stdin);

    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);

    displayRefresh();

    process.stdin.on('keypress', function (char, key) {
        if (!key) { return; }

        // global.lastText = `char: ${char}, key: ${JSON.stringify(key)}`;

        if (key.ctrl) {
            if (key.name === 'c') { return terminalFinish(); }
            if (key.name === 's') { return terminalSave(); }

            if (key.name === 'k') { editor.moveTo({ x: 0, y: -1 }); }
            if (key.name === 'l') { editor.moveTo({ x: 1, y: 0 }); }
            displayRefresh();

            return;
        }

        if (key.sequence === '\b' && key.name === 'backspace') {
            editor.moveTo({ x: -1, y: 0 });
            displayRefresh();
            return;
        }

        if (key.sequence === '\n' && key.name === 'enter') {
            editor.moveTo({ x: 0, y: 1 });
            displayRefresh();
            return;
        }


        editor.processKey(key.name || key.sequence);

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
    process.stdin.write('\x1B[?25h');
    process.exit(status);
}
function main() {
    terminalLoad(process.argv[2]);
    terminalSetup();
    displayResize();
}

main();
