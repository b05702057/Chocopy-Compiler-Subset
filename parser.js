"use strict";
exports.__esModule = true;
exports.stringifyTree = exports.traverseFuncDef = exports.traverseMethDef = exports.traverseClassDef = exports.traverseLiteral = exports.traverseTypedVar = exports.node2type = exports.traverseVarInit = exports.isVarInit = exports.isClassDef = exports.isFuncDef = exports.parse = exports.traverseProgram = exports.traverseStmt = exports.traverseExpr = exports.traverseArgs = void 0;
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
            return {
                tag: "literal",
                literal: {
                    tag: "num",
                    value: Number(s.substring(c.from, c.to))
                }
            };
        case 'Boolean':
            return {
                tag: "literal",
                literal: {
                    tag: "bool",
                    value: s.substring(c.from, c.to) === "True"
                }
            };
        case "VariableName": // e.g. 'x'
            return { tag: "id", name: s.substring(c.from, c.to) };
        case "self": // not sure if this should be handled like this
            return { tag: "id", name: "self" };
        case "CallExpression": // e.g. max(x, y), abs(x), f()
            c.firstChild(); // "MemberExpression" or "VariableName"
            if (c.name === "MemberExpression") {
                c.lastChild(); // "PropertyName"
                var pName_1 = s.substring(c.from, c.to);
                c.parent(); // get back to "MemberExpression"
                var obj_1 = traverseExpr(c, s);
                if (obj_1.tag !== "getfield") { // Visiting MemberExpression should always gets a getfield return.
                    throw Error("The object has an incorrect tag.");
                }
                c.nextSibling(); // "ArgList"
                var args = traverseArgs(c, s);
                c.parent();
                // We return obj.obj because the obj is actually not a getfield.
                return { tag: "method", obj: obj_1.obj, args: args, name: pName_1 };
            }
            else {
                // "VariableName"
                var callName = s.substring(c.from, c.to);
                c.nextSibling(); // "ArgList"
                var args = traverseArgs(c, s);
                c.parent(); // back to "CallExpression"
                return { tag: "call", name: callName, args: args };
            }
        case "UnaryExpression":
            // WARNING: This uniary expression only deals with uniary operator directly followed by a number 
            // e.g. -x, - (1 + 2)
            c.firstChild(); // go into the unary expressoin
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
            return { tag: "binop", op: op, left: left, right: right };
        case "MemberExpression": // ex. r2.n
            c.firstChild(); // "CallExpression" or "VariableName"
            var obj = traverseExpr(c, s);
            c.nextSibling(); // "."
            c.nextSibling(); // "PropertyName"
            var pName = s.substring(c.from, c.to);
            c.parent();
            return { tag: "getfield", obj: obj, name: pName };
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
            c.firstChild(); // "VariableName" or "MemberExpression"
            // get lhs expression
            var name = traverseExpr(c, s);
            var variable = s.substring(c.from, c.to);
            variable = variable.split(".")[0]; // This only tells the initial variable => self.y as self
            c.nextSibling(); // "AssignOp"
            c.nextSibling(); // rhs expression
            var value = traverseExpr(c, s);
            c.parent();
            return { tag: "assign", name: name, variable: variable, value: value };
        case "ExpressionStatement":
            c.firstChild();
            var expr = traverseExpr(c, s);
            c.parent();
            return { tag: "expr", expr: expr };
        case "ReturnStatement":
            c.firstChild();
            c.nextSibling();
            var retExpr = { tag: "literal", literal: { tag: "none" } };
            if (c.type.name !== '⚠') { // return None
                retExpr = traverseExpr(c, s);
            }
            c.parent();
            return { tag: "return", expr: retExpr };
        case "PassStatement":
            return { tag: "pass" };
        case "IfStatement":
            return traverseIf(c, s);
        case "WhileStatement":
            return traverseWhile(c, s);
        case "ClassDefinition":
            return traverseClassDef(c, s);
        default:
            console.log(stringifyTree(c, s, 2));
            throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseStmt = traverseStmt;
function traverseProgram(c, s) {
    var varInits = [];
    var classDefs = [];
    var funcDefs = []; // no FuncDef for PA3
    var stmts = []; // class definitions are included here
    switch (c.node.type.name) {
        case "Script":
            c.firstChild();
            // parse class definitions and variable initializations
            do {
                if (isVarInit(c)) {
                    varInits.push(traverseVarInit(c, s)); // parse variable initialization
                }
                else if (isFuncDef(c)) {
                    funcDefs.push(traverseFuncDef(c, s));
                }
                else if (isClassDef(c)) {
                    classDefs.push(traverseClassDef(c, s));
                }
                else {
                    break;
                }
            } while (c.nextSibling());
            if (isVarInit(c) || isFuncDef(c) || isClassDef(c)) { // no next sibling && no stmts
                return { varInits: varInits, classDefs: classDefs, funcDefs: funcDefs, stmts: stmts };
            }
            // parse statements
            do {
                console.log("QQ");
                console.log(c.name);
                if (isVarInit(c) || isFuncDef(c)) {
                    throw new Error("PARSE ERROR: var init and func def should go before statements");
                }
                stmts.push(traverseStmt(c, s));
            } while (c.nextSibling());
            return { varInits: varInits, classDefs: classDefs, funcDefs: funcDefs, stmts: stmts };
        default:
            throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
    }
}
exports.traverseProgram = traverseProgram;
function parse(source) {
    var t = lezer_python_1.parser.parse(source);
    console.log("Parsed Source Code:");
    console.log(stringifyTree(t.cursor(), source, 0));
    console.log("\n");
    return traverseProgram(t.cursor(), source);
}
exports.parse = parse;
function isFuncDef(c) {
    return c.type.name === 'FunctionDefinition';
}
exports.isFuncDef = isFuncDef;
function isClassDef(c) {
    return c.type.name === 'ClassDefinition';
}
exports.isClassDef = isClassDef;
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
// c is now in AssignStatement
function traverseVarInit(c, s) {
    c.firstChild(); // VariableName
    var tVar = traverseTypedVar(c, s);
    c.nextSibling(); // TypeDef
    c.nextSibling(); // AssignOp
    var literal = traverseLiteral(c, s); // Number
    c.parent();
    return { name: tVar.name, type: tVar.type, initLiteral: literal };
}
exports.traverseVarInit = traverseVarInit;
// There would be much more types (classes).
function node2type(c, s) {
    var typeStr = s.substring(c.from, c.to);
    switch (typeStr) {
        case 'int':
            return "int";
        case 'bool':
            return "bool";
        case 'None':
            return "None";
        default: // We'll check if the type exists in the type checker
            return {
                tag: "object",
                "class": typeStr
            };
        // throw new Error(`PARSE ERROR: unknown type ${typeStr}`);
    }
}
exports.node2type = node2type;
function traverseTypedVar(c, s) {
    var name = s.substring(c.from, c.to); // "VariableName"
    c.nextSibling(); // TypeDef
    c.firstChild(); // :
    c.nextSibling(); // VariableName
    var type = node2type(c, s);
    c.parent();
    return { name: name, type: type };
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
function traverseClassDef(c, s) {
    var cls = {
        tag: "class",
        name: "",
        fields: [],
        methods: []
    };
    c.firstChild(); // class node
    c.nextSibling(); // class name
    cls.name = s.substring(c.from, c.to); // assign class name
    c.nextSibling(); // "Arglist" => fixed to be object
    c.nextSibling(); // "Body"
    c.firstChild(); // ":"
    c.nextSibling(); // reach the fisrt statement in the body
    var code = traverseClassBody(c, s);
    cls.fields = code.varInits;
    cls.methods = code.funcDefs;
    c.parent(); // back to "Body"
    c.parent(); // back to "ClassDefinition"
    return cls;
}
exports.traverseClassDef = traverseClassDef;
function traverseMethDef(c, s) {
    var func = {
        name: "",
        params: null,
        retType: "None",
        varInits: null,
        stmts: null
    };
    c.firstChild(); // "def"
    c.nextSibling(); // method name
    func.name = s.substring(c.from, c.to);
    c.nextSibling(); // "ParamList" => at least 1 parameters (self)
    func.params = traverseMethParams(c, s);
    c.nextSibling(); // "TypeDef" or "Body"
    // check if the method provides a return type
    if (c.type.name === 'TypeDef') {
        c.firstChild();
        func.retType = node2type(c, s);
        c.parent();
        c.nextSibling(); // "Body"
    }
    c.firstChild(); // ":"
    c.nextSibling(); // the first body statement
    var code = traverseMethBody(c, s); // This line is the only difference
    func.varInits = code.varInits;
    func.stmts = code.stmts;
    c.parent(); // back to "Body"
    c.parent(); // back to "ClassDefinition"
    return func;
}
exports.traverseMethDef = traverseMethDef;
function traverseFuncDef(c, s) {
    var func = {
        name: "",
        params: null,
        retType: "None",
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
// similar to traverseFuncParams, but escape the self parameter
function traverseMethParams(c, s) {
    var params = [];
    c.firstChild(); // "("
    c.nextSibling(); // "self"
    c.nextSibling(); // "TypeDef"
    c.nextSibling(); // ","
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
function traverseClassBody(c, s) {
    var varInits = [];
    var funcDefs = [];
    do {
        if (isVarInit(c)) {
            varInits.push(traverseVarInit(c, s));
        }
        if (isFuncDef(c)) {
            funcDefs.push(traverseMethDef(c, s));
        }
    } while (c.nextSibling());
    // A class consists of variable initializations and method definitions.
    return { varInits: varInits, classDefs: [], funcDefs: funcDefs, stmts: [] };
}
// A method body consists variable definitions and statements.
function traverseMethBody(c, s) {
    var varInits = [];
    var stmts = [];
    // traverse variable initializations
    do {
        if (!isVarInit(c)) {
            break;
        }
        varInits.push(traverseVarInit(c, s));
    } while (c.nextSibling());
    // get all statement
    do {
        stmts.push(traverseStmt(c, s));
    } while (c.nextSibling());
    return { varInits: varInits, classDefs: [], stmts: stmts, funcDefs: [] };
}
function traverseFuncBody(c, s) {
    var varInits = [];
    var stmts = [];
    do {
        if (!isVarInit(c)) {
            break;
        }
        if (isFuncDef(c)) {
            throw new Error("PARSER ERRO: nested function definition is not allowed");
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
    return { varInits: varInits, classDefs: [], stmts: stmts, funcDefs: [] };
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
    var stmts = [];
    c.nextSibling();
    c.firstChild();
    c.nextSibling();
    do {
        stmts.push(traverseStmt(c, s));
    } while (c.nextSibling());
    c.parent();
    c.parent();
    return { tag: "while", cond: cond, stmts: stmts };
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
    // check if
    c.firstChild(); // if
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
