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
            size(editor) { return `${editor.file.length}`.length + 1; },
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
    }
};
