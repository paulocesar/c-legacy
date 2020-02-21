class File {
    constructor(filename) {
        this.filename = filename;
        this.file = [ '' ];
        this.cursor = { x: 0, y: 0 };
        this.rows = { start: 0, size: 0 };
        this.selections = [{
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 }
        }];
    }

    getDisplayLines() {
        const lines = [ ];
        const start = this.rows.start;
        const end = this.rows.start + this.rows.size;

        for (let i = start; i <= end; i++) {
            lines.push(this.file[i]);
        }

        return lines;
    }

    resizeRows(size) {
        this.rows.size = size;
        this.updateRows();
    }

    moveTo(point) {
        const lenth = this.file.length - 1;

        this.cursor.x = point.x;
        if (this.cursor.x < 0) { this.cursor.x = 0; }
        if (this.cursor.x > length) { this.cursor.x = length; }

        const rowLength = this.file[this.cursor.x].length - 1;

        this.cursor.y = point.y;
        if (this.cursor.y < 0) { this.cursor.y = 0; }
        if (this.cursor.x > rowLength) { this.cursor.x = rowLength; }

        this.updateRows();
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

    add(text) {
        this.file[0] += text;
        this.cursor.x = this.file[0].lenth - 1;
    }
    delete() { }
    copy() { }
    paste() { }
    replace() { }
}

module.exports = File;
