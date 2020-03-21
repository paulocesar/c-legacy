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
        this.file.content[0].text = '> ';
        this.setCursor({ x: 2, y: 0 });
        this.editor = editor;
    }

    setStatusMessage() { }

    processKey(name) {
        if (name === 'ctrl-x') { return this.emit('mode:editor'); }
        if (name === 'ctrl-h') { return this.moveOffset({ x: -1, y: 0 }); }
        if (name === 'ctrl-j') { return this.nextCmd(); }
        if (name === 'ctrl-k') { return this.prevCmd(); }
        if (name === 'ctrl-l') { return this.moveOffset({ x: 1, y: 0 }); }

        if (/ctrl-/.test(name)) { return; }

        if (name === '\n') { return this.execute(); }

        if (name === '\b') { return this.delete(); }

        this.add(name);
    }

    prevCmd() { }
    nextCmd() { }

    async execute() {
        const params = this.file.content[0].text.trim().split(/\s+/);

        // removes command char '>'
        params.shift();

        const cmd = params.shift();
        let action = null;
        let mustLock = false;

        for (const [ key, value ] of Object.entries(modifiers.commands)) {
            if (key === cmd || value.shortcut === cmd) {
                action = value.onExecute;
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
        this.file.content[0].text = '';
        this.setCursor({ x: 0, y: 0 });
        this.emit('mode:editor');
    }
};

module.exports = CommandLine;
