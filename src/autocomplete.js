const Editor = require('./editor');
const modifiers = require('./modifiers');

const strategies = {
    word(editor) {
        const { file } = editor;
        const word = file.findNearWord(editor.getCursor());
        if (!word || word.length < 1) { return []; }

        const rgxStr = RegExp(`(^|[^\\w]{0,1})${word}\\w*([^\\w]{0,1}|$)`, 'g');

        // TODO: shouldn't create a new copy of the entire file
        const text = file.getEntireFileString(' ');

        let match = null;
        const results = { };
        while((match = rgxStr.exec(text)) !== null) {
            const opt = match[0].replace(/[^\w]/g, '');
            results[opt] = true;
        }

        return Object.keys(results);
    },
    path(editor) {
    }
}

class Autocomplete extends Editor {
    constructor() {
        super();
        this.status.rows = 0;
        this.prefixes = [ ];
        this.layouts = [ modifiers.layouts.cursor ];
    }

    run(editor, strategy) {
        this.editor = editor;
        const results = strategies.word(editor).join(' ');

        if (!results.length) {
            editor.setTempStatusMessage('cannot find results');
            return this.cancel();
        }
    }

    processKey(name) {
        if (name === 'ctrl-h' || name === '\b') { return this.cancel(); }
        if (name === 'ctrl-l' || name === '\n') { return this.execute(); }

        if (name === 'ctrl-j') { return this.moveOffset({ x: 0, y: 1 }); }
        if (name === 'ctrl-k') { return this.moveOffset({ x: 0, y: -1 }); }

        this.editor.processKey(name);
    }

    cancel() { this.emit('autocomplete:done', ''); }

    execute() {
        const { y } = this.getCursor();
        this.emit('autocomplete:done', y);
    }
}

module.exports = Autocomplete;
