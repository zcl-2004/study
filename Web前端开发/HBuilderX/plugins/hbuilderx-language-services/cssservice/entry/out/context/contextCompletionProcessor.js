"use strict";
// 在第一个成型的css内容(xxx{}, 主要是})之前的错误, 全部都不算是错误
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPointerEventsMissingValues = exports.getDeprecatedPseudoList = exports.getCompletionDataFromScanner = exports.getCompletionTypeFromScanner = exports.isValueInNode = exports.getTokenList = void 0;
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const vscode_languageserver_1 = require("vscode-languageserver");
const utils_1 = require("../../../../utils");
const extraProcessor_1 = require("../grammar/extraProcessor");
const util_1 = require("../utils/util");
const { Scanner } = require('vscode-css-languageservice/lib/umd/parser/cssScanner');
const { LESSScanner } = require('vscode-css-languageservice/lib/umd/parser/lessScanner');
const { SCSSScanner } = require('vscode-css-languageservice/lib/umd/parser/scssScanner');
const { ParseErrorCollector } = require('vscode-css-languageservice/lib/umd/parser/cssNodes');
const SnippetFormat = vscode_languageserver_1.InsertTextFormat.Snippet;
const retriggerCommand = {
    title: 'Suggest',
    command: 'editor.action.triggerSuggest',
};
function getTokenList(document) {
    let scanner = Scanner;
    if (document.languageId === 'scss')
        scanner = SCSSScanner;
    if (document.languageId === 'less')
        scanner = LESSScanner;
    scanner.prototype.setSource(document.getText());
    let tokenList = [];
    let token = undefined;
    while (1) {
        token = scanner.prototype.scan();
        tokenList.push(token);
        if (token.type === util_1.TokenType.EOF) {
            break;
        }
    }
    return tokenList;
}
exports.getTokenList = getTokenList;
// 根据offset, 获取当前offset位置文本的前后上下文
// 例: 当前位置 xxx: y|yy; 获取到的就是 和;
// 光标在最后的时候, 没有上下文
function getContextTokenCollection(tokenList, offset) {
    let contextTokenCollection;
    for (let i = 0; i < tokenList.length - 2; i++) {
        // 下面使用了[i+1]
        if (tokenList[i].offset <= offset && tokenList[i + 1].offset > offset) {
            contextTokenCollection = {
                peekToken: tokenList[i],
                nextToken: tokenList[i + 1],
                peekIndex: i,
                nextIndex: i + 1,
            };
            break;
        }
    }
    return contextTokenCollection;
}
function getCompletionType(nodeType, context) {
    return {
        type: nodeType,
        parentType: nodeType,
        nodeType: nodeType,
        parentNodeType: nodeType,
        isNode: false,
        context: context,
    };
}
/**
 * 根据当前offset, 简单的判断补全类型
 */
function getSimpleCompletionType(tokenList, offset) {
    for (let index = tokenList.length - 1; index >= 0; index--) {
        if (tokenList[index].offset >= offset)
            continue;
        const element = tokenList[index];
        if (element.type === util_1.TokenType.CurlyR)
            return getCompletionType(util_1.NodeType.Selector);
        if (element.type === util_1.TokenType.BracketL) {
            let tagName = undefined;
            if (tokenList[index - 1].type === util_1.TokenType.Whitespace) {
                tagName = tokenList[Math.max(index - 2, 0)].text;
            }
            else {
                tagName = tokenList[index - 1].text;
            }
            return getCompletionType(util_1.NodeType.AttributeSelector, tagName);
        }
        if (element.type === util_1.TokenType.CurlyL)
            return getCompletionType(util_1.NodeType.Property);
        if (element.type === util_1.TokenType.SemiColon)
            return getCompletionType(util_1.NodeType.Property);
        if (element.type === util_1.TokenType.Colon) {
            let propertyName = undefined;
            if (tokenList[index - 1].type === util_1.TokenType.Whitespace) {
                propertyName = tokenList[Math.max(index - 2, 0)].text;
            }
            else {
                propertyName = tokenList[index - 1].text;
            }
            return getCompletionType(util_1.NodeType.Value, propertyName);
        }
    }
    return undefined;
}
/**
 * 判断当前offset是不是在括号内
 * 判断前方的两个括号, 如果是[]或{}则不在括号内, 如果是][或}{则在括号内
 * @param contextToken 当前offset的上下文token
 * @param tokenList 全部的token
 * @param left 左边括号, 可选{[
 * @param right 右边括号, 可选]}
 * @returns
 */
function inParentheses(contextToken, tokenList, left, right) {
    let contextTokenCollection = {
        peekToken: undefined,
        nextToken: undefined,
        peekIndex: 0,
        nextIndex: 0,
    };
    let peekIndex = contextToken.peekIndex - 1;
    // 往左边找第一个右括号和左括号
    for (; peekIndex > 0; peekIndex--) {
        const element = tokenList[peekIndex];
        // 两个括号都找到的时候, 返回数据
        if (contextTokenCollection.peekToken && contextTokenCollection.nextToken)
            break;
        if (element.type === left && !contextTokenCollection.peekToken) {
            contextTokenCollection.peekToken = element;
            contextTokenCollection.peekIndex = peekIndex;
        }
        if (element.type === right && !contextTokenCollection.nextToken) {
            contextTokenCollection.nextToken = element;
            contextTokenCollection.nextIndex = peekIndex;
        }
    }
    // 没找到左括号, 说明是选择器
    if (!contextTokenCollection.peekToken)
        return undefined;
    // 左边右边都找到, 判断}{情况, 认为在括号中
    if (contextTokenCollection.nextToken && contextTokenCollection.nextToken.offset > contextTokenCollection.peekToken.offset)
        return undefined;
    return contextTokenCollection;
}
// 根据token判断当前是不是选择器
function isSelector(document, contextToken, tokenList) {
    const isInParentheses = inParentheses(contextToken, tokenList, util_1.TokenType.CurlyL, util_1.TokenType.CurlyR);
    if (isInParentheses) {
        const lineText = (0, util_1.getLineTextFromOffset)(document, isInParentheses.peekToken.offset);
        if (!lineText.includes('@media'))
            return undefined;
    }
    return getCompletionType(util_1.NodeType.Selector);
}
// 根据token判断当前是不是属性选择器
function isAttributeSelector(contextToken, tokenList) {
    const isInParentheses = inParentheses(contextToken, tokenList, util_1.TokenType.BracketL, util_1.TokenType.BracketR);
    if (isInParentheses) {
        let peekIndex = isInParentheses.peekIndex - 1;
        let tagName = undefined;
        if (tokenList[peekIndex].type === util_1.TokenType.Whitespace && peekIndex > 0)
            peekIndex--;
        tagName = tokenList[peekIndex].text;
        return getCompletionType(util_1.NodeType.AttributeSelector, tagName);
    }
    return undefined;
}
// 根据token判断当前是不是属性
function isAttribute(contextToken, tokenList, offset) {
    const isInParentheses = inParentheses(contextToken, tokenList, util_1.TokenType.CurlyL, util_1.TokenType.CurlyR);
    if (isInParentheses) {
        // 在括号中, 获取前方的第一个
        let peekIndex = contextToken.peekIndex;
        if (tokenList[peekIndex].type === util_1.TokenType.SemiColon)
            return undefined;
        if (contextToken.peekToken.type === util_1.TokenType.Whitespace)
            peekIndex--;
        if (tokenList[peekIndex].type === util_1.TokenType.CurlyL || tokenList[peekIndex].type === util_1.TokenType.SemiColon) {
        }
        else {
            peekIndex--;
        }
        if (tokenList[peekIndex].type === util_1.TokenType.Whitespace)
            peekIndex--;
        if (tokenList[peekIndex].type === util_1.TokenType.CurlyL || tokenList[peekIndex].type === util_1.TokenType.SemiColon) {
            return getCompletionType(util_1.NodeType.Property);
        }
    }
    return undefined;
}
// 根据token判断当前是不是值
function isValue(contextToken, tokenList) {
    const isInParentheses = inParentheses(contextToken, tokenList, util_1.TokenType.CurlyL, util_1.TokenType.CurlyR);
    if (isInParentheses) {
        let peekIndex = contextToken.peekIndex;
        if (tokenList[peekIndex].type === util_1.TokenType.SemiColon)
            peekIndex--;
        if (contextToken.peekToken.type === util_1.TokenType.Whitespace)
            peekIndex--;
        if (tokenList[peekIndex].type === util_1.TokenType.Colon) {
        }
        else {
            peekIndex--;
        }
        if (tokenList[peekIndex].type === util_1.TokenType.Whitespace || tokenList[peekIndex].type === util_1.TokenType.Ident)
            peekIndex--;
        if (tokenList[peekIndex].type === util_1.TokenType.Colon) {
            let propertyName = undefined;
            peekIndex--;
            if (tokenList[peekIndex].type === util_1.TokenType.Whitespace)
                peekIndex--;
            propertyName = tokenList[peekIndex].text;
            if (propertyName === '&')
                return undefined;
            return getCompletionType(util_1.NodeType.Value, propertyName);
        }
    }
    return undefined;
}
// 判断当前是不是@media
function isMedia(lineText) {
    if (lineText.includes('@media')) {
        return getCompletionType(util_1.NodeType.Media);
    }
    return undefined;
}
// 判断当前是不是@import
function isImport(lineText) {
    if (lineText.includes('@import')) {
        return getCompletionType(util_1.NodeType.Import);
    }
    return undefined;
}
// 判断当前是不是@charset
function isCharset(lineText) {
    if (lineText.includes('@charset')) {
        return { isNode: false, context: 'charset' };
    }
    return undefined;
}
// 判断当前是不是伪类伪元素选择器
function isPseudoSelector(document, contextToken, tokenList) {
    const isInParentheses = inParentheses(contextToken, tokenList, util_1.TokenType.CurlyL, util_1.TokenType.CurlyR);
    // 由于scss等语言可以嵌套使用, 此处设置标记位, 对此类语言特殊处理
    let isExtCss = false;
    if (isInParentheses) {
        const lineText = (0, util_1.getLineTextFromOffset)(document, isInParentheses.peekToken.offset);
        if (!lineText.includes('@media') && document.languageId === 'css')
            return undefined;
        isExtCss = true;
    }
    let propertyName = undefined;
    let peekIndex = contextToken.peekIndex - 1;
    if (tokenList[peekIndex].type === util_1.TokenType.Ident)
        peekIndex--;
    if (tokenList[peekIndex].type !== util_1.TokenType.Colon)
        return undefined;
    peekIndex--;
    if (tokenList[peekIndex].type !== util_1.TokenType.Delim && isExtCss)
        return undefined;
    propertyName = ':';
    if (peekIndex >= 0 && tokenList[peekIndex].type === util_1.TokenType.Colon)
        propertyName = '::';
    return getCompletionType(util_1.NodeType.PseudoSelector, propertyName);
}
// 判断当前是不是在url函数中
function isURILiteral(leftLineText, rightLineText) {
    let haveUrlL = leftLineText.includes('url(');
    let haveUrlR = rightLineText.includes(')');
    if (haveUrlL && haveUrlR) {
        return getCompletionType(util_1.NodeType.URILiteral);
    }
    return undefined;
}
// 适配scss的变量关键字, 判断是不是在value的变量后的!中
function isExclamatory(lineText, contextToken, tokenList) {
    const isInParentheses = inParentheses(contextToken, tokenList, util_1.TokenType.CurlyL, util_1.TokenType.CurlyR);
    if (isInParentheses) {
        let peekIndex = contextToken.peekIndex;
        if (tokenList[peekIndex].type === util_1.TokenType.SemiColon)
            peekIndex--;
        if (tokenList[peekIndex].type !== util_1.TokenType.Exclamation)
            peekIndex--;
        if (tokenList[peekIndex].type === util_1.TokenType.Exclamation) {
            return getCompletionType(util_1.NodeType.Declaration);
        }
    }
    return undefined;
}
// 根据token获取补全类型
function getCompletionTypeFromScanner(document, position) {
    // 此处需要判断的类型大致为: 选择器(包含伪类, 伪元素), 属性选择器, 属性, 值
    const tokenList = getTokenList(document);
    if (tokenList.length < 1)
        return undefined;
    // 获取当前输入词
    const offset = document.offsetAt(position);
    // 获取当前行文字
    const lineText = (0, util_1.getLineTextFromPosition)(document, position);
    const lineTextL = (0, util_1.getOffsetLeftLineText)(document, offset);
    const lineTextR = (0, util_1.getOffsetRightLineText)(document, offset);
    // 获取上下文
    const contextTokenCollection = getContextTokenCollection(tokenList, offset);
    if (!contextTokenCollection) {
        // 光标在最后的时候, 使用简易的获取type方法
        let type = getSimpleCompletionType(tokenList, offset);
        if (!type) {
            // 简易type获取失败的时候, 使用以下只需要文本判断的逻辑
            // 不过这里大概率用不到
            const typeIsMedia = isMedia(lineText);
            const typeIsImport = isImport(lineText);
            const typeIsCharset = isCharset(lineText);
            const typeIsURILiteral = isURILiteral(lineTextL, lineTextR);
            if (typeIsURILiteral)
                return typeIsURILiteral;
            if (typeIsMedia)
                return typeIsMedia;
            if (typeIsImport)
                return typeIsImport;
            if (typeIsCharset)
                return typeIsCharset;
        }
        return type;
    }
    const typeIsSelector = isSelector(document, contextTokenCollection, tokenList);
    const typeIsAttributeSelector = isAttributeSelector(contextTokenCollection, tokenList);
    const typeIsAttribute = isAttribute(contextTokenCollection, tokenList, offset);
    const typeIsValue = isValue(contextTokenCollection, tokenList);
    const typeIsMedia = isMedia(lineText);
    const typeIsImport = isImport(lineText);
    const typeIsCharset = isCharset(lineText);
    const typeIsPseudoSelector = isPseudoSelector(document, contextTokenCollection, tokenList);
    const typeIsURILiteral = isURILiteral(lineTextL, lineTextR);
    const typeIsExclamatory = isExclamatory(lineText, contextTokenCollection, tokenList);
    if (typeIsURILiteral)
        return typeIsURILiteral;
    if (typeIsMedia)
        return typeIsMedia;
    if (typeIsImport)
        return typeIsImport;
    if (typeIsCharset)
        return typeIsCharset;
    if (typeIsAttributeSelector)
        return typeIsAttributeSelector;
    if (typeIsPseudoSelector)
        return typeIsPseudoSelector;
    if (typeIsSelector)
        return typeIsSelector;
    if (typeIsAttribute)
        return typeIsAttribute;
    if (typeIsValue)
        return typeIsValue;
    if (typeIsExclamatory)
        return typeIsExclamatory;
    return undefined;
}
exports.getCompletionTypeFromScanner = getCompletionTypeFromScanner;
function getSelectorData(data, range) {
    let completionItemList = [];
    completionItemList = getPseudoSelectorData(data, range);
    const directives = data.provideAtDirectives();
    for (const item of directives) {
        completionItemList.push({
            label: item.name,
            documentation: item.description,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, item.name),
            kind: vscode_languageserver_1.CompletionItemKind.Keyword,
        });
    }
    for (const item of util_1.html5Tags) {
        completionItemList.push({
            label: item,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, item),
            kind: vscode_languageserver_1.CompletionItemKind.Keyword,
        });
    }
    for (const item of util_1.svgElements) {
        completionItemList.push({
            label: item,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, item),
            kind: vscode_languageserver_1.CompletionItemKind.Keyword,
        });
    }
    return completionItemList;
}
function getPropertyData(data, range, document, position) {
    //TODO 需要根据当前位置判断返回的数值, 此处需要较为详细的判断逻辑, 后续修改
    let completionItemList = [];
    const Property = data.provideProperties();
    const endOffset = range.end.character;
    for (const item of Property) {
        let command = retriggerCommand;
        const relevance = typeof item.relevance === 'number' ? Math.min(Math.max(item.relevance, 0), 99) : 50;
        const sortTextSuffix = (255 - relevance).toString(16);
        const sortTextPrefix = (0, util_1.startsWith)(item.name, '-') ? util_1.SortTexts.VendorPrefixed : util_1.SortTexts.Normal;
        let insertText = item.name + ': $0;';
        // vscode中, 有很复杂的逻辑去判断位置, 详情参考:
        // [](vscode-css-languageservice\src\services\cssCompletion.ts)
        const offset = document.offsetAt(position);
        const lineText = (0, util_1.getLineTextFromOffset)(document, offset);
        const rightText = (0, util_1.getOffsetRightLineText)(document, offset);
        const leftText = (0, util_1.getOffsetLeftLineText)(document, offset);
        const currentData = (0, util_1.getContextData)(document, offset);
        const currentWord = currentData.leftText;
        // 获取当前行, 左边右边文字的第一个\第二个;和:的位置
        const leftFirstSemicolon = leftText.lastIndexOf(';');
        const leftFirstColon = leftText.lastIndexOf(':');
        const rightFirstSemicolon = rightText.indexOf(';');
        const rightFirstColon = rightText.indexOf(':');
        let start = vscode_languageserver_1.Position.create(position.line, position.character);
        let end = vscode_languageserver_1.Position.create(position.line, position.character);
        let isReplace = false;
        if (leftFirstSemicolon === -1 && rightText.trim().length === 0) {
            // 当前位置, 在普通Property位置, 啥也不干, 直接返回
            start.character = currentData.contextRange.start.character;
            end.character = currentData.contextRange.end.character;
            isReplace = true;
        }
        else {
            // 当前位置, 在同一行的某个Property后
            // 获取;后面的数据, 判断位置
            if (rightText.trim().length === 0 && currentWord.endsWith(';')) {
                // 后面为空
                isReplace = true;
            }
            else if (rightText.trim().length === 0 && !currentWord.includes(';')) {
                start.character = currentData.contextRange.start.character;
                isReplace = true;
            }
            else if (rightText.trim().length === 0 && currentWord.includes(';')) {
                start.character = leftFirstSemicolon + 1;
                end.character = leftFirstSemicolon + currentWord.substring(currentWord.indexOf(';')).length;
                isReplace = true;
            }
            else if (rightFirstColon !== -1 && rightFirstSemicolon !== -1 && rightFirstColon < rightFirstSemicolon) {
                if (rightText.trim().endsWith(':;') || rightText.trim().endsWith(': ;')) {
                    // 后面为:;或: ;(:和;之间没有内容)
                    isReplace = true;
                    start.character = leftFirstSemicolon + 1;
                    end.character = end.character + rightFirstSemicolon + 1;
                }
                else {
                    // :和;之间有内容
                    if (!currentWord.includes(';')) {
                        start.character = start.character - currentWord.length;
                        end.character = end.character + rightText.indexOf(':');
                    }
                    else {
                        start.character = leftFirstSemicolon + 1;
                        end.character = end.character + rightText.indexOf(':');
                    }
                }
            }
            else if (rightFirstColon !== -1) {
                // 后面为单独的:
                isReplace = true;
                if (currentWord.includes(';')) {
                    start.character = leftFirstSemicolon + 1;
                }
                start.character = start.character - currentWord.length;
                end.character = end.character + rightText.indexOf(':') + 1;
            }
            else {
                start.character = currentData.contextRange.start.character;
                end.character = currentData.contextRange.end.character;
                isReplace = true;
            }
        }
        let range = vscode_languageserver_1.Range.create(start, end);
        if (!isReplace) {
            insertText = item.name;
            command = undefined;
        }
        completionItemList.push({
            label: item.name,
            documentation: item.description,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, `${insertText}`),
            sortText: sortTextPrefix + '_' + sortTextSuffix,
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            command,
            insertTextFormat: vscode_languageserver_1.InsertTextFormat.Snippet,
        });
    }
    return completionItemList;
}
// 获取各种类型的值
function getColorProposals(completionItemList, range) {
    for (const color in util_1.colors) {
        completionItemList.push({
            label: color,
            documentation: util_1.colors[color],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, color),
            kind: vscode_languageserver_1.CompletionItemKind.Color,
        });
    }
    for (const color in util_1.colorKeywords) {
        completionItemList.push({
            label: color,
            documentation: util_1.colorKeywords[color],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, color),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    for (const p of util_1.colorFunctions) {
        let tabStop = 1;
        const replaceFunction = (_match, p1) => '${' + tabStop++ + ':' + p1 + '}';
        const insertText = p.func.replace(/\[?\$(\w+)\]?/g, replaceFunction);
        completionItemList.push({
            label: p.func.substring(0, p.func.indexOf('(')),
            detail: p.func,
            documentation: p.desc,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, insertText),
            insertTextFormat: SnippetFormat,
            kind: vscode_languageserver_1.CompletionItemKind.Function,
        });
    }
    return completionItemList;
}
function getPositionProposals(completionItemList, range) {
    for (const position in util_1.positionKeywords) {
        completionItemList.push({
            label: position,
            documentation: util_1.positionKeywords[position],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, position),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    return completionItemList;
}
function getRepeatStyleProposals(completionItemList, range) {
    for (const repeat in util_1.repeatStyleKeywords) {
        completionItemList.push({
            label: repeat,
            documentation: util_1.repeatStyleKeywords[repeat],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, repeat),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    return completionItemList;
}
function getLineStyleProposals(completionItemList, range) {
    for (const lineStyle in util_1.lineStyleKeywords) {
        completionItemList.push({
            label: lineStyle,
            documentation: util_1.lineStyleKeywords[lineStyle],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, lineStyle),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    return completionItemList;
}
function getLineWidthProposals(completionItemList, range) {
    for (const lineWidth of util_1.lineWidthKeywords) {
        completionItemList.push({
            label: lineWidth,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, lineWidth),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    return completionItemList;
}
function getGeometryBoxProposals(completionItemList, range) {
    for (const box in util_1.geometryBoxKeywords) {
        completionItemList.push({
            label: box,
            documentation: util_1.geometryBoxKeywords[box],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, box),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    return completionItemList;
}
function getBoxProposals(completionItemList, range) {
    for (const box in util_1.boxKeywords) {
        completionItemList.push({
            label: box,
            documentation: util_1.boxKeywords[box],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, box),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    return completionItemList;
}
function moveCursorInsideParenthesis(text) {
    return text.replace(/\(\)$/, '($1)');
}
function getImageProposals(completionItemList, range) {
    for (const image in util_1.imageFunctions) {
        const insertText = moveCursorInsideParenthesis(image);
        completionItemList.push({
            label: image,
            documentation: util_1.imageFunctions[image],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, insertText),
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            insertTextFormat: image !== insertText ? SnippetFormat : void 0,
        });
    }
    return completionItemList;
}
function getBasicShapeProposals(completionItemList, range) {
    for (const shape in util_1.basicShapeFunctions) {
        const insertText = moveCursorInsideParenthesis(shape);
        completionItemList.push({
            label: shape,
            documentation: util_1.basicShapeFunctions[shape],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, insertText),
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            insertTextFormat: shape !== insertText ? SnippetFormat : void 0,
        });
    }
    return completionItemList;
}
function getTimingFunctionProposals(completionItemList, range) {
    for (const timing in util_1.transitionTimingFunctions) {
        const insertText = moveCursorInsideParenthesis(timing);
        completionItemList.push({
            label: timing,
            documentation: util_1.transitionTimingFunctions[timing],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, insertText),
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            insertTextFormat: timing !== insertText ? SnippetFormat : void 0,
        });
    }
    return completionItemList;
}
function getCSSWideKeywordProposals(completionItemList, range) {
    for (const keywords in util_1.cssWideKeywords) {
        completionItemList.push({
            label: keywords,
            documentation: util_1.cssWideKeywords[keywords],
            textEdit: vscode_languageserver_1.TextEdit.replace(range, keywords),
            kind: vscode_languageserver_1.CompletionItemKind.Value,
        });
    }
    return completionItemList;
}
function getValueData(data, range, completionType) {
    // 先通过ICSSDataProvider获取对应的value, 再通过syntax获取对应的详细数据项
    let completionItemList = [];
    if (completionType.context) {
        const item = data.provideProperties().find((item) => item.name === completionType.context);
        const propertyValue = item === null || item === void 0 ? void 0 : item.values;
        const restrictions = item === null || item === void 0 ? void 0 : item.restrictions;
        if (propertyValue) {
            propertyValue.map((property) => {
                completionItemList.push({
                    label: property.name,
                    documentation: property.description,
                    textEdit: vscode_languageserver_1.TextEdit.replace(range, property.name),
                    kind: vscode_languageserver_1.CompletionItemKind.Value,
                });
            });
        }
        if (restrictions) {
            for (const restriction of restrictions) {
                switch (restriction) {
                    case 'color':
                        completionItemList = getColorProposals(completionItemList, range);
                        break;
                    case 'position':
                        completionItemList = getPositionProposals(completionItemList, range);
                        break;
                    case 'repeat':
                        completionItemList = getRepeatStyleProposals(completionItemList, range);
                        break;
                    case 'line-style':
                        completionItemList = getLineStyleProposals(completionItemList, range);
                        break;
                    case 'line-width':
                        completionItemList = getLineWidthProposals(completionItemList, range);
                        break;
                    case 'geometry-box':
                        completionItemList = getGeometryBoxProposals(completionItemList, range);
                        break;
                    case 'box':
                        completionItemList = getBoxProposals(completionItemList, range);
                        break;
                    case 'image':
                        completionItemList = getImageProposals(completionItemList, range);
                        break;
                    case 'timing-function':
                        completionItemList = getTimingFunctionProposals(completionItemList, range);
                        break;
                    case 'shape':
                        completionItemList = getBasicShapeProposals(completionItemList, range);
                        break;
                }
            }
        }
    }
    completionItemList = getCSSWideKeywordProposals(completionItemList, range);
    return completionItemList;
}
function getPseudoSelectorData(data, range) {
    let completionItemList = [];
    const pseudoClasses = data.providePseudoClasses();
    const pseudoElements = data.providePseudoElements();
    for (const item of pseudoClasses) {
        completionItemList.push({
            label: item.name,
            documentation: item.description,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, item.name),
            kind: vscode_languageserver_1.CompletionItemKind.Function,
        });
    }
    for (const item of pseudoElements) {
        completionItemList.push({
            label: item.name,
            documentation: item.description,
            textEdit: vscode_languageserver_1.TextEdit.replace(range, item.name),
            kind: vscode_languageserver_1.CompletionItemKind.Function,
        });
    }
    return completionItemList;
}
async function getCompletionDataFromScanner(document, position, completionType) {
    var _a;
    let completionItemList = [];
    let isIncomplete = false;
    if (completionType) {
        const offset = document.offsetAt(position);
        const data = (0, vscode_css_languageservice_1.getDefaultCSSDataProvider)();
        let lineText = (0, util_1.getLineTextFromOffset)(document, offset);
        //获取range
        let contextData = (0, util_1.getContextData)(document, offset, ';');
        let range = vscode_languageserver_1.Range.create(contextData.contextRange.start, contextData.contextRange.end);
        // 根据提示类型, 获取对应的补全项
        if (completionType.nodeType === util_1.NodeType.Selector) {
            completionItemList = getSelectorData(data, range);
        }
        else if (completionType.nodeType === util_1.NodeType.AttributeSelector) {
        }
        else if (completionType.nodeType === util_1.NodeType.Property) {
            completionItemList = getPropertyData(data, range, document, position);
        }
        else if (completionType.nodeType === util_1.NodeType.Value) {
            completionItemList = getValueData(data, range, completionType);
        }
        else if (completionType.nodeType === util_1.NodeType.PseudoSelector) {
            if (completionType.context) {
                range.start.character = range.start.character - ((_a = completionType.context) === null || _a === void 0 ? void 0 : _a.length);
                completionItemList = getPseudoSelectorData(data, range);
            }
        }
    }
    return { isIncomplete, items: completionItemList };
}
exports.getCompletionDataFromScanner = getCompletionDataFromScanner;
function isValueInNode(document, position) {
    const tokenList = getTokenList(document);
    if (tokenList.length < 1)
        return undefined;
    const offset = document.offsetAt(position);
    const contextTokenCollection = getContextTokenCollection(tokenList, offset);
    let typeIsValue;
    if (!contextTokenCollection) {
        typeIsValue = getSimpleCompletionType(tokenList, offset);
    }
    else {
        typeIsValue = isValue(contextTokenCollection, tokenList);
    }
    if ((typeIsValue === null || typeIsValue === void 0 ? void 0 : typeIsValue.nodeType) !== util_1.NodeType.Value)
        return undefined;
    return typeIsValue;
}
exports.isValueInNode = isValueInNode;
// 获取已弃用的伪元素列表
function getDeprecatedPseudoList(document, position, completionType, completionList) {
    completionType = getCompletionTypeFromScanner(document, position);
    const isRightType = (0, util_1.isRightCompletionType)(completionType, [util_1.NodeType.PseudoSelector], [util_1.NodeType.PseudoSelector], util_1.NodeType.PseudoSelector);
    if (!isRightType)
        return completionList;
    const tokenList = getTokenList(document);
    if (tokenList.length < 1)
        return completionList;
    const offset = document.offsetAt(position);
    const contextTokenCollection = getContextTokenCollection(tokenList, offset);
    const currentWord = (0, util_1.getCurrentWord)(document, document.offsetAt(position));
    let typeIsValue;
    if (!contextTokenCollection) {
        typeIsValue = getSimpleCompletionType(tokenList, offset);
    }
    else {
        typeIsValue = isPseudoSelector(document, contextTokenCollection, tokenList);
    }
    if ((typeIsValue === null || typeIsValue === void 0 ? void 0 : typeIsValue.nodeType) !== util_1.NodeType.PseudoSelector)
        return completionList;
    const lineOffset = position.character;
    const wordRight = completionType && completionType.context && completionType.context.length > 0 ? completionType.context.length : 0;
    let start = vscode_languageserver_1.Position.create(position.line, lineOffset - currentWord.length - wordRight);
    if (contextTokenCollection && currentWord !== '') {
        if (contextTokenCollection.peekToken.text.includes(currentWord)) {
            position = document.positionAt(contextTokenCollection.peekToken.offset + contextTokenCollection.peekToken.text.length);
        }
    }
    for (const list of extraProcessor_1.deprecatedPseudoElementList) {
        completionList.items.push({
            label: list.name,
            documentation: list.description,
            tags: [vscode_languageserver_1.CompletionItemTag.Deprecated],
            textEdit: vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(start, position), list.name),
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            data: {
                hxKind: utils_1.HxIconKind.CLASS,
            },
        });
    }
    return completionList;
}
exports.getDeprecatedPseudoList = getDeprecatedPseudoList;
// 获取PointerEvents缺失的补全项
function getPointerEventsMissingValues(document, position, completionType, completionList) {
    completionType = getCompletionTypeFromScanner(document, position);
    if (!completionType)
        return completionList;
    const isRightType = (0, util_1.isRightCompletionType)(completionType, [util_1.NodeType.Value], [util_1.NodeType.Value], util_1.NodeType.Value);
    if (!isRightType)
        return completionList;
    if (completionType.context !== 'pointer-events')
        return completionList;
    completionList.items.push({
        label: extraProcessor_1.pointerEventsMissingValue.name,
        documentation: extraProcessor_1.pointerEventsMissingValue.description,
        // 后续会有重新设置range的逻辑, 此处随便写
        textEdit: vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(position, position), extraProcessor_1.pointerEventsMissingValue.name),
        kind: vscode_languageserver_1.CompletionItemKind.Property,
    });
    return completionList;
}
exports.getPointerEventsMissingValues = getPointerEventsMissingValues;
//# sourceMappingURL=contextCompletionProcessor.js.map