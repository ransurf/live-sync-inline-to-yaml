# Inline Field Sync Plugin
Syncs inline Dataview fields to YAML frontmatter properties of the note.
[![Gif from Gyazo](https://i.gyazo.com/58526c6822850fde42edfbddba2b146e.gif)](https://gyazo.com/58526c6822850fde42edfbddba2b146e)
I made this plugin because I want to keep my in-line fields since I find having them inside the note convenient, but I want to have the frontmatter YAML as the main source of truth because of the new properties plugin.

## Features
### Live Sync
As you update the value for an inline field, it will automatically update in the YAML
### Duplicate Variable Prevention
To prevent both frontmatter instances from showing up in queries, once an inline variable is synced, it is given a prefix that will still be linked to the YAML frontmatter field.

## Settings
### Synced Inline Field Prefix
Can modify the prefix added onto an already synced prefix. Just note that if you edit this and then start changing an inline field called "FIELDNAME" with the old prefix (assume it is the default set one "\_"), it will most likely create a new variable called "\_FIELDNAME".

Thus, I recommend only changing it at the very beginning of the plugin installation. I just chose \_ because it's usually what you do for internal variables in programming, and the \ just prevents italics formatting from happening.

Not tested on mobile.
### Undo Key
Will prevent sync on undo action (ctrl + your key) since otherwise, it will freeze.
Default is z.
## Roadmap
*Updates are very low priority for me, so feel free to navigate my spaghetti code and implement some yourself if it suits your use case!*
- Global blacklist certain fields from being synced
- Add frontmatter that will disable it sync from happening
- Add ability to disable sync for a field by adding comment above like
```
%%inline-sync-disable%%
field:: is not synced
```
