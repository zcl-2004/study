"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseExtraServer = void 0;
const baseCompletionProcessor_1 = require("./completion/baseCompletionProcessor");
const baseDefinitionProcessor_1 = require("./definition/baseDefinitionProcessor");
const formatProcessor_1 = require("./format/formatProcessor");
const baseSymbolProcessor_1 = require("./symbol/baseSymbolProcessor");
// 实现基类, 将需要的函数全部在此处实现, 供其他类继承使用
class BaseExtraServer {
    constructor() {
        // 实现接口:
        // 所有的扩展功能全部写在此处, 再由子类去各自实现
        // 整个语言服务的功能, 包括代码提示, 转到定义等等, 全部都写在这里
        // 具体的实现, 交由专门负责那个功能的类去实现
        // 获取实现功能的各个子类:
        // 代码提示
        this.completionProcessor = new baseCompletionProcessor_1.BaseCompletionProcessor();
        // 转到定义
        this.definitionProcessor = new baseDefinitionProcessor_1.BaseDefinitionProcessor();
        // 大纲
        this.symbolProcessor = new baseSymbolProcessor_1.BaseSymbolProcessor();
        // 实现一整套某个功能的总函数
        this.doExtraCompletion = this.completionProcessor.doExtraCompletion.bind(this.completionProcessor);
        this.doDefinition = this.definitionProcessor.getDefinitionDataFromID.bind(this.definitionProcessor);
        this.doFormatting = formatProcessor_1.getFormattingData;
        this.doDocumentSymbol = this.symbolProcessor.getHxKindConvertedSymbolsData.bind(this.symbolProcessor);
    }
    // 供外部调用的接口
    getLanguageServiceExt() {
        return undefined;
    }
}
exports.BaseExtraServer = BaseExtraServer;
//# sourceMappingURL=baseExtraServer.js.map