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

let commandLine = null;
let mode = 'editor';
let previousLines = [ ];
let selectionBuffer = '';
let globalLock = false;

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
            grid[c][r].resizeRows(cols, r === 0 ? rows : rows - 1);
        }
    }

    commandLine.resizeRows(process.stdout.columns, 1);
    displayClear();
    displayRefresh();
}


function createEditor(filename) {
    const editor = new Editor(filename);
    editor.on('refresh', () => displayRefresh());
    editor.on('mode', (m) => {
        if (m === 'command' ) { commandLine.start(getEditor()); }
        mode = m;
    });
    editor.on('selection:buffer', (b) => { selectionBuffer = b; });

    editor.on('selection:paste', () => {
        editor.pasteBuffer(selectionBuffer);
    });

    editor.on('editor:open', ({ split, filename }) => {
        gridAdd(createEditor(filename), split);
    });

    editor.on('editor:close', () => {
        editor.mustRemove = true;
        gridClear();

        if (gridIsEmpty()) { return terminalFinish(); }
    });

    return editor;
}

let gridPos = { x: 0, y: 0 };
function getEditor() { return grid[gridPos.x][gridPos.y]; }

function gridIsEmpty() {
    return !grid[0].length && !grid[1].length && !grid[2].length;
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

    displayResize();
}

function gridNavigate(direction) {
    const newPos = { x: gridPos.x, y: gridPos.y };

    if (direction === 'up') { newPos.y--; }
    if (direction === 'down') { newPos.y++ }
    if (direction === 'left') { newPos.x--; }
    if (direction === 'right') { newPos.x++ }

    if (!grid[newPos.x][newPos.y]) {
        getEditor().setTempStatusMessage(`no file`);
    }

    getEditor().hasFocus = false;
    gridPos.x = newPos.x;
    gridPos.y = newPos.y;
    getEditor().hasFocus = true;

    displayRefresh();
}

function gridAdd(editor, split) {
    let y = 0;

    function splitVertical() {
        for (let x = 0; x < 3; x++) {
            if (!grid[x].length) {
                grid[x].push(editor);
                return true;
            }
        }

        return false;
    }

    function splitHorizontal() {
        const lines = grid[gridPos.x];
        if (lines.length <= 1) {
            lines.push(editor);
            return true;
        }

        return false;
    }

    const currentEditor = getEditor();
    const ok = split === 'horizontal' ? splitHorizontal() : splitVertical();

    if (!ok) {
        currentEditor.setTempStatusMessage(`cannot run a ${split} split`);
    }

    displayResize();
}

function terminalSetup() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.write('\x1B[?25l');
    readline.emitKeypressEvents(process.stdin);

    displayClear();

    displayRefresh();

    process.stdin.on('keypress', function (char, key) {
        if (globalLock || !key) { return; }

        if (key.ctrl) {
            if (key.name === 'c') { return terminalFinish(); }
            if (key.name === 's') { return terminalSave(); }
        }

        // getEditor().setTempStatusMessage(`${JSON.stringify(key)}`);

        if ([ 'up', 'down', 'left', 'right' ].includes(key.name)) {
            gridNavigate(key.name);
        } else if (mode === 'command') {
            commandLine.processKey(char, key);
        } else {
            getEditor().processKey(char, key);
        }

        displayRefresh();
    });

    process.stdout.on('resize', displayResize);
}

function terminalLoad(filename) {
    commandLine = new CommandLine();

    commandLine.on('refresh', () => displayRefresh());

    commandLine.on('mode:editor', () => {
        mode = 'editor';
        gridClear();
    });

    commandLine.on('lock', () => {
        globalLock = true;
    });

    commandLine.on('unlock', () => {
        globalLock = false;
    });

    gridAdd(createEditor(filename), 'vertical');

    gridNavigate();
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
