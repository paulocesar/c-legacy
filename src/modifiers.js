const ansi = require('./ansi-escape-codes');
const helpers = require('./helpers');

const highlights = {
    js: [
        {
            color: ansi.foreground.magenta,
            regex: /(abstract|arguments|await|boolean|break|byte|case|catch|char|class|const |continue|debugger|default|delete | do |double|else|enum|eval|export|extends |false|final|finally|float|for|function |goto|if|implements|import| in |instanceof|int|interface|let|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try |typeof |var|void |volatile|while|with|yield )/g
        },
        {
            color: ansi.foreground.cyan,
            regex: /([\{]|[\}])/g
        }
    ]
}

module.exports = {
    layouts: {
        cursor: {
            onCharDisplay(editor) {
                const { w, h } = editor.currentDisplayLine;
                const { x, y } = editor.getCursor();

                if (x !== w || y !== h) { return false; }

                editor.currentDisplayLine.context += ansi.cursor;

                return true;
            }
        },

        line80: {
            onCharDisplay(editor) {
                const { w } = editor.currentDisplayLine;
                if (w !== 79) { return false; }

                editor.currentDisplayLine.context += ansi.line80;
                return true;
            }
        },

        findResults: {
            onCharDisplay(editor) {
                const { w, h } = editor.currentDisplayLine;
                if (!editor.file.inFind(w, h)) { return false; }

                editor.currentDisplayLine.context += ansi.findResults;
                return true;
            }
        },

        selection: {
            onCharDisplay(editor) {
                const { w, h } = editor.currentDisplayLine;
                const mustShow = editor.isMode('selection') &&
                    editor.inSelection({ x: w, y: h })

                if (!mustShow) { return false; }

                editor.currentDisplayLine.context += ansi.selection;
                return true;
            }
        },

        languageHighlight: {
            initialize(editor) {
                editor._languageHighlight = { };
            },
            beforeLineDisplay(editor, h) {
                const ext = editor.file.getExtension();

                const data = highlights[ext];
                if (!data) { return; }

                editor._languageHighlight[h] = { };

                for (const { color, regex } of data) {
                    editor._languageHighlight[h][color] = editor.file
                        .findIntervals(h, regex);
                }
            },

            onCharDisplay(editor) {
                const { w, h } = editor.currentDisplayLine;
                const res = Object.entries(editor._languageHighlight[h]);
                let hasColor = false;

                for (const [ color, intervals ] of res) {
                    if (helpers.inIntervals(intervals, w)) {
                        editor.currentDisplayLine.context += color;
                        hasColor = true;
                    }
                }

                return hasColor;
            }
        }
    },

    prefixes: {
        lineNumbers: {
            size(editor) {
                return `${editor.file.content.length}`.length + 1;
            },
            onLineDisplay(editor) {
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
            shortcut: 's',
            async onExecute(editor, params) {
                let msg = 'saved';
                try {
                    await editor.file.save();
                } catch(e) {
                    msg = 'cannot save';
                }

                editor.setTempStatusMessage(msg);
            }
        },
        find: {
            async onExecute(editor, params) {
                let msg = `finding ${params[0]}`;
                try {
                    editor.find(params[0]);
                    editor.findNext();
                } catch(e) {
                    msg = e.toString();
                }

                editor.setTempStatusMessage(msg);
            }
        },
        split: {
            shortcut: 'sv',
            async onExecute(editor, params) {
                editor.emit('editor:open', {
                    split: 'vertical',
                    filename: params[0] || editor.file
                });
            }
        },
        'split-horizontal': {
            shortcut: 'sh',
            async onExecute(editor, params) {

                editor.setTempStatusMessage(`editor:open`);
                editor.emit('editor:open', {
                    split: 'horizontal',
                    filename: params[0] || editor.file
                });
            }
        },
        close: {
            shortcut: 'c',
            async onExecute(editor) {
                editor.emit('editor:close');
            }
        }
    },

    keyboard: {
        default(editor, char, key) {
            if (key.ctrl) {
                if (key.name === 'x') {
                    editor.setMode('command');
                    return true;
                }

                if (key.name === 'y' && editor.isMode('selection')) {
                    editor.copy();
                    return true;
                }

                if (key.name === 't' && editor.isMode('selection')) {
                    editor.cut();
                    return true;
                }

                if (key.name === 'n') {
                    editor.findNext();
                    return true;
                }

                if (key.name === 'b') {
                    editor.findPrev();
                    return true;
                }

                if (key.name === 'p') {
                    editor.paste();
                    return true;
                }

                if (key.name === 'v') {
                    editor.isMode('selection') ?
                        editor.selectionEnd() :
                        editor.selectionStart();

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

                if (editor.isMode('selection')) { return true; }

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

            if (editor.isMode('selection')) {
                if (key.name === 'backspace') {
                    editor.selectionDelete();
                    editor.setMode('editor');
                    return true;
                }
                return true;
            }

            return false;
        }
    }
};
