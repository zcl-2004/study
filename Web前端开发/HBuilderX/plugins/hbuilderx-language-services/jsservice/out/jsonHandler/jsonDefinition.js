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
function treeApply(node, visit) {
    if (node && visit(node)) {
        if (node.children) {
            node.children.forEach((child) => {
                treeApply(child, visit);
            });
        }
    }
}
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
    let textDocument = vscode_json_languageservice_1.TextDocument.create(manifestFilePath, 'json', 1, messages.toString());
    let jsonDocument = getJsonServer().parseJSONDocument(textDocument);
    let localeNodeList = getNodeFromKey(jsonDocument, 'locale');
    let defI18n = 'zh-Hans';
    if (localeNodeList.length > 0) {
        let localeNode = localeNodeList[0];
        if (!localeNode.valueNode)
            return filePath;
        defI18n = localeNode.valueNode.value;
    }
    let localeDir = path.join(prj.sourceRoot, 'locale');
    let localeJsonList = fs.readdirSync(localeDir);
    if (!localeJsonList)
        return filePath;
    if (localeJsonList.length < 1)
        return filePath;
    let localeJsonFilterList = [];
    for (const element of localeJsonList) {
        if (!element.includes('uni') && element.endsWith('.json')) {
            localeJsonFilterList.push(element);
        }
    }
    if (!localeJsonFilterList.includes(defI18n + '.json')) {
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
class JsonDefinitionProvider {
    async doDefinitionFromI18n(jsonLanguageService, workspaceFolder, textDocument, position, jsonDocument) {
        let defDataList = null;
        let locationLinkList = [];
        let schema = await jsonLanguageService.getMatchingSchemas(textDocument, jsonDocument);
        let currentToken = jsonDocument.getNodeFromOffset(textDocument.offsetAt(position));
        if (!currentToken || currentToken.type !== 'string' || !currentToken.parent || currentToken.parent.type !== 'property' || !currentToken.value.startsWith('%'))
            return defDataList;
        let specialString = [];
        for (const iterator of schema) {
            if (iterator.node === currentToken) {
                specialString = iterator.schema.enum;
                break;
            }
        }
        if (!specialString)
            return defDataList;
        let options = {
            workspaceFolder: workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri.fsPath
        };
        for (const iterator of specialString) {
            let data = (0, out_1.gotoDefinition)(iterator, currentToken.value.replace(/%/g, ''), options);
            if (!data)
                return defDataList;
            let prj = out_1.hx.createProject(options.workspaceFolder);
            if (!prj)
                return defDataList;
            let i18nFilePath = getCurrentI18nLanguageFile(prj);
            if (!i18nFilePath)
                return defDataList;
            const messages = fs.readFileSync(i18nFilePath);
            const targetTextDocument = vscode_json_languageservice_1.TextDocument.create('data' + i18nFilePath, 'json', 1, messages.toString());
            if (!data)
                return defDataList;
            if (data.length < 1)
                return defDataList;
            let start = targetTextDocument.positionAt(data[0].textSpan.start);
            let end = targetTextDocument.positionAt(data[0].textSpan.start);
            end.character = end.character + data[0].textSpan.length;
            let range = new vscode.Range(new vscode.Position(start.line, start.character), new vscode.Position(end.line, end.character));
            let originStart = textDocument.positionAt(currentToken.offset);
            let originRange = new vscode.Range(new vscode.Position(originStart.line, originStart.character + 2), new vscode.Position(originStart.line, originStart.character + currentToken.length - 2));
            let defData = {
                targetUri: vscode_uri_1.URI.file(i18nFilePath),
                targetRange: range,
                targetSelectionRange: range,
                originSelectionRange: originRange,
            };
            locationLinkList.push(defData);
        }
        if (locationLinkList.length > 0)
            return locationLinkList;
        return defDataList;
    }
    async provideDefinition(document, position, token) {
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
        let data = await this.doDefinitionFromI18n(jsonLanguageService, workspaceFolder, textDocument, position, jsonDocument);
        if (data)
            return data;
        // let result = await jsonLanguageService.doHover(textDocument, position, jsonDocument);
        // if (!result) return null;
        // let hoverResult = new vscode.LocationLink(new vscode.MarkdownString(result?.contents.toString()));
        // if (result.range) {
        //     hoverResult.range = new vscode.Range(
        //         new vscode.Position(result.range.start.line, result.range.start.character),
        //         new vscode.Position(result.range.end.line, result.range.end.character)
        //     );
        // }
        // return hoverResult;
        return undefined;
    }
}
function register() {
    const patterns = ['**/package.json', '**/database/*.schema.json', '**/pages.json', '**/manifest.json', '**/settings.json'];
    const languages = ['json', 'jsonc', 'json_tm'];
    const selector = (0, arrays_1.flatten)(languages.map((language) => patterns.map((pattern) => ({ language, pattern }))));
    return vscode.languages.registerDefinitionProvider(selector, new JsonDefinitionProvider());
}
exports.register = register;
//# sourceMappingURL=jsonDefinition.js.map