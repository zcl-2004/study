"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexProcessTask = exports.ProjectActiveReason = void 0;
const indexlib_1 = require("../../../indexlib");
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const fileFilter_1 = require("../fileFilter");
const fs = require("fs");
const path = require("path");
const vscode_uri_1 = require("vscode-uri");
const filterDirs = ['.git', '.svn', 'node_modules', 'unpackage', '.hbuilderx'];
const maxFileSize = 5 * 1024 * 1024;
const projectFiles = new Map();
var ProjectActiveReason;
(function (ProjectActiveReason) {
    ProjectActiveReason[ProjectActiveReason["ActiveFile"] = 0] = "ActiveFile";
    ProjectActiveReason[ProjectActiveReason["RebuildIndex"] = 1] = "RebuildIndex";
})(ProjectActiveReason = exports.ProjectActiveReason || (exports.ProjectActiveReason = {}));
class IndexProcessTask {
    constructor(documents, processorManager) {
        this._storeMap = new Map();
        this._traverseTask = new Map();
        this._activatedFolders = new Map();
        this._processorManager = processorManager;
        this._onFolderIndexFinished = new vscode_languageserver_protocol_1.Emitter();
        this._documents = documents;
    }
    // 设置当前激活项目
    // 文件激活引起的项目和重新构建项目索引的区分开来
    addActivatedProject(ws, reason) {
        if (reason == ProjectActiveReason.RebuildIndex) {
            if (ws) {
                this._activatedFolders.set(ws.uri, 1);
                this.startFolder(ws);
            }
        }
        else if (reason == ProjectActiveReason.ActiveFile) {
            // 移除掉所有激活的项目，仅设置当前的
            let folders = Array.from(this._activatedFolders.keys());
            for (let f of folders) {
                if (this._activatedFolders.get(f) == 2) {
                    this._activatedFolders.delete(f);
                }
            }
            if (ws === null || ws === void 0 ? void 0 : ws.uri) {
                this._activatedFolders.set(ws.uri, 2);
                this.startFolder(ws);
            }
        }
    }
    // 开启一个promise，不断从队列取文件，并调用索引处理过程
    // 如果当前项目不是激活的，则200ms后重试
    doProjectFileIndex(folder, option = { canceled: false }) {
        return new Promise((resolve) => {
            let processNext = () => {
                var _a, _b;
                let files = (_a = projectFiles.get(folder.uri)) !== null && _a !== void 0 ? _a : [];
                if (option.canceled || files.length == 0) {
                    resolve();
                    return;
                }
                if (!this._activatedFolders.has(folder.uri)) {
                    for (let f of this._activatedFolders.keys()) {
                        if (((_b = projectFiles.get(f)) !== null && _b !== void 0 ? _b : []).length > 0) {
                            setTimeout(processNext, 200);
                            return;
                        }
                    }
                    this._activatedFolders.set(folder.uri, 2);
                }
                let file = files.shift();
                this.doIndexForFile2(file, folder);
                setTimeout(processNext, 10);
            };
            processNext();
        });
    }
    // 创建一个任务
    createTask(folder) {
        const folderUri = folder.uri;
        let canceled = false; // 标志任务是否取消
        let started = false; // 标志任务是否启动，启动后状态不再改变
        projectFiles.set(folderUri, []);
        // 提前判断文件是否能支持处理。
        let checkFile = (file) => {
            if (fileFilter_1.supportNameReg.test(file)) {
                return true;
            }
            else {
                let doc = vscode_languageserver_textdocument_1.TextDocument.create(file, '', 1.0, '');
                let processors = this._processorManager.getProcessorForLanguage('');
                return processors.some((processor) => {
                    return processor.support(doc);
                });
            }
            return false;
        };
        function readDir(dir) {
            const root = dir;
            return new Promise((resolve, reject) => {
                fs.readdir(root, { withFileTypes: true }, (err, files) => {
                    var _a;
                    if (err) {
                        reject(err);
                        return;
                    }
                    const subDir = [];
                    let fileList = (_a = projectFiles.get(folderUri)) !== null && _a !== void 0 ? _a : [];
                    if (fileList.length > 1000 || canceled) {
                        resolve();
                        return;
                    }
                    files.forEach((file) => {
                        const name = file.name;
                        if (file.isFile() && checkFile(name)) {
                            const fullPath = path.join(root, name);
                            if (fs.statSync(fullPath).size < maxFileSize) {
                                fileList.push(vscode_uri_1.URI.file(fullPath).toString());
                            }
                        }
                        else if (file.isDirectory() && !filterDirs.includes(name)) {
                            subDir.push(path.join(root, name));
                        }
                    });
                    if (fileList.length > 1000 || subDir.length == 0 || canceled) {
                        resolve();
                        return;
                    }
                    Promise.all(subDir.map((p) => {
                        return readDir(p);
                    })).then(() => {
                        resolve();
                    });
                });
            });
        }
        // doIndex为任务入口
        // 先调用readDir读取文件，完成后再一个一个处理。
        let taskState = { canceled };
        let doProjectFileIndex = this.doProjectFileIndex.bind(this, folder, taskState);
        function doIndex() {
            started = true;
            let f = vscode_uri_1.URI.parse(folder.uri).fsPath;
            if (f) {
                return readDir(f).then(doProjectFileIndex);
            }
            return Promise.reject('项目路径无效');
        }
        return {
            doIndex,
            isStarted: function () {
                return started;
            },
            cancel: function () {
                canceled = true;
                taskState.canceled = true;
            },
        };
    }
    addProject(folder, autoStart = false) {
        if (!this._traverseTask.has(folder.uri)) {
            let task = this.createTask(folder);
            this._traverseTask.set(folder.uri, task);
        }
        if (autoStart) {
            this.startFolder(folder);
        }
        return this.createWatch(folder);
    }
    startFolder(folder) {
        let task = this._traverseTask.get(folder.uri);
        if (task && !task.isStarted()) {
            task.doIndex()
                .then(() => { }, (err) => {
                this._activatedFolders.delete(folder.uri);
                console.log(err);
                throw err;
            })
                .catch()
                .finally(() => {
                projectFiles.delete(folder.uri);
                this._activatedFolders.delete(folder.uri);
                this._traverseTask.delete(folder.uri);
                this._onFolderIndexFinished.fire(folder);
            });
        }
    }
    // 创建一个监听promise，方便监听任务结束
    createWatch(folder) {
        return new Promise((resolve) => {
            if (this._traverseTask.has(folder.uri)) {
                let disposable = this._onFolderIndexFinished.event((ws) => {
                    if (ws.uri == folder.uri) {
                        resolve();
                        disposable.dispose();
                    }
                });
                return;
            }
            resolve();
        });
    }
    removeIndexTask(folder, removeOld = false) {
        return new Promise((resolve) => {
            let removeStore = () => {
                if (removeOld) {
                    let store = this.getStore(folder);
                    store.removeAll();
                    store.save();
                }
            };
            let task = this._traverseTask.get(folder.uri);
            if (task) {
                let disposable = this._onFolderIndexFinished.event((ws) => {
                    if (ws.uri == folder.uri) {
                        removeStore();
                        resolve();
                        disposable.dispose();
                    }
                });
                // 先设置停止标志，再启动一次
                task.cancel();
                this.startFolder(folder);
                return;
            }
            else {
                removeStore();
                resolve();
            }
        });
    }
    removeIndexForFile(uri, root) {
        let store = this.getStore(root);
        store.removeIndex(uri);
        store.save();
    }
    doIndexForFile2(uri, root) {
        try {
            let doc = this._documents.get(uri);
            if (!doc) {
                let path = vscode_uri_1.URI.parse(uri).fsPath;
                if (fs.existsSync(path)) {
                    doc = vscode_languageserver_textdocument_1.TextDocument.create(uri, '', 1, fs.readFileSync(path, { encoding: 'utf-8' }));
                }
            }
            if (doc) {
                this.doIndexForDocument2(doc, root);
            }
        }
        catch (error) { }
    }
    doIndexForDocument2(document, root) {
        let uri = document.uri;
        let store = this.getStore(root);
        store.removeIndex(uri);
        if (fs.existsSync(vscode_uri_1.URI.parse(uri).fsPath)) {
            let language = document.languageId;
            this._processorManager.getProcessorForLanguage(language).forEach((processor) => {
                if (processor.support(document, root)) {
                    //无法取到WorkspaceFolder，暂时能想到的办法是遍历WorkspaceFolders,根据documentURi是否在某个folder下。
                    let data = processor.doIndex(document, root);
                    // 此处新增逻辑, 添加不合法id,class过滤机制
                    let cssClass = [];
                    if (data['html.class']) {
                        data['html.class'].forEach((element) => {
                            if (!element.label.includes(':'))
                                cssClass.push(element);
                        });
                    }
                    data['html.class'] = cssClass;
                    let cssId = [];
                    if (data['html.id']) {
                        data['html.id'].forEach((element) => {
                            if (!element.label.includes(':'))
                                cssId.push(element);
                        });
                    }
                    data['html.id'] = cssId;
                    store.addIndexData(uri, data);
                }
            });
        }
        store.save();
    }
    // 针对项目文件变动，该项目索引未处理完时直接补充到文件队列
    doIndexForFile(uri, root) {
        var _a;
        let files = (_a = projectFiles.get(root.uri)) !== null && _a !== void 0 ? _a : [];
        if (files.length == 0) {
            this.doIndexForFile2(uri, root);
        }
        else {
            let index = files ? files.indexOf(uri) : -1;
            if (index < 0) {
                files.push(uri);
            }
        }
    }
    // 针对编辑文件, 直接调用索引处理
    doIndexForDocument(document, root) {
        this.doIndexForDocument2(document, root);
    }
    getStore(ws) {
        const uri = ws.uri.toString();
        if (!this._storeMap.has(uri)) {
            let store = indexlib_1.IndexDataStore.loadWithWrite(ws);
            this._storeMap.set(uri, store);
        }
        return this._storeMap.get(uri);
    }
}
exports.IndexProcessTask = IndexProcessTask;
//# sourceMappingURL=indexprocesstask.js.map