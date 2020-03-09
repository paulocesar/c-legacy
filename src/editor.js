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

        this.mustRemove = false;

        this.columns = { start: 0, size: 0 };
        this.rows = { start: 0, size: 0 };

        this.status = { rows: 1, context: '' };
        this.setDefaultStatusMessage();

        this.cursor = { x: 0, y: 0 };
        this.selection = {
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 }
        };

        this.prefixes = [
            modifiers.prefixes.lineNumbers
        ];

        this.layouts = [
            modifiers.layouts.cursor,
            modifiers.layouts.selection,
            modifiers.layouts.line80
        ];

        this.keyboard = [
            modifiers.keyboard.default
        ];
    }

    setDefaultStatusMessage() {
        this.status.context = this.file.name || '(empty)';
    }

    setStatusMessage(msg) {
        this.status.context = msg;
    }

    setTempStatusMessage(msg) {
        if (this.msgInterval) { clearInterval(this.msgInterval); }

        this.setStatusMessage(msg);

        const s = 2 * 1000;
        this.msgInterval = setTimeout(() => this.setDefaultStatusMessage(), s);
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
            this.prefixes[i].action(this);
        }
    }

    applyLayouts() {
        let hasChanges = false;

        for (let i = this.layouts.length - 1; i >= 0; i--) {
            const m = this.layouts[i];
            if(m(this)) { hasChanges = true; }
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

            const line = this.file.content[h];

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
            x: this.cursor.x + direction.x,
            y: this.cursor.y + direction.y
        });
    }

    moveTo(position) {
        let length = this.file.length() - 2;
        if (length < 0) { length = 0; }

        this.cursor.y = position.y;
        if (this.cursor.y < 0) { this.cursor.y = 0; }
        if (this.cursor.y > length) { this.cursor.y = length; }

        let rowLength = this.file.lineLength(this.cursor.y);
        if (rowLength < 0) { rowLength = 0; }

        this.cursor.x = position.x;
        if (this.cursor.x < 0) { this.cursor.x = 0; }
        if (this.cursor.x > rowLength) { this.cursor.x = rowLength; }

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
        const { y } = this.cursor;

        if (y + 3 > end && y + 3 < length) { this.rows.start += (y + 3) - end; }

        if (y - 3 < start && y - 3 >= 0) {
            this.rows.start -= (start - (y - 3));
        }
    }

    updateColumns() {
        const offset = this.maxPrefixSize() + 3;
        const length = this.file.lineLength(this.cursor.y) + offset;
        const start = this.columns.start;
        const end = this.columns.start + this.columns.size;
        const { x } = this.getCursor();

        if (x + offset > end) { this.columns.start += (x + offset) - end; }
        if (x - 3 < start && x - 3 >= 0) { this.columns.start -= (x - start); }
    }

    processKey(char, key) {
        if (this.applyKeyboard(char, key)) { return; }

        let c = key.name || key.sequence;

        if (c == null || c === 'escape') { return; }

        if (c === 'backspace') {
            this.delete();
            return;
        }

        if (c === 'return') { c = '\n'; }
        if (c === 'space') { c = ' '; }
        if (c === 'tab') { c = '    '; }

        this.add(c);
    }

    setCursor(pos) {
        this.cursor.x = pos.x;
        this.cursor.y = pos.y;
    }

    getCursor() { return { x: this.cursor.x, y: this.cursor.y }; }

    add(char) {
        const { x, y } = this.getCursor();

        this.setCursor(this.file.add(x, y, char));

        this.updateSize();
    }

    delete() {
        const { x, y } = this.getCursor();

        this.setCursor(this.file.delete(x, y));
        this.setStatusMessage(this.file.message);
        this.updateSize();
    }

    selectionStart() {
        const cursor = this.getCursor();
        this.selectionMode = true;
        this.selection.start.x = cursor.x;
        this.selection.start.y = cursor.y;
        this.selection.end.x = cursor.x;
        this.selection.end.y = cursor.y;
    }

    selectionCancel() {
        this.selectionMode = false;
    }

    selectionEnd() {
        const cursor = this.getCursor();
        this.selection.end.x = cursor.x;
        this.selection.end.y = cursor.y;

        if (this.isBefore(this.selection.end, this.selection.start)) {
            const temp = this.selection.start;
            this.selection.start = this.selection.end;
            this.selection.end = temp;
        }

        this.selectionMode = false;
    }

    selectionDelete() {
        const { start, end } = this.selection;

        this.setCursor(end);

        while(this.cursor.x !== start.x || this.cursor.y !== start.y) {
            this.delete();
        }
    }

    inSelection(p) {
        let start = this.selection.start;
        let end = this.getCursor();
        if (this.isBefore(this.getCursor(), this.selection.start)) {
            start = this.getCursor();
            end = this.selection.start;
        }

        if (p.y < start.y || p.y > end.y) { return false; }
        if (this.file.content[p.y].length - 1 < p.x) { return false; }
        if (p.y === start.y && p.x < start.x) { return false; }
        if (p.y === end.y && p.x > end.x) { return false; }
        return true;

        return p.x >= start.x && p.x <= end.x &&
            p.y >= start.y && p.y <= end.y;
    }

    getSelectionBuffer() {
        const { start, end } = this.selection;
        let buf = '';

        for (let y = start.y; y <= end.y; y++) {
            if (y !== start.y) { buf += '\n'; }

            const l = this.file.content[y];
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

    copy() {
        this.selectionEnd();
        this.emit('selection:buffer', this.getSelectionBuffer());
    }

    cut() {
        this.selectionEnd();
        this.emit('selection:buffer', this.getSelectionBuffer());
        this.selectionDelete();
    }

    paste(buffer) {
        if (this.selectionMode) {
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
