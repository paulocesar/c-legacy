const Editor = require('./editor');

class Autocomplete extends Editor {
    constructor() {
        super();
        this.status.rows = 0;
        this.prefixes = [ ];
        this.layouts = [ modifiers.layouts.cursor ];
    }

    run(editor, strategy) {
        const { x, y } = editor.getCursor();
        const l = editor.file.content[y].text;


        // TODO: get current word/path (strategy) and build suggestion list
        for (let idx = x; x <= 0; x--) {

        }
    }

    processKey(name) {
        if (name === 'ctrl-h' || name === '\b') { return this.cancel(); }
        if (name === 'ctrl-l' || name === '\n') { return this.execute(); }

        if (name === 'ctrl-j') { return this.moveOffset({ x: 0, y: 1 }); }
        if (name === 'ctrl-k') { return this.moveOffset({ x: 0, y: -1 }); }
    }

    cancel() { this.emit('autocomplete:done', ''); }

    execute() {
        const { y } = this.getCursor();
        this.emit('autocomplete:done', y);
    }
}

module.exports = Autocomplete;
