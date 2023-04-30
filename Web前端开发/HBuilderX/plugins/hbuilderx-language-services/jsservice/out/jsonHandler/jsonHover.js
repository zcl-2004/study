"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const vscode_json_languageservice_1 = require("vscode-json-languageservice");
const vscode_uri_1 = require("vscode-uri");
const out_1 = require("../../../utils/out");
const packageSchema_1 = require("../schemas/packageSchema");
const pagesSchema_1 = require("../schemas/pagesSchema");
const schemaSchema_1 = require("../schemas/schemaSchema");
const arrays_1 = require("../utils/arrays");
const schemaMgr = require("./schemaManager");
function getJsonServer() {
    const workspaceContext = {
        resolveRelativePath: (relativePath, resource) => {
            const base = resource.substring(0, resource.lastIndexOf('/') + 1);
            return vscode_uri_1.Utils.resolvePath(vscode_uri_1.URI.parse(base), relativePath).toString();
        },
    };
    const jsonLanguageService = (0, vscode_json_languageservice_1.getLanguageService)({
        workspaceContext,
        contributions: [],
        clientCapabilities: vscode_json_languageservice_1.ClientCapabilities.LATEST,
    });
    return jsonLanguageService;
}
// 遍历语法树
function treeApply(node, visit) {
    if (node && visit(node)) {
        if (node.children) {
            node.children.forEach((child) => {
                treeApply(child, visit);
            });
        }
    }
}
// 解析json获取需要的node
function getNodeFromKey(jsonDocument, targetName) {
    const doc = jsonDocument.root;
    let needNodeList = [];
    treeApply(doc, (node) => {
        if (node.type === 'property' && node.keyNode.value === targetName) {
            needNodeList.push(node);
        }
        return true;
    });
    return needNodeList;
}
function getCurrentI18nLanguageFile(prj) {
    let filePath = undefined;
    let manifestFilePath = path.join(prj.sourceRoot, 'manifest.json');
    let messages = fs.readFileSync(manifestFilePath);
    // 根据设置项, 获取当前设置的翻译语言和回退语言
    let textDocument = vscode_json_languageservice_1.TextDocument.create(manifestFilePath, 'json', 1, messages.toString());
    let jsonDocument = getJsonServer().parseJSONDocument(textDocument);
    let localeNodeList = getNodeFromKey(jsonDocument, 'locale');
    // 默认设置翻译语言为中文
    let defI18n = 'zh-Hans';
    if (localeNodeList.length > 0) {
        // 此功能, hx内置了5款语言标识, 分别为:
        // en: 英文, fr: 法语, es: 西班牙语, zh-Hans: 简体中文, zh-Hant: 繁体中文
        let localeNode = localeNodeList[0];
        if (!localeNode.valueNode)
            return filePath;
        defI18n = localeNode.valueNode.value;
    }
    // 获取全部的翻译文件
    let localeDir = path.join(prj.sourceRoot, 'locale');
    let localeJsonList = fs.readdirSync(localeDir);
    if (!localeJsonList)
        return filePath;
    if (localeJsonList.length < 1)
        return filePath;
    // 过滤uni翻译文件
    let localeJsonFilterList = [];
    for (const element of localeJsonList) {
        if (!element.includes('uni') && element.endsWith('.json')) {
            localeJsonFilterList.push(element);
        }
    }
    // 查询默认的翻译文件是否存在
    if (!localeJsonFilterList.includes(defI18n + '.json')) {
        // 如果没有翻译语言, 则找回退语言
        let fallbackLocaleNodeList = getNodeFromKey(jsonDocument, 'fallbackLocale');
        let backI18n = 'en';
        if (localeNodeList.length > 0) {
            backI18n = fallbackLocaleNodeList[0].value;
        }
        if (!localeJsonFilterList.includes(defI18n + '.json'))
            return undefined;
    }
    filePath = path.join(localeDir, defI18n + '.json');
    return filePath;
}
class JsonHoverProvider {
    // 新增: i18n悬浮处理逻辑
    async doHoverFromI18n(jsonLanguageService, workspaceFolder, textDocument, position, jsonDocument) {
        // 通过position获取当前的node
        // 从node中获取信息, 判断是不是i18n的位置
        // 获取文本, 调用对应的悬浮逻辑
        let defData = null;
        // 获取schema语法树
        let schema = await jsonLanguageService.getMatchingSchemas(textDocument, jsonDocument);
        // 获取当前位置的Node语法树
        let currentToken = jsonDocument.getNodeFromOffset(textDocument.offsetAt(position));
        if (!currentToken || currentToken.type !== 'string' || !currentToken.parent || currentToken.parent.type !== 'property' || !currentToken.value.startsWith('%'))
            return defData;
        // 遍历schema语法树, 查询当前node的父节点, 获取特殊string类型
        let specialString = [];
        for (const iterator of schema) {
            if (iterator.node === currentToken) {
                specialString = iterator.schema.enum;
                break;
            }
        }
        if (!specialString)
            return defData;
        let options = {
            workspaceFolder: workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri.fsPath
        };
        for (const iterator of specialString) {
            let data = (0, out_1.doHover)(iterator, currentToken.value.replace(/%/g, ''), options);
            if (!data)
                return defData;
            let prj = out_1.hx.createProject(options.workspaceFolder);
            if (!prj)
                return defData;
            let i18nFilePath = getCurrentI18nLanguageFile(prj);
            if (!i18nFilePath)
                return defData;
            const messages = fs.readFileSync(i18nFilePath);
            if (!data.documentation)
                return defData;
            if (data.documentation.length < 1)
                return defData;
            defData = new vscode.Hover(new vscode.MarkdownString(data.documentation[0].text));
            let start = textDocument.positionAt(currentToken.offset);
            defData.range = new vscode.Range(new vscode.Position(start.line, start.character), new vscode.Position(start.line, start.character + currentToken.length));
        }
        return defData;
    }
    async provideHover(document, position, token) {
        let workspaceFolder = await vscode.workspace.getWorkspaceFolder(document.uri);
        // 注册schema
        schemaMgr.registerSchema('packageSchema', packageSchema_1.PackageSchema, ['package.json']);
        schemaMgr.registerSchema('pagesSchema', pagesSchema_1.PagesSchema, ['pages.json']);
        schemaMgr.registerSchema('schemaJsonSchema', schemaSchema_1.SchemaJsonSchema, ['*.schema.json']);
        const jsonLanguageService = (0, vscode_json_languageservice_1.getLanguageService)({
            schemaRequestService: schemaMgr.findSchema,
        });
        schemaMgr.setLanguageConfig(jsonLanguageService, vscode_uri_1.URI.parse(document.uri.toString()).fsPath, workspaceFolder);
        const textDocument = vscode_json_languageservice_1.TextDocument.create(document.uri.toString(), document.languageId, 1, document.getText());
        const jsonDocument = jsonLanguageService.parseJSONDocument(textDocument);
        let data = await this.doHoverFromI18n(jsonLanguageService, workspaceFolder, textDocument, position, jsonDocument);
        if (data)
            return data;
        let result = await jsonLanguageService.doHover(textDocument, position, jsonDocument);
        if (!result)
            return null;
        let hoverResult = new vscode.Hover(new vscode.MarkdownString(result === null || result === void 0 ? void 0 : result.contents.toString()));
        if (result.range) {
            hoverResult.range = new vscode.Range(new vscode.Position(result.range.start.line, result.range.start.character), new vscode.Position(result.range.end.line, result.range.end.character));
        }
        return hoverResult;
    }
}
function register() {
    const patterns = ['**/package.json', '**/database/*.schema.json', '**/pages.json', '**/manifest.json', '**/settings.json'];
    const languages = ['json', 'jsonc', 'json_tm'];
    const selector = (0, arrays_1.flatten)(languages.map((language) => patterns.map((pattern) => ({ language, pattern }))));
    return vscode.languages.registerHoverProvider(selector, new JsonHoverProvider());
}
exports.register = register;
//# sourceMappingURL=jsonHover.js.map