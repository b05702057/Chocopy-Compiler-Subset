"use strict";
exports.__esModule = true;
exports.Type = exports.UniOp = exports.BinOp = void 0;
var BinOp;
(function (BinOp) {
    BinOp["Plus"] = "+";
    BinOp["Minus"] = "-";
    BinOp["Mul"] = "*";
    BinOp["Div"] = "//";
    BinOp["Mod"] = "%";
    BinOp["Eq"] = "==";
    BinOp["Neq"] = "!=";
    BinOp["Seq"] = "<=";
    BinOp["Leq"] = ">=";
    BinOp["Sml"] = "<";
    BinOp["Lrg"] = ">";
    BinOp["Is"] = "is";
})(BinOp = exports.BinOp || (exports.BinOp = {}));
var UniOp;
(function (UniOp) {
    UniOp["Minus"] = "-";
    UniOp["Not"] = "not";
})(UniOp = exports.UniOp || (exports.UniOp = {}));
var Type;
(function (Type) {
    Type["int"] = "int";
    Type["bool"] = "bool";
    Type["none"] = "None";
})(Type = exports.Type || (exports.Type = {}));
