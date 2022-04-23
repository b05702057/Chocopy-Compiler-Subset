"use strict";
exports.__esModule = true;
exports.stringifyTree = exports.traverseFuncDef = exports.traverseLiteral = exports.traverseTypedVar = exports.node2type = exports.traverseVarInit = exports.isVarInit = exports.isFuncDef = exports.parse = exports.traverseProgram = exports.traverseStmt = exports.traverseExpr = exports.traverseArgs = void 0;
var lezer_python_1 = require("lezer-python");
var ast_1 = require("./ast");
function traverseArgs(c, s) {
    var args = [];
    c.firstChild();
    while (c.nextSibling()) {
        if (c.type.name === ')') {
            break;
        }
        args.push(traverseExpr(c, s));
        c.nextSibling();
    }
    c.parent();
    return args;
}
exports.traverseArgs = traverseArgs;
function traverseExpr(c, s) {
    switch (c.type.name) {
        case "Number": // eg. '1'
            return { tag: "literal",
                literal: { tag: "num",
                    value: Number(s.substring(c.from, c.to))
                }
            };
        case 'Boolean':
            return { tag: "literal",
                literal: { tag: "bool", value: s.substring(c.from, c.to) === "True" } };
        case "VariableName": // e.g. 'x'
            return {
                tag: "id",
                name: s.substring(c.from, c.to)
            };
        case "CallExpression": // e.g. max(x, y), abs(x), f()
            c.firstChild();
            var callName = s.substring(c.from, c.to);
            c.nextSibling(); // go to arglist
            var args = traverseArgs(c, s);
            c.parent();
            return {
                tag: "call",
                name: callName,
                args: args
            };
        case "UnaryExpression":
            // WARNING: this uniary expression only deal with 
            // uniary directly followed by a number 
            // e.g. -x, - (1 + 2)
            c.firstChild(); // go into unary expressoin
            var uniOp = str2uniop(s.substring(c.from, c.to));
            // pop uniary expression
            var num = Number(s.substring(c.from, c.to));
            c.nextSibling();
            var unionExpr = traverseExpr(c, s);
            return { tag: "uniop", op: uniOp, expr: unionExpr };
        case "BinaryExpression": // e.g. 1 + 2
            c.firstChild(); // go into binary expression
            var left = traverseExpr(c, s);
            c.nextSibling();
            var op = str2binop(s.substring(c.from, c.to));
            c.nextSibling();
            var right = traverseExpr(c, s);
            c.parent(); // pop the binary
            return {
                tag: "binop",
                op: op,
                left: left,
                right: right
            };
        default:
            console.log(stringifyTree(c, s, 2));
            throw new Error("PARSE ERROR: Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseExpr = traverseExpr;
/*
 * A function to parse one statement
 * @input c: a treecorsor
 * @input s: the original input string
 * @input env: environment variables (if we are going to traverse a func,)
 */
function traverseStmt(c, s) {
    switch (c.node.type.name) {
        case "AssignStatement": // a = 1, b = 2 or var Init
            c.firstChild(); // go to name
            var name_1 = s.substring(c.from, c.to);
            c.nextSibling();
            c.nextSibling(); // go to value
            var value = traverseExpr(c, s);
            c.parent();
            return { tag: "assign", name: name_1, value: value };
        case "ExpressionStatement":
            c.firstChild();
            var expr = traverseExpr(c, s);
            c.parent();
            return { tag: "expr", expr: expr };
        case "ReturnStatement":
            c.firstChild();
            c.nextSibling();
            var retExpr = { tag: "literal", literal: { tag: "none" } };
            if (c.type.name !== '⚠') {
                retExpr = traverseExpr(c, s);
            }
            c.parent();
            return { tag: "return", expr: retExpr };
        case "PassStatement":
            return { tag: "pass" };
        case "IfStatement": // TODO
            return traverseIf(c, s);
        case "WhileStatement": // TODO
            return traverseWhile(c, s);
        default:
            console.log(stringifyTree(c, s, 2));
            throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseStmt = traverseStmt;
function traverseProgram(c, s) {
    var varInits = [];
    var funcDefs = [];
    var stmts = [];
    switch (c.node.type.name) {
        case "Script":
            c.firstChild();
            do {
                // var Init
                if (isVarInit(c)) { // parse variable initialization
                    varInits.push(traverseVarInit(c, s));
                }
                else if (isFuncDef(c)) {
                    funcDefs.push(traverseFuncDef(c, s));
                }
                else {
                    break;
                }
            } while (c.nextSibling());
            if (isVarInit(c) || isFuncDef(c)) { // no next sibling && no stmts
                return {
                    varInits: varInits,
                    funcDefs: funcDefs,
                    stmts: stmts
                };
            }
            // parse statements
            do {
                if (isVarInit(c) || isFuncDef(c)) {
                    throw new Error("PARSE ERROR: var init and func def should go before statements");
                }
                stmts.push(traverseStmt(c, s));
            } while (c.nextSibling());
            return {
                varInits: varInits,
                funcDefs: funcDefs,
                stmts: stmts
            };
        default:
            throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
    }
}
exports.traverseProgram = traverseProgram;
function parse(source) {
    var t = lezer_python_1.parser.parse(source);
    return traverseProgram(t.cursor(), source);
}
exports.parse = parse;
function isFuncDef(c) {
    return c.type.name === 'FunctionDefinition';
}
exports.isFuncDef = isFuncDef;
function isVarInit(c) {
    if (c.type.name !== 'AssignStatement') {
        return false;
    }
    c.firstChild();
    c.nextSibling();
    var isTypeDef = (c.node.type.name === 'TypeDef');
    c.parent();
    return isTypeDef;
}
exports.isVarInit = isVarInit;
function traverseVarInit(c, s) {
    // c is now in AssignStatement
    c.firstChild();
    var tVar = traverseTypedVar(c, s);
    c.nextSibling();
    c.nextSibling();
    var literal = traverseLiteral(c, s);
    c.parent();
    return {
        name: tVar.name,
        type: tVar.type,
        initLiteral: literal
    };
}
exports.traverseVarInit = traverseVarInit;
function node2type(c, s) {
    var typeStr = s.substring(c.from, c.to);
    switch (typeStr) {
        case 'int':
            return ast_1.Type.int;
        case 'bool':
            return ast_1.Type.bool;
        case 'None':
            return ast_1.Type.none;
        default:
            throw new Error("PARSE ERROR: unknown type ".concat(typeStr));
    }
}
exports.node2type = node2type;
function traverseTypedVar(c, s) {
    var name = s.substring(c.from, c.to);
    c.nextSibling();
    c.firstChild();
    c.nextSibling();
    var type = node2type(c, s);
    c.parent();
    return {
        name: name,
        type: type
    };
}
exports.traverseTypedVar = traverseTypedVar;
function traverseLiteral(c, s) {
    var valStr = s.substring(c.from, c.to);
    switch (c.type.name) {
        case 'Boolean':
            if (valStr == 'False') {
                return { tag: "bool", value: false };
            }
            else {
                return { tag: "bool", value: true };
            }
        case 'Number':
            return { tag: "num", value: parseInt(valStr) };
        case 'None':
            return { tag: "none" };
    }
    throw new Error("PARSE ERROR: unsupporting literal type");
}
exports.traverseLiteral = traverseLiteral;
function traverseFuncDef(c, s) {
    var func = {
        name: "",
        params: null,
        retType: ast_1.Type.none,
        varInits: null,
        stmts: null
    };
    // function name
    c.firstChild();
    c.nextSibling();
    func.name = s.substring(c.from, c.to);
    // paramlist (0 or more)
    c.nextSibling();
    func.params = traverseFuncParams(c, s);
    // return type (0 or one)
    c.nextSibling();
    if (c.type.name === 'TypeDef') {
        c.firstChild();
        func.retType = node2type(c, s);
        c.parent();
    }
    // parse body
    c.nextSibling();
    c.firstChild();
    c.nextSibling();
    var code = traverseFuncBody(c, s);
    func.varInits = code.varInits;
    func.stmts = code.stmts;
    c.parent();
    c.parent();
    return func;
}
exports.traverseFuncDef = traverseFuncDef;
function traverseFuncParams(c, s) {
    var params = [];
    c.firstChild();
    c.nextSibling();
    do {
        if (s.substring(c.from, c.to) === ')')
            break;
        if (s.substring(c.from, c.to) === ',')
            continue;
        params.push(traverseTypedVar(c, s));
    } while (c.nextSibling());
    c.parent();
    return params;
}
function traverseFuncBody(c, s) {
    var varInits = [];
    var stmts = [];
    do {
        if (!isVarInit(c)) {
            break;
        }
        if (isFuncDef(c)) {
            throw new Error("PARSER ERRO: nested function definition is now allowed");
        }
        varInits.push(traverseVarInit(c, s));
    } while (c.nextSibling());
    // get all statement
    do {
        if (isFuncDef(c)) {
            throw new Error("PARSER ERROR: nested function definition is now allowed");
        }
        if (isVarInit(c)) {
            throw new Error("PARSE ERROR: Variable initialization should go before statements");
        }
        stmts.push(traverseStmt(c, s));
    } while (c.nextSibling());
    return {
        varInits: varInits,
        stmts: stmts,
        funcDefs: []
    };
}
function str2uniop(opStr) {
    switch (opStr) {
        case "-":
            return ast_1.UniOp.Minus;
        case "not":
            return ast_1.UniOp.Not;
    }
    throw new Error("PARSE ERROR: unsupported uniary operator");
}
function str2binop(opStr) {
    switch (opStr) {
        case "+":
            return ast_1.BinOp.Plus;
        case "-":
            return ast_1.BinOp.Minus;
        case "*":
            return ast_1.BinOp.Mul;
        case "//":
            return ast_1.BinOp.Div;
        case "%":
            return ast_1.BinOp.Mod;
        case "==":
            return ast_1.BinOp.Eq;
        case "!=":
            return ast_1.BinOp.Neq;
        case "<=":
            return ast_1.BinOp.Seq;
        case ">=":
            return ast_1.BinOp.Leq;
        case "<":
            return ast_1.BinOp.Sml;
        case ">":
            return ast_1.BinOp.Lrg;
        case "is":
            return ast_1.BinOp.Is;
    }
    throw new Error("PARSE ERROR: unknown binary operator");
}
function traverseWhile(c, s) {
    c.firstChild(); // while
    c.nextSibling(); // cond
    var cond = traverseExpr(c, s);
    var body = [];
    c.nextSibling();
    c.firstChild();
    c.nextSibling();
    do {
        body.push(traverseStmt(c, s));
    } while (c.nextSibling());
    c.parent();
    c.parent();
    return {
        tag: "while",
        cond: cond,
        stmts: body
    };
}
function traverseIf(c, s) {
    var ifClause = {
        tag: "if",
        ifOp: {
            cond: null,
            stmts: null
        },
        elifOp: {
            cond: null,
            stmts: null
        },
        elseOp: {
            stmts: null
        }
    };
    c.firstChild(); // if
    // check if
    c.nextSibling();
    ifClause.ifOp.cond = traverseExpr(c, s);
    c.nextSibling();
    c.firstChild();
    c.nextSibling();
    ifClause.ifOp.stmts = [];
    do {
        ifClause.ifOp.stmts.push(traverseStmt(c, s));
    } while (c.nextSibling());
    c.parent();
    if (!c.nextSibling()) {
        c.parent();
        return ifClause;
    }
    // check elif if
    if (c.type.name == 'elif') {
        c.nextSibling();
        ifClause.elifOp.cond = traverseExpr(c, s);
        c.nextSibling();
        c.firstChild();
        c.nextSibling();
        ifClause.elifOp.stmts = [];
        do {
            ifClause.elifOp.stmts.push(traverseStmt(c, s));
        } while (c.nextSibling());
        c.parent();
        if (!c.nextSibling()) {
            c.parent();
            return ifClause;
        }
    }
    // check else
    if (c.type.name == 'else') {
        c.nextSibling();
        c.firstChild();
        c.nextSibling();
        ifClause.elseOp.stmts = [];
        do {
            ifClause.elseOp.stmts.push(traverseStmt(c, s));
        } while (c.nextSibling());
        c.parent();
    }
    c.parent();
    return ifClause;
}
/*
 * Helper Functions
 */
function stringifyTree(t, source, d) {
    var str = "";
    var spaces = " ".repeat(d * 2);
    str += spaces + t.type.name;
    if (["Number", "CallExpression", "BinaryExpression", "UnaryExpression"].includes(t.type.name)) {
        str += "-->" + source.substring(t.from, t.to);
    }
    str += "\n";
    if (t.firstChild()) {
        do {
            str += stringifyTree(t, source, d + 1);
        } while (t.nextSibling());
        t.parent();
    }
    return str;
}
exports.stringifyTree = stringifyTree;
