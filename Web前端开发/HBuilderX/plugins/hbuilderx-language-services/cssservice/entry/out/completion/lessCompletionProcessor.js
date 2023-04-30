"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessCompletionProcessor = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const entry_1 = require("../../../../htmlservice/entry");
const utils_1 = require("../../../../utils");
const util_1 = require("../utils/util");
const baseCompletionProcessor_1 = require("./baseCompletionProcessor");
const { LESSScanner } = require('vscode-css-languageservice/lib/umd/parser/lessScanner');
class LessCompletionProcessor extends baseCompletionProcessor_1.BaseCompletionProcessor {
    constructor() {
        super(...arguments);
        this.baseCompletionProcessor = new baseCompletionProcessor_1.BaseCompletionProcessor();
    }
    // 支持嵌套写法
    async getTagCompletionData(workspaceFolder, document, position, completionType, completionList) {
        const isRightType = (0, util_1.isRightCompletionType)(completionType, [util_1.NodeType.Media, util_1.NodeType.MediaQuery], undefined, util_1.NodeType.Media);
        if (!isRightType)
            return completionList;
        const offset = document.offsetAt(position);
        const currentWord = (0, util_1.getCurrentWord)(document, offset);
        // let selectWord = getCurrentWord(document, currentAstNode.parent.offset);
        // 从html获取数据, 生成补全数据
        let tagList = (0, entry_1.getHtmlTags)(workspaceFolder);
        let start = vscode_languageserver_1.Position.create(position.line, position.character - currentWord.length);
        for (const iterator of tagList) {
            completionList.items.push({
                label: iterator,
                textEdit: vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(start, position), iterator),
                kind: vscode_languageserver_1.CompletionItemKind.Keyword,
                data: {
                    hxKind: utils_1.HxIconKind.ELEMENT,
                },
            });
        }
        return completionList;
    }
    async getExtraCompletionData(workspaceFolder, document, position, completionType, connection, scopedSettingsSupport, completionList) {
        completionList = await this.getTagCompletionData(workspaceFolder, document, position, completionType, completionList);
        return completionList;
    }
    async doExtraCompletion(workspaceFolder, document, position, astNode, connection, scopedSettingsSupport, completionList) {
        // 判断是否存在语法错误, 如果存在语法错误, 则使用token分析
        const isErrorAstNode = this.isErrorAstNode(document, position, astNode);
        // 根据语法树获取当前补全类型
        let completionType = this.getCompletionTypeFromAstNode(document, position, astNode);
        if (isErrorAstNode || completionList.items.length === 0) {
            // 使用token分析, 重新获取补全类型, 重新获取补全项
            completionType = this.getCompletionTypeFromScanner(document, position);
            completionList = await this.getCompletionDataFromScanner(document, position, completionType);
        }
        // 函数调用顺序包含业务逻辑, 勿轻易更改
        // 详细功能说明请跳转函数查看
        // 先调用此函数将原插件获取的类型进行转换, 后续添加的补全项, 类型自定, 不做处理
        completionList = await this.getHxKindConvertedCompletionData(completionList);
        // 添加自身ID补全项
        completionList = await this.getSelfIdSelectorCompletionData(document, position, completionType, completionList);
        // 添加一些过时的, vscode没有的补全提示项
        completionList = await this.getDeprecatedCompletionData(document, position, completionType, completionList);
        // 添加缺失的函数补全项
        completionList = await this.getFunctionsCompletionData(document, position, completionType, completionList);
        // 添加Media补全提示项(删除原有补全项)
        completionList = await this.getMediaCompletionData(document, position, completionType, completionList);
        // 添加charset补全提示项(删除原有补全项)
        completionList = await this.getCharsetCompletionData(document, position, completionType, completionList);
        // 添加路径补全提示项(删除原有补全项)
        completionList = await this.getPathCompletionData(workspaceFolder, document, position, completionType, completionList);
        // 添加属性选择器补全提示(删除原有补全项)
        completionList = await this.getPropertySelectorCompletionData(workspaceFolder, document, position, completionType, completionList);
        // 添加特定的处理逻辑
        completionList = await this.getExtraCompletionData(workspaceFolder, document, position, completionType, connection, scopedSettingsSupport, completionList);
        // 添加从其他文件获取ID补全功能
        completionList = await this.getIndexIdSelectorsCompletionData(workspaceFolder, document, position, completionType, completionList);
        // 添加从其他文件获取CLASS补全功能
        completionList = await this.getIndexClassSelectorsCompletionData(workspaceFolder, document, position, completionType, completionList);
        // 根据项目类型和语法库, 对现有补全项, 做增加和删减
        completionList = await this.getGrammarCompletionData(workspaceFolder, document, position, completionType, completionList);
        // 添加px转换功能
        completionList = await this.getPxConversionCompletionData(workspaceFolder, document, position, completionType, connection, scopedSettingsSupport, completionList);
        // 去除重复项
        completionList = await this.getDeduplicationData(completionList);
        // 过滤非伪类伪元素提示
        completionList = await this.getFiltrationPseudoData(document, position, completionType, completionList);
        // 重新获取range
        completionList = await this.retrieveRange(document, position, completionType, completionList);
        // 判断是否是单个值的属性, 对;进行跳过处理
        completionList = await this.getMoveCursorData(document, position, completionType, completionList);
        // 处理补全提示项, 输入数字直接提示的逻辑
        completionList = await this.getAltMode(document, position, completionList);
        return completionList;
    }
}
exports.LessCompletionProcessor = LessCompletionProcessor;
//# sourceMappingURL=lessCompletionProcessor.js.map