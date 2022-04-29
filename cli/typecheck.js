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
exports.typeCheckHasReturn = exports.typeCheckLiteral = exports.typeCheckParams = exports.typeCheckFuncDef = exports.typeCheckClassDef = exports.typeCheckVarInit = exports.typeCheckCall = exports.typeCheckMethod = exports.typeCheckField = exports.typeCheckIf = exports.typeCheckWhile = exports.typeCheckUniOp = exports.isObject = exports.isSameType = exports.typeCheckBinOp = exports.typeCheckExpr = exports.typeCheckStmts = exports.typeCheckProgram = exports.setupEnv = exports.newTypeEnv = exports.deepCopyVarEnv = void 0;
var ast_1 = require("./ast");
function deepCopyVarEnv(env) {
    return {
        vars: new Map(env.vars),
        classMethods: new Map(env.classMethods),
        classFields: new Map(env.classFields),
        funcs: new Map(env.funcs),
        retType: env.retType
    };
}
exports.deepCopyVarEnv = deepCopyVarEnv;
// initialize an environment sturcture
function newTypeEnv() {
    return {
        vars: new Map(),
        classMethods: new Map(),
        classFields: new Map(),
        funcs: new Map(),
        retType: "None"
    };
}
exports.newTypeEnv = newTypeEnv;
function setupEnv(program) {
    var evn = newTypeEnv();
    // global variables
    program.varInits.forEach(function (v) {
        evn.vars.set(v.name, v.type);
    });
    // class definitions
    program.classDefs.forEach(function (s) {
        if (s.tag !== "class") {
            throw Error("Error: TYPE ERROR: not a class");
        }
        // define the fields (name : type)
        var fields = s.fields;
        var fieldMap = new Map();
        fields.forEach(function (f) {
            fieldMap.set(f.name, f.type);
        });
        evn.classFields.set(s.name, fieldMap);
        // define the methods (name : args and return type)
        var methods = s.methods;
        var methodMap = new Map();
        methods.forEach(function (m) {
            methodMap.set(m.name, [m.params.map(function (p) { return p.type; }), m.retType]);
        });
        evn.classMethods.set(s.name, methodMap);
        // add the class initialization functions
        evn.funcs.set(s.name, [[], { tag: "object", "class": s.name }]);
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
        classDefs: [],
        funcDefs: [],
        stmts: []
    };
    // check global variable => The rhs values should have correct types
    progTyped.varInits = typeCheckVarInit(prog.varInits, env);
    // check class definitions
    progTyped.classDefs = prog.classDefs.map(function (c) { return typeCheckClassDef(c, env); });
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
                // If the stmt is an "id", we would check of the variable exists.
                // If the stmt is a "getfield", we would check recursively until it's an "id".
                var leftTypedValue = typeCheckExpr(stmt.name, env);
                var rightTypedValue = typeCheckExpr(stmt.value, env); // to get a
                if (!isSameType(leftTypedValue.a, rightTypedValue.a)) {
                    throw Error("Error: TYPE ERROR: Expected type ".concat(leftTypedValue.a, "; got type ").concat(rightTypedValue.a));
                }
                typedStmts.push(__assign(__assign({}, stmt), { a: "None", name: leftTypedValue, value: rightTypedValue }));
                break;
            case "expr":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push(__assign(__assign({}, stmt), { expr: typedExpr, a: "None" }));
                break;
            case "return":
                var typedRet = typeCheckExpr(stmt.expr, env);
                if (!isSameType(typedRet.a, env.retType)) {
                    throw new Error("Error: TYPE ERROR: return expected type ".concat(env.retType, "; got type ").concat(typedRet.a));
                }
                typedStmts.push(__assign(__assign({}, stmt), { expr: typedRet, a: typedRet.a })); // This can also be "None"
                break;
            case "pass":
                typedStmts.push(__assign(__assign({}, stmt), { a: "None" }));
                break;
            case "while":
                var typedWhile = typeCheckWhile(stmt, env);
                typedStmts.push(__assign(__assign({}, typedWhile), { a: "None" }));
                break;
            case "if":
                var typedIf = typeCheckIf(stmt, env);
                typedStmts.push(__assign(__assign({}, typedIf), { a: "None" }));
                break;
        }
    });
    return typedStmts;
}
exports.typeCheckStmts = typeCheckStmts;
function typeCheckExpr(expr, env) {
    switch (expr.tag) {
        case "id": // check if the variable has been defined 
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
        case "getfield":
            var typedGetfield = typeCheckField(expr, env);
            return typedGetfield;
        case "method":
            var typedMethod = typeCheckMethod(expr, env);
            return typedMethod;
    }
}
exports.typeCheckExpr = typeCheckExpr;
function typeCheckBinOp(expr, env) {
    if (expr.tag != "binop") {
        throw new Error("TYPECHECK  ERROR: typeCheckBinOp only take binary operation");
    }
    switch (expr.op) {
        // work for int
        case ast_1.BinOp.Plus:
        case ast_1.BinOp.Minus:
        case ast_1.BinOp.Mul:
        case ast_1.BinOp.Div:
        case ast_1.BinOp.Mod:
        case ast_1.BinOp.Seq:
        case ast_1.BinOp.Leq:
        case ast_1.BinOp.Sml:
        case ast_1.BinOp.Lrg:
            var leftTyped = typeCheckExpr(expr.left, env); // add the type to the left expression
            var rightTyped = typeCheckExpr(expr.right, env);
            if (!isSameType(leftTyped.a, rightTyped.a) || (leftTyped.a !== "int")) {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTyped.a, "' and type '").concat(rightTyped.a, "'"));
            }
            if (expr.op === ast_1.BinOp.Seq || expr.op === ast_1.BinOp.Leq || expr.op === ast_1.BinOp.Sml || expr.op === ast_1.BinOp.Lrg) {
                return __assign(__assign({}, expr), { left: leftTyped, right: rightTyped, a: "bool" });
            }
            return __assign(__assign({}, expr), { left: leftTyped, right: rightTyped, a: "int" });
        // work for both int and bool, but not None
        case ast_1.BinOp.Eq:
        case ast_1.BinOp.Neq:
            var leftTypedEq = typeCheckExpr(expr.left, env);
            var rightTypedEq = typeCheckExpr(expr.right, env);
            // filter out classes and "None"
            if (!isSameType(leftTypedEq.a, rightTypedEq.a) || isObject(leftTypedEq.a) || leftTypedEq.a == "None") {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedEq.a, "' and type '").concat(rightTypedEq.a, "'"));
            }
            return __assign(__assign({}, expr), { left: leftTypedEq, right: rightTypedEq, a: "bool" });
        // work for None and other classes
        case ast_1.BinOp.Is:
            var leftTypedIs = typeCheckExpr(expr.left, env);
            var rightTypedIs = typeCheckExpr(expr.right, env);
            if (leftTypedIs.a === "int" || leftTypedIs.a === "bool" || rightTypedIs.a === "int" || rightTypedIs.a === "bool") {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedIs.a, "' and type '").concat(rightTypedIs.a, "'"));
            }
            return __assign(__assign({}, expr), { left: leftTypedIs, right: rightTypedIs, a: "bool" });
    }
}
exports.typeCheckBinOp = typeCheckBinOp;
// should return true in the first statement if both are not objects
function isSameType(s, t) {
    if (s === t) {
        return true; // both "int", "bool", or "None"
    }
    else if (s === "int" || s === "bool") {
        return false;
    }
    else if (t === "int" || t === "bool") {
        return false;
    }
    else if (t === "None" || s === "None") { // "None" is the same type as any classes
        return true;
    }
    else {
        return (s.tag === t.tag && s["class"] === t["class"]); // both objects
    }
}
exports.isSameType = isSameType;
function isObject(s) {
    if (s === "int" || s === "bool" || s === "None") {
        return false;
    }
    return true;
}
exports.isObject = isObject;
function typeCheckUniOp(expr, env) {
    if (expr.tag != "uniop") {
        throw new Error("TYPECHECK  ERROR: typeCheckUniOp only take unary operations");
    }
    switch (expr.op) {
        // work for int
        case ast_1.UniOp.Minus:
            var typedExpr = typeCheckExpr(expr.expr, env);
            if (typedExpr.a !== "int") {
                throw new Error("TYPECHECK ERROR: uniary operator ".concat(ast_1.UniOp.Minus, " expected ").concat("int", "; got type ").concat(typedExpr.a));
            }
            return __assign(__assign({}, expr), { expr: typedExpr, a: "int" });
        // work for bool
        case ast_1.UniOp.Not:
            var notTypedExpr = typeCheckExpr(expr.expr, env);
            if (notTypedExpr.a !== "bool") {
                throw new Error("TYPECHECK ERROR: uniary operator ".concat(ast_1.UniOp.Not, " expected ").concat("bool", "; got type ").concat(notTypedExpr.a));
            }
            return __assign(__assign({}, expr), { expr: notTypedExpr, a: "bool" });
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
    if (typedWhileCond.a !== "bool") {
        throw new Error("TYPECHECK ERROR: Condtion expression cannot be of type '".concat(typedWhileCond.a, "'"));
    }
    return {
        a: "None",
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
    if (typedIfCond.a !== "bool") {
        throw new Error("TYPECHECK ERROR: Condtion expression cannot be of type '".concat(typedIfCond.a, "'"));
    }
    // check elif
    var typedElifCond = null;
    var typedElifBody = null;
    if (stmt.elifOp.cond !== null) {
        typedElifCond = typeCheckExpr(stmt.elifOp.cond, env);
        typedElifBody = typeCheckStmts(stmt.elifOp.stmts, env);
        if (typedElifCond.a !== "bool") {
            throw new Error("TYPECHECK ERROR: Condtion expression cannot be of type '".concat(typedElifCond.a, "'"));
        }
    }
    // check else:
    var tpyedElseBody = null;
    if (stmt.elseOp.stmts !== null) {
        tpyedElseBody = typeCheckStmts(stmt.elseOp.stmts, env);
    }
    return {
        a: "None",
        tag: "if",
        ifOp: { cond: typedIfCond, stmts: typedIfBody },
        elifOp: { cond: typedElifCond, stmts: typedElifBody },
        elseOp: { stmts: tpyedElseBody }
    };
}
exports.typeCheckIf = typeCheckIf;
function typeCheckField(expr, env) {
    if (expr.tag !== "getfield") {
        throw new Error("TYPECHECK ERROR: typeCheckMethod only accepts a getfield as an input expr");
    }
    var typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") { // cannot compile with isObject()
        throw new Error("TYPECHECK ERROR: Only objects can get fields.");
    }
    if (!env.classFields.has(typedObj.a["class"])) {
        throw new Error("TYPECHECK ERROR: The class doesn't exist.");
    }
    var classFields = env.classFields.get(typedObj.a["class"]);
    if (!classFields.has(expr.name)) {
        throw new Error("TYPECHECK ERROR: The field doesn't exist in the class.");
    }
    return __assign(__assign({}, expr), { obj: typedObj, a: classFields.get(expr.name) });
}
exports.typeCheckField = typeCheckField;
function typeCheckMethod(expr, env) {
    if (expr.tag !== "method") {
        throw new Error("TYPECHECK ERROR: typeCheckMethod only accepts a method as an input expr");
    }
    var typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") {
        throw new Error("TYPECHECK ERROR: Only classes can call methods.");
    }
    if (!env.classMethods.has(typedObj.a["class"])) {
        throw new Error("TYPECHECK ERROR: The class doesn't exist.");
    }
    var classMethods = env.classMethods.get(typedObj.a["class"]);
    if (!classMethods.has(expr.name)) {
        throw new Error("TYPECHECK ERROR: The method doesn't exist in the class.");
    }
    var _a = classMethods.get(expr.name), argTyps = _a[0], retTyp = _a[1];
    var typedArgs = expr.args.map(function (a) { return typeCheckExpr(a, env); });
    if (argTyps.length != typedArgs.length) { // We escaped "self" in the parser.
        throw new Error("TYPECHECK ERROR: The number of parameters is incorrect.");
    }
    argTyps.forEach(function (t, i) {
        if (!isSameType(t, typedArgs[i].a)) {
            throw new Error("TYPECHECK ERROR: incorrect parameter type");
        }
    });
    return __assign(__assign({}, expr), { obj: typedObj, args: typedArgs, a: retTyp });
}
exports.typeCheckMethod = typeCheckMethod;
function typeCheckCall(expr, env) {
    if (expr.tag !== "call") {
        throw new Error("TYPECHECK ERROR: typeCheckCall only accept a call as an input expr");
    }
    if (!env.funcs.has(expr.name)) {
        console.warn("TYPECHECK WARNING: If the ".concat(expr.name, " function is an imported one, we don't do any type check.")); // ex. print()
        var typedArgs_1 = expr.args.map(function (arg) {
            return typeCheckExpr(arg, env);
        });
        return __assign(__assign({}, expr), { args: typedArgs_1, a: "None" });
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
    return __assign(__assign({}, expr), { args: typedArgs, a: env.funcs.get(expr.name)[1] }); // use the return type
}
exports.typeCheckCall = typeCheckCall;
// make sure the variable type is equal to the literal type
function typeCheckVarInit(inits, env) {
    var typedInits = [];
    var scopeVar = new Set();
    inits.forEach(function (init) {
        // check if the left hand type equals to the right hand type
        // ex. x:int and 1
        var typedLiteral = typeCheckLiteral(init.initLiteral);
        if (!isSameType(init.type, typedLiteral.a) && !(isObject(init.type) && typedLiteral.a === "None")) { // ex. r1 : Rat = None
            throw Error("Error: TYPE ERROR: init type does not match literal type");
        }
        typedInits.push(__assign(__assign({}, init), { a: init.type, initLiteral: typedLiteral })); // add the types to VarInit
    });
    return typedInits;
}
exports.typeCheckVarInit = typeCheckVarInit;
/*
Check the type of class definition:
(1) add the class variables
(2) check each function
*/
function typeCheckClassDef(cls, env) {
    if (cls.tag !== "class") {
        throw new Error("This is not a class statement.");
    }
    // The methods in the class can access the global variables.
    var localEnv = deepCopyVarEnv(env); // include global variables in the local environment
    // check variable initializations
    var localTypedInits = typeCheckVarInit(cls.fields, localEnv); // check the type
    cls.fields.forEach(function (localTypedInit) {
        localEnv.vars.set("self." + localTypedInit.name, localTypedInit.type); // to distinguish self.a from a
    }); // add variables to the environment
    localEnv.vars.set("self", { tag: "object", "class": cls.name }); // add the "self" variable to the environment
    // check method definitions
    var localTypedMethods = cls.methods.map(function (m) { return typeCheckFuncDef(m, localEnv); }); // use the same function
    return __assign(__assign({}, cls), { a: "None", fields: localTypedInits, methods: localTypedMethods }); // A class definition doesn't require an "a".
}
exports.typeCheckClassDef = typeCheckClassDef;
/*
 * Check the type of function definition:
 * (1) need to update the type var env before checking the func body
 * (2) need to check the statements
 * (3) the return type
 */
function typeCheckFuncDef(func, env) {
    // The global variables are included in the local environment.
    var localEnv = deepCopyVarEnv(env);
    // add params to envs
    var scopeVar = new Set(); // We need this because localEnv contains global variables.
    var typedParams = typeCheckParams(func.params);
    func.params.forEach(function (param) {
        // Params are added first to check duplicate initializations.
        if (scopeVar.has(param.name)) {
            throw Error("duplicate param declaration in the same field");
        }
        scopeVar.add(param.name);
        localEnv.vars.set(param.name, param.type);
    });
    // check inits -> add to envs
    var localTypedInits = typeCheckVarInit(func.varInits, localEnv);
    func.varInits.forEach(function (localTypedInit) {
        if (scopeVar.has(localTypedInit.name)) {
            throw Error("duplicate init declaration in the same field");
        }
        scopeVar.add(localTypedInit.name);
        localEnv.vars.set(localTypedInit.name, localTypedInit.type);
    });
    // add return type
    localEnv.retType = func.retType;
    // check body statements
    var typedStmts = typeCheckStmts(func.stmts, localEnv);
    // make sure every path has the expected return 
    if (!typeCheckHasReturn(func.stmts, env) && func.retType !== "None") {
        throw new Error("TYPECHECK ERROR: All paths in function/method must have a return statement: ".concat(func.name));
    }
    return __assign(__assign({}, func), { params: typedParams, varInits: localTypedInits, stmts: typedStmts });
}
exports.typeCheckFuncDef = typeCheckFuncDef;
// simply assign the type to a
function typeCheckParams(params) {
    return params.map(function (p) { return __assign(__assign({}, p), { a: p.type }); });
}
exports.typeCheckParams = typeCheckParams;
// The tags of literals are their types.
function typeCheckLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return __assign(__assign({}, literal), { a: "int" });
        case "bool":
            return __assign(__assign({}, literal), { a: "bool" });
        case "none":
            return __assign(__assign({}, literal), { a: "None" });
    }
}
exports.typeCheckLiteral = typeCheckLiteral;
/**
 * This function is used to check whether this body argument has the
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
                // check if the above conditions are met
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
