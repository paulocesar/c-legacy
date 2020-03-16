const EventEmitter = require('events');
const ansi = require('./ansi-escape-codes');
const File = require('./file');
const modifiers = require('./modifiers');

class Editor extends EventEmitter {
    constructor(file) {
        super();

        if (file instanceof File) {
            this.file = file;
        } else {
            this.file = new File(file);
        }

        this.mode = 'edit';
        this.mustRemove = false;

        this.columns = { start: 0, size: 0 };
        this.rows = { start: 0, size: 0 };

        this.msgInterval = null;
        this.status = { rows: 1, context: '' };
        this.setDefaultStatusMessage();

        this._lastCursorX = 0;
        this._cursor = { x: 0, y: 0 };
        this._lastCursor = { x: 0, y: 0 };
        this._selection = {
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 }
        };
        this.prefixes = [
            modifiers.prefixes.lineNumbers
        ];

        this.layouts = [
            modifiers.layouts.cursor,
            modifiers.layouts.selection,
            modifiers.layouts.findResults,
            modifiers.layouts.line80,
            modifiers.layouts.languageHighlight
        ];

        this.keyboard = [
            modifiers.keyboard.default
        ];

        this.initializeModifiers();
    }

    initializeModifiers() {
        const modifiers = [ ].concat(this.prefixes).concat(this.layouts)
            .concat(this.keyboard);

        for (const m of modifiers) {
            if (m && m.initialize) { m.initialize(this); }
        }
    }

    setDefaultStatusMessage() {
        if (this.msgInterval) { return; }
        const file = this.file.name || '(empty)';
        const mode = this.mode.toUpperCase();
        this.setStatusMessage(`${mode} - ${file}`);
    }

    setStatusMessage(msg) {
        this.status.context = msg.substring(0, this.columns.size);
        this.refresh();
    }

    refresh() { this.emit('refresh'); }

    setMode(mode) {
        this.emit('mode', mode);
        if (mode === 'command') { return; }
        this.mode = mode;
        this.setDefaultStatusMessage();
        this.refresh();
        return;
    }

    isMode(mode) { return this.mode === mode; }

    setTempStatusMessage(msg) {
        if (this.msgInterval) {
            clearInterval(this.msgInterval);
            this.msgInterval = null;
        }

        this.setStatusMessage(msg);

        const s = 2 * 1000;
        this.msgInterval = setTimeout(() => {
            this.msgInterval = null;
            this.setDefaultStatusMessage();
        }, s);
    }

    maxPrefixSize() {
        let size = 0;

        for (let i = this.prefixes.length - 1; i >= 0; i--) {
            const p = this.prefixes[i].size(this);
            if (size < p) { size = p; }
        }

        return size;
    }

    applyPrefixes(idx) {
        for (let i = this.prefixes.length - 1; i >= 0; i--) {
            this.prefixes[i].onLineDisplay(this);
        }
    }

    applyLayouts() {
        let hasChanges = false;

        for (let i = this.layouts.length - 1; i >= 0; i--) {
            const m = this.layouts[i].onCharDisplay;
            if(m(this)) { hasChanges = true; }
        }

        return hasChanges;
    }

    beforeLineDisplay(h) {
        let hasChanges = false;

        for (let i = this.layouts.length - 1; i >= 0; i--) {
            const m = this.layouts[i].beforeLineDisplay;
            if(m && m(this, h)) { hasChanges = true; }
        }

        return hasChanges;
    }


    applyKeyboard(char, key) {
        let hasChanges = false;

        for (let i = this.keyboard.length - 1; i >= 0; i--) {
            const m = this.keyboard[i];
            if(m(this, char, key)) { hasChanges = true; }
        }

        return hasChanges;
    }

    getDisplayLines() {
        const rowStart = this.rows.start;
        const rowEnd = rowStart + this.rows.size;
        const prefixSize = this.maxPrefixSize();
        const colStart = this.columns.start;
        const cols = this.columns.size - prefixSize - 1;
        const colEnd = colStart + cols;

        const lines = [ ];

        this.currentDisplayLine = { };


        for (let h = rowStart; h <= rowEnd; h++) {
            this.currentDisplayLine.h = h;
            this.currentDisplayLine.w = 0;
            this.currentDisplayLine.context = '';
            this.beforeLineDisplay(h);

            const line = this.file.content[h] && this.file.content[h].text;

            this.applyPrefixes(h);

            if (line === undefined) {
                const whitespace = Array(cols + 1).join(' ');
                this.currentDisplayLine.context += '~' + whitespace;
                lines.push(this.currentDisplayLine.context);
                continue;
            }

            for (let w = colStart; w <= colEnd; w++) {
                this.currentDisplayLine.w = w;

                const hasChanges = this.applyLayouts();

                let c = line[w];

                if (c === undefined) {
                    this.currentDisplayLine.context += ' ';
                } else {
                    this.currentDisplayLine.context += `${c}`;
                }

                if (hasChanges) {
                    this.currentDisplayLine.context += ansi.reset;
                }
            }

            this.currentDisplayLine.context += ansi.reset;

            lines.push(this.currentDisplayLine.context);
        }

        if (this.status.rows) {
            const backfill = Array(this.columns.size).join(' ');
            const symbol = this.file.isDirty ? '*' : ' ';
            const msg = `${symbol} ${this.status.context} ${backfill}`;
            const statusSize = this.columns.size * this.status.rows;
            const statusLine = ansi.background.white +
                ansi.foreground.black + (msg).substring(0, statusSize) +
                ansi.reset;

            lines.push(statusLine);
        }

        this.currentDisplayLine = null;

        return lines;
    }

    resizeRows(width, height) {
        this.rows.size = height - this.status.rows;
        this.columns.size = width;
        this.updateSize();
    }

    moveOffset(direction) {
        this.moveTo({
            x: this.getCursor().x + direction.x,
            y: this.getCursor().y + direction.y
        });
    }

    moveTo(position) {
        let length = this.file.length() - 2;
        if (length < 0) { length = 0; }

        const cursor = this.getCursor();

        cursor.y = position.y;
        if (cursor.y < 0) { cursor.y = 0; }
        if (cursor.y > length) { cursor.y = length; }

        let rowLength = this.file.lineLength(cursor.y);
        if (rowLength < 0) { rowLength = 0; }

        const mustTrackPosition = cursor.x !== position.x;

        if (cursor.x !== position.x) {
            this._lastCursorX = cursor.x = position.x;
        } else {
            cursor.x = this._lastCursorX;
        }

        if (cursor.x < 0) { cursor.x = 0; }
        if (cursor.x > rowLength) { cursor.x = rowLength; }

        // setCursor will override the _lastCursorX
        // this is the only situation that we want to avoid it
        this._cursor.x = cursor.x;
        this._cursor.y = cursor.y;

        this.updateSize();
    }

    updateSize() {
        this.updateRows();
        this.updateColumns();
    }

    updateRows() {
        const length = this.file.length() - 1;
        const start = this.rows.start;
        const end = this.rows.start + this.rows.size;
        const { y } = this.getCursor();

        if (y + 3 > end && y + 3 < length) { this.rows.start += (y + 3) - end; }

        if (y - 3 < start && y - 3 >= 0) {
            this.rows.start -= (start - (y - 3));
        }
    }

    updateColumns() {
        const offset = this.maxPrefixSize() + 3;
        const length = this.file.lineLength(this.getCursor().y) + offset;
        const start = this.columns.start;
        const end = this.columns.start + this.columns.size;
        const { x } = this.getCursor();

        if (x + offset > end) { this.columns.start += (x + offset) - end; }
        if (x - 3 < start && x - 3 >= 0) { this.columns.start -= (x - start); }
    }

    processKey(char, key) {
        if (this.applyKeyboard(char, key)) { return; }

        const { sequence, name } = key;

        if (!sequence && !name) { return; }
        if (name === 'escape') { return; }

        if (name === 'backspace') {
            this.delete();
            return;
        }

        let c = sequence || name;

        if (name === 'return') { c = '\n'; }
        if (name === 'space') { c = ' '; }
        if (name === 'tab') { c = '    '; }

        this.add(c);
    }

    setCursor(pos) {
        this._lastCursorX = this._cursor.x = pos.x;
        this._cursor.y = pos.y;
    }

    getCursor() { return { x: this._cursor.x, y: this._cursor.y }; }

    add(char) {
        const { x, y } = this.getCursor();

        this.setCursor(this.file.add(x, y, char));
        this.updateSize();
    }

    delete() {
        const { x, y } = this.getCursor();

        this.setCursor(this.file.delete(x, y));
        this.updateSize();
    }

    selectionStart(selection) {
        const cursor = this.getCursor();
        this.setMode('selection');
        this._selection.start.x = cursor.x;
        this._selection.start.y = cursor.y;
        this._selection.end.x = cursor.x;
        this._selection.end.y = cursor.y;

        if (selection) {
            this._selection.start.x = selection.start.x;
            this._selection.start.y = selection.start.y;
            this._selection.end.x = selection.end.x;
            this._selection.end.y = selection.end.y;
            this.setCursor(selection.end);
        }
    }

    selectionCancel() {
        this.setMode('edit');
    }

    selectionEnd() {
        const cursor = this.getCursor();
        this._selection.end.x = cursor.x;
        this._selection.end.y = cursor.y;

        if (this.isBefore(this._selection.end, this._selection.start)) {
            const temp = this._selection.start;
            this._selection.start = this._selection.end;
            this._selection.end = temp;
        }

        this.setMode('edit');
    }

    selectionDelete() {
        const { start, end } = this._selection;

        this.setCursor(end);
        let cursor = this.getCursor();

        while(cursor.x !== start.x || cursor.y !== start.y) {
            this.delete();
            cursor = this.getCursor();
        }
    }

    inSelection(p) {
        let start = this._selection.start;
        let end = this.getCursor();
        if (this.isBefore(this.getCursor(), this._selection.start)) {
            start = this.getCursor();
            end = this._selection.start;
        }

        if (p.y < start.y || p.y > end.y) { return false; }
        if (this.file.content[p.y].text.length - 1 < p.x) { return false; }
        if (p.y === start.y && p.x < start.x) { return false; }
        if (p.y === end.y && p.x > end.x) { return false; }
        return true;

        return p.x >= start.x && p.x <= end.x &&
            p.y >= start.y && p.y <= end.y;
    }

    getSelectionBuffer() {
        const { start, end } = this._selection;
        let buf = '';

        for (let y = start.y; y <= end.y; y++) {
            if (y !== start.y) { buf += '\n'; }

            const l = this.file.content[y].text;
            const startX = y === start.y ? start.x : 0;
            const maxLength = l.length - 1;
            let endX = y === end.y ? end.x - 1  : maxLength;
            if (endX > maxLength) { endX = maxLength; }

            for (let x = startX; x <= endX; x++) {
                buf += l[x];
            }
        }

        return buf;
    }

    isBefore(p1, p2) {
        return p1.y < p2.y || (p1.y === p2.y && p1.x < p2.x);
    }

    find(regexString) {
        this.file.find(regexString);
    }

    findNext() {
        const selection = this.file.findNextSelection(this.getCursor());
        if (!selection) {
            this.setTempStatusMessage('cannot find next');
            return;
        }

        this.selectionStart(selection);
        this.updateSize();
    }

    findPrev() {
        const selection = this.file.findPrevSelection(this.getCursor());
        if (!selection) {
            this.setTempStatusMessage('cannot find previous');
            return;
        }

        this.selectionStart(selection);
        this.updateSize();
    }

    copy() {
        this.selectionEnd();
        this.emit('selection:buffer', this.getSelectionBuffer());
        this.setTempStatusMessage('copied');
    }

    cut() {
        this.selectionEnd();
        this.emit('selection:buffer', this.getSelectionBuffer());
        this.selectionDelete();
        this.setTempStatusMessage('cut');
    }

    paste() {
        this.emit('selection:paste');
        this.setTempStatusMessage('paste')
    }

    pasteBuffer(buffer) {
        if (this.isMode('selection')) {
            this.selectionEnd();
            this.selectionDelete();
        }

        for(const c of buffer) { this.add(c); }
    }

    async save() { this.file.save(); }

    undo() {
        const pos = this.file.undo();

        if (!pos) { return this.setTempStatusMessage('Cannot undo'); }

        this.setCursor(pos);
    }

    redo() {
        const pos = this.file.redo();

        if (!pos) { return this.setTempStatusMessage('Cannot redo'); }

        this.setCursor(pos);
    }

}

module.exports = Editor;
