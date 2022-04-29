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
exports.compile = exports.setGlobalInfo = exports.createEmptyGlobalEnv = exports.createEmptyLocalEnv = void 0;
var ast_1 = require("./ast");
var parser_1 = require("./parser");
var typecheck_1 = require("./typecheck");
function createEmptyLocalEnv() {
    return {
        vars: new Map(),
        isFunc: false
    };
}
exports.createEmptyLocalEnv = createEmptyLocalEnv;
function createEmptyGlobalEnv() {
    return {
        vars: new Map(),
        funcs: new Map(),
        classIndexes: new Map(),
        classInits: new Map(),
        loopDepth: 0
    };
}
exports.createEmptyGlobalEnv = createEmptyGlobalEnv;
// set up global variables and global functions
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
    // set class field indexes and init value
    for (var idx = 0; idx < program.classDefs.length; idx++) {
        var classIndexes = new Map();
        var classInits = new Map();
        var classDef = program.classDefs[idx];
        if (classDef.tag !== "class") {
            throw Error("should be a class");
        }
        var fields = classDef.fields;
        for (var idx2 = 0; idx2 < fields.length; idx2++) {
            classIndexes.set(fields[idx2].name, idx2);
            classInits.set(fields[idx2].name, fields[idx2].initLiteral);
        }
        var className = classDef.name;
        globalEnv.classIndexes.set(className, classIndexes);
        globalEnv.classInits.set(className, classInits);
    }
    return globalEnv;
}
exports.setGlobalInfo = setGlobalInfo;
function compile(source) {
    // parse program and get each elements
    var program = (0, typecheck_1.typeCheckProgram)((0, parser_1.parse)(source));
    var ast = program.stmts;
    var globalEnv = setGlobalInfo(program);
    // generate function definitions
    var funcs = program.funcDefs.map(function (funcDef) {
        return codeGenFuncDef(funcDef, globalEnv);
    }).join('\n');
    // generate global variables (including the heap)
    var globalVars = codeGenGlobalVar(program.varInits).join('\n');
    // generate class definitions
    var classes = program.classDefs.map(function (classDef) {
        return codeGenClassDef(classDef, globalEnv); // not sure why its return is stringp[]
    }).join("\n");
    // create an empty local environment
    var localEnv = createEmptyLocalEnv();
    // generate the code for the main body
    var commands = codeGenMainBody(ast, globalEnv, localEnv);
    // console.log(commands);
    // set up final function return type
    var lastExpr = ast[ast.length - 1];
    var returnType = "";
    var returnExpr = "";
    // console.log(`ast.length: ${ast.length}, lastExpr: ${lastExpr.tag}`);
    if (ast.length > 0 && lastExpr.tag === "expr") {
        returnType = "(result i32)";
        returnExpr = "\n(local.get $last)"; // Since we use a function at the end, we need to put the return value in the stack.
    }
    // The last value is not needed if the last statement is not an expression.
    return {
        wasmSource: "".concat(globalVars, "\n").concat(classes, "\n").concat(funcs, "\n(func (export \"exported_func\") ").concat(returnType).concat(commands.join('\n')).concat(returnExpr, ")")
    };
}
exports.compile = compile;
// generate codes for statements
function codeGen(stmt, globalEnv, localEnv) {
    switch (stmt.tag) {
        case "assign":
            var valStmts = codeGenExpr(stmt.value, globalEnv, localEnv); // rhs
            var leftExpr = codeGenExpr(stmt.name, globalEnv, localEnv); // lhs
            // generate the "store" assign code
            if (stmt.name.tag == "getfield") {
                leftExpr = leftExpr.slice(0, -1); // strip `i32.load` since it's lhs
                return leftExpr.concat([valStmts + "\ni32.store"]);
            }
            else { // generate the "set" assign code
                if (localEnv.isFunc) {
                    if (localEnv.vars.has(stmt.variable)) {
                        return valStmts.concat(["(local.set $".concat(stmt.name, ")")]);
                    }
                    // We cannot assign a value to a global variable in the function environment.
                    throw new Error("The global variable ".concat(stmt.variable, " cannot be assigned in a function"));
                }
            }
            return valStmts.concat(["(global.set $".concat(stmt.variable, ")")]); // global environment
        case "expr":
            var exprStmts = codeGenExpr(stmt.expr, globalEnv, localEnv);
            return exprStmts.concat(["(local.set $last)"]);
        // Without the return command, the function would return the values in the stack.
        // However, we would need to make sure the #stack elements == #return values
        case "return":
            var returnStmts = codeGenExpr(stmt.expr, globalEnv, localEnv);
            returnStmts.push("(return)");
            return returnStmts;
        case "pass":
            return ["nop"]; // no operation
        case "while":
            var whileStmts = codeGenWhile(stmt, globalEnv, localEnv);
            return whileStmts.concat();
        case "if":
            var ifStmts = codeGenIf(stmt, globalEnv, localEnv);
            return ifStmts.concat();
    }
}
function codeGenMainBody(stmts, globalEnv, localEnv) {
    // declare all local variables according to the source
    var scratchVar = "(local $last i32)"; // as function output
    // put $last on the stack, and it wil consume the top value on the stack eventually
    var localDefines = [scratchVar];
    var commandGroups = stmts.map(function (stmt) { return codeGen(stmt, globalEnv, localEnv); });
    return localDefines.concat([].concat.apply([], commandGroups));
}
function codeGenExpr(expr, globalEnv, localEnv) {
    switch (expr.tag) {
        case "id":
            return [codeGenId(expr, globalEnv, localEnv)];
        case "binop":
            var leftStmts = codeGenExpr(expr.left, globalEnv, localEnv);
            var rightStmts = codeGenExpr(expr.right, globalEnv, localEnv);
            var opStmt = codeGenBinOp(expr.op);
            return __spreadArray(__spreadArray(__spreadArray([], leftStmts, true), rightStmts, true), [opStmt], false);
        case "uniop":
            var uniopRight = codeGenExpr(expr.expr, globalEnv, localEnv);
            return codeGenUnionOp(expr.op, uniopRight);
        case "literal":
            return [codeGenLiteral(expr.literal)];
        case "call":
            return codeGenCall(expr, globalEnv, localEnv);
        case "method":
            var argInstrs = expr.args.map(function (a) { return codeGenExpr(a, globalEnv, localEnv); });
            var flattenArgs_1 = []; // flat the list of lists
            argInstrs.forEach(function (arg) { return flattenArgs_1.push(arg.join("\n")); });
            if (expr.obj.a == "int" || expr.obj.a == "bool" || expr.obj.a == "None") {
                throw Error("This should be a class.");
            }
            // The call object is the first argument self.
            var callObject = codeGenExpr(expr.obj, globalEnv, localEnv).join("\n");
            return [callObject, flattenArgs_1.join("\n"), "\n(call $$".concat(expr.obj.a["class"], "$").concat(expr.name, ")")];
        case "getfield":
            return codeGenField(expr, globalEnv, localEnv);
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
            // For other classes, we should compare the field recursively.
            // In Chocopy, "is" is used to compare the fields in two class objects, and "==" cannot be used with classes. 
            return "(i32.eq)";
    }
}
function codeGenUnionOp(op, right) {
    switch (op) {
        case ast_1.UniOp.Minus:
            return __spreadArray(__spreadArray(["(i32.const 0)"], right, true), ["(i32.sub) "], false); // -x = 0 - x
        case ast_1.UniOp.Not:
            return __spreadArray(__spreadArray([], right, true), ["(i32.eqz)"], false); // is x != 0, return 1; else, return 0
    }
}
function codeGenIf(stmt, globalEnv, localEnv) {
    if (stmt.tag !== 'if') {
        throw new Error("COMPILE ERROR: the input to codeGenIf should have tag if");
    }
    var ifCond = codeGenExpr(stmt.ifOp.cond, globalEnv, localEnv).join('\n');
    var ifBody = codeGenBody(stmt.ifOp.stmts, globalEnv, localEnv).join('\n');
    var elifCond = "(i32.const 0)";
    var elifBody = "nop";
    var elseBody = "nop";
    // has else if
    if (stmt.elifOp.cond !== null) {
        elifCond = codeGenExpr(stmt.elifOp.cond, globalEnv, localEnv).join('\n');
        elifBody = codeGenBody(stmt.elifOp.stmts, globalEnv, localEnv).join('\n');
    }
    if (stmt.elseOp.stmts !== null) {
        elseBody = codeGenBody(stmt.elseOp.stmts, globalEnv, localEnv).join('\n');
    }
    return ["".concat(ifCond, "\n(if\n(then\n").concat(ifBody, "\n)\n(else\n").concat(elifCond, "\n(if\n(then\n").concat(elifBody, "\n)\n(else\n").concat(elseBody, "\n))))")];
}
// generate the codes for statements
function codeGenBody(stmts, globalEnv, localEnv) {
    var body = stmts.map(function (s) {
        var b = codeGen(s, globalEnv, localEnv);
        return b.join('\n');
    });
    return body;
}
function codeGenWhile(stmt, globalEnv, localEnv) {
    if (stmt.tag !== "while") {
        throw new Error("COMPILE ERROR: codeGenWhile takes only while statement as input");
    }
    // throw new Error("COMPILE ERROR: while has not been implemented yet");
    var loopId = (globalEnv.loopDepth++);
    // command body
    var body = codeGenBody(stmt.stmts, globalEnv, localEnv);
    // condition 
    var cond = codeGenExpr(stmt.cond, globalEnv, localEnv);
    globalEnv.loopDepth--;
    return ["(loop \n".concat(body.join('\n'), "\n").concat(cond.join('\n'), "\nbr_if ").concat(loopId, ")")];
}
function codeGenField(expr, globalEnv, localEnv) {
    if (expr.tag !== 'getfield') {
        throw Error("COMPILER ERROR: The input expression to codeGenCall should be getfield.");
    }
    if (expr.obj.a === "int" || expr.obj.a === "bool" || expr.obj.a === "None") {
        throw Error("COMPILER ERROR: The object should be a class.");
    }
    // If it is an instance, it should return its address, ex. (global.get $r1).
    var objAddr = codeGenExpr(expr.obj, globalEnv, localEnv);
    var checkValidAddress = __spreadArray(__spreadArray([], objAddr, true), ["(i32.const -4) \n(i32.add)", "(i32.load)", "local.set $last"], false); // c : Rat = None, c.x
    var classIndexes = globalEnv.classIndexes.get(expr.obj.a["class"]);
    var indexOfField = classIndexes.get(expr.name);
    return __spreadArray(__spreadArray([checkValidAddress.join("\n")], objAddr, true), ["(i32.const ".concat(indexOfField * 4, ") \n(i32.add)"), "(i32.load)"], false);
}
function codeGenCall(expr, globalEnv, localEnv) {
    if (expr.tag !== "call") {
        throw new Error("COMPILER ERROR: The input expression to codeGenCall should be call.");
    }
    // address the case of an init call, ex. r1 = Rat().
    if (globalEnv.classInits.has(expr.name)) {
        // variable initializations
        var initVals_1 = [];
        var classInits_1 = globalEnv.classInits.get(expr.name); // get the initializing values of a class
        var classIndexes = globalEnv.classIndexes.get(expr.name); // get the field indexes of a class
        classIndexes.forEach(function (index, field) {
            var offset = index * 4;
            initVals_1 = __spreadArray(__spreadArray([], initVals_1, true), [
                "(global.get $heap)",
                "(i32.const ".concat(offset, ")"),
                "(i32.add)",
                codeGenLiteral(classInits_1.get(field)),
                "(i32.store)"
            ], false);
        });
        // We have to modify the address of the heap, so the next class can use it.
        initVals_1 = __spreadArray(__spreadArray([], initVals_1, true), [
            "(global.get $heap)",
            "(global.get $heap)",
            "(i32.const ".concat(classIndexes.size * 4, ")"),
            "(i32.add)",
            "(global.set $heap)",
        ], false);
        var initFuncName = "$$".concat(expr.name, "$__init__)");
        if (globalEnv.funcs.has(initFuncName)) {
            initVals_1.push("(call $$".concat(expr.name, "$__init__)")); // execute the __init__ operations
        }
        return initVals_1;
    }
    var codes = [];
    // collect arguments
    for (var idx = 0; idx < expr.args.length; ++idx) {
        var arg = expr.args[idx];
        codes = __spreadArray(__spreadArray([], codes, true), codeGenExpr(arg, globalEnv, localEnv), true);
    }
    // call the function
    if (expr.name === 'print') {
        if (expr.args[0].a !== "int" && expr.args[0].a !== "bool" && expr.args[0].a !== "None") {
            codes.push("(call $print_num)");
        }
        else {
            switch (expr.args[0].a) {
                case "int":
                    codes.push("(call $print_num)");
                    break;
                case "bool":
                    codes.push("(call $print_bool)");
                    break;
                case "None":
                    codes.push("(call $print_none)");
                    break;
                default:
                    // The code can still compile if it's a class, and an error will occur at runtime.
                    codes.push("(call $print_num)");
            }
        }
    }
    else {
        codes.push("(call $".concat(expr.name, ")"));
    }
    return codes;
}
function codeGenGlobalVar(varInits) {
    var varInitWasm = varInits.map(function (varInit) {
        return "(global $".concat(varInit.name, " (mut i32) ").concat(codeGenLiteral(varInit.initLiteral), ")");
    });
    varInitWasm.push("(global $heap (mut i32) (i32.const 4))\n"); // initialize the heap for classes
    return varInitWasm;
}
/*
def get_field_a(self : Rat):
  return self.a
*/
function codeGenClassDef(classDef, globalEnv) {
    if (classDef.tag !== "class") {
        throw Error("can only generate codes for classes");
    }
    var classWasm = [];
    // add all the fields functions (simply return the value)
    classDef.fields.forEach(function (f) {
        // To return self.a, we need the address of self, and the index of a.
        var params = [{
                a: {
                    tag: "object",
                    "class": classDef.name
                },
                name: "self",
                type: classDef.a
            }]; // ex. self : Rat
        var varInits = []; // no variable initializations
        var getfieldObj = {
            a: {
                tag: "object",
                "class": classDef.name
            },
            tag: "id",
            name: "self"
        }; // ex. r1
        var getfieldExpr = { a: f.a, tag: "getfield", obj: getfieldObj, name: f.name };
        var stmts = [{ a: "None", tag: "return", expr: getfieldExpr }];
        var funcDef = {
            name: "$".concat(classDef.name, "$get_field_").concat(f.name),
            params: params,
            retType: f.a,
            varInits: varInits,
            stmts: stmts
        };
        codeGenFuncDef(funcDef, globalEnv).forEach(function (funcWasm) {
            classWasm.push(funcWasm);
        });
    });
    // add all the method functions
    classDef.methods.forEach(function (m) {
        var funcDef = __assign(__assign({}, m), { name: "$".concat(classDef.name, "$").concat(m.name) }); // Another "$" would be added later.
        // add a return statement to the init function
        if (m.name == "__init__") {
            funcDef.stmts.push({
                a: "None",
                tag: "return",
                expr: {
                    a: { tag: "object", "class": classDef.name },
                    tag: "id",
                    name: "self"
                }
            });
        }
        // We remove "self" in the parser and add it back here.
        funcDef.params = __spreadArray([{
                a: {
                    tag: "object",
                    "class": classDef.name
                },
                name: "self",
                type: classDef.a
            }], funcDef.params, true);
        // funcDef.params.push({ 
        //   a: { 
        //     tag: "object", 
        //     class: classDef.name 
        //   }, 
        //   name: "self", 
        //   type: classDef.a 
        // });
        codeGenFuncDef(funcDef, globalEnv).forEach(function (funcWasm) {
            classWasm.push(funcWasm);
        });
    });
    return classWasm.join("\n");
}
function codeGenFuncDef(funcDef, globalEnv) {
    // prepare the local environment
    var localEnv = createEmptyLocalEnv();
    localEnv.isFunc = true;
    funcDef.params.map(function (p) {
        localEnv.vars.set(p.name, true);
    });
    funcDef.varInits.map(function (v) {
        localEnv.vars.set(v.name, true);
    });
    // params
    var params = funcDef.params.map(function (p) {
        return "(param $".concat(p.name, " i32)");
    }).join(' ');
    // init local variables
    var localVarInit = funcDef.varInits.map(function (v) {
        return "(local $".concat(v.name, " i32)\n(local.set $").concat(v.name, " ").concat(codeGenLiteral(v.initLiteral), ")");
    }).join('\n');
    // generate body statements
    var body = codeGenBody(funcDef.stmts, globalEnv, localEnv);
    // return tge function definition in WASM
    // return [`\n(func $${funcDef.name} ${params} (result i32) ${localVarInit}\n${body.join('\n')})`]
    // return [`(func $${funcDef.name} ${params} (result i32)\n(local $last i32)\n${localVarInit}\n${body.join('\n')}\n(i32.const 0))`]
    return ["(func $".concat(funcDef.name, " ").concat(params, " (result i32)\n(local $last i32)").concat(localVarInit, "\n").concat(body.join('\n'), "\n(i32.const 0))\n")];
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
// should use local environment instead of global environment
function codeGenId(id, GlocalEnv, localEnv) {
    if (id.tag !== 'id') {
        throw new Error("COMPILE ERROR: input to codeGen Id should be an id expr");
    }
    // The type checker has already make sure the variable is defined.
    if (localEnv.vars.has(id.name)) {
        return "(local.get $".concat(id.name, ")");
    }
    return "(global.get $".concat(id.name, ")");
}
