"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentWorkspaceFolder = exports.getExtraServer = void 0;
const cssExtraServer_1 = require("./cssExtraServer");
const lessExtraServer_1 = require("./lessExtraServer");
const scssExtraServer_1 = require("./scssExtraServer");
// 此文件为入口文件, server调用此文件获取对应的语法提示功能
const languageIndex = {};
languageIndex.css = new cssExtraServer_1.CssExtraServer();
languageIndex.scss = new scssExtraServer_1.ScssExtraServer();
languageIndex.less = new lessExtraServer_1.LessExtraServer();
function getExtraServer(document) {
    let cssServer;
    if (typeof document === 'string')
        cssServer = languageIndex[document];
    else
        cssServer = languageIndex[document.languageId];
    if (!cssServer)
        cssServer = languageIndex['css'];
    return cssServer;
}
exports.getExtraServer = getExtraServer;
// 获取当前使用的项目
// 因为需要在cssServer中使用, 为了导入方便, 放在这里
function getCurrentWorkspaceFolder(workspaceFolders, document) {
    // vscode有一个工作区存在多个文件夹的情况, 所以这里使用的是WorkspaceFolder[]
    // WorkspaceFolder详情参考cssServer代码
    // hx重写接口, 获取到hx的多项目路径
    let workSpaceList = [];
    // 通过文件路径获取对应的项目路径
    for (const workspaceFolder of workspaceFolders) {
        if (document.uri.startsWith(workspaceFolder.uri)) {
            workSpaceList.push(workspaceFolder);
        }
    }
    // 可能匹配到多个路径, 此处对路径进行排序, 短路径放前面
    // 策略: 此处策略和vscode相同, 当存在父子关系的文件夹时, 使用更短的那个(子文件夹)
    workSpaceList.sort((a, b) => {
        return a.uri.length - b.uri.length;
    });
    return workSpaceList;
}
exports.getCurrentWorkspaceFolder = getCurrentWorkspaceFolder;
//# sourceMappingURL=entry.js.map