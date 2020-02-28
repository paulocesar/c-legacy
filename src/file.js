const ansi = require('./ansi-escape-codes');
const fs = require('fs');

class File {
    constructor(filename) {
        this.filename = filename;

        this.file = [ '' ];

        if (this.filename) {
            const t = fs.readFileSync(this.filename, 'utf8')
            if (t) { this.file = t.split('\n'); }
        }

        this.cursor = { x: 0, y: 0 };
        this.columns = { start: 0, size: 0 };
        this.rows = { start: 0, size: 0 };
        this.selections = [{
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 }
        }];
    }

    getDisplayLines() {
        const start = this.rows.start;
        const end = this.rows.start + this.rows.size;
        const columns = this.columns.size - ansi.reset.length;

        const lines = [ ];

        global.lastText = `char: ${start}, end: ${end}`;

        for (let h = start; h <= end; h++) {
            const line = this.file[h];

            if (line === undefined) {
                lines.push('~\n');
                continue;
            }

            let display = '';

            let hasChanges = false;

            for (let w = 0; w <= columns; w++) {

                if (w === this.cursor.x && h === this.cursor.y) {
                    display += ansi.cursor;
                    hasChanges = true;
                }

                let c = line[w];

                if (c === undefined) {
                    display += ' ';
                } else {
                    display += `${c}`;
                }

                if (hasChanges) {
                    display += ansi.reset;
                    hasChanges = false;
                }
            }

            display = display.substring(0, columns - 1);
            display += ansi.reset;

            lines.push(display);
        }

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

        if (this.cursor.x + 3 > end && this.cursor.x + 3 < length) {
            this.rows.start += 1;
        }

        if (this.cursor.x - 3 < start && this.cursor.x - 3 > 0) {
            this.rows.start -= 1;
        }
    }

    updateColumns() {
        const length = this.file.length - 1;
        const start = this.columns.start;
        const end = this.columns.start + this.columns.size;

        if (this.cursor.x + 3 > end && this.cursor.x + 3 < length) {
            this.columns.start += 1;
        }

        if (this.cursor.x - 3 < start && this.cursor.x - 3 > 0) {
            this.columns.start -= 1;
        }
    }

    processKey(c) {
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
        const { x, y } = this.cursor;
        const line = this.file[y];
        this.file[y] = line.slice(0, x) + char + line.slice(x);
        this.cursor.x += char.length;
    }

    lineBreak() {
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

        if (x === 0) {
            if (y === 0) { return; }

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

module.exports = File;
