# c
a tiny code editor

## TODO

- save the time machine in a temp file with the file hash
- create a save action in the File class
- create and navigate between editors
- create JS editor
- create EJS/HTML editor

## Usage

#### navigation mode

key | description
:-- | :--
h | end of previous word
j | next empty line
k | previous empty line
l | end of next word
shift-h | move left
shift-j | move down
shift-k | move up
shift-l | move right
i | switch to edit mode
c | switch to command mode
s | switch to selection mode
; | switch to search in command mode
b | previous search result
n | next search result
f | select word before cursor until cursor position and switch to select mode
shift-f | select current line and switch to select mode
g | go to top
shift-g | go to bottom
u | undo
r | redo
d | delete current line
v | switch to split panel in command mode
w | save file
q | save and close file
