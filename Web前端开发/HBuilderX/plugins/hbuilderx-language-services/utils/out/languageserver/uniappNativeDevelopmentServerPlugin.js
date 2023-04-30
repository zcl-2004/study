"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hxproject_1 = require("./hxproject");
const ts = require("typescript/lib/tsserverlibrary");
const fs = require("fs");
const path = require("path");
const vscode_uri_1 = require("vscode-uri");
const type_resolve_1 = require("../common/type-resolve");
const ParseUtil_1 = require("./ParseUtil");
// import { CompletionItem, CompletionItemKind, TextEdit } from "vscode-languageserver-protocol";
const index_1 = require("../specialTypes/index");
// import { TextDocument } from "vscode-languageserver-textdocument";
// import { stringify } from 'querystring';
// import { FILE } from 'dns';
let libFiles = ["android-declarations.d.ts", "android.d.ts", "fastjson-1.1.46.android.d.ts", "dc_weexsdk.d.ts"];
function includeSpecialType(types) {
    for (let type of types) {
        if (index_1.specialTypes.has(type.trim()) || index_1.specialTypes.has(`HBuilderX.${type.trim()}`)) {
            return true;
        }
    }
    return false;
}
function getSignatures(position, currentToken, service) {
    let signatures = [];
    let types = ParseUtil_1.ParseUtil.getTypesAtLocation(currentToken, service);
    if (types && types.length > 0) {
        types.forEach(type => {
            if (type === 'Document') {
                let parent = currentToken.parent;
                if ((parent === null || parent === void 0 ? void 0 : parent.kind) === ts.SyntaxKind.CallExpression) {
                    let callExpression = currentToken.parent;
                    let rightExperss = callExpression.expression.getChildAt(2);
                    if (rightExperss && rightExperss.kind === ts.SyntaxKind.Identifier) {
                        let functionName = rightExperss.escapedText;
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
function createDocumentProvider(prj, lsHost) {
    if (!prj || !lsHost) {
        return undefined;
    }
    return {
        get version() {
            return lsHost.getProjectVersion();
        },
        getDefaultLibs(prj) {
            let libs = [];
            let extensionDir = hxproject_1.hx.getExtensionRootPath();
            libFiles.forEach(item => {
                libs.push(path.join(extensionDir, "builtin-dts", "common", item));
            });
            return libs;
        },
        compilerOptions: {
            allowNonTsExtensions: true,
            allowJs: true,
            lib: ["lib.esnext.d.ts"],
            target: ts.ScriptTarget.Latest,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            experimentalDecorators: false
        },
        get documents() {
            let docs = [];
            lsHost.getScriptFileNames().forEach(item => {
                if (prj.isProjectOf(item)) {
                    docs.push(item);
                }
            });
            // console.log("lsHost: " + JSON.stringify(lsHost.getScriptFileNames()));
            return lsHost.getScriptFileNames();
        },
        getDocumentSnapshot(uri) {
            let docUri = vscode_uri_1.URI.parse(hxproject_1.hx.toNormalizedUri(uri));
            for (let i = 0; i < libFiles.length; ++i) {
                if (docUri.fsPath.endsWith(libFiles[i])) {
                    let text = fs.readFileSync(docUri.fsPath).toString();
                    return {
                        getText: (start, end) => text.substring(start, end),
                        getLength: () => text.length,
                        getChangeRange: () => undefined
                    };
                }
            }
            return lsHost.getScriptSnapshot(docUri.fsPath);
        },
        hasDocument(uri) {
            let docUri = hxproject_1.hx.toNormalizedUri(uri);
            return fs.existsSync(vscode_uri_1.URI.parse(docUri).fsPath); //lsHost.fileExists(docUri.fsPath);
        },
        getDocumentVersion(uri) {
            let docUri = hxproject_1.hx.toNormalizedUri(uri);
            return lsHost.getScriptVersion(vscode_uri_1.URI.parse(docUri).fsPath);
        }
    };
}
function getSymbols(escapedNames, symbol) {
    var _a;
    if (!symbol) {
        return symbol;
    }
    let newEscapedNames = new Array(...escapedNames);
    for (let i = 0; i < escapedNames.length; ++i) {
        newEscapedNames.shift();
        if (escapedNames[i] === "") {
            return symbol;
        }
        if ((_a = symbol.exports) === null || _a === void 0 ? void 0 : _a.has(escapedNames[i])) {
            let newSymbol = symbol.exports.get(escapedNames[i]);
            if (newSymbol.flags === ts.SymbolFlags.ValueModule) {
                return getSymbols(newEscapedNames, newSymbol);
            }
            else {
                return newSymbol;
            }
        }
    }
    return symbol;
}
function proxyLanguageService(defaultLS, project, uniappNativeDevLS) {
    const proxy = Object.create(null);
    for (let k of Object.keys(defaultLS)) {
        const x = defaultLS[k];
        proxy[k] = (...args) => x.apply(defaultLS, args);
    }
    proxy.getDefinitionAtPosition = (fileName, position) => {
        // console.log("fileName--getDefinitionAtPosition", fileName);
        if (project.kind === hxproject_1.hx.HXProjectKind.UniApp || project.kind === hxproject_1.hx.HXProjectKind.UniApp_Cli) {
            if (fileName.startsWith(path.join(project.fsPath, "nativeplugins"))) {
                return uniappNativeDevLS.getDefinitionAtPosition(fileName, position);
            }
        }
        return defaultLS.getDefinitionAtPosition(fileName, position);
    };
    proxy.getDefinitionAndBoundSpan = (fileName, position) => {
        // console.log("fileName--getDefinitionAndBoundSpan", fileName);
        if (project.kind === hxproject_1.hx.HXProjectKind.UniApp || project.kind === hxproject_1.hx.HXProjectKind.UniApp_Cli) {
            if (fileName.startsWith(path.join(project.fsPath, "nativeplugins"))) {
                return uniappNativeDevLS.getDefinitionAndBoundSpan(fileName, position);
            }
        }
        return defaultLS.getDefinitionAndBoundSpan(fileName, position);
    };
    proxy.getTypeDefinitionAtPosition = (fileName, position) => {
        // console.log("fileName--getTypeDefinitionAtPosition", fileName);
        if (project.kind === hxproject_1.hx.HXProjectKind.UniApp || project.kind === hxproject_1.hx.HXProjectKind.UniApp_Cli) {
            if (fileName.startsWith(path.join(project.fsPath, "nativeplugins"))) {
                return uniappNativeDevLS.getTypeDefinitionAtPosition(fileName, position);
            }
        }
        return defaultLS.getTypeDefinitionAtPosition(fileName, position);
    };
    proxy.getQuickInfoAtPosition = (fileName, position) => {
        // console.log("fileName--getQuickInfoAtPosition", fileName);
        if (project.kind === hxproject_1.hx.HXProjectKind.UniApp || project.kind === hxproject_1.hx.HXProjectKind.UniApp_Cli) {
            if (fileName.startsWith(path.join(project.fsPath, "nativeplugins"))) {
                return uniappNativeDevLS.getQuickInfoAtPosition(fileName, position);
            }
        }
        return defaultLS.getQuickInfoAtPosition(fileName, position);
    };
    proxy.getCompletionEntryDetails = (fileName, position, entryName, formatOptions, source, preferences, data) => {
        // console.log("fileName--getCompletionEntryDetails", fileName);
        if (project.kind === hxproject_1.hx.HXProjectKind.UniApp || project.kind === hxproject_1.hx.HXProjectKind.UniApp_Cli) {
            if (fileName.startsWith(path.join(project.fsPath, "nativeplugins"))) {
                return uniappNativeDevLS.getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences, data);
            }
        }
        return defaultLS.getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences, data);
    };
    proxy.getCompletionsAtPosition = (fileName, position, options) => {
        var _a, _b;
        // 判断是uniapp项目
        if (project.kind === hxproject_1.hx.HXProjectKind.UniApp || project.kind === hxproject_1.hx.HXProjectKind.UniApp_Cli) {
            // 判断是在原生插件中
            if (fileName.startsWith(path.join(project.fsPath, "nativeplugins"))) {
                // 返回的信息
                let info = uniappNativeDevLS.getCompletionsAtPosition(fileName, position, options);
                let program = uniappNativeDevLS.getProgram();
                let source = program.getSourceFile(fileName);
                let tokens = (0, type_resolve_1.getRelevantTokens)(position, source);
                let previousToken = tokens.previousToken;
                // let contextToken: ts.Node = tokens.contextToken!;
                // 判断是在字符串中
                if ((0, type_resolve_1.isInString)(source, position, previousToken)) {
                    // 再判断是在import包名称字符串中
                    let parameterTypes = ParseUtil_1.ParseUtil.getParamTypes(fileName, position, defaultLS);
                    if (!includeSpecialType(parameterTypes)) {
                        parameterTypes = getSignatures(position, previousToken, defaultLS);
                    }
                    let type = "HBuilderX.ImportURIString";
                    if (parameterTypes.includes(type)) {
                        // 将android aip追加进去
                        let checker = program.getTypeChecker();
                        let symbols = checker.getSymbolsInScope(previousToken, ts.SymbolFlags.Namespace);
                        let extensionDir = hxproject_1.hx.getExtensionRootPath();
                        let sourceFileNames = [];
                        libFiles.forEach(item => {
                            sourceFileNames.push(path.join(extensionDir, "builtin-dts", "common", item));
                        });
                        // 筛选symbols
                        symbols = symbols.filter(symbol => { var _a, _b; return sourceFileNames.includes((_b = (_a = symbol.valueDeclaration) === null || _a === void 0 ? void 0 : _a.getSourceFile()) === null || _b === void 0 ? void 0 : _b.fileName); });
                        if (previousToken.kind === ts.SyntaxKind.StringLiteral) {
                            let strNode = previousToken;
                            let previousTokenStr = (_a = strNode.text) === null || _a === void 0 ? void 0 : _a.trim();
                            let escapedNames = previousTokenStr.split(".");
                            if (escapedNames.length <= 1) {
                                symbols.forEach(symbol => {
                                    info.entries.push({
                                        name: symbol.escapedName,
                                        kind: ts.ScriptElementKind.string,
                                        sortText: symbol.escapedName,
                                    });
                                });
                                return info;
                            }
                            let firstSymbol = symbols.find(symbol => symbol.escapedName === escapedNames[0]);
                            escapedNames.shift();
                            // 获取当前token对应的symbol
                            let symbol = getSymbols(escapedNames, firstSymbol);
                            if (symbol) {
                                if (symbol.flags === ts.SymbolFlags.ValueModule
                                    || (symbol.flags & ts.SymbolFlags.ValueModule) === ts.SymbolFlags.ValueModule) {
                                    (_b = symbol.exports) === null || _b === void 0 ? void 0 : _b.forEach((value, key) => {
                                        info.entries.push({
                                            name: key,
                                            kind: ts.ScriptElementKind.string,
                                            sortText: key,
                                        });
                                    });
                                }
                            }
                        }
                    }
                    return info;
                }
                return info;
            }
        }
        return defaultLS.getCompletionsAtPosition(fileName, position, options);
    };
    return proxy;
}
function create(info) {
    let project = info.project;
    if (project) {
        // 创建documentProvider
        let docProvider = createDocumentProvider(project, info.languageServiceHost);
        // 创建一个provider对应的LS
        let uniappNativeDevLS = project.createTSLanguageService(docProvider, undefined, undefined, false);
        // 对默认LS进行代理
        let proxy = proxyLanguageService(info.languageService, project, uniappNativeDevLS);
        return proxy;
    }
    return info.languageService;
}
function checkExpression(prj, compilerOptions, checker, node, checkMode, forceTuple) {
    const kind = node.kind;
    let res = undefined;
    if (kind === ts.SyntaxKind.Identifier) {
        let symbol = checker.getResolvedSymbol(node);
        if ((symbol === null || symbol === void 0 ? void 0 : symbol.declarations) && symbol.declarations.length > 0) {
            symbol.declarations.forEach((declar) => {
                var _a;
                if (declar.kind === ts.SyntaxKind.ImportClause && declar.parent.kind === ts.SyntaxKind.ImportDeclaration) {
                    let importDeclarNode = declar.parent;
                    let fromModule = (_a = importDeclarNode.moduleSpecifier) === null || _a === void 0 ? void 0 : _a.getText();
                    // 去除前后引号
                    if (fromModule.startsWith("\"") || fromModule.startsWith("'")) {
                        fromModule = fromModule.slice(1);
                    }
                    if (fromModule.endsWith("\"") || fromModule.endsWith("'")) {
                        fromModule = fromModule.slice(0, -1);
                    }
                    // 判断以文件后缀结尾
                    if (fromModule.endsWith(".js") || fromModule.endsWith(".ts")) {
                        return;
                    }
                    // console.log(fromModule);
                    // 使用"."切割表达式
                    let fromModuleStr = fromModule === null || fromModule === void 0 ? void 0 : fromModule.trim();
                    let escapedNames = fromModuleStr.split(".");
                    if (escapedNames.length <= 1) {
                        return;
                    }
                    // 获取所有符号
                    let symbols = checker.getSymbolsInScope(importDeclarNode.moduleSpecifier, ts.SymbolFlags.Namespace);
                    // 获取第一个符号
                    let firstSymbol = symbols.find(symbol => symbol.escapedName === escapedNames[0]);
                    escapedNames.shift();
                    // 获取当前表达式最后一个symbol
                    let newSymbol = getSymbols(escapedNames, firstSymbol);
                    res = checker.getTypeOfSymbol(newSymbol);
                    // console.log(res);
                }
            });
        }
    }
    return res;
}
exports.default = {
    create,
    checkExpression
};
//# sourceMappingURL=uniappNativeDevelopmentServerPlugin.js.map