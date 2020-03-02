const fs = require('fs');

class File {
    constructor(filename) {
        this.name = filename;
        this.content = [ '' ];

        if (this.name) {
            const text = fs.readFileSync(this.name, 'utf8');
            if (text) { this.content = text.split('\n'); }
        }
    }

    save() { }
    recordAction() { }

    length() { return this.content.length; }

    lineLength(idx) {
        const line = this.content[idx];
        if (!line){ return 0; }
        return line.length;
    }

    add(x, y, char) {
        this.isDirty = true;

        const line = this.content[y];
        this.content[y] = line.slice(0, x) + char + line.slice(x);
        this.recordAction('add', x, y, char);
    }

    lineBreak(x, y) {
        this.isDirty = true;

        const line = this.content[y];
        const start = line.slice(0, x);
        const end = line.slice(x);

        this.content[y] = start;

        const top = this.content.slice(0, y + 1);
        const bottom = this.content.slice(y + 1);

        this.content = top.concat(end).concat(bottom);

        this.recordAction('lineBreak', x, y);
    }

    delete(x, y) {
        if (!x && !y) { return; }

        this.isDirty = true;

        if (!x) {
            this.content[y - 1] += this.content[y];
            this.content.splice(y, 1);
            return;
        }

        const line = this.content[y];
        this.content[y] = line.slice(0, x - 1) + line.slice(x);
    }
}

module.exports = File;
