const util = require('util');
const tty = require('tty');
const readline = require('readline');
const File = require('./src/file');

const file = new File();
global.lastText = '';

function displayRender(text) {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    global.lastText = JSON.stringify(file.cursor);
    process.stdout.write(`${text}\n${global.lastText}`);
}

function displayRefresh() {
    // must respect window size, apply colors
    // and replace special chars
    const display = file.getDisplayLines();

    displayRender(display);
}

function displayResize() {
    file.resizeRows(process.stdout.columns, process.stdout.rows - 3);
    displayRefresh();
}

function terminalSetup() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.write('\x1B[?25l');
    readline.emitKeypressEvents(process.stdin);
    displayRefresh();

    process.stdin.on('keypress', function (char, key) {
        if (!key) { return; }

        if (key.ctrl) {
            if (key.name === 'c') { return terminalFinish(); }

            if (key.name === 'k') { file.moveTo({ x: 0, y: 1 }); }
            if (key.name === 'l') { file.moveTo({ x: 1, y: 0 }); }
            displayRefresh();

            return;
        }

        if (key.sequence === '\b' && key.name === 'backspace') {
            file.moveTo({ x: -1, y: 0 });
            displayRefresh();
            return;
        }

        if (key.sequence === '\n' && key.name === 'enter') {
            file.moveTo({ x: 0, y: -1 });
            displayRefresh();
            return;
        }


        file.processKey(key.name);

        displayRefresh();
    });

    process.stdout.on('resize', displayResize);

}

function terminalFinish(status = 0) {
    process.stdin.write('\x1B[?25h');
    displayRender('');
    process.exit(status);
}
function main() {
    terminalSetup();
    displayResize();
}

main();
