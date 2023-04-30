"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
class DomCheckerPlugin {
    constructor(htmlDocProvider) {
        this.htmlDocProvider = htmlDocProvider;
    }
    checkExpression(prj, compilerOptions, checker, node, checkMode, forceTuple) {
        var _a;
        let currentHTMLDocument = this.htmlDocProvider ? this.htmlDocProvider("") : undefined;
        if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
            let propertyAccessExpr = node;
            if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.kind) === ts.SyntaxKind.CallExpression) {
                let type = checker.defaultCheckExpression(node, checkMode, forceTuple);
                let signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
                if (signatures) {
                    signatures.forEach(item => {
                        var _a;
                        let rType = item.getReturnType();
                        if (rType && (((_a = rType.symbol) === null || _a === void 0 ? void 0 : _a.escapedName) === 'HTMLElement')
                            || rType.getProperty("getElementsByTagName")) {
                            let domMethod = node.parent;
                            let callExprFullText = domMethod.getFullText(node.getSourceFile());
                            let idValue = "";
                            if (callExprFullText.indexOf(".getElementById") > 0) {
                                let firstArg = getFirstArgument(domMethod.arguments);
                                if (firstArg && firstArg.kind == ts.SyntaxKind.StringLiteral) {
                                    idValue = firstArg.text;
                                }
                            }
                            else if (callExprFullText.indexOf(".querySelector")) {
                                let firstArg = getFirstArgument(domMethod.arguments);
                                if (firstArg && firstArg.kind == ts.SyntaxKind.StringLiteral) {
                                    let selectorStr = firstArg.text;
                                    if (selectorStr && selectorStr.startsWith("#")) {
                                        idValue = selectorStr.substring(1);
                                    }
                                }
                            }
                            if (idValue == undefined || idValue.length == 0) {
                                return;
                            }
                            let tagName = "";
                            visitNodesHelper(currentHTMLDocument === null || currentHTMLDocument === void 0 ? void 0 : currentHTMLDocument.roots, (node) => {
                                if (node.attributes && node.attributes["id"]) {
                                    let idAttr = node.attributes["id"];
                                    if (idAttr.startsWith("\"") && idAttr.startsWith("\"")) {
                                        idAttr = idAttr.substring(1, idAttr.length - 1);
                                    }
                                    else if (idAttr.startsWith("'") && idAttr.startsWith("'")) {
                                        idAttr = idAttr.substring(1, idAttr.length - 1);
                                    }
                                    if (idAttr === idValue && node.tag) {
                                        tagName = node.tag;
                                        return false;
                                    }
                                }
                                return true;
                            });
                            if (tagName && tagName.length > 0) {
                                tagName = tagName.toLowerCase();
                                let tag2TypeName = {
                                    "a": "Link",
                                    "img": "Image",
                                    "li": "LI",
                                    "ul": "UList",
                                    "textarea": "TextArea",
                                    "p": "Paragraph",
                                    "ol": "OList",
                                    "iframe": "IFrame",
                                    "hr": "HR",
                                    "br": "BR"
                                };
                                if (tag2TypeName[tagName]) {
                                    tagName = tag2TypeName[tagName];
                                }
                                else {
                                    let firstChar = tagName[0].toUpperCase();
                                    tagName = firstChar + tagName.substring(1);
                                }
                                let symbols = checker.getSymbolsInScope(node, ts.SymbolFlags.Interface | ts.SymbolFlags.Class);
                                let domType = symbols.find((value) => {
                                    return (value.escapedName === `HTML${tagName}Element`);
                                });
                                if (domType) {
                                    item.resolvedReturnType = checker.getDeclaredTypeOfSymbol(domType);
                                }
                            }
                        }
                    });
                }
                return type;
            }
        }
        return undefined;
        function visitNodesHelper(children, visitor) {
            if (children && children.length > 0) {
                for (let i = 0; i < children.length; i++) {
                    if (visitor(children[i])) {
                        visitNodesHelper(children[i].children, visitor);
                    }
                }
            }
        }
        function getFirstArgument(args) {
            if (args && args.length > 0) {
                return args[0];
            }
            return undefined;
        }
    }
}
exports.default = DomCheckerPlugin;
//# sourceMappingURL=domtypechecker.js.map