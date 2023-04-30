"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFileIndexProcessor = exports.LessExtraServer = void 0;
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const baseExtraServer_1 = require("./baseExtraServer");
const lessCompletionProcessor_1 = require("./completion/lessCompletionProcessor");
const baseDefinitionProcessor_1 = require("./definition/baseDefinitionProcessor");
const lessIndexProcessor_1 = require("./index/lessIndexProcessor");
const baseSymbolProcessor_1 = require("./symbol/baseSymbolProcessor");
class LessExtraServer extends baseExtraServer_1.BaseExtraServer {
    constructor() {
        super(...arguments);
        this.completionProcessor = new lessCompletionProcessor_1.LessCompletionProcessor();
        this.doExtraCompletion = this.completionProcessor.doExtraCompletion.bind(this.completionProcessor);
    }
    support(doc, _ws) {
        if (doc.languageId === 'less' || doc.uri.endsWith('.less')) {
            return true;
        }
        return false;
    }
    doIndex(doc, ws) {
        return new lessIndexProcessor_1.LessIndexProcessor().createIndexData(ws, doc);
    }
    getLanguageServiceExt() {
        return {
            async findSymbol(document, symbol, ws) {
                return Promise.resolve().then(() => {
                    return new baseDefinitionProcessor_1.BaseDefinitionProcessor().getDefinitionFromClass(ws, document, symbol);
                });
            },
            async doComplete(document, position, option) {
                let astNode = option === null || option === void 0 ? void 0 : option.docStylesheet;
                if (!option || !option.workspaceFolder || !option.documentContext) {
                    return { isIncomplete: false, items: [] };
                }
                if (!option.docStylesheet) {
                    astNode = (0, vscode_css_languageservice_1.getLESSLanguageService)().parseStylesheet(document);
                }
                let completionList = await (0, vscode_css_languageservice_1.getLESSLanguageService)().doComplete2(document, position, astNode, option.documentContext);
                return Promise.resolve().then(async () => {
                    let completionClass = new lessCompletionProcessor_1.LessCompletionProcessor();
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
                    astNode = (0, vscode_css_languageservice_1.getLESSLanguageService)().parseStylesheet(document);
                }
                let symbolInformationList = (0, vscode_css_languageservice_1.getLESSLanguageService)().findDocumentSymbols(document, astNode);
                let workspaceFolder = option.workspaceFolder;
                symbolInformationList = new baseSymbolProcessor_1.BaseSymbolProcessor().getHxKindConvertedSymbolsData(workspaceFolder, symbolInformationList);
                return symbolInformationList;
            },
            async findDefinition(document, position, option) {
                let astNode = option === null || option === void 0 ? void 0 : option.docStylesheet;
                if (!option || !option.docStylesheet) {
                    astNode = (0, vscode_css_languageservice_1.getLESSLanguageService)().parseStylesheet(document);
                }
                let location = (0, vscode_css_languageservice_1.getLESSLanguageService)().findDefinition(document, position, astNode);
                return Promise.resolve().then(async () => {
                    return new baseDefinitionProcessor_1.BaseDefinitionProcessor().getBaseLocationLink(option === null || option === void 0 ? void 0 : option.workspaceFolder, document, position, astNode, location);
                });
            },
        };
    }
}
exports.LessExtraServer = LessExtraServer;
function createFileIndexProcessor(_manager) {
    return new LessExtraServer();
}
exports.createFileIndexProcessor = createFileIndexProcessor;
//# sourceMappingURL=lessExtraServer.js.map