# c
a tiny code editor

## TODO

- save the time machine in a temp file with the file hash
- create a save action in the File class
- create and navigate between editors
- create JS editor
- create EJS/HTML editor

## Usage

key | description | modes
:-- | :-- | :--
h | end of previous word | navigate, select
j | next empty line | navigate, select
k | previous empty line | navigate, select
l | end of next word | navigate, select
shift-h | move left | navigate, select, edit
shift-j | move down | navigate, select, edit
shift-k | move up | navigate, select, edit
shift-l | move right | navigate, select, edit
i | switch to edit mode | navigate, select
a | change to edit mode after current char | navigate, select
o | change to edit mode and add new line | navigate, select
enter | switch to command mode | navigate, select
s | switch to selection mode | navigate
; | switch to search in command mode | navigate, select
b | previous search result | navigate, select
n | next search result | navigate, select
ctrl-b | previous search result | navigate, select, edit
ctrl-n | next search result | navigate, select, edit
f | select word before cursor until cursor position and switch to select mode | navigate
shift-f | select current line and switch to select mode | navigate
g | go to top | navigate, select
shift-g | go to bottom | navigate, select
u | undo | navigate
r | redo | navigate
ctrl-u | undo | navigate, edit
ctrl-r | redo | navigate, edit
d | delete current line | navigate
v | switch to split panel in command mode | navigate
w | save file | navigate
q | save and close file | navigate
