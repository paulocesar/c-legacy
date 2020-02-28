const ansi = require('./ansi-escape-codes');
const fs = require('fs');

const layouts = {
    line80(editor) {
        const { w } = editor.currentDisplayLine;
        if (w !== 79) { return false; }

        editor.currentDisplayLine.context += ansi.line80;
        return true;
    },

    cursor(editor) {
        const { w, h } = editor.currentDisplayLine;

        if (editor.cursor.x !== w || editor.cursor.y !== h) {
            return false;
        }

        editor.currentDisplayLine.context += ansi.cursor;

        return true;
    }
};

const prefixes = {
    lineNumbers: {
        size(editor) { return `${editor.file.length}`.length + 1; },
        action(editor) {
            const num = `${editor.currentDisplayLine.h}`;
            const maxSize = this.size(editor);
            const prefix = (Array(maxSize - num.length).join(' ')) + num + ' ';
            editor.currentDisplayLine.context = prefix;
        }
    }
};

class Editor {
    constructor(filename) {
        this.filename = filename;

        this.file = [ '' ];

        if (this.filename) {
            const t = fs.readFileSync(this.filename, 'utf8')
            if (t) { this.file = t.split('\n'); }
        }

        this.columns = { start: 0, size: 0 };
        this.rows = { start: 0, size: 0 };

        this.cursor = { x: 0, y: 0 };
        this.selection = {
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 }
        };

        this.prefixes = [
            prefixes.lineNumbers
        ];

        this.layouts = [
            layouts.line80,
            layouts.cursor
        ];
    }


    maxPrexifSize() {
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

    getDisplayLines() {
        const start = this.rows.start;
        const end = this.rows.start + this.rows.size;
        const prefixSize = this.maxPrexifSize();
        const columns = this.columns.size - prefixSize - 1;

        const lines = [ ];

        this.currentDisplayLine = { };

        for (let h = start; h <= end; h++) {
            this.currentDisplayLine.h = h;
            this.currentDisplayLine.w = 0;
            this.currentDisplayLine.context = '';

            const line = this.file[h];

            this.applyPrefixes(h);

            if (line === undefined) {
                this.currentDisplayLine.context += '~';
                lines.push(this.currentDisplayLine.context);
                continue;
            }

            for (let w = 0; w <= columns; w++) {
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

        this.currentDisplayLine = null;

        return lines;
    }

    resizeRows(width, height) {
        this.rows.size = height;
        this.columns.size = width;
        this.updateSize();
    }

    moveTo(direction) {
        let length = this.file.length - 1;
        if (length < 0) { length = 0; }

        this.cursor.y += direction.y;
        if (this.cursor.y < 0) { this.cursor.y = 0; }
        if (this.cursor.y > length) { this.cursor.y = length; }

        let rowLength = this.file[this.cursor.y].length || 0;
        if (rowLength < 0) { rowLength = 0; }

        this.cursor.x += direction.x;
        if (this.cursor.x < 0) { this.cursor.x = 0; }
        if (this.cursor.x > rowLength) { this.cursor.x = rowLength; }

        this.updateSize();
    }

    updateSize() {
        this.updateRows();
        this.updateColumns();
    }

    updateRows() {
        const length = this.file.length - 1;
        const start = this.rows.start;
        const end = this.rows.start + this.rows.size;
        const { y } = this.cursor;

        if (y + 3 > end && y + 3 < length) { this.rows.start += 1; }
        if (y - 3 < start && y - 3 >= 0) { this.rows.start -= 1; }
    }

    updateColumns() {
        const length = this.file.length - 1;
        const start = this.columns.start;
        const end = this.columns.start + this.columns.size;
        const { x } = this.cursor;

        if (x + 3 > end && x + 3 < length) { this.columns.start += 1; }
        if (x - 3 < start && x - 3 >= 0) { this.columns.start -= 1; }
    }

    processKey(char, key) {
        if (key.ctrl) {
            if (key.name === 'k') { return this.moveTo({ x: 0, y: -1 }); }
            if (key.name === 'l') { return this.moveTo({ x: 1, y: 0 }); }
            return;
        }

        if (key.sequence === '\b' && key.name === 'backspace') {
            return this.moveTo({ x: -1, y: 0 });
        }

        if (key.sequence === '\n' && key.name === 'enter') {
            return this.moveTo({ x: 0, y: 1 });
        }

        const c = key.name || key.sequence;

        if (c == null) { return; }

        if (c === 'return') {
            this.lineBreak();
            return;
        }

        if (c === 'backspace') {
            this.delete();
            return;
        }

        if (c === 'space') { c = ' '; }
        if (c === 'tab') { c = '    '; }

        this.add(c);
    }

    add(char) {
        this.isDirty = true;

        const { x, y } = this.cursor;
        const line = this.file[y];
        this.file[y] = line.slice(0, x) + char + line.slice(x);
        this.cursor.x += char.length;
    }

    lineBreak() {
        this.isDirty = true;

        const { x, y } = this.cursor;
        const line = this.file[y];
        const start = line.slice(0, x);
        const end = line.slice(x);

        this.file[y] = start;

        const top = this.file.slice(0, y + 1);
        const bottom = this.file.slice(y + 1);

        this.file = top.concat(end).concat(bottom);

        this.cursor.x = 0;
        this.cursor.y = y + 1;
    }

    delete() {
        const { x, y } = this.cursor;
        if (x === 0 && y === 0) { return; }

        this.isDirty = true;

        if (x === 0) {
            this.cursor.x = this.file[y - 1].length;
            this.file[y - 1] += this.file[y];
            this.file.splice(y, 1);
            this.cursor.y = y - 1;
            return;
        }

        const line = this.file[y];
        this.file[y] = line.slice(0, x - 1) + line.slice(x);
        this.cursor.x = x - 1;
    }

    copy() { }
    paste() { }
    replace() { }
}

module.exports = Editor;
