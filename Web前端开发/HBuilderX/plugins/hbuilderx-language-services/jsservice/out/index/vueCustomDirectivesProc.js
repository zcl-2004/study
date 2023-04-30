"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVueDirectivesProc = void 0;
const indexlib_1 = require("./../../../indexlib");
const ts = require("typescript");
const utils_1 = require("./utils");
function getVueDirectivesProc(ws) {
    let vueRouterName = new Set();
    function getDirectivesProperties(expression) {
        var _a, _b;
        let properties = (_a = utils_1.tsConvert.asTsObjectLiteralExpression(expression)) === null || _a === void 0 ? void 0 : _a.properties;
        if (properties) {
            for (let i = 0; i < properties.length; i++) {
                let prop = utils_1.tsConvert.asTsPropertyAssignment(properties[i]);
                if (!prop) {
                    continue;
                }
                let hasDirectives = /^['"]?directives['"]?$/.test(prop.name.getText());
                if (hasDirectives) {
                    return (_b = utils_1.tsConvert.asTsObjectLiteralExpression(prop.initializer)) === null || _b === void 0 ? void 0 : _b.properties;
                }
            }
        }
        return undefined;
    }
    function checkDirectiveBindProp(value) {
        let propVal = utils_1.tsConvert.asTsObjectLiteralExpression(value);
        if (propVal) {
            return propVal.properties.some((node) => {
                var _a;
                // 判断是否
                if (node.kind == ts.SyntaxKind.MethodDeclaration) {
                    return ((_a = utils_1.tsConvert.asTsIdentifier(node.name)) === null || _a === void 0 ? void 0 : _a.text) == 'bind';
                }
                else if (node.kind == ts.SyntaxKind.PropertyAssignment) {
                    if (node.initializer.kind == ts.SyntaxKind.FunctionExpression) {
                        return node.name.text == 'bind';
                    }
                }
                return false;
            });
        }
        return false;
    }
    return {
        support(documemt, _option) {
            var _a, _b;
            const sourceUri = (_b = (_a = _option === null || _option === void 0 ? void 0 : _option.source) === null || _a === void 0 ? void 0 : _a.uri) !== null && _b !== void 0 ? _b : '';
            let extPos = sourceUri.lastIndexOf('.');
            if (extPos > 0) {
                let ext = sourceUri.slice(extPos + 1).toLocaleLowerCase();
                return /^n?vue$/.test(ext);
            }
            return false;
        },
        onExportAssignment(document, statement, option) {
            let properties = getDirectivesProperties(statement.expression);
            if (properties) {
                const cate = "vue-custom-directives";
                let indexData = new indexlib_1.IndexData();
                let items = [];
                indexData.categories.push(cate);
                for (let i = 0; i < properties.length; i++) {
                    let prop = utils_1.tsConvert.asTsPropertyAssignment(properties[i]);
                    if (!prop) {
                        continue;
                    }
                    if (checkDirectiveBindProp(prop.initializer)) {
                        const srcText = prop.name.getText();
                        const name = prop.name.text;
                        let i = srcText.indexOf(name);
                        let offset = prop.name.getStart() + i;
                        items.push({
                            label: name,
                            position: document.positionAt(offset)
                        });
                    }
                }
                if (items.length > 0) {
                    indexData[cate] = items;
                    return indexData;
                }
            }
            return null;
        }
    };
}
exports.getVueDirectivesProc = getVueDirectivesProc;
//# sourceMappingURL=vueCustomDirectivesProc.js.map