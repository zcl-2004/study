"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const indexlib_1 = require("../../../indexlib");
let namedColorRGB = new Map([
    ["mediumaquamarine", "102,205,170"],
    ["mediumblue", "0,0,205"],
    ["mediumorchid", "186,85,211"],
    ["mediumpurple", "147,112,219"],
    ["mediumseagreen", "60,179,113"],
    ["mediumslateblue", "123,104,238"],
    ["mediumspringgreen", "0,250,154"],
    ["mediumturquoise", "72,209,204"],
    ["mediumvioletred", "199,21,133"],
    ["midnightblue", "25,25,112"],
    ["mintcream", "245,255,250"],
    ["mistyrose", "255,228,225"],
    ["moccasin", "255,228,181"],
    ["navajowhite", "255,222,173"],
    ["navy", "0,0,128"],
    ["oldlace", "253,245,230"],
    ["olive", "128,128,0"],
    ["olivedrab", "107,142,35"],
    ["orange", "255,165,0"],
    ["orangered", "255,69,0"],
    ["orchid", "218,112,214"],
    ["palegoldenrod", "238,232,170"],
    ["palegreen", "152,251,152"],
    ["paleturquoise", "175,238,238"],
    ["palevioletred", "219,112,147"],
    ["papayawhip", "255,239,213"],
    ["peachpuff", "255,218,185"],
    ["peru", "205,133,63"],
    ["pink", "255,192,203"],
    ["plum", "221,160,221"],
    ["powderblue", "176,224,230"],
    ["purple", "128,0,128"],
    ["red", "255,0,0"],
    ["rosybrown", "188,143,143"],
    ["royalblue", "65,105,225"],
    ["saddlebrown", "139,69,19"],
    ["salmon", "250,128,114"],
    ["sandybrown", "244,164,96"],
    ["seagreen", "46,139,87"],
    ["seashell", "255,245,238"],
    ["sienna", "160,82,45"],
    ["silver", "192,192,192"],
    ["skyblue", "135,206,235"],
    ["slateblue", "106,90,205"],
    ["slategray", "112,128,144"],
    ["slategrey", "112,128,144"],
    ["snow", "255,250,250"],
    ["springgreen", "0,255,127"],
    ["steelblue", "70,130,180"],
    ["tan", "210,180,140"],
    ["teal", "0,128,128"],
    ["thistle", "216,191,216"],
    ["tomato", "255,99,71"],
    ["transparent", ""],
    ["turquoise", "64,224,208"],
    ["violet", "238,130,238"],
    ["wheat", "245,222,179"],
    ["white", "255,255,255"],
    ["whitesmoke", "245,245,245"],
    ["yellow", "255,255,0"],
    ["yellowgreen", "154,205,50"], //$NON-NLS-1$ //$NON-NLS-2$
]);
function doComplete(position, document, options) {
    let result;
    let data = indexlib_1.IndexDataStore.load(options.workspaceFolder);
    let items = data.getAllColorIndex(document.uri);
    for (let item of items) {
        let type = vscode_languageserver_protocol_1.CompletionItemKind.Property;
        let rgbValue = namedColorRGB.get(item.label) || '';
        if (rgbValue) {
            let rgbs = rgbValue.split(',');
            if (rgbs.length === 3) {
                type = vscode_languageserver_protocol_1.CompletionItemKind.Color;
            }
        }
        result.push({
            label: item.label,
            kind: type
        });
    }
    return result;
}
//# sourceMappingURL=colorHandler.js.map