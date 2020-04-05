function parse(char, key) {
    let prefix = '';

    if (key.sequence === '\u0000' && key.name === '`') {
        return 'ctrl-spacebar';
    }

    if (key.ctrl) { return `ctrl-${key.name}`; }
    if (key.sequence === '\b' && key.name === 'backspace') {
        return 'ctrl-h';
    }
    if (key.sequence === '\n' && key.name === 'enter') {
        return 'ctrl-j';
    }

    const { sequence, name } = key;

    if (!sequence && !name || name === 'escape') { return null; }
    if (name === 'backspace') { return '\b'; }
    if (name === 'return') { return '\n'; }

    if([ 'up', 'down', 'left', 'right' ].includes(name)) { return name; }
    return sequence || name || null;
}

const keyboard = { parse };
module.exports = keyboard;
