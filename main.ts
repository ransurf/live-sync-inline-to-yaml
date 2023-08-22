import { App, Editor, EditorPosition, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import moment from 'moment';

interface MyPluginSettings {
	syncedInlinePrefix: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	syncedInlinePrefix: '\\_'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

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
					// console.log()
					// setLine
					editor.setLine(i, `${fieldName}: ${newValue}`);
					return;
				}
			}
		}
		const initialFirstLineContent = editor.getLine(1);
		editor.setLine(0, `---\n${fieldName}: ${newValue}\n${initialFirstLineContent}`);
	}

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			// allow for a slight delay before checking keystroke to allow for updated line
			setTimeout(() => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) {
					return;
				}
				const editor: Editor = activeView.editor;
				if (!editor.hasFocus()) {
					return;
				}
				// console.log('editor', editor);
				const cursor: EditorPosition = editor.getCursor();
				const lineText: string = editor.getLine(cursor.line);
				// console.log('lineText', lineText);
				const frontmatterEndLine = this.findFrontmatterEndLine(editor);
				// console.log('cursor line', cursor, cursor.line);
				if (cursor.line > frontmatterEndLine) {
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

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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
	}
}
