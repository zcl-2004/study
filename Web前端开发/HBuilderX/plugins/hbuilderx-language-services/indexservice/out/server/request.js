"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorActivatedNotify = exports.RebuildProjectIndexRequest = exports.RegisterProcessorRequest = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
var RegisterProcessorRequest;
(function (RegisterProcessorRequest) {
    RegisterProcessorRequest.type = new vscode_languageserver_1.RequestType('indexservice/registerIndexProcessor');
})(RegisterProcessorRequest = exports.RegisterProcessorRequest || (exports.RegisterProcessorRequest = {}));
var RebuildProjectIndexRequest;
(function (RebuildProjectIndexRequest) {
    RebuildProjectIndexRequest.type = new vscode_languageserver_1.RequestType('indexservice/rebuildIndex');
})(RebuildProjectIndexRequest = exports.RebuildProjectIndexRequest || (exports.RebuildProjectIndexRequest = {}));
var EditorActivatedNotify;
(function (EditorActivatedNotify) {
    EditorActivatedNotify.type = new vscode_languageserver_1.NotificationType('indexservice/editorActivated');
})(EditorActivatedNotify = exports.EditorActivatedNotify || (exports.EditorActivatedNotify = {}));
//# sourceMappingURL=request.js.map