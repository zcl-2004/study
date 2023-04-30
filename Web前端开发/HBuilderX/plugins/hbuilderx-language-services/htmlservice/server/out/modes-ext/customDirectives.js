"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomDirectives = void 0;
const indexlib_1 = require("../../../../indexlib");
function getCustomDirectives(ws, documentUri) {
    let result = [];
    indexlib_1.IndexDataStore.load(ws).allIndexData().forEach((indexdata, _key) => {
        if (_key == documentUri) {
            let items = indexdata['vue-custom-directives'];
            if (items instanceof Array) {
                items.forEach(item => {
                    result.push(item.label);
                });
            }
        }
        else {
            let items = indexdata['vue-custom-directives'];
            if (items instanceof Array) {
                items.forEach(item => {
                    var _a;
                    if ((_a = item.data) === null || _a === void 0 ? void 0 : _a.global) {
                        result.push(item.label);
                    }
                });
            }
        }
    });
    return result;
}
exports.getCustomDirectives = getCustomDirectives;
//# sourceMappingURL=customDirectives.js.map