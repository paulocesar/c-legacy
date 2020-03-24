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

const modifiers = {
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
                const mustShow = editor.isMode('select') &&
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

            getLanguageData(editor) {
                const ext = editor.file.getExtension();
                if (!ext) { return; }

                const data = highlights[ext];
                return data;
            },

            beforeLineDisplay(editor, h) {
                const data = modifiers.layouts.languageHighlight
                    .getLanguageData(editor);
                if (!data) { return; }

                editor._languageHighlight[h] = { };

                for (const { color, regex } of data) {
                    editor._languageHighlight[h][color] = editor.file
                        .findIntervals(h, regex);
                }
            },

            onCharDisplay(editor) {
                const data = modifiers.layouts.languageHighlight
                    .getLanguageData(editor);

                if (!data) { return; }

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
                    // TODO: call str.trimEnd() before save and fix cursor pos
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
        default: {
            initialize: (editor) => { },

            others: (editor, key) => {
                return !editor.isMode('edit');
            },

            'ctrl-x': (editor) => {
                if (editor.isMode('edit')) {
                    editor.setMode('navigate');
                    return true;
                }
                editor.setMode('command');
                return true;
            },

            'ctrl-y': (editor) => {
                if (!editor.isMode('select')) { return false; }
                editor.copy();
                return true;
            },

            'ctrl-t': (editor) => {
                if (!editor.isMode('select')) { return false; }
                editor.cut();
                return true;
            },

            'ctrl-b': (editor) => {
                editor.findPrev();
                return true;
            },

            'ctrl-n': (editor) => {
                editor.findNext();
                return true;
            },

            'ctrl-p': (editor) => {
                editor.paste();
                return true;
            },

            'i': (editor) => {
                if (editor.isMode('edit')) { return false; }
                editor.setMode('edit');
                return true;
            },

            'h': (editor) => {
                if (editor.isMode('edit')) { return false; }
                editor.movePrevWord();
                return true;
            },

            'j': (editor) => {
                if (!editor.isMode('edit')) { return false; }
                editor.moveNextEmptyLine();
                return true;
            },

            'k': (editor) => {
                if (!editor.isMode('edit')) { return false; }
                editor.movePrevEmptyLine();
                return true;
            },

            'l': (editor) => {
                if (editor.isMode('edit')) { return false; }
                editor.moveNextWord();
                return true;
            },

            'ctrl-h': (editor) => {
                editor.moveOffset({ x: -1, y: 0 });
                return true;
            },

            'ctrl-j': (editor) => {
                editor.moveOffset({ x: 0, y: 1 });
                return true;
            },

            'ctrl-k': (editor) => {
                editor.moveOffset({ x: 0, y: -1 });
                return true;
            },

            'ctrl-l': (editor) => {
                editor.moveOffset({ x: 1, y: 0 });
                return true;
            },

            'ctrl-v': (editor) => {
                editor.isMode('select') ?
                    editor.selectionEnd() :
                    editor.selectionStart();

                return true;
            },

            'ctrl-u': (editor) => {
                if (editor.isMode('select')){ return false; }
                editor.undo();
                return true;
            },

            'ctrl-r': (editor) => {
                if (editor.isMode('select')){ return false; }
                editor.redo();
                return true;
            },

            '\/': (editor) => {
                const canSearch = editor.isMode('navigate') ||
                    editor.isMode('select');

                if (!canSearch) { return false; }

                editor.setMode('command', 'find');
            },

            '\n': (editor) => {
                if (editor.isMode('navigate')) {
                    editor.setMode('command');
                    return true;
                }

                return false;
            },

            '\b': (editor) => {
                if (!editor.isMode('select')) { return false; }
                editor.selectionDelete();
                editor.setMode('edit');
                return true;
            }
        }
    }
};

module.exports = modifiers;
