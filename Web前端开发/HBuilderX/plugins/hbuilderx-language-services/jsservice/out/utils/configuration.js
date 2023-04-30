"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptServiceConfiguration = exports.TsServerLogLevel = void 0;
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const objects = require("../utils/objects");
const arrays = require("./arrays");
var TsServerLogLevel;
(function (TsServerLogLevel) {
    TsServerLogLevel[TsServerLogLevel["Off"] = 0] = "Off";
    TsServerLogLevel[TsServerLogLevel["Normal"] = 1] = "Normal";
    TsServerLogLevel[TsServerLogLevel["Terse"] = 2] = "Terse";
    TsServerLogLevel[TsServerLogLevel["Verbose"] = 3] = "Verbose";
})(TsServerLogLevel = exports.TsServerLogLevel || (exports.TsServerLogLevel = {}));
(function (TsServerLogLevel) {
    function fromString(value) {
        switch (value && value.toLowerCase()) {
            case 'normal':
                return TsServerLogLevel.Normal;
            case 'terse':
                return TsServerLogLevel.Terse;
            case 'verbose':
                return TsServerLogLevel.Verbose;
            case 'off':
            default:
                return TsServerLogLevel.Off;
        }
    }
    TsServerLogLevel.fromString = fromString;
    function toString(value) {
        switch (value) {
            case TsServerLogLevel.Normal:
                return 'normal';
            case TsServerLogLevel.Terse:
                return 'terse';
            case TsServerLogLevel.Verbose:
                return 'verbose';
            case TsServerLogLevel.Off:
            default:
                return 'off';
        }
    }
    TsServerLogLevel.toString = toString;
})(TsServerLogLevel = exports.TsServerLogLevel || (exports.TsServerLogLevel = {}));
class TypeScriptServiceConfiguration {
    constructor() {
        this.tsServerLogLevel = TsServerLogLevel.Off;
        const configuration = vscode.workspace.getConfiguration();
        this.locale = TypeScriptServiceConfiguration.extractLocale(configuration);
        this.globalTsdk = TypeScriptServiceConfiguration.extractGlobalTsdk(configuration);
        this.localTsdk = TypeScriptServiceConfiguration.extractLocalTsdk(configuration);
        this.npmLocation = TypeScriptServiceConfiguration.readNpmLocation(configuration);
        this.tsServerLogLevel = TypeScriptServiceConfiguration.readTsServerLogLevel(configuration);
        this.tsServerPluginPaths = TypeScriptServiceConfiguration.readTsServerPluginPaths(configuration);
        this.checkJs = TypeScriptServiceConfiguration.readCheckJs(configuration);
        this.experimentalDecorators = TypeScriptServiceConfiguration.readExperimentalDecorators(configuration);
        this.disableAutomaticTypeAcquisition = TypeScriptServiceConfiguration.readDisableAutomaticTypeAcquisition(configuration);
        this.separateSyntaxServer = TypeScriptServiceConfiguration.readUseSeparateSyntaxServer(configuration);
        this.enableProjectDiagnostics = TypeScriptServiceConfiguration.readEnableProjectDiagnostics(configuration);
        this.maxTsServerMemory = TypeScriptServiceConfiguration.readMaxTsServerMemory(configuration);
        this.enablePromptUseWorkspaceTsdk = TypeScriptServiceConfiguration.readEnablePromptUseWorkspaceTsdk(configuration);
        this.watchOptions = TypeScriptServiceConfiguration.readWatchOptions(configuration);
        this.includePackageJsonAutoImports = TypeScriptServiceConfiguration.readIncludePackageJsonAutoImports(configuration);
    }
    static loadFromWorkspace() {
        return new TypeScriptServiceConfiguration();
    }
    isEqualTo(other) {
        return this.locale === other.locale
            && this.globalTsdk === other.globalTsdk
            && this.localTsdk === other.localTsdk
            && this.npmLocation === other.npmLocation
            && this.tsServerLogLevel === other.tsServerLogLevel
            && this.checkJs === other.checkJs
            && this.experimentalDecorators === other.experimentalDecorators
            && this.disableAutomaticTypeAcquisition === other.disableAutomaticTypeAcquisition
            && arrays.equals(this.tsServerPluginPaths, other.tsServerPluginPaths)
            && this.separateSyntaxServer === other.separateSyntaxServer
            && this.enableProjectDiagnostics === other.enableProjectDiagnostics
            && this.maxTsServerMemory === other.maxTsServerMemory
            && objects.equals(this.watchOptions, other.watchOptions)
            && this.enablePromptUseWorkspaceTsdk === other.enablePromptUseWorkspaceTsdk
            && this.includePackageJsonAutoImports === other.includePackageJsonAutoImports;
    }
    static fixPathPrefixes(inspectValue) {
        const pathPrefixes = ['~' + path.sep];
        for (const pathPrefix of pathPrefixes) {
            if (inspectValue.startsWith(pathPrefix)) {
                return path.join(os.homedir(), inspectValue.slice(pathPrefix.length));
            }
        }
        return inspectValue;
    }
    static extractGlobalTsdk(configuration) {
        const inspect = configuration.get('typescript.tsdk', '');
        if (inspect) {
            return this.fixPathPrefixes(inspect);
        }
        return null;
    }
    static extractLocalTsdk(configuration) {
        const inspect = configuration.get('typescript.tsdk', '');
        if (inspect) {
            return this.fixPathPrefixes(inspect);
        }
        return null;
    }
    static readTsServerLogLevel(configuration) {
        const setting = configuration.get('typescript.tsserver.log', 'off');
        return TsServerLogLevel.fromString(setting);
    }
    static readTsServerPluginPaths(configuration) {
        return configuration.get('typescript.tsserver.pluginPaths', []);
    }
    static readCheckJs(configuration) {
        return configuration.get('javascript.implicitProjectConfig.checkJs', false);
    }
    static readExperimentalDecorators(configuration) {
        return configuration.get('javascript.implicitProjectConfig.experimentalDecorators', false);
    }
    static readNpmLocation(configuration) {
        return configuration.get('typescript.npm', null);
    }
    static readDisableAutomaticTypeAcquisition(configuration) {
        return configuration.get('typescript.disableAutomaticTypeAcquisition', false);
    }
    static extractLocale(configuration) {
        return configuration.get('typescript.locale', null);
    }
    static readUseSeparateSyntaxServer(configuration) {
        const value = configuration.get('typescript.tsserver.useSeparateSyntaxServer', true);
        if (value === true) {
            return 1 /* Enabled */;
        }
        return 0 /* Disabled */;
    }
    static readEnableProjectDiagnostics(configuration) {
        return configuration.get('typescript.tsserver.experimental.enableProjectDiagnostics', false);
    }
    static readWatchOptions(configuration) {
        return configuration.get('typescript.tsserver.watchOptions');
    }
    static readIncludePackageJsonAutoImports(configuration) {
        return configuration.get('typescript.preferences.includePackageJsonAutoImports');
    }
    static readMaxTsServerMemory(configuration) {
        const defaultMaxMemory = 3072;
        const minimumMaxMemory = 128;
        const memoryInMB = configuration.get('typescript.tsserver.maxTsServerMemory', defaultMaxMemory);
        if (!Number.isSafeInteger(memoryInMB)) {
            return defaultMaxMemory;
        }
        return Math.max(memoryInMB, minimumMaxMemory);
    }
    static readEnablePromptUseWorkspaceTsdk(configuration) {
        return configuration.get('typescript.enablePromptUseWorkspaceTsdk', false);
    }
}
exports.TypeScriptServiceConfiguration = TypeScriptServiceConfiguration;
//# sourceMappingURL=configuration.js.map