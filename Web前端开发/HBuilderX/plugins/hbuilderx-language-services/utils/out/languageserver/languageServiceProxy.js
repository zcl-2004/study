"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTSLanguageServiceProxy = void 0;
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const type_resolve_1 = require("../common/type-resolve");
const index_1 = require("../specialTypes/index");
const jql = require("./jqlService");
const ParseUtil_1 = require("./ParseUtil");
const vueRouterParamsParser_1 = require("./vueRouterParamsParser");
function language() {
    return 'zh_cn';
}
function getNlsFilePath(key) {
    if (typeof key != 'string')
        return undefined;
    let parts = key.split('.');
    let languageId = null;
    let version = null;
    if (parts.length > 2) {
        languageId = parts[0];
        version = parts[1];
    }
    let dirPath = path.resolve(__dirname, '../../nls');
    if (languageId && version) {
        let nlsPath = path.join(dirPath, language(), languageId, `${languageId}.${version}.js`);
        if (fs.existsSync(nlsPath)) {
            return nlsPath;
        }
    }
    return undefined;
}
function translate(nlsPath, key) {
    let content = require(nlsPath);
    if (content.hasOwnProperty(key)) {
        return content[key];
    }
    return undefined;
}
function translateText(text) {
    let nlsPath = getNlsFilePath(text);
    if (nlsPath) {
        let res = translate(nlsPath, text);
        if (res) {
            text = res;
        }
    }
    return text;
}
function getSignatures(position, currentToken, service) {
    let signatures = [];
    let types = ParseUtil_1.ParseUtil.getTypesAtLocation(currentToken, service);
    if (types && types.length > 0) {
        types.forEach((type) => {
            if (type === 'Document') {
                let parent = currentToken.parent;
                if ((parent === null || parent === void 0 ? void 0 : parent.kind) === ts.SyntaxKind.CallExpression) {
                    let callExpression = currentToken.parent;
                    let rightExpress = callExpression.expression.getChildAt(2);
                    if (rightExpress && rightExpress.kind === ts.SyntaxKind.Identifier) {
                        let functionName = rightExpress.escapedText;
                        if (functionName === 'getElementById') {
                            signatures = ['HBuilderX.IDString'];
                        }
                        else if (functionName === 'getElementByClassName') {
                            signatures = ['HBuilderX.ClassString'];
                        }
                    }
                }
            }
            else if (type === 'NodeRequire') {
                signatures = ['HBuilderX.RequireCommonString'];
            }
            else {
                signatures.push(...types);
            }
        });
    }
    return Array.from(new Set(signatures));
}
function createTSLanguageServiceProxy(service, prj, uniCloudServerLS) {
    const proxy = Object.create(null);
    for (let k of Object.keys(service)) {
        const x = service[k];
        proxy[k] = (...args) => x.apply(service, args);
    }
    proxy.getDefinitionAtPosition = (fileName, position) => {
        let result = null;
        if (prj && prj.isUnicloudSource && uniCloudServerLS) {
            if (prj.isUnicloudSource(fileName)) {
                result = uniCloudServerLS.getDefinitionAtPosition(fileName, position);
            }
        }
        if (fileName.endsWith('.jql')) {
            let program = service.getProgram();
            let source = program.getSourceFile(fileName);
            return jql.getJQLLanguageService(prj, source.text).getDefinitionAtPosition(fileName, position);
        }
        if (!!result)
            return result;
        result = service.getDefinitionAtPosition(fileName, position);
        // 原先直接!!result进行判断, 当返回值为空数组时, 也会直接返回
        if (!!result && result.length > 0)
            return result;
        let program = service.getProgram();
        let source = program.getSourceFile(fileName);
        const tokens = (0, type_resolve_1.getRelevantTokens)(position, source);
        const previousToken = tokens.previousToken;
        const currentToken = tokens.contextToken;
        if ((0, type_resolve_1.isInString)(source, position, previousToken)) {
            let parameterTypes = getSignatures(position, currentToken, service);
            if (!includeSpecialType(parameterTypes))
                parameterTypes = getSignatures(position, currentToken, service);
            for (let type of parameterTypes) {
                if (index_1.specialTypes.has(type.trim()) || index_1.specialTypes.has(`HBuilderX.${type.trim()}`)) {
                    const { line, character } = service.toLineColumnOffset(fileName, currentToken.getStart() + 1);
                    return (0, index_1.gotoDefinition)(type.includes(`HBuilderX.`) ? type.trim() : `HBuilderX.${type.trim()}`, currentToken.text, {
                        workspaceFolder: prj.fsPath,
                        range: {
                            start: {
                                line: line,
                                character: character,
                            },
                            end: {
                                line: line,
                                character: character + currentToken.getText().length,
                            },
                        },
                        offset: position - currentToken.getStart() - 1,
                        token: currentToken,
                        fileName: fileName,
                    });
                }
            }
        }
        return null;
    };
    proxy.getDefinitionAndBoundSpan = (fileName, position) => {
        let result = null;
        if (prj && prj.isUnicloudSource && uniCloudServerLS) {
            if (prj.isUnicloudSource(fileName)) {
                result = uniCloudServerLS.getDefinitionAndBoundSpan(fileName, position);
            }
        }
        if (fileName.endsWith('.jql')) {
            let program = service.getProgram();
            let source = program.getSourceFile(fileName);
            return jql.getJQLLanguageService(prj, source.text).getDefinitionAndBoundSpan(fileName, position);
        }
        if (!!result)
            return result;
        result = service.getDefinitionAndBoundSpan(fileName, position);
        if (!!result)
            return result;
        let program = service.getProgram();
        let source = program.getSourceFile(fileName);
        const tokens = (0, type_resolve_1.getRelevantTokens)(position, source);
        const previousToken = tokens.previousToken;
        const currentToken = tokens.contextToken;
        if ((0, type_resolve_1.isInString)(source, position, previousToken)) {
            let parameterTypes = getSignatures(position, currentToken, service);
            for (let type of parameterTypes) {
                if (index_1.specialTypes.has(type.trim()) || index_1.specialTypes.has(`HBuilderX.${type.trim()}`)) {
                    const { line, character } = service.toLineColumnOffset(fileName, currentToken.getStart() + 1);
                    return (0, index_1.gotoDefinition)(type.includes(`HBuilderX.`) ? type.trim() : `HBuilderX.${type.trim()}`, currentToken.text, {
                        workspaceFolder: prj.fsPath,
                        range: {
                            start: {
                                line: line,
                                character: character,
                            },
                            end: {
                                line: line,
                                character: character + currentToken.getText().length,
                            },
                        },
                        offset: position - currentToken.getStart() - 1,
                        token: currentToken,
                        fileName: fileName,
                    });
                }
            }
        }
        return null;
    };
    proxy.getTypeDefinitionAtPosition = (fileName, position) => {
        if (prj && prj.isUnicloudSource && uniCloudServerLS) {
            if (prj.isUnicloudSource(fileName)) {
                return uniCloudServerLS.getTypeDefinitionAtPosition(fileName, position);
            }
        }
        return service.getTypeDefinitionAtPosition(fileName, position);
    };
    proxy.getQuickInfoAtPosition = (fileName, position) => {
        let quickInfo = null;
        if (prj && prj.isUnicloudSource && uniCloudServerLS) {
            if (prj.isUnicloudSource(fileName)) {
                quickInfo = uniCloudServerLS.getQuickInfoAtPosition(fileName, position);
            }
        }
        if (fileName.endsWith('.jql')) {
            let program = service.getProgram();
            let source = program.getSourceFile(fileName);
            return jql.getJQLLanguageService(prj, source.text).getQuickInfoAtPosition(fileName, position);
        }
        if (!!quickInfo)
            return quickInfo;
        quickInfo = service.getQuickInfoAtPosition(fileName, position);
        if (!!quickInfo)
            return quickInfo;
        let program = service.getProgram();
        let source = program.getSourceFile(fileName);
        const tokens = (0, type_resolve_1.getRelevantTokens)(position, source);
        const previousToken = tokens.previousToken;
        const currentToken = tokens.contextToken;
        // 新增i18n悬浮处理逻辑
        if ((0, type_resolve_1.isInString)(source, position, previousToken)) {
            let stringQuickInfo;
            let parameterTypes = getSignatures(position, currentToken, service);
            for (let type of parameterTypes) {
                if (index_1.specialTypes.has(type.trim()) || index_1.specialTypes.has(`HBuilderX.${type.trim()}`)) {
                    const { line, character } = service.toLineColumnOffset(fileName, currentToken.getStart() + 1);
                    stringQuickInfo = (0, index_1.doHover)(type.includes(`HBuilderX.`) ? type.trim() : `HBuilderX.${type.trim()}`, currentToken.text, {
                        workspaceFolder: prj.fsPath,
                        range: {
                            start: {
                                line: line,
                                character: character,
                            },
                            end: {
                                line: line,
                                character: character + currentToken.getText().length,
                            },
                        },
                        offset: position - currentToken.getStart() - 1,
                        token: currentToken,
                        fileName: fileName,
                    });
                }
            }
            if (stringQuickInfo)
                return stringQuickInfo;
        }
        let doc = ts.displayPartsToString(quickInfo === null || quickInfo === void 0 ? void 0 : quickInfo.documentation);
        if (quickInfo)
            quickInfo.documentation = [{ kind: 'text', text: translateText(doc) }];
        return quickInfo;
    };
    proxy.getCompletionEntryDetails = (fileName, position, entryName, formatOptions, source, preferences, data) => {
        if (prj && prj.isUnicloudSource && uniCloudServerLS) {
            if (prj.isUnicloudSource(fileName)) {
                return uniCloudServerLS.getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences, data);
            }
        }
        if (fileName.endsWith('.jql')) {
            let program = service.getProgram();
            let sourceFile = program.getSourceFile(fileName);
            return jql.getJQLLanguageService(prj, sourceFile.text).getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences, data);
        }
        let entryDetails = service.getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences, data);
        let doc = ts.displayPartsToString(entryDetails === null || entryDetails === void 0 ? void 0 : entryDetails.documentation);
        if (entryDetails)
            entryDetails.documentation = [{ kind: 'text', text: translateText(doc) }];
        return entryDetails;
    };
    proxy.getCompletionsAtPosition = (fileName, position, options) => {
        let prior = null;
        if (prj && prj.isUnicloudSource && uniCloudServerLS) {
            if (prj.isUnicloudSource(fileName)) {
                prior = uniCloudServerLS.getCompletionsAtPosition(fileName, position, options);
            }
        }
        if (fileName.endsWith('.jql')) {
            let program = service.getProgram();
            let source = program.getSourceFile(fileName);
            return jql.getJQLLanguageService(prj, source.text).getCompletionsAtPosition(fileName, position, options);
        }
        if (!!prior)
            return prior;
        prior = service.getCompletionsAtPosition(fileName, position, options);
        if (!prior)
            return undefined;
        let program = service.getProgram();
        let source = program.getSourceFile(fileName);
        const tokens = (0, type_resolve_1.getRelevantTokens)(position, source);
        const previousToken = tokens.previousToken;
        const currentToken = tokens.contextToken;
        if ((0, type_resolve_1.isInString)(source, position, previousToken)) {
            const start = previousToken.getStart(source);
            const end = previousToken.getEnd();
            let filterDataList = {};
            prior.entries.forEach((element) => {
                filterDataList[element.name] = true;
            });
            let parameterTypes = ParseUtil_1.ParseUtil.getParamTypes(fileName, position, service);
            if (!includeSpecialType(parameterTypes))
                parameterTypes = getSignatures(position, currentToken, service);
            // 获取当前特殊string的位置
            for (let type of parameterTypes) {
                if (index_1.specialTypes.has(type.trim()) || index_1.specialTypes.has(`HBuilderX.${type.trim()}`)) {
                    let textDocument = vscode_languageserver_textdocument_1.TextDocument.create(fileName, fileName.endsWith('.html') || fileName.endsWith('.htm') ? 'html' : 'typescript', 1, source.text);
                    let pos = textDocument.positionAt(position);
                    let startPos = textDocument.positionAt(start + 1);
                    let endPos = textDocument.positionAt(end - 1);
                    let replaceRange = vscode_languageserver_protocol_1.Range.create(startPos, endPos);
                    let completions = (0, index_1.doComplete)([type.includes(`HBuilderX.`) ? type.trim() : `HBuilderX.${type.trim()}`], pos, textDocument, {
                        workspaceFolder: prj === null || prj === void 0 ? void 0 : prj.fsPath,
                        sourceFile: source,
                        pos: position,
                        replaceRange
                    });
                    completions === null || completions === void 0 ? void 0 : completions.forEach((item) => {
                        var _a, _b, _c, _d;
                        let data = item;
                        if (filterDataList[item.label])
                            return;
                        const insertText = (_a = item.insertText) !== null && _a !== void 0 ? _a : undefined;
                        const range = (_c = (_b = data.textEdit) === null || _b === void 0 ? void 0 : _b.range) !== null && _c !== void 0 ? _c : undefined;
                        prior.entries.push({
                            name: item.label,
                            kind: convertKind(item.kind) ? convertKind(item.kind) : ts.ScriptElementKind.string,
                            sortText: (_d = item.sortText) !== null && _d !== void 0 ? _d : item.label,
                            insertText,
                            detail: item.detail,
                            documentation: item.documentation,
                            replaceRange: range
                        });
                    });
                }
            }
        }
        else {
            let types = getSignatures(position, currentToken, service);
            if (types.includes('VueRouterParams') && prior) {
                prior.entries.unshift(...(0, vueRouterParamsParser_1.getVueRouterParamsCompletions)(prj === null || prj === void 0 ? void 0 : prj.fsPath));
            }
        }
        let newEntries = JSON.parse(JSON.stringify(prior.entries));
        newEntries.forEach((entry) => {
            var _a;
            if (entry.kind == 'class') {
                entry.kind = 'property';
            }
            //新增处理逻辑: 处理async和await吃掉函数的问题
            if ((entry.name === 'async' || entry.name === 'await') && ((_a = tokens.previousToken) === null || _a === void 0 ? void 0 : _a.kind) && tokens.previousToken.kind === ts.SyntaxKind.Identifier) {
                let node = tokens.previousToken;
                if (node.escapedText) {
                    let left = node.escapedText.length - (tokens.previousToken.end - position);
                    let text = node.escapedText;
                    text = text.substring(left);
                    if (text !== '') {
                        entry.kindModifiers = 'Snippet';
                        entry.insertText = entry.name + '$0 ' + text;
                    }
                }
            }
        });
        prior.entries = newEntries;
        return prior;
    };
    return proxy;
}
exports.createTSLanguageServiceProxy = createTSLanguageServiceProxy;
function convertKind(kind) {
    if (kind === vscode_languageserver_protocol_1.CompletionItemKind.File) {
        return 'file';
    }
    else if (kind === vscode_languageserver_protocol_1.CompletionItemKind.Folder) {
        return 'folder';
    }
    else {
        return '';
    }
}
function includeSpecialType(types) {
    for (let type of types) {
        if (index_1.specialTypes.has(type.trim()) || index_1.specialTypes.has(`HBuilderX.${type.trim()}`)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=languageServiceProxy.js.map