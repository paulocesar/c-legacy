const Editor = require('./editor');
const modifiers = require('./modifiers');

class CommandLine extends Editor {
    constructor() {
        super();
        this.status.rows = 0;
        this.prefixes = [ ];
        this.layouts = [ modifiers.layouts.cursor ];
    }

    processKey(char, key) {
        if (key.ctrl) {
            // TODO: next command
            // if (key.name === 'k') { return this.moveTo({ x: 0, y: -1 }); }
            if (key.name === 'l') { return this.moveTo({ x: 1, y: 0 }); }
            return;
        }

        if (key.sequence === '\b' && key.name === 'backspace') {
            return this.moveTo({ x: -1, y: 0 });
        }

        // TODO: next command
        // if (key.sequence === '\n' && key.name === 'enter') {
        //     return this.moveTo({ x: 0, y: 1 });
        // }

        let c = key.name || key.sequence;

        if (c == null) { return; }

        if (c === 'return') {
            //this.lineBreak();
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

};

module.exports = CommandLine;
