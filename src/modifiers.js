const ansi = require('./ansi-escape-codes');

module.exports = {
    layouts: {
        line80(editor) {
            const { w } = editor.currentDisplayLine;
            if (w !== 79) { return false; }

            editor.currentDisplayLine.context += ansi.line80;
            return true;
        },

        cursor(editor) {
            const { w, h } = editor.currentDisplayLine;

            if (editor.cursor.x !== w || editor.cursor.y !== h) {
                return false;
            }

            editor.currentDisplayLine.context += ansi.cursor;

            return true;
        }
    },

    prefixes: {
        lineNumbers: {
            size(editor) { return `${editor.file.content.length}`.length + 1; },
            action(editor) {
                const num = `${editor.currentDisplayLine.h}`;
                const maxSize = this.size(editor);
                const prefix = (Array(maxSize - num.length).join(' '))
                    + num + ' ';
                editor.currentDisplayLine.context = prefix;
            }
        }
    },

    commands: {
        save: {
            shortcut: ':s',
            async action(editor, params) {
                return 'TODO: save';
            }
        }
    },

    keyboard: {
        default(editor, char, key) {
            if (key.ctrl) {
                if (key.name === 'x') {
                    editor.emit('mode:command');
                    return true;
                }

                if (key.name === 'k') {
                    editor.moveOffset({ x: 0, y: -1 });
                    return true;
                }

                if (key.name === 'l') {
                    editor.moveOffset({ x: 1, y: 0 });
                    return true;
                }

                if (key.name === 'u') {
                    editor.undo();
                    return true;
                }

                if (key.name === 'r') {
                    editor.redo();
                    return true;
                }

                return false;;
            }

            if (key.sequence === '\b' && key.name === 'backspace') {
                editor.moveOffset({ x: -1, y: 0 });
                return true;
            }

            if (key.sequence === '\n' && key.name === 'enter') {
                editor.moveOffset({ x: 0, y: 1 });
                return true;
            }

            return false;
        }
    }
};
