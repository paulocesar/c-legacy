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
        this.file[0] = '> ';
        this.cursor.x = 2;
        this.editor = editor;
    }

    processKey(char, key) {
        if (key.ctrl) {
            if (key.name === 'x') { return this.emit('mode:editor'); }
            if (key.name === 'k') { return this.prevCmd(); }
            if (key.name === 'l') { return this.moveTo({ x: 1, y: 0 }); }
            return;
        }

        if (key.sequence === '\b' && key.name === 'backspace') {
            return this.moveTo({ x: -1, y: 0 });
        }

        if (key.sequence === '\n' && key.name === 'enter') {
            return this.nextCmd();
        }

        let c = key.name || key.sequence;

        if (c == null || c === 'escape') { return; }

        if (c === 'return') {
            this.execute();
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

    prevCmd() { }
    nextCmd() { }

    async execute() {
        const params = this.file[0].trim().split(/\s+/);

        // removes command char '>'
        params.shift();

        const cmd = params.shift();
        let action = null;

        for (const [ key, value ] of Object.entries(modifiers.commands)) {
            if (key === cmd || value.shortcut === cmd) {
                action = value.action;
                break;
            }
        }

        if (!action) {
            this.editor.setTempStatusMessage('invalid command');
            return this.switchToEditMode();
        }

        this.lock = true;
        const msg = await action(this.editor, params);
        this.lock = false;

        if (msg) { this.editor.setTempStatusMessage(msg); }

        this.switchToEditMode();

        this.emit('refresh');
    }

    switchToEditMode() {
        this.file[0] = '';
        this.cursor.x = 0;
        this.cursor.y = 0;
        this.emit('mode:editor');
    }
};

module.exports = CommandLine;
