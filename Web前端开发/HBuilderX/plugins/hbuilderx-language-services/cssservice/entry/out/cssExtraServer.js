"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFileIndexProcessor = exports.CssExtraServer = void 0;
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const baseExtraServer_1 = require("./baseExtraServer");
const cssCompletionProcessor_1 = require("./completion/cssCompletionProcessor");
const baseDefinitionProcessor_1 = require("./definition/baseDefinitionProcessor");
const formatProcessor_1 = require("./format/formatProcessor");
const cssIndexProcessor_1 = require("./index/cssIndexProcessor");
const baseSymbolProcessor_1 = require("./symbol/baseSymbolProcessor");
// css扩展功能类, 实现IIndexProcessor和baseExtraServer的接口
class CssExtraServer extends baseExtraServer_1.BaseExtraServer {
    // 返回值為bool類型, 判斷此文件類型是否擁有索引服務
    support(doc, _ws) {
        if (doc.languageId === 'css' || doc.uri.endsWith('.css')) {
            return true;
        }
        return false;
    }
    // 生成索引數據: doc為傳入的文檔對象, ws為傳入的項目相關數據
    doIndex(doc, ws) {
        return new cssIndexProcessor_1.CssIndexProcessor().createIndexData(ws, doc);
    }
    getLanguageServiceExt() {
        return {
            // 别人调用的转到定义接口
            async findSymbol(document, symbol, ws) {
                return Promise.resolve().then(() => {
                    return new baseDefinitionProcessor_1.BaseDefinitionProcessor().getDefinitionFromClass(ws, document, symbol);
                });
            },
            async doComplete(document, position, option) {
                let astNode = option === null || option === void 0 ? void 0 : option.docStylesheet;
                if (!option || !option.documentContext) {
                    return { isIncomplete: false, items: [] };
                }
                if (!option.docStylesheet) {
                    astNode = (0, vscode_css_languageservice_1.getCSSLanguageService)().parseStylesheet(document);
                }
                let completionList = await (0, vscode_css_languageservice_1.getCSSLanguageService)().doComplete2(document, position, astNode, option.documentContext);
                return Promise.resolve().then(async () => {
                    const completionClass = new cssCompletionProcessor_1.CssCompletionProcessor();
                    const workspaceFolder = option.workspaceFolder;
                    const connection = option.serverConnection;
                    const support = option.scopedSettingsSupport;
                    completionList = await completionClass.doExtraCompletion(workspaceFolder, document, position, astNode, connection, support, completionList);
                    return completionList;
                });
            },
            findDocumentSymbols(document, option) {
                let astNode = option === null || option === void 0 ? void 0 : option.docStylesheet;
                if (!option) {
                    return [];
                }
                if (!option.docStylesheet) {
                    astNode = (0, vscode_css_languageservice_1.getCSSLanguageService)().parseStylesheet(document);
                }
                let symbolInformationList = (0, vscode_css_languageservice_1.getCSSLanguageService)().findDocumentSymbols(document, astNode);
                let workspaceFolder = option.workspaceFolder;
                symbolInformationList = new baseSymbolProcessor_1.BaseSymbolProcessor().getHxKindConvertedSymbolsData(workspaceFolder, symbolInformationList);
                return symbolInformationList;
            },
            async format(document, range, options) {
                return (0, formatProcessor_1.getFormattingInHtml)(document, range, options);
            },
            async findDefinition(document, position, option) {
                let astNode = option === null || option === void 0 ? void 0 : option.docStylesheet;
                if (!option || !option.docStylesheet) {
                    astNode = (0, vscode_css_languageservice_1.getCSSLanguageService)().parseStylesheet(document);
                }
                let location = (0, vscode_css_languageservice_1.getCSSLanguageService)().findDefinition(document, position, astNode);
                return Promise.resolve().then(async () => {
                    return new baseDefinitionProcessor_1.BaseDefinitionProcessor().getBaseLocationLink(option === null || option === void 0 ? void 0 : option.workspaceFolder, document, position, astNode, location);
                });
            },
        };
    }
}
exports.CssExtraServer = CssExtraServer;
function createFileIndexProcessor(_manager) {
    return new CssExtraServer();
}
exports.createFileIndexProcessor = createFileIndexProcessor;
//# sourceMappingURL=cssExtraServer.js.map