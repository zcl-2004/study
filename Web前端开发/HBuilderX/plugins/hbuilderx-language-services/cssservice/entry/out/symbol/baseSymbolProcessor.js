"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSymbolProcessor = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const node_1 = require("../../../../htmlservice/entry/out/node");
const util_1 = require("../utils/util");
class BaseSymbolProcessor {
    getHxKindConvertedSymbolsData(workspaceFolder, symbolInformations) {
        let hxSymbolInformations = symbolInformations;
        let addDates = (0, node_1.getHtmlTags)(workspaceFolder);
        for (const item of hxSymbolInformations) {
            if (item.kind === vscode_languageserver_1.SymbolKind.Class && item.name.startsWith('#')) {
                item.hxKind = 'ID';
            }
            else if (item.kind === vscode_languageserver_1.SymbolKind.Class && item.name.startsWith('.')) {
                item.hxKind = 'CLASS';
            }
            else if (item.kind === vscode_languageserver_1.SymbolKind.Class && util_1.html5Tags.includes(item.name)) {
                item.hxKind = 'ELEMENT';
            }
            else if (item.kind === vscode_languageserver_1.SymbolKind.Class && addDates.includes(item.name)) {
                item.hxKind = 'ELEMENT';
            }
        }
        return hxSymbolInformations;
    }
}
exports.BaseSymbolProcessor = BaseSymbolProcessor;
//# sourceMappingURL=baseSymbolProcessor.js.map