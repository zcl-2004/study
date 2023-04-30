"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printAST = exports.getCallExpressionByOffset = exports.getCallExpression = exports.findNodePathByOffset = void 0;
const typescript = require("typescript");
const enumString = `
export enum SyntaxKind {
  Unknown = 0,
  EndOfFileToken = 1,
  SingleLineCommentTrivia = 2,
  MultiLineCommentTrivia = 3,
  NewLineTrivia = 4,
  WhitespaceTrivia = 5,
  ShebangTrivia = 6,
  ConflictMarkerTrivia = 7,
  NumericLiteral = 8,
  BigIntLiteral = 9,
  StringLiteral = 10,
  JsxText = 11,
  JsxTextAllWhiteSpaces = 12,
  RegularExpressionLiteral = 13,
  NoSubstitutionTemplateLiteral = 14,
  TemplateHead = 15,
  TemplateMiddle = 16,
  TemplateTail = 17,
  OpenBraceToken = 18,
  CloseBraceToken = 19,
  OpenParenToken = 20,
  CloseParenToken = 21,
  OpenBracketToken = 22,
  CloseBracketToken = 23,
  DotToken = 24,
  DotDotDotToken = 25,
  SemicolonToken = 26,
  CommaToken = 27,
  QuestionDotToken = 28,
  LessThanToken = 29,
  LessThanSlashToken = 30,
  GreaterThanToken = 31,
  LessThanEqualsToken = 32,
  GreaterThanEqualsToken = 33,
  EqualsEqualsToken = 34,
  ExclamationEqualsToken = 35,
  EqualsEqualsEqualsToken = 36,
  ExclamationEqualsEqualsToken = 37,
  EqualsGreaterThanToken = 38,
  PlusToken = 39,
  MinusToken = 40,
  AsteriskToken = 41,
  AsteriskAsteriskToken = 42,
  SlashToken = 43,
  PercentToken = 44,
  PlusPlusToken = 45,
  MinusMinusToken = 46,
  LessThanLessThanToken = 47,
  GreaterThanGreaterThanToken = 48,
  GreaterThanGreaterThanGreaterThanToken = 49,
  AmpersandToken = 50,
  BarToken = 51,
  CaretToken = 52,
  ExclamationToken = 53,
  TildeToken = 54,
  AmpersandAmpersandToken = 55,
  BarBarToken = 56,
  QuestionToken = 57,
  ColonToken = 58,
  AtToken = 59,
  QuestionQuestionToken = 60,
  /** Only the JSDoc scanner produces BacktickToken. The normal scanner produces NoSubstitutionTemplateLiteral and related kinds. */
  BacktickToken = 61,
  EqualsToken = 62,
  PlusEqualsToken = 63,
  MinusEqualsToken = 64,
  AsteriskEqualsToken = 65,
  AsteriskAsteriskEqualsToken = 66,
  SlashEqualsToken = 67,
  PercentEqualsToken = 68,
  LessThanLessThanEqualsToken = 69,
  GreaterThanGreaterThanEqualsToken = 70,
  GreaterThanGreaterThanGreaterThanEqualsToken = 71,
  AmpersandEqualsToken = 72,
  BarEqualsToken = 73,
  BarBarEqualsToken = 74,
  AmpersandAmpersandEqualsToken = 75,
  QuestionQuestionEqualsToken = 76,
  CaretEqualsToken = 77,
  Identifier = 78,
  PrivateIdentifier = 79,
  BreakKeyword = 80,
  CaseKeyword = 81,
  CatchKeyword = 82,
  ClassKeyword = 83,
  ConstKeyword = 84,
  ContinueKeyword = 85,
  DebuggerKeyword = 86,
  DefaultKeyword = 87,
  DeleteKeyword = 88,
  DoKeyword = 89,
  ElseKeyword = 90,
  EnumKeyword = 91,
  ExportKeyword = 92,
  ExtendsKeyword = 93,
  FalseKeyword = 94,
  FinallyKeyword = 95,
  ForKeyword = 96,
  FunctionKeyword = 97,
  IfKeyword = 98,
  ImportKeyword = 99,
  InKeyword = 100,
  InstanceOfKeyword = 101,
  NewKeyword = 102,
  NullKeyword = 103,
  ReturnKeyword = 104,
  SuperKeyword = 105,
  SwitchKeyword = 106,
  ThisKeyword = 107,
  ThrowKeyword = 108,
  TrueKeyword = 109,
  TryKeyword = 110,
  TypeOfKeyword = 111,
  VarKeyword = 112,
  VoidKeyword = 113,
  WhileKeyword = 114,
  WithKeyword = 115,
  ImplementsKeyword = 116,
  InterfaceKeyword = 117,
  LetKeyword = 118,
  PackageKeyword = 119,
  PrivateKeyword = 120,
  ProtectedKeyword = 121,
  PublicKeyword = 122,
  StaticKeyword = 123,
  YieldKeyword = 124,
  AbstractKeyword = 125,
  AsKeyword = 126,
  AssertsKeyword = 127,
  AnyKeyword = 128,
  AsyncKeyword = 129,
  AwaitKeyword = 130,
  BooleanKeyword = 131,
  ConstructorKeyword = 132,
  DeclareKeyword = 133,
  GetKeyword = 134,
  InferKeyword = 135,
  IsKeyword = 136,
  KeyOfKeyword = 137,
  ModuleKeyword = 138,
  NamespaceKeyword = 139,
  NeverKeyword = 140,
  ReadonlyKeyword = 141,
  RequireKeyword = 142,
  NumberKeyword = 143,
  ObjectKeyword = 144,
  SetKeyword = 145,
  StringKeyword = 146,
  SymbolKeyword = 147,
  TypeKeyword = 148,
  UndefinedKeyword = 149,
  UniqueKeyword = 150,
  UnknownKeyword = 151,
  FromKeyword = 152,
  GlobalKeyword = 153,
  BigIntKeyword = 154,
  OfKeyword = 155,
  QualifiedName = 156,
  ComputedPropertyName = 157,
  TypeParameter = 158,
  Parameter = 159,
  Decorator = 160,
  PropertySignature = 161,
  PropertyDeclaration = 162,
  MethodSignature = 163,
  MethodDeclaration = 164,
  Constructor = 165,
  GetAccessor = 166,
  SetAccessor = 167,
  CallSignature = 168,
  ConstructSignature = 169,
  IndexSignature = 170,
  TypePredicate = 171,
  TypeReference = 172,
  FunctionType = 173,
  ConstructorType = 174,
  TypeQuery = 175,
  TypeLiteral = 176,
  ArrayType = 177,
  TupleType = 178,
  OptionalType = 179,
  RestType = 180,
  UnionType = 181,
  IntersectionType = 182,
  ConditionalType = 183,
  InferType = 184,
  ParenthesizedType = 185,
  ThisType = 186,
  TypeOperator = 187,
  IndexedAccessType = 188,
  MappedType = 189,
  LiteralType = 190,
  NamedTupleMember = 191,
  ImportType = 192,
  ObjectBindingPattern = 193,
  ArrayBindingPattern = 194,
  BindingElement = 195,
  ArrayLiteralExpression = 196,
  ObjectLiteralExpression = 197,
  PropertyAccessExpression = 198,
  ElementAccessExpression = 199,
  CallExpression = 200,
  NewExpression = 201,
  TaggedTemplateExpression = 202,
  TypeAssertionExpression = 203,
  ParenthesizedExpression = 204,
  FunctionExpression = 205,
  ArrowFunction = 206,
  DeleteExpression = 207,
  TypeOfExpression = 208,
  VoidExpression = 209,
  AwaitExpression = 210,
  PrefixUnaryExpression = 211,
  PostfixUnaryExpression = 212,
  BinaryExpression = 213,
  ConditionalExpression = 214,
  TemplateExpression = 215,
  YieldExpression = 216,
  SpreadElement = 217,
  ClassExpression = 218,
  OmittedExpression = 219,
  ExpressionWithTypeArguments = 220,
  AsExpression = 221,
  NonNullExpression = 222,
  MetaProperty = 223,
  SyntheticExpression = 224,
  TemplateSpan = 225,
  SemicolonClassElement = 226,
  Block = 227,
  EmptyStatement = 228,
  VariableStatement = 229,
  ExpressionStatement = 230,
  IfStatement = 231,
  DoStatement = 232,
  WhileStatement = 233,
  ForStatement = 234,
  ForInStatement = 235,
  ForOfStatement = 236,
  ContinueStatement = 237,
  BreakStatement = 238,
  ReturnStatement = 239,
  WithStatement = 240,
  SwitchStatement = 241,
  LabeledStatement = 242,
  ThrowStatement = 243,
  TryStatement = 244,
  DebuggerStatement = 245,
  VariableDeclaration = 246,
  VariableDeclarationList = 247,
  FunctionDeclaration = 248,
  ClassDeclaration = 249,
  InterfaceDeclaration = 250,
  TypeAliasDeclaration = 251,
  EnumDeclaration = 252,
  ModuleDeclaration = 253,
  ModuleBlock = 254,
  CaseBlock = 255,
  NamespaceExportDeclaration = 256,
  ImportEqualsDeclaration = 257,
  ImportDeclaration = 258,
  ImportClause = 259,
  NamespaceImport = 260,
  NamedImports = 261,
  ImportSpecifier = 262,
  ExportAssignment = 263,
  ExportDeclaration = 264,
  NamedExports = 265,
  NamespaceExport = 266,
  ExportSpecifier = 267,
  MissingDeclaration = 268,
  ExternalModuleReference = 269,
  JsxElement = 270,
  JsxSelfClosingElement = 271,
  JsxOpeningElement = 272,
  JsxClosingElement = 273,
  JsxFragment = 274,
  JsxOpeningFragment = 275,
  JsxClosingFragment = 276,
  JsxAttribute = 277,
  JsxAttributes = 278,
  JsxSpreadAttribute = 279,
  JsxExpression = 280,
  CaseClause = 281,
  DefaultClause = 282,
  HeritageClause = 283,
  CatchClause = 284,
  PropertyAssignment = 285,
  ShorthandPropertyAssignment = 286,
  SpreadAssignment = 287,
  EnumMember = 288,
  UnparsedPrologue = 289,
  UnparsedPrepend = 290,
  UnparsedText = 291,
  UnparsedInternalText = 292,
  UnparsedSyntheticReference = 293,
  SourceFile = 294,
  Bundle = 295,
  UnparsedSource = 296,
  InputFiles = 297,
  JSDocTypeExpression = 298,
  JSDocAllType = 299,
  JSDocUnknownType = 300,
  JSDocNullableType = 301,
  JSDocNonNullableType = 302,
  JSDocOptionalType = 303,
  JSDocFunctionType = 304,
  JSDocVariadicType = 305,
  JSDocNamepathType = 306,
  JSDocComment = 307,
  JSDocTypeLiteral = 308,
  JSDocSignature = 309,
  JSDocTag = 310,
  JSDocAugmentsTag = 311,
  JSDocImplementsTag = 312,
  JSDocAuthorTag = 313,
  JSDocDeprecatedTag = 314,
  JSDocClassTag = 315,
  JSDocPublicTag = 316,
  JSDocPrivateTag = 317,
  JSDocProtectedTag = 318,
  JSDocReadonlyTag = 319,
  JSDocCallbackTag = 320,
  JSDocEnumTag = 321,
  JSDocParameterTag = 322,
  JSDocReturnTag = 323,
  JSDocThisTag = 324,
  JSDocTypeTag = 325,
  JSDocTemplateTag = 326,
  JSDocTypedefTag = 327,
  JSDocPropertyTag = 328,
  SyntaxList = 329,
  NotEmittedStatement = 330,
  PartiallyEmittedExpression = 331,
  CommaListExpression = 332,
  MergeDeclarationMarker = 333,
  EndOfDeclarationMarker = 334,
  SyntheticReferenceExpression = 335,
  Count = 336,
  FirstAssignment = 62,
  LastAssignment = 77,
  FirstCompoundAssignment = 63,
  LastCompoundAssignment = 77,
  FirstReservedWord = 80,
  LastReservedWord = 115,
  FirstKeyword = 80,
  LastKeyword = 155,
  FirstFutureReservedWord = 116,
  LastFutureReservedWord = 124,
  FirstTypeNode = 171,
  LastTypeNode = 192,
  FirstPunctuation = 18,
  LastPunctuation = 77,
  FirstToken = 0,
  LastToken = 155,
  FirstTriviaToken = 2,
  LastTriviaToken = 7,
  FirstLiteralToken = 8,
  LastLiteralToken = 14,
  FirstTemplateToken = 14,
  LastTemplateToken = 17,
  FirstBinaryOperator = 29,
  LastBinaryOperator = 77,
  FirstStatement = 229,
  LastStatement = 245,
  FirstNode = 156,
  FirstJSDocNode = 298,
  LastJSDocNode = 328,
  FirstJSDocTagNode = 310,
  LastJSDocTagNode = 328,
}`;
/**
 *
 * @param source source code
 * @param start
 */
function formatSyntaxKind(source, start = 0) {
    let sourceFile = typescript.createSourceFile('', source, typescript.ScriptTarget.Latest);
    let result = new Map();
    let nodes = [];
    nodes.push(sourceFile);
    while (nodes.length > 0) {
        let current = nodes.shift();
        for (let i = 0; i < current.getChildCount(); ++i) {
            let child = current.getChildAt(i);
            if (child.kind === typescript.SyntaxKind.EnumDeclaration) {
                for (let j = 0; j < child.members.length; ++j) {
                    let value = child.members[j];
                    if (value.kind === typescript.SyntaxKind.EnumMember) {
                        result.set(start++, value.name.getText(sourceFile));
                    }
                }
                break;
            }
            nodes.push(child);
        }
    }
    return result;
}
/**
 *
 * @param node
 * @param nodePaths
 */
function collect(node, nodePaths, offset) {
    if (node.getFullStart() <= offset && offset <= node.getEnd()) {
        nodePaths.push(node);
        typescript.forEachChild(node, child => collect(child, nodePaths, offset));
    }
}
/**
 *
 * @param node sourceFile
 * @param offset
 * @returns
 */
function findNodePathByOffset(node, offset) {
    let nodePaths = [];
    nodePaths.push(node);
    let currentNode = node;
    if (node.getEnd() < offset || node.getFullStart() > offset)
        return nodePaths;
    typescript.forEachChild(currentNode, node => collect(node, nodePaths, offset));
    return nodePaths;
}
exports.findNodePathByOffset = findNodePathByOffset;
/**
 *
 * @param node currentToken
 * @param sourceFile sourceFile
 */
function getCallExpression(node, sourceFile) {
    let endOffset = node.getEnd();
    return getCallExpressionByOffset(endOffset, sourceFile);
}
exports.getCallExpression = getCallExpression;
function getCallExpressionByOffset(offset, sourceFile) {
    let target = null;
    let nodePaths = findNodePathByOffset(sourceFile, offset);
    for (let i = nodePaths.length - 1; i >= 0; --i) {
        let node = nodePaths[i];
        if (node.kind === typescript.SyntaxKind.CallExpression) {
            target = node;
            break;
        }
    }
    return target;
}
exports.getCallExpressionByOffset = getCallExpressionByOffset;
/**
 *
 * @param node
 * @param depth
 * @param htmlJsScourceFile
 */
function printAST(node, depth = 0, sourceFile) {
    console.log(new Array(depth + 1).join('----'), formatSyntaxKind(enumString).get(node.kind), node.pos, node.end);
    depth++;
    node.getChildren(sourceFile).forEach(c => printAST(c, depth, sourceFile));
}
exports.printAST = printAST;
//# sourceMappingURL=nodes.js.map