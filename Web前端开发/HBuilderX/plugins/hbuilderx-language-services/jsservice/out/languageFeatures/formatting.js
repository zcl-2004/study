"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const vscode = require("vscode");
const typeConverters = require("../utils/typeConverters");
class TypeScriptFormattingProvider {
    constructor(client, formattingOptionsManager) {
        this.client = client;
        this.formattingOptionsManager = formattingOptionsManager;
    }
    async provideDocumentRangeFormattingEdits(document, range, options, token) {
        const file = this.client.toOpenedFilePath(document);
        if (!file) {
            return undefined;
        }
        await this.formattingOptionsManager.ensureConfigurationOptions(document, options, token);
        const args = typeConverters.Range.toFormattingRequestArgs(file, range);
        const response = await this.client.execute('format', args, token);
        if (response.type !== 'response' || !response.body) {
            return undefined;
        }
        return response.body.map(typeConverters.TextEdit.fromCodeEdit);
    }
    async provideOnTypeFormattingEdits(document, position, ch, options, token) {
        const file = this.client.toOpenedFilePath(document);
        if (!file) {
            return [];
        }
        await this.formattingOptionsManager.ensureConfigurationOptions(document, options, token);
        const args = {
            ...typeConverters.Position.toFileLocationRequestArgs(file, position),
            key: ch
        };
        const response = await this.client.execute('formatonkey', args, token);
        if (response.type !== 'response' || !response.body) {
            return [];
        }
        const result = [];
        for (const edit of response.body) {
            const textEdit = typeConverters.TextEdit.fromCodeEdit(edit);
            const range = textEdit.range;
            // Work around for https://github.com/Microsoft/TypeScript/issues/6700.
            // Check if we have an edit at the beginning of the line which only removes white spaces and leaves
            // an empty line. Drop those edits
            if (range.start.character === 0 && range.start.line === range.end.line && textEdit.newText === '') {
                const lText = document.lineAt(range.start.line).text;
                // If the edit leaves something on the line keep the edit (note that the end character is exclusive).
                // Keep it also if it removes something else than whitespace
                if (lText.trim().length > 0 || lText.length > range.end.character) {
                    result.push(textEdit);
                }
            }
            else {
                result.push(textEdit);
            }
        }
        return result;
    }
}
function register(selector, modeId, client, fileConfigurationManager) {
    // return conditionalRegistration([
    // 	requireConfiguration(modeId, 'format.enable'),
    // ], () => {
    let isTs = false;
    for (const language of selector.syntax) {
        let ob = language;
        const name = language.language;
        if (name === null || name === void 0 ? void 0 : name.startsWith("typescript")) {
            isTs = true;
        }
    }
    if (isTs) {
        const formattingProvider = new TypeScriptFormattingProvider(client, fileConfigurationManager);
        return vscode.Disposable.from(vscode.languages.registerOnTypeFormattingEditProvider(selector.syntax, formattingProvider, ';', '}', '\n'), vscode.languages.registerDocumentRangeFormattingEditProvider(selector.syntax, formattingProvider));
    }
    else {
        return vscode.Disposable.from();
    }
}
exports.register = register;
//# sourceMappingURL=formatting.js.map