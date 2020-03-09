const fs = require('fs');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

class File {
    constructor(filename) {
        this.name = filename;
        this.isReadOnly = false;
        this.content = [ '' ];

        if (this.name) {
            const text = fs.readFileSync(this.name, 'utf8');
            if (text) { this.content = text.split('\n'); }
        }

        this.actions = [ ];
        this.actionIndex = 0;
    }

    async save() {
        if (this.isReadOnly) { return; }

        await writeFile(this.name, this.content.join('\n'));
        this.isDirty = false;
    }

    recordAction(action, start, end, chars) {
        if (this.isReadOnly) { return; }

        const data = { action, start, end };

        if (chars != null) { data.chars = chars; }

        if (this.actionIndex > 0) {
            this.actions = this.actions.splice(this.actionIndex);
            this.actionIndex = 0;
        }

        this.actions.unshift(data);
    }

    undo() {
        if (this.isReadOnly) { return; }

        const data = this.actions[this.actionIndex];

        if (!data) { return false; }

        this.actionIndex++;

        const { action, end, chars } = data;
        const { x, y } = end;

        if (action === 'add') { return this.delete(x, y, false); }

        if (action === 'delete') { return this.add(x, y, chars, false); }

        return false;
    }

    redo() {
        if (this.isReadOnly) { return; }

        const data = this.actions[this.actionIndex - 1];

        if (!data) { return false; }

        this.actionIndex--;

        const { action, start, chars } = data;
        const { x, y } = start;

        if (action === 'add') { return this.add(x, y, chars, false); }

        if (action === 'delete') { return this.delete(x, y, false); }

        return false;
    }

    length() { return this.content.length; }

    lineLength(y) {
        const line = this.content[y];
        if (!line){ return 0; }
        return line.length;
    }

    add(x, y, chars, mustRecord = true) {
        if (this.isReadOnly) { return; }

        this.isDirty = true;

        let pos = null;
        if (chars === '\n') {
            pos = this._addLineBreak(x, y);
        } else {
            pos = this._addChars(x, y, chars);
        }

        if (mustRecord) { this.recordAction('add', { x, y }, pos, chars); }

        return pos;
    }

    delete(x, y, mustRecord = true) {
        if (this.isReadOnly) { return; }

        if (!x && !y) { return { x, y }; }

        this.isDirty = true;
        let chars = null;
        let pos = null;

        if (!x) {
            chars = '\n';
            pos = this._removeLineBreak(x, y);
        } else {
            chars = this.content[y][x - 1];
            pos = this._removeChars(x, y, 1);
        }

        if (mustRecord) { this.recordAction('delete', { x, y }, pos, chars); }

        return pos;
    }

    _addChars(x, y, chars) {
        const line = this.content[y];
        this.content[y] = line.slice(0, x) + chars + line.slice(x);
        return { x: x + chars.length, y };
    }

    _removeChars(x, y, len) {
        const line = this.content[y];
        this.content[y] = line.slice(0, x - len) + line.slice(x);
        return { x: x - len, y };
    }

    _addLineBreak(x, y) {
        const line = this.content[y];
        const start = line.slice(0, x);
        const end = line.slice(x);

        this.content[y] = start;

        const top = this.content.slice(0, y + 1);
        const bottom = this.content.slice(y + 1);

        this.content = top.concat(end).concat(bottom);

        return { x: 0, y: y + 1 };
    }

    _removeLineBreak(x, y) {
        const newX = this.content[y - 1].length;
        this.content[y - 1] += this.content[y];
        this.content.splice(y, 1);
        return { x: newX, y: y - 1 };
    }
}

module.exports = File;
