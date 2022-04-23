"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.compile = exports.setGlobalInfo = exports.createEmptyGlobalEnv = void 0;
var ast_1 = require("./ast");
var parser_1 = require("./parser");
var typecheck_1 = require("./typecheck");
function createEmptyGlobalEnv() {
    return {
        vars: new Map(),
        funcs: new Map(),
        loopDepth: 0
    };
}
exports.createEmptyGlobalEnv = createEmptyGlobalEnv;
function setGlobalInfo(program) {
    var globalEnv = createEmptyGlobalEnv();
    // set variables
    for (var idx = 0; idx < program.varInits.length; ++idx) {
        globalEnv.vars.set(program.varInits[idx].name, program.varInits[idx]);
    }
    // set funcstions
    for (var idx = 0; idx < program.funcDefs.length; ++idx) {
        globalEnv.funcs.set(program.funcDefs[idx].name, program.funcDefs[idx]);
    }
    return globalEnv;
}
exports.setGlobalInfo = setGlobalInfo;
function compile(source) {
    // parse program and get each elements
    var program = (0, typecheck_1.typeCheckProgram)((0, parser_1.parse)(source));
    var ast = program.stmts;
    var globalEnv = setGlobalInfo(program);
    // generate function definitaions
    var funcs = program.funcDefs.map(function (funcDef) {
        return codeGenFuncDef(funcDef, globalEnv);
    }).join('\n');
    // generate global variables
    var globalVars = codeGenGlobalVar(program.varInits).join('\n');
    // generate the code for the main body
    var commands = codeGenMainBody(ast, globalEnv);
    console.log(commands);
    // set up final function return type
    var lastExpr = ast[ast.length - 1];
    var returnType = "";
    var returnExpr = "";
    // console.log(`ast.length: ${ast.length}, lastExpr: ${lastExpr.tag}`);
    if (ast.length > 0 && lastExpr.tag === "expr") {
        returnType = "(result i32)";
        returnExpr = "(local.get $last)";
    }
    return {
        wasmSource: "".concat(globalVars, "\n").concat(funcs, "\n(func (export \"exported_func\") ").concat(returnType).concat(commands.join('\n')).concat(returnExpr, ")")
    };
}
exports.compile = compile;
function codeGen(stmt, globalEnv) {
    switch (stmt.tag) {
        case "assign":
            var valStmts = codeGenExpr(stmt.value, globalEnv);
            if (globalEnv.vars.has(stmt.name)) {
                return valStmts.concat(["(global.set $".concat(stmt.name, ")")]);
            }
            return valStmts.concat(["(local.set $".concat(stmt.name, ")")]);
        case "expr":
            var exprStmts = codeGenExpr(stmt.expr, globalEnv);
            return exprStmts.concat(["(local.set $last)"]);
        case "return":
            var returnStmts = codeGenExpr(stmt.expr, globalEnv);
            returnStmts.push("return");
            return returnStmts;
        case "pass":
            return ["nop"];
        case "while":
            var whileStmts = codeGenWhile(stmt, globalEnv);
            return whileStmts.concat();
        case "if":
            var ifStmts = codeGenIf(stmt, globalEnv);
            return ifStmts.concat();
    }
}
function codeGenMainBody(stmts, globalEnv) {
    // deal with the body statement of the program
    var definedVars = new Set();
    stmts.forEach(function (s) {
        switch (s.tag) {
            case "assign":
                definedVars.add(s.name);
                break;
        }
    });
    // declare all local variables according to the source
    var scratchVar = "(local $last i32)";
    var localDefines = [scratchVar];
    definedVars.forEach(function (v) {
        localDefines.push("(local $".concat(v, " i32)"));
    });
    var commandGroups = stmts.map(function (stmt) { return codeGen(stmt, globalEnv); });
    return localDefines.concat([].concat.apply([], commandGroups));
}
function codeGenExpr(expr, globalEnv) {
    switch (expr.tag) {
        case "id":
            return [codeGenId(expr, globalEnv)];
        case "binop":
            var leftStmts = codeGenExpr(expr.left, globalEnv);
            var rightStmts = codeGenExpr(expr.right, globalEnv);
            var opStmt = codeGenBinOp(expr.op);
            return __spreadArray(__spreadArray(__spreadArray([], leftStmts, true), rightStmts, true), [opStmt], false);
        case "uniop":
            var uniopRight = codeGenExpr(expr.expr, globalEnv);
            return codeGenUnionOp(expr.op, uniopRight);
        case "literal":
            return [codeGenLiteral(expr.literal)];
        case "call":
            return codeGenCall(expr, globalEnv);
    }
}
function codeGenBinOp(op) {
    switch (op) {
        case ast_1.BinOp.Plus:
            return "(i32.add)";
        case ast_1.BinOp.Minus:
            return "(i32.sub)";
        case ast_1.BinOp.Mul:
            return "(i32.mul)";
        case ast_1.BinOp.Div:
            return "(i32.div_s)";
        case ast_1.BinOp.Mod:
            return "(i32.rem_s)";
        case ast_1.BinOp.Eq:
            return "(i32.eq)";
        case ast_1.BinOp.Neq:
            return "(i32.ne)";
        case ast_1.BinOp.Seq:
            return "(i32.le_s)";
        case ast_1.BinOp.Leq:
            return "(i32.ge_s)";
        case ast_1.BinOp.Sml:
            return "(i32.lt_s)";
        case ast_1.BinOp.Lrg:
            return "(i32.gt_s)";
        case ast_1.BinOp.Is:
            // x is y 
            // e.g. y is a class and x is an object of that class
            // currently, the only class is None, so we can use eq
            // throw new Error("COMPILE ERROR: is operator not implemented")
            return "(i32.eq)";
    }
}
function codeGenUnionOp(op, right) {
    switch (op) {
        case ast_1.UniOp.Minus:
            return __spreadArray(__spreadArray(["(i32.const 0)"], right, true), ["(i32.sub) "], false);
        case ast_1.UniOp.Not:
            return __spreadArray(__spreadArray([], right, true), ["(i32.eqz)"], false);
    }
}
function codeGenIf(stmt, globalEnv) {
    if (stmt.tag !== 'if') {
        throw new Error("COMPILE ERROR: the input to codeGenIf should have tag if");
    }
    var ifCond = codeGenExpr(stmt.ifOp.cond, globalEnv).join('\n');
    var ifBody = codeGenBody(stmt.ifOp.stmts, globalEnv).join('\n');
    var elifCond = "(i32.const 0)";
    var elifBody = "nop";
    var elseBody = "nop";
    // has else if
    if (stmt.elifOp.cond !== null) {
        elifCond = codeGenExpr(stmt.elifOp.cond, globalEnv).join('\n');
        elifBody = codeGenBody(stmt.elifOp.stmts, globalEnv).join('\n');
    }
    if (stmt.elseOp.stmts !== null) {
        elseBody = codeGenBody(stmt.elseOp.stmts, globalEnv).join('\n');
    }
    return ["".concat(ifCond, "\n(if\n(then\n").concat(ifBody, "\n)\n(else\n").concat(elifCond, "\n(if\n(then\n").concat(elifBody, "\n)\n(else\n").concat(elseBody, "\n))))")];
}
function codeGenBody(stmts, globalEnv) {
    var body = stmts.map(function (s) {
        var b = codeGen(s, globalEnv);
        return b.join('\n');
    });
    return body;
}
function codeGenWhile(stmt, globalEnv) {
    if (stmt.tag !== "while") {
        throw new Error("COMPILE ERROR: codeGenWhile takes only while statement as input");
    }
    // throw new Error("COMPILE ERROR: while has not been implemented yet");
    var loopId = (globalEnv.loopDepth++);
    // command body
    var body = codeGenBody(stmt.stmts, globalEnv);
    // condition 
    var cond = codeGenExpr(stmt.cond, globalEnv);
    globalEnv.loopDepth--;
    return ["(loop \n".concat(body.join('\n'), "\n").concat(cond.join('\n'), "\nbr_if ").concat(loopId, ")")];
}
function codeGenCall(expr, globalEnv) {
    if (expr.tag !== 'call') {
        throw new Error("COMPILER ERROR: the input expression to codeGenCall should be call");
    }
    var codes = [];
    // collect arguments
    for (var idx = 0; idx < expr.args.length; ++idx) {
        var arg = expr.args[idx];
        codes = __spreadArray(__spreadArray([], codeGenExpr(arg, globalEnv), true), codes, true);
    }
    // call the function
    if (expr.name === 'print') {
        switch (expr.args[0].a) {
            case ast_1.Type.int:
                codes.push("(call $print_num)");
                break;
            case ast_1.Type.bool:
                codes.push("(call $print_bool)");
                break;
            case ast_1.Type.none:
                codes.push("(call $print_none)");
                break;
            default:
                throw new Error("COMPILE ERROR: unknow literal type");
        }
    }
    else {
        codes.push("(call $".concat(expr.name, ")"));
    }
    return codes;
}
function codeGenGlobalVar(varInits) {
    return varInits.map(function (varInit) {
        return "(global $".concat(varInit.name, " (mut i32) ").concat(codeGenLiteral(varInit.initLiteral), ")");
    });
}
function codeGenFuncDef(funcDef, globalEnv) {
    // params
    var params = funcDef.params.map(function (p) {
        return "(param $".concat(p.name, " i32)");
    }).join(' ');
    // init local variables
    var localVarInit = funcDef.varInits.map(function (v) {
        return "(local $".concat(v.name, " i32)\n(local.set $").concat(v.name, " ").concat(codeGenLiteral(v.initLiteral), ")");
    }).join('\n');
    // generate body statements
    var body = codeGenBody(funcDef.stmts, globalEnv);
    // return tge function definition in WASM
    return ["(func $".concat(funcDef.name, " ").concat(params, " (result i32)\n(local $last i32)\n").concat(localVarInit, "\n").concat(body.join('\n'), "\n(i32.const 0))")];
}
function codeGenLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return "(i32.const ".concat(literal.value, ")");
        case "bool":
            if (literal.value)
                return "(i32.const 1)";
            return "(i32.const 0)";
        case "none":
            return "(i32.const 0)";
    }
}
function codeGenId(id, globalEnv) {
    if (id.tag !== 'id') {
        throw new Error("COMPILE ERROR: input to codeGen Id should be an id expr");
    }
    if (globalEnv.vars.has(id.name)) {
        return "(global.get $".concat(id.name, ")");
    }
    return "(local.get $".concat(id.name, ")");
}
