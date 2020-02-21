const util = require('util');
const tty = require('tty');
const readline = require('readline');

const sleep = util.promisify(function timeout(milisseconds, callback) {
    setTimeout(callback, milisseconds);
});

const editor = {
    display: '',
    content: ''
};

function displayWrite(text) {
    editor.content = text;
    displayRefresh();
}

function displayRefresh() {
    // must respect window size, apply colors
    // and replace special chars
    editor.display = editor.content;

    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    process.stdout.write(editor.display);
}

function terminalSetup() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    readline.emitKeypressEvents(process.stdin);
}

function terminalFinish(status = 0) {
    displayWrite('');
    process.exit(status);
}

process.stdin.on('keypress', function (char, key) {
    if (key && key.ctrl && key.name == 'c') {
        return terminalFinish();
    }
});

process.stdout.on('resize', displayRefresh);

(async function main() {
    terminalSetup();

    displayWrite('hello\nworld 1!!!');
    await sleep(1 * 1000);
    displayWrite('hello\nworld 2!!!');
    await sleep(1 * 1000);
    displayWrite('hello\nworld 3!!!');

    await sleep(10 * 1000);

    terminalFinish();
})();
