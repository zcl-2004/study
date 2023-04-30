"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const vscode = require("vscode");
const cachedResponse_1 = require("./tsServer/cachedResponse");
const dispose_1 = require("./utils/dispose");
const fileSchemes = require("./utils/fileSchemes");
const validateSetting = 'validate.enable';
const suggestionSetting = 'suggestionActions.enabled';
class LanguageProvider extends dispose_1.Disposable {
    constructor(client, description, commandManager, telemetryReporter, typingsStatus, fileConfigurationManager, onCompletionAccepted) {
        super();
        this.client = client;
        this.description = description;
        this.commandManager = commandManager;
        this.telemetryReporter = telemetryReporter;
        this.typingsStatus = typingsStatus;
        this.fileConfigurationManager = fileConfigurationManager;
        this.onCompletionAccepted = onCompletionAccepted;
        vscode.workspace.onDidChangeConfiguration(this.configurationChanged, this, this._disposables);
        this.configurationChanged();
        client.onReady(() => this.registerProviders());
    }
    get documentSelector() {
        const semantic = [];
        const syntax = [];
        for (const language of this.description.modeIds) {
            syntax.push({ language });
            for (const scheme of fileSchemes.semanticSupportedSchemes) {
                semantic.push({ language, scheme });
            }
        }
        return { semantic, syntax };
    }
    async registerProviders() {
        const selector = this.documentSelector;
        const cachedResponse = new cachedResponse_1.CachedResponse();
        await Promise.all([
            Promise.resolve().then(() => require('./languageFeatures/completions')).then(provider => this._register(provider.register(selector, this.description.id, this.client, this.typingsStatus, this.fileConfigurationManager, this.commandManager, this.telemetryReporter, this.onCompletionAccepted))),
            Promise.resolve().then(() => require('./languageFeatures/definitions')).then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/directiveCommentCompletions').then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/documentHighlight').then(provider => this._register(provider.register(selector, this.client))),
            Promise.resolve().then(() => require('./languageFeatures/documentSymbol')).then(provider => this._register(provider.register(selector, this.client, cachedResponse))),
            // import('./languageFeatures/folding').then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/formatting').then(provider => this._register(provider.register(selector, this.description.id, this.client, this.fileConfigurationManager))),
            Promise.resolve().then(() => require('./languageFeatures/formatting')).then(provider => this._register(provider.register(selector, this.description.id, this.client, this.fileConfigurationManager))),
            Promise.resolve().then(() => require('./languageFeatures/hover')).then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/implementations').then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/codeLens/implementationsCodeLens').then(provider => this._register(provider.register(selector, this.description.id, this.client, cachedResponse))),
            Promise.resolve().then(() => require('./languageFeatures/jsDocCompletions')).then(provider => this._register(provider.register(selector, this.description.id, this.client))),
            // import('./languageFeatures/organizeImports').then(provider => this._register(provider.register(selector, this.client, this.commandManager, this.fileConfigurationManager, this.telemetryReporter))),
            // import('./languageFeatures/quickFix').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurationManager, this.commandManager, this.client.diagnosticsManager, this.telemetryReporter))),
            // import('./languageFeatures/fixAll').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurationManager, this.client.diagnosticsManager))),
            // import('./languageFeatures/refactor').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurationManager, this.commandManager, this.telemetryReporter))),
            // import('./languageFeatures/references').then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/codeLens/referencesCodeLens').then(provider => this._register(provider.register(selector, this.description.id, this.client, cachedResponse))),
            // import('./languageFeatures/rename').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurationManager))),
            // import('./languageFeatures/smartSelect').then(provider => this._register(provider.register(selector, this.client))),
            Promise.resolve().then(() => require('./languageFeatures/signatureHelp')).then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/tagClosing').then(provider => this._register(provider.register(selector, this.description.id, this.client))),
            // import('./languageFeatures/typeDefinitions').then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/semanticTokens').then(provider => this._register(provider.register(selector, this.client))),
            // import('./languageFeatures/callHierarchy').then(provider => this._register(provider.register(selector, this.client))),
        ]);
    }
    configurationChanged() {
        const config = vscode.workspace.getConfiguration(this.id, null);
        this.updateValidate(config.get(validateSetting, true));
        this.updateSuggestionDiagnostics(config.get(suggestionSetting, true));
    }
    handles(resource, doc) {
        if (doc && this.description.modeIds.indexOf(doc.languageId) >= 0) {
            return true;
        }
        const base = (0, path_1.basename)(resource.fsPath);
        return !!base && (!!this.description.configFilePattern && this.description.configFilePattern.test(base));
    }
    get id() {
        return this.description.id;
    }
    get diagnosticSource() {
        return this.description.diagnosticSource;
    }
    updateValidate(value) {
        this.client.diagnosticsManager.setValidate(this._diagnosticLanguage, value);
    }
    updateSuggestionDiagnostics(value) {
        this.client.diagnosticsManager.setEnableSuggestions(this._diagnosticLanguage, value);
    }
    reInitialize() {
        this.client.diagnosticsManager.reInitialize();
    }
    triggerAllDiagnostics() {
        this.client.bufferSyncSupport.requestAllDiagnostics();
    }
    diagnosticsReceived(diagnosticsKind, file, diagnostics) {
        if (this.id === 'javascript' || this.id === 'javascript_es6') { //暂时先屏蔽JavaScript的实时校验
            return;
        }
        const config = vscode.workspace.getConfiguration(this.id, file);
        const reportUnnecessary = config.get('showUnused', true);
        const reportDeprecated = config.get('showDeprecated', true);
        this.client.diagnosticsManager.updateDiagnostics(file, this._diagnosticLanguage, diagnosticsKind, diagnostics.filter(diag => {
            // Don't both reporting diagnostics we know will not be rendered
            if (diag.severity === vscode.DiagnosticSeverity.Hint
                || diag.severity === vscode.DiagnosticSeverity.Information) {
                if (reportUnnecessary && diag.reportUnnecessary) {
                    return true;
                }
                if (reportDeprecated && diag.reportDeprecated) {
                    return true;
                }
                return false;
            }
            return true;
        }));
    }
    configFileDiagnosticsReceived(file, diagnostics) {
        this.client.diagnosticsManager.configFileDiagnosticsReceived(file, diagnostics);
    }
    get _diagnosticLanguage() {
        return this.description.diagnosticLanguage;
    }
}
exports.default = LanguageProvider;
//# sourceMappingURL=languageProvider.js.map