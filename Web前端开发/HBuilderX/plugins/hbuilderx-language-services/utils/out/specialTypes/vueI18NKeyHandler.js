"use strict";
// 业务逻辑: 参考: [uni-app国际化](https://uniapp.dcloud.net.cn/tutorial/i18n.html#vue%E7%95%8C%E9%9D%A2%E5%92%8Cjs%E5%86%85%E5%AE%B9%E7%9A%84%E5%9B%BD%E9%99%85%E5%8C%96)
// 其中vue界面和文件, 使用vue-i18n国际化, uni_modules和nvue使用uni-i18n国际化
// uni-i18n国际化规范存在新版本和老版本...新老版本都要做兼容支持
// 老版本使用i18n文件夹存放翻译文件, 新版本使用locale文件夹存放翻译文件
Object.defineProperty(exports, "__esModule", { value: true });
exports.gotoDefinition = exports.doHover = exports.doComplete = void 0;
const fs = require("fs");
const path = require("path");
const tsserverlibrary_1 = require("typescript/lib/tsserverlibrary");
const vscode_json_languageservice_1 = require("vscode-json-languageservice");
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const vscode_uri_1 = require("vscode-uri");
const index_1 = require("../index");
// 创建通用函数
// 获取json处理服务
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
function getNodeFromValue(jsonDocument, targetName) {
    const doc = jsonDocument.root;
    let needNodeList = [];
    treeApply(doc, (node) => {
        if (node.type === 'property' && node.valueNode.value === targetName) {
            needNodeList.push(node);
        }
        return true;
    });
    return needNodeList;
}
// 通过manifest.json获取到当前设置的语言, 并返回翻译文件路径
function getCurrentI18nLanguageFile(prj) {
    let filePath = undefined;
    let manifestFilePath = path.join(prj.sourceRoot, 'manifest.json');
    let messages = fs.readFileSync(manifestFilePath);
    // 根据设置项, 获取当前设置的翻译语言和回退语言
    let textDocument = vscode_languageserver_textdocument_1.TextDocument.create(manifestFilePath, 'json', 1, messages.toString());
    let jsonDocument = getJsonServer().parseJSONDocument(textDocument);
    let localeNodeList = getNodeFromKey(jsonDocument, 'locale');
    // 默认设置翻译语言为中文
    let defI18n = 'zh-Hans';
    if (localeNodeList.length > 0) {
        // 此功能, hx内置了5款语言标识, 分别为:
        // en: 英文, fr: 法语, es: 西班牙语, zh-Hans: 简体中文, zh-Hant: 繁体中文
        let localeNode = localeNodeList[0];
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
    let localeJsonFilterList = localeJsonList.filter((element) => {
        if (!element.includes('uni') && element.endsWith('.json')) {
            return element;
        }
    });
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
function doComplete(position, document, options) {
    let completionItemList = [];
    if (!options.workspaceFolder)
        return completionItemList;
    let prj = index_1.hx.createProject(options.workspaceFolder);
    if (!prj)
        return completionItemList;
    if (!(prj.kind === index_1.hx.HXProjectKind.UniApp || prj.kind === index_1.hx.HXProjectKind.UniApp_Cli)) {
        return completionItemList;
    }
    let i18nFilePath = getCurrentI18nLanguageFile(prj);
    if (i18nFilePath) {
        const jsonLanguageService = getJsonServer();
        const messages = fs.readFileSync(i18nFilePath);
        const textDocument = vscode_languageserver_textdocument_1.TextDocument.create(i18nFilePath, 'json', 1, messages.toString());
        const jsonDocument = jsonLanguageService.parseJSONDocument(textDocument);
        const doc = jsonDocument.root;
        // 此处自己遍历语法树, 获取需要的node
        treeApply(doc, (node) => {
            if (node.type === 'property') {
                completionItemList.push({
                    label: node.keyNode.value,
                    detail: i18nFilePath,
                    documentation: node.valueNode.value,
                    kind: vscode_languageserver_1.CompletionItemKind.Text,
                });
            }
            return true;
        });
    }
    return completionItemList;
}
exports.doComplete = doComplete;
function doHover(text, options) {
    let quickInfo = undefined;
    if (!options.workspaceFolder)
        return quickInfo;
    let prj = index_1.hx.createProject(options.workspaceFolder);
    if (!prj)
        return quickInfo;
    if (!(prj.kind === index_1.hx.HXProjectKind.UniApp || prj.kind === index_1.hx.HXProjectKind.UniApp_Cli)) {
        return quickInfo;
    }
    let i18nFilePath = getCurrentI18nLanguageFile(prj);
    if (i18nFilePath) {
        const jsonLanguageService = getJsonServer();
        const messages = fs.readFileSync(i18nFilePath);
        const textDocument = vscode_languageserver_textdocument_1.TextDocument.create(i18nFilePath, 'json', 1, messages.toString());
        const jsonDocument = jsonLanguageService.parseJSONDocument(textDocument);
        const localeNodeList = getNodeFromKey(jsonDocument, text);
        if (!localeNodeList)
            return quickInfo;
        const localeNode = localeNodeList[0];
        if (!localeNode || !localeNode.keyNode)
            return quickInfo;
        const documentation = {
            text: localeNode.valueNode.value,
            kind: 'string',
        };
        quickInfo = {
            kind: tsserverlibrary_1.ScriptElementKind.string,
            kindModifiers: text,
            textSpan: {
                start: localeNode.keyNode.offset,
                length: localeNode.keyNode.length,
            },
            documentation: [documentation],
        };
    }
    return quickInfo;
}
exports.doHover = doHover;
function gotoDefinition(text, options) {
    // 不符合要求, 返回空数组
    let locationLinkList = [];
    if (!options.workspaceFolder)
        return locationLinkList;
    let prj = index_1.hx.createProject(options.workspaceFolder);
    if (!prj)
        return locationLinkList;
    if (!(prj.kind === index_1.hx.HXProjectKind.UniApp || prj.kind === index_1.hx.HXProjectKind.UniApp_Cli)) {
        return locationLinkList;
    }
    let i18nFilePath = getCurrentI18nLanguageFile(prj);
    if (i18nFilePath) {
        const jsonLanguageService = getJsonServer();
        const messages = fs.readFileSync(i18nFilePath);
        const textDocument = vscode_languageserver_textdocument_1.TextDocument.create(i18nFilePath, 'json', 1, messages.toString());
        const jsonDocument = jsonLanguageService.parseJSONDocument(textDocument);
        const localeNodeList = getNodeFromKey(jsonDocument, text);
        if (!localeNodeList)
            return locationLinkList;
        const localeNode = localeNodeList[0];
        if (!localeNode || !localeNode.keyNode)
            return locationLinkList;
        let definition = {
            kind: tsserverlibrary_1.ScriptElementKind.string,
            name: text,
            containerKind: undefined,
            containerName: text,
            textSpan: {
                start: localeNode.keyNode.offset,
                length: localeNode.keyNode.length,
            },
            fileName: i18nFilePath,
        };
        locationLinkList.push(definition);
    }
    return locationLinkList;
}
exports.gotoDefinition = gotoDefinition;
//# sourceMappingURL=vueI18NKeyHandler.js.map