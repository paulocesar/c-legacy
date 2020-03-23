const fs = require('fs');
const util = require('util');
const path = require('path');

const helpers = require('./helpers');

const writeFile = util.promisify(fs.writeFile);

class Line {
    constructor(text) {
        this.text = text || '';
        this.findResults = [ ];
    }
}

class File {
    constructor(filename) {
        this.name = filename;
        this.isReadOnly = false;
        this.content = [ new Line() ];

        if (this.name) {
            const text = fs.readFileSync(this.name, 'utf8');
            if (text) {
                this.content = text.split('\n').map((l) => new Line(l));
            }
        }

        this.actions = [ ];
        this.actionIndex = 0;
    }

    getExtension() {
        if (!this.name) { return ''; }
        return path.extname(this.name).replace(/[.]+/g, '') || '';
    }

    async save() {
        if (this.isReadOnly) { return; }

        await writeFile(this.name, this.content.map((c) => c.text).join('\n'));
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
        return line.text.length;
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

        this.findReview(y);

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
            chars = this.content[y].text[x - 1];
            pos = this._removeChars(x, y, 1);
        }

        if (mustRecord) { this.recordAction('delete', { x, y }, pos, chars); }

        this.findReview(y);

        return pos;
    }

    _addChars(x, y, chars) {
        const line = this.content[y].text
        this.content[y].text = line.slice(0, x) + chars + line.slice(x);
        return { x: x + chars.length, y };
    }

    _removeChars(x, y, len) {
        const line = this.content[y].text;
        this.content[y].text = line.slice(0, x - len) + line.slice(x);
        return { x: x - len, y };
    }

    _addLineBreak(x, y) {
        const line = this.content[y].text;
        const start = line.slice(0, x);
        const end = new Line(line.slice(x));

        this.content[y].text = start;

        const top = this.content.slice(0, y + 1);
        const bottom = this.content.slice(y + 1);

        this.content = top.concat(end).concat(bottom);

        return { x: 0, y: y + 1 };
    }

    _removeLineBreak(x, y) {
        const newX = this.content[y - 1].text.length;
        this.content[y - 1].text += this.content[y].text;
        this.content.splice(y, 1);
        return { x: newX, y: y - 1 };
    }

    find(regex, modifier) {
        this.findRegex = null;

        try {
            let mod = 'g';
            if (modifier) { mod += modifier; }
            this.findRegex = new RegExp(regex, mod);
        } catch(ex) {
            this.setTempStatusMessage('invalid regexp');
            return;
        }

        for (const y in this.content) {
            this._findInLine(y);
        }
    }

    findNextSelection(cursor) {
        if (!this.findRegex) { return false; }
        const { x, y } = cursor;
        for (let i = y; i <= this.content.length - 1; i++) {
            const l = this.content[i];
            for (const { start, end } of l.findResults) {
                const canPick = y < i || (y === i && end > x);
                if (!canPick) { continue; }
                return {
                    start: { x: start, y: i },
                    end: { x: end + 1, y: i }
                };
            }
        }

        return false;
    }

    findPrevSelection(cursor) {
        if (!this.findRegex) { return false; }
        const { x, y } = cursor;
        for (let i = y; i >= 0; i--) {
            const l = this.content[i];
            for (let j = l.findResults.length - 1; j >= 0; j--) {
                const { start, end } = l.findResults[j];
                const canPick = y > i || (y === i && end + 1 < x);
                if (!canPick) { continue; }
                return {
                    start: { x: start, y: i },
                    end: { x: end + 1, y: i }
                };
            }
        }

        return false;
    }

    inFind(x, y) {
        const l = this.content[y];
        if (!l) { return false; }

        return helpers.inIntervals(l.findResults, x);
    }

    findReview(y) {
        this._findInLine(y - 1);
        this._findInLine(y);
        this._findInLine(y + 1);
    }

    _findInLine(y) {
        const rgx = this.findRegex;

        if (!rgx) { return; }

        if (this.content[y] == null) { return; }

        this.content[y].findResults = helpers
            .findRegexIntervals(rgx, this.content[y].text);
    }

    findIntervals(y, regex) {
        const line = this.content[y];
        if (!line) { return [ ]; }

        return helpers.findRegexIntervals(regex, line.text);
    }

    inIntervals(intervals, pos) {
        const line = this.content[pos.y];
        if (!line) { return false; }

        return helpers.inIntervals(intervals, pos.x);
    }

    findNearWords(pos) {
        const content = { };
        const rgxWord = /([\w\d]+|[^\w\d\s]{1})/g
        const getInterval = (y) => this.findIntervals(y, rgxWord);

        let prevY = null;
        let prev = [ ];
        let nextY = null;
        let next = [ ];

        for (let y = pos.y - 1; y >= 0; y--) {
            const i = getInterval(y);
            if (i.length > 0) {
                prev = i;
                prevY = y;
                break;
            }
        }

        for (let y = pos.y + 1; y < this.content.length; y++) {
            const i = getInterval(y);
            if (i.length > 0) {
                next = i;
                nextY = y;
                break;
            }
        }

        const current = getInterval(pos.y);

        const currentIdx = helpers.getIntervalIndex(current, pos.x);
        const currentInterval = current[currentIdx] || null;

        let prevInterval = prev[prev.length - 1] || null;
        if (currentIdx > 0) {
            prevInterval = current[currentIdx - 1];
            prevY = pos.y;
        }

        let nextInterval = next[0] || null;
        if (currentIdx < current.length - 1) {
            nextInterval = current[currentIdx + 1];
            nextY = pos.y;
        }

        function buildInterval(interval, y) {
            if (!interval || y === null) { return null; }
            const { start, end } = interval;
            return { start: { x: start, y }, end: { x: end, y } };
        }

        return {
            prev: buildInterval(prevInterval, prevY),
            current: buildInterval(currentInterval, pos.y),
            next: buildInterval(nextInterval, nextY)
        };
    }
}

module.exports = File;
