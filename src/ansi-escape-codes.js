module.exports = {
    reset: '\x1b[0m',
    editorBackground: '\x1b[48;5;78m',
    cursor: '\x1b[40m\x1b[37m',
    line80: '\x1b[46m\x1b[30m',
    colors: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        brightBlack: '\x1b[30;1m',
        brightRed: '\x1b[31;1m',
        brightGreen: '\x1b[32;1m',
        brightYellow: '\x1b[33;1m',
        brightBlue: '\x1b[34;1m',
        brightMagenta: '\x1b[35;1m',
        brightCyan: '\x1b[36;1m',
        brightWhite: '\x1b[37;1m',
        // 256 colors
        // for i in range(0, 16):
        //   for j in range(0, 16):
        //     code = str(i * 16 + j)
        //     sys.stdout.write(u"\x1b[38;5;" + code + "m " + code.ljust(4))
    },
    background: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
        brightBlack: '\x1b[40;1m',
        brightRed: '\x1b[41;1m',
        brightGreen: '\x1b[42;1m',
        brightYellow: '\x1b[43;1m',
        brightBlue: '\x1b[44;1m',
        brightMagenta: '\x1b[45;1m',
        brightCyan: '\x1b[46;1m',
        brightWhite: '\x1b[47;1m'
        // 256 colors
        // for i in range(0, 16):
        //   for j in range(0, 16):
        //     code = str(i * 16 + j)
        //     sys.stdout.write(u"\x1b[48;5;" + code + "m " + code.ljust(4))
    }
};
