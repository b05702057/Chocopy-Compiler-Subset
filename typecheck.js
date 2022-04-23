"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.typeCheckHasReturn = exports.typeCheckLiteral = exports.typeCheckParams = exports.typeCheckFuncDef = exports.typeCheckVarInit = exports.typeCheckCall = exports.typeCheckIf = exports.typeCheckWhile = exports.typeCheckUniOp = exports.typeCheckBinOp = exports.typeCheckExpr = exports.typeCheckStmts = exports.typeCheckProgram = exports.setupEnv = exports.newTypeEnv = exports.deepCopyVarEnv = void 0;
var ast_1 = require("./ast");
function deepCopyVarEnv(env) {
    return { vars: new Map(env.vars), funcs: new Map(env.funcs), retType: env.retType };
}
exports.deepCopyVarEnv = deepCopyVarEnv;
function newTypeEnv() {
    return { vars: new Map(),
        funcs: new Map(),
        retType: ast_1.Type.none };
}
exports.newTypeEnv = newTypeEnv;
function setupEnv(program) {
    var evn = newTypeEnv();
    // global variables
    program.varInits.forEach(function (v) {
        evn.vars.set(v.name, v.type);
    });
    // function definitions
    program.funcDefs.forEach(function (f) {
        evn.funcs.set(f.name, [f.params.map(function (p) { return p.type; }), f.retType]);
    });
    return evn;
}
exports.setupEnv = setupEnv;
function typeCheckProgram(prog) {
    var env = setupEnv(prog);
    var progTyped = {
        varInits: [],
        funcDefs: [],
        stmts: []
    };
    // check global variable
    progTyped.varInits = typeCheckVarInit(prog.varInits, env);
    // check function definitions
    progTyped.funcDefs = prog.funcDefs.map(function (f) { return typeCheckFuncDef(f, env); });
    // check main body
    progTyped.stmts = typeCheckStmts(prog.stmts, env);
    return progTyped;
}
exports.typeCheckProgram = typeCheckProgram;
function typeCheckStmts(stmts, env) {
    var typedStmts = [];
    stmts.forEach(function (stmt) {
        switch (stmt.tag) {
            case "assign": // e.g. a = 0
                if (!env.vars.has(stmt.name)) { // the variable should have been inited
                    throw new Error("TYPE ERROR: Not a variable ".concat(stmt.name));
                }
                var typedValue = typeCheckExpr(stmt.value, env);
                if (typedValue.a !== env.vars.get(stmt.name)) {
                    throw new Error("TYPE ERROR: Expected type ".concat(env.vars.get(stmt.name), "; got type ").concat(typedValue.a));
                }
                typedStmts.push(__assign(__assign({}, stmt), { a: ast_1.Type.none, value: typedValue }));
                break;
            case "expr":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push(__assign(__assign({}, stmt), { expr: typedExpr, a: ast_1.Type.none }));
                break;
            case "return":
                var typedRet = typeCheckExpr(stmt.expr, env);
                if (typedRet.a !== env.retType) {
                    throw new Error("TYPE ERROR: return expected type ".concat(env.retType, "; got type ").concat(typedRet.a));
                }
                typedStmts.push(__assign(__assign({}, stmt), { expr: typedRet, a: typedRet.a }));
                break;
            case "pass":
                typedStmts.push(__assign(__assign({}, stmt), { a: ast_1.Type.none }));
                break;
            case "while":
                var typedWhile = typeCheckWhile(stmt, env);
                typedStmts.push(__assign(__assign({}, typedWhile), { a: ast_1.Type.none }));
                break;
            case "if":
                var typedIf = typeCheckIf(stmt, env);
                typedStmts.push(__assign(__assign({}, typedIf), { a: ast_1.Type.none }));
                break;
        }
    });
    return typedStmts;
}
exports.typeCheckStmts = typeCheckStmts;
function typeCheckExpr(expr, env) {
    switch (expr.tag) {
        case "id": // if the variable has been defined 
            if (!env.vars.has(expr.name)) {
                throw new Error("TYPE ERROR: not a variable ".concat(expr.name));
            }
            var idType = env.vars.get(expr.name);
            return __assign(__assign({}, expr), { a: idType });
        case "binop":
            return typeCheckBinOp(expr, env);
        case "uniop":
            return typeCheckUniOp(expr, env);
        case "literal":
            return __assign(__assign({}, expr), { a: typeCheckLiteral(expr.literal).a });
        case "call":
            var typedCall = typeCheckCall(expr, env);
            return typedCall;
    }
}
exports.typeCheckExpr = typeCheckExpr;
function typeCheckBinOp(expr, env) {
    if (expr.tag != "binop") {
        throw new Error("TYPECHECK  ERROR: typeCheckBinOp only take binary operation");
    }
    switch (expr.op) {
        case ast_1.BinOp.Plus: // work for int
        case ast_1.BinOp.Minus:
        case ast_1.BinOp.Mul:
        case ast_1.BinOp.Div:
        case ast_1.BinOp.Mod:
        case ast_1.BinOp.Seq:
        case ast_1.BinOp.Leq:
        case ast_1.BinOp.Sml:
        case ast_1.BinOp.Lrg:
            var leftTyped = typeCheckExpr(expr.left, env);
            var rightTyped = typeCheckExpr(expr.right, env);
            if (leftTyped.a !== rightTyped.a || (leftTyped.a !== ast_1.Type.int || rightTyped.a != ast_1.Type.int)) {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTyped.a, "' and type '").concat(rightTyped.a, "'"));
            }
            if (expr.op === ast_1.BinOp.Seq || expr.op === ast_1.BinOp.Leq || expr.op === ast_1.BinOp.Sml || expr.op === ast_1.BinOp.Lrg) {
                return __assign(__assign({}, expr), { left: leftTyped, right: rightTyped, a: ast_1.Type.bool });
            }
            return __assign(__assign({}, expr), { left: leftTyped, right: rightTyped, a: ast_1.Type.int });
        case ast_1.BinOp.Eq: // wprk fpr both int and bool
        case ast_1.BinOp.Neq:
            var leftTypedEq = typeCheckExpr(expr.left, env);
            var rightTypedEq = typeCheckExpr(expr.right, env);
            if (leftTypedEq.a !== rightTypedEq.a) {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedEq.a, "' and type '").concat(rightTypedEq.a, "'"));
            }
            return __assign(__assign({}, expr), { left: leftTypedEq, right: rightTypedEq, a: ast_1.Type.bool });
        case ast_1.BinOp.Is: // work for none
            var leftTypedNone = typeCheckExpr(expr.left, env);
            var rightTypedNone = typeCheckExpr(expr.right, env);
            if (leftTypedNone.a !== ast_1.Type.none || rightTypedNone.a !== ast_1.Type.none) {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedNone.a, "' and type '").concat(rightTypedNone.a, "'"));
            }
            return __assign(__assign({}, expr), { left: leftTypedNone, right: rightTypedNone, a: ast_1.Type.bool });
    }
}
exports.typeCheckBinOp = typeCheckBinOp;
function typeCheckUniOp(expr, env) {
    if (expr.tag != "uniop") {
        throw new Error("TYPECHECK  ERROR: typeCheckUniOp only take binary operation");
    }
    // work for both (==, ) bool and int
    switch (expr.op) {
        case ast_1.UniOp.Minus:
            var typedExpr = typeCheckExpr(expr.expr, env);
            if (typedExpr.a !== ast_1.Type.int) {
                throw new Error("TYPECHECK ERROR: uniary operator ".concat(ast_1.UniOp.Minus, " expected ").concat(ast_1.Type.int, "; got type ").concat(typedExpr.a));
            }
            return __assign(__assign({}, expr), { expr: typedExpr, a: ast_1.Type.int });
        case ast_1.UniOp.Not:
            var notTypedExpr = typeCheckExpr(expr.expr, env);
            if (notTypedExpr.a !== ast_1.Type.bool) {
                throw new Error("TYPECHECK ERROR: uniary operator ".concat(ast_1.UniOp.Not, " expected ").concat(ast_1.Type.bool, "; got type ").concat(notTypedExpr.a));
            }
            return __assign(__assign({}, expr), { expr: typedExpr, a: ast_1.Type.bool });
        default:
            throw new Error("TYPECHECK ERROR: undefined unary operator ".concat(expr, ". This error should be called in parser"));
    }
}
exports.typeCheckUniOp = typeCheckUniOp;
function typeCheckWhile(stmt, env) {
    if (stmt.tag !== 'while') {
        throw new Error("TYPECHECK ERROR: the input statement should be while when calling typeCheckWhile");
    }
    var typedWhileCond = typeCheckExpr(stmt.cond, env);
    var typedWhileBody = typeCheckStmts(stmt.stmts, env);
    if (typedWhileCond.a !== ast_1.Type.bool) {
        throw new Error("TYPECHECK ERROR: Condtion expression cannot be of type '".concat(typedWhileCond.a, "'"));
    }
    return {
        a: ast_1.Type.none,
        tag: 'while',
        cond: typedWhileCond,
        stmts: typedWhileBody
    };
}
exports.typeCheckWhile = typeCheckWhile;
function typeCheckIf(stmt, env) {
    if (stmt.tag !== 'if') {
        throw new Error("TYPECHECK ERROR: the input statement should be if when calling typeCheckIf");
    }
    // check if
    var typedIfCond = typeCheckExpr(stmt.ifOp.cond, env);
    var typedIfBody = typeCheckStmts(stmt.ifOp.stmts, env);
    if (typedIfCond.a !== ast_1.Type.bool) {
        throw new Error("TYPECHECK ERROR: Condtion expression cannot be of type '".concat(typedIfCond.a, "'"));
    }
    // check elif
    var typedElifCond = null;
    var typedElifBody = null;
    if (stmt.elifOp.cond !== null) {
        typedElifCond = typeCheckExpr(stmt.elifOp.cond, env);
        typedElifBody = typeCheckStmts(stmt.elifOp.stmts, env);
        if (typedElifCond.a !== ast_1.Type.bool) {
            throw new Error("TYPECHECK ERROR: Condtion expression cannot be of type '".concat(typedElifCond.a, "'"));
        }
    }
    // check else:
    var tpyedElseBody = null;
    if (stmt.elseOp.stmts !== null) {
        tpyedElseBody = typeCheckStmts(stmt.elseOp.stmts, env);
    }
    return {
        a: ast_1.Type.none,
        tag: "if",
        ifOp: { cond: typedIfCond, stmts: typedIfBody },
        elifOp: { cond: typedElifCond, stmts: typedElifBody },
        elseOp: { stmts: tpyedElseBody }
    };
}
exports.typeCheckIf = typeCheckIf;
function typeCheckCall(expr, env) {
    if (expr.tag !== "call") {
        throw new Error("TYPECHECK ERROR: typeCheckCall only accept call as an input expr");
    }
    if (!env.funcs.has(expr.name)) {
        console.warn("TYPECHECK WARNING: the called function might be an imported one, so we cannot do any type check");
        var typedArgs_1 = expr.args.map(function (arg) {
            return typeCheckExpr(arg, env);
        });
        return __assign(__assign({}, expr), { args: typedArgs_1, a: ast_1.Type.none });
    }
    // check # params
    var params = env.funcs.get(expr.name)[0];
    var args = expr.args;
    if (args.length !== params.length) {
        throw new Error("TYPECHECK ERROR: call func ".concat(expr.name, "; expected ").concat(params.length, " arguments; got ").concat(args.length));
    }
    // check argument type
    var typedArgs = [];
    for (var idx = 0; idx < params.length; ++idx) {
        var typedArg = typeCheckExpr(args[idx], env);
        if (typedArg.a !== params[idx]) {
            throw new Error("TYPECHECK ERROR: call func ".concat(expr.name, "; expected type ").concat(params[idx], "; got type ").concat(typedArg.a, " in parameters ").concat(idx));
        }
        typedArgs.push(typedArg);
    }
    // throw new Error("TYPECHECK ERROR: typecheck on function call has not been implemented yet");
    return __assign(__assign({}, expr), { args: typedArgs, a: env.funcs.get(expr.name)[1] });
}
exports.typeCheckCall = typeCheckCall;
/*
 * Check the type of each variable initialization to make sure
 * the variable type is equal to the literal type
 */
function typeCheckVarInit(inits, env) {
    var typedInits = [];
    inits.forEach(function (init) {
        var typedLiteral = typeCheckLiteral(init.initLiteral);
        if (init.type !== typedLiteral.a) {
            throw Error("TYPE ERROR: init type does not match literal type");
        }
        env.vars.set(init.name, init.type);
        typedInits.push(__assign(__assign({}, init), { a: init.type, initLiteral: typedLiteral }));
    });
    return typedInits;
}
exports.typeCheckVarInit = typeCheckVarInit;
/*
 * Check the type of function definition:
 * (1) need to update the type var env before checking the func body
 * (2) need to check the statements
 * (3) the return type
 */
function typeCheckFuncDef(func, env) {
    var localEnv = deepCopyVarEnv(env);
    // add params to envs
    // check inits -> add to envs
    var typedParams = typeCheckParams(func.params);
    func.params.forEach(function (param) {
        localEnv.vars.set(param.name, param.type);
    });
    var localTypedInits = typeCheckVarInit(func.varInits, env);
    func.varInits.forEach(function (localTypedInit) {
        localEnv.vars.set(localTypedInit.name, localTypedInit.type);
    });
    // add function to env
    localEnv.funcs.set(func.name, [func.params.map(function (param) { return param.type; }), func.retType]);
    // add return type
    localEnv.retType = func.retType;
    // check body statements
    var typedStmts = typeCheckStmts(func.stmts, localEnv);
    // make sure every path has the expected return 
    if (!typeCheckHasReturn(func.stmts, env) && func.retType !== ast_1.Type.none) {
        throw new Error("TYPECHECK ERROR: All paths in function/method must have a return statement: ".concat(func.name));
    }
    return __assign(__assign({}, func), { params: typedParams, varInits: localTypedInits, stmts: typedStmts });
}
exports.typeCheckFuncDef = typeCheckFuncDef;
function typeCheckParams(params) {
    return params.map(function (p) { return __assign(__assign({}, p), { a: p.type }); });
}
exports.typeCheckParams = typeCheckParams;
function typeCheckLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return __assign(__assign({}, literal), { a: ast_1.Type.int });
        case "bool":
            return __assign(__assign({}, literal), { a: ast_1.Type.bool });
        case "none":
            return __assign(__assign({}, literal), { a: ast_1.Type.none });
    }
    return null;
}
exports.typeCheckLiteral = typeCheckLiteral;
/**
 * Yhis function is used to check whether this body argument has the
 * desired return value
 * @param body
 * @param env
 */
function typeCheckHasReturn(body, env) {
    for (var idx = 0; idx < body.length; ++idx) {
        var stmt = body[idx];
        switch (stmt.tag) {
            case "return":
                return true;
            case "if":
                var ifHasRet = typeCheckHasReturn(stmt.ifOp.stmts, env);
                if (stmt.elifOp.cond !== null) {
                    ifHasRet = ifHasRet && typeCheckHasReturn(stmt.elifOp.stmts, env);
                }
                if (stmt.elseOp.stmts !== null) {
                    ifHasRet = ifHasRet && typeCheckHasReturn(stmt.elseOp.stmts, env);
                }
                if (ifHasRet) {
                    return true;
                }
                continue;
            case "pass":
                return false;
            case "expr":
            case "assign":
            case "while":
                continue;
            default:
                throw new Error("TYPECHECK ERROR: typeCheckHasReturn meets unknown statement");
        }
    }
    return false;
}
exports.typeCheckHasReturn = typeCheckHasReturn;
