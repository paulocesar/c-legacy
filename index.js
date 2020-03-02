const util = require('util');
const tty = require('tty');
const readline = require('readline');
const Editor = require('./src/editor');
const CommandLine = require('./src/command-line');

let grid = [ [ ], [ ], [ ] ];

function gridRows(idx) { return grid[idx].length; }

function gridColumns() {
    let count = 0;

    for (let i = 0; i < grid.length; i++) {
        if (grid[i].length > 0) { count++; }
    }

    return count;
}

function gridClear() {
    const oldGrid = grid;
    grid = [ ];
    for (let c = 0; c < 3; c++) {
        const cArray = [ ];

        for (const e of oldGrid[c]) {
            if (!e.mustRemove) { cArray.push(e); }
        }

        if (cArray.length) { grid.push(cArray); }
    }

    while(grid.length < 3) { grid.push([ ]); }
}

let commandLine = null;
let mode = 'editor';
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
    const gColumns = gridColumns();
    const gLines = [ ];

    for (let c = 0; c < gColumns; c++) {
        const gRows = gridRows(c);

        let lineIdx = 0;
        for (let r = 0; r < gRows; r++) {
            const lines = grid[c][r].getDisplayLines();

            for (let l = 0; l < lines.length; l++) {l
                if (gLines[lineIdx] == null) { gLines[lineIdx] = ''; }
                if (c > 0) { gLines[lineIdx] += '|'; }
                gLines[lineIdx] += lines[l];
                lineIdx++;
            }
        }
    }

    displayRender(gLines.concat(commandLine.getDisplayLines()));
}

function displayClear() {
    previousLines = [ ];
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
}

function displayResize() {
    const maxCols = process.stdout.columns;
    const maxRows = process.stdout.rows - 2;
    const gColumns = gridColumns();
    const colSeparators = gColumns <= 1 ? 0 : gColumns - 1;
    const cols = gColumns <= 1 ? maxCols :
        (Math.floor(maxCols / gColumns) - colSeparators);

    for (let c = 0; c < gColumns; c++) {
        const gRows = gridRows(c);
        const rows = gRows <= 1 ? maxRows :
            (Math.floor(maxRows / gRows));

        for (let r = 0; r < gRows; r++) {
            grid[c][r].resizeRows(cols, rows);
        }
    }

    commandLine.resizeRows(process.stdout.columns, 1);
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

        if (mode === 'command') {
            commandLine.processKey(char, key);
        } else {
            grid[0][0].processKey(char, key);
        }

        displayRefresh();
    });

    process.stdout.on('resize', displayResize);
}

function terminalLoad(filename) {
    const editor = new Editor(filename);
    editor.on('refresh', () => displayRefresh());
    editor.on('mode:command', () => {
        commandLine.start(editor);
        mode = 'command';
    });

    grid[0].push(editor);
    grid[1].push(new Editor(filename));

    commandLine = new CommandLine();
    commandLine.on('refresh', () => displayRefresh());
    commandLine.on('mode:editor', () => {
        mode = 'editor';
        gridClear();
        displayRefresh();
    });
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
