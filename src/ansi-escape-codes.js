module.exports = {
    reset: '\x1b[0m',

    editorBackground: '\x1b[48;5;78m',
    cursor: '\x1b[40m\x1b[1m\x1b[37m\x1b[5m',
    selection: '\x1b[40m\x1b[1m\x1b[37m',
    line80: '\x1b[46m\x1b[1m\x1b[31m',

    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    foreground: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
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
        // 256 colors
        // for i in range(0, 16):
        //   for j in range(0, 16):
        //     code = str(i * 16 + j)
        //     sys.stdout.write(u"\x1b[48;5;" + code + "m " + code.ljust(4))
    }
};
