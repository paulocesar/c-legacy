const Editor = require('./editor');
const modifiers = require('./modifiers');

class CommandLine extends Editor {
    constructor() {
        super();
        this.status.rows = 0;
        this.prefixes = [ ];
        this.layouts = [ modifiers.layouts.cursor ];
    }

    start(editor) {
        this.file.content[0] = '> ';
        this.setCursor({ x: 2, y: 0 });
        this.editor = editor;
    }

    processKey(char, key) {
        if (key.ctrl) {
            if (key.name === 'x') { return this.emit('mode:editor'); }
            if (key.name === 'k') { return this.prevCmd(); }
            if (key.name === 'l') { return this.moveOffset({ x: 1, y: 0 }); }
            return;
        }

        if (key.sequence === '\b' && key.name === 'backspace') {
            return this.moveOffset({ x: -1, y: 0 });
        }

        if (key.sequence === '\n' && key.name === 'enter') {
            return this.nextCmd();
        }

        let c = key.name || key.sequence;

        if (c == null || c === 'escape' || c === 'tab') { return; }

        if (c === 'return') {
            this.execute();
            return;
        }

        if (c === 'backspace') {
            this.delete();
            return;
        }

        if (c === 'space') { c = ' '; }

        this.add(c);
    }

    prevCmd() { }
    nextCmd() { }

    async execute() {
        const params = this.file.content[0].trim().split(/\s+/);

        // removes command char '>'
        params.shift();

        const cmd = params.shift();
        let action = null;
        let mustLock = false;

        for (const [ key, value ] of Object.entries(modifiers.commands)) {
            if (key === cmd || value.shortcut === cmd) {
                action = value.action;
                mustLock = value.lock || mustLock;
                break;
            }
        }

        if (!action) {
            this.editor.setTempStatusMessage('invalid command');
            return this.switchToEditMode();
        }

        if (mustLock) { this.emit('lock'); }

        try {
            await action(this.editor, params);
        } catch(e) {
            this.editor.setTempStatusMessage('command error');
        }

        if (mustLock) { this.emit('unlock'); }


        this.switchToEditMode();

        this.emit('refresh');
    }

    switchToEditMode() {
        this.file.content[0] = '';
        this.setCursor({ x: 0, y: 0 });
        this.emit('mode:editor');
    }
};

module.exports = CommandLine;
