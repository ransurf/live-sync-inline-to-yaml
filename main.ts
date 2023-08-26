import { App, Editor, EditorPosition, MarkdownView, moment, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface InlineFMSyncSettings {
	syncedInlinePrefix: string;
	undoKey: string;
}

const DEFAULT_SETTINGS: InlineFMSyncSettings = {
	syncedInlinePrefix: '\\_',
	undoKey: 'z'
}

export default class InlineFMSync extends Plugin {
	settings: InlineFMSyncSettings;

	findFrontmatterEndLine(editor: Editor): number {
		// check if there is a frontmatter section, which is either two lines of --- at the start of the file, or at least two lines of --- at the start
		//start 
		const firstLine = editor.getLine(0)
		if (firstLine !== "---") {
			return 0;
		}
		// get the second line and see if it is ---
		const secondLine = editor.getLine(1)
		if (secondLine === "---") {
			return 1;
		}
		// if it is not ---, then check if there is at least two lines of --- , then return line number of 2nd instance
		for (let i = 2; i <= editor.lastLine(); i++) {
			if (editor.getLine(i) === "---") {
				return i;
			}
		}
		return 0;
	}

	isValidFieldName(fieldName: string): boolean {
		// do not allow space, not sure what other restrictions there are oops
		return !fieldName.includes(' ')
	}

	wrapInQuotationsIfString(value: string): string {
		// console.log('value', value)
		const parsedDate = moment(value);
		if (value === 'true' || value === 'false' || !isNaN(Number(value)) || parsedDate.isValid()) {
			// console.log('not wrapping true or number')
			return value;
		}
		// if already wrapped then do not wrap
		if (value.startsWith('"') && value.endsWith('"')) {
			// console.log('not wrapping has quotations')
			return value;
		}
		// console.log('wrapping' + value, `'${value}'`)
		return `'${value}'`;
	}

	updateFrontmatterValue(editor: Editor, fieldName: string, newValue: string) {
		const frontMatterEndLine = this.findFrontmatterEndLine(editor);
		if (frontMatterEndLine === 0) {
			const initialFirstLineContent = editor.getLine(0);
			editor.setLine(0, `---\n${fieldName}: ${newValue}\n---\n${initialFirstLineContent}`);
			return;
		} else {
			for (let i = 1; i <= frontMatterEndLine; i++) {
				const [currentYamlField] = editor.getLine(i).split(':', 1);
				if (currentYamlField === fieldName) {
					// setLine
					editor.setLine(i, `${fieldName}: ${newValue}`);
					return;
				}
			}
		}
		// add to start of 
		editor.setLine(0, `---\n${fieldName}: ${newValue}`);
	}

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new InlineFMSyncSettingTab(this.app, this));

		// this.app.workspace.on('editor-change', (view: any, editor: any) => {
		// 	console.log('editor-change', view, editor);
		// 	console.log('last event', this.app.lastEvent)
		// });

		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			// allow for a slight delay before checking keystroke to allow for updated line
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				return;
			}

			if (evt.key.includes('Shift') || evt.key.includes('Control') || evt.ctrlKey && evt.key === this.settings.undoKey) {
				return;
			}

			setTimeout(() => {
				// undo will cause weird loop
				// console.log('evt', evt)

				const editor: Editor = activeView.editor;
				// console.log('editor', editor);
				
				const cursor: EditorPosition = editor.getCursor();
				const lineText: string = editor.getLine(cursor.line);
				// console.log('lineText', lineText);
				const frontmatterEndLine = this.findFrontmatterEndLine(editor);
				// console.log('cursor line', cursor, cursor.line);
				if (cursor.line >= frontmatterEndLine) {
					if (lineText?.includes('::')) {
						const declarationIndex = lineText.indexOf('::');
						if (cursor.ch >= declarationIndex) {
							const [before, after] = lineText.split('::');
							// console.log('before', before);
							// console.log('after', after.substring(1));
							if (this.isValidFieldName(before)) {
								if (!before.startsWith(this.settings.syncedInlinePrefix)) {
									editor.setLine(cursor.line, `${this.settings.syncedInlinePrefix}${before}:: ${after}`);
								}
								// console.log('validFieldName')
								this.updateFrontmatterValue(editor,
									before.startsWith(this.settings.syncedInlinePrefix) ? before.substring(2) : before,
								this.wrapInQuotationsIfString(after.trim()));
							}
						}
					}
				}
			}, 50)
		});
	}

	async onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class InlineFMSyncSettingTab extends PluginSettingTab {
	plugin: InlineFMSync;

	constructor(app: App, plugin: InlineFMSync) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Prefix for synced inline fields')
			.setDesc('When your inline field is synced to frontmatter, this prefix will be added to prevent duplicates in dataview queries')
			.addText(text => text
				.setPlaceholder('ex. \\_')
				.setValue(this.plugin.settings.syncedInlinePrefix)
				.onChange(async (value) => {
					this.plugin.settings.syncedInlinePrefix = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Change undo key')
			.setDesc('Will prevent sync on undo action (ctrl + your key) since otherwise it will freeze')
			.addText(text => text
				.setPlaceholder('ex. z')
				.setValue(this.plugin.settings.undoKey)
				.onChange(async (value) => {
					this.plugin.settings.undoKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
