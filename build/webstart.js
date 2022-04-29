/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./ast.ts":
/*!****************!*\
  !*** ./ast.ts ***!
  \****************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BinOp": () => (/* binding */ BinOp),
/* harmony export */   "UniOp": () => (/* binding */ UniOp)
/* harmony export */ });
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
})(BinOp || (BinOp = {}));
var UniOp;
(function (UniOp) {
    UniOp["Minus"] = "-";
    UniOp["Not"] = "not";
})(UniOp || (UniOp = {}));


/***/ }),

/***/ "./compiler.ts":
/*!*********************!*\
  !*** ./compiler.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "compile": () => (/* binding */ compile),
/* harmony export */   "createEmptyGlobalEnv": () => (/* binding */ createEmptyGlobalEnv),
/* harmony export */   "createEmptyLocalEnv": () => (/* binding */ createEmptyLocalEnv),
/* harmony export */   "setGlobalInfo": () => (/* binding */ setGlobalInfo)
/* harmony export */ });
/* harmony import */ var _ast__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ast */ "./ast.ts");
/* harmony import */ var _parser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./parser */ "./parser.ts");
/* harmony import */ var _typecheck__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./typecheck */ "./typecheck.ts");
var __assign = (undefined && undefined.__assign) || function () {
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
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};



function createEmptyLocalEnv() {
    return {
        vars: new Map(),
        isFunc: false,
    };
}
function createEmptyGlobalEnv() {
    return {
        vars: new Map(),
        funcs: new Map(),
        classIndexes: new Map(),
        classInits: new Map(),
        loopDepth: 0
    };
}
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
function compile(source) {
    // parse program and get each elements
    var program = (0,_typecheck__WEBPACK_IMPORTED_MODULE_2__.typeCheckProgram)((0,_parser__WEBPACK_IMPORTED_MODULE_1__.parse)(source));
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
            var objAddr = codeGenExpr(expr.obj, globalEnv, localEnv);
            var checkValidAddress = __spreadArray(__spreadArray([], objAddr, true), ["(i32.const -4) \n(i32.add)", "(i32.load)", "local.set $last"], false); // c : Rat = None, c.x
            return [checkValidAddress.join("\n"), objAddr.join("\n"), flattenArgs_1.join("\n"), "\n(call $$".concat(expr.obj.a.class, "$").concat(expr.name, ")")];
        case "getfield":
            return codeGenField(expr, globalEnv, localEnv);
    }
}
function codeGenBinOp(op) {
    switch (op) {
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Plus:
            return "(i32.add)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Minus:
            return "(i32.sub)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Mul:
            return "(i32.mul)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Div:
            return "(i32.div_s)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Mod:
            return "(i32.rem_s)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Eq:
            return "(i32.eq)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Neq:
            return "(i32.ne)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Seq:
            return "(i32.le_s)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Leq:
            return "(i32.ge_s)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Sml:
            return "(i32.lt_s)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Lrg:
            return "(i32.gt_s)";
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Is:
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
        case _ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Minus:
            return __spreadArray(__spreadArray(["(i32.const 0)"], right, true), ["(i32.sub) "], false); // -x = 0 - x
        case _ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Not:
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
    var classIndexes = globalEnv.classIndexes.get(expr.obj.a.class);
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
                    class: classDef.name
                },
                name: "self",
                type: classDef.a
            }]; // ex. self : Rat
        var varInits = []; // no variable initializations
        var getfieldObj = {
            a: {
                tag: "object",
                class: classDef.name
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
                    a: { tag: "object", class: classDef.name },
                    tag: "id",
                    name: "self"
                }
            });
        }
        // We remove "self" in the parser and add it back here.
        funcDef.params = __spreadArray([{
                a: {
                    tag: "object",
                    class: classDef.name
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


/***/ }),

/***/ "./parser.ts":
/*!*******************!*\
  !*** ./parser.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isClassDef": () => (/* binding */ isClassDef),
/* harmony export */   "isFuncDef": () => (/* binding */ isFuncDef),
/* harmony export */   "isVarInit": () => (/* binding */ isVarInit),
/* harmony export */   "node2type": () => (/* binding */ node2type),
/* harmony export */   "parse": () => (/* binding */ parse),
/* harmony export */   "stringifyTree": () => (/* binding */ stringifyTree),
/* harmony export */   "traverseArgs": () => (/* binding */ traverseArgs),
/* harmony export */   "traverseClassDef": () => (/* binding */ traverseClassDef),
/* harmony export */   "traverseExpr": () => (/* binding */ traverseExpr),
/* harmony export */   "traverseFuncDef": () => (/* binding */ traverseFuncDef),
/* harmony export */   "traverseLiteral": () => (/* binding */ traverseLiteral),
/* harmony export */   "traverseMethDef": () => (/* binding */ traverseMethDef),
/* harmony export */   "traverseProgram": () => (/* binding */ traverseProgram),
/* harmony export */   "traverseStmt": () => (/* binding */ traverseStmt),
/* harmony export */   "traverseTypedVar": () => (/* binding */ traverseTypedVar),
/* harmony export */   "traverseVarInit": () => (/* binding */ traverseVarInit)
/* harmony export */ });
/* harmony import */ var lezer_python__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lezer-python */ "./node_modules/lezer-python/dist/index.es.js");
/* harmony import */ var _ast__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ast */ "./ast.ts");


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
        case "None":
            return { tag: "literal", literal: { tag: "none" } };
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
            c.parent();
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
        case "ParenthesizedExpression":
            c.firstChild(); // visit "("
            c.nextSibling(); // visit the inner expression
            var expr = traverseExpr(c, s);
            c.parent;
            return expr;
        default:
            // console.log(stringifyTree(c, s, 2));
            throw new Error("PARSE ERROR: Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
    }
}
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
            throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
    }
}
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
function parse(source) {
    var t = lezer_python__WEBPACK_IMPORTED_MODULE_0__.parser.parse(source);
    // console.log("Parsed Source Code:");
    // console.log(stringifyTree(t.cursor(), source, 0));
    // console.log("\n");
    return traverseProgram(t.cursor(), source);
}
function isFuncDef(c) {
    return c.type.name === 'FunctionDefinition';
}
function isClassDef(c) {
    return c.type.name === 'ClassDefinition';
}
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
                class: typeStr
            };
        // throw new Error(`PARSE ERROR: unknown type ${typeStr}`);
    }
}
function traverseTypedVar(c, s) {
    var name = s.substring(c.from, c.to); // "VariableName"
    c.nextSibling(); // TypeDef
    c.firstChild(); // :
    c.nextSibling(); // VariableName
    var type = node2type(c, s);
    c.parent();
    return { name: name, type: type };
}
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
function traverseClassDef(c, s) {
    var cls = {
        tag: "class",
        name: "",
        fields: [],
        methods: [], // class functions
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
            return _ast__WEBPACK_IMPORTED_MODULE_1__.UniOp.Minus;
        case "not":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.UniOp.Not;
    }
    throw new Error("PARSE ERROR: unsupported uniary operator");
}
function str2binop(opStr) {
    switch (opStr) {
        case "+":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Plus;
        case "-":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Minus;
        case "*":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Mul;
        case "//":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Div;
        case "%":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Mod;
        case "==":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Eq;
        case "!=":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Neq;
        case "<=":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Seq;
        case ">=":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Leq;
        case "<":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Sml;
        case ">":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Lrg;
        case "is":
            return _ast__WEBPACK_IMPORTED_MODULE_1__.BinOp.Is;
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
            stmts: null,
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


/***/ }),

/***/ "./runner.ts":
/*!*******************!*\
  !*** ./runner.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "runwatsrc": () => (/* binding */ runwatsrc)
/* harmony export */ });
/* harmony import */ var wabt__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! wabt */ "wabt");
/* harmony import */ var wabt__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(wabt__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _compiler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./compiler */ "./compiler.ts");
/* harmony import */ var _parser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./parser */ "./parser.ts");
// This is a mashup of tutorials from:
//
// - https://github.com/AssemblyScript/wabt.js/
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};



// NOTE(joe): This is a hack to get the CLI Repl to run. WABT registers a global
// uncaught exn handler, and this is not allowed when running the REPL
// (https://nodejs.org/api/repl.html#repl_global_uncaught_exceptions). No reason
// is given for this in the docs page, and I haven't spent time on the domain
// module to figure out what's going on here. It doesn't seem critical for WABT
// to have this support, so we patch it away.
if (typeof process !== "undefined") {
    var oldProcessOn_1 = process.on;
    process.on = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args[0] === "uncaughtException") {
            return;
        }
        else {
            return oldProcessOn_1.apply(process, args);
        }
    };
}
function runwatsrc(source, config) {
    return __awaiter(this, void 0, void 0, function () {
        var wabtInterface, parsed, returnType, returnExpr, compiled, importObject, wasmSource, myModule, asBinary, wasmModule, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, wabt__WEBPACK_IMPORTED_MODULE_0___default()()];
                case 1:
                    wabtInterface = _a.sent();
                    parsed = (0,_parser__WEBPACK_IMPORTED_MODULE_2__.parse)(source).stmts;
                    returnType = "";
                    returnExpr = "";
                    compiled = _compiler__WEBPACK_IMPORTED_MODULE_1__.compile(source);
                    importObject = config.importObject;
                    wasmSource = "(module\n    (func $print_num (import \"imports\" \"print_num\") (param i32) (result i32))\n    (func $print_bool (import \"imports\" \"print_bool\") (param i32) (result i32))\n    (func $print_none (import \"imports\" \"print_none\") (param i32) (result i32))\n    (func $print (import \"imports\" \"print\") (param i32) (result i32))\n    (func $abs (import \"imports\" \"abs\") (param i32) (result i32))\n    (func $max (import \"imports\" \"max\") (param i32) (param i32) (result i32))\n    (func $min (import \"imports\" \"min\") (param i32) (param i32) (result i32))\n    (func $pow (import \"imports\" \"pow\") (param i32) (param i32) (result i32))\n    (memory (import \"imports\" \"mem\") 1)\n    ".concat(compiled.wasmSource, "\n  )");
                    console.log("wasmSource: ".concat(wasmSource));
                    myModule = wabtInterface.parseWat("test.wat", wasmSource);
                    asBinary = myModule.toBinary({});
                    return [4 /*yield*/, WebAssembly.instantiate(asBinary.buffer, importObject)];
                case 2:
                    wasmModule = _a.sent();
                    result = wasmModule.instance.exports.exported_func();
                    return [2 /*return*/, result];
            }
        });
    });
}


/***/ }),

/***/ "./typecheck.ts":
/*!**********************!*\
  !*** ./typecheck.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "deepCopyVarEnv": () => (/* binding */ deepCopyVarEnv),
/* harmony export */   "isObject": () => (/* binding */ isObject),
/* harmony export */   "isSameType": () => (/* binding */ isSameType),
/* harmony export */   "newTypeEnv": () => (/* binding */ newTypeEnv),
/* harmony export */   "setupEnv": () => (/* binding */ setupEnv),
/* harmony export */   "typeCheckBinOp": () => (/* binding */ typeCheckBinOp),
/* harmony export */   "typeCheckCall": () => (/* binding */ typeCheckCall),
/* harmony export */   "typeCheckClassDef": () => (/* binding */ typeCheckClassDef),
/* harmony export */   "typeCheckExpr": () => (/* binding */ typeCheckExpr),
/* harmony export */   "typeCheckField": () => (/* binding */ typeCheckField),
/* harmony export */   "typeCheckFuncDef": () => (/* binding */ typeCheckFuncDef),
/* harmony export */   "typeCheckHasReturn": () => (/* binding */ typeCheckHasReturn),
/* harmony export */   "typeCheckIf": () => (/* binding */ typeCheckIf),
/* harmony export */   "typeCheckLiteral": () => (/* binding */ typeCheckLiteral),
/* harmony export */   "typeCheckMethod": () => (/* binding */ typeCheckMethod),
/* harmony export */   "typeCheckParams": () => (/* binding */ typeCheckParams),
/* harmony export */   "typeCheckProgram": () => (/* binding */ typeCheckProgram),
/* harmony export */   "typeCheckStmts": () => (/* binding */ typeCheckStmts),
/* harmony export */   "typeCheckUniOp": () => (/* binding */ typeCheckUniOp),
/* harmony export */   "typeCheckVarInit": () => (/* binding */ typeCheckVarInit),
/* harmony export */   "typeCheckWhile": () => (/* binding */ typeCheckWhile)
/* harmony export */ });
/* harmony import */ var _ast__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ast */ "./ast.ts");
var __assign = (undefined && undefined.__assign) || function () {
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

function deepCopyVarEnv(env) {
    return {
        vars: new Map(env.vars),
        classMethods: new Map(env.classMethods),
        classFields: new Map(env.classFields),
        funcs: new Map(env.funcs),
        retType: env.retType
    };
}
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
        evn.funcs.set(s.name, [[], { tag: "object", class: s.name }]);
    });
    // function definitions
    program.funcDefs.forEach(function (f) {
        evn.funcs.set(f.name, [f.params.map(function (p) { return p.type; }), f.retType]);
    });
    return evn;
}
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
function typeCheckBinOp(expr, env) {
    if (expr.tag != "binop") {
        throw new Error("TYPECHECK  ERROR: typeCheckBinOp only take binary operation");
    }
    switch (expr.op) {
        // work for int
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Plus:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Minus:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Mul:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Div:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Mod:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Seq:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Leq:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Sml:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Lrg:
            var leftTyped = typeCheckExpr(expr.left, env); // add the type to the left expression
            var rightTyped = typeCheckExpr(expr.right, env);
            if (!isSameType(leftTyped.a, rightTyped.a) || (leftTyped.a !== "int")) {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTyped.a, "' and type '").concat(rightTyped.a, "'"));
            }
            if (expr.op === _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Seq || expr.op === _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Leq || expr.op === _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Sml || expr.op === _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Lrg) {
                return __assign(__assign({}, expr), { left: leftTyped, right: rightTyped, a: "bool" });
            }
            return __assign(__assign({}, expr), { left: leftTyped, right: rightTyped, a: "int" });
        // work for both int and bool, but not None
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Eq:
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Neq:
            var leftTypedEq = typeCheckExpr(expr.left, env);
            var rightTypedEq = typeCheckExpr(expr.right, env);
            // filter out classes and "None"
            if (!isSameType(leftTypedEq.a, rightTypedEq.a) || isObject(leftTypedEq.a) || leftTypedEq.a == "None") {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedEq.a, "' and type '").concat(rightTypedEq.a, "'"));
            }
            return __assign(__assign({}, expr), { left: leftTypedEq, right: rightTypedEq, a: "bool" });
        // work for None and other classes
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Is:
            var leftTypedIs = typeCheckExpr(expr.left, env);
            var rightTypedIs = typeCheckExpr(expr.right, env);
            if (leftTypedIs.a === "int" || leftTypedIs.a === "bool" || rightTypedIs.a === "int" || rightTypedIs.a === "bool") {
                throw new Error("TYPECHECK ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedIs.a, "' and type '").concat(rightTypedIs.a, "'"));
            }
            return __assign(__assign({}, expr), { left: leftTypedIs, right: rightTypedIs, a: "bool" });
    }
}
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
        return (s.tag === t.tag && s.class === t.class); // both objects
    }
}
function isObject(s) {
    if (s === "int" || s === "bool" || s === "None") {
        return false;
    }
    return true;
}
function typeCheckUniOp(expr, env) {
    if (expr.tag != "uniop") {
        throw new Error("TYPECHECK  ERROR: typeCheckUniOp only take unary operations");
    }
    switch (expr.op) {
        // work for int
        case _ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Minus:
            var typedExpr = typeCheckExpr(expr.expr, env);
            if (typedExpr.a !== "int") {
                throw new Error("TYPECHECK ERROR: uniary operator ".concat(_ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Minus, " expected ").concat("int", "; got type ").concat(typedExpr.a));
            }
            return __assign(__assign({}, expr), { expr: typedExpr, a: "int" });
        // work for bool
        case _ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Not:
            var notTypedExpr = typeCheckExpr(expr.expr, env);
            if (notTypedExpr.a !== "bool") {
                throw new Error("TYPECHECK ERROR: uniary operator ".concat(_ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Not, " expected ").concat("bool", "; got type ").concat(notTypedExpr.a));
            }
            return __assign(__assign({}, expr), { expr: notTypedExpr, a: "bool" });
        default:
            throw new Error("TYPECHECK ERROR: undefined unary operator ".concat(expr, ". This error should be called in parser"));
    }
}
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
function typeCheckField(expr, env) {
    if (expr.tag !== "getfield") {
        throw new Error("TYPECHECK ERROR: typeCheckMethod only accepts a getfield as an input expr");
    }
    var typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") { // cannot compile with isObject()
        throw new Error("TYPECHECK ERROR: Only objects can get fields.");
    }
    if (!env.classFields.has(typedObj.a.class)) {
        throw new Error("TYPECHECK ERROR: The class doesn't exist.");
    }
    var classFields = env.classFields.get(typedObj.a.class);
    if (!classFields.has(expr.name)) {
        throw new Error("TYPECHECK ERROR: The field doesn't exist in the class.");
    }
    return __assign(__assign({}, expr), { obj: typedObj, a: classFields.get(expr.name) });
}
function typeCheckMethod(expr, env) {
    if (expr.tag !== "method") {
        throw new Error("TYPECHECK ERROR: typeCheckMethod only accepts a method as an input expr");
    }
    var typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") {
        throw new Error("TYPECHECK ERROR: Only classes can call methods.");
    }
    if (!env.classMethods.has(typedObj.a.class)) {
        throw new Error("TYPECHECK ERROR: The class doesn't exist.");
    }
    var classMethods = env.classMethods.get(typedObj.a.class);
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
    localEnv.vars.set("self", { tag: "object", class: cls.name }); // add the "self" variable to the environment
    // check method definitions
    var localTypedMethods = cls.methods.map(function (m) { return typeCheckFuncDef(m, localEnv); }); // use the same function
    return __assign(__assign({}, cls), { a: "None", fields: localTypedInits, methods: localTypedMethods }); // A class definition doesn't require an "a".
}
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
// simply assign the type to a
function typeCheckParams(params) {
    return params.map(function (p) { return __assign(__assign({}, p), { a: p.type }); });
}
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


/***/ }),

/***/ "wabt":
/*!***********************!*\
  !*** external "wabt" ***!
  \***********************/
/***/ ((module) => {

module.exports = wabt;

/***/ }),

/***/ "./node_modules/lezer-python/dist/index.es.js":
/*!****************************************************!*\
  !*** ./node_modules/lezer-python/dist/index.es.js ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "parser": () => (/* binding */ parser)
/* harmony export */ });
/* harmony import */ var lezer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lezer */ "./node_modules/lezer/dist/index.es.js");


// This file was generated by lezer-generator. You probably shouldn't edit it.
const printKeyword = 1,
  indent = 162,
  dedent = 163,
  newline$1 = 164,
  newlineBracketed = 165,
  newlineEmpty = 166,
  eof = 167,
  ParenthesizedExpression = 21,
  TupleExpression = 47,
  ComprehensionExpression = 48,
  ArrayExpression = 52,
  ArrayComprehensionExpression = 55,
  DictionaryExpression = 56,
  DictionaryComprehensionExpression = 59,
  SetExpression = 60,
  SetComprehensionExpression = 61,
  ArgList = 63,
  ParamList = 121;

const newline = 10, carriageReturn = 13, space = 32, tab = 9, hash = 35, parenOpen = 40, dot = 46;

const bracketed = [
  ParenthesizedExpression, TupleExpression, ComprehensionExpression, ArrayExpression, ArrayComprehensionExpression,
  DictionaryExpression, DictionaryComprehensionExpression, SetExpression, SetComprehensionExpression, ArgList, ParamList
];

let cachedIndent = 0, cachedInput = null, cachedPos = 0;
function getIndent(input, pos) {
  if (pos == cachedPos && input == cachedInput) return cachedIndent
  cachedInput = input; cachedPos = pos;
  return cachedIndent = getIndentInner(input, pos)
}

function getIndentInner(input, pos) {
  for (let indent = 0;; pos++) {
    let ch = input.get(pos);
    if (ch == space) indent++;
    else if (ch == tab) indent += 8 - (indent % 8);
    else if (ch == newline || ch == carriageReturn || ch == hash) return -1
    else return indent
  }
}

const newlines = new lezer__WEBPACK_IMPORTED_MODULE_0__.ExternalTokenizer((input, token, stack) => {
  let next = input.get(token.start);
  if (next < 0) {
    token.accept(eof, token.start);
  } else if (next != newline && next != carriageReturn) ; else if (stack.startOf(bracketed) != null) {
    token.accept(newlineBracketed, token.start + 1);
  } else if (getIndent(input, token.start + 1) < 0) {
    token.accept(newlineEmpty, token.start + 1);
  } else {
    token.accept(newline$1, token.start + 1);
  }
}, {contextual: true, fallback: true});

const indentation = new lezer__WEBPACK_IMPORTED_MODULE_0__.ExternalTokenizer((input, token, stack) => {
  let prev = input.get(token.start - 1), depth;
  if ((prev == newline || prev == carriageReturn) &&
      (depth = getIndent(input, token.start)) >= 0 &&
      depth != stack.context.depth &&
      stack.startOf(bracketed) == null)
    token.accept(depth < stack.context.depth ? dedent : indent, token.start);
});

function IndentLevel(parent, depth) {
  this.parent = parent;
  this.depth = depth;
  this.hash = (parent ? parent.hash + parent.hash << 8 : 0) + depth + (depth << 4);
}

const topIndent = new IndentLevel(null, 0);

const trackIndent = new lezer__WEBPACK_IMPORTED_MODULE_0__.ContextTracker({
  start: topIndent,
  shift(context, term, input, stack) {
    return term == indent ? new IndentLevel(context, getIndent(input, stack.pos)) :
      term == dedent ? context.parent : context
  },
  hash(context) { return context.hash }
});

const legacyPrint = new lezer__WEBPACK_IMPORTED_MODULE_0__.ExternalTokenizer((input, token) => {
  let pos = token.start;
  for (let print = "print", i = 0; i < print.length; i++, pos++)
    if (input.get(pos) != print.charCodeAt(i)) return
  let end = pos;
  if (/\w/.test(String.fromCharCode(input.get(pos)))) return
  for (;; pos++) {
    let next = input.get(pos);
    if (next == space || next == tab) continue
    if (next != parenOpen && next != dot && next != newline && next != carriageReturn && next != hash)
      token.accept(printKeyword, end);
    return
  }
});

// This file was generated by lezer-generator. You probably shouldn't edit it.
const spec_identifier = {__proto__:null,await:40, or:48, and:50, in:54, not:56, is:58, if:64, else:66, lambda:70, yield:88, from:90, async:98, for:100, None:152, True:154, False:154, del:168, pass:172, break:176, continue:180, return:184, raise:192, import:196, as:198, global:202, nonlocal:204, assert:208, elif:218, while:222, try:228, except:230, finally:232, with:236, def:240, class:250};
const parser = lezer__WEBPACK_IMPORTED_MODULE_0__.Parser.deserialize({
  version: 13,
  states: "!?|O`Q$IXOOO%cQ$I[O'#GaOOQ$IS'#Cm'#CmOOQ$IS'#Cn'#CnO'RQ$IWO'#ClO(tQ$I[O'#G`OOQ$IS'#Ga'#GaOOQ$IS'#DR'#DROOQ$IS'#G`'#G`O)bQ$IWO'#CqO)rQ$IWO'#DbO*SQ$IWO'#DfOOQ$IS'#Ds'#DsO*gO`O'#DsO*oOpO'#DsO*wO!bO'#DtO+SO#tO'#DtO+_O&jO'#DtO+jO,UO'#DtO-lQ$I[O'#GQOOQ$IS'#GQ'#GQO'RQ$IWO'#GPO/OQ$I[O'#GPOOQ$IS'#E]'#E]O/gQ$IWO'#E^OOQ$IS'#GO'#GOO/qQ$IWO'#F}OOQ$IV'#F}'#F}O/|Q$IWO'#FPOOQ$IS'#Fr'#FrO0RQ$IWO'#FOOOQ$IV'#HZ'#HZOOQ$IV'#F|'#F|OOQ$IT'#FR'#FRQ`Q$IXOOO'RQ$IWO'#CoO0aQ$IWO'#CzO0hQ$IWO'#DOO0vQ$IWO'#GeO1WQ$I[O'#EQO'RQ$IWO'#EROOQ$IS'#ET'#ETOOQ$IS'#EV'#EVOOQ$IS'#EX'#EXO1lQ$IWO'#EZO2SQ$IWO'#E_O/|Q$IWO'#EaO2gQ$I[O'#EaO/|Q$IWO'#EdO/gQ$IWO'#EgO/gQ$IWO'#EkO/gQ$IWO'#EnO2rQ$IWO'#EpO2yQ$IWO'#EuO3UQ$IWO'#EqO/gQ$IWO'#EuO/|Q$IWO'#EwO/|Q$IWO'#E|OOQ$IS'#Cc'#CcOOQ$IS'#Cd'#CdOOQ$IS'#Ce'#CeOOQ$IS'#Cf'#CfOOQ$IS'#Cg'#CgOOQ$IS'#Ch'#ChOOQ$IS'#Cj'#CjO'RQ$IWO,58|O'RQ$IWO,58|O'RQ$IWO,58|O'RQ$IWO,58|O'RQ$IWO,58|O'RQ$IWO,58|O3ZQ$IWO'#DmOOQ$IS,5:W,5:WO3nQ$IWO,5:ZO3{Q%1`O,5:ZO4QQ$I[O,59WO0aQ$IWO,59_O0aQ$IWO,59_O0aQ$IWO,59_O6pQ$IWO,59_O6uQ$IWO,59_O6|Q$IWO,59gO7TQ$IWO'#G`O8ZQ$IWO'#G_OOQ$IS'#G_'#G_OOQ$IS'#DX'#DXO8rQ$IWO,59]O'RQ$IWO,59]O9QQ$IWO,59]O9VQ$IWO,5:PO'RQ$IWO,5:POOQ$IS,59|,59|O9eQ$IWO,59|O9jQ$IWO,5:VO'RQ$IWO,5:VO'RQ$IWO,5:TOOQ$IS,5:Q,5:QO9{Q$IWO,5:QO:QQ$IWO,5:UOOOO'#FZ'#FZO:VO`O,5:_OOQ$IS,5:_,5:_OOOO'#F['#F[O:_OpO,5:_O:gQ$IWO'#DuOOOO'#F]'#F]O:wO!bO,5:`OOQ$IS,5:`,5:`OOOO'#F`'#F`O;SO#tO,5:`OOOO'#Fa'#FaO;_O&jO,5:`OOOO'#Fb'#FbO;jO,UO,5:`OOQ$IS'#Fc'#FcO;uQ$I[O,5:dO>gQ$I[O,5<kO?QQ%GlO,5<kO?qQ$I[O,5<kOOQ$IS,5:x,5:xO@YQ$IXO'#FkOAiQ$IWO,5;TOOQ$IV,5<i,5<iOAtQ$I[O'#HWOB]Q$IWO,5;kOOQ$IS-E9p-E9pOOQ$IV,5;j,5;jO3PQ$IWO'#EwOOQ$IT-E9P-E9POBeQ$I[O,59ZODlQ$I[O,59fOEVQ$IWO'#GbOEbQ$IWO'#GbO/|Q$IWO'#GbOEmQ$IWO'#DQOEuQ$IWO,59jOEzQ$IWO'#GfO'RQ$IWO'#GfO/gQ$IWO,5=POOQ$IS,5=P,5=PO/gQ$IWO'#D|OOQ$IS'#D}'#D}OFiQ$IWO'#FeOFyQ$IWO,58zOGXQ$IWO,58zO)eQ$IWO,5:jOG^Q$I[O'#GhOOQ$IS,5:m,5:mOOQ$IS,5:u,5:uOGqQ$IWO,5:yOHSQ$IWO,5:{OOQ$IS'#Fh'#FhOHbQ$I[O,5:{OHpQ$IWO,5:{OHuQ$IWO'#HYOOQ$IS,5;O,5;OOITQ$IWO'#HVOOQ$IS,5;R,5;RO3UQ$IWO,5;VO3UQ$IWO,5;YOIfQ$I[O'#H[O'RQ$IWO'#H[OIpQ$IWO,5;[O2rQ$IWO,5;[O/gQ$IWO,5;aO/|Q$IWO,5;cOIuQ$IXO'#ElOKOQ$IZO,5;]ONaQ$IWO'#H]O3UQ$IWO,5;aONlQ$IWO,5;cONqQ$IWO,5;hO!#fQ$I[O1G.hO!#mQ$I[O1G.hO!&^Q$I[O1G.hO!&hQ$I[O1G.hO!)RQ$I[O1G.hO!)fQ$I[O1G.hO!)yQ$IWO'#GnO!*XQ$I[O'#GQO/gQ$IWO'#GnO!*cQ$IWO'#GmOOQ$IS,5:X,5:XO!*kQ$IWO,5:XO!*pQ$IWO'#GoO!*{Q$IWO'#GoO!+`Q$IWO1G/uOOQ$IS'#Dq'#DqOOQ$IS1G/u1G/uOOQ$IS1G.y1G.yO!,`Q$I[O1G.yO!,gQ$I[O1G.yO0aQ$IWO1G.yO!-SQ$IWO1G/ROOQ$IS'#DW'#DWO/gQ$IWO,59qOOQ$IS1G.w1G.wO!-ZQ$IWO1G/cO!-kQ$IWO1G/cO!-sQ$IWO1G/dO'RQ$IWO'#GgO!-xQ$IWO'#GgO!-}Q$I[O1G.wO!._Q$IWO,59fO!/eQ$IWO,5=VO!/uQ$IWO,5=VO!/}Q$IWO1G/kO!0SQ$I[O1G/kOOQ$IS1G/h1G/hO!0dQ$IWO,5=QO!1ZQ$IWO,5=QO/gQ$IWO1G/oO!1xQ$IWO1G/qO!1}Q$I[O1G/qO!2_Q$I[O1G/oOOQ$IS1G/l1G/lOOQ$IS1G/p1G/pOOOO-E9X-E9XOOQ$IS1G/y1G/yOOOO-E9Y-E9YO!2oQ$IWO'#GzO/gQ$IWO'#GzO!2}Q$IWO,5:aOOOO-E9Z-E9ZOOQ$IS1G/z1G/zOOOO-E9^-E9^OOOO-E9_-E9_OOOO-E9`-E9`OOQ$IS-E9a-E9aO!3YQ%GlO1G2VO!3yQ$I[O1G2VO'RQ$IWO,5<OOOQ$IS,5<O,5<OOOQ$IS-E9b-E9bOOQ$IS,5<V,5<VOOQ$IS-E9i-E9iOOQ$IV1G0o1G0oO/|Q$IWO'#FgO!4bQ$I[O,5=rOOQ$IS1G1V1G1VO!4yQ$IWO1G1VOOQ$IS'#DS'#DSO/gQ$IWO,5<|OOQ$IS,5<|,5<|O!5OQ$IWO'#FSO!5ZQ$IWO,59lO!5cQ$IWO1G/UO!5mQ$I[O,5=QOOQ$IS1G2k1G2kOOQ$IS,5:h,5:hO!6^Q$IWO'#GPOOQ$IS,5<P,5<POOQ$IS-E9c-E9cO!6oQ$IWO1G.fOOQ$IS1G0U1G0UO!6}Q$IWO,5=SO!7_Q$IWO,5=SO/gQ$IWO1G0eO/gQ$IWO1G0eO/|Q$IWO1G0gOOQ$IS-E9f-E9fO!7pQ$IWO1G0gO!7{Q$IWO1G0gO!8QQ$IWO,5=tO!8`Q$IWO,5=tO!8nQ$IWO,5=qO!9UQ$IWO,5=qO!9gQ$IZO1G0qO!<uQ$IZO1G0tO!@QQ$IWO,5=vO!@[Q$IWO,5=vO!@dQ$I[O,5=vO/gQ$IWO1G0vO!@nQ$IWO1G0vO3UQ$IWO1G0{ONlQ$IWO1G0}OOQ$IV,5;W,5;WO!@sQ$IYO,5;WO!@xQ$IZO1G0wO!DZQ$IWO'#FoO3UQ$IWO1G0wO3UQ$IWO1G0wO!DhQ$IWO,5=wO!DuQ$IWO,5=wO/|Q$IWO,5=wOOQ$IV1G0{1G0{O!D}Q$IWO'#EyO!E`Q%1`O1G0}OOQ$IV1G1S1G1SO3UQ$IWO1G1SOOQ$IS,5=Y,5=YOOQ$IS'#Dn'#DnO/gQ$IWO,5=YO!EhQ$IWO,5=XO!E{Q$IWO,5=XOOQ$IS1G/s1G/sO!FTQ$IWO,5=ZO!FeQ$IWO,5=ZO!FmQ$IWO,5=ZO!GQQ$IWO,5=ZO!GbQ$IWO,5=ZOOQ$IS7+%a7+%aOOQ$IS7+$e7+$eO!5cQ$IWO7+$mO!ITQ$IWO1G.yO!I[Q$IWO1G.yOOQ$IS1G/]1G/]OOQ$IS,5;p,5;pO'RQ$IWO,5;pOOQ$IS7+$}7+$}O!IcQ$IWO7+$}OOQ$IS-E9S-E9SOOQ$IS7+%O7+%OO!IsQ$IWO,5=RO'RQ$IWO,5=ROOQ$IS7+$c7+$cO!IxQ$IWO7+$}O!JQQ$IWO7+%OO!JVQ$IWO1G2qOOQ$IS7+%V7+%VO!JgQ$IWO1G2qO!JoQ$IWO7+%VOOQ$IS,5;o,5;oO'RQ$IWO,5;oO!JtQ$IWO1G2lOOQ$IS-E9R-E9RO!KkQ$IWO7+%ZOOQ$IS7+%]7+%]O!KyQ$IWO1G2lO!LhQ$IWO7+%]O!LmQ$IWO1G2rO!L}Q$IWO1G2rO!MVQ$IWO7+%ZO!M[Q$IWO,5=fO!MrQ$IWO,5=fO!MrQ$IWO,5=fO!NQO!LQO'#DwO!N]OSO'#G{OOOO1G/{1G/{O!NbQ$IWO1G/{O!NjQ%GlO7+'qO# ZQ$I[O1G1jP# tQ$IWO'#FdOOQ$IS,5<R,5<ROOQ$IS-E9e-E9eOOQ$IS7+&q7+&qOOQ$IS1G2h1G2hOOQ$IS,5;n,5;nOOQ$IS-E9Q-E9QOOQ$IS7+$p7+$pO#!RQ$IWO,5<kO#!lQ$IWO,5<kO#!}Q$I[O,5;qO##bQ$IWO1G2nOOQ$IS-E9T-E9TOOQ$IS7+&P7+&PO##rQ$IWO7+&POOQ$IS7+&R7+&RO#$QQ$IWO'#HXO/|Q$IWO7+&RO#$fQ$IWO7+&ROOQ$IS,5<U,5<UO#$qQ$IWO1G3`OOQ$IS-E9h-E9hOOQ$IS,5<Q,5<QO#%PQ$IWO1G3]OOQ$IS-E9d-E9dO#%gQ$IZO7+&]O!DZQ$IWO'#FmO3UQ$IWO7+&]O3UQ$IWO7+&`O#(uQ$I[O,5<YO'RQ$IWO,5<YO#)PQ$IWO1G3bOOQ$IS-E9l-E9lO#)ZQ$IWO1G3bO3UQ$IWO7+&bO/gQ$IWO7+&bOOQ$IV7+&g7+&gO!E`Q%1`O7+&iO#)cQ$IXO1G0rOOQ$IV-E9m-E9mO3UQ$IWO7+&cO3UQ$IWO7+&cOOQ$IV,5<Z,5<ZO#+UQ$IWO,5<ZOOQ$IV7+&c7+&cO#+aQ$IZO7+&cO#.lQ$IWO,5<[O#.wQ$IWO1G3cOOQ$IS-E9n-E9nO#/UQ$IWO1G3cO#/^Q$IWO'#H_O#/lQ$IWO'#H_O/|Q$IWO'#H_OOQ$IS'#H_'#H_O#/wQ$IWO'#H^OOQ$IS,5;e,5;eO#0PQ$IWO,5;eO/gQ$IWO'#E{OOQ$IV7+&i7+&iO3UQ$IWO7+&iOOQ$IV7+&n7+&nOOQ$IS1G2t1G2tOOQ$IS,5;s,5;sO#0UQ$IWO1G2sOOQ$IS-E9V-E9VO#0iQ$IWO,5;tO#0tQ$IWO,5;tO#1XQ$IWO1G2uOOQ$IS-E9W-E9WO#1iQ$IWO1G2uO#1qQ$IWO1G2uO#2RQ$IWO1G2uO#1iQ$IWO1G2uOOQ$IS<<HX<<HXO#2^Q$I[O1G1[OOQ$IS<<Hi<<HiP#2kQ$IWO'#FUO6|Q$IWO1G2mO#2xQ$IWO1G2mO#2}Q$IWO<<HiOOQ$IS<<Hj<<HjO#3_Q$IWO7+(]OOQ$IS<<Hq<<HqO#3oQ$I[O1G1ZP#4`Q$IWO'#FTO#4mQ$IWO7+(^O#4}Q$IWO7+(^O#5VQ$IWO<<HuO#5[Q$IWO7+(WOOQ$IS<<Hw<<HwO#6RQ$IWO,5;rO'RQ$IWO,5;rOOQ$IS-E9U-E9UOOQ$IS<<Hu<<HuOOQ$IS,5;x,5;xO/gQ$IWO,5;xO#6WQ$IWO1G3QOOQ$IS-E9[-E9[O#6nQ$IWO1G3QOOOO'#F_'#F_O#6|O!LQO,5:cOOOO,5=g,5=gOOOO7+%g7+%gO#7XQ$IWO1G2VO#7rQ$IWO1G2VP'RQ$IWO'#FVO/gQ$IWO<<IkO#8TQ$IWO,5=sO#8fQ$IWO,5=sO/|Q$IWO,5=sO#8wQ$IWO<<ImOOQ$IS<<Im<<ImO/|Q$IWO<<ImP/|Q$IWO'#FjP/gQ$IWO'#FfOOQ$IV-E9k-E9kO3UQ$IWO<<IwOOQ$IV,5<X,5<XO3UQ$IWO,5<XOOQ$IV<<Iw<<IwOOQ$IV<<Iz<<IzO#8|Q$I[O1G1tP#9WQ$IWO'#FnO#9_Q$IWO7+(|O#9iQ$IZO<<I|O3UQ$IWO<<I|OOQ$IV<<JT<<JTO3UQ$IWO<<JTOOQ$IV'#Fl'#FlO#<tQ$IZO7+&^OOQ$IV<<I}<<I}O#>mQ$IZO<<I}OOQ$IV1G1u1G1uO/|Q$IWO1G1uO3UQ$IWO<<I}O/|Q$IWO1G1vP/gQ$IWO'#FpO#AxQ$IWO7+(}O#BVQ$IWO7+(}OOQ$IS'#Ez'#EzO/gQ$IWO,5=yO#B_Q$IWO,5=yOOQ$IS,5=y,5=yO#BjQ$IWO,5=xO#B{Q$IWO,5=xOOQ$IS1G1P1G1POOQ$IS,5;g,5;gP#CTQ$IWO'#FXO#CeQ$IWO1G1`O#CxQ$IWO1G1`O#DYQ$IWO1G1`P#DeQ$IWO'#FYO#DrQ$IWO7+(aO#ESQ$IWO7+(aO#ESQ$IWO7+(aO#E[Q$IWO7+(aO#ElQ$IWO7+(XO6|Q$IWO7+(XOOQ$ISAN>TAN>TO#FVQ$IWO<<KxOOQ$ISAN>aAN>aO/gQ$IWO1G1^O#FgQ$I[O1G1^P#FqQ$IWO'#FWOOQ$IS1G1d1G1dP#GOQ$IWO'#F^O#G]Q$IWO7+(lOOOO-E9]-E9]O#GsQ$IWO7+'qOOQ$ISAN?VAN?VO#H^Q$IWO,5<TO#HrQ$IWO1G3_OOQ$IS-E9g-E9gO#ITQ$IWO1G3_OOQ$ISAN?XAN?XO#IfQ$IWOAN?XOOQ$IVAN?cAN?cOOQ$IV1G1s1G1sO3UQ$IWOAN?hO#IkQ$IZOAN?hOOQ$IVAN?oAN?oOOQ$IV-E9j-E9jOOQ$IV<<Ix<<IxO3UQ$IWOAN?iO3UQ$IWO7+'aOOQ$IVAN?iAN?iOOQ$IS7+'b7+'bO#LvQ$IWO<<LiOOQ$IS1G3e1G3eO/gQ$IWO1G3eOOQ$IS,5<],5<]O#MTQ$IWO1G3dOOQ$IS-E9o-E9oO#MfQ$IWO7+&zO#MvQ$IWO7+&zOOQ$IS7+&z7+&zO#NRQ$IWO<<K{O#NcQ$IWO<<K{O#NcQ$IWO<<K{O#NkQ$IWO'#GiOOQ$IS<<Ks<<KsO#NuQ$IWO<<KsOOQ$IS7+&x7+&xO/|Q$IWO1G1oP/|Q$IWO'#FiO$ `Q$IWO7+(yO$ qQ$IWO7+(yOOQ$ISG24sG24sOOQ$IVG25SG25SO3UQ$IWOG25SOOQ$IVG25TG25TOOQ$IV<<J{<<J{OOQ$IS7+)P7+)PP$!SQ$IWO'#FqOOQ$IS<<Jf<<JfO$!bQ$IWO<<JfO$!rQ$IWOANAgO$#SQ$IWOANAgO$#[Q$IWO'#GjOOQ$IS'#Gj'#GjO0hQ$IWO'#DaO$#uQ$IWO,5=TOOQ$ISANA_ANA_OOQ$IS7+'Z7+'ZO$$^Q$IWO<<LeOOQ$IVLD*nLD*nOOQ$ISAN@QAN@QO$$oQ$IWOG27RO$%PQ$IWO,59{OOQ$IS1G2o1G2oO#NkQ$IWO1G/gOOQ$IS7+%R7+%RO6|Q$IWO'#CzO6|Q$IWO,59_O6|Q$IWO,59_O6|Q$IWO,59_O$%UQ$I[O,5<kO6|Q$IWO1G.yO/gQ$IWO1G/UO/gQ$IWO7+$mP$%iQ$IWO'#FdO'RQ$IWO'#GPO$%vQ$IWO,59_O$%{Q$IWO,59_O$&SQ$IWO,59jO$&XQ$IWO1G/RO0hQ$IWO'#DOO6|Q$IWO,59g",
  stateData: "$&o~O$oOS$lOS$kOSQOS~OPhOTeOdsOfXOltOp!SOsuO|vO}!PO!R!VO!S!UO!VYO!ZZO!fdO!mdO!ndO!odO!vxO!xyO!zzO!|{O#O|O#S}O#U!OO#X!QO#Y!QO#[!RO#c!TO#f!WO#j!XO#l!YO#q!ZO#tlO$jqO$zQO${QO%PRO%QVO%e[O%f]O%i^O%l_O%r`O%uaO%wbO~OT!aO]!aO_!bOf!iO!V!kO!d!lO$u![O$v!]O$w!^O$x!_O$y!_O$z!`O${!`O$|!aO$}!aO%O!aO~Oh%TXi%TXj%TXk%TXl%TXm%TXp%TXw%TXx%TX!s%TX#^%TX$j%TX$m%TX%V%TX!O%TX!R%TX!S%TX%W%TX!W%TX![%TX}%TX#V%TXq%TX!j%TX~P$_OdsOfXO!VYO!ZZO!fdO!mdO!ndO!odO$zQO${QO%PRO%QVO%e[O%f]O%i^O%l_O%r`O%uaO%wbO~Ow%SXx%SX#^%SX$j%SX$m%SX%V%SX~Oh!oOi!pOj!nOk!nOl!qOm!rOp!sO!s%SX~P(`OT!yOl-fOs-tO|vO~P'ROT!|Ol-fOs-tO!W!}O~P'ROT#QO_#ROl-fOs-tO![#SO~P'RO%g#VO%h#XO~O%j#YO%k#XO~O!Z#[O%m#]O%q#_O~O!Z#[O%s#`O%t#_O~O!Z#[O%h#_O%v#bO~O!Z#[O%k#_O%x#dO~OT$tX]$tX_$tXf$tXh$tXi$tXj$tXk$tXl$tXm$tXp$tXw$tX!V$tX!d$tX$u$tX$v$tX$w$tX$x$tX$y$tX$z$tX${$tX$|$tX$}$tX%O$tX!O$tX!R$tX!S$tX~O%e[O%f]O%i^O%l_O%r`O%uaO%wbOx$tX!s$tX#^$tX$j$tX$m$tX%V$tX%W$tX!W$tX![$tX}$tX#V$tXq$tX!j$tX~P+uOw#iOx$sX!s$sX#^$sX$j$sX$m$sX%V$sX~Ol-fOs-tO~P'RO#^#lO$j#nO$m#nO~O%QVO~O!R#sO#l!YO#q!ZO#tlO~OltO~P'ROT#xO_#yO%QVOxtP~OT#}Ol-fOs-tO}$OO~P'ROx$QO!s$VO%V$RO#^!tX$j!tX$m!tX~OT#}Ol-fOs-tO#^!}X$j!}X$m!}X~P'ROl-fOs-tO#^#RX$j#RX$m#RX~P'RO!d$]O!m$]O%QVO~OT$gO~P'RO!S$iO#j$jO#l$kO~Ox$lO~OT$zO_$zOl-fOs-tO!O$|O~P'ROl-fOs-tOx%PO~P'RO%d%RO~O_!bOf!iO!V!kO!d!lOT`a]`ah`ai`aj`ak`al`am`ap`aw`ax`a!s`a#^`a$j`a$m`a$u`a$v`a$w`a$x`a$y`a$z`a${`a$|`a$}`a%O`a%V`a!O`a!R`a!S`a%W`a!W`a![`a}`a#V`aq`a!j`a~Ok%WO~Ol%WO~P'ROl-fO~P'ROh-hOi-iOj-gOk-gOl-pOm-qOp-uO!O%SX!R%SX!S%SX%W%SX!W%SX![%SX}%SX#V%SX!j%SX~P(`O%W%YOw%RX!O%RX!R%RX!S%RX!W%RXx%RX~Ow%]O!O%[O!R%aO!S%`O~O!O%[O~Ow%dO!R%aO!S%`O!W%_X~O!W%hO~Ow%iOx%kO!R%aO!S%`O![%YX~O![%oO~O![%pO~O%g#VO%h%rO~O%j#YO%k%rO~OT%uOl-fOs-tO|vO~P'RO!Z#[O%m#]O%q%xO~O!Z#[O%s#`O%t%xO~O!Z#[O%h%xO%v#bO~O!Z#[O%k%xO%x#dO~OT!la]!la_!laf!lah!lai!laj!lak!lal!lam!lap!law!lax!la!V!la!d!la!s!la#^!la$j!la$m!la$u!la$v!la$w!la$x!la$y!la$z!la${!la$|!la$}!la%O!la%V!la!O!la!R!la!S!la%W!la!W!la![!la}!la#V!laq!la!j!la~P#vOw%}Ox$sa!s$sa#^$sa$j$sa$m$sa%V$sa~P$_OT&POltOsuOx$sa!s$sa#^$sa$j$sa$m$sa%V$sa~P'ROw%}Ox$sa!s$sa#^$sa$j$sa$m$sa%V$sa~OPhOTeOltOsuO|vO}!PO!vxO!xyO!zzO!|{O#O|O#S}O#U!OO#X!QO#Y!QO#[!RO#^$_X$j$_X$m$_X~P'RO#^#lO$j&UO$m&UO~O!d&VOf%zX$j%zX#V%zX#^%zX$m%zX#U%zX~Of!iO$j&XO~Ohcaicajcakcalcamcapcawcaxca!sca#^ca$jca$mca%Vca!Oca!Rca!Sca%Wca!Wca![ca}ca#Vcaqca!jca~P$_Opnawnaxna#^na$jna$mna%Vna~Oh!oOi!pOj!nOk!nOl!qOm!rO!sna~PDTO%V&ZOw%UXx%UX~O%QVOw%UXx%UX~Ow&^OxtX~Ox&`O~Ow%iO#^%YX$j%YX$m%YX!O%YXx%YX![%YX!j%YX%V%YX~OT-oOl-fOs-tO|vO~P'RO%V$RO#^Sa$jSa$mSa~O%V$RO~Ow&iO#^%[X$j%[X$m%[Xk%[X~P$_Ow&lO}&kO#^#Ra$j#Ra$m#Ra~O#V&mO#^#Ta$j#Ta$m#Ta~O!d$]O!m$]O#U&oO%QVO~O#U&oO~Ow&qO#^%|X$j%|X$m%|X~Ow&sO#^%yX$j%yX$m%yXx%yX~Ow&wOk&OX~P$_Ok&zO~OPhOTeOltOsuO|vO}!PO!vxO!xyO!zzO!|{O#O|O#S}O#U!OO#X!QO#Y!QO#[!RO$j'PO~P'ROq'TO#g'RO#h'SOP#eaT#ead#eaf#eal#eap#eas#ea|#ea}#ea!R#ea!S#ea!V#ea!Z#ea!f#ea!m#ea!n#ea!o#ea!v#ea!x#ea!z#ea!|#ea#O#ea#S#ea#U#ea#X#ea#Y#ea#[#ea#c#ea#f#ea#j#ea#l#ea#q#ea#t#ea$g#ea$j#ea$z#ea${#ea%P#ea%Q#ea%e#ea%f#ea%i#ea%l#ea%r#ea%u#ea%w#ea$i#ea$m#ea~Ow'UO#V'WOx&PX~Of'YO~Of!iOx$lO~OT!aO]!aO_!bOf!iO!V!kO!d!lO$w!^O$x!_O$y!_O$z!`O${!`O$|!aO$}!aO%O!aOhUiiUijUikUilUimUipUiwUixUi!sUi#^Ui$jUi$mUi$uUi%VUi!OUi!RUi!SUi%WUi!WUi![Ui}Ui#VUiqUi!jUi~O$v!]O~PNyO$vUi~PNyOT!aO]!aO_!bOf!iO!V!kO!d!lO$z!`O${!`O$|!aO$}!aO%O!aOhUiiUijUikUilUimUipUiwUixUi!sUi#^Ui$jUi$mUi$uUi$vUi$wUi%VUi!OUi!RUi!SUi%WUi!WUi![Ui}Ui#VUiqUi!jUi~O$x!_O$y!_O~P!#tO$xUi$yUi~P!#tO_!bOf!iO!V!kO!d!lOhUiiUijUikUilUimUipUiwUixUi!sUi#^Ui$jUi$mUi$uUi$vUi$wUi$xUi$yUi$zUi${Ui%VUi!OUi!RUi!SUi%WUi!WUi![Ui}Ui#VUiqUi!jUi~OT!aO]!aO$|!aO$}!aO%O!aO~P!&rOTUi]Ui$|Ui$}Ui%OUi~P!&rO!R%aO!S%`Ow%bX!O%bX~O%V'_O%W'_O~P+uOw'aO!O%aX~O!O'cO~Ow'dOx'fO!W%cX~Ol-fOs-tOw'dOx'gO!W%cX~P'RO!W'iO~Oj!nOk!nOl!qOm!rOhgipgiwgixgi!sgi#^gi$jgi$mgi%Vgi~Oi!pO~P!+eOigi~P!+eOh-hOi-iOj-gOk-gOl-pOm-qO~Oq'kO~P!,nOT'pOl-fOs-tO!O'qO~P'ROw'rO!O'qO~O!O'tO~O!S'vO~Ow'rO!O'wO!R%aO!S%`O~P$_Oh-hOi-iOj-gOk-gOl-pOm-qO!Ona!Rna!Sna%Wna!Wna![na}na#Vnaqna!jna~PDTOT'pOl-fOs-tO!W%_a~P'ROw'zO!W%_a~O!W'{O~Ow'zO!R%aO!S%`O!W%_a~P$_OT(POl-fOs-tO![%Ya#^%Ya$j%Ya$m%Ya!O%Yax%Ya!j%Ya%V%Ya~P'ROw(QO![%Ya#^%Ya$j%Ya$m%Ya!O%Yax%Ya!j%Ya%V%Ya~O![(TO~Ow(QO!R%aO!S%`O![%Ya~P$_Ow(WO!R%aO!S%`O![%`a~P$_Ow(ZOx%nX![%nX!j%nX~Ox(^O![(`O!j(aO~OT&POltOsuOx$si!s$si#^$si$j$si$m$si%V$si~P'ROw(bOx$si!s$si#^$si$j$si$m$si%V$si~O!d&VOf%za$j%za#V%za#^%za$m%za#U%za~O$j(gO~OT#xO_#yO%QVO~Ow&^Oxta~OltOsuO~P'ROw(QO#^%Ya$j%Ya$m%Ya!O%Yax%Ya![%Ya!j%Ya%V%Ya~P$_Ow(lO#^$sX$j$sX$m$sX%V$sX~O%V$RO#^Si$jSi$mSi~O#^%[a$j%[a$m%[ak%[a~P'ROw(oO#^%[a$j%[a$m%[ak%[a~OT(sOf(uO%QVO~O#U(vO~O%QVO#^%|a$j%|a$m%|a~Ow(xO#^%|a$j%|a$m%|a~Ol-fOs-tO#^%ya$j%ya$m%yax%ya~P'ROw({O#^%ya$j%ya$m%yax%ya~Oq)PO#a)OOP#_iT#_id#_if#_il#_ip#_is#_i|#_i}#_i!R#_i!S#_i!V#_i!Z#_i!f#_i!m#_i!n#_i!o#_i!v#_i!x#_i!z#_i!|#_i#O#_i#S#_i#U#_i#X#_i#Y#_i#[#_i#c#_i#f#_i#j#_i#l#_i#q#_i#t#_i$g#_i$j#_i$z#_i${#_i%P#_i%Q#_i%e#_i%f#_i%i#_i%l#_i%r#_i%u#_i%w#_i$i#_i$m#_i~Oq)QOP#biT#bid#bif#bil#bip#bis#bi|#bi}#bi!R#bi!S#bi!V#bi!Z#bi!f#bi!m#bi!n#bi!o#bi!v#bi!x#bi!z#bi!|#bi#O#bi#S#bi#U#bi#X#bi#Y#bi#[#bi#c#bi#f#bi#j#bi#l#bi#q#bi#t#bi$g#bi$j#bi$z#bi${#bi%P#bi%Q#bi%e#bi%f#bi%i#bi%l#bi%r#bi%u#bi%w#bi$i#bi$m#bi~OT)SOk&Oa~P'ROw)TOk&Oa~Ow)TOk&Oa~P$_Ok)XO~O$h)[O~Oq)_O#g'RO#h)^OP#eiT#eid#eif#eil#eip#eis#ei|#ei}#ei!R#ei!S#ei!V#ei!Z#ei!f#ei!m#ei!n#ei!o#ei!v#ei!x#ei!z#ei!|#ei#O#ei#S#ei#U#ei#X#ei#Y#ei#[#ei#c#ei#f#ei#j#ei#l#ei#q#ei#t#ei$g#ei$j#ei$z#ei${#ei%P#ei%Q#ei%e#ei%f#ei%i#ei%l#ei%r#ei%u#ei%w#ei$i#ei$m#ei~Ol-fOs-tOx$lO~P'ROl-fOs-tOx&Pa~P'ROw)eOx&Pa~OT)iO_)jO!O)mO$|)kO%QVO~Ox$lO&S)oO~OT$zO_$zOl-fOs-tO!O%aa~P'ROw)uO!O%aa~Ol-fOs-tOx)xO!W%ca~P'ROw)yO!W%ca~Ol-fOs-tOw)yOx)|O!W%ca~P'ROl-fOs-tOw)yO!W%ca~P'ROw)yOx)|O!W%ca~Oj-gOk-gOl-pOm-qOhgipgiwgi!Ogi!Rgi!Sgi%Wgi!Wgixgi![gi#^gi$jgi$mgi}gi#Vgiqgi!jgi%Vgi~Oi-iO~P!GmOigi~P!GmOT'pOl-fOs-tO!O*RO~P'ROk*TO~Ow*VO!O*RO~O!O*WO~OT'pOl-fOs-tO!W%_i~P'ROw*XO!W%_i~O!W*YO~OT(POl-fOs-tO![%Yi#^%Yi$j%Yi$m%Yi!O%Yix%Yi!j%Yi%V%Yi~P'ROw*]O!R%aO!S%`O![%`i~Ow*`O![%Yi#^%Yi$j%Yi$m%Yi!O%Yix%Yi!j%Yi%V%Yi~O![*aO~O_*cOl-fOs-tO![%`i~P'ROw*]O![%`i~O![*eO~OT*gOl-fOs-tOx%na![%na!j%na~P'ROw*hOx%na![%na!j%na~O!Z#[O%p*kO![!kX~O![*mO~Ox(^O![*nO~OT&POltOsuOx$sq!s$sq#^$sq$j$sq$m$sq%V$sq~P'ROw$Wix$Wi!s$Wi#^$Wi$j$Wi$m$Wi%V$Wi~P$_OT&POltOsuO~P'ROT&POl-fOs-tO#^$sa$j$sa$m$sa%V$sa~P'ROw*oO#^$sa$j$sa$m$sa%V$sa~Ow#ya#^#ya$j#ya$m#yak#ya~P$_O#^%[i$j%[i$m%[ik%[i~P'ROw*rO#^#Rq$j#Rq$m#Rq~Ow*sO#V*uO#^%{X$j%{X$m%{X!O%{X~OT*wOf*xO%QVO~O%QVO#^%|i$j%|i$m%|i~Ol-fOs-tO#^%yi$j%yi$m%yix%yi~P'ROq*|O#a)OOP#_qT#_qd#_qf#_ql#_qp#_qs#_q|#_q}#_q!R#_q!S#_q!V#_q!Z#_q!f#_q!m#_q!n#_q!o#_q!v#_q!x#_q!z#_q!|#_q#O#_q#S#_q#U#_q#X#_q#Y#_q#[#_q#c#_q#f#_q#j#_q#l#_q#q#_q#t#_q$g#_q$j#_q$z#_q${#_q%P#_q%Q#_q%e#_q%f#_q%i#_q%l#_q%r#_q%u#_q%w#_q$i#_q$m#_q~Ok$baw$ba~P$_OT)SOk&Oi~P'ROw+TOk&Oi~OPhOTeOltOp!SOsuO|vO}!PO!R!VO!S!UO!vxO!xyO!zzO!|{O#O|O#S}O#U!OO#X!QO#Y!QO#[!RO#c!TO#f!WO#j!XO#l!YO#q!ZO#tlO~P'ROw+_Ox$lO#V+_O~O#h+`OP#eqT#eqd#eqf#eql#eqp#eqs#eq|#eq}#eq!R#eq!S#eq!V#eq!Z#eq!f#eq!m#eq!n#eq!o#eq!v#eq!x#eq!z#eq!|#eq#O#eq#S#eq#U#eq#X#eq#Y#eq#[#eq#c#eq#f#eq#j#eq#l#eq#q#eq#t#eq$g#eq$j#eq$z#eq${#eq%P#eq%Q#eq%e#eq%f#eq%i#eq%l#eq%r#eq%u#eq%w#eq$i#eq$m#eq~O#V+aOw$dax$da~Ol-fOs-tOx&Pi~P'ROw+cOx&Pi~Ox$QO%V+eOw&RX!O&RX~O%QVOw&RX!O&RX~Ow+iO!O&QX~O!O+kO~OT$zO_$zOl-fOs-tO!O%ai~P'ROx+nOw#|a!W#|a~Ol-fOs-tOx+oOw#|a!W#|a~P'ROl-fOs-tOx)xO!W%ci~P'ROw+rO!W%ci~Ol-fOs-tOw+rO!W%ci~P'ROw+rOx+uO!W%ci~Ow#xi!O#xi!W#xi~P$_OT'pOl-fOs-tO~P'ROk+wO~OT'pOl-fOs-tO!O+xO~P'ROT'pOl-fOs-tO!W%_q~P'ROw#wi![#wi#^#wi$j#wi$m#wi!O#wix#wi!j#wi%V#wi~P$_OT(POl-fOs-tO~P'RO_*cOl-fOs-tO![%`q~P'ROw+yO![%`q~O![+zO~OT(POl-fOs-tO![%Yq#^%Yq$j%Yq$m%Yq!O%Yqx%Yq!j%Yq%V%Yq~P'ROx+{O~OT*gOl-fOs-tOx%ni![%ni!j%ni~P'ROw,QOx%ni![%ni!j%ni~O!Z#[O%p*kO![!ka~OT&POl-fOs-tO#^$si$j$si$m$si%V$si~P'ROw,SO#^$si$j$si$m$si%V$si~O%QVO#^%{a$j%{a$m%{a!O%{a~Ow,VO#^%{a$j%{a$m%{a!O%{a~O!O,YO~Ok$biw$bi~P$_OT)SO~P'ROT)SOk&Oq~P'ROq,^OP#dyT#dyd#dyf#dyl#dyp#dys#dy|#dy}#dy!R#dy!S#dy!V#dy!Z#dy!f#dy!m#dy!n#dy!o#dy!v#dy!x#dy!z#dy!|#dy#O#dy#S#dy#U#dy#X#dy#Y#dy#[#dy#c#dy#f#dy#j#dy#l#dy#q#dy#t#dy$g#dy$j#dy$z#dy${#dy%P#dy%Q#dy%e#dy%f#dy%i#dy%l#dy%r#dy%u#dy%w#dy$i#dy$m#dy~OPhOTeOltOp!SOsuO|vO}!PO!R!VO!S!UO!vxO!xyO!zzO!|{O#O|O#S}O#U!OO#X!QO#Y!QO#[!RO#c!TO#f!WO#j!XO#l!YO#q!ZO#tlO$i,bO$m,bO~P'RO#h,cOP#eyT#eyd#eyf#eyl#eyp#eys#ey|#ey}#ey!R#ey!S#ey!V#ey!Z#ey!f#ey!m#ey!n#ey!o#ey!v#ey!x#ey!z#ey!|#ey#O#ey#S#ey#U#ey#X#ey#Y#ey#[#ey#c#ey#f#ey#j#ey#l#ey#q#ey#t#ey$g#ey$j#ey$z#ey${#ey%P#ey%Q#ey%e#ey%f#ey%i#ey%l#ey%r#ey%u#ey%w#ey$i#ey$m#ey~Ol-fOs-tOx&Pq~P'ROw,gOx&Pq~O%V+eOw&Ra!O&Ra~OT)iO_)jO$|)kO%QVO!O&Qa~Ow,kO!O&Qa~OT$zO_$zOl-fOs-tO~P'ROl-fOs-tOx,mOw#|i!W#|i~P'ROl-fOs-tOw#|i!W#|i~P'ROx,mOw#|i!W#|i~Ol-fOs-tOx)xO~P'ROl-fOs-tOx)xO!W%cq~P'ROw,pO!W%cq~Ol-fOs-tOw,pO!W%cq~P'ROp,sO!R%aO!S%`O!O%Zq!W%Zq![%Zqw%Zq~P!,nO_*cOl-fOs-tO![%`y~P'ROw#zi![#zi~P$_O_*cOl-fOs-tO~P'ROT*gOl-fOs-tO~P'ROT*gOl-fOs-tOx%nq![%nq!j%nq~P'ROT&POl-fOs-tO#^$sq$j$sq$m$sq%V$sq~P'RO#V,wOw$]a#^$]a$j$]a$m$]a!O$]a~O%QVO#^%{i$j%{i$m%{i!O%{i~Ow,yO#^%{i$j%{i$m%{i!O%{i~O!O,{O~Oq,}OP#d!RT#d!Rd#d!Rf#d!Rl#d!Rp#d!Rs#d!R|#d!R}#d!R!R#d!R!S#d!R!V#d!R!Z#d!R!f#d!R!m#d!R!n#d!R!o#d!R!v#d!R!x#d!R!z#d!R!|#d!R#O#d!R#S#d!R#U#d!R#X#d!R#Y#d!R#[#d!R#c#d!R#f#d!R#j#d!R#l#d!R#q#d!R#t#d!R$g#d!R$j#d!R$z#d!R${#d!R%P#d!R%Q#d!R%e#d!R%f#d!R%i#d!R%l#d!R%r#d!R%u#d!R%w#d!R$i#d!R$m#d!R~Ol-fOs-tOx&Py~P'ROT)iO_)jO$|)kO%QVO!O&Qi~Ol-fOs-tOw#|q!W#|q~P'ROx-TOw#|q!W#|q~Ol-fOs-tOx)xO!W%cy~P'ROw-UO!W%cy~Ol-fOs-YO~P'ROp,sO!R%aO!S%`O!O%Zy!W%Zy![%Zyw%Zy~P!,nO%QVO#^%{q$j%{q$m%{q!O%{q~Ow-^O#^%{q$j%{q$m%{q!O%{q~OT)iO_)jO$|)kO%QVO~Ol-fOs-tOw#|y!W#|y~P'ROl-fOs-tOx)xO!W%c!R~P'ROw-aO!W%c!R~Op%^X!O%^X!R%^X!S%^X!W%^X![%^Xw%^X~P!,nOp,sO!R%aO!S%`O!O%]a!W%]a![%]aw%]a~O%QVO#^%{y$j%{y$m%{y!O%{y~Ol-fOs-tOx)xO!W%c!Z~P'ROx-dO~Ow*oO#^$sa$j$sa$m$sa%V$sa~P$_OT&POl-fOs-tO~P'ROk-kO~Ol-kO~P'ROx-lO~Oq-mO~P!,nO%f%i%u%w%e!Z%m%s%v%x%l%r%l%Q~",
  goto: "!,u&SPPPP&TP&])n*T*k+S+l,VP,qP&]-_-_&]P&]P0pPPPPPP0p3`PP3`P5l5u:yPP:|;[;_PPP&]&]PP;k&]PP&]&]PP&]&]&]&];o<c&]P<fP<i<i@OP@d&]PPP@h@n&TP&T&TP&TP&TP&TP&TP&T&T&TP&TPP&TPP&TP@tP@{ARP@{P@{@{PPP@{PBzPCTCZCaBzP@{CgPCnCtCzDWDjDpDzEQEnEtEzFQF[FbFhFnFtFzG^GhGnGtGzHUH[HbHhHnHxIOIYI`PPPPPPPPPIiIqIzJUJaPPPPPPPPPPPPNv! `!%n!(zPP!)S!)b!)k!*a!*W!*j!*p!*s!*v!*y!+RPPPPPPPPPP!+U!+XPPPPPPPPP!+_!+k!+w!,T!,W!,^!,d!,j!,m]iOr#l$l)[+Z'odOSXYZehrstvx|}!R!S!T!U!X!c!d!e!f!g!h!i!k!n!o!p!r!s!y!|#Q#R#[#i#l#}$O$Q$S$V$g$i$j$l$z%P%W%Z%]%`%d%i%k%u%}&P&[&`&i&k&l&s&w&z'R'U'`'a'd'f'g'k'p'r'v'z(P(Q(W(Z(b(d(l(o({)O)S)T)X)[)e)o)u)x)y)|*S*T*V*X*[*]*`*c*g*h*o*q*r*z+S+T+Z+b+c+f+m+n+o+q+r+u+w+y+{+},P,Q,S,g,i,m,p,s-T-U-a-d-f-g-h-i-k-l-m-n-o-q-uw!cP#h#u$W$f%b%g%m%n&a&y(c(n)R*Q*Z+R+|-jy!dP#h#u$W$f$r%b%g%m%n&a&y(c(n)R*Q*Z+R+|-j{!eP#h#u$W$f$r$s%b%g%m%n&a&y(c(n)R*Q*Z+R+|-j}!fP#h#u$W$f$r$s$t%b%g%m%n&a&y(c(n)R*Q*Z+R+|-j!P!gP#h#u$W$f$r$s$t$u%b%g%m%n&a&y(c(n)R*Q*Z+R+|-j!R!hP#h#u$W$f$r$s$t$u$v%b%g%m%n&a&y(c(n)R*Q*Z+R+|-j!V!hP!m#h#u$W$f$r$s$t$u$v$w%b%g%m%n&a&y(c(n)R*Q*Z+R+|-j'oSOSXYZehrstvx|}!R!S!T!U!X!c!d!e!f!g!h!i!k!n!o!p!r!s!y!|#Q#R#[#i#l#}$O$Q$S$V$g$i$j$l$z%P%W%Z%]%`%d%i%k%u%}&P&[&`&i&k&l&s&w&z'R'U'`'a'd'f'g'k'p'r'v'z(P(Q(W(Z(b(d(l(o({)O)S)T)X)[)e)o)u)x)y)|*S*T*V*X*[*]*`*c*g*h*o*q*r*z+S+T+Z+b+c+f+m+n+o+q+r+u+w+y+{+},P,Q,S,g,i,m,p,s-T-U-a-d-f-g-h-i-k-l-m-n-o-q-u&ZUOXYZhrtv|}!R!S!T!X!i!k!n!o!p!r!s#[#i#l$O$Q$S$V$j$l$z%P%W%Z%]%d%i%k%u%}&[&`&k&l&s&z'R'U'`'a'd'f'g'k'r'z(Q(W(Z(b(d(l({)O)X)[)e)o)u)x)y)|*S*T*V*X*[*]*`*g*h*o*r*z+Z+b+c+f+m+n+o+q+r+u+w+y+{+},P,Q,S,g,i,m,p,s-T-U-a-d-f-g-h-i-k-l-m-n-q-u%eWOXYZhrv|}!R!S!T!X!i!k#[#i#l$O$Q$S$V$j$l$z%P%Z%]%d%i%k%u%}&[&`&k&l&s&z'R'U'`'a'd'f'g'k'r'z(Q(W(Z(b(d(l({)O)X)[)e)o)u)x)y)|*S*V*X*[*]*`*g*h*o*r*z+Z+b+c+f+m+n+o+q+r+u+y+{+},P,Q,S,g,i,m,p-T-U-a-l-m-nQ#{uQ-b-YR-r-t'fdOSXYZehrstvx|}!R!S!T!U!X!c!d!e!f!g!h!k!n!o!p!r!s!y!|#Q#R#[#i#l#}$O$Q$S$V$g$i$j$l$z%P%W%Z%]%`%d%i%k%u%}&P&[&`&i&k&l&s&w&z'R'U'`'d'f'g'k'p'r'v'z(P(Q(W(Z(b(d(l(o({)O)S)T)X)[)e)o)x)y)|*S*T*V*X*[*]*`*c*g*h*o*q*r*z+S+T+Z+b+c+f+n+o+q+r+u+w+y+{+},P,Q,S,g,i,m,p,s-T-U-a-d-f-g-h-i-k-l-m-n-o-q-uW#ol!O!P$^W#wu&^-Y-tQ$`!QQ$p!YQ$q!ZW$y!i'a)u+mS&]#x#yQ&}$kQ(e&VQ(s&mW(t&o(u(v*xU(w&q(x*yQ)g'WW)h'Y+i,k-RS+h)i)jY,U*s,V,x,y-^Q,X*uQ,d+_Q,f+aR-],wR&[#wi!vXY!S!T%]%d'r'z)O*S*V*XR%Z!uQ!zXQ%v#[Q&e$SR&h$VT-X,s-d!U!jP!m#h#u$W$f$r$s$t$u$v$w%b%g%m%n&a&y(c(n)R*Q*Z+R+|-jQ&Y#pR']$qR'`$yR%S!l'ncOSXYZehrstvx|}!R!S!T!U!X!c!d!e!f!g!h!i!k!n!o!p!r!s!y!|#Q#R#[#i#l#}$O$Q$S$V$g$i$j$l$z%P%W%Z%]%`%d%i%k%u%}&P&[&`&i&k&l&s&w&z'R'U'`'a'd'f'g'k'p'r'v'z(P(Q(W(Z(b(d(l(o({)O)S)T)X)[)e)o)u)x)y)|*S*T*V*X*[*]*`*c*g*h*o*q*r*z+S+T+Z+b+c+f+m+n+o+q+r+u+w+y+{+},P,Q,S,g,i,m,p,s-T-U-a-d-f-g-h-i-k-l-m-n-o-q-uT#fc#gS#]_#^S#``#aS#ba#cS#db#eT*k(^*lT(_%v(aQ$UwR+g)hX$Sw$T$U&gZkOr$l)[+ZXoOr)[+ZQ$m!WQ&u$dQ&v$eQ'X$oQ'[$qQ)Y&|Q)`'RQ)b'SQ)c'TQ)p'ZQ)r']Q*})OQ+P)PQ+Q)QQ+U)WS+W)Z)qQ+[)^Q+])_Q+^)aQ,[*|Q,]+OQ,_+VQ,`+XQ,e+`Q,|,^Q-O,cQ-P,dR-_,}WoOr)[+ZR#rnQ'Z$pR)Z&}Q+f)hR,i+gQ)q'ZR+X)ZZmOnr)[+ZQrOR#trQ&_#zR(j&_S%j#P#|S(R%j(UT(U%m&aQ%^!xQ%e!{W's%^%e'x'|Q'x%bR'|%gQ&j$WR(p&jQ(X%nQ*^(ST*d(X*^Q'b${R)v'bS'e%O%PY)z'e){+s,q-VU){'f'g'hU+s)|)}*OS,q+t+uR-V,rQ#W]R%q#WQ#Z^R%s#ZQ#^_R%w#^Q([%tS*i([*jR*j(]Q*l(^R,R*lQ#a`R%y#aQ#caR%z#cQ#ebR%{#eQ#gcR%|#gQ#jfQ&O#hW&R#j&O(m*pQ(m&dR*p-jQ$TwS&f$T&gR&g$UQ&t$bR(|&tQ&W#oR(f&WQ$^!PR&n$^Q*t(tS,W*t,zR,z,XQ&r$`R(y&rQ#mjR&T#mQ+Z)[R,a+ZQ(}&uR*{(}Q&x$fS)U&x)VR)V&yQ'Q$mR)]'QQ'V$nS)f'V+dR+d)gQ+j)lR,l+jWnOr)[+ZR#qnSqOrT+Y)[+ZWpOr)[+ZR'O$lYjOr$l)[+ZR&S#l[wOr#l$l)[+ZR&e$S&YPOXYZhrtv|}!R!S!T!X!i!k!n!o!p!r!s#[#i#l$O$Q$S$V$j$l$z%P%W%Z%]%d%i%k%u%}&[&`&k&l&s&z'R'U'`'a'd'f'g'k'r'z(Q(W(Z(b(d(l({)O)X)[)e)o)u)x)y)|*S*T*V*X*[*]*`*g*h*o*r*z+Z+b+c+f+m+n+o+q+r+u+w+y+{+},P,Q,S,g,i,m,p,s-T-U-a-d-f-g-h-i-k-l-m-n-q-uQ!mSQ#heQ#usU$Wx%`'vS$f!U$iQ$r!cQ$s!dQ$t!eQ$u!fQ$v!gQ$w!hQ%b!yQ%g!|Q%m#QQ%n#RQ&a#}Q&y$gQ(c&PU(n&i(o*qW)R&w)T+S+TQ*Q'pQ*Z(PQ+R)SQ+|*cR-j-oQ!xXQ!{YQ$d!SQ$e!T^'o%]%d'r'z*S*V*XR+O)O[fOr#l$l)[+Zh!uXY!S!T%]%d'r'z)O*S*V*XQ#PZQ#khS#|v|Q$Z}W$b!R$V&z)XS$n!X$jW$x!i'a)u+mQ%O!kQ%t#[`&Q#i%}(b(d(l*o,S-nQ&b$OQ&c$QQ&d$SQ'^$zQ'h%PQ'n%ZW(O%i(Q*[*`Q(S%kQ(]%uQ(h&[S(k&`-lQ(q&kQ(r&lU(z&s({*zQ)a'RY)d'U)e+b+c,gQ)s'`^)w'd)y+q+r,p-U-aQ)}'fQ*O'gS*P'k-mW*b(W*]+y+}W*f(Z*h,P,QQ+l)oQ+p)xQ+t)|Q,O*gQ,T*rQ,h+fQ,n+nQ,o+oQ,r+uQ,v+{Q-Q,iQ-S,mR-`-ThTOr#i#l$l%}&`'k(b(d)[+Z$z!tXYZhv|}!R!S!T!X!i!k#[$O$Q$S$V$j$z%P%Z%]%d%i%k%u&[&k&l&s&z'R'U'`'a'd'f'g'r'z(Q(W(Z(l({)O)X)e)o)u)x)y)|*S*V*X*[*]*`*g*h*o*r*z+b+c+f+m+n+o+q+r+u+y+{+},P,Q,S,g,i,m,p-T-U-a-l-m-nQ#vtW%T!n!r-g-qQ%U!oQ%V!pQ%X!sQ%c-fS'j%W-kQ'l-hQ'm-iQ+v*TQ,u+wS-W,s-dR-s-uU#zu-Y-tR(i&^[gOr#l$l)[+ZX!wX#[$S$VQ#UZQ$PvR$Y|Q%_!xQ%f!{Q%l#PQ'^$xQ'y%bQ'}%gQ(V%mQ(Y%nQ*_(SQ,t+vQ-[,uR-c-ZQ$XxQ'u%`R*U'vQ-Z,sR-e-dR#OYR#TZR$}!iQ${!iV)t'a)u+mR%Q!kR%v#[Q(`%vR*n(aQ$c!RQ&h$VQ)W&zR+V)XQ#plQ$[!OQ$_!PR&p$^Q(s&oQ*v(uQ*w(vR,Z*xR$a!QXpOr)[+ZQ$h!UR&{$iQ$o!XR&|$jR)n'YQ)l'YV,j+i,k-R",
  nodeNames: "⚠ print Comment Script AssignStatement * BinaryExpression BitOp BitOp BitOp BitOp ArithOp ArithOp @ ArithOp ** UnaryExpression ArithOp BitOp AwaitExpression await ParenthesizedExpression ( BinaryExpression or and CompareOp in not is UnaryExpression ConditionalExpression if else LambdaExpression lambda ParamList VariableName AssignOp , : NamedExpression AssignOp YieldExpression yield from ) TupleExpression ComprehensionExpression async for LambdaExpression ArrayExpression [ ] ArrayComprehensionExpression DictionaryExpression { } DictionaryComprehensionExpression SetExpression SetComprehensionExpression CallExpression ArgList AssignOp MemberExpression . PropertyName Number String FormatString FormatReplacement FormatConversion FormatSpec ContinuedString Ellipsis None Boolean TypeDef AssignOp UpdateStatement UpdateOp ExpressionStatement DeleteStatement del PassStatement pass BreakStatement break ContinueStatement continue ReturnStatement return YieldStatement PrintStatement RaiseStatement raise ImportStatement import as ScopeStatement global nonlocal AssertStatement assert StatementGroup ; IfStatement Body elif WhileStatement while ForStatement TryStatement try except finally WithStatement with FunctionDefinition def ParamList AssignOp TypeDef ClassDefinition class DecoratedStatement Decorator At",
  maxTerm: 234,
  context: trackIndent,
  nodeProps: [
    [lezer__WEBPACK_IMPORTED_MODULE_0__.NodeProp.group, -14,4,80,82,83,85,87,89,91,93,94,95,97,100,103,"Statement Statement",-22,6,16,19,21,37,47,48,52,55,56,59,60,61,62,65,68,69,70,74,75,76,77,"Expression",-9,105,107,110,112,113,117,119,124,126,"Statement"]
  ],
  skippedNodes: [0,2],
  repeatNodeCount: 32,
  tokenData: "&AaMgR!^OX$}XY!#xY[$}[]!#x]p$}pq!#xqr!&Srs!)yst!C{tu$}uv$+}vw$.awx$/mxy$Lgyz$Mmz{$Ns{|%#c|}%$o}!O%%u!O!P%([!P!Q%3b!Q!R%6Q!R![%:S![!]%EO!]!^%Gb!^!_%Hh!_!`%KW!`!a%Ld!a!b$}!b!c& P!c!d&!_!d!e&$P!e!h&!_!h!i&.R!i!t&!_!t!u&7g!u!w&!_!w!x&,a!x!}&!_!}#O&9q#O#P!%b#P#Q&:w#Q#R&;}#R#S&!_#S#T$}#T#U&!_#U#V&$P#V#Y&!_#Y#Z&.R#Z#f&!_#f#g&7g#g#i&!_#i#j&,a#j#o&!_#o#p&=Z#p#q&>P#q#r&?]#r#s&@Z#s$g$}$g~&!_<r%`Z%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}9[&^Z%p7[%gS%m`%v!bOr'PrsCxsw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'P9['^Z%p7[%gS%jW%m`%v!bOr'Prs&Rsw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'P8z(WZ%p7[%jWOr(yrs)wsw(ywx;bx#O(y#O#P2V#P#o(y#o#p7n#p#q(y#q#r2k#r~(y8z)UZ%p7[%gS%jW%v!bOr(yrs)wsw(ywx(Px#O(y#O#P2V#P#o(y#o#p7n#p#q(y#q#r2k#r~(y8z*QZ%p7[%gS%v!bOr(yrs*ssw(ywx(Px#O(y#O#P2V#P#o(y#o#p7n#p#q(y#q#r2k#r~(y8z*|Z%p7[%gS%v!bOr(yrs+osw(ywx(Px#O(y#O#P2V#P#o(y#o#p7n#p#q(y#q#r2k#r~(y8r+xX%p7[%gS%v!bOw+owx,ex#O+o#O#P.V#P#o+o#o#p0^#p#q+o#q#r.k#r~+o8r,jX%p7[Ow+owx-Vx#O+o#O#P.V#P#o+o#o#p0^#p#q+o#q#r.k#r~+o8r-[X%p7[Ow+owx-wx#O+o#O#P.V#P#o+o#o#p0^#p#q+o#q#r.k#r~+o7[-|R%p7[O#o-w#p#q-w#r~-w8r.[T%p7[O#o+o#o#p.k#p#q+o#q#r.k#r~+o!f.rV%gS%v!bOw.kwx/Xx#O.k#O#P0W#P#o.k#o#p0^#p~.k!f/[VOw.kwx/qx#O.k#O#P0W#P#o.k#o#p0^#p~.k!f/tUOw.kx#O.k#O#P0W#P#o.k#o#p0^#p~.k!f0ZPO~.k!f0cV%gSOw0xwx1^x#O0x#O#P2P#P#o0x#o#p.k#p~0xS0}T%gSOw0xwx1^x#O0x#O#P2P#P~0xS1aTOw0xwx1px#O0x#O#P2P#P~0xS1sSOw0xx#O0x#O#P2P#P~0xS2SPO~0x8z2[T%p7[O#o(y#o#p2k#p#q(y#q#r2k#r~(y!n2tX%gS%jW%v!bOr2krs3asw2kwx4wx#O2k#O#P7h#P#o2k#o#p7n#p~2k!n3hX%gS%v!bOr2krs4Tsw2kwx4wx#O2k#O#P7h#P#o2k#o#p7n#p~2k!n4[X%gS%v!bOr2krs.ksw2kwx4wx#O2k#O#P7h#P#o2k#o#p7n#p~2k!n4|X%jWOr2krs3asw2kwx5ix#O2k#O#P7h#P#o2k#o#p7n#p~2k!n5nX%jWOr2krs3asw2kwx6Zx#O2k#O#P7h#P#o2k#o#p7n#p~2kW6`T%jWOr6Zrs6os#O6Z#O#P7b#P~6ZW6rTOr6Zrs7Rs#O6Z#O#P7b#P~6ZW7USOr6Zs#O6Z#O#P7b#P~6ZW7ePO~6Z!n7kPO~2k!n7uX%gS%jWOr8brs9Osw8bwx:Ux#O8b#O#P;[#P#o8b#o#p2k#p~8b[8iV%gS%jWOr8brs9Osw8bwx:Ux#O8b#O#P;[#P~8b[9TV%gSOr8brs9jsw8bwx:Ux#O8b#O#P;[#P~8b[9oV%gSOr8brs0xsw8bwx:Ux#O8b#O#P;[#P~8b[:ZV%jWOr8brs9Osw8bwx:px#O8b#O#P;[#P~8b[:uV%jWOr8brs9Osw8bwx6Zx#O8b#O#P;[#P~8b[;_PO~8b8z;iZ%p7[%jWOr(yrs)wsw(ywx<[x#O(y#O#P2V#P#o(y#o#p7n#p#q(y#q#r2k#r~(y7d<cX%p7[%jWOr<[rs=Os#O<[#O#P>b#P#o<[#o#p6Z#p#q<[#q#r6Z#r~<[7d=TX%p7[Or<[rs=ps#O<[#O#P>b#P#o<[#o#p6Z#p#q<[#q#r6Z#r~<[7d=uX%p7[Or<[rs-ws#O<[#O#P>b#P#o<[#o#p6Z#p#q<[#q#r6Z#r~<[7d>gT%p7[O#o<[#o#p6Z#p#q<[#q#r6Z#r~<[9[>{T%p7[O#o'P#o#p?[#p#q'P#q#r?[#r~'P#O?gX%gS%jW%m`%v!bOr?[rs@Ssw?[wx4wx#O?[#O#PCO#P#o?[#o#pCU#p~?[#O@]X%gS%m`%v!bOr?[rs@xsw?[wx4wx#O?[#O#PCO#P#o?[#o#pCU#p~?[#OARX%gS%m`%v!bOr?[rsAnsw?[wx4wx#O?[#O#PCO#P#o?[#o#pCU#p~?[!vAwV%gS%m`%v!bOwAnwx/Xx#OAn#O#PB^#P#oAn#o#pBd#p~An!vBaPO~An!vBiV%gSOw0xwx1^x#O0x#O#P2P#P#o0x#o#pAn#p~0x#OCRPO~?[#OC]X%gS%jWOr8brs9Osw8bwx:Ux#O8b#O#P;[#P#o8b#o#p?[#p~8b9[DTZ%p7[%gS%m`%v!bOr'PrsDvsw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'P9SERX%p7[%gS%m`%v!bOwDvwx,ex#ODv#O#PEn#P#oDv#o#pBd#p#qDv#q#rAn#r~Dv9SEsT%p7[O#oDv#o#pAn#p#qDv#q#rAn#r~Dv<bF_Z%p7[%jW%sp%x#tOrGQrs)wswGQwxM^x#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQ<bGaZ%p7[%gS%jW%sp%v!b%x#tOrGQrs)wswGQwxFSx#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQ<bHXT%p7[O#oGQ#o#pHh#p#qGQ#q#rHh#r~GQ&UHuX%gS%jW%sp%v!b%x#tOrHhrs3aswHhwxIbx#OHh#O#PLd#P#oHh#o#pLj#p~Hh&UIkX%jW%sp%x#tOrHhrs3aswHhwxJWx#OHh#O#PLd#P#oHh#o#pLj#p~Hh&UJaX%jW%sp%x#tOrHhrs3aswHhwxJ|x#OHh#O#PLd#P#oHh#o#pLj#p~Hh$nKVX%jW%sp%x#tOrJ|rs6oswJ|wxJ|x#OJ|#O#PKr#P#oJ|#o#pKx#p~J|$nKuPO~J|$nK}V%jWOr6Zrs6os#O6Z#O#P7b#P#o6Z#o#pJ|#p~6Z&ULgPO~Hh&ULqX%gS%jWOr8brs9Osw8bwx:Ux#O8b#O#P;[#P#o8b#o#pHh#p~8b<bMiZ%p7[%jW%sp%x#tOrGQrs)wswGQwxN[x#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQ:zNgZ%p7[%jW%sp%x#tOrN[rs=OswN[wxN[x#ON[#O#P! Y#P#oN[#o#pKx#p#qN[#q#rJ|#r~N[:z! _T%p7[O#oN[#o#pJ|#p#qN[#q#rJ|#r~N[<r! sT%p7[O#o$}#o#p!!S#p#q$}#q#r!!S#r~$}&f!!cX%gS%jW%m`%sp%v!b%x#tOr!!Srs@Ssw!!SwxIbx#O!!S#O#P!#O#P#o!!S#o#p!#U#p~!!S&f!#RPO~!!S&f!#]X%gS%jWOr8brs9Osw8bwx:Ux#O8b#O#P;[#P#o8b#o#p!!S#p~8bMg!$]a%p7[%gS%jW$o1s%m`%sp%v!b%x#tOX$}XY!#xY[$}[]!#x]p$}pq!#xqr$}rs&Rsw$}wxFSx#O$}#O#P!%b#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Mg!%gX%p7[OY$}YZ!#xZ]$}]^!#x^#o$}#o#p!!S#p#q$}#q#r!!S#r~$}<u!&eb%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`!'m!`#O$}#O#P! n#P#T$}#T#U!(s#U#f$}#f#g!(s#g#h!(s#h#o$}#o#p!#U#p#q$}#q#r!!S#r~$}<u!(QZjR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}<u!)WZ!jR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{!*Y_%tp%p7[%gS%e,X%m`%v!bOY!+XYZ'PZ]!+X]^'P^r!+Xrs!BPsw!+Xwx!-gx#O!+X#O#P!>e#P#o!+X#o#p!@}#p#q!+X#q#r!>y#r~!+XDe!+h_%p7[%gS%jW%e,X%m`%v!bOY!+XYZ'PZ]!+X]^'P^r!+Xrs!,gsw!+Xwx!-gx#O!+X#O#P!>e#P#o!+X#o#p!@}#p#q!+X#q#r!>y#r~!+XDe!,tZ%p7[%gS%e,X%m`%v!bOr'PrsCxsw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'PDT!-p_%p7[%jW%e,XOY!.oYZ(yZ]!.o]^(y^r!.ors!/{sw!.owx!;Rx#O!.o#O#P!0y#P#o!.o#o#p!6m#p#q!.o#q#r!1_#r~!.oDT!.|_%p7[%gS%jW%e,X%v!bOY!.oYZ(yZ]!.o]^(y^r!.ors!/{sw!.owx!-gx#O!.o#O#P!0y#P#o!.o#o#p!6m#p#q!.o#q#r!1_#r~!.oDT!0WZ%p7[%gS%e,X%v!bOr(yrs*ssw(ywx(Px#O(y#O#P2V#P#o(y#o#p7n#p#q(y#q#r2k#r~(yDT!1OT%p7[O#o!.o#o#p!1_#p#q!.o#q#r!1_#r~!.o-w!1j]%gS%jW%e,X%v!bOY!1_YZ2kZ]!1_]^2k^r!1_rs!2csw!1_wx!3Xx#O!1_#O#P!6g#P#o!1_#o#p!6m#p~!1_-w!2lX%gS%e,X%v!bOr2krs4Tsw2kwx4wx#O2k#O#P7h#P#o2k#o#p7n#p~2k-w!3`]%jW%e,XOY!1_YZ2kZ]!1_]^2k^r!1_rs!2csw!1_wx!4Xx#O!1_#O#P!6g#P#o!1_#o#p!6m#p~!1_-w!4`]%jW%e,XOY!1_YZ2kZ]!1_]^2k^r!1_rs!2csw!1_wx!5Xx#O!1_#O#P!6g#P#o!1_#o#p!6m#p~!1_,a!5`X%jW%e,XOY!5XYZ6ZZ]!5X]^6Z^r!5Xrs!5{s#O!5X#O#P!6a#P~!5X,a!6QT%e,XOr6Zrs7Rs#O6Z#O#P7b#P~6Z,a!6dPO~!5X-w!6jPO~!1_-w!6v]%gS%jW%e,XOY!7oYZ8bZ]!7o]^8b^r!7ors!8ksw!7owx!9Xx#O!7o#O#P!:{#P#o!7o#o#p!1_#p~!7o,e!7xZ%gS%jW%e,XOY!7oYZ8bZ]!7o]^8b^r!7ors!8ksw!7owx!9Xx#O!7o#O#P!:{#P~!7o,e!8rV%gS%e,XOr8brs9jsw8bwx:Ux#O8b#O#P;[#P~8b,e!9`Z%jW%e,XOY!7oYZ8bZ]!7o]^8b^r!7ors!8ksw!7owx!:Rx#O!7o#O#P!:{#P~!7o,e!:YZ%jW%e,XOY!7oYZ8bZ]!7o]^8b^r!7ors!8ksw!7owx!5Xx#O!7o#O#P!:{#P~!7o,e!;OPO~!7oDT!;[_%p7[%jW%e,XOY!.oYZ(yZ]!.o]^(y^r!.ors!/{sw!.owx!<Zx#O!.o#O#P!0y#P#o!.o#o#p!6m#p#q!.o#q#r!1_#r~!.oBm!<d]%p7[%jW%e,XOY!<ZYZ<[Z]!<Z]^<[^r!<Zrs!=]s#O!<Z#O#P!>P#P#o!<Z#o#p!5X#p#q!<Z#q#r!5X#r~!<ZBm!=dX%p7[%e,XOr<[rs=ps#O<[#O#P>b#P#o<[#o#p6Z#p#q<[#q#r6Z#r~<[Bm!>UT%p7[O#o!<Z#o#p!5X#p#q!<Z#q#r!5X#r~!<ZDe!>jT%p7[O#o!+X#o#p!>y#p#q!+X#q#r!>y#r~!+X.X!?W]%gS%jW%e,X%m`%v!bOY!>yYZ?[Z]!>y]^?[^r!>yrs!@Psw!>ywx!3Xx#O!>y#O#P!@w#P#o!>y#o#p!@}#p~!>y.X!@[X%gS%e,X%m`%v!bOr?[rs@xsw?[wx4wx#O?[#O#PCO#P#o?[#o#pCU#p~?[.X!@zPO~!>y.X!AW]%gS%jW%e,XOY!7oYZ8bZ]!7o]^8b^r!7ors!8ksw!7owx!9Xx#O!7o#O#P!:{#P#o!7o#o#p!>y#p~!7oGZ!B^Z%p7[%gS%e,X%m`%v!bOr'Prs!CPsw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'PGZ!C`X%k#|%p7[%gS%i,X%m`%v!bOwDvwx,ex#ODv#O#PEn#P#oDv#o#pBd#p#qDv#q#rAn#r~DvMg!D`_Q1s%p7[%gS%jW%m`%sp%v!b%x#tOY!C{YZ$}Z]!C{]^$}^r!C{rs!E_sw!C{wx#Hqx#O!C{#O#P$(i#P#o!C{#o#p$*{#p#q!C{#q#r$)]#r~!C{JP!El_Q1s%p7[%gS%m`%v!bOY!FkYZ'PZ]!Fk]^'P^r!Fkrs#Eksw!Fkwx!Gyx#O!Fk#O#P#=u#P#o!Fk#o#p#Di#p#q!Fk#q#r#>i#r~!FkJP!Fz_Q1s%p7[%gS%jW%m`%v!bOY!FkYZ'PZ]!Fk]^'P^r!Fkrs!E_sw!Fkwx!Gyx#O!Fk#O#P#=u#P#o!Fk#o#p#Di#p#q!Fk#q#r#>i#r~!FkIo!HS_Q1s%p7[%jWOY!IRYZ(yZ]!IR]^(y^r!IRrs!J_sw!IRwx#8wx#O!IR#O#P#*R#P#o!IR#o#p#2}#p#q!IR#q#r#*u#r~!IRIo!I`_Q1s%p7[%gS%jW%v!bOY!IRYZ(yZ]!IR]^(y^r!IRrs!J_sw!IRwx!Gyx#O!IR#O#P#*R#P#o!IR#o#p#2}#p#q!IR#q#r#*u#r~!IRIo!Jj_Q1s%p7[%gS%v!bOY!IRYZ(yZ]!IR]^(y^r!IRrs!Kisw!IRwx!Gyx#O!IR#O#P#*R#P#o!IR#o#p#2}#p#q!IR#q#r#*u#r~!IRIo!Kt_Q1s%p7[%gS%v!bOY!IRYZ(yZ]!IR]^(y^r!IRrs!Lssw!IRwx!Gyx#O!IR#O#P#*R#P#o!IR#o#p#2}#p#q!IR#q#r#*u#r~!IRIg!MO]Q1s%p7[%gS%v!bOY!LsYZ+oZ]!Ls]^+o^w!Lswx!Mwx#O!Ls#O#P#!y#P#o!Ls#o#p#&m#p#q!Ls#q#r##m#r~!LsIg!NO]Q1s%p7[OY!LsYZ+oZ]!Ls]^+o^w!Lswx!Nwx#O!Ls#O#P#!y#P#o!Ls#o#p#&m#p#q!Ls#q#r##m#r~!LsIg# O]Q1s%p7[OY!LsYZ+oZ]!Ls]^+o^w!Lswx# wx#O!Ls#O#P#!y#P#o!Ls#o#p#&m#p#q!Ls#q#r##m#r~!LsHP#!OXQ1s%p7[OY# wYZ-wZ]# w]^-w^#o# w#o#p#!k#p#q# w#q#r#!k#r~# w1s#!pRQ1sOY#!kZ]#!k^~#!kIg##QXQ1s%p7[OY!LsYZ+oZ]!Ls]^+o^#o!Ls#o#p##m#p#q!Ls#q#r##m#r~!Ls3Z##vZQ1s%gS%v!bOY##mYZ.kZ]##m]^.k^w##mwx#$ix#O##m#O#P#&X#P#o##m#o#p#&m#p~##m3Z#$nZQ1sOY##mYZ.kZ]##m]^.k^w##mwx#%ax#O##m#O#P#&X#P#o##m#o#p#&m#p~##m3Z#%fZQ1sOY##mYZ.kZ]##m]^.k^w##mwx#!kx#O##m#O#P#&X#P#o##m#o#p#&m#p~##m3Z#&^TQ1sOY##mYZ.kZ]##m]^.k^~##m3Z#&tZQ1s%gSOY#'gYZ0xZ]#'g]^0x^w#'gwx#(Zx#O#'g#O#P#)m#P#o#'g#o#p##m#p~#'g1w#'nXQ1s%gSOY#'gYZ0xZ]#'g]^0x^w#'gwx#(Zx#O#'g#O#P#)m#P~#'g1w#(`XQ1sOY#'gYZ0xZ]#'g]^0x^w#'gwx#({x#O#'g#O#P#)m#P~#'g1w#)QXQ1sOY#'gYZ0xZ]#'g]^0x^w#'gwx#!kx#O#'g#O#P#)m#P~#'g1w#)rTQ1sOY#'gYZ0xZ]#'g]^0x^~#'gIo#*YXQ1s%p7[OY!IRYZ(yZ]!IR]^(y^#o!IR#o#p#*u#p#q!IR#q#r#*u#r~!IR3c#+Q]Q1s%gS%jW%v!bOY#*uYZ2kZ]#*u]^2k^r#*urs#+ysw#*uwx#-}x#O#*u#O#P#2i#P#o#*u#o#p#2}#p~#*u3c#,S]Q1s%gS%v!bOY#*uYZ2kZ]#*u]^2k^r#*urs#,{sw#*uwx#-}x#O#*u#O#P#2i#P#o#*u#o#p#2}#p~#*u3c#-U]Q1s%gS%v!bOY#*uYZ2kZ]#*u]^2k^r#*urs##msw#*uwx#-}x#O#*u#O#P#2i#P#o#*u#o#p#2}#p~#*u3c#.U]Q1s%jWOY#*uYZ2kZ]#*u]^2k^r#*urs#+ysw#*uwx#.}x#O#*u#O#P#2i#P#o#*u#o#p#2}#p~#*u3c#/U]Q1s%jWOY#*uYZ2kZ]#*u]^2k^r#*urs#+ysw#*uwx#/}x#O#*u#O#P#2i#P#o#*u#o#p#2}#p~#*u1{#0UXQ1s%jWOY#/}YZ6ZZ]#/}]^6Z^r#/}rs#0qs#O#/}#O#P#2T#P~#/}1{#0vXQ1sOY#/}YZ6ZZ]#/}]^6Z^r#/}rs#1cs#O#/}#O#P#2T#P~#/}1{#1hXQ1sOY#/}YZ6ZZ]#/}]^6Z^r#/}rs#!ks#O#/}#O#P#2T#P~#/}1{#2YTQ1sOY#/}YZ6ZZ]#/}]^6Z^~#/}3c#2nTQ1sOY#*uYZ2kZ]#*u]^2k^~#*u3c#3W]Q1s%gS%jWOY#4PYZ8bZ]#4P]^8b^r#4Prs#4{sw#4Pwx#6ox#O#4P#O#P#8c#P#o#4P#o#p#*u#p~#4P2P#4YZQ1s%gS%jWOY#4PYZ8bZ]#4P]^8b^r#4Prs#4{sw#4Pwx#6ox#O#4P#O#P#8c#P~#4P2P#5SZQ1s%gSOY#4PYZ8bZ]#4P]^8b^r#4Prs#5usw#4Pwx#6ox#O#4P#O#P#8c#P~#4P2P#5|ZQ1s%gSOY#4PYZ8bZ]#4P]^8b^r#4Prs#'gsw#4Pwx#6ox#O#4P#O#P#8c#P~#4P2P#6vZQ1s%jWOY#4PYZ8bZ]#4P]^8b^r#4Prs#4{sw#4Pwx#7ix#O#4P#O#P#8c#P~#4P2P#7pZQ1s%jWOY#4PYZ8bZ]#4P]^8b^r#4Prs#4{sw#4Pwx#/}x#O#4P#O#P#8c#P~#4P2P#8hTQ1sOY#4PYZ8bZ]#4P]^8b^~#4PIo#9Q_Q1s%p7[%jWOY!IRYZ(yZ]!IR]^(y^r!IRrs!J_sw!IRwx#:Px#O!IR#O#P#*R#P#o!IR#o#p#2}#p#q!IR#q#r#*u#r~!IRHX#:Y]Q1s%p7[%jWOY#:PYZ<[Z]#:P]^<[^r#:Prs#;Rs#O#:P#O#P#=R#P#o#:P#o#p#/}#p#q#:P#q#r#/}#r~#:PHX#;Y]Q1s%p7[OY#:PYZ<[Z]#:P]^<[^r#:Prs#<Rs#O#:P#O#P#=R#P#o#:P#o#p#/}#p#q#:P#q#r#/}#r~#:PHX#<Y]Q1s%p7[OY#:PYZ<[Z]#:P]^<[^r#:Prs# ws#O#:P#O#P#=R#P#o#:P#o#p#/}#p#q#:P#q#r#/}#r~#:PHX#=YXQ1s%p7[OY#:PYZ<[Z]#:P]^<[^#o#:P#o#p#/}#p#q#:P#q#r#/}#r~#:PJP#=|XQ1s%p7[OY!FkYZ'PZ]!Fk]^'P^#o!Fk#o#p#>i#p#q!Fk#q#r#>i#r~!Fk3s#>v]Q1s%gS%jW%m`%v!bOY#>iYZ?[Z]#>i]^?[^r#>irs#?osw#>iwx#-}x#O#>i#O#P#DT#P#o#>i#o#p#Di#p~#>i3s#?z]Q1s%gS%m`%v!bOY#>iYZ?[Z]#>i]^?[^r#>irs#@ssw#>iwx#-}x#O#>i#O#P#DT#P#o#>i#o#p#Di#p~#>i3s#AO]Q1s%gS%m`%v!bOY#>iYZ?[Z]#>i]^?[^r#>irs#Awsw#>iwx#-}x#O#>i#O#P#DT#P#o#>i#o#p#Di#p~#>i3k#BSZQ1s%gS%m`%v!bOY#AwYZAnZ]#Aw]^An^w#Awwx#$ix#O#Aw#O#P#Bu#P#o#Aw#o#p#CZ#p~#Aw3k#BzTQ1sOY#AwYZAnZ]#Aw]^An^~#Aw3k#CbZQ1s%gSOY#'gYZ0xZ]#'g]^0x^w#'gwx#(Zx#O#'g#O#P#)m#P#o#'g#o#p#Aw#p~#'g3s#DYTQ1sOY#>iYZ?[Z]#>i]^?[^~#>i3s#Dr]Q1s%gS%jWOY#4PYZ8bZ]#4P]^8b^r#4Prs#4{sw#4Pwx#6ox#O#4P#O#P#8c#P#o#4P#o#p#>i#p~#4PJP#Ex_Q1s%p7[%gS%m`%v!bOY!FkYZ'PZ]!Fk]^'P^r!Fkrs#Fwsw!Fkwx!Gyx#O!Fk#O#P#=u#P#o!Fk#o#p#Di#p#q!Fk#q#r#>i#r~!FkIw#GU]Q1s%p7[%gS%m`%v!bOY#FwYZDvZ]#Fw]^Dv^w#Fwwx!Mwx#O#Fw#O#P#G}#P#o#Fw#o#p#CZ#p#q#Fw#q#r#Aw#r~#FwIw#HUXQ1s%p7[OY#FwYZDvZ]#Fw]^Dv^#o#Fw#o#p#Aw#p#q#Fw#q#r#Aw#r~#FwMV#IO_Q1s%p7[%jW%sp%x#tOY#I}YZGQZ]#I}]^GQ^r#I}rs!J_sw#I}wx$%]x#O#I}#O#P#K_#P#o#I}#o#p$$Z#p#q#I}#q#r#LR#r~#I}MV#J`_Q1s%p7[%gS%jW%sp%v!b%x#tOY#I}YZGQZ]#I}]^GQ^r#I}rs!J_sw#I}wx#Hqx#O#I}#O#P#K_#P#o#I}#o#p$$Z#p#q#I}#q#r#LR#r~#I}MV#KfXQ1s%p7[OY#I}YZGQZ]#I}]^GQ^#o#I}#o#p#LR#p#q#I}#q#r#LR#r~#I}6y#Lb]Q1s%gS%jW%sp%v!b%x#tOY#LRYZHhZ]#LR]^Hh^r#LRrs#+ysw#LRwx#MZx#O#LR#O#P$#u#P#o#LR#o#p$$Z#p~#LR6y#Mf]Q1s%jW%sp%x#tOY#LRYZHhZ]#LR]^Hh^r#LRrs#+ysw#LRwx#N_x#O#LR#O#P$#u#P#o#LR#o#p$$Z#p~#LR6y#Nj]Q1s%jW%sp%x#tOY#LRYZHhZ]#LR]^Hh^r#LRrs#+ysw#LRwx$ cx#O#LR#O#P$#u#P#o#LR#o#p$$Z#p~#LR5c$ n]Q1s%jW%sp%x#tOY$ cYZJ|Z]$ c]^J|^r$ crs#0qsw$ cwx$ cx#O$ c#O#P$!g#P#o$ c#o#p$!{#p~$ c5c$!lTQ1sOY$ cYZJ|Z]$ c]^J|^~$ c5c$#SZQ1s%jWOY#/}YZ6ZZ]#/}]^6Z^r#/}rs#0qs#O#/}#O#P#2T#P#o#/}#o#p$ c#p~#/}6y$#zTQ1sOY#LRYZHhZ]#LR]^Hh^~#LR6y$$d]Q1s%gS%jWOY#4PYZ8bZ]#4P]^8b^r#4Prs#4{sw#4Pwx#6ox#O#4P#O#P#8c#P#o#4P#o#p#LR#p~#4PMV$%j_Q1s%p7[%jW%sp%x#tOY#I}YZGQZ]#I}]^GQ^r#I}rs!J_sw#I}wx$&ix#O#I}#O#P#K_#P#o#I}#o#p$$Z#p#q#I}#q#r#LR#r~#I}Ko$&v_Q1s%p7[%jW%sp%x#tOY$&iYZN[Z]$&i]^N[^r$&irs#;Rsw$&iwx$&ix#O$&i#O#P$'u#P#o$&i#o#p$!{#p#q$&i#q#r$ c#r~$&iKo$'|XQ1s%p7[OY$&iYZN[Z]$&i]^N[^#o$&i#o#p$ c#p#q$&i#q#r$ c#r~$&iMg$(pXQ1s%p7[OY!C{YZ$}Z]!C{]^$}^#o!C{#o#p$)]#p#q!C{#q#r$)]#r~!C{7Z$)n]Q1s%gS%jW%m`%sp%v!b%x#tOY$)]YZ!!SZ]$)]]^!!S^r$)]rs#?osw$)]wx#MZx#O$)]#O#P$*g#P#o$)]#o#p$*{#p~$)]7Z$*lTQ1sOY$)]YZ!!SZ]$)]]^!!S^~$)]7Z$+U]Q1s%gS%jWOY#4PYZ8bZ]#4P]^8b^r#4Prs#4{sw#4Pwx#6ox#O#4P#O#P#8c#P#o#4P#o#p$)]#p~#4PGz$,b]$}Q%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gz$-nZ!s,W%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gz$.t]$wQ%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{$/|_%q`%p7[%jW%e,X%sp%x#tOY$0{YZGQZ]$0{]^GQ^r$0{rs$2]sw$0{wx$Jex#O$0{#O#P$Fw#P#o$0{#o#p$Ic#p#q$0{#q#r$G]#r~$0{Gk$1^_%p7[%gS%jW%e,X%sp%v!b%x#tOY$0{YZGQZ]$0{]^GQ^r$0{rs$2]sw$0{wx$Ewx#O$0{#O#P$Fw#P#o$0{#o#p$Ic#p#q$0{#q#r$G]#r~$0{DT$2h_%p7[%gS%e,X%v!bOY$3gYZ(yZ]$3g]^(y^r$3grs$Basw$3gwx$4sx#O$3g#O#P$5o#P#o$3g#o#p$={#p#q$3g#q#r$6T#r~$3gDT$3t_%p7[%gS%jW%e,X%v!bOY$3gYZ(yZ]$3g]^(y^r$3grs$2]sw$3gwx$4sx#O$3g#O#P$5o#P#o$3g#o#p$={#p#q$3g#q#r$6T#r~$3gDT$4|Z%p7[%jW%e,XOr(yrs)wsw(ywx;bx#O(y#O#P2V#P#o(y#o#p7n#p#q(y#q#r2k#r~(yDT$5tT%p7[O#o$3g#o#p$6T#p#q$3g#q#r$6T#r~$3g-w$6`]%gS%jW%e,X%v!bOY$6TYZ2kZ]$6T]^2k^r$6Trs$7Xsw$6Twx$=Rx#O$6T#O#P$=u#P#o$6T#o#p$={#p~$6T-w$7b]%gS%e,X%v!bOY$6TYZ2kZ]$6T]^2k^r$6Trs$8Zsw$6Twx$=Rx#O$6T#O#P$=u#P#o$6T#o#p$={#p~$6T-w$8d]%gS%e,X%v!bOY$6TYZ2kZ]$6T]^2k^r$6Trs$9]sw$6Twx$=Rx#O$6T#O#P$=u#P#o$6T#o#p$={#p~$6T-o$9fZ%gS%e,X%v!bOY$9]YZ.kZ]$9]]^.k^w$9]wx$:Xx#O$9]#O#P$:s#P#o$9]#o#p$:y#p~$9]-o$:^V%e,XOw.kwx/qx#O.k#O#P0W#P#o.k#o#p0^#p~.k-o$:vPO~$9]-o$;QZ%gS%e,XOY$;sYZ0xZ]$;s]^0x^w$;swx$<gx#O$;s#O#P$<{#P#o$;s#o#p$9]#p~$;s,]$;zX%gS%e,XOY$;sYZ0xZ]$;s]^0x^w$;swx$<gx#O$;s#O#P$<{#P~$;s,]$<lT%e,XOw0xwx1px#O0x#O#P2P#P~0x,]$=OPO~$;s-w$=YX%jW%e,XOr2krs3asw2kwx5ix#O2k#O#P7h#P#o2k#o#p7n#p~2k-w$=xPO~$6T-w$>U]%gS%jW%e,XOY$>}YZ8bZ]$>}]^8b^r$>}rs$?ysw$>}wx$Amx#O$>}#O#P$BZ#P#o$>}#o#p$6T#p~$>},e$?WZ%gS%jW%e,XOY$>}YZ8bZ]$>}]^8b^r$>}rs$?ysw$>}wx$Amx#O$>}#O#P$BZ#P~$>},e$@QZ%gS%e,XOY$>}YZ8bZ]$>}]^8b^r$>}rs$@ssw$>}wx$Amx#O$>}#O#P$BZ#P~$>},e$@zZ%gS%e,XOY$>}YZ8bZ]$>}]^8b^r$>}rs$;ssw$>}wx$Amx#O$>}#O#P$BZ#P~$>},e$AtV%jW%e,XOr8brs9Osw8bwx:px#O8b#O#P;[#P~8b,e$B^PO~$>}DT$Bl_%p7[%gS%e,X%v!bOY$3gYZ(yZ]$3g]^(y^r$3grs$Cksw$3gwx$4sx#O$3g#O#P$5o#P#o$3g#o#p$={#p#q$3g#q#r$6T#r~$3gC{$Cv]%p7[%gS%e,X%v!bOY$CkYZ+oZ]$Ck]^+o^w$Ckwx$Dox#O$Ck#O#P$Ec#P#o$Ck#o#p$:y#p#q$Ck#q#r$9]#r~$CkC{$DvX%p7[%e,XOw+owx-Vx#O+o#O#P.V#P#o+o#o#p0^#p#q+o#q#r.k#r~+oC{$EhT%p7[O#o$Ck#o#p$9]#p#q$Ck#q#r$9]#r~$CkGk$FUZ%p7[%jW%e,X%sp%x#tOrGQrs)wswGQwxM^x#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQGk$F|T%p7[O#o$0{#o#p$G]#p#q$0{#q#r$G]#r~$0{1_$Gl]%gS%jW%e,X%sp%v!b%x#tOY$G]YZHhZ]$G]]^Hh^r$G]rs$7Xsw$G]wx$Hex#O$G]#O#P$I]#P#o$G]#o#p$Ic#p~$G]1_$HpX%jW%e,X%sp%x#tOrHhrs3aswHhwxJWx#OHh#O#PLd#P#oHh#o#pLj#p~Hh1_$I`PO~$G]1_$Il]%gS%jW%e,XOY$>}YZ8bZ]$>}]^8b^r$>}rs$?ysw$>}wx$Amx#O$>}#O#P$BZ#P#o$>}#o#p$G]#p~$>}Gk$JrZ%p7[%jW%e,X%sp%x#tOrGQrs)wswGQwx$Kex#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQGk$KtZ%h!f%p7[%jW%f,X%sp%x#tOrN[rs=OswN[wxN[x#ON[#O#P! Y#P#oN[#o#pKx#p#qN[#q#rJ|#r~N[G{$LzZf,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}<u$NQZ!OR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{% W_T,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSxz$}z{%!V{!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%!j]_R%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%#v]$z,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}<u%%SZwR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Mg%&Y^${,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`!a%'U!a#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}B^%'iZ&S&j%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%(o_!dQ%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!O$}!O!P%)n!P!Q$}!Q![%,O![#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%*P]%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!O$}!O!P%*x!P#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%+]Z!m,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%,cg!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q![%,O![!g$}!g!h%-z!h!l$}!l!m%2[!m#O$}#O#P! n#P#R$}#R#S%,O#S#X$}#X#Y%-z#Y#^$}#^#_%2[#_#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%.]a%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx{$}{|%/b|}$}}!O%/b!O!Q$}!Q![%0l![#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%/s]%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q![%0l![#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%1Pc!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q![%0l![!l$}!l!m%2[!m#O$}#O#P! n#P#R$}#R#S%0l#S#^$}#^#_%2[#_#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%2oZ!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%3u_$|R%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!P$}!P!Q%4t!Q!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gz%5X]%OQ%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%6eu!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!O$}!O!P%8x!P!Q$}!Q![%:S![!d$}!d!e%<U!e!g$}!g!h%-z!h!l$}!l!m%2[!m!q$}!q!r%?O!r!z$}!z!{%Ar!{#O$}#O#P! n#P#R$}#R#S%:S#S#U$}#U#V%<U#V#X$}#X#Y%-z#Y#^$}#^#_%2[#_#c$}#c#d%?O#d#l$}#l#m%Ar#m#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%9Z]%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q![%,O![#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%:gi!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!O$}!O!P%8x!P!Q$}!Q![%:S![!g$}!g!h%-z!h!l$}!l!m%2[!m#O$}#O#P! n#P#R$}#R#S%:S#S#X$}#X#Y%-z#Y#^$}#^#_%2[#_#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%<g`%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q!R%=i!R!S%=i!S#O$}#O#P! n#P#R$}#R#S%=i#S#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%=|`!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q!R%=i!R!S%=i!S#O$}#O#P! n#P#R$}#R#S%=i#S#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%?a_%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q!Y%@`!Y#O$}#O#P! n#P#R$}#R#S%@`#S#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%@s_!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q!Y%@`!Y#O$}#O#P! n#P#R$}#R#S%@`#S#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%BTc%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q![%C`![!c$}!c!i%C`!i#O$}#O#P! n#P#R$}#R#S%C`#S#T$}#T#Z%C`#Z#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy%Csc!f,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!Q$}!Q![%C`![!c$}!c!i%C`!i#O$}#O#P! n#P#R$}#R#S%C`#S#T$}#T#Z%C`#Z#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Mg%Ec]x1s%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`%F[!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}<u%FoZ%WR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%GuZ#^,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%H{_jR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!^$}!^!_%Iz!_!`!'m!`!a!'m!a#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gz%J_]$xQ%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%Kk]%V,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`!'m!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{%Lw^jR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`!'m!`!a%Ms!a#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gz%NW]$yQ%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}G{& f]]Q#tP%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Mg&!tc%p7[%gS%jW%d&j%m`%sp%v!b%x#t%Q,XOr$}rs&Rsw$}wxFSx!Q$}!Q![&!_![!c$}!c!}&!_!}#O$}#O#P! n#P#R$}#R#S&!_#S#T$}#T#o&!_#o#p!#U#p#q$}#q#r!!S#r$g$}$g~&!_Mg&$fg%p7[%gS%jW%d&j%m`%sp%v!b%x#t%Q,XOr$}rs&%}sw$}wx&)Tx!Q$}!Q![&!_![!c$}!c!t&!_!t!u&,a!u!}&!_!}#O$}#O#P! n#P#R$}#R#S&!_#S#T$}#T#f&!_#f#g&,a#g#o&!_#o#p!#U#p#q$}#q#r!!S#r$g$}$g~&!_De&&[_%p7[%gS%e,X%m`%v!bOY!+XYZ'PZ]!+X]^'P^r!+Xrs&'Zsw!+Xwx!-gx#O!+X#O#P!>e#P#o!+X#o#p!@}#p#q!+X#q#r!>y#r~!+XDe&'hZ%p7[%gS%e,X%m`%v!bOr'Prs&(Zsw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'PD]&(hX%p7[%gS%i,X%m`%v!bOwDvwx,ex#ODv#O#PEn#P#oDv#o#pBd#p#qDv#q#rAn#r~DvGk&)b_%p7[%jW%e,X%sp%x#tOY$0{YZGQZ]$0{]^GQ^r$0{rs$2]sw$0{wx&*ax#O$0{#O#P$Fw#P#o$0{#o#p$Ic#p#q$0{#q#r$G]#r~$0{Gk&*nZ%p7[%jW%e,X%sp%x#tOrGQrs)wswGQwx&+ax#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQFT&+nZ%p7[%jW%f,X%sp%x#tOrN[rs=OswN[wxN[x#ON[#O#P! Y#P#oN[#o#pKx#p#qN[#q#rJ|#r~N[Mg&,vc%p7[%gS%jW%d&j%m`%sp%v!b%x#t%Q,XOr$}rs&%}sw$}wx&)Tx!Q$}!Q![&!_![!c$}!c!}&!_!}#O$}#O#P! n#P#R$}#R#S&!_#S#T$}#T#o&!_#o#p!#U#p#q$}#q#r!!S#r$g$}$g~&!_Mg&.hg%p7[%gS%jW%d&j%m`%sp%v!b%x#t%Q,XOr$}rs&0Psw$}wx&2wx!Q$}!Q![&!_![!c$}!c!t&!_!t!u&5u!u!}&!_!}#O$}#O#P! n#P#R$}#R#S&!_#S#T$}#T#f&!_#f#g&5u#g#o&!_#o#p!#U#p#q$}#q#r!!S#r$g$}$g~&!_De&0^Z%p7[%gS%m`%v!b%r,XOr'Prs&1Psw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'PDe&1[Z%p7[%gS%m`%v!bOr'Prs&1}sw'Pwx(Px#O'P#O#P>v#P#o'P#o#pCU#p#q'P#q#r?[#r~'PD]&2[X%p7[%gS%w,X%m`%v!bOwDvwx,ex#ODv#O#PEn#P#oDv#o#pBd#p#qDv#q#rAn#r~DvGk&3UZ%p7[%jW%sp%x#t%l,XOrGQrs)wswGQwx&3wx#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQGk&4SZ%p7[%jW%sp%x#tOrGQrs)wswGQwx&4ux#OGQ#O#PHS#P#oGQ#o#pLj#p#qGQ#q#rHh#r~GQFT&5SZ%p7[%jW%u,X%sp%x#tOrN[rs=OswN[wxN[x#ON[#O#P! Y#P#oN[#o#pKx#p#qN[#q#rJ|#r~N[Mg&6[c%p7[%gS%jW%d&j%m`%sp%v!b%x#t%Q,XOr$}rs&0Psw$}wx&2wx!Q$}!Q![&!_![!c$}!c!}&!_!}#O$}#O#P! n#P#R$}#R#S&!_#S#T$}#T#o&!_#o#p!#U#p#q$}#q#r!!S#r$g$}$g~&!_Mg&7|k%p7[%gS%jW%d&j%m`%sp%v!b%x#t%Q,XOr$}rs&%}sw$}wx&)Tx!Q$}!Q![&!_![!c$}!c!h&!_!h!i&5u!i!t&!_!t!u&,a!u!}&!_!}#O$}#O#P! n#P#R$}#R#S&!_#S#T$}#T#U&!_#U#V&,a#V#Y&!_#Y#Z&5u#Z#o&!_#o#p!#U#p#q$}#q#r!!S#r$g$}$g~&!_G{&:UZ!V,X%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}<u&;[Z!WR%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gz&<b]$vQ%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}Gy&=dX%gS%jW!ZGmOr8brs9Osw8bwx:Ux#O8b#O#P;[#P#o8b#o#p!!S#p~8bGz&>d]$uQ%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx!_$}!_!`$-Z!`#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}<u&?nX![7_%gS%jW%m`%sp%v!b%x#tOr!!Srs@Ssw!!SwxIbx#O!!S#O#P!#O#P#o!!S#o#p!#U#p~!!SGy&@nZ%P,V%p7[%gS%jW%m`%sp%v!b%x#tOr$}rs&Rsw$}wxFSx#O$}#O#P! n#P#o$}#o#p!#U#p#q$}#q#r!!S#r~$}",
  tokenizers: [legacyPrint, indentation, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, newlines],
  topRules: {"Script":[0,3]},
  specialized: [{term: 186, get: value => spec_identifier[value] || -1}],
  tokenPrec: 6594
});




/***/ }),

/***/ "./node_modules/lezer-tree/dist/tree.es.js":
/*!*************************************************!*\
  !*** ./node_modules/lezer-tree/dist/tree.es.js ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DefaultBufferLength": () => (/* binding */ DefaultBufferLength),
/* harmony export */   "NodeProp": () => (/* binding */ NodeProp),
/* harmony export */   "NodeSet": () => (/* binding */ NodeSet),
/* harmony export */   "NodeType": () => (/* binding */ NodeType),
/* harmony export */   "Tree": () => (/* binding */ Tree),
/* harmony export */   "TreeBuffer": () => (/* binding */ TreeBuffer),
/* harmony export */   "TreeCursor": () => (/* binding */ TreeCursor),
/* harmony export */   "TreeFragment": () => (/* binding */ TreeFragment),
/* harmony export */   "stringInput": () => (/* binding */ stringInput)
/* harmony export */ });
/// The default maximum length of a `TreeBuffer` node.
const DefaultBufferLength = 1024;
let nextPropID = 0;
const CachedNode = new WeakMap();
/// Each [node type](#tree.NodeType) can have metadata associated with
/// it in props. Instances of this class represent prop names.
class NodeProp {
    /// Create a new node prop type. You can optionally pass a
    /// `deserialize` function.
    constructor({ deserialize } = {}) {
        this.id = nextPropID++;
        this.deserialize = deserialize || (() => {
            throw new Error("This node type doesn't define a deserialize function");
        });
    }
    /// Create a string-valued node prop whose deserialize function is
    /// the identity function.
    static string() { return new NodeProp({ deserialize: str => str }); }
    /// Create a number-valued node prop whose deserialize function is
    /// just `Number`.
    static number() { return new NodeProp({ deserialize: Number }); }
    /// Creates a boolean-valued node prop whose deserialize function
    /// returns true for any input.
    static flag() { return new NodeProp({ deserialize: () => true }); }
    /// Store a value for this prop in the given object. This can be
    /// useful when building up a prop object to pass to the
    /// [`NodeType`](#tree.NodeType) constructor. Returns its first
    /// argument.
    set(propObj, value) {
        propObj[this.id] = value;
        return propObj;
    }
    /// This is meant to be used with
    /// [`NodeSet.extend`](#tree.NodeSet.extend) or
    /// [`Parser.withProps`](#lezer.Parser.withProps) to compute prop
    /// values for each node type in the set. Takes a [match
    /// object](#tree.NodeType^match) or function that returns undefined
    /// if the node type doesn't get this prop, and the prop's value if
    /// it does.
    add(match) {
        if (typeof match != "function")
            match = NodeType.match(match);
        return (type) => {
            let result = match(type);
            return result === undefined ? null : [this, result];
        };
    }
}
/// Prop that is used to describe matching delimiters. For opening
/// delimiters, this holds an array of node names (written as a
/// space-separated string when declaring this prop in a grammar)
/// for the node types of closing delimiters that match it.
NodeProp.closedBy = new NodeProp({ deserialize: str => str.split(" ") });
/// The inverse of [`openedBy`](#tree.NodeProp^closedBy). This is
/// attached to closing delimiters, holding an array of node names
/// of types of matching opening delimiters.
NodeProp.openedBy = new NodeProp({ deserialize: str => str.split(" ") });
/// Used to assign node types to groups (for example, all node
/// types that represent an expression could be tagged with an
/// `"Expression"` group).
NodeProp.group = new NodeProp({ deserialize: str => str.split(" ") });
const noProps = Object.create(null);
/// Each node in a syntax tree has a node type associated with it.
class NodeType {
    /// @internal
    constructor(
    /// The name of the node type. Not necessarily unique, but if the
    /// grammar was written properly, different node types with the
    /// same name within a node set should play the same semantic
    /// role.
    name, 
    /// @internal
    props, 
    /// The id of this node in its set. Corresponds to the term ids
    /// used in the parser.
    id, 
    /// @internal
    flags = 0) {
        this.name = name;
        this.props = props;
        this.id = id;
        this.flags = flags;
    }
    static define(spec) {
        let props = spec.props && spec.props.length ? Object.create(null) : noProps;
        let flags = (spec.top ? 1 /* Top */ : 0) | (spec.skipped ? 2 /* Skipped */ : 0) |
            (spec.error ? 4 /* Error */ : 0) | (spec.name == null ? 8 /* Anonymous */ : 0);
        let type = new NodeType(spec.name || "", props, spec.id, flags);
        if (spec.props)
            for (let src of spec.props) {
                if (!Array.isArray(src))
                    src = src(type);
                if (src)
                    src[0].set(props, src[1]);
            }
        return type;
    }
    /// Retrieves a node prop for this type. Will return `undefined` if
    /// the prop isn't present on this node.
    prop(prop) { return this.props[prop.id]; }
    /// True when this is the top node of a grammar.
    get isTop() { return (this.flags & 1 /* Top */) > 0; }
    /// True when this node is produced by a skip rule.
    get isSkipped() { return (this.flags & 2 /* Skipped */) > 0; }
    /// Indicates whether this is an error node.
    get isError() { return (this.flags & 4 /* Error */) > 0; }
    /// When true, this node type doesn't correspond to a user-declared
    /// named node, for example because it is used to cache repetition.
    get isAnonymous() { return (this.flags & 8 /* Anonymous */) > 0; }
    /// Returns true when this node's name or one of its
    /// [groups](#tree.NodeProp^group) matches the given string.
    is(name) {
        if (typeof name == 'string') {
            if (this.name == name)
                return true;
            let group = this.prop(NodeProp.group);
            return group ? group.indexOf(name) > -1 : false;
        }
        return this.id == name;
    }
    /// Create a function from node types to arbitrary values by
    /// specifying an object whose property names are node or
    /// [group](#tree.NodeProp^group) names. Often useful with
    /// [`NodeProp.add`](#tree.NodeProp.add). You can put multiple
    /// names, separated by spaces, in a single property name to map
    /// multiple node names to a single value.
    static match(map) {
        let direct = Object.create(null);
        for (let prop in map)
            for (let name of prop.split(" "))
                direct[name] = map[prop];
        return (node) => {
            for (let groups = node.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
                let found = direct[i < 0 ? node.name : groups[i]];
                if (found)
                    return found;
            }
        };
    }
}
/// An empty dummy node type to use when no actual type is available.
NodeType.none = new NodeType("", Object.create(null), 0, 8 /* Anonymous */);
/// A node set holds a collection of node types. It is used to
/// compactly represent trees by storing their type ids, rather than a
/// full pointer to the type object, in a number array. Each parser
/// [has](#lezer.Parser.nodeSet) a node set, and [tree
/// buffers](#tree.TreeBuffer) can only store collections of nodes
/// from the same set. A set can have a maximum of 2**16 (65536)
/// node types in it, so that the ids fit into 16-bit typed array
/// slots.
class NodeSet {
    /// Create a set with the given types. The `id` property of each
    /// type should correspond to its position within the array.
    constructor(
    /// The node types in this set, by id.
    types) {
        this.types = types;
        for (let i = 0; i < types.length; i++)
            if (types[i].id != i)
                throw new RangeError("Node type ids should correspond to array positions when creating a node set");
    }
    /// Create a copy of this set with some node properties added. The
    /// arguments to this method should be created with
    /// [`NodeProp.add`](#tree.NodeProp.add).
    extend(...props) {
        let newTypes = [];
        for (let type of this.types) {
            let newProps = null;
            for (let source of props) {
                let add = source(type);
                if (add) {
                    if (!newProps)
                        newProps = Object.assign({}, type.props);
                    add[0].set(newProps, add[1]);
                }
            }
            newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
        }
        return new NodeSet(newTypes);
    }
}
/// A piece of syntax tree. There are two ways to approach these
/// trees: the way they are actually stored in memory, and the
/// convenient way.
///
/// Syntax trees are stored as a tree of `Tree` and `TreeBuffer`
/// objects. By packing detail information into `TreeBuffer` leaf
/// nodes, the representation is made a lot more memory-efficient.
///
/// However, when you want to actually work with tree nodes, this
/// representation is very awkward, so most client code will want to
/// use the `TreeCursor` interface instead, which provides a view on
/// some part of this data structure, and can be used to move around
/// to adjacent nodes.
class Tree {
    /// Construct a new tree. You usually want to go through
    /// [`Tree.build`](#tree.Tree^build) instead.
    constructor(type, 
    /// The tree's child nodes. Children small enough to fit in a
    /// `TreeBuffer will be represented as such, other children can be
    /// further `Tree` instances with their own internal structure.
    children, 
    /// The positions (offsets relative to the start of this tree) of
    /// the children.
    positions, 
    /// The total length of this tree
    length) {
        this.type = type;
        this.children = children;
        this.positions = positions;
        this.length = length;
    }
    /// @internal
    toString() {
        let children = this.children.map(c => c.toString()).join();
        return !this.type.name ? children :
            (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) +
                (children.length ? "(" + children + ")" : "");
    }
    /// Get a [tree cursor](#tree.TreeCursor) rooted at this tree. When
    /// `pos` is given, the cursor is [moved](#tree.TreeCursor.moveTo)
    /// to the given position and side.
    cursor(pos, side = 0) {
        let scope = (pos != null && CachedNode.get(this)) || this.topNode;
        let cursor = new TreeCursor(scope);
        if (pos != null) {
            cursor.moveTo(pos, side);
            CachedNode.set(this, cursor._tree);
        }
        return cursor;
    }
    /// Get a [tree cursor](#tree.TreeCursor) that, unlike regular
    /// cursors, doesn't skip [anonymous](#tree.NodeType.isAnonymous)
    /// nodes.
    fullCursor() {
        return new TreeCursor(this.topNode, true);
    }
    /// Get a [syntax node](#tree.SyntaxNode) object for the top of the
    /// tree.
    get topNode() {
        return new TreeNode(this, 0, 0, null);
    }
    /// Get the [syntax node](#tree.SyntaxNode) at the given position.
    /// If `side` is -1, this will move into nodes that end at the
    /// position. If 1, it'll move into nodes that start at the
    /// position. With 0, it'll only enter nodes that cover the position
    /// from both sides.
    resolve(pos, side = 0) {
        return this.cursor(pos, side).node;
    }
    /// Iterate over the tree and its children, calling `enter` for any
    /// node that touches the `from`/`to` region (if given) before
    /// running over such a node's children, and `leave` (if given) when
    /// leaving the node. When `enter` returns `false`, the given node
    /// will not have its children iterated over (or `leave` called).
    iterate(spec) {
        let { enter, leave, from = 0, to = this.length } = spec;
        for (let c = this.cursor();;) {
            let mustLeave = false;
            if (c.from <= to && c.to >= from && (c.type.isAnonymous || enter(c.type, c.from, c.to) !== false)) {
                if (c.firstChild())
                    continue;
                if (!c.type.isAnonymous)
                    mustLeave = true;
            }
            for (;;) {
                if (mustLeave && leave)
                    leave(c.type, c.from, c.to);
                mustLeave = c.type.isAnonymous;
                if (c.nextSibling())
                    break;
                if (!c.parent())
                    return;
                mustLeave = true;
            }
        }
    }
    /// Balance the direct children of this tree.
    balance(maxBufferLength = DefaultBufferLength) {
        return this.children.length <= BalanceBranchFactor ? this
            : balanceRange(this.type, NodeType.none, this.children, this.positions, 0, this.children.length, 0, maxBufferLength, this.length, 0);
    }
    /// Build a tree from a postfix-ordered buffer of node information,
    /// or a cursor over such a buffer.
    static build(data) { return buildTree(data); }
}
/// The empty tree
Tree.empty = new Tree(NodeType.none, [], [], 0);
// For trees that need a context hash attached, we're using this
// kludge which assigns an extra property directly after
// initialization (creating a single new object shape).
function withHash(tree, hash) {
    if (hash)
        tree.contextHash = hash;
    return tree;
}
/// Tree buffers contain (type, start, end, endIndex) quads for each
/// node. In such a buffer, nodes are stored in prefix order (parents
/// before children, with the endIndex of the parent indicating which
/// children belong to it)
class TreeBuffer {
    /// Create a tree buffer @internal
    constructor(
    /// @internal
    buffer, 
    // The total length of the group of nodes in the buffer.
    length, 
    /// @internal
    set, type = NodeType.none) {
        this.buffer = buffer;
        this.length = length;
        this.set = set;
        this.type = type;
    }
    /// @internal
    toString() {
        let result = [];
        for (let index = 0; index < this.buffer.length;) {
            result.push(this.childString(index));
            index = this.buffer[index + 3];
        }
        return result.join(",");
    }
    /// @internal
    childString(index) {
        let id = this.buffer[index], endIndex = this.buffer[index + 3];
        let type = this.set.types[id], result = type.name;
        if (/\W/.test(result) && !type.isError)
            result = JSON.stringify(result);
        index += 4;
        if (endIndex == index)
            return result;
        let children = [];
        while (index < endIndex) {
            children.push(this.childString(index));
            index = this.buffer[index + 3];
        }
        return result + "(" + children.join(",") + ")";
    }
    /// @internal
    findChild(startIndex, endIndex, dir, after) {
        let { buffer } = this, pick = -1;
        for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
            if (after != -100000000 /* None */) {
                let start = buffer[i + 1], end = buffer[i + 2];
                if (dir > 0) {
                    if (end > after)
                        pick = i;
                    if (end > after)
                        break;
                }
                else {
                    if (start < after)
                        pick = i;
                    if (end >= after)
                        break;
                }
            }
            else {
                pick = i;
                if (dir > 0)
                    break;
            }
        }
        return pick;
    }
}
class TreeNode {
    constructor(node, from, index, _parent) {
        this.node = node;
        this.from = from;
        this.index = index;
        this._parent = _parent;
    }
    get type() { return this.node.type; }
    get name() { return this.node.type.name; }
    get to() { return this.from + this.node.length; }
    nextChild(i, dir, after, full = false) {
        for (let parent = this;;) {
            for (let { children, positions } = parent.node, e = dir > 0 ? children.length : -1; i != e; i += dir) {
                let next = children[i], start = positions[i] + parent.from;
                if (after != -100000000 /* None */ && (dir < 0 ? start >= after : start + next.length <= after))
                    continue;
                if (next instanceof TreeBuffer) {
                    let index = next.findChild(0, next.buffer.length, dir, after == -100000000 /* None */ ? -100000000 /* None */ : after - start);
                    if (index > -1)
                        return new BufferNode(new BufferContext(parent, next, i, start), null, index);
                }
                else if (full || (!next.type.isAnonymous || hasChild(next))) {
                    let inner = new TreeNode(next, start, i, parent);
                    return full || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, after);
                }
            }
            if (full || !parent.type.isAnonymous)
                return null;
            i = parent.index + dir;
            parent = parent._parent;
            if (!parent)
                return null;
        }
    }
    get firstChild() { return this.nextChild(0, 1, -100000000 /* None */); }
    get lastChild() { return this.nextChild(this.node.children.length - 1, -1, -100000000 /* None */); }
    childAfter(pos) { return this.nextChild(0, 1, pos); }
    childBefore(pos) { return this.nextChild(this.node.children.length - 1, -1, pos); }
    nextSignificantParent() {
        let val = this;
        while (val.type.isAnonymous && val._parent)
            val = val._parent;
        return val;
    }
    get parent() {
        return this._parent ? this._parent.nextSignificantParent() : null;
    }
    get nextSibling() {
        return this._parent ? this._parent.nextChild(this.index + 1, 1, -1) : null;
    }
    get prevSibling() {
        return this._parent ? this._parent.nextChild(this.index - 1, -1, -1) : null;
    }
    get cursor() { return new TreeCursor(this); }
    resolve(pos, side = 0) {
        return this.cursor.moveTo(pos, side).node;
    }
    getChild(type, before = null, after = null) {
        let r = getChildren(this, type, before, after);
        return r.length ? r[0] : null;
    }
    getChildren(type, before = null, after = null) {
        return getChildren(this, type, before, after);
    }
    /// @internal
    toString() { return this.node.toString(); }
}
function getChildren(node, type, before, after) {
    let cur = node.cursor, result = [];
    if (!cur.firstChild())
        return result;
    if (before != null)
        while (!cur.type.is(before))
            if (!cur.nextSibling())
                return result;
    for (;;) {
        if (after != null && cur.type.is(after))
            return result;
        if (cur.type.is(type))
            result.push(cur.node);
        if (!cur.nextSibling())
            return after == null ? result : [];
    }
}
class BufferContext {
    constructor(parent, buffer, index, start) {
        this.parent = parent;
        this.buffer = buffer;
        this.index = index;
        this.start = start;
    }
}
class BufferNode {
    constructor(context, _parent, index) {
        this.context = context;
        this._parent = _parent;
        this.index = index;
        this.type = context.buffer.set.types[context.buffer.buffer[index]];
    }
    get name() { return this.type.name; }
    get from() { return this.context.start + this.context.buffer.buffer[this.index + 1]; }
    get to() { return this.context.start + this.context.buffer.buffer[this.index + 2]; }
    child(dir, after) {
        let { buffer } = this.context;
        let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, after == -100000000 /* None */ ? -100000000 /* None */ : after - this.context.start);
        return index < 0 ? null : new BufferNode(this.context, this, index);
    }
    get firstChild() { return this.child(1, -100000000 /* None */); }
    get lastChild() { return this.child(-1, -100000000 /* None */); }
    childAfter(pos) { return this.child(1, pos); }
    childBefore(pos) { return this.child(-1, pos); }
    get parent() {
        return this._parent || this.context.parent.nextSignificantParent();
    }
    externalSibling(dir) {
        return this._parent ? null : this.context.parent.nextChild(this.context.index + dir, dir, -1);
    }
    get nextSibling() {
        let { buffer } = this.context;
        let after = buffer.buffer[this.index + 3];
        if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
            return new BufferNode(this.context, this._parent, after);
        return this.externalSibling(1);
    }
    get prevSibling() {
        let { buffer } = this.context;
        let parentStart = this._parent ? this._parent.index + 4 : 0;
        if (this.index == parentStart)
            return this.externalSibling(-1);
        return new BufferNode(this.context, this._parent, buffer.findChild(parentStart, this.index, -1, -100000000 /* None */));
    }
    get cursor() { return new TreeCursor(this); }
    resolve(pos, side = 0) {
        return this.cursor.moveTo(pos, side).node;
    }
    /// @internal
    toString() { return this.context.buffer.childString(this.index); }
    getChild(type, before = null, after = null) {
        let r = getChildren(this, type, before, after);
        return r.length ? r[0] : null;
    }
    getChildren(type, before = null, after = null) {
        return getChildren(this, type, before, after);
    }
}
/// A tree cursor object focuses on a given node in a syntax tree, and
/// allows you to move to adjacent nodes.
class TreeCursor {
    /// @internal
    constructor(node, full = false) {
        this.full = full;
        this.buffer = null;
        this.stack = [];
        this.index = 0;
        this.bufferNode = null;
        if (node instanceof TreeNode) {
            this.yieldNode(node);
        }
        else {
            this._tree = node.context.parent;
            this.buffer = node.context;
            for (let n = node._parent; n; n = n._parent)
                this.stack.unshift(n.index);
            this.bufferNode = node;
            this.yieldBuf(node.index);
        }
    }
    /// Shorthand for `.type.name`.
    get name() { return this.type.name; }
    yieldNode(node) {
        if (!node)
            return false;
        this._tree = node;
        this.type = node.type;
        this.from = node.from;
        this.to = node.to;
        return true;
    }
    yieldBuf(index, type) {
        this.index = index;
        let { start, buffer } = this.buffer;
        this.type = type || buffer.set.types[buffer.buffer[index]];
        this.from = start + buffer.buffer[index + 1];
        this.to = start + buffer.buffer[index + 2];
        return true;
    }
    yield(node) {
        if (!node)
            return false;
        if (node instanceof TreeNode) {
            this.buffer = null;
            return this.yieldNode(node);
        }
        this.buffer = node.context;
        return this.yieldBuf(node.index, node.type);
    }
    /// @internal
    toString() {
        return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
    }
    /// @internal
    enter(dir, after) {
        if (!this.buffer)
            return this.yield(this._tree.nextChild(dir < 0 ? this._tree.node.children.length - 1 : 0, dir, after, this.full));
        let { buffer } = this.buffer;
        let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, after == -100000000 /* None */ ? -100000000 /* None */ : after - this.buffer.start);
        if (index < 0)
            return false;
        this.stack.push(this.index);
        return this.yieldBuf(index);
    }
    /// Move the cursor to this node's first child. When this returns
    /// false, the node has no child, and the cursor has not been moved.
    firstChild() { return this.enter(1, -100000000 /* None */); }
    /// Move the cursor to this node's last child.
    lastChild() { return this.enter(-1, -100000000 /* None */); }
    /// Move the cursor to the first child that starts at or after `pos`.
    childAfter(pos) { return this.enter(1, pos); }
    /// Move to the last child that ends at or before `pos`.
    childBefore(pos) { return this.enter(-1, pos); }
    /// Move the node's parent node, if this isn't the top node.
    parent() {
        if (!this.buffer)
            return this.yieldNode(this.full ? this._tree._parent : this._tree.parent);
        if (this.stack.length)
            return this.yieldBuf(this.stack.pop());
        let parent = this.full ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
        this.buffer = null;
        return this.yieldNode(parent);
    }
    /// @internal
    sibling(dir) {
        if (!this.buffer)
            return !this._tree._parent ? false
                : this.yield(this._tree._parent.nextChild(this._tree.index + dir, dir, -100000000 /* None */, this.full));
        let { buffer } = this.buffer, d = this.stack.length - 1;
        if (dir < 0) {
            let parentStart = d < 0 ? 0 : this.stack[d] + 4;
            if (this.index != parentStart)
                return this.yieldBuf(buffer.findChild(parentStart, this.index, -1, -100000000 /* None */));
        }
        else {
            let after = buffer.buffer[this.index + 3];
            if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
                return this.yieldBuf(after);
        }
        return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, -100000000 /* None */, this.full)) : false;
    }
    /// Move to this node's next sibling, if any.
    nextSibling() { return this.sibling(1); }
    /// Move to this node's previous sibling, if any.
    prevSibling() { return this.sibling(-1); }
    atLastNode(dir) {
        let index, parent, { buffer } = this;
        if (buffer) {
            if (dir > 0) {
                if (this.index < buffer.buffer.buffer.length)
                    return false;
            }
            else {
                for (let i = 0; i < this.index; i++)
                    if (buffer.buffer.buffer[i + 3] < this.index)
                        return false;
            }
            ({ index, parent } = buffer);
        }
        else {
            ({ index, _parent: parent } = this._tree);
        }
        for (; parent; { index, _parent: parent } = parent) {
            for (let i = index + dir, e = dir < 0 ? -1 : parent.node.children.length; i != e; i += dir) {
                let child = parent.node.children[i];
                if (this.full || !child.type.isAnonymous || child instanceof TreeBuffer || hasChild(child))
                    return false;
            }
        }
        return true;
    }
    move(dir) {
        if (this.enter(dir, -100000000 /* None */))
            return true;
        for (;;) {
            if (this.sibling(dir))
                return true;
            if (this.atLastNode(dir) || !this.parent())
                return false;
        }
    }
    /// Move to the next node in a
    /// [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order_(NLR))
    /// traversal, going from a node to its first child or, if the
    /// current node is empty, its next sibling or the next sibling of
    /// the first parent node that has one.
    next() { return this.move(1); }
    /// Move to the next node in a last-to-first pre-order traveral. A
    /// node is followed by ist last child or, if it has none, its
    /// previous sibling or the previous sibling of the first parent
    /// node that has one.
    prev() { return this.move(-1); }
    /// Move the cursor to the innermost node that covers `pos`. If
    /// `side` is -1, it will enter nodes that end at `pos`. If it is 1,
    /// it will enter nodes that start at `pos`.
    moveTo(pos, side = 0) {
        // Move up to a node that actually holds the position, if possible
        while (this.from == this.to ||
            (side < 1 ? this.from >= pos : this.from > pos) ||
            (side > -1 ? this.to <= pos : this.to < pos))
            if (!this.parent())
                break;
        // Then scan down into child nodes as far as possible
        for (;;) {
            if (side < 0 ? !this.childBefore(pos) : !this.childAfter(pos))
                break;
            if (this.from == this.to ||
                (side < 1 ? this.from >= pos : this.from > pos) ||
                (side > -1 ? this.to <= pos : this.to < pos)) {
                this.parent();
                break;
            }
        }
        return this;
    }
    /// Get a [syntax node](#tree.SyntaxNode) at the cursor's current
    /// position.
    get node() {
        if (!this.buffer)
            return this._tree;
        let cache = this.bufferNode, result = null, depth = 0;
        if (cache && cache.context == this.buffer) {
            scan: for (let index = this.index, d = this.stack.length; d >= 0;) {
                for (let c = cache; c; c = c._parent)
                    if (c.index == index) {
                        if (index == this.index)
                            return c;
                        result = c;
                        depth = d + 1;
                        break scan;
                    }
                index = this.stack[--d];
            }
        }
        for (let i = depth; i < this.stack.length; i++)
            result = new BufferNode(this.buffer, result, this.stack[i]);
        return this.bufferNode = new BufferNode(this.buffer, result, this.index);
    }
    /// Get the [tree](#tree.Tree) that represents the current node, if
    /// any. Will return null when the node is in a [tree
    /// buffer](#tree.TreeBuffer).
    get tree() {
        return this.buffer ? null : this._tree.node;
    }
}
function hasChild(tree) {
    return tree.children.some(ch => !ch.type.isAnonymous || ch instanceof TreeBuffer || hasChild(ch));
}
class FlatBufferCursor {
    constructor(buffer, index) {
        this.buffer = buffer;
        this.index = index;
    }
    get id() { return this.buffer[this.index - 4]; }
    get start() { return this.buffer[this.index - 3]; }
    get end() { return this.buffer[this.index - 2]; }
    get size() { return this.buffer[this.index - 1]; }
    get pos() { return this.index; }
    next() { this.index -= 4; }
    fork() { return new FlatBufferCursor(this.buffer, this.index); }
}
const BalanceBranchFactor = 8;
function buildTree(data) {
    var _a;
    let { buffer, nodeSet, topID = 0, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
    let cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
    let types = nodeSet.types;
    let contextHash = 0;
    function takeNode(parentStart, minPos, children, positions, inRepeat) {
        let { id, start, end, size } = cursor;
        let startPos = start - parentStart;
        if (size < 0) {
            if (size == -1) { // Reused node
                children.push(reused[id]);
                positions.push(startPos);
            }
            else { // Context change
                contextHash = id;
            }
            cursor.next();
            return;
        }
        let type = types[id], node, buffer;
        if (end - start <= maxBufferLength && (buffer = findBufferSize(cursor.pos - minPos, inRepeat))) {
            // Small enough for a buffer, and no reused nodes inside
            let data = new Uint16Array(buffer.size - buffer.skip);
            let endPos = cursor.pos - buffer.size, index = data.length;
            while (cursor.pos > endPos)
                index = copyToBuffer(buffer.start, data, index, inRepeat);
            node = new TreeBuffer(data, end - buffer.start, nodeSet, inRepeat < 0 ? NodeType.none : types[inRepeat]);
            startPos = buffer.start - parentStart;
        }
        else { // Make it a node
            let endPos = cursor.pos - size;
            cursor.next();
            let localChildren = [], localPositions = [];
            let localInRepeat = id >= minRepeatType ? id : -1;
            while (cursor.pos > endPos) {
                if (cursor.id == localInRepeat)
                    cursor.next();
                else
                    takeNode(start, endPos, localChildren, localPositions, localInRepeat);
            }
            localChildren.reverse();
            localPositions.reverse();
            if (localInRepeat > -1 && localChildren.length > BalanceBranchFactor)
                node = balanceRange(type, type, localChildren, localPositions, 0, localChildren.length, 0, maxBufferLength, end - start, contextHash);
            else
                node = withHash(new Tree(type, localChildren, localPositions, end - start), contextHash);
        }
        children.push(node);
        positions.push(startPos);
    }
    function findBufferSize(maxSize, inRepeat) {
        // Scan through the buffer to find previous siblings that fit
        // together in a TreeBuffer, and don't contain any reused nodes
        // (which can't be stored in a buffer).
        // If `inRepeat` is > -1, ignore node boundaries of that type for
        // nesting, but make sure the end falls either at the start
        // (`maxSize`) or before such a node.
        let fork = cursor.fork();
        let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
        let result = { size: 0, start: 0, skip: 0 };
        scan: for (let minPos = fork.pos - maxSize; fork.pos > minPos;) {
            // Pretend nested repeat nodes of the same type don't exist
            if (fork.id == inRepeat) {
                // Except that we store the current state as a valid return
                // value.
                result.size = size;
                result.start = start;
                result.skip = skip;
                skip += 4;
                size += 4;
                fork.next();
                continue;
            }
            let nodeSize = fork.size, startPos = fork.pos - nodeSize;
            if (nodeSize < 0 || startPos < minPos || fork.start < minStart)
                break;
            let localSkipped = fork.id >= minRepeatType ? 4 : 0;
            let nodeStart = fork.start;
            fork.next();
            while (fork.pos > startPos) {
                if (fork.size < 0)
                    break scan;
                if (fork.id >= minRepeatType)
                    localSkipped += 4;
                fork.next();
            }
            start = nodeStart;
            size += nodeSize;
            skip += localSkipped;
        }
        if (inRepeat < 0 || size == maxSize) {
            result.size = size;
            result.start = start;
            result.skip = skip;
        }
        return result.size > 4 ? result : undefined;
    }
    function copyToBuffer(bufferStart, buffer, index, inRepeat) {
        let { id, start, end, size } = cursor;
        cursor.next();
        if (id == inRepeat)
            return index;
        let startIndex = index;
        if (size > 4) {
            let endPos = cursor.pos - (size - 4);
            while (cursor.pos > endPos)
                index = copyToBuffer(bufferStart, buffer, index, inRepeat);
        }
        if (id < minRepeatType) { // Don't copy repeat nodes into buffers
            buffer[--index] = startIndex;
            buffer[--index] = end - bufferStart;
            buffer[--index] = start - bufferStart;
            buffer[--index] = id;
        }
        return index;
    }
    let children = [], positions = [];
    while (cursor.pos > 0)
        takeNode(data.start || 0, 0, children, positions, -1);
    let length = (_a = data.length) !== null && _a !== void 0 ? _a : (children.length ? positions[0] + children[0].length : 0);
    return new Tree(types[topID], children.reverse(), positions.reverse(), length);
}
function balanceRange(outerType, innerType, children, positions, from, to, start, maxBufferLength, length, contextHash) {
    let localChildren = [], localPositions = [];
    if (length <= maxBufferLength) {
        for (let i = from; i < to; i++) {
            localChildren.push(children[i]);
            localPositions.push(positions[i] - start);
        }
    }
    else {
        let maxChild = Math.max(maxBufferLength, Math.ceil(length * 1.5 / BalanceBranchFactor));
        for (let i = from; i < to;) {
            let groupFrom = i, groupStart = positions[i];
            i++;
            for (; i < to; i++) {
                let nextEnd = positions[i] + children[i].length;
                if (nextEnd - groupStart > maxChild)
                    break;
            }
            if (i == groupFrom + 1) {
                let only = children[groupFrom];
                if (only instanceof Tree && only.type == innerType && only.length > maxChild << 1) { // Too big, collapse
                    for (let j = 0; j < only.children.length; j++) {
                        localChildren.push(only.children[j]);
                        localPositions.push(only.positions[j] + groupStart - start);
                    }
                    continue;
                }
                localChildren.push(only);
            }
            else if (i == groupFrom + 1) {
                localChildren.push(children[groupFrom]);
            }
            else {
                let inner = balanceRange(innerType, innerType, children, positions, groupFrom, i, groupStart, maxBufferLength, positions[i - 1] + children[i - 1].length - groupStart, contextHash);
                if (innerType != NodeType.none && !containsType(inner.children, innerType))
                    inner = withHash(new Tree(NodeType.none, inner.children, inner.positions, inner.length), contextHash);
                localChildren.push(inner);
            }
            localPositions.push(groupStart - start);
        }
    }
    return withHash(new Tree(outerType, localChildren, localPositions, length), contextHash);
}
function containsType(nodes, type) {
    for (let elt of nodes)
        if (elt.type == type)
            return true;
    return false;
}
/// Tree fragments are used during [incremental
/// parsing](#lezer.ParseOptions.fragments) to track parts of old
/// trees that can be reused in a new parse. An array of fragments is
/// used to track regions of an old tree whose nodes might be reused
/// in new parses. Use the static
/// [`applyChanges`](#tree.TreeFragment^applyChanges) method to update
/// fragments for document changes.
class TreeFragment {
    constructor(
    /// The start of the unchanged range pointed to by this fragment.
    /// This refers to an offset in the _updated_ document (as opposed
    /// to the original tree).
    from, 
    /// The end of the unchanged range.
    to, 
    /// The tree that this fragment is based on.
    tree, 
    /// The offset between the fragment's tree and the document that
    /// this fragment can be used against. Add this when going from
    /// document to tree positions, subtract it to go from tree to
    /// document positions.
    offset, open) {
        this.from = from;
        this.to = to;
        this.tree = tree;
        this.offset = offset;
        this.open = open;
    }
    get openStart() { return (this.open & 1 /* Start */) > 0; }
    get openEnd() { return (this.open & 2 /* End */) > 0; }
    /// Apply a set of edits to an array of fragments, removing or
    /// splitting fragments as necessary to remove edited ranges, and
    /// adjusting offsets for fragments that moved.
    static applyChanges(fragments, changes, minGap = 128) {
        if (!changes.length)
            return fragments;
        let result = [];
        let fI = 1, nextF = fragments.length ? fragments[0] : null;
        let cI = 0, pos = 0, off = 0;
        for (;;) {
            let nextC = cI < changes.length ? changes[cI++] : null;
            let nextPos = nextC ? nextC.fromA : 1e9;
            if (nextPos - pos >= minGap)
                while (nextF && nextF.from < nextPos) {
                    let cut = nextF;
                    if (pos >= cut.from || nextPos <= cut.to || off) {
                        let fFrom = Math.max(cut.from, pos) - off, fTo = Math.min(cut.to, nextPos) - off;
                        cut = fFrom >= fTo ? null :
                            new TreeFragment(fFrom, fTo, cut.tree, cut.offset + off, (cI > 0 ? 1 /* Start */ : 0) | (nextC ? 2 /* End */ : 0));
                    }
                    if (cut)
                        result.push(cut);
                    if (nextF.to > nextPos)
                        break;
                    nextF = fI < fragments.length ? fragments[fI++] : null;
                }
            if (!nextC)
                break;
            pos = nextC.toA;
            off = nextC.toA - nextC.toB;
        }
        return result;
    }
    /// Create a set of fragments from a freshly parsed tree, or update
    /// an existing set of fragments by replacing the ones that overlap
    /// with a tree with content from the new tree. When `partial` is
    /// true, the parse is treated as incomplete, and the token at its
    /// end is not included in [`safeTo`](#tree.TreeFragment.safeTo).
    static addTree(tree, fragments = [], partial = false) {
        let result = [new TreeFragment(0, tree.length, tree, 0, partial ? 2 /* End */ : 0)];
        for (let f of fragments)
            if (f.to > tree.length)
                result.push(f);
        return result;
    }
}
// Creates an `Input` that is backed by a single, flat string.
function stringInput(input) { return new StringInput(input); }
class StringInput {
    constructor(string, length = string.length) {
        this.string = string;
        this.length = length;
    }
    get(pos) {
        return pos < 0 || pos >= this.length ? -1 : this.string.charCodeAt(pos);
    }
    lineAfter(pos) {
        if (pos < 0)
            return "";
        let end = this.string.indexOf("\n", pos);
        return this.string.slice(pos, end < 0 ? this.length : Math.min(end, this.length));
    }
    read(from, to) { return this.string.slice(from, Math.min(this.length, to)); }
    clip(at) { return new StringInput(this.string, at); }
}


//# sourceMappingURL=tree.es.js.map


/***/ }),

/***/ "./node_modules/lezer/dist/index.es.js":
/*!*********************************************!*\
  !*** ./node_modules/lezer/dist/index.es.js ***!
  \*********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ContextTracker": () => (/* binding */ ContextTracker),
/* harmony export */   "ExternalTokenizer": () => (/* binding */ ExternalTokenizer),
/* harmony export */   "NodeProp": () => (/* reexport safe */ lezer_tree__WEBPACK_IMPORTED_MODULE_0__.NodeProp),
/* harmony export */   "NodeSet": () => (/* reexport safe */ lezer_tree__WEBPACK_IMPORTED_MODULE_0__.NodeSet),
/* harmony export */   "NodeType": () => (/* reexport safe */ lezer_tree__WEBPACK_IMPORTED_MODULE_0__.NodeType),
/* harmony export */   "Parser": () => (/* binding */ Parser),
/* harmony export */   "Stack": () => (/* binding */ Stack),
/* harmony export */   "Token": () => (/* binding */ Token),
/* harmony export */   "Tree": () => (/* reexport safe */ lezer_tree__WEBPACK_IMPORTED_MODULE_0__.Tree),
/* harmony export */   "TreeCursor": () => (/* reexport safe */ lezer_tree__WEBPACK_IMPORTED_MODULE_0__.TreeCursor)
/* harmony export */ });
/* harmony import */ var lezer_tree__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lezer-tree */ "./node_modules/lezer-tree/dist/tree.es.js");



/// A parse stack. These are used internally by the parser to track
/// parsing progress. They also provide some properties and methods
/// that external code such as a tokenizer can use to get information
/// about the parse state.
class Stack {
    /// @internal
    constructor(
    /// A the parse that this stack is part of @internal
    p, 
    /// Holds state, pos, value stack pos (15 bits array index, 15 bits
    /// buffer index) triplets for all but the top state
    /// @internal
    stack, 
    /// The current parse state @internal
    state, 
    // The position at which the next reduce should take place. This
    // can be less than `this.pos` when skipped expressions have been
    // added to the stack (which should be moved outside of the next
    // reduction)
    /// @internal
    reducePos, 
    /// The input position up to which this stack has parsed.
    pos, 
    /// The dynamic score of the stack, including dynamic precedence
    /// and error-recovery penalties
    /// @internal
    score, 
    // The output buffer. Holds (type, start, end, size) quads
    // representing nodes created by the parser, where `size` is
    // amount of buffer array entries covered by this node.
    /// @internal
    buffer, 
    // The base offset of the buffer. When stacks are split, the split
    // instance shared the buffer history with its parent up to
    // `bufferBase`, which is the absolute offset (including the
    // offset of previous splits) into the buffer at which this stack
    // starts writing.
    /// @internal
    bufferBase, 
    /// @internal
    curContext, 
    // A parent stack from which this was split off, if any. This is
    // set up so that it always points to a stack that has some
    // additional buffer content, never to a stack with an equal
    // `bufferBase`.
    /// @internal
    parent) {
        this.p = p;
        this.stack = stack;
        this.state = state;
        this.reducePos = reducePos;
        this.pos = pos;
        this.score = score;
        this.buffer = buffer;
        this.bufferBase = bufferBase;
        this.curContext = curContext;
        this.parent = parent;
    }
    /// @internal
    toString() {
        return `[${this.stack.filter((_, i) => i % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
    }
    // Start an empty stack
    /// @internal
    static start(p, state, pos = 0) {
        let cx = p.parser.context;
        return new Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, null);
    }
    /// The stack's current [context](#lezer.ContextTracker) value, if
    /// any. Its type will depend on the context tracker's type
    /// parameter, or it will be `null` if there is no context
    /// tracker.
    get context() { return this.curContext ? this.curContext.context : null; }
    // Push a state onto the stack, tracking its start position as well
    // as the buffer base at that point.
    /// @internal
    pushState(state, start) {
        this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
        this.state = state;
    }
    // Apply a reduce action
    /// @internal
    reduce(action) {
        let depth = action >> 19 /* ReduceDepthShift */, type = action & 65535 /* ValueMask */;
        let { parser } = this.p;
        let dPrec = parser.dynamicPrecedence(type);
        if (dPrec)
            this.score += dPrec;
        if (depth == 0) {
            // Zero-depth reductions are a special case—they add stuff to
            // the stack without popping anything off.
            if (type < parser.minRepeatTerm)
                this.storeNode(type, this.reducePos, this.reducePos, 4, true);
            this.pushState(parser.getGoto(this.state, type, true), this.reducePos);
            this.reduceContext(type);
            return;
        }
        // Find the base index into `this.stack`, content after which will
        // be dropped. Note that with `StayFlag` reductions we need to
        // consume two extra frames (the dummy parent node for the skipped
        // expression and the state that we'll be staying in, which should
        // be moved to `this.state`).
        let base = this.stack.length - ((depth - 1) * 3) - (action & 262144 /* StayFlag */ ? 6 : 0);
        let start = this.stack[base - 2];
        let bufferBase = this.stack[base - 1], count = this.bufferBase + this.buffer.length - bufferBase;
        // Store normal terms or `R -> R R` repeat reductions
        if (type < parser.minRepeatTerm || (action & 131072 /* RepeatFlag */)) {
            let pos = parser.stateFlag(this.state, 1 /* Skipped */) ? this.pos : this.reducePos;
            this.storeNode(type, start, pos, count + 4, true);
        }
        if (action & 262144 /* StayFlag */) {
            this.state = this.stack[base];
        }
        else {
            let baseStateID = this.stack[base - 3];
            this.state = parser.getGoto(baseStateID, type, true);
        }
        while (this.stack.length > base)
            this.stack.pop();
        this.reduceContext(type);
    }
    // Shift a value into the buffer
    /// @internal
    storeNode(term, start, end, size = 4, isReduce = false) {
        if (term == 0 /* Err */) { // Try to omit/merge adjacent error nodes
            let cur = this, top = this.buffer.length;
            if (top == 0 && cur.parent) {
                top = cur.bufferBase - cur.parent.bufferBase;
                cur = cur.parent;
            }
            if (top > 0 && cur.buffer[top - 4] == 0 /* Err */ && cur.buffer[top - 1] > -1) {
                if (start == end)
                    return;
                if (cur.buffer[top - 2] >= start) {
                    cur.buffer[top - 2] = end;
                    return;
                }
            }
        }
        if (!isReduce || this.pos == end) { // Simple case, just append
            this.buffer.push(term, start, end, size);
        }
        else { // There may be skipped nodes that have to be moved forward
            let index = this.buffer.length;
            if (index > 0 && this.buffer[index - 4] != 0 /* Err */)
                while (index > 0 && this.buffer[index - 2] > end) {
                    // Move this record forward
                    this.buffer[index] = this.buffer[index - 4];
                    this.buffer[index + 1] = this.buffer[index - 3];
                    this.buffer[index + 2] = this.buffer[index - 2];
                    this.buffer[index + 3] = this.buffer[index - 1];
                    index -= 4;
                    if (size > 4)
                        size -= 4;
                }
            this.buffer[index] = term;
            this.buffer[index + 1] = start;
            this.buffer[index + 2] = end;
            this.buffer[index + 3] = size;
        }
    }
    // Apply a shift action
    /// @internal
    shift(action, next, nextEnd) {
        if (action & 131072 /* GotoFlag */) {
            this.pushState(action & 65535 /* ValueMask */, this.pos);
        }
        else if ((action & 262144 /* StayFlag */) == 0) { // Regular shift
            let start = this.pos, nextState = action, { parser } = this.p;
            if (nextEnd > this.pos || next <= parser.maxNode) {
                this.pos = nextEnd;
                if (!parser.stateFlag(nextState, 1 /* Skipped */))
                    this.reducePos = nextEnd;
            }
            this.pushState(nextState, start);
            if (next <= parser.maxNode)
                this.buffer.push(next, start, nextEnd, 4);
            this.shiftContext(next);
        }
        else { // Shift-and-stay, which means this is a skipped token
            if (next <= this.p.parser.maxNode)
                this.buffer.push(next, this.pos, nextEnd, 4);
            this.pos = nextEnd;
        }
    }
    // Apply an action
    /// @internal
    apply(action, next, nextEnd) {
        if (action & 65536 /* ReduceFlag */)
            this.reduce(action);
        else
            this.shift(action, next, nextEnd);
    }
    // Add a prebuilt node into the buffer. This may be a reused node or
    // the result of running a nested parser.
    /// @internal
    useNode(value, next) {
        let index = this.p.reused.length - 1;
        if (index < 0 || this.p.reused[index] != value) {
            this.p.reused.push(value);
            index++;
        }
        let start = this.pos;
        this.reducePos = this.pos = start + value.length;
        this.pushState(next, start);
        this.buffer.push(index, start, this.reducePos, -1 /* size < 0 means this is a reused value */);
        if (this.curContext)
            this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this.p.input, this));
    }
    // Split the stack. Due to the buffer sharing and the fact
    // that `this.stack` tends to stay quite shallow, this isn't very
    // expensive.
    /// @internal
    split() {
        let parent = this;
        let off = parent.buffer.length;
        // Because the top of the buffer (after this.pos) may be mutated
        // to reorder reductions and skipped tokens, and shared buffers
        // should be immutable, this copies any outstanding skipped tokens
        // to the new buffer, and puts the base pointer before them.
        while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
            off -= 4;
        let buffer = parent.buffer.slice(off), base = parent.bufferBase + off;
        // Make sure parent points to an actual parent with content, if there is such a parent.
        while (parent && base == parent.bufferBase)
            parent = parent.parent;
        return new Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base, this.curContext, parent);
    }
    // Try to recover from an error by 'deleting' (ignoring) one token.
    /// @internal
    recoverByDelete(next, nextEnd) {
        let isNode = next <= this.p.parser.maxNode;
        if (isNode)
            this.storeNode(next, this.pos, nextEnd);
        this.storeNode(0 /* Err */, this.pos, nextEnd, isNode ? 8 : 4);
        this.pos = this.reducePos = nextEnd;
        this.score -= 200 /* Token */;
    }
    /// Check if the given term would be able to be shifted (optionally
    /// after some reductions) on this stack. This can be useful for
    /// external tokenizers that want to make sure they only provide a
    /// given token when it applies.
    canShift(term) {
        for (let sim = new SimulatedStack(this);;) {
            let action = this.p.parser.stateSlot(sim.top, 4 /* DefaultReduce */) || this.p.parser.hasAction(sim.top, term);
            if ((action & 65536 /* ReduceFlag */) == 0)
                return true;
            if (action == 0)
                return false;
            sim.reduce(action);
        }
    }
    /// Find the start position of the rule that is currently being parsed.
    get ruleStart() {
        for (let state = this.state, base = this.stack.length;;) {
            let force = this.p.parser.stateSlot(state, 5 /* ForcedReduce */);
            if (!(force & 65536 /* ReduceFlag */))
                return 0;
            base -= 3 * (force >> 19 /* ReduceDepthShift */);
            if ((force & 65535 /* ValueMask */) < this.p.parser.minRepeatTerm)
                return this.stack[base + 1];
            state = this.stack[base];
        }
    }
    /// Find the start position of an instance of any of the given term
    /// types, or return `null` when none of them are found.
    ///
    /// **Note:** this is only reliable when there is at least some
    /// state that unambiguously matches the given rule on the stack.
    /// I.e. if you have a grammar like this, where the difference
    /// between `a` and `b` is only apparent at the third token:
    ///
    ///     a { b | c }
    ///     b { "x" "y" "x" }
    ///     c { "x" "y" "z" }
    ///
    /// Then a parse state after `"x"` will not reliably tell you that
    /// `b` is on the stack. You _can_ pass `[b, c]` to reliably check
    /// for either of those two rules (assuming that `a` isn't part of
    /// some rule that includes other things starting with `"x"`).
    ///
    /// When `before` is given, this keeps scanning up the stack until
    /// it finds a match that starts before that position.
    ///
    /// Note that you have to be careful when using this in tokenizers,
    /// since it's relatively easy to introduce data dependencies that
    /// break incremental parsing by using this method.
    startOf(types, before) {
        let state = this.state, frame = this.stack.length, { parser } = this.p;
        for (;;) {
            let force = parser.stateSlot(state, 5 /* ForcedReduce */);
            let depth = force >> 19 /* ReduceDepthShift */, term = force & 65535 /* ValueMask */;
            if (types.indexOf(term) > -1) {
                let base = frame - (3 * (force >> 19 /* ReduceDepthShift */)), pos = this.stack[base + 1];
                if (before == null || before > pos)
                    return pos;
            }
            if (frame == 0)
                return null;
            if (depth == 0) {
                frame -= 3;
                state = this.stack[frame];
            }
            else {
                frame -= 3 * (depth - 1);
                state = parser.getGoto(this.stack[frame - 3], term, true);
            }
        }
    }
    // Apply up to Recover.MaxNext recovery actions that conceptually
    // inserts some missing token or rule.
    /// @internal
    recoverByInsert(next) {
        if (this.stack.length >= 300 /* MaxInsertStackDepth */)
            return [];
        let nextStates = this.p.parser.nextStates(this.state);
        if (nextStates.length > 4 /* MaxNext */ << 1 || this.stack.length >= 120 /* DampenInsertStackDepth */) {
            let best = [];
            for (let i = 0, s; i < nextStates.length; i += 2) {
                if ((s = nextStates[i + 1]) != this.state && this.p.parser.hasAction(s, next))
                    best.push(nextStates[i], s);
            }
            if (this.stack.length < 120 /* DampenInsertStackDepth */)
                for (let i = 0; best.length < 4 /* MaxNext */ << 1 && i < nextStates.length; i += 2) {
                    let s = nextStates[i + 1];
                    if (!best.some((v, i) => (i & 1) && v == s))
                        best.push(nextStates[i], s);
                }
            nextStates = best;
        }
        let result = [];
        for (let i = 0; i < nextStates.length && result.length < 4 /* MaxNext */; i += 2) {
            let s = nextStates[i + 1];
            if (s == this.state)
                continue;
            let stack = this.split();
            stack.storeNode(0 /* Err */, stack.pos, stack.pos, 4, true);
            stack.pushState(s, this.pos);
            stack.shiftContext(nextStates[i]);
            stack.score -= 200 /* Token */;
            result.push(stack);
        }
        return result;
    }
    // Force a reduce, if possible. Return false if that can't
    // be done.
    /// @internal
    forceReduce() {
        let reduce = this.p.parser.stateSlot(this.state, 5 /* ForcedReduce */);
        if ((reduce & 65536 /* ReduceFlag */) == 0)
            return false;
        if (!this.p.parser.validAction(this.state, reduce)) {
            this.storeNode(0 /* Err */, this.reducePos, this.reducePos, 4, true);
            this.score -= 100 /* Reduce */;
        }
        this.reduce(reduce);
        return true;
    }
    /// @internal
    forceAll() {
        while (!this.p.parser.stateFlag(this.state, 2 /* Accepting */) && this.forceReduce()) { }
        return this;
    }
    /// Check whether this state has no further actions (assumed to be a direct descendant of the
    /// top state, since any other states must be able to continue
    /// somehow). @internal
    get deadEnd() {
        if (this.stack.length != 3)
            return false;
        let { parser } = this.p;
        return parser.data[parser.stateSlot(this.state, 1 /* Actions */)] == 65535 /* End */ &&
            !parser.stateSlot(this.state, 4 /* DefaultReduce */);
    }
    /// Restart the stack (put it back in its start state). Only safe
    /// when this.stack.length == 3 (state is directly below the top
    /// state). @internal
    restart() {
        this.state = this.stack[0];
        this.stack.length = 0;
    }
    /// @internal
    sameState(other) {
        if (this.state != other.state || this.stack.length != other.stack.length)
            return false;
        for (let i = 0; i < this.stack.length; i += 3)
            if (this.stack[i] != other.stack[i])
                return false;
        return true;
    }
    /// Get the parser used by this stack.
    get parser() { return this.p.parser; }
    /// Test whether a given dialect (by numeric ID, as exported from
    /// the terms file) is enabled.
    dialectEnabled(dialectID) { return this.p.parser.dialect.flags[dialectID]; }
    shiftContext(term) {
        if (this.curContext)
            this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this.p.input, this));
    }
    reduceContext(term) {
        if (this.curContext)
            this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this.p.input, this));
    }
    /// @internal
    emitContext() {
        let cx = this.curContext;
        if (!cx.tracker.strict)
            return;
        let last = this.buffer.length - 1;
        if (last < 0 || this.buffer[last] != -2)
            this.buffer.push(cx.hash, this.reducePos, this.reducePos, -2);
    }
    updateContext(context) {
        if (context != this.curContext.context) {
            let newCx = new StackContext(this.curContext.tracker, context);
            if (newCx.hash != this.curContext.hash)
                this.emitContext();
            this.curContext = newCx;
        }
    }
}
class StackContext {
    constructor(tracker, context) {
        this.tracker = tracker;
        this.context = context;
        this.hash = tracker.hash(context);
    }
}
var Recover;
(function (Recover) {
    Recover[Recover["Token"] = 200] = "Token";
    Recover[Recover["Reduce"] = 100] = "Reduce";
    Recover[Recover["MaxNext"] = 4] = "MaxNext";
    Recover[Recover["MaxInsertStackDepth"] = 300] = "MaxInsertStackDepth";
    Recover[Recover["DampenInsertStackDepth"] = 120] = "DampenInsertStackDepth";
})(Recover || (Recover = {}));
// Used to cheaply run some reductions to scan ahead without mutating
// an entire stack
class SimulatedStack {
    constructor(stack) {
        this.stack = stack;
        this.top = stack.state;
        this.rest = stack.stack;
        this.offset = this.rest.length;
    }
    reduce(action) {
        let term = action & 65535 /* ValueMask */, depth = action >> 19 /* ReduceDepthShift */;
        if (depth == 0) {
            if (this.rest == this.stack.stack)
                this.rest = this.rest.slice();
            this.rest.push(this.top, 0, 0);
            this.offset += 3;
        }
        else {
            this.offset -= (depth - 1) * 3;
        }
        let goto = this.stack.p.parser.getGoto(this.rest[this.offset - 3], term, true);
        this.top = goto;
    }
}
// This is given to `Tree.build` to build a buffer, and encapsulates
// the parent-stack-walking necessary to read the nodes.
class StackBufferCursor {
    constructor(stack, pos, index) {
        this.stack = stack;
        this.pos = pos;
        this.index = index;
        this.buffer = stack.buffer;
        if (this.index == 0)
            this.maybeNext();
    }
    static create(stack) {
        return new StackBufferCursor(stack, stack.bufferBase + stack.buffer.length, stack.buffer.length);
    }
    maybeNext() {
        let next = this.stack.parent;
        if (next != null) {
            this.index = this.stack.bufferBase - next.bufferBase;
            this.stack = next;
            this.buffer = next.buffer;
        }
    }
    get id() { return this.buffer[this.index - 4]; }
    get start() { return this.buffer[this.index - 3]; }
    get end() { return this.buffer[this.index - 2]; }
    get size() { return this.buffer[this.index - 1]; }
    next() {
        this.index -= 4;
        this.pos -= 4;
        if (this.index == 0)
            this.maybeNext();
    }
    fork() {
        return new StackBufferCursor(this.stack, this.pos, this.index);
    }
}

/// Tokenizers write the tokens they read into instances of this class.
class Token {
    constructor() {
        /// The start of the token. This is set by the parser, and should not
        /// be mutated by the tokenizer.
        this.start = -1;
        /// This starts at -1, and should be updated to a term id when a
        /// matching token is found.
        this.value = -1;
        /// When setting `.value`, you should also set `.end` to the end
        /// position of the token. (You'll usually want to use the `accept`
        /// method.)
        this.end = -1;
    }
    /// Accept a token, setting `value` and `end` to the given values.
    accept(value, end) {
        this.value = value;
        this.end = end;
    }
}
/// @internal
class TokenGroup {
    constructor(data, id) {
        this.data = data;
        this.id = id;
    }
    token(input, token, stack) { readToken(this.data, input, token, stack, this.id); }
}
TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
/// Exports that are used for `@external tokens` in the grammar should
/// export an instance of this class.
class ExternalTokenizer {
    /// Create a tokenizer. The first argument is the function that,
    /// given an input stream and a token object,
    /// [fills](#lezer.Token.accept) the token object if it recognizes a
    /// token. `token.start` should be used as the start position to
    /// scan from.
    constructor(
    /// @internal
    token, options = {}) {
        this.token = token;
        this.contextual = !!options.contextual;
        this.fallback = !!options.fallback;
        this.extend = !!options.extend;
    }
}
// Tokenizer data is stored a big uint16 array containing, for each
// state:
//
//  - A group bitmask, indicating what token groups are reachable from
//    this state, so that paths that can only lead to tokens not in
//    any of the current groups can be cut off early.
//
//  - The position of the end of the state's sequence of accepting
//    tokens
//
//  - The number of outgoing edges for the state
//
//  - The accepting tokens, as (token id, group mask) pairs
//
//  - The outgoing edges, as (start character, end character, state
//    index) triples, with end character being exclusive
//
// This function interprets that data, running through a stream as
// long as new states with the a matching group mask can be reached,
// and updating `token` when it matches a token.
function readToken(data, input, token, stack, group) {
    let state = 0, groupMask = 1 << group, dialect = stack.p.parser.dialect;
    scan: for (let pos = token.start;;) {
        if ((groupMask & data[state]) == 0)
            break;
        let accEnd = data[state + 1];
        // Check whether this state can lead to a token in the current group
        // Accept tokens in this state, possibly overwriting
        // lower-precedence / shorter tokens
        for (let i = state + 3; i < accEnd; i += 2)
            if ((data[i + 1] & groupMask) > 0) {
                let term = data[i];
                if (dialect.allows(term) &&
                    (token.value == -1 || token.value == term || stack.p.parser.overrides(term, token.value))) {
                    token.accept(term, pos);
                    break;
                }
            }
        let next = input.get(pos++);
        // Do a binary search on the state's edges
        for (let low = 0, high = data[state + 2]; low < high;) {
            let mid = (low + high) >> 1;
            let index = accEnd + mid + (mid << 1);
            let from = data[index], to = data[index + 1];
            if (next < from)
                high = mid;
            else if (next >= to)
                low = mid + 1;
            else {
                state = data[index + 2];
                continue scan;
            }
        }
        break;
    }
}

// See lezer-generator/src/encode.ts for comments about the encoding
// used here
function decodeArray(input, Type = Uint16Array) {
    if (typeof input != "string")
        return input;
    let array = null;
    for (let pos = 0, out = 0; pos < input.length;) {
        let value = 0;
        for (;;) {
            let next = input.charCodeAt(pos++), stop = false;
            if (next == 126 /* BigValCode */) {
                value = 65535 /* BigVal */;
                break;
            }
            if (next >= 92 /* Gap2 */)
                next--;
            if (next >= 34 /* Gap1 */)
                next--;
            let digit = next - 32 /* Start */;
            if (digit >= 46 /* Base */) {
                digit -= 46 /* Base */;
                stop = true;
            }
            value += digit;
            if (stop)
                break;
            value *= 46 /* Base */;
        }
        if (array)
            array[out++] = value;
        else
            array = new Type(value);
    }
    return array;
}

// FIXME find some way to reduce recovery work done when the input
// doesn't match the grammar at all.
// Environment variable used to control console output
const verbose = typeof process != "undefined" && /\bparse\b/.test(process.env.LOG);
let stackIDs = null;
function cutAt(tree, pos, side) {
    let cursor = tree.cursor(pos);
    for (;;) {
        if (!(side < 0 ? cursor.childBefore(pos) : cursor.childAfter(pos)))
            for (;;) {
                if ((side < 0 ? cursor.to < pos : cursor.from > pos) && !cursor.type.isError)
                    return side < 0 ? Math.max(0, Math.min(cursor.to - 1, pos - 5)) : Math.min(tree.length, Math.max(cursor.from + 1, pos + 5));
                if (side < 0 ? cursor.prevSibling() : cursor.nextSibling())
                    break;
                if (!cursor.parent())
                    return side < 0 ? 0 : tree.length;
            }
    }
}
class FragmentCursor {
    constructor(fragments) {
        this.fragments = fragments;
        this.i = 0;
        this.fragment = null;
        this.safeFrom = -1;
        this.safeTo = -1;
        this.trees = [];
        this.start = [];
        this.index = [];
        this.nextFragment();
    }
    nextFragment() {
        let fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
        if (fr) {
            this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
            this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
            while (this.trees.length) {
                this.trees.pop();
                this.start.pop();
                this.index.pop();
            }
            this.trees.push(fr.tree);
            this.start.push(-fr.offset);
            this.index.push(0);
            this.nextStart = this.safeFrom;
        }
        else {
            this.nextStart = 1e9;
        }
    }
    // `pos` must be >= any previously given `pos` for this cursor
    nodeAt(pos) {
        if (pos < this.nextStart)
            return null;
        while (this.fragment && this.safeTo <= pos)
            this.nextFragment();
        if (!this.fragment)
            return null;
        for (;;) {
            let last = this.trees.length - 1;
            if (last < 0) { // End of tree
                this.nextFragment();
                return null;
            }
            let top = this.trees[last], index = this.index[last];
            if (index == top.children.length) {
                this.trees.pop();
                this.start.pop();
                this.index.pop();
                continue;
            }
            let next = top.children[index];
            let start = this.start[last] + top.positions[index];
            if (start > pos) {
                this.nextStart = start;
                return null;
            }
            else if (start == pos && start + next.length <= this.safeTo) {
                return start == pos && start >= this.safeFrom ? next : null;
            }
            if (next instanceof lezer_tree__WEBPACK_IMPORTED_MODULE_0__.TreeBuffer) {
                this.index[last]++;
                this.nextStart = start + next.length;
            }
            else {
                this.index[last]++;
                if (start + next.length >= pos) { // Enter this node
                    this.trees.push(next);
                    this.start.push(start);
                    this.index.push(0);
                }
            }
        }
    }
}
class CachedToken extends Token {
    constructor() {
        super(...arguments);
        this.extended = -1;
        this.mask = 0;
        this.context = 0;
    }
    clear(start) {
        this.start = start;
        this.value = this.extended = -1;
    }
}
const dummyToken = new Token;
class TokenCache {
    constructor(parser) {
        this.tokens = [];
        this.mainToken = dummyToken;
        this.actions = [];
        this.tokens = parser.tokenizers.map(_ => new CachedToken);
    }
    getActions(stack, input) {
        let actionIndex = 0;
        let main = null;
        let { parser } = stack.p, { tokenizers } = parser;
        let mask = parser.stateSlot(stack.state, 3 /* TokenizerMask */);
        let context = stack.curContext ? stack.curContext.hash : 0;
        for (let i = 0; i < tokenizers.length; i++) {
            if (((1 << i) & mask) == 0)
                continue;
            let tokenizer = tokenizers[i], token = this.tokens[i];
            if (main && !tokenizer.fallback)
                continue;
            if (tokenizer.contextual || token.start != stack.pos || token.mask != mask || token.context != context) {
                this.updateCachedToken(token, tokenizer, stack, input);
                token.mask = mask;
                token.context = context;
            }
            if (token.value != 0 /* Err */) {
                let startIndex = actionIndex;
                if (token.extended > -1)
                    actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
                actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
                if (!tokenizer.extend) {
                    main = token;
                    if (actionIndex > startIndex)
                        break;
                }
            }
        }
        while (this.actions.length > actionIndex)
            this.actions.pop();
        if (!main) {
            main = dummyToken;
            main.start = stack.pos;
            if (stack.pos == input.length)
                main.accept(stack.p.parser.eofTerm, stack.pos);
            else
                main.accept(0 /* Err */, stack.pos + 1);
        }
        this.mainToken = main;
        return this.actions;
    }
    updateCachedToken(token, tokenizer, stack, input) {
        token.clear(stack.pos);
        tokenizer.token(input, token, stack);
        if (token.value > -1) {
            let { parser } = stack.p;
            for (let i = 0; i < parser.specialized.length; i++)
                if (parser.specialized[i] == token.value) {
                    let result = parser.specializers[i](input.read(token.start, token.end), stack);
                    if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
                        if ((result & 1) == 0 /* Specialize */)
                            token.value = result >> 1;
                        else
                            token.extended = result >> 1;
                        break;
                    }
                }
        }
        else if (stack.pos == input.length) {
            token.accept(stack.p.parser.eofTerm, stack.pos);
        }
        else {
            token.accept(0 /* Err */, stack.pos + 1);
        }
    }
    putAction(action, token, end, index) {
        // Don't add duplicate actions
        for (let i = 0; i < index; i += 3)
            if (this.actions[i] == action)
                return index;
        this.actions[index++] = action;
        this.actions[index++] = token;
        this.actions[index++] = end;
        return index;
    }
    addActions(stack, token, end, index) {
        let { state } = stack, { parser } = stack.p, { data } = parser;
        for (let set = 0; set < 2; set++) {
            for (let i = parser.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */);; i += 3) {
                if (data[i] == 65535 /* End */) {
                    if (data[i + 1] == 1 /* Next */) {
                        i = pair(data, i + 2);
                    }
                    else {
                        if (index == 0 && data[i + 1] == 2 /* Other */)
                            index = this.putAction(pair(data, i + 1), token, end, index);
                        break;
                    }
                }
                if (data[i] == token)
                    index = this.putAction(pair(data, i + 1), token, end, index);
            }
        }
        return index;
    }
}
var Rec;
(function (Rec) {
    Rec[Rec["Distance"] = 5] = "Distance";
    Rec[Rec["MaxRemainingPerStep"] = 3] = "MaxRemainingPerStep";
    Rec[Rec["MinBufferLengthPrune"] = 200] = "MinBufferLengthPrune";
    Rec[Rec["ForceReduceLimit"] = 10] = "ForceReduceLimit";
})(Rec || (Rec = {}));
/// A parse context can be used for step-by-step parsing. After
/// creating it, you repeatedly call `.advance()` until it returns a
/// tree to indicate it has reached the end of the parse.
class Parse {
    constructor(parser, input, startPos, context) {
        this.parser = parser;
        this.input = input;
        this.startPos = startPos;
        this.context = context;
        // The position to which the parse has advanced.
        this.pos = 0;
        this.recovering = 0;
        this.nextStackID = 0x2654;
        this.nested = null;
        this.nestEnd = 0;
        this.nestWrap = null;
        this.reused = [];
        this.tokens = new TokenCache(parser);
        this.topTerm = parser.top[1];
        this.stacks = [Stack.start(this, parser.top[0], this.startPos)];
        let fragments = context === null || context === void 0 ? void 0 : context.fragments;
        this.fragments = fragments && fragments.length ? new FragmentCursor(fragments) : null;
    }
    // Move the parser forward. This will process all parse stacks at
    // `this.pos` and try to advance them to a further position. If no
    // stack for such a position is found, it'll start error-recovery.
    //
    // When the parse is finished, this will return a syntax tree. When
    // not, it returns `null`.
    advance() {
        if (this.nested) {
            let result = this.nested.advance();
            this.pos = this.nested.pos;
            if (result) {
                this.finishNested(this.stacks[0], result);
                this.nested = null;
            }
            return null;
        }
        let stacks = this.stacks, pos = this.pos;
        // This will hold stacks beyond `pos`.
        let newStacks = this.stacks = [];
        let stopped, stoppedTokens;
        let maybeNest;
        // Keep advancing any stacks at `pos` until they either move
        // forward or can't be advanced. Gather stacks that can't be
        // advanced further in `stopped`.
        for (let i = 0; i < stacks.length; i++) {
            let stack = stacks[i], nest;
            for (;;) {
                if (stack.pos > pos) {
                    newStacks.push(stack);
                }
                else if (nest = this.checkNest(stack)) {
                    if (!maybeNest || maybeNest.stack.score < stack.score)
                        maybeNest = nest;
                }
                else if (this.advanceStack(stack, newStacks, stacks)) {
                    continue;
                }
                else {
                    if (!stopped) {
                        stopped = [];
                        stoppedTokens = [];
                    }
                    stopped.push(stack);
                    let tok = this.tokens.mainToken;
                    stoppedTokens.push(tok.value, tok.end);
                }
                break;
            }
        }
        if (maybeNest) {
            this.startNested(maybeNest);
            return null;
        }
        if (!newStacks.length) {
            let finished = stopped && findFinished(stopped);
            if (finished)
                return this.stackToTree(finished);
            if (this.parser.strict) {
                if (verbose && stopped)
                    console.log("Stuck with token " + this.parser.getName(this.tokens.mainToken.value));
                throw new SyntaxError("No parse at " + pos);
            }
            if (!this.recovering)
                this.recovering = 5 /* Distance */;
        }
        if (this.recovering && stopped) {
            let finished = this.runRecovery(stopped, stoppedTokens, newStacks);
            if (finished)
                return this.stackToTree(finished.forceAll());
        }
        if (this.recovering) {
            let maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3 /* MaxRemainingPerStep */;
            if (newStacks.length > maxRemaining) {
                newStacks.sort((a, b) => b.score - a.score);
                while (newStacks.length > maxRemaining)
                    newStacks.pop();
            }
            if (newStacks.some(s => s.reducePos > pos))
                this.recovering--;
        }
        else if (newStacks.length > 1) {
            // Prune stacks that are in the same state, or that have been
            // running without splitting for a while, to avoid getting stuck
            // with multiple successful stacks running endlessly on.
            outer: for (let i = 0; i < newStacks.length - 1; i++) {
                let stack = newStacks[i];
                for (let j = i + 1; j < newStacks.length; j++) {
                    let other = newStacks[j];
                    if (stack.sameState(other) ||
                        stack.buffer.length > 200 /* MinBufferLengthPrune */ && other.buffer.length > 200 /* MinBufferLengthPrune */) {
                        if (((stack.score - other.score) || (stack.buffer.length - other.buffer.length)) > 0) {
                            newStacks.splice(j--, 1);
                        }
                        else {
                            newStacks.splice(i--, 1);
                            continue outer;
                        }
                    }
                }
            }
        }
        this.pos = newStacks[0].pos;
        for (let i = 1; i < newStacks.length; i++)
            if (newStacks[i].pos < this.pos)
                this.pos = newStacks[i].pos;
        return null;
    }
    // Returns an updated version of the given stack, or null if the
    // stack can't advance normally. When `split` and `stacks` are
    // given, stacks split off by ambiguous operations will be pushed to
    // `split`, or added to `stacks` if they move `pos` forward.
    advanceStack(stack, stacks, split) {
        let start = stack.pos, { input, parser } = this;
        let base = verbose ? this.stackID(stack) + " -> " : "";
        if (this.fragments) {
            let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
            for (let cached = this.fragments.nodeAt(start); cached;) {
                let match = this.parser.nodeSet.types[cached.type.id] == cached.type ? parser.getGoto(stack.state, cached.type.id) : -1;
                if (match > -1 && cached.length && (!strictCx || (cached.contextHash || 0) == cxHash)) {
                    stack.useNode(cached, match);
                    if (verbose)
                        console.log(base + this.stackID(stack) + ` (via reuse of ${parser.getName(cached.type.id)})`);
                    return true;
                }
                if (!(cached instanceof lezer_tree__WEBPACK_IMPORTED_MODULE_0__.Tree) || cached.children.length == 0 || cached.positions[0] > 0)
                    break;
                let inner = cached.children[0];
                if (inner instanceof lezer_tree__WEBPACK_IMPORTED_MODULE_0__.Tree)
                    cached = inner;
                else
                    break;
            }
        }
        let defaultReduce = parser.stateSlot(stack.state, 4 /* DefaultReduce */);
        if (defaultReduce > 0) {
            stack.reduce(defaultReduce);
            if (verbose)
                console.log(base + this.stackID(stack) + ` (via always-reduce ${parser.getName(defaultReduce & 65535 /* ValueMask */)})`);
            return true;
        }
        let actions = this.tokens.getActions(stack, input);
        for (let i = 0; i < actions.length;) {
            let action = actions[i++], term = actions[i++], end = actions[i++];
            let last = i == actions.length || !split;
            let localStack = last ? stack : stack.split();
            localStack.apply(action, term, end);
            if (verbose)
                console.log(base + this.stackID(localStack) + ` (via ${(action & 65536 /* ReduceFlag */) == 0 ? "shift"
                    : `reduce of ${parser.getName(action & 65535 /* ValueMask */)}`} for ${parser.getName(term)} @ ${start}${localStack == stack ? "" : ", split"})`);
            if (last)
                return true;
            else if (localStack.pos > start)
                stacks.push(localStack);
            else
                split.push(localStack);
        }
        return false;
    }
    // Advance a given stack forward as far as it will go. Returns the
    // (possibly updated) stack if it got stuck, or null if it moved
    // forward and was given to `pushStackDedup`.
    advanceFully(stack, newStacks) {
        let pos = stack.pos;
        for (;;) {
            let nest = this.checkNest(stack);
            if (nest)
                return nest;
            if (!this.advanceStack(stack, null, null))
                return false;
            if (stack.pos > pos) {
                pushStackDedup(stack, newStacks);
                return true;
            }
        }
    }
    runRecovery(stacks, tokens, newStacks) {
        let finished = null, restarted = false;
        let maybeNest;
        for (let i = 0; i < stacks.length; i++) {
            let stack = stacks[i], token = tokens[i << 1], tokenEnd = tokens[(i << 1) + 1];
            let base = verbose ? this.stackID(stack) + " -> " : "";
            if (stack.deadEnd) {
                if (restarted)
                    continue;
                restarted = true;
                stack.restart();
                if (verbose)
                    console.log(base + this.stackID(stack) + " (restarted)");
                let done = this.advanceFully(stack, newStacks);
                if (done) {
                    if (done !== true)
                        maybeNest = done;
                    continue;
                }
            }
            let force = stack.split(), forceBase = base;
            for (let j = 0; force.forceReduce() && j < 10 /* ForceReduceLimit */; j++) {
                if (verbose)
                    console.log(forceBase + this.stackID(force) + " (via force-reduce)");
                let done = this.advanceFully(force, newStacks);
                if (done) {
                    if (done !== true)
                        maybeNest = done;
                    break;
                }
                if (verbose)
                    forceBase = this.stackID(force) + " -> ";
            }
            for (let insert of stack.recoverByInsert(token)) {
                if (verbose)
                    console.log(base + this.stackID(insert) + " (via recover-insert)");
                this.advanceFully(insert, newStacks);
            }
            if (this.input.length > stack.pos) {
                if (tokenEnd == stack.pos) {
                    tokenEnd++;
                    token = 0 /* Err */;
                }
                stack.recoverByDelete(token, tokenEnd);
                if (verbose)
                    console.log(base + this.stackID(stack) + ` (via recover-delete ${this.parser.getName(token)})`);
                pushStackDedup(stack, newStacks);
            }
            else if (!finished || finished.score < stack.score) {
                finished = stack;
            }
        }
        if (finished)
            return finished;
        if (maybeNest)
            for (let s of this.stacks)
                if (s.score > maybeNest.stack.score) {
                    maybeNest = undefined;
                    break;
                }
        if (maybeNest)
            this.startNested(maybeNest);
        return null;
    }
    forceFinish() {
        let stack = this.stacks[0].split();
        if (this.nested)
            this.finishNested(stack, this.nested.forceFinish());
        return this.stackToTree(stack.forceAll());
    }
    // Convert the stack's buffer to a syntax tree.
    stackToTree(stack, pos = stack.pos) {
        if (this.parser.context)
            stack.emitContext();
        return lezer_tree__WEBPACK_IMPORTED_MODULE_0__.Tree.build({ buffer: StackBufferCursor.create(stack),
            nodeSet: this.parser.nodeSet,
            topID: this.topTerm,
            maxBufferLength: this.parser.bufferLength,
            reused: this.reused,
            start: this.startPos,
            length: pos - this.startPos,
            minRepeatType: this.parser.minRepeatTerm });
    }
    checkNest(stack) {
        let info = this.parser.findNested(stack.state);
        if (!info)
            return null;
        let spec = info.value;
        if (typeof spec == "function")
            spec = spec(this.input, stack);
        return spec ? { stack, info, spec } : null;
    }
    startNested(nest) {
        let { stack, info, spec } = nest;
        this.stacks = [stack];
        this.nestEnd = this.scanForNestEnd(stack, info.end, spec.filterEnd);
        this.nestWrap = typeof spec.wrapType == "number" ? this.parser.nodeSet.types[spec.wrapType] : spec.wrapType || null;
        if (spec.startParse) {
            this.nested = spec.startParse(this.input.clip(this.nestEnd), stack.pos, this.context);
        }
        else {
            this.finishNested(stack);
        }
    }
    scanForNestEnd(stack, endToken, filter) {
        for (let pos = stack.pos; pos < this.input.length; pos++) {
            dummyToken.start = pos;
            dummyToken.value = -1;
            endToken.token(this.input, dummyToken, stack);
            if (dummyToken.value > -1 && (!filter || filter(this.input.read(pos, dummyToken.end))))
                return pos;
        }
        return this.input.length;
    }
    finishNested(stack, tree) {
        if (this.nestWrap)
            tree = new lezer_tree__WEBPACK_IMPORTED_MODULE_0__.Tree(this.nestWrap, tree ? [tree] : [], tree ? [0] : [], this.nestEnd - stack.pos);
        else if (!tree)
            tree = new lezer_tree__WEBPACK_IMPORTED_MODULE_0__.Tree(lezer_tree__WEBPACK_IMPORTED_MODULE_0__.NodeType.none, [], [], this.nestEnd - stack.pos);
        let info = this.parser.findNested(stack.state);
        stack.useNode(tree, this.parser.getGoto(stack.state, info.placeholder, true));
        if (verbose)
            console.log(this.stackID(stack) + ` (via unnest)`);
    }
    stackID(stack) {
        let id = (stackIDs || (stackIDs = new WeakMap)).get(stack);
        if (!id)
            stackIDs.set(stack, id = String.fromCodePoint(this.nextStackID++));
        return id + stack;
    }
}
function pushStackDedup(stack, newStacks) {
    for (let i = 0; i < newStacks.length; i++) {
        let other = newStacks[i];
        if (other.pos == stack.pos && other.sameState(stack)) {
            if (newStacks[i].score < stack.score)
                newStacks[i] = stack;
            return;
        }
    }
    newStacks.push(stack);
}
class Dialect {
    constructor(source, flags, disabled) {
        this.source = source;
        this.flags = flags;
        this.disabled = disabled;
    }
    allows(term) { return !this.disabled || this.disabled[term] == 0; }
}
const id = x => x;
/// Context trackers are used to track stateful context (such as
/// indentation in the Python grammar, or parent elements in the XML
/// grammar) needed by external tokenizers. You declare them in a
/// grammar file as `@context exportName from "module"`.
///
/// Context values should be immutable, and can be updated (replaced)
/// on shift or reduce actions.
class ContextTracker {
    /// The export used in a `@context` declaration should be of this
    /// type.
    constructor(spec) {
        this.start = spec.start;
        this.shift = spec.shift || id;
        this.reduce = spec.reduce || id;
        this.reuse = spec.reuse || id;
        this.hash = spec.hash;
        this.strict = spec.strict !== false;
    }
}
/// A parser holds the parse tables for a given grammar, as generated
/// by `lezer-generator`.
class Parser {
    /// @internal
    constructor(spec) {
        /// @internal
        this.bufferLength = lezer_tree__WEBPACK_IMPORTED_MODULE_0__.DefaultBufferLength;
        /// @internal
        this.strict = false;
        this.cachedDialect = null;
        if (spec.version != 13 /* Version */)
            throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${13 /* Version */})`);
        let tokenArray = decodeArray(spec.tokenData);
        let nodeNames = spec.nodeNames.split(" ");
        this.minRepeatTerm = nodeNames.length;
        this.context = spec.context;
        for (let i = 0; i < spec.repeatNodeCount; i++)
            nodeNames.push("");
        let nodeProps = [];
        for (let i = 0; i < nodeNames.length; i++)
            nodeProps.push([]);
        function setProp(nodeID, prop, value) {
            nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
        }
        if (spec.nodeProps)
            for (let propSpec of spec.nodeProps) {
                let prop = propSpec[0];
                for (let i = 1; i < propSpec.length;) {
                    let next = propSpec[i++];
                    if (next >= 0) {
                        setProp(next, prop, propSpec[i++]);
                    }
                    else {
                        let value = propSpec[i + -next];
                        for (let j = -next; j > 0; j--)
                            setProp(propSpec[i++], prop, value);
                        i++;
                    }
                }
            }
        this.specialized = new Uint16Array(spec.specialized ? spec.specialized.length : 0);
        this.specializers = [];
        if (spec.specialized)
            for (let i = 0; i < spec.specialized.length; i++) {
                this.specialized[i] = spec.specialized[i].term;
                this.specializers[i] = spec.specialized[i].get;
            }
        this.states = decodeArray(spec.states, Uint32Array);
        this.data = decodeArray(spec.stateData);
        this.goto = decodeArray(spec.goto);
        let topTerms = Object.keys(spec.topRules).map(r => spec.topRules[r][1]);
        this.nodeSet = new lezer_tree__WEBPACK_IMPORTED_MODULE_0__.NodeSet(nodeNames.map((name, i) => lezer_tree__WEBPACK_IMPORTED_MODULE_0__.NodeType.define({
            name: i >= this.minRepeatTerm ? undefined : name,
            id: i,
            props: nodeProps[i],
            top: topTerms.indexOf(i) > -1,
            error: i == 0,
            skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
        })));
        this.maxTerm = spec.maxTerm;
        this.tokenizers = spec.tokenizers.map(value => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
        this.topRules = spec.topRules;
        this.nested = (spec.nested || []).map(([name, value, endToken, placeholder]) => {
            return { name, value, end: new TokenGroup(decodeArray(endToken), 0), placeholder };
        });
        this.dialects = spec.dialects || {};
        this.dynamicPrecedences = spec.dynamicPrecedences || null;
        this.tokenPrecTable = spec.tokenPrec;
        this.termNames = spec.termNames || null;
        this.maxNode = this.nodeSet.types.length - 1;
        this.dialect = this.parseDialect();
        this.top = this.topRules[Object.keys(this.topRules)[0]];
    }
    /// Parse a given string or stream.
    parse(input, startPos = 0, context = {}) {
        if (typeof input == "string")
            input = (0,lezer_tree__WEBPACK_IMPORTED_MODULE_0__.stringInput)(input);
        let cx = new Parse(this, input, startPos, context);
        for (;;) {
            let done = cx.advance();
            if (done)
                return done;
        }
    }
    /// Start an incremental parse.
    startParse(input, startPos = 0, context = {}) {
        if (typeof input == "string")
            input = (0,lezer_tree__WEBPACK_IMPORTED_MODULE_0__.stringInput)(input);
        return new Parse(this, input, startPos, context);
    }
    /// Get a goto table entry @internal
    getGoto(state, term, loose = false) {
        let table = this.goto;
        if (term >= table[0])
            return -1;
        for (let pos = table[term + 1];;) {
            let groupTag = table[pos++], last = groupTag & 1;
            let target = table[pos++];
            if (last && loose)
                return target;
            for (let end = pos + (groupTag >> 1); pos < end; pos++)
                if (table[pos] == state)
                    return target;
            if (last)
                return -1;
        }
    }
    /// Check if this state has an action for a given terminal @internal
    hasAction(state, terminal) {
        let data = this.data;
        for (let set = 0; set < 2; set++) {
            for (let i = this.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */), next;; i += 3) {
                if ((next = data[i]) == 65535 /* End */) {
                    if (data[i + 1] == 1 /* Next */)
                        next = data[i = pair(data, i + 2)];
                    else if (data[i + 1] == 2 /* Other */)
                        return pair(data, i + 2);
                    else
                        break;
                }
                if (next == terminal || next == 0 /* Err */)
                    return pair(data, i + 1);
            }
        }
        return 0;
    }
    /// @internal
    stateSlot(state, slot) {
        return this.states[(state * 6 /* Size */) + slot];
    }
    /// @internal
    stateFlag(state, flag) {
        return (this.stateSlot(state, 0 /* Flags */) & flag) > 0;
    }
    /// @internal
    findNested(state) {
        let flags = this.stateSlot(state, 0 /* Flags */);
        return flags & 4 /* StartNest */ ? this.nested[flags >> 10 /* NestShift */] : null;
    }
    /// @internal
    validAction(state, action) {
        if (action == this.stateSlot(state, 4 /* DefaultReduce */))
            return true;
        for (let i = this.stateSlot(state, 1 /* Actions */);; i += 3) {
            if (this.data[i] == 65535 /* End */) {
                if (this.data[i + 1] == 1 /* Next */)
                    i = pair(this.data, i + 2);
                else
                    return false;
            }
            if (action == pair(this.data, i + 1))
                return true;
        }
    }
    /// Get the states that can follow this one through shift actions or
    /// goto jumps. @internal
    nextStates(state) {
        let result = [];
        for (let i = this.stateSlot(state, 1 /* Actions */);; i += 3) {
            if (this.data[i] == 65535 /* End */) {
                if (this.data[i + 1] == 1 /* Next */)
                    i = pair(this.data, i + 2);
                else
                    break;
            }
            if ((this.data[i + 2] & (65536 /* ReduceFlag */ >> 16)) == 0) {
                let value = this.data[i + 1];
                if (!result.some((v, i) => (i & 1) && v == value))
                    result.push(this.data[i], value);
            }
        }
        return result;
    }
    /// @internal
    overrides(token, prev) {
        let iPrev = findOffset(this.data, this.tokenPrecTable, prev);
        return iPrev < 0 || findOffset(this.data, this.tokenPrecTable, token) < iPrev;
    }
    /// Configure the parser. Returns a new parser instance that has the
    /// given settings modified. Settings not provided in `config` are
    /// kept from the original parser.
    configure(config) {
        // Hideous reflection-based kludge to make it easy to create a
        // slightly modified copy of a parser.
        let copy = Object.assign(Object.create(Parser.prototype), this);
        if (config.props)
            copy.nodeSet = this.nodeSet.extend(...config.props);
        if (config.top) {
            let info = this.topRules[config.top];
            if (!info)
                throw new RangeError(`Invalid top rule name ${config.top}`);
            copy.top = info;
        }
        if (config.tokenizers)
            copy.tokenizers = this.tokenizers.map(t => {
                let found = config.tokenizers.find(r => r.from == t);
                return found ? found.to : t;
            });
        if (config.dialect)
            copy.dialect = this.parseDialect(config.dialect);
        if (config.nested)
            copy.nested = this.nested.map(obj => {
                if (!Object.prototype.hasOwnProperty.call(config.nested, obj.name))
                    return obj;
                return { name: obj.name, value: config.nested[obj.name], end: obj.end, placeholder: obj.placeholder };
            });
        if (config.strict != null)
            copy.strict = config.strict;
        if (config.bufferLength != null)
            copy.bufferLength = config.bufferLength;
        return copy;
    }
    /// Returns the name associated with a given term. This will only
    /// work for all terms when the parser was generated with the
    /// `--names` option. By default, only the names of tagged terms are
    /// stored.
    getName(term) {
        return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
    }
    /// The eof term id is always allocated directly after the node
    /// types. @internal
    get eofTerm() { return this.maxNode + 1; }
    /// Tells you whether this grammar has any nested grammars.
    get hasNested() { return this.nested.length > 0; }
    /// The type of top node produced by the parser.
    get topNode() { return this.nodeSet.types[this.top[1]]; }
    /// @internal
    dynamicPrecedence(term) {
        let prec = this.dynamicPrecedences;
        return prec == null ? 0 : prec[term] || 0;
    }
    /// @internal
    parseDialect(dialect) {
        if (this.cachedDialect && this.cachedDialect.source == dialect)
            return this.cachedDialect;
        let values = Object.keys(this.dialects), flags = values.map(() => false);
        if (dialect)
            for (let part of dialect.split(" ")) {
                let id = values.indexOf(part);
                if (id >= 0)
                    flags[id] = true;
            }
        let disabled = null;
        for (let i = 0; i < values.length; i++)
            if (!flags[i]) {
                for (let j = this.dialects[values[i]], id; (id = this.data[j++]) != 65535 /* End */;)
                    (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id] = 1;
            }
        return this.cachedDialect = new Dialect(dialect, flags, disabled);
    }
    /// (used by the output of the parser generator) @internal
    static deserialize(spec) {
        return new Parser(spec);
    }
}
function pair(data, off) { return data[off] | (data[off + 1] << 16); }
function findOffset(data, start, term) {
    for (let i = start, next; (next = data[i]) != 65535 /* End */; i++)
        if (next == term)
            return i - start;
    return -1;
}
function findFinished(stacks) {
    let best = null;
    for (let stack of stacks) {
        if (stack.pos == stack.p.input.length &&
            stack.p.parser.stateFlag(stack.state, 2 /* Accepting */) &&
            (!best || best.score < stack.score))
            best = stack;
    }
    return best;
}


//# sourceMappingURL=index.es.js.map


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!*********************!*\
  !*** ./webstart.ts ***!
  \*********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _compiler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./compiler */ "./compiler.ts");
/* harmony import */ var _runner__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./runner */ "./runner.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};


document.addEventListener("DOMContentLoaded", function () { return __awaiter(void 0, void 0, void 0, function () {
    function display(arg) {
        var elt = document.createElement("pre");
        document.getElementById("output").appendChild(elt);
        elt.innerText = arg;
    }
    var memory, importObject, runButton, userCode;
    return __generator(this, function (_a) {
        memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
        importObject = {
            imports: {
                print_num: function (arg) {
                    console.log("Logging from WASM: ", arg);
                    display(String(arg));
                    return arg;
                },
                print_bool: function (arg) {
                    if (arg === 0) {
                        display("False");
                    }
                    else {
                        display("True");
                    }
                    return arg;
                },
                print_none: function (arg) {
                    display("None");
                    return arg;
                },
                print: function (arg) {
                    console.log("Logging from WASM: ", arg);
                    var elt = document.createElement("pre");
                    document.getElementById("output").appendChild(elt);
                    // elt.innerText = arg;
                    return arg;
                },
                mem: memory,
                abs: Math.abs,
                max: Math.max,
                min: Math.min,
                pow: Math.pow
            },
        };
        runButton = document.getElementById("run");
        userCode = document.getElementById("user-code");
        runButton.addEventListener("click", function () { return __awaiter(void 0, void 0, void 0, function () {
            var program, output, wat, code, result, i32, i, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        program = userCode.value;
                        output = document.getElementById("output");
                        output.textContent = "";
                        console.log("program: ".concat(program));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        wat = (0,_compiler__WEBPACK_IMPORTED_MODULE_0__.compile)(program);
                        code = document.getElementById("generated-code");
                        code.textContent = wat.wasmSource;
                        document.getElementById("");
                        return [4 /*yield*/, (0,_runner__WEBPACK_IMPORTED_MODULE_1__.runwatsrc)(program, { importObject: importObject })];
                    case 2:
                        result = _a.sent();
                        i32 = new Uint32Array(memory.buffer);
                        for (i = 0; i < 10; i++) {
                            console.log("i32[".concat(i, "]: ").concat(i32[i]));
                        }
                        if (result !== undefined) {
                            output.textContent += String(result);
                        }
                        output.setAttribute("style", "color: black");
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.error(e_1);
                        output.textContent = String(e_1);
                        output.setAttribute("style", "color: red");
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        userCode.value = localStorage.getItem("program");
        userCode.addEventListener("keypress", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                localStorage.setItem("program", userCode.value);
                return [2 /*return*/];
            });
        }); });
        return [2 /*return*/];
    });
}); });

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQztBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNENBQTRDO0FBQzVDO0FBQ0E7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMERBQTBEO0FBQzFELHdEQUF3RCxTQUFTO0FBQ2pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZTtBQUNmO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlEQUFpRDtBQUNqRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtEQUErRDtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUNBO0FBQ0E7QUFDQSxrREFBa0QsV0FBVztBQUM3RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLG1CQUFtQjtBQUNsRDtBQUNBLGVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0EsbUJBQW1CO0FBQ25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWU7QUFDZjtBQUNBLDRCQUE0QjtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdDQUFnQyxrREFBVTtBQUMxQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0RBQWtEO0FBQ2xEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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RkFBaUYsaUJBQWlCO0FBQ2xHLHlEQUF5RCxnQkFBZ0IsUUFBUTtBQUNqRiwrQ0FBK0MsZ0JBQWdCLGdCQUFnQjtBQUMvRTtBQUNBLGtDQUFrQztBQUNsQztBQUNBO0FBQ0EsVUFBVSxZQUFZLGFBQWEsU0FBUyxVQUFVO0FBQ3RELG9DQUFvQyxTQUFTO0FBQzdDO0FBQ0E7QUFDcUM7QUFDQTtBQUNyQyw0REFBNEQ7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQ0FBMEMsMkJBQTJCO0FBQ3JFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSwwREFBMEQ7QUFDMUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QixrREFBTztBQUNyQztBQUNBO0FBQ0E7QUFDQSw2Q0FBNkMsa0RBQVMsWUFBWSw0QkFBNEI7QUFDOUY7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DLFFBQVE7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVMsSUFBSTtBQUNiO0FBQ0EsNERBQTREO0FBQzVEO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTLElBQUk7QUFDYjtBQUNBLEtBQUs7QUFDTCxDQUFDLElBQUkiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL2FzdC50cyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL2NvbXBpbGVyLnRzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vcGFyc2VyLnRzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vcnVubmVyLnRzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vdHlwZWNoZWNrLnRzIiwid2VicGFjazovL3dlYi1hc20taml0L2V4dGVybmFsIHZhciBcIndhYnRcIiIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL25vZGVfbW9kdWxlcy9sZXplci1weXRob24vZGlzdC9pbmRleC5lcy5qcyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL25vZGVfbW9kdWxlcy9sZXplci10cmVlL2Rpc3QvdHJlZS5lcy5qcyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL25vZGVfbW9kdWxlcy9sZXplci9kaXN0L2luZGV4LmVzLmpzIiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svcnVudGltZS9jb21wYXQgZ2V0IGRlZmF1bHQgZXhwb3J0Iiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvLi93ZWJzdGFydC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgdmFyIEJpbk9wO1xuKGZ1bmN0aW9uIChCaW5PcCkge1xuICAgIEJpbk9wW1wiUGx1c1wiXSA9IFwiK1wiO1xuICAgIEJpbk9wW1wiTWludXNcIl0gPSBcIi1cIjtcbiAgICBCaW5PcFtcIk11bFwiXSA9IFwiKlwiO1xuICAgIEJpbk9wW1wiRGl2XCJdID0gXCIvL1wiO1xuICAgIEJpbk9wW1wiTW9kXCJdID0gXCIlXCI7XG4gICAgQmluT3BbXCJFcVwiXSA9IFwiPT1cIjtcbiAgICBCaW5PcFtcIk5lcVwiXSA9IFwiIT1cIjtcbiAgICBCaW5PcFtcIlNlcVwiXSA9IFwiPD1cIjtcbiAgICBCaW5PcFtcIkxlcVwiXSA9IFwiPj1cIjtcbiAgICBCaW5PcFtcIlNtbFwiXSA9IFwiPFwiO1xuICAgIEJpbk9wW1wiTHJnXCJdID0gXCI+XCI7XG4gICAgQmluT3BbXCJJc1wiXSA9IFwiaXNcIjtcbn0pKEJpbk9wIHx8IChCaW5PcCA9IHt9KSk7XG5leHBvcnQgdmFyIFVuaU9wO1xuKGZ1bmN0aW9uIChVbmlPcCkge1xuICAgIFVuaU9wW1wiTWludXNcIl0gPSBcIi1cIjtcbiAgICBVbmlPcFtcIk5vdFwiXSA9IFwibm90XCI7XG59KShVbmlPcCB8fCAoVW5pT3AgPSB7fSkpO1xuIiwidmFyIF9fYXNzaWduID0gKHRoaXMgJiYgdGhpcy5fX2Fzc2lnbikgfHwgZnVuY3Rpb24gKCkge1xuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbih0KSB7XG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSlcbiAgICAgICAgICAgICAgICB0W3BdID0gc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdDtcbiAgICB9O1xuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcbnZhciBfX3NwcmVhZEFycmF5ID0gKHRoaXMgJiYgdGhpcy5fX3NwcmVhZEFycmF5KSB8fCBmdW5jdGlvbiAodG8sIGZyb20sIHBhY2spIHtcbiAgICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XG4gICAgICAgICAgICBpZiAoIWFyKSBhciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20sIDAsIGkpO1xuICAgICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xufTtcbmltcG9ydCB7IEJpbk9wLCBVbmlPcCB9IGZyb20gJy4vYXN0JztcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSBcIi4vcGFyc2VyXCI7XG5pbXBvcnQgeyB0eXBlQ2hlY2tQcm9ncmFtIH0gZnJvbSBcIi4vdHlwZWNoZWNrXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlMb2NhbEVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YXJzOiBuZXcgTWFwKCksXG4gICAgICAgIGlzRnVuYzogZmFsc2UsXG4gICAgfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbXB0eUdsb2JhbEVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YXJzOiBuZXcgTWFwKCksXG4gICAgICAgIGZ1bmNzOiBuZXcgTWFwKCksXG4gICAgICAgIGNsYXNzSW5kZXhlczogbmV3IE1hcCgpLFxuICAgICAgICBjbGFzc0luaXRzOiBuZXcgTWFwKCksXG4gICAgICAgIGxvb3BEZXB0aDogMFxuICAgIH07XG59XG4vLyBzZXQgdXAgZ2xvYmFsIHZhcmlhYmxlcyBhbmQgZ2xvYmFsIGZ1bmN0aW9uc1xuZXhwb3J0IGZ1bmN0aW9uIHNldEdsb2JhbEluZm8ocHJvZ3JhbSkge1xuICAgIHZhciBnbG9iYWxFbnYgPSBjcmVhdGVFbXB0eUdsb2JhbEVudigpO1xuICAgIC8vIHNldCB2YXJpYWJsZXNcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwcm9ncmFtLnZhckluaXRzLmxlbmd0aDsgKytpZHgpIHtcbiAgICAgICAgZ2xvYmFsRW52LnZhcnMuc2V0KHByb2dyYW0udmFySW5pdHNbaWR4XS5uYW1lLCBwcm9ncmFtLnZhckluaXRzW2lkeF0pO1xuICAgIH1cbiAgICAvLyBzZXQgZnVuY3N0aW9uc1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHByb2dyYW0uZnVuY0RlZnMubGVuZ3RoOyArK2lkeCkge1xuICAgICAgICBnbG9iYWxFbnYuZnVuY3Muc2V0KHByb2dyYW0uZnVuY0RlZnNbaWR4XS5uYW1lLCBwcm9ncmFtLmZ1bmNEZWZzW2lkeF0pO1xuICAgIH1cbiAgICAvLyBzZXQgY2xhc3MgZmllbGQgaW5kZXhlcyBhbmQgaW5pdCB2YWx1ZVxuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHByb2dyYW0uY2xhc3NEZWZzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgdmFyIGNsYXNzSW5kZXhlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdmFyIGNsYXNzSW5pdHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHZhciBjbGFzc0RlZiA9IHByb2dyYW0uY2xhc3NEZWZzW2lkeF07XG4gICAgICAgIGlmIChjbGFzc0RlZi50YWcgIT09IFwiY2xhc3NcIikge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJzaG91bGQgYmUgYSBjbGFzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZmllbGRzID0gY2xhc3NEZWYuZmllbGRzO1xuICAgICAgICBmb3IgKHZhciBpZHgyID0gMDsgaWR4MiA8IGZpZWxkcy5sZW5ndGg7IGlkeDIrKykge1xuICAgICAgICAgICAgY2xhc3NJbmRleGVzLnNldChmaWVsZHNbaWR4Ml0ubmFtZSwgaWR4Mik7XG4gICAgICAgICAgICBjbGFzc0luaXRzLnNldChmaWVsZHNbaWR4Ml0ubmFtZSwgZmllbGRzW2lkeDJdLmluaXRMaXRlcmFsKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2xhc3NOYW1lID0gY2xhc3NEZWYubmFtZTtcbiAgICAgICAgZ2xvYmFsRW52LmNsYXNzSW5kZXhlcy5zZXQoY2xhc3NOYW1lLCBjbGFzc0luZGV4ZXMpO1xuICAgICAgICBnbG9iYWxFbnYuY2xhc3NJbml0cy5zZXQoY2xhc3NOYW1lLCBjbGFzc0luaXRzKTtcbiAgICB9XG4gICAgcmV0dXJuIGdsb2JhbEVudjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKHNvdXJjZSkge1xuICAgIC8vIHBhcnNlIHByb2dyYW0gYW5kIGdldCBlYWNoIGVsZW1lbnRzXG4gICAgdmFyIHByb2dyYW0gPSB0eXBlQ2hlY2tQcm9ncmFtKHBhcnNlKHNvdXJjZSkpO1xuICAgIHZhciBhc3QgPSBwcm9ncmFtLnN0bXRzO1xuICAgIHZhciBnbG9iYWxFbnYgPSBzZXRHbG9iYWxJbmZvKHByb2dyYW0pO1xuICAgIC8vIGdlbmVyYXRlIGZ1bmN0aW9uIGRlZmluaXRpb25zXG4gICAgdmFyIGZ1bmNzID0gcHJvZ3JhbS5mdW5jRGVmcy5tYXAoZnVuY3Rpb24gKGZ1bmNEZWYpIHtcbiAgICAgICAgcmV0dXJuIGNvZGVHZW5GdW5jRGVmKGZ1bmNEZWYsIGdsb2JhbEVudik7XG4gICAgfSkuam9pbignXFxuJyk7XG4gICAgLy8gZ2VuZXJhdGUgZ2xvYmFsIHZhcmlhYmxlcyAoaW5jbHVkaW5nIHRoZSBoZWFwKVxuICAgIHZhciBnbG9iYWxWYXJzID0gY29kZUdlbkdsb2JhbFZhcihwcm9ncmFtLnZhckluaXRzKS5qb2luKCdcXG4nKTtcbiAgICAvLyBnZW5lcmF0ZSBjbGFzcyBkZWZpbml0aW9uc1xuICAgIHZhciBjbGFzc2VzID0gcHJvZ3JhbS5jbGFzc0RlZnMubWFwKGZ1bmN0aW9uIChjbGFzc0RlZikge1xuICAgICAgICByZXR1cm4gY29kZUdlbkNsYXNzRGVmKGNsYXNzRGVmLCBnbG9iYWxFbnYpOyAvLyBub3Qgc3VyZSB3aHkgaXRzIHJldHVybiBpcyBzdHJpbmdwW11cbiAgICB9KS5qb2luKFwiXFxuXCIpO1xuICAgIC8vIGNyZWF0ZSBhbiBlbXB0eSBsb2NhbCBlbnZpcm9ubWVudFxuICAgIHZhciBsb2NhbEVudiA9IGNyZWF0ZUVtcHR5TG9jYWxFbnYoKTtcbiAgICAvLyBnZW5lcmF0ZSB0aGUgY29kZSBmb3IgdGhlIG1haW4gYm9keVxuICAgIHZhciBjb21tYW5kcyA9IGNvZGVHZW5NYWluQm9keShhc3QsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgIC8vIGNvbnNvbGUubG9nKGNvbW1hbmRzKTtcbiAgICAvLyBzZXQgdXAgZmluYWwgZnVuY3Rpb24gcmV0dXJuIHR5cGVcbiAgICB2YXIgbGFzdEV4cHIgPSBhc3RbYXN0Lmxlbmd0aCAtIDFdO1xuICAgIHZhciByZXR1cm5UeXBlID0gXCJcIjtcbiAgICB2YXIgcmV0dXJuRXhwciA9IFwiXCI7XG4gICAgLy8gY29uc29sZS5sb2coYGFzdC5sZW5ndGg6ICR7YXN0Lmxlbmd0aH0sIGxhc3RFeHByOiAke2xhc3RFeHByLnRhZ31gKTtcbiAgICBpZiAoYXN0Lmxlbmd0aCA+IDAgJiYgbGFzdEV4cHIudGFnID09PSBcImV4cHJcIikge1xuICAgICAgICByZXR1cm5UeXBlID0gXCIocmVzdWx0IGkzMilcIjtcbiAgICAgICAgcmV0dXJuRXhwciA9IFwiXFxuKGxvY2FsLmdldCAkbGFzdClcIjsgLy8gU2luY2Ugd2UgdXNlIGEgZnVuY3Rpb24gYXQgdGhlIGVuZCwgd2UgbmVlZCB0byBwdXQgdGhlIHJldHVybiB2YWx1ZSBpbiB0aGUgc3RhY2suXG4gICAgfVxuICAgIC8vIFRoZSBsYXN0IHZhbHVlIGlzIG5vdCBuZWVkZWQgaWYgdGhlIGxhc3Qgc3RhdGVtZW50IGlzIG5vdCBhbiBleHByZXNzaW9uLlxuICAgIHJldHVybiB7XG4gICAgICAgIHdhc21Tb3VyY2U6IFwiXCIuY29uY2F0KGdsb2JhbFZhcnMsIFwiXFxuXCIpLmNvbmNhdChjbGFzc2VzLCBcIlxcblwiKS5jb25jYXQoZnVuY3MsIFwiXFxuKGZ1bmMgKGV4cG9ydCBcXFwiZXhwb3J0ZWRfZnVuY1xcXCIpIFwiKS5jb25jYXQocmV0dXJuVHlwZSkuY29uY2F0KGNvbW1hbmRzLmpvaW4oJ1xcbicpKS5jb25jYXQocmV0dXJuRXhwciwgXCIpXCIpXG4gICAgfTtcbn1cbi8vIGdlbmVyYXRlIGNvZGVzIGZvciBzdGF0ZW1lbnRzXG5mdW5jdGlvbiBjb2RlR2VuKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICBzd2l0Y2ggKHN0bXQudGFnKSB7XG4gICAgICAgIGNhc2UgXCJhc3NpZ25cIjpcbiAgICAgICAgICAgIHZhciB2YWxTdG10cyA9IGNvZGVHZW5FeHByKHN0bXQudmFsdWUsIGdsb2JhbEVudiwgbG9jYWxFbnYpOyAvLyByaHNcbiAgICAgICAgICAgIHZhciBsZWZ0RXhwciA9IGNvZGVHZW5FeHByKHN0bXQubmFtZSwgZ2xvYmFsRW52LCBsb2NhbEVudik7IC8vIGxoc1xuICAgICAgICAgICAgLy8gZ2VuZXJhdGUgdGhlIFwic3RvcmVcIiBhc3NpZ24gY29kZVxuICAgICAgICAgICAgaWYgKHN0bXQubmFtZS50YWcgPT0gXCJnZXRmaWVsZFwiKSB7XG4gICAgICAgICAgICAgICAgbGVmdEV4cHIgPSBsZWZ0RXhwci5zbGljZSgwLCAtMSk7IC8vIHN0cmlwIGBpMzIubG9hZGAgc2luY2UgaXQncyBsaHNcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdEV4cHIuY29uY2F0KFt2YWxTdG10cyArIFwiXFxuaTMyLnN0b3JlXCJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgeyAvLyBnZW5lcmF0ZSB0aGUgXCJzZXRcIiBhc3NpZ24gY29kZVxuICAgICAgICAgICAgICAgIGlmIChsb2NhbEVudi5pc0Z1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2FsRW52LnZhcnMuaGFzKHN0bXQudmFyaWFibGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsU3RtdHMuY29uY2F0KFtcIihsb2NhbC5zZXQgJFwiLmNvbmNhdChzdG10Lm5hbWUsIFwiKVwiKV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGNhbm5vdCBhc3NpZ24gYSB2YWx1ZSB0byBhIGdsb2JhbCB2YXJpYWJsZSBpbiB0aGUgZnVuY3Rpb24gZW52aXJvbm1lbnQuXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBnbG9iYWwgdmFyaWFibGUgXCIuY29uY2F0KHN0bXQudmFyaWFibGUsIFwiIGNhbm5vdCBiZSBhc3NpZ25lZCBpbiBhIGZ1bmN0aW9uXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsU3RtdHMuY29uY2F0KFtcIihnbG9iYWwuc2V0ICRcIi5jb25jYXQoc3RtdC52YXJpYWJsZSwgXCIpXCIpXSk7IC8vIGdsb2JhbCBlbnZpcm9ubWVudFxuICAgICAgICBjYXNlIFwiZXhwclwiOlxuICAgICAgICAgICAgdmFyIGV4cHJTdG10cyA9IGNvZGVHZW5FeHByKHN0bXQuZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICByZXR1cm4gZXhwclN0bXRzLmNvbmNhdChbXCIobG9jYWwuc2V0ICRsYXN0KVwiXSk7XG4gICAgICAgIC8vIFdpdGhvdXQgdGhlIHJldHVybiBjb21tYW5kLCB0aGUgZnVuY3Rpb24gd291bGQgcmV0dXJuIHRoZSB2YWx1ZXMgaW4gdGhlIHN0YWNrLlxuICAgICAgICAvLyBIb3dldmVyLCB3ZSB3b3VsZCBuZWVkIHRvIG1ha2Ugc3VyZSB0aGUgI3N0YWNrIGVsZW1lbnRzID09ICNyZXR1cm4gdmFsdWVzXG4gICAgICAgIGNhc2UgXCJyZXR1cm5cIjpcbiAgICAgICAgICAgIHZhciByZXR1cm5TdG10cyA9IGNvZGVHZW5FeHByKHN0bXQuZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICByZXR1cm5TdG10cy5wdXNoKFwiKHJldHVybilcIik7XG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuU3RtdHM7XG4gICAgICAgIGNhc2UgXCJwYXNzXCI6XG4gICAgICAgICAgICByZXR1cm4gW1wibm9wXCJdOyAvLyBubyBvcGVyYXRpb25cbiAgICAgICAgY2FzZSBcIndoaWxlXCI6XG4gICAgICAgICAgICB2YXIgd2hpbGVTdG10cyA9IGNvZGVHZW5XaGlsZShzdG10LCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHJldHVybiB3aGlsZVN0bXRzLmNvbmNhdCgpO1xuICAgICAgICBjYXNlIFwiaWZcIjpcbiAgICAgICAgICAgIHZhciBpZlN0bXRzID0gY29kZUdlbklmKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICAgICAgcmV0dXJuIGlmU3RtdHMuY29uY2F0KCk7XG4gICAgfVxufVxuZnVuY3Rpb24gY29kZUdlbk1haW5Cb2R5KHN0bXRzLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgLy8gZGVjbGFyZSBhbGwgbG9jYWwgdmFyaWFibGVzIGFjY29yZGluZyB0byB0aGUgc291cmNlXG4gICAgdmFyIHNjcmF0Y2hWYXIgPSBcIihsb2NhbCAkbGFzdCBpMzIpXCI7IC8vIGFzIGZ1bmN0aW9uIG91dHB1dFxuICAgIC8vIHB1dCAkbGFzdCBvbiB0aGUgc3RhY2ssIGFuZCBpdCB3aWwgY29uc3VtZSB0aGUgdG9wIHZhbHVlIG9uIHRoZSBzdGFjayBldmVudHVhbGx5XG4gICAgdmFyIGxvY2FsRGVmaW5lcyA9IFtzY3JhdGNoVmFyXTtcbiAgICB2YXIgY29tbWFuZEdyb3VwcyA9IHN0bXRzLm1hcChmdW5jdGlvbiAoc3RtdCkgeyByZXR1cm4gY29kZUdlbihzdG10LCBnbG9iYWxFbnYsIGxvY2FsRW52KTsgfSk7XG4gICAgcmV0dXJuIGxvY2FsRGVmaW5lcy5jb25jYXQoW10uY29uY2F0LmFwcGx5KFtdLCBjb21tYW5kR3JvdXBzKSk7XG59XG5mdW5jdGlvbiBjb2RlR2VuRXhwcihleHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgc3dpdGNoIChleHByLnRhZykge1xuICAgICAgICBjYXNlIFwiaWRcIjpcbiAgICAgICAgICAgIHJldHVybiBbY29kZUdlbklkKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpXTtcbiAgICAgICAgY2FzZSBcImJpbm9wXCI6XG4gICAgICAgICAgICB2YXIgbGVmdFN0bXRzID0gY29kZUdlbkV4cHIoZXhwci5sZWZ0LCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHZhciByaWdodFN0bXRzID0gY29kZUdlbkV4cHIoZXhwci5yaWdodCwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICB2YXIgb3BTdG10ID0gY29kZUdlbkJpbk9wKGV4cHIub3ApO1xuICAgICAgICAgICAgcmV0dXJuIF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBsZWZ0U3RtdHMsIHRydWUpLCByaWdodFN0bXRzLCB0cnVlKSwgW29wU3RtdF0sIGZhbHNlKTtcbiAgICAgICAgY2FzZSBcInVuaW9wXCI6XG4gICAgICAgICAgICB2YXIgdW5pb3BSaWdodCA9IGNvZGVHZW5FeHByKGV4cHIuZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICByZXR1cm4gY29kZUdlblVuaW9uT3AoZXhwci5vcCwgdW5pb3BSaWdodCk7XG4gICAgICAgIGNhc2UgXCJsaXRlcmFsXCI6XG4gICAgICAgICAgICByZXR1cm4gW2NvZGVHZW5MaXRlcmFsKGV4cHIubGl0ZXJhbCldO1xuICAgICAgICBjYXNlIFwiY2FsbFwiOlxuICAgICAgICAgICAgcmV0dXJuIGNvZGVHZW5DYWxsKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICBjYXNlIFwibWV0aG9kXCI6XG4gICAgICAgICAgICB2YXIgYXJnSW5zdHJzID0gZXhwci5hcmdzLm1hcChmdW5jdGlvbiAoYSkgeyByZXR1cm4gY29kZUdlbkV4cHIoYSwgZ2xvYmFsRW52LCBsb2NhbEVudik7IH0pO1xuICAgICAgICAgICAgdmFyIGZsYXR0ZW5BcmdzXzEgPSBbXTsgLy8gZmxhdCB0aGUgbGlzdCBvZiBsaXN0c1xuICAgICAgICAgICAgYXJnSW5zdHJzLmZvckVhY2goZnVuY3Rpb24gKGFyZykgeyByZXR1cm4gZmxhdHRlbkFyZ3NfMS5wdXNoKGFyZy5qb2luKFwiXFxuXCIpKTsgfSk7XG4gICAgICAgICAgICBpZiAoZXhwci5vYmouYSA9PSBcImludFwiIHx8IGV4cHIub2JqLmEgPT0gXCJib29sXCIgfHwgZXhwci5vYmouYSA9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiVGhpcyBzaG91bGQgYmUgYSBjbGFzcy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBUaGUgY2FsbCBvYmplY3QgaXMgdGhlIGZpcnN0IGFyZ3VtZW50IHNlbGYuXG4gICAgICAgICAgICB2YXIgb2JqQWRkciA9IGNvZGVHZW5FeHByKGV4cHIub2JqLCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHZhciBjaGVja1ZhbGlkQWRkcmVzcyA9IF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShbXSwgb2JqQWRkciwgdHJ1ZSksIFtcIihpMzIuY29uc3QgLTQpIFxcbihpMzIuYWRkKVwiLCBcIihpMzIubG9hZClcIiwgXCJsb2NhbC5zZXQgJGxhc3RcIl0sIGZhbHNlKTsgLy8gYyA6IFJhdCA9IE5vbmUsIGMueFxuICAgICAgICAgICAgcmV0dXJuIFtjaGVja1ZhbGlkQWRkcmVzcy5qb2luKFwiXFxuXCIpLCBvYmpBZGRyLmpvaW4oXCJcXG5cIiksIGZsYXR0ZW5BcmdzXzEuam9pbihcIlxcblwiKSwgXCJcXG4oY2FsbCAkJFwiLmNvbmNhdChleHByLm9iai5hLmNsYXNzLCBcIiRcIikuY29uY2F0KGV4cHIubmFtZSwgXCIpXCIpXTtcbiAgICAgICAgY2FzZSBcImdldGZpZWxkXCI6XG4gICAgICAgICAgICByZXR1cm4gY29kZUdlbkZpZWxkKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNvZGVHZW5CaW5PcChvcCkge1xuICAgIHN3aXRjaCAob3ApIHtcbiAgICAgICAgY2FzZSBCaW5PcC5QbHVzOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5hZGQpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuTWludXM6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLnN1YilcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5NdWw6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLm11bClcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5EaXY6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmRpdl9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLk1vZDpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIucmVtX3MpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuRXE6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmVxKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLk5lcTpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIubmUpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuU2VxOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5sZV9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLkxlcTpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIuZ2VfcylcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5TbWw6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmx0X3MpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuTHJnOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5ndF9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLklzOlxuICAgICAgICAgICAgLy8geCBpcyB5IFxuICAgICAgICAgICAgLy8gZS5nLiB5IGlzIGEgY2xhc3MgYW5kIHggaXMgYW4gb2JqZWN0IG9mIHRoYXQgY2xhc3NcbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSwgdGhlIG9ubHkgY2xhc3MgaXMgTm9uZSwgc28gd2UgY2FuIHVzZSBlcVxuICAgICAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKFwiQ09NUElMRSBFUlJPUjogaXMgb3BlcmF0b3Igbm90IGltcGxlbWVudGVkXCIpXG4gICAgICAgICAgICAvLyBGb3Igb3RoZXIgY2xhc3Nlcywgd2Ugc2hvdWxkIGNvbXBhcmUgdGhlIGZpZWxkIHJlY3Vyc2l2ZWx5LlxuICAgICAgICAgICAgLy8gSW4gQ2hvY29weSwgXCJpc1wiIGlzIHVzZWQgdG8gY29tcGFyZSB0aGUgZmllbGRzIGluIHR3byBjbGFzcyBvYmplY3RzLCBhbmQgXCI9PVwiIGNhbm5vdCBiZSB1c2VkIHdpdGggY2xhc3Nlcy4gXG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmVxKVwiO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNvZGVHZW5Vbmlvbk9wKG9wLCByaWdodCkge1xuICAgIHN3aXRjaCAob3ApIHtcbiAgICAgICAgY2FzZSBVbmlPcC5NaW51czpcbiAgICAgICAgICAgIHJldHVybiBfX3NwcmVhZEFycmF5KF9fc3ByZWFkQXJyYXkoW1wiKGkzMi5jb25zdCAwKVwiXSwgcmlnaHQsIHRydWUpLCBbXCIoaTMyLnN1YikgXCJdLCBmYWxzZSk7IC8vIC14ID0gMCAtIHhcbiAgICAgICAgY2FzZSBVbmlPcC5Ob3Q6XG4gICAgICAgICAgICByZXR1cm4gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCByaWdodCwgdHJ1ZSksIFtcIihpMzIuZXF6KVwiXSwgZmFsc2UpOyAvLyBpcyB4ICE9IDAsIHJldHVybiAxOyBlbHNlLCByZXR1cm4gMFxuICAgIH1cbn1cbmZ1bmN0aW9uIGNvZGVHZW5JZihzdG10LCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKHN0bXQudGFnICE9PSAnaWYnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNPTVBJTEUgRVJST1I6IHRoZSBpbnB1dCB0byBjb2RlR2VuSWYgc2hvdWxkIGhhdmUgdGFnIGlmXCIpO1xuICAgIH1cbiAgICB2YXIgaWZDb25kID0gY29kZUdlbkV4cHIoc3RtdC5pZk9wLmNvbmQsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgIHZhciBpZkJvZHkgPSBjb2RlR2VuQm9keShzdG10LmlmT3Auc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgIHZhciBlbGlmQ29uZCA9IFwiKGkzMi5jb25zdCAwKVwiO1xuICAgIHZhciBlbGlmQm9keSA9IFwibm9wXCI7XG4gICAgdmFyIGVsc2VCb2R5ID0gXCJub3BcIjtcbiAgICAvLyBoYXMgZWxzZSBpZlxuICAgIGlmIChzdG10LmVsaWZPcC5jb25kICE9PSBudWxsKSB7XG4gICAgICAgIGVsaWZDb25kID0gY29kZUdlbkV4cHIoc3RtdC5lbGlmT3AuY29uZCwgZ2xvYmFsRW52LCBsb2NhbEVudikuam9pbignXFxuJyk7XG4gICAgICAgIGVsaWZCb2R5ID0gY29kZUdlbkJvZHkoc3RtdC5lbGlmT3Auc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICBpZiAoc3RtdC5lbHNlT3Auc3RtdHMgIT09IG51bGwpIHtcbiAgICAgICAgZWxzZUJvZHkgPSBjb2RlR2VuQm9keShzdG10LmVsc2VPcC5zdG10cywgZ2xvYmFsRW52LCBsb2NhbEVudikuam9pbignXFxuJyk7XG4gICAgfVxuICAgIHJldHVybiBbXCJcIi5jb25jYXQoaWZDb25kLCBcIlxcbihpZlxcbih0aGVuXFxuXCIpLmNvbmNhdChpZkJvZHksIFwiXFxuKVxcbihlbHNlXFxuXCIpLmNvbmNhdChlbGlmQ29uZCwgXCJcXG4oaWZcXG4odGhlblxcblwiKS5jb25jYXQoZWxpZkJvZHksIFwiXFxuKVxcbihlbHNlXFxuXCIpLmNvbmNhdChlbHNlQm9keSwgXCJcXG4pKSkpXCIpXTtcbn1cbi8vIGdlbmVyYXRlIHRoZSBjb2RlcyBmb3Igc3RhdGVtZW50c1xuZnVuY3Rpb24gY29kZUdlbkJvZHkoc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICB2YXIgYm9keSA9IHN0bXRzLm1hcChmdW5jdGlvbiAocykge1xuICAgICAgICB2YXIgYiA9IGNvZGVHZW4ocywgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgIHJldHVybiBiLmpvaW4oJ1xcbicpO1xuICAgIH0pO1xuICAgIHJldHVybiBib2R5O1xufVxuZnVuY3Rpb24gY29kZUdlbldoaWxlKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICBpZiAoc3RtdC50YWcgIT09IFwid2hpbGVcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDT01QSUxFIEVSUk9SOiBjb2RlR2VuV2hpbGUgdGFrZXMgb25seSB3aGlsZSBzdGF0ZW1lbnQgYXMgaW5wdXRcIik7XG4gICAgfVxuICAgIC8vIHRocm93IG5ldyBFcnJvcihcIkNPTVBJTEUgRVJST1I6IHdoaWxlIGhhcyBub3QgYmVlbiBpbXBsZW1lbnRlZCB5ZXRcIik7XG4gICAgdmFyIGxvb3BJZCA9IChnbG9iYWxFbnYubG9vcERlcHRoKyspO1xuICAgIC8vIGNvbW1hbmQgYm9keVxuICAgIHZhciBib2R5ID0gY29kZUdlbkJvZHkoc3RtdC5zdG10cywgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgLy8gY29uZGl0aW9uIFxuICAgIHZhciBjb25kID0gY29kZUdlbkV4cHIoc3RtdC5jb25kLCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICBnbG9iYWxFbnYubG9vcERlcHRoLS07XG4gICAgcmV0dXJuIFtcIihsb29wIFxcblwiLmNvbmNhdChib2R5LmpvaW4oJ1xcbicpLCBcIlxcblwiKS5jb25jYXQoY29uZC5qb2luKCdcXG4nKSwgXCJcXG5icl9pZiBcIikuY29uY2F0KGxvb3BJZCwgXCIpXCIpXTtcbn1cbmZ1bmN0aW9uIGNvZGVHZW5GaWVsZChleHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9PSAnZ2V0ZmllbGQnKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiQ09NUElMRVIgRVJST1I6IFRoZSBpbnB1dCBleHByZXNzaW9uIHRvIGNvZGVHZW5DYWxsIHNob3VsZCBiZSBnZXRmaWVsZC5cIik7XG4gICAgfVxuICAgIGlmIChleHByLm9iai5hID09PSBcImludFwiIHx8IGV4cHIub2JqLmEgPT09IFwiYm9vbFwiIHx8IGV4cHIub2JqLmEgPT09IFwiTm9uZVwiKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiQ09NUElMRVIgRVJST1I6IFRoZSBvYmplY3Qgc2hvdWxkIGJlIGEgY2xhc3MuXCIpO1xuICAgIH1cbiAgICAvLyBJZiBpdCBpcyBhbiBpbnN0YW5jZSwgaXQgc2hvdWxkIHJldHVybiBpdHMgYWRkcmVzcywgZXguIChnbG9iYWwuZ2V0ICRyMSkuXG4gICAgdmFyIG9iakFkZHIgPSBjb2RlR2VuRXhwcihleHByLm9iaiwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgdmFyIGNoZWNrVmFsaWRBZGRyZXNzID0gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBvYmpBZGRyLCB0cnVlKSwgW1wiKGkzMi5jb25zdCAtNCkgXFxuKGkzMi5hZGQpXCIsIFwiKGkzMi5sb2FkKVwiLCBcImxvY2FsLnNldCAkbGFzdFwiXSwgZmFsc2UpOyAvLyBjIDogUmF0ID0gTm9uZSwgYy54XG4gICAgdmFyIGNsYXNzSW5kZXhlcyA9IGdsb2JhbEVudi5jbGFzc0luZGV4ZXMuZ2V0KGV4cHIub2JqLmEuY2xhc3MpO1xuICAgIHZhciBpbmRleE9mRmllbGQgPSBjbGFzc0luZGV4ZXMuZ2V0KGV4cHIubmFtZSk7XG4gICAgcmV0dXJuIF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShbY2hlY2tWYWxpZEFkZHJlc3Muam9pbihcIlxcblwiKV0sIG9iakFkZHIsIHRydWUpLCBbXCIoaTMyLmNvbnN0IFwiLmNvbmNhdChpbmRleE9mRmllbGQgKiA0LCBcIikgXFxuKGkzMi5hZGQpXCIpLCBcIihpMzIubG9hZClcIl0sIGZhbHNlKTtcbn1cbmZ1bmN0aW9uIGNvZGVHZW5DYWxsKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICBpZiAoZXhwci50YWcgIT09IFwiY2FsbFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNPTVBJTEVSIEVSUk9SOiBUaGUgaW5wdXQgZXhwcmVzc2lvbiB0byBjb2RlR2VuQ2FsbCBzaG91bGQgYmUgY2FsbC5cIik7XG4gICAgfVxuICAgIC8vIGFkZHJlc3MgdGhlIGNhc2Ugb2YgYW4gaW5pdCBjYWxsLCBleC4gcjEgPSBSYXQoKS5cbiAgICBpZiAoZ2xvYmFsRW52LmNsYXNzSW5pdHMuaGFzKGV4cHIubmFtZSkpIHtcbiAgICAgICAgLy8gdmFyaWFibGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICAgIHZhciBpbml0VmFsc18xID0gW107XG4gICAgICAgIHZhciBjbGFzc0luaXRzXzEgPSBnbG9iYWxFbnYuY2xhc3NJbml0cy5nZXQoZXhwci5uYW1lKTsgLy8gZ2V0IHRoZSBpbml0aWFsaXppbmcgdmFsdWVzIG9mIGEgY2xhc3NcbiAgICAgICAgdmFyIGNsYXNzSW5kZXhlcyA9IGdsb2JhbEVudi5jbGFzc0luZGV4ZXMuZ2V0KGV4cHIubmFtZSk7IC8vIGdldCB0aGUgZmllbGQgaW5kZXhlcyBvZiBhIGNsYXNzXG4gICAgICAgIGNsYXNzSW5kZXhlcy5mb3JFYWNoKGZ1bmN0aW9uIChpbmRleCwgZmllbGQpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBpbmRleCAqIDQ7XG4gICAgICAgICAgICBpbml0VmFsc18xID0gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBpbml0VmFsc18xLCB0cnVlKSwgW1xuICAgICAgICAgICAgICAgIFwiKGdsb2JhbC5nZXQgJGhlYXApXCIsXG4gICAgICAgICAgICAgICAgXCIoaTMyLmNvbnN0IFwiLmNvbmNhdChvZmZzZXQsIFwiKVwiKSxcbiAgICAgICAgICAgICAgICBcIihpMzIuYWRkKVwiLFxuICAgICAgICAgICAgICAgIGNvZGVHZW5MaXRlcmFsKGNsYXNzSW5pdHNfMS5nZXQoZmllbGQpKSxcbiAgICAgICAgICAgICAgICBcIihpMzIuc3RvcmUpXCJcbiAgICAgICAgICAgIF0sIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFdlIGhhdmUgdG8gbW9kaWZ5IHRoZSBhZGRyZXNzIG9mIHRoZSBoZWFwLCBzbyB0aGUgbmV4dCBjbGFzcyBjYW4gdXNlIGl0LlxuICAgICAgICBpbml0VmFsc18xID0gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBpbml0VmFsc18xLCB0cnVlKSwgW1xuICAgICAgICAgICAgXCIoZ2xvYmFsLmdldCAkaGVhcClcIixcbiAgICAgICAgICAgIFwiKGdsb2JhbC5nZXQgJGhlYXApXCIsXG4gICAgICAgICAgICBcIihpMzIuY29uc3QgXCIuY29uY2F0KGNsYXNzSW5kZXhlcy5zaXplICogNCwgXCIpXCIpLFxuICAgICAgICAgICAgXCIoaTMyLmFkZClcIixcbiAgICAgICAgICAgIFwiKGdsb2JhbC5zZXQgJGhlYXApXCIsXG4gICAgICAgIF0sIGZhbHNlKTtcbiAgICAgICAgdmFyIGluaXRGdW5jTmFtZSA9IFwiJCRcIi5jb25jYXQoZXhwci5uYW1lLCBcIiRfX2luaXRfXylcIik7XG4gICAgICAgIGlmIChnbG9iYWxFbnYuZnVuY3MuaGFzKGluaXRGdW5jTmFtZSkpIHtcbiAgICAgICAgICAgIGluaXRWYWxzXzEucHVzaChcIihjYWxsICQkXCIuY29uY2F0KGV4cHIubmFtZSwgXCIkX19pbml0X18pXCIpKTsgLy8gZXhlY3V0ZSB0aGUgX19pbml0X18gb3BlcmF0aW9uc1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbml0VmFsc18xO1xuICAgIH1cbiAgICB2YXIgY29kZXMgPSBbXTtcbiAgICAvLyBjb2xsZWN0IGFyZ3VtZW50c1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGV4cHIuYXJncy5sZW5ndGg7ICsraWR4KSB7XG4gICAgICAgIHZhciBhcmcgPSBleHByLmFyZ3NbaWR4XTtcbiAgICAgICAgY29kZXMgPSBfX3NwcmVhZEFycmF5KF9fc3ByZWFkQXJyYXkoW10sIGNvZGVzLCB0cnVlKSwgY29kZUdlbkV4cHIoYXJnLCBnbG9iYWxFbnYsIGxvY2FsRW52KSwgdHJ1ZSk7XG4gICAgfVxuICAgIC8vIGNhbGwgdGhlIGZ1bmN0aW9uXG4gICAgaWYgKGV4cHIubmFtZSA9PT0gJ3ByaW50Jykge1xuICAgICAgICBpZiAoZXhwci5hcmdzWzBdLmEgIT09IFwiaW50XCIgJiYgZXhwci5hcmdzWzBdLmEgIT09IFwiYm9vbFwiICYmIGV4cHIuYXJnc1swXS5hICE9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRwcmludF9udW0pXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3dpdGNoIChleHByLmFyZ3NbMF0uYSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJpbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRwcmludF9udW0pXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiYm9vbFwiOlxuICAgICAgICAgICAgICAgICAgICBjb2Rlcy5wdXNoKFwiKGNhbGwgJHByaW50X2Jvb2wpXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiTm9uZVwiOlxuICAgICAgICAgICAgICAgICAgICBjb2Rlcy5wdXNoKFwiKGNhbGwgJHByaW50X25vbmUpXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY29kZSBjYW4gc3RpbGwgY29tcGlsZSBpZiBpdCdzIGEgY2xhc3MsIGFuZCBhbiBlcnJvciB3aWxsIG9jY3VyIGF0IHJ1bnRpbWUuXG4gICAgICAgICAgICAgICAgICAgIGNvZGVzLnB1c2goXCIoY2FsbCAkcHJpbnRfbnVtKVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRcIi5jb25jYXQoZXhwci5uYW1lLCBcIilcIikpO1xuICAgIH1cbiAgICByZXR1cm4gY29kZXM7XG59XG5mdW5jdGlvbiBjb2RlR2VuR2xvYmFsVmFyKHZhckluaXRzKSB7XG4gICAgdmFyIHZhckluaXRXYXNtID0gdmFySW5pdHMubWFwKGZ1bmN0aW9uICh2YXJJbml0KSB7XG4gICAgICAgIHJldHVybiBcIihnbG9iYWwgJFwiLmNvbmNhdCh2YXJJbml0Lm5hbWUsIFwiIChtdXQgaTMyKSBcIikuY29uY2F0KGNvZGVHZW5MaXRlcmFsKHZhckluaXQuaW5pdExpdGVyYWwpLCBcIilcIik7XG4gICAgfSk7XG4gICAgdmFySW5pdFdhc20ucHVzaChcIihnbG9iYWwgJGhlYXAgKG11dCBpMzIpIChpMzIuY29uc3QgNCkpXFxuXCIpOyAvLyBpbml0aWFsaXplIHRoZSBoZWFwIGZvciBjbGFzc2VzXG4gICAgcmV0dXJuIHZhckluaXRXYXNtO1xufVxuLypcbmRlZiBnZXRfZmllbGRfYShzZWxmIDogUmF0KTpcbiAgcmV0dXJuIHNlbGYuYVxuKi9cbmZ1bmN0aW9uIGNvZGVHZW5DbGFzc0RlZihjbGFzc0RlZiwgZ2xvYmFsRW52KSB7XG4gICAgaWYgKGNsYXNzRGVmLnRhZyAhPT0gXCJjbGFzc1wiKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuIG9ubHkgZ2VuZXJhdGUgY29kZXMgZm9yIGNsYXNzZXNcIik7XG4gICAgfVxuICAgIHZhciBjbGFzc1dhc20gPSBbXTtcbiAgICAvLyBhZGQgYWxsIHRoZSBmaWVsZHMgZnVuY3Rpb25zIChzaW1wbHkgcmV0dXJuIHRoZSB2YWx1ZSlcbiAgICBjbGFzc0RlZi5maWVsZHMuZm9yRWFjaChmdW5jdGlvbiAoZikge1xuICAgICAgICAvLyBUbyByZXR1cm4gc2VsZi5hLCB3ZSBuZWVkIHRoZSBhZGRyZXNzIG9mIHNlbGYsIGFuZCB0aGUgaW5kZXggb2YgYS5cbiAgICAgICAgdmFyIHBhcmFtcyA9IFt7XG4gICAgICAgICAgICAgICAgYToge1xuICAgICAgICAgICAgICAgICAgICB0YWc6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBjbGFzc0RlZi5uYW1lXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBuYW1lOiBcInNlbGZcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBjbGFzc0RlZi5hXG4gICAgICAgICAgICB9XTsgLy8gZXguIHNlbGYgOiBSYXRcbiAgICAgICAgdmFyIHZhckluaXRzID0gW107IC8vIG5vIHZhcmlhYmxlIGluaXRpYWxpemF0aW9uc1xuICAgICAgICB2YXIgZ2V0ZmllbGRPYmogPSB7XG4gICAgICAgICAgICBhOiB7XG4gICAgICAgICAgICAgICAgdGFnOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIGNsYXNzOiBjbGFzc0RlZi5uYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGFnOiBcImlkXCIsXG4gICAgICAgICAgICBuYW1lOiBcInNlbGZcIlxuICAgICAgICB9OyAvLyBleC4gcjFcbiAgICAgICAgdmFyIGdldGZpZWxkRXhwciA9IHsgYTogZi5hLCB0YWc6IFwiZ2V0ZmllbGRcIiwgb2JqOiBnZXRmaWVsZE9iaiwgbmFtZTogZi5uYW1lIH07XG4gICAgICAgIHZhciBzdG10cyA9IFt7IGE6IFwiTm9uZVwiLCB0YWc6IFwicmV0dXJuXCIsIGV4cHI6IGdldGZpZWxkRXhwciB9XTtcbiAgICAgICAgdmFyIGZ1bmNEZWYgPSB7XG4gICAgICAgICAgICBuYW1lOiBcIiRcIi5jb25jYXQoY2xhc3NEZWYubmFtZSwgXCIkZ2V0X2ZpZWxkX1wiKS5jb25jYXQoZi5uYW1lKSxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgcmV0VHlwZTogZi5hLFxuICAgICAgICAgICAgdmFySW5pdHM6IHZhckluaXRzLFxuICAgICAgICAgICAgc3RtdHM6IHN0bXRzXG4gICAgICAgIH07XG4gICAgICAgIGNvZGVHZW5GdW5jRGVmKGZ1bmNEZWYsIGdsb2JhbEVudikuZm9yRWFjaChmdW5jdGlvbiAoZnVuY1dhc20pIHtcbiAgICAgICAgICAgIGNsYXNzV2FzbS5wdXNoKGZ1bmNXYXNtKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgLy8gYWRkIGFsbCB0aGUgbWV0aG9kIGZ1bmN0aW9uc1xuICAgIGNsYXNzRGVmLm1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobSkge1xuICAgICAgICB2YXIgZnVuY0RlZiA9IF9fYXNzaWduKF9fYXNzaWduKHt9LCBtKSwgeyBuYW1lOiBcIiRcIi5jb25jYXQoY2xhc3NEZWYubmFtZSwgXCIkXCIpLmNvbmNhdChtLm5hbWUpIH0pOyAvLyBBbm90aGVyIFwiJFwiIHdvdWxkIGJlIGFkZGVkIGxhdGVyLlxuICAgICAgICAvLyBhZGQgYSByZXR1cm4gc3RhdGVtZW50IHRvIHRoZSBpbml0IGZ1bmN0aW9uXG4gICAgICAgIGlmIChtLm5hbWUgPT0gXCJfX2luaXRfX1wiKSB7XG4gICAgICAgICAgICBmdW5jRGVmLnN0bXRzLnB1c2goe1xuICAgICAgICAgICAgICAgIGE6IFwiTm9uZVwiLFxuICAgICAgICAgICAgICAgIHRhZzogXCJyZXR1cm5cIixcbiAgICAgICAgICAgICAgICBleHByOiB7XG4gICAgICAgICAgICAgICAgICAgIGE6IHsgdGFnOiBcIm9iamVjdFwiLCBjbGFzczogY2xhc3NEZWYubmFtZSB9LFxuICAgICAgICAgICAgICAgICAgICB0YWc6IFwiaWRcIixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJzZWxmXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSByZW1vdmUgXCJzZWxmXCIgaW4gdGhlIHBhcnNlciBhbmQgYWRkIGl0IGJhY2sgaGVyZS5cbiAgICAgICAgZnVuY0RlZi5wYXJhbXMgPSBfX3NwcmVhZEFycmF5KFt7XG4gICAgICAgICAgICAgICAgYToge1xuICAgICAgICAgICAgICAgICAgICB0YWc6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBjbGFzc0RlZi5uYW1lXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBuYW1lOiBcInNlbGZcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBjbGFzc0RlZi5hXG4gICAgICAgICAgICB9XSwgZnVuY0RlZi5wYXJhbXMsIHRydWUpO1xuICAgICAgICAvLyBmdW5jRGVmLnBhcmFtcy5wdXNoKHsgXG4gICAgICAgIC8vICAgYTogeyBcbiAgICAgICAgLy8gICAgIHRhZzogXCJvYmplY3RcIiwgXG4gICAgICAgIC8vICAgICBjbGFzczogY2xhc3NEZWYubmFtZSBcbiAgICAgICAgLy8gICB9LCBcbiAgICAgICAgLy8gICBuYW1lOiBcInNlbGZcIiwgXG4gICAgICAgIC8vICAgdHlwZTogY2xhc3NEZWYuYSBcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIGNvZGVHZW5GdW5jRGVmKGZ1bmNEZWYsIGdsb2JhbEVudikuZm9yRWFjaChmdW5jdGlvbiAoZnVuY1dhc20pIHtcbiAgICAgICAgICAgIGNsYXNzV2FzbS5wdXNoKGZ1bmNXYXNtKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsYXNzV2FzbS5qb2luKFwiXFxuXCIpO1xufVxuZnVuY3Rpb24gY29kZUdlbkZ1bmNEZWYoZnVuY0RlZiwgZ2xvYmFsRW52KSB7XG4gICAgLy8gcHJlcGFyZSB0aGUgbG9jYWwgZW52aXJvbm1lbnRcbiAgICB2YXIgbG9jYWxFbnYgPSBjcmVhdGVFbXB0eUxvY2FsRW52KCk7XG4gICAgbG9jYWxFbnYuaXNGdW5jID0gdHJ1ZTtcbiAgICBmdW5jRGVmLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHtcbiAgICAgICAgbG9jYWxFbnYudmFycy5zZXQocC5uYW1lLCB0cnVlKTtcbiAgICB9KTtcbiAgICBmdW5jRGVmLnZhckluaXRzLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICBsb2NhbEVudi52YXJzLnNldCh2Lm5hbWUsIHRydWUpO1xuICAgIH0pO1xuICAgIC8vIHBhcmFtc1xuICAgIHZhciBwYXJhbXMgPSBmdW5jRGVmLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHtcbiAgICAgICAgcmV0dXJuIFwiKHBhcmFtICRcIi5jb25jYXQocC5uYW1lLCBcIiBpMzIpXCIpO1xuICAgIH0pLmpvaW4oJyAnKTtcbiAgICAvLyBpbml0IGxvY2FsIHZhcmlhYmxlc1xuICAgIHZhciBsb2NhbFZhckluaXQgPSBmdW5jRGVmLnZhckluaXRzLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICByZXR1cm4gXCIobG9jYWwgJFwiLmNvbmNhdCh2Lm5hbWUsIFwiIGkzMilcXG4obG9jYWwuc2V0ICRcIikuY29uY2F0KHYubmFtZSwgXCIgXCIpLmNvbmNhdChjb2RlR2VuTGl0ZXJhbCh2LmluaXRMaXRlcmFsKSwgXCIpXCIpO1xuICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgIC8vIGdlbmVyYXRlIGJvZHkgc3RhdGVtZW50c1xuICAgIHZhciBib2R5ID0gY29kZUdlbkJvZHkoZnVuY0RlZi5zdG10cywgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgLy8gcmV0dXJuIHRnZSBmdW5jdGlvbiBkZWZpbml0aW9uIGluIFdBU01cbiAgICAvLyByZXR1cm4gW2BcXG4oZnVuYyAkJHtmdW5jRGVmLm5hbWV9ICR7cGFyYW1zfSAocmVzdWx0IGkzMikgJHtsb2NhbFZhckluaXR9XFxuJHtib2R5LmpvaW4oJ1xcbicpfSlgXVxuICAgIC8vIHJldHVybiBbYChmdW5jICQke2Z1bmNEZWYubmFtZX0gJHtwYXJhbXN9IChyZXN1bHQgaTMyKVxcbihsb2NhbCAkbGFzdCBpMzIpXFxuJHtsb2NhbFZhckluaXR9XFxuJHtib2R5LmpvaW4oJ1xcbicpfVxcbihpMzIuY29uc3QgMCkpYF1cbiAgICByZXR1cm4gW1wiKGZ1bmMgJFwiLmNvbmNhdChmdW5jRGVmLm5hbWUsIFwiIFwiKS5jb25jYXQocGFyYW1zLCBcIiAocmVzdWx0IGkzMilcXG4obG9jYWwgJGxhc3QgaTMyKVwiKS5jb25jYXQobG9jYWxWYXJJbml0LCBcIlxcblwiKS5jb25jYXQoYm9keS5qb2luKCdcXG4nKSwgXCJcXG4oaTMyLmNvbnN0IDApKVxcblwiKV07XG59XG5mdW5jdGlvbiBjb2RlR2VuTGl0ZXJhbChsaXRlcmFsKSB7XG4gICAgc3dpdGNoIChsaXRlcmFsLnRhZykge1xuICAgICAgICBjYXNlIFwibnVtXCI6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IFwiLmNvbmNhdChsaXRlcmFsLnZhbHVlLCBcIilcIik7XG4gICAgICAgIGNhc2UgXCJib29sXCI6XG4gICAgICAgICAgICBpZiAobGl0ZXJhbC52YWx1ZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IDEpXCI7XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IDApXCI7XG4gICAgICAgIGNhc2UgXCJub25lXCI6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IDApXCI7XG4gICAgfVxufVxuLy8gc2hvdWxkIHVzZSBsb2NhbCBlbnZpcm9ubWVudCBpbnN0ZWFkIG9mIGdsb2JhbCBlbnZpcm9ubWVudFxuZnVuY3Rpb24gY29kZUdlbklkKGlkLCBHbG9jYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKGlkLnRhZyAhPT0gJ2lkJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDT01QSUxFIEVSUk9SOiBpbnB1dCB0byBjb2RlR2VuIElkIHNob3VsZCBiZSBhbiBpZCBleHByXCIpO1xuICAgIH1cbiAgICAvLyBUaGUgdHlwZSBjaGVja2VyIGhhcyBhbHJlYWR5IG1ha2Ugc3VyZSB0aGUgdmFyaWFibGUgaXMgZGVmaW5lZC5cbiAgICBpZiAobG9jYWxFbnYudmFycy5oYXMoaWQubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIFwiKGxvY2FsLmdldCAkXCIuY29uY2F0KGlkLm5hbWUsIFwiKVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIFwiKGdsb2JhbC5nZXQgJFwiLmNvbmNhdChpZC5uYW1lLCBcIilcIik7XG59XG4iLCJpbXBvcnQgeyBwYXJzZXIgfSBmcm9tIFwibGV6ZXItcHl0aG9uXCI7XG5pbXBvcnQgeyBCaW5PcCwgVW5pT3AgfSBmcm9tICcuL2FzdCc7XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VBcmdzKGMsIHMpIHtcbiAgICB2YXIgYXJncyA9IFtdO1xuICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgIHdoaWxlIChjLm5leHRTaWJsaW5nKCkpIHtcbiAgICAgICAgaWYgKGMudHlwZS5uYW1lID09PSAnKScpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MucHVzaCh0cmF2ZXJzZUV4cHIoYywgcykpO1xuICAgICAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgfVxuICAgIGMucGFyZW50KCk7XG4gICAgcmV0dXJuIGFyZ3M7XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VFeHByKGMsIHMpIHtcbiAgICBzd2l0Y2ggKGMudHlwZS5uYW1lKSB7XG4gICAgICAgIGNhc2UgXCJOdW1iZXJcIjogLy8gZWcuICcxJ1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0YWc6IFwibGl0ZXJhbFwiLFxuICAgICAgICAgICAgICAgIGxpdGVyYWw6IHtcbiAgICAgICAgICAgICAgICAgICAgdGFnOiBcIm51bVwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogTnVtYmVyKHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgY2FzZSAnQm9vbGVhbic6XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRhZzogXCJsaXRlcmFsXCIsXG4gICAgICAgICAgICAgICAgbGl0ZXJhbDoge1xuICAgICAgICAgICAgICAgICAgICB0YWc6IFwiYm9vbFwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gXCJUcnVlXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICBjYXNlIFwiTm9uZVwiOlxuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImxpdGVyYWxcIiwgbGl0ZXJhbDogeyB0YWc6IFwibm9uZVwiIH0gfTtcbiAgICAgICAgY2FzZSBcIlZhcmlhYmxlTmFtZVwiOiAvLyBlLmcuICd4J1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImlkXCIsIG5hbWU6IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykgfTtcbiAgICAgICAgY2FzZSBcInNlbGZcIjogLy8gbm90IHN1cmUgaWYgdGhpcyBzaG91bGQgYmUgaGFuZGxlZCBsaWtlIHRoaXNcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJpZFwiLCBuYW1lOiBcInNlbGZcIiB9O1xuICAgICAgICBjYXNlIFwiQ2FsbEV4cHJlc3Npb25cIjogLy8gZS5nLiBtYXgoeCwgeSksIGFicyh4KSwgZigpXG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCJNZW1iZXJFeHByZXNzaW9uXCIgb3IgXCJWYXJpYWJsZU5hbWVcIlxuICAgICAgICAgICAgaWYgKGMubmFtZSA9PT0gXCJNZW1iZXJFeHByZXNzaW9uXCIpIHtcbiAgICAgICAgICAgICAgICBjLmxhc3RDaGlsZCgpOyAvLyBcIlByb3BlcnR5TmFtZVwiXG4gICAgICAgICAgICAgICAgdmFyIHBOYW1lXzEgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pO1xuICAgICAgICAgICAgICAgIGMucGFyZW50KCk7IC8vIGdldCBiYWNrIHRvIFwiTWVtYmVyRXhwcmVzc2lvblwiXG4gICAgICAgICAgICAgICAgdmFyIG9ial8xID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgICAgICAgICAgICAgIGlmIChvYmpfMS50YWcgIT09IFwiZ2V0ZmllbGRcIikgeyAvLyBWaXNpdGluZyBNZW1iZXJFeHByZXNzaW9uIHNob3VsZCBhbHdheXMgZ2V0cyBhIGdldGZpZWxkIHJldHVybi5cbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJUaGUgb2JqZWN0IGhhcyBhbiBpbmNvcnJlY3QgdGFnLlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYy5uZXh0U2libGluZygpOyAvLyBcIkFyZ0xpc3RcIlxuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gdHJhdmVyc2VBcmdzKGMsIHMpO1xuICAgICAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgLy8gV2UgcmV0dXJuIG9iai5vYmogYmVjYXVzZSB0aGUgb2JqIGlzIGFjdHVhbGx5IG5vdCBhIGdldGZpZWxkLlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJtZXRob2RcIiwgb2JqOiBvYmpfMS5vYmosIGFyZ3M6IGFyZ3MsIG5hbWU6IHBOYW1lXzEgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFwiVmFyaWFibGVOYW1lXCJcbiAgICAgICAgICAgICAgICB2YXIgY2FsbE5hbWUgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pO1xuICAgICAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJBcmdMaXN0XCJcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHRyYXZlcnNlQXJncyhjLCBzKTtcbiAgICAgICAgICAgICAgICBjLnBhcmVudCgpOyAvLyBiYWNrIHRvIFwiQ2FsbEV4cHJlc3Npb25cIlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJjYWxsXCIsIG5hbWU6IGNhbGxOYW1lLCBhcmdzOiBhcmdzIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJVbmFyeUV4cHJlc3Npb25cIjpcbiAgICAgICAgICAgIC8vIFdBUk5JTkc6IFRoaXMgdW5pYXJ5IGV4cHJlc3Npb24gb25seSBkZWFscyB3aXRoIHVuaWFyeSBvcGVyYXRvciBkaXJlY3RseSBmb2xsb3dlZCBieSBhIG51bWJlciBcbiAgICAgICAgICAgIC8vIGUuZy4gLXgsIC0gKDEgKyAyKVxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7IC8vIGdvIGludG8gdGhlIHVuYXJ5IGV4cHJlc3NvaW5cbiAgICAgICAgICAgIHZhciB1bmlPcCA9IHN0cjJ1bmlvcChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICAgICAgICAgIC8vIHBvcCB1bmlhcnkgZXhwcmVzc2lvblxuICAgICAgICAgICAgdmFyIG51bSA9IE51bWJlcihzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHZhciB1bmlvbkV4cHIgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcInVuaW9wXCIsIG9wOiB1bmlPcCwgZXhwcjogdW5pb25FeHByIH07XG4gICAgICAgIGNhc2UgXCJCaW5hcnlFeHByZXNzaW9uXCI6IC8vIGUuZy4gMSArIDJcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBnbyBpbnRvIGJpbmFyeSBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgbGVmdCA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHZhciBvcCA9IHN0cjJiaW5vcChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHZhciByaWdodCA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMucGFyZW50KCk7IC8vIHBvcCB0aGUgYmluYXJ5XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiYmlub3BcIiwgb3A6IG9wLCBsZWZ0OiBsZWZ0LCByaWdodDogcmlnaHQgfTtcbiAgICAgICAgY2FzZSBcIk1lbWJlckV4cHJlc3Npb25cIjogLy8gZXguIHIyLm5cbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBcIkNhbGxFeHByZXNzaW9uXCIgb3IgXCJWYXJpYWJsZU5hbWVcIlxuICAgICAgICAgICAgdmFyIG9iaiA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCIuXCJcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJQcm9wZXJ0eU5hbWVcIlxuICAgICAgICAgICAgdmFyIHBOYW1lID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiZ2V0ZmllbGRcIiwgb2JqOiBvYmosIG5hbWU6IHBOYW1lIH07XG4gICAgICAgIGNhc2UgXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiOlxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7IC8vIHZpc2l0IFwiKFwiXG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHZpc2l0IHRoZSBpbm5lciBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgZXhwciA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMucGFyZW50O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzdHJpbmdpZnlUcmVlKGMsIHMsIDIpKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiBDb3VsZCBub3QgcGFyc2UgZXhwciBhdCBcIiArIGMuZnJvbSArIFwiIFwiICsgYy50byArIFwiOiBcIiArIHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykpO1xuICAgIH1cbn1cbi8qXG4gKiBBIGZ1bmN0aW9uIHRvIHBhcnNlIG9uZSBzdGF0ZW1lbnRcbiAqIEBpbnB1dCBjOiBhIHRyZWVjb3Jzb3JcbiAqIEBpbnB1dCBzOiB0aGUgb3JpZ2luYWwgaW5wdXQgc3RyaW5nXG4gKiBAaW5wdXQgZW52OiBlbnZpcm9ubWVudCB2YXJpYWJsZXMgKGlmIHdlIGFyZSBnb2luZyB0byB0cmF2ZXJzZSBhIGZ1bmMsKVxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VTdG10KGMsIHMpIHtcbiAgICBzd2l0Y2ggKGMubm9kZS50eXBlLm5hbWUpIHtcbiAgICAgICAgY2FzZSBcIkFzc2lnblN0YXRlbWVudFwiOiAvLyBhID0gMSwgYiA9IDIgb3IgdmFyIEluaXRcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBcIlZhcmlhYmxlTmFtZVwiIG9yIFwiTWVtYmVyRXhwcmVzc2lvblwiXG4gICAgICAgICAgICAvLyBnZXQgbGhzIGV4cHJlc3Npb25cbiAgICAgICAgICAgIHZhciBuYW1lID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgICAgICAgICAgdmFyIHZhcmlhYmxlID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICAgICAgICAgIHZhcmlhYmxlID0gdmFyaWFibGUuc3BsaXQoXCIuXCIpWzBdOyAvLyBUaGlzIG9ubHkgdGVsbHMgdGhlIGluaXRpYWwgdmFyaWFibGUgPT4gc2VsZi55IGFzIHNlbGZcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJBc3NpZ25PcFwiXG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHJocyBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImFzc2lnblwiLCBuYW1lOiBuYW1lLCB2YXJpYWJsZTogdmFyaWFibGUsIHZhbHVlOiB2YWx1ZSB9O1xuICAgICAgICBjYXNlIFwiRXhwcmVzc2lvblN0YXRlbWVudFwiOlxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgICAgICB2YXIgZXhwciA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiZXhwclwiLCBleHByOiBleHByIH07XG4gICAgICAgIGNhc2UgXCJSZXR1cm5TdGF0ZW1lbnRcIjpcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgICAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICAgICAgdmFyIHJldEV4cHIgPSB7IHRhZzogXCJsaXRlcmFsXCIsIGxpdGVyYWw6IHsgdGFnOiBcIm5vbmVcIiB9IH07XG4gICAgICAgICAgICBpZiAoYy50eXBlLm5hbWUgIT09ICfimqAnKSB7IC8vIHJldHVybiBOb25lXG4gICAgICAgICAgICAgICAgcmV0RXhwciA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwicmV0dXJuXCIsIGV4cHI6IHJldEV4cHIgfTtcbiAgICAgICAgY2FzZSBcIlBhc3NTdGF0ZW1lbnRcIjpcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJwYXNzXCIgfTtcbiAgICAgICAgY2FzZSBcIklmU3RhdGVtZW50XCI6XG4gICAgICAgICAgICByZXR1cm4gdHJhdmVyc2VJZihjLCBzKTtcbiAgICAgICAgY2FzZSBcIldoaWxlU3RhdGVtZW50XCI6XG4gICAgICAgICAgICByZXR1cm4gdHJhdmVyc2VXaGlsZShjLCBzKTtcbiAgICAgICAgY2FzZSBcIkNsYXNzRGVmaW5pdGlvblwiOlxuICAgICAgICAgICAgcmV0dXJuIHRyYXZlcnNlQ2xhc3NEZWYoYywgcyk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcGFyc2Ugc3RtdCBhdCBcIiArIGMubm9kZS5mcm9tICsgXCIgXCIgKyBjLm5vZGUudG8gKyBcIjogXCIgKyBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VQcm9ncmFtKGMsIHMpIHtcbiAgICB2YXIgdmFySW5pdHMgPSBbXTtcbiAgICB2YXIgY2xhc3NEZWZzID0gW107XG4gICAgdmFyIGZ1bmNEZWZzID0gW107IC8vIG5vIEZ1bmNEZWYgZm9yIFBBM1xuICAgIHZhciBzdG10cyA9IFtdOyAvLyBjbGFzcyBkZWZpbml0aW9ucyBhcmUgaW5jbHVkZWQgaGVyZVxuICAgIHN3aXRjaCAoYy5ub2RlLnR5cGUubmFtZSkge1xuICAgICAgICBjYXNlIFwiU2NyaXB0XCI6XG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICAgICAgICAgIC8vIHBhcnNlIGNsYXNzIGRlZmluaXRpb25zIGFuZCB2YXJpYWJsZSBpbml0aWFsaXphdGlvbnNcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNWYXJJbml0KGMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhckluaXRzLnB1c2godHJhdmVyc2VWYXJJbml0KGMsIHMpKTsgLy8gcGFyc2UgdmFyaWFibGUgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaXNGdW5jRGVmKGMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmNEZWZzLnB1c2godHJhdmVyc2VGdW5jRGVmKGMsIHMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaXNDbGFzc0RlZihjKSkge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc0RlZnMucHVzaCh0cmF2ZXJzZUNsYXNzRGVmKGMsIHMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgICAgICAgICBpZiAoaXNWYXJJbml0KGMpIHx8IGlzRnVuY0RlZihjKSB8fCBpc0NsYXNzRGVmKGMpKSB7IC8vIG5vIG5leHQgc2libGluZyAmJiBubyBzdG10c1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhckluaXRzOiB2YXJJbml0cywgY2xhc3NEZWZzOiBjbGFzc0RlZnMsIGZ1bmNEZWZzOiBmdW5jRGVmcywgc3RtdHM6IHN0bXRzIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBwYXJzZSBzdGF0ZW1lbnRzXG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFySW5pdChjKSB8fCBpc0Z1bmNEZWYoYykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0UgRVJST1I6IHZhciBpbml0IGFuZCBmdW5jIGRlZiBzaG91bGQgZ28gYmVmb3JlIHN0YXRlbWVudHNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICAgICAgICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgICAgICAgICByZXR1cm4geyB2YXJJbml0czogdmFySW5pdHMsIGNsYXNzRGVmczogY2xhc3NEZWZzLCBmdW5jRGVmczogZnVuY0RlZnMsIHN0bXRzOiBzdG10cyB9O1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IHBhcnNlIHByb2dyYW0gYXQgXCIgKyBjLm5vZGUuZnJvbSArIFwiIFwiICsgYy5ub2RlLnRvKTtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc291cmNlKSB7XG4gICAgdmFyIHQgPSBwYXJzZXIucGFyc2Uoc291cmNlKTtcbiAgICAvLyBjb25zb2xlLmxvZyhcIlBhcnNlZCBTb3VyY2UgQ29kZTpcIik7XG4gICAgLy8gY29uc29sZS5sb2coc3RyaW5naWZ5VHJlZSh0LmN1cnNvcigpLCBzb3VyY2UsIDApKTtcbiAgICAvLyBjb25zb2xlLmxvZyhcIlxcblwiKTtcbiAgICByZXR1cm4gdHJhdmVyc2VQcm9ncmFtKHQuY3Vyc29yKCksIHNvdXJjZSk7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jRGVmKGMpIHtcbiAgICByZXR1cm4gYy50eXBlLm5hbWUgPT09ICdGdW5jdGlvbkRlZmluaXRpb24nO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2xhc3NEZWYoYykge1xuICAgIHJldHVybiBjLnR5cGUubmFtZSA9PT0gJ0NsYXNzRGVmaW5pdGlvbic7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNWYXJJbml0KGMpIHtcbiAgICBpZiAoYy50eXBlLm5hbWUgIT09ICdBc3NpZ25TdGF0ZW1lbnQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYy5maXJzdENoaWxkKCk7XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIHZhciBpc1R5cGVEZWYgPSAoYy5ub2RlLnR5cGUubmFtZSA9PT0gJ1R5cGVEZWYnKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiBpc1R5cGVEZWY7XG59XG4vLyBjIGlzIG5vdyBpbiBBc3NpZ25TdGF0ZW1lbnRcbmV4cG9ydCBmdW5jdGlvbiB0cmF2ZXJzZVZhckluaXQoYywgcykge1xuICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBWYXJpYWJsZU5hbWVcbiAgICB2YXIgdFZhciA9IHRyYXZlcnNlVHlwZWRWYXIoYywgcyk7XG4gICAgYy5uZXh0U2libGluZygpOyAvLyBUeXBlRGVmXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBBc3NpZ25PcFxuICAgIHZhciBsaXRlcmFsID0gdHJhdmVyc2VMaXRlcmFsKGMsIHMpOyAvLyBOdW1iZXJcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiB7IG5hbWU6IHRWYXIubmFtZSwgdHlwZTogdFZhci50eXBlLCBpbml0TGl0ZXJhbDogbGl0ZXJhbCB9O1xufVxuLy8gVGhlcmUgd291bGQgYmUgbXVjaCBtb3JlIHR5cGVzIChjbGFzc2VzKS5cbmV4cG9ydCBmdW5jdGlvbiBub2RlMnR5cGUoYywgcykge1xuICAgIHZhciB0eXBlU3RyID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICBzd2l0Y2ggKHR5cGVTdHIpIHtcbiAgICAgICAgY2FzZSAnaW50JzpcbiAgICAgICAgICAgIHJldHVybiBcImludFwiO1xuICAgICAgICBjYXNlICdib29sJzpcbiAgICAgICAgICAgIHJldHVybiBcImJvb2xcIjtcbiAgICAgICAgY2FzZSAnTm9uZSc6XG4gICAgICAgICAgICByZXR1cm4gXCJOb25lXCI7XG4gICAgICAgIGRlZmF1bHQ6IC8vIFdlJ2xsIGNoZWNrIGlmIHRoZSB0eXBlIGV4aXN0cyBpbiB0aGUgdHlwZSBjaGVja2VyXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRhZzogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBjbGFzczogdHlwZVN0clxuICAgICAgICAgICAgfTtcbiAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKGBQQVJTRSBFUlJPUjogdW5rbm93biB0eXBlICR7dHlwZVN0cn1gKTtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VUeXBlZFZhcihjLCBzKSB7XG4gICAgdmFyIG5hbWUgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pOyAvLyBcIlZhcmlhYmxlTmFtZVwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBUeXBlRGVmXG4gICAgYy5maXJzdENoaWxkKCk7IC8vIDpcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFZhcmlhYmxlTmFtZVxuICAgIHZhciB0eXBlID0gbm9kZTJ0eXBlKGMsIHMpO1xuICAgIGMucGFyZW50KCk7XG4gICAgcmV0dXJuIHsgbmFtZTogbmFtZSwgdHlwZTogdHlwZSB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlTGl0ZXJhbChjLCBzKSB7XG4gICAgdmFyIHZhbFN0ciA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgc3dpdGNoIChjLnR5cGUubmFtZSkge1xuICAgICAgICBjYXNlICdCb29sZWFuJzpcbiAgICAgICAgICAgIGlmICh2YWxTdHIgPT0gJ0ZhbHNlJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJib29sXCIsIHZhbHVlOiBmYWxzZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImJvb2xcIiwgdmFsdWU6IHRydWUgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgY2FzZSAnTnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJudW1cIiwgdmFsdWU6IHBhcnNlSW50KHZhbFN0cikgfTtcbiAgICAgICAgY2FzZSAnTm9uZSc6XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwibm9uZVwiIH07XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiB1bnN1cHBvcnRpbmcgbGl0ZXJhbCB0eXBlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlQ2xhc3NEZWYoYywgcykge1xuICAgIHZhciBjbHMgPSB7XG4gICAgICAgIHRhZzogXCJjbGFzc1wiLFxuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgICBmaWVsZHM6IFtdLFxuICAgICAgICBtZXRob2RzOiBbXSwgLy8gY2xhc3MgZnVuY3Rpb25zXG4gICAgfTtcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gY2xhc3Mgbm9kZVxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gY2xhc3MgbmFtZVxuICAgIGNscy5uYW1lID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTsgLy8gYXNzaWduIGNsYXNzIG5hbWVcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiQXJnbGlzdFwiID0+IGZpeGVkIHRvIGJlIG9iamVjdFxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJCb2R5XCJcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCI6XCJcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHJlYWNoIHRoZSBmaXNydCBzdGF0ZW1lbnQgaW4gdGhlIGJvZHlcbiAgICB2YXIgY29kZSA9IHRyYXZlcnNlQ2xhc3NCb2R5KGMsIHMpO1xuICAgIGNscy5maWVsZHMgPSBjb2RlLnZhckluaXRzO1xuICAgIGNscy5tZXRob2RzID0gY29kZS5mdW5jRGVmcztcbiAgICBjLnBhcmVudCgpOyAvLyBiYWNrIHRvIFwiQm9keVwiXG4gICAgYy5wYXJlbnQoKTsgLy8gYmFjayB0byBcIkNsYXNzRGVmaW5pdGlvblwiXG4gICAgcmV0dXJuIGNscztcbn1cbmV4cG9ydCBmdW5jdGlvbiB0cmF2ZXJzZU1ldGhEZWYoYywgcykge1xuICAgIHZhciBmdW5jID0ge1xuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgICBwYXJhbXM6IG51bGwsXG4gICAgICAgIHJldFR5cGU6IFwiTm9uZVwiLFxuICAgICAgICB2YXJJbml0czogbnVsbCxcbiAgICAgICAgc3RtdHM6IG51bGxcbiAgICB9O1xuICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBcImRlZlwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBtZXRob2QgbmFtZVxuICAgIGZ1bmMubmFtZSA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgYy5uZXh0U2libGluZygpOyAvLyBcIlBhcmFtTGlzdFwiID0+IGF0IGxlYXN0IDEgcGFyYW1ldGVycyAoc2VsZilcbiAgICBmdW5jLnBhcmFtcyA9IHRyYXZlcnNlTWV0aFBhcmFtcyhjLCBzKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiVHlwZURlZlwiIG9yIFwiQm9keVwiXG4gICAgLy8gY2hlY2sgaWYgdGhlIG1ldGhvZCBwcm92aWRlcyBhIHJldHVybiB0eXBlXG4gICAgaWYgKGMudHlwZS5uYW1lID09PSAnVHlwZURlZicpIHtcbiAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgIGZ1bmMucmV0VHlwZSA9IG5vZGUydHlwZShjLCBzKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpOyAvLyBcIkJvZHlcIlxuICAgIH1cbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCI6XCJcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHRoZSBmaXJzdCBib2R5IHN0YXRlbWVudFxuICAgIHZhciBjb2RlID0gdHJhdmVyc2VNZXRoQm9keShjLCBzKTsgLy8gVGhpcyBsaW5lIGlzIHRoZSBvbmx5IGRpZmZlcmVuY2VcbiAgICBmdW5jLnZhckluaXRzID0gY29kZS52YXJJbml0cztcbiAgICBmdW5jLnN0bXRzID0gY29kZS5zdG10cztcbiAgICBjLnBhcmVudCgpOyAvLyBiYWNrIHRvIFwiQm9keVwiXG4gICAgYy5wYXJlbnQoKTsgLy8gYmFjayB0byBcIkNsYXNzRGVmaW5pdGlvblwiXG4gICAgcmV0dXJuIGZ1bmM7XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VGdW5jRGVmKGMsIHMpIHtcbiAgICB2YXIgZnVuYyA9IHtcbiAgICAgICAgbmFtZTogXCJcIixcbiAgICAgICAgcGFyYW1zOiBudWxsLFxuICAgICAgICByZXRUeXBlOiBcIk5vbmVcIixcbiAgICAgICAgdmFySW5pdHM6IG51bGwsXG4gICAgICAgIHN0bXRzOiBudWxsXG4gICAgfTtcbiAgICAvLyBmdW5jdGlvbiBuYW1lXG4gICAgYy5maXJzdENoaWxkKCk7XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGZ1bmMubmFtZSA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgLy8gcGFyYW1saXN0ICgwIG9yIG1vcmUpXG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGZ1bmMucGFyYW1zID0gdHJhdmVyc2VGdW5jUGFyYW1zKGMsIHMpO1xuICAgIC8vIHJldHVybiB0eXBlICgwIG9yIG9uZSlcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgaWYgKGMudHlwZS5uYW1lID09PSAnVHlwZURlZicpIHtcbiAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgIGZ1bmMucmV0VHlwZSA9IG5vZGUydHlwZShjLCBzKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICB9XG4gICAgLy8gcGFyc2UgYm9keVxuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgdmFyIGNvZGUgPSB0cmF2ZXJzZUZ1bmNCb2R5KGMsIHMpO1xuICAgIGZ1bmMudmFySW5pdHMgPSBjb2RlLnZhckluaXRzO1xuICAgIGZ1bmMuc3RtdHMgPSBjb2RlLnN0bXRzO1xuICAgIGMucGFyZW50KCk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4gZnVuYztcbn1cbi8vIHNpbWlsYXIgdG8gdHJhdmVyc2VGdW5jUGFyYW1zLCBidXQgZXNjYXBlIHRoZSBzZWxmIHBhcmFtZXRlclxuZnVuY3Rpb24gdHJhdmVyc2VNZXRoUGFyYW1zKGMsIHMpIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgYy5maXJzdENoaWxkKCk7IC8vIFwiKFwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBcInNlbGZcIlxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJUeXBlRGVmXCJcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiLFwiXG4gICAgZG8ge1xuICAgICAgICBpZiAocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gJyknKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGlmIChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pID09PSAnLCcpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgcGFyYW1zLnB1c2godHJhdmVyc2VUeXBlZFZhcihjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiBwYXJhbXM7XG59XG5mdW5jdGlvbiB0cmF2ZXJzZUZ1bmNQYXJhbXMoYywgcykge1xuICAgIHZhciBwYXJhbXMgPSBbXTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgZG8ge1xuICAgICAgICBpZiAocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gJyknKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGlmIChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pID09PSAnLCcpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgcGFyYW1zLnB1c2godHJhdmVyc2VUeXBlZFZhcihjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiBwYXJhbXM7XG59XG5mdW5jdGlvbiB0cmF2ZXJzZUNsYXNzQm9keShjLCBzKSB7XG4gICAgdmFyIHZhckluaXRzID0gW107XG4gICAgdmFyIGZ1bmNEZWZzID0gW107XG4gICAgZG8ge1xuICAgICAgICBpZiAoaXNWYXJJbml0KGMpKSB7XG4gICAgICAgICAgICB2YXJJbml0cy5wdXNoKHRyYXZlcnNlVmFySW5pdChjLCBzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRnVuY0RlZihjKSkge1xuICAgICAgICAgICAgZnVuY0RlZnMucHVzaCh0cmF2ZXJzZU1ldGhEZWYoYywgcykpO1xuICAgICAgICB9XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAvLyBBIGNsYXNzIGNvbnNpc3RzIG9mIHZhcmlhYmxlIGluaXRpYWxpemF0aW9ucyBhbmQgbWV0aG9kIGRlZmluaXRpb25zLlxuICAgIHJldHVybiB7IHZhckluaXRzOiB2YXJJbml0cywgY2xhc3NEZWZzOiBbXSwgZnVuY0RlZnM6IGZ1bmNEZWZzLCBzdG10czogW10gfTtcbn1cbi8vIEEgbWV0aG9kIGJvZHkgY29uc2lzdHMgdmFyaWFibGUgZGVmaW5pdGlvbnMgYW5kIHN0YXRlbWVudHMuXG5mdW5jdGlvbiB0cmF2ZXJzZU1ldGhCb2R5KGMsIHMpIHtcbiAgICB2YXIgdmFySW5pdHMgPSBbXTtcbiAgICB2YXIgc3RtdHMgPSBbXTtcbiAgICAvLyB0cmF2ZXJzZSB2YXJpYWJsZSBpbml0aWFsaXphdGlvbnNcbiAgICBkbyB7XG4gICAgICAgIGlmICghaXNWYXJJbml0KGMpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB2YXJJbml0cy5wdXNoKHRyYXZlcnNlVmFySW5pdChjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAvLyBnZXQgYWxsIHN0YXRlbWVudFxuICAgIGRvIHtcbiAgICAgICAgc3RtdHMucHVzaCh0cmF2ZXJzZVN0bXQoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgcmV0dXJuIHsgdmFySW5pdHM6IHZhckluaXRzLCBjbGFzc0RlZnM6IFtdLCBzdG10czogc3RtdHMsIGZ1bmNEZWZzOiBbXSB9O1xufVxuZnVuY3Rpb24gdHJhdmVyc2VGdW5jQm9keShjLCBzKSB7XG4gICAgdmFyIHZhckluaXRzID0gW107XG4gICAgdmFyIHN0bXRzID0gW107XG4gICAgZG8ge1xuICAgICAgICBpZiAoIWlzVmFySW5pdChjKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRnVuY0RlZihjKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0VSIEVSUk86IG5lc3RlZCBmdW5jdGlvbiBkZWZpbml0aW9uIGlzIG5vdCBhbGxvd2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhckluaXRzLnB1c2godHJhdmVyc2VWYXJJbml0KGMsIHMpKTtcbiAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgIC8vIGdldCBhbGwgc3RhdGVtZW50XG4gICAgZG8ge1xuICAgICAgICBpZiAoaXNGdW5jRGVmKGMpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQQVJTRVIgRVJST1I6IG5lc3RlZCBmdW5jdGlvbiBkZWZpbml0aW9uIGlzIG5vdyBhbGxvd2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1ZhckluaXQoYykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiBWYXJpYWJsZSBpbml0aWFsaXphdGlvbiBzaG91bGQgZ28gYmVmb3JlIHN0YXRlbWVudHNcIik7XG4gICAgICAgIH1cbiAgICAgICAgc3RtdHMucHVzaCh0cmF2ZXJzZVN0bXQoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgcmV0dXJuIHsgdmFySW5pdHM6IHZhckluaXRzLCBjbGFzc0RlZnM6IFtdLCBzdG10czogc3RtdHMsIGZ1bmNEZWZzOiBbXSB9O1xufVxuZnVuY3Rpb24gc3RyMnVuaW9wKG9wU3RyKSB7XG4gICAgc3dpdGNoIChvcFN0cikge1xuICAgICAgICBjYXNlIFwiLVwiOlxuICAgICAgICAgICAgcmV0dXJuIFVuaU9wLk1pbnVzO1xuICAgICAgICBjYXNlIFwibm90XCI6XG4gICAgICAgICAgICByZXR1cm4gVW5pT3AuTm90O1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJQQVJTRSBFUlJPUjogdW5zdXBwb3J0ZWQgdW5pYXJ5IG9wZXJhdG9yXCIpO1xufVxuZnVuY3Rpb24gc3RyMmJpbm9wKG9wU3RyKSB7XG4gICAgc3dpdGNoIChvcFN0cikge1xuICAgICAgICBjYXNlIFwiK1wiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLlBsdXM7XG4gICAgICAgIGNhc2UgXCItXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTWludXM7XG4gICAgICAgIGNhc2UgXCIqXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTXVsO1xuICAgICAgICBjYXNlIFwiLy9cIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5EaXY7XG4gICAgICAgIGNhc2UgXCIlXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTW9kO1xuICAgICAgICBjYXNlIFwiPT1cIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5FcTtcbiAgICAgICAgY2FzZSBcIiE9XCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTmVxO1xuICAgICAgICBjYXNlIFwiPD1cIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5TZXE7XG4gICAgICAgIGNhc2UgXCI+PVwiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLkxlcTtcbiAgICAgICAgY2FzZSBcIjxcIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5TbWw7XG4gICAgICAgIGNhc2UgXCI+XCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTHJnO1xuICAgICAgICBjYXNlIFwiaXNcIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5JcztcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0UgRVJST1I6IHVua25vd24gYmluYXJ5IG9wZXJhdG9yXCIpO1xufVxuZnVuY3Rpb24gdHJhdmVyc2VXaGlsZShjLCBzKSB7XG4gICAgYy5maXJzdENoaWxkKCk7IC8vIHdoaWxlXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBjb25kXG4gICAgdmFyIGNvbmQgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgdmFyIHN0bXRzID0gW107XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBkbyB7XG4gICAgICAgIHN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgIGMucGFyZW50KCk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4geyB0YWc6IFwid2hpbGVcIiwgY29uZDogY29uZCwgc3RtdHM6IHN0bXRzIH07XG59XG5mdW5jdGlvbiB0cmF2ZXJzZUlmKGMsIHMpIHtcbiAgICB2YXIgaWZDbGF1c2UgPSB7XG4gICAgICAgIHRhZzogXCJpZlwiLFxuICAgICAgICBpZk9wOiB7XG4gICAgICAgICAgICBjb25kOiBudWxsLFxuICAgICAgICAgICAgc3RtdHM6IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgZWxpZk9wOiB7XG4gICAgICAgICAgICBjb25kOiBudWxsLFxuICAgICAgICAgICAgc3RtdHM6IG51bGwsXG4gICAgICAgIH0sXG4gICAgICAgIGVsc2VPcDoge1xuICAgICAgICAgICAgc3RtdHM6IG51bGxcbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gY2hlY2sgaWZcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gaWZcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgaWZDbGF1c2UuaWZPcC5jb25kID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgaWZDbGF1c2UuaWZPcC5zdG10cyA9IFtdO1xuICAgIGRvIHtcbiAgICAgICAgaWZDbGF1c2UuaWZPcC5zdG10cy5wdXNoKHRyYXZlcnNlU3RtdChjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIGlmICghYy5uZXh0U2libGluZygpKSB7XG4gICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgIHJldHVybiBpZkNsYXVzZTtcbiAgICB9XG4gICAgLy8gY2hlY2sgZWxpZiBpZlxuICAgIGlmIChjLnR5cGUubmFtZSA9PSAnZWxpZicpIHtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBpZkNsYXVzZS5lbGlmT3AuY29uZCA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBpZkNsYXVzZS5lbGlmT3Auc3RtdHMgPSBbXTtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWZDbGF1c2UuZWxpZk9wLnN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICAgICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICAgICAgaWYgKCFjLm5leHRTaWJsaW5nKCkpIHtcbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4gaWZDbGF1c2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gY2hlY2sgZWxzZVxuICAgIGlmIChjLnR5cGUubmFtZSA9PSAnZWxzZScpIHtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBpZkNsYXVzZS5lbHNlT3Auc3RtdHMgPSBbXTtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWZDbGF1c2UuZWxzZU9wLnN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICAgICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICB9XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4gaWZDbGF1c2U7XG59XG4vKlxuICogSGVscGVyIEZ1bmN0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5VHJlZSh0LCBzb3VyY2UsIGQpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICB2YXIgc3BhY2VzID0gXCIgXCIucmVwZWF0KGQgKiAyKTtcbiAgICBzdHIgKz0gc3BhY2VzICsgdC50eXBlLm5hbWU7XG4gICAgaWYgKFtcIk51bWJlclwiLCBcIkNhbGxFeHByZXNzaW9uXCIsIFwiQmluYXJ5RXhwcmVzc2lvblwiLCBcIlVuYXJ5RXhwcmVzc2lvblwiXS5pbmNsdWRlcyh0LnR5cGUubmFtZSkpIHtcbiAgICAgICAgc3RyICs9IFwiLS0+XCIgKyBzb3VyY2Uuc3Vic3RyaW5nKHQuZnJvbSwgdC50byk7XG4gICAgfVxuICAgIHN0ciArPSBcIlxcblwiO1xuICAgIGlmICh0LmZpcnN0Q2hpbGQoKSkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBzdHIgKz0gc3RyaW5naWZ5VHJlZSh0LCBzb3VyY2UsIGQgKyAxKTtcbiAgICAgICAgfSB3aGlsZSAodC5uZXh0U2libGluZygpKTtcbiAgICAgICAgdC5wYXJlbnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cbiIsIi8vIFRoaXMgaXMgYSBtYXNodXAgb2YgdHV0b3JpYWxzIGZyb206XG4vL1xuLy8gLSBodHRwczovL2dpdGh1Yi5jb20vQXNzZW1ibHlTY3JpcHQvd2FidC5qcy9cbi8vIC0gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWJBc3NlbWJseS9Vc2luZ190aGVfSmF2YVNjcmlwdF9BUElcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xudmFyIF9fZ2VuZXJhdG9yID0gKHRoaXMgJiYgdGhpcy5fX2dlbmVyYXRvcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIGJvZHkpIHtcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xuICAgICAgICB3aGlsZSAoXykgdHJ5IHtcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbn07XG5pbXBvcnQgd2FidCBmcm9tICd3YWJ0JztcbmltcG9ydCAqIGFzIGNvbXBpbGVyIGZyb20gJy4vY29tcGlsZXInO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICcuL3BhcnNlcic7XG4vLyBOT1RFKGpvZSk6IFRoaXMgaXMgYSBoYWNrIHRvIGdldCB0aGUgQ0xJIFJlcGwgdG8gcnVuLiBXQUJUIHJlZ2lzdGVycyBhIGdsb2JhbFxuLy8gdW5jYXVnaHQgZXhuIGhhbmRsZXIsIGFuZCB0aGlzIGlzIG5vdCBhbGxvd2VkIHdoZW4gcnVubmluZyB0aGUgUkVQTFxuLy8gKGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvcmVwbC5odG1sI3JlcGxfZ2xvYmFsX3VuY2F1Z2h0X2V4Y2VwdGlvbnMpLiBObyByZWFzb25cbi8vIGlzIGdpdmVuIGZvciB0aGlzIGluIHRoZSBkb2NzIHBhZ2UsIGFuZCBJIGhhdmVuJ3Qgc3BlbnQgdGltZSBvbiB0aGUgZG9tYWluXG4vLyBtb2R1bGUgdG8gZmlndXJlIG91dCB3aGF0J3MgZ29pbmcgb24gaGVyZS4gSXQgZG9lc24ndCBzZWVtIGNyaXRpY2FsIGZvciBXQUJUXG4vLyB0byBoYXZlIHRoaXMgc3VwcG9ydCwgc28gd2UgcGF0Y2ggaXQgYXdheS5cbmlmICh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBvbGRQcm9jZXNzT25fMSA9IHByb2Nlc3Mub247XG4gICAgcHJvY2Vzcy5vbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFyZ3NbX2ldID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnc1swXSA9PT0gXCJ1bmNhdWdodEV4Y2VwdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb2xkUHJvY2Vzc09uXzEuYXBwbHkocHJvY2VzcywgYXJncyk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHJ1bndhdHNyYyhzb3VyY2UsIGNvbmZpZykge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdhYnRJbnRlcmZhY2UsIHBhcnNlZCwgcmV0dXJuVHlwZSwgcmV0dXJuRXhwciwgY29tcGlsZWQsIGltcG9ydE9iamVjdCwgd2FzbVNvdXJjZSwgbXlNb2R1bGUsIGFzQmluYXJ5LCB3YXNtTW9kdWxlLCByZXN1bHQ7XG4gICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIHdhYnQoKV07XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICB3YWJ0SW50ZXJmYWNlID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZWQgPSBwYXJzZShzb3VyY2UpLnN0bXRzO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm5UeXBlID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuRXhwciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBpbGVkID0gY29tcGlsZXIuY29tcGlsZShzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnRPYmplY3QgPSBjb25maWcuaW1wb3J0T2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICB3YXNtU291cmNlID0gXCIobW9kdWxlXFxuICAgIChmdW5jICRwcmludF9udW0gKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcInByaW50X251bVxcXCIpIChwYXJhbSBpMzIpIChyZXN1bHQgaTMyKSlcXG4gICAgKGZ1bmMgJHByaW50X2Jvb2wgKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcInByaW50X2Jvb2xcXFwiKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChmdW5jICRwcmludF9ub25lIChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJwcmludF9ub25lXFxcIikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkcHJpbnQgKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcInByaW50XFxcIikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkYWJzIChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJhYnNcXFwiKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChmdW5jICRtYXggKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcIm1heFxcXCIpIChwYXJhbSBpMzIpIChwYXJhbSBpMzIpIChyZXN1bHQgaTMyKSlcXG4gICAgKGZ1bmMgJG1pbiAoaW1wb3J0IFxcXCJpbXBvcnRzXFxcIiBcXFwibWluXFxcIikgKHBhcmFtIGkzMikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkcG93IChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJwb3dcXFwiKSAocGFyYW0gaTMyKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChtZW1vcnkgKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcIm1lbVxcXCIpIDEpXFxuICAgIFwiLmNvbmNhdChjb21waWxlZC53YXNtU291cmNlLCBcIlxcbiAgKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3YXNtU291cmNlOiBcIi5jb25jYXQod2FzbVNvdXJjZSkpO1xuICAgICAgICAgICAgICAgICAgICBteU1vZHVsZSA9IHdhYnRJbnRlcmZhY2UucGFyc2VXYXQoXCJ0ZXN0LndhdFwiLCB3YXNtU291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgYXNCaW5hcnkgPSBteU1vZHVsZS50b0JpbmFyeSh7fSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKGFzQmluYXJ5LmJ1ZmZlciwgaW1wb3J0T2JqZWN0KV07XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICB3YXNtTW9kdWxlID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB3YXNtTW9kdWxlLmluc3RhbmNlLmV4cG9ydHMuZXhwb3J0ZWRfZnVuYygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qLywgcmVzdWx0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4iLCJ2YXIgX19hc3NpZ24gPSAodGhpcyAmJiB0aGlzLl9fYXNzaWduKSB8fCBmdW5jdGlvbiAoKSB7XG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKVxuICAgICAgICAgICAgICAgIHRbcF0gPSBzW3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0O1xuICAgIH07XG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuaW1wb3J0IHsgQmluT3AsIFVuaU9wIH0gZnJvbSAnLi9hc3QnO1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5VmFyRW52KGVudikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHZhcnM6IG5ldyBNYXAoZW52LnZhcnMpLFxuICAgICAgICBjbGFzc01ldGhvZHM6IG5ldyBNYXAoZW52LmNsYXNzTWV0aG9kcyksXG4gICAgICAgIGNsYXNzRmllbGRzOiBuZXcgTWFwKGVudi5jbGFzc0ZpZWxkcyksXG4gICAgICAgIGZ1bmNzOiBuZXcgTWFwKGVudi5mdW5jcyksXG4gICAgICAgIHJldFR5cGU6IGVudi5yZXRUeXBlXG4gICAgfTtcbn1cbi8vIGluaXRpYWxpemUgYW4gZW52aXJvbm1lbnQgc3R1cmN0dXJlXG5leHBvcnQgZnVuY3Rpb24gbmV3VHlwZUVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YXJzOiBuZXcgTWFwKCksXG4gICAgICAgIGNsYXNzTWV0aG9kczogbmV3IE1hcCgpLFxuICAgICAgICBjbGFzc0ZpZWxkczogbmV3IE1hcCgpLFxuICAgICAgICBmdW5jczogbmV3IE1hcCgpLFxuICAgICAgICByZXRUeXBlOiBcIk5vbmVcIlxuICAgIH07XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0dXBFbnYocHJvZ3JhbSkge1xuICAgIHZhciBldm4gPSBuZXdUeXBlRW52KCk7XG4gICAgLy8gZ2xvYmFsIHZhcmlhYmxlc1xuICAgIHByb2dyYW0udmFySW5pdHMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgICAgICBldm4udmFycy5zZXQodi5uYW1lLCB2LnR5cGUpO1xuICAgIH0pO1xuICAgIC8vIGNsYXNzIGRlZmluaXRpb25zXG4gICAgcHJvZ3JhbS5jbGFzc0RlZnMuZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgICAgICBpZiAocy50YWcgIT09IFwiY2xhc3NcIikge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFcnJvcjogVFlQRSBFUlJPUjogbm90IGEgY2xhc3NcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZGVmaW5lIHRoZSBmaWVsZHMgKG5hbWUgOiB0eXBlKVxuICAgICAgICB2YXIgZmllbGRzID0gcy5maWVsZHM7XG4gICAgICAgIHZhciBmaWVsZE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgZmllbGRzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgICAgIGZpZWxkTWFwLnNldChmLm5hbWUsIGYudHlwZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBldm4uY2xhc3NGaWVsZHMuc2V0KHMubmFtZSwgZmllbGRNYXApO1xuICAgICAgICAvLyBkZWZpbmUgdGhlIG1ldGhvZHMgKG5hbWUgOiBhcmdzIGFuZCByZXR1cm4gdHlwZSlcbiAgICAgICAgdmFyIG1ldGhvZHMgPSBzLm1ldGhvZHM7XG4gICAgICAgIHZhciBtZXRob2RNYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgIG1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgbWV0aG9kTWFwLnNldChtLm5hbWUsIFttLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHAudHlwZTsgfSksIG0ucmV0VHlwZV0pO1xuICAgICAgICB9KTtcbiAgICAgICAgZXZuLmNsYXNzTWV0aG9kcy5zZXQocy5uYW1lLCBtZXRob2RNYXApO1xuICAgICAgICAvLyBhZGQgdGhlIGNsYXNzIGluaXRpYWxpemF0aW9uIGZ1bmN0aW9uc1xuICAgICAgICBldm4uZnVuY3Muc2V0KHMubmFtZSwgW1tdLCB7IHRhZzogXCJvYmplY3RcIiwgY2xhc3M6IHMubmFtZSB9XSk7XG4gICAgfSk7XG4gICAgLy8gZnVuY3Rpb24gZGVmaW5pdGlvbnNcbiAgICBwcm9ncmFtLmZ1bmNEZWZzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgZXZuLmZ1bmNzLnNldChmLm5hbWUsIFtmLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHAudHlwZTsgfSksIGYucmV0VHlwZV0pO1xuICAgIH0pO1xuICAgIHJldHVybiBldm47XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrUHJvZ3JhbShwcm9nKSB7XG4gICAgdmFyIGVudiA9IHNldHVwRW52KHByb2cpO1xuICAgIHZhciBwcm9nVHlwZWQgPSB7XG4gICAgICAgIHZhckluaXRzOiBbXSxcbiAgICAgICAgY2xhc3NEZWZzOiBbXSxcbiAgICAgICAgZnVuY0RlZnM6IFtdLFxuICAgICAgICBzdG10czogW11cbiAgICB9O1xuICAgIC8vIGNoZWNrIGdsb2JhbCB2YXJpYWJsZSA9PiBUaGUgcmhzIHZhbHVlcyBzaG91bGQgaGF2ZSBjb3JyZWN0IHR5cGVzXG4gICAgcHJvZ1R5cGVkLnZhckluaXRzID0gdHlwZUNoZWNrVmFySW5pdChwcm9nLnZhckluaXRzLCBlbnYpO1xuICAgIC8vIGNoZWNrIGNsYXNzIGRlZmluaXRpb25zXG4gICAgcHJvZ1R5cGVkLmNsYXNzRGVmcyA9IHByb2cuY2xhc3NEZWZzLm1hcChmdW5jdGlvbiAoYykgeyByZXR1cm4gdHlwZUNoZWNrQ2xhc3NEZWYoYywgZW52KTsgfSk7XG4gICAgLy8gY2hlY2sgZnVuY3Rpb24gZGVmaW5pdGlvbnNcbiAgICBwcm9nVHlwZWQuZnVuY0RlZnMgPSBwcm9nLmZ1bmNEZWZzLm1hcChmdW5jdGlvbiAoZikgeyByZXR1cm4gdHlwZUNoZWNrRnVuY0RlZihmLCBlbnYpOyB9KTtcbiAgICAvLyBjaGVjayBtYWluIGJvZHlcbiAgICBwcm9nVHlwZWQuc3RtdHMgPSB0eXBlQ2hlY2tTdG10cyhwcm9nLnN0bXRzLCBlbnYpO1xuICAgIHJldHVybiBwcm9nVHlwZWQ7XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrU3RtdHMoc3RtdHMsIGVudikge1xuICAgIHZhciB0eXBlZFN0bXRzID0gW107XG4gICAgc3RtdHMuZm9yRWFjaChmdW5jdGlvbiAoc3RtdCkge1xuICAgICAgICBzd2l0Y2ggKHN0bXQudGFnKSB7XG4gICAgICAgICAgICBjYXNlIFwiYXNzaWduXCI6IC8vIGUuZy4gYSA9IDBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc3RtdCBpcyBhbiBcImlkXCIsIHdlIHdvdWxkIGNoZWNrIG9mIHRoZSB2YXJpYWJsZSBleGlzdHMuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHN0bXQgaXMgYSBcImdldGZpZWxkXCIsIHdlIHdvdWxkIGNoZWNrIHJlY3Vyc2l2ZWx5IHVudGlsIGl0J3MgYW4gXCJpZFwiLlxuICAgICAgICAgICAgICAgIHZhciBsZWZ0VHlwZWRWYWx1ZSA9IHR5cGVDaGVja0V4cHIoc3RtdC5uYW1lLCBlbnYpO1xuICAgICAgICAgICAgICAgIHZhciByaWdodFR5cGVkVmFsdWUgPSB0eXBlQ2hlY2tFeHByKHN0bXQudmFsdWUsIGVudik7IC8vIHRvIGdldCBhXG4gICAgICAgICAgICAgICAgaWYgKCFpc1NhbWVUeXBlKGxlZnRUeXBlZFZhbHVlLmEsIHJpZ2h0VHlwZWRWYWx1ZS5hKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVycm9yOiBUWVBFIEVSUk9SOiBFeHBlY3RlZCB0eXBlIFwiLmNvbmNhdChsZWZ0VHlwZWRWYWx1ZS5hLCBcIjsgZ290IHR5cGUgXCIpLmNvbmNhdChyaWdodFR5cGVkVmFsdWUuYSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGE6IFwiTm9uZVwiLCBuYW1lOiBsZWZ0VHlwZWRWYWx1ZSwgdmFsdWU6IHJpZ2h0VHlwZWRWYWx1ZSB9KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZXhwclwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZEV4cHIgPSB0eXBlQ2hlY2tFeHByKHN0bXQuZXhwciwgZW52KTtcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGV4cHI6IHR5cGVkRXhwciwgYTogXCJOb25lXCIgfSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInJldHVyblwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZFJldCA9IHR5cGVDaGVja0V4cHIoc3RtdC5leHByLCBlbnYpO1xuICAgICAgICAgICAgICAgIGlmICghaXNTYW1lVHlwZSh0eXBlZFJldC5hLCBlbnYucmV0VHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3I6IFRZUEUgRVJST1I6IHJldHVybiBleHBlY3RlZCB0eXBlIFwiLmNvbmNhdChlbnYucmV0VHlwZSwgXCI7IGdvdCB0eXBlIFwiKS5jb25jYXQodHlwZWRSZXQuYSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGV4cHI6IHR5cGVkUmV0LCBhOiB0eXBlZFJldC5hIH0pKTsgLy8gVGhpcyBjYW4gYWxzbyBiZSBcIk5vbmVcIlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInBhc3NcIjpcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGE6IFwiTm9uZVwiIH0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJ3aGlsZVwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZFdoaWxlID0gdHlwZUNoZWNrV2hpbGUoc3RtdCwgZW52KTtcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHR5cGVkV2hpbGUpLCB7IGE6IFwiTm9uZVwiIH0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJpZlwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZElmID0gdHlwZUNoZWNrSWYoc3RtdCwgZW52KTtcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHR5cGVkSWYpLCB7IGE6IFwiTm9uZVwiIH0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0eXBlZFN0bXRzO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0V4cHIoZXhwciwgZW52KSB7XG4gICAgc3dpdGNoIChleHByLnRhZykge1xuICAgICAgICBjYXNlIFwiaWRcIjogLy8gY2hlY2sgaWYgdGhlIHZhcmlhYmxlIGhhcyBiZWVuIGRlZmluZWQgXG4gICAgICAgICAgICBpZiAoIWVudi52YXJzLmhhcyhleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogbm90IGEgdmFyaWFibGUgXCIuY29uY2F0KGV4cHIubmFtZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlkVHlwZSA9IGVudi52YXJzLmdldChleHByLm5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBhOiBpZFR5cGUgfSk7XG4gICAgICAgIGNhc2UgXCJiaW5vcFwiOlxuICAgICAgICAgICAgcmV0dXJuIHR5cGVDaGVja0Jpbk9wKGV4cHIsIGVudik7XG4gICAgICAgIGNhc2UgXCJ1bmlvcFwiOlxuICAgICAgICAgICAgcmV0dXJuIHR5cGVDaGVja1VuaU9wKGV4cHIsIGVudik7XG4gICAgICAgIGNhc2UgXCJsaXRlcmFsXCI6XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGE6IHR5cGVDaGVja0xpdGVyYWwoZXhwci5saXRlcmFsKS5hIH0pO1xuICAgICAgICBjYXNlIFwiY2FsbFwiOlxuICAgICAgICAgICAgdmFyIHR5cGVkQ2FsbCA9IHR5cGVDaGVja0NhbGwoZXhwciwgZW52KTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlZENhbGw7XG4gICAgICAgIGNhc2UgXCJnZXRmaWVsZFwiOlxuICAgICAgICAgICAgdmFyIHR5cGVkR2V0ZmllbGQgPSB0eXBlQ2hlY2tGaWVsZChleHByLCBlbnYpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVkR2V0ZmllbGQ7XG4gICAgICAgIGNhc2UgXCJtZXRob2RcIjpcbiAgICAgICAgICAgIHZhciB0eXBlZE1ldGhvZCA9IHR5cGVDaGVja01ldGhvZChleHByLCBlbnYpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVkTWV0aG9kO1xuICAgIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tCaW5PcChleHByLCBlbnYpIHtcbiAgICBpZiAoZXhwci50YWcgIT0gXCJiaW5vcFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyAgRVJST1I6IHR5cGVDaGVja0Jpbk9wIG9ubHkgdGFrZSBiaW5hcnkgb3BlcmF0aW9uXCIpO1xuICAgIH1cbiAgICBzd2l0Y2ggKGV4cHIub3ApIHtcbiAgICAgICAgLy8gd29yayBmb3IgaW50XG4gICAgICAgIGNhc2UgQmluT3AuUGx1czpcbiAgICAgICAgY2FzZSBCaW5PcC5NaW51czpcbiAgICAgICAgY2FzZSBCaW5PcC5NdWw6XG4gICAgICAgIGNhc2UgQmluT3AuRGl2OlxuICAgICAgICBjYXNlIEJpbk9wLk1vZDpcbiAgICAgICAgY2FzZSBCaW5PcC5TZXE6XG4gICAgICAgIGNhc2UgQmluT3AuTGVxOlxuICAgICAgICBjYXNlIEJpbk9wLlNtbDpcbiAgICAgICAgY2FzZSBCaW5PcC5Mcmc6XG4gICAgICAgICAgICB2YXIgbGVmdFR5cGVkID0gdHlwZUNoZWNrRXhwcihleHByLmxlZnQsIGVudik7IC8vIGFkZCB0aGUgdHlwZSB0byB0aGUgbGVmdCBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgcmlnaHRUeXBlZCA9IHR5cGVDaGVja0V4cHIoZXhwci5yaWdodCwgZW52KTtcbiAgICAgICAgICAgIGlmICghaXNTYW1lVHlwZShsZWZ0VHlwZWQuYSwgcmlnaHRUeXBlZC5hKSB8fCAobGVmdFR5cGVkLmEgIT09IFwiaW50XCIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLIEVSUk9SOiBDYW5ub3QgYXBwbHkgb3BlcmF0b3IgJ1wiLmNvbmNhdChleHByLm9wLCBcIicgb24gdHlwZXMgJ1wiKS5jb25jYXQobGVmdFR5cGVkLmEsIFwiJyBhbmQgdHlwZSAnXCIpLmNvbmNhdChyaWdodFR5cGVkLmEsIFwiJ1wiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXhwci5vcCA9PT0gQmluT3AuU2VxIHx8IGV4cHIub3AgPT09IEJpbk9wLkxlcSB8fCBleHByLm9wID09PSBCaW5PcC5TbWwgfHwgZXhwci5vcCA9PT0gQmluT3AuTHJnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBsZWZ0OiBsZWZ0VHlwZWQsIHJpZ2h0OiByaWdodFR5cGVkLCBhOiBcImJvb2xcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZXhwciksIHsgbGVmdDogbGVmdFR5cGVkLCByaWdodDogcmlnaHRUeXBlZCwgYTogXCJpbnRcIiB9KTtcbiAgICAgICAgLy8gd29yayBmb3IgYm90aCBpbnQgYW5kIGJvb2wsIGJ1dCBub3QgTm9uZVxuICAgICAgICBjYXNlIEJpbk9wLkVxOlxuICAgICAgICBjYXNlIEJpbk9wLk5lcTpcbiAgICAgICAgICAgIHZhciBsZWZ0VHlwZWRFcSA9IHR5cGVDaGVja0V4cHIoZXhwci5sZWZ0LCBlbnYpO1xuICAgICAgICAgICAgdmFyIHJpZ2h0VHlwZWRFcSA9IHR5cGVDaGVja0V4cHIoZXhwci5yaWdodCwgZW52KTtcbiAgICAgICAgICAgIC8vIGZpbHRlciBvdXQgY2xhc3NlcyBhbmQgXCJOb25lXCJcbiAgICAgICAgICAgIGlmICghaXNTYW1lVHlwZShsZWZ0VHlwZWRFcS5hLCByaWdodFR5cGVkRXEuYSkgfHwgaXNPYmplY3QobGVmdFR5cGVkRXEuYSkgfHwgbGVmdFR5cGVkRXEuYSA9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogQ2Fubm90IGFwcGx5IG9wZXJhdG9yICdcIi5jb25jYXQoZXhwci5vcCwgXCInIG9uIHR5cGVzICdcIikuY29uY2F0KGxlZnRUeXBlZEVxLmEsIFwiJyBhbmQgdHlwZSAnXCIpLmNvbmNhdChyaWdodFR5cGVkRXEuYSwgXCInXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZXhwciksIHsgbGVmdDogbGVmdFR5cGVkRXEsIHJpZ2h0OiByaWdodFR5cGVkRXEsIGE6IFwiYm9vbFwiIH0pO1xuICAgICAgICAvLyB3b3JrIGZvciBOb25lIGFuZCBvdGhlciBjbGFzc2VzXG4gICAgICAgIGNhc2UgQmluT3AuSXM6XG4gICAgICAgICAgICB2YXIgbGVmdFR5cGVkSXMgPSB0eXBlQ2hlY2tFeHByKGV4cHIubGVmdCwgZW52KTtcbiAgICAgICAgICAgIHZhciByaWdodFR5cGVkSXMgPSB0eXBlQ2hlY2tFeHByKGV4cHIucmlnaHQsIGVudik7XG4gICAgICAgICAgICBpZiAobGVmdFR5cGVkSXMuYSA9PT0gXCJpbnRcIiB8fCBsZWZ0VHlwZWRJcy5hID09PSBcImJvb2xcIiB8fCByaWdodFR5cGVkSXMuYSA9PT0gXCJpbnRcIiB8fCByaWdodFR5cGVkSXMuYSA9PT0gXCJib29sXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IENhbm5vdCBhcHBseSBvcGVyYXRvciAnXCIuY29uY2F0KGV4cHIub3AsIFwiJyBvbiB0eXBlcyAnXCIpLmNvbmNhdChsZWZ0VHlwZWRJcy5hLCBcIicgYW5kIHR5cGUgJ1wiKS5jb25jYXQocmlnaHRUeXBlZElzLmEsIFwiJ1wiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGxlZnQ6IGxlZnRUeXBlZElzLCByaWdodDogcmlnaHRUeXBlZElzLCBhOiBcImJvb2xcIiB9KTtcbiAgICB9XG59XG4vLyBzaG91bGQgcmV0dXJuIHRydWUgaW4gdGhlIGZpcnN0IHN0YXRlbWVudCBpZiBib3RoIGFyZSBub3Qgb2JqZWN0c1xuZXhwb3J0IGZ1bmN0aW9uIGlzU2FtZVR5cGUocywgdCkge1xuICAgIGlmIChzID09PSB0KSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBib3RoIFwiaW50XCIsIFwiYm9vbFwiLCBvciBcIk5vbmVcIlxuICAgIH1cbiAgICBlbHNlIGlmIChzID09PSBcImludFwiIHx8IHMgPT09IFwiYm9vbFwiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSBpZiAodCA9PT0gXCJpbnRcIiB8fCB0ID09PSBcImJvb2xcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHQgPT09IFwiTm9uZVwiIHx8IHMgPT09IFwiTm9uZVwiKSB7IC8vIFwiTm9uZVwiIGlzIHRoZSBzYW1lIHR5cGUgYXMgYW55IGNsYXNzZXNcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gKHMudGFnID09PSB0LnRhZyAmJiBzLmNsYXNzID09PSB0LmNsYXNzKTsgLy8gYm90aCBvYmplY3RzXG4gICAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHMpIHtcbiAgICBpZiAocyA9PT0gXCJpbnRcIiB8fCBzID09PSBcImJvb2xcIiB8fCBzID09PSBcIk5vbmVcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1VuaU9wKGV4cHIsIGVudikge1xuICAgIGlmIChleHByLnRhZyAhPSBcInVuaW9wXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLICBFUlJPUjogdHlwZUNoZWNrVW5pT3Agb25seSB0YWtlIHVuYXJ5IG9wZXJhdGlvbnNcIik7XG4gICAgfVxuICAgIHN3aXRjaCAoZXhwci5vcCkge1xuICAgICAgICAvLyB3b3JrIGZvciBpbnRcbiAgICAgICAgY2FzZSBVbmlPcC5NaW51czpcbiAgICAgICAgICAgIHZhciB0eXBlZEV4cHIgPSB0eXBlQ2hlY2tFeHByKGV4cHIuZXhwciwgZW52KTtcbiAgICAgICAgICAgIGlmICh0eXBlZEV4cHIuYSAhPT0gXCJpbnRcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogdW5pYXJ5IG9wZXJhdG9yIFwiLmNvbmNhdChVbmlPcC5NaW51cywgXCIgZXhwZWN0ZWQgXCIpLmNvbmNhdChcImludFwiLCBcIjsgZ290IHR5cGUgXCIpLmNvbmNhdCh0eXBlZEV4cHIuYSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBleHByOiB0eXBlZEV4cHIsIGE6IFwiaW50XCIgfSk7XG4gICAgICAgIC8vIHdvcmsgZm9yIGJvb2xcbiAgICAgICAgY2FzZSBVbmlPcC5Ob3Q6XG4gICAgICAgICAgICB2YXIgbm90VHlwZWRFeHByID0gdHlwZUNoZWNrRXhwcihleHByLmV4cHIsIGVudik7XG4gICAgICAgICAgICBpZiAobm90VHlwZWRFeHByLmEgIT09IFwiYm9vbFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLIEVSUk9SOiB1bmlhcnkgb3BlcmF0b3IgXCIuY29uY2F0KFVuaU9wLk5vdCwgXCIgZXhwZWN0ZWQgXCIpLmNvbmNhdChcImJvb2xcIiwgXCI7IGdvdCB0eXBlIFwiKS5jb25jYXQobm90VHlwZWRFeHByLmEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZXhwciksIHsgZXhwcjogbm90VHlwZWRFeHByLCBhOiBcImJvb2xcIiB9KTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogdW5kZWZpbmVkIHVuYXJ5IG9wZXJhdG9yIFwiLmNvbmNhdChleHByLCBcIi4gVGhpcyBlcnJvciBzaG91bGQgYmUgY2FsbGVkIGluIHBhcnNlclwiKSk7XG4gICAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1doaWxlKHN0bXQsIGVudikge1xuICAgIGlmIChzdG10LnRhZyAhPT0gJ3doaWxlJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IHRoZSBpbnB1dCBzdGF0ZW1lbnQgc2hvdWxkIGJlIHdoaWxlIHdoZW4gY2FsbGluZyB0eXBlQ2hlY2tXaGlsZVwiKTtcbiAgICB9XG4gICAgdmFyIHR5cGVkV2hpbGVDb25kID0gdHlwZUNoZWNrRXhwcihzdG10LmNvbmQsIGVudik7XG4gICAgdmFyIHR5cGVkV2hpbGVCb2R5ID0gdHlwZUNoZWNrU3RtdHMoc3RtdC5zdG10cywgZW52KTtcbiAgICBpZiAodHlwZWRXaGlsZUNvbmQuYSAhPT0gXCJib29sXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLIEVSUk9SOiBDb25kdGlvbiBleHByZXNzaW9uIGNhbm5vdCBiZSBvZiB0eXBlICdcIi5jb25jYXQodHlwZWRXaGlsZUNvbmQuYSwgXCInXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYTogXCJOb25lXCIsXG4gICAgICAgIHRhZzogJ3doaWxlJyxcbiAgICAgICAgY29uZDogdHlwZWRXaGlsZUNvbmQsXG4gICAgICAgIHN0bXRzOiB0eXBlZFdoaWxlQm9keVxuICAgIH07XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrSWYoc3RtdCwgZW52KSB7XG4gICAgaWYgKHN0bXQudGFnICE9PSAnaWYnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogdGhlIGlucHV0IHN0YXRlbWVudCBzaG91bGQgYmUgaWYgd2hlbiBjYWxsaW5nIHR5cGVDaGVja0lmXCIpO1xuICAgIH1cbiAgICAvLyBjaGVjayBpZlxuICAgIHZhciB0eXBlZElmQ29uZCA9IHR5cGVDaGVja0V4cHIoc3RtdC5pZk9wLmNvbmQsIGVudik7XG4gICAgdmFyIHR5cGVkSWZCb2R5ID0gdHlwZUNoZWNrU3RtdHMoc3RtdC5pZk9wLnN0bXRzLCBlbnYpO1xuICAgIGlmICh0eXBlZElmQ29uZC5hICE9PSBcImJvb2xcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IENvbmR0aW9uIGV4cHJlc3Npb24gY2Fubm90IGJlIG9mIHR5cGUgJ1wiLmNvbmNhdCh0eXBlZElmQ29uZC5hLCBcIidcIikpO1xuICAgIH1cbiAgICAvLyBjaGVjayBlbGlmXG4gICAgdmFyIHR5cGVkRWxpZkNvbmQgPSBudWxsO1xuICAgIHZhciB0eXBlZEVsaWZCb2R5ID0gbnVsbDtcbiAgICBpZiAoc3RtdC5lbGlmT3AuY29uZCAhPT0gbnVsbCkge1xuICAgICAgICB0eXBlZEVsaWZDb25kID0gdHlwZUNoZWNrRXhwcihzdG10LmVsaWZPcC5jb25kLCBlbnYpO1xuICAgICAgICB0eXBlZEVsaWZCb2R5ID0gdHlwZUNoZWNrU3RtdHMoc3RtdC5lbGlmT3Auc3RtdHMsIGVudik7XG4gICAgICAgIGlmICh0eXBlZEVsaWZDb25kLmEgIT09IFwiYm9vbFwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IENvbmR0aW9uIGV4cHJlc3Npb24gY2Fubm90IGJlIG9mIHR5cGUgJ1wiLmNvbmNhdCh0eXBlZEVsaWZDb25kLmEsIFwiJ1wiKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gY2hlY2sgZWxzZTpcbiAgICB2YXIgdHB5ZWRFbHNlQm9keSA9IG51bGw7XG4gICAgaWYgKHN0bXQuZWxzZU9wLnN0bXRzICE9PSBudWxsKSB7XG4gICAgICAgIHRweWVkRWxzZUJvZHkgPSB0eXBlQ2hlY2tTdG10cyhzdG10LmVsc2VPcC5zdG10cywgZW52KTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYTogXCJOb25lXCIsXG4gICAgICAgIHRhZzogXCJpZlwiLFxuICAgICAgICBpZk9wOiB7IGNvbmQ6IHR5cGVkSWZDb25kLCBzdG10czogdHlwZWRJZkJvZHkgfSxcbiAgICAgICAgZWxpZk9wOiB7IGNvbmQ6IHR5cGVkRWxpZkNvbmQsIHN0bXRzOiB0eXBlZEVsaWZCb2R5IH0sXG4gICAgICAgIGVsc2VPcDogeyBzdG10czogdHB5ZWRFbHNlQm9keSB9XG4gICAgfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tGaWVsZChleHByLCBlbnYpIHtcbiAgICBpZiAoZXhwci50YWcgIT09IFwiZ2V0ZmllbGRcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IHR5cGVDaGVja01ldGhvZCBvbmx5IGFjY2VwdHMgYSBnZXRmaWVsZCBhcyBhbiBpbnB1dCBleHByXCIpO1xuICAgIH1cbiAgICB2YXIgdHlwZWRPYmogPSB0eXBlQ2hlY2tFeHByKGV4cHIub2JqLCBlbnYpO1xuICAgIGlmICh0eXBlZE9iai5hID09PSBcImludFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiYm9vbFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiTm9uZVwiKSB7IC8vIGNhbm5vdCBjb21waWxlIHdpdGggaXNPYmplY3QoKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IE9ubHkgb2JqZWN0cyBjYW4gZ2V0IGZpZWxkcy5cIik7XG4gICAgfVxuICAgIGlmICghZW52LmNsYXNzRmllbGRzLmhhcyh0eXBlZE9iai5hLmNsYXNzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IFRoZSBjbGFzcyBkb2Vzbid0IGV4aXN0LlwiKTtcbiAgICB9XG4gICAgdmFyIGNsYXNzRmllbGRzID0gZW52LmNsYXNzRmllbGRzLmdldCh0eXBlZE9iai5hLmNsYXNzKTtcbiAgICBpZiAoIWNsYXNzRmllbGRzLmhhcyhleHByLm5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogVGhlIGZpZWxkIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGNsYXNzLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBvYmo6IHR5cGVkT2JqLCBhOiBjbGFzc0ZpZWxkcy5nZXQoZXhwci5uYW1lKSB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tNZXRob2QoZXhwciwgZW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9PSBcIm1ldGhvZFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogdHlwZUNoZWNrTWV0aG9kIG9ubHkgYWNjZXB0cyBhIG1ldGhvZCBhcyBhbiBpbnB1dCBleHByXCIpO1xuICAgIH1cbiAgICB2YXIgdHlwZWRPYmogPSB0eXBlQ2hlY2tFeHByKGV4cHIub2JqLCBlbnYpO1xuICAgIGlmICh0eXBlZE9iai5hID09PSBcImludFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiYm9vbFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiTm9uZVwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogT25seSBjbGFzc2VzIGNhbiBjYWxsIG1ldGhvZHMuXCIpO1xuICAgIH1cbiAgICBpZiAoIWVudi5jbGFzc01ldGhvZHMuaGFzKHR5cGVkT2JqLmEuY2xhc3MpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogVGhlIGNsYXNzIGRvZXNuJ3QgZXhpc3QuXCIpO1xuICAgIH1cbiAgICB2YXIgY2xhc3NNZXRob2RzID0gZW52LmNsYXNzTWV0aG9kcy5nZXQodHlwZWRPYmouYS5jbGFzcyk7XG4gICAgaWYgKCFjbGFzc01ldGhvZHMuaGFzKGV4cHIubmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLIEVSUk9SOiBUaGUgbWV0aG9kIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGNsYXNzLlwiKTtcbiAgICB9XG4gICAgdmFyIF9hID0gY2xhc3NNZXRob2RzLmdldChleHByLm5hbWUpLCBhcmdUeXBzID0gX2FbMF0sIHJldFR5cCA9IF9hWzFdO1xuICAgIHZhciB0eXBlZEFyZ3MgPSBleHByLmFyZ3MubWFwKGZ1bmN0aW9uIChhKSB7IHJldHVybiB0eXBlQ2hlY2tFeHByKGEsIGVudik7IH0pO1xuICAgIGlmIChhcmdUeXBzLmxlbmd0aCAhPSB0eXBlZEFyZ3MubGVuZ3RoKSB7IC8vIFdlIGVzY2FwZWQgXCJzZWxmXCIgaW4gdGhlIHBhcnNlci5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLIEVSUk9SOiBUaGUgbnVtYmVyIG9mIHBhcmFtZXRlcnMgaXMgaW5jb3JyZWN0LlwiKTtcbiAgICB9XG4gICAgYXJnVHlwcy5mb3JFYWNoKGZ1bmN0aW9uICh0LCBpKSB7XG4gICAgICAgIGlmICghaXNTYW1lVHlwZSh0LCB0eXBlZEFyZ3NbaV0uYSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogaW5jb3JyZWN0IHBhcmFtZXRlciB0eXBlXCIpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBvYmo6IHR5cGVkT2JqLCBhcmdzOiB0eXBlZEFyZ3MsIGE6IHJldFR5cCB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tDYWxsKGV4cHIsIGVudikge1xuICAgIGlmIChleHByLnRhZyAhPT0gXCJjYWxsXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLIEVSUk9SOiB0eXBlQ2hlY2tDYWxsIG9ubHkgYWNjZXB0IGEgY2FsbCBhcyBhbiBpbnB1dCBleHByXCIpO1xuICAgIH1cbiAgICBpZiAoIWVudi5mdW5jcy5oYXMoZXhwci5uYW1lKSkge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJUWVBFQ0hFQ0sgV0FSTklORzogSWYgdGhlIFwiLmNvbmNhdChleHByLm5hbWUsIFwiIGZ1bmN0aW9uIGlzIGFuIGltcG9ydGVkIG9uZSwgd2UgZG9uJ3QgZG8gYW55IHR5cGUgY2hlY2suXCIpKTsgLy8gZXguIHByaW50KClcbiAgICAgICAgdmFyIHR5cGVkQXJnc18xID0gZXhwci5hcmdzLm1hcChmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZUNoZWNrRXhwcihhcmcsIGVudik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGFyZ3M6IHR5cGVkQXJnc18xLCBhOiBcIk5vbmVcIiB9KTtcbiAgICB9XG4gICAgLy8gY2hlY2sgIyBwYXJhbXNcbiAgICB2YXIgcGFyYW1zID0gZW52LmZ1bmNzLmdldChleHByLm5hbWUpWzBdO1xuICAgIHZhciBhcmdzID0gZXhwci5hcmdzO1xuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gcGFyYW1zLmxlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IGNhbGwgZnVuYyBcIi5jb25jYXQoZXhwci5uYW1lLCBcIjsgZXhwZWN0ZWQgXCIpLmNvbmNhdChwYXJhbXMubGVuZ3RoLCBcIiBhcmd1bWVudHM7IGdvdCBcIikuY29uY2F0KGFyZ3MubGVuZ3RoKSk7XG4gICAgfVxuICAgIC8vIGNoZWNrIGFyZ3VtZW50IHR5cGVcbiAgICB2YXIgdHlwZWRBcmdzID0gW107XG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgcGFyYW1zLmxlbmd0aDsgKytpZHgpIHtcbiAgICAgICAgdmFyIHR5cGVkQXJnID0gdHlwZUNoZWNrRXhwcihhcmdzW2lkeF0sIGVudik7XG4gICAgICAgIGlmICh0eXBlZEFyZy5hICE9PSBwYXJhbXNbaWR4XSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRUNIRUNLIEVSUk9SOiBjYWxsIGZ1bmMgXCIuY29uY2F0KGV4cHIubmFtZSwgXCI7IGV4cGVjdGVkIHR5cGUgXCIpLmNvbmNhdChwYXJhbXNbaWR4XSwgXCI7IGdvdCB0eXBlIFwiKS5jb25jYXQodHlwZWRBcmcuYSwgXCIgaW4gcGFyYW1ldGVycyBcIikuY29uY2F0KGlkeCkpO1xuICAgICAgICB9XG4gICAgICAgIHR5cGVkQXJncy5wdXNoKHR5cGVkQXJnKTtcbiAgICB9XG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBhcmdzOiB0eXBlZEFyZ3MsIGE6IGVudi5mdW5jcy5nZXQoZXhwci5uYW1lKVsxXSB9KTsgLy8gdXNlIHRoZSByZXR1cm4gdHlwZVxufVxuLy8gbWFrZSBzdXJlIHRoZSB2YXJpYWJsZSB0eXBlIGlzIGVxdWFsIHRvIHRoZSBsaXRlcmFsIHR5cGVcbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tWYXJJbml0KGluaXRzLCBlbnYpIHtcbiAgICB2YXIgdHlwZWRJbml0cyA9IFtdO1xuICAgIHZhciBzY29wZVZhciA9IG5ldyBTZXQoKTtcbiAgICBpbml0cy5mb3JFYWNoKGZ1bmN0aW9uIChpbml0KSB7XG4gICAgICAgIC8vIGNoZWNrIGlmIHRoZSBsZWZ0IGhhbmQgdHlwZSBlcXVhbHMgdG8gdGhlIHJpZ2h0IGhhbmQgdHlwZVxuICAgICAgICAvLyBleC4geDppbnQgYW5kIDFcbiAgICAgICAgdmFyIHR5cGVkTGl0ZXJhbCA9IHR5cGVDaGVja0xpdGVyYWwoaW5pdC5pbml0TGl0ZXJhbCk7XG4gICAgICAgIGlmICghaXNTYW1lVHlwZShpbml0LnR5cGUsIHR5cGVkTGl0ZXJhbC5hKSAmJiAhKGlzT2JqZWN0KGluaXQudHlwZSkgJiYgdHlwZWRMaXRlcmFsLmEgPT09IFwiTm9uZVwiKSkgeyAvLyBleC4gcjEgOiBSYXQgPSBOb25lXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVycm9yOiBUWVBFIEVSUk9SOiBpbml0IHR5cGUgZG9lcyBub3QgbWF0Y2ggbGl0ZXJhbCB0eXBlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHR5cGVkSW5pdHMucHVzaChfX2Fzc2lnbihfX2Fzc2lnbih7fSwgaW5pdCksIHsgYTogaW5pdC50eXBlLCBpbml0TGl0ZXJhbDogdHlwZWRMaXRlcmFsIH0pKTsgLy8gYWRkIHRoZSB0eXBlcyB0byBWYXJJbml0XG4gICAgfSk7XG4gICAgcmV0dXJuIHR5cGVkSW5pdHM7XG59XG4vKlxuQ2hlY2sgdGhlIHR5cGUgb2YgY2xhc3MgZGVmaW5pdGlvbjpcbigxKSBhZGQgdGhlIGNsYXNzIHZhcmlhYmxlc1xuKDIpIGNoZWNrIGVhY2ggZnVuY3Rpb25cbiovXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrQ2xhc3NEZWYoY2xzLCBlbnYpIHtcbiAgICBpZiAoY2xzLnRhZyAhPT0gXCJjbGFzc1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgaXMgbm90IGEgY2xhc3Mgc3RhdGVtZW50LlwiKTtcbiAgICB9XG4gICAgLy8gVGhlIG1ldGhvZHMgaW4gdGhlIGNsYXNzIGNhbiBhY2Nlc3MgdGhlIGdsb2JhbCB2YXJpYWJsZXMuXG4gICAgdmFyIGxvY2FsRW52ID0gZGVlcENvcHlWYXJFbnYoZW52KTsgLy8gaW5jbHVkZSBnbG9iYWwgdmFyaWFibGVzIGluIHRoZSBsb2NhbCBlbnZpcm9ubWVudFxuICAgIC8vIGNoZWNrIHZhcmlhYmxlIGluaXRpYWxpemF0aW9uc1xuICAgIHZhciBsb2NhbFR5cGVkSW5pdHMgPSB0eXBlQ2hlY2tWYXJJbml0KGNscy5maWVsZHMsIGxvY2FsRW52KTsgLy8gY2hlY2sgdGhlIHR5cGVcbiAgICBjbHMuZmllbGRzLmZvckVhY2goZnVuY3Rpb24gKGxvY2FsVHlwZWRJbml0KSB7XG4gICAgICAgIGxvY2FsRW52LnZhcnMuc2V0KFwic2VsZi5cIiArIGxvY2FsVHlwZWRJbml0Lm5hbWUsIGxvY2FsVHlwZWRJbml0LnR5cGUpOyAvLyB0byBkaXN0aW5ndWlzaCBzZWxmLmEgZnJvbSBhXG4gICAgfSk7IC8vIGFkZCB2YXJpYWJsZXMgdG8gdGhlIGVudmlyb25tZW50XG4gICAgbG9jYWxFbnYudmFycy5zZXQoXCJzZWxmXCIsIHsgdGFnOiBcIm9iamVjdFwiLCBjbGFzczogY2xzLm5hbWUgfSk7IC8vIGFkZCB0aGUgXCJzZWxmXCIgdmFyaWFibGUgdG8gdGhlIGVudmlyb25tZW50XG4gICAgLy8gY2hlY2sgbWV0aG9kIGRlZmluaXRpb25zXG4gICAgdmFyIGxvY2FsVHlwZWRNZXRob2RzID0gY2xzLm1ldGhvZHMubWFwKGZ1bmN0aW9uIChtKSB7IHJldHVybiB0eXBlQ2hlY2tGdW5jRGVmKG0sIGxvY2FsRW52KTsgfSk7IC8vIHVzZSB0aGUgc2FtZSBmdW5jdGlvblxuICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgY2xzKSwgeyBhOiBcIk5vbmVcIiwgZmllbGRzOiBsb2NhbFR5cGVkSW5pdHMsIG1ldGhvZHM6IGxvY2FsVHlwZWRNZXRob2RzIH0pOyAvLyBBIGNsYXNzIGRlZmluaXRpb24gZG9lc24ndCByZXF1aXJlIGFuIFwiYVwiLlxufVxuLypcbiAqIENoZWNrIHRoZSB0eXBlIG9mIGZ1bmN0aW9uIGRlZmluaXRpb246XG4gKiAoMSkgbmVlZCB0byB1cGRhdGUgdGhlIHR5cGUgdmFyIGVudiBiZWZvcmUgY2hlY2tpbmcgdGhlIGZ1bmMgYm9keVxuICogKDIpIG5lZWQgdG8gY2hlY2sgdGhlIHN0YXRlbWVudHNcbiAqICgzKSB0aGUgcmV0dXJuIHR5cGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0Z1bmNEZWYoZnVuYywgZW52KSB7XG4gICAgLy8gVGhlIGdsb2JhbCB2YXJpYWJsZXMgYXJlIGluY2x1ZGVkIGluIHRoZSBsb2NhbCBlbnZpcm9ubWVudC5cbiAgICB2YXIgbG9jYWxFbnYgPSBkZWVwQ29weVZhckVudihlbnYpO1xuICAgIC8vIGFkZCBwYXJhbXMgdG8gZW52c1xuICAgIHZhciBzY29wZVZhciA9IG5ldyBTZXQoKTsgLy8gV2UgbmVlZCB0aGlzIGJlY2F1c2UgbG9jYWxFbnYgY29udGFpbnMgZ2xvYmFsIHZhcmlhYmxlcy5cbiAgICB2YXIgdHlwZWRQYXJhbXMgPSB0eXBlQ2hlY2tQYXJhbXMoZnVuYy5wYXJhbXMpO1xuICAgIGZ1bmMucGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgIC8vIFBhcmFtcyBhcmUgYWRkZWQgZmlyc3QgdG8gY2hlY2sgZHVwbGljYXRlIGluaXRpYWxpemF0aW9ucy5cbiAgICAgICAgaWYgKHNjb3BlVmFyLmhhcyhwYXJhbS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgcGFyYW0gZGVjbGFyYXRpb24gaW4gdGhlIHNhbWUgZmllbGRcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2NvcGVWYXIuYWRkKHBhcmFtLm5hbWUpO1xuICAgICAgICBsb2NhbEVudi52YXJzLnNldChwYXJhbS5uYW1lLCBwYXJhbS50eXBlKTtcbiAgICB9KTtcbiAgICAvLyBjaGVjayBpbml0cyAtPiBhZGQgdG8gZW52c1xuICAgIHZhciBsb2NhbFR5cGVkSW5pdHMgPSB0eXBlQ2hlY2tWYXJJbml0KGZ1bmMudmFySW5pdHMsIGxvY2FsRW52KTtcbiAgICBmdW5jLnZhckluaXRzLmZvckVhY2goZnVuY3Rpb24gKGxvY2FsVHlwZWRJbml0KSB7XG4gICAgICAgIGlmIChzY29wZVZhci5oYXMobG9jYWxUeXBlZEluaXQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiZHVwbGljYXRlIGluaXQgZGVjbGFyYXRpb24gaW4gdGhlIHNhbWUgZmllbGRcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2NvcGVWYXIuYWRkKGxvY2FsVHlwZWRJbml0Lm5hbWUpO1xuICAgICAgICBsb2NhbEVudi52YXJzLnNldChsb2NhbFR5cGVkSW5pdC5uYW1lLCBsb2NhbFR5cGVkSW5pdC50eXBlKTtcbiAgICB9KTtcbiAgICAvLyBhZGQgcmV0dXJuIHR5cGVcbiAgICBsb2NhbEVudi5yZXRUeXBlID0gZnVuYy5yZXRUeXBlO1xuICAgIC8vIGNoZWNrIGJvZHkgc3RhdGVtZW50c1xuICAgIHZhciB0eXBlZFN0bXRzID0gdHlwZUNoZWNrU3RtdHMoZnVuYy5zdG10cywgbG9jYWxFbnYpO1xuICAgIC8vIG1ha2Ugc3VyZSBldmVyeSBwYXRoIGhhcyB0aGUgZXhwZWN0ZWQgcmV0dXJuIFxuICAgIGlmICghdHlwZUNoZWNrSGFzUmV0dXJuKGZ1bmMuc3RtdHMsIGVudikgJiYgZnVuYy5yZXRUeXBlICE9PSBcIk5vbmVcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IEFsbCBwYXRocyBpbiBmdW5jdGlvbi9tZXRob2QgbXVzdCBoYXZlIGEgcmV0dXJuIHN0YXRlbWVudDogXCIuY29uY2F0KGZ1bmMubmFtZSkpO1xuICAgIH1cbiAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGZ1bmMpLCB7IHBhcmFtczogdHlwZWRQYXJhbXMsIHZhckluaXRzOiBsb2NhbFR5cGVkSW5pdHMsIHN0bXRzOiB0eXBlZFN0bXRzIH0pO1xufVxuLy8gc2ltcGx5IGFzc2lnbiB0aGUgdHlwZSB0byBhXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrUGFyYW1zKHBhcmFtcykge1xuICAgIHJldHVybiBwYXJhbXMubWFwKGZ1bmN0aW9uIChwKSB7IHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgcCksIHsgYTogcC50eXBlIH0pOyB9KTtcbn1cbi8vIFRoZSB0YWdzIG9mIGxpdGVyYWxzIGFyZSB0aGVpciB0eXBlcy5cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tMaXRlcmFsKGxpdGVyYWwpIHtcbiAgICBzd2l0Y2ggKGxpdGVyYWwudGFnKSB7XG4gICAgICAgIGNhc2UgXCJudW1cIjpcbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgbGl0ZXJhbCksIHsgYTogXCJpbnRcIiB9KTtcbiAgICAgICAgY2FzZSBcImJvb2xcIjpcbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgbGl0ZXJhbCksIHsgYTogXCJib29sXCIgfSk7XG4gICAgICAgIGNhc2UgXCJub25lXCI6XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGxpdGVyYWwpLCB7IGE6IFwiTm9uZVwiIH0pO1xuICAgIH1cbn1cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGNoZWNrIHdoZXRoZXIgdGhpcyBib2R5IGFyZ3VtZW50IGhhcyB0aGVcbiAqIGRlc2lyZWQgcmV0dXJuIHZhbHVlXG4gKiBAcGFyYW0gYm9keVxuICogQHBhcmFtIGVudlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrSGFzUmV0dXJuKGJvZHksIGVudikge1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGJvZHkubGVuZ3RoOyArK2lkeCkge1xuICAgICAgICB2YXIgc3RtdCA9IGJvZHlbaWR4XTtcbiAgICAgICAgc3dpdGNoIChzdG10LnRhZykge1xuICAgICAgICAgICAgY2FzZSBcInJldHVyblwiOlxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSBcImlmXCI6XG4gICAgICAgICAgICAgICAgdmFyIGlmSGFzUmV0ID0gdHlwZUNoZWNrSGFzUmV0dXJuKHN0bXQuaWZPcC5zdG10cywgZW52KTtcbiAgICAgICAgICAgICAgICBpZiAoc3RtdC5lbGlmT3AuY29uZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZkhhc1JldCA9IGlmSGFzUmV0ICYmIHR5cGVDaGVja0hhc1JldHVybihzdG10LmVsaWZPcC5zdG10cywgZW52KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHN0bXQuZWxzZU9wLnN0bXRzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmSGFzUmV0ID0gaWZIYXNSZXQgJiYgdHlwZUNoZWNrSGFzUmV0dXJuKHN0bXQuZWxzZU9wLnN0bXRzLCBlbnYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgYWJvdmUgY29uZGl0aW9ucyBhcmUgbWV0XG4gICAgICAgICAgICAgICAgaWYgKGlmSGFzUmV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGNhc2UgXCJwYXNzXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgY2FzZSBcImV4cHJcIjpcbiAgICAgICAgICAgIGNhc2UgXCJhc3NpZ25cIjpcbiAgICAgICAgICAgIGNhc2UgXCJ3aGlsZVwiOlxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IHR5cGVDaGVja0hhc1JldHVybiBtZWV0cyB1bmtub3duIHN0YXRlbWVudFwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdhYnQ7IiwiaW1wb3J0IHsgRXh0ZXJuYWxUb2tlbml6ZXIsIENvbnRleHRUcmFja2VyLCBQYXJzZXIsIE5vZGVQcm9wIH0gZnJvbSAnbGV6ZXInO1xuXG4vLyBUaGlzIGZpbGUgd2FzIGdlbmVyYXRlZCBieSBsZXplci1nZW5lcmF0b3IuIFlvdSBwcm9iYWJseSBzaG91bGRuJ3QgZWRpdCBpdC5cbmNvbnN0IHByaW50S2V5d29yZCA9IDEsXG4gIGluZGVudCA9IDE2MixcbiAgZGVkZW50ID0gMTYzLFxuICBuZXdsaW5lJDEgPSAxNjQsXG4gIG5ld2xpbmVCcmFja2V0ZWQgPSAxNjUsXG4gIG5ld2xpbmVFbXB0eSA9IDE2NixcbiAgZW9mID0gMTY3LFxuICBQYXJlbnRoZXNpemVkRXhwcmVzc2lvbiA9IDIxLFxuICBUdXBsZUV4cHJlc3Npb24gPSA0NyxcbiAgQ29tcHJlaGVuc2lvbkV4cHJlc3Npb24gPSA0OCxcbiAgQXJyYXlFeHByZXNzaW9uID0gNTIsXG4gIEFycmF5Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24gPSA1NSxcbiAgRGljdGlvbmFyeUV4cHJlc3Npb24gPSA1NixcbiAgRGljdGlvbmFyeUNvbXByZWhlbnNpb25FeHByZXNzaW9uID0gNTksXG4gIFNldEV4cHJlc3Npb24gPSA2MCxcbiAgU2V0Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24gPSA2MSxcbiAgQXJnTGlzdCA9IDYzLFxuICBQYXJhbUxpc3QgPSAxMjE7XG5cbmNvbnN0IG5ld2xpbmUgPSAxMCwgY2FycmlhZ2VSZXR1cm4gPSAxMywgc3BhY2UgPSAzMiwgdGFiID0gOSwgaGFzaCA9IDM1LCBwYXJlbk9wZW4gPSA0MCwgZG90ID0gNDY7XG5cbmNvbnN0IGJyYWNrZXRlZCA9IFtcbiAgUGFyZW50aGVzaXplZEV4cHJlc3Npb24sIFR1cGxlRXhwcmVzc2lvbiwgQ29tcHJlaGVuc2lvbkV4cHJlc3Npb24sIEFycmF5RXhwcmVzc2lvbiwgQXJyYXlDb21wcmVoZW5zaW9uRXhwcmVzc2lvbixcbiAgRGljdGlvbmFyeUV4cHJlc3Npb24sIERpY3Rpb25hcnlDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiwgU2V0RXhwcmVzc2lvbiwgU2V0Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24sIEFyZ0xpc3QsIFBhcmFtTGlzdFxuXTtcblxubGV0IGNhY2hlZEluZGVudCA9IDAsIGNhY2hlZElucHV0ID0gbnVsbCwgY2FjaGVkUG9zID0gMDtcbmZ1bmN0aW9uIGdldEluZGVudChpbnB1dCwgcG9zKSB7XG4gIGlmIChwb3MgPT0gY2FjaGVkUG9zICYmIGlucHV0ID09IGNhY2hlZElucHV0KSByZXR1cm4gY2FjaGVkSW5kZW50XG4gIGNhY2hlZElucHV0ID0gaW5wdXQ7IGNhY2hlZFBvcyA9IHBvcztcbiAgcmV0dXJuIGNhY2hlZEluZGVudCA9IGdldEluZGVudElubmVyKGlucHV0LCBwb3MpXG59XG5cbmZ1bmN0aW9uIGdldEluZGVudElubmVyKGlucHV0LCBwb3MpIHtcbiAgZm9yIChsZXQgaW5kZW50ID0gMDs7IHBvcysrKSB7XG4gICAgbGV0IGNoID0gaW5wdXQuZ2V0KHBvcyk7XG4gICAgaWYgKGNoID09IHNwYWNlKSBpbmRlbnQrKztcbiAgICBlbHNlIGlmIChjaCA9PSB0YWIpIGluZGVudCArPSA4IC0gKGluZGVudCAlIDgpO1xuICAgIGVsc2UgaWYgKGNoID09IG5ld2xpbmUgfHwgY2ggPT0gY2FycmlhZ2VSZXR1cm4gfHwgY2ggPT0gaGFzaCkgcmV0dXJuIC0xXG4gICAgZWxzZSByZXR1cm4gaW5kZW50XG4gIH1cbn1cblxuY29uc3QgbmV3bGluZXMgPSBuZXcgRXh0ZXJuYWxUb2tlbml6ZXIoKGlucHV0LCB0b2tlbiwgc3RhY2spID0+IHtcbiAgbGV0IG5leHQgPSBpbnB1dC5nZXQodG9rZW4uc3RhcnQpO1xuICBpZiAobmV4dCA8IDApIHtcbiAgICB0b2tlbi5hY2NlcHQoZW9mLCB0b2tlbi5zdGFydCk7XG4gIH0gZWxzZSBpZiAobmV4dCAhPSBuZXdsaW5lICYmIG5leHQgIT0gY2FycmlhZ2VSZXR1cm4pIDsgZWxzZSBpZiAoc3RhY2suc3RhcnRPZihicmFja2V0ZWQpICE9IG51bGwpIHtcbiAgICB0b2tlbi5hY2NlcHQobmV3bGluZUJyYWNrZXRlZCwgdG9rZW4uc3RhcnQgKyAxKTtcbiAgfSBlbHNlIGlmIChnZXRJbmRlbnQoaW5wdXQsIHRva2VuLnN0YXJ0ICsgMSkgPCAwKSB7XG4gICAgdG9rZW4uYWNjZXB0KG5ld2xpbmVFbXB0eSwgdG9rZW4uc3RhcnQgKyAxKTtcbiAgfSBlbHNlIHtcbiAgICB0b2tlbi5hY2NlcHQobmV3bGluZSQxLCB0b2tlbi5zdGFydCArIDEpO1xuICB9XG59LCB7Y29udGV4dHVhbDogdHJ1ZSwgZmFsbGJhY2s6IHRydWV9KTtcblxuY29uc3QgaW5kZW50YXRpb24gPSBuZXcgRXh0ZXJuYWxUb2tlbml6ZXIoKGlucHV0LCB0b2tlbiwgc3RhY2spID0+IHtcbiAgbGV0IHByZXYgPSBpbnB1dC5nZXQodG9rZW4uc3RhcnQgLSAxKSwgZGVwdGg7XG4gIGlmICgocHJldiA9PSBuZXdsaW5lIHx8IHByZXYgPT0gY2FycmlhZ2VSZXR1cm4pICYmXG4gICAgICAoZGVwdGggPSBnZXRJbmRlbnQoaW5wdXQsIHRva2VuLnN0YXJ0KSkgPj0gMCAmJlxuICAgICAgZGVwdGggIT0gc3RhY2suY29udGV4dC5kZXB0aCAmJlxuICAgICAgc3RhY2suc3RhcnRPZihicmFja2V0ZWQpID09IG51bGwpXG4gICAgdG9rZW4uYWNjZXB0KGRlcHRoIDwgc3RhY2suY29udGV4dC5kZXB0aCA/IGRlZGVudCA6IGluZGVudCwgdG9rZW4uc3RhcnQpO1xufSk7XG5cbmZ1bmN0aW9uIEluZGVudExldmVsKHBhcmVudCwgZGVwdGgpIHtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuZGVwdGggPSBkZXB0aDtcbiAgdGhpcy5oYXNoID0gKHBhcmVudCA/IHBhcmVudC5oYXNoICsgcGFyZW50Lmhhc2ggPDwgOCA6IDApICsgZGVwdGggKyAoZGVwdGggPDwgNCk7XG59XG5cbmNvbnN0IHRvcEluZGVudCA9IG5ldyBJbmRlbnRMZXZlbChudWxsLCAwKTtcblxuY29uc3QgdHJhY2tJbmRlbnQgPSBuZXcgQ29udGV4dFRyYWNrZXIoe1xuICBzdGFydDogdG9wSW5kZW50LFxuICBzaGlmdChjb250ZXh0LCB0ZXJtLCBpbnB1dCwgc3RhY2spIHtcbiAgICByZXR1cm4gdGVybSA9PSBpbmRlbnQgPyBuZXcgSW5kZW50TGV2ZWwoY29udGV4dCwgZ2V0SW5kZW50KGlucHV0LCBzdGFjay5wb3MpKSA6XG4gICAgICB0ZXJtID09IGRlZGVudCA/IGNvbnRleHQucGFyZW50IDogY29udGV4dFxuICB9LFxuICBoYXNoKGNvbnRleHQpIHsgcmV0dXJuIGNvbnRleHQuaGFzaCB9XG59KTtcblxuY29uc3QgbGVnYWN5UHJpbnQgPSBuZXcgRXh0ZXJuYWxUb2tlbml6ZXIoKGlucHV0LCB0b2tlbikgPT4ge1xuICBsZXQgcG9zID0gdG9rZW4uc3RhcnQ7XG4gIGZvciAobGV0IHByaW50ID0gXCJwcmludFwiLCBpID0gMDsgaSA8IHByaW50Lmxlbmd0aDsgaSsrLCBwb3MrKylcbiAgICBpZiAoaW5wdXQuZ2V0KHBvcykgIT0gcHJpbnQuY2hhckNvZGVBdChpKSkgcmV0dXJuXG4gIGxldCBlbmQgPSBwb3M7XG4gIGlmICgvXFx3Ly50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoaW5wdXQuZ2V0KHBvcykpKSkgcmV0dXJuXG4gIGZvciAoOzsgcG9zKyspIHtcbiAgICBsZXQgbmV4dCA9IGlucHV0LmdldChwb3MpO1xuICAgIGlmIChuZXh0ID09IHNwYWNlIHx8IG5leHQgPT0gdGFiKSBjb250aW51ZVxuICAgIGlmIChuZXh0ICE9IHBhcmVuT3BlbiAmJiBuZXh0ICE9IGRvdCAmJiBuZXh0ICE9IG5ld2xpbmUgJiYgbmV4dCAhPSBjYXJyaWFnZVJldHVybiAmJiBuZXh0ICE9IGhhc2gpXG4gICAgICB0b2tlbi5hY2NlcHQocHJpbnRLZXl3b3JkLCBlbmQpO1xuICAgIHJldHVyblxuICB9XG59KTtcblxuLy8gVGhpcyBmaWxlIHdhcyBnZW5lcmF0ZWQgYnkgbGV6ZXItZ2VuZXJhdG9yLiBZb3UgcHJvYmFibHkgc2hvdWxkbid0IGVkaXQgaXQuXG5jb25zdCBzcGVjX2lkZW50aWZpZXIgPSB7X19wcm90b19fOm51bGwsYXdhaXQ6NDAsIG9yOjQ4LCBhbmQ6NTAsIGluOjU0LCBub3Q6NTYsIGlzOjU4LCBpZjo2NCwgZWxzZTo2NiwgbGFtYmRhOjcwLCB5aWVsZDo4OCwgZnJvbTo5MCwgYXN5bmM6OTgsIGZvcjoxMDAsIE5vbmU6MTUyLCBUcnVlOjE1NCwgRmFsc2U6MTU0LCBkZWw6MTY4LCBwYXNzOjE3MiwgYnJlYWs6MTc2LCBjb250aW51ZToxODAsIHJldHVybjoxODQsIHJhaXNlOjE5MiwgaW1wb3J0OjE5NiwgYXM6MTk4LCBnbG9iYWw6MjAyLCBub25sb2NhbDoyMDQsIGFzc2VydDoyMDgsIGVsaWY6MjE4LCB3aGlsZToyMjIsIHRyeToyMjgsIGV4Y2VwdDoyMzAsIGZpbmFsbHk6MjMyLCB3aXRoOjIzNiwgZGVmOjI0MCwgY2xhc3M6MjUwfTtcbmNvbnN0IHBhcnNlciA9IFBhcnNlci5kZXNlcmlhbGl6ZSh7XG4gIHZlcnNpb246IDEzLFxuICBzdGF0ZXM6IFwiIT98T2BRJElYT09PJWNRJElbTycjR2FPT1EkSVMnI0NtJyNDbU9PUSRJUycjQ24nI0NuTydSUSRJV08nI0NsTyh0USRJW08nI0dgT09RJElTJyNHYScjR2FPT1EkSVMnI0RSJyNEUk9PUSRJUycjR2AnI0dgTyliUSRJV08nI0NxTylyUSRJV08nI0RiTypTUSRJV08nI0RmT09RJElTJyNEcycjRHNPKmdPYE8nI0RzTypvT3BPJyNEc08qd08hYk8nI0R0TytTTyN0TycjRHRPK19PJmpPJyNEdE8rak8sVU8nI0R0Ty1sUSRJW08nI0dRT09RJElTJyNHUScjR1FPJ1JRJElXTycjR1BPL09RJElbTycjR1BPT1EkSVMnI0VdJyNFXU8vZ1EkSVdPJyNFXk9PUSRJUycjR08nI0dPTy9xUSRJV08nI0Z9T09RJElWJyNGfScjRn1PL3xRJElXTycjRlBPT1EkSVMnI0ZyJyNGck8wUlEkSVdPJyNGT09PUSRJVicjSFonI0haT09RJElWJyNGfCcjRnxPT1EkSVQnI0ZSJyNGUlFgUSRJWE9PTydSUSRJV08nI0NvTzBhUSRJV08nI0N6TzBoUSRJV08nI0RPTzB2USRJV08nI0dlTzFXUSRJW08nI0VRTydSUSRJV08nI0VST09RJElTJyNFVCcjRVRPT1EkSVMnI0VWJyNFVk9PUSRJUycjRVgnI0VYTzFsUSRJV08nI0VaTzJTUSRJV08nI0VfTy98USRJV08nI0VhTzJnUSRJW08nI0VhTy98USRJV08nI0VkTy9nUSRJV08nI0VnTy9nUSRJV08nI0VrTy9nUSRJV08nI0VuTzJyUSRJV08nI0VwTzJ5USRJV08nI0V1TzNVUSRJV08nI0VxTy9nUSRJV08nI0V1Ty98USRJV08nI0V3Ty98USRJV08nI0V8T09RJElTJyNDYycjQ2NPT1EkSVMnI0NkJyNDZE9PUSRJUycjQ2UnI0NlT09RJElTJyNDZicjQ2ZPT1EkSVMnI0NnJyNDZ09PUSRJUycjQ2gnI0NoT09RJElTJyNDaicjQ2pPJ1JRJElXTyw1OHxPJ1JRJElXTyw1OHxPJ1JRJElXTyw1OHxPJ1JRJElXTyw1OHxPJ1JRJElXTyw1OHxPJ1JRJElXTyw1OHxPM1pRJElXTycjRG1PT1EkSVMsNTpXLDU6V08zblEkSVdPLDU6Wk8ze1ElMWBPLDU6Wk80UVEkSVtPLDU5V08wYVEkSVdPLDU5X08wYVEkSVdPLDU5X08wYVEkSVdPLDU5X082cFEkSVdPLDU5X082dVEkSVdPLDU5X082fFEkSVdPLDU5Z083VFEkSVdPJyNHYE84WlEkSVdPJyNHX09PUSRJUycjR18nI0dfT09RJElTJyNEWCcjRFhPOHJRJElXTyw1OV1PJ1JRJElXTyw1OV1POVFRJElXTyw1OV1POVZRJElXTyw1OlBPJ1JRJElXTyw1OlBPT1EkSVMsNTl8LDU5fE85ZVEkSVdPLDU5fE85alEkSVdPLDU6Vk8nUlEkSVdPLDU6Vk8nUlEkSVdPLDU6VE9PUSRJUyw1OlEsNTpRTzl7USRJV08sNTpRTzpRUSRJV08sNTpVT09PTycjRlonI0ZaTzpWT2BPLDU6X09PUSRJUyw1Ol8sNTpfT09PTycjRlsnI0ZbTzpfT3BPLDU6X086Z1EkSVdPJyNEdU9PT08nI0ZdJyNGXU86d08hYk8sNTpgT09RJElTLDU6YCw1OmBPT09PJyNGYCcjRmBPO1NPI3RPLDU6YE9PT08nI0ZhJyNGYU87X08mak8sNTpgT09PTycjRmInI0ZiTztqTyxVTyw1OmBPT1EkSVMnI0ZjJyNGY087dVEkSVtPLDU6ZE8+Z1EkSVtPLDU8a08/UVElR2xPLDU8a08/cVEkSVtPLDU8a09PUSRJUyw1OngsNTp4T0BZUSRJWE8nI0ZrT0FpUSRJV08sNTtUT09RJElWLDU8aSw1PGlPQXRRJElbTycjSFdPQl1RJElXTyw1O2tPT1EkSVMtRTlwLUU5cE9PUSRJViw1O2osNTtqTzNQUSRJV08nI0V3T09RJElULUU5UC1FOVBPQmVRJElbTyw1OVpPRGxRJElbTyw1OWZPRVZRJElXTycjR2JPRWJRJElXTycjR2JPL3xRJElXTycjR2JPRW1RJElXTycjRFFPRXVRJElXTyw1OWpPRXpRJElXTycjR2ZPJ1JRJElXTycjR2ZPL2dRJElXTyw1PVBPT1EkSVMsNT1QLDU9UE8vZ1EkSVdPJyNEfE9PUSRJUycjRH0nI0R9T0ZpUSRJV08nI0ZlT0Z5USRJV08sNTh6T0dYUSRJV08sNTh6TyllUSRJV08sNTpqT0deUSRJW08nI0doT09RJElTLDU6bSw1Om1PT1EkSVMsNTp1LDU6dU9HcVEkSVdPLDU6eU9IU1EkSVdPLDU6e09PUSRJUycjRmgnI0ZoT0hiUSRJW08sNTp7T0hwUSRJV08sNTp7T0h1USRJV08nI0hZT09RJElTLDU7Tyw1O09PSVRRJElXTycjSFZPT1EkSVMsNTtSLDU7Uk8zVVEkSVdPLDU7Vk8zVVEkSVdPLDU7WU9JZlEkSVtPJyNIW08nUlEkSVdPJyNIW09JcFEkSVdPLDU7W08yclEkSVdPLDU7W08vZ1EkSVdPLDU7YU8vfFEkSVdPLDU7Y09JdVEkSVhPJyNFbE9LT1EkSVpPLDU7XU9OYVEkSVdPJyNIXU8zVVEkSVdPLDU7YU9ObFEkSVdPLDU7Y09OcVEkSVdPLDU7aE8hI2ZRJElbTzFHLmhPISNtUSRJW08xRy5oTyEmXlEkSVtPMUcuaE8hJmhRJElbTzFHLmhPISlSUSRJW08xRy5oTyEpZlEkSVtPMUcuaE8hKXlRJElXTycjR25PISpYUSRJW08nI0dRTy9nUSRJV08nI0duTyEqY1EkSVdPJyNHbU9PUSRJUyw1OlgsNTpYTyEqa1EkSVdPLDU6WE8hKnBRJElXTycjR29PISp7USRJV08nI0dvTyErYFEkSVdPMUcvdU9PUSRJUycjRHEnI0RxT09RJElTMUcvdTFHL3VPT1EkSVMxRy55MUcueU8hLGBRJElbTzFHLnlPISxnUSRJW08xRy55TzBhUSRJV08xRy55TyEtU1EkSVdPMUcvUk9PUSRJUycjRFcnI0RXTy9nUSRJV08sNTlxT09RJElTMUcudzFHLndPIS1aUSRJV08xRy9jTyEta1EkSVdPMUcvY08hLXNRJElXTzFHL2RPJ1JRJElXTycjR2dPIS14USRJV08nI0dnTyEtfVEkSVtPMUcud08hLl9RJElXTyw1OWZPIS9lUSRJV08sNT1WTyEvdVEkSVdPLDU9Vk8hL31RJElXTzFHL2tPITBTUSRJW08xRy9rT09RJElTMUcvaDFHL2hPITBkUSRJV08sNT1RTyExWlEkSVdPLDU9UU8vZ1EkSVdPMUcvb08hMXhRJElXTzFHL3FPITF9USRJW08xRy9xTyEyX1EkSVtPMUcvb09PUSRJUzFHL2wxRy9sT09RJElTMUcvcDFHL3BPT09PLUU5WC1FOVhPT1EkSVMxRy95MUcveU9PT08tRTlZLUU5WU8hMm9RJElXTycjR3pPL2dRJElXTycjR3pPITJ9USRJV08sNTphT09PTy1FOVotRTlaT09RJElTMUcvejFHL3pPT09PLUU5Xi1FOV5PT09PLUU5Xy1FOV9PT09PLUU5YC1FOWBPT1EkSVMtRTlhLUU5YU8hM1lRJUdsTzFHMlZPITN5USRJW08xRzJWTydSUSRJV08sNTxPT09RJElTLDU8Tyw1PE9PT1EkSVMtRTliLUU5Yk9PUSRJUyw1PFYsNTxWT09RJElTLUU5aS1FOWlPT1EkSVYxRzBvMUcwb08vfFEkSVdPJyNGZ08hNGJRJElbTyw1PXJPT1EkSVMxRzFWMUcxVk8hNHlRJElXTzFHMVZPT1EkSVMnI0RTJyNEU08vZ1EkSVdPLDU8fE9PUSRJUyw1PHwsNTx8TyE1T1EkSVdPJyNGU08hNVpRJElXTyw1OWxPITVjUSRJV08xRy9VTyE1bVEkSVtPLDU9UU9PUSRJUzFHMmsxRzJrT09RJElTLDU6aCw1OmhPITZeUSRJV08nI0dQT09RJElTLDU8UCw1PFBPT1EkSVMtRTljLUU5Y08hNm9RJElXTzFHLmZPT1EkSVMxRzBVMUcwVU8hNn1RJElXTyw1PVNPITdfUSRJV08sNT1TTy9nUSRJV08xRzBlTy9nUSRJV08xRzBlTy98USRJV08xRzBnT09RJElTLUU5Zi1FOWZPITdwUSRJV08xRzBnTyE3e1EkSVdPMUcwZ08hOFFRJElXTyw1PXRPIThgUSRJV08sNT10TyE4blEkSVdPLDU9cU8hOVVRJElXTyw1PXFPITlnUSRJWk8xRzBxTyE8dVEkSVpPMUcwdE8hQFFRJElXTyw1PXZPIUBbUSRJV08sNT12TyFAZFEkSVtPLDU9dk8vZ1EkSVdPMUcwdk8hQG5RJElXTzFHMHZPM1VRJElXTzFHMHtPTmxRJElXTzFHMH1PT1EkSVYsNTtXLDU7V08hQHNRJElZTyw1O1dPIUB4USRJWk8xRzB3TyFEWlEkSVdPJyNGb08zVVEkSVdPMUcwd08zVVEkSVdPMUcwd08hRGhRJElXTyw1PXdPIUR1USRJV08sNT13Ty98USRJV08sNT13T09RJElWMUcwezFHMHtPIUR9USRJV08nI0V5TyFFYFElMWBPMUcwfU9PUSRJVjFHMVMxRzFTTzNVUSRJV08xRzFTT09RJElTLDU9WSw1PVlPT1EkSVMnI0RuJyNEbk8vZ1EkSVdPLDU9WU8hRWhRJElXTyw1PVhPIUV7USRJV08sNT1YT09RJElTMUcvczFHL3NPIUZUUSRJV08sNT1aTyFGZVEkSVdPLDU9Wk8hRm1RJElXTyw1PVpPIUdRUSRJV08sNT1aTyFHYlEkSVdPLDU9Wk9PUSRJUzcrJWE3KyVhT09RJElTNyskZTcrJGVPITVjUSRJV083KyRtTyFJVFEkSVdPMUcueU8hSVtRJElXTzFHLnlPT1EkSVMxRy9dMUcvXU9PUSRJUyw1O3AsNTtwTydSUSRJV08sNTtwT09RJElTNyskfTcrJH1PIUljUSRJV083KyR9T09RJElTLUU5Uy1FOVNPT1EkSVM3KyVPNyslT08hSXNRJElXTyw1PVJPJ1JRJElXTyw1PVJPT1EkSVM3KyRjNyskY08hSXhRJElXTzcrJH1PIUpRUSRJV083KyVPTyFKVlEkSVdPMUcycU9PUSRJUzcrJVY3KyVWTyFKZ1EkSVdPMUcycU8hSm9RJElXTzcrJVZPT1EkSVMsNTtvLDU7b08nUlEkSVdPLDU7b08hSnRRJElXTzFHMmxPT1EkSVMtRTlSLUU5Uk8hS2tRJElXTzcrJVpPT1EkSVM3KyVdNyslXU8hS3lRJElXTzFHMmxPIUxoUSRJV083KyVdTyFMbVEkSVdPMUcyck8hTH1RJElXTzFHMnJPIU1WUSRJV083KyVaTyFNW1EkSVdPLDU9Zk8hTXJRJElXTyw1PWZPIU1yUSRJV08sNT1mTyFOUU8hTFFPJyNEd08hTl1PU08nI0d7T09PTzFHL3sxRy97TyFOYlEkSVdPMUcve08hTmpRJUdsTzcrJ3FPIyBaUSRJW08xRzFqUCMgdFEkSVdPJyNGZE9PUSRJUyw1PFIsNTxST09RJElTLUU5ZS1FOWVPT1EkSVM3KyZxNysmcU9PUSRJUzFHMmgxRzJoT09RJElTLDU7biw1O25PT1EkSVMtRTlRLUU5UU9PUSRJUzcrJHA3KyRwTyMhUlEkSVdPLDU8a08jIWxRJElXTyw1PGtPIyF9USRJW08sNTtxTyMjYlEkSVdPMUcybk9PUSRJUy1FOVQtRTlUT09RJElTNysmUDcrJlBPIyNyUSRJV083KyZQT09RJElTNysmUjcrJlJPIyRRUSRJV08nI0hYTy98USRJV083KyZSTyMkZlEkSVdPNysmUk9PUSRJUyw1PFUsNTxVTyMkcVEkSVdPMUczYE9PUSRJUy1FOWgtRTloT09RJElTLDU8USw1PFFPIyVQUSRJV08xRzNdT09RJElTLUU5ZC1FOWRPIyVnUSRJWk83KyZdTyFEWlEkSVdPJyNGbU8zVVEkSVdPNysmXU8zVVEkSVdPNysmYE8jKHVRJElbTyw1PFlPJ1JRJElXTyw1PFlPIylQUSRJV08xRzNiT09RJElTLUU5bC1FOWxPIylaUSRJV08xRzNiTzNVUSRJV083KyZiTy9nUSRJV083KyZiT09RJElWNysmZzcrJmdPIUVgUSUxYE83KyZpTyMpY1EkSVhPMUcwck9PUSRJVi1FOW0tRTltTzNVUSRJV083KyZjTzNVUSRJV083KyZjT09RJElWLDU8Wiw1PFpPIytVUSRJV08sNTxaT09RJElWNysmYzcrJmNPIythUSRJWk83KyZjTyMubFEkSVdPLDU8W08jLndRJElXTzFHM2NPT1EkSVMtRTluLUU5bk8jL1VRJElXTzFHM2NPIy9eUSRJV08nI0hfTyMvbFEkSVdPJyNIX08vfFEkSVdPJyNIX09PUSRJUycjSF8nI0hfTyMvd1EkSVdPJyNIXk9PUSRJUyw1O2UsNTtlTyMwUFEkSVdPLDU7ZU8vZ1EkSVdPJyNFe09PUSRJVjcrJmk3KyZpTzNVUSRJV083KyZpT09RJElWNysmbjcrJm5PT1EkSVMxRzJ0MUcydE9PUSRJUyw1O3MsNTtzTyMwVVEkSVdPMUcyc09PUSRJUy1FOVYtRTlWTyMwaVEkSVdPLDU7dE8jMHRRJElXTyw1O3RPIzFYUSRJV08xRzJ1T09RJElTLUU5Vy1FOVdPIzFpUSRJV08xRzJ1TyMxcVEkSVdPMUcydU8jMlJRJElXTzFHMnVPIzFpUSRJV08xRzJ1T09RJElTPDxIWDw8SFhPIzJeUSRJW08xRzFbT09RJElTPDxIaTw8SGlQIzJrUSRJV08nI0ZVTzZ8USRJV08xRzJtTyMyeFEkSVdPMUcybU8jMn1RJElXTzw8SGlPT1EkSVM8PEhqPDxIak8jM19RJElXTzcrKF1PT1EkSVM8PEhxPDxIcU8jM29RJElbTzFHMVpQIzRgUSRJV08nI0ZUTyM0bVEkSVdPNysoXk8jNH1RJElXTzcrKF5PIzVWUSRJV088PEh1TyM1W1EkSVdPNysoV09PUSRJUzw8SHc8PEh3TyM2UlEkSVdPLDU7ck8nUlEkSVdPLDU7ck9PUSRJUy1FOVUtRTlVT09RJElTPDxIdTw8SHVPT1EkSVMsNTt4LDU7eE8vZ1EkSVdPLDU7eE8jNldRJElXTzFHM1FPT1EkSVMtRTlbLUU5W08jNm5RJElXTzFHM1FPT09PJyNGXycjRl9PIzZ8TyFMUU8sNTpjT09PTyw1PWcsNT1nT09PTzcrJWc3KyVnTyM3WFEkSVdPMUcyVk8jN3JRJElXTzFHMlZQJ1JRJElXTycjRlZPL2dRJElXTzw8SWtPIzhUUSRJV08sNT1zTyM4ZlEkSVdPLDU9c08vfFEkSVdPLDU9c08jOHdRJElXTzw8SW1PT1EkSVM8PEltPDxJbU8vfFEkSVdPPDxJbVAvfFEkSVdPJyNGalAvZ1EkSVdPJyNGZk9PUSRJVi1FOWstRTlrTzNVUSRJV088PEl3T09RJElWLDU8WCw1PFhPM1VRJElXTyw1PFhPT1EkSVY8PEl3PDxJd09PUSRJVjw8SXo8PEl6TyM4fFEkSVtPMUcxdFAjOVdRJElXTycjRm5PIzlfUSRJV083Kyh8TyM5aVEkSVpPPDxJfE8zVVEkSVdPPDxJfE9PUSRJVjw8SlQ8PEpUTzNVUSRJV088PEpUT09RJElWJyNGbCcjRmxPIzx0USRJWk83KyZeT09RJElWPDxJfTw8SX1PIz5tUSRJWk88PEl9T09RJElWMUcxdTFHMXVPL3xRJElXTzFHMXVPM1VRJElXTzw8SX1PL3xRJElXTzFHMXZQL2dRJElXTycjRnBPI0F4USRJV083Kyh9TyNCVlEkSVdPNysofU9PUSRJUycjRXonI0V6Ty9nUSRJV08sNT15TyNCX1EkSVdPLDU9eU9PUSRJUyw1PXksNT15TyNCalEkSVdPLDU9eE8jQntRJElXTyw1PXhPT1EkSVMxRzFQMUcxUE9PUSRJUyw1O2csNTtnUCNDVFEkSVdPJyNGWE8jQ2VRJElXTzFHMWBPI0N4USRJV08xRzFgTyNEWVEkSVdPMUcxYFAjRGVRJElXTycjRllPI0RyUSRJV083KyhhTyNFU1EkSVdPNysoYU8jRVNRJElXTzcrKGFPI0VbUSRJV083KyhhTyNFbFEkSVdPNysoWE82fFEkSVdPNysoWE9PUSRJU0FOPlRBTj5UTyNGVlEkSVdPPDxLeE9PUSRJU0FOPmFBTj5hTy9nUSRJV08xRzFeTyNGZ1EkSVtPMUcxXlAjRnFRJElXTycjRldPT1EkSVMxRzFkMUcxZFAjR09RJElXTycjRl5PI0ddUSRJV083KyhsT09PTy1FOV0tRTldTyNHc1EkSVdPNysncU9PUSRJU0FOP1ZBTj9WTyNIXlEkSVdPLDU8VE8jSHJRJElXTzFHM19PT1EkSVMtRTlnLUU5Z08jSVRRJElXTzFHM19PT1EkSVNBTj9YQU4/WE8jSWZRJElXT0FOP1hPT1EkSVZBTj9jQU4/Y09PUSRJVjFHMXMxRzFzTzNVUSRJV09BTj9oTyNJa1EkSVpPQU4/aE9PUSRJVkFOP29BTj9vT09RJElWLUU5ai1FOWpPT1EkSVY8PEl4PDxJeE8zVVEkSVdPQU4/aU8zVVEkSVdPNysnYU9PUSRJVkFOP2lBTj9pT09RJElTNysnYjcrJ2JPI0x2USRJV088PExpT09RJElTMUczZTFHM2VPL2dRJElXTzFHM2VPT1EkSVMsNTxdLDU8XU8jTVRRJElXTzFHM2RPT1EkSVMtRTlvLUU5b08jTWZRJElXTzcrJnpPI012USRJV083KyZ6T09RJElTNysmejcrJnpPI05SUSRJV088PEt7TyNOY1EkSVdPPDxLe08jTmNRJElXTzw8S3tPI05rUSRJV08nI0dpT09RJElTPDxLczw8S3NPI051USRJV088PEtzT09RJElTNysmeDcrJnhPL3xRJElXTzFHMW9QL3xRJElXTycjRmlPJCBgUSRJV083Kyh5TyQgcVEkSVdPNysoeU9PUSRJU0cyNHNHMjRzT09RJElWRzI1U0cyNVNPM1VRJElXT0cyNVNPT1EkSVZHMjVURzI1VE9PUSRJVjw8Sns8PEp7T09RJElTNyspUDcrKVBQJCFTUSRJV08nI0ZxT09RJElTPDxKZjw8SmZPJCFiUSRJV088PEpmTyQhclEkSVdPQU5BZ08kI1NRJElXT0FOQWdPJCNbUSRJV08nI0dqT09RJElTJyNHaicjR2pPMGhRJElXTycjRGFPJCN1USRJV08sNT1UT09RJElTQU5BX0FOQV9PT1EkSVM3KydaNysnWk8kJF5RJElXTzw8TGVPT1EkSVZMRCpuTEQqbk9PUSRJU0FOQFFBTkBRTyQkb1EkSVdPRzI3Uk8kJVBRJElXTyw1OXtPT1EkSVMxRzJvMUcyb08jTmtRJElXTzFHL2dPT1EkSVM3KyVSNyslUk82fFEkSVdPJyNDek82fFEkSVdPLDU5X082fFEkSVdPLDU5X082fFEkSVdPLDU5X08kJVVRJElbTyw1PGtPNnxRJElXTzFHLnlPL2dRJElXTzFHL1VPL2dRJElXTzcrJG1QJCVpUSRJV08nI0ZkTydSUSRJV08nI0dQTyQldlEkSVdPLDU5X08kJXtRJElXTyw1OV9PJCZTUSRJV08sNTlqTyQmWFEkSVdPMUcvUk8waFEkSVdPJyNET082fFEkSVdPLDU5Z1wiLFxuICBzdGF0ZURhdGE6IFwiJCZvfk8kb09TJGxPUyRrT1NRT1N+T1BoT1RlT2RzT2ZYT2x0T3AhU09zdU98dk99IVBPIVIhVk8hUyFVTyFWWU8hWlpPIWZkTyFtZE8hbmRPIW9kTyF2eE8heHlPIXp6TyF8e08jT3xPI1N9TyNVIU9PI1ghUU8jWSFRTyNbIVJPI2MhVE8jZiFXTyNqIVhPI2whWU8jcSFaTyN0bE8kanFPJHpRTyR7UU8lUFJPJVFWTyVlW08lZl1PJWleTyVsX08lcmBPJXVhTyV3Yk9+T1QhYU9dIWFPXyFiT2YhaU8hViFrTyFkIWxPJHUhW08kdiFdTyR3IV5PJHghX08keSFfTyR6IWBPJHshYE8kfCFhTyR9IWFPJU8hYU9+T2glVFhpJVRYaiVUWGslVFhsJVRYbSVUWHAlVFh3JVRYeCVUWCFzJVRYI14lVFgkaiVUWCRtJVRYJVYlVFghTyVUWCFSJVRYIVMlVFglVyVUWCFXJVRYIVslVFh9JVRYI1YlVFhxJVRYIWolVFh+UCRfT2RzT2ZYTyFWWU8hWlpPIWZkTyFtZE8hbmRPIW9kTyR6UU8ke1FPJVBSTyVRVk8lZVtPJWZdTyVpXk8lbF9PJXJgTyV1YU8ld2JPfk93JVNYeCVTWCNeJVNYJGolU1gkbSVTWCVWJVNYfk9oIW9PaSFwT2ohbk9rIW5PbCFxT20hck9wIXNPIXMlU1h+UChgT1QheU9sLWZPcy10T3x2T35QJ1JPVCF8T2wtZk9zLXRPIVchfU9+UCdST1QjUU9fI1JPbC1mT3MtdE8hWyNTT35QJ1JPJWcjVk8laCNYT35PJWojWU8layNYT35PIVojW08lbSNdTyVxI19Pfk8hWiNbTyVzI2BPJXQjX09+TyFaI1tPJWgjX08ldiNiT35PIVojW08layNfTyV4I2RPfk9UJHRYXSR0WF8kdFhmJHRYaCR0WGkkdFhqJHRYayR0WGwkdFhtJHRYcCR0WHckdFghViR0WCFkJHRYJHUkdFgkdiR0WCR3JHRYJHgkdFgkeSR0WCR6JHRYJHskdFgkfCR0WCR9JHRYJU8kdFghTyR0WCFSJHRYIVMkdFh+TyVlW08lZl1PJWleTyVsX08lcmBPJXVhTyV3Yk94JHRYIXMkdFgjXiR0WCRqJHRYJG0kdFglViR0WCVXJHRYIVckdFghWyR0WH0kdFgjViR0WHEkdFghaiR0WH5QK3VPdyNpT3gkc1ghcyRzWCNeJHNYJGokc1gkbSRzWCVWJHNYfk9sLWZPcy10T35QJ1JPI14jbE8kaiNuTyRtI25Pfk8lUVZPfk8hUiNzTyNsIVlPI3EhWk8jdGxPfk9sdE9+UCdST1QjeE9fI3lPJVFWT3h0UH5PVCN9T2wtZk9zLXRPfSRPT35QJ1JPeCRRTyFzJFZPJVYkUk8jXiF0WCRqIXRYJG0hdFh+T1QjfU9sLWZPcy10TyNeIX1YJGohfVgkbSF9WH5QJ1JPbC1mT3MtdE8jXiNSWCRqI1JYJG0jUlh+UCdSTyFkJF1PIW0kXU8lUVZPfk9UJGdPflAnUk8hUyRpTyNqJGpPI2wka09+T3gkbE9+T1Qkek9fJHpPbC1mT3MtdE8hTyR8T35QJ1JPbC1mT3MtdE94JVBPflAnUk8lZCVST35PXyFiT2YhaU8hViFrTyFkIWxPVGBhXWBhaGBhaWBhamBha2BhbGBhbWBhcGBhd2BheGBhIXNgYSNeYGEkamBhJG1gYSR1YGEkdmBhJHdgYSR4YGEkeWBhJHpgYSR7YGEkfGBhJH1gYSVPYGElVmBhIU9gYSFSYGEhU2BhJVdgYSFXYGEhW2BhfWBhI1ZgYXFgYSFqYGF+T2slV09+T2wlV09+UCdST2wtZk9+UCdST2gtaE9pLWlPai1nT2stZ09sLXBPbS1xT3AtdU8hTyVTWCFSJVNYIVMlU1glVyVTWCFXJVNYIVslU1h9JVNYI1YlU1ghaiVTWH5QKGBPJVclWU93JVJYIU8lUlghUiVSWCFTJVJYIVclUlh4JVJYfk93JV1PIU8lW08hUiVhTyFTJWBPfk8hTyVbT35PdyVkTyFSJWFPIVMlYE8hVyVfWH5PIVclaE9+T3claU94JWtPIVIlYU8hUyVgTyFbJVlYfk8hWyVvT35PIVslcE9+TyVnI1ZPJWglck9+TyVqI1lPJWslck9+T1QldU9sLWZPcy10T3x2T35QJ1JPIVojW08lbSNdTyVxJXhPfk8hWiNbTyVzI2BPJXQleE9+TyFaI1tPJWgleE8ldiNiT35PIVojW08layV4TyV4I2RPfk9UIWxhXSFsYV8hbGFmIWxhaCFsYWkhbGFqIWxhayFsYWwhbGFtIWxhcCFsYXchbGF4IWxhIVYhbGEhZCFsYSFzIWxhI14hbGEkaiFsYSRtIWxhJHUhbGEkdiFsYSR3IWxhJHghbGEkeSFsYSR6IWxhJHshbGEkfCFsYSR9IWxhJU8hbGElViFsYSFPIWxhIVIhbGEhUyFsYSVXIWxhIVchbGEhWyFsYX0hbGEjViFsYXEhbGEhaiFsYX5QI3ZPdyV9T3gkc2EhcyRzYSNeJHNhJGokc2EkbSRzYSVWJHNhflAkX09UJlBPbHRPc3VPeCRzYSFzJHNhI14kc2EkaiRzYSRtJHNhJVYkc2F+UCdST3clfU94JHNhIXMkc2EjXiRzYSRqJHNhJG0kc2ElViRzYX5PUGhPVGVPbHRPc3VPfHZPfSFQTyF2eE8heHlPIXp6TyF8e08jT3xPI1N9TyNVIU9PI1ghUU8jWSFRTyNbIVJPI14kX1gkaiRfWCRtJF9YflAnUk8jXiNsTyRqJlVPJG0mVU9+TyFkJlZPZiV6WCRqJXpYI1YlelgjXiV6WCRtJXpYI1Ulelh+T2YhaU8kaiZYT35PaGNhaWNhamNha2NhbGNhbWNhcGNhd2NheGNhIXNjYSNeY2EkamNhJG1jYSVWY2EhT2NhIVJjYSFTY2ElV2NhIVdjYSFbY2F9Y2EjVmNhcWNhIWpjYX5QJF9PcG5hd25heG5hI15uYSRqbmEkbW5hJVZuYX5PaCFvT2khcE9qIW5PayFuT2whcU9tIXJPIXNuYX5QRFRPJVYmWk93JVVYeCVVWH5PJVFWT3clVVh4JVVYfk93Jl5PeHRYfk94JmBPfk93JWlPI14lWVgkaiVZWCRtJVlYIU8lWVh4JVlYIVslWVghaiVZWCVWJVlYfk9ULW9PbC1mT3MtdE98dk9+UCdSTyVWJFJPI15TYSRqU2EkbVNhfk8lViRST35PdyZpTyNeJVtYJGolW1gkbSVbWGslW1h+UCRfT3cmbE99JmtPI14jUmEkaiNSYSRtI1Jhfk8jViZtTyNeI1RhJGojVGEkbSNUYX5PIWQkXU8hbSRdTyNVJm9PJVFWT35PI1Umb09+T3cmcU8jXiV8WCRqJXxYJG0lfFh+T3cmc08jXiV5WCRqJXlYJG0leVh4JXlYfk93JndPayZPWH5QJF9PayZ6T35PUGhPVGVPbHRPc3VPfHZPfSFQTyF2eE8heHlPIXp6TyF8e08jT3xPI1N9TyNVIU9PI1ghUU8jWSFRTyNbIVJPJGonUE9+UCdST3EnVE8jZydSTyNoJ1NPUCNlYVQjZWFkI2VhZiNlYWwjZWFwI2VhcyNlYXwjZWF9I2VhIVIjZWEhUyNlYSFWI2VhIVojZWEhZiNlYSFtI2VhIW4jZWEhbyNlYSF2I2VhIXgjZWEheiNlYSF8I2VhI08jZWEjUyNlYSNVI2VhI1gjZWEjWSNlYSNbI2VhI2MjZWEjZiNlYSNqI2VhI2wjZWEjcSNlYSN0I2VhJGcjZWEkaiNlYSR6I2VhJHsjZWElUCNlYSVRI2VhJWUjZWElZiNlYSVpI2VhJWwjZWElciNlYSV1I2VhJXcjZWEkaSNlYSRtI2Vhfk93J1VPI1YnV094JlBYfk9mJ1lPfk9mIWlPeCRsT35PVCFhT10hYU9fIWJPZiFpTyFWIWtPIWQhbE8kdyFeTyR4IV9PJHkhX08keiFgTyR7IWBPJHwhYU8kfSFhTyVPIWFPaFVpaVVpalVpa1VpbFVpbVVpcFVpd1VpeFVpIXNVaSNeVWkkalVpJG1VaSR1VWklVlVpIU9VaSFSVWkhU1VpJVdVaSFXVWkhW1VpfVVpI1ZVaXFVaSFqVWl+TyR2IV1PflBOeU8kdlVpflBOeU9UIWFPXSFhT18hYk9mIWlPIVYha08hZCFsTyR6IWBPJHshYE8kfCFhTyR9IWFPJU8hYU9oVWlpVWlqVWlrVWlsVWltVWlwVWl3VWl4VWkhc1VpI15VaSRqVWkkbVVpJHVVaSR2VWkkd1VpJVZVaSFPVWkhUlVpIVNVaSVXVWkhV1VpIVtVaX1VaSNWVWlxVWkhalVpfk8keCFfTyR5IV9PflAhI3RPJHhVaSR5VWl+UCEjdE9fIWJPZiFpTyFWIWtPIWQhbE9oVWlpVWlqVWlrVWlsVWltVWlwVWl3VWl4VWkhc1VpI15VaSRqVWkkbVVpJHVVaSR2VWkkd1VpJHhVaSR5VWkkelVpJHtVaSVWVWkhT1VpIVJVaSFTVWklV1VpIVdVaSFbVWl9VWkjVlVpcVVpIWpVaX5PVCFhT10hYU8kfCFhTyR9IWFPJU8hYU9+UCEmck9UVWldVWkkfFVpJH1VaSVPVWl+UCEmck8hUiVhTyFTJWBPdyViWCFPJWJYfk8lVidfTyVXJ19PflArdU93J2FPIU8lYVh+TyFPJ2NPfk93J2RPeCdmTyFXJWNYfk9sLWZPcy10T3cnZE94J2dPIVclY1h+UCdSTyFXJ2lPfk9qIW5PayFuT2whcU9tIXJPaGdpcGdpd2dpeGdpIXNnaSNeZ2kkamdpJG1naSVWZ2l+T2khcE9+UCErZU9pZ2l+UCErZU9oLWhPaS1pT2otZ09rLWdPbC1wT20tcU9+T3Ena09+UCEsbk9UJ3BPbC1mT3MtdE8hTydxT35QJ1JPdydyTyFPJ3FPfk8hTyd0T35PIVMndk9+T3cnck8hTyd3TyFSJWFPIVMlYE9+UCRfT2gtaE9pLWlPai1nT2stZ09sLXBPbS1xTyFPbmEhUm5hIVNuYSVXbmEhV25hIVtuYX1uYSNWbmFxbmEham5hflBEVE9UJ3BPbC1mT3MtdE8hVyVfYX5QJ1JPdyd6TyFXJV9hfk8hVyd7T35Pdyd6TyFSJWFPIVMlYE8hVyVfYX5QJF9PVChQT2wtZk9zLXRPIVslWWEjXiVZYSRqJVlhJG0lWWEhTyVZYXglWWEhaiVZYSVWJVlhflAnUk93KFFPIVslWWEjXiVZYSRqJVlhJG0lWWEhTyVZYXglWWEhaiVZYSVWJVlhfk8hWyhUT35PdyhRTyFSJWFPIVMlYE8hWyVZYX5QJF9PdyhXTyFSJWFPIVMlYE8hWyVgYX5QJF9PdyhaT3glblghWyVuWCFqJW5Yfk94KF5PIVsoYE8haihhT35PVCZQT2x0T3N1T3gkc2khcyRzaSNeJHNpJGokc2kkbSRzaSVWJHNpflAnUk93KGJPeCRzaSFzJHNpI14kc2kkaiRzaSRtJHNpJVYkc2l+TyFkJlZPZiV6YSRqJXphI1YlemEjXiV6YSRtJXphI1UlemF+TyRqKGdPfk9UI3hPXyN5TyVRVk9+T3cmXk94dGF+T2x0T3N1T35QJ1JPdyhRTyNeJVlhJGolWWEkbSVZYSFPJVlheCVZYSFbJVlhIWolWWElViVZYX5QJF9PdyhsTyNeJHNYJGokc1gkbSRzWCVWJHNYfk8lViRSTyNeU2kkalNpJG1TaX5PI14lW2EkaiVbYSRtJVthayVbYX5QJ1JPdyhvTyNeJVthJGolW2EkbSVbYWslW2F+T1Qoc09mKHVPJVFWT35PI1Uodk9+TyVRVk8jXiV8YSRqJXxhJG0lfGF+T3coeE8jXiV8YSRqJXxhJG0lfGF+T2wtZk9zLXRPI14leWEkaiV5YSRtJXlheCV5YX5QJ1JPdyh7TyNeJXlhJGoleWEkbSV5YXgleWF+T3EpUE8jYSlPT1AjX2lUI19pZCNfaWYjX2lsI19pcCNfaXMjX2l8I19pfSNfaSFSI19pIVMjX2khViNfaSFaI19pIWYjX2khbSNfaSFuI19pIW8jX2khdiNfaSF4I19pIXojX2khfCNfaSNPI19pI1MjX2kjVSNfaSNYI19pI1kjX2kjWyNfaSNjI19pI2YjX2kjaiNfaSNsI19pI3EjX2kjdCNfaSRnI19pJGojX2kkeiNfaSR7I19pJVAjX2klUSNfaSVlI19pJWYjX2klaSNfaSVsI19pJXIjX2kldSNfaSV3I19pJGkjX2kkbSNfaX5PcSlRT1AjYmlUI2JpZCNiaWYjYmlsI2JpcCNiaXMjYml8I2JpfSNiaSFSI2JpIVMjYmkhViNiaSFaI2JpIWYjYmkhbSNiaSFuI2JpIW8jYmkhdiNiaSF4I2JpIXojYmkhfCNiaSNPI2JpI1MjYmkjVSNiaSNYI2JpI1kjYmkjWyNiaSNjI2JpI2YjYmkjaiNiaSNsI2JpI3EjYmkjdCNiaSRnI2JpJGojYmkkeiNiaSR7I2JpJVAjYmklUSNiaSVlI2JpJWYjYmklaSNiaSVsI2JpJXIjYmkldSNiaSV3I2JpJGkjYmkkbSNiaX5PVClTT2smT2F+UCdST3cpVE9rJk9hfk93KVRPayZPYX5QJF9PaylYT35PJGgpW09+T3EpX08jZydSTyNoKV5PUCNlaVQjZWlkI2VpZiNlaWwjZWlwI2VpcyNlaXwjZWl9I2VpIVIjZWkhUyNlaSFWI2VpIVojZWkhZiNlaSFtI2VpIW4jZWkhbyNlaSF2I2VpIXgjZWkheiNlaSF8I2VpI08jZWkjUyNlaSNVI2VpI1gjZWkjWSNlaSNbI2VpI2MjZWkjZiNlaSNqI2VpI2wjZWkjcSNlaSN0I2VpJGcjZWkkaiNlaSR6I2VpJHsjZWklUCNlaSVRI2VpJWUjZWklZiNlaSVpI2VpJWwjZWklciNlaSV1I2VpJXcjZWkkaSNlaSRtI2Vpfk9sLWZPcy10T3gkbE9+UCdST2wtZk9zLXRPeCZQYX5QJ1JPdyllT3gmUGF+T1QpaU9fKWpPIU8pbU8kfClrTyVRVk9+T3gkbE8mUylvT35PVCR6T18kek9sLWZPcy10TyFPJWFhflAnUk93KXVPIU8lYWF+T2wtZk9zLXRPeCl4TyFXJWNhflAnUk93KXlPIVclY2F+T2wtZk9zLXRPdyl5T3gpfE8hVyVjYX5QJ1JPbC1mT3MtdE93KXlPIVclY2F+UCdST3cpeU94KXxPIVclY2F+T2otZ09rLWdPbC1wT20tcU9oZ2lwZ2l3Z2khT2dpIVJnaSFTZ2klV2dpIVdnaXhnaSFbZ2kjXmdpJGpnaSRtZ2l9Z2kjVmdpcWdpIWpnaSVWZ2l+T2ktaU9+UCFHbU9pZ2l+UCFHbU9UJ3BPbC1mT3MtdE8hTypST35QJ1JPaypUT35PdypWTyFPKlJPfk8hTypXT35PVCdwT2wtZk9zLXRPIVclX2l+UCdST3cqWE8hVyVfaX5PIVcqWU9+T1QoUE9sLWZPcy10TyFbJVlpI14lWWkkaiVZaSRtJVlpIU8lWWl4JVlpIWolWWklViVZaX5QJ1JPdypdTyFSJWFPIVMlYE8hWyVgaX5PdypgTyFbJVlpI14lWWkkaiVZaSRtJVlpIU8lWWl4JVlpIWolWWklViVZaX5PIVsqYU9+T18qY09sLWZPcy10TyFbJWBpflAnUk93Kl1PIVslYGl+TyFbKmVPfk9UKmdPbC1mT3MtdE94JW5hIVslbmEhaiVuYX5QJ1JPdypoT3glbmEhWyVuYSFqJW5hfk8hWiNbTyVwKmtPIVsha1h+TyFbKm1Pfk94KF5PIVsqbk9+T1QmUE9sdE9zdU94JHNxIXMkc3EjXiRzcSRqJHNxJG0kc3ElViRzcX5QJ1JPdyRXaXgkV2khcyRXaSNeJFdpJGokV2kkbSRXaSVWJFdpflAkX09UJlBPbHRPc3VPflAnUk9UJlBPbC1mT3MtdE8jXiRzYSRqJHNhJG0kc2ElViRzYX5QJ1JPdypvTyNeJHNhJGokc2EkbSRzYSVWJHNhfk93I3lhI14jeWEkaiN5YSRtI3lhayN5YX5QJF9PI14lW2kkaiVbaSRtJVtpayVbaX5QJ1JPdypyTyNeI1JxJGojUnEkbSNScX5PdypzTyNWKnVPI14le1gkaiV7WCRtJXtYIU8le1h+T1Qqd09mKnhPJVFWT35PJVFWTyNeJXxpJGolfGkkbSV8aX5PbC1mT3MtdE8jXiV5aSRqJXlpJG0leWl4JXlpflAnUk9xKnxPI2EpT09QI19xVCNfcWQjX3FmI19xbCNfcXAjX3FzI19xfCNfcX0jX3EhUiNfcSFTI19xIVYjX3EhWiNfcSFmI19xIW0jX3EhbiNfcSFvI19xIXYjX3EheCNfcSF6I19xIXwjX3EjTyNfcSNTI19xI1UjX3EjWCNfcSNZI19xI1sjX3EjYyNfcSNmI19xI2ojX3EjbCNfcSNxI19xI3QjX3EkZyNfcSRqI19xJHojX3EkeyNfcSVQI19xJVEjX3ElZSNfcSVmI19xJWkjX3ElbCNfcSVyI19xJXUjX3EldyNfcSRpI19xJG0jX3F+T2skYmF3JGJhflAkX09UKVNPayZPaX5QJ1JPdytUT2smT2l+T1BoT1RlT2x0T3AhU09zdU98dk99IVBPIVIhVk8hUyFVTyF2eE8heHlPIXp6TyF8e08jT3xPI1N9TyNVIU9PI1ghUU8jWSFRTyNbIVJPI2MhVE8jZiFXTyNqIVhPI2whWU8jcSFaTyN0bE9+UCdST3crX094JGxPI1YrX09+TyNoK2BPUCNlcVQjZXFkI2VxZiNlcWwjZXFwI2VxcyNlcXwjZXF9I2VxIVIjZXEhUyNlcSFWI2VxIVojZXEhZiNlcSFtI2VxIW4jZXEhbyNlcSF2I2VxIXgjZXEheiNlcSF8I2VxI08jZXEjUyNlcSNVI2VxI1gjZXEjWSNlcSNbI2VxI2MjZXEjZiNlcSNqI2VxI2wjZXEjcSNlcSN0I2VxJGcjZXEkaiNlcSR6I2VxJHsjZXElUCNlcSVRI2VxJWUjZXElZiNlcSVpI2VxJWwjZXElciNlcSV1I2VxJXcjZXEkaSNlcSRtI2Vxfk8jVithT3ckZGF4JGRhfk9sLWZPcy10T3gmUGl+UCdST3crY094JlBpfk94JFFPJVYrZU93JlJYIU8mUlh+TyVRVk93JlJYIU8mUlh+T3craU8hTyZRWH5PIU8ra09+T1Qkek9fJHpPbC1mT3MtdE8hTyVhaX5QJ1JPeCtuT3cjfGEhVyN8YX5PbC1mT3MtdE94K29PdyN8YSFXI3xhflAnUk9sLWZPcy10T3gpeE8hVyVjaX5QJ1JPdytyTyFXJWNpfk9sLWZPcy10T3crck8hVyVjaX5QJ1JPdytyT3grdU8hVyVjaX5PdyN4aSFPI3hpIVcjeGl+UCRfT1QncE9sLWZPcy10T35QJ1JPayt3T35PVCdwT2wtZk9zLXRPIU8reE9+UCdST1QncE9sLWZPcy10TyFXJV9xflAnUk93I3dpIVsjd2kjXiN3aSRqI3dpJG0jd2khTyN3aXgjd2khaiN3aSVWI3dpflAkX09UKFBPbC1mT3MtdE9+UCdST18qY09sLWZPcy10TyFbJWBxflAnUk93K3lPIVslYHF+TyFbK3pPfk9UKFBPbC1mT3MtdE8hWyVZcSNeJVlxJGolWXEkbSVZcSFPJVlxeCVZcSFqJVlxJVYlWXF+UCdST3gre09+T1QqZ09sLWZPcy10T3glbmkhWyVuaSFqJW5pflAnUk93LFFPeCVuaSFbJW5pIWolbml+TyFaI1tPJXAqa08hWyFrYX5PVCZQT2wtZk9zLXRPI14kc2kkaiRzaSRtJHNpJVYkc2l+UCdST3csU08jXiRzaSRqJHNpJG0kc2klViRzaX5PJVFWTyNeJXthJGole2EkbSV7YSFPJXthfk93LFZPI14le2EkaiV7YSRtJXthIU8le2F+TyFPLFlPfk9rJGJpdyRiaX5QJF9PVClTT35QJ1JPVClTT2smT3F+UCdST3EsXk9QI2R5VCNkeWQjZHlmI2R5bCNkeXAjZHlzI2R5fCNkeX0jZHkhUiNkeSFTI2R5IVYjZHkhWiNkeSFmI2R5IW0jZHkhbiNkeSFvI2R5IXYjZHkheCNkeSF6I2R5IXwjZHkjTyNkeSNTI2R5I1UjZHkjWCNkeSNZI2R5I1sjZHkjYyNkeSNmI2R5I2ojZHkjbCNkeSNxI2R5I3QjZHkkZyNkeSRqI2R5JHojZHkkeyNkeSVQI2R5JVEjZHklZSNkeSVmI2R5JWkjZHklbCNkeSVyI2R5JXUjZHkldyNkeSRpI2R5JG0jZHl+T1BoT1RlT2x0T3AhU09zdU98dk99IVBPIVIhVk8hUyFVTyF2eE8heHlPIXp6TyF8e08jT3xPI1N9TyNVIU9PI1ghUU8jWSFRTyNbIVJPI2MhVE8jZiFXTyNqIVhPI2whWU8jcSFaTyN0bE8kaSxiTyRtLGJPflAnUk8jaCxjT1AjZXlUI2V5ZCNleWYjZXlsI2V5cCNleXMjZXl8I2V5fSNleSFSI2V5IVMjZXkhViNleSFaI2V5IWYjZXkhbSNleSFuI2V5IW8jZXkhdiNleSF4I2V5IXojZXkhfCNleSNPI2V5I1MjZXkjVSNleSNYI2V5I1kjZXkjWyNleSNjI2V5I2YjZXkjaiNleSNsI2V5I3EjZXkjdCNleSRnI2V5JGojZXkkeiNleSR7I2V5JVAjZXklUSNleSVlI2V5JWYjZXklaSNleSVsI2V5JXIjZXkldSNleSV3I2V5JGkjZXkkbSNleX5PbC1mT3MtdE94JlBxflAnUk93LGdPeCZQcX5PJVYrZU93JlJhIU8mUmF+T1QpaU9fKWpPJHwpa08lUVZPIU8mUWF+T3csa08hTyZRYX5PVCR6T18kek9sLWZPcy10T35QJ1JPbC1mT3MtdE94LG1PdyN8aSFXI3xpflAnUk9sLWZPcy10T3cjfGkhVyN8aX5QJ1JPeCxtT3cjfGkhVyN8aX5PbC1mT3MtdE94KXhPflAnUk9sLWZPcy10T3gpeE8hVyVjcX5QJ1JPdyxwTyFXJWNxfk9sLWZPcy10T3cscE8hVyVjcX5QJ1JPcCxzTyFSJWFPIVMlYE8hTyVacSFXJVpxIVslWnF3JVpxflAhLG5PXypjT2wtZk9zLXRPIVslYHl+UCdST3cjemkhWyN6aX5QJF9PXypjT2wtZk9zLXRPflAnUk9UKmdPbC1mT3MtdE9+UCdST1QqZ09sLWZPcy10T3glbnEhWyVucSFqJW5xflAnUk9UJlBPbC1mT3MtdE8jXiRzcSRqJHNxJG0kc3ElViRzcX5QJ1JPI1Ysd093JF1hI14kXWEkaiRdYSRtJF1hIU8kXWF+TyVRVk8jXiV7aSRqJXtpJG0le2khTyV7aX5Pdyx5TyNeJXtpJGole2kkbSV7aSFPJXtpfk8hTyx7T35PcSx9T1AjZCFSVCNkIVJkI2QhUmYjZCFSbCNkIVJwI2QhUnMjZCFSfCNkIVJ9I2QhUiFSI2QhUiFTI2QhUiFWI2QhUiFaI2QhUiFmI2QhUiFtI2QhUiFuI2QhUiFvI2QhUiF2I2QhUiF4I2QhUiF6I2QhUiF8I2QhUiNPI2QhUiNTI2QhUiNVI2QhUiNYI2QhUiNZI2QhUiNbI2QhUiNjI2QhUiNmI2QhUiNqI2QhUiNsI2QhUiNxI2QhUiN0I2QhUiRnI2QhUiRqI2QhUiR6I2QhUiR7I2QhUiVQI2QhUiVRI2QhUiVlI2QhUiVmI2QhUiVpI2QhUiVsI2QhUiVyI2QhUiV1I2QhUiV3I2QhUiRpI2QhUiRtI2QhUn5PbC1mT3MtdE94JlB5flAnUk9UKWlPXylqTyR8KWtPJVFWTyFPJlFpfk9sLWZPcy10T3cjfHEhVyN8cX5QJ1JPeC1UT3cjfHEhVyN8cX5PbC1mT3MtdE94KXhPIVclY3l+UCdST3ctVU8hVyVjeX5PbC1mT3MtWU9+UCdST3Asc08hUiVhTyFTJWBPIU8lWnkhVyVaeSFbJVp5dyVaeX5QISxuTyVRVk8jXiV7cSRqJXtxJG0le3EhTyV7cX5Pdy1eTyNeJXtxJGole3EkbSV7cSFPJXtxfk9UKWlPXylqTyR8KWtPJVFWT35PbC1mT3MtdE93I3x5IVcjfHl+UCdST2wtZk9zLXRPeCl4TyFXJWMhUn5QJ1JPdy1hTyFXJWMhUn5PcCVeWCFPJV5YIVIlXlghUyVeWCFXJV5YIVslXlh3JV5YflAhLG5PcCxzTyFSJWFPIVMlYE8hTyVdYSFXJV1hIVslXWF3JV1hfk8lUVZPI14le3kkaiV7eSRtJXt5IU8le3l+T2wtZk9zLXRPeCl4TyFXJWMhWn5QJ1JPeC1kT35PdypvTyNeJHNhJGokc2EkbSRzYSVWJHNhflAkX09UJlBPbC1mT3MtdE9+UCdST2sta09+T2wta09+UCdST3gtbE9+T3EtbU9+UCEsbk8lZiVpJXUldyVlIVolbSVzJXYleCVsJXIlbCVRflwiLFxuICBnb3RvOiBcIiEsdSZTUFBQUCZUUCZdKW4qVCprK1MrbCxWUCxxUCZdLV8tXyZdUCZdUDBwUFBQUFBQMHAzYFBQM2BQNWw1dTp5UFA6fDtbO19QUFAmXSZdUFA7ayZdUFAmXSZdUFAmXSZdJl0mXTtvPGMmXVA8ZlA8aTxpQE9QQGQmXVBQUEBoQG4mVFAmVCZUUCZUUCZUUCZUUCZUUCZUJlQmVFAmVFBQJlRQUCZUUEB0UEB7QVJQQHtQQHtAe1BQUEB7UEJ6UENUQ1pDYUJ6UEB7Q2dQQ25DdEN6RFdEakRwRHpFUUVuRXRFekZRRltGYkZoRm5GdEZ6R15HaEduR3RHekhVSFtIYkhoSG5IeElPSVlJYFBQUFBQUFBQUElpSXFJekpVSmFQUFBQUFBQUFBQUFBOdiEgYCElbiEoelBQISlTISliISlrISphISpXISpqISpwISpzISp2ISp5IStSUFBQUFBQUFBQUCErVSErWFBQUFBQUFBQUCErXyErayErdyEsVCEsVyEsXiEsZCEsaiEsbV1pT3IjbCRsKVsrWidvZE9TWFlaZWhyc3R2eHx9IVIhUyFUIVUhWCFjIWQhZSFmIWchaCFpIWshbiFvIXAhciFzIXkhfCNRI1IjWyNpI2wjfSRPJFEkUyRWJGckaSRqJGwkeiVQJVclWiVdJWAlZCVpJWsldSV9JlAmWyZgJmkmayZsJnMmdyZ6J1InVSdgJ2EnZCdmJ2cnaydwJ3Indid6KFAoUShXKFooYihkKGwobyh7KU8pUylUKVgpWyllKW8pdSl4KXkpfCpTKlQqVipYKlsqXSpgKmMqZypoKm8qcSpyKnorUytUK1orYitjK2YrbStuK28rcStyK3Urdyt5K3srfSxQLFEsUyxnLGksbSxwLHMtVC1VLWEtZC1mLWctaC1pLWstbC1tLW4tby1xLXV3IWNQI2gjdSRXJGYlYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qeSFkUCNoI3UkVyRmJHIlYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qeyFlUCNoI3UkVyRmJHIkcyViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWp9IWZQI2gjdSRXJGYkciRzJHQlYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qIVAhZ1AjaCN1JFckZiRyJHMkdCR1JWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtaiFSIWhQI2gjdSRXJGYkciRzJHQkdSR2JWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtaiFWIWhQIW0jaCN1JFckZiRyJHMkdCR1JHYkdyViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWonb1NPU1hZWmVocnN0dnh8fSFSIVMhVCFVIVghYyFkIWUhZiFnIWghaSFrIW4hbyFwIXIhcyF5IXwjUSNSI1sjaSNsI30kTyRRJFMkViRnJGkkaiRsJHolUCVXJVolXSVgJWQlaSVrJXUlfSZQJlsmYCZpJmsmbCZzJncmeidSJ1UnYCdhJ2QnZidnJ2sncCdyJ3YneihQKFEoVyhaKGIoZChsKG8oeylPKVMpVClYKVspZSlvKXUpeCl5KXwqUypUKlYqWCpbKl0qYCpjKmcqaCpvKnEqcip6K1MrVCtaK2IrYytmK20rbitvK3Ercit1K3creSt7K30sUCxRLFMsZyxpLG0scCxzLVQtVS1hLWQtZi1nLWgtaS1rLWwtbS1uLW8tcS11JlpVT1hZWmhydHZ8fSFSIVMhVCFYIWkhayFuIW8hcCFyIXMjWyNpI2wkTyRRJFMkViRqJGwkeiVQJVclWiVdJWQlaSVrJXUlfSZbJmAmayZsJnMmeidSJ1UnYCdhJ2QnZidnJ2sncid6KFEoVyhaKGIoZChsKHspTylYKVspZSlvKXUpeCl5KXwqUypUKlYqWCpbKl0qYCpnKmgqbypyKnorWitiK2MrZittK24rbytxK3IrdSt3K3kreyt9LFAsUSxTLGcsaSxtLHAscy1ULVUtYS1kLWYtZy1oLWktay1sLW0tbi1xLXUlZVdPWFlaaHJ2fH0hUiFTIVQhWCFpIWsjWyNpI2wkTyRRJFMkViRqJGwkeiVQJVolXSVkJWklayV1JX0mWyZgJmsmbCZzJnonUidVJ2AnYSdkJ2YnZydrJ3IneihRKFcoWihiKGQobCh7KU8pWClbKWUpbyl1KXgpeSl8KlMqVipYKlsqXSpgKmcqaCpvKnIqeitaK2IrYytmK20rbitvK3Ercit1K3kreyt9LFAsUSxTLGcsaSxtLHAtVC1VLWEtbC1tLW5RI3t1US1iLVlSLXItdCdmZE9TWFlaZWhyc3R2eHx9IVIhUyFUIVUhWCFjIWQhZSFmIWchaCFrIW4hbyFwIXIhcyF5IXwjUSNSI1sjaSNsI30kTyRRJFMkViRnJGkkaiRsJHolUCVXJVolXSVgJWQlaSVrJXUlfSZQJlsmYCZpJmsmbCZzJncmeidSJ1UnYCdkJ2YnZydrJ3Ancid2J3ooUChRKFcoWihiKGQobChvKHspTylTKVQpWClbKWUpbyl4KXkpfCpTKlQqVipYKlsqXSpgKmMqZypoKm8qcSpyKnorUytUK1orYitjK2YrbitvK3Ercit1K3creSt7K30sUCxRLFMsZyxpLG0scCxzLVQtVS1hLWQtZi1nLWgtaS1rLWwtbS1uLW8tcS11VyNvbCFPIVAkXlcjd3UmXi1ZLXRRJGAhUVEkcCFZUSRxIVpXJHkhaSdhKXUrbVMmXSN4I3lRJn0ka1EoZSZWUShzJm1XKHQmbyh1KHYqeFUodyZxKHgqeVEpZydXVyloJ1kraSxrLVJTK2gpaSlqWSxVKnMsVix4LHktXlEsWCp1USxkK19RLGYrYVItXSx3UiZbI3dpIXZYWSFTIVQlXSVkJ3IneilPKlMqVipYUiVaIXVRIXpYUSV2I1tRJmUkU1ImaCRWVC1YLHMtZCFVIWpQIW0jaCN1JFckZiRyJHMkdCR1JHYkdyViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWpRJlkjcFInXSRxUidgJHlSJVMhbCduY09TWFlaZWhyc3R2eHx9IVIhUyFUIVUhWCFjIWQhZSFmIWchaCFpIWshbiFvIXAhciFzIXkhfCNRI1IjWyNpI2wjfSRPJFEkUyRWJGckaSRqJGwkeiVQJVclWiVdJWAlZCVpJWsldSV9JlAmWyZgJmkmayZsJnMmdyZ6J1InVSdgJ2EnZCdmJ2cnaydwJ3Indid6KFAoUShXKFooYihkKGwobyh7KU8pUylUKVgpWyllKW8pdSl4KXkpfCpTKlQqVipYKlsqXSpgKmMqZypoKm8qcSpyKnorUytUK1orYitjK2YrbStuK28rcStyK3Urdyt5K3srfSxQLFEsUyxnLGksbSxwLHMtVC1VLWEtZC1mLWctaC1pLWstbC1tLW4tby1xLXVUI2ZjI2dTI11fI15TI2BgI2FTI2JhI2NTI2RiI2VUKmsoXipsVChfJXYoYVEkVXdSK2cpaFgkU3ckVCRVJmdaa09yJGwpWytaWG9PcilbK1pRJG0hV1EmdSRkUSZ2JGVRJ1gkb1EnWyRxUSlZJnxRKWAnUlEpYidTUSljJ1RRKXAnWlEpciddUSp9KU9RK1ApUFErUSlRUStVKVdTK1cpWilxUStbKV5RK10pX1ErXilhUSxbKnxRLF0rT1EsXytWUSxgK1hRLGUrYFEsfCxeUS1PLGNRLVAsZFItXyx9V29PcilbK1pSI3JuUSdaJHBSKVomfVErZiloUixpK2dRKXEnWlIrWClaWm1PbnIpWytaUXJPUiN0clEmXyN6UihqJl9TJWojUCN8UyhSJWooVVQoVSVtJmFRJV4heFElZSF7VydzJV4lZSd4J3xRJ3glYlInfCVnUSZqJFdSKHAmalEoWCVuUSpeKFNUKmQoWCpeUSdiJHtSKXYnYlMnZSVPJVBZKXonZSl7K3MscS1WVSl7J2YnZydoVStzKXwpfSpPUyxxK3QrdVItVixyUSNXXVIlcSNXUSNaXlIlcyNaUSNeX1IldyNeUShbJXRTKmkoWypqUipqKF1RKmwoXlIsUipsUSNhYFIleSNhUSNjYVIleiNjUSNlYlIleyNlUSNnY1IlfCNnUSNqZlEmTyNoVyZSI2omTyhtKnBRKG0mZFIqcC1qUSRUd1MmZiRUJmdSJmckVVEmdCRiUih8JnRRJlcjb1IoZiZXUSReIVBSJm4kXlEqdCh0UyxXKnQselIseixYUSZyJGBSKHkmclEjbWpSJlQjbVErWilbUixhK1pRKH0mdVIqeyh9USZ4JGZTKVUmeClWUilWJnlRJ1EkbVIpXSdRUSdWJG5TKWYnVitkUitkKWdRK2opbFIsbCtqV25PcilbK1pSI3FuU3FPclQrWSlbK1pXcE9yKVsrWlInTyRsWWpPciRsKVsrWlImUyNsW3dPciNsJGwpWytaUiZlJFMmWVBPWFlaaHJ0dnx9IVIhUyFUIVghaSFrIW4hbyFwIXIhcyNbI2kjbCRPJFEkUyRWJGokbCR6JVAlVyVaJV0lZCVpJWsldSV9JlsmYCZrJmwmcyZ6J1InVSdgJ2EnZCdmJ2cnaydyJ3ooUShXKFooYihkKGwoeylPKVgpWyllKW8pdSl4KXkpfCpTKlQqVipYKlsqXSpgKmcqaCpvKnIqeitaK2IrYytmK20rbitvK3Ercit1K3creSt7K30sUCxRLFMsZyxpLG0scCxzLVQtVS1hLWQtZi1nLWgtaS1rLWwtbS1uLXEtdVEhbVNRI2hlUSN1c1UkV3glYCd2UyRmIVUkaVEkciFjUSRzIWRRJHQhZVEkdSFmUSR2IWdRJHchaFElYiF5USVnIXxRJW0jUVElbiNSUSZhI31RJnkkZ1EoYyZQVShuJmkobypxVylSJncpVCtTK1RRKlEncFEqWihQUStSKVNRK3wqY1Itai1vUSF4WFEhe1lRJGQhU1EkZSFUXidvJV0lZCdyJ3oqUypWKlhSK08pT1tmT3IjbCRsKVsrWmghdVhZIVMhVCVdJWQncid6KU8qUypWKlhRI1BaUSNraFMjfHZ8USRafVckYiFSJFYmeilYUyRuIVgkalckeCFpJ2EpdSttUSVPIWtRJXQjW2AmUSNpJX0oYihkKGwqbyxTLW5RJmIkT1EmYyRRUSZkJFNRJ14kelEnaCVQUSduJVpXKE8laShRKlsqYFEoUyVrUShdJXVRKGgmW1MoayZgLWxRKHEma1EociZsVSh6JnMoeyp6USlhJ1JZKWQnVSllK2IrYyxnUSlzJ2BeKXcnZCl5K3ErcixwLVUtYVEpfSdmUSpPJ2dTKlAnay1tVypiKFcqXSt5K31XKmYoWipoLFAsUVErbClvUStwKXhRK3QpfFEsTypnUSxUKnJRLGgrZlEsbituUSxvK29RLHIrdVEsdit7US1RLGlRLVMsbVItYC1UaFRPciNpI2wkbCV9JmAnayhiKGQpWytaJHohdFhZWmh2fH0hUiFTIVQhWCFpIWsjWyRPJFEkUyRWJGokeiVQJVolXSVkJWklayV1JlsmayZsJnMmeidSJ1UnYCdhJ2QnZidnJ3IneihRKFcoWihsKHspTylYKWUpbyl1KXgpeSl8KlMqVipYKlsqXSpgKmcqaCpvKnIqeitiK2MrZittK24rbytxK3IrdSt5K3srfSxQLFEsUyxnLGksbSxwLVQtVS1hLWwtbS1uUSN2dFclVCFuIXItZy1xUSVVIW9RJVYhcFElWCFzUSVjLWZTJ2olVy1rUSdsLWhRJ20taVErdipUUSx1K3dTLVcscy1kUi1zLXVVI3p1LVktdFIoaSZeW2dPciNsJGwpWytaWCF3WCNbJFMkVlEjVVpRJFB2UiRZfFElXyF4USVmIXtRJWwjUFEnXiR4USd5JWJRJ30lZ1EoViVtUShZJW5RKl8oU1EsdCt2US1bLHVSLWMtWlEkWHhRJ3UlYFIqVSd2US1aLHNSLWUtZFIjT1lSI1RaUiR9IWlRJHshaVYpdCdhKXUrbVIlUSFrUiV2I1tRKGAldlIqbihhUSRjIVJRJmgkVlEpVyZ6UitWKVhRI3BsUSRbIU9RJF8hUFImcCReUShzJm9RKnYodVEqdyh2UixaKnhSJGEhUVhwT3IpWytaUSRoIVVSJnskaVEkbyFYUiZ8JGpSKW4nWVEpbCdZVixqK2ksay1SXCIsXG4gIG5vZGVOYW1lczogXCLimqAgcHJpbnQgQ29tbWVudCBTY3JpcHQgQXNzaWduU3RhdGVtZW50ICogQmluYXJ5RXhwcmVzc2lvbiBCaXRPcCBCaXRPcCBCaXRPcCBCaXRPcCBBcml0aE9wIEFyaXRoT3AgQCBBcml0aE9wICoqIFVuYXJ5RXhwcmVzc2lvbiBBcml0aE9wIEJpdE9wIEF3YWl0RXhwcmVzc2lvbiBhd2FpdCBQYXJlbnRoZXNpemVkRXhwcmVzc2lvbiAoIEJpbmFyeUV4cHJlc3Npb24gb3IgYW5kIENvbXBhcmVPcCBpbiBub3QgaXMgVW5hcnlFeHByZXNzaW9uIENvbmRpdGlvbmFsRXhwcmVzc2lvbiBpZiBlbHNlIExhbWJkYUV4cHJlc3Npb24gbGFtYmRhIFBhcmFtTGlzdCBWYXJpYWJsZU5hbWUgQXNzaWduT3AgLCA6IE5hbWVkRXhwcmVzc2lvbiBBc3NpZ25PcCBZaWVsZEV4cHJlc3Npb24geWllbGQgZnJvbSApIFR1cGxlRXhwcmVzc2lvbiBDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiBhc3luYyBmb3IgTGFtYmRhRXhwcmVzc2lvbiBBcnJheUV4cHJlc3Npb24gWyBdIEFycmF5Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24gRGljdGlvbmFyeUV4cHJlc3Npb24geyB9IERpY3Rpb25hcnlDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiBTZXRFeHByZXNzaW9uIFNldENvbXByZWhlbnNpb25FeHByZXNzaW9uIENhbGxFeHByZXNzaW9uIEFyZ0xpc3QgQXNzaWduT3AgTWVtYmVyRXhwcmVzc2lvbiAuIFByb3BlcnR5TmFtZSBOdW1iZXIgU3RyaW5nIEZvcm1hdFN0cmluZyBGb3JtYXRSZXBsYWNlbWVudCBGb3JtYXRDb252ZXJzaW9uIEZvcm1hdFNwZWMgQ29udGludWVkU3RyaW5nIEVsbGlwc2lzIE5vbmUgQm9vbGVhbiBUeXBlRGVmIEFzc2lnbk9wIFVwZGF0ZVN0YXRlbWVudCBVcGRhdGVPcCBFeHByZXNzaW9uU3RhdGVtZW50IERlbGV0ZVN0YXRlbWVudCBkZWwgUGFzc1N0YXRlbWVudCBwYXNzIEJyZWFrU3RhdGVtZW50IGJyZWFrIENvbnRpbnVlU3RhdGVtZW50IGNvbnRpbnVlIFJldHVyblN0YXRlbWVudCByZXR1cm4gWWllbGRTdGF0ZW1lbnQgUHJpbnRTdGF0ZW1lbnQgUmFpc2VTdGF0ZW1lbnQgcmFpc2UgSW1wb3J0U3RhdGVtZW50IGltcG9ydCBhcyBTY29wZVN0YXRlbWVudCBnbG9iYWwgbm9ubG9jYWwgQXNzZXJ0U3RhdGVtZW50IGFzc2VydCBTdGF0ZW1lbnRHcm91cCA7IElmU3RhdGVtZW50IEJvZHkgZWxpZiBXaGlsZVN0YXRlbWVudCB3aGlsZSBGb3JTdGF0ZW1lbnQgVHJ5U3RhdGVtZW50IHRyeSBleGNlcHQgZmluYWxseSBXaXRoU3RhdGVtZW50IHdpdGggRnVuY3Rpb25EZWZpbml0aW9uIGRlZiBQYXJhbUxpc3QgQXNzaWduT3AgVHlwZURlZiBDbGFzc0RlZmluaXRpb24gY2xhc3MgRGVjb3JhdGVkU3RhdGVtZW50IERlY29yYXRvciBBdFwiLFxuICBtYXhUZXJtOiAyMzQsXG4gIGNvbnRleHQ6IHRyYWNrSW5kZW50LFxuICBub2RlUHJvcHM6IFtcbiAgICBbTm9kZVByb3AuZ3JvdXAsIC0xNCw0LDgwLDgyLDgzLDg1LDg3LDg5LDkxLDkzLDk0LDk1LDk3LDEwMCwxMDMsXCJTdGF0ZW1lbnQgU3RhdGVtZW50XCIsLTIyLDYsMTYsMTksMjEsMzcsNDcsNDgsNTIsNTUsNTYsNTksNjAsNjEsNjIsNjUsNjgsNjksNzAsNzQsNzUsNzYsNzcsXCJFeHByZXNzaW9uXCIsLTksMTA1LDEwNywxMTAsMTEyLDExMywxMTcsMTE5LDEyNCwxMjYsXCJTdGF0ZW1lbnRcIl1cbiAgXSxcbiAgc2tpcHBlZE5vZGVzOiBbMCwyXSxcbiAgcmVwZWF0Tm9kZUNvdW50OiAzMixcbiAgdG9rZW5EYXRhOiBcIiZBYU1nUiFeT1gkfVhZISN4WVskfVtdISN4XXAkfXBxISN4cXIhJlNycyEpeXN0IUN7dHUkfXV2JCt9dnckLmF3eCQvbXh5JExneXokTW16eyROc3t8JSNjfH0lJG99IU8lJXUhTyFQJShbIVAhUSUzYiFRIVIlNlEhUiFbJTpTIVshXSVFTyFdIV4lR2IhXiFfJUhoIV8hYCVLVyFgIWElTGQhYSFiJH0hYiFjJiBQIWMhZCYhXyFkIWUmJFAhZSFoJiFfIWghaSYuUiFpIXQmIV8hdCF1JjdnIXUhdyYhXyF3IXgmLGEheCF9JiFfIX0jTyY5cSNPI1AhJWIjUCNRJjp3I1EjUiY7fSNSI1MmIV8jUyNUJH0jVCNVJiFfI1UjViYkUCNWI1kmIV8jWSNaJi5SI1ojZiYhXyNmI2cmN2cjZyNpJiFfI2kjaiYsYSNqI28mIV8jbyNwJj1aI3AjcSY+UCNxI3ImP10jciNzJkBaI3MkZyR9JGd+JiFfPHIlYFolcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTlbJl5aJXA3WyVnUyVtYCV2IWJPcidQcnNDeHN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUDlbJ15aJXA3WyVnUyVqVyVtYCV2IWJPcidQcnMmUnN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUDh6KFdaJXA3WyVqV09yKHlycyl3c3coeXd4O2J4I08oeSNPI1AyViNQI28oeSNvI3A3biNwI3EoeSNxI3IyayNyfih5OHopVVolcDdbJWdTJWpXJXYhYk9yKHlycyl3c3coeXd4KFB4I08oeSNPI1AyViNQI28oeSNvI3A3biNwI3EoeSNxI3IyayNyfih5OHoqUVolcDdbJWdTJXYhYk9yKHlycypzc3coeXd4KFB4I08oeSNPI1AyViNQI28oeSNvI3A3biNwI3EoeSNxI3IyayNyfih5OHoqfFolcDdbJWdTJXYhYk9yKHlycytvc3coeXd4KFB4I08oeSNPI1AyViNQI28oeSNvI3A3biNwI3EoeSNxI3IyayNyfih5OHIreFglcDdbJWdTJXYhYk93K293eCxleCNPK28jTyNQLlYjUCNvK28jbyNwMF4jcCNxK28jcSNyLmsjcn4rbzhyLGpYJXA3W093K293eC1WeCNPK28jTyNQLlYjUCNvK28jbyNwMF4jcCNxK28jcSNyLmsjcn4rbzhyLVtYJXA3W093K293eC13eCNPK28jTyNQLlYjUCNvK28jbyNwMF4jcCNxK28jcSNyLmsjcn4rbzdbLXxSJXA3W08jby13I3AjcS13I3J+LXc4ci5bVCVwN1tPI28rbyNvI3AuayNwI3ErbyNxI3IuayNyfitvIWYuclYlZ1MldiFiT3cua3d4L1h4I08uayNPI1AwVyNQI28uayNvI3AwXiNwfi5rIWYvW1ZPdy5rd3gvcXgjTy5rI08jUDBXI1Ajby5rI28jcDBeI3B+LmshZi90VU93Lmt4I08uayNPI1AwVyNQI28uayNvI3AwXiNwfi5rIWYwWlBPfi5rIWYwY1YlZ1NPdzB4d3gxXngjTzB4I08jUDJQI1AjbzB4I28jcC5rI3B+MHhTMH1UJWdTT3cweHd4MV54I08weCNPI1AyUCNQfjB4UzFhVE93MHh3eDFweCNPMHgjTyNQMlAjUH4weFMxc1NPdzB4eCNPMHgjTyNQMlAjUH4weFMyU1BPfjB4OHoyW1QlcDdbTyNvKHkjbyNwMmsjcCNxKHkjcSNyMmsjcn4oeSFuMnRYJWdTJWpXJXYhYk9yMmtyczNhc3cya3d4NHd4I08yayNPI1A3aCNQI28yayNvI3A3biNwfjJrIW4zaFglZ1MldiFiT3Iya3JzNFRzdzJrd3g0d3gjTzJrI08jUDdoI1AjbzJrI28jcDduI3B+MmshbjRbWCVnUyV2IWJPcjJrcnMua3N3Mmt3eDR3eCNPMmsjTyNQN2gjUCNvMmsjbyNwN24jcH4yayFuNHxYJWpXT3Iya3JzM2FzdzJrd3g1aXgjTzJrI08jUDdoI1AjbzJrI28jcDduI3B+MmshbjVuWCVqV09yMmtyczNhc3cya3d4Nlp4I08yayNPI1A3aCNQI28yayNvI3A3biNwfjJrVzZgVCVqV09yNlpyczZvcyNPNlojTyNQN2IjUH42Wlc2clRPcjZacnM3UnMjTzZaI08jUDdiI1B+NlpXN1VTT3I2WnMjTzZaI08jUDdiI1B+NlpXN2VQT342WiFuN2tQT34yayFuN3VYJWdTJWpXT3I4YnJzOU9zdzhid3g6VXgjTzhiI08jUDtbI1AjbzhiI28jcDJrI3B+OGJbOGlWJWdTJWpXT3I4YnJzOU9zdzhid3g6VXgjTzhiI08jUDtbI1B+OGJbOVRWJWdTT3I4YnJzOWpzdzhid3g6VXgjTzhiI08jUDtbI1B+OGJbOW9WJWdTT3I4YnJzMHhzdzhid3g6VXgjTzhiI08jUDtbI1B+OGJbOlpWJWpXT3I4YnJzOU9zdzhid3g6cHgjTzhiI08jUDtbI1B+OGJbOnVWJWpXT3I4YnJzOU9zdzhid3g2WngjTzhiI08jUDtbI1B+OGJbO19QT344Yjh6O2laJXA3WyVqV09yKHlycyl3c3coeXd4PFt4I08oeSNPI1AyViNQI28oeSNvI3A3biNwI3EoeSNxI3IyayNyfih5N2Q8Y1glcDdbJWpXT3I8W3JzPU9zI088WyNPI1A+YiNQI288WyNvI3A2WiNwI3E8WyNxI3I2WiNyfjxbN2Q9VFglcDdbT3I8W3JzPXBzI088WyNPI1A+YiNQI288WyNvI3A2WiNwI3E8WyNxI3I2WiNyfjxbN2Q9dVglcDdbT3I8W3JzLXdzI088WyNPI1A+YiNQI288WyNvI3A2WiNwI3E8WyNxI3I2WiNyfjxbN2Q+Z1QlcDdbTyNvPFsjbyNwNlojcCNxPFsjcSNyNlojcn48WzlbPntUJXA3W08jbydQI28jcD9bI3AjcSdQI3Ejcj9bI3J+J1AjTz9nWCVnUyVqVyVtYCV2IWJPcj9bcnNAU3N3P1t3eDR3eCNPP1sjTyNQQ08jUCNvP1sjbyNwQ1UjcH4/WyNPQF1YJWdTJW1gJXYhYk9yP1tyc0B4c3c/W3d4NHd4I08/WyNPI1BDTyNQI28/WyNvI3BDVSNwfj9bI09BUlglZ1MlbWAldiFiT3I/W3JzQW5zdz9bd3g0d3gjTz9bI08jUENPI1Ajbz9bI28jcENVI3B+P1shdkF3ViVnUyVtYCV2IWJPd0Fud3gvWHgjT0FuI08jUEJeI1Ajb0FuI28jcEJkI3B+QW4hdkJhUE9+QW4hdkJpViVnU093MHh3eDFeeCNPMHgjTyNQMlAjUCNvMHgjbyNwQW4jcH4weCNPQ1JQT34/WyNPQ11YJWdTJWpXT3I4YnJzOU9zdzhid3g6VXgjTzhiI08jUDtbI1AjbzhiI28jcD9bI3B+OGI5W0RUWiVwN1slZ1MlbWAldiFiT3InUHJzRHZzdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1A5U0VSWCVwN1slZ1MlbWAldiFiT3dEdnd4LGV4I09EdiNPI1BFbiNQI29EdiNvI3BCZCNwI3FEdiNxI3JBbiNyfkR2OVNFc1QlcDdbTyNvRHYjbyNwQW4jcCNxRHYjcSNyQW4jcn5EdjxiRl9aJXA3WyVqVyVzcCV4I3RPckdRcnMpd3N3R1F3eE1eeCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUTxiR2FaJXA3WyVnUyVqVyVzcCV2IWIleCN0T3JHUXJzKXdzd0dRd3hGU3gjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1E8YkhYVCVwN1tPI29HUSNvI3BIaCNwI3FHUSNxI3JIaCNyfkdRJlVIdVglZ1Mlalclc3AldiFiJXgjdE9ySGhyczNhc3dIaHd4SWJ4I09IaCNPI1BMZCNQI29IaCNvI3BMaiNwfkhoJlVJa1glalclc3AleCN0T3JIaHJzM2Fzd0hod3hKV3gjT0hoI08jUExkI1Ajb0hoI28jcExqI3B+SGgmVUphWCVqVyVzcCV4I3RPckhocnMzYXN3SGh3eEp8eCNPSGgjTyNQTGQjUCNvSGgjbyNwTGojcH5IaCRuS1ZYJWpXJXNwJXgjdE9ySnxyczZvc3dKfHd4Snx4I09KfCNPI1BLciNQI29KfCNvI3BLeCNwfkp8JG5LdVBPfkp8JG5LfVYlaldPcjZacnM2b3MjTzZaI08jUDdiI1AjbzZaI28jcEp8I3B+NlomVUxnUE9+SGgmVUxxWCVnUyVqV09yOGJyczlPc3c4Ynd4OlV4I084YiNPI1A7WyNQI284YiNvI3BIaCNwfjhiPGJNaVolcDdbJWpXJXNwJXgjdE9yR1Fycyl3c3dHUXd4Tlt4I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdROnpOZ1olcDdbJWpXJXNwJXgjdE9yTltycz1Pc3dOW3d4Tlt4I09OWyNPI1AhIFkjUCNvTlsjbyNwS3gjcCNxTlsjcSNySnwjcn5OWzp6ISBfVCVwN1tPI29OWyNvI3BKfCNwI3FOWyNxI3JKfCNyfk5bPHIhIHNUJXA3W08jbyR9I28jcCEhUyNwI3EkfSNxI3IhIVMjcn4kfSZmISFjWCVnUyVqVyVtYCVzcCV2IWIleCN0T3IhIVNyc0BTc3chIVN3eElieCNPISFTI08jUCEjTyNQI28hIVMjbyNwISNVI3B+ISFTJmYhI1JQT34hIVMmZiEjXVglZ1MlaldPcjhicnM5T3N3OGJ3eDpVeCNPOGIjTyNQO1sjUCNvOGIjbyNwISFTI3B+OGJNZyEkXWElcDdbJWdTJWpXJG8xcyVtYCVzcCV2IWIleCN0T1gkfVhZISN4WVskfVtdISN4XXAkfXBxISN4cXIkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCElYiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1NZyElZ1glcDdbT1kkfVlaISN4Wl0kfV1eISN4XiNvJH0jbyNwISFTI3AjcSR9I3EjciEhUyNyfiR9PHUhJmViJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCEnbSFgI08kfSNPI1AhIG4jUCNUJH0jVCNVIShzI1UjZiR9I2YjZyEocyNnI2ghKHMjaCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9PHUhKFFaalIlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTx1ISlXWiFqUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3shKllfJXRwJXA3WyVnUyVlLFglbWAldiFiT1khK1hZWidQWl0hK1hdXidQXnIhK1hycyFCUHN3IStYd3ghLWd4I08hK1gjTyNQIT5lI1AjbyErWCNvI3AhQH0jcCNxIStYI3EjciE+eSNyfiErWERlIStoXyVwN1slZ1MlalclZSxYJW1gJXYhYk9ZIStYWVonUFpdIStYXV4nUF5yIStYcnMhLGdzdyErWHd4IS1neCNPIStYI08jUCE+ZSNQI28hK1gjbyNwIUB9I3AjcSErWCNxI3IhPnkjcn4hK1hEZSEsdFolcDdbJWdTJWUsWCVtYCV2IWJPcidQcnNDeHN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUERUIS1wXyVwN1slalclZSxYT1khLm9ZWih5Wl0hLm9dXih5XnIhLm9ycyEve3N3IS5vd3ghO1J4I08hLm8jTyNQITB5I1AjbyEubyNvI3AhNm0jcCNxIS5vI3EjciExXyNyfiEub0RUIS58XyVwN1slZ1MlalclZSxYJXYhYk9ZIS5vWVooeVpdIS5vXV4oeV5yIS5vcnMhL3tzdyEub3d4IS1neCNPIS5vI08jUCEweSNQI28hLm8jbyNwITZtI3AjcSEubyNxI3IhMV8jcn4hLm9EVCEwV1olcDdbJWdTJWUsWCV2IWJPcih5cnMqc3N3KHl3eChQeCNPKHkjTyNQMlYjUCNvKHkjbyNwN24jcCNxKHkjcSNyMmsjcn4oeURUITFPVCVwN1tPI28hLm8jbyNwITFfI3AjcSEubyNxI3IhMV8jcn4hLm8tdyExal0lZ1MlalclZSxYJXYhYk9ZITFfWVoya1pdITFfXV4ya15yITFfcnMhMmNzdyExX3d4ITNYeCNPITFfI08jUCE2ZyNQI28hMV8jbyNwITZtI3B+ITFfLXchMmxYJWdTJWUsWCV2IWJPcjJrcnM0VHN3Mmt3eDR3eCNPMmsjTyNQN2gjUCNvMmsjbyNwN24jcH4yay13ITNgXSVqVyVlLFhPWSExX1laMmtaXSExX11eMmteciExX3JzITJjc3chMV93eCE0WHgjTyExXyNPI1AhNmcjUCNvITFfI28jcCE2bSNwfiExXy13ITRgXSVqVyVlLFhPWSExX1laMmtaXSExX11eMmteciExX3JzITJjc3chMV93eCE1WHgjTyExXyNPI1AhNmcjUCNvITFfI28jcCE2bSNwfiExXyxhITVgWCVqVyVlLFhPWSE1WFlaNlpaXSE1WF1eNlpeciE1WHJzITV7cyNPITVYI08jUCE2YSNQfiE1WCxhITZRVCVlLFhPcjZacnM3UnMjTzZaI08jUDdiI1B+NlosYSE2ZFBPfiE1WC13ITZqUE9+ITFfLXchNnZdJWdTJWpXJWUsWE9ZITdvWVo4YlpdITdvXV44Yl5yITdvcnMhOGtzdyE3b3d4ITlYeCNPITdvI08jUCE6eyNQI28hN28jbyNwITFfI3B+ITdvLGUhN3haJWdTJWpXJWUsWE9ZITdvWVo4YlpdITdvXV44Yl5yITdvcnMhOGtzdyE3b3d4ITlYeCNPITdvI08jUCE6eyNQfiE3byxlIThyViVnUyVlLFhPcjhicnM5anN3OGJ3eDpVeCNPOGIjTyNQO1sjUH44YixlITlgWiVqVyVlLFhPWSE3b1laOGJaXSE3b11eOGJeciE3b3JzIThrc3chN293eCE6UngjTyE3byNPI1AhOnsjUH4hN28sZSE6WVolalclZSxYT1khN29ZWjhiWl0hN29dXjhiXnIhN29ycyE4a3N3ITdvd3ghNVh4I08hN28jTyNQITp7I1B+ITdvLGUhO09QT34hN29EVCE7W18lcDdbJWpXJWUsWE9ZIS5vWVooeVpdIS5vXV4oeV5yIS5vcnMhL3tzdyEub3d4ITxaeCNPIS5vI08jUCEweSNQI28hLm8jbyNwITZtI3AjcSEubyNxI3IhMV8jcn4hLm9CbSE8ZF0lcDdbJWpXJWUsWE9ZITxaWVo8W1pdITxaXV48W15yITxacnMhPV1zI08hPFojTyNQIT5QI1AjbyE8WiNvI3AhNVgjcCNxITxaI3EjciE1WCNyfiE8WkJtIT1kWCVwN1slZSxYT3I8W3JzPXBzI088WyNPI1A+YiNQI288WyNvI3A2WiNwI3E8WyNxI3I2WiNyfjxbQm0hPlVUJXA3W08jbyE8WiNvI3AhNVgjcCNxITxaI3EjciE1WCNyfiE8WkRlIT5qVCVwN1tPI28hK1gjbyNwIT55I3AjcSErWCNxI3IhPnkjcn4hK1guWCE/V10lZ1MlalclZSxYJW1gJXYhYk9ZIT55WVo/W1pdIT55XV4/W15yIT55cnMhQFBzdyE+eXd4ITNYeCNPIT55I08jUCFAdyNQI28hPnkjbyNwIUB9I3B+IT55LlghQFtYJWdTJWUsWCVtYCV2IWJPcj9bcnNAeHN3P1t3eDR3eCNPP1sjTyNQQ08jUCNvP1sjbyNwQ1UjcH4/Wy5YIUB6UE9+IT55LlghQVddJWdTJWpXJWUsWE9ZITdvWVo4YlpdITdvXV44Yl5yITdvcnMhOGtzdyE3b3d4ITlYeCNPITdvI08jUCE6eyNQI28hN28jbyNwIT55I3B+ITdvR1ohQl5aJXA3WyVnUyVlLFglbWAldiFiT3InUHJzIUNQc3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQR1ohQ2BYJWsjfCVwN1slZ1MlaSxYJW1gJXYhYk93RHZ3eCxleCNPRHYjTyNQRW4jUCNvRHYjbyNwQmQjcCNxRHYjcSNyQW4jcn5Edk1nIURgX1ExcyVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9ZIUN7WVokfVpdIUN7XV4kfV5yIUN7cnMhRV9zdyFDe3d4I0hxeCNPIUN7I08jUCQoaSNQI28hQ3sjbyNwJCp7I3AjcSFDeyNxI3IkKV0jcn4hQ3tKUCFFbF9RMXMlcDdbJWdTJW1gJXYhYk9ZIUZrWVonUFpdIUZrXV4nUF5yIUZrcnMjRWtzdyFGa3d4IUd5eCNPIUZrI08jUCM9dSNQI28hRmsjbyNwI0RpI3AjcSFGayNxI3IjPmkjcn4hRmtKUCFGel9RMXMlcDdbJWdTJWpXJW1gJXYhYk9ZIUZrWVonUFpdIUZrXV4nUF5yIUZrcnMhRV9zdyFGa3d4IUd5eCNPIUZrI08jUCM9dSNQI28hRmsjbyNwI0RpI3AjcSFGayNxI3IjPmkjcn4hRmtJbyFIU19RMXMlcDdbJWpXT1khSVJZWih5Wl0hSVJdXih5XnIhSVJycyFKX3N3IUlSd3gjOHd4I08hSVIjTyNQIypSI1AjbyFJUiNvI3AjMn0jcCNxIUlSI3EjciMqdSNyfiFJUklvIUlgX1ExcyVwN1slZ1MlalcldiFiT1khSVJZWih5Wl0hSVJdXih5XnIhSVJycyFKX3N3IUlSd3ghR3l4I08hSVIjTyNQIypSI1AjbyFJUiNvI3AjMn0jcCNxIUlSI3EjciMqdSNyfiFJUklvIUpqX1ExcyVwN1slZ1MldiFiT1khSVJZWih5Wl0hSVJdXih5XnIhSVJycyFLaXN3IUlSd3ghR3l4I08hSVIjTyNQIypSI1AjbyFJUiNvI3AjMn0jcCNxIUlSI3EjciMqdSNyfiFJUklvIUt0X1ExcyVwN1slZ1MldiFiT1khSVJZWih5Wl0hSVJdXih5XnIhSVJycyFMc3N3IUlSd3ghR3l4I08hSVIjTyNQIypSI1AjbyFJUiNvI3AjMn0jcCNxIUlSI3EjciMqdSNyfiFJUklnIU1PXVExcyVwN1slZ1MldiFiT1khTHNZWitvWl0hTHNdXitvXnchTHN3eCFNd3gjTyFMcyNPI1AjIXkjUCNvIUxzI28jcCMmbSNwI3EhTHMjcSNyIyNtI3J+IUxzSWchTk9dUTFzJXA3W09ZIUxzWVorb1pdIUxzXV4rb153IUxzd3ghTnd4I08hTHMjTyNQIyF5I1AjbyFMcyNvI3AjJm0jcCNxIUxzI3EjciMjbSNyfiFMc0lnIyBPXVExcyVwN1tPWSFMc1laK29aXSFMc11eK29edyFMc3d4IyB3eCNPIUxzI08jUCMheSNQI28hTHMjbyNwIyZtI3AjcSFMcyNxI3IjI20jcn4hTHNIUCMhT1hRMXMlcDdbT1kjIHdZWi13Wl0jIHddXi13XiNvIyB3I28jcCMhayNwI3EjIHcjcSNyIyFrI3J+IyB3MXMjIXBSUTFzT1kjIWtaXSMha15+IyFrSWcjI1FYUTFzJXA3W09ZIUxzWVorb1pdIUxzXV4rb14jbyFMcyNvI3AjI20jcCNxIUxzI3EjciMjbSNyfiFMczNaIyN2WlExcyVnUyV2IWJPWSMjbVlaLmtaXSMjbV1eLmtedyMjbXd4IyRpeCNPIyNtI08jUCMmWCNQI28jI20jbyNwIyZtI3B+IyNtM1ojJG5aUTFzT1kjI21ZWi5rWl0jI21dXi5rXncjI213eCMlYXgjTyMjbSNPI1AjJlgjUCNvIyNtI28jcCMmbSNwfiMjbTNaIyVmWlExc09ZIyNtWVoua1pdIyNtXV4ua153IyNtd3gjIWt4I08jI20jTyNQIyZYI1AjbyMjbSNvI3AjJm0jcH4jI20zWiMmXlRRMXNPWSMjbVlaLmtaXSMjbV1eLmtefiMjbTNaIyZ0WlExcyVnU09ZIydnWVoweFpdIydnXV4weF53Iydnd3gjKFp4I08jJ2cjTyNQIyltI1AjbyMnZyNvI3AjI20jcH4jJ2cxdyMnblhRMXMlZ1NPWSMnZ1laMHhaXSMnZ11eMHhedyMnZ3d4IyhaeCNPIydnI08jUCMpbSNQfiMnZzF3IyhgWFExc09ZIydnWVoweFpdIydnXV4weF53Iydnd3gjKHt4I08jJ2cjTyNQIyltI1B+IydnMXcjKVFYUTFzT1kjJ2dZWjB4Wl0jJ2ddXjB4XncjJ2d3eCMha3gjTyMnZyNPI1AjKW0jUH4jJ2cxdyMpclRRMXNPWSMnZ1laMHhaXSMnZ11eMHhefiMnZ0lvIypZWFExcyVwN1tPWSFJUllaKHlaXSFJUl1eKHleI28hSVIjbyNwIyp1I3AjcSFJUiNxI3IjKnUjcn4hSVIzYyMrUV1RMXMlZ1MlalcldiFiT1kjKnVZWjJrWl0jKnVdXjJrXnIjKnVycyMreXN3Iyp1d3gjLX14I08jKnUjTyNQIzJpI1AjbyMqdSNvI3AjMn0jcH4jKnUzYyMsU11RMXMlZ1MldiFiT1kjKnVZWjJrWl0jKnVdXjJrXnIjKnVycyMse3N3Iyp1d3gjLX14I08jKnUjTyNQIzJpI1AjbyMqdSNvI3AjMn0jcH4jKnUzYyMtVV1RMXMlZ1MldiFiT1kjKnVZWjJrWl0jKnVdXjJrXnIjKnVycyMjbXN3Iyp1d3gjLX14I08jKnUjTyNQIzJpI1AjbyMqdSNvI3AjMn0jcH4jKnUzYyMuVV1RMXMlaldPWSMqdVlaMmtaXSMqdV1eMmteciMqdXJzIyt5c3cjKnV3eCMufXgjTyMqdSNPI1AjMmkjUCNvIyp1I28jcCMyfSNwfiMqdTNjIy9VXVExcyVqV09ZIyp1WVoya1pdIyp1XV4ya15yIyp1cnMjK3lzdyMqdXd4Iy99eCNPIyp1I08jUCMyaSNQI28jKnUjbyNwIzJ9I3B+Iyp1MXsjMFVYUTFzJWpXT1kjL31ZWjZaWl0jL31dXjZaXnIjL31ycyMwcXMjTyMvfSNPI1AjMlQjUH4jL30xeyMwdlhRMXNPWSMvfVlaNlpaXSMvfV1eNlpeciMvfXJzIzFjcyNPIy99I08jUCMyVCNQfiMvfTF7IzFoWFExc09ZIy99WVo2WlpdIy99XV42Wl5yIy99cnMjIWtzI08jL30jTyNQIzJUI1B+Iy99MXsjMllUUTFzT1kjL31ZWjZaWl0jL31dXjZaXn4jL30zYyMyblRRMXNPWSMqdVlaMmtaXSMqdV1eMmtefiMqdTNjIzNXXVExcyVnUyVqV09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNHtzdyM0UHd4IzZveCNPIzRQI08jUCM4YyNQI28jNFAjbyNwIyp1I3B+IzRQMlAjNFlaUTFzJWdTJWpXT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM0e3N3IzRQd3gjNm94I08jNFAjTyNQIzhjI1B+IzRQMlAjNVNaUTFzJWdTT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM1dXN3IzRQd3gjNm94I08jNFAjTyNQIzhjI1B+IzRQMlAjNXxaUTFzJWdTT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyMnZ3N3IzRQd3gjNm94I08jNFAjTyNQIzhjI1B+IzRQMlAjNnZaUTFzJWpXT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM0e3N3IzRQd3gjN2l4I08jNFAjTyNQIzhjI1B+IzRQMlAjN3BaUTFzJWpXT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM0e3N3IzRQd3gjL314I08jNFAjTyNQIzhjI1B+IzRQMlAjOGhUUTFzT1kjNFBZWjhiWl0jNFBdXjhiXn4jNFBJbyM5UV9RMXMlcDdbJWpXT1khSVJZWih5Wl0hSVJdXih5XnIhSVJycyFKX3N3IUlSd3gjOlB4I08hSVIjTyNQIypSI1AjbyFJUiNvI3AjMn0jcCNxIUlSI3EjciMqdSNyfiFJUkhYIzpZXVExcyVwN1slaldPWSM6UFlaPFtaXSM6UF1ePFteciM6UHJzIztScyNPIzpQI08jUCM9UiNQI28jOlAjbyNwIy99I3AjcSM6UCNxI3IjL30jcn4jOlBIWCM7WV1RMXMlcDdbT1kjOlBZWjxbWl0jOlBdXjxbXnIjOlBycyM8UnMjTyM6UCNPI1AjPVIjUCNvIzpQI28jcCMvfSNwI3EjOlAjcSNyIy99I3J+IzpQSFgjPFldUTFzJXA3W09ZIzpQWVo8W1pdIzpQXV48W15yIzpQcnMjIHdzI08jOlAjTyNQIz1SI1AjbyM6UCNvI3AjL30jcCNxIzpQI3EjciMvfSNyfiM6UEhYIz1ZWFExcyVwN1tPWSM6UFlaPFtaXSM6UF1ePFteI28jOlAjbyNwIy99I3AjcSM6UCNxI3IjL30jcn4jOlBKUCM9fFhRMXMlcDdbT1khRmtZWidQWl0hRmtdXidQXiNvIUZrI28jcCM+aSNwI3EhRmsjcSNyIz5pI3J+IUZrM3MjPnZdUTFzJWdTJWpXJW1gJXYhYk9ZIz5pWVo/W1pdIz5pXV4/W15yIz5pcnMjP29zdyM+aXd4Iy19eCNPIz5pI08jUCNEVCNQI28jPmkjbyNwI0RpI3B+Iz5pM3MjP3pdUTFzJWdTJW1gJXYhYk9ZIz5pWVo/W1pdIz5pXV4/W15yIz5pcnMjQHNzdyM+aXd4Iy19eCNPIz5pI08jUCNEVCNQI28jPmkjbyNwI0RpI3B+Iz5pM3MjQU9dUTFzJWdTJW1gJXYhYk9ZIz5pWVo/W1pdIz5pXV4/W15yIz5pcnMjQXdzdyM+aXd4Iy19eCNPIz5pI08jUCNEVCNQI28jPmkjbyNwI0RpI3B+Iz5pM2sjQlNaUTFzJWdTJW1gJXYhYk9ZI0F3WVpBblpdI0F3XV5Bbl53I0F3d3gjJGl4I08jQXcjTyNQI0J1I1AjbyNBdyNvI3AjQ1ojcH4jQXczayNCelRRMXNPWSNBd1laQW5aXSNBd11eQW5efiNBdzNrI0NiWlExcyVnU09ZIydnWVoweFpdIydnXV4weF53Iydnd3gjKFp4I08jJ2cjTyNQIyltI1AjbyMnZyNvI3AjQXcjcH4jJ2czcyNEWVRRMXNPWSM+aVlaP1taXSM+aV1eP1tefiM+aTNzI0RyXVExcyVnUyVqV09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNHtzdyM0UHd4IzZveCNPIzRQI08jUCM4YyNQI28jNFAjbyNwIz5pI3B+IzRQSlAjRXhfUTFzJXA3WyVnUyVtYCV2IWJPWSFGa1laJ1BaXSFGa11eJ1BeciFGa3JzI0Z3c3chRmt3eCFHeXgjTyFGayNPI1AjPXUjUCNvIUZrI28jcCNEaSNwI3EhRmsjcSNyIz5pI3J+IUZrSXcjR1VdUTFzJXA3WyVnUyVtYCV2IWJPWSNGd1laRHZaXSNGd11eRHZedyNGd3d4IU13eCNPI0Z3I08jUCNHfSNQI28jRncjbyNwI0NaI3AjcSNGdyNxI3IjQXcjcn4jRndJdyNIVVhRMXMlcDdbT1kjRndZWkR2Wl0jRnddXkR2XiNvI0Z3I28jcCNBdyNwI3EjRncjcSNyI0F3I3J+I0Z3TVYjSU9fUTFzJXA3WyVqVyVzcCV4I3RPWSNJfVlaR1FaXSNJfV1eR1FeciNJfXJzIUpfc3cjSX13eCQlXXgjTyNJfSNPI1AjS18jUCNvI0l9I28jcCQkWiNwI3EjSX0jcSNyI0xSI3J+I0l9TVYjSmBfUTFzJXA3WyVnUyVqVyVzcCV2IWIleCN0T1kjSX1ZWkdRWl0jSX1dXkdRXnIjSX1ycyFKX3N3I0l9d3gjSHF4I08jSX0jTyNQI0tfI1AjbyNJfSNvI3AkJFojcCNxI0l9I3EjciNMUiNyfiNJfU1WI0tmWFExcyVwN1tPWSNJfVlaR1FaXSNJfV1eR1FeI28jSX0jbyNwI0xSI3AjcSNJfSNxI3IjTFIjcn4jSX02eSNMYl1RMXMlZ1Mlalclc3AldiFiJXgjdE9ZI0xSWVpIaFpdI0xSXV5IaF5yI0xScnMjK3lzdyNMUnd4I01aeCNPI0xSI08jUCQjdSNQI28jTFIjbyNwJCRaI3B+I0xSNnkjTWZdUTFzJWpXJXNwJXgjdE9ZI0xSWVpIaFpdI0xSXV5IaF5yI0xScnMjK3lzdyNMUnd4I05feCNPI0xSI08jUCQjdSNQI28jTFIjbyNwJCRaI3B+I0xSNnkjTmpdUTFzJWpXJXNwJXgjdE9ZI0xSWVpIaFpdI0xSXV5IaF5yI0xScnMjK3lzdyNMUnd4JCBjeCNPI0xSI08jUCQjdSNQI28jTFIjbyNwJCRaI3B+I0xSNWMkIG5dUTFzJWpXJXNwJXgjdE9ZJCBjWVpKfFpdJCBjXV5KfF5yJCBjcnMjMHFzdyQgY3d4JCBjeCNPJCBjI08jUCQhZyNQI28kIGMjbyNwJCF7I3B+JCBjNWMkIWxUUTFzT1kkIGNZWkp8Wl0kIGNdXkp8Xn4kIGM1YyQjU1pRMXMlaldPWSMvfVlaNlpaXSMvfV1eNlpeciMvfXJzIzBxcyNPIy99I08jUCMyVCNQI28jL30jbyNwJCBjI3B+Iy99NnkkI3pUUTFzT1kjTFJZWkhoWl0jTFJdXkhoXn4jTFI2eSQkZF1RMXMlZ1MlaldPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzR7c3cjNFB3eCM2b3gjTyM0UCNPI1AjOGMjUCNvIzRQI28jcCNMUiNwfiM0UE1WJCVqX1ExcyVwN1slalclc3AleCN0T1kjSX1ZWkdRWl0jSX1dXkdRXnIjSX1ycyFKX3N3I0l9d3gkJml4I08jSX0jTyNQI0tfI1AjbyNJfSNvI3AkJFojcCNxI0l9I3EjciNMUiNyfiNJfUtvJCZ2X1ExcyVwN1slalclc3AleCN0T1kkJmlZWk5bWl0kJmldXk5bXnIkJmlycyM7UnN3JCZpd3gkJml4I08kJmkjTyNQJCd1I1AjbyQmaSNvI3AkIXsjcCNxJCZpI3EjciQgYyNyfiQmaUtvJCd8WFExcyVwN1tPWSQmaVlaTltaXSQmaV1eTlteI28kJmkjbyNwJCBjI3AjcSQmaSNxI3IkIGMjcn4kJmlNZyQocFhRMXMlcDdbT1khQ3tZWiR9Wl0hQ3tdXiR9XiNvIUN7I28jcCQpXSNwI3EhQ3sjcSNyJCldI3J+IUN7N1okKW5dUTFzJWdTJWpXJW1gJXNwJXYhYiV4I3RPWSQpXVlaISFTWl0kKV1dXiEhU15yJCldcnMjP29zdyQpXXd4I01aeCNPJCldI08jUCQqZyNQI28kKV0jbyNwJCp7I3B+JCldN1okKmxUUTFzT1kkKV1ZWiEhU1pdJCldXV4hIVNefiQpXTdaJCtVXVExcyVnUyVqV09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNHtzdyM0UHd4IzZveCNPIzRQI08jUCM4YyNQI28jNFAjbyNwJCldI3B+IzRQR3okLGJdJH1RJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3okLW5aIXMsVyVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3okLnRdJHdRJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3skL3xfJXFgJXA3WyVqVyVlLFglc3AleCN0T1kkMHtZWkdRWl0kMHtdXkdRXnIkMHtycyQyXXN3JDB7d3gkSmV4I08kMHsjTyNQJEZ3I1AjbyQweyNvI3AkSWMjcCNxJDB7I3EjciRHXSNyfiQwe0drJDFeXyVwN1slZ1MlalclZSxYJXNwJXYhYiV4I3RPWSQwe1laR1FaXSQwe11eR1FeciQwe3JzJDJdc3ckMHt3eCRFd3gjTyQweyNPI1AkRncjUCNvJDB7I28jcCRJYyNwI3EkMHsjcSNyJEddI3J+JDB7RFQkMmhfJXA3WyVnUyVlLFgldiFiT1kkM2dZWih5Wl0kM2ddXih5XnIkM2dycyRCYXN3JDNnd3gkNHN4I08kM2cjTyNQJDVvI1AjbyQzZyNvI3AkPXsjcCNxJDNnI3EjciQ2VCNyfiQzZ0RUJDN0XyVwN1slZ1MlalclZSxYJXYhYk9ZJDNnWVooeVpdJDNnXV4oeV5yJDNncnMkMl1zdyQzZ3d4JDRzeCNPJDNnI08jUCQ1byNQI28kM2cjbyNwJD17I3AjcSQzZyNxI3IkNlQjcn4kM2dEVCQ0fFolcDdbJWpXJWUsWE9yKHlycyl3c3coeXd4O2J4I08oeSNPI1AyViNQI28oeSNvI3A3biNwI3EoeSNxI3IyayNyfih5RFQkNXRUJXA3W08jbyQzZyNvI3AkNlQjcCNxJDNnI3EjciQ2VCNyfiQzZy13JDZgXSVnUyVqVyVlLFgldiFiT1kkNlRZWjJrWl0kNlRdXjJrXnIkNlRycyQ3WHN3JDZUd3gkPVJ4I08kNlQjTyNQJD11I1AjbyQ2VCNvI3AkPXsjcH4kNlQtdyQ3Yl0lZ1MlZSxYJXYhYk9ZJDZUWVoya1pdJDZUXV4ya15yJDZUcnMkOFpzdyQ2VHd4JD1SeCNPJDZUI08jUCQ9dSNQI28kNlQjbyNwJD17I3B+JDZULXckOGRdJWdTJWUsWCV2IWJPWSQ2VFlaMmtaXSQ2VF1eMmteciQ2VHJzJDldc3ckNlR3eCQ9UngjTyQ2VCNPI1AkPXUjUCNvJDZUI28jcCQ9eyNwfiQ2VC1vJDlmWiVnUyVlLFgldiFiT1kkOV1ZWi5rWl0kOV1dXi5rXnckOV13eCQ6WHgjTyQ5XSNPI1AkOnMjUCNvJDldI28jcCQ6eSNwfiQ5XS1vJDpeViVlLFhPdy5rd3gvcXgjTy5rI08jUDBXI1Ajby5rI28jcDBeI3B+LmstbyQ6dlBPfiQ5XS1vJDtRWiVnUyVlLFhPWSQ7c1laMHhaXSQ7c11eMHhedyQ7c3d4JDxneCNPJDtzI08jUCQ8eyNQI28kO3MjbyNwJDldI3B+JDtzLF0kO3pYJWdTJWUsWE9ZJDtzWVoweFpdJDtzXV4weF53JDtzd3gkPGd4I08kO3MjTyNQJDx7I1B+JDtzLF0kPGxUJWUsWE93MHh3eDFweCNPMHgjTyNQMlAjUH4weCxdJD1PUE9+JDtzLXckPVlYJWpXJWUsWE9yMmtyczNhc3cya3d4NWl4I08yayNPI1A3aCNQI28yayNvI3A3biNwfjJrLXckPXhQT34kNlQtdyQ+VV0lZ1MlalclZSxYT1kkPn1ZWjhiWl0kPn1dXjhiXnIkPn1ycyQ/eXN3JD59d3gkQW14I08kPn0jTyNQJEJaI1AjbyQ+fSNvI3AkNlQjcH4kPn0sZSQ/V1olZ1MlalclZSxYT1kkPn1ZWjhiWl0kPn1dXjhiXnIkPn1ycyQ/eXN3JD59d3gkQW14I08kPn0jTyNQJEJaI1B+JD59LGUkQFFaJWdTJWUsWE9ZJD59WVo4YlpdJD59XV44Yl5yJD59cnMkQHNzdyQ+fXd4JEFteCNPJD59I08jUCRCWiNQfiQ+fSxlJEB6WiVnUyVlLFhPWSQ+fVlaOGJaXSQ+fV1eOGJeciQ+fXJzJDtzc3ckPn13eCRBbXgjTyQ+fSNPI1AkQlojUH4kPn0sZSRBdFYlalclZSxYT3I4YnJzOU9zdzhid3g6cHgjTzhiI08jUDtbI1B+OGIsZSRCXlBPfiQ+fURUJEJsXyVwN1slZ1MlZSxYJXYhYk9ZJDNnWVooeVpdJDNnXV4oeV5yJDNncnMkQ2tzdyQzZ3d4JDRzeCNPJDNnI08jUCQ1byNQI28kM2cjbyNwJD17I3AjcSQzZyNxI3IkNlQjcn4kM2dDeyRDdl0lcDdbJWdTJWUsWCV2IWJPWSRDa1laK29aXSRDa11eK29edyRDa3d4JERveCNPJENrI08jUCRFYyNQI28kQ2sjbyNwJDp5I3AjcSRDayNxI3IkOV0jcn4kQ2tDeyREdlglcDdbJWUsWE93K293eC1WeCNPK28jTyNQLlYjUCNvK28jbyNwMF4jcCNxK28jcSNyLmsjcn4rb0N7JEVoVCVwN1tPI28kQ2sjbyNwJDldI3AjcSRDayNxI3IkOV0jcn4kQ2tHayRGVVolcDdbJWpXJWUsWCVzcCV4I3RPckdRcnMpd3N3R1F3eE1eeCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUUdrJEZ8VCVwN1tPI28kMHsjbyNwJEddI3AjcSQweyNxI3IkR10jcn4kMHsxXyRHbF0lZ1MlalclZSxYJXNwJXYhYiV4I3RPWSRHXVlaSGhaXSRHXV1eSGheciRHXXJzJDdYc3ckR113eCRIZXgjTyRHXSNPI1AkSV0jUCNvJEddI28jcCRJYyNwfiRHXTFfJEhwWCVqVyVlLFglc3AleCN0T3JIaHJzM2Fzd0hod3hKV3gjT0hoI08jUExkI1Ajb0hoI28jcExqI3B+SGgxXyRJYFBPfiRHXTFfJElsXSVnUyVqVyVlLFhPWSQ+fVlaOGJaXSQ+fV1eOGJeciQ+fXJzJD95c3ckPn13eCRBbXgjTyQ+fSNPI1AkQlojUCNvJD59I28jcCRHXSNwfiQ+fUdrJEpyWiVwN1slalclZSxYJXNwJXgjdE9yR1Fycyl3c3dHUXd4JEtleCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUUdrJEt0WiVoIWYlcDdbJWpXJWYsWCVzcCV4I3RPck5bcnM9T3N3Tlt3eE5beCNPTlsjTyNQISBZI1Ajb05bI28jcEt4I3AjcU5bI3Ejckp8I3J+TltHeyRMelpmLFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTx1JE5RWiFPUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slIFdfVCxYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3h6JH16eyUhVnshXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slIWpdX1IlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyUjdl0keixYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9PHUlJVNad1IlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfU1nJSZZXiR7LFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAhYSUnVSFhI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9Ql4lJ2laJlMmaiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slKG9fIWRRJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghTyR9IU8hUCUpbiFQIVEkfSFRIVslLE8hWyNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JSpQXSVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IU8kfSFPIVAlKnghUCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JStdWiFtLFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JSxjZyFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFbJSxPIVshZyR9IWchaCUteiFoIWwkfSFsIW0lMlshbSNPJH0jTyNQISBuI1AjUiR9I1IjUyUsTyNTI1gkfSNYI1klLXojWSNeJH0jXiNfJTJbI18jbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JS5dYSVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4eyR9e3wlL2J8fSR9fSFPJS9iIU8hUSR9IVEhWyUwbCFbI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klL3NdJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWyUwbCFbI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klMVBjIWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVslMGwhWyFsJH0hbCFtJTJbIW0jTyR9I08jUCEgbiNQI1IkfSNSI1MlMGwjUyNeJH0jXiNfJTJbI18jbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JTJvWiFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JTN1XyR8UiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVAkfSFQIVElNHQhUSFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeiU1WF0lT1ElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSU2ZXUhZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghTyR9IU8hUCU4eCFQIVEkfSFRIVslOlMhWyFkJH0hZCFlJTxVIWUhZyR9IWchaCUteiFoIWwkfSFsIW0lMlshbSFxJH0hcSFyJT9PIXIheiR9IXoheyVBciF7I08kfSNPI1AhIG4jUCNSJH0jUiNTJTpTI1MjVSR9I1UjViU8VSNWI1gkfSNYI1klLXojWSNeJH0jXiNfJTJbI18jYyR9I2MjZCU/TyNkI2wkfSNsI20lQXIjbSNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klOVpdJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWyUsTyFbI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klOmdpIWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IU8kfSFPIVAlOHghUCFRJH0hUSFbJTpTIVshZyR9IWchaCUteiFoIWwkfSFsIW0lMlshbSNPJH0jTyNQISBuI1AjUiR9I1IjUyU6UyNTI1gkfSNYI1klLXojWSNeJH0jXiNfJTJbI18jbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JTxnYCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVIlPWkhUiFTJT1pIVMjTyR9I08jUCEgbiNQI1IkfSNSI1MlPWkjUyNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klPXxgIWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVIlPWkhUiFTJT1pIVMjTyR9I08jUCEgbiNQI1IkfSNSI1MlPWkjUyNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klP2FfJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWSVAYCFZI08kfSNPI1AhIG4jUCNSJH0jUiNTJUBgI1MjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JUBzXyFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFZJUBgIVkjTyR9I08jUCEgbiNQI1IkfSNSI1MlQGAjUyNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klQlRjJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWyVDYCFbIWMkfSFjIWklQ2AhaSNPJH0jTyNQISBuI1AjUiR9I1IjUyVDYCNTI1QkfSNUI1olQ2AjWiNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klQ3NjIWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVslQ2AhWyFjJH0hYyFpJUNgIWkjTyR9I08jUCEgbiNQI1IkfSNSI1MlQ2AjUyNUJH0jVCNaJUNgI1ojbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfU1nJUVjXXgxcyVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAlRlshYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTx1JUZvWiVXUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slR3VaI14sWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slSHtfalIlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFeJH0hXiFfJUl6IV8hYCEnbSFgIWEhJ20hYSNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd6JUpfXSR4USVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JUtrXSVWLFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgISdtIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyVMd15qUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAhJ20hYCFhJU1zIWEjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeiVOV10keVElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyYgZl1dUSN0UCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfU1nJiF0YyVwN1slZ1MlalclZCZqJW1gJXNwJXYhYiV4I3QlUSxYT3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWyYhXyFbIWMkfSFjIX0mIV8hfSNPJH0jTyNQISBuI1AjUiR9I1IjUyYhXyNTI1QkfSNUI28mIV8jbyNwISNVI3AjcSR9I3EjciEhUyNyJGckfSRnfiYhX01nJiRmZyVwN1slZ1MlalclZCZqJW1gJXNwJXYhYiV4I3QlUSxYT3IkfXJzJiV9c3ckfXd4JilUeCFRJH0hUSFbJiFfIVshYyR9IWMhdCYhXyF0IXUmLGEhdSF9JiFfIX0jTyR9I08jUCEgbiNQI1IkfSNSI1MmIV8jUyNUJH0jVCNmJiFfI2YjZyYsYSNnI28mIV8jbyNwISNVI3AjcSR9I3EjciEhUyNyJGckfSRnfiYhX0RlJiZbXyVwN1slZ1MlZSxYJW1gJXYhYk9ZIStYWVonUFpdIStYXV4nUF5yIStYcnMmJ1pzdyErWHd4IS1neCNPIStYI08jUCE+ZSNQI28hK1gjbyNwIUB9I3AjcSErWCNxI3IhPnkjcn4hK1hEZSYnaFolcDdbJWdTJWUsWCVtYCV2IWJPcidQcnMmKFpzdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1BEXSYoaFglcDdbJWdTJWksWCVtYCV2IWJPd0R2d3gsZXgjT0R2I08jUEVuI1Ajb0R2I28jcEJkI3AjcUR2I3EjckFuI3J+RHZHayYpYl8lcDdbJWpXJWUsWCVzcCV4I3RPWSQwe1laR1FaXSQwe11eR1FeciQwe3JzJDJdc3ckMHt3eCYqYXgjTyQweyNPI1AkRncjUCNvJDB7I28jcCRJYyNwI3EkMHsjcSNyJEddI3J+JDB7R2smKm5aJXA3WyVqVyVlLFglc3AleCN0T3JHUXJzKXdzd0dRd3gmK2F4I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdRRlQmK25aJXA3WyVqVyVmLFglc3AleCN0T3JOW3JzPU9zd05bd3hOW3gjT05bI08jUCEgWSNQI29OWyNvI3BLeCNwI3FOWyNxI3JKfCNyfk5bTWcmLHZjJXA3WyVnUyVqVyVkJmolbWAlc3AldiFiJXgjdCVRLFhPciR9cnMmJX1zdyR9d3gmKVR4IVEkfSFRIVsmIV8hWyFjJH0hYyF9JiFfIX0jTyR9I08jUCEgbiNQI1IkfSNSI1MmIV8jUyNUJH0jVCNvJiFfI28jcCEjVSNwI3EkfSNxI3IhIVMjciRnJH0kZ34mIV9NZyYuaGclcDdbJWdTJWpXJWQmaiVtYCVzcCV2IWIleCN0JVEsWE9yJH1ycyYwUHN3JH13eCYyd3ghUSR9IVEhWyYhXyFbIWMkfSFjIXQmIV8hdCF1JjV1IXUhfSYhXyF9I08kfSNPI1AhIG4jUCNSJH0jUiNTJiFfI1MjVCR9I1QjZiYhXyNmI2cmNXUjZyNvJiFfI28jcCEjVSNwI3EkfSNxI3IhIVMjciRnJH0kZ34mIV9EZSYwXlolcDdbJWdTJW1gJXYhYiVyLFhPcidQcnMmMVBzdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1BEZSYxW1olcDdbJWdTJW1gJXYhYk9yJ1BycyYxfXN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUERdJjJbWCVwN1slZ1MldyxYJW1gJXYhYk93RHZ3eCxleCNPRHYjTyNQRW4jUCNvRHYjbyNwQmQjcCNxRHYjcSNyQW4jcn5EdkdrJjNVWiVwN1slalclc3AleCN0JWwsWE9yR1Fycyl3c3dHUXd4JjN3eCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUUdrJjRTWiVwN1slalclc3AleCN0T3JHUXJzKXdzd0dRd3gmNHV4I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdRRlQmNVNaJXA3WyVqVyV1LFglc3AleCN0T3JOW3JzPU9zd05bd3hOW3gjT05bI08jUCEgWSNQI29OWyNvI3BLeCNwI3FOWyNxI3JKfCNyfk5bTWcmNltjJXA3WyVnUyVqVyVkJmolbWAlc3AldiFiJXgjdCVRLFhPciR9cnMmMFBzdyR9d3gmMnd4IVEkfSFRIVsmIV8hWyFjJH0hYyF9JiFfIX0jTyR9I08jUCEgbiNQI1IkfSNSI1MmIV8jUyNUJH0jVCNvJiFfI28jcCEjVSNwI3EkfSNxI3IhIVMjciRnJH0kZ34mIV9NZyY3fGslcDdbJWdTJWpXJWQmaiVtYCVzcCV2IWIleCN0JVEsWE9yJH1ycyYlfXN3JH13eCYpVHghUSR9IVEhWyYhXyFbIWMkfSFjIWgmIV8haCFpJjV1IWkhdCYhXyF0IXUmLGEhdSF9JiFfIX0jTyR9I08jUCEgbiNQI1IkfSNSI1MmIV8jUyNUJH0jVCNVJiFfI1UjViYsYSNWI1kmIV8jWSNaJjV1I1ojbyYhXyNvI3AhI1UjcCNxJH0jcSNyISFTI3IkZyR9JGd+JiFfR3smOlVaIVYsWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9PHUmO1taIVdSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeiY8Yl0kdlElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSY9ZFglZ1MlalchWkdtT3I4YnJzOU9zdzhid3g6VXgjTzhiI08jUDtbI1AjbzhiI28jcCEhUyNwfjhiR3omPmRdJHVRJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9PHUmP25YIVs3XyVnUyVqVyVtYCVzcCV2IWIleCN0T3IhIVNyc0BTc3chIVN3eElieCNPISFTI08jUCEjTyNQI28hIVMjbyNwISNVI3B+ISFTR3kmQG5aJVAsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9XCIsXG4gIHRva2VuaXplcnM6IFtsZWdhY3lQcmludCwgaW5kZW50YXRpb24sIDAsIDEsIDIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCBuZXdsaW5lc10sXG4gIHRvcFJ1bGVzOiB7XCJTY3JpcHRcIjpbMCwzXX0sXG4gIHNwZWNpYWxpemVkOiBbe3Rlcm06IDE4NiwgZ2V0OiB2YWx1ZSA9PiBzcGVjX2lkZW50aWZpZXJbdmFsdWVdIHx8IC0xfV0sXG4gIHRva2VuUHJlYzogNjU5NFxufSk7XG5cbmV4cG9ydCB7IHBhcnNlciB9O1xuIiwiLy8vIFRoZSBkZWZhdWx0IG1heGltdW0gbGVuZ3RoIG9mIGEgYFRyZWVCdWZmZXJgIG5vZGUuXG5jb25zdCBEZWZhdWx0QnVmZmVyTGVuZ3RoID0gMTAyNDtcbmxldCBuZXh0UHJvcElEID0gMDtcbmNvbnN0IENhY2hlZE5vZGUgPSBuZXcgV2Vha01hcCgpO1xuLy8vIEVhY2ggW25vZGUgdHlwZV0oI3RyZWUuTm9kZVR5cGUpIGNhbiBoYXZlIG1ldGFkYXRhIGFzc29jaWF0ZWQgd2l0aFxuLy8vIGl0IGluIHByb3BzLiBJbnN0YW5jZXMgb2YgdGhpcyBjbGFzcyByZXByZXNlbnQgcHJvcCBuYW1lcy5cbmNsYXNzIE5vZGVQcm9wIHtcbiAgICAvLy8gQ3JlYXRlIGEgbmV3IG5vZGUgcHJvcCB0eXBlLiBZb3UgY2FuIG9wdGlvbmFsbHkgcGFzcyBhXG4gICAgLy8vIGBkZXNlcmlhbGl6ZWAgZnVuY3Rpb24uXG4gICAgY29uc3RydWN0b3IoeyBkZXNlcmlhbGl6ZSB9ID0ge30pIHtcbiAgICAgICAgdGhpcy5pZCA9IG5leHRQcm9wSUQrKztcbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZSA9IGRlc2VyaWFsaXplIHx8ICgoKSA9PiB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIG5vZGUgdHlwZSBkb2Vzbid0IGRlZmluZSBhIGRlc2VyaWFsaXplIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vIENyZWF0ZSBhIHN0cmluZy12YWx1ZWQgbm9kZSBwcm9wIHdob3NlIGRlc2VyaWFsaXplIGZ1bmN0aW9uIGlzXG4gICAgLy8vIHRoZSBpZGVudGl0eSBmdW5jdGlvbi5cbiAgICBzdGF0aWMgc3RyaW5nKCkgeyByZXR1cm4gbmV3IE5vZGVQcm9wKHsgZGVzZXJpYWxpemU6IHN0ciA9PiBzdHIgfSk7IH1cbiAgICAvLy8gQ3JlYXRlIGEgbnVtYmVyLXZhbHVlZCBub2RlIHByb3Agd2hvc2UgZGVzZXJpYWxpemUgZnVuY3Rpb24gaXNcbiAgICAvLy8ganVzdCBgTnVtYmVyYC5cbiAgICBzdGF0aWMgbnVtYmVyKCkgeyByZXR1cm4gbmV3IE5vZGVQcm9wKHsgZGVzZXJpYWxpemU6IE51bWJlciB9KTsgfVxuICAgIC8vLyBDcmVhdGVzIGEgYm9vbGVhbi12YWx1ZWQgbm9kZSBwcm9wIHdob3NlIGRlc2VyaWFsaXplIGZ1bmN0aW9uXG4gICAgLy8vIHJldHVybnMgdHJ1ZSBmb3IgYW55IGlucHV0LlxuICAgIHN0YXRpYyBmbGFnKCkgeyByZXR1cm4gbmV3IE5vZGVQcm9wKHsgZGVzZXJpYWxpemU6ICgpID0+IHRydWUgfSk7IH1cbiAgICAvLy8gU3RvcmUgYSB2YWx1ZSBmb3IgdGhpcyBwcm9wIGluIHRoZSBnaXZlbiBvYmplY3QuIFRoaXMgY2FuIGJlXG4gICAgLy8vIHVzZWZ1bCB3aGVuIGJ1aWxkaW5nIHVwIGEgcHJvcCBvYmplY3QgdG8gcGFzcyB0byB0aGVcbiAgICAvLy8gW2BOb2RlVHlwZWBdKCN0cmVlLk5vZGVUeXBlKSBjb25zdHJ1Y3Rvci4gUmV0dXJucyBpdHMgZmlyc3RcbiAgICAvLy8gYXJndW1lbnQuXG4gICAgc2V0KHByb3BPYmosIHZhbHVlKSB7XG4gICAgICAgIHByb3BPYmpbdGhpcy5pZF0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHByb3BPYmo7XG4gICAgfVxuICAgIC8vLyBUaGlzIGlzIG1lYW50IHRvIGJlIHVzZWQgd2l0aFxuICAgIC8vLyBbYE5vZGVTZXQuZXh0ZW5kYF0oI3RyZWUuTm9kZVNldC5leHRlbmQpIG9yXG4gICAgLy8vIFtgUGFyc2VyLndpdGhQcm9wc2BdKCNsZXplci5QYXJzZXIud2l0aFByb3BzKSB0byBjb21wdXRlIHByb3BcbiAgICAvLy8gdmFsdWVzIGZvciBlYWNoIG5vZGUgdHlwZSBpbiB0aGUgc2V0LiBUYWtlcyBhIFttYXRjaFxuICAgIC8vLyBvYmplY3RdKCN0cmVlLk5vZGVUeXBlXm1hdGNoKSBvciBmdW5jdGlvbiB0aGF0IHJldHVybnMgdW5kZWZpbmVkXG4gICAgLy8vIGlmIHRoZSBub2RlIHR5cGUgZG9lc24ndCBnZXQgdGhpcyBwcm9wLCBhbmQgdGhlIHByb3AncyB2YWx1ZSBpZlxuICAgIC8vLyBpdCBkb2VzLlxuICAgIGFkZChtYXRjaCkge1xuICAgICAgICBpZiAodHlwZW9mIG1hdGNoICE9IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICAgIG1hdGNoID0gTm9kZVR5cGUubWF0Y2gobWF0Y2gpO1xuICAgICAgICByZXR1cm4gKHR5cGUpID0+IHtcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSBtYXRjaCh0eXBlKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBbdGhpcywgcmVzdWx0XTtcbiAgICAgICAgfTtcbiAgICB9XG59XG4vLy8gUHJvcCB0aGF0IGlzIHVzZWQgdG8gZGVzY3JpYmUgbWF0Y2hpbmcgZGVsaW1pdGVycy4gRm9yIG9wZW5pbmdcbi8vLyBkZWxpbWl0ZXJzLCB0aGlzIGhvbGRzIGFuIGFycmF5IG9mIG5vZGUgbmFtZXMgKHdyaXR0ZW4gYXMgYVxuLy8vIHNwYWNlLXNlcGFyYXRlZCBzdHJpbmcgd2hlbiBkZWNsYXJpbmcgdGhpcyBwcm9wIGluIGEgZ3JhbW1hcilcbi8vLyBmb3IgdGhlIG5vZGUgdHlwZXMgb2YgY2xvc2luZyBkZWxpbWl0ZXJzIHRoYXQgbWF0Y2ggaXQuXG5Ob2RlUHJvcC5jbG9zZWRCeSA9IG5ldyBOb2RlUHJvcCh7IGRlc2VyaWFsaXplOiBzdHIgPT4gc3RyLnNwbGl0KFwiIFwiKSB9KTtcbi8vLyBUaGUgaW52ZXJzZSBvZiBbYG9wZW5lZEJ5YF0oI3RyZWUuTm9kZVByb3BeY2xvc2VkQnkpLiBUaGlzIGlzXG4vLy8gYXR0YWNoZWQgdG8gY2xvc2luZyBkZWxpbWl0ZXJzLCBob2xkaW5nIGFuIGFycmF5IG9mIG5vZGUgbmFtZXNcbi8vLyBvZiB0eXBlcyBvZiBtYXRjaGluZyBvcGVuaW5nIGRlbGltaXRlcnMuXG5Ob2RlUHJvcC5vcGVuZWRCeSA9IG5ldyBOb2RlUHJvcCh7IGRlc2VyaWFsaXplOiBzdHIgPT4gc3RyLnNwbGl0KFwiIFwiKSB9KTtcbi8vLyBVc2VkIHRvIGFzc2lnbiBub2RlIHR5cGVzIHRvIGdyb3VwcyAoZm9yIGV4YW1wbGUsIGFsbCBub2RlXG4vLy8gdHlwZXMgdGhhdCByZXByZXNlbnQgYW4gZXhwcmVzc2lvbiBjb3VsZCBiZSB0YWdnZWQgd2l0aCBhblxuLy8vIGBcIkV4cHJlc3Npb25cImAgZ3JvdXApLlxuTm9kZVByb3AuZ3JvdXAgPSBuZXcgTm9kZVByb3AoeyBkZXNlcmlhbGl6ZTogc3RyID0+IHN0ci5zcGxpdChcIiBcIikgfSk7XG5jb25zdCBub1Byb3BzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbi8vLyBFYWNoIG5vZGUgaW4gYSBzeW50YXggdHJlZSBoYXMgYSBub2RlIHR5cGUgYXNzb2NpYXRlZCB3aXRoIGl0LlxuY2xhc3MgTm9kZVR5cGUge1xuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAvLy8gVGhlIG5hbWUgb2YgdGhlIG5vZGUgdHlwZS4gTm90IG5lY2Vzc2FyaWx5IHVuaXF1ZSwgYnV0IGlmIHRoZVxuICAgIC8vLyBncmFtbWFyIHdhcyB3cml0dGVuIHByb3Blcmx5LCBkaWZmZXJlbnQgbm9kZSB0eXBlcyB3aXRoIHRoZVxuICAgIC8vLyBzYW1lIG5hbWUgd2l0aGluIGEgbm9kZSBzZXQgc2hvdWxkIHBsYXkgdGhlIHNhbWUgc2VtYW50aWNcbiAgICAvLy8gcm9sZS5cbiAgICBuYW1lLCBcbiAgICAvLy8gQGludGVybmFsXG4gICAgcHJvcHMsIFxuICAgIC8vLyBUaGUgaWQgb2YgdGhpcyBub2RlIGluIGl0cyBzZXQuIENvcnJlc3BvbmRzIHRvIHRoZSB0ZXJtIGlkc1xuICAgIC8vLyB1c2VkIGluIHRoZSBwYXJzZXIuXG4gICAgaWQsIFxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBmbGFncyA9IDApIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5wcm9wcyA9IHByb3BzO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuZmxhZ3MgPSBmbGFncztcbiAgICB9XG4gICAgc3RhdGljIGRlZmluZShzcGVjKSB7XG4gICAgICAgIGxldCBwcm9wcyA9IHNwZWMucHJvcHMgJiYgc3BlYy5wcm9wcy5sZW5ndGggPyBPYmplY3QuY3JlYXRlKG51bGwpIDogbm9Qcm9wcztcbiAgICAgICAgbGV0IGZsYWdzID0gKHNwZWMudG9wID8gMSAvKiBUb3AgKi8gOiAwKSB8IChzcGVjLnNraXBwZWQgPyAyIC8qIFNraXBwZWQgKi8gOiAwKSB8XG4gICAgICAgICAgICAoc3BlYy5lcnJvciA/IDQgLyogRXJyb3IgKi8gOiAwKSB8IChzcGVjLm5hbWUgPT0gbnVsbCA/IDggLyogQW5vbnltb3VzICovIDogMCk7XG4gICAgICAgIGxldCB0eXBlID0gbmV3IE5vZGVUeXBlKHNwZWMubmFtZSB8fCBcIlwiLCBwcm9wcywgc3BlYy5pZCwgZmxhZ3MpO1xuICAgICAgICBpZiAoc3BlYy5wcm9wcylcbiAgICAgICAgICAgIGZvciAobGV0IHNyYyBvZiBzcGVjLnByb3BzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHNyYykpXG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IHNyYyh0eXBlKTtcbiAgICAgICAgICAgICAgICBpZiAoc3JjKVxuICAgICAgICAgICAgICAgICAgICBzcmNbMF0uc2V0KHByb3BzLCBzcmNbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHlwZTtcbiAgICB9XG4gICAgLy8vIFJldHJpZXZlcyBhIG5vZGUgcHJvcCBmb3IgdGhpcyB0eXBlLiBXaWxsIHJldHVybiBgdW5kZWZpbmVkYCBpZlxuICAgIC8vLyB0aGUgcHJvcCBpc24ndCBwcmVzZW50IG9uIHRoaXMgbm9kZS5cbiAgICBwcm9wKHByb3ApIHsgcmV0dXJuIHRoaXMucHJvcHNbcHJvcC5pZF07IH1cbiAgICAvLy8gVHJ1ZSB3aGVuIHRoaXMgaXMgdGhlIHRvcCBub2RlIG9mIGEgZ3JhbW1hci5cbiAgICBnZXQgaXNUb3AoKSB7IHJldHVybiAodGhpcy5mbGFncyAmIDEgLyogVG9wICovKSA+IDA7IH1cbiAgICAvLy8gVHJ1ZSB3aGVuIHRoaXMgbm9kZSBpcyBwcm9kdWNlZCBieSBhIHNraXAgcnVsZS5cbiAgICBnZXQgaXNTa2lwcGVkKCkgeyByZXR1cm4gKHRoaXMuZmxhZ3MgJiAyIC8qIFNraXBwZWQgKi8pID4gMDsgfVxuICAgIC8vLyBJbmRpY2F0ZXMgd2hldGhlciB0aGlzIGlzIGFuIGVycm9yIG5vZGUuXG4gICAgZ2V0IGlzRXJyb3IoKSB7IHJldHVybiAodGhpcy5mbGFncyAmIDQgLyogRXJyb3IgKi8pID4gMDsgfVxuICAgIC8vLyBXaGVuIHRydWUsIHRoaXMgbm9kZSB0eXBlIGRvZXNuJ3QgY29ycmVzcG9uZCB0byBhIHVzZXItZGVjbGFyZWRcbiAgICAvLy8gbmFtZWQgbm9kZSwgZm9yIGV4YW1wbGUgYmVjYXVzZSBpdCBpcyB1c2VkIHRvIGNhY2hlIHJlcGV0aXRpb24uXG4gICAgZ2V0IGlzQW5vbnltb3VzKCkgeyByZXR1cm4gKHRoaXMuZmxhZ3MgJiA4IC8qIEFub255bW91cyAqLykgPiAwOyB9XG4gICAgLy8vIFJldHVybnMgdHJ1ZSB3aGVuIHRoaXMgbm9kZSdzIG5hbWUgb3Igb25lIG9mIGl0c1xuICAgIC8vLyBbZ3JvdXBzXSgjdHJlZS5Ob2RlUHJvcF5ncm91cCkgbWF0Y2hlcyB0aGUgZ2l2ZW4gc3RyaW5nLlxuICAgIGlzKG5hbWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBuYW1lID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5uYW1lID09IG5hbWUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBsZXQgZ3JvdXAgPSB0aGlzLnByb3AoTm9kZVByb3AuZ3JvdXApO1xuICAgICAgICAgICAgcmV0dXJuIGdyb3VwID8gZ3JvdXAuaW5kZXhPZihuYW1lKSA+IC0xIDogZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaWQgPT0gbmFtZTtcbiAgICB9XG4gICAgLy8vIENyZWF0ZSBhIGZ1bmN0aW9uIGZyb20gbm9kZSB0eXBlcyB0byBhcmJpdHJhcnkgdmFsdWVzIGJ5XG4gICAgLy8vIHNwZWNpZnlpbmcgYW4gb2JqZWN0IHdob3NlIHByb3BlcnR5IG5hbWVzIGFyZSBub2RlIG9yXG4gICAgLy8vIFtncm91cF0oI3RyZWUuTm9kZVByb3BeZ3JvdXApIG5hbWVzLiBPZnRlbiB1c2VmdWwgd2l0aFxuICAgIC8vLyBbYE5vZGVQcm9wLmFkZGBdKCN0cmVlLk5vZGVQcm9wLmFkZCkuIFlvdSBjYW4gcHV0IG11bHRpcGxlXG4gICAgLy8vIG5hbWVzLCBzZXBhcmF0ZWQgYnkgc3BhY2VzLCBpbiBhIHNpbmdsZSBwcm9wZXJ0eSBuYW1lIHRvIG1hcFxuICAgIC8vLyBtdWx0aXBsZSBub2RlIG5hbWVzIHRvIGEgc2luZ2xlIHZhbHVlLlxuICAgIHN0YXRpYyBtYXRjaChtYXApIHtcbiAgICAgICAgbGV0IGRpcmVjdCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIGZvciAobGV0IHByb3AgaW4gbWFwKVxuICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBvZiBwcm9wLnNwbGl0KFwiIFwiKSlcbiAgICAgICAgICAgICAgICBkaXJlY3RbbmFtZV0gPSBtYXBbcHJvcF07XG4gICAgICAgIHJldHVybiAobm9kZSkgPT4ge1xuICAgICAgICAgICAgZm9yIChsZXQgZ3JvdXBzID0gbm9kZS5wcm9wKE5vZGVQcm9wLmdyb3VwKSwgaSA9IC0xOyBpIDwgKGdyb3VwcyA/IGdyb3Vwcy5sZW5ndGggOiAwKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZGlyZWN0W2kgPCAwID8gbm9kZS5uYW1lIDogZ3JvdXBzW2ldXTtcbiAgICAgICAgICAgICAgICBpZiAoZm91bmQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3VuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG59XG4vLy8gQW4gZW1wdHkgZHVtbXkgbm9kZSB0eXBlIHRvIHVzZSB3aGVuIG5vIGFjdHVhbCB0eXBlIGlzIGF2YWlsYWJsZS5cbk5vZGVUeXBlLm5vbmUgPSBuZXcgTm9kZVR5cGUoXCJcIiwgT2JqZWN0LmNyZWF0ZShudWxsKSwgMCwgOCAvKiBBbm9ueW1vdXMgKi8pO1xuLy8vIEEgbm9kZSBzZXQgaG9sZHMgYSBjb2xsZWN0aW9uIG9mIG5vZGUgdHlwZXMuIEl0IGlzIHVzZWQgdG9cbi8vLyBjb21wYWN0bHkgcmVwcmVzZW50IHRyZWVzIGJ5IHN0b3JpbmcgdGhlaXIgdHlwZSBpZHMsIHJhdGhlciB0aGFuIGFcbi8vLyBmdWxsIHBvaW50ZXIgdG8gdGhlIHR5cGUgb2JqZWN0LCBpbiBhIG51bWJlciBhcnJheS4gRWFjaCBwYXJzZXJcbi8vLyBbaGFzXSgjbGV6ZXIuUGFyc2VyLm5vZGVTZXQpIGEgbm9kZSBzZXQsIGFuZCBbdHJlZVxuLy8vIGJ1ZmZlcnNdKCN0cmVlLlRyZWVCdWZmZXIpIGNhbiBvbmx5IHN0b3JlIGNvbGxlY3Rpb25zIG9mIG5vZGVzXG4vLy8gZnJvbSB0aGUgc2FtZSBzZXQuIEEgc2V0IGNhbiBoYXZlIGEgbWF4aW11bSBvZiAyKioxNiAoNjU1MzYpXG4vLy8gbm9kZSB0eXBlcyBpbiBpdCwgc28gdGhhdCB0aGUgaWRzIGZpdCBpbnRvIDE2LWJpdCB0eXBlZCBhcnJheVxuLy8vIHNsb3RzLlxuY2xhc3MgTm9kZVNldCB7XG4gICAgLy8vIENyZWF0ZSBhIHNldCB3aXRoIHRoZSBnaXZlbiB0eXBlcy4gVGhlIGBpZGAgcHJvcGVydHkgb2YgZWFjaFxuICAgIC8vLyB0eXBlIHNob3VsZCBjb3JyZXNwb25kIHRvIGl0cyBwb3NpdGlvbiB3aXRoaW4gdGhlIGFycmF5LlxuICAgIGNvbnN0cnVjdG9yKFxuICAgIC8vLyBUaGUgbm9kZSB0eXBlcyBpbiB0aGlzIHNldCwgYnkgaWQuXG4gICAgdHlwZXMpIHtcbiAgICAgICAgdGhpcy50eXBlcyA9IHR5cGVzO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR5cGVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgaWYgKHR5cGVzW2ldLmlkICE9IGkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJOb2RlIHR5cGUgaWRzIHNob3VsZCBjb3JyZXNwb25kIHRvIGFycmF5IHBvc2l0aW9ucyB3aGVuIGNyZWF0aW5nIGEgbm9kZSBzZXRcIik7XG4gICAgfVxuICAgIC8vLyBDcmVhdGUgYSBjb3B5IG9mIHRoaXMgc2V0IHdpdGggc29tZSBub2RlIHByb3BlcnRpZXMgYWRkZWQuIFRoZVxuICAgIC8vLyBhcmd1bWVudHMgdG8gdGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNyZWF0ZWQgd2l0aFxuICAgIC8vLyBbYE5vZGVQcm9wLmFkZGBdKCN0cmVlLk5vZGVQcm9wLmFkZCkuXG4gICAgZXh0ZW5kKC4uLnByb3BzKSB7XG4gICAgICAgIGxldCBuZXdUeXBlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCB0eXBlIG9mIHRoaXMudHlwZXMpIHtcbiAgICAgICAgICAgIGxldCBuZXdQcm9wcyA9IG51bGw7XG4gICAgICAgICAgICBmb3IgKGxldCBzb3VyY2Ugb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICBsZXQgYWRkID0gc291cmNlKHR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChhZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXdQcm9wcylcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Byb3BzID0gT2JqZWN0LmFzc2lnbih7fSwgdHlwZS5wcm9wcyk7XG4gICAgICAgICAgICAgICAgICAgIGFkZFswXS5zZXQobmV3UHJvcHMsIGFkZFsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3VHlwZXMucHVzaChuZXdQcm9wcyA/IG5ldyBOb2RlVHlwZSh0eXBlLm5hbWUsIG5ld1Byb3BzLCB0eXBlLmlkLCB0eXBlLmZsYWdzKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgTm9kZVNldChuZXdUeXBlcyk7XG4gICAgfVxufVxuLy8vIEEgcGllY2Ugb2Ygc3ludGF4IHRyZWUuIFRoZXJlIGFyZSB0d28gd2F5cyB0byBhcHByb2FjaCB0aGVzZVxuLy8vIHRyZWVzOiB0aGUgd2F5IHRoZXkgYXJlIGFjdHVhbGx5IHN0b3JlZCBpbiBtZW1vcnksIGFuZCB0aGVcbi8vLyBjb252ZW5pZW50IHdheS5cbi8vL1xuLy8vIFN5bnRheCB0cmVlcyBhcmUgc3RvcmVkIGFzIGEgdHJlZSBvZiBgVHJlZWAgYW5kIGBUcmVlQnVmZmVyYFxuLy8vIG9iamVjdHMuIEJ5IHBhY2tpbmcgZGV0YWlsIGluZm9ybWF0aW9uIGludG8gYFRyZWVCdWZmZXJgIGxlYWZcbi8vLyBub2RlcywgdGhlIHJlcHJlc2VudGF0aW9uIGlzIG1hZGUgYSBsb3QgbW9yZSBtZW1vcnktZWZmaWNpZW50LlxuLy8vXG4vLy8gSG93ZXZlciwgd2hlbiB5b3Ugd2FudCB0byBhY3R1YWxseSB3b3JrIHdpdGggdHJlZSBub2RlcywgdGhpc1xuLy8vIHJlcHJlc2VudGF0aW9uIGlzIHZlcnkgYXdrd2FyZCwgc28gbW9zdCBjbGllbnQgY29kZSB3aWxsIHdhbnQgdG9cbi8vLyB1c2UgdGhlIGBUcmVlQ3Vyc29yYCBpbnRlcmZhY2UgaW5zdGVhZCwgd2hpY2ggcHJvdmlkZXMgYSB2aWV3IG9uXG4vLy8gc29tZSBwYXJ0IG9mIHRoaXMgZGF0YSBzdHJ1Y3R1cmUsIGFuZCBjYW4gYmUgdXNlZCB0byBtb3ZlIGFyb3VuZFxuLy8vIHRvIGFkamFjZW50IG5vZGVzLlxuY2xhc3MgVHJlZSB7XG4gICAgLy8vIENvbnN0cnVjdCBhIG5ldyB0cmVlLiBZb3UgdXN1YWxseSB3YW50IHRvIGdvIHRocm91Z2hcbiAgICAvLy8gW2BUcmVlLmJ1aWxkYF0oI3RyZWUuVHJlZV5idWlsZCkgaW5zdGVhZC5cbiAgICBjb25zdHJ1Y3Rvcih0eXBlLCBcbiAgICAvLy8gVGhlIHRyZWUncyBjaGlsZCBub2Rlcy4gQ2hpbGRyZW4gc21hbGwgZW5vdWdoIHRvIGZpdCBpbiBhXG4gICAgLy8vIGBUcmVlQnVmZmVyIHdpbGwgYmUgcmVwcmVzZW50ZWQgYXMgc3VjaCwgb3RoZXIgY2hpbGRyZW4gY2FuIGJlXG4gICAgLy8vIGZ1cnRoZXIgYFRyZWVgIGluc3RhbmNlcyB3aXRoIHRoZWlyIG93biBpbnRlcm5hbCBzdHJ1Y3R1cmUuXG4gICAgY2hpbGRyZW4sIFxuICAgIC8vLyBUaGUgcG9zaXRpb25zIChvZmZzZXRzIHJlbGF0aXZlIHRvIHRoZSBzdGFydCBvZiB0aGlzIHRyZWUpIG9mXG4gICAgLy8vIHRoZSBjaGlsZHJlbi5cbiAgICBwb3NpdGlvbnMsIFxuICAgIC8vLyBUaGUgdG90YWwgbGVuZ3RoIG9mIHRoaXMgdHJlZVxuICAgIGxlbmd0aCkge1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgICAgIHRoaXMucG9zaXRpb25zID0gcG9zaXRpb25zO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICBsZXQgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuLm1hcChjID0+IGMudG9TdHJpbmcoKSkuam9pbigpO1xuICAgICAgICByZXR1cm4gIXRoaXMudHlwZS5uYW1lID8gY2hpbGRyZW4gOlxuICAgICAgICAgICAgKC9cXFcvLnRlc3QodGhpcy50eXBlLm5hbWUpICYmICF0aGlzLnR5cGUuaXNFcnJvciA/IEpTT04uc3RyaW5naWZ5KHRoaXMudHlwZS5uYW1lKSA6IHRoaXMudHlwZS5uYW1lKSArXG4gICAgICAgICAgICAgICAgKGNoaWxkcmVuLmxlbmd0aCA/IFwiKFwiICsgY2hpbGRyZW4gKyBcIilcIiA6IFwiXCIpO1xuICAgIH1cbiAgICAvLy8gR2V0IGEgW3RyZWUgY3Vyc29yXSgjdHJlZS5UcmVlQ3Vyc29yKSByb290ZWQgYXQgdGhpcyB0cmVlLiBXaGVuXG4gICAgLy8vIGBwb3NgIGlzIGdpdmVuLCB0aGUgY3Vyc29yIGlzIFttb3ZlZF0oI3RyZWUuVHJlZUN1cnNvci5tb3ZlVG8pXG4gICAgLy8vIHRvIHRoZSBnaXZlbiBwb3NpdGlvbiBhbmQgc2lkZS5cbiAgICBjdXJzb3IocG9zLCBzaWRlID0gMCkge1xuICAgICAgICBsZXQgc2NvcGUgPSAocG9zICE9IG51bGwgJiYgQ2FjaGVkTm9kZS5nZXQodGhpcykpIHx8IHRoaXMudG9wTm9kZTtcbiAgICAgICAgbGV0IGN1cnNvciA9IG5ldyBUcmVlQ3Vyc29yKHNjb3BlKTtcbiAgICAgICAgaWYgKHBvcyAhPSBudWxsKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHBvcywgc2lkZSk7XG4gICAgICAgICAgICBDYWNoZWROb2RlLnNldCh0aGlzLCBjdXJzb3IuX3RyZWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJzb3I7XG4gICAgfVxuICAgIC8vLyBHZXQgYSBbdHJlZSBjdXJzb3JdKCN0cmVlLlRyZWVDdXJzb3IpIHRoYXQsIHVubGlrZSByZWd1bGFyXG4gICAgLy8vIGN1cnNvcnMsIGRvZXNuJ3Qgc2tpcCBbYW5vbnltb3VzXSgjdHJlZS5Ob2RlVHlwZS5pc0Fub255bW91cylcbiAgICAvLy8gbm9kZXMuXG4gICAgZnVsbEN1cnNvcigpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUcmVlQ3Vyc29yKHRoaXMudG9wTm9kZSwgdHJ1ZSk7XG4gICAgfVxuICAgIC8vLyBHZXQgYSBbc3ludGF4IG5vZGVdKCN0cmVlLlN5bnRheE5vZGUpIG9iamVjdCBmb3IgdGhlIHRvcCBvZiB0aGVcbiAgICAvLy8gdHJlZS5cbiAgICBnZXQgdG9wTm9kZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUcmVlTm9kZSh0aGlzLCAwLCAwLCBudWxsKTtcbiAgICB9XG4gICAgLy8vIEdldCB0aGUgW3N5bnRheCBub2RlXSgjdHJlZS5TeW50YXhOb2RlKSBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24uXG4gICAgLy8vIElmIGBzaWRlYCBpcyAtMSwgdGhpcyB3aWxsIG1vdmUgaW50byBub2RlcyB0aGF0IGVuZCBhdCB0aGVcbiAgICAvLy8gcG9zaXRpb24uIElmIDEsIGl0J2xsIG1vdmUgaW50byBub2RlcyB0aGF0IHN0YXJ0IGF0IHRoZVxuICAgIC8vLyBwb3NpdGlvbi4gV2l0aCAwLCBpdCdsbCBvbmx5IGVudGVyIG5vZGVzIHRoYXQgY292ZXIgdGhlIHBvc2l0aW9uXG4gICAgLy8vIGZyb20gYm90aCBzaWRlcy5cbiAgICByZXNvbHZlKHBvcywgc2lkZSA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3Vyc29yKHBvcywgc2lkZSkubm9kZTtcbiAgICB9XG4gICAgLy8vIEl0ZXJhdGUgb3ZlciB0aGUgdHJlZSBhbmQgaXRzIGNoaWxkcmVuLCBjYWxsaW5nIGBlbnRlcmAgZm9yIGFueVxuICAgIC8vLyBub2RlIHRoYXQgdG91Y2hlcyB0aGUgYGZyb21gL2B0b2AgcmVnaW9uIChpZiBnaXZlbikgYmVmb3JlXG4gICAgLy8vIHJ1bm5pbmcgb3ZlciBzdWNoIGEgbm9kZSdzIGNoaWxkcmVuLCBhbmQgYGxlYXZlYCAoaWYgZ2l2ZW4pIHdoZW5cbiAgICAvLy8gbGVhdmluZyB0aGUgbm9kZS4gV2hlbiBgZW50ZXJgIHJldHVybnMgYGZhbHNlYCwgdGhlIGdpdmVuIG5vZGVcbiAgICAvLy8gd2lsbCBub3QgaGF2ZSBpdHMgY2hpbGRyZW4gaXRlcmF0ZWQgb3ZlciAob3IgYGxlYXZlYCBjYWxsZWQpLlxuICAgIGl0ZXJhdGUoc3BlYykge1xuICAgICAgICBsZXQgeyBlbnRlciwgbGVhdmUsIGZyb20gPSAwLCB0byA9IHRoaXMubGVuZ3RoIH0gPSBzcGVjO1xuICAgICAgICBmb3IgKGxldCBjID0gdGhpcy5jdXJzb3IoKTs7KSB7XG4gICAgICAgICAgICBsZXQgbXVzdExlYXZlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoYy5mcm9tIDw9IHRvICYmIGMudG8gPj0gZnJvbSAmJiAoYy50eXBlLmlzQW5vbnltb3VzIHx8IGVudGVyKGMudHlwZSwgYy5mcm9tLCBjLnRvKSAhPT0gZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGMuZmlyc3RDaGlsZCgpKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAoIWMudHlwZS5pc0Fub255bW91cylcbiAgICAgICAgICAgICAgICAgICAgbXVzdExlYXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBpZiAobXVzdExlYXZlICYmIGxlYXZlKVxuICAgICAgICAgICAgICAgICAgICBsZWF2ZShjLnR5cGUsIGMuZnJvbSwgYy50byk7XG4gICAgICAgICAgICAgICAgbXVzdExlYXZlID0gYy50eXBlLmlzQW5vbnltb3VzO1xuICAgICAgICAgICAgICAgIGlmIChjLm5leHRTaWJsaW5nKCkpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICghYy5wYXJlbnQoKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIG11c3RMZWF2ZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIEJhbGFuY2UgdGhlIGRpcmVjdCBjaGlsZHJlbiBvZiB0aGlzIHRyZWUuXG4gICAgYmFsYW5jZShtYXhCdWZmZXJMZW5ndGggPSBEZWZhdWx0QnVmZmVyTGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNoaWxkcmVuLmxlbmd0aCA8PSBCYWxhbmNlQnJhbmNoRmFjdG9yID8gdGhpc1xuICAgICAgICAgICAgOiBiYWxhbmNlUmFuZ2UodGhpcy50eXBlLCBOb2RlVHlwZS5ub25lLCB0aGlzLmNoaWxkcmVuLCB0aGlzLnBvc2l0aW9ucywgMCwgdGhpcy5jaGlsZHJlbi5sZW5ndGgsIDAsIG1heEJ1ZmZlckxlbmd0aCwgdGhpcy5sZW5ndGgsIDApO1xuICAgIH1cbiAgICAvLy8gQnVpbGQgYSB0cmVlIGZyb20gYSBwb3N0Zml4LW9yZGVyZWQgYnVmZmVyIG9mIG5vZGUgaW5mb3JtYXRpb24sXG4gICAgLy8vIG9yIGEgY3Vyc29yIG92ZXIgc3VjaCBhIGJ1ZmZlci5cbiAgICBzdGF0aWMgYnVpbGQoZGF0YSkgeyByZXR1cm4gYnVpbGRUcmVlKGRhdGEpOyB9XG59XG4vLy8gVGhlIGVtcHR5IHRyZWVcblRyZWUuZW1wdHkgPSBuZXcgVHJlZShOb2RlVHlwZS5ub25lLCBbXSwgW10sIDApO1xuLy8gRm9yIHRyZWVzIHRoYXQgbmVlZCBhIGNvbnRleHQgaGFzaCBhdHRhY2hlZCwgd2UncmUgdXNpbmcgdGhpc1xuLy8ga2x1ZGdlIHdoaWNoIGFzc2lnbnMgYW4gZXh0cmEgcHJvcGVydHkgZGlyZWN0bHkgYWZ0ZXJcbi8vIGluaXRpYWxpemF0aW9uIChjcmVhdGluZyBhIHNpbmdsZSBuZXcgb2JqZWN0IHNoYXBlKS5cbmZ1bmN0aW9uIHdpdGhIYXNoKHRyZWUsIGhhc2gpIHtcbiAgICBpZiAoaGFzaClcbiAgICAgICAgdHJlZS5jb250ZXh0SGFzaCA9IGhhc2g7XG4gICAgcmV0dXJuIHRyZWU7XG59XG4vLy8gVHJlZSBidWZmZXJzIGNvbnRhaW4gKHR5cGUsIHN0YXJ0LCBlbmQsIGVuZEluZGV4KSBxdWFkcyBmb3IgZWFjaFxuLy8vIG5vZGUuIEluIHN1Y2ggYSBidWZmZXIsIG5vZGVzIGFyZSBzdG9yZWQgaW4gcHJlZml4IG9yZGVyIChwYXJlbnRzXG4vLy8gYmVmb3JlIGNoaWxkcmVuLCB3aXRoIHRoZSBlbmRJbmRleCBvZiB0aGUgcGFyZW50IGluZGljYXRpbmcgd2hpY2hcbi8vLyBjaGlsZHJlbiBiZWxvbmcgdG8gaXQpXG5jbGFzcyBUcmVlQnVmZmVyIHtcbiAgICAvLy8gQ3JlYXRlIGEgdHJlZSBidWZmZXIgQGludGVybmFsXG4gICAgY29uc3RydWN0b3IoXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGJ1ZmZlciwgXG4gICAgLy8gVGhlIHRvdGFsIGxlbmd0aCBvZiB0aGUgZ3JvdXAgb2Ygbm9kZXMgaW4gdGhlIGJ1ZmZlci5cbiAgICBsZW5ndGgsIFxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzZXQsIHR5cGUgPSBOb2RlVHlwZS5ub25lKSB7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgdGhpcy5zZXQgPSBzZXQ7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy5idWZmZXIubGVuZ3RoOykge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godGhpcy5jaGlsZFN0cmluZyhpbmRleCkpO1xuICAgICAgICAgICAgaW5kZXggPSB0aGlzLmJ1ZmZlcltpbmRleCArIDNdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQuam9pbihcIixcIik7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBjaGlsZFN0cmluZyhpbmRleCkge1xuICAgICAgICBsZXQgaWQgPSB0aGlzLmJ1ZmZlcltpbmRleF0sIGVuZEluZGV4ID0gdGhpcy5idWZmZXJbaW5kZXggKyAzXTtcbiAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnNldC50eXBlc1tpZF0sIHJlc3VsdCA9IHR5cGUubmFtZTtcbiAgICAgICAgaWYgKC9cXFcvLnRlc3QocmVzdWx0KSAmJiAhdHlwZS5pc0Vycm9yKVxuICAgICAgICAgICAgcmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkocmVzdWx0KTtcbiAgICAgICAgaW5kZXggKz0gNDtcbiAgICAgICAgaWYgKGVuZEluZGV4ID09IGluZGV4KVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgbGV0IGNoaWxkcmVuID0gW107XG4gICAgICAgIHdoaWxlIChpbmRleCA8IGVuZEluZGV4KSB7XG4gICAgICAgICAgICBjaGlsZHJlbi5wdXNoKHRoaXMuY2hpbGRTdHJpbmcoaW5kZXgpKTtcbiAgICAgICAgICAgIGluZGV4ID0gdGhpcy5idWZmZXJbaW5kZXggKyAzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0ICsgXCIoXCIgKyBjaGlsZHJlbi5qb2luKFwiLFwiKSArIFwiKVwiO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgZmluZENoaWxkKHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBkaXIsIGFmdGVyKSB7XG4gICAgICAgIGxldCB7IGJ1ZmZlciB9ID0gdGhpcywgcGljayA9IC0xO1xuICAgICAgICBmb3IgKGxldCBpID0gc3RhcnRJbmRleDsgaSAhPSBlbmRJbmRleDsgaSA9IGJ1ZmZlcltpICsgM10pIHtcbiAgICAgICAgICAgIGlmIChhZnRlciAhPSAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pIHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnQgPSBidWZmZXJbaSArIDFdLCBlbmQgPSBidWZmZXJbaSArIDJdO1xuICAgICAgICAgICAgICAgIGlmIChkaXIgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmQgPiBhZnRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIHBpY2sgPSBpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW5kID4gYWZ0ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFydCA8IGFmdGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgcGljayA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmQgPj0gYWZ0ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwaWNrID0gaTtcbiAgICAgICAgICAgICAgICBpZiAoZGlyID4gMClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBpY2s7XG4gICAgfVxufVxuY2xhc3MgVHJlZU5vZGUge1xuICAgIGNvbnN0cnVjdG9yKG5vZGUsIGZyb20sIGluZGV4LCBfcGFyZW50KSB7XG4gICAgICAgIHRoaXMubm9kZSA9IG5vZGU7XG4gICAgICAgIHRoaXMuZnJvbSA9IGZyb207XG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gX3BhcmVudDtcbiAgICB9XG4gICAgZ2V0IHR5cGUoKSB7IHJldHVybiB0aGlzLm5vZGUudHlwZTsgfVxuICAgIGdldCBuYW1lKCkgeyByZXR1cm4gdGhpcy5ub2RlLnR5cGUubmFtZTsgfVxuICAgIGdldCB0bygpIHsgcmV0dXJuIHRoaXMuZnJvbSArIHRoaXMubm9kZS5sZW5ndGg7IH1cbiAgICBuZXh0Q2hpbGQoaSwgZGlyLCBhZnRlciwgZnVsbCA9IGZhbHNlKSB7XG4gICAgICAgIGZvciAobGV0IHBhcmVudCA9IHRoaXM7Oykge1xuICAgICAgICAgICAgZm9yIChsZXQgeyBjaGlsZHJlbiwgcG9zaXRpb25zIH0gPSBwYXJlbnQubm9kZSwgZSA9IGRpciA+IDAgPyBjaGlsZHJlbi5sZW5ndGggOiAtMTsgaSAhPSBlOyBpICs9IGRpcikge1xuICAgICAgICAgICAgICAgIGxldCBuZXh0ID0gY2hpbGRyZW5baV0sIHN0YXJ0ID0gcG9zaXRpb25zW2ldICsgcGFyZW50LmZyb207XG4gICAgICAgICAgICAgICAgaWYgKGFmdGVyICE9IC0xMDAwMDAwMDAgLyogTm9uZSAqLyAmJiAoZGlyIDwgMCA/IHN0YXJ0ID49IGFmdGVyIDogc3RhcnQgKyBuZXh0Lmxlbmd0aCA8PSBhZnRlcikpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0IGluc3RhbmNlb2YgVHJlZUJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSBuZXh0LmZpbmRDaGlsZCgwLCBuZXh0LmJ1ZmZlci5sZW5ndGgsIGRpciwgYWZ0ZXIgPT0gLTEwMDAwMDAwMCAvKiBOb25lICovID8gLTEwMDAwMDAwMCAvKiBOb25lICovIDogYWZ0ZXIgLSBzdGFydCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IC0xKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXJOb2RlKG5ldyBCdWZmZXJDb250ZXh0KHBhcmVudCwgbmV4dCwgaSwgc3RhcnQpLCBudWxsLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGZ1bGwgfHwgKCFuZXh0LnR5cGUuaXNBbm9ueW1vdXMgfHwgaGFzQ2hpbGQobmV4dCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBpbm5lciA9IG5ldyBUcmVlTm9kZShuZXh0LCBzdGFydCwgaSwgcGFyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bGwgfHwgIWlubmVyLnR5cGUuaXNBbm9ueW1vdXMgPyBpbm5lciA6IGlubmVyLm5leHRDaGlsZChkaXIgPCAwID8gbmV4dC5jaGlsZHJlbi5sZW5ndGggLSAxIDogMCwgZGlyLCBhZnRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZ1bGwgfHwgIXBhcmVudC50eXBlLmlzQW5vbnltb3VzKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgaSA9IHBhcmVudC5pbmRleCArIGRpcjtcbiAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5fcGFyZW50O1xuICAgICAgICAgICAgaWYgKCFwYXJlbnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IGZpcnN0Q2hpbGQoKSB7IHJldHVybiB0aGlzLm5leHRDaGlsZCgwLCAxLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pOyB9XG4gICAgZ2V0IGxhc3RDaGlsZCgpIHsgcmV0dXJuIHRoaXMubmV4dENoaWxkKHRoaXMubm9kZS5jaGlsZHJlbi5sZW5ndGggLSAxLCAtMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKTsgfVxuICAgIGNoaWxkQWZ0ZXIocG9zKSB7IHJldHVybiB0aGlzLm5leHRDaGlsZCgwLCAxLCBwb3MpOyB9XG4gICAgY2hpbGRCZWZvcmUocG9zKSB7IHJldHVybiB0aGlzLm5leHRDaGlsZCh0aGlzLm5vZGUuY2hpbGRyZW4ubGVuZ3RoIC0gMSwgLTEsIHBvcyk7IH1cbiAgICBuZXh0U2lnbmlmaWNhbnRQYXJlbnQoKSB7XG4gICAgICAgIGxldCB2YWwgPSB0aGlzO1xuICAgICAgICB3aGlsZSAodmFsLnR5cGUuaXNBbm9ueW1vdXMgJiYgdmFsLl9wYXJlbnQpXG4gICAgICAgICAgICB2YWwgPSB2YWwuX3BhcmVudDtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG4gICAgZ2V0IHBhcmVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudCA/IHRoaXMuX3BhcmVudC5uZXh0U2lnbmlmaWNhbnRQYXJlbnQoKSA6IG51bGw7XG4gICAgfVxuICAgIGdldCBuZXh0U2libGluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudCA/IHRoaXMuX3BhcmVudC5uZXh0Q2hpbGQodGhpcy5pbmRleCArIDEsIDEsIC0xKSA6IG51bGw7XG4gICAgfVxuICAgIGdldCBwcmV2U2libGluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudCA/IHRoaXMuX3BhcmVudC5uZXh0Q2hpbGQodGhpcy5pbmRleCAtIDEsIC0xLCAtMSkgOiBudWxsO1xuICAgIH1cbiAgICBnZXQgY3Vyc29yKCkgeyByZXR1cm4gbmV3IFRyZWVDdXJzb3IodGhpcyk7IH1cbiAgICByZXNvbHZlKHBvcywgc2lkZSA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3Vyc29yLm1vdmVUbyhwb3MsIHNpZGUpLm5vZGU7XG4gICAgfVxuICAgIGdldENoaWxkKHR5cGUsIGJlZm9yZSA9IG51bGwsIGFmdGVyID0gbnVsbCkge1xuICAgICAgICBsZXQgciA9IGdldENoaWxkcmVuKHRoaXMsIHR5cGUsIGJlZm9yZSwgYWZ0ZXIpO1xuICAgICAgICByZXR1cm4gci5sZW5ndGggPyByWzBdIDogbnVsbDtcbiAgICB9XG4gICAgZ2V0Q2hpbGRyZW4odHlwZSwgYmVmb3JlID0gbnVsbCwgYWZ0ZXIgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBnZXRDaGlsZHJlbih0aGlzLCB0eXBlLCBiZWZvcmUsIGFmdGVyKTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHRvU3RyaW5nKCkgeyByZXR1cm4gdGhpcy5ub2RlLnRvU3RyaW5nKCk7IH1cbn1cbmZ1bmN0aW9uIGdldENoaWxkcmVuKG5vZGUsIHR5cGUsIGJlZm9yZSwgYWZ0ZXIpIHtcbiAgICBsZXQgY3VyID0gbm9kZS5jdXJzb3IsIHJlc3VsdCA9IFtdO1xuICAgIGlmICghY3VyLmZpcnN0Q2hpbGQoKSlcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoYmVmb3JlICE9IG51bGwpXG4gICAgICAgIHdoaWxlICghY3VyLnR5cGUuaXMoYmVmb3JlKSlcbiAgICAgICAgICAgIGlmICghY3VyLm5leHRTaWJsaW5nKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICBmb3IgKDs7KSB7XG4gICAgICAgIGlmIChhZnRlciAhPSBudWxsICYmIGN1ci50eXBlLmlzKGFmdGVyKSlcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIGlmIChjdXIudHlwZS5pcyh0eXBlKSlcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGN1ci5ub2RlKTtcbiAgICAgICAgaWYgKCFjdXIubmV4dFNpYmxpbmcoKSlcbiAgICAgICAgICAgIHJldHVybiBhZnRlciA9PSBudWxsID8gcmVzdWx0IDogW107XG4gICAgfVxufVxuY2xhc3MgQnVmZmVyQ29udGV4dCB7XG4gICAgY29uc3RydWN0b3IocGFyZW50LCBidWZmZXIsIGluZGV4LCBzdGFydCkge1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgIH1cbn1cbmNsYXNzIEJ1ZmZlck5vZGUge1xuICAgIGNvbnN0cnVjdG9yKGNvbnRleHQsIF9wYXJlbnQsIGluZGV4KSB7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IF9wYXJlbnQ7XG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy50eXBlID0gY29udGV4dC5idWZmZXIuc2V0LnR5cGVzW2NvbnRleHQuYnVmZmVyLmJ1ZmZlcltpbmRleF1dO1xuICAgIH1cbiAgICBnZXQgbmFtZSgpIHsgcmV0dXJuIHRoaXMudHlwZS5uYW1lOyB9XG4gICAgZ2V0IGZyb20oKSB7IHJldHVybiB0aGlzLmNvbnRleHQuc3RhcnQgKyB0aGlzLmNvbnRleHQuYnVmZmVyLmJ1ZmZlclt0aGlzLmluZGV4ICsgMV07IH1cbiAgICBnZXQgdG8oKSB7IHJldHVybiB0aGlzLmNvbnRleHQuc3RhcnQgKyB0aGlzLmNvbnRleHQuYnVmZmVyLmJ1ZmZlclt0aGlzLmluZGV4ICsgMl07IH1cbiAgICBjaGlsZChkaXIsIGFmdGVyKSB7XG4gICAgICAgIGxldCB7IGJ1ZmZlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgICAgICBsZXQgaW5kZXggPSBidWZmZXIuZmluZENoaWxkKHRoaXMuaW5kZXggKyA0LCBidWZmZXIuYnVmZmVyW3RoaXMuaW5kZXggKyAzXSwgZGlyLCBhZnRlciA9PSAtMTAwMDAwMDAwIC8qIE5vbmUgKi8gPyAtMTAwMDAwMDAwIC8qIE5vbmUgKi8gOiBhZnRlciAtIHRoaXMuY29udGV4dC5zdGFydCk7XG4gICAgICAgIHJldHVybiBpbmRleCA8IDAgPyBudWxsIDogbmV3IEJ1ZmZlck5vZGUodGhpcy5jb250ZXh0LCB0aGlzLCBpbmRleCk7XG4gICAgfVxuICAgIGdldCBmaXJzdENoaWxkKCkgeyByZXR1cm4gdGhpcy5jaGlsZCgxLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pOyB9XG4gICAgZ2V0IGxhc3RDaGlsZCgpIHsgcmV0dXJuIHRoaXMuY2hpbGQoLTEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLyk7IH1cbiAgICBjaGlsZEFmdGVyKHBvcykgeyByZXR1cm4gdGhpcy5jaGlsZCgxLCBwb3MpOyB9XG4gICAgY2hpbGRCZWZvcmUocG9zKSB7IHJldHVybiB0aGlzLmNoaWxkKC0xLCBwb3MpOyB9XG4gICAgZ2V0IHBhcmVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudCB8fCB0aGlzLmNvbnRleHQucGFyZW50Lm5leHRTaWduaWZpY2FudFBhcmVudCgpO1xuICAgIH1cbiAgICBleHRlcm5hbFNpYmxpbmcoZGlyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQgPyBudWxsIDogdGhpcy5jb250ZXh0LnBhcmVudC5uZXh0Q2hpbGQodGhpcy5jb250ZXh0LmluZGV4ICsgZGlyLCBkaXIsIC0xKTtcbiAgICB9XG4gICAgZ2V0IG5leHRTaWJsaW5nKCkge1xuICAgICAgICBsZXQgeyBidWZmZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICAgICAgbGV0IGFmdGVyID0gYnVmZmVyLmJ1ZmZlclt0aGlzLmluZGV4ICsgM107XG4gICAgICAgIGlmIChhZnRlciA8ICh0aGlzLl9wYXJlbnQgPyBidWZmZXIuYnVmZmVyW3RoaXMuX3BhcmVudC5pbmRleCArIDNdIDogYnVmZmVyLmJ1ZmZlci5sZW5ndGgpKVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXJOb2RlKHRoaXMuY29udGV4dCwgdGhpcy5fcGFyZW50LCBhZnRlcik7XG4gICAgICAgIHJldHVybiB0aGlzLmV4dGVybmFsU2libGluZygxKTtcbiAgICB9XG4gICAgZ2V0IHByZXZTaWJsaW5nKCkge1xuICAgICAgICBsZXQgeyBidWZmZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICAgICAgbGV0IHBhcmVudFN0YXJ0ID0gdGhpcy5fcGFyZW50ID8gdGhpcy5fcGFyZW50LmluZGV4ICsgNCA6IDA7XG4gICAgICAgIGlmICh0aGlzLmluZGV4ID09IHBhcmVudFN0YXJ0KVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXh0ZXJuYWxTaWJsaW5nKC0xKTtcbiAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXJOb2RlKHRoaXMuY29udGV4dCwgdGhpcy5fcGFyZW50LCBidWZmZXIuZmluZENoaWxkKHBhcmVudFN0YXJ0LCB0aGlzLmluZGV4LCAtMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKSk7XG4gICAgfVxuICAgIGdldCBjdXJzb3IoKSB7IHJldHVybiBuZXcgVHJlZUN1cnNvcih0aGlzKTsgfVxuICAgIHJlc29sdmUocG9zLCBzaWRlID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJzb3IubW92ZVRvKHBvcywgc2lkZSkubm9kZTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHRvU3RyaW5nKCkgeyByZXR1cm4gdGhpcy5jb250ZXh0LmJ1ZmZlci5jaGlsZFN0cmluZyh0aGlzLmluZGV4KTsgfVxuICAgIGdldENoaWxkKHR5cGUsIGJlZm9yZSA9IG51bGwsIGFmdGVyID0gbnVsbCkge1xuICAgICAgICBsZXQgciA9IGdldENoaWxkcmVuKHRoaXMsIHR5cGUsIGJlZm9yZSwgYWZ0ZXIpO1xuICAgICAgICByZXR1cm4gci5sZW5ndGggPyByWzBdIDogbnVsbDtcbiAgICB9XG4gICAgZ2V0Q2hpbGRyZW4odHlwZSwgYmVmb3JlID0gbnVsbCwgYWZ0ZXIgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBnZXRDaGlsZHJlbih0aGlzLCB0eXBlLCBiZWZvcmUsIGFmdGVyKTtcbiAgICB9XG59XG4vLy8gQSB0cmVlIGN1cnNvciBvYmplY3QgZm9jdXNlcyBvbiBhIGdpdmVuIG5vZGUgaW4gYSBzeW50YXggdHJlZSwgYW5kXG4vLy8gYWxsb3dzIHlvdSB0byBtb3ZlIHRvIGFkamFjZW50IG5vZGVzLlxuY2xhc3MgVHJlZUN1cnNvciB7XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGNvbnN0cnVjdG9yKG5vZGUsIGZ1bGwgPSBmYWxzZSkge1xuICAgICAgICB0aGlzLmZ1bGwgPSBmdWxsO1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBbXTtcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuYnVmZmVyTm9kZSA9IG51bGw7XG4gICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVHJlZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMueWllbGROb2RlKG5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fdHJlZSA9IG5vZGUuY29udGV4dC5wYXJlbnQ7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlciA9IG5vZGUuY29udGV4dDtcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSBub2RlLl9wYXJlbnQ7IG47IG4gPSBuLl9wYXJlbnQpXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFjay51bnNoaWZ0KG4uaW5kZXgpO1xuICAgICAgICAgICAgdGhpcy5idWZmZXJOb2RlID0gbm9kZTtcbiAgICAgICAgICAgIHRoaXMueWllbGRCdWYobm9kZS5pbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIFNob3J0aGFuZCBmb3IgYC50eXBlLm5hbWVgLlxuICAgIGdldCBuYW1lKCkgeyByZXR1cm4gdGhpcy50eXBlLm5hbWU7IH1cbiAgICB5aWVsZE5vZGUobm9kZSkge1xuICAgICAgICBpZiAoIW5vZGUpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHRoaXMuX3RyZWUgPSBub2RlO1xuICAgICAgICB0aGlzLnR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgIHRoaXMuZnJvbSA9IG5vZGUuZnJvbTtcbiAgICAgICAgdGhpcy50byA9IG5vZGUudG87XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB5aWVsZEJ1ZihpbmRleCwgdHlwZSkge1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGxldCB7IHN0YXJ0LCBidWZmZXIgfSA9IHRoaXMuYnVmZmVyO1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlIHx8IGJ1ZmZlci5zZXQudHlwZXNbYnVmZmVyLmJ1ZmZlcltpbmRleF1dO1xuICAgICAgICB0aGlzLmZyb20gPSBzdGFydCArIGJ1ZmZlci5idWZmZXJbaW5kZXggKyAxXTtcbiAgICAgICAgdGhpcy50byA9IHN0YXJ0ICsgYnVmZmVyLmJ1ZmZlcltpbmRleCArIDJdO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgeWllbGQobm9kZSkge1xuICAgICAgICBpZiAoIW5vZGUpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVHJlZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnlpZWxkTm9kZShub2RlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJ1ZmZlciA9IG5vZGUuY29udGV4dDtcbiAgICAgICAgcmV0dXJuIHRoaXMueWllbGRCdWYobm9kZS5pbmRleCwgbm9kZS50eXBlKTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5idWZmZXIgPyB0aGlzLmJ1ZmZlci5idWZmZXIuY2hpbGRTdHJpbmcodGhpcy5pbmRleCkgOiB0aGlzLl90cmVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBlbnRlcihkaXIsIGFmdGVyKSB7XG4gICAgICAgIGlmICghdGhpcy5idWZmZXIpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy55aWVsZCh0aGlzLl90cmVlLm5leHRDaGlsZChkaXIgPCAwID8gdGhpcy5fdHJlZS5ub2RlLmNoaWxkcmVuLmxlbmd0aCAtIDEgOiAwLCBkaXIsIGFmdGVyLCB0aGlzLmZ1bGwpKTtcbiAgICAgICAgbGV0IHsgYnVmZmVyIH0gPSB0aGlzLmJ1ZmZlcjtcbiAgICAgICAgbGV0IGluZGV4ID0gYnVmZmVyLmZpbmRDaGlsZCh0aGlzLmluZGV4ICsgNCwgYnVmZmVyLmJ1ZmZlclt0aGlzLmluZGV4ICsgM10sIGRpciwgYWZ0ZXIgPT0gLTEwMDAwMDAwMCAvKiBOb25lICovID8gLTEwMDAwMDAwMCAvKiBOb25lICovIDogYWZ0ZXIgLSB0aGlzLmJ1ZmZlci5zdGFydCk7XG4gICAgICAgIGlmIChpbmRleCA8IDApXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHRoaXMuc3RhY2sucHVzaCh0aGlzLmluZGV4KTtcbiAgICAgICAgcmV0dXJuIHRoaXMueWllbGRCdWYoaW5kZXgpO1xuICAgIH1cbiAgICAvLy8gTW92ZSB0aGUgY3Vyc29yIHRvIHRoaXMgbm9kZSdzIGZpcnN0IGNoaWxkLiBXaGVuIHRoaXMgcmV0dXJuc1xuICAgIC8vLyBmYWxzZSwgdGhlIG5vZGUgaGFzIG5vIGNoaWxkLCBhbmQgdGhlIGN1cnNvciBoYXMgbm90IGJlZW4gbW92ZWQuXG4gICAgZmlyc3RDaGlsZCgpIHsgcmV0dXJuIHRoaXMuZW50ZXIoMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKTsgfVxuICAgIC8vLyBNb3ZlIHRoZSBjdXJzb3IgdG8gdGhpcyBub2RlJ3MgbGFzdCBjaGlsZC5cbiAgICBsYXN0Q2hpbGQoKSB7IHJldHVybiB0aGlzLmVudGVyKC0xLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pOyB9XG4gICAgLy8vIE1vdmUgdGhlIGN1cnNvciB0byB0aGUgZmlyc3QgY2hpbGQgdGhhdCBzdGFydHMgYXQgb3IgYWZ0ZXIgYHBvc2AuXG4gICAgY2hpbGRBZnRlcihwb3MpIHsgcmV0dXJuIHRoaXMuZW50ZXIoMSwgcG9zKTsgfVxuICAgIC8vLyBNb3ZlIHRvIHRoZSBsYXN0IGNoaWxkIHRoYXQgZW5kcyBhdCBvciBiZWZvcmUgYHBvc2AuXG4gICAgY2hpbGRCZWZvcmUocG9zKSB7IHJldHVybiB0aGlzLmVudGVyKC0xLCBwb3MpOyB9XG4gICAgLy8vIE1vdmUgdGhlIG5vZGUncyBwYXJlbnQgbm9kZSwgaWYgdGhpcyBpc24ndCB0aGUgdG9wIG5vZGUuXG4gICAgcGFyZW50KCkge1xuICAgICAgICBpZiAoIXRoaXMuYnVmZmVyKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMueWllbGROb2RlKHRoaXMuZnVsbCA/IHRoaXMuX3RyZWUuX3BhcmVudCA6IHRoaXMuX3RyZWUucGFyZW50KTtcbiAgICAgICAgaWYgKHRoaXMuc3RhY2subGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMueWllbGRCdWYodGhpcy5zdGFjay5wb3AoKSk7XG4gICAgICAgIGxldCBwYXJlbnQgPSB0aGlzLmZ1bGwgPyB0aGlzLmJ1ZmZlci5wYXJlbnQgOiB0aGlzLmJ1ZmZlci5wYXJlbnQubmV4dFNpZ25pZmljYW50UGFyZW50KCk7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIHRoaXMueWllbGROb2RlKHBhcmVudCk7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzaWJsaW5nKGRpcikge1xuICAgICAgICBpZiAoIXRoaXMuYnVmZmVyKVxuICAgICAgICAgICAgcmV0dXJuICF0aGlzLl90cmVlLl9wYXJlbnQgPyBmYWxzZVxuICAgICAgICAgICAgICAgIDogdGhpcy55aWVsZCh0aGlzLl90cmVlLl9wYXJlbnQubmV4dENoaWxkKHRoaXMuX3RyZWUuaW5kZXggKyBkaXIsIGRpciwgLTEwMDAwMDAwMCAvKiBOb25lICovLCB0aGlzLmZ1bGwpKTtcbiAgICAgICAgbGV0IHsgYnVmZmVyIH0gPSB0aGlzLmJ1ZmZlciwgZCA9IHRoaXMuc3RhY2subGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGRpciA8IDApIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnRTdGFydCA9IGQgPCAwID8gMCA6IHRoaXMuc3RhY2tbZF0gKyA0O1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXggIT0gcGFyZW50U3RhcnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMueWllbGRCdWYoYnVmZmVyLmZpbmRDaGlsZChwYXJlbnRTdGFydCwgdGhpcy5pbmRleCwgLTEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IGFmdGVyID0gYnVmZmVyLmJ1ZmZlclt0aGlzLmluZGV4ICsgM107XG4gICAgICAgICAgICBpZiAoYWZ0ZXIgPCAoZCA8IDAgPyBidWZmZXIuYnVmZmVyLmxlbmd0aCA6IGJ1ZmZlci5idWZmZXJbdGhpcy5zdGFja1tkXSArIDNdKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy55aWVsZEJ1ZihhZnRlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGQgPCAwID8gdGhpcy55aWVsZCh0aGlzLmJ1ZmZlci5wYXJlbnQubmV4dENoaWxkKHRoaXMuYnVmZmVyLmluZGV4ICsgZGlyLCBkaXIsIC0xMDAwMDAwMDAgLyogTm9uZSAqLywgdGhpcy5mdWxsKSkgOiBmYWxzZTtcbiAgICB9XG4gICAgLy8vIE1vdmUgdG8gdGhpcyBub2RlJ3MgbmV4dCBzaWJsaW5nLCBpZiBhbnkuXG4gICAgbmV4dFNpYmxpbmcoKSB7IHJldHVybiB0aGlzLnNpYmxpbmcoMSk7IH1cbiAgICAvLy8gTW92ZSB0byB0aGlzIG5vZGUncyBwcmV2aW91cyBzaWJsaW5nLCBpZiBhbnkuXG4gICAgcHJldlNpYmxpbmcoKSB7IHJldHVybiB0aGlzLnNpYmxpbmcoLTEpOyB9XG4gICAgYXRMYXN0Tm9kZShkaXIpIHtcbiAgICAgICAgbGV0IGluZGV4LCBwYXJlbnQsIHsgYnVmZmVyIH0gPSB0aGlzO1xuICAgICAgICBpZiAoYnVmZmVyKSB7XG4gICAgICAgICAgICBpZiAoZGlyID4gMCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4IDwgYnVmZmVyLmJ1ZmZlci5idWZmZXIubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaW5kZXg7IGkrKylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5idWZmZXIuYnVmZmVyW2kgKyAzXSA8IHRoaXMuaW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAoeyBpbmRleCwgcGFyZW50IH0gPSBidWZmZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgKHsgaW5kZXgsIF9wYXJlbnQ6IHBhcmVudCB9ID0gdGhpcy5fdHJlZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICg7IHBhcmVudDsgeyBpbmRleCwgX3BhcmVudDogcGFyZW50IH0gPSBwYXJlbnQpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBpbmRleCArIGRpciwgZSA9IGRpciA8IDAgPyAtMSA6IHBhcmVudC5ub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSAhPSBlOyBpICs9IGRpcikge1xuICAgICAgICAgICAgICAgIGxldCBjaGlsZCA9IHBhcmVudC5ub2RlLmNoaWxkcmVuW2ldO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZ1bGwgfHwgIWNoaWxkLnR5cGUuaXNBbm9ueW1vdXMgfHwgY2hpbGQgaW5zdGFuY2VvZiBUcmVlQnVmZmVyIHx8IGhhc0NoaWxkKGNoaWxkKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBtb3ZlKGRpcikge1xuICAgICAgICBpZiAodGhpcy5lbnRlcihkaXIsIC0xMDAwMDAwMDAgLyogTm9uZSAqLykpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2libGluZyhkaXIpKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKHRoaXMuYXRMYXN0Tm9kZShkaXIpIHx8ICF0aGlzLnBhcmVudCgpKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gTW92ZSB0byB0aGUgbmV4dCBub2RlIGluIGFcbiAgICAvLy8gW3ByZS1vcmRlcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVHJlZV90cmF2ZXJzYWwjUHJlLW9yZGVyXyhOTFIpKVxuICAgIC8vLyB0cmF2ZXJzYWwsIGdvaW5nIGZyb20gYSBub2RlIHRvIGl0cyBmaXJzdCBjaGlsZCBvciwgaWYgdGhlXG4gICAgLy8vIGN1cnJlbnQgbm9kZSBpcyBlbXB0eSwgaXRzIG5leHQgc2libGluZyBvciB0aGUgbmV4dCBzaWJsaW5nIG9mXG4gICAgLy8vIHRoZSBmaXJzdCBwYXJlbnQgbm9kZSB0aGF0IGhhcyBvbmUuXG4gICAgbmV4dCgpIHsgcmV0dXJuIHRoaXMubW92ZSgxKTsgfVxuICAgIC8vLyBNb3ZlIHRvIHRoZSBuZXh0IG5vZGUgaW4gYSBsYXN0LXRvLWZpcnN0IHByZS1vcmRlciB0cmF2ZXJhbC4gQVxuICAgIC8vLyBub2RlIGlzIGZvbGxvd2VkIGJ5IGlzdCBsYXN0IGNoaWxkIG9yLCBpZiBpdCBoYXMgbm9uZSwgaXRzXG4gICAgLy8vIHByZXZpb3VzIHNpYmxpbmcgb3IgdGhlIHByZXZpb3VzIHNpYmxpbmcgb2YgdGhlIGZpcnN0IHBhcmVudFxuICAgIC8vLyBub2RlIHRoYXQgaGFzIG9uZS5cbiAgICBwcmV2KCkgeyByZXR1cm4gdGhpcy5tb3ZlKC0xKTsgfVxuICAgIC8vLyBNb3ZlIHRoZSBjdXJzb3IgdG8gdGhlIGlubmVybW9zdCBub2RlIHRoYXQgY292ZXJzIGBwb3NgLiBJZlxuICAgIC8vLyBgc2lkZWAgaXMgLTEsIGl0IHdpbGwgZW50ZXIgbm9kZXMgdGhhdCBlbmQgYXQgYHBvc2AuIElmIGl0IGlzIDEsXG4gICAgLy8vIGl0IHdpbGwgZW50ZXIgbm9kZXMgdGhhdCBzdGFydCBhdCBgcG9zYC5cbiAgICBtb3ZlVG8ocG9zLCBzaWRlID0gMCkge1xuICAgICAgICAvLyBNb3ZlIHVwIHRvIGEgbm9kZSB0aGF0IGFjdHVhbGx5IGhvbGRzIHRoZSBwb3NpdGlvbiwgaWYgcG9zc2libGVcbiAgICAgICAgd2hpbGUgKHRoaXMuZnJvbSA9PSB0aGlzLnRvIHx8XG4gICAgICAgICAgICAoc2lkZSA8IDEgPyB0aGlzLmZyb20gPj0gcG9zIDogdGhpcy5mcm9tID4gcG9zKSB8fFxuICAgICAgICAgICAgKHNpZGUgPiAtMSA/IHRoaXMudG8gPD0gcG9zIDogdGhpcy50byA8IHBvcykpXG4gICAgICAgICAgICBpZiAoIXRoaXMucGFyZW50KCkpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFRoZW4gc2NhbiBkb3duIGludG8gY2hpbGQgbm9kZXMgYXMgZmFyIGFzIHBvc3NpYmxlXG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGlmIChzaWRlIDwgMCA/ICF0aGlzLmNoaWxkQmVmb3JlKHBvcykgOiAhdGhpcy5jaGlsZEFmdGVyKHBvcykpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBpZiAodGhpcy5mcm9tID09IHRoaXMudG8gfHxcbiAgICAgICAgICAgICAgICAoc2lkZSA8IDEgPyB0aGlzLmZyb20gPj0gcG9zIDogdGhpcy5mcm9tID4gcG9zKSB8fFxuICAgICAgICAgICAgICAgIChzaWRlID4gLTEgPyB0aGlzLnRvIDw9IHBvcyA6IHRoaXMudG8gPCBwb3MpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLy8vIEdldCBhIFtzeW50YXggbm9kZV0oI3RyZWUuU3ludGF4Tm9kZSkgYXQgdGhlIGN1cnNvcidzIGN1cnJlbnRcbiAgICAvLy8gcG9zaXRpb24uXG4gICAgZ2V0IG5vZGUoKSB7XG4gICAgICAgIGlmICghdGhpcy5idWZmZXIpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdHJlZTtcbiAgICAgICAgbGV0IGNhY2hlID0gdGhpcy5idWZmZXJOb2RlLCByZXN1bHQgPSBudWxsLCBkZXB0aCA9IDA7XG4gICAgICAgIGlmIChjYWNoZSAmJiBjYWNoZS5jb250ZXh0ID09IHRoaXMuYnVmZmVyKSB7XG4gICAgICAgICAgICBzY2FuOiBmb3IgKGxldCBpbmRleCA9IHRoaXMuaW5kZXgsIGQgPSB0aGlzLnN0YWNrLmxlbmd0aDsgZCA+PSAwOykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSBjYWNoZTsgYzsgYyA9IGMuX3BhcmVudClcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMuaW5kZXggPT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PSB0aGlzLmluZGV4KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gYztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHRoID0gZCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhayBzY2FuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5kZXggPSB0aGlzLnN0YWNrWy0tZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IGRlcHRoOyBpIDwgdGhpcy5zdGFjay5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBCdWZmZXJOb2RlKHRoaXMuYnVmZmVyLCByZXN1bHQsIHRoaXMuc3RhY2tbaV0pO1xuICAgICAgICByZXR1cm4gdGhpcy5idWZmZXJOb2RlID0gbmV3IEJ1ZmZlck5vZGUodGhpcy5idWZmZXIsIHJlc3VsdCwgdGhpcy5pbmRleCk7XG4gICAgfVxuICAgIC8vLyBHZXQgdGhlIFt0cmVlXSgjdHJlZS5UcmVlKSB0aGF0IHJlcHJlc2VudHMgdGhlIGN1cnJlbnQgbm9kZSwgaWZcbiAgICAvLy8gYW55LiBXaWxsIHJldHVybiBudWxsIHdoZW4gdGhlIG5vZGUgaXMgaW4gYSBbdHJlZVxuICAgIC8vLyBidWZmZXJdKCN0cmVlLlRyZWVCdWZmZXIpLlxuICAgIGdldCB0cmVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5idWZmZXIgPyBudWxsIDogdGhpcy5fdHJlZS5ub2RlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGhhc0NoaWxkKHRyZWUpIHtcbiAgICByZXR1cm4gdHJlZS5jaGlsZHJlbi5zb21lKGNoID0+ICFjaC50eXBlLmlzQW5vbnltb3VzIHx8IGNoIGluc3RhbmNlb2YgVHJlZUJ1ZmZlciB8fCBoYXNDaGlsZChjaCkpO1xufVxuY2xhc3MgRmxhdEJ1ZmZlckN1cnNvciB7XG4gICAgY29uc3RydWN0b3IoYnVmZmVyLCBpbmRleCkge1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgIH1cbiAgICBnZXQgaWQoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gNF07IH1cbiAgICBnZXQgc3RhcnQoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gM107IH1cbiAgICBnZXQgZW5kKCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDJdOyB9XG4gICAgZ2V0IHNpemUoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gMV07IH1cbiAgICBnZXQgcG9zKCkgeyByZXR1cm4gdGhpcy5pbmRleDsgfVxuICAgIG5leHQoKSB7IHRoaXMuaW5kZXggLT0gNDsgfVxuICAgIGZvcmsoKSB7IHJldHVybiBuZXcgRmxhdEJ1ZmZlckN1cnNvcih0aGlzLmJ1ZmZlciwgdGhpcy5pbmRleCk7IH1cbn1cbmNvbnN0IEJhbGFuY2VCcmFuY2hGYWN0b3IgPSA4O1xuZnVuY3Rpb24gYnVpbGRUcmVlKGRhdGEpIHtcbiAgICB2YXIgX2E7XG4gICAgbGV0IHsgYnVmZmVyLCBub2RlU2V0LCB0b3BJRCA9IDAsIG1heEJ1ZmZlckxlbmd0aCA9IERlZmF1bHRCdWZmZXJMZW5ndGgsIHJldXNlZCA9IFtdLCBtaW5SZXBlYXRUeXBlID0gbm9kZVNldC50eXBlcy5sZW5ndGggfSA9IGRhdGE7XG4gICAgbGV0IGN1cnNvciA9IEFycmF5LmlzQXJyYXkoYnVmZmVyKSA/IG5ldyBGbGF0QnVmZmVyQ3Vyc29yKGJ1ZmZlciwgYnVmZmVyLmxlbmd0aCkgOiBidWZmZXI7XG4gICAgbGV0IHR5cGVzID0gbm9kZVNldC50eXBlcztcbiAgICBsZXQgY29udGV4dEhhc2ggPSAwO1xuICAgIGZ1bmN0aW9uIHRha2VOb2RlKHBhcmVudFN0YXJ0LCBtaW5Qb3MsIGNoaWxkcmVuLCBwb3NpdGlvbnMsIGluUmVwZWF0KSB7XG4gICAgICAgIGxldCB7IGlkLCBzdGFydCwgZW5kLCBzaXplIH0gPSBjdXJzb3I7XG4gICAgICAgIGxldCBzdGFydFBvcyA9IHN0YXJ0IC0gcGFyZW50U3RhcnQ7XG4gICAgICAgIGlmIChzaXplIDwgMCkge1xuICAgICAgICAgICAgaWYgKHNpemUgPT0gLTEpIHsgLy8gUmV1c2VkIG5vZGVcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKHJldXNlZFtpZF0pO1xuICAgICAgICAgICAgICAgIHBvc2l0aW9ucy5wdXNoKHN0YXJ0UG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgeyAvLyBDb250ZXh0IGNoYW5nZVxuICAgICAgICAgICAgICAgIGNvbnRleHRIYXNoID0gaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IubmV4dCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGxldCB0eXBlID0gdHlwZXNbaWRdLCBub2RlLCBidWZmZXI7XG4gICAgICAgIGlmIChlbmQgLSBzdGFydCA8PSBtYXhCdWZmZXJMZW5ndGggJiYgKGJ1ZmZlciA9IGZpbmRCdWZmZXJTaXplKGN1cnNvci5wb3MgLSBtaW5Qb3MsIGluUmVwZWF0KSkpIHtcbiAgICAgICAgICAgIC8vIFNtYWxsIGVub3VnaCBmb3IgYSBidWZmZXIsIGFuZCBubyByZXVzZWQgbm9kZXMgaW5zaWRlXG4gICAgICAgICAgICBsZXQgZGF0YSA9IG5ldyBVaW50MTZBcnJheShidWZmZXIuc2l6ZSAtIGJ1ZmZlci5za2lwKTtcbiAgICAgICAgICAgIGxldCBlbmRQb3MgPSBjdXJzb3IucG9zIC0gYnVmZmVyLnNpemUsIGluZGV4ID0gZGF0YS5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoY3Vyc29yLnBvcyA+IGVuZFBvcylcbiAgICAgICAgICAgICAgICBpbmRleCA9IGNvcHlUb0J1ZmZlcihidWZmZXIuc3RhcnQsIGRhdGEsIGluZGV4LCBpblJlcGVhdCk7XG4gICAgICAgICAgICBub2RlID0gbmV3IFRyZWVCdWZmZXIoZGF0YSwgZW5kIC0gYnVmZmVyLnN0YXJ0LCBub2RlU2V0LCBpblJlcGVhdCA8IDAgPyBOb2RlVHlwZS5ub25lIDogdHlwZXNbaW5SZXBlYXRdKTtcbiAgICAgICAgICAgIHN0YXJ0UG9zID0gYnVmZmVyLnN0YXJ0IC0gcGFyZW50U3RhcnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7IC8vIE1ha2UgaXQgYSBub2RlXG4gICAgICAgICAgICBsZXQgZW5kUG9zID0gY3Vyc29yLnBvcyAtIHNpemU7XG4gICAgICAgICAgICBjdXJzb3IubmV4dCgpO1xuICAgICAgICAgICAgbGV0IGxvY2FsQ2hpbGRyZW4gPSBbXSwgbG9jYWxQb3NpdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIGxldCBsb2NhbEluUmVwZWF0ID0gaWQgPj0gbWluUmVwZWF0VHlwZSA/IGlkIDogLTE7XG4gICAgICAgICAgICB3aGlsZSAoY3Vyc29yLnBvcyA+IGVuZFBvcykge1xuICAgICAgICAgICAgICAgIGlmIChjdXJzb3IuaWQgPT0gbG9jYWxJblJlcGVhdClcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLm5leHQoKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHRha2VOb2RlKHN0YXJ0LCBlbmRQb3MsIGxvY2FsQ2hpbGRyZW4sIGxvY2FsUG9zaXRpb25zLCBsb2NhbEluUmVwZWF0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvY2FsQ2hpbGRyZW4ucmV2ZXJzZSgpO1xuICAgICAgICAgICAgbG9jYWxQb3NpdGlvbnMucmV2ZXJzZSgpO1xuICAgICAgICAgICAgaWYgKGxvY2FsSW5SZXBlYXQgPiAtMSAmJiBsb2NhbENoaWxkcmVuLmxlbmd0aCA+IEJhbGFuY2VCcmFuY2hGYWN0b3IpXG4gICAgICAgICAgICAgICAgbm9kZSA9IGJhbGFuY2VSYW5nZSh0eXBlLCB0eXBlLCBsb2NhbENoaWxkcmVuLCBsb2NhbFBvc2l0aW9ucywgMCwgbG9jYWxDaGlsZHJlbi5sZW5ndGgsIDAsIG1heEJ1ZmZlckxlbmd0aCwgZW5kIC0gc3RhcnQsIGNvbnRleHRIYXNoKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBub2RlID0gd2l0aEhhc2gobmV3IFRyZWUodHlwZSwgbG9jYWxDaGlsZHJlbiwgbG9jYWxQb3NpdGlvbnMsIGVuZCAtIHN0YXJ0KSwgY29udGV4dEhhc2gpO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICAgIHBvc2l0aW9ucy5wdXNoKHN0YXJ0UG9zKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZmluZEJ1ZmZlclNpemUobWF4U2l6ZSwgaW5SZXBlYXQpIHtcbiAgICAgICAgLy8gU2NhbiB0aHJvdWdoIHRoZSBidWZmZXIgdG8gZmluZCBwcmV2aW91cyBzaWJsaW5ncyB0aGF0IGZpdFxuICAgICAgICAvLyB0b2dldGhlciBpbiBhIFRyZWVCdWZmZXIsIGFuZCBkb24ndCBjb250YWluIGFueSByZXVzZWQgbm9kZXNcbiAgICAgICAgLy8gKHdoaWNoIGNhbid0IGJlIHN0b3JlZCBpbiBhIGJ1ZmZlcikuXG4gICAgICAgIC8vIElmIGBpblJlcGVhdGAgaXMgPiAtMSwgaWdub3JlIG5vZGUgYm91bmRhcmllcyBvZiB0aGF0IHR5cGUgZm9yXG4gICAgICAgIC8vIG5lc3RpbmcsIGJ1dCBtYWtlIHN1cmUgdGhlIGVuZCBmYWxscyBlaXRoZXIgYXQgdGhlIHN0YXJ0XG4gICAgICAgIC8vIChgbWF4U2l6ZWApIG9yIGJlZm9yZSBzdWNoIGEgbm9kZS5cbiAgICAgICAgbGV0IGZvcmsgPSBjdXJzb3IuZm9yaygpO1xuICAgICAgICBsZXQgc2l6ZSA9IDAsIHN0YXJ0ID0gMCwgc2tpcCA9IDAsIG1pblN0YXJ0ID0gZm9yay5lbmQgLSBtYXhCdWZmZXJMZW5ndGg7XG4gICAgICAgIGxldCByZXN1bHQgPSB7IHNpemU6IDAsIHN0YXJ0OiAwLCBza2lwOiAwIH07XG4gICAgICAgIHNjYW46IGZvciAobGV0IG1pblBvcyA9IGZvcmsucG9zIC0gbWF4U2l6ZTsgZm9yay5wb3MgPiBtaW5Qb3M7KSB7XG4gICAgICAgICAgICAvLyBQcmV0ZW5kIG5lc3RlZCByZXBlYXQgbm9kZXMgb2YgdGhlIHNhbWUgdHlwZSBkb24ndCBleGlzdFxuICAgICAgICAgICAgaWYgKGZvcmsuaWQgPT0gaW5SZXBlYXQpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlcHQgdGhhdCB3ZSBzdG9yZSB0aGUgY3VycmVudCBzdGF0ZSBhcyBhIHZhbGlkIHJldHVyblxuICAgICAgICAgICAgICAgIC8vIHZhbHVlLlxuICAgICAgICAgICAgICAgIHJlc3VsdC5zaXplID0gc2l6ZTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2tpcCA9IHNraXA7XG4gICAgICAgICAgICAgICAgc2tpcCArPSA0O1xuICAgICAgICAgICAgICAgIHNpemUgKz0gNDtcbiAgICAgICAgICAgICAgICBmb3JrLm5leHQoKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBub2RlU2l6ZSA9IGZvcmsuc2l6ZSwgc3RhcnRQb3MgPSBmb3JrLnBvcyAtIG5vZGVTaXplO1xuICAgICAgICAgICAgaWYgKG5vZGVTaXplIDwgMCB8fCBzdGFydFBvcyA8IG1pblBvcyB8fCBmb3JrLnN0YXJ0IDwgbWluU3RhcnQpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBsZXQgbG9jYWxTa2lwcGVkID0gZm9yay5pZCA+PSBtaW5SZXBlYXRUeXBlID8gNCA6IDA7XG4gICAgICAgICAgICBsZXQgbm9kZVN0YXJ0ID0gZm9yay5zdGFydDtcbiAgICAgICAgICAgIGZvcmsubmV4dCgpO1xuICAgICAgICAgICAgd2hpbGUgKGZvcmsucG9zID4gc3RhcnRQb3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZm9yay5zaXplIDwgMClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWsgc2NhbjtcbiAgICAgICAgICAgICAgICBpZiAoZm9yay5pZCA+PSBtaW5SZXBlYXRUeXBlKVxuICAgICAgICAgICAgICAgICAgICBsb2NhbFNraXBwZWQgKz0gNDtcbiAgICAgICAgICAgICAgICBmb3JrLm5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXJ0ID0gbm9kZVN0YXJ0O1xuICAgICAgICAgICAgc2l6ZSArPSBub2RlU2l6ZTtcbiAgICAgICAgICAgIHNraXAgKz0gbG9jYWxTa2lwcGVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpblJlcGVhdCA8IDAgfHwgc2l6ZSA9PSBtYXhTaXplKSB7XG4gICAgICAgICAgICByZXN1bHQuc2l6ZSA9IHNpemU7XG4gICAgICAgICAgICByZXN1bHQuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgICAgIHJlc3VsdC5za2lwID0gc2tpcDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0LnNpemUgPiA0ID8gcmVzdWx0IDogdW5kZWZpbmVkO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb3B5VG9CdWZmZXIoYnVmZmVyU3RhcnQsIGJ1ZmZlciwgaW5kZXgsIGluUmVwZWF0KSB7XG4gICAgICAgIGxldCB7IGlkLCBzdGFydCwgZW5kLCBzaXplIH0gPSBjdXJzb3I7XG4gICAgICAgIGN1cnNvci5uZXh0KCk7XG4gICAgICAgIGlmIChpZCA9PSBpblJlcGVhdClcbiAgICAgICAgICAgIHJldHVybiBpbmRleDtcbiAgICAgICAgbGV0IHN0YXJ0SW5kZXggPSBpbmRleDtcbiAgICAgICAgaWYgKHNpemUgPiA0KSB7XG4gICAgICAgICAgICBsZXQgZW5kUG9zID0gY3Vyc29yLnBvcyAtIChzaXplIC0gNCk7XG4gICAgICAgICAgICB3aGlsZSAoY3Vyc29yLnBvcyA+IGVuZFBvcylcbiAgICAgICAgICAgICAgICBpbmRleCA9IGNvcHlUb0J1ZmZlcihidWZmZXJTdGFydCwgYnVmZmVyLCBpbmRleCwgaW5SZXBlYXQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZCA8IG1pblJlcGVhdFR5cGUpIHsgLy8gRG9uJ3QgY29weSByZXBlYXQgbm9kZXMgaW50byBidWZmZXJzXG4gICAgICAgICAgICBidWZmZXJbLS1pbmRleF0gPSBzdGFydEluZGV4O1xuICAgICAgICAgICAgYnVmZmVyWy0taW5kZXhdID0gZW5kIC0gYnVmZmVyU3RhcnQ7XG4gICAgICAgICAgICBidWZmZXJbLS1pbmRleF0gPSBzdGFydCAtIGJ1ZmZlclN0YXJ0O1xuICAgICAgICAgICAgYnVmZmVyWy0taW5kZXhdID0gaWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH1cbiAgICBsZXQgY2hpbGRyZW4gPSBbXSwgcG9zaXRpb25zID0gW107XG4gICAgd2hpbGUgKGN1cnNvci5wb3MgPiAwKVxuICAgICAgICB0YWtlTm9kZShkYXRhLnN0YXJ0IHx8IDAsIDAsIGNoaWxkcmVuLCBwb3NpdGlvbnMsIC0xKTtcbiAgICBsZXQgbGVuZ3RoID0gKF9hID0gZGF0YS5sZW5ndGgpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IChjaGlsZHJlbi5sZW5ndGggPyBwb3NpdGlvbnNbMF0gKyBjaGlsZHJlblswXS5sZW5ndGggOiAwKTtcbiAgICByZXR1cm4gbmV3IFRyZWUodHlwZXNbdG9wSURdLCBjaGlsZHJlbi5yZXZlcnNlKCksIHBvc2l0aW9ucy5yZXZlcnNlKCksIGxlbmd0aCk7XG59XG5mdW5jdGlvbiBiYWxhbmNlUmFuZ2Uob3V0ZXJUeXBlLCBpbm5lclR5cGUsIGNoaWxkcmVuLCBwb3NpdGlvbnMsIGZyb20sIHRvLCBzdGFydCwgbWF4QnVmZmVyTGVuZ3RoLCBsZW5ndGgsIGNvbnRleHRIYXNoKSB7XG4gICAgbGV0IGxvY2FsQ2hpbGRyZW4gPSBbXSwgbG9jYWxQb3NpdGlvbnMgPSBbXTtcbiAgICBpZiAobGVuZ3RoIDw9IG1heEJ1ZmZlckxlbmd0aCkge1xuICAgICAgICBmb3IgKGxldCBpID0gZnJvbTsgaSA8IHRvOyBpKyspIHtcbiAgICAgICAgICAgIGxvY2FsQ2hpbGRyZW4ucHVzaChjaGlsZHJlbltpXSk7XG4gICAgICAgICAgICBsb2NhbFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uc1tpXSAtIHN0YXJ0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbGV0IG1heENoaWxkID0gTWF0aC5tYXgobWF4QnVmZmVyTGVuZ3RoLCBNYXRoLmNlaWwobGVuZ3RoICogMS41IC8gQmFsYW5jZUJyYW5jaEZhY3RvcikpO1xuICAgICAgICBmb3IgKGxldCBpID0gZnJvbTsgaSA8IHRvOykge1xuICAgICAgICAgICAgbGV0IGdyb3VwRnJvbSA9IGksIGdyb3VwU3RhcnQgPSBwb3NpdGlvbnNbaV07XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBmb3IgKDsgaSA8IHRvOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgbmV4dEVuZCA9IHBvc2l0aW9uc1tpXSArIGNoaWxkcmVuW2ldLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAobmV4dEVuZCAtIGdyb3VwU3RhcnQgPiBtYXhDaGlsZClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaSA9PSBncm91cEZyb20gKyAxKSB7XG4gICAgICAgICAgICAgICAgbGV0IG9ubHkgPSBjaGlsZHJlbltncm91cEZyb21dO1xuICAgICAgICAgICAgICAgIGlmIChvbmx5IGluc3RhbmNlb2YgVHJlZSAmJiBvbmx5LnR5cGUgPT0gaW5uZXJUeXBlICYmIG9ubHkubGVuZ3RoID4gbWF4Q2hpbGQgPDwgMSkgeyAvLyBUb28gYmlnLCBjb2xsYXBzZVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG9ubHkuY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsQ2hpbGRyZW4ucHVzaChvbmx5LmNoaWxkcmVuW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsUG9zaXRpb25zLnB1c2gob25seS5wb3NpdGlvbnNbal0gKyBncm91cFN0YXJ0IC0gc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsb2NhbENoaWxkcmVuLnB1c2gob25seSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpID09IGdyb3VwRnJvbSArIDEpIHtcbiAgICAgICAgICAgICAgICBsb2NhbENoaWxkcmVuLnB1c2goY2hpbGRyZW5bZ3JvdXBGcm9tXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgaW5uZXIgPSBiYWxhbmNlUmFuZ2UoaW5uZXJUeXBlLCBpbm5lclR5cGUsIGNoaWxkcmVuLCBwb3NpdGlvbnMsIGdyb3VwRnJvbSwgaSwgZ3JvdXBTdGFydCwgbWF4QnVmZmVyTGVuZ3RoLCBwb3NpdGlvbnNbaSAtIDFdICsgY2hpbGRyZW5baSAtIDFdLmxlbmd0aCAtIGdyb3VwU3RhcnQsIGNvbnRleHRIYXNoKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXJUeXBlICE9IE5vZGVUeXBlLm5vbmUgJiYgIWNvbnRhaW5zVHlwZShpbm5lci5jaGlsZHJlbiwgaW5uZXJUeXBlKSlcbiAgICAgICAgICAgICAgICAgICAgaW5uZXIgPSB3aXRoSGFzaChuZXcgVHJlZShOb2RlVHlwZS5ub25lLCBpbm5lci5jaGlsZHJlbiwgaW5uZXIucG9zaXRpb25zLCBpbm5lci5sZW5ndGgpLCBjb250ZXh0SGFzaCk7XG4gICAgICAgICAgICAgICAgbG9jYWxDaGlsZHJlbi5wdXNoKGlubmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvY2FsUG9zaXRpb25zLnB1c2goZ3JvdXBTdGFydCAtIHN0YXJ0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gd2l0aEhhc2gobmV3IFRyZWUob3V0ZXJUeXBlLCBsb2NhbENoaWxkcmVuLCBsb2NhbFBvc2l0aW9ucywgbGVuZ3RoKSwgY29udGV4dEhhc2gpO1xufVxuZnVuY3Rpb24gY29udGFpbnNUeXBlKG5vZGVzLCB0eXBlKSB7XG4gICAgZm9yIChsZXQgZWx0IG9mIG5vZGVzKVxuICAgICAgICBpZiAoZWx0LnR5cGUgPT0gdHlwZSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbn1cbi8vLyBUcmVlIGZyYWdtZW50cyBhcmUgdXNlZCBkdXJpbmcgW2luY3JlbWVudGFsXG4vLy8gcGFyc2luZ10oI2xlemVyLlBhcnNlT3B0aW9ucy5mcmFnbWVudHMpIHRvIHRyYWNrIHBhcnRzIG9mIG9sZFxuLy8vIHRyZWVzIHRoYXQgY2FuIGJlIHJldXNlZCBpbiBhIG5ldyBwYXJzZS4gQW4gYXJyYXkgb2YgZnJhZ21lbnRzIGlzXG4vLy8gdXNlZCB0byB0cmFjayByZWdpb25zIG9mIGFuIG9sZCB0cmVlIHdob3NlIG5vZGVzIG1pZ2h0IGJlIHJldXNlZFxuLy8vIGluIG5ldyBwYXJzZXMuIFVzZSB0aGUgc3RhdGljXG4vLy8gW2BhcHBseUNoYW5nZXNgXSgjdHJlZS5UcmVlRnJhZ21lbnReYXBwbHlDaGFuZ2VzKSBtZXRob2QgdG8gdXBkYXRlXG4vLy8gZnJhZ21lbnRzIGZvciBkb2N1bWVudCBjaGFuZ2VzLlxuY2xhc3MgVHJlZUZyYWdtZW50IHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAvLy8gVGhlIHN0YXJ0IG9mIHRoZSB1bmNoYW5nZWQgcmFuZ2UgcG9pbnRlZCB0byBieSB0aGlzIGZyYWdtZW50LlxuICAgIC8vLyBUaGlzIHJlZmVycyB0byBhbiBvZmZzZXQgaW4gdGhlIF91cGRhdGVkXyBkb2N1bWVudCAoYXMgb3Bwb3NlZFxuICAgIC8vLyB0byB0aGUgb3JpZ2luYWwgdHJlZSkuXG4gICAgZnJvbSwgXG4gICAgLy8vIFRoZSBlbmQgb2YgdGhlIHVuY2hhbmdlZCByYW5nZS5cbiAgICB0bywgXG4gICAgLy8vIFRoZSB0cmVlIHRoYXQgdGhpcyBmcmFnbWVudCBpcyBiYXNlZCBvbi5cbiAgICB0cmVlLCBcbiAgICAvLy8gVGhlIG9mZnNldCBiZXR3ZWVuIHRoZSBmcmFnbWVudCdzIHRyZWUgYW5kIHRoZSBkb2N1bWVudCB0aGF0XG4gICAgLy8vIHRoaXMgZnJhZ21lbnQgY2FuIGJlIHVzZWQgYWdhaW5zdC4gQWRkIHRoaXMgd2hlbiBnb2luZyBmcm9tXG4gICAgLy8vIGRvY3VtZW50IHRvIHRyZWUgcG9zaXRpb25zLCBzdWJ0cmFjdCBpdCB0byBnbyBmcm9tIHRyZWUgdG9cbiAgICAvLy8gZG9jdW1lbnQgcG9zaXRpb25zLlxuICAgIG9mZnNldCwgb3Blbikge1xuICAgICAgICB0aGlzLmZyb20gPSBmcm9tO1xuICAgICAgICB0aGlzLnRvID0gdG87XG4gICAgICAgIHRoaXMudHJlZSA9IHRyZWU7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICB0aGlzLm9wZW4gPSBvcGVuO1xuICAgIH1cbiAgICBnZXQgb3BlblN0YXJ0KCkgeyByZXR1cm4gKHRoaXMub3BlbiAmIDEgLyogU3RhcnQgKi8pID4gMDsgfVxuICAgIGdldCBvcGVuRW5kKCkgeyByZXR1cm4gKHRoaXMub3BlbiAmIDIgLyogRW5kICovKSA+IDA7IH1cbiAgICAvLy8gQXBwbHkgYSBzZXQgb2YgZWRpdHMgdG8gYW4gYXJyYXkgb2YgZnJhZ21lbnRzLCByZW1vdmluZyBvclxuICAgIC8vLyBzcGxpdHRpbmcgZnJhZ21lbnRzIGFzIG5lY2Vzc2FyeSB0byByZW1vdmUgZWRpdGVkIHJhbmdlcywgYW5kXG4gICAgLy8vIGFkanVzdGluZyBvZmZzZXRzIGZvciBmcmFnbWVudHMgdGhhdCBtb3ZlZC5cbiAgICBzdGF0aWMgYXBwbHlDaGFuZ2VzKGZyYWdtZW50cywgY2hhbmdlcywgbWluR2FwID0gMTI4KSB7XG4gICAgICAgIGlmICghY2hhbmdlcy5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gZnJhZ21lbnRzO1xuICAgICAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgICAgIGxldCBmSSA9IDEsIG5leHRGID0gZnJhZ21lbnRzLmxlbmd0aCA/IGZyYWdtZW50c1swXSA6IG51bGw7XG4gICAgICAgIGxldCBjSSA9IDAsIHBvcyA9IDAsIG9mZiA9IDA7XG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGxldCBuZXh0QyA9IGNJIDwgY2hhbmdlcy5sZW5ndGggPyBjaGFuZ2VzW2NJKytdIDogbnVsbDtcbiAgICAgICAgICAgIGxldCBuZXh0UG9zID0gbmV4dEMgPyBuZXh0Qy5mcm9tQSA6IDFlOTtcbiAgICAgICAgICAgIGlmIChuZXh0UG9zIC0gcG9zID49IG1pbkdhcClcbiAgICAgICAgICAgICAgICB3aGlsZSAobmV4dEYgJiYgbmV4dEYuZnJvbSA8IG5leHRQb3MpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGN1dCA9IG5leHRGO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zID49IGN1dC5mcm9tIHx8IG5leHRQb3MgPD0gY3V0LnRvIHx8IG9mZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZGcm9tID0gTWF0aC5tYXgoY3V0LmZyb20sIHBvcykgLSBvZmYsIGZUbyA9IE1hdGgubWluKGN1dC50bywgbmV4dFBvcykgLSBvZmY7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXQgPSBmRnJvbSA+PSBmVG8gPyBudWxsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgVHJlZUZyYWdtZW50KGZGcm9tLCBmVG8sIGN1dC50cmVlLCBjdXQub2Zmc2V0ICsgb2ZmLCAoY0kgPiAwID8gMSAvKiBTdGFydCAqLyA6IDApIHwgKG5leHRDID8gMiAvKiBFbmQgKi8gOiAwKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1dClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGN1dCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0Ri50byA+IG5leHRQb3MpXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgbmV4dEYgPSBmSSA8IGZyYWdtZW50cy5sZW5ndGggPyBmcmFnbWVudHNbZkkrK10gOiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghbmV4dEMpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBwb3MgPSBuZXh0Qy50b0E7XG4gICAgICAgICAgICBvZmYgPSBuZXh0Qy50b0EgLSBuZXh0Qy50b0I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLy8vIENyZWF0ZSBhIHNldCBvZiBmcmFnbWVudHMgZnJvbSBhIGZyZXNobHkgcGFyc2VkIHRyZWUsIG9yIHVwZGF0ZVxuICAgIC8vLyBhbiBleGlzdGluZyBzZXQgb2YgZnJhZ21lbnRzIGJ5IHJlcGxhY2luZyB0aGUgb25lcyB0aGF0IG92ZXJsYXBcbiAgICAvLy8gd2l0aCBhIHRyZWUgd2l0aCBjb250ZW50IGZyb20gdGhlIG5ldyB0cmVlLiBXaGVuIGBwYXJ0aWFsYCBpc1xuICAgIC8vLyB0cnVlLCB0aGUgcGFyc2UgaXMgdHJlYXRlZCBhcyBpbmNvbXBsZXRlLCBhbmQgdGhlIHRva2VuIGF0IGl0c1xuICAgIC8vLyBlbmQgaXMgbm90IGluY2x1ZGVkIGluIFtgc2FmZVRvYF0oI3RyZWUuVHJlZUZyYWdtZW50LnNhZmVUbykuXG4gICAgc3RhdGljIGFkZFRyZWUodHJlZSwgZnJhZ21lbnRzID0gW10sIHBhcnRpYWwgPSBmYWxzZSkge1xuICAgICAgICBsZXQgcmVzdWx0ID0gW25ldyBUcmVlRnJhZ21lbnQoMCwgdHJlZS5sZW5ndGgsIHRyZWUsIDAsIHBhcnRpYWwgPyAyIC8qIEVuZCAqLyA6IDApXTtcbiAgICAgICAgZm9yIChsZXQgZiBvZiBmcmFnbWVudHMpXG4gICAgICAgICAgICBpZiAoZi50byA+IHRyZWUubGVuZ3RoKVxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGYpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cbi8vIENyZWF0ZXMgYW4gYElucHV0YCB0aGF0IGlzIGJhY2tlZCBieSBhIHNpbmdsZSwgZmxhdCBzdHJpbmcuXG5mdW5jdGlvbiBzdHJpbmdJbnB1dChpbnB1dCkgeyByZXR1cm4gbmV3IFN0cmluZ0lucHV0KGlucHV0KTsgfVxuY2xhc3MgU3RyaW5nSW5wdXQge1xuICAgIGNvbnN0cnVjdG9yKHN0cmluZywgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnN0cmluZyA9IHN0cmluZztcbiAgICAgICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgfVxuICAgIGdldChwb3MpIHtcbiAgICAgICAgcmV0dXJuIHBvcyA8IDAgfHwgcG9zID49IHRoaXMubGVuZ3RoID8gLTEgOiB0aGlzLnN0cmluZy5jaGFyQ29kZUF0KHBvcyk7XG4gICAgfVxuICAgIGxpbmVBZnRlcihwb3MpIHtcbiAgICAgICAgaWYgKHBvcyA8IDApXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgbGV0IGVuZCA9IHRoaXMuc3RyaW5nLmluZGV4T2YoXCJcXG5cIiwgcG9zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RyaW5nLnNsaWNlKHBvcywgZW5kIDwgMCA/IHRoaXMubGVuZ3RoIDogTWF0aC5taW4oZW5kLCB0aGlzLmxlbmd0aCkpO1xuICAgIH1cbiAgICByZWFkKGZyb20sIHRvKSB7IHJldHVybiB0aGlzLnN0cmluZy5zbGljZShmcm9tLCBNYXRoLm1pbih0aGlzLmxlbmd0aCwgdG8pKTsgfVxuICAgIGNsaXAoYXQpIHsgcmV0dXJuIG5ldyBTdHJpbmdJbnB1dCh0aGlzLnN0cmluZywgYXQpOyB9XG59XG5cbmV4cG9ydCB7IERlZmF1bHRCdWZmZXJMZW5ndGgsIE5vZGVQcm9wLCBOb2RlU2V0LCBOb2RlVHlwZSwgVHJlZSwgVHJlZUJ1ZmZlciwgVHJlZUN1cnNvciwgVHJlZUZyYWdtZW50LCBzdHJpbmdJbnB1dCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHJlZS5lcy5qcy5tYXBcbiIsImltcG9ydCB7IERlZmF1bHRCdWZmZXJMZW5ndGgsIE5vZGVTZXQsIE5vZGVUeXBlLCBzdHJpbmdJbnB1dCwgVHJlZSwgVHJlZUJ1ZmZlciB9IGZyb20gJ2xlemVyLXRyZWUnO1xuZXhwb3J0IHsgTm9kZVByb3AsIE5vZGVTZXQsIE5vZGVUeXBlLCBUcmVlLCBUcmVlQ3Vyc29yIH0gZnJvbSAnbGV6ZXItdHJlZSc7XG5cbi8vLyBBIHBhcnNlIHN0YWNrLiBUaGVzZSBhcmUgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoZSBwYXJzZXIgdG8gdHJhY2tcbi8vLyBwYXJzaW5nIHByb2dyZXNzLiBUaGV5IGFsc28gcHJvdmlkZSBzb21lIHByb3BlcnRpZXMgYW5kIG1ldGhvZHNcbi8vLyB0aGF0IGV4dGVybmFsIGNvZGUgc3VjaCBhcyBhIHRva2VuaXplciBjYW4gdXNlIHRvIGdldCBpbmZvcm1hdGlvblxuLy8vIGFib3V0IHRoZSBwYXJzZSBzdGF0ZS5cbmNsYXNzIFN0YWNrIHtcbiAgICAvLy8gQGludGVybmFsXG4gICAgY29uc3RydWN0b3IoXG4gICAgLy8vIEEgdGhlIHBhcnNlIHRoYXQgdGhpcyBzdGFjayBpcyBwYXJ0IG9mIEBpbnRlcm5hbFxuICAgIHAsIFxuICAgIC8vLyBIb2xkcyBzdGF0ZSwgcG9zLCB2YWx1ZSBzdGFjayBwb3MgKDE1IGJpdHMgYXJyYXkgaW5kZXgsIDE1IGJpdHNcbiAgICAvLy8gYnVmZmVyIGluZGV4KSB0cmlwbGV0cyBmb3IgYWxsIGJ1dCB0aGUgdG9wIHN0YXRlXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHN0YWNrLCBcbiAgICAvLy8gVGhlIGN1cnJlbnQgcGFyc2Ugc3RhdGUgQGludGVybmFsXG4gICAgc3RhdGUsIFxuICAgIC8vIFRoZSBwb3NpdGlvbiBhdCB3aGljaCB0aGUgbmV4dCByZWR1Y2Ugc2hvdWxkIHRha2UgcGxhY2UuIFRoaXNcbiAgICAvLyBjYW4gYmUgbGVzcyB0aGFuIGB0aGlzLnBvc2Agd2hlbiBza2lwcGVkIGV4cHJlc3Npb25zIGhhdmUgYmVlblxuICAgIC8vIGFkZGVkIHRvIHRoZSBzdGFjayAod2hpY2ggc2hvdWxkIGJlIG1vdmVkIG91dHNpZGUgb2YgdGhlIG5leHRcbiAgICAvLyByZWR1Y3Rpb24pXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHJlZHVjZVBvcywgXG4gICAgLy8vIFRoZSBpbnB1dCBwb3NpdGlvbiB1cCB0byB3aGljaCB0aGlzIHN0YWNrIGhhcyBwYXJzZWQuXG4gICAgcG9zLCBcbiAgICAvLy8gVGhlIGR5bmFtaWMgc2NvcmUgb2YgdGhlIHN0YWNrLCBpbmNsdWRpbmcgZHluYW1pYyBwcmVjZWRlbmNlXG4gICAgLy8vIGFuZCBlcnJvci1yZWNvdmVyeSBwZW5hbHRpZXNcbiAgICAvLy8gQGludGVybmFsXG4gICAgc2NvcmUsIFxuICAgIC8vIFRoZSBvdXRwdXQgYnVmZmVyLiBIb2xkcyAodHlwZSwgc3RhcnQsIGVuZCwgc2l6ZSkgcXVhZHNcbiAgICAvLyByZXByZXNlbnRpbmcgbm9kZXMgY3JlYXRlZCBieSB0aGUgcGFyc2VyLCB3aGVyZSBgc2l6ZWAgaXNcbiAgICAvLyBhbW91bnQgb2YgYnVmZmVyIGFycmF5IGVudHJpZXMgY292ZXJlZCBieSB0aGlzIG5vZGUuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGJ1ZmZlciwgXG4gICAgLy8gVGhlIGJhc2Ugb2Zmc2V0IG9mIHRoZSBidWZmZXIuIFdoZW4gc3RhY2tzIGFyZSBzcGxpdCwgdGhlIHNwbGl0XG4gICAgLy8gaW5zdGFuY2Ugc2hhcmVkIHRoZSBidWZmZXIgaGlzdG9yeSB3aXRoIGl0cyBwYXJlbnQgdXAgdG9cbiAgICAvLyBgYnVmZmVyQmFzZWAsIHdoaWNoIGlzIHRoZSBhYnNvbHV0ZSBvZmZzZXQgKGluY2x1ZGluZyB0aGVcbiAgICAvLyBvZmZzZXQgb2YgcHJldmlvdXMgc3BsaXRzKSBpbnRvIHRoZSBidWZmZXIgYXQgd2hpY2ggdGhpcyBzdGFja1xuICAgIC8vIHN0YXJ0cyB3cml0aW5nLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBidWZmZXJCYXNlLCBcbiAgICAvLy8gQGludGVybmFsXG4gICAgY3VyQ29udGV4dCwgXG4gICAgLy8gQSBwYXJlbnQgc3RhY2sgZnJvbSB3aGljaCB0aGlzIHdhcyBzcGxpdCBvZmYsIGlmIGFueS4gVGhpcyBpc1xuICAgIC8vIHNldCB1cCBzbyB0aGF0IGl0IGFsd2F5cyBwb2ludHMgdG8gYSBzdGFjayB0aGF0IGhhcyBzb21lXG4gICAgLy8gYWRkaXRpb25hbCBidWZmZXIgY29udGVudCwgbmV2ZXIgdG8gYSBzdGFjayB3aXRoIGFuIGVxdWFsXG4gICAgLy8gYGJ1ZmZlckJhc2VgLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBwYXJlbnQpIHtcbiAgICAgICAgdGhpcy5wID0gcDtcbiAgICAgICAgdGhpcy5zdGFjayA9IHN0YWNrO1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgICAgIHRoaXMucmVkdWNlUG9zID0gcmVkdWNlUG9zO1xuICAgICAgICB0aGlzLnBvcyA9IHBvcztcbiAgICAgICAgdGhpcy5zY29yZSA9IHNjb3JlO1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgdGhpcy5idWZmZXJCYXNlID0gYnVmZmVyQmFzZTtcbiAgICAgICAgdGhpcy5jdXJDb250ZXh0ID0gY3VyQ29udGV4dDtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIGBbJHt0aGlzLnN0YWNrLmZpbHRlcigoXywgaSkgPT4gaSAlIDMgPT0gMCkuY29uY2F0KHRoaXMuc3RhdGUpfV1AJHt0aGlzLnBvc30ke3RoaXMuc2NvcmUgPyBcIiFcIiArIHRoaXMuc2NvcmUgOiBcIlwifWA7XG4gICAgfVxuICAgIC8vIFN0YXJ0IGFuIGVtcHR5IHN0YWNrXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHN0YXRpYyBzdGFydChwLCBzdGF0ZSwgcG9zID0gMCkge1xuICAgICAgICBsZXQgY3ggPSBwLnBhcnNlci5jb250ZXh0O1xuICAgICAgICByZXR1cm4gbmV3IFN0YWNrKHAsIFtdLCBzdGF0ZSwgcG9zLCBwb3MsIDAsIFtdLCAwLCBjeCA/IG5ldyBTdGFja0NvbnRleHQoY3gsIGN4LnN0YXJ0KSA6IG51bGwsIG51bGwpO1xuICAgIH1cbiAgICAvLy8gVGhlIHN0YWNrJ3MgY3VycmVudCBbY29udGV4dF0oI2xlemVyLkNvbnRleHRUcmFja2VyKSB2YWx1ZSwgaWZcbiAgICAvLy8gYW55LiBJdHMgdHlwZSB3aWxsIGRlcGVuZCBvbiB0aGUgY29udGV4dCB0cmFja2VyJ3MgdHlwZVxuICAgIC8vLyBwYXJhbWV0ZXIsIG9yIGl0IHdpbGwgYmUgYG51bGxgIGlmIHRoZXJlIGlzIG5vIGNvbnRleHRcbiAgICAvLy8gdHJhY2tlci5cbiAgICBnZXQgY29udGV4dCgpIHsgcmV0dXJuIHRoaXMuY3VyQ29udGV4dCA/IHRoaXMuY3VyQ29udGV4dC5jb250ZXh0IDogbnVsbDsgfVxuICAgIC8vIFB1c2ggYSBzdGF0ZSBvbnRvIHRoZSBzdGFjaywgdHJhY2tpbmcgaXRzIHN0YXJ0IHBvc2l0aW9uIGFzIHdlbGxcbiAgICAvLyBhcyB0aGUgYnVmZmVyIGJhc2UgYXQgdGhhdCBwb2ludC5cbiAgICAvLy8gQGludGVybmFsXG4gICAgcHVzaFN0YXRlKHN0YXRlLCBzdGFydCkge1xuICAgICAgICB0aGlzLnN0YWNrLnB1c2godGhpcy5zdGF0ZSwgc3RhcnQsIHRoaXMuYnVmZmVyQmFzZSArIHRoaXMuYnVmZmVyLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICB9XG4gICAgLy8gQXBwbHkgYSByZWR1Y2UgYWN0aW9uXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHJlZHVjZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IGRlcHRoID0gYWN0aW9uID4+IDE5IC8qIFJlZHVjZURlcHRoU2hpZnQgKi8sIHR5cGUgPSBhY3Rpb24gJiA2NTUzNSAvKiBWYWx1ZU1hc2sgKi87XG4gICAgICAgIGxldCB7IHBhcnNlciB9ID0gdGhpcy5wO1xuICAgICAgICBsZXQgZFByZWMgPSBwYXJzZXIuZHluYW1pY1ByZWNlZGVuY2UodHlwZSk7XG4gICAgICAgIGlmIChkUHJlYylcbiAgICAgICAgICAgIHRoaXMuc2NvcmUgKz0gZFByZWM7XG4gICAgICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgICAgICAvLyBaZXJvLWRlcHRoIHJlZHVjdGlvbnMgYXJlIGEgc3BlY2lhbCBjYXNl4oCUdGhleSBhZGQgc3R1ZmYgdG9cbiAgICAgICAgICAgIC8vIHRoZSBzdGFjayB3aXRob3V0IHBvcHBpbmcgYW55dGhpbmcgb2ZmLlxuICAgICAgICAgICAgaWYgKHR5cGUgPCBwYXJzZXIubWluUmVwZWF0VGVybSlcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3JlTm9kZSh0eXBlLCB0aGlzLnJlZHVjZVBvcywgdGhpcy5yZWR1Y2VQb3MsIDQsIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGUocGFyc2VyLmdldEdvdG8odGhpcy5zdGF0ZSwgdHlwZSwgdHJ1ZSksIHRoaXMucmVkdWNlUG9zKTtcbiAgICAgICAgICAgIHRoaXMucmVkdWNlQ29udGV4dCh0eXBlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBGaW5kIHRoZSBiYXNlIGluZGV4IGludG8gYHRoaXMuc3RhY2tgLCBjb250ZW50IGFmdGVyIHdoaWNoIHdpbGxcbiAgICAgICAgLy8gYmUgZHJvcHBlZC4gTm90ZSB0aGF0IHdpdGggYFN0YXlGbGFnYCByZWR1Y3Rpb25zIHdlIG5lZWQgdG9cbiAgICAgICAgLy8gY29uc3VtZSB0d28gZXh0cmEgZnJhbWVzICh0aGUgZHVtbXkgcGFyZW50IG5vZGUgZm9yIHRoZSBza2lwcGVkXG4gICAgICAgIC8vIGV4cHJlc3Npb24gYW5kIHRoZSBzdGF0ZSB0aGF0IHdlJ2xsIGJlIHN0YXlpbmcgaW4sIHdoaWNoIHNob3VsZFxuICAgICAgICAvLyBiZSBtb3ZlZCB0byBgdGhpcy5zdGF0ZWApLlxuICAgICAgICBsZXQgYmFzZSA9IHRoaXMuc3RhY2subGVuZ3RoIC0gKChkZXB0aCAtIDEpICogMykgLSAoYWN0aW9uICYgMjYyMTQ0IC8qIFN0YXlGbGFnICovID8gNiA6IDApO1xuICAgICAgICBsZXQgc3RhcnQgPSB0aGlzLnN0YWNrW2Jhc2UgLSAyXTtcbiAgICAgICAgbGV0IGJ1ZmZlckJhc2UgPSB0aGlzLnN0YWNrW2Jhc2UgLSAxXSwgY291bnQgPSB0aGlzLmJ1ZmZlckJhc2UgKyB0aGlzLmJ1ZmZlci5sZW5ndGggLSBidWZmZXJCYXNlO1xuICAgICAgICAvLyBTdG9yZSBub3JtYWwgdGVybXMgb3IgYFIgLT4gUiBSYCByZXBlYXQgcmVkdWN0aW9uc1xuICAgICAgICBpZiAodHlwZSA8IHBhcnNlci5taW5SZXBlYXRUZXJtIHx8IChhY3Rpb24gJiAxMzEwNzIgLyogUmVwZWF0RmxhZyAqLykpIHtcbiAgICAgICAgICAgIGxldCBwb3MgPSBwYXJzZXIuc3RhdGVGbGFnKHRoaXMuc3RhdGUsIDEgLyogU2tpcHBlZCAqLykgPyB0aGlzLnBvcyA6IHRoaXMucmVkdWNlUG9zO1xuICAgICAgICAgICAgdGhpcy5zdG9yZU5vZGUodHlwZSwgc3RhcnQsIHBvcywgY291bnQgKyA0LCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWN0aW9uICYgMjYyMTQ0IC8qIFN0YXlGbGFnICovKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5zdGFja1tiYXNlXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBiYXNlU3RhdGVJRCA9IHRoaXMuc3RhY2tbYmFzZSAtIDNdO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHBhcnNlci5nZXRHb3RvKGJhc2VTdGF0ZUlELCB0eXBlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAodGhpcy5zdGFjay5sZW5ndGggPiBiYXNlKVxuICAgICAgICAgICAgdGhpcy5zdGFjay5wb3AoKTtcbiAgICAgICAgdGhpcy5yZWR1Y2VDb250ZXh0KHR5cGUpO1xuICAgIH1cbiAgICAvLyBTaGlmdCBhIHZhbHVlIGludG8gdGhlIGJ1ZmZlclxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzdG9yZU5vZGUodGVybSwgc3RhcnQsIGVuZCwgc2l6ZSA9IDQsIGlzUmVkdWNlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRlcm0gPT0gMCAvKiBFcnIgKi8pIHsgLy8gVHJ5IHRvIG9taXQvbWVyZ2UgYWRqYWNlbnQgZXJyb3Igbm9kZXNcbiAgICAgICAgICAgIGxldCBjdXIgPSB0aGlzLCB0b3AgPSB0aGlzLmJ1ZmZlci5sZW5ndGg7XG4gICAgICAgICAgICBpZiAodG9wID09IDAgJiYgY3VyLnBhcmVudCkge1xuICAgICAgICAgICAgICAgIHRvcCA9IGN1ci5idWZmZXJCYXNlIC0gY3VyLnBhcmVudC5idWZmZXJCYXNlO1xuICAgICAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9wID4gMCAmJiBjdXIuYnVmZmVyW3RvcCAtIDRdID09IDAgLyogRXJyICovICYmIGN1ci5idWZmZXJbdG9wIC0gMV0gPiAtMSkge1xuICAgICAgICAgICAgICAgIGlmIChzdGFydCA9PSBlbmQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAoY3VyLmJ1ZmZlclt0b3AgLSAyXSA+PSBzdGFydCkge1xuICAgICAgICAgICAgICAgICAgICBjdXIuYnVmZmVyW3RvcCAtIDJdID0gZW5kO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghaXNSZWR1Y2UgfHwgdGhpcy5wb3MgPT0gZW5kKSB7IC8vIFNpbXBsZSBjYXNlLCBqdXN0IGFwcGVuZFxuICAgICAgICAgICAgdGhpcy5idWZmZXIucHVzaCh0ZXJtLCBzdGFydCwgZW5kLCBzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHsgLy8gVGhlcmUgbWF5IGJlIHNraXBwZWQgbm9kZXMgdGhhdCBoYXZlIHRvIGJlIG1vdmVkIGZvcndhcmRcbiAgICAgICAgICAgIGxldCBpbmRleCA9IHRoaXMuYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChpbmRleCA+IDAgJiYgdGhpcy5idWZmZXJbaW5kZXggLSA0XSAhPSAwIC8qIEVyciAqLylcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPiAwICYmIHRoaXMuYnVmZmVyW2luZGV4IC0gMl0gPiBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTW92ZSB0aGlzIHJlY29yZCBmb3J3YXJkXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4XSA9IHRoaXMuYnVmZmVyW2luZGV4IC0gNF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4ICsgMV0gPSB0aGlzLmJ1ZmZlcltpbmRleCAtIDNdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleCArIDJdID0gdGhpcy5idWZmZXJbaW5kZXggLSAyXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXggKyAzXSA9IHRoaXMuYnVmZmVyW2luZGV4IC0gMV07XG4gICAgICAgICAgICAgICAgICAgIGluZGV4IC09IDQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzaXplID4gNClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemUgLT0gNDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleF0gPSB0ZXJtO1xuICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXggKyAxXSA9IHN0YXJ0O1xuICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXggKyAyXSA9IGVuZDtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4ICsgM10gPSBzaXplO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEFwcGx5IGEgc2hpZnQgYWN0aW9uXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHNoaWZ0KGFjdGlvbiwgbmV4dCwgbmV4dEVuZCkge1xuICAgICAgICBpZiAoYWN0aW9uICYgMTMxMDcyIC8qIEdvdG9GbGFnICovKSB7XG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZShhY3Rpb24gJiA2NTUzNSAvKiBWYWx1ZU1hc2sgKi8sIHRoaXMucG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgoYWN0aW9uICYgMjYyMTQ0IC8qIFN0YXlGbGFnICovKSA9PSAwKSB7IC8vIFJlZ3VsYXIgc2hpZnRcbiAgICAgICAgICAgIGxldCBzdGFydCA9IHRoaXMucG9zLCBuZXh0U3RhdGUgPSBhY3Rpb24sIHsgcGFyc2VyIH0gPSB0aGlzLnA7XG4gICAgICAgICAgICBpZiAobmV4dEVuZCA+IHRoaXMucG9zIHx8IG5leHQgPD0gcGFyc2VyLm1heE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcyA9IG5leHRFbmQ7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXJzZXIuc3RhdGVGbGFnKG5leHRTdGF0ZSwgMSAvKiBTa2lwcGVkICovKSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWR1Y2VQb3MgPSBuZXh0RW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGUobmV4dFN0YXRlLCBzdGFydCk7XG4gICAgICAgICAgICBpZiAobmV4dCA8PSBwYXJzZXIubWF4Tm9kZSlcbiAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlci5wdXNoKG5leHQsIHN0YXJ0LCBuZXh0RW5kLCA0KTtcbiAgICAgICAgICAgIHRoaXMuc2hpZnRDb250ZXh0KG5leHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgeyAvLyBTaGlmdC1hbmQtc3RheSwgd2hpY2ggbWVhbnMgdGhpcyBpcyBhIHNraXBwZWQgdG9rZW5cbiAgICAgICAgICAgIGlmIChuZXh0IDw9IHRoaXMucC5wYXJzZXIubWF4Tm9kZSlcbiAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlci5wdXNoKG5leHQsIHRoaXMucG9zLCBuZXh0RW5kLCA0KTtcbiAgICAgICAgICAgIHRoaXMucG9zID0gbmV4dEVuZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBBcHBseSBhbiBhY3Rpb25cbiAgICAvLy8gQGludGVybmFsXG4gICAgYXBwbHkoYWN0aW9uLCBuZXh0LCBuZXh0RW5kKSB7XG4gICAgICAgIGlmIChhY3Rpb24gJiA2NTUzNiAvKiBSZWR1Y2VGbGFnICovKVxuICAgICAgICAgICAgdGhpcy5yZWR1Y2UoYWN0aW9uKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5zaGlmdChhY3Rpb24sIG5leHQsIG5leHRFbmQpO1xuICAgIH1cbiAgICAvLyBBZGQgYSBwcmVidWlsdCBub2RlIGludG8gdGhlIGJ1ZmZlci4gVGhpcyBtYXkgYmUgYSByZXVzZWQgbm9kZSBvclxuICAgIC8vIHRoZSByZXN1bHQgb2YgcnVubmluZyBhIG5lc3RlZCBwYXJzZXIuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHVzZU5vZGUodmFsdWUsIG5leHQpIHtcbiAgICAgICAgbGV0IGluZGV4ID0gdGhpcy5wLnJldXNlZC5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMucC5yZXVzZWRbaW5kZXhdICE9IHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnAucmV1c2VkLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBsZXQgc3RhcnQgPSB0aGlzLnBvcztcbiAgICAgICAgdGhpcy5yZWR1Y2VQb3MgPSB0aGlzLnBvcyA9IHN0YXJ0ICsgdmFsdWUubGVuZ3RoO1xuICAgICAgICB0aGlzLnB1c2hTdGF0ZShuZXh0LCBzdGFydCk7XG4gICAgICAgIHRoaXMuYnVmZmVyLnB1c2goaW5kZXgsIHN0YXJ0LCB0aGlzLnJlZHVjZVBvcywgLTEgLyogc2l6ZSA8IDAgbWVhbnMgdGhpcyBpcyBhIHJldXNlZCB2YWx1ZSAqLyk7XG4gICAgICAgIGlmICh0aGlzLmN1ckNvbnRleHQpXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbnRleHQodGhpcy5jdXJDb250ZXh0LnRyYWNrZXIucmV1c2UodGhpcy5jdXJDb250ZXh0LmNvbnRleHQsIHZhbHVlLCB0aGlzLnAuaW5wdXQsIHRoaXMpKTtcbiAgICB9XG4gICAgLy8gU3BsaXQgdGhlIHN0YWNrLiBEdWUgdG8gdGhlIGJ1ZmZlciBzaGFyaW5nIGFuZCB0aGUgZmFjdFxuICAgIC8vIHRoYXQgYHRoaXMuc3RhY2tgIHRlbmRzIHRvIHN0YXkgcXVpdGUgc2hhbGxvdywgdGhpcyBpc24ndCB2ZXJ5XG4gICAgLy8gZXhwZW5zaXZlLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzcGxpdCgpIHtcbiAgICAgICAgbGV0IHBhcmVudCA9IHRoaXM7XG4gICAgICAgIGxldCBvZmYgPSBwYXJlbnQuYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgLy8gQmVjYXVzZSB0aGUgdG9wIG9mIHRoZSBidWZmZXIgKGFmdGVyIHRoaXMucG9zKSBtYXkgYmUgbXV0YXRlZFxuICAgICAgICAvLyB0byByZW9yZGVyIHJlZHVjdGlvbnMgYW5kIHNraXBwZWQgdG9rZW5zLCBhbmQgc2hhcmVkIGJ1ZmZlcnNcbiAgICAgICAgLy8gc2hvdWxkIGJlIGltbXV0YWJsZSwgdGhpcyBjb3BpZXMgYW55IG91dHN0YW5kaW5nIHNraXBwZWQgdG9rZW5zXG4gICAgICAgIC8vIHRvIHRoZSBuZXcgYnVmZmVyLCBhbmQgcHV0cyB0aGUgYmFzZSBwb2ludGVyIGJlZm9yZSB0aGVtLlxuICAgICAgICB3aGlsZSAob2ZmID4gMCAmJiBwYXJlbnQuYnVmZmVyW29mZiAtIDJdID4gcGFyZW50LnJlZHVjZVBvcylcbiAgICAgICAgICAgIG9mZiAtPSA0O1xuICAgICAgICBsZXQgYnVmZmVyID0gcGFyZW50LmJ1ZmZlci5zbGljZShvZmYpLCBiYXNlID0gcGFyZW50LmJ1ZmZlckJhc2UgKyBvZmY7XG4gICAgICAgIC8vIE1ha2Ugc3VyZSBwYXJlbnQgcG9pbnRzIHRvIGFuIGFjdHVhbCBwYXJlbnQgd2l0aCBjb250ZW50LCBpZiB0aGVyZSBpcyBzdWNoIGEgcGFyZW50LlxuICAgICAgICB3aGlsZSAocGFyZW50ICYmIGJhc2UgPT0gcGFyZW50LmJ1ZmZlckJhc2UpXG4gICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgICByZXR1cm4gbmV3IFN0YWNrKHRoaXMucCwgdGhpcy5zdGFjay5zbGljZSgpLCB0aGlzLnN0YXRlLCB0aGlzLnJlZHVjZVBvcywgdGhpcy5wb3MsIHRoaXMuc2NvcmUsIGJ1ZmZlciwgYmFzZSwgdGhpcy5jdXJDb250ZXh0LCBwYXJlbnQpO1xuICAgIH1cbiAgICAvLyBUcnkgdG8gcmVjb3ZlciBmcm9tIGFuIGVycm9yIGJ5ICdkZWxldGluZycgKGlnbm9yaW5nKSBvbmUgdG9rZW4uXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHJlY292ZXJCeURlbGV0ZShuZXh0LCBuZXh0RW5kKSB7XG4gICAgICAgIGxldCBpc05vZGUgPSBuZXh0IDw9IHRoaXMucC5wYXJzZXIubWF4Tm9kZTtcbiAgICAgICAgaWYgKGlzTm9kZSlcbiAgICAgICAgICAgIHRoaXMuc3RvcmVOb2RlKG5leHQsIHRoaXMucG9zLCBuZXh0RW5kKTtcbiAgICAgICAgdGhpcy5zdG9yZU5vZGUoMCAvKiBFcnIgKi8sIHRoaXMucG9zLCBuZXh0RW5kLCBpc05vZGUgPyA4IDogNCk7XG4gICAgICAgIHRoaXMucG9zID0gdGhpcy5yZWR1Y2VQb3MgPSBuZXh0RW5kO1xuICAgICAgICB0aGlzLnNjb3JlIC09IDIwMCAvKiBUb2tlbiAqLztcbiAgICB9XG4gICAgLy8vIENoZWNrIGlmIHRoZSBnaXZlbiB0ZXJtIHdvdWxkIGJlIGFibGUgdG8gYmUgc2hpZnRlZCAob3B0aW9uYWxseVxuICAgIC8vLyBhZnRlciBzb21lIHJlZHVjdGlvbnMpIG9uIHRoaXMgc3RhY2suIFRoaXMgY2FuIGJlIHVzZWZ1bCBmb3JcbiAgICAvLy8gZXh0ZXJuYWwgdG9rZW5pemVycyB0aGF0IHdhbnQgdG8gbWFrZSBzdXJlIHRoZXkgb25seSBwcm92aWRlIGFcbiAgICAvLy8gZ2l2ZW4gdG9rZW4gd2hlbiBpdCBhcHBsaWVzLlxuICAgIGNhblNoaWZ0KHRlcm0pIHtcbiAgICAgICAgZm9yIChsZXQgc2ltID0gbmV3IFNpbXVsYXRlZFN0YWNrKHRoaXMpOzspIHtcbiAgICAgICAgICAgIGxldCBhY3Rpb24gPSB0aGlzLnAucGFyc2VyLnN0YXRlU2xvdChzaW0udG9wLCA0IC8qIERlZmF1bHRSZWR1Y2UgKi8pIHx8IHRoaXMucC5wYXJzZXIuaGFzQWN0aW9uKHNpbS50b3AsIHRlcm0pO1xuICAgICAgICAgICAgaWYgKChhY3Rpb24gJiA2NTUzNiAvKiBSZWR1Y2VGbGFnICovKSA9PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHNpbS5yZWR1Y2UoYWN0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gRmluZCB0aGUgc3RhcnQgcG9zaXRpb24gb2YgdGhlIHJ1bGUgdGhhdCBpcyBjdXJyZW50bHkgYmVpbmcgcGFyc2VkLlxuICAgIGdldCBydWxlU3RhcnQoKSB7XG4gICAgICAgIGZvciAobGV0IHN0YXRlID0gdGhpcy5zdGF0ZSwgYmFzZSA9IHRoaXMuc3RhY2subGVuZ3RoOzspIHtcbiAgICAgICAgICAgIGxldCBmb3JjZSA9IHRoaXMucC5wYXJzZXIuc3RhdGVTbG90KHN0YXRlLCA1IC8qIEZvcmNlZFJlZHVjZSAqLyk7XG4gICAgICAgICAgICBpZiAoIShmb3JjZSAmIDY1NTM2IC8qIFJlZHVjZUZsYWcgKi8pKVxuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgYmFzZSAtPSAzICogKGZvcmNlID4+IDE5IC8qIFJlZHVjZURlcHRoU2hpZnQgKi8pO1xuICAgICAgICAgICAgaWYgKChmb3JjZSAmIDY1NTM1IC8qIFZhbHVlTWFzayAqLykgPCB0aGlzLnAucGFyc2VyLm1pblJlcGVhdFRlcm0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhY2tbYmFzZSArIDFdO1xuICAgICAgICAgICAgc3RhdGUgPSB0aGlzLnN0YWNrW2Jhc2VdO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBGaW5kIHRoZSBzdGFydCBwb3NpdGlvbiBvZiBhbiBpbnN0YW5jZSBvZiBhbnkgb2YgdGhlIGdpdmVuIHRlcm1cbiAgICAvLy8gdHlwZXMsIG9yIHJldHVybiBgbnVsbGAgd2hlbiBub25lIG9mIHRoZW0gYXJlIGZvdW5kLlxuICAgIC8vL1xuICAgIC8vLyAqKk5vdGU6KiogdGhpcyBpcyBvbmx5IHJlbGlhYmxlIHdoZW4gdGhlcmUgaXMgYXQgbGVhc3Qgc29tZVxuICAgIC8vLyBzdGF0ZSB0aGF0IHVuYW1iaWd1b3VzbHkgbWF0Y2hlcyB0aGUgZ2l2ZW4gcnVsZSBvbiB0aGUgc3RhY2suXG4gICAgLy8vIEkuZS4gaWYgeW91IGhhdmUgYSBncmFtbWFyIGxpa2UgdGhpcywgd2hlcmUgdGhlIGRpZmZlcmVuY2VcbiAgICAvLy8gYmV0d2VlbiBgYWAgYW5kIGBiYCBpcyBvbmx5IGFwcGFyZW50IGF0IHRoZSB0aGlyZCB0b2tlbjpcbiAgICAvLy9cbiAgICAvLy8gICAgIGEgeyBiIHwgYyB9XG4gICAgLy8vICAgICBiIHsgXCJ4XCIgXCJ5XCIgXCJ4XCIgfVxuICAgIC8vLyAgICAgYyB7IFwieFwiIFwieVwiIFwielwiIH1cbiAgICAvLy9cbiAgICAvLy8gVGhlbiBhIHBhcnNlIHN0YXRlIGFmdGVyIGBcInhcImAgd2lsbCBub3QgcmVsaWFibHkgdGVsbCB5b3UgdGhhdFxuICAgIC8vLyBgYmAgaXMgb24gdGhlIHN0YWNrLiBZb3UgX2Nhbl8gcGFzcyBgW2IsIGNdYCB0byByZWxpYWJseSBjaGVja1xuICAgIC8vLyBmb3IgZWl0aGVyIG9mIHRob3NlIHR3byBydWxlcyAoYXNzdW1pbmcgdGhhdCBgYWAgaXNuJ3QgcGFydCBvZlxuICAgIC8vLyBzb21lIHJ1bGUgdGhhdCBpbmNsdWRlcyBvdGhlciB0aGluZ3Mgc3RhcnRpbmcgd2l0aCBgXCJ4XCJgKS5cbiAgICAvLy9cbiAgICAvLy8gV2hlbiBgYmVmb3JlYCBpcyBnaXZlbiwgdGhpcyBrZWVwcyBzY2FubmluZyB1cCB0aGUgc3RhY2sgdW50aWxcbiAgICAvLy8gaXQgZmluZHMgYSBtYXRjaCB0aGF0IHN0YXJ0cyBiZWZvcmUgdGhhdCBwb3NpdGlvbi5cbiAgICAvLy9cbiAgICAvLy8gTm90ZSB0aGF0IHlvdSBoYXZlIHRvIGJlIGNhcmVmdWwgd2hlbiB1c2luZyB0aGlzIGluIHRva2VuaXplcnMsXG4gICAgLy8vIHNpbmNlIGl0J3MgcmVsYXRpdmVseSBlYXN5IHRvIGludHJvZHVjZSBkYXRhIGRlcGVuZGVuY2llcyB0aGF0XG4gICAgLy8vIGJyZWFrIGluY3JlbWVudGFsIHBhcnNpbmcgYnkgdXNpbmcgdGhpcyBtZXRob2QuXG4gICAgc3RhcnRPZih0eXBlcywgYmVmb3JlKSB7XG4gICAgICAgIGxldCBzdGF0ZSA9IHRoaXMuc3RhdGUsIGZyYW1lID0gdGhpcy5zdGFjay5sZW5ndGgsIHsgcGFyc2VyIH0gPSB0aGlzLnA7XG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGxldCBmb3JjZSA9IHBhcnNlci5zdGF0ZVNsb3Qoc3RhdGUsIDUgLyogRm9yY2VkUmVkdWNlICovKTtcbiAgICAgICAgICAgIGxldCBkZXB0aCA9IGZvcmNlID4+IDE5IC8qIFJlZHVjZURlcHRoU2hpZnQgKi8sIHRlcm0gPSBmb3JjZSAmIDY1NTM1IC8qIFZhbHVlTWFzayAqLztcbiAgICAgICAgICAgIGlmICh0eXBlcy5pbmRleE9mKHRlcm0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICBsZXQgYmFzZSA9IGZyYW1lIC0gKDMgKiAoZm9yY2UgPj4gMTkgLyogUmVkdWNlRGVwdGhTaGlmdCAqLykpLCBwb3MgPSB0aGlzLnN0YWNrW2Jhc2UgKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoYmVmb3JlID09IG51bGwgfHwgYmVmb3JlID4gcG9zKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcG9zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZyYW1lID09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBpZiAoZGVwdGggPT0gMCkge1xuICAgICAgICAgICAgICAgIGZyYW1lIC09IDM7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSB0aGlzLnN0YWNrW2ZyYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGZyYW1lIC09IDMgKiAoZGVwdGggLSAxKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHBhcnNlci5nZXRHb3RvKHRoaXMuc3RhY2tbZnJhbWUgLSAzXSwgdGVybSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQXBwbHkgdXAgdG8gUmVjb3Zlci5NYXhOZXh0IHJlY292ZXJ5IGFjdGlvbnMgdGhhdCBjb25jZXB0dWFsbHlcbiAgICAvLyBpbnNlcnRzIHNvbWUgbWlzc2luZyB0b2tlbiBvciBydWxlLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICByZWNvdmVyQnlJbnNlcnQobmV4dCkge1xuICAgICAgICBpZiAodGhpcy5zdGFjay5sZW5ndGggPj0gMzAwIC8qIE1heEluc2VydFN0YWNrRGVwdGggKi8pXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIGxldCBuZXh0U3RhdGVzID0gdGhpcy5wLnBhcnNlci5uZXh0U3RhdGVzKHRoaXMuc3RhdGUpO1xuICAgICAgICBpZiAobmV4dFN0YXRlcy5sZW5ndGggPiA0IC8qIE1heE5leHQgKi8gPDwgMSB8fCB0aGlzLnN0YWNrLmxlbmd0aCA+PSAxMjAgLyogRGFtcGVuSW5zZXJ0U3RhY2tEZXB0aCAqLykge1xuICAgICAgICAgICAgbGV0IGJlc3QgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBzOyBpIDwgbmV4dFN0YXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAgICAgICAgIGlmICgocyA9IG5leHRTdGF0ZXNbaSArIDFdKSAhPSB0aGlzLnN0YXRlICYmIHRoaXMucC5wYXJzZXIuaGFzQWN0aW9uKHMsIG5leHQpKVxuICAgICAgICAgICAgICAgICAgICBiZXN0LnB1c2gobmV4dFN0YXRlc1tpXSwgcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5zdGFjay5sZW5ndGggPCAxMjAgLyogRGFtcGVuSW5zZXJ0U3RhY2tEZXB0aCAqLylcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgYmVzdC5sZW5ndGggPCA0IC8qIE1heE5leHQgKi8gPDwgMSAmJiBpIDwgbmV4dFN0YXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcyA9IG5leHRTdGF0ZXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWJlc3Quc29tZSgodiwgaSkgPT4gKGkgJiAxKSAmJiB2ID09IHMpKVxuICAgICAgICAgICAgICAgICAgICAgICAgYmVzdC5wdXNoKG5leHRTdGF0ZXNbaV0sIHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRTdGF0ZXMgPSBiZXN0O1xuICAgICAgICB9XG4gICAgICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZXh0U3RhdGVzLmxlbmd0aCAmJiByZXN1bHQubGVuZ3RoIDwgNCAvKiBNYXhOZXh0ICovOyBpICs9IDIpIHtcbiAgICAgICAgICAgIGxldCBzID0gbmV4dFN0YXRlc1tpICsgMV07XG4gICAgICAgICAgICBpZiAocyA9PSB0aGlzLnN0YXRlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IHN0YWNrID0gdGhpcy5zcGxpdCgpO1xuICAgICAgICAgICAgc3RhY2suc3RvcmVOb2RlKDAgLyogRXJyICovLCBzdGFjay5wb3MsIHN0YWNrLnBvcywgNCwgdHJ1ZSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoU3RhdGUocywgdGhpcy5wb3MpO1xuICAgICAgICAgICAgc3RhY2suc2hpZnRDb250ZXh0KG5leHRTdGF0ZXNbaV0pO1xuICAgICAgICAgICAgc3RhY2suc2NvcmUgLT0gMjAwIC8qIFRva2VuICovO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goc3RhY2spO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIC8vIEZvcmNlIGEgcmVkdWNlLCBpZiBwb3NzaWJsZS4gUmV0dXJuIGZhbHNlIGlmIHRoYXQgY2FuJ3RcbiAgICAvLyBiZSBkb25lLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBmb3JjZVJlZHVjZSgpIHtcbiAgICAgICAgbGV0IHJlZHVjZSA9IHRoaXMucC5wYXJzZXIuc3RhdGVTbG90KHRoaXMuc3RhdGUsIDUgLyogRm9yY2VkUmVkdWNlICovKTtcbiAgICAgICAgaWYgKChyZWR1Y2UgJiA2NTUzNiAvKiBSZWR1Y2VGbGFnICovKSA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMucC5wYXJzZXIudmFsaWRBY3Rpb24odGhpcy5zdGF0ZSwgcmVkdWNlKSkge1xuICAgICAgICAgICAgdGhpcy5zdG9yZU5vZGUoMCAvKiBFcnIgKi8sIHRoaXMucmVkdWNlUG9zLCB0aGlzLnJlZHVjZVBvcywgNCwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnNjb3JlIC09IDEwMCAvKiBSZWR1Y2UgKi87XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWR1Y2UocmVkdWNlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBmb3JjZUFsbCgpIHtcbiAgICAgICAgd2hpbGUgKCF0aGlzLnAucGFyc2VyLnN0YXRlRmxhZyh0aGlzLnN0YXRlLCAyIC8qIEFjY2VwdGluZyAqLykgJiYgdGhpcy5mb3JjZVJlZHVjZSgpKSB7IH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8vLyBDaGVjayB3aGV0aGVyIHRoaXMgc3RhdGUgaGFzIG5vIGZ1cnRoZXIgYWN0aW9ucyAoYXNzdW1lZCB0byBiZSBhIGRpcmVjdCBkZXNjZW5kYW50IG9mIHRoZVxuICAgIC8vLyB0b3Agc3RhdGUsIHNpbmNlIGFueSBvdGhlciBzdGF0ZXMgbXVzdCBiZSBhYmxlIHRvIGNvbnRpbnVlXG4gICAgLy8vIHNvbWVob3cpLiBAaW50ZXJuYWxcbiAgICBnZXQgZGVhZEVuZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhY2subGVuZ3RoICE9IDMpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGxldCB7IHBhcnNlciB9ID0gdGhpcy5wO1xuICAgICAgICByZXR1cm4gcGFyc2VyLmRhdGFbcGFyc2VyLnN0YXRlU2xvdCh0aGlzLnN0YXRlLCAxIC8qIEFjdGlvbnMgKi8pXSA9PSA2NTUzNSAvKiBFbmQgKi8gJiZcbiAgICAgICAgICAgICFwYXJzZXIuc3RhdGVTbG90KHRoaXMuc3RhdGUsIDQgLyogRGVmYXVsdFJlZHVjZSAqLyk7XG4gICAgfVxuICAgIC8vLyBSZXN0YXJ0IHRoZSBzdGFjayAocHV0IGl0IGJhY2sgaW4gaXRzIHN0YXJ0IHN0YXRlKS4gT25seSBzYWZlXG4gICAgLy8vIHdoZW4gdGhpcy5zdGFjay5sZW5ndGggPT0gMyAoc3RhdGUgaXMgZGlyZWN0bHkgYmVsb3cgdGhlIHRvcFxuICAgIC8vLyBzdGF0ZSkuIEBpbnRlcm5hbFxuICAgIHJlc3RhcnQoKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLnN0YWNrWzBdO1xuICAgICAgICB0aGlzLnN0YWNrLmxlbmd0aCA9IDA7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzYW1lU3RhdGUob3RoZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT0gb3RoZXIuc3RhdGUgfHwgdGhpcy5zdGFjay5sZW5ndGggIT0gb3RoZXIuc3RhY2subGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3RhY2subGVuZ3RoOyBpICs9IDMpXG4gICAgICAgICAgICBpZiAodGhpcy5zdGFja1tpXSAhPSBvdGhlci5zdGFja1tpXSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLy8gR2V0IHRoZSBwYXJzZXIgdXNlZCBieSB0aGlzIHN0YWNrLlxuICAgIGdldCBwYXJzZXIoKSB7IHJldHVybiB0aGlzLnAucGFyc2VyOyB9XG4gICAgLy8vIFRlc3Qgd2hldGhlciBhIGdpdmVuIGRpYWxlY3QgKGJ5IG51bWVyaWMgSUQsIGFzIGV4cG9ydGVkIGZyb21cbiAgICAvLy8gdGhlIHRlcm1zIGZpbGUpIGlzIGVuYWJsZWQuXG4gICAgZGlhbGVjdEVuYWJsZWQoZGlhbGVjdElEKSB7IHJldHVybiB0aGlzLnAucGFyc2VyLmRpYWxlY3QuZmxhZ3NbZGlhbGVjdElEXTsgfVxuICAgIHNoaWZ0Q29udGV4dCh0ZXJtKSB7XG4gICAgICAgIGlmICh0aGlzLmN1ckNvbnRleHQpXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbnRleHQodGhpcy5jdXJDb250ZXh0LnRyYWNrZXIuc2hpZnQodGhpcy5jdXJDb250ZXh0LmNvbnRleHQsIHRlcm0sIHRoaXMucC5pbnB1dCwgdGhpcykpO1xuICAgIH1cbiAgICByZWR1Y2VDb250ZXh0KHRlcm0pIHtcbiAgICAgICAgaWYgKHRoaXMuY3VyQ29udGV4dClcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29udGV4dCh0aGlzLmN1ckNvbnRleHQudHJhY2tlci5yZWR1Y2UodGhpcy5jdXJDb250ZXh0LmNvbnRleHQsIHRlcm0sIHRoaXMucC5pbnB1dCwgdGhpcykpO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgZW1pdENvbnRleHQoKSB7XG4gICAgICAgIGxldCBjeCA9IHRoaXMuY3VyQ29udGV4dDtcbiAgICAgICAgaWYgKCFjeC50cmFja2VyLnN0cmljdClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbGV0IGxhc3QgPSB0aGlzLmJ1ZmZlci5sZW5ndGggLSAxO1xuICAgICAgICBpZiAobGFzdCA8IDAgfHwgdGhpcy5idWZmZXJbbGFzdF0gIT0gLTIpXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlci5wdXNoKGN4Lmhhc2gsIHRoaXMucmVkdWNlUG9zLCB0aGlzLnJlZHVjZVBvcywgLTIpO1xuICAgIH1cbiAgICB1cGRhdGVDb250ZXh0KGNvbnRleHQpIHtcbiAgICAgICAgaWYgKGNvbnRleHQgIT0gdGhpcy5jdXJDb250ZXh0LmNvbnRleHQpIHtcbiAgICAgICAgICAgIGxldCBuZXdDeCA9IG5ldyBTdGFja0NvbnRleHQodGhpcy5jdXJDb250ZXh0LnRyYWNrZXIsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKG5ld0N4Lmhhc2ggIT0gdGhpcy5jdXJDb250ZXh0Lmhhc2gpXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q29udGV4dCgpO1xuICAgICAgICAgICAgdGhpcy5jdXJDb250ZXh0ID0gbmV3Q3g7XG4gICAgICAgIH1cbiAgICB9XG59XG5jbGFzcyBTdGFja0NvbnRleHQge1xuICAgIGNvbnN0cnVjdG9yKHRyYWNrZXIsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy50cmFja2VyID0gdHJhY2tlcjtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgdGhpcy5oYXNoID0gdHJhY2tlci5oYXNoKGNvbnRleHQpO1xuICAgIH1cbn1cbnZhciBSZWNvdmVyO1xuKGZ1bmN0aW9uIChSZWNvdmVyKSB7XG4gICAgUmVjb3ZlcltSZWNvdmVyW1wiVG9rZW5cIl0gPSAyMDBdID0gXCJUb2tlblwiO1xuICAgIFJlY292ZXJbUmVjb3ZlcltcIlJlZHVjZVwiXSA9IDEwMF0gPSBcIlJlZHVjZVwiO1xuICAgIFJlY292ZXJbUmVjb3ZlcltcIk1heE5leHRcIl0gPSA0XSA9IFwiTWF4TmV4dFwiO1xuICAgIFJlY292ZXJbUmVjb3ZlcltcIk1heEluc2VydFN0YWNrRGVwdGhcIl0gPSAzMDBdID0gXCJNYXhJbnNlcnRTdGFja0RlcHRoXCI7XG4gICAgUmVjb3ZlcltSZWNvdmVyW1wiRGFtcGVuSW5zZXJ0U3RhY2tEZXB0aFwiXSA9IDEyMF0gPSBcIkRhbXBlbkluc2VydFN0YWNrRGVwdGhcIjtcbn0pKFJlY292ZXIgfHwgKFJlY292ZXIgPSB7fSkpO1xuLy8gVXNlZCB0byBjaGVhcGx5IHJ1biBzb21lIHJlZHVjdGlvbnMgdG8gc2NhbiBhaGVhZCB3aXRob3V0IG11dGF0aW5nXG4vLyBhbiBlbnRpcmUgc3RhY2tcbmNsYXNzIFNpbXVsYXRlZFN0YWNrIHtcbiAgICBjb25zdHJ1Y3RvcihzdGFjaykge1xuICAgICAgICB0aGlzLnN0YWNrID0gc3RhY2s7XG4gICAgICAgIHRoaXMudG9wID0gc3RhY2suc3RhdGU7XG4gICAgICAgIHRoaXMucmVzdCA9IHN0YWNrLnN0YWNrO1xuICAgICAgICB0aGlzLm9mZnNldCA9IHRoaXMucmVzdC5sZW5ndGg7XG4gICAgfVxuICAgIHJlZHVjZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHRlcm0gPSBhY3Rpb24gJiA2NTUzNSAvKiBWYWx1ZU1hc2sgKi8sIGRlcHRoID0gYWN0aW9uID4+IDE5IC8qIFJlZHVjZURlcHRoU2hpZnQgKi87XG4gICAgICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXN0ID09IHRoaXMuc3RhY2suc3RhY2spXG4gICAgICAgICAgICAgICAgdGhpcy5yZXN0ID0gdGhpcy5yZXN0LnNsaWNlKCk7XG4gICAgICAgICAgICB0aGlzLnJlc3QucHVzaCh0aGlzLnRvcCwgMCwgMCk7XG4gICAgICAgICAgICB0aGlzLm9mZnNldCArPSAzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5vZmZzZXQgLT0gKGRlcHRoIC0gMSkgKiAzO1xuICAgICAgICB9XG4gICAgICAgIGxldCBnb3RvID0gdGhpcy5zdGFjay5wLnBhcnNlci5nZXRHb3RvKHRoaXMucmVzdFt0aGlzLm9mZnNldCAtIDNdLCB0ZXJtLCB0cnVlKTtcbiAgICAgICAgdGhpcy50b3AgPSBnb3RvO1xuICAgIH1cbn1cbi8vIFRoaXMgaXMgZ2l2ZW4gdG8gYFRyZWUuYnVpbGRgIHRvIGJ1aWxkIGEgYnVmZmVyLCBhbmQgZW5jYXBzdWxhdGVzXG4vLyB0aGUgcGFyZW50LXN0YWNrLXdhbGtpbmcgbmVjZXNzYXJ5IHRvIHJlYWQgdGhlIG5vZGVzLlxuY2xhc3MgU3RhY2tCdWZmZXJDdXJzb3Ige1xuICAgIGNvbnN0cnVjdG9yKHN0YWNrLCBwb3MsIGluZGV4KSB7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBzdGFjaztcbiAgICAgICAgdGhpcy5wb3MgPSBwb3M7XG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBzdGFjay5idWZmZXI7XG4gICAgICAgIGlmICh0aGlzLmluZGV4ID09IDApXG4gICAgICAgICAgICB0aGlzLm1heWJlTmV4dCgpO1xuICAgIH1cbiAgICBzdGF0aWMgY3JlYXRlKHN0YWNrKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RhY2tCdWZmZXJDdXJzb3Ioc3RhY2ssIHN0YWNrLmJ1ZmZlckJhc2UgKyBzdGFjay5idWZmZXIubGVuZ3RoLCBzdGFjay5idWZmZXIubGVuZ3RoKTtcbiAgICB9XG4gICAgbWF5YmVOZXh0KCkge1xuICAgICAgICBsZXQgbmV4dCA9IHRoaXMuc3RhY2sucGFyZW50O1xuICAgICAgICBpZiAobmV4dCAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmluZGV4ID0gdGhpcy5zdGFjay5idWZmZXJCYXNlIC0gbmV4dC5idWZmZXJCYXNlO1xuICAgICAgICAgICAgdGhpcy5zdGFjayA9IG5leHQ7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlciA9IG5leHQuYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldCBpZCgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSA0XTsgfVxuICAgIGdldCBzdGFydCgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSAzXTsgfVxuICAgIGdldCBlbmQoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gMl07IH1cbiAgICBnZXQgc2l6ZSgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSAxXTsgfVxuICAgIG5leHQoKSB7XG4gICAgICAgIHRoaXMuaW5kZXggLT0gNDtcbiAgICAgICAgdGhpcy5wb3MgLT0gNDtcbiAgICAgICAgaWYgKHRoaXMuaW5kZXggPT0gMClcbiAgICAgICAgICAgIHRoaXMubWF5YmVOZXh0KCk7XG4gICAgfVxuICAgIGZvcmsoKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RhY2tCdWZmZXJDdXJzb3IodGhpcy5zdGFjaywgdGhpcy5wb3MsIHRoaXMuaW5kZXgpO1xuICAgIH1cbn1cblxuLy8vIFRva2VuaXplcnMgd3JpdGUgdGhlIHRva2VucyB0aGV5IHJlYWQgaW50byBpbnN0YW5jZXMgb2YgdGhpcyBjbGFzcy5cbmNsYXNzIFRva2VuIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgLy8vIFRoZSBzdGFydCBvZiB0aGUgdG9rZW4uIFRoaXMgaXMgc2V0IGJ5IHRoZSBwYXJzZXIsIGFuZCBzaG91bGQgbm90XG4gICAgICAgIC8vLyBiZSBtdXRhdGVkIGJ5IHRoZSB0b2tlbml6ZXIuXG4gICAgICAgIHRoaXMuc3RhcnQgPSAtMTtcbiAgICAgICAgLy8vIFRoaXMgc3RhcnRzIGF0IC0xLCBhbmQgc2hvdWxkIGJlIHVwZGF0ZWQgdG8gYSB0ZXJtIGlkIHdoZW4gYVxuICAgICAgICAvLy8gbWF0Y2hpbmcgdG9rZW4gaXMgZm91bmQuXG4gICAgICAgIHRoaXMudmFsdWUgPSAtMTtcbiAgICAgICAgLy8vIFdoZW4gc2V0dGluZyBgLnZhbHVlYCwgeW91IHNob3VsZCBhbHNvIHNldCBgLmVuZGAgdG8gdGhlIGVuZFxuICAgICAgICAvLy8gcG9zaXRpb24gb2YgdGhlIHRva2VuLiAoWW91J2xsIHVzdWFsbHkgd2FudCB0byB1c2UgdGhlIGBhY2NlcHRgXG4gICAgICAgIC8vLyBtZXRob2QuKVxuICAgICAgICB0aGlzLmVuZCA9IC0xO1xuICAgIH1cbiAgICAvLy8gQWNjZXB0IGEgdG9rZW4sIHNldHRpbmcgYHZhbHVlYCBhbmQgYGVuZGAgdG8gdGhlIGdpdmVuIHZhbHVlcy5cbiAgICBhY2NlcHQodmFsdWUsIGVuZCkge1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuZW5kID0gZW5kO1xuICAgIH1cbn1cbi8vLyBAaW50ZXJuYWxcbmNsYXNzIFRva2VuR3JvdXAge1xuICAgIGNvbnN0cnVjdG9yKGRhdGEsIGlkKSB7XG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICB9XG4gICAgdG9rZW4oaW5wdXQsIHRva2VuLCBzdGFjaykgeyByZWFkVG9rZW4odGhpcy5kYXRhLCBpbnB1dCwgdG9rZW4sIHN0YWNrLCB0aGlzLmlkKTsgfVxufVxuVG9rZW5Hcm91cC5wcm90b3R5cGUuY29udGV4dHVhbCA9IFRva2VuR3JvdXAucHJvdG90eXBlLmZhbGxiYWNrID0gVG9rZW5Hcm91cC5wcm90b3R5cGUuZXh0ZW5kID0gZmFsc2U7XG4vLy8gRXhwb3J0cyB0aGF0IGFyZSB1c2VkIGZvciBgQGV4dGVybmFsIHRva2Vuc2AgaW4gdGhlIGdyYW1tYXIgc2hvdWxkXG4vLy8gZXhwb3J0IGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG5jbGFzcyBFeHRlcm5hbFRva2VuaXplciB7XG4gICAgLy8vIENyZWF0ZSBhIHRva2VuaXplci4gVGhlIGZpcnN0IGFyZ3VtZW50IGlzIHRoZSBmdW5jdGlvbiB0aGF0LFxuICAgIC8vLyBnaXZlbiBhbiBpbnB1dCBzdHJlYW0gYW5kIGEgdG9rZW4gb2JqZWN0LFxuICAgIC8vLyBbZmlsbHNdKCNsZXplci5Ub2tlbi5hY2NlcHQpIHRoZSB0b2tlbiBvYmplY3QgaWYgaXQgcmVjb2duaXplcyBhXG4gICAgLy8vIHRva2VuLiBgdG9rZW4uc3RhcnRgIHNob3VsZCBiZSB1c2VkIGFzIHRoZSBzdGFydCBwb3NpdGlvbiB0b1xuICAgIC8vLyBzY2FuIGZyb20uXG4gICAgY29uc3RydWN0b3IoXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHRva2VuLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgICAgICB0aGlzLmNvbnRleHR1YWwgPSAhIW9wdGlvbnMuY29udGV4dHVhbDtcbiAgICAgICAgdGhpcy5mYWxsYmFjayA9ICEhb3B0aW9ucy5mYWxsYmFjaztcbiAgICAgICAgdGhpcy5leHRlbmQgPSAhIW9wdGlvbnMuZXh0ZW5kO1xuICAgIH1cbn1cbi8vIFRva2VuaXplciBkYXRhIGlzIHN0b3JlZCBhIGJpZyB1aW50MTYgYXJyYXkgY29udGFpbmluZywgZm9yIGVhY2hcbi8vIHN0YXRlOlxuLy9cbi8vICAtIEEgZ3JvdXAgYml0bWFzaywgaW5kaWNhdGluZyB3aGF0IHRva2VuIGdyb3VwcyBhcmUgcmVhY2hhYmxlIGZyb21cbi8vICAgIHRoaXMgc3RhdGUsIHNvIHRoYXQgcGF0aHMgdGhhdCBjYW4gb25seSBsZWFkIHRvIHRva2VucyBub3QgaW5cbi8vICAgIGFueSBvZiB0aGUgY3VycmVudCBncm91cHMgY2FuIGJlIGN1dCBvZmYgZWFybHkuXG4vL1xuLy8gIC0gVGhlIHBvc2l0aW9uIG9mIHRoZSBlbmQgb2YgdGhlIHN0YXRlJ3Mgc2VxdWVuY2Ugb2YgYWNjZXB0aW5nXG4vLyAgICB0b2tlbnNcbi8vXG4vLyAgLSBUaGUgbnVtYmVyIG9mIG91dGdvaW5nIGVkZ2VzIGZvciB0aGUgc3RhdGVcbi8vXG4vLyAgLSBUaGUgYWNjZXB0aW5nIHRva2VucywgYXMgKHRva2VuIGlkLCBncm91cCBtYXNrKSBwYWlyc1xuLy9cbi8vICAtIFRoZSBvdXRnb2luZyBlZGdlcywgYXMgKHN0YXJ0IGNoYXJhY3RlciwgZW5kIGNoYXJhY3Rlciwgc3RhdGVcbi8vICAgIGluZGV4KSB0cmlwbGVzLCB3aXRoIGVuZCBjaGFyYWN0ZXIgYmVpbmcgZXhjbHVzaXZlXG4vL1xuLy8gVGhpcyBmdW5jdGlvbiBpbnRlcnByZXRzIHRoYXQgZGF0YSwgcnVubmluZyB0aHJvdWdoIGEgc3RyZWFtIGFzXG4vLyBsb25nIGFzIG5ldyBzdGF0ZXMgd2l0aCB0aGUgYSBtYXRjaGluZyBncm91cCBtYXNrIGNhbiBiZSByZWFjaGVkLFxuLy8gYW5kIHVwZGF0aW5nIGB0b2tlbmAgd2hlbiBpdCBtYXRjaGVzIGEgdG9rZW4uXG5mdW5jdGlvbiByZWFkVG9rZW4oZGF0YSwgaW5wdXQsIHRva2VuLCBzdGFjaywgZ3JvdXApIHtcbiAgICBsZXQgc3RhdGUgPSAwLCBncm91cE1hc2sgPSAxIDw8IGdyb3VwLCBkaWFsZWN0ID0gc3RhY2sucC5wYXJzZXIuZGlhbGVjdDtcbiAgICBzY2FuOiBmb3IgKGxldCBwb3MgPSB0b2tlbi5zdGFydDs7KSB7XG4gICAgICAgIGlmICgoZ3JvdXBNYXNrICYgZGF0YVtzdGF0ZV0pID09IDApXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgbGV0IGFjY0VuZCA9IGRhdGFbc3RhdGUgKyAxXTtcbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGlzIHN0YXRlIGNhbiBsZWFkIHRvIGEgdG9rZW4gaW4gdGhlIGN1cnJlbnQgZ3JvdXBcbiAgICAgICAgLy8gQWNjZXB0IHRva2VucyBpbiB0aGlzIHN0YXRlLCBwb3NzaWJseSBvdmVyd3JpdGluZ1xuICAgICAgICAvLyBsb3dlci1wcmVjZWRlbmNlIC8gc2hvcnRlciB0b2tlbnNcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YXRlICsgMzsgaSA8IGFjY0VuZDsgaSArPSAyKVxuICAgICAgICAgICAgaWYgKChkYXRhW2kgKyAxXSAmIGdyb3VwTWFzaykgPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRlcm0gPSBkYXRhW2ldO1xuICAgICAgICAgICAgICAgIGlmIChkaWFsZWN0LmFsbG93cyh0ZXJtKSAmJlxuICAgICAgICAgICAgICAgICAgICAodG9rZW4udmFsdWUgPT0gLTEgfHwgdG9rZW4udmFsdWUgPT0gdGVybSB8fCBzdGFjay5wLnBhcnNlci5vdmVycmlkZXModGVybSwgdG9rZW4udmFsdWUpKSkge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi5hY2NlcHQodGVybSwgcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBsZXQgbmV4dCA9IGlucHV0LmdldChwb3MrKyk7XG4gICAgICAgIC8vIERvIGEgYmluYXJ5IHNlYXJjaCBvbiB0aGUgc3RhdGUncyBlZGdlc1xuICAgICAgICBmb3IgKGxldCBsb3cgPSAwLCBoaWdoID0gZGF0YVtzdGF0ZSArIDJdOyBsb3cgPCBoaWdoOykge1xuICAgICAgICAgICAgbGV0IG1pZCA9IChsb3cgKyBoaWdoKSA+PiAxO1xuICAgICAgICAgICAgbGV0IGluZGV4ID0gYWNjRW5kICsgbWlkICsgKG1pZCA8PCAxKTtcbiAgICAgICAgICAgIGxldCBmcm9tID0gZGF0YVtpbmRleF0sIHRvID0gZGF0YVtpbmRleCArIDFdO1xuICAgICAgICAgICAgaWYgKG5leHQgPCBmcm9tKVxuICAgICAgICAgICAgICAgIGhpZ2ggPSBtaWQ7XG4gICAgICAgICAgICBlbHNlIGlmIChuZXh0ID49IHRvKVxuICAgICAgICAgICAgICAgIGxvdyA9IG1pZCArIDE7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IGRhdGFbaW5kZXggKyAyXTtcbiAgICAgICAgICAgICAgICBjb250aW51ZSBzY2FuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuLy8gU2VlIGxlemVyLWdlbmVyYXRvci9zcmMvZW5jb2RlLnRzIGZvciBjb21tZW50cyBhYm91dCB0aGUgZW5jb2Rpbmdcbi8vIHVzZWQgaGVyZVxuZnVuY3Rpb24gZGVjb2RlQXJyYXkoaW5wdXQsIFR5cGUgPSBVaW50MTZBcnJheSkge1xuICAgIGlmICh0eXBlb2YgaW5wdXQgIT0gXCJzdHJpbmdcIilcbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgIGxldCBhcnJheSA9IG51bGw7XG4gICAgZm9yIChsZXQgcG9zID0gMCwgb3V0ID0gMDsgcG9zIDwgaW5wdXQubGVuZ3RoOykge1xuICAgICAgICBsZXQgdmFsdWUgPSAwO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBsZXQgbmV4dCA9IGlucHV0LmNoYXJDb2RlQXQocG9zKyspLCBzdG9wID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobmV4dCA9PSAxMjYgLyogQmlnVmFsQ29kZSAqLykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gNjU1MzUgLyogQmlnVmFsICovO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5leHQgPj0gOTIgLyogR2FwMiAqLylcbiAgICAgICAgICAgICAgICBuZXh0LS07XG4gICAgICAgICAgICBpZiAobmV4dCA+PSAzNCAvKiBHYXAxICovKVxuICAgICAgICAgICAgICAgIG5leHQtLTtcbiAgICAgICAgICAgIGxldCBkaWdpdCA9IG5leHQgLSAzMiAvKiBTdGFydCAqLztcbiAgICAgICAgICAgIGlmIChkaWdpdCA+PSA0NiAvKiBCYXNlICovKSB7XG4gICAgICAgICAgICAgICAgZGlnaXQgLT0gNDYgLyogQmFzZSAqLztcbiAgICAgICAgICAgICAgICBzdG9wID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlICs9IGRpZ2l0O1xuICAgICAgICAgICAgaWYgKHN0b3ApXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB2YWx1ZSAqPSA0NiAvKiBCYXNlICovO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcnJheSlcbiAgICAgICAgICAgIGFycmF5W291dCsrXSA9IHZhbHVlO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBhcnJheSA9IG5ldyBUeXBlKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5O1xufVxuXG4vLyBGSVhNRSBmaW5kIHNvbWUgd2F5IHRvIHJlZHVjZSByZWNvdmVyeSB3b3JrIGRvbmUgd2hlbiB0aGUgaW5wdXRcbi8vIGRvZXNuJ3QgbWF0Y2ggdGhlIGdyYW1tYXIgYXQgYWxsLlxuLy8gRW52aXJvbm1lbnQgdmFyaWFibGUgdXNlZCB0byBjb250cm9sIGNvbnNvbGUgb3V0cHV0XG5jb25zdCB2ZXJib3NlID0gdHlwZW9mIHByb2Nlc3MgIT0gXCJ1bmRlZmluZWRcIiAmJiAvXFxicGFyc2VcXGIvLnRlc3QocHJvY2Vzcy5lbnYuTE9HKTtcbmxldCBzdGFja0lEcyA9IG51bGw7XG5mdW5jdGlvbiBjdXRBdCh0cmVlLCBwb3MsIHNpZGUpIHtcbiAgICBsZXQgY3Vyc29yID0gdHJlZS5jdXJzb3IocG9zKTtcbiAgICBmb3IgKDs7KSB7XG4gICAgICAgIGlmICghKHNpZGUgPCAwID8gY3Vyc29yLmNoaWxkQmVmb3JlKHBvcykgOiBjdXJzb3IuY2hpbGRBZnRlcihwb3MpKSlcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBpZiAoKHNpZGUgPCAwID8gY3Vyc29yLnRvIDwgcG9zIDogY3Vyc29yLmZyb20gPiBwb3MpICYmICFjdXJzb3IudHlwZS5pc0Vycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lkZSA8IDAgPyBNYXRoLm1heCgwLCBNYXRoLm1pbihjdXJzb3IudG8gLSAxLCBwb3MgLSA1KSkgOiBNYXRoLm1pbih0cmVlLmxlbmd0aCwgTWF0aC5tYXgoY3Vyc29yLmZyb20gKyAxLCBwb3MgKyA1KSk7XG4gICAgICAgICAgICAgICAgaWYgKHNpZGUgPCAwID8gY3Vyc29yLnByZXZTaWJsaW5nKCkgOiBjdXJzb3IubmV4dFNpYmxpbmcoKSlcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJzb3IucGFyZW50KCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWRlIDwgMCA/IDAgOiB0cmVlLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICB9XG59XG5jbGFzcyBGcmFnbWVudEN1cnNvciB7XG4gICAgY29uc3RydWN0b3IoZnJhZ21lbnRzKSB7XG4gICAgICAgIHRoaXMuZnJhZ21lbnRzID0gZnJhZ21lbnRzO1xuICAgICAgICB0aGlzLmkgPSAwO1xuICAgICAgICB0aGlzLmZyYWdtZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zYWZlRnJvbSA9IC0xO1xuICAgICAgICB0aGlzLnNhZmVUbyA9IC0xO1xuICAgICAgICB0aGlzLnRyZWVzID0gW107XG4gICAgICAgIHRoaXMuc3RhcnQgPSBbXTtcbiAgICAgICAgdGhpcy5pbmRleCA9IFtdO1xuICAgICAgICB0aGlzLm5leHRGcmFnbWVudCgpO1xuICAgIH1cbiAgICBuZXh0RnJhZ21lbnQoKSB7XG4gICAgICAgIGxldCBmciA9IHRoaXMuZnJhZ21lbnQgPSB0aGlzLmkgPT0gdGhpcy5mcmFnbWVudHMubGVuZ3RoID8gbnVsbCA6IHRoaXMuZnJhZ21lbnRzW3RoaXMuaSsrXTtcbiAgICAgICAgaWYgKGZyKSB7XG4gICAgICAgICAgICB0aGlzLnNhZmVGcm9tID0gZnIub3BlblN0YXJ0ID8gY3V0QXQoZnIudHJlZSwgZnIuZnJvbSArIGZyLm9mZnNldCwgMSkgLSBmci5vZmZzZXQgOiBmci5mcm9tO1xuICAgICAgICAgICAgdGhpcy5zYWZlVG8gPSBmci5vcGVuRW5kID8gY3V0QXQoZnIudHJlZSwgZnIudG8gKyBmci5vZmZzZXQsIC0xKSAtIGZyLm9mZnNldCA6IGZyLnRvO1xuICAgICAgICAgICAgd2hpbGUgKHRoaXMudHJlZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVlcy5wb3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0LnBvcCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXgucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnRyZWVzLnB1c2goZnIudHJlZSk7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0LnB1c2goLWZyLm9mZnNldCk7XG4gICAgICAgICAgICB0aGlzLmluZGV4LnB1c2goMCk7XG4gICAgICAgICAgICB0aGlzLm5leHRTdGFydCA9IHRoaXMuc2FmZUZyb207XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5leHRTdGFydCA9IDFlOTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBgcG9zYCBtdXN0IGJlID49IGFueSBwcmV2aW91c2x5IGdpdmVuIGBwb3NgIGZvciB0aGlzIGN1cnNvclxuICAgIG5vZGVBdChwb3MpIHtcbiAgICAgICAgaWYgKHBvcyA8IHRoaXMubmV4dFN0YXJ0KVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIHdoaWxlICh0aGlzLmZyYWdtZW50ICYmIHRoaXMuc2FmZVRvIDw9IHBvcylcbiAgICAgICAgICAgIHRoaXMubmV4dEZyYWdtZW50KCk7XG4gICAgICAgIGlmICghdGhpcy5mcmFnbWVudClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBsZXQgbGFzdCA9IHRoaXMudHJlZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIGlmIChsYXN0IDwgMCkgeyAvLyBFbmQgb2YgdHJlZVxuICAgICAgICAgICAgICAgIHRoaXMubmV4dEZyYWdtZW50KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgdG9wID0gdGhpcy50cmVlc1tsYXN0XSwgaW5kZXggPSB0aGlzLmluZGV4W2xhc3RdO1xuICAgICAgICAgICAgaWYgKGluZGV4ID09IHRvcC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWVzLnBvcCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQucG9wKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleC5wb3AoKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBuZXh0ID0gdG9wLmNoaWxkcmVuW2luZGV4XTtcbiAgICAgICAgICAgIGxldCBzdGFydCA9IHRoaXMuc3RhcnRbbGFzdF0gKyB0b3AucG9zaXRpb25zW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChzdGFydCA+IHBvcykge1xuICAgICAgICAgICAgICAgIHRoaXMubmV4dFN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChzdGFydCA9PSBwb3MgJiYgc3RhcnQgKyBuZXh0Lmxlbmd0aCA8PSB0aGlzLnNhZmVUbykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdGFydCA9PSBwb3MgJiYgc3RhcnQgPj0gdGhpcy5zYWZlRnJvbSA/IG5leHQgOiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5leHQgaW5zdGFuY2VvZiBUcmVlQnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleFtsYXN0XSsrO1xuICAgICAgICAgICAgICAgIHRoaXMubmV4dFN0YXJ0ID0gc3RhcnQgKyBuZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhbbGFzdF0rKztcbiAgICAgICAgICAgICAgICBpZiAoc3RhcnQgKyBuZXh0Lmxlbmd0aCA+PSBwb3MpIHsgLy8gRW50ZXIgdGhpcyBub2RlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJlZXMucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFydC5wdXNoKHN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleC5wdXNoKDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmNsYXNzIENhY2hlZFRva2VuIGV4dGVuZHMgVG9rZW4ge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB0aGlzLmV4dGVuZGVkID0gLTE7XG4gICAgICAgIHRoaXMubWFzayA9IDA7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IDA7XG4gICAgfVxuICAgIGNsZWFyKHN0YXJ0KSB7XG4gICAgICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMuZXh0ZW5kZWQgPSAtMTtcbiAgICB9XG59XG5jb25zdCBkdW1teVRva2VuID0gbmV3IFRva2VuO1xuY2xhc3MgVG9rZW5DYWNoZSB7XG4gICAgY29uc3RydWN0b3IocGFyc2VyKSB7XG4gICAgICAgIHRoaXMudG9rZW5zID0gW107XG4gICAgICAgIHRoaXMubWFpblRva2VuID0gZHVtbXlUb2tlbjtcbiAgICAgICAgdGhpcy5hY3Rpb25zID0gW107XG4gICAgICAgIHRoaXMudG9rZW5zID0gcGFyc2VyLnRva2VuaXplcnMubWFwKF8gPT4gbmV3IENhY2hlZFRva2VuKTtcbiAgICB9XG4gICAgZ2V0QWN0aW9ucyhzdGFjaywgaW5wdXQpIHtcbiAgICAgICAgbGV0IGFjdGlvbkluZGV4ID0gMDtcbiAgICAgICAgbGV0IG1haW4gPSBudWxsO1xuICAgICAgICBsZXQgeyBwYXJzZXIgfSA9IHN0YWNrLnAsIHsgdG9rZW5pemVycyB9ID0gcGFyc2VyO1xuICAgICAgICBsZXQgbWFzayA9IHBhcnNlci5zdGF0ZVNsb3Qoc3RhY2suc3RhdGUsIDMgLyogVG9rZW5pemVyTWFzayAqLyk7XG4gICAgICAgIGxldCBjb250ZXh0ID0gc3RhY2suY3VyQ29udGV4dCA/IHN0YWNrLmN1ckNvbnRleHQuaGFzaCA6IDA7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5pemVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKCgoMSA8PCBpKSAmIG1hc2spID09IDApXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBsZXQgdG9rZW5pemVyID0gdG9rZW5pemVyc1tpXSwgdG9rZW4gPSB0aGlzLnRva2Vuc1tpXTtcbiAgICAgICAgICAgIGlmIChtYWluICYmICF0b2tlbml6ZXIuZmFsbGJhY2spXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBpZiAodG9rZW5pemVyLmNvbnRleHR1YWwgfHwgdG9rZW4uc3RhcnQgIT0gc3RhY2sucG9zIHx8IHRva2VuLm1hc2sgIT0gbWFzayB8fCB0b2tlbi5jb250ZXh0ICE9IGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUNhY2hlZFRva2VuKHRva2VuLCB0b2tlbml6ZXIsIHN0YWNrLCBpbnB1dCk7XG4gICAgICAgICAgICAgICAgdG9rZW4ubWFzayA9IG1hc2s7XG4gICAgICAgICAgICAgICAgdG9rZW4uY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9rZW4udmFsdWUgIT0gMCAvKiBFcnIgKi8pIHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRJbmRleCA9IGFjdGlvbkluZGV4O1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5leHRlbmRlZCA+IC0xKVxuICAgICAgICAgICAgICAgICAgICBhY3Rpb25JbmRleCA9IHRoaXMuYWRkQWN0aW9ucyhzdGFjaywgdG9rZW4uZXh0ZW5kZWQsIHRva2VuLmVuZCwgYWN0aW9uSW5kZXgpO1xuICAgICAgICAgICAgICAgIGFjdGlvbkluZGV4ID0gdGhpcy5hZGRBY3Rpb25zKHN0YWNrLCB0b2tlbi52YWx1ZSwgdG9rZW4uZW5kLCBhY3Rpb25JbmRleCk7XG4gICAgICAgICAgICAgICAgaWYgKCF0b2tlbml6ZXIuZXh0ZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW4gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbkluZGV4ID4gc3RhcnRJbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAodGhpcy5hY3Rpb25zLmxlbmd0aCA+IGFjdGlvbkluZGV4KVxuICAgICAgICAgICAgdGhpcy5hY3Rpb25zLnBvcCgpO1xuICAgICAgICBpZiAoIW1haW4pIHtcbiAgICAgICAgICAgIG1haW4gPSBkdW1teVRva2VuO1xuICAgICAgICAgICAgbWFpbi5zdGFydCA9IHN0YWNrLnBvcztcbiAgICAgICAgICAgIGlmIChzdGFjay5wb3MgPT0gaW5wdXQubGVuZ3RoKVxuICAgICAgICAgICAgICAgIG1haW4uYWNjZXB0KHN0YWNrLnAucGFyc2VyLmVvZlRlcm0sIHN0YWNrLnBvcyk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbWFpbi5hY2NlcHQoMCAvKiBFcnIgKi8sIHN0YWNrLnBvcyArIDEpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubWFpblRva2VuID0gbWFpbjtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWN0aW9ucztcbiAgICB9XG4gICAgdXBkYXRlQ2FjaGVkVG9rZW4odG9rZW4sIHRva2VuaXplciwgc3RhY2ssIGlucHV0KSB7XG4gICAgICAgIHRva2VuLmNsZWFyKHN0YWNrLnBvcyk7XG4gICAgICAgIHRva2VuaXplci50b2tlbihpbnB1dCwgdG9rZW4sIHN0YWNrKTtcbiAgICAgICAgaWYgKHRva2VuLnZhbHVlID4gLTEpIHtcbiAgICAgICAgICAgIGxldCB7IHBhcnNlciB9ID0gc3RhY2sucDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyc2VyLnNwZWNpYWxpemVkLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgIGlmIChwYXJzZXIuc3BlY2lhbGl6ZWRbaV0gPT0gdG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHBhcnNlci5zcGVjaWFsaXplcnNbaV0oaW5wdXQucmVhZCh0b2tlbi5zdGFydCwgdG9rZW4uZW5kKSwgc3RhY2spO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID49IDAgJiYgc3RhY2sucC5wYXJzZXIuZGlhbGVjdC5hbGxvd3MocmVzdWx0ID4+IDEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKHJlc3VsdCAmIDEpID09IDAgLyogU3BlY2lhbGl6ZSAqLylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi52YWx1ZSA9IHJlc3VsdCA+PiAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLmV4dGVuZGVkID0gcmVzdWx0ID4+IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdGFjay5wb3MgPT0gaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbi5hY2NlcHQoc3RhY2sucC5wYXJzZXIuZW9mVGVybSwgc3RhY2sucG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRva2VuLmFjY2VwdCgwIC8qIEVyciAqLywgc3RhY2sucG9zICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHV0QWN0aW9uKGFjdGlvbiwgdG9rZW4sIGVuZCwgaW5kZXgpIHtcbiAgICAgICAgLy8gRG9uJ3QgYWRkIGR1cGxpY2F0ZSBhY3Rpb25zXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZXg7IGkgKz0gMylcbiAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbnNbaV0gPT0gYWN0aW9uKVxuICAgICAgICAgICAgICAgIHJldHVybiBpbmRleDtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2luZGV4KytdID0gYWN0aW9uO1xuICAgICAgICB0aGlzLmFjdGlvbnNbaW5kZXgrK10gPSB0b2tlbjtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2luZGV4KytdID0gZW5kO1xuICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxuICAgIGFkZEFjdGlvbnMoc3RhY2ssIHRva2VuLCBlbmQsIGluZGV4KSB7XG4gICAgICAgIGxldCB7IHN0YXRlIH0gPSBzdGFjaywgeyBwYXJzZXIgfSA9IHN0YWNrLnAsIHsgZGF0YSB9ID0gcGFyc2VyO1xuICAgICAgICBmb3IgKGxldCBzZXQgPSAwOyBzZXQgPCAyOyBzZXQrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHBhcnNlci5zdGF0ZVNsb3Qoc3RhdGUsIHNldCA/IDIgLyogU2tpcCAqLyA6IDEgLyogQWN0aW9ucyAqLyk7OyBpICs9IDMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YVtpXSA9PSA2NTUzNSAvKiBFbmQgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbaSArIDFdID09IDEgLyogTmV4dCAqLykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaSA9IHBhaXIoZGF0YSwgaSArIDIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09IDAgJiYgZGF0YVtpICsgMV0gPT0gMiAvKiBPdGhlciAqLylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMucHV0QWN0aW9uKHBhaXIoZGF0YSwgaSArIDEpLCB0b2tlbiwgZW5kLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGF0YVtpXSA9PSB0b2tlbilcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSB0aGlzLnB1dEFjdGlvbihwYWlyKGRhdGEsIGkgKyAxKSwgdG9rZW4sIGVuZCwgaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG59XG52YXIgUmVjO1xuKGZ1bmN0aW9uIChSZWMpIHtcbiAgICBSZWNbUmVjW1wiRGlzdGFuY2VcIl0gPSA1XSA9IFwiRGlzdGFuY2VcIjtcbiAgICBSZWNbUmVjW1wiTWF4UmVtYWluaW5nUGVyU3RlcFwiXSA9IDNdID0gXCJNYXhSZW1haW5pbmdQZXJTdGVwXCI7XG4gICAgUmVjW1JlY1tcIk1pbkJ1ZmZlckxlbmd0aFBydW5lXCJdID0gMjAwXSA9IFwiTWluQnVmZmVyTGVuZ3RoUHJ1bmVcIjtcbiAgICBSZWNbUmVjW1wiRm9yY2VSZWR1Y2VMaW1pdFwiXSA9IDEwXSA9IFwiRm9yY2VSZWR1Y2VMaW1pdFwiO1xufSkoUmVjIHx8IChSZWMgPSB7fSkpO1xuLy8vIEEgcGFyc2UgY29udGV4dCBjYW4gYmUgdXNlZCBmb3Igc3RlcC1ieS1zdGVwIHBhcnNpbmcuIEFmdGVyXG4vLy8gY3JlYXRpbmcgaXQsIHlvdSByZXBlYXRlZGx5IGNhbGwgYC5hZHZhbmNlKClgIHVudGlsIGl0IHJldHVybnMgYVxuLy8vIHRyZWUgdG8gaW5kaWNhdGUgaXQgaGFzIHJlYWNoZWQgdGhlIGVuZCBvZiB0aGUgcGFyc2UuXG5jbGFzcyBQYXJzZSB7XG4gICAgY29uc3RydWN0b3IocGFyc2VyLCBpbnB1dCwgc3RhcnRQb3MsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5wYXJzZXIgPSBwYXJzZXI7XG4gICAgICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcbiAgICAgICAgdGhpcy5zdGFydFBvcyA9IHN0YXJ0UG9zO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAvLyBUaGUgcG9zaXRpb24gdG8gd2hpY2ggdGhlIHBhcnNlIGhhcyBhZHZhbmNlZC5cbiAgICAgICAgdGhpcy5wb3MgPSAwO1xuICAgICAgICB0aGlzLnJlY292ZXJpbmcgPSAwO1xuICAgICAgICB0aGlzLm5leHRTdGFja0lEID0gMHgyNjU0O1xuICAgICAgICB0aGlzLm5lc3RlZCA9IG51bGw7XG4gICAgICAgIHRoaXMubmVzdEVuZCA9IDA7XG4gICAgICAgIHRoaXMubmVzdFdyYXAgPSBudWxsO1xuICAgICAgICB0aGlzLnJldXNlZCA9IFtdO1xuICAgICAgICB0aGlzLnRva2VucyA9IG5ldyBUb2tlbkNhY2hlKHBhcnNlcik7XG4gICAgICAgIHRoaXMudG9wVGVybSA9IHBhcnNlci50b3BbMV07XG4gICAgICAgIHRoaXMuc3RhY2tzID0gW1N0YWNrLnN0YXJ0KHRoaXMsIHBhcnNlci50b3BbMF0sIHRoaXMuc3RhcnRQb3MpXTtcbiAgICAgICAgbGV0IGZyYWdtZW50cyA9IGNvbnRleHQgPT09IG51bGwgfHwgY29udGV4dCA9PT0gdm9pZCAwID8gdm9pZCAwIDogY29udGV4dC5mcmFnbWVudHM7XG4gICAgICAgIHRoaXMuZnJhZ21lbnRzID0gZnJhZ21lbnRzICYmIGZyYWdtZW50cy5sZW5ndGggPyBuZXcgRnJhZ21lbnRDdXJzb3IoZnJhZ21lbnRzKSA6IG51bGw7XG4gICAgfVxuICAgIC8vIE1vdmUgdGhlIHBhcnNlciBmb3J3YXJkLiBUaGlzIHdpbGwgcHJvY2VzcyBhbGwgcGFyc2Ugc3RhY2tzIGF0XG4gICAgLy8gYHRoaXMucG9zYCBhbmQgdHJ5IHRvIGFkdmFuY2UgdGhlbSB0byBhIGZ1cnRoZXIgcG9zaXRpb24uIElmIG5vXG4gICAgLy8gc3RhY2sgZm9yIHN1Y2ggYSBwb3NpdGlvbiBpcyBmb3VuZCwgaXQnbGwgc3RhcnQgZXJyb3ItcmVjb3ZlcnkuXG4gICAgLy9cbiAgICAvLyBXaGVuIHRoZSBwYXJzZSBpcyBmaW5pc2hlZCwgdGhpcyB3aWxsIHJldHVybiBhIHN5bnRheCB0cmVlLiBXaGVuXG4gICAgLy8gbm90LCBpdCByZXR1cm5zIGBudWxsYC5cbiAgICBhZHZhbmNlKCkge1xuICAgICAgICBpZiAodGhpcy5uZXN0ZWQpIHtcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSB0aGlzLm5lc3RlZC5hZHZhbmNlKCk7XG4gICAgICAgICAgICB0aGlzLnBvcyA9IHRoaXMubmVzdGVkLnBvcztcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmlzaE5lc3RlZCh0aGlzLnN0YWNrc1swXSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLm5lc3RlZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgc3RhY2tzID0gdGhpcy5zdGFja3MsIHBvcyA9IHRoaXMucG9zO1xuICAgICAgICAvLyBUaGlzIHdpbGwgaG9sZCBzdGFja3MgYmV5b25kIGBwb3NgLlxuICAgICAgICBsZXQgbmV3U3RhY2tzID0gdGhpcy5zdGFja3MgPSBbXTtcbiAgICAgICAgbGV0IHN0b3BwZWQsIHN0b3BwZWRUb2tlbnM7XG4gICAgICAgIGxldCBtYXliZU5lc3Q7XG4gICAgICAgIC8vIEtlZXAgYWR2YW5jaW5nIGFueSBzdGFja3MgYXQgYHBvc2AgdW50aWwgdGhleSBlaXRoZXIgbW92ZVxuICAgICAgICAvLyBmb3J3YXJkIG9yIGNhbid0IGJlIGFkdmFuY2VkLiBHYXRoZXIgc3RhY2tzIHRoYXQgY2FuJ3QgYmVcbiAgICAgICAgLy8gYWR2YW5jZWQgZnVydGhlciBpbiBgc3RvcHBlZGAuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgc3RhY2sgPSBzdGFja3NbaV0sIG5lc3Q7XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YWNrLnBvcyA+IHBvcykge1xuICAgICAgICAgICAgICAgICAgICBuZXdTdGFja3MucHVzaChzdGFjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5lc3QgPSB0aGlzLmNoZWNrTmVzdChzdGFjaykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXliZU5lc3QgfHwgbWF5YmVOZXN0LnN0YWNrLnNjb3JlIDwgc3RhY2suc2NvcmUpXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXliZU5lc3QgPSBuZXN0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLmFkdmFuY2VTdGFjayhzdGFjaywgbmV3U3RhY2tzLCBzdGFja3MpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdG9wcGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9wcGVkID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9wcGVkVG9rZW5zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RvcHBlZC5wdXNoKHN0YWNrKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRvayA9IHRoaXMudG9rZW5zLm1haW5Ub2tlbjtcbiAgICAgICAgICAgICAgICAgICAgc3RvcHBlZFRva2Vucy5wdXNoKHRvay52YWx1ZSwgdG9rLmVuZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChtYXliZU5lc3QpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnROZXN0ZWQobWF5YmVOZXN0KTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3U3RhY2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgbGV0IGZpbmlzaGVkID0gc3RvcHBlZCAmJiBmaW5kRmluaXNoZWQoc3RvcHBlZCk7XG4gICAgICAgICAgICBpZiAoZmluaXNoZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhY2tUb1RyZWUoZmluaXNoZWQpO1xuICAgICAgICAgICAgaWYgKHRoaXMucGFyc2VyLnN0cmljdCkge1xuICAgICAgICAgICAgICAgIGlmICh2ZXJib3NlICYmIHN0b3BwZWQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3R1Y2sgd2l0aCB0b2tlbiBcIiArIHRoaXMucGFyc2VyLmdldE5hbWUodGhpcy50b2tlbnMubWFpblRva2VuLnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiTm8gcGFyc2UgYXQgXCIgKyBwb3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGlzLnJlY292ZXJpbmcpXG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvdmVyaW5nID0gNSAvKiBEaXN0YW5jZSAqLztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5yZWNvdmVyaW5nICYmIHN0b3BwZWQpIHtcbiAgICAgICAgICAgIGxldCBmaW5pc2hlZCA9IHRoaXMucnVuUmVjb3Zlcnkoc3RvcHBlZCwgc3RvcHBlZFRva2VucywgbmV3U3RhY2tzKTtcbiAgICAgICAgICAgIGlmIChmaW5pc2hlZClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdGFja1RvVHJlZShmaW5pc2hlZC5mb3JjZUFsbCgpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5yZWNvdmVyaW5nKSB7XG4gICAgICAgICAgICBsZXQgbWF4UmVtYWluaW5nID0gdGhpcy5yZWNvdmVyaW5nID09IDEgPyAxIDogdGhpcy5yZWNvdmVyaW5nICogMyAvKiBNYXhSZW1haW5pbmdQZXJTdGVwICovO1xuICAgICAgICAgICAgaWYgKG5ld1N0YWNrcy5sZW5ndGggPiBtYXhSZW1haW5pbmcpIHtcbiAgICAgICAgICAgICAgICBuZXdTdGFja3Muc29ydCgoYSwgYikgPT4gYi5zY29yZSAtIGEuc2NvcmUpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChuZXdTdGFja3MubGVuZ3RoID4gbWF4UmVtYWluaW5nKVxuICAgICAgICAgICAgICAgICAgICBuZXdTdGFja3MucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3U3RhY2tzLnNvbWUocyA9PiBzLnJlZHVjZVBvcyA+IHBvcykpXG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvdmVyaW5nLS07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobmV3U3RhY2tzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIC8vIFBydW5lIHN0YWNrcyB0aGF0IGFyZSBpbiB0aGUgc2FtZSBzdGF0ZSwgb3IgdGhhdCBoYXZlIGJlZW5cbiAgICAgICAgICAgIC8vIHJ1bm5pbmcgd2l0aG91dCBzcGxpdHRpbmcgZm9yIGEgd2hpbGUsIHRvIGF2b2lkIGdldHRpbmcgc3R1Y2tcbiAgICAgICAgICAgIC8vIHdpdGggbXVsdGlwbGUgc3VjY2Vzc2Z1bCBzdGFja3MgcnVubmluZyBlbmRsZXNzbHkgb24uXG4gICAgICAgICAgICBvdXRlcjogZm9yIChsZXQgaSA9IDA7IGkgPCBuZXdTdGFja3MubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YWNrID0gbmV3U3RhY2tzW2ldO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IG5ld1N0YWNrcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgb3RoZXIgPSBuZXdTdGFja3Nbal07XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFjay5zYW1lU3RhdGUob3RoZXIpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5idWZmZXIubGVuZ3RoID4gMjAwIC8qIE1pbkJ1ZmZlckxlbmd0aFBydW5lICovICYmIG90aGVyLmJ1ZmZlci5sZW5ndGggPiAyMDAgLyogTWluQnVmZmVyTGVuZ3RoUHJ1bmUgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoKHN0YWNrLnNjb3JlIC0gb3RoZXIuc2NvcmUpIHx8IChzdGFjay5idWZmZXIubGVuZ3RoIC0gb3RoZXIuYnVmZmVyLmxlbmd0aCkpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1N0YWNrcy5zcGxpY2Uoai0tLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1N0YWNrcy5zcGxpY2UoaS0tLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBvcyA9IG5ld1N0YWNrc1swXS5wb3M7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbmV3U3RhY2tzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgaWYgKG5ld1N0YWNrc1tpXS5wb3MgPCB0aGlzLnBvcylcbiAgICAgICAgICAgICAgICB0aGlzLnBvcyA9IG5ld1N0YWNrc1tpXS5wb3M7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBSZXR1cm5zIGFuIHVwZGF0ZWQgdmVyc2lvbiBvZiB0aGUgZ2l2ZW4gc3RhY2ssIG9yIG51bGwgaWYgdGhlXG4gICAgLy8gc3RhY2sgY2FuJ3QgYWR2YW5jZSBub3JtYWxseS4gV2hlbiBgc3BsaXRgIGFuZCBgc3RhY2tzYCBhcmVcbiAgICAvLyBnaXZlbiwgc3RhY2tzIHNwbGl0IG9mZiBieSBhbWJpZ3VvdXMgb3BlcmF0aW9ucyB3aWxsIGJlIHB1c2hlZCB0b1xuICAgIC8vIGBzcGxpdGAsIG9yIGFkZGVkIHRvIGBzdGFja3NgIGlmIHRoZXkgbW92ZSBgcG9zYCBmb3J3YXJkLlxuICAgIGFkdmFuY2VTdGFjayhzdGFjaywgc3RhY2tzLCBzcGxpdCkge1xuICAgICAgICBsZXQgc3RhcnQgPSBzdGFjay5wb3MsIHsgaW5wdXQsIHBhcnNlciB9ID0gdGhpcztcbiAgICAgICAgbGV0IGJhc2UgPSB2ZXJib3NlID8gdGhpcy5zdGFja0lEKHN0YWNrKSArIFwiIC0+IFwiIDogXCJcIjtcbiAgICAgICAgaWYgKHRoaXMuZnJhZ21lbnRzKSB7XG4gICAgICAgICAgICBsZXQgc3RyaWN0Q3ggPSBzdGFjay5jdXJDb250ZXh0ICYmIHN0YWNrLmN1ckNvbnRleHQudHJhY2tlci5zdHJpY3QsIGN4SGFzaCA9IHN0cmljdEN4ID8gc3RhY2suY3VyQ29udGV4dC5oYXNoIDogMDtcbiAgICAgICAgICAgIGZvciAobGV0IGNhY2hlZCA9IHRoaXMuZnJhZ21lbnRzLm5vZGVBdChzdGFydCk7IGNhY2hlZDspIHtcbiAgICAgICAgICAgICAgICBsZXQgbWF0Y2ggPSB0aGlzLnBhcnNlci5ub2RlU2V0LnR5cGVzW2NhY2hlZC50eXBlLmlkXSA9PSBjYWNoZWQudHlwZSA/IHBhcnNlci5nZXRHb3RvKHN0YWNrLnN0YXRlLCBjYWNoZWQudHlwZS5pZCkgOiAtMTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2ggPiAtMSAmJiBjYWNoZWQubGVuZ3RoICYmICghc3RyaWN0Q3ggfHwgKGNhY2hlZC5jb250ZXh0SGFzaCB8fCAwKSA9PSBjeEhhc2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnVzZU5vZGUoY2FjaGVkLCBtYXRjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYmFzZSArIHRoaXMuc3RhY2tJRChzdGFjaykgKyBgICh2aWEgcmV1c2Ugb2YgJHtwYXJzZXIuZ2V0TmFtZShjYWNoZWQudHlwZS5pZCl9KWApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCEoY2FjaGVkIGluc3RhbmNlb2YgVHJlZSkgfHwgY2FjaGVkLmNoaWxkcmVuLmxlbmd0aCA9PSAwIHx8IGNhY2hlZC5wb3NpdGlvbnNbMF0gPiAwKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBsZXQgaW5uZXIgPSBjYWNoZWQuY2hpbGRyZW5bMF07XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyIGluc3RhbmNlb2YgVHJlZSlcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkID0gaW5uZXI7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgZGVmYXVsdFJlZHVjZSA9IHBhcnNlci5zdGF0ZVNsb3Qoc3RhY2suc3RhdGUsIDQgLyogRGVmYXVsdFJlZHVjZSAqLyk7XG4gICAgICAgIGlmIChkZWZhdWx0UmVkdWNlID4gMCkge1xuICAgICAgICAgICAgc3RhY2sucmVkdWNlKGRlZmF1bHRSZWR1Y2UpO1xuICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYmFzZSArIHRoaXMuc3RhY2tJRChzdGFjaykgKyBgICh2aWEgYWx3YXlzLXJlZHVjZSAke3BhcnNlci5nZXROYW1lKGRlZmF1bHRSZWR1Y2UgJiA2NTUzNSAvKiBWYWx1ZU1hc2sgKi8pfSlgKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhY3Rpb25zID0gdGhpcy50b2tlbnMuZ2V0QWN0aW9ucyhzdGFjaywgaW5wdXQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFjdGlvbnMubGVuZ3RoOykge1xuICAgICAgICAgICAgbGV0IGFjdGlvbiA9IGFjdGlvbnNbaSsrXSwgdGVybSA9IGFjdGlvbnNbaSsrXSwgZW5kID0gYWN0aW9uc1tpKytdO1xuICAgICAgICAgICAgbGV0IGxhc3QgPSBpID09IGFjdGlvbnMubGVuZ3RoIHx8ICFzcGxpdDtcbiAgICAgICAgICAgIGxldCBsb2NhbFN0YWNrID0gbGFzdCA/IHN0YWNrIDogc3RhY2suc3BsaXQoKTtcbiAgICAgICAgICAgIGxvY2FsU3RhY2suYXBwbHkoYWN0aW9uLCB0ZXJtLCBlbmQpO1xuICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYmFzZSArIHRoaXMuc3RhY2tJRChsb2NhbFN0YWNrKSArIGAgKHZpYSAkeyhhY3Rpb24gJiA2NTUzNiAvKiBSZWR1Y2VGbGFnICovKSA9PSAwID8gXCJzaGlmdFwiXG4gICAgICAgICAgICAgICAgICAgIDogYHJlZHVjZSBvZiAke3BhcnNlci5nZXROYW1lKGFjdGlvbiAmIDY1NTM1IC8qIFZhbHVlTWFzayAqLyl9YH0gZm9yICR7cGFyc2VyLmdldE5hbWUodGVybSl9IEAgJHtzdGFydH0ke2xvY2FsU3RhY2sgPT0gc3RhY2sgPyBcIlwiIDogXCIsIHNwbGl0XCJ9KWApO1xuICAgICAgICAgICAgaWYgKGxhc3QpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBlbHNlIGlmIChsb2NhbFN0YWNrLnBvcyA+IHN0YXJ0KVxuICAgICAgICAgICAgICAgIHN0YWNrcy5wdXNoKGxvY2FsU3RhY2spO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHNwbGl0LnB1c2gobG9jYWxTdGFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBBZHZhbmNlIGEgZ2l2ZW4gc3RhY2sgZm9yd2FyZCBhcyBmYXIgYXMgaXQgd2lsbCBnby4gUmV0dXJucyB0aGVcbiAgICAvLyAocG9zc2libHkgdXBkYXRlZCkgc3RhY2sgaWYgaXQgZ290IHN0dWNrLCBvciBudWxsIGlmIGl0IG1vdmVkXG4gICAgLy8gZm9yd2FyZCBhbmQgd2FzIGdpdmVuIHRvIGBwdXNoU3RhY2tEZWR1cGAuXG4gICAgYWR2YW5jZUZ1bGx5KHN0YWNrLCBuZXdTdGFja3MpIHtcbiAgICAgICAgbGV0IHBvcyA9IHN0YWNrLnBvcztcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgbGV0IG5lc3QgPSB0aGlzLmNoZWNrTmVzdChzdGFjayk7XG4gICAgICAgICAgICBpZiAobmVzdClcbiAgICAgICAgICAgICAgICByZXR1cm4gbmVzdDtcbiAgICAgICAgICAgIGlmICghdGhpcy5hZHZhbmNlU3RhY2soc3RhY2ssIG51bGwsIG51bGwpKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmIChzdGFjay5wb3MgPiBwb3MpIHtcbiAgICAgICAgICAgICAgICBwdXNoU3RhY2tEZWR1cChzdGFjaywgbmV3U3RhY2tzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBydW5SZWNvdmVyeShzdGFja3MsIHRva2VucywgbmV3U3RhY2tzKSB7XG4gICAgICAgIGxldCBmaW5pc2hlZCA9IG51bGwsIHJlc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICBsZXQgbWF5YmVOZXN0O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0YWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHN0YWNrID0gc3RhY2tzW2ldLCB0b2tlbiA9IHRva2Vuc1tpIDw8IDFdLCB0b2tlbkVuZCA9IHRva2Vuc1soaSA8PCAxKSArIDFdO1xuICAgICAgICAgICAgbGV0IGJhc2UgPSB2ZXJib3NlID8gdGhpcy5zdGFja0lEKHN0YWNrKSArIFwiIC0+IFwiIDogXCJcIjtcbiAgICAgICAgICAgIGlmIChzdGFjay5kZWFkRW5kKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3RhcnRlZClcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgcmVzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzdGFjay5yZXN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJhc2UgKyB0aGlzLnN0YWNrSUQoc3RhY2spICsgXCIgKHJlc3RhcnRlZClcIik7XG4gICAgICAgICAgICAgICAgbGV0IGRvbmUgPSB0aGlzLmFkdmFuY2VGdWxseShzdGFjaywgbmV3U3RhY2tzKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZG9uZSAhPT0gdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlTmVzdCA9IGRvbmU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBmb3JjZSA9IHN0YWNrLnNwbGl0KCksIGZvcmNlQmFzZSA9IGJhc2U7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgZm9yY2UuZm9yY2VSZWR1Y2UoKSAmJiBqIDwgMTAgLyogRm9yY2VSZWR1Y2VMaW1pdCAqLzsgaisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGZvcmNlQmFzZSArIHRoaXMuc3RhY2tJRChmb3JjZSkgKyBcIiAodmlhIGZvcmNlLXJlZHVjZSlcIik7XG4gICAgICAgICAgICAgICAgbGV0IGRvbmUgPSB0aGlzLmFkdmFuY2VGdWxseShmb3JjZSwgbmV3U3RhY2tzKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZG9uZSAhPT0gdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlTmVzdCA9IGRvbmU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICAgICAgZm9yY2VCYXNlID0gdGhpcy5zdGFja0lEKGZvcmNlKSArIFwiIC0+IFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaW5zZXJ0IG9mIHN0YWNrLnJlY292ZXJCeUluc2VydCh0b2tlbikpIHtcbiAgICAgICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYmFzZSArIHRoaXMuc3RhY2tJRChpbnNlcnQpICsgXCIgKHZpYSByZWNvdmVyLWluc2VydClcIik7XG4gICAgICAgICAgICAgICAgdGhpcy5hZHZhbmNlRnVsbHkoaW5zZXJ0LCBuZXdTdGFja3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXQubGVuZ3RoID4gc3RhY2sucG9zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuRW5kID09IHN0YWNrLnBvcykge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbkVuZCsrO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IDAgLyogRXJyICovO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGFjay5yZWNvdmVyQnlEZWxldGUodG9rZW4sIHRva2VuRW5kKTtcbiAgICAgICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYmFzZSArIHRoaXMuc3RhY2tJRChzdGFjaykgKyBgICh2aWEgcmVjb3Zlci1kZWxldGUgJHt0aGlzLnBhcnNlci5nZXROYW1lKHRva2VuKX0pYCk7XG4gICAgICAgICAgICAgICAgcHVzaFN0YWNrRGVkdXAoc3RhY2ssIG5ld1N0YWNrcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghZmluaXNoZWQgfHwgZmluaXNoZWQuc2NvcmUgPCBzdGFjay5zY29yZSkge1xuICAgICAgICAgICAgICAgIGZpbmlzaGVkID0gc3RhY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbmlzaGVkKVxuICAgICAgICAgICAgcmV0dXJuIGZpbmlzaGVkO1xuICAgICAgICBpZiAobWF5YmVOZXN0KVxuICAgICAgICAgICAgZm9yIChsZXQgcyBvZiB0aGlzLnN0YWNrcylcbiAgICAgICAgICAgICAgICBpZiAocy5zY29yZSA+IG1heWJlTmVzdC5zdGFjay5zY29yZSkge1xuICAgICAgICAgICAgICAgICAgICBtYXliZU5lc3QgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgaWYgKG1heWJlTmVzdClcbiAgICAgICAgICAgIHRoaXMuc3RhcnROZXN0ZWQobWF5YmVOZXN0KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvcmNlRmluaXNoKCkge1xuICAgICAgICBsZXQgc3RhY2sgPSB0aGlzLnN0YWNrc1swXS5zcGxpdCgpO1xuICAgICAgICBpZiAodGhpcy5uZXN0ZWQpXG4gICAgICAgICAgICB0aGlzLmZpbmlzaE5lc3RlZChzdGFjaywgdGhpcy5uZXN0ZWQuZm9yY2VGaW5pc2goKSk7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YWNrVG9UcmVlKHN0YWNrLmZvcmNlQWxsKCkpO1xuICAgIH1cbiAgICAvLyBDb252ZXJ0IHRoZSBzdGFjaydzIGJ1ZmZlciB0byBhIHN5bnRheCB0cmVlLlxuICAgIHN0YWNrVG9UcmVlKHN0YWNrLCBwb3MgPSBzdGFjay5wb3MpIHtcbiAgICAgICAgaWYgKHRoaXMucGFyc2VyLmNvbnRleHQpXG4gICAgICAgICAgICBzdGFjay5lbWl0Q29udGV4dCgpO1xuICAgICAgICByZXR1cm4gVHJlZS5idWlsZCh7IGJ1ZmZlcjogU3RhY2tCdWZmZXJDdXJzb3IuY3JlYXRlKHN0YWNrKSxcbiAgICAgICAgICAgIG5vZGVTZXQ6IHRoaXMucGFyc2VyLm5vZGVTZXQsXG4gICAgICAgICAgICB0b3BJRDogdGhpcy50b3BUZXJtLFxuICAgICAgICAgICAgbWF4QnVmZmVyTGVuZ3RoOiB0aGlzLnBhcnNlci5idWZmZXJMZW5ndGgsXG4gICAgICAgICAgICByZXVzZWQ6IHRoaXMucmV1c2VkLFxuICAgICAgICAgICAgc3RhcnQ6IHRoaXMuc3RhcnRQb3MsXG4gICAgICAgICAgICBsZW5ndGg6IHBvcyAtIHRoaXMuc3RhcnRQb3MsXG4gICAgICAgICAgICBtaW5SZXBlYXRUeXBlOiB0aGlzLnBhcnNlci5taW5SZXBlYXRUZXJtIH0pO1xuICAgIH1cbiAgICBjaGVja05lc3Qoc3RhY2spIHtcbiAgICAgICAgbGV0IGluZm8gPSB0aGlzLnBhcnNlci5maW5kTmVzdGVkKHN0YWNrLnN0YXRlKTtcbiAgICAgICAgaWYgKCFpbmZvKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBzcGVjID0gaW5mby52YWx1ZTtcbiAgICAgICAgaWYgKHR5cGVvZiBzcGVjID09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICAgIHNwZWMgPSBzcGVjKHRoaXMuaW5wdXQsIHN0YWNrKTtcbiAgICAgICAgcmV0dXJuIHNwZWMgPyB7IHN0YWNrLCBpbmZvLCBzcGVjIH0gOiBudWxsO1xuICAgIH1cbiAgICBzdGFydE5lc3RlZChuZXN0KSB7XG4gICAgICAgIGxldCB7IHN0YWNrLCBpbmZvLCBzcGVjIH0gPSBuZXN0O1xuICAgICAgICB0aGlzLnN0YWNrcyA9IFtzdGFja107XG4gICAgICAgIHRoaXMubmVzdEVuZCA9IHRoaXMuc2NhbkZvck5lc3RFbmQoc3RhY2ssIGluZm8uZW5kLCBzcGVjLmZpbHRlckVuZCk7XG4gICAgICAgIHRoaXMubmVzdFdyYXAgPSB0eXBlb2Ygc3BlYy53cmFwVHlwZSA9PSBcIm51bWJlclwiID8gdGhpcy5wYXJzZXIubm9kZVNldC50eXBlc1tzcGVjLndyYXBUeXBlXSA6IHNwZWMud3JhcFR5cGUgfHwgbnVsbDtcbiAgICAgICAgaWYgKHNwZWMuc3RhcnRQYXJzZSkge1xuICAgICAgICAgICAgdGhpcy5uZXN0ZWQgPSBzcGVjLnN0YXJ0UGFyc2UodGhpcy5pbnB1dC5jbGlwKHRoaXMubmVzdEVuZCksIHN0YWNrLnBvcywgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZmluaXNoTmVzdGVkKHN0YWNrKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzY2FuRm9yTmVzdEVuZChzdGFjaywgZW5kVG9rZW4sIGZpbHRlcikge1xuICAgICAgICBmb3IgKGxldCBwb3MgPSBzdGFjay5wb3M7IHBvcyA8IHRoaXMuaW5wdXQubGVuZ3RoOyBwb3MrKykge1xuICAgICAgICAgICAgZHVtbXlUb2tlbi5zdGFydCA9IHBvcztcbiAgICAgICAgICAgIGR1bW15VG9rZW4udmFsdWUgPSAtMTtcbiAgICAgICAgICAgIGVuZFRva2VuLnRva2VuKHRoaXMuaW5wdXQsIGR1bW15VG9rZW4sIHN0YWNrKTtcbiAgICAgICAgICAgIGlmIChkdW1teVRva2VuLnZhbHVlID4gLTEgJiYgKCFmaWx0ZXIgfHwgZmlsdGVyKHRoaXMuaW5wdXQucmVhZChwb3MsIGR1bW15VG9rZW4uZW5kKSkpKVxuICAgICAgICAgICAgICAgIHJldHVybiBwb3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgIH1cbiAgICBmaW5pc2hOZXN0ZWQoc3RhY2ssIHRyZWUpIHtcbiAgICAgICAgaWYgKHRoaXMubmVzdFdyYXApXG4gICAgICAgICAgICB0cmVlID0gbmV3IFRyZWUodGhpcy5uZXN0V3JhcCwgdHJlZSA/IFt0cmVlXSA6IFtdLCB0cmVlID8gWzBdIDogW10sIHRoaXMubmVzdEVuZCAtIHN0YWNrLnBvcyk7XG4gICAgICAgIGVsc2UgaWYgKCF0cmVlKVxuICAgICAgICAgICAgdHJlZSA9IG5ldyBUcmVlKE5vZGVUeXBlLm5vbmUsIFtdLCBbXSwgdGhpcy5uZXN0RW5kIC0gc3RhY2sucG9zKTtcbiAgICAgICAgbGV0IGluZm8gPSB0aGlzLnBhcnNlci5maW5kTmVzdGVkKHN0YWNrLnN0YXRlKTtcbiAgICAgICAgc3RhY2sudXNlTm9kZSh0cmVlLCB0aGlzLnBhcnNlci5nZXRHb3RvKHN0YWNrLnN0YXRlLCBpbmZvLnBsYWNlaG9sZGVyLCB0cnVlKSk7XG4gICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5zdGFja0lEKHN0YWNrKSArIGAgKHZpYSB1bm5lc3QpYCk7XG4gICAgfVxuICAgIHN0YWNrSUQoc3RhY2spIHtcbiAgICAgICAgbGV0IGlkID0gKHN0YWNrSURzIHx8IChzdGFja0lEcyA9IG5ldyBXZWFrTWFwKSkuZ2V0KHN0YWNrKTtcbiAgICAgICAgaWYgKCFpZClcbiAgICAgICAgICAgIHN0YWNrSURzLnNldChzdGFjaywgaWQgPSBTdHJpbmcuZnJvbUNvZGVQb2ludCh0aGlzLm5leHRTdGFja0lEKyspKTtcbiAgICAgICAgcmV0dXJuIGlkICsgc3RhY2s7XG4gICAgfVxufVxuZnVuY3Rpb24gcHVzaFN0YWNrRGVkdXAoc3RhY2ssIG5ld1N0YWNrcykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmV3U3RhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBvdGhlciA9IG5ld1N0YWNrc1tpXTtcbiAgICAgICAgaWYgKG90aGVyLnBvcyA9PSBzdGFjay5wb3MgJiYgb3RoZXIuc2FtZVN0YXRlKHN0YWNrKSkge1xuICAgICAgICAgICAgaWYgKG5ld1N0YWNrc1tpXS5zY29yZSA8IHN0YWNrLnNjb3JlKVxuICAgICAgICAgICAgICAgIG5ld1N0YWNrc1tpXSA9IHN0YWNrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuICAgIG5ld1N0YWNrcy5wdXNoKHN0YWNrKTtcbn1cbmNsYXNzIERpYWxlY3Qge1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZSwgZmxhZ3MsIGRpc2FibGVkKSB7XG4gICAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgICB0aGlzLmZsYWdzID0gZmxhZ3M7XG4gICAgICAgIHRoaXMuZGlzYWJsZWQgPSBkaXNhYmxlZDtcbiAgICB9XG4gICAgYWxsb3dzKHRlcm0pIHsgcmV0dXJuICF0aGlzLmRpc2FibGVkIHx8IHRoaXMuZGlzYWJsZWRbdGVybV0gPT0gMDsgfVxufVxuY29uc3QgaWQgPSB4ID0+IHg7XG4vLy8gQ29udGV4dCB0cmFja2VycyBhcmUgdXNlZCB0byB0cmFjayBzdGF0ZWZ1bCBjb250ZXh0IChzdWNoIGFzXG4vLy8gaW5kZW50YXRpb24gaW4gdGhlIFB5dGhvbiBncmFtbWFyLCBvciBwYXJlbnQgZWxlbWVudHMgaW4gdGhlIFhNTFxuLy8vIGdyYW1tYXIpIG5lZWRlZCBieSBleHRlcm5hbCB0b2tlbml6ZXJzLiBZb3UgZGVjbGFyZSB0aGVtIGluIGFcbi8vLyBncmFtbWFyIGZpbGUgYXMgYEBjb250ZXh0IGV4cG9ydE5hbWUgZnJvbSBcIm1vZHVsZVwiYC5cbi8vL1xuLy8vIENvbnRleHQgdmFsdWVzIHNob3VsZCBiZSBpbW11dGFibGUsIGFuZCBjYW4gYmUgdXBkYXRlZCAocmVwbGFjZWQpXG4vLy8gb24gc2hpZnQgb3IgcmVkdWNlIGFjdGlvbnMuXG5jbGFzcyBDb250ZXh0VHJhY2tlciB7XG4gICAgLy8vIFRoZSBleHBvcnQgdXNlZCBpbiBhIGBAY29udGV4dGAgZGVjbGFyYXRpb24gc2hvdWxkIGJlIG9mIHRoaXNcbiAgICAvLy8gdHlwZS5cbiAgICBjb25zdHJ1Y3RvcihzcGVjKSB7XG4gICAgICAgIHRoaXMuc3RhcnQgPSBzcGVjLnN0YXJ0O1xuICAgICAgICB0aGlzLnNoaWZ0ID0gc3BlYy5zaGlmdCB8fCBpZDtcbiAgICAgICAgdGhpcy5yZWR1Y2UgPSBzcGVjLnJlZHVjZSB8fCBpZDtcbiAgICAgICAgdGhpcy5yZXVzZSA9IHNwZWMucmV1c2UgfHwgaWQ7XG4gICAgICAgIHRoaXMuaGFzaCA9IHNwZWMuaGFzaDtcbiAgICAgICAgdGhpcy5zdHJpY3QgPSBzcGVjLnN0cmljdCAhPT0gZmFsc2U7XG4gICAgfVxufVxuLy8vIEEgcGFyc2VyIGhvbGRzIHRoZSBwYXJzZSB0YWJsZXMgZm9yIGEgZ2l2ZW4gZ3JhbW1hciwgYXMgZ2VuZXJhdGVkXG4vLy8gYnkgYGxlemVyLWdlbmVyYXRvcmAuXG5jbGFzcyBQYXJzZXIge1xuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBjb25zdHJ1Y3RvcihzcGVjKSB7XG4gICAgICAgIC8vLyBAaW50ZXJuYWxcbiAgICAgICAgdGhpcy5idWZmZXJMZW5ndGggPSBEZWZhdWx0QnVmZmVyTGVuZ3RoO1xuICAgICAgICAvLy8gQGludGVybmFsXG4gICAgICAgIHRoaXMuc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FjaGVkRGlhbGVjdCA9IG51bGw7XG4gICAgICAgIGlmIChzcGVjLnZlcnNpb24gIT0gMTMgLyogVmVyc2lvbiAqLylcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBQYXJzZXIgdmVyc2lvbiAoJHtzcGVjLnZlcnNpb259KSBkb2Vzbid0IG1hdGNoIHJ1bnRpbWUgdmVyc2lvbiAoJHsxMyAvKiBWZXJzaW9uICovfSlgKTtcbiAgICAgICAgbGV0IHRva2VuQXJyYXkgPSBkZWNvZGVBcnJheShzcGVjLnRva2VuRGF0YSk7XG4gICAgICAgIGxldCBub2RlTmFtZXMgPSBzcGVjLm5vZGVOYW1lcy5zcGxpdChcIiBcIik7XG4gICAgICAgIHRoaXMubWluUmVwZWF0VGVybSA9IG5vZGVOYW1lcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IHNwZWMuY29udGV4dDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcGVjLnJlcGVhdE5vZGVDb3VudDsgaSsrKVxuICAgICAgICAgICAgbm9kZU5hbWVzLnB1c2goXCJcIik7XG4gICAgICAgIGxldCBub2RlUHJvcHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlTmFtZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBub2RlUHJvcHMucHVzaChbXSk7XG4gICAgICAgIGZ1bmN0aW9uIHNldFByb3Aobm9kZUlELCBwcm9wLCB2YWx1ZSkge1xuICAgICAgICAgICAgbm9kZVByb3BzW25vZGVJRF0ucHVzaChbcHJvcCwgcHJvcC5kZXNlcmlhbGl6ZShTdHJpbmcodmFsdWUpKV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzcGVjLm5vZGVQcm9wcylcbiAgICAgICAgICAgIGZvciAobGV0IHByb3BTcGVjIG9mIHNwZWMubm9kZVByb3BzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHByb3AgPSBwcm9wU3BlY1swXTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHByb3BTcGVjLmxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5leHQgPSBwcm9wU3BlY1tpKytdO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRQcm9wKG5leHQsIHByb3AsIHByb3BTcGVjW2krK10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcHJvcFNwZWNbaSArIC1uZXh0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAtbmV4dDsgaiA+IDA7IGotLSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRQcm9wKHByb3BTcGVjW2krK10sIHByb3AsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGVjaWFsaXplZCA9IG5ldyBVaW50MTZBcnJheShzcGVjLnNwZWNpYWxpemVkID8gc3BlYy5zcGVjaWFsaXplZC5sZW5ndGggOiAwKTtcbiAgICAgICAgdGhpcy5zcGVjaWFsaXplcnMgPSBbXTtcbiAgICAgICAgaWYgKHNwZWMuc3BlY2lhbGl6ZWQpXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwZWMuc3BlY2lhbGl6ZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWNpYWxpemVkW2ldID0gc3BlYy5zcGVjaWFsaXplZFtpXS50ZXJtO1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlY2lhbGl6ZXJzW2ldID0gc3BlYy5zcGVjaWFsaXplZFtpXS5nZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdGVzID0gZGVjb2RlQXJyYXkoc3BlYy5zdGF0ZXMsIFVpbnQzMkFycmF5KTtcbiAgICAgICAgdGhpcy5kYXRhID0gZGVjb2RlQXJyYXkoc3BlYy5zdGF0ZURhdGEpO1xuICAgICAgICB0aGlzLmdvdG8gPSBkZWNvZGVBcnJheShzcGVjLmdvdG8pO1xuICAgICAgICBsZXQgdG9wVGVybXMgPSBPYmplY3Qua2V5cyhzcGVjLnRvcFJ1bGVzKS5tYXAociA9PiBzcGVjLnRvcFJ1bGVzW3JdWzFdKTtcbiAgICAgICAgdGhpcy5ub2RlU2V0ID0gbmV3IE5vZGVTZXQobm9kZU5hbWVzLm1hcCgobmFtZSwgaSkgPT4gTm9kZVR5cGUuZGVmaW5lKHtcbiAgICAgICAgICAgIG5hbWU6IGkgPj0gdGhpcy5taW5SZXBlYXRUZXJtID8gdW5kZWZpbmVkIDogbmFtZSxcbiAgICAgICAgICAgIGlkOiBpLFxuICAgICAgICAgICAgcHJvcHM6IG5vZGVQcm9wc1tpXSxcbiAgICAgICAgICAgIHRvcDogdG9wVGVybXMuaW5kZXhPZihpKSA+IC0xLFxuICAgICAgICAgICAgZXJyb3I6IGkgPT0gMCxcbiAgICAgICAgICAgIHNraXBwZWQ6IHNwZWMuc2tpcHBlZE5vZGVzICYmIHNwZWMuc2tpcHBlZE5vZGVzLmluZGV4T2YoaSkgPiAtMVxuICAgICAgICB9KSkpO1xuICAgICAgICB0aGlzLm1heFRlcm0gPSBzcGVjLm1heFRlcm07XG4gICAgICAgIHRoaXMudG9rZW5pemVycyA9IHNwZWMudG9rZW5pemVycy5tYXAodmFsdWUgPT4gdHlwZW9mIHZhbHVlID09IFwibnVtYmVyXCIgPyBuZXcgVG9rZW5Hcm91cCh0b2tlbkFycmF5LCB2YWx1ZSkgOiB2YWx1ZSk7XG4gICAgICAgIHRoaXMudG9wUnVsZXMgPSBzcGVjLnRvcFJ1bGVzO1xuICAgICAgICB0aGlzLm5lc3RlZCA9IChzcGVjLm5lc3RlZCB8fCBbXSkubWFwKChbbmFtZSwgdmFsdWUsIGVuZFRva2VuLCBwbGFjZWhvbGRlcl0pID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7IG5hbWUsIHZhbHVlLCBlbmQ6IG5ldyBUb2tlbkdyb3VwKGRlY29kZUFycmF5KGVuZFRva2VuKSwgMCksIHBsYWNlaG9sZGVyIH07XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmRpYWxlY3RzID0gc3BlYy5kaWFsZWN0cyB8fCB7fTtcbiAgICAgICAgdGhpcy5keW5hbWljUHJlY2VkZW5jZXMgPSBzcGVjLmR5bmFtaWNQcmVjZWRlbmNlcyB8fCBudWxsO1xuICAgICAgICB0aGlzLnRva2VuUHJlY1RhYmxlID0gc3BlYy50b2tlblByZWM7XG4gICAgICAgIHRoaXMudGVybU5hbWVzID0gc3BlYy50ZXJtTmFtZXMgfHwgbnVsbDtcbiAgICAgICAgdGhpcy5tYXhOb2RlID0gdGhpcy5ub2RlU2V0LnR5cGVzLmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMuZGlhbGVjdCA9IHRoaXMucGFyc2VEaWFsZWN0KCk7XG4gICAgICAgIHRoaXMudG9wID0gdGhpcy50b3BSdWxlc1tPYmplY3Qua2V5cyh0aGlzLnRvcFJ1bGVzKVswXV07XG4gICAgfVxuICAgIC8vLyBQYXJzZSBhIGdpdmVuIHN0cmluZyBvciBzdHJlYW0uXG4gICAgcGFyc2UoaW5wdXQsIHN0YXJ0UG9zID0gMCwgY29udGV4dCA9IHt9KSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgIGlucHV0ID0gc3RyaW5nSW5wdXQoaW5wdXQpO1xuICAgICAgICBsZXQgY3ggPSBuZXcgUGFyc2UodGhpcywgaW5wdXQsIHN0YXJ0UG9zLCBjb250ZXh0KTtcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgbGV0IGRvbmUgPSBjeC5hZHZhbmNlKCk7XG4gICAgICAgICAgICBpZiAoZG9uZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gU3RhcnQgYW4gaW5jcmVtZW50YWwgcGFyc2UuXG4gICAgc3RhcnRQYXJzZShpbnB1dCwgc3RhcnRQb3MgPSAwLCBjb250ZXh0ID0ge30pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgaW5wdXQgPSBzdHJpbmdJbnB1dChpbnB1dCk7XG4gICAgICAgIHJldHVybiBuZXcgUGFyc2UodGhpcywgaW5wdXQsIHN0YXJ0UG9zLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLy8vIEdldCBhIGdvdG8gdGFibGUgZW50cnkgQGludGVybmFsXG4gICAgZ2V0R290byhzdGF0ZSwgdGVybSwgbG9vc2UgPSBmYWxzZSkge1xuICAgICAgICBsZXQgdGFibGUgPSB0aGlzLmdvdG87XG4gICAgICAgIGlmICh0ZXJtID49IHRhYmxlWzBdKVxuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICBmb3IgKGxldCBwb3MgPSB0YWJsZVt0ZXJtICsgMV07Oykge1xuICAgICAgICAgICAgbGV0IGdyb3VwVGFnID0gdGFibGVbcG9zKytdLCBsYXN0ID0gZ3JvdXBUYWcgJiAxO1xuICAgICAgICAgICAgbGV0IHRhcmdldCA9IHRhYmxlW3BvcysrXTtcbiAgICAgICAgICAgIGlmIChsYXN0ICYmIGxvb3NlKVxuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgICAgICAgICBmb3IgKGxldCBlbmQgPSBwb3MgKyAoZ3JvdXBUYWcgPj4gMSk7IHBvcyA8IGVuZDsgcG9zKyspXG4gICAgICAgICAgICAgICAgaWYgKHRhYmxlW3Bvc10gPT0gc3RhdGUpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgICAgICAgICBpZiAobGFzdClcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIENoZWNrIGlmIHRoaXMgc3RhdGUgaGFzIGFuIGFjdGlvbiBmb3IgYSBnaXZlbiB0ZXJtaW5hbCBAaW50ZXJuYWxcbiAgICBoYXNBY3Rpb24oc3RhdGUsIHRlcm1pbmFsKSB7XG4gICAgICAgIGxldCBkYXRhID0gdGhpcy5kYXRhO1xuICAgICAgICBmb3IgKGxldCBzZXQgPSAwOyBzZXQgPCAyOyBzZXQrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhdGVTbG90KHN0YXRlLCBzZXQgPyAyIC8qIFNraXAgKi8gOiAxIC8qIEFjdGlvbnMgKi8pLCBuZXh0OzsgaSArPSAzKSB7XG4gICAgICAgICAgICAgICAgaWYgKChuZXh0ID0gZGF0YVtpXSkgPT0gNjU1MzUgLyogRW5kICovKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2kgKyAxXSA9PSAxIC8qIE5leHQgKi8pXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0ID0gZGF0YVtpID0gcGFpcihkYXRhLCBpICsgMildO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChkYXRhW2kgKyAxXSA9PSAyIC8qIE90aGVyICovKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhaXIoZGF0YSwgaSArIDIpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgPT0gdGVybWluYWwgfHwgbmV4dCA9PSAwIC8qIEVyciAqLylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhaXIoZGF0YSwgaSArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgc3RhdGVTbG90KHN0YXRlLCBzbG90KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlc1soc3RhdGUgKiA2IC8qIFNpemUgKi8pICsgc2xvdF07XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzdGF0ZUZsYWcoc3RhdGUsIGZsYWcpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnN0YXRlU2xvdChzdGF0ZSwgMCAvKiBGbGFncyAqLykgJiBmbGFnKSA+IDA7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBmaW5kTmVzdGVkKHN0YXRlKSB7XG4gICAgICAgIGxldCBmbGFncyA9IHRoaXMuc3RhdGVTbG90KHN0YXRlLCAwIC8qIEZsYWdzICovKTtcbiAgICAgICAgcmV0dXJuIGZsYWdzICYgNCAvKiBTdGFydE5lc3QgKi8gPyB0aGlzLm5lc3RlZFtmbGFncyA+PiAxMCAvKiBOZXN0U2hpZnQgKi9dIDogbnVsbDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHZhbGlkQWN0aW9uKHN0YXRlLCBhY3Rpb24pIHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PSB0aGlzLnN0YXRlU2xvdChzdGF0ZSwgNCAvKiBEZWZhdWx0UmVkdWNlICovKSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGF0ZVNsb3Qoc3RhdGUsIDEgLyogQWN0aW9ucyAqLyk7OyBpICs9IDMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gPT0gNjU1MzUgLyogRW5kICovKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpICsgMV0gPT0gMSAvKiBOZXh0ICovKVxuICAgICAgICAgICAgICAgICAgICBpID0gcGFpcih0aGlzLmRhdGEsIGkgKyAyKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT0gcGFpcih0aGlzLmRhdGEsIGkgKyAxKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gR2V0IHRoZSBzdGF0ZXMgdGhhdCBjYW4gZm9sbG93IHRoaXMgb25lIHRocm91Z2ggc2hpZnQgYWN0aW9ucyBvclxuICAgIC8vLyBnb3RvIGp1bXBzLiBAaW50ZXJuYWxcbiAgICBuZXh0U3RhdGVzKHN0YXRlKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhdGVTbG90KHN0YXRlLCAxIC8qIEFjdGlvbnMgKi8pOzsgaSArPSAzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldID09IDY1NTM1IC8qIEVuZCAqLykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaSArIDFdID09IDEgLyogTmV4dCAqLylcbiAgICAgICAgICAgICAgICAgICAgaSA9IHBhaXIodGhpcy5kYXRhLCBpICsgMik7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgodGhpcy5kYXRhW2kgKyAyXSAmICg2NTUzNiAvKiBSZWR1Y2VGbGFnICovID4+IDE2KSkgPT0gMCkge1xuICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IHRoaXMuZGF0YVtpICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQuc29tZSgodiwgaSkgPT4gKGkgJiAxKSAmJiB2ID09IHZhbHVlKSlcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godGhpcy5kYXRhW2ldLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIG92ZXJyaWRlcyh0b2tlbiwgcHJldikge1xuICAgICAgICBsZXQgaVByZXYgPSBmaW5kT2Zmc2V0KHRoaXMuZGF0YSwgdGhpcy50b2tlblByZWNUYWJsZSwgcHJldik7XG4gICAgICAgIHJldHVybiBpUHJldiA8IDAgfHwgZmluZE9mZnNldCh0aGlzLmRhdGEsIHRoaXMudG9rZW5QcmVjVGFibGUsIHRva2VuKSA8IGlQcmV2O1xuICAgIH1cbiAgICAvLy8gQ29uZmlndXJlIHRoZSBwYXJzZXIuIFJldHVybnMgYSBuZXcgcGFyc2VyIGluc3RhbmNlIHRoYXQgaGFzIHRoZVxuICAgIC8vLyBnaXZlbiBzZXR0aW5ncyBtb2RpZmllZC4gU2V0dGluZ3Mgbm90IHByb3ZpZGVkIGluIGBjb25maWdgIGFyZVxuICAgIC8vLyBrZXB0IGZyb20gdGhlIG9yaWdpbmFsIHBhcnNlci5cbiAgICBjb25maWd1cmUoY29uZmlnKSB7XG4gICAgICAgIC8vIEhpZGVvdXMgcmVmbGVjdGlvbi1iYXNlZCBrbHVkZ2UgdG8gbWFrZSBpdCBlYXN5IHRvIGNyZWF0ZSBhXG4gICAgICAgIC8vIHNsaWdodGx5IG1vZGlmaWVkIGNvcHkgb2YgYSBwYXJzZXIuXG4gICAgICAgIGxldCBjb3B5ID0gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKFBhcnNlci5wcm90b3R5cGUpLCB0aGlzKTtcbiAgICAgICAgaWYgKGNvbmZpZy5wcm9wcylcbiAgICAgICAgICAgIGNvcHkubm9kZVNldCA9IHRoaXMubm9kZVNldC5leHRlbmQoLi4uY29uZmlnLnByb3BzKTtcbiAgICAgICAgaWYgKGNvbmZpZy50b3ApIHtcbiAgICAgICAgICAgIGxldCBpbmZvID0gdGhpcy50b3BSdWxlc1tjb25maWcudG9wXTtcbiAgICAgICAgICAgIGlmICghaW5mbylcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgSW52YWxpZCB0b3AgcnVsZSBuYW1lICR7Y29uZmlnLnRvcH1gKTtcbiAgICAgICAgICAgIGNvcHkudG9wID0gaW5mbztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZmlnLnRva2VuaXplcnMpXG4gICAgICAgICAgICBjb3B5LnRva2VuaXplcnMgPSB0aGlzLnRva2VuaXplcnMubWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBmb3VuZCA9IGNvbmZpZy50b2tlbml6ZXJzLmZpbmQociA9PiByLmZyb20gPT0gdCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvdW5kID8gZm91bmQudG8gOiB0O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGlmIChjb25maWcuZGlhbGVjdClcbiAgICAgICAgICAgIGNvcHkuZGlhbGVjdCA9IHRoaXMucGFyc2VEaWFsZWN0KGNvbmZpZy5kaWFsZWN0KTtcbiAgICAgICAgaWYgKGNvbmZpZy5uZXN0ZWQpXG4gICAgICAgICAgICBjb3B5Lm5lc3RlZCA9IHRoaXMubmVzdGVkLm1hcChvYmogPT4ge1xuICAgICAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmZpZy5uZXN0ZWQsIG9iai5uYW1lKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBvYmoubmFtZSwgdmFsdWU6IGNvbmZpZy5uZXN0ZWRbb2JqLm5hbWVdLCBlbmQ6IG9iai5lbmQsIHBsYWNlaG9sZGVyOiBvYmoucGxhY2Vob2xkZXIgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBpZiAoY29uZmlnLnN0cmljdCAhPSBudWxsKVxuICAgICAgICAgICAgY29weS5zdHJpY3QgPSBjb25maWcuc3RyaWN0O1xuICAgICAgICBpZiAoY29uZmlnLmJ1ZmZlckxlbmd0aCAhPSBudWxsKVxuICAgICAgICAgICAgY29weS5idWZmZXJMZW5ndGggPSBjb25maWcuYnVmZmVyTGVuZ3RoO1xuICAgICAgICByZXR1cm4gY29weTtcbiAgICB9XG4gICAgLy8vIFJldHVybnMgdGhlIG5hbWUgYXNzb2NpYXRlZCB3aXRoIGEgZ2l2ZW4gdGVybS4gVGhpcyB3aWxsIG9ubHlcbiAgICAvLy8gd29yayBmb3IgYWxsIHRlcm1zIHdoZW4gdGhlIHBhcnNlciB3YXMgZ2VuZXJhdGVkIHdpdGggdGhlXG4gICAgLy8vIGAtLW5hbWVzYCBvcHRpb24uIEJ5IGRlZmF1bHQsIG9ubHkgdGhlIG5hbWVzIG9mIHRhZ2dlZCB0ZXJtcyBhcmVcbiAgICAvLy8gc3RvcmVkLlxuICAgIGdldE5hbWUodGVybSkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXJtTmFtZXMgPyB0aGlzLnRlcm1OYW1lc1t0ZXJtXSA6IFN0cmluZyh0ZXJtIDw9IHRoaXMubWF4Tm9kZSAmJiB0aGlzLm5vZGVTZXQudHlwZXNbdGVybV0ubmFtZSB8fCB0ZXJtKTtcbiAgICB9XG4gICAgLy8vIFRoZSBlb2YgdGVybSBpZCBpcyBhbHdheXMgYWxsb2NhdGVkIGRpcmVjdGx5IGFmdGVyIHRoZSBub2RlXG4gICAgLy8vIHR5cGVzLiBAaW50ZXJuYWxcbiAgICBnZXQgZW9mVGVybSgpIHsgcmV0dXJuIHRoaXMubWF4Tm9kZSArIDE7IH1cbiAgICAvLy8gVGVsbHMgeW91IHdoZXRoZXIgdGhpcyBncmFtbWFyIGhhcyBhbnkgbmVzdGVkIGdyYW1tYXJzLlxuICAgIGdldCBoYXNOZXN0ZWQoKSB7IHJldHVybiB0aGlzLm5lc3RlZC5sZW5ndGggPiAwOyB9XG4gICAgLy8vIFRoZSB0eXBlIG9mIHRvcCBub2RlIHByb2R1Y2VkIGJ5IHRoZSBwYXJzZXIuXG4gICAgZ2V0IHRvcE5vZGUoKSB7IHJldHVybiB0aGlzLm5vZGVTZXQudHlwZXNbdGhpcy50b3BbMV1dOyB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGR5bmFtaWNQcmVjZWRlbmNlKHRlcm0pIHtcbiAgICAgICAgbGV0IHByZWMgPSB0aGlzLmR5bmFtaWNQcmVjZWRlbmNlcztcbiAgICAgICAgcmV0dXJuIHByZWMgPT0gbnVsbCA/IDAgOiBwcmVjW3Rlcm1dIHx8IDA7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBwYXJzZURpYWxlY3QoZGlhbGVjdCkge1xuICAgICAgICBpZiAodGhpcy5jYWNoZWREaWFsZWN0ICYmIHRoaXMuY2FjaGVkRGlhbGVjdC5zb3VyY2UgPT0gZGlhbGVjdClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhY2hlZERpYWxlY3Q7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBPYmplY3Qua2V5cyh0aGlzLmRpYWxlY3RzKSwgZmxhZ3MgPSB2YWx1ZXMubWFwKCgpID0+IGZhbHNlKTtcbiAgICAgICAgaWYgKGRpYWxlY3QpXG4gICAgICAgICAgICBmb3IgKGxldCBwYXJ0IG9mIGRpYWxlY3Quc3BsaXQoXCIgXCIpKSB7XG4gICAgICAgICAgICAgICAgbGV0IGlkID0gdmFsdWVzLmluZGV4T2YocGFydCk7XG4gICAgICAgICAgICAgICAgaWYgKGlkID49IDApXG4gICAgICAgICAgICAgICAgICAgIGZsYWdzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIGxldCBkaXNhYmxlZCA9IG51bGw7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgaWYgKCFmbGFnc1tpXSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSB0aGlzLmRpYWxlY3RzW3ZhbHVlc1tpXV0sIGlkOyAoaWQgPSB0aGlzLmRhdGFbaisrXSkgIT0gNjU1MzUgLyogRW5kICovOylcbiAgICAgICAgICAgICAgICAgICAgKGRpc2FibGVkIHx8IChkaXNhYmxlZCA9IG5ldyBVaW50OEFycmF5KHRoaXMubWF4VGVybSArIDEpKSlbaWRdID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVkRGlhbGVjdCA9IG5ldyBEaWFsZWN0KGRpYWxlY3QsIGZsYWdzLCBkaXNhYmxlZCk7XG4gICAgfVxuICAgIC8vLyAodXNlZCBieSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXIgZ2VuZXJhdG9yKSBAaW50ZXJuYWxcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUoc3BlYykge1xuICAgICAgICByZXR1cm4gbmV3IFBhcnNlcihzcGVjKTtcbiAgICB9XG59XG5mdW5jdGlvbiBwYWlyKGRhdGEsIG9mZikgeyByZXR1cm4gZGF0YVtvZmZdIHwgKGRhdGFbb2ZmICsgMV0gPDwgMTYpOyB9XG5mdW5jdGlvbiBmaW5kT2Zmc2V0KGRhdGEsIHN0YXJ0LCB0ZXJtKSB7XG4gICAgZm9yIChsZXQgaSA9IHN0YXJ0LCBuZXh0OyAobmV4dCA9IGRhdGFbaV0pICE9IDY1NTM1IC8qIEVuZCAqLzsgaSsrKVxuICAgICAgICBpZiAobmV4dCA9PSB0ZXJtKVxuICAgICAgICAgICAgcmV0dXJuIGkgLSBzdGFydDtcbiAgICByZXR1cm4gLTE7XG59XG5mdW5jdGlvbiBmaW5kRmluaXNoZWQoc3RhY2tzKSB7XG4gICAgbGV0IGJlc3QgPSBudWxsO1xuICAgIGZvciAobGV0IHN0YWNrIG9mIHN0YWNrcykge1xuICAgICAgICBpZiAoc3RhY2sucG9zID09IHN0YWNrLnAuaW5wdXQubGVuZ3RoICYmXG4gICAgICAgICAgICBzdGFjay5wLnBhcnNlci5zdGF0ZUZsYWcoc3RhY2suc3RhdGUsIDIgLyogQWNjZXB0aW5nICovKSAmJlxuICAgICAgICAgICAgKCFiZXN0IHx8IGJlc3Quc2NvcmUgPCBzdGFjay5zY29yZSkpXG4gICAgICAgICAgICBiZXN0ID0gc3RhY2s7XG4gICAgfVxuICAgIHJldHVybiBiZXN0O1xufVxuXG5leHBvcnQgeyBDb250ZXh0VHJhY2tlciwgRXh0ZXJuYWxUb2tlbml6ZXIsIFBhcnNlciwgU3RhY2ssIFRva2VuIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5lcy5qcy5tYXBcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJ2YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbnZhciBfX2dlbmVyYXRvciA9ICh0aGlzICYmIHRoaXMuX19nZW5lcmF0b3IpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBib2R5KSB7XG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcbiAgICByZXR1cm4gZyA9IHsgbmV4dDogdmVyYigwKSwgXCJ0aHJvd1wiOiB2ZXJiKDEpLCBcInJldHVyblwiOiB2ZXJiKDIpIH0sIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgICAgd2hpbGUgKF8pIHRyeSB7XG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG59O1xuaW1wb3J0IHsgY29tcGlsZSB9IGZyb20gJy4vY29tcGlsZXInO1xuaW1wb3J0IHsgcnVud2F0c3JjIH0gZnJvbSAnLi9ydW5uZXInO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24gKCkgeyByZXR1cm4gX19hd2FpdGVyKHZvaWQgMCwgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBkaXNwbGF5KGFyZykge1xuICAgICAgICB2YXIgZWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInByZVwiKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvdXRwdXRcIikuYXBwZW5kQ2hpbGQoZWx0KTtcbiAgICAgICAgZWx0LmlubmVyVGV4dCA9IGFyZztcbiAgICB9XG4gICAgdmFyIG1lbW9yeSwgaW1wb3J0T2JqZWN0LCBydW5CdXR0b24sIHVzZXJDb2RlO1xuICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgbWVtb3J5ID0gbmV3IFdlYkFzc2VtYmx5Lk1lbW9yeSh7IGluaXRpYWw6IDEwLCBtYXhpbXVtOiAxMDAgfSk7XG4gICAgICAgIGltcG9ydE9iamVjdCA9IHtcbiAgICAgICAgICAgIGltcG9ydHM6IHtcbiAgICAgICAgICAgICAgICBwcmludF9udW06IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2dnaW5nIGZyb20gV0FTTTogXCIsIGFyZyk7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXkoU3RyaW5nKGFyZykpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcHJpbnRfYm9vbDogZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJnID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5KFwiRmFsc2VcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5KFwiVHJ1ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcHJpbnRfbm9uZTogZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5KFwiTm9uZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByaW50OiBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9nZ2luZyBmcm9tIFdBU006IFwiLCBhcmcpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInByZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvdXRwdXRcIikuYXBwZW5kQ2hpbGQoZWx0KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZWx0LmlubmVyVGV4dCA9IGFyZztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1lbTogbWVtb3J5LFxuICAgICAgICAgICAgICAgIGFiczogTWF0aC5hYnMsXG4gICAgICAgICAgICAgICAgbWF4OiBNYXRoLm1heCxcbiAgICAgICAgICAgICAgICBtaW46IE1hdGgubWluLFxuICAgICAgICAgICAgICAgIHBvdzogTWF0aC5wb3dcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJ1bkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicnVuXCIpO1xuICAgICAgICB1c2VyQ29kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXNlci1jb2RlXCIpO1xuICAgICAgICBydW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIF9fYXdhaXRlcih2b2lkIDAsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcHJvZ3JhbSwgb3V0cHV0LCB3YXQsIGNvZGUsIHJlc3VsdCwgaTMyLCBpLCBlXzE7XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChfYS5sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtID0gdXNlckNvZGUudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm91dHB1dFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC50ZXh0Q29udGVudCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInByb2dyYW06IFwiLmNvbmNhdChwcm9ncmFtKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYS5sYWJlbCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hLnRyeXMucHVzaChbMSwgMywgLCA0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YXQgPSBjb21waWxlKHByb2dyYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGVkLWNvZGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlLnRleHRDb250ZW50ID0gd2F0Lndhc21Tb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIHJ1bndhdHNyYyhwcm9ncmFtLCB7IGltcG9ydE9iamVjdDogaW1wb3J0T2JqZWN0IH0pXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaTMyID0gbmV3IFVpbnQzMkFycmF5KG1lbW9yeS5idWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImkzMltcIi5jb25jYXQoaSwgXCJdOiBcIikuY29uY2F0KGkzMltpXSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnRleHRDb250ZW50ICs9IFN0cmluZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IGJsYWNrXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgNF07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVfMSA9IF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZV8xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC50ZXh0Q29udGVudCA9IFN0cmluZyhlXzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IHJlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMyAvKmJyZWFrKi8sIDRdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ6IHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7IH0pO1xuICAgICAgICB1c2VyQ29kZS52YWx1ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicHJvZ3JhbVwiKTtcbiAgICAgICAgdXNlckNvZGUuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIF9fYXdhaXRlcih2b2lkIDAsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJwcm9ncmFtXCIsIHVzZXJDb2RlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7IH0pO1xuICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgfSk7XG59KTsgfSk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=