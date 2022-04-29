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
            // const objAddr = codeGenExpr(expr.obj, globalEnv, localEnv);
            // const checkValidAddress = [...objAddr, `(i32.const -4) \n(i32.add)`, `(i32.load)`, `local.set $last`]; // c : Rat = None, c.x
            var argInstrs = expr.args.map(function (a) { return codeGenExpr(a, globalEnv, localEnv); });
            var flattenArgs_1 = []; // flat the list of lists
            argInstrs.forEach(function (arg) { return flattenArgs_1.push(arg.join("\n")); });
            if (expr.obj.a == "int" || expr.obj.a == "bool" || expr.obj.a == "None") {
                throw Error("This should be a class.");
            }
            // The call object is the first argument self.
            var callObject = codeGenExpr(expr.obj, globalEnv, localEnv).join("\n");
            return [callObject, flattenArgs_1.join("\n"), "\n(call $$".concat(expr.obj.a.class, "$").concat(expr.name, ")")];
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
        var wabtInterface, compiled, importObject, wasmSource, myModule, asBinary, wasmModule, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, wabt__WEBPACK_IMPORTED_MODULE_0___default()()];
                case 1:
                    wabtInterface = _a.sent();
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
        throw new Error("TYPE ERROR: typeCheckBinOp only take binary operation");
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
                throw new Error("TYPE ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTyped.a, "' and type '").concat(rightTyped.a, "'"));
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
                throw new Error("TYPE ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedEq.a, "' and type '").concat(rightTypedEq.a, "'"));
            }
            return __assign(__assign({}, expr), { left: leftTypedEq, right: rightTypedEq, a: "bool" });
        // work for None and other classes
        case _ast__WEBPACK_IMPORTED_MODULE_0__.BinOp.Is:
            var leftTypedIs = typeCheckExpr(expr.left, env);
            var rightTypedIs = typeCheckExpr(expr.right, env);
            if (leftTypedIs.a === "int" || leftTypedIs.a === "bool" || rightTypedIs.a === "int" || rightTypedIs.a === "bool") {
                throw new Error("TYPE ERROR: Cannot apply operator '".concat(expr.op, "' on types '").concat(leftTypedIs.a, "' and type '").concat(rightTypedIs.a, "'"));
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
        throw new Error("TYPE ERROR: typeCheckUniOp only take unary operations");
    }
    switch (expr.op) {
        // work for int
        case _ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Minus:
            var typedExpr = typeCheckExpr(expr.expr, env);
            if (typedExpr.a !== "int") {
                throw new Error("TYPE ERROR: uniary operator ".concat(_ast__WEBPACK_IMPORTED_MODULE_0__.UniOp.Minus, " expected ").concat("int", "; got type ").concat(typedExpr.a));
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
            throw new Error("TYPE ERROR: undefined unary operator ".concat(expr, ". This error should be called in parser"));
    }
}
function typeCheckWhile(stmt, env) {
    if (stmt.tag !== 'while') {
        throw new Error("TYPE ERROR: the input statement should be while when calling typeCheckWhile");
    }
    var typedWhileCond = typeCheckExpr(stmt.cond, env);
    var typedWhileBody = typeCheckStmts(stmt.stmts, env);
    if (typedWhileCond.a !== "bool") {
        throw new Error("TYPE ERROR: Condtion expression cannot be of type '".concat(typedWhileCond.a, "'"));
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
        throw new Error("TYPE ERROR: the input statement should be if when calling typeCheckIf");
    }
    // check if
    var typedIfCond = typeCheckExpr(stmt.ifOp.cond, env);
    var typedIfBody = typeCheckStmts(stmt.ifOp.stmts, env);
    if (typedIfCond.a !== "bool") {
        throw new Error("TYPE ERROR: Condtion expression cannot be of type '".concat(typedIfCond.a, "'"));
    }
    // check elif
    var typedElifCond = null;
    var typedElifBody = null;
    if (stmt.elifOp.cond !== null) {
        typedElifCond = typeCheckExpr(stmt.elifOp.cond, env);
        typedElifBody = typeCheckStmts(stmt.elifOp.stmts, env);
        if (typedElifCond.a !== "bool") {
            throw new Error("TYPE ERROR: Condtion expression cannot be of type '".concat(typedElifCond.a, "'"));
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
        throw new Error("TYPE ERROR: typeCheckMethod only accepts a getfield as an input expr");
    }
    var typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") { // cannot compile with isObject()
        throw new Error("TYPE ERROR: Only objects can get fields.");
    }
    if (!env.classFields.has(typedObj.a.class)) {
        throw new Error("TYPE ERROR: The class doesn't exist.");
    }
    var classFields = env.classFields.get(typedObj.a.class);
    if (!classFields.has(expr.name)) {
        throw new Error("TYPE ERROR: The field doesn't exist in the class.");
    }
    return __assign(__assign({}, expr), { obj: typedObj, a: classFields.get(expr.name) });
}
function typeCheckMethod(expr, env) {
    if (expr.tag !== "method") {
        throw new Error("TYPE ERROR: typeCheckMethod only accepts a method as an input expr");
    }
    var typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") {
        throw new Error("TYPE ERROR: Only classes can call methods.");
    }
    if (!env.classMethods.has(typedObj.a.class)) {
        throw new Error("TYPE ERROR: The class doesn't exist.");
    }
    var classMethods = env.classMethods.get(typedObj.a.class);
    if (!classMethods.has(expr.name)) {
        throw new Error("TYPE ERROR: The method doesn't exist in the class.");
    }
    var _a = classMethods.get(expr.name), argTyps = _a[0], retTyp = _a[1];
    var typedArgs = expr.args.map(function (a) { return typeCheckExpr(a, env); });
    if (argTyps.length != typedArgs.length) { // We escaped "self" in the parser.
        throw new Error("TYPE ERROR: The number of parameters is incorrect.");
    }
    argTyps.forEach(function (t, i) {
        if (!isSameType(t, typedArgs[i].a)) {
            throw new Error("TYPE ERROR: incorrect parameter type");
        }
    });
    return __assign(__assign({}, expr), { obj: typedObj, args: typedArgs, a: retTyp });
}
function typeCheckCall(expr, env) {
    if (expr.tag !== "call") {
        throw new Error("TYPE ERROR: typeCheckCall only accept a call as an input expr");
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
        throw new Error("TYPE ERROR: call func ".concat(expr.name, "; expected ").concat(params.length, " arguments; got ").concat(args.length));
    }
    // check argument type
    var typedArgs = [];
    for (var idx = 0; idx < params.length; ++idx) {
        var typedArg = typeCheckExpr(args[idx], env);
        if (typedArg.a !== params[idx]) {
            throw new Error("TYPE ERROR: call func ".concat(expr.name, "; expected type ").concat(params[idx], "; got type ").concat(typedArg.a, " in parameters ").concat(idx));
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
        throw new Error("TYPE ERROR: This is not a class statement.");
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
            throw Error("TYPE ERROR: duplicate param declaration in the same field");
        }
        scopeVar.add(param.name);
        localEnv.vars.set(param.name, param.type);
    });
    // check inits -> add to envs
    var localTypedInits = typeCheckVarInit(func.varInits, localEnv);
    func.varInits.forEach(function (localTypedInit) {
        if (scopeVar.has(localTypedInit.name)) {
            throw Error("TYPE ERROR: duplicate init declaration in the same field");
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
        throw new Error("TYPE ERROR: All paths in function/method must have a return statement: ".concat(func.name));
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
                throw new Error("TYPE ERROR: typeCheckHasReturn meets unknown statement");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQztBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNENBQTRDO0FBQzVDO0FBQ0E7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMERBQTBEO0FBQzFELHdEQUF3RCxTQUFTO0FBQ2pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZTtBQUNmO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlEQUFpRDtBQUNqRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtEQUErRDtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLG1CQUFtQjtBQUNsRDtBQUNBLGVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0EsbUJBQW1CO0FBQ25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWU7QUFDZjtBQUNBLDRCQUE0QjtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdDQUFnQyxrREFBVTtBQUMxQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0RBQWtEO0FBQ2xEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYyxTQUFTLGFBQWEsYUFBYTtBQUNqRDtBQUNBO0FBQ0Esd0JBQXdCLHVCQUF1QjtBQUMvQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsU0FBUztBQUMzQiw0QkFBNEIsK0JBQStCO0FBQzNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsV0FBVztBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYyxRQUFRLFdBQVcsU0FBUyxhQUFhLE9BQU87QUFDOUQsMEJBQTBCLFNBQVM7QUFDbkMseUZBQXlGO0FBQ3pGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDLGtCQUFrQjtBQUNuQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLG1CQUFtQjtBQUMzQztBQUNBLG1CQUFtQjtBQUNuQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUMsMEJBQTBCO0FBQzdEO0FBQ0Esb0NBQW9DLHNCQUFzQjtBQUMxRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0Isc0JBQXNCO0FBQzlDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQyxnQkFBZ0I7QUFDakQ7QUFDQTtBQUNBO0FBQ0EsNERBQTRELE9BQU87QUFDbkU7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtRkFBbUYsK0JBQStCO0FBQ2xIO0FBQ0E7QUFDQSx3Q0FBd0MsNENBQUk7QUFDNUM7QUFDQTtBQUNBLHFDQUFxQyw0Q0FBSTtBQUN6QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnRkFBZ0Ysc0RBQXNEO0FBQ3RJO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixtQkFBbUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVFQUF1RTtBQUN2RSxtQ0FBbUMsK0NBQStDLEdBQUcsTUFBTSxzQkFBc0IsSUFBSSxNQUFNLEVBQUUscUNBQXFDO0FBQ2xLO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixtQkFBbUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QixzREFBc0Q7QUFDbEY7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFGQUFxRiwyQkFBMkI7QUFDaEg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlLGtEQUFVLEdBQUc7QUFDNUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0RBQXNEO0FBQ3REO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0Isb0JBQW9CO0FBQzVDO0FBQ0E7QUFDQSxjQUFjLG9CQUFvQjtBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0NBQWtDLHlCQUF5QjtBQUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVCQUF1Qiw0Q0FBSTtBQUMzQjtBQUNBLHVCQUF1Qiw0Q0FBSSxDQUFDLHFEQUFhO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLHNCQUFzQjtBQUMxQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQkFBbUI7QUFDbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNEJBQTRCLDJEQUFtQjtBQUMvQztBQUNBO0FBQ0E7QUFDQTtBQUNBLG9EQUFvRCxhQUFhLG1DQUFtQyxpQkFBaUI7QUFDckg7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsMEJBQTBCO0FBQ2xEO0FBQ0E7QUFDQSx3QkFBd0Isc0JBQXNCO0FBQzlDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLG9CQUFvQjtBQUNwRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0Q0FBNEMsT0FBTztBQUNuRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNEJBQTRCLDZCQUE2QjtBQUN6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQiwrQ0FBTyw0QkFBNEIsdURBQWU7QUFDN0U7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQ0FBMkM7QUFDM0M7QUFDQSxvQkFBb0IsdURBQVc7QUFDL0I7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0RBQWdEO0FBQ2hEO0FBQ0Esb0JBQW9CLHVEQUFXO0FBQy9CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0NBQXdDO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0RBQWtELFdBQVc7QUFDN0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMEJBQTBCLFNBQVM7QUFDbkMsNkZBQTZGO0FBQzdGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOERBQThEO0FBQzlEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4REFBOEQ7QUFDOUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4REFBOEQsV0FBVztBQUN6RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0I7QUFDcEI7QUFDQSxzQkFBc0I7QUFDdEI7QUFDQSxvQkFBb0I7QUFDcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixtQkFBbUI7QUFDM0M7QUFDQSwyREFBMkQseUNBQXlDO0FBQ3BHO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQjtBQUMzQjtBQUNBLDhCQUE4QixxQ0FBcUM7QUFDbkU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFbUU7QUFDbkU7Ozs7Ozs7VUMzOUNBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7O1dDdEJBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQSxpQ0FBaUMsV0FBVztXQUM1QztXQUNBOzs7OztXQ1BBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EseUNBQXlDLHdDQUF3QztXQUNqRjtXQUNBO1dBQ0E7Ozs7O1dDUEE7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdEOzs7Ozs7Ozs7Ozs7O0FDTkEsaUJBQWlCLFNBQUksSUFBSSxTQUFJO0FBQzdCLDRCQUE0QiwrREFBK0QsaUJBQWlCO0FBQzVHO0FBQ0Esb0NBQW9DLE1BQU0sK0JBQStCLFlBQVk7QUFDckYsbUNBQW1DLE1BQU0sbUNBQW1DLFlBQVk7QUFDeEYsZ0NBQWdDO0FBQ2hDO0FBQ0EsS0FBSztBQUNMO0FBQ0EsbUJBQW1CLFNBQUksSUFBSSxTQUFJO0FBQy9CLGNBQWMsNkJBQTZCLDBCQUEwQixjQUFjLHFCQUFxQjtBQUN4RyxpQkFBaUIsb0RBQW9ELHFFQUFxRSxjQUFjO0FBQ3hKLHVCQUF1QixzQkFBc0I7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0NBQXdDO0FBQ3hDLG1DQUFtQyxTQUFTO0FBQzVDLG1DQUFtQyxXQUFXLFVBQVU7QUFDeEQsMENBQTBDLGNBQWM7QUFDeEQ7QUFDQSw4R0FBOEcsT0FBTztBQUNySCxpRkFBaUYsaUJBQWlCO0FBQ2xHLHlEQUF5RCxnQkFBZ0IsUUFBUTtBQUNqRiwrQ0FBK0MsZ0JBQWdCLGdCQUFnQjtBQUMvRTtBQUNBLGtDQUFrQztBQUNsQztBQUNBO0FBQ0EsVUFBVSxZQUFZLGFBQWEsU0FBUyxVQUFVO0FBQ3RELG9DQUFvQyxTQUFTO0FBQzdDO0FBQ0E7QUFDcUM7QUFDQTtBQUNyQyw0REFBNEQ7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQ0FBMEMsMkJBQTJCO0FBQ3JFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSwwREFBMEQ7QUFDMUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QixrREFBTztBQUNyQztBQUNBO0FBQ0E7QUFDQSw2Q0FBNkMsa0RBQVMsWUFBWSw0QkFBNEI7QUFDOUY7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DLFFBQVE7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVMsSUFBSTtBQUNiO0FBQ0EsNERBQTREO0FBQzVEO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTLElBQUk7QUFDYjtBQUNBLEtBQUs7QUFDTCxDQUFDLElBQUkiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL2FzdC50cyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL2NvbXBpbGVyLnRzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vcGFyc2VyLnRzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vcnVubmVyLnRzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vdHlwZWNoZWNrLnRzIiwid2VicGFjazovL3dlYi1hc20taml0L2V4dGVybmFsIHZhciBcIndhYnRcIiIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL25vZGVfbW9kdWxlcy9sZXplci1weXRob24vZGlzdC9pbmRleC5lcy5qcyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL25vZGVfbW9kdWxlcy9sZXplci10cmVlL2Rpc3QvdHJlZS5lcy5qcyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL25vZGVfbW9kdWxlcy9sZXplci9kaXN0L2luZGV4LmVzLmpzIiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svcnVudGltZS9jb21wYXQgZ2V0IGRlZmF1bHQgZXhwb3J0Iiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvLi93ZWJzdGFydC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgdmFyIEJpbk9wO1xuKGZ1bmN0aW9uIChCaW5PcCkge1xuICAgIEJpbk9wW1wiUGx1c1wiXSA9IFwiK1wiO1xuICAgIEJpbk9wW1wiTWludXNcIl0gPSBcIi1cIjtcbiAgICBCaW5PcFtcIk11bFwiXSA9IFwiKlwiO1xuICAgIEJpbk9wW1wiRGl2XCJdID0gXCIvL1wiO1xuICAgIEJpbk9wW1wiTW9kXCJdID0gXCIlXCI7XG4gICAgQmluT3BbXCJFcVwiXSA9IFwiPT1cIjtcbiAgICBCaW5PcFtcIk5lcVwiXSA9IFwiIT1cIjtcbiAgICBCaW5PcFtcIlNlcVwiXSA9IFwiPD1cIjtcbiAgICBCaW5PcFtcIkxlcVwiXSA9IFwiPj1cIjtcbiAgICBCaW5PcFtcIlNtbFwiXSA9IFwiPFwiO1xuICAgIEJpbk9wW1wiTHJnXCJdID0gXCI+XCI7XG4gICAgQmluT3BbXCJJc1wiXSA9IFwiaXNcIjtcbn0pKEJpbk9wIHx8IChCaW5PcCA9IHt9KSk7XG5leHBvcnQgdmFyIFVuaU9wO1xuKGZ1bmN0aW9uIChVbmlPcCkge1xuICAgIFVuaU9wW1wiTWludXNcIl0gPSBcIi1cIjtcbiAgICBVbmlPcFtcIk5vdFwiXSA9IFwibm90XCI7XG59KShVbmlPcCB8fCAoVW5pT3AgPSB7fSkpO1xuIiwidmFyIF9fYXNzaWduID0gKHRoaXMgJiYgdGhpcy5fX2Fzc2lnbikgfHwgZnVuY3Rpb24gKCkge1xuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbih0KSB7XG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSlcbiAgICAgICAgICAgICAgICB0W3BdID0gc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdDtcbiAgICB9O1xuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcbnZhciBfX3NwcmVhZEFycmF5ID0gKHRoaXMgJiYgdGhpcy5fX3NwcmVhZEFycmF5KSB8fCBmdW5jdGlvbiAodG8sIGZyb20sIHBhY2spIHtcbiAgICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XG4gICAgICAgICAgICBpZiAoIWFyKSBhciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20sIDAsIGkpO1xuICAgICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xufTtcbmltcG9ydCB7IEJpbk9wLCBVbmlPcCB9IGZyb20gJy4vYXN0JztcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSBcIi4vcGFyc2VyXCI7XG5pbXBvcnQgeyB0eXBlQ2hlY2tQcm9ncmFtIH0gZnJvbSBcIi4vdHlwZWNoZWNrXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlMb2NhbEVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YXJzOiBuZXcgTWFwKCksXG4gICAgICAgIGlzRnVuYzogZmFsc2UsXG4gICAgfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbXB0eUdsb2JhbEVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YXJzOiBuZXcgTWFwKCksXG4gICAgICAgIGZ1bmNzOiBuZXcgTWFwKCksXG4gICAgICAgIGNsYXNzSW5kZXhlczogbmV3IE1hcCgpLFxuICAgICAgICBjbGFzc0luaXRzOiBuZXcgTWFwKCksXG4gICAgICAgIGxvb3BEZXB0aDogMFxuICAgIH07XG59XG4vLyBzZXQgdXAgZ2xvYmFsIHZhcmlhYmxlcyBhbmQgZ2xvYmFsIGZ1bmN0aW9uc1xuZXhwb3J0IGZ1bmN0aW9uIHNldEdsb2JhbEluZm8ocHJvZ3JhbSkge1xuICAgIHZhciBnbG9iYWxFbnYgPSBjcmVhdGVFbXB0eUdsb2JhbEVudigpO1xuICAgIC8vIHNldCB2YXJpYWJsZXNcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwcm9ncmFtLnZhckluaXRzLmxlbmd0aDsgKytpZHgpIHtcbiAgICAgICAgZ2xvYmFsRW52LnZhcnMuc2V0KHByb2dyYW0udmFySW5pdHNbaWR4XS5uYW1lLCBwcm9ncmFtLnZhckluaXRzW2lkeF0pO1xuICAgIH1cbiAgICAvLyBzZXQgZnVuY3N0aW9uc1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHByb2dyYW0uZnVuY0RlZnMubGVuZ3RoOyArK2lkeCkge1xuICAgICAgICBnbG9iYWxFbnYuZnVuY3Muc2V0KHByb2dyYW0uZnVuY0RlZnNbaWR4XS5uYW1lLCBwcm9ncmFtLmZ1bmNEZWZzW2lkeF0pO1xuICAgIH1cbiAgICAvLyBzZXQgY2xhc3MgZmllbGQgaW5kZXhlcyBhbmQgaW5pdCB2YWx1ZVxuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHByb2dyYW0uY2xhc3NEZWZzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgdmFyIGNsYXNzSW5kZXhlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdmFyIGNsYXNzSW5pdHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHZhciBjbGFzc0RlZiA9IHByb2dyYW0uY2xhc3NEZWZzW2lkeF07XG4gICAgICAgIGlmIChjbGFzc0RlZi50YWcgIT09IFwiY2xhc3NcIikge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJzaG91bGQgYmUgYSBjbGFzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZmllbGRzID0gY2xhc3NEZWYuZmllbGRzO1xuICAgICAgICBmb3IgKHZhciBpZHgyID0gMDsgaWR4MiA8IGZpZWxkcy5sZW5ndGg7IGlkeDIrKykge1xuICAgICAgICAgICAgY2xhc3NJbmRleGVzLnNldChmaWVsZHNbaWR4Ml0ubmFtZSwgaWR4Mik7XG4gICAgICAgICAgICBjbGFzc0luaXRzLnNldChmaWVsZHNbaWR4Ml0ubmFtZSwgZmllbGRzW2lkeDJdLmluaXRMaXRlcmFsKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2xhc3NOYW1lID0gY2xhc3NEZWYubmFtZTtcbiAgICAgICAgZ2xvYmFsRW52LmNsYXNzSW5kZXhlcy5zZXQoY2xhc3NOYW1lLCBjbGFzc0luZGV4ZXMpO1xuICAgICAgICBnbG9iYWxFbnYuY2xhc3NJbml0cy5zZXQoY2xhc3NOYW1lLCBjbGFzc0luaXRzKTtcbiAgICB9XG4gICAgcmV0dXJuIGdsb2JhbEVudjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKHNvdXJjZSkge1xuICAgIC8vIHBhcnNlIHByb2dyYW0gYW5kIGdldCBlYWNoIGVsZW1lbnRzXG4gICAgdmFyIHByb2dyYW0gPSB0eXBlQ2hlY2tQcm9ncmFtKHBhcnNlKHNvdXJjZSkpO1xuICAgIHZhciBhc3QgPSBwcm9ncmFtLnN0bXRzO1xuICAgIHZhciBnbG9iYWxFbnYgPSBzZXRHbG9iYWxJbmZvKHByb2dyYW0pO1xuICAgIC8vIGdlbmVyYXRlIGZ1bmN0aW9uIGRlZmluaXRpb25zXG4gICAgdmFyIGZ1bmNzID0gcHJvZ3JhbS5mdW5jRGVmcy5tYXAoZnVuY3Rpb24gKGZ1bmNEZWYpIHtcbiAgICAgICAgcmV0dXJuIGNvZGVHZW5GdW5jRGVmKGZ1bmNEZWYsIGdsb2JhbEVudik7XG4gICAgfSkuam9pbignXFxuJyk7XG4gICAgLy8gZ2VuZXJhdGUgZ2xvYmFsIHZhcmlhYmxlcyAoaW5jbHVkaW5nIHRoZSBoZWFwKVxuICAgIHZhciBnbG9iYWxWYXJzID0gY29kZUdlbkdsb2JhbFZhcihwcm9ncmFtLnZhckluaXRzKS5qb2luKCdcXG4nKTtcbiAgICAvLyBnZW5lcmF0ZSBjbGFzcyBkZWZpbml0aW9uc1xuICAgIHZhciBjbGFzc2VzID0gcHJvZ3JhbS5jbGFzc0RlZnMubWFwKGZ1bmN0aW9uIChjbGFzc0RlZikge1xuICAgICAgICByZXR1cm4gY29kZUdlbkNsYXNzRGVmKGNsYXNzRGVmLCBnbG9iYWxFbnYpOyAvLyBub3Qgc3VyZSB3aHkgaXRzIHJldHVybiBpcyBzdHJpbmdwW11cbiAgICB9KS5qb2luKFwiXFxuXCIpO1xuICAgIC8vIGNyZWF0ZSBhbiBlbXB0eSBsb2NhbCBlbnZpcm9ubWVudFxuICAgIHZhciBsb2NhbEVudiA9IGNyZWF0ZUVtcHR5TG9jYWxFbnYoKTtcbiAgICAvLyBnZW5lcmF0ZSB0aGUgY29kZSBmb3IgdGhlIG1haW4gYm9keVxuICAgIHZhciBjb21tYW5kcyA9IGNvZGVHZW5NYWluQm9keShhc3QsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgIC8vIGNvbnNvbGUubG9nKGNvbW1hbmRzKTtcbiAgICAvLyBzZXQgdXAgZmluYWwgZnVuY3Rpb24gcmV0dXJuIHR5cGVcbiAgICB2YXIgbGFzdEV4cHIgPSBhc3RbYXN0Lmxlbmd0aCAtIDFdO1xuICAgIHZhciByZXR1cm5UeXBlID0gXCJcIjtcbiAgICB2YXIgcmV0dXJuRXhwciA9IFwiXCI7XG4gICAgLy8gY29uc29sZS5sb2coYGFzdC5sZW5ndGg6ICR7YXN0Lmxlbmd0aH0sIGxhc3RFeHByOiAke2xhc3RFeHByLnRhZ31gKTtcbiAgICBpZiAoYXN0Lmxlbmd0aCA+IDAgJiYgbGFzdEV4cHIudGFnID09PSBcImV4cHJcIikge1xuICAgICAgICByZXR1cm5UeXBlID0gXCIocmVzdWx0IGkzMilcIjtcbiAgICAgICAgcmV0dXJuRXhwciA9IFwiXFxuKGxvY2FsLmdldCAkbGFzdClcIjsgLy8gU2luY2Ugd2UgdXNlIGEgZnVuY3Rpb24gYXQgdGhlIGVuZCwgd2UgbmVlZCB0byBwdXQgdGhlIHJldHVybiB2YWx1ZSBpbiB0aGUgc3RhY2suXG4gICAgfVxuICAgIC8vIFRoZSBsYXN0IHZhbHVlIGlzIG5vdCBuZWVkZWQgaWYgdGhlIGxhc3Qgc3RhdGVtZW50IGlzIG5vdCBhbiBleHByZXNzaW9uLlxuICAgIHJldHVybiB7XG4gICAgICAgIHdhc21Tb3VyY2U6IFwiXCIuY29uY2F0KGdsb2JhbFZhcnMsIFwiXFxuXCIpLmNvbmNhdChjbGFzc2VzLCBcIlxcblwiKS5jb25jYXQoZnVuY3MsIFwiXFxuKGZ1bmMgKGV4cG9ydCBcXFwiZXhwb3J0ZWRfZnVuY1xcXCIpIFwiKS5jb25jYXQocmV0dXJuVHlwZSkuY29uY2F0KGNvbW1hbmRzLmpvaW4oJ1xcbicpKS5jb25jYXQocmV0dXJuRXhwciwgXCIpXCIpXG4gICAgfTtcbn1cbi8vIGdlbmVyYXRlIGNvZGVzIGZvciBzdGF0ZW1lbnRzXG5mdW5jdGlvbiBjb2RlR2VuKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICBzd2l0Y2ggKHN0bXQudGFnKSB7XG4gICAgICAgIGNhc2UgXCJhc3NpZ25cIjpcbiAgICAgICAgICAgIHZhciB2YWxTdG10cyA9IGNvZGVHZW5FeHByKHN0bXQudmFsdWUsIGdsb2JhbEVudiwgbG9jYWxFbnYpOyAvLyByaHNcbiAgICAgICAgICAgIHZhciBsZWZ0RXhwciA9IGNvZGVHZW5FeHByKHN0bXQubmFtZSwgZ2xvYmFsRW52LCBsb2NhbEVudik7IC8vIGxoc1xuICAgICAgICAgICAgLy8gZ2VuZXJhdGUgdGhlIFwic3RvcmVcIiBhc3NpZ24gY29kZVxuICAgICAgICAgICAgaWYgKHN0bXQubmFtZS50YWcgPT0gXCJnZXRmaWVsZFwiKSB7XG4gICAgICAgICAgICAgICAgbGVmdEV4cHIgPSBsZWZ0RXhwci5zbGljZSgwLCAtMSk7IC8vIHN0cmlwIGBpMzIubG9hZGAgc2luY2UgaXQncyBsaHNcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdEV4cHIuY29uY2F0KFt2YWxTdG10cyArIFwiXFxuaTMyLnN0b3JlXCJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgeyAvLyBnZW5lcmF0ZSB0aGUgXCJzZXRcIiBhc3NpZ24gY29kZVxuICAgICAgICAgICAgICAgIGlmIChsb2NhbEVudi5pc0Z1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2FsRW52LnZhcnMuaGFzKHN0bXQudmFyaWFibGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsU3RtdHMuY29uY2F0KFtcIihsb2NhbC5zZXQgJFwiLmNvbmNhdChzdG10Lm5hbWUsIFwiKVwiKV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGNhbm5vdCBhc3NpZ24gYSB2YWx1ZSB0byBhIGdsb2JhbCB2YXJpYWJsZSBpbiB0aGUgZnVuY3Rpb24gZW52aXJvbm1lbnQuXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBnbG9iYWwgdmFyaWFibGUgXCIuY29uY2F0KHN0bXQudmFyaWFibGUsIFwiIGNhbm5vdCBiZSBhc3NpZ25lZCBpbiBhIGZ1bmN0aW9uXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsU3RtdHMuY29uY2F0KFtcIihnbG9iYWwuc2V0ICRcIi5jb25jYXQoc3RtdC52YXJpYWJsZSwgXCIpXCIpXSk7IC8vIGdsb2JhbCBlbnZpcm9ubWVudFxuICAgICAgICBjYXNlIFwiZXhwclwiOlxuICAgICAgICAgICAgdmFyIGV4cHJTdG10cyA9IGNvZGVHZW5FeHByKHN0bXQuZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICByZXR1cm4gZXhwclN0bXRzLmNvbmNhdChbXCIobG9jYWwuc2V0ICRsYXN0KVwiXSk7XG4gICAgICAgIC8vIFdpdGhvdXQgdGhlIHJldHVybiBjb21tYW5kLCB0aGUgZnVuY3Rpb24gd291bGQgcmV0dXJuIHRoZSB2YWx1ZXMgaW4gdGhlIHN0YWNrLlxuICAgICAgICAvLyBIb3dldmVyLCB3ZSB3b3VsZCBuZWVkIHRvIG1ha2Ugc3VyZSB0aGUgI3N0YWNrIGVsZW1lbnRzID09ICNyZXR1cm4gdmFsdWVzXG4gICAgICAgIGNhc2UgXCJyZXR1cm5cIjpcbiAgICAgICAgICAgIHZhciByZXR1cm5TdG10cyA9IGNvZGVHZW5FeHByKHN0bXQuZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICByZXR1cm5TdG10cy5wdXNoKFwiKHJldHVybilcIik7XG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuU3RtdHM7XG4gICAgICAgIGNhc2UgXCJwYXNzXCI6XG4gICAgICAgICAgICByZXR1cm4gW1wibm9wXCJdOyAvLyBubyBvcGVyYXRpb25cbiAgICAgICAgY2FzZSBcIndoaWxlXCI6XG4gICAgICAgICAgICB2YXIgd2hpbGVTdG10cyA9IGNvZGVHZW5XaGlsZShzdG10LCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHJldHVybiB3aGlsZVN0bXRzLmNvbmNhdCgpO1xuICAgICAgICBjYXNlIFwiaWZcIjpcbiAgICAgICAgICAgIHZhciBpZlN0bXRzID0gY29kZUdlbklmKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICAgICAgcmV0dXJuIGlmU3RtdHMuY29uY2F0KCk7XG4gICAgfVxufVxuZnVuY3Rpb24gY29kZUdlbk1haW5Cb2R5KHN0bXRzLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgLy8gZGVjbGFyZSBhbGwgbG9jYWwgdmFyaWFibGVzIGFjY29yZGluZyB0byB0aGUgc291cmNlXG4gICAgdmFyIHNjcmF0Y2hWYXIgPSBcIihsb2NhbCAkbGFzdCBpMzIpXCI7IC8vIGFzIGZ1bmN0aW9uIG91dHB1dFxuICAgIC8vIHB1dCAkbGFzdCBvbiB0aGUgc3RhY2ssIGFuZCBpdCB3aWwgY29uc3VtZSB0aGUgdG9wIHZhbHVlIG9uIHRoZSBzdGFjayBldmVudHVhbGx5XG4gICAgdmFyIGxvY2FsRGVmaW5lcyA9IFtzY3JhdGNoVmFyXTtcbiAgICB2YXIgY29tbWFuZEdyb3VwcyA9IHN0bXRzLm1hcChmdW5jdGlvbiAoc3RtdCkgeyByZXR1cm4gY29kZUdlbihzdG10LCBnbG9iYWxFbnYsIGxvY2FsRW52KTsgfSk7XG4gICAgcmV0dXJuIGxvY2FsRGVmaW5lcy5jb25jYXQoW10uY29uY2F0LmFwcGx5KFtdLCBjb21tYW5kR3JvdXBzKSk7XG59XG5mdW5jdGlvbiBjb2RlR2VuRXhwcihleHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgc3dpdGNoIChleHByLnRhZykge1xuICAgICAgICBjYXNlIFwiaWRcIjpcbiAgICAgICAgICAgIHJldHVybiBbY29kZUdlbklkKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpXTtcbiAgICAgICAgY2FzZSBcImJpbm9wXCI6XG4gICAgICAgICAgICB2YXIgbGVmdFN0bXRzID0gY29kZUdlbkV4cHIoZXhwci5sZWZ0LCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHZhciByaWdodFN0bXRzID0gY29kZUdlbkV4cHIoZXhwci5yaWdodCwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICB2YXIgb3BTdG10ID0gY29kZUdlbkJpbk9wKGV4cHIub3ApO1xuICAgICAgICAgICAgcmV0dXJuIF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBsZWZ0U3RtdHMsIHRydWUpLCByaWdodFN0bXRzLCB0cnVlKSwgW29wU3RtdF0sIGZhbHNlKTtcbiAgICAgICAgY2FzZSBcInVuaW9wXCI6XG4gICAgICAgICAgICB2YXIgdW5pb3BSaWdodCA9IGNvZGVHZW5FeHByKGV4cHIuZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICByZXR1cm4gY29kZUdlblVuaW9uT3AoZXhwci5vcCwgdW5pb3BSaWdodCk7XG4gICAgICAgIGNhc2UgXCJsaXRlcmFsXCI6XG4gICAgICAgICAgICByZXR1cm4gW2NvZGVHZW5MaXRlcmFsKGV4cHIubGl0ZXJhbCldO1xuICAgICAgICBjYXNlIFwiY2FsbFwiOlxuICAgICAgICAgICAgcmV0dXJuIGNvZGVHZW5DYWxsKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICBjYXNlIFwibWV0aG9kXCI6XG4gICAgICAgICAgICAvLyBjb25zdCBvYmpBZGRyID0gY29kZUdlbkV4cHIoZXhwci5vYmosIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICAgICAgLy8gY29uc3QgY2hlY2tWYWxpZEFkZHJlc3MgPSBbLi4ub2JqQWRkciwgYChpMzIuY29uc3QgLTQpIFxcbihpMzIuYWRkKWAsIGAoaTMyLmxvYWQpYCwgYGxvY2FsLnNldCAkbGFzdGBdOyAvLyBjIDogUmF0ID0gTm9uZSwgYy54XG4gICAgICAgICAgICB2YXIgYXJnSW5zdHJzID0gZXhwci5hcmdzLm1hcChmdW5jdGlvbiAoYSkgeyByZXR1cm4gY29kZUdlbkV4cHIoYSwgZ2xvYmFsRW52LCBsb2NhbEVudik7IH0pO1xuICAgICAgICAgICAgdmFyIGZsYXR0ZW5BcmdzXzEgPSBbXTsgLy8gZmxhdCB0aGUgbGlzdCBvZiBsaXN0c1xuICAgICAgICAgICAgYXJnSW5zdHJzLmZvckVhY2goZnVuY3Rpb24gKGFyZykgeyByZXR1cm4gZmxhdHRlbkFyZ3NfMS5wdXNoKGFyZy5qb2luKFwiXFxuXCIpKTsgfSk7XG4gICAgICAgICAgICBpZiAoZXhwci5vYmouYSA9PSBcImludFwiIHx8IGV4cHIub2JqLmEgPT0gXCJib29sXCIgfHwgZXhwci5vYmouYSA9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiVGhpcyBzaG91bGQgYmUgYSBjbGFzcy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBUaGUgY2FsbCBvYmplY3QgaXMgdGhlIGZpcnN0IGFyZ3VtZW50IHNlbGYuXG4gICAgICAgICAgICB2YXIgY2FsbE9iamVjdCA9IGNvZGVHZW5FeHByKGV4cHIub2JqLCBnbG9iYWxFbnYsIGxvY2FsRW52KS5qb2luKFwiXFxuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIFtjYWxsT2JqZWN0LCBmbGF0dGVuQXJnc18xLmpvaW4oXCJcXG5cIiksIFwiXFxuKGNhbGwgJCRcIi5jb25jYXQoZXhwci5vYmouYS5jbGFzcywgXCIkXCIpLmNvbmNhdChleHByLm5hbWUsIFwiKVwiKV07XG4gICAgICAgIGNhc2UgXCJnZXRmaWVsZFwiOlxuICAgICAgICAgICAgcmV0dXJuIGNvZGVHZW5GaWVsZChleHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICB9XG59XG5mdW5jdGlvbiBjb2RlR2VuQmluT3Aob3ApIHtcbiAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICAgIGNhc2UgQmluT3AuUGx1czpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIuYWRkKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLk1pbnVzOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5zdWIpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuTXVsOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5tdWwpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuRGl2OlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5kaXZfcylcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5Nb2Q6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLnJlbV9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLkVxOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5lcSlcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5OZXE6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLm5lKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLlNlcTpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIubGVfcylcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5MZXE6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmdlX3MpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuU21sOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5sdF9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLkxyZzpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIuZ3RfcylcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5JczpcbiAgICAgICAgICAgIC8vIHggaXMgeSBcbiAgICAgICAgICAgIC8vIGUuZy4geSBpcyBhIGNsYXNzIGFuZCB4IGlzIGFuIG9iamVjdCBvZiB0aGF0IGNsYXNzXG4gICAgICAgICAgICAvLyBjdXJyZW50bHksIHRoZSBvbmx5IGNsYXNzIGlzIE5vbmUsIHNvIHdlIGNhbiB1c2UgZXFcbiAgICAgICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihcIkNPTVBJTEUgRVJST1I6IGlzIG9wZXJhdG9yIG5vdCBpbXBsZW1lbnRlZFwiKVxuICAgICAgICAgICAgLy8gRm9yIG90aGVyIGNsYXNzZXMsIHdlIHNob3VsZCBjb21wYXJlIHRoZSBmaWVsZCByZWN1cnNpdmVseS5cbiAgICAgICAgICAgIC8vIEluIENob2NvcHksIFwiaXNcIiBpcyB1c2VkIHRvIGNvbXBhcmUgdGhlIGZpZWxkcyBpbiB0d28gY2xhc3Mgb2JqZWN0cywgYW5kIFwiPT1cIiBjYW5ub3QgYmUgdXNlZCB3aXRoIGNsYXNzZXMuIFxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5lcSlcIjtcbiAgICB9XG59XG5mdW5jdGlvbiBjb2RlR2VuVW5pb25PcChvcCwgcmlnaHQpIHtcbiAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICAgIGNhc2UgVW5pT3AuTWludXM6XG4gICAgICAgICAgICByZXR1cm4gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtcIihpMzIuY29uc3QgMClcIl0sIHJpZ2h0LCB0cnVlKSwgW1wiKGkzMi5zdWIpIFwiXSwgZmFsc2UpOyAvLyAteCA9IDAgLSB4XG4gICAgICAgIGNhc2UgVW5pT3AuTm90OlxuICAgICAgICAgICAgcmV0dXJuIF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShbXSwgcmlnaHQsIHRydWUpLCBbXCIoaTMyLmVxeilcIl0sIGZhbHNlKTsgLy8gaXMgeCAhPSAwLCByZXR1cm4gMTsgZWxzZSwgcmV0dXJuIDBcbiAgICB9XG59XG5mdW5jdGlvbiBjb2RlR2VuSWYoc3RtdCwgZ2xvYmFsRW52LCBsb2NhbEVudikge1xuICAgIGlmIChzdG10LnRhZyAhPT0gJ2lmJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDT01QSUxFIEVSUk9SOiB0aGUgaW5wdXQgdG8gY29kZUdlbklmIHNob3VsZCBoYXZlIHRhZyBpZlwiKTtcbiAgICB9XG4gICAgdmFyIGlmQ29uZCA9IGNvZGVHZW5FeHByKHN0bXQuaWZPcC5jb25kLCBnbG9iYWxFbnYsIGxvY2FsRW52KS5qb2luKCdcXG4nKTtcbiAgICB2YXIgaWZCb2R5ID0gY29kZUdlbkJvZHkoc3RtdC5pZk9wLnN0bXRzLCBnbG9iYWxFbnYsIGxvY2FsRW52KS5qb2luKCdcXG4nKTtcbiAgICB2YXIgZWxpZkNvbmQgPSBcIihpMzIuY29uc3QgMClcIjtcbiAgICB2YXIgZWxpZkJvZHkgPSBcIm5vcFwiO1xuICAgIHZhciBlbHNlQm9keSA9IFwibm9wXCI7XG4gICAgLy8gaGFzIGVsc2UgaWZcbiAgICBpZiAoc3RtdC5lbGlmT3AuY29uZCAhPT0gbnVsbCkge1xuICAgICAgICBlbGlmQ29uZCA9IGNvZGVHZW5FeHByKHN0bXQuZWxpZk9wLmNvbmQsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgICAgICBlbGlmQm9keSA9IGNvZGVHZW5Cb2R5KHN0bXQuZWxpZk9wLnN0bXRzLCBnbG9iYWxFbnYsIGxvY2FsRW52KS5qb2luKCdcXG4nKTtcbiAgICB9XG4gICAgaWYgKHN0bXQuZWxzZU9wLnN0bXRzICE9PSBudWxsKSB7XG4gICAgICAgIGVsc2VCb2R5ID0gY29kZUdlbkJvZHkoc3RtdC5lbHNlT3Auc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICByZXR1cm4gW1wiXCIuY29uY2F0KGlmQ29uZCwgXCJcXG4oaWZcXG4odGhlblxcblwiKS5jb25jYXQoaWZCb2R5LCBcIlxcbilcXG4oZWxzZVxcblwiKS5jb25jYXQoZWxpZkNvbmQsIFwiXFxuKGlmXFxuKHRoZW5cXG5cIikuY29uY2F0KGVsaWZCb2R5LCBcIlxcbilcXG4oZWxzZVxcblwiKS5jb25jYXQoZWxzZUJvZHksIFwiXFxuKSkpKVwiKV07XG59XG4vLyBnZW5lcmF0ZSB0aGUgY29kZXMgZm9yIHN0YXRlbWVudHNcbmZ1bmN0aW9uIGNvZGVHZW5Cb2R5KHN0bXRzLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgdmFyIGJvZHkgPSBzdG10cy5tYXAoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgdmFyIGIgPSBjb2RlR2VuKHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICByZXR1cm4gYi5qb2luKCdcXG4nKTtcbiAgICB9KTtcbiAgICByZXR1cm4gYm9keTtcbn1cbmZ1bmN0aW9uIGNvZGVHZW5XaGlsZShzdG10LCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKHN0bXQudGFnICE9PSBcIndoaWxlXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ09NUElMRSBFUlJPUjogY29kZUdlbldoaWxlIHRha2VzIG9ubHkgd2hpbGUgc3RhdGVtZW50IGFzIGlucHV0XCIpO1xuICAgIH1cbiAgICAvLyB0aHJvdyBuZXcgRXJyb3IoXCJDT01QSUxFIEVSUk9SOiB3aGlsZSBoYXMgbm90IGJlZW4gaW1wbGVtZW50ZWQgeWV0XCIpO1xuICAgIHZhciBsb29wSWQgPSAoZ2xvYmFsRW52Lmxvb3BEZXB0aCsrKTtcbiAgICAvLyBjb21tYW5kIGJvZHlcbiAgICB2YXIgYm9keSA9IGNvZGVHZW5Cb2R5KHN0bXQuc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgIC8vIGNvbmRpdGlvbiBcbiAgICB2YXIgY29uZCA9IGNvZGVHZW5FeHByKHN0bXQuY29uZCwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgZ2xvYmFsRW52Lmxvb3BEZXB0aC0tO1xuICAgIHJldHVybiBbXCIobG9vcCBcXG5cIi5jb25jYXQoYm9keS5qb2luKCdcXG4nKSwgXCJcXG5cIikuY29uY2F0KGNvbmQuam9pbignXFxuJyksIFwiXFxuYnJfaWYgXCIpLmNvbmNhdChsb29wSWQsIFwiKVwiKV07XG59XG5mdW5jdGlvbiBjb2RlR2VuRmllbGQoZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudikge1xuICAgIGlmIChleHByLnRhZyAhPT0gJ2dldGZpZWxkJykge1xuICAgICAgICB0aHJvdyBFcnJvcihcIkNPTVBJTEVSIEVSUk9SOiBUaGUgaW5wdXQgZXhwcmVzc2lvbiB0byBjb2RlR2VuQ2FsbCBzaG91bGQgYmUgZ2V0ZmllbGQuXCIpO1xuICAgIH1cbiAgICBpZiAoZXhwci5vYmouYSA9PT0gXCJpbnRcIiB8fCBleHByLm9iai5hID09PSBcImJvb2xcIiB8fCBleHByLm9iai5hID09PSBcIk5vbmVcIikge1xuICAgICAgICB0aHJvdyBFcnJvcihcIkNPTVBJTEVSIEVSUk9SOiBUaGUgb2JqZWN0IHNob3VsZCBiZSBhIGNsYXNzLlwiKTtcbiAgICB9XG4gICAgLy8gSWYgaXQgaXMgYW4gaW5zdGFuY2UsIGl0IHNob3VsZCByZXR1cm4gaXRzIGFkZHJlc3MsIGV4LiAoZ2xvYmFsLmdldCAkcjEpLlxuICAgIHZhciBvYmpBZGRyID0gY29kZUdlbkV4cHIoZXhwci5vYmosIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgIHZhciBjaGVja1ZhbGlkQWRkcmVzcyA9IF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShbXSwgb2JqQWRkciwgdHJ1ZSksIFtcIihpMzIuY29uc3QgLTQpIFxcbihpMzIuYWRkKVwiLCBcIihpMzIubG9hZClcIiwgXCJsb2NhbC5zZXQgJGxhc3RcIl0sIGZhbHNlKTsgLy8gYyA6IFJhdCA9IE5vbmUsIGMueFxuICAgIHZhciBjbGFzc0luZGV4ZXMgPSBnbG9iYWxFbnYuY2xhc3NJbmRleGVzLmdldChleHByLm9iai5hLmNsYXNzKTtcbiAgICB2YXIgaW5kZXhPZkZpZWxkID0gY2xhc3NJbmRleGVzLmdldChleHByLm5hbWUpO1xuICAgIHJldHVybiBfX3NwcmVhZEFycmF5KF9fc3ByZWFkQXJyYXkoW2NoZWNrVmFsaWRBZGRyZXNzLmpvaW4oXCJcXG5cIildLCBvYmpBZGRyLCB0cnVlKSwgW1wiKGkzMi5jb25zdCBcIi5jb25jYXQoaW5kZXhPZkZpZWxkICogNCwgXCIpIFxcbihpMzIuYWRkKVwiKSwgXCIoaTMyLmxvYWQpXCJdLCBmYWxzZSk7XG59XG5mdW5jdGlvbiBjb2RlR2VuQ2FsbChleHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9PSBcImNhbGxcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDT01QSUxFUiBFUlJPUjogVGhlIGlucHV0IGV4cHJlc3Npb24gdG8gY29kZUdlbkNhbGwgc2hvdWxkIGJlIGNhbGwuXCIpO1xuICAgIH1cbiAgICAvLyBhZGRyZXNzIHRoZSBjYXNlIG9mIGFuIGluaXQgY2FsbCwgZXguIHIxID0gUmF0KCkuXG4gICAgaWYgKGdsb2JhbEVudi5jbGFzc0luaXRzLmhhcyhleHByLm5hbWUpKSB7XG4gICAgICAgIC8vIHZhcmlhYmxlIGluaXRpYWxpemF0aW9uc1xuICAgICAgICB2YXIgaW5pdFZhbHNfMSA9IFtdO1xuICAgICAgICB2YXIgY2xhc3NJbml0c18xID0gZ2xvYmFsRW52LmNsYXNzSW5pdHMuZ2V0KGV4cHIubmFtZSk7IC8vIGdldCB0aGUgaW5pdGlhbGl6aW5nIHZhbHVlcyBvZiBhIGNsYXNzXG4gICAgICAgIHZhciBjbGFzc0luZGV4ZXMgPSBnbG9iYWxFbnYuY2xhc3NJbmRleGVzLmdldChleHByLm5hbWUpOyAvLyBnZXQgdGhlIGZpZWxkIGluZGV4ZXMgb2YgYSBjbGFzc1xuICAgICAgICBjbGFzc0luZGV4ZXMuZm9yRWFjaChmdW5jdGlvbiAoaW5kZXgsIGZpZWxkKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gaW5kZXggKiA0O1xuICAgICAgICAgICAgaW5pdFZhbHNfMSA9IF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShbXSwgaW5pdFZhbHNfMSwgdHJ1ZSksIFtcbiAgICAgICAgICAgICAgICBcIihnbG9iYWwuZ2V0ICRoZWFwKVwiLFxuICAgICAgICAgICAgICAgIFwiKGkzMi5jb25zdCBcIi5jb25jYXQob2Zmc2V0LCBcIilcIiksXG4gICAgICAgICAgICAgICAgXCIoaTMyLmFkZClcIixcbiAgICAgICAgICAgICAgICBjb2RlR2VuTGl0ZXJhbChjbGFzc0luaXRzXzEuZ2V0KGZpZWxkKSksXG4gICAgICAgICAgICAgICAgXCIoaTMyLnN0b3JlKVwiXG4gICAgICAgICAgICBdLCBmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBXZSBoYXZlIHRvIG1vZGlmeSB0aGUgYWRkcmVzcyBvZiB0aGUgaGVhcCwgc28gdGhlIG5leHQgY2xhc3MgY2FuIHVzZSBpdC5cbiAgICAgICAgaW5pdFZhbHNfMSA9IF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShbXSwgaW5pdFZhbHNfMSwgdHJ1ZSksIFtcbiAgICAgICAgICAgIFwiKGdsb2JhbC5nZXQgJGhlYXApXCIsXG4gICAgICAgICAgICBcIihnbG9iYWwuZ2V0ICRoZWFwKVwiLFxuICAgICAgICAgICAgXCIoaTMyLmNvbnN0IFwiLmNvbmNhdChjbGFzc0luZGV4ZXMuc2l6ZSAqIDQsIFwiKVwiKSxcbiAgICAgICAgICAgIFwiKGkzMi5hZGQpXCIsXG4gICAgICAgICAgICBcIihnbG9iYWwuc2V0ICRoZWFwKVwiLFxuICAgICAgICBdLCBmYWxzZSk7XG4gICAgICAgIHZhciBpbml0RnVuY05hbWUgPSBcIiQkXCIuY29uY2F0KGV4cHIubmFtZSwgXCIkX19pbml0X18pXCIpO1xuICAgICAgICBpZiAoZ2xvYmFsRW52LmZ1bmNzLmhhcyhpbml0RnVuY05hbWUpKSB7XG4gICAgICAgICAgICBpbml0VmFsc18xLnB1c2goXCIoY2FsbCAkJFwiLmNvbmNhdChleHByLm5hbWUsIFwiJF9faW5pdF9fKVwiKSk7IC8vIGV4ZWN1dGUgdGhlIF9faW5pdF9fIG9wZXJhdGlvbnNcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5pdFZhbHNfMTtcbiAgICB9XG4gICAgdmFyIGNvZGVzID0gW107XG4gICAgLy8gY29sbGVjdCBhcmd1bWVudHNcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBleHByLmFyZ3MubGVuZ3RoOyArK2lkeCkge1xuICAgICAgICB2YXIgYXJnID0gZXhwci5hcmdzW2lkeF07XG4gICAgICAgIGNvZGVzID0gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBjb2RlcywgdHJ1ZSksIGNvZGVHZW5FeHByKGFyZywgZ2xvYmFsRW52LCBsb2NhbEVudiksIHRydWUpO1xuICAgIH1cbiAgICAvLyBjYWxsIHRoZSBmdW5jdGlvblxuICAgIGlmIChleHByLm5hbWUgPT09ICdwcmludCcpIHtcbiAgICAgICAgaWYgKGV4cHIuYXJnc1swXS5hICE9PSBcImludFwiICYmIGV4cHIuYXJnc1swXS5hICE9PSBcImJvb2xcIiAmJiBleHByLmFyZ3NbMF0uYSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgIGNvZGVzLnB1c2goXCIoY2FsbCAkcHJpbnRfbnVtKVwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZXhwci5hcmdzWzBdLmEpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiaW50XCI6XG4gICAgICAgICAgICAgICAgICAgIGNvZGVzLnB1c2goXCIoY2FsbCAkcHJpbnRfbnVtKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImJvb2xcIjpcbiAgICAgICAgICAgICAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRwcmludF9ib29sKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIk5vbmVcIjpcbiAgICAgICAgICAgICAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRwcmludF9ub25lKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNvZGUgY2FuIHN0aWxsIGNvbXBpbGUgaWYgaXQncyBhIGNsYXNzLCBhbmQgYW4gZXJyb3Igd2lsbCBvY2N1ciBhdCBydW50aW1lLlxuICAgICAgICAgICAgICAgICAgICBjb2Rlcy5wdXNoKFwiKGNhbGwgJHByaW50X251bSlcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNvZGVzLnB1c2goXCIoY2FsbCAkXCIuY29uY2F0KGV4cHIubmFtZSwgXCIpXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvZGVzO1xufVxuZnVuY3Rpb24gY29kZUdlbkdsb2JhbFZhcih2YXJJbml0cykge1xuICAgIHZhciB2YXJJbml0V2FzbSA9IHZhckluaXRzLm1hcChmdW5jdGlvbiAodmFySW5pdCkge1xuICAgICAgICByZXR1cm4gXCIoZ2xvYmFsICRcIi5jb25jYXQodmFySW5pdC5uYW1lLCBcIiAobXV0IGkzMikgXCIpLmNvbmNhdChjb2RlR2VuTGl0ZXJhbCh2YXJJbml0LmluaXRMaXRlcmFsKSwgXCIpXCIpO1xuICAgIH0pO1xuICAgIHZhckluaXRXYXNtLnB1c2goXCIoZ2xvYmFsICRoZWFwIChtdXQgaTMyKSAoaTMyLmNvbnN0IDQpKVxcblwiKTsgLy8gaW5pdGlhbGl6ZSB0aGUgaGVhcCBmb3IgY2xhc3Nlc1xuICAgIHJldHVybiB2YXJJbml0V2FzbTtcbn1cbi8qXG5kZWYgZ2V0X2ZpZWxkX2Eoc2VsZiA6IFJhdCk6XG4gIHJldHVybiBzZWxmLmFcbiovXG5mdW5jdGlvbiBjb2RlR2VuQ2xhc3NEZWYoY2xhc3NEZWYsIGdsb2JhbEVudikge1xuICAgIGlmIChjbGFzc0RlZi50YWcgIT09IFwiY2xhc3NcIikge1xuICAgICAgICB0aHJvdyBFcnJvcihcImNhbiBvbmx5IGdlbmVyYXRlIGNvZGVzIGZvciBjbGFzc2VzXCIpO1xuICAgIH1cbiAgICB2YXIgY2xhc3NXYXNtID0gW107XG4gICAgLy8gYWRkIGFsbCB0aGUgZmllbGRzIGZ1bmN0aW9ucyAoc2ltcGx5IHJldHVybiB0aGUgdmFsdWUpXG4gICAgY2xhc3NEZWYuZmllbGRzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgLy8gVG8gcmV0dXJuIHNlbGYuYSwgd2UgbmVlZCB0aGUgYWRkcmVzcyBvZiBzZWxmLCBhbmQgdGhlIGluZGV4IG9mIGEuXG4gICAgICAgIHZhciBwYXJhbXMgPSBbe1xuICAgICAgICAgICAgICAgIGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdGFnOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICBjbGFzczogY2xhc3NEZWYubmFtZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbmFtZTogXCJzZWxmXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogY2xhc3NEZWYuYVxuICAgICAgICAgICAgfV07IC8vIGV4LiBzZWxmIDogUmF0XG4gICAgICAgIHZhciB2YXJJbml0cyA9IFtdOyAvLyBubyB2YXJpYWJsZSBpbml0aWFsaXphdGlvbnNcbiAgICAgICAgdmFyIGdldGZpZWxkT2JqID0ge1xuICAgICAgICAgICAgYToge1xuICAgICAgICAgICAgICAgIHRhZzogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBjbGFzczogY2xhc3NEZWYubmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRhZzogXCJpZFwiLFxuICAgICAgICAgICAgbmFtZTogXCJzZWxmXCJcbiAgICAgICAgfTsgLy8gZXguIHIxXG4gICAgICAgIHZhciBnZXRmaWVsZEV4cHIgPSB7IGE6IGYuYSwgdGFnOiBcImdldGZpZWxkXCIsIG9iajogZ2V0ZmllbGRPYmosIG5hbWU6IGYubmFtZSB9O1xuICAgICAgICB2YXIgc3RtdHMgPSBbeyBhOiBcIk5vbmVcIiwgdGFnOiBcInJldHVyblwiLCBleHByOiBnZXRmaWVsZEV4cHIgfV07XG4gICAgICAgIHZhciBmdW5jRGVmID0ge1xuICAgICAgICAgICAgbmFtZTogXCIkXCIuY29uY2F0KGNsYXNzRGVmLm5hbWUsIFwiJGdldF9maWVsZF9cIikuY29uY2F0KGYubmFtZSksXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIHJldFR5cGU6IGYuYSxcbiAgICAgICAgICAgIHZhckluaXRzOiB2YXJJbml0cyxcbiAgICAgICAgICAgIHN0bXRzOiBzdG10c1xuICAgICAgICB9O1xuICAgICAgICBjb2RlR2VuRnVuY0RlZihmdW5jRGVmLCBnbG9iYWxFbnYpLmZvckVhY2goZnVuY3Rpb24gKGZ1bmNXYXNtKSB7XG4gICAgICAgICAgICBjbGFzc1dhc20ucHVzaChmdW5jV2FzbSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIC8vIGFkZCBhbGwgdGhlIG1ldGhvZCBmdW5jdGlvbnNcbiAgICBjbGFzc0RlZi5tZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgdmFyIGZ1bmNEZWYgPSBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgbSksIHsgbmFtZTogXCIkXCIuY29uY2F0KGNsYXNzRGVmLm5hbWUsIFwiJFwiKS5jb25jYXQobS5uYW1lKSB9KTsgLy8gQW5vdGhlciBcIiRcIiB3b3VsZCBiZSBhZGRlZCBsYXRlci5cbiAgICAgICAgLy8gYWRkIGEgcmV0dXJuIHN0YXRlbWVudCB0byB0aGUgaW5pdCBmdW5jdGlvblxuICAgICAgICBpZiAobS5uYW1lID09IFwiX19pbml0X19cIikge1xuICAgICAgICAgICAgZnVuY0RlZi5zdG10cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBhOiBcIk5vbmVcIixcbiAgICAgICAgICAgICAgICB0YWc6IFwicmV0dXJuXCIsXG4gICAgICAgICAgICAgICAgZXhwcjoge1xuICAgICAgICAgICAgICAgICAgICBhOiB7IHRhZzogXCJvYmplY3RcIiwgY2xhc3M6IGNsYXNzRGVmLm5hbWUgfSxcbiAgICAgICAgICAgICAgICAgICAgdGFnOiBcImlkXCIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwic2VsZlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgcmVtb3ZlIFwic2VsZlwiIGluIHRoZSBwYXJzZXIgYW5kIGFkZCBpdCBiYWNrIGhlcmUuXG4gICAgICAgIGZ1bmNEZWYucGFyYW1zID0gX19zcHJlYWRBcnJheShbe1xuICAgICAgICAgICAgICAgIGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdGFnOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICBjbGFzczogY2xhc3NEZWYubmFtZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbmFtZTogXCJzZWxmXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogY2xhc3NEZWYuYVxuICAgICAgICAgICAgfV0sIGZ1bmNEZWYucGFyYW1zLCB0cnVlKTtcbiAgICAgICAgLy8gZnVuY0RlZi5wYXJhbXMucHVzaCh7IFxuICAgICAgICAvLyAgIGE6IHsgXG4gICAgICAgIC8vICAgICB0YWc6IFwib2JqZWN0XCIsIFxuICAgICAgICAvLyAgICAgY2xhc3M6IGNsYXNzRGVmLm5hbWUgXG4gICAgICAgIC8vICAgfSwgXG4gICAgICAgIC8vICAgbmFtZTogXCJzZWxmXCIsIFxuICAgICAgICAvLyAgIHR5cGU6IGNsYXNzRGVmLmEgXG4gICAgICAgIC8vIH0pO1xuICAgICAgICBjb2RlR2VuRnVuY0RlZihmdW5jRGVmLCBnbG9iYWxFbnYpLmZvckVhY2goZnVuY3Rpb24gKGZ1bmNXYXNtKSB7XG4gICAgICAgICAgICBjbGFzc1dhc20ucHVzaChmdW5jV2FzbSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBjbGFzc1dhc20uam9pbihcIlxcblwiKTtcbn1cbmZ1bmN0aW9uIGNvZGVHZW5GdW5jRGVmKGZ1bmNEZWYsIGdsb2JhbEVudikge1xuICAgIC8vIHByZXBhcmUgdGhlIGxvY2FsIGVudmlyb25tZW50XG4gICAgdmFyIGxvY2FsRW52ID0gY3JlYXRlRW1wdHlMb2NhbEVudigpO1xuICAgIGxvY2FsRW52LmlzRnVuYyA9IHRydWU7XG4gICAgZnVuY0RlZi5wYXJhbXMubWFwKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIGxvY2FsRW52LnZhcnMuc2V0KHAubmFtZSwgdHJ1ZSk7XG4gICAgfSk7XG4gICAgZnVuY0RlZi52YXJJbml0cy5tYXAoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgbG9jYWxFbnYudmFycy5zZXQodi5uYW1lLCB0cnVlKTtcbiAgICB9KTtcbiAgICAvLyBwYXJhbXNcbiAgICB2YXIgcGFyYW1zID0gZnVuY0RlZi5wYXJhbXMubWFwKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHJldHVybiBcIihwYXJhbSAkXCIuY29uY2F0KHAubmFtZSwgXCIgaTMyKVwiKTtcbiAgICB9KS5qb2luKCcgJyk7XG4gICAgLy8gaW5pdCBsb2NhbCB2YXJpYWJsZXNcbiAgICB2YXIgbG9jYWxWYXJJbml0ID0gZnVuY0RlZi52YXJJbml0cy5tYXAoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgcmV0dXJuIFwiKGxvY2FsICRcIi5jb25jYXQodi5uYW1lLCBcIiBpMzIpXFxuKGxvY2FsLnNldCAkXCIpLmNvbmNhdCh2Lm5hbWUsIFwiIFwiKS5jb25jYXQoY29kZUdlbkxpdGVyYWwodi5pbml0TGl0ZXJhbCksIFwiKVwiKTtcbiAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAvLyBnZW5lcmF0ZSBib2R5IHN0YXRlbWVudHNcbiAgICB2YXIgYm9keSA9IGNvZGVHZW5Cb2R5KGZ1bmNEZWYuc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgIC8vIHJldHVybiB0Z2UgZnVuY3Rpb24gZGVmaW5pdGlvbiBpbiBXQVNNXG4gICAgLy8gcmV0dXJuIFtgXFxuKGZ1bmMgJCR7ZnVuY0RlZi5uYW1lfSAke3BhcmFtc30gKHJlc3VsdCBpMzIpICR7bG9jYWxWYXJJbml0fVxcbiR7Ym9keS5qb2luKCdcXG4nKX0pYF1cbiAgICAvLyByZXR1cm4gW2AoZnVuYyAkJHtmdW5jRGVmLm5hbWV9ICR7cGFyYW1zfSAocmVzdWx0IGkzMilcXG4obG9jYWwgJGxhc3QgaTMyKVxcbiR7bG9jYWxWYXJJbml0fVxcbiR7Ym9keS5qb2luKCdcXG4nKX1cXG4oaTMyLmNvbnN0IDApKWBdXG4gICAgcmV0dXJuIFtcIihmdW5jICRcIi5jb25jYXQoZnVuY0RlZi5uYW1lLCBcIiBcIikuY29uY2F0KHBhcmFtcywgXCIgKHJlc3VsdCBpMzIpXFxuKGxvY2FsICRsYXN0IGkzMilcIikuY29uY2F0KGxvY2FsVmFySW5pdCwgXCJcXG5cIikuY29uY2F0KGJvZHkuam9pbignXFxuJyksIFwiXFxuKGkzMi5jb25zdCAwKSlcXG5cIildO1xufVxuZnVuY3Rpb24gY29kZUdlbkxpdGVyYWwobGl0ZXJhbCkge1xuICAgIHN3aXRjaCAobGl0ZXJhbC50YWcpIHtcbiAgICAgICAgY2FzZSBcIm51bVwiOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5jb25zdCBcIi5jb25jYXQobGl0ZXJhbC52YWx1ZSwgXCIpXCIpO1xuICAgICAgICBjYXNlIFwiYm9vbFwiOlxuICAgICAgICAgICAgaWYgKGxpdGVyYWwudmFsdWUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5jb25zdCAxKVwiO1xuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5jb25zdCAwKVwiO1xuICAgICAgICBjYXNlIFwibm9uZVwiOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5jb25zdCAwKVwiO1xuICAgIH1cbn1cbi8vIHNob3VsZCB1c2UgbG9jYWwgZW52aXJvbm1lbnQgaW5zdGVhZCBvZiBnbG9iYWwgZW52aXJvbm1lbnRcbmZ1bmN0aW9uIGNvZGVHZW5JZChpZCwgR2xvY2FsRW52LCBsb2NhbEVudikge1xuICAgIGlmIChpZC50YWcgIT09ICdpZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ09NUElMRSBFUlJPUjogaW5wdXQgdG8gY29kZUdlbiBJZCBzaG91bGQgYmUgYW4gaWQgZXhwclwiKTtcbiAgICB9XG4gICAgLy8gVGhlIHR5cGUgY2hlY2tlciBoYXMgYWxyZWFkeSBtYWtlIHN1cmUgdGhlIHZhcmlhYmxlIGlzIGRlZmluZWQuXG4gICAgaWYgKGxvY2FsRW52LnZhcnMuaGFzKGlkLm5hbWUpKSB7XG4gICAgICAgIHJldHVybiBcIihsb2NhbC5nZXQgJFwiLmNvbmNhdChpZC5uYW1lLCBcIilcIik7XG4gICAgfVxuICAgIHJldHVybiBcIihnbG9iYWwuZ2V0ICRcIi5jb25jYXQoaWQubmFtZSwgXCIpXCIpO1xufVxuIiwiaW1wb3J0IHsgcGFyc2VyIH0gZnJvbSBcImxlemVyLXB5dGhvblwiO1xuaW1wb3J0IHsgQmluT3AsIFVuaU9wIH0gZnJvbSAnLi9hc3QnO1xuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlQXJncyhjLCBzKSB7XG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICB3aGlsZSAoYy5uZXh0U2libGluZygpKSB7XG4gICAgICAgIGlmIChjLnR5cGUubmFtZSA9PT0gJyknKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBhcmdzLnB1c2godHJhdmVyc2VFeHByKGMsIHMpKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgIH1cbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiBhcmdzO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlRXhwcihjLCBzKSB7XG4gICAgc3dpdGNoIChjLnR5cGUubmFtZSkge1xuICAgICAgICBjYXNlIFwiTnVtYmVyXCI6IC8vIGVnLiAnMSdcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdGFnOiBcImxpdGVyYWxcIixcbiAgICAgICAgICAgICAgICBsaXRlcmFsOiB7XG4gICAgICAgICAgICAgICAgICAgIHRhZzogXCJudW1cIixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IE51bWJlcihzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIGNhc2UgJ0Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0YWc6IFwibGl0ZXJhbFwiLFxuICAgICAgICAgICAgICAgIGxpdGVyYWw6IHtcbiAgICAgICAgICAgICAgICAgICAgdGFnOiBcImJvb2xcIixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykgPT09IFwiVHJ1ZVwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgY2FzZSBcIk5vbmVcIjpcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJsaXRlcmFsXCIsIGxpdGVyYWw6IHsgdGFnOiBcIm5vbmVcIiB9IH07XG4gICAgICAgIGNhc2UgXCJWYXJpYWJsZU5hbWVcIjogLy8gZS5nLiAneCdcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJpZFwiLCBuYW1lOiBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pIH07XG4gICAgICAgIGNhc2UgXCJzZWxmXCI6IC8vIG5vdCBzdXJlIGlmIHRoaXMgc2hvdWxkIGJlIGhhbmRsZWQgbGlrZSB0aGlzXG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiaWRcIiwgbmFtZTogXCJzZWxmXCIgfTtcbiAgICAgICAgY2FzZSBcIkNhbGxFeHByZXNzaW9uXCI6IC8vIGUuZy4gbWF4KHgsIHkpLCBhYnMoeCksIGYoKVxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7IC8vIFwiTWVtYmVyRXhwcmVzc2lvblwiIG9yIFwiVmFyaWFibGVOYW1lXCJcbiAgICAgICAgICAgIGlmIChjLm5hbWUgPT09IFwiTWVtYmVyRXhwcmVzc2lvblwiKSB7XG4gICAgICAgICAgICAgICAgYy5sYXN0Q2hpbGQoKTsgLy8gXCJQcm9wZXJ0eU5hbWVcIlxuICAgICAgICAgICAgICAgIHZhciBwTmFtZV8xID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICAgICAgICAgICAgICBjLnBhcmVudCgpOyAvLyBnZXQgYmFjayB0byBcIk1lbWJlckV4cHJlc3Npb25cIlxuICAgICAgICAgICAgICAgIHZhciBvYmpfMSA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqXzEudGFnICE9PSBcImdldGZpZWxkXCIpIHsgLy8gVmlzaXRpbmcgTWVtYmVyRXhwcmVzc2lvbiBzaG91bGQgYWx3YXlzIGdldHMgYSBnZXRmaWVsZCByZXR1cm4uXG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiVGhlIG9iamVjdCBoYXMgYW4gaW5jb3JyZWN0IHRhZy5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJBcmdMaXN0XCJcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHRyYXZlcnNlQXJncyhjLCBzKTtcbiAgICAgICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIC8vIFdlIHJldHVybiBvYmoub2JqIGJlY2F1c2UgdGhlIG9iaiBpcyBhY3R1YWxseSBub3QgYSBnZXRmaWVsZC5cbiAgICAgICAgICAgICAgICByZXR1cm4geyB0YWc6IFwibWV0aG9kXCIsIG9iajogb2JqXzEub2JqLCBhcmdzOiBhcmdzLCBuYW1lOiBwTmFtZV8xIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBcIlZhcmlhYmxlTmFtZVwiXG4gICAgICAgICAgICAgICAgdmFyIGNhbGxOYW1lID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICAgICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiQXJnTGlzdFwiXG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB0cmF2ZXJzZUFyZ3MoYywgcyk7XG4gICAgICAgICAgICAgICAgYy5wYXJlbnQoKTsgLy8gYmFjayB0byBcIkNhbGxFeHByZXNzaW9uXCJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiY2FsbFwiLCBuYW1lOiBjYWxsTmFtZSwgYXJnczogYXJncyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICBjYXNlIFwiVW5hcnlFeHByZXNzaW9uXCI6XG4gICAgICAgICAgICAvLyBXQVJOSU5HOiBUaGlzIHVuaWFyeSBleHByZXNzaW9uIG9ubHkgZGVhbHMgd2l0aCB1bmlhcnkgb3BlcmF0b3IgZGlyZWN0bHkgZm9sbG93ZWQgYnkgYSBudW1iZXIgXG4gICAgICAgICAgICAvLyBlLmcuIC14LCAtICgxICsgMilcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBnbyBpbnRvIHRoZSB1bmFyeSBleHByZXNzb2luXG4gICAgICAgICAgICB2YXIgdW5pT3AgPSBzdHIydW5pb3Aocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSk7XG4gICAgICAgICAgICAvLyBwb3AgdW5pYXJ5IGV4cHJlc3Npb25cbiAgICAgICAgICAgIHZhciBudW0gPSBOdW1iZXIocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSk7XG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgICAgICAgICB2YXIgdW5pb25FeHByID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgICAgICAgICAgYy5wYXJlbnQoKTtcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJ1bmlvcFwiLCBvcDogdW5pT3AsIGV4cHI6IHVuaW9uRXhwciB9O1xuICAgICAgICBjYXNlIFwiQmluYXJ5RXhwcmVzc2lvblwiOiAvLyBlLmcuIDEgKyAyXG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gZ28gaW50byBiaW5hcnkgZXhwcmVzc2lvblxuICAgICAgICAgICAgdmFyIGxlZnQgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgICAgICAgICB2YXIgb3AgPSBzdHIyYmlub3Aocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSk7XG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgICAgICAgICB2YXIgcmlnaHQgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLnBhcmVudCgpOyAvLyBwb3AgdGhlIGJpbmFyeVxuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImJpbm9wXCIsIG9wOiBvcCwgbGVmdDogbGVmdCwgcmlnaHQ6IHJpZ2h0IH07XG4gICAgICAgIGNhc2UgXCJNZW1iZXJFeHByZXNzaW9uXCI6IC8vIGV4LiByMi5uXG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCJDYWxsRXhwcmVzc2lvblwiIG9yIFwiVmFyaWFibGVOYW1lXCJcbiAgICAgICAgICAgIHZhciBvYmogPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiLlwiXG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiUHJvcGVydHlOYW1lXCJcbiAgICAgICAgICAgIHZhciBwTmFtZSA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImdldGZpZWxkXCIsIG9iajogb2JqLCBuYW1lOiBwTmFtZSB9O1xuICAgICAgICBjYXNlIFwiUGFyZW50aGVzaXplZEV4cHJlc3Npb25cIjpcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyB2aXNpdCBcIihcIlxuICAgICAgICAgICAgYy5uZXh0U2libGluZygpOyAvLyB2aXNpdCB0aGUgaW5uZXIgZXhwcmVzc2lvblxuICAgICAgICAgICAgdmFyIGV4cHIgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLnBhcmVudDtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc3RyaW5naWZ5VHJlZShjLCBzLCAyKSk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQQVJTRSBFUlJPUjogQ291bGQgbm90IHBhcnNlIGV4cHIgYXQgXCIgKyBjLmZyb20gKyBcIiBcIiArIGMudG8gKyBcIjogXCIgKyBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICB9XG59XG4vKlxuICogQSBmdW5jdGlvbiB0byBwYXJzZSBvbmUgc3RhdGVtZW50XG4gKiBAaW5wdXQgYzogYSB0cmVlY29yc29yXG4gKiBAaW5wdXQgczogdGhlIG9yaWdpbmFsIGlucHV0IHN0cmluZ1xuICogQGlucHV0IGVudjogZW52aXJvbm1lbnQgdmFyaWFibGVzIChpZiB3ZSBhcmUgZ29pbmcgdG8gdHJhdmVyc2UgYSBmdW5jLClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlU3RtdChjLCBzKSB7XG4gICAgc3dpdGNoIChjLm5vZGUudHlwZS5uYW1lKSB7XG4gICAgICAgIGNhc2UgXCJBc3NpZ25TdGF0ZW1lbnRcIjogLy8gYSA9IDEsIGIgPSAyIG9yIHZhciBJbml0XG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCJWYXJpYWJsZU5hbWVcIiBvciBcIk1lbWJlckV4cHJlc3Npb25cIlxuICAgICAgICAgICAgLy8gZ2V0IGxocyBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgbmFtZSA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIHZhciB2YXJpYWJsZSA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgICAgICAgICB2YXJpYWJsZSA9IHZhcmlhYmxlLnNwbGl0KFwiLlwiKVswXTsgLy8gVGhpcyBvbmx5IHRlbGxzIHRoZSBpbml0aWFsIHZhcmlhYmxlID0+IHNlbGYueSBhcyBzZWxmXG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiQXNzaWduT3BcIlxuICAgICAgICAgICAgYy5uZXh0U2libGluZygpOyAvLyByaHMgZXhwcmVzc2lvblxuICAgICAgICAgICAgdmFyIHZhbHVlID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgICAgICAgICAgYy5wYXJlbnQoKTtcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJhc3NpZ25cIiwgbmFtZTogbmFtZSwgdmFyaWFibGU6IHZhcmlhYmxlLCB2YWx1ZTogdmFsdWUgfTtcbiAgICAgICAgY2FzZSBcIkV4cHJlc3Npb25TdGF0ZW1lbnRcIjpcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgICAgICAgICAgdmFyIGV4cHIgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImV4cHJcIiwgZXhwcjogZXhwciB9O1xuICAgICAgICBjYXNlIFwiUmV0dXJuU3RhdGVtZW50XCI6XG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHZhciByZXRFeHByID0geyB0YWc6IFwibGl0ZXJhbFwiLCBsaXRlcmFsOiB7IHRhZzogXCJub25lXCIgfSB9O1xuICAgICAgICAgICAgaWYgKGMudHlwZS5uYW1lICE9PSAn4pqgJykgeyAvLyByZXR1cm4gTm9uZVxuICAgICAgICAgICAgICAgIHJldEV4cHIgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcInJldHVyblwiLCBleHByOiByZXRFeHByIH07XG4gICAgICAgIGNhc2UgXCJQYXNzU3RhdGVtZW50XCI6XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwicGFzc1wiIH07XG4gICAgICAgIGNhc2UgXCJJZlN0YXRlbWVudFwiOlxuICAgICAgICAgICAgcmV0dXJuIHRyYXZlcnNlSWYoYywgcyk7XG4gICAgICAgIGNhc2UgXCJXaGlsZVN0YXRlbWVudFwiOlxuICAgICAgICAgICAgcmV0dXJuIHRyYXZlcnNlV2hpbGUoYywgcyk7XG4gICAgICAgIGNhc2UgXCJDbGFzc0RlZmluaXRpb25cIjpcbiAgICAgICAgICAgIHJldHVybiB0cmF2ZXJzZUNsYXNzRGVmKGMsIHMpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IHBhcnNlIHN0bXQgYXQgXCIgKyBjLm5vZGUuZnJvbSArIFwiIFwiICsgYy5ub2RlLnRvICsgXCI6IFwiICsgcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSk7XG4gICAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlUHJvZ3JhbShjLCBzKSB7XG4gICAgdmFyIHZhckluaXRzID0gW107XG4gICAgdmFyIGNsYXNzRGVmcyA9IFtdO1xuICAgIHZhciBmdW5jRGVmcyA9IFtdOyAvLyBubyBGdW5jRGVmIGZvciBQQTNcbiAgICB2YXIgc3RtdHMgPSBbXTsgLy8gY2xhc3MgZGVmaW5pdGlvbnMgYXJlIGluY2x1ZGVkIGhlcmVcbiAgICBzd2l0Y2ggKGMubm9kZS50eXBlLm5hbWUpIHtcbiAgICAgICAgY2FzZSBcIlNjcmlwdFwiOlxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgICAgICAvLyBwYXJzZSBjbGFzcyBkZWZpbml0aW9ucyBhbmQgdmFyaWFibGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFySW5pdChjKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXJJbml0cy5wdXNoKHRyYXZlcnNlVmFySW5pdChjLCBzKSk7IC8vIHBhcnNlIHZhcmlhYmxlIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGlzRnVuY0RlZihjKSkge1xuICAgICAgICAgICAgICAgICAgICBmdW5jRGVmcy5wdXNoKHRyYXZlcnNlRnVuY0RlZihjLCBzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGlzQ2xhc3NEZWYoYykpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NEZWZzLnB1c2godHJhdmVyc2VDbGFzc0RlZihjLCBzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgICAgICAgICAgaWYgKGlzVmFySW5pdChjKSB8fCBpc0Z1bmNEZWYoYykgfHwgaXNDbGFzc0RlZihjKSkgeyAvLyBubyBuZXh0IHNpYmxpbmcgJiYgbm8gc3RtdHNcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YXJJbml0czogdmFySW5pdHMsIGNsYXNzRGVmczogY2xhc3NEZWZzLCBmdW5jRGVmczogZnVuY0RlZnMsIHN0bXRzOiBzdG10cyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcGFyc2Ugc3RhdGVtZW50c1xuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIGlmIChpc1ZhckluaXQoYykgfHwgaXNGdW5jRGVmKGMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiB2YXIgaW5pdCBhbmQgZnVuYyBkZWYgc2hvdWxkIGdvIGJlZm9yZSBzdGF0ZW1lbnRzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdG10cy5wdXNoKHRyYXZlcnNlU3RtdChjLCBzKSk7XG4gICAgICAgICAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdmFySW5pdHM6IHZhckluaXRzLCBjbGFzc0RlZnM6IGNsYXNzRGVmcywgZnVuY0RlZnM6IGZ1bmNEZWZzLCBzdG10czogc3RtdHMgfTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBwYXJzZSBwcm9ncmFtIGF0IFwiICsgYy5ub2RlLmZyb20gKyBcIiBcIiArIGMubm9kZS50byk7XG4gICAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHNvdXJjZSkge1xuICAgIHZhciB0ID0gcGFyc2VyLnBhcnNlKHNvdXJjZSk7XG4gICAgLy8gY29uc29sZS5sb2coXCJQYXJzZWQgU291cmNlIENvZGU6XCIpO1xuICAgIC8vIGNvbnNvbGUubG9nKHN0cmluZ2lmeVRyZWUodC5jdXJzb3IoKSwgc291cmNlLCAwKSk7XG4gICAgLy8gY29uc29sZS5sb2coXCJcXG5cIik7XG4gICAgcmV0dXJuIHRyYXZlcnNlUHJvZ3JhbSh0LmN1cnNvcigpLCBzb3VyY2UpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY0RlZihjKSB7XG4gICAgcmV0dXJuIGMudHlwZS5uYW1lID09PSAnRnVuY3Rpb25EZWZpbml0aW9uJztcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc0NsYXNzRGVmKGMpIHtcbiAgICByZXR1cm4gYy50eXBlLm5hbWUgPT09ICdDbGFzc0RlZmluaXRpb24nO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFySW5pdChjKSB7XG4gICAgaWYgKGMudHlwZS5uYW1lICE9PSAnQXNzaWduU3RhdGVtZW50Jykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICB2YXIgaXNUeXBlRGVmID0gKGMubm9kZS50eXBlLm5hbWUgPT09ICdUeXBlRGVmJyk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4gaXNUeXBlRGVmO1xufVxuLy8gYyBpcyBub3cgaW4gQXNzaWduU3RhdGVtZW50XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VWYXJJbml0KGMsIHMpIHtcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gVmFyaWFibGVOYW1lXG4gICAgdmFyIHRWYXIgPSB0cmF2ZXJzZVR5cGVkVmFyKGMsIHMpO1xuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gVHlwZURlZlxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gQXNzaWduT3BcbiAgICB2YXIgbGl0ZXJhbCA9IHRyYXZlcnNlTGl0ZXJhbChjLCBzKTsgLy8gTnVtYmVyXG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4geyBuYW1lOiB0VmFyLm5hbWUsIHR5cGU6IHRWYXIudHlwZSwgaW5pdExpdGVyYWw6IGxpdGVyYWwgfTtcbn1cbi8vIFRoZXJlIHdvdWxkIGJlIG11Y2ggbW9yZSB0eXBlcyAoY2xhc3NlcykuXG5leHBvcnQgZnVuY3Rpb24gbm9kZTJ0eXBlKGMsIHMpIHtcbiAgICB2YXIgdHlwZVN0ciA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgc3dpdGNoICh0eXBlU3RyKSB7XG4gICAgICAgIGNhc2UgJ2ludCc6XG4gICAgICAgICAgICByZXR1cm4gXCJpbnRcIjtcbiAgICAgICAgY2FzZSAnYm9vbCc6XG4gICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XG4gICAgICAgIGNhc2UgJ05vbmUnOlxuICAgICAgICAgICAgcmV0dXJuIFwiTm9uZVwiO1xuICAgICAgICBkZWZhdWx0OiAvLyBXZSdsbCBjaGVjayBpZiB0aGUgdHlwZSBleGlzdHMgaW4gdGhlIHR5cGUgY2hlY2tlclxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0YWc6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgY2xhc3M6IHR5cGVTdHJcbiAgICAgICAgICAgIH07XG4gICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihgUEFSU0UgRVJST1I6IHVua25vd24gdHlwZSAke3R5cGVTdHJ9YCk7XG4gICAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlVHlwZWRWYXIoYywgcykge1xuICAgIHZhciBuYW1lID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTsgLy8gXCJWYXJpYWJsZU5hbWVcIlxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gVHlwZURlZlxuICAgIGMuZmlyc3RDaGlsZCgpOyAvLyA6XG4gICAgYy5uZXh0U2libGluZygpOyAvLyBWYXJpYWJsZU5hbWVcbiAgICB2YXIgdHlwZSA9IG5vZGUydHlwZShjLCBzKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiB7IG5hbWU6IG5hbWUsIHR5cGU6IHR5cGUgfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0cmF2ZXJzZUxpdGVyYWwoYywgcykge1xuICAgIHZhciB2YWxTdHIgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pO1xuICAgIHN3aXRjaCAoYy50eXBlLm5hbWUpIHtcbiAgICAgICAgY2FzZSAnQm9vbGVhbic6XG4gICAgICAgICAgICBpZiAodmFsU3RyID09ICdGYWxzZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiYm9vbFwiLCB2YWx1ZTogZmFsc2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJib29sXCIsIHZhbHVlOiB0cnVlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIGNhc2UgJ051bWJlcic6XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwibnVtXCIsIHZhbHVlOiBwYXJzZUludCh2YWxTdHIpIH07XG4gICAgICAgIGNhc2UgJ05vbmUnOlxuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcIm5vbmVcIiB9O1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJQQVJTRSBFUlJPUjogdW5zdXBwb3J0aW5nIGxpdGVyYWwgdHlwZVwiKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0cmF2ZXJzZUNsYXNzRGVmKGMsIHMpIHtcbiAgICB2YXIgY2xzID0ge1xuICAgICAgICB0YWc6IFwiY2xhc3NcIixcbiAgICAgICAgbmFtZTogXCJcIixcbiAgICAgICAgZmllbGRzOiBbXSxcbiAgICAgICAgbWV0aG9kczogW10sIC8vIGNsYXNzIGZ1bmN0aW9uc1xuICAgIH07XG4gICAgYy5maXJzdENoaWxkKCk7IC8vIGNsYXNzIG5vZGVcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIGNsYXNzIG5hbWVcbiAgICBjbHMubmFtZSA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7IC8vIGFzc2lnbiBjbGFzcyBuYW1lXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBcIkFyZ2xpc3RcIiA9PiBmaXhlZCB0byBiZSBvYmplY3RcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiQm9keVwiXG4gICAgYy5maXJzdENoaWxkKCk7IC8vIFwiOlwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyByZWFjaCB0aGUgZmlzcnQgc3RhdGVtZW50IGluIHRoZSBib2R5XG4gICAgdmFyIGNvZGUgPSB0cmF2ZXJzZUNsYXNzQm9keShjLCBzKTtcbiAgICBjbHMuZmllbGRzID0gY29kZS52YXJJbml0cztcbiAgICBjbHMubWV0aG9kcyA9IGNvZGUuZnVuY0RlZnM7XG4gICAgYy5wYXJlbnQoKTsgLy8gYmFjayB0byBcIkJvZHlcIlxuICAgIGMucGFyZW50KCk7IC8vIGJhY2sgdG8gXCJDbGFzc0RlZmluaXRpb25cIlxuICAgIHJldHVybiBjbHM7XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VNZXRoRGVmKGMsIHMpIHtcbiAgICB2YXIgZnVuYyA9IHtcbiAgICAgICAgbmFtZTogXCJcIixcbiAgICAgICAgcGFyYW1zOiBudWxsLFxuICAgICAgICByZXRUeXBlOiBcIk5vbmVcIixcbiAgICAgICAgdmFySW5pdHM6IG51bGwsXG4gICAgICAgIHN0bXRzOiBudWxsXG4gICAgfTtcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCJkZWZcIlxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gbWV0aG9kIG5hbWVcbiAgICBmdW5jLm5hbWUgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pO1xuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJQYXJhbUxpc3RcIiA9PiBhdCBsZWFzdCAxIHBhcmFtZXRlcnMgKHNlbGYpXG4gICAgZnVuYy5wYXJhbXMgPSB0cmF2ZXJzZU1ldGhQYXJhbXMoYywgcyk7XG4gICAgYy5uZXh0U2libGluZygpOyAvLyBcIlR5cGVEZWZcIiBvciBcIkJvZHlcIlxuICAgIC8vIGNoZWNrIGlmIHRoZSBtZXRob2QgcHJvdmlkZXMgYSByZXR1cm4gdHlwZVxuICAgIGlmIChjLnR5cGUubmFtZSA9PT0gJ1R5cGVEZWYnKSB7XG4gICAgICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgICAgICBmdW5jLnJldFR5cGUgPSBub2RlMnR5cGUoYywgcyk7XG4gICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJCb2R5XCJcbiAgICB9XG4gICAgYy5maXJzdENoaWxkKCk7IC8vIFwiOlwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyB0aGUgZmlyc3QgYm9keSBzdGF0ZW1lbnRcbiAgICB2YXIgY29kZSA9IHRyYXZlcnNlTWV0aEJvZHkoYywgcyk7IC8vIFRoaXMgbGluZSBpcyB0aGUgb25seSBkaWZmZXJlbmNlXG4gICAgZnVuYy52YXJJbml0cyA9IGNvZGUudmFySW5pdHM7XG4gICAgZnVuYy5zdG10cyA9IGNvZGUuc3RtdHM7XG4gICAgYy5wYXJlbnQoKTsgLy8gYmFjayB0byBcIkJvZHlcIlxuICAgIGMucGFyZW50KCk7IC8vIGJhY2sgdG8gXCJDbGFzc0RlZmluaXRpb25cIlxuICAgIHJldHVybiBmdW5jO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlRnVuY0RlZihjLCBzKSB7XG4gICAgdmFyIGZ1bmMgPSB7XG4gICAgICAgIG5hbWU6IFwiXCIsXG4gICAgICAgIHBhcmFtczogbnVsbCxcbiAgICAgICAgcmV0VHlwZTogXCJOb25lXCIsXG4gICAgICAgIHZhckluaXRzOiBudWxsLFxuICAgICAgICBzdG10czogbnVsbFxuICAgIH07XG4gICAgLy8gZnVuY3Rpb24gbmFtZVxuICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBmdW5jLm5hbWUgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pO1xuICAgIC8vIHBhcmFtbGlzdCAoMCBvciBtb3JlKVxuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBmdW5jLnBhcmFtcyA9IHRyYXZlcnNlRnVuY1BhcmFtcyhjLCBzKTtcbiAgICAvLyByZXR1cm4gdHlwZSAoMCBvciBvbmUpXG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGlmIChjLnR5cGUubmFtZSA9PT0gJ1R5cGVEZWYnKSB7XG4gICAgICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgICAgICBmdW5jLnJldFR5cGUgPSBub2RlMnR5cGUoYywgcyk7XG4gICAgICAgIGMucGFyZW50KCk7XG4gICAgfVxuICAgIC8vIHBhcnNlIGJvZHlcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgYy5maXJzdENoaWxkKCk7XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIHZhciBjb2RlID0gdHJhdmVyc2VGdW5jQm9keShjLCBzKTtcbiAgICBmdW5jLnZhckluaXRzID0gY29kZS52YXJJbml0cztcbiAgICBmdW5jLnN0bXRzID0gY29kZS5zdG10cztcbiAgICBjLnBhcmVudCgpO1xuICAgIGMucGFyZW50KCk7XG4gICAgcmV0dXJuIGZ1bmM7XG59XG4vLyBzaW1pbGFyIHRvIHRyYXZlcnNlRnVuY1BhcmFtcywgYnV0IGVzY2FwZSB0aGUgc2VsZiBwYXJhbWV0ZXJcbmZ1bmN0aW9uIHRyYXZlcnNlTWV0aFBhcmFtcyhjLCBzKSB7XG4gICAgdmFyIHBhcmFtcyA9IFtdO1xuICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBcIihcIlxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJzZWxmXCJcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiVHlwZURlZlwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBcIixcIlxuICAgIGRvIHtcbiAgICAgICAgaWYgKHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykgPT09ICcpJylcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBpZiAocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gJywnKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIHBhcmFtcy5wdXNoKHRyYXZlcnNlVHlwZWRWYXIoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4gcGFyYW1zO1xufVxuZnVuY3Rpb24gdHJhdmVyc2VGdW5jUGFyYW1zKGMsIHMpIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgYy5maXJzdENoaWxkKCk7XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykgPT09ICcpJylcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBpZiAocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gJywnKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIHBhcmFtcy5wdXNoKHRyYXZlcnNlVHlwZWRWYXIoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4gcGFyYW1zO1xufVxuZnVuY3Rpb24gdHJhdmVyc2VDbGFzc0JvZHkoYywgcykge1xuICAgIHZhciB2YXJJbml0cyA9IFtdO1xuICAgIHZhciBmdW5jRGVmcyA9IFtdO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKGlzVmFySW5pdChjKSkge1xuICAgICAgICAgICAgdmFySW5pdHMucHVzaCh0cmF2ZXJzZVZhckluaXQoYywgcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Z1bmNEZWYoYykpIHtcbiAgICAgICAgICAgIGZ1bmNEZWZzLnB1c2godHJhdmVyc2VNZXRoRGVmKGMsIHMpKTtcbiAgICAgICAgfVxuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgLy8gQSBjbGFzcyBjb25zaXN0cyBvZiB2YXJpYWJsZSBpbml0aWFsaXphdGlvbnMgYW5kIG1ldGhvZCBkZWZpbml0aW9ucy5cbiAgICByZXR1cm4geyB2YXJJbml0czogdmFySW5pdHMsIGNsYXNzRGVmczogW10sIGZ1bmNEZWZzOiBmdW5jRGVmcywgc3RtdHM6IFtdIH07XG59XG4vLyBBIG1ldGhvZCBib2R5IGNvbnNpc3RzIHZhcmlhYmxlIGRlZmluaXRpb25zIGFuZCBzdGF0ZW1lbnRzLlxuZnVuY3Rpb24gdHJhdmVyc2VNZXRoQm9keShjLCBzKSB7XG4gICAgdmFyIHZhckluaXRzID0gW107XG4gICAgdmFyIHN0bXRzID0gW107XG4gICAgLy8gdHJhdmVyc2UgdmFyaWFibGUgaW5pdGlhbGl6YXRpb25zXG4gICAgZG8ge1xuICAgICAgICBpZiAoIWlzVmFySW5pdChjKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdmFySW5pdHMucHVzaCh0cmF2ZXJzZVZhckluaXQoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgLy8gZ2V0IGFsbCBzdGF0ZW1lbnRcbiAgICBkbyB7XG4gICAgICAgIHN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgIHJldHVybiB7IHZhckluaXRzOiB2YXJJbml0cywgY2xhc3NEZWZzOiBbXSwgc3RtdHM6IHN0bXRzLCBmdW5jRGVmczogW10gfTtcbn1cbmZ1bmN0aW9uIHRyYXZlcnNlRnVuY0JvZHkoYywgcykge1xuICAgIHZhciB2YXJJbml0cyA9IFtdO1xuICAgIHZhciBzdG10cyA9IFtdO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKCFpc1ZhckluaXQoYykpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Z1bmNEZWYoYykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFUiBFUlJPOiBuZXN0ZWQgZnVuY3Rpb24gZGVmaW5pdGlvbiBpcyBub3QgYWxsb3dlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJJbml0cy5wdXNoKHRyYXZlcnNlVmFySW5pdChjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAvLyBnZXQgYWxsIHN0YXRlbWVudFxuICAgIGRvIHtcbiAgICAgICAgaWYgKGlzRnVuY0RlZihjKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0VSIEVSUk9SOiBuZXN0ZWQgZnVuY3Rpb24gZGVmaW5pdGlvbiBpcyBub3cgYWxsb3dlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNWYXJJbml0KGMpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQQVJTRSBFUlJPUjogVmFyaWFibGUgaW5pdGlhbGl6YXRpb24gc2hvdWxkIGdvIGJlZm9yZSBzdGF0ZW1lbnRzXCIpO1xuICAgICAgICB9XG4gICAgICAgIHN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgIHJldHVybiB7IHZhckluaXRzOiB2YXJJbml0cywgY2xhc3NEZWZzOiBbXSwgc3RtdHM6IHN0bXRzLCBmdW5jRGVmczogW10gfTtcbn1cbmZ1bmN0aW9uIHN0cjJ1bmlvcChvcFN0cikge1xuICAgIHN3aXRjaCAob3BTdHIpIHtcbiAgICAgICAgY2FzZSBcIi1cIjpcbiAgICAgICAgICAgIHJldHVybiBVbmlPcC5NaW51cztcbiAgICAgICAgY2FzZSBcIm5vdFwiOlxuICAgICAgICAgICAgcmV0dXJuIFVuaU9wLk5vdDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0UgRVJST1I6IHVuc3VwcG9ydGVkIHVuaWFyeSBvcGVyYXRvclwiKTtcbn1cbmZ1bmN0aW9uIHN0cjJiaW5vcChvcFN0cikge1xuICAgIHN3aXRjaCAob3BTdHIpIHtcbiAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5QbHVzO1xuICAgICAgICBjYXNlIFwiLVwiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLk1pbnVzO1xuICAgICAgICBjYXNlIFwiKlwiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLk11bDtcbiAgICAgICAgY2FzZSBcIi8vXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuRGl2O1xuICAgICAgICBjYXNlIFwiJVwiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLk1vZDtcbiAgICAgICAgY2FzZSBcIj09XCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuRXE7XG4gICAgICAgIGNhc2UgXCIhPVwiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLk5lcTtcbiAgICAgICAgY2FzZSBcIjw9XCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuU2VxO1xuICAgICAgICBjYXNlIFwiPj1cIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5MZXE7XG4gICAgICAgIGNhc2UgXCI8XCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuU21sO1xuICAgICAgICBjYXNlIFwiPlwiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLkxyZztcbiAgICAgICAgY2FzZSBcImlzXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuSXM7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiB1bmtub3duIGJpbmFyeSBvcGVyYXRvclwiKTtcbn1cbmZ1bmN0aW9uIHRyYXZlcnNlV2hpbGUoYywgcykge1xuICAgIGMuZmlyc3RDaGlsZCgpOyAvLyB3aGlsZVxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gY29uZFxuICAgIHZhciBjb25kID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgIHZhciBzdG10cyA9IFtdO1xuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgZG8ge1xuICAgICAgICBzdG10cy5wdXNoKHRyYXZlcnNlU3RtdChjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIGMucGFyZW50KCk7XG4gICAgcmV0dXJuIHsgdGFnOiBcIndoaWxlXCIsIGNvbmQ6IGNvbmQsIHN0bXRzOiBzdG10cyB9O1xufVxuZnVuY3Rpb24gdHJhdmVyc2VJZihjLCBzKSB7XG4gICAgdmFyIGlmQ2xhdXNlID0ge1xuICAgICAgICB0YWc6IFwiaWZcIixcbiAgICAgICAgaWZPcDoge1xuICAgICAgICAgICAgY29uZDogbnVsbCxcbiAgICAgICAgICAgIHN0bXRzOiBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIGVsaWZPcDoge1xuICAgICAgICAgICAgY29uZDogbnVsbCxcbiAgICAgICAgICAgIHN0bXRzOiBudWxsLFxuICAgICAgICB9LFxuICAgICAgICBlbHNlT3A6IHtcbiAgICAgICAgICAgIHN0bXRzOiBudWxsXG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8vIGNoZWNrIGlmXG4gICAgYy5maXJzdENoaWxkKCk7IC8vIGlmXG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGlmQ2xhdXNlLmlmT3AuY29uZCA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgYy5maXJzdENoaWxkKCk7XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGlmQ2xhdXNlLmlmT3Auc3RtdHMgPSBbXTtcbiAgICBkbyB7XG4gICAgICAgIGlmQ2xhdXNlLmlmT3Auc3RtdHMucHVzaCh0cmF2ZXJzZVN0bXQoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICBpZiAoIWMubmV4dFNpYmxpbmcoKSkge1xuICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICByZXR1cm4gaWZDbGF1c2U7XG4gICAgfVxuICAgIC8vIGNoZWNrIGVsaWYgaWZcbiAgICBpZiAoYy50eXBlLm5hbWUgPT0gJ2VsaWYnKSB7XG4gICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgaWZDbGF1c2UuZWxpZk9wLmNvbmQgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgaWZDbGF1c2UuZWxpZk9wLnN0bXRzID0gW107XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGlmQ2xhdXNlLmVsaWZPcC5zdG10cy5wdXNoKHRyYXZlcnNlU3RtdChjLCBzKSk7XG4gICAgICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgIGlmICghYy5uZXh0U2libGluZygpKSB7XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIGlmQ2xhdXNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGNoZWNrIGVsc2VcbiAgICBpZiAoYy50eXBlLm5hbWUgPT0gJ2Vsc2UnKSB7XG4gICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgaWZDbGF1c2UuZWxzZU9wLnN0bXRzID0gW107XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGlmQ2xhdXNlLmVsc2VPcC5zdG10cy5wdXNoKHRyYXZlcnNlU3RtdChjLCBzKSk7XG4gICAgICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgICAgIGMucGFyZW50KCk7XG4gICAgfVxuICAgIGMucGFyZW50KCk7XG4gICAgcmV0dXJuIGlmQ2xhdXNlO1xufVxuLypcbiAqIEhlbHBlciBGdW5jdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ2lmeVRyZWUodCwgc291cmNlLCBkKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgdmFyIHNwYWNlcyA9IFwiIFwiLnJlcGVhdChkICogMik7XG4gICAgc3RyICs9IHNwYWNlcyArIHQudHlwZS5uYW1lO1xuICAgIGlmIChbXCJOdW1iZXJcIiwgXCJDYWxsRXhwcmVzc2lvblwiLCBcIkJpbmFyeUV4cHJlc3Npb25cIiwgXCJVbmFyeUV4cHJlc3Npb25cIl0uaW5jbHVkZXModC50eXBlLm5hbWUpKSB7XG4gICAgICAgIHN0ciArPSBcIi0tPlwiICsgc291cmNlLnN1YnN0cmluZyh0LmZyb20sIHQudG8pO1xuICAgIH1cbiAgICBzdHIgKz0gXCJcXG5cIjtcbiAgICBpZiAodC5maXJzdENoaWxkKCkpIHtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgc3RyICs9IHN0cmluZ2lmeVRyZWUodCwgc291cmNlLCBkICsgMSk7XG4gICAgICAgIH0gd2hpbGUgKHQubmV4dFNpYmxpbmcoKSk7XG4gICAgICAgIHQucGFyZW50KCk7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG4iLCIvLyBUaGlzIGlzIGEgbWFzaHVwIG9mIHR1dG9yaWFscyBmcm9tOlxuLy9cbi8vIC0gaHR0cHM6Ly9naXRodWIuY29tL0Fzc2VtYmx5U2NyaXB0L3dhYnQuanMvXG4vLyAtIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViQXNzZW1ibHkvVXNpbmdfdGhlX0phdmFTY3JpcHRfQVBJXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbnZhciBfX2dlbmVyYXRvciA9ICh0aGlzICYmIHRoaXMuX19nZW5lcmF0b3IpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBib2R5KSB7XG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcbiAgICByZXR1cm4gZyA9IHsgbmV4dDogdmVyYigwKSwgXCJ0aHJvd1wiOiB2ZXJiKDEpLCBcInJldHVyblwiOiB2ZXJiKDIpIH0sIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgICAgd2hpbGUgKF8pIHRyeSB7XG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG59O1xuaW1wb3J0IHdhYnQgZnJvbSAnd2FidCc7XG5pbXBvcnQgKiBhcyBjb21waWxlciBmcm9tICcuL2NvbXBpbGVyJztcbi8vIE5PVEUoam9lKTogVGhpcyBpcyBhIGhhY2sgdG8gZ2V0IHRoZSBDTEkgUmVwbCB0byBydW4uIFdBQlQgcmVnaXN0ZXJzIGEgZ2xvYmFsXG4vLyB1bmNhdWdodCBleG4gaGFuZGxlciwgYW5kIHRoaXMgaXMgbm90IGFsbG93ZWQgd2hlbiBydW5uaW5nIHRoZSBSRVBMXG4vLyAoaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9yZXBsLmh0bWwjcmVwbF9nbG9iYWxfdW5jYXVnaHRfZXhjZXB0aW9ucykuIE5vIHJlYXNvblxuLy8gaXMgZ2l2ZW4gZm9yIHRoaXMgaW4gdGhlIGRvY3MgcGFnZSwgYW5kIEkgaGF2ZW4ndCBzcGVudCB0aW1lIG9uIHRoZSBkb21haW5cbi8vIG1vZHVsZSB0byBmaWd1cmUgb3V0IHdoYXQncyBnb2luZyBvbiBoZXJlLiBJdCBkb2Vzbid0IHNlZW0gY3JpdGljYWwgZm9yIFdBQlRcbi8vIHRvIGhhdmUgdGhpcyBzdXBwb3J0LCBzbyB3ZSBwYXRjaCBpdCBhd2F5LlxuaWYgKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIG9sZFByb2Nlc3NPbl8xID0gcHJvY2Vzcy5vbjtcbiAgICBwcm9jZXNzLm9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgYXJnc1tfaV0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcmdzWzBdID09PSBcInVuY2F1Z2h0RXhjZXB0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvbGRQcm9jZXNzT25fMS5hcHBseShwcm9jZXNzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5leHBvcnQgZnVuY3Rpb24gcnVud2F0c3JjKHNvdXJjZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgd2FidEludGVyZmFjZSwgY29tcGlsZWQsIGltcG9ydE9iamVjdCwgd2FzbVNvdXJjZSwgbXlNb2R1bGUsIGFzQmluYXJ5LCB3YXNtTW9kdWxlLCByZXN1bHQ7XG4gICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIHdhYnQoKV07XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICB3YWJ0SW50ZXJmYWNlID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICBjb21waWxlZCA9IGNvbXBpbGVyLmNvbXBpbGUoc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0T2JqZWN0ID0gY29uZmlnLmltcG9ydE9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgd2FzbVNvdXJjZSA9IFwiKG1vZHVsZVxcbiAgICAoZnVuYyAkcHJpbnRfbnVtIChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJwcmludF9udW1cXFwiKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChmdW5jICRwcmludF9ib29sIChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJwcmludF9ib29sXFxcIikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkcHJpbnRfbm9uZSAoaW1wb3J0IFxcXCJpbXBvcnRzXFxcIiBcXFwicHJpbnRfbm9uZVxcXCIpIChwYXJhbSBpMzIpIChyZXN1bHQgaTMyKSlcXG4gICAgKGZ1bmMgJHByaW50IChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJwcmludFxcXCIpIChwYXJhbSBpMzIpIChyZXN1bHQgaTMyKSlcXG4gICAgKGZ1bmMgJGFicyAoaW1wb3J0IFxcXCJpbXBvcnRzXFxcIiBcXFwiYWJzXFxcIikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkbWF4IChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJtYXhcXFwiKSAocGFyYW0gaTMyKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChmdW5jICRtaW4gKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcIm1pblxcXCIpIChwYXJhbSBpMzIpIChwYXJhbSBpMzIpIChyZXN1bHQgaTMyKSlcXG4gICAgKGZ1bmMgJHBvdyAoaW1wb3J0IFxcXCJpbXBvcnRzXFxcIiBcXFwicG93XFxcIikgKHBhcmFtIGkzMikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAobWVtb3J5IChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJtZW1cXFwiKSAxKVxcbiAgICBcIi5jb25jYXQoY29tcGlsZWQud2FzbVNvdXJjZSwgXCJcXG4gIClcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid2FzbVNvdXJjZTogXCIuY29uY2F0KHdhc21Tb3VyY2UpKTtcbiAgICAgICAgICAgICAgICAgICAgbXlNb2R1bGUgPSB3YWJ0SW50ZXJmYWNlLnBhcnNlV2F0KFwidGVzdC53YXRcIiwgd2FzbVNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgIGFzQmluYXJ5ID0gbXlNb2R1bGUudG9CaW5hcnkoe30pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzQgLyp5aWVsZCovLCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShhc0JpbmFyeS5idWZmZXIsIGltcG9ydE9iamVjdCldO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgd2FzbU1vZHVsZSA9IF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gd2FzbU1vZHVsZS5pbnN0YW5jZS5leHBvcnRzLmV4cG9ydGVkX2Z1bmMoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsyIC8qcmV0dXJuKi8sIHJlc3VsdF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuIiwidmFyIF9fYXNzaWduID0gKHRoaXMgJiYgdGhpcy5fX2Fzc2lnbikgfHwgZnVuY3Rpb24gKCkge1xuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbih0KSB7XG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSlcbiAgICAgICAgICAgICAgICB0W3BdID0gc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdDtcbiAgICB9O1xuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcbmltcG9ydCB7IEJpbk9wLCBVbmlPcCB9IGZyb20gJy4vYXN0JztcbmV4cG9ydCBmdW5jdGlvbiBkZWVwQ29weVZhckVudihlbnYpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YXJzOiBuZXcgTWFwKGVudi52YXJzKSxcbiAgICAgICAgY2xhc3NNZXRob2RzOiBuZXcgTWFwKGVudi5jbGFzc01ldGhvZHMpLFxuICAgICAgICBjbGFzc0ZpZWxkczogbmV3IE1hcChlbnYuY2xhc3NGaWVsZHMpLFxuICAgICAgICBmdW5jczogbmV3IE1hcChlbnYuZnVuY3MpLFxuICAgICAgICByZXRUeXBlOiBlbnYucmV0VHlwZVxuICAgIH07XG59XG4vLyBpbml0aWFsaXplIGFuIGVudmlyb25tZW50IHN0dXJjdHVyZVxuZXhwb3J0IGZ1bmN0aW9uIG5ld1R5cGVFbnYoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdmFyczogbmV3IE1hcCgpLFxuICAgICAgICBjbGFzc01ldGhvZHM6IG5ldyBNYXAoKSxcbiAgICAgICAgY2xhc3NGaWVsZHM6IG5ldyBNYXAoKSxcbiAgICAgICAgZnVuY3M6IG5ldyBNYXAoKSxcbiAgICAgICAgcmV0VHlwZTogXCJOb25lXCJcbiAgICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwRW52KHByb2dyYW0pIHtcbiAgICB2YXIgZXZuID0gbmV3VHlwZUVudigpO1xuICAgIC8vIGdsb2JhbCB2YXJpYWJsZXNcbiAgICBwcm9ncmFtLnZhckluaXRzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgZXZuLnZhcnMuc2V0KHYubmFtZSwgdi50eXBlKTtcbiAgICB9KTtcbiAgICAvLyBjbGFzcyBkZWZpbml0aW9uc1xuICAgIHByb2dyYW0uY2xhc3NEZWZzLmZvckVhY2goZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgaWYgKHMudGFnICE9PSBcImNsYXNzXCIpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiRXJyb3I6IFRZUEUgRVJST1I6IG5vdCBhIGNsYXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRlZmluZSB0aGUgZmllbGRzIChuYW1lIDogdHlwZSlcbiAgICAgICAgdmFyIGZpZWxkcyA9IHMuZmllbGRzO1xuICAgICAgICB2YXIgZmllbGRNYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgIGZpZWxkcy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICBmaWVsZE1hcC5zZXQoZi5uYW1lLCBmLnR5cGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgZXZuLmNsYXNzRmllbGRzLnNldChzLm5hbWUsIGZpZWxkTWFwKTtcbiAgICAgICAgLy8gZGVmaW5lIHRoZSBtZXRob2RzIChuYW1lIDogYXJncyBhbmQgcmV0dXJuIHR5cGUpXG4gICAgICAgIHZhciBtZXRob2RzID0gcy5tZXRob2RzO1xuICAgICAgICB2YXIgbWV0aG9kTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIG1ldGhvZE1hcC5zZXQobS5uYW1lLCBbbS5wYXJhbXMubWFwKGZ1bmN0aW9uIChwKSB7IHJldHVybiBwLnR5cGU7IH0pLCBtLnJldFR5cGVdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGV2bi5jbGFzc01ldGhvZHMuc2V0KHMubmFtZSwgbWV0aG9kTWFwKTtcbiAgICAgICAgLy8gYWRkIHRoZSBjbGFzcyBpbml0aWFsaXphdGlvbiBmdW5jdGlvbnNcbiAgICAgICAgZXZuLmZ1bmNzLnNldChzLm5hbWUsIFtbXSwgeyB0YWc6IFwib2JqZWN0XCIsIGNsYXNzOiBzLm5hbWUgfV0pO1xuICAgIH0pO1xuICAgIC8vIGZ1bmN0aW9uIGRlZmluaXRpb25zXG4gICAgcHJvZ3JhbS5mdW5jRGVmcy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIGV2bi5mdW5jcy5zZXQoZi5uYW1lLCBbZi5wYXJhbXMubWFwKGZ1bmN0aW9uIChwKSB7IHJldHVybiBwLnR5cGU7IH0pLCBmLnJldFR5cGVdKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZXZuO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1Byb2dyYW0ocHJvZykge1xuICAgIHZhciBlbnYgPSBzZXR1cEVudihwcm9nKTtcbiAgICB2YXIgcHJvZ1R5cGVkID0ge1xuICAgICAgICB2YXJJbml0czogW10sXG4gICAgICAgIGNsYXNzRGVmczogW10sXG4gICAgICAgIGZ1bmNEZWZzOiBbXSxcbiAgICAgICAgc3RtdHM6IFtdXG4gICAgfTtcbiAgICAvLyBjaGVjayBnbG9iYWwgdmFyaWFibGUgPT4gVGhlIHJocyB2YWx1ZXMgc2hvdWxkIGhhdmUgY29ycmVjdCB0eXBlc1xuICAgIHByb2dUeXBlZC52YXJJbml0cyA9IHR5cGVDaGVja1ZhckluaXQocHJvZy52YXJJbml0cywgZW52KTtcbiAgICAvLyBjaGVjayBjbGFzcyBkZWZpbml0aW9uc1xuICAgIHByb2dUeXBlZC5jbGFzc0RlZnMgPSBwcm9nLmNsYXNzRGVmcy5tYXAoZnVuY3Rpb24gKGMpIHsgcmV0dXJuIHR5cGVDaGVja0NsYXNzRGVmKGMsIGVudik7IH0pO1xuICAgIC8vIGNoZWNrIGZ1bmN0aW9uIGRlZmluaXRpb25zXG4gICAgcHJvZ1R5cGVkLmZ1bmNEZWZzID0gcHJvZy5mdW5jRGVmcy5tYXAoZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHR5cGVDaGVja0Z1bmNEZWYoZiwgZW52KTsgfSk7XG4gICAgLy8gY2hlY2sgbWFpbiBib2R5XG4gICAgcHJvZ1R5cGVkLnN0bXRzID0gdHlwZUNoZWNrU3RtdHMocHJvZy5zdG10cywgZW52KTtcbiAgICByZXR1cm4gcHJvZ1R5cGVkO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1N0bXRzKHN0bXRzLCBlbnYpIHtcbiAgICB2YXIgdHlwZWRTdG10cyA9IFtdO1xuICAgIHN0bXRzLmZvckVhY2goZnVuY3Rpb24gKHN0bXQpIHtcbiAgICAgICAgc3dpdGNoIChzdG10LnRhZykge1xuICAgICAgICAgICAgY2FzZSBcImFzc2lnblwiOiAvLyBlLmcuIGEgPSAwXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHN0bXQgaXMgYW4gXCJpZFwiLCB3ZSB3b3VsZCBjaGVjayBvZiB0aGUgdmFyaWFibGUgZXhpc3RzLlxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBzdG10IGlzIGEgXCJnZXRmaWVsZFwiLCB3ZSB3b3VsZCBjaGVjayByZWN1cnNpdmVseSB1bnRpbCBpdCdzIGFuIFwiaWRcIi5cbiAgICAgICAgICAgICAgICB2YXIgbGVmdFR5cGVkVmFsdWUgPSB0eXBlQ2hlY2tFeHByKHN0bXQubmFtZSwgZW52KTtcbiAgICAgICAgICAgICAgICB2YXIgcmlnaHRUeXBlZFZhbHVlID0gdHlwZUNoZWNrRXhwcihzdG10LnZhbHVlLCBlbnYpOyAvLyB0byBnZXQgYVxuICAgICAgICAgICAgICAgIGlmICghaXNTYW1lVHlwZShsZWZ0VHlwZWRWYWx1ZS5hLCByaWdodFR5cGVkVmFsdWUuYSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFcnJvcjogVFlQRSBFUlJPUjogRXhwZWN0ZWQgdHlwZSBcIi5jb25jYXQobGVmdFR5cGVkVmFsdWUuYSwgXCI7IGdvdCB0eXBlIFwiKS5jb25jYXQocmlnaHRUeXBlZFZhbHVlLmEpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHlwZWRTdG10cy5wdXNoKF9fYXNzaWduKF9fYXNzaWduKHt9LCBzdG10KSwgeyBhOiBcIk5vbmVcIiwgbmFtZTogbGVmdFR5cGVkVmFsdWUsIHZhbHVlOiByaWdodFR5cGVkVmFsdWUgfSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImV4cHJcIjpcbiAgICAgICAgICAgICAgICB2YXIgdHlwZWRFeHByID0gdHlwZUNoZWNrRXhwcihzdG10LmV4cHIsIGVudik7XG4gICAgICAgICAgICAgICAgdHlwZWRTdG10cy5wdXNoKF9fYXNzaWduKF9fYXNzaWduKHt9LCBzdG10KSwgeyBleHByOiB0eXBlZEV4cHIsIGE6IFwiTm9uZVwiIH0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJyZXR1cm5cIjpcbiAgICAgICAgICAgICAgICB2YXIgdHlwZWRSZXQgPSB0eXBlQ2hlY2tFeHByKHN0bXQuZXhwciwgZW52KTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzU2FtZVR5cGUodHlwZWRSZXQuYSwgZW52LnJldFR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yOiBUWVBFIEVSUk9SOiByZXR1cm4gZXhwZWN0ZWQgdHlwZSBcIi5jb25jYXQoZW52LnJldFR5cGUsIFwiOyBnb3QgdHlwZSBcIikuY29uY2F0KHR5cGVkUmV0LmEpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHlwZWRTdG10cy5wdXNoKF9fYXNzaWduKF9fYXNzaWduKHt9LCBzdG10KSwgeyBleHByOiB0eXBlZFJldCwgYTogdHlwZWRSZXQuYSB9KSk7IC8vIFRoaXMgY2FuIGFsc28gYmUgXCJOb25lXCJcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJwYXNzXCI6XG4gICAgICAgICAgICAgICAgdHlwZWRTdG10cy5wdXNoKF9fYXNzaWduKF9fYXNzaWduKHt9LCBzdG10KSwgeyBhOiBcIk5vbmVcIiB9KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwid2hpbGVcIjpcbiAgICAgICAgICAgICAgICB2YXIgdHlwZWRXaGlsZSA9IHR5cGVDaGVja1doaWxlKHN0bXQsIGVudik7XG4gICAgICAgICAgICAgICAgdHlwZWRTdG10cy5wdXNoKF9fYXNzaWduKF9fYXNzaWduKHt9LCB0eXBlZFdoaWxlKSwgeyBhOiBcIk5vbmVcIiB9KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiaWZcIjpcbiAgICAgICAgICAgICAgICB2YXIgdHlwZWRJZiA9IHR5cGVDaGVja0lmKHN0bXQsIGVudik7XG4gICAgICAgICAgICAgICAgdHlwZWRTdG10cy5wdXNoKF9fYXNzaWduKF9fYXNzaWduKHt9LCB0eXBlZElmKSwgeyBhOiBcIk5vbmVcIiB9KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHlwZWRTdG10cztcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tFeHByKGV4cHIsIGVudikge1xuICAgIHN3aXRjaCAoZXhwci50YWcpIHtcbiAgICAgICAgY2FzZSBcImlkXCI6IC8vIGNoZWNrIGlmIHRoZSB2YXJpYWJsZSBoYXMgYmVlbiBkZWZpbmVkIFxuICAgICAgICAgICAgaWYgKCFlbnYudmFycy5oYXMoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IG5vdCBhIHZhcmlhYmxlIFwiLmNvbmNhdChleHByLm5hbWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpZFR5cGUgPSBlbnYudmFycy5nZXQoZXhwci5uYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZXhwciksIHsgYTogaWRUeXBlIH0pO1xuICAgICAgICBjYXNlIFwiYmlub3BcIjpcbiAgICAgICAgICAgIHJldHVybiB0eXBlQ2hlY2tCaW5PcChleHByLCBlbnYpO1xuICAgICAgICBjYXNlIFwidW5pb3BcIjpcbiAgICAgICAgICAgIHJldHVybiB0eXBlQ2hlY2tVbmlPcChleHByLCBlbnYpO1xuICAgICAgICBjYXNlIFwibGl0ZXJhbFwiOlxuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBhOiB0eXBlQ2hlY2tMaXRlcmFsKGV4cHIubGl0ZXJhbCkuYSB9KTtcbiAgICAgICAgY2FzZSBcImNhbGxcIjpcbiAgICAgICAgICAgIHZhciB0eXBlZENhbGwgPSB0eXBlQ2hlY2tDYWxsKGV4cHIsIGVudik7XG4gICAgICAgICAgICByZXR1cm4gdHlwZWRDYWxsO1xuICAgICAgICBjYXNlIFwiZ2V0ZmllbGRcIjpcbiAgICAgICAgICAgIHZhciB0eXBlZEdldGZpZWxkID0gdHlwZUNoZWNrRmllbGQoZXhwciwgZW52KTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlZEdldGZpZWxkO1xuICAgICAgICBjYXNlIFwibWV0aG9kXCI6XG4gICAgICAgICAgICB2YXIgdHlwZWRNZXRob2QgPSB0eXBlQ2hlY2tNZXRob2QoZXhwciwgZW52KTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlZE1ldGhvZDtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrQmluT3AoZXhwciwgZW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9IFwiYmlub3BcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiB0eXBlQ2hlY2tCaW5PcCBvbmx5IHRha2UgYmluYXJ5IG9wZXJhdGlvblwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChleHByLm9wKSB7XG4gICAgICAgIC8vIHdvcmsgZm9yIGludFxuICAgICAgICBjYXNlIEJpbk9wLlBsdXM6XG4gICAgICAgIGNhc2UgQmluT3AuTWludXM6XG4gICAgICAgIGNhc2UgQmluT3AuTXVsOlxuICAgICAgICBjYXNlIEJpbk9wLkRpdjpcbiAgICAgICAgY2FzZSBCaW5PcC5Nb2Q6XG4gICAgICAgIGNhc2UgQmluT3AuU2VxOlxuICAgICAgICBjYXNlIEJpbk9wLkxlcTpcbiAgICAgICAgY2FzZSBCaW5PcC5TbWw6XG4gICAgICAgIGNhc2UgQmluT3AuTHJnOlxuICAgICAgICAgICAgdmFyIGxlZnRUeXBlZCA9IHR5cGVDaGVja0V4cHIoZXhwci5sZWZ0LCBlbnYpOyAvLyBhZGQgdGhlIHR5cGUgdG8gdGhlIGxlZnQgZXhwcmVzc2lvblxuICAgICAgICAgICAgdmFyIHJpZ2h0VHlwZWQgPSB0eXBlQ2hlY2tFeHByKGV4cHIucmlnaHQsIGVudik7XG4gICAgICAgICAgICBpZiAoIWlzU2FtZVR5cGUobGVmdFR5cGVkLmEsIHJpZ2h0VHlwZWQuYSkgfHwgKGxlZnRUeXBlZC5hICE9PSBcImludFwiKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IENhbm5vdCBhcHBseSBvcGVyYXRvciAnXCIuY29uY2F0KGV4cHIub3AsIFwiJyBvbiB0eXBlcyAnXCIpLmNvbmNhdChsZWZ0VHlwZWQuYSwgXCInIGFuZCB0eXBlICdcIikuY29uY2F0KHJpZ2h0VHlwZWQuYSwgXCInXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHByLm9wID09PSBCaW5PcC5TZXEgfHwgZXhwci5vcCA9PT0gQmluT3AuTGVxIHx8IGV4cHIub3AgPT09IEJpbk9wLlNtbCB8fCBleHByLm9wID09PSBCaW5PcC5McmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGxlZnQ6IGxlZnRUeXBlZCwgcmlnaHQ6IHJpZ2h0VHlwZWQsIGE6IFwiYm9vbFwiIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBsZWZ0OiBsZWZ0VHlwZWQsIHJpZ2h0OiByaWdodFR5cGVkLCBhOiBcImludFwiIH0pO1xuICAgICAgICAvLyB3b3JrIGZvciBib3RoIGludCBhbmQgYm9vbCwgYnV0IG5vdCBOb25lXG4gICAgICAgIGNhc2UgQmluT3AuRXE6XG4gICAgICAgIGNhc2UgQmluT3AuTmVxOlxuICAgICAgICAgICAgdmFyIGxlZnRUeXBlZEVxID0gdHlwZUNoZWNrRXhwcihleHByLmxlZnQsIGVudik7XG4gICAgICAgICAgICB2YXIgcmlnaHRUeXBlZEVxID0gdHlwZUNoZWNrRXhwcihleHByLnJpZ2h0LCBlbnYpO1xuICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBjbGFzc2VzIGFuZCBcIk5vbmVcIlxuICAgICAgICAgICAgaWYgKCFpc1NhbWVUeXBlKGxlZnRUeXBlZEVxLmEsIHJpZ2h0VHlwZWRFcS5hKSB8fCBpc09iamVjdChsZWZ0VHlwZWRFcS5hKSB8fCBsZWZ0VHlwZWRFcS5hID09IFwiTm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogQ2Fubm90IGFwcGx5IG9wZXJhdG9yICdcIi5jb25jYXQoZXhwci5vcCwgXCInIG9uIHR5cGVzICdcIikuY29uY2F0KGxlZnRUeXBlZEVxLmEsIFwiJyBhbmQgdHlwZSAnXCIpLmNvbmNhdChyaWdodFR5cGVkRXEuYSwgXCInXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZXhwciksIHsgbGVmdDogbGVmdFR5cGVkRXEsIHJpZ2h0OiByaWdodFR5cGVkRXEsIGE6IFwiYm9vbFwiIH0pO1xuICAgICAgICAvLyB3b3JrIGZvciBOb25lIGFuZCBvdGhlciBjbGFzc2VzXG4gICAgICAgIGNhc2UgQmluT3AuSXM6XG4gICAgICAgICAgICB2YXIgbGVmdFR5cGVkSXMgPSB0eXBlQ2hlY2tFeHByKGV4cHIubGVmdCwgZW52KTtcbiAgICAgICAgICAgIHZhciByaWdodFR5cGVkSXMgPSB0eXBlQ2hlY2tFeHByKGV4cHIucmlnaHQsIGVudik7XG4gICAgICAgICAgICBpZiAobGVmdFR5cGVkSXMuYSA9PT0gXCJpbnRcIiB8fCBsZWZ0VHlwZWRJcy5hID09PSBcImJvb2xcIiB8fCByaWdodFR5cGVkSXMuYSA9PT0gXCJpbnRcIiB8fCByaWdodFR5cGVkSXMuYSA9PT0gXCJib29sXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBDYW5ub3QgYXBwbHkgb3BlcmF0b3IgJ1wiLmNvbmNhdChleHByLm9wLCBcIicgb24gdHlwZXMgJ1wiKS5jb25jYXQobGVmdFR5cGVkSXMuYSwgXCInIGFuZCB0eXBlICdcIikuY29uY2F0KHJpZ2h0VHlwZWRJcy5hLCBcIidcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBsZWZ0OiBsZWZ0VHlwZWRJcywgcmlnaHQ6IHJpZ2h0VHlwZWRJcywgYTogXCJib29sXCIgfSk7XG4gICAgfVxufVxuLy8gc2hvdWxkIHJldHVybiB0cnVlIGluIHRoZSBmaXJzdCBzdGF0ZW1lbnQgaWYgYm90aCBhcmUgbm90IG9iamVjdHNcbmV4cG9ydCBmdW5jdGlvbiBpc1NhbWVUeXBlKHMsIHQpIHtcbiAgICBpZiAocyA9PT0gdCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gYm90aCBcImludFwiLCBcImJvb2xcIiwgb3IgXCJOb25lXCJcbiAgICB9XG4gICAgZWxzZSBpZiAocyA9PT0gXCJpbnRcIiB8fCBzID09PSBcImJvb2xcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHQgPT09IFwiaW50XCIgfHwgdCA9PT0gXCJib29sXCIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmICh0ID09PSBcIk5vbmVcIiB8fCBzID09PSBcIk5vbmVcIikgeyAvLyBcIk5vbmVcIiBpcyB0aGUgc2FtZSB0eXBlIGFzIGFueSBjbGFzc2VzXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChzLnRhZyA9PT0gdC50YWcgJiYgcy5jbGFzcyA9PT0gdC5jbGFzcyk7IC8vIGJvdGggb2JqZWN0c1xuICAgIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdChzKSB7XG4gICAgaWYgKHMgPT09IFwiaW50XCIgfHwgcyA9PT0gXCJib29sXCIgfHwgcyA9PT0gXCJOb25lXCIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tVbmlPcChleHByLCBlbnYpIHtcbiAgICBpZiAoZXhwci50YWcgIT0gXCJ1bmlvcFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IHR5cGVDaGVja1VuaU9wIG9ubHkgdGFrZSB1bmFyeSBvcGVyYXRpb25zXCIpO1xuICAgIH1cbiAgICBzd2l0Y2ggKGV4cHIub3ApIHtcbiAgICAgICAgLy8gd29yayBmb3IgaW50XG4gICAgICAgIGNhc2UgVW5pT3AuTWludXM6XG4gICAgICAgICAgICB2YXIgdHlwZWRFeHByID0gdHlwZUNoZWNrRXhwcihleHByLmV4cHIsIGVudik7XG4gICAgICAgICAgICBpZiAodHlwZWRFeHByLmEgIT09IFwiaW50XCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiB1bmlhcnkgb3BlcmF0b3IgXCIuY29uY2F0KFVuaU9wLk1pbnVzLCBcIiBleHBlY3RlZCBcIikuY29uY2F0KFwiaW50XCIsIFwiOyBnb3QgdHlwZSBcIikuY29uY2F0KHR5cGVkRXhwci5hKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGV4cHI6IHR5cGVkRXhwciwgYTogXCJpbnRcIiB9KTtcbiAgICAgICAgLy8gd29yayBmb3IgYm9vbFxuICAgICAgICBjYXNlIFVuaU9wLk5vdDpcbiAgICAgICAgICAgIHZhciBub3RUeXBlZEV4cHIgPSB0eXBlQ2hlY2tFeHByKGV4cHIuZXhwciwgZW52KTtcbiAgICAgICAgICAgIGlmIChub3RUeXBlZEV4cHIuYSAhPT0gXCJib29sXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFQ0hFQ0sgRVJST1I6IHVuaWFyeSBvcGVyYXRvciBcIi5jb25jYXQoVW5pT3AuTm90LCBcIiBleHBlY3RlZCBcIikuY29uY2F0KFwiYm9vbFwiLCBcIjsgZ290IHR5cGUgXCIpLmNvbmNhdChub3RUeXBlZEV4cHIuYSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBleHByOiBub3RUeXBlZEV4cHIsIGE6IFwiYm9vbFwiIH0pO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogdW5kZWZpbmVkIHVuYXJ5IG9wZXJhdG9yIFwiLmNvbmNhdChleHByLCBcIi4gVGhpcyBlcnJvciBzaG91bGQgYmUgY2FsbGVkIGluIHBhcnNlclwiKSk7XG4gICAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1doaWxlKHN0bXQsIGVudikge1xuICAgIGlmIChzdG10LnRhZyAhPT0gJ3doaWxlJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiB0aGUgaW5wdXQgc3RhdGVtZW50IHNob3VsZCBiZSB3aGlsZSB3aGVuIGNhbGxpbmcgdHlwZUNoZWNrV2hpbGVcIik7XG4gICAgfVxuICAgIHZhciB0eXBlZFdoaWxlQ29uZCA9IHR5cGVDaGVja0V4cHIoc3RtdC5jb25kLCBlbnYpO1xuICAgIHZhciB0eXBlZFdoaWxlQm9keSA9IHR5cGVDaGVja1N0bXRzKHN0bXQuc3RtdHMsIGVudik7XG4gICAgaWYgKHR5cGVkV2hpbGVDb25kLmEgIT09IFwiYm9vbFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IENvbmR0aW9uIGV4cHJlc3Npb24gY2Fubm90IGJlIG9mIHR5cGUgJ1wiLmNvbmNhdCh0eXBlZFdoaWxlQ29uZC5hLCBcIidcIikpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBhOiBcIk5vbmVcIixcbiAgICAgICAgdGFnOiAnd2hpbGUnLFxuICAgICAgICBjb25kOiB0eXBlZFdoaWxlQ29uZCxcbiAgICAgICAgc3RtdHM6IHR5cGVkV2hpbGVCb2R5XG4gICAgfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tJZihzdG10LCBlbnYpIHtcbiAgICBpZiAoc3RtdC50YWcgIT09ICdpZicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogdGhlIGlucHV0IHN0YXRlbWVudCBzaG91bGQgYmUgaWYgd2hlbiBjYWxsaW5nIHR5cGVDaGVja0lmXCIpO1xuICAgIH1cbiAgICAvLyBjaGVjayBpZlxuICAgIHZhciB0eXBlZElmQ29uZCA9IHR5cGVDaGVja0V4cHIoc3RtdC5pZk9wLmNvbmQsIGVudik7XG4gICAgdmFyIHR5cGVkSWZCb2R5ID0gdHlwZUNoZWNrU3RtdHMoc3RtdC5pZk9wLnN0bXRzLCBlbnYpO1xuICAgIGlmICh0eXBlZElmQ29uZC5hICE9PSBcImJvb2xcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBDb25kdGlvbiBleHByZXNzaW9uIGNhbm5vdCBiZSBvZiB0eXBlICdcIi5jb25jYXQodHlwZWRJZkNvbmQuYSwgXCInXCIpKTtcbiAgICB9XG4gICAgLy8gY2hlY2sgZWxpZlxuICAgIHZhciB0eXBlZEVsaWZDb25kID0gbnVsbDtcbiAgICB2YXIgdHlwZWRFbGlmQm9keSA9IG51bGw7XG4gICAgaWYgKHN0bXQuZWxpZk9wLmNvbmQgIT09IG51bGwpIHtcbiAgICAgICAgdHlwZWRFbGlmQ29uZCA9IHR5cGVDaGVja0V4cHIoc3RtdC5lbGlmT3AuY29uZCwgZW52KTtcbiAgICAgICAgdHlwZWRFbGlmQm9keSA9IHR5cGVDaGVja1N0bXRzKHN0bXQuZWxpZk9wLnN0bXRzLCBlbnYpO1xuICAgICAgICBpZiAodHlwZWRFbGlmQ29uZC5hICE9PSBcImJvb2xcIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogQ29uZHRpb24gZXhwcmVzc2lvbiBjYW5ub3QgYmUgb2YgdHlwZSAnXCIuY29uY2F0KHR5cGVkRWxpZkNvbmQuYSwgXCInXCIpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBjaGVjayBlbHNlOlxuICAgIHZhciB0cHllZEVsc2VCb2R5ID0gbnVsbDtcbiAgICBpZiAoc3RtdC5lbHNlT3Auc3RtdHMgIT09IG51bGwpIHtcbiAgICAgICAgdHB5ZWRFbHNlQm9keSA9IHR5cGVDaGVja1N0bXRzKHN0bXQuZWxzZU9wLnN0bXRzLCBlbnYpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBhOiBcIk5vbmVcIixcbiAgICAgICAgdGFnOiBcImlmXCIsXG4gICAgICAgIGlmT3A6IHsgY29uZDogdHlwZWRJZkNvbmQsIHN0bXRzOiB0eXBlZElmQm9keSB9LFxuICAgICAgICBlbGlmT3A6IHsgY29uZDogdHlwZWRFbGlmQ29uZCwgc3RtdHM6IHR5cGVkRWxpZkJvZHkgfSxcbiAgICAgICAgZWxzZU9wOiB7IHN0bXRzOiB0cHllZEVsc2VCb2R5IH1cbiAgICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0ZpZWxkKGV4cHIsIGVudikge1xuICAgIGlmIChleHByLnRhZyAhPT0gXCJnZXRmaWVsZFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IHR5cGVDaGVja01ldGhvZCBvbmx5IGFjY2VwdHMgYSBnZXRmaWVsZCBhcyBhbiBpbnB1dCBleHByXCIpO1xuICAgIH1cbiAgICB2YXIgdHlwZWRPYmogPSB0eXBlQ2hlY2tFeHByKGV4cHIub2JqLCBlbnYpO1xuICAgIGlmICh0eXBlZE9iai5hID09PSBcImludFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiYm9vbFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiTm9uZVwiKSB7IC8vIGNhbm5vdCBjb21waWxlIHdpdGggaXNPYmplY3QoKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBPbmx5IG9iamVjdHMgY2FuIGdldCBmaWVsZHMuXCIpO1xuICAgIH1cbiAgICBpZiAoIWVudi5jbGFzc0ZpZWxkcy5oYXModHlwZWRPYmouYS5jbGFzcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogVGhlIGNsYXNzIGRvZXNuJ3QgZXhpc3QuXCIpO1xuICAgIH1cbiAgICB2YXIgY2xhc3NGaWVsZHMgPSBlbnYuY2xhc3NGaWVsZHMuZ2V0KHR5cGVkT2JqLmEuY2xhc3MpO1xuICAgIGlmICghY2xhc3NGaWVsZHMuaGFzKGV4cHIubmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogVGhlIGZpZWxkIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGNsYXNzLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBvYmo6IHR5cGVkT2JqLCBhOiBjbGFzc0ZpZWxkcy5nZXQoZXhwci5uYW1lKSB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tNZXRob2QoZXhwciwgZW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9PSBcIm1ldGhvZFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IHR5cGVDaGVja01ldGhvZCBvbmx5IGFjY2VwdHMgYSBtZXRob2QgYXMgYW4gaW5wdXQgZXhwclwiKTtcbiAgICB9XG4gICAgdmFyIHR5cGVkT2JqID0gdHlwZUNoZWNrRXhwcihleHByLm9iaiwgZW52KTtcbiAgICBpZiAodHlwZWRPYmouYSA9PT0gXCJpbnRcIiB8fCB0eXBlZE9iai5hID09PSBcImJvb2xcIiB8fCB0eXBlZE9iai5hID09PSBcIk5vbmVcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBPbmx5IGNsYXNzZXMgY2FuIGNhbGwgbWV0aG9kcy5cIik7XG4gICAgfVxuICAgIGlmICghZW52LmNsYXNzTWV0aG9kcy5oYXModHlwZWRPYmouYS5jbGFzcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogVGhlIGNsYXNzIGRvZXNuJ3QgZXhpc3QuXCIpO1xuICAgIH1cbiAgICB2YXIgY2xhc3NNZXRob2RzID0gZW52LmNsYXNzTWV0aG9kcy5nZXQodHlwZWRPYmouYS5jbGFzcyk7XG4gICAgaWYgKCFjbGFzc01ldGhvZHMuaGFzKGV4cHIubmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogVGhlIG1ldGhvZCBkb2Vzbid0IGV4aXN0IGluIHRoZSBjbGFzcy5cIik7XG4gICAgfVxuICAgIHZhciBfYSA9IGNsYXNzTWV0aG9kcy5nZXQoZXhwci5uYW1lKSwgYXJnVHlwcyA9IF9hWzBdLCByZXRUeXAgPSBfYVsxXTtcbiAgICB2YXIgdHlwZWRBcmdzID0gZXhwci5hcmdzLm1hcChmdW5jdGlvbiAoYSkgeyByZXR1cm4gdHlwZUNoZWNrRXhwcihhLCBlbnYpOyB9KTtcbiAgICBpZiAoYXJnVHlwcy5sZW5ndGggIT0gdHlwZWRBcmdzLmxlbmd0aCkgeyAvLyBXZSBlc2NhcGVkIFwic2VsZlwiIGluIHRoZSBwYXJzZXIuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IFRoZSBudW1iZXIgb2YgcGFyYW1ldGVycyBpcyBpbmNvcnJlY3QuXCIpO1xuICAgIH1cbiAgICBhcmdUeXBzLmZvckVhY2goZnVuY3Rpb24gKHQsIGkpIHtcbiAgICAgICAgaWYgKCFpc1NhbWVUeXBlKHQsIHR5cGVkQXJnc1tpXS5hKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogaW5jb3JyZWN0IHBhcmFtZXRlciB0eXBlXCIpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBvYmo6IHR5cGVkT2JqLCBhcmdzOiB0eXBlZEFyZ3MsIGE6IHJldFR5cCB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tDYWxsKGV4cHIsIGVudikge1xuICAgIGlmIChleHByLnRhZyAhPT0gXCJjYWxsXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogdHlwZUNoZWNrQ2FsbCBvbmx5IGFjY2VwdCBhIGNhbGwgYXMgYW4gaW5wdXQgZXhwclwiKTtcbiAgICB9XG4gICAgaWYgKCFlbnYuZnVuY3MuaGFzKGV4cHIubmFtZSkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiVFlQRUNIRUNLIFdBUk5JTkc6IElmIHRoZSBcIi5jb25jYXQoZXhwci5uYW1lLCBcIiBmdW5jdGlvbiBpcyBhbiBpbXBvcnRlZCBvbmUsIHdlIGRvbid0IGRvIGFueSB0eXBlIGNoZWNrLlwiKSk7IC8vIGV4LiBwcmludCgpXG4gICAgICAgIHZhciB0eXBlZEFyZ3NfMSA9IGV4cHIuYXJncy5tYXAoZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVDaGVja0V4cHIoYXJnLCBlbnYpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBhcmdzOiB0eXBlZEFyZ3NfMSwgYTogXCJOb25lXCIgfSk7XG4gICAgfVxuICAgIC8vIGNoZWNrICMgcGFyYW1zXG4gICAgdmFyIHBhcmFtcyA9IGVudi5mdW5jcy5nZXQoZXhwci5uYW1lKVswXTtcbiAgICB2YXIgYXJncyA9IGV4cHIuYXJncztcbiAgICBpZiAoYXJncy5sZW5ndGggIT09IHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogY2FsbCBmdW5jIFwiLmNvbmNhdChleHByLm5hbWUsIFwiOyBleHBlY3RlZCBcIikuY29uY2F0KHBhcmFtcy5sZW5ndGgsIFwiIGFyZ3VtZW50czsgZ290IFwiKS5jb25jYXQoYXJncy5sZW5ndGgpKTtcbiAgICB9XG4gICAgLy8gY2hlY2sgYXJndW1lbnQgdHlwZVxuICAgIHZhciB0eXBlZEFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBwYXJhbXMubGVuZ3RoOyArK2lkeCkge1xuICAgICAgICB2YXIgdHlwZWRBcmcgPSB0eXBlQ2hlY2tFeHByKGFyZ3NbaWR4XSwgZW52KTtcbiAgICAgICAgaWYgKHR5cGVkQXJnLmEgIT09IHBhcmFtc1tpZHhdKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBjYWxsIGZ1bmMgXCIuY29uY2F0KGV4cHIubmFtZSwgXCI7IGV4cGVjdGVkIHR5cGUgXCIpLmNvbmNhdChwYXJhbXNbaWR4XSwgXCI7IGdvdCB0eXBlIFwiKS5jb25jYXQodHlwZWRBcmcuYSwgXCIgaW4gcGFyYW1ldGVycyBcIikuY29uY2F0KGlkeCkpO1xuICAgICAgICB9XG4gICAgICAgIHR5cGVkQXJncy5wdXNoKHR5cGVkQXJnKTtcbiAgICB9XG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBhcmdzOiB0eXBlZEFyZ3MsIGE6IGVudi5mdW5jcy5nZXQoZXhwci5uYW1lKVsxXSB9KTsgLy8gdXNlIHRoZSByZXR1cm4gdHlwZVxufVxuLy8gbWFrZSBzdXJlIHRoZSB2YXJpYWJsZSB0eXBlIGlzIGVxdWFsIHRvIHRoZSBsaXRlcmFsIHR5cGVcbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tWYXJJbml0KGluaXRzLCBlbnYpIHtcbiAgICB2YXIgdHlwZWRJbml0cyA9IFtdO1xuICAgIHZhciBzY29wZVZhciA9IG5ldyBTZXQoKTtcbiAgICBpbml0cy5mb3JFYWNoKGZ1bmN0aW9uIChpbml0KSB7XG4gICAgICAgIC8vIGNoZWNrIGlmIHRoZSBsZWZ0IGhhbmQgdHlwZSBlcXVhbHMgdG8gdGhlIHJpZ2h0IGhhbmQgdHlwZVxuICAgICAgICAvLyBleC4geDppbnQgYW5kIDFcbiAgICAgICAgdmFyIHR5cGVkTGl0ZXJhbCA9IHR5cGVDaGVja0xpdGVyYWwoaW5pdC5pbml0TGl0ZXJhbCk7XG4gICAgICAgIGlmICghaXNTYW1lVHlwZShpbml0LnR5cGUsIHR5cGVkTGl0ZXJhbC5hKSAmJiAhKGlzT2JqZWN0KGluaXQudHlwZSkgJiYgdHlwZWRMaXRlcmFsLmEgPT09IFwiTm9uZVwiKSkgeyAvLyBleC4gcjEgOiBSYXQgPSBOb25lXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVycm9yOiBUWVBFIEVSUk9SOiBpbml0IHR5cGUgZG9lcyBub3QgbWF0Y2ggbGl0ZXJhbCB0eXBlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHR5cGVkSW5pdHMucHVzaChfX2Fzc2lnbihfX2Fzc2lnbih7fSwgaW5pdCksIHsgYTogaW5pdC50eXBlLCBpbml0TGl0ZXJhbDogdHlwZWRMaXRlcmFsIH0pKTsgLy8gYWRkIHRoZSB0eXBlcyB0byBWYXJJbml0XG4gICAgfSk7XG4gICAgcmV0dXJuIHR5cGVkSW5pdHM7XG59XG4vKlxuQ2hlY2sgdGhlIHR5cGUgb2YgY2xhc3MgZGVmaW5pdGlvbjpcbigxKSBhZGQgdGhlIGNsYXNzIHZhcmlhYmxlc1xuKDIpIGNoZWNrIGVhY2ggZnVuY3Rpb25cbiovXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrQ2xhc3NEZWYoY2xzLCBlbnYpIHtcbiAgICBpZiAoY2xzLnRhZyAhPT0gXCJjbGFzc1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IFRoaXMgaXMgbm90IGEgY2xhc3Mgc3RhdGVtZW50LlwiKTtcbiAgICB9XG4gICAgLy8gVGhlIG1ldGhvZHMgaW4gdGhlIGNsYXNzIGNhbiBhY2Nlc3MgdGhlIGdsb2JhbCB2YXJpYWJsZXMuXG4gICAgdmFyIGxvY2FsRW52ID0gZGVlcENvcHlWYXJFbnYoZW52KTsgLy8gaW5jbHVkZSBnbG9iYWwgdmFyaWFibGVzIGluIHRoZSBsb2NhbCBlbnZpcm9ubWVudFxuICAgIC8vIGNoZWNrIHZhcmlhYmxlIGluaXRpYWxpemF0aW9uc1xuICAgIHZhciBsb2NhbFR5cGVkSW5pdHMgPSB0eXBlQ2hlY2tWYXJJbml0KGNscy5maWVsZHMsIGxvY2FsRW52KTsgLy8gY2hlY2sgdGhlIHR5cGVcbiAgICBjbHMuZmllbGRzLmZvckVhY2goZnVuY3Rpb24gKGxvY2FsVHlwZWRJbml0KSB7XG4gICAgICAgIGxvY2FsRW52LnZhcnMuc2V0KFwic2VsZi5cIiArIGxvY2FsVHlwZWRJbml0Lm5hbWUsIGxvY2FsVHlwZWRJbml0LnR5cGUpOyAvLyB0byBkaXN0aW5ndWlzaCBzZWxmLmEgZnJvbSBhXG4gICAgfSk7IC8vIGFkZCB2YXJpYWJsZXMgdG8gdGhlIGVudmlyb25tZW50XG4gICAgbG9jYWxFbnYudmFycy5zZXQoXCJzZWxmXCIsIHsgdGFnOiBcIm9iamVjdFwiLCBjbGFzczogY2xzLm5hbWUgfSk7IC8vIGFkZCB0aGUgXCJzZWxmXCIgdmFyaWFibGUgdG8gdGhlIGVudmlyb25tZW50XG4gICAgLy8gY2hlY2sgbWV0aG9kIGRlZmluaXRpb25zXG4gICAgdmFyIGxvY2FsVHlwZWRNZXRob2RzID0gY2xzLm1ldGhvZHMubWFwKGZ1bmN0aW9uIChtKSB7IHJldHVybiB0eXBlQ2hlY2tGdW5jRGVmKG0sIGxvY2FsRW52KTsgfSk7IC8vIHVzZSB0aGUgc2FtZSBmdW5jdGlvblxuICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgY2xzKSwgeyBhOiBcIk5vbmVcIiwgZmllbGRzOiBsb2NhbFR5cGVkSW5pdHMsIG1ldGhvZHM6IGxvY2FsVHlwZWRNZXRob2RzIH0pOyAvLyBBIGNsYXNzIGRlZmluaXRpb24gZG9lc24ndCByZXF1aXJlIGFuIFwiYVwiLlxufVxuLypcbiAqIENoZWNrIHRoZSB0eXBlIG9mIGZ1bmN0aW9uIGRlZmluaXRpb246XG4gKiAoMSkgbmVlZCB0byB1cGRhdGUgdGhlIHR5cGUgdmFyIGVudiBiZWZvcmUgY2hlY2tpbmcgdGhlIGZ1bmMgYm9keVxuICogKDIpIG5lZWQgdG8gY2hlY2sgdGhlIHN0YXRlbWVudHNcbiAqICgzKSB0aGUgcmV0dXJuIHR5cGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0Z1bmNEZWYoZnVuYywgZW52KSB7XG4gICAgLy8gVGhlIGdsb2JhbCB2YXJpYWJsZXMgYXJlIGluY2x1ZGVkIGluIHRoZSBsb2NhbCBlbnZpcm9ubWVudC5cbiAgICB2YXIgbG9jYWxFbnYgPSBkZWVwQ29weVZhckVudihlbnYpO1xuICAgIC8vIGFkZCBwYXJhbXMgdG8gZW52c1xuICAgIHZhciBzY29wZVZhciA9IG5ldyBTZXQoKTsgLy8gV2UgbmVlZCB0aGlzIGJlY2F1c2UgbG9jYWxFbnYgY29udGFpbnMgZ2xvYmFsIHZhcmlhYmxlcy5cbiAgICB2YXIgdHlwZWRQYXJhbXMgPSB0eXBlQ2hlY2tQYXJhbXMoZnVuYy5wYXJhbXMpO1xuICAgIGZ1bmMucGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgIC8vIFBhcmFtcyBhcmUgYWRkZWQgZmlyc3QgdG8gY2hlY2sgZHVwbGljYXRlIGluaXRpYWxpemF0aW9ucy5cbiAgICAgICAgaWYgKHNjb3BlVmFyLmhhcyhwYXJhbS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJUWVBFIEVSUk9SOiBkdXBsaWNhdGUgcGFyYW0gZGVjbGFyYXRpb24gaW4gdGhlIHNhbWUgZmllbGRcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2NvcGVWYXIuYWRkKHBhcmFtLm5hbWUpO1xuICAgICAgICBsb2NhbEVudi52YXJzLnNldChwYXJhbS5uYW1lLCBwYXJhbS50eXBlKTtcbiAgICB9KTtcbiAgICAvLyBjaGVjayBpbml0cyAtPiBhZGQgdG8gZW52c1xuICAgIHZhciBsb2NhbFR5cGVkSW5pdHMgPSB0eXBlQ2hlY2tWYXJJbml0KGZ1bmMudmFySW5pdHMsIGxvY2FsRW52KTtcbiAgICBmdW5jLnZhckluaXRzLmZvckVhY2goZnVuY3Rpb24gKGxvY2FsVHlwZWRJbml0KSB7XG4gICAgICAgIGlmIChzY29wZVZhci5oYXMobG9jYWxUeXBlZEluaXQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiVFlQRSBFUlJPUjogZHVwbGljYXRlIGluaXQgZGVjbGFyYXRpb24gaW4gdGhlIHNhbWUgZmllbGRcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2NvcGVWYXIuYWRkKGxvY2FsVHlwZWRJbml0Lm5hbWUpO1xuICAgICAgICBsb2NhbEVudi52YXJzLnNldChsb2NhbFR5cGVkSW5pdC5uYW1lLCBsb2NhbFR5cGVkSW5pdC50eXBlKTtcbiAgICB9KTtcbiAgICAvLyBhZGQgcmV0dXJuIHR5cGVcbiAgICBsb2NhbEVudi5yZXRUeXBlID0gZnVuYy5yZXRUeXBlO1xuICAgIC8vIGNoZWNrIGJvZHkgc3RhdGVtZW50c1xuICAgIHZhciB0eXBlZFN0bXRzID0gdHlwZUNoZWNrU3RtdHMoZnVuYy5zdG10cywgbG9jYWxFbnYpO1xuICAgIC8vIG1ha2Ugc3VyZSBldmVyeSBwYXRoIGhhcyB0aGUgZXhwZWN0ZWQgcmV0dXJuIFxuICAgIGlmICghdHlwZUNoZWNrSGFzUmV0dXJuKGZ1bmMuc3RtdHMsIGVudikgJiYgZnVuYy5yZXRUeXBlICE9PSBcIk5vbmVcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBBbGwgcGF0aHMgaW4gZnVuY3Rpb24vbWV0aG9kIG11c3QgaGF2ZSBhIHJldHVybiBzdGF0ZW1lbnQ6IFwiLmNvbmNhdChmdW5jLm5hbWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBmdW5jKSwgeyBwYXJhbXM6IHR5cGVkUGFyYW1zLCB2YXJJbml0czogbG9jYWxUeXBlZEluaXRzLCBzdG10czogdHlwZWRTdG10cyB9KTtcbn1cbi8vIHNpbXBseSBhc3NpZ24gdGhlIHR5cGUgdG8gYVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1BhcmFtcyhwYXJhbXMpIHtcbiAgICByZXR1cm4gcGFyYW1zLm1hcChmdW5jdGlvbiAocCkgeyByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIHApLCB7IGE6IHAudHlwZSB9KTsgfSk7XG59XG4vLyBUaGUgdGFncyBvZiBsaXRlcmFscyBhcmUgdGhlaXIgdHlwZXMuXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrTGl0ZXJhbChsaXRlcmFsKSB7XG4gICAgc3dpdGNoIChsaXRlcmFsLnRhZykge1xuICAgICAgICBjYXNlIFwibnVtXCI6XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGxpdGVyYWwpLCB7IGE6IFwiaW50XCIgfSk7XG4gICAgICAgIGNhc2UgXCJib29sXCI6XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGxpdGVyYWwpLCB7IGE6IFwiYm9vbFwiIH0pO1xuICAgICAgICBjYXNlIFwibm9uZVwiOlxuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBsaXRlcmFsKSwgeyBhOiBcIk5vbmVcIiB9KTtcbiAgICB9XG59XG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBjaGVjayB3aGV0aGVyIHRoaXMgYm9keSBhcmd1bWVudCBoYXMgdGhlXG4gKiBkZXNpcmVkIHJldHVybiB2YWx1ZVxuICogQHBhcmFtIGJvZHlcbiAqIEBwYXJhbSBlbnZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0hhc1JldHVybihib2R5LCBlbnYpIHtcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBib2R5Lmxlbmd0aDsgKytpZHgpIHtcbiAgICAgICAgdmFyIHN0bXQgPSBib2R5W2lkeF07XG4gICAgICAgIHN3aXRjaCAoc3RtdC50YWcpIHtcbiAgICAgICAgICAgIGNhc2UgXCJyZXR1cm5cIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGNhc2UgXCJpZlwiOlxuICAgICAgICAgICAgICAgIHZhciBpZkhhc1JldCA9IHR5cGVDaGVja0hhc1JldHVybihzdG10LmlmT3Auc3RtdHMsIGVudik7XG4gICAgICAgICAgICAgICAgaWYgKHN0bXQuZWxpZk9wLmNvbmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWZIYXNSZXQgPSBpZkhhc1JldCAmJiB0eXBlQ2hlY2tIYXNSZXR1cm4oc3RtdC5lbGlmT3Auc3RtdHMsIGVudik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzdG10LmVsc2VPcC5zdG10cyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZkhhc1JldCA9IGlmSGFzUmV0ICYmIHR5cGVDaGVja0hhc1JldHVybihzdG10LmVsc2VPcC5zdG10cywgZW52KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGFib3ZlIGNvbmRpdGlvbnMgYXJlIG1ldFxuICAgICAgICAgICAgICAgIGlmIChpZkhhc1JldCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBjYXNlIFwicGFzc1wiOlxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGNhc2UgXCJleHByXCI6XG4gICAgICAgICAgICBjYXNlIFwiYXNzaWduXCI6XG4gICAgICAgICAgICBjYXNlIFwid2hpbGVcIjpcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogdHlwZUNoZWNrSGFzUmV0dXJuIG1lZXRzIHVua25vd24gc3RhdGVtZW50XCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2FidDsiLCJpbXBvcnQgeyBFeHRlcm5hbFRva2VuaXplciwgQ29udGV4dFRyYWNrZXIsIFBhcnNlciwgTm9kZVByb3AgfSBmcm9tICdsZXplcic7XG5cbi8vIFRoaXMgZmlsZSB3YXMgZ2VuZXJhdGVkIGJ5IGxlemVyLWdlbmVyYXRvci4gWW91IHByb2JhYmx5IHNob3VsZG4ndCBlZGl0IGl0LlxuY29uc3QgcHJpbnRLZXl3b3JkID0gMSxcbiAgaW5kZW50ID0gMTYyLFxuICBkZWRlbnQgPSAxNjMsXG4gIG5ld2xpbmUkMSA9IDE2NCxcbiAgbmV3bGluZUJyYWNrZXRlZCA9IDE2NSxcbiAgbmV3bGluZUVtcHR5ID0gMTY2LFxuICBlb2YgPSAxNjcsXG4gIFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uID0gMjEsXG4gIFR1cGxlRXhwcmVzc2lvbiA9IDQ3LFxuICBDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiA9IDQ4LFxuICBBcnJheUV4cHJlc3Npb24gPSA1MixcbiAgQXJyYXlDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiA9IDU1LFxuICBEaWN0aW9uYXJ5RXhwcmVzc2lvbiA9IDU2LFxuICBEaWN0aW9uYXJ5Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24gPSA1OSxcbiAgU2V0RXhwcmVzc2lvbiA9IDYwLFxuICBTZXRDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiA9IDYxLFxuICBBcmdMaXN0ID0gNjMsXG4gIFBhcmFtTGlzdCA9IDEyMTtcblxuY29uc3QgbmV3bGluZSA9IDEwLCBjYXJyaWFnZVJldHVybiA9IDEzLCBzcGFjZSA9IDMyLCB0YWIgPSA5LCBoYXNoID0gMzUsIHBhcmVuT3BlbiA9IDQwLCBkb3QgPSA0NjtcblxuY29uc3QgYnJhY2tldGVkID0gW1xuICBQYXJlbnRoZXNpemVkRXhwcmVzc2lvbiwgVHVwbGVFeHByZXNzaW9uLCBDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiwgQXJyYXlFeHByZXNzaW9uLCBBcnJheUNvbXByZWhlbnNpb25FeHByZXNzaW9uLFxuICBEaWN0aW9uYXJ5RXhwcmVzc2lvbiwgRGljdGlvbmFyeUNvbXByZWhlbnNpb25FeHByZXNzaW9uLCBTZXRFeHByZXNzaW9uLCBTZXRDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiwgQXJnTGlzdCwgUGFyYW1MaXN0XG5dO1xuXG5sZXQgY2FjaGVkSW5kZW50ID0gMCwgY2FjaGVkSW5wdXQgPSBudWxsLCBjYWNoZWRQb3MgPSAwO1xuZnVuY3Rpb24gZ2V0SW5kZW50KGlucHV0LCBwb3MpIHtcbiAgaWYgKHBvcyA9PSBjYWNoZWRQb3MgJiYgaW5wdXQgPT0gY2FjaGVkSW5wdXQpIHJldHVybiBjYWNoZWRJbmRlbnRcbiAgY2FjaGVkSW5wdXQgPSBpbnB1dDsgY2FjaGVkUG9zID0gcG9zO1xuICByZXR1cm4gY2FjaGVkSW5kZW50ID0gZ2V0SW5kZW50SW5uZXIoaW5wdXQsIHBvcylcbn1cblxuZnVuY3Rpb24gZ2V0SW5kZW50SW5uZXIoaW5wdXQsIHBvcykge1xuICBmb3IgKGxldCBpbmRlbnQgPSAwOzsgcG9zKyspIHtcbiAgICBsZXQgY2ggPSBpbnB1dC5nZXQocG9zKTtcbiAgICBpZiAoY2ggPT0gc3BhY2UpIGluZGVudCsrO1xuICAgIGVsc2UgaWYgKGNoID09IHRhYikgaW5kZW50ICs9IDggLSAoaW5kZW50ICUgOCk7XG4gICAgZWxzZSBpZiAoY2ggPT0gbmV3bGluZSB8fCBjaCA9PSBjYXJyaWFnZVJldHVybiB8fCBjaCA9PSBoYXNoKSByZXR1cm4gLTFcbiAgICBlbHNlIHJldHVybiBpbmRlbnRcbiAgfVxufVxuXG5jb25zdCBuZXdsaW5lcyA9IG5ldyBFeHRlcm5hbFRva2VuaXplcigoaW5wdXQsIHRva2VuLCBzdGFjaykgPT4ge1xuICBsZXQgbmV4dCA9IGlucHV0LmdldCh0b2tlbi5zdGFydCk7XG4gIGlmIChuZXh0IDwgMCkge1xuICAgIHRva2VuLmFjY2VwdChlb2YsIHRva2VuLnN0YXJ0KTtcbiAgfSBlbHNlIGlmIChuZXh0ICE9IG5ld2xpbmUgJiYgbmV4dCAhPSBjYXJyaWFnZVJldHVybikgOyBlbHNlIGlmIChzdGFjay5zdGFydE9mKGJyYWNrZXRlZCkgIT0gbnVsbCkge1xuICAgIHRva2VuLmFjY2VwdChuZXdsaW5lQnJhY2tldGVkLCB0b2tlbi5zdGFydCArIDEpO1xuICB9IGVsc2UgaWYgKGdldEluZGVudChpbnB1dCwgdG9rZW4uc3RhcnQgKyAxKSA8IDApIHtcbiAgICB0b2tlbi5hY2NlcHQobmV3bGluZUVtcHR5LCB0b2tlbi5zdGFydCArIDEpO1xuICB9IGVsc2Uge1xuICAgIHRva2VuLmFjY2VwdChuZXdsaW5lJDEsIHRva2VuLnN0YXJ0ICsgMSk7XG4gIH1cbn0sIHtjb250ZXh0dWFsOiB0cnVlLCBmYWxsYmFjazogdHJ1ZX0pO1xuXG5jb25zdCBpbmRlbnRhdGlvbiA9IG5ldyBFeHRlcm5hbFRva2VuaXplcigoaW5wdXQsIHRva2VuLCBzdGFjaykgPT4ge1xuICBsZXQgcHJldiA9IGlucHV0LmdldCh0b2tlbi5zdGFydCAtIDEpLCBkZXB0aDtcbiAgaWYgKChwcmV2ID09IG5ld2xpbmUgfHwgcHJldiA9PSBjYXJyaWFnZVJldHVybikgJiZcbiAgICAgIChkZXB0aCA9IGdldEluZGVudChpbnB1dCwgdG9rZW4uc3RhcnQpKSA+PSAwICYmXG4gICAgICBkZXB0aCAhPSBzdGFjay5jb250ZXh0LmRlcHRoICYmXG4gICAgICBzdGFjay5zdGFydE9mKGJyYWNrZXRlZCkgPT0gbnVsbClcbiAgICB0b2tlbi5hY2NlcHQoZGVwdGggPCBzdGFjay5jb250ZXh0LmRlcHRoID8gZGVkZW50IDogaW5kZW50LCB0b2tlbi5zdGFydCk7XG59KTtcblxuZnVuY3Rpb24gSW5kZW50TGV2ZWwocGFyZW50LCBkZXB0aCkge1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICB0aGlzLmhhc2ggPSAocGFyZW50ID8gcGFyZW50Lmhhc2ggKyBwYXJlbnQuaGFzaCA8PCA4IDogMCkgKyBkZXB0aCArIChkZXB0aCA8PCA0KTtcbn1cblxuY29uc3QgdG9wSW5kZW50ID0gbmV3IEluZGVudExldmVsKG51bGwsIDApO1xuXG5jb25zdCB0cmFja0luZGVudCA9IG5ldyBDb250ZXh0VHJhY2tlcih7XG4gIHN0YXJ0OiB0b3BJbmRlbnQsXG4gIHNoaWZ0KGNvbnRleHQsIHRlcm0sIGlucHV0LCBzdGFjaykge1xuICAgIHJldHVybiB0ZXJtID09IGluZGVudCA/IG5ldyBJbmRlbnRMZXZlbChjb250ZXh0LCBnZXRJbmRlbnQoaW5wdXQsIHN0YWNrLnBvcykpIDpcbiAgICAgIHRlcm0gPT0gZGVkZW50ID8gY29udGV4dC5wYXJlbnQgOiBjb250ZXh0XG4gIH0sXG4gIGhhc2goY29udGV4dCkgeyByZXR1cm4gY29udGV4dC5oYXNoIH1cbn0pO1xuXG5jb25zdCBsZWdhY3lQcmludCA9IG5ldyBFeHRlcm5hbFRva2VuaXplcigoaW5wdXQsIHRva2VuKSA9PiB7XG4gIGxldCBwb3MgPSB0b2tlbi5zdGFydDtcbiAgZm9yIChsZXQgcHJpbnQgPSBcInByaW50XCIsIGkgPSAwOyBpIDwgcHJpbnQubGVuZ3RoOyBpKyssIHBvcysrKVxuICAgIGlmIChpbnB1dC5nZXQocG9zKSAhPSBwcmludC5jaGFyQ29kZUF0KGkpKSByZXR1cm5cbiAgbGV0IGVuZCA9IHBvcztcbiAgaWYgKC9cXHcvLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShpbnB1dC5nZXQocG9zKSkpKSByZXR1cm5cbiAgZm9yICg7OyBwb3MrKykge1xuICAgIGxldCBuZXh0ID0gaW5wdXQuZ2V0KHBvcyk7XG4gICAgaWYgKG5leHQgPT0gc3BhY2UgfHwgbmV4dCA9PSB0YWIpIGNvbnRpbnVlXG4gICAgaWYgKG5leHQgIT0gcGFyZW5PcGVuICYmIG5leHQgIT0gZG90ICYmIG5leHQgIT0gbmV3bGluZSAmJiBuZXh0ICE9IGNhcnJpYWdlUmV0dXJuICYmIG5leHQgIT0gaGFzaClcbiAgICAgIHRva2VuLmFjY2VwdChwcmludEtleXdvcmQsIGVuZCk7XG4gICAgcmV0dXJuXG4gIH1cbn0pO1xuXG4vLyBUaGlzIGZpbGUgd2FzIGdlbmVyYXRlZCBieSBsZXplci1nZW5lcmF0b3IuIFlvdSBwcm9iYWJseSBzaG91bGRuJ3QgZWRpdCBpdC5cbmNvbnN0IHNwZWNfaWRlbnRpZmllciA9IHtfX3Byb3RvX186bnVsbCxhd2FpdDo0MCwgb3I6NDgsIGFuZDo1MCwgaW46NTQsIG5vdDo1NiwgaXM6NTgsIGlmOjY0LCBlbHNlOjY2LCBsYW1iZGE6NzAsIHlpZWxkOjg4LCBmcm9tOjkwLCBhc3luYzo5OCwgZm9yOjEwMCwgTm9uZToxNTIsIFRydWU6MTU0LCBGYWxzZToxNTQsIGRlbDoxNjgsIHBhc3M6MTcyLCBicmVhazoxNzYsIGNvbnRpbnVlOjE4MCwgcmV0dXJuOjE4NCwgcmFpc2U6MTkyLCBpbXBvcnQ6MTk2LCBhczoxOTgsIGdsb2JhbDoyMDIsIG5vbmxvY2FsOjIwNCwgYXNzZXJ0OjIwOCwgZWxpZjoyMTgsIHdoaWxlOjIyMiwgdHJ5OjIyOCwgZXhjZXB0OjIzMCwgZmluYWxseToyMzIsIHdpdGg6MjM2LCBkZWY6MjQwLCBjbGFzczoyNTB9O1xuY29uc3QgcGFyc2VyID0gUGFyc2VyLmRlc2VyaWFsaXplKHtcbiAgdmVyc2lvbjogMTMsXG4gIHN0YXRlczogXCIhP3xPYFEkSVhPT08lY1EkSVtPJyNHYU9PUSRJUycjQ20nI0NtT09RJElTJyNDbicjQ25PJ1JRJElXTycjQ2xPKHRRJElbTycjR2BPT1EkSVMnI0dhJyNHYU9PUSRJUycjRFInI0RST09RJElTJyNHYCcjR2BPKWJRJElXTycjQ3FPKXJRJElXTycjRGJPKlNRJElXTycjRGZPT1EkSVMnI0RzJyNEc08qZ09gTycjRHNPKm9PcE8nI0RzTyp3TyFiTycjRHRPK1NPI3RPJyNEdE8rX08mak8nI0R0TytqTyxVTycjRHRPLWxRJElbTycjR1FPT1EkSVMnI0dRJyNHUU8nUlEkSVdPJyNHUE8vT1EkSVtPJyNHUE9PUSRJUycjRV0nI0VdTy9nUSRJV08nI0VeT09RJElTJyNHTycjR09PL3FRJElXTycjRn1PT1EkSVYnI0Z9JyNGfU8vfFEkSVdPJyNGUE9PUSRJUycjRnInI0ZyTzBSUSRJV08nI0ZPT09RJElWJyNIWicjSFpPT1EkSVYnI0Z8JyNGfE9PUSRJVCcjRlInI0ZSUWBRJElYT09PJ1JRJElXTycjQ29PMGFRJElXTycjQ3pPMGhRJElXTycjRE9PMHZRJElXTycjR2VPMVdRJElbTycjRVFPJ1JRJElXTycjRVJPT1EkSVMnI0VUJyNFVE9PUSRJUycjRVYnI0VWT09RJElTJyNFWCcjRVhPMWxRJElXTycjRVpPMlNRJElXTycjRV9PL3xRJElXTycjRWFPMmdRJElbTycjRWFPL3xRJElXTycjRWRPL2dRJElXTycjRWdPL2dRJElXTycjRWtPL2dRJElXTycjRW5PMnJRJElXTycjRXBPMnlRJElXTycjRXVPM1VRJElXTycjRXFPL2dRJElXTycjRXVPL3xRJElXTycjRXdPL3xRJElXTycjRXxPT1EkSVMnI0NjJyNDY09PUSRJUycjQ2QnI0NkT09RJElTJyNDZScjQ2VPT1EkSVMnI0NmJyNDZk9PUSRJUycjQ2cnI0NnT09RJElTJyNDaCcjQ2hPT1EkSVMnI0NqJyNDak8nUlEkSVdPLDU4fE8nUlEkSVdPLDU4fE8nUlEkSVdPLDU4fE8nUlEkSVdPLDU4fE8nUlEkSVdPLDU4fE8nUlEkSVdPLDU4fE8zWlEkSVdPJyNEbU9PUSRJUyw1OlcsNTpXTzNuUSRJV08sNTpaTzN7USUxYE8sNTpaTzRRUSRJW08sNTlXTzBhUSRJV08sNTlfTzBhUSRJV08sNTlfTzBhUSRJV08sNTlfTzZwUSRJV08sNTlfTzZ1USRJV08sNTlfTzZ8USRJV08sNTlnTzdUUSRJV08nI0dgTzhaUSRJV08nI0dfT09RJElTJyNHXycjR19PT1EkSVMnI0RYJyNEWE84clEkSVdPLDU5XU8nUlEkSVdPLDU5XU85UVEkSVdPLDU5XU85VlEkSVdPLDU6UE8nUlEkSVdPLDU6UE9PUSRJUyw1OXwsNTl8TzllUSRJV08sNTl8TzlqUSRJV08sNTpWTydSUSRJV08sNTpWTydSUSRJV08sNTpUT09RJElTLDU6USw1OlFPOXtRJElXTyw1OlFPOlFRJElXTyw1OlVPT09PJyNGWicjRlpPOlZPYE8sNTpfT09RJElTLDU6Xyw1Ol9PT09PJyNGWycjRltPOl9PcE8sNTpfTzpnUSRJV08nI0R1T09PTycjRl0nI0ZdTzp3TyFiTyw1OmBPT1EkSVMsNTpgLDU6YE9PT08nI0ZgJyNGYE87U08jdE8sNTpgT09PTycjRmEnI0ZhTztfTyZqTyw1OmBPT09PJyNGYicjRmJPO2pPLFVPLDU6YE9PUSRJUycjRmMnI0ZjTzt1USRJW08sNTpkTz5nUSRJW08sNTxrTz9RUSVHbE8sNTxrTz9xUSRJW08sNTxrT09RJElTLDU6eCw1OnhPQFlRJElYTycjRmtPQWlRJElXTyw1O1RPT1EkSVYsNTxpLDU8aU9BdFEkSVtPJyNIV09CXVEkSVdPLDU7a09PUSRJUy1FOXAtRTlwT09RJElWLDU7aiw1O2pPM1BRJElXTycjRXdPT1EkSVQtRTlQLUU5UE9CZVEkSVtPLDU5Wk9EbFEkSVtPLDU5Zk9FVlEkSVdPJyNHYk9FYlEkSVdPJyNHYk8vfFEkSVdPJyNHYk9FbVEkSVdPJyNEUU9FdVEkSVdPLDU5ak9FelEkSVdPJyNHZk8nUlEkSVdPJyNHZk8vZ1EkSVdPLDU9UE9PUSRJUyw1PVAsNT1QTy9nUSRJV08nI0R8T09RJElTJyNEfScjRH1PRmlRJElXTycjRmVPRnlRJElXTyw1OHpPR1hRJElXTyw1OHpPKWVRJElXTyw1OmpPR15RJElbTycjR2hPT1EkSVMsNTptLDU6bU9PUSRJUyw1OnUsNTp1T0dxUSRJV08sNTp5T0hTUSRJV08sNTp7T09RJElTJyNGaCcjRmhPSGJRJElbTyw1OntPSHBRJElXTyw1OntPSHVRJElXTycjSFlPT1EkSVMsNTtPLDU7T09JVFEkSVdPJyNIVk9PUSRJUyw1O1IsNTtSTzNVUSRJV08sNTtWTzNVUSRJV08sNTtZT0lmUSRJW08nI0hbTydSUSRJV08nI0hbT0lwUSRJV08sNTtbTzJyUSRJV08sNTtbTy9nUSRJV08sNTthTy98USRJV08sNTtjT0l1USRJWE8nI0VsT0tPUSRJWk8sNTtdT05hUSRJV08nI0hdTzNVUSRJV08sNTthT05sUSRJV08sNTtjT05xUSRJV08sNTtoTyEjZlEkSVtPMUcuaE8hI21RJElbTzFHLmhPISZeUSRJW08xRy5oTyEmaFEkSVtPMUcuaE8hKVJRJElbTzFHLmhPISlmUSRJW08xRy5oTyEpeVEkSVdPJyNHbk8hKlhRJElbTycjR1FPL2dRJElXTycjR25PISpjUSRJV08nI0dtT09RJElTLDU6WCw1OlhPISprUSRJV08sNTpYTyEqcFEkSVdPJyNHb08hKntRJElXTycjR29PIStgUSRJV08xRy91T09RJElTJyNEcScjRHFPT1EkSVMxRy91MUcvdU9PUSRJUzFHLnkxRy55TyEsYFEkSVtPMUcueU8hLGdRJElbTzFHLnlPMGFRJElXTzFHLnlPIS1TUSRJV08xRy9ST09RJElTJyNEVycjRFdPL2dRJElXTyw1OXFPT1EkSVMxRy53MUcud08hLVpRJElXTzFHL2NPIS1rUSRJV08xRy9jTyEtc1EkSVdPMUcvZE8nUlEkSVdPJyNHZ08hLXhRJElXTycjR2dPIS19USRJW08xRy53TyEuX1EkSVdPLDU5Zk8hL2VRJElXTyw1PVZPIS91USRJV08sNT1WTyEvfVEkSVdPMUcva08hMFNRJElbTzFHL2tPT1EkSVMxRy9oMUcvaE8hMGRRJElXTyw1PVFPITFaUSRJV08sNT1RTy9nUSRJV08xRy9vTyExeFEkSVdPMUcvcU8hMX1RJElbTzFHL3FPITJfUSRJW08xRy9vT09RJElTMUcvbDFHL2xPT1EkSVMxRy9wMUcvcE9PT08tRTlYLUU5WE9PUSRJUzFHL3kxRy95T09PTy1FOVktRTlZTyEyb1EkSVdPJyNHek8vZ1EkSVdPJyNHek8hMn1RJElXTyw1OmFPT09PLUU5Wi1FOVpPT1EkSVMxRy96MUcvek9PT08tRTleLUU5Xk9PT08tRTlfLUU5X09PT08tRTlgLUU5YE9PUSRJUy1FOWEtRTlhTyEzWVElR2xPMUcyVk8hM3lRJElbTzFHMlZPJ1JRJElXTyw1PE9PT1EkSVMsNTxPLDU8T09PUSRJUy1FOWItRTliT09RJElTLDU8Viw1PFZPT1EkSVMtRTlpLUU5aU9PUSRJVjFHMG8xRzBvTy98USRJV08nI0ZnTyE0YlEkSVtPLDU9ck9PUSRJUzFHMVYxRzFWTyE0eVEkSVdPMUcxVk9PUSRJUycjRFMnI0RTTy9nUSRJV08sNTx8T09RJElTLDU8fCw1PHxPITVPUSRJV08nI0ZTTyE1WlEkSVdPLDU5bE8hNWNRJElXTzFHL1VPITVtUSRJW08sNT1RT09RJElTMUcyazFHMmtPT1EkSVMsNTpoLDU6aE8hNl5RJElXTycjR1BPT1EkSVMsNTxQLDU8UE9PUSRJUy1FOWMtRTljTyE2b1EkSVdPMUcuZk9PUSRJUzFHMFUxRzBVTyE2fVEkSVdPLDU9U08hN19RJElXTyw1PVNPL2dRJElXTzFHMGVPL2dRJElXTzFHMGVPL3xRJElXTzFHMGdPT1EkSVMtRTlmLUU5Zk8hN3BRJElXTzFHMGdPITd7USRJV08xRzBnTyE4UVEkSVdPLDU9dE8hOGBRJElXTyw1PXRPIThuUSRJV08sNT1xTyE5VVEkSVdPLDU9cU8hOWdRJElaTzFHMHFPITx1USRJWk8xRzB0TyFAUVEkSVdPLDU9dk8hQFtRJElXTyw1PXZPIUBkUSRJW08sNT12Ty9nUSRJV08xRzB2TyFAblEkSVdPMUcwdk8zVVEkSVdPMUcwe09ObFEkSVdPMUcwfU9PUSRJViw1O1csNTtXTyFAc1EkSVlPLDU7V08hQHhRJElaTzFHMHdPIURaUSRJV08nI0ZvTzNVUSRJV08xRzB3TzNVUSRJV08xRzB3TyFEaFEkSVdPLDU9d08hRHVRJElXTyw1PXdPL3xRJElXTyw1PXdPT1EkSVYxRzB7MUcwe08hRH1RJElXTycjRXlPIUVgUSUxYE8xRzB9T09RJElWMUcxUzFHMVNPM1VRJElXTzFHMVNPT1EkSVMsNT1ZLDU9WU9PUSRJUycjRG4nI0RuTy9nUSRJV08sNT1ZTyFFaFEkSVdPLDU9WE8hRXtRJElXTyw1PVhPT1EkSVMxRy9zMUcvc08hRlRRJElXTyw1PVpPIUZlUSRJV08sNT1aTyFGbVEkSVdPLDU9Wk8hR1FRJElXTyw1PVpPIUdiUSRJV08sNT1aT09RJElTNyslYTcrJWFPT1EkSVM3KyRlNyskZU8hNWNRJElXTzcrJG1PIUlUUSRJV08xRy55TyFJW1EkSVdPMUcueU9PUSRJUzFHL10xRy9dT09RJElTLDU7cCw1O3BPJ1JRJElXTyw1O3BPT1EkSVM3KyR9NyskfU8hSWNRJElXTzcrJH1PT1EkSVMtRTlTLUU5U09PUSRJUzcrJU83KyVPTyFJc1EkSVdPLDU9Uk8nUlEkSVdPLDU9Uk9PUSRJUzcrJGM3KyRjTyFJeFEkSVdPNyskfU8hSlFRJElXTzcrJU9PIUpWUSRJV08xRzJxT09RJElTNyslVjcrJVZPIUpnUSRJV08xRzJxTyFKb1EkSVdPNyslVk9PUSRJUyw1O28sNTtvTydSUSRJV08sNTtvTyFKdFEkSVdPMUcybE9PUSRJUy1FOVItRTlSTyFLa1EkSVdPNyslWk9PUSRJUzcrJV03KyVdTyFLeVEkSVdPMUcybE8hTGhRJElXTzcrJV1PIUxtUSRJV08xRzJyTyFMfVEkSVdPMUcyck8hTVZRJElXTzcrJVpPIU1bUSRJV08sNT1mTyFNclEkSVdPLDU9Zk8hTXJRJElXTyw1PWZPIU5RTyFMUU8nI0R3TyFOXU9TTycjR3tPT09PMUcvezFHL3tPIU5iUSRJV08xRy97TyFOalElR2xPNysncU8jIFpRJElbTzFHMWpQIyB0USRJV08nI0ZkT09RJElTLDU8Uiw1PFJPT1EkSVMtRTllLUU5ZU9PUSRJUzcrJnE3KyZxT09RJElTMUcyaDFHMmhPT1EkSVMsNTtuLDU7bk9PUSRJUy1FOVEtRTlRT09RJElTNyskcDcrJHBPIyFSUSRJV08sNTxrTyMhbFEkSVdPLDU8a08jIX1RJElbTyw1O3FPIyNiUSRJV08xRzJuT09RJElTLUU5VC1FOVRPT1EkSVM3KyZQNysmUE8jI3JRJElXTzcrJlBPT1EkSVM3KyZSNysmUk8jJFFRJElXTycjSFhPL3xRJElXTzcrJlJPIyRmUSRJV083KyZST09RJElTLDU8VSw1PFVPIyRxUSRJV08xRzNgT09RJElTLUU5aC1FOWhPT1EkSVMsNTxRLDU8UU8jJVBRJElXTzFHM11PT1EkSVMtRTlkLUU5ZE8jJWdRJElaTzcrJl1PIURaUSRJV08nI0ZtTzNVUSRJV083KyZdTzNVUSRJV083KyZgTyModVEkSVtPLDU8WU8nUlEkSVdPLDU8WU8jKVBRJElXTzFHM2JPT1EkSVMtRTlsLUU5bE8jKVpRJElXTzFHM2JPM1VRJElXTzcrJmJPL2dRJElXTzcrJmJPT1EkSVY3KyZnNysmZ08hRWBRJTFgTzcrJmlPIyljUSRJWE8xRzByT09RJElWLUU5bS1FOW1PM1VRJElXTzcrJmNPM1VRJElXTzcrJmNPT1EkSVYsNTxaLDU8Wk8jK1VRJElXTyw1PFpPT1EkSVY3KyZjNysmY08jK2FRJElaTzcrJmNPIy5sUSRJV08sNTxbTyMud1EkSVdPMUczY09PUSRJUy1FOW4tRTluTyMvVVEkSVdPMUczY08jL15RJElXTycjSF9PIy9sUSRJV08nI0hfTy98USRJV08nI0hfT09RJElTJyNIXycjSF9PIy93USRJV08nI0heT09RJElTLDU7ZSw1O2VPIzBQUSRJV08sNTtlTy9nUSRJV08nI0V7T09RJElWNysmaTcrJmlPM1VRJElXTzcrJmlPT1EkSVY3KyZuNysmbk9PUSRJUzFHMnQxRzJ0T09RJElTLDU7cyw1O3NPIzBVUSRJV08xRzJzT09RJElTLUU5Vi1FOVZPIzBpUSRJV08sNTt0TyMwdFEkSVdPLDU7dE8jMVhRJElXTzFHMnVPT1EkSVMtRTlXLUU5V08jMWlRJElXTzFHMnVPIzFxUSRJV08xRzJ1TyMyUlEkSVdPMUcydU8jMWlRJElXTzFHMnVPT1EkSVM8PEhYPDxIWE8jMl5RJElbTzFHMVtPT1EkSVM8PEhpPDxIaVAjMmtRJElXTycjRlVPNnxRJElXTzFHMm1PIzJ4USRJV08xRzJtTyMyfVEkSVdPPDxIaU9PUSRJUzw8SGo8PEhqTyMzX1EkSVdPNysoXU9PUSRJUzw8SHE8PEhxTyMzb1EkSVtPMUcxWlAjNGBRJElXTycjRlRPIzRtUSRJV083KyheTyM0fVEkSVdPNysoXk8jNVZRJElXTzw8SHVPIzVbUSRJV083KyhXT09RJElTPDxIdzw8SHdPIzZSUSRJV08sNTtyTydSUSRJV08sNTtyT09RJElTLUU5VS1FOVVPT1EkSVM8PEh1PDxIdU9PUSRJUyw1O3gsNTt4Ty9nUSRJV08sNTt4TyM2V1EkSVdPMUczUU9PUSRJUy1FOVstRTlbTyM2blEkSVdPMUczUU9PT08nI0ZfJyNGX08jNnxPIUxRTyw1OmNPT09PLDU9Zyw1PWdPT09PNyslZzcrJWdPIzdYUSRJV08xRzJWTyM3clEkSVdPMUcyVlAnUlEkSVdPJyNGVk8vZ1EkSVdPPDxJa08jOFRRJElXTyw1PXNPIzhmUSRJV08sNT1zTy98USRJV08sNT1zTyM4d1EkSVdPPDxJbU9PUSRJUzw8SW08PEltTy98USRJV088PEltUC98USRJV08nI0ZqUC9nUSRJV08nI0ZmT09RJElWLUU5ay1FOWtPM1VRJElXTzw8SXdPT1EkSVYsNTxYLDU8WE8zVVEkSVdPLDU8WE9PUSRJVjw8SXc8PEl3T09RJElWPDxJejw8SXpPIzh8USRJW08xRzF0UCM5V1EkSVdPJyNGbk8jOV9RJElXTzcrKHxPIzlpUSRJWk88PEl8TzNVUSRJV088PEl8T09RJElWPDxKVDw8SlRPM1VRJElXTzw8SlRPT1EkSVYnI0ZsJyNGbE8jPHRRJElaTzcrJl5PT1EkSVY8PEl9PDxJfU8jPm1RJElaTzw8SX1PT1EkSVYxRzF1MUcxdU8vfFEkSVdPMUcxdU8zVVEkSVdPPDxJfU8vfFEkSVdPMUcxdlAvZ1EkSVdPJyNGcE8jQXhRJElXTzcrKH1PI0JWUSRJV083Kyh9T09RJElTJyNFeicjRXpPL2dRJElXTyw1PXlPI0JfUSRJV08sNT15T09RJElTLDU9eSw1PXlPI0JqUSRJV08sNT14TyNCe1EkSVdPLDU9eE9PUSRJUzFHMVAxRzFQT09RJElTLDU7Zyw1O2dQI0NUUSRJV08nI0ZYTyNDZVEkSVdPMUcxYE8jQ3hRJElXTzFHMWBPI0RZUSRJV08xRzFgUCNEZVEkSVdPJyNGWU8jRHJRJElXTzcrKGFPI0VTUSRJV083KyhhTyNFU1EkSVdPNysoYU8jRVtRJElXTzcrKGFPI0VsUSRJV083KyhYTzZ8USRJV083KyhYT09RJElTQU4+VEFOPlRPI0ZWUSRJV088PEt4T09RJElTQU4+YUFOPmFPL2dRJElXTzFHMV5PI0ZnUSRJW08xRzFeUCNGcVEkSVdPJyNGV09PUSRJUzFHMWQxRzFkUCNHT1EkSVdPJyNGXk8jR11RJElXTzcrKGxPT09PLUU5XS1FOV1PI0dzUSRJV083KydxT09RJElTQU4/VkFOP1ZPI0heUSRJV08sNTxUTyNIclEkSVdPMUczX09PUSRJUy1FOWctRTlnTyNJVFEkSVdPMUczX09PUSRJU0FOP1hBTj9YTyNJZlEkSVdPQU4/WE9PUSRJVkFOP2NBTj9jT09RJElWMUcxczFHMXNPM1VRJElXT0FOP2hPI0lrUSRJWk9BTj9oT09RJElWQU4/b0FOP29PT1EkSVYtRTlqLUU5ak9PUSRJVjw8SXg8PEl4TzNVUSRJV09BTj9pTzNVUSRJV083KydhT09RJElWQU4/aUFOP2lPT1EkSVM3KydiNysnYk8jTHZRJElXTzw8TGlPT1EkSVMxRzNlMUczZU8vZ1EkSVdPMUczZU9PUSRJUyw1PF0sNTxdTyNNVFEkSVdPMUczZE9PUSRJUy1FOW8tRTlvTyNNZlEkSVdPNysmek8jTXZRJElXTzcrJnpPT1EkSVM3KyZ6Nysmek8jTlJRJElXTzw8S3tPI05jUSRJV088PEt7TyNOY1EkSVdPPDxLe08jTmtRJElXTycjR2lPT1EkSVM8PEtzPDxLc08jTnVRJElXTzw8S3NPT1EkSVM3KyZ4NysmeE8vfFEkSVdPMUcxb1AvfFEkSVdPJyNGaU8kIGBRJElXTzcrKHlPJCBxUSRJV083Kyh5T09RJElTRzI0c0cyNHNPT1EkSVZHMjVTRzI1U08zVVEkSVdPRzI1U09PUSRJVkcyNVRHMjVUT09RJElWPDxKezw8SntPT1EkSVM3KylQNyspUFAkIVNRJElXTycjRnFPT1EkSVM8PEpmPDxKZk8kIWJRJElXTzw8SmZPJCFyUSRJV09BTkFnTyQjU1EkSVdPQU5BZ08kI1tRJElXTycjR2pPT1EkSVMnI0dqJyNHak8waFEkSVdPJyNEYU8kI3VRJElXTyw1PVRPT1EkSVNBTkFfQU5BX09PUSRJUzcrJ1o3KydaTyQkXlEkSVdPPDxMZU9PUSRJVkxEKm5MRCpuT09RJElTQU5AUUFOQFFPJCRvUSRJV09HMjdSTyQlUFEkSVdPLDU5e09PUSRJUzFHMm8xRzJvTyNOa1EkSVdPMUcvZ09PUSRJUzcrJVI3KyVSTzZ8USRJV08nI0N6TzZ8USRJV08sNTlfTzZ8USRJV08sNTlfTzZ8USRJV08sNTlfTyQlVVEkSVtPLDU8a082fFEkSVdPMUcueU8vZ1EkSVdPMUcvVU8vZ1EkSVdPNyskbVAkJWlRJElXTycjRmRPJ1JRJElXTycjR1BPJCV2USRJV08sNTlfTyQle1EkSVdPLDU5X08kJlNRJElXTyw1OWpPJCZYUSRJV08xRy9STzBoUSRJV08nI0RPTzZ8USRJV08sNTlnXCIsXG4gIHN0YXRlRGF0YTogXCIkJm9+TyRvT1MkbE9TJGtPU1FPU35PUGhPVGVPZHNPZlhPbHRPcCFTT3N1T3x2T30hUE8hUiFWTyFTIVVPIVZZTyFaWk8hZmRPIW1kTyFuZE8hb2RPIXZ4TyF4eU8henpPIXx7TyNPfE8jU31PI1UhT08jWCFRTyNZIVFPI1shUk8jYyFUTyNmIVdPI2ohWE8jbCFZTyNxIVpPI3RsTyRqcU8kelFPJHtRTyVQUk8lUVZPJWVbTyVmXU8laV5PJWxfTyVyYE8ldWFPJXdiT35PVCFhT10hYU9fIWJPZiFpTyFWIWtPIWQhbE8kdSFbTyR2IV1PJHchXk8keCFfTyR5IV9PJHohYE8keyFgTyR8IWFPJH0hYU8lTyFhT35PaCVUWGklVFhqJVRYayVUWGwlVFhtJVRYcCVUWHclVFh4JVRYIXMlVFgjXiVUWCRqJVRYJG0lVFglViVUWCFPJVRYIVIlVFghUyVUWCVXJVRYIVclVFghWyVUWH0lVFgjViVUWHElVFghaiVUWH5QJF9PZHNPZlhPIVZZTyFaWk8hZmRPIW1kTyFuZE8hb2RPJHpRTyR7UU8lUFJPJVFWTyVlW08lZl1PJWleTyVsX08lcmBPJXVhTyV3Yk9+T3clU1h4JVNYI14lU1gkaiVTWCRtJVNYJVYlU1h+T2ghb09pIXBPaiFuT2shbk9sIXFPbSFyT3Ahc08hcyVTWH5QKGBPVCF5T2wtZk9zLXRPfHZPflAnUk9UIXxPbC1mT3MtdE8hVyF9T35QJ1JPVCNRT18jUk9sLWZPcy10TyFbI1NPflAnUk8lZyNWTyVoI1hPfk8laiNZTyVrI1hPfk8hWiNbTyVtI11PJXEjX09+TyFaI1tPJXMjYE8ldCNfT35PIVojW08laCNfTyV2I2JPfk8hWiNbTyVrI19PJXgjZE9+T1QkdFhdJHRYXyR0WGYkdFhoJHRYaSR0WGokdFhrJHRYbCR0WG0kdFhwJHRYdyR0WCFWJHRYIWQkdFgkdSR0WCR2JHRYJHckdFgkeCR0WCR5JHRYJHokdFgkeyR0WCR8JHRYJH0kdFglTyR0WCFPJHRYIVIkdFghUyR0WH5PJWVbTyVmXU8laV5PJWxfTyVyYE8ldWFPJXdiT3gkdFghcyR0WCNeJHRYJGokdFgkbSR0WCVWJHRYJVckdFghVyR0WCFbJHRYfSR0WCNWJHRYcSR0WCFqJHRYflArdU93I2lPeCRzWCFzJHNYI14kc1gkaiRzWCRtJHNYJVYkc1h+T2wtZk9zLXRPflAnUk8jXiNsTyRqI25PJG0jbk9+TyVRVk9+TyFSI3NPI2whWU8jcSFaTyN0bE9+T2x0T35QJ1JPVCN4T18jeU8lUVZPeHRQfk9UI31PbC1mT3MtdE99JE9PflAnUk94JFFPIXMkVk8lViRSTyNeIXRYJGohdFgkbSF0WH5PVCN9T2wtZk9zLXRPI14hfVgkaiF9WCRtIX1YflAnUk9sLWZPcy10TyNeI1JYJGojUlgkbSNSWH5QJ1JPIWQkXU8hbSRdTyVRVk9+T1QkZ09+UCdSTyFTJGlPI2okak8jbCRrT35PeCRsT35PVCR6T18kek9sLWZPcy10TyFPJHxPflAnUk9sLWZPcy10T3glUE9+UCdSTyVkJVJPfk9fIWJPZiFpTyFWIWtPIWQhbE9UYGFdYGFoYGFpYGFqYGFrYGFsYGFtYGFwYGF3YGF4YGEhc2BhI15gYSRqYGEkbWBhJHVgYSR2YGEkd2BhJHhgYSR5YGEkemBhJHtgYSR8YGEkfWBhJU9gYSVWYGEhT2BhIVJgYSFTYGElV2BhIVdgYSFbYGF9YGEjVmBhcWBhIWpgYX5PayVXT35PbCVXT35QJ1JPbC1mT35QJ1JPaC1oT2ktaU9qLWdPay1nT2wtcE9tLXFPcC11TyFPJVNYIVIlU1ghUyVTWCVXJVNYIVclU1ghWyVTWH0lU1gjViVTWCFqJVNYflAoYE8lVyVZT3clUlghTyVSWCFSJVJYIVMlUlghVyVSWHglUlh+T3clXU8hTyVbTyFSJWFPIVMlYE9+TyFPJVtPfk93JWRPIVIlYU8hUyVgTyFXJV9Yfk8hVyVoT35PdyVpT3gla08hUiVhTyFTJWBPIVslWVh+TyFbJW9Pfk8hWyVwT35PJWcjVk8laCVyT35PJWojWU8layVyT35PVCV1T2wtZk9zLXRPfHZPflAnUk8hWiNbTyVtI11PJXEleE9+TyFaI1tPJXMjYE8ldCV4T35PIVojW08laCV4TyV2I2JPfk8hWiNbTyVrJXhPJXgjZE9+T1QhbGFdIWxhXyFsYWYhbGFoIWxhaSFsYWohbGFrIWxhbCFsYW0hbGFwIWxhdyFsYXghbGEhViFsYSFkIWxhIXMhbGEjXiFsYSRqIWxhJG0hbGEkdSFsYSR2IWxhJHchbGEkeCFsYSR5IWxhJHohbGEkeyFsYSR8IWxhJH0hbGElTyFsYSVWIWxhIU8hbGEhUiFsYSFTIWxhJVchbGEhVyFsYSFbIWxhfSFsYSNWIWxhcSFsYSFqIWxhflAjdk93JX1PeCRzYSFzJHNhI14kc2EkaiRzYSRtJHNhJVYkc2F+UCRfT1QmUE9sdE9zdU94JHNhIXMkc2EjXiRzYSRqJHNhJG0kc2ElViRzYX5QJ1JPdyV9T3gkc2EhcyRzYSNeJHNhJGokc2EkbSRzYSVWJHNhfk9QaE9UZU9sdE9zdU98dk99IVBPIXZ4TyF4eU8henpPIXx7TyNPfE8jU31PI1UhT08jWCFRTyNZIVFPI1shUk8jXiRfWCRqJF9YJG0kX1h+UCdSTyNeI2xPJGomVU8kbSZVT35PIWQmVk9mJXpYJGolelgjViV6WCNeJXpYJG0lelgjVSV6WH5PZiFpTyRqJlhPfk9oY2FpY2FqY2FrY2FsY2FtY2FwY2F3Y2F4Y2Ehc2NhI15jYSRqY2EkbWNhJVZjYSFPY2EhUmNhIVNjYSVXY2EhV2NhIVtjYX1jYSNWY2FxY2EhamNhflAkX09wbmF3bmF4bmEjXm5hJGpuYSRtbmElVm5hfk9oIW9PaSFwT2ohbk9rIW5PbCFxT20hck8hc25hflBEVE8lViZaT3clVVh4JVVYfk8lUVZPdyVVWHglVVh+T3cmXk94dFh+T3gmYE9+T3claU8jXiVZWCRqJVlYJG0lWVghTyVZWHglWVghWyVZWCFqJVlYJVYlWVh+T1Qtb09sLWZPcy10T3x2T35QJ1JPJVYkUk8jXlNhJGpTYSRtU2F+TyVWJFJPfk93JmlPI14lW1gkaiVbWCRtJVtYayVbWH5QJF9PdyZsT30ma08jXiNSYSRqI1JhJG0jUmF+TyNWJm1PI14jVGEkaiNUYSRtI1Rhfk8hZCRdTyFtJF1PI1Umb08lUVZPfk8jVSZvT35PdyZxTyNeJXxYJGolfFgkbSV8WH5PdyZzTyNeJXlYJGoleVgkbSV5WHgleVh+T3cmd09rJk9YflAkX09rJnpPfk9QaE9UZU9sdE9zdU98dk99IVBPIXZ4TyF4eU8henpPIXx7TyNPfE8jU31PI1UhT08jWCFRTyNZIVFPI1shUk8kaidQT35QJ1JPcSdUTyNnJ1JPI2gnU09QI2VhVCNlYWQjZWFmI2VhbCNlYXAjZWFzI2VhfCNlYX0jZWEhUiNlYSFTI2VhIVYjZWEhWiNlYSFmI2VhIW0jZWEhbiNlYSFvI2VhIXYjZWEheCNlYSF6I2VhIXwjZWEjTyNlYSNTI2VhI1UjZWEjWCNlYSNZI2VhI1sjZWEjYyNlYSNmI2VhI2ojZWEjbCNlYSNxI2VhI3QjZWEkZyNlYSRqI2VhJHojZWEkeyNlYSVQI2VhJVEjZWElZSNlYSVmI2VhJWkjZWElbCNlYSVyI2VhJXUjZWEldyNlYSRpI2VhJG0jZWF+T3cnVU8jVidXT3gmUFh+T2YnWU9+T2YhaU94JGxPfk9UIWFPXSFhT18hYk9mIWlPIVYha08hZCFsTyR3IV5PJHghX08keSFfTyR6IWBPJHshYE8kfCFhTyR9IWFPJU8hYU9oVWlpVWlqVWlrVWlsVWltVWlwVWl3VWl4VWkhc1VpI15VaSRqVWkkbVVpJHVVaSVWVWkhT1VpIVJVaSFTVWklV1VpIVdVaSFbVWl9VWkjVlVpcVVpIWpVaX5PJHYhXU9+UE55TyR2VWl+UE55T1QhYU9dIWFPXyFiT2YhaU8hViFrTyFkIWxPJHohYE8keyFgTyR8IWFPJH0hYU8lTyFhT2hVaWlVaWpVaWtVaWxVaW1VaXBVaXdVaXhVaSFzVWkjXlVpJGpVaSRtVWkkdVVpJHZVaSR3VWklVlVpIU9VaSFSVWkhU1VpJVdVaSFXVWkhW1VpfVVpI1ZVaXFVaSFqVWl+TyR4IV9PJHkhX09+UCEjdE8keFVpJHlVaX5QISN0T18hYk9mIWlPIVYha08hZCFsT2hVaWlVaWpVaWtVaWxVaW1VaXBVaXdVaXhVaSFzVWkjXlVpJGpVaSRtVWkkdVVpJHZVaSR3VWkkeFVpJHlVaSR6VWkke1VpJVZVaSFPVWkhUlVpIVNVaSVXVWkhV1VpIVtVaX1VaSNWVWlxVWkhalVpfk9UIWFPXSFhTyR8IWFPJH0hYU8lTyFhT35QISZyT1RVaV1VaSR8VWkkfVVpJU9VaX5QISZyTyFSJWFPIVMlYE93JWJYIU8lYlh+TyVWJ19PJVcnX09+UCt1T3cnYU8hTyVhWH5PIU8nY09+T3cnZE94J2ZPIVclY1h+T2wtZk9zLXRPdydkT3gnZ08hVyVjWH5QJ1JPIVcnaU9+T2ohbk9rIW5PbCFxT20hck9oZ2lwZ2l3Z2l4Z2khc2dpI15naSRqZ2kkbWdpJVZnaX5PaSFwT35QIStlT2lnaX5QIStlT2gtaE9pLWlPai1nT2stZ09sLXBPbS1xT35PcSdrT35QISxuT1QncE9sLWZPcy10TyFPJ3FPflAnUk93J3JPIU8ncU9+TyFPJ3RPfk8hUyd2T35PdydyTyFPJ3dPIVIlYU8hUyVgT35QJF9PaC1oT2ktaU9qLWdPay1nT2wtcE9tLXFPIU9uYSFSbmEhU25hJVduYSFXbmEhW25hfW5hI1ZuYXFuYSFqbmF+UERUT1QncE9sLWZPcy10TyFXJV9hflAnUk93J3pPIVclX2F+TyFXJ3tPfk93J3pPIVIlYU8hUyVgTyFXJV9hflAkX09UKFBPbC1mT3MtdE8hWyVZYSNeJVlhJGolWWEkbSVZYSFPJVlheCVZYSFqJVlhJVYlWWF+UCdST3coUU8hWyVZYSNeJVlhJGolWWEkbSVZYSFPJVlheCVZYSFqJVlhJVYlWWF+TyFbKFRPfk93KFFPIVIlYU8hUyVgTyFbJVlhflAkX093KFdPIVIlYU8hUyVgTyFbJWBhflAkX093KFpPeCVuWCFbJW5YIWolblh+T3goXk8hWyhgTyFqKGFPfk9UJlBPbHRPc3VPeCRzaSFzJHNpI14kc2kkaiRzaSRtJHNpJVYkc2l+UCdST3coYk94JHNpIXMkc2kjXiRzaSRqJHNpJG0kc2klViRzaX5PIWQmVk9mJXphJGolemEjViV6YSNeJXphJG0lemEjVSV6YX5PJGooZ09+T1QjeE9fI3lPJVFWT35PdyZeT3h0YX5PbHRPc3VPflAnUk93KFFPI14lWWEkaiVZYSRtJVlhIU8lWWF4JVlhIVslWWEhaiVZYSVWJVlhflAkX093KGxPI14kc1gkaiRzWCRtJHNYJVYkc1h+TyVWJFJPI15TaSRqU2kkbVNpfk8jXiVbYSRqJVthJG0lW2FrJVthflAnUk93KG9PI14lW2EkaiVbYSRtJVthayVbYX5PVChzT2YodU8lUVZPfk8jVSh2T35PJVFWTyNeJXxhJGolfGEkbSV8YX5Pdyh4TyNeJXxhJGolfGEkbSV8YX5PbC1mT3MtdE8jXiV5YSRqJXlhJG0leWF4JXlhflAnUk93KHtPI14leWEkaiV5YSRtJXlheCV5YX5PcSlQTyNhKU9PUCNfaVQjX2lkI19pZiNfaWwjX2lwI19pcyNfaXwjX2l9I19pIVIjX2khUyNfaSFWI19pIVojX2khZiNfaSFtI19pIW4jX2khbyNfaSF2I19pIXgjX2kheiNfaSF8I19pI08jX2kjUyNfaSNVI19pI1gjX2kjWSNfaSNbI19pI2MjX2kjZiNfaSNqI19pI2wjX2kjcSNfaSN0I19pJGcjX2kkaiNfaSR6I19pJHsjX2klUCNfaSVRI19pJWUjX2klZiNfaSVpI19pJWwjX2klciNfaSV1I19pJXcjX2kkaSNfaSRtI19pfk9xKVFPUCNiaVQjYmlkI2JpZiNiaWwjYmlwI2JpcyNiaXwjYml9I2JpIVIjYmkhUyNiaSFWI2JpIVojYmkhZiNiaSFtI2JpIW4jYmkhbyNiaSF2I2JpIXgjYmkheiNiaSF8I2JpI08jYmkjUyNiaSNVI2JpI1gjYmkjWSNiaSNbI2JpI2MjYmkjZiNiaSNqI2JpI2wjYmkjcSNiaSN0I2JpJGcjYmkkaiNiaSR6I2JpJHsjYmklUCNiaSVRI2JpJWUjYmklZiNiaSVpI2JpJWwjYmklciNiaSV1I2JpJXcjYmkkaSNiaSRtI2Jpfk9UKVNPayZPYX5QJ1JPdylUT2smT2F+T3cpVE9rJk9hflAkX09rKVhPfk8kaClbT35PcSlfTyNnJ1JPI2gpXk9QI2VpVCNlaWQjZWlmI2VpbCNlaXAjZWlzI2VpfCNlaX0jZWkhUiNlaSFTI2VpIVYjZWkhWiNlaSFmI2VpIW0jZWkhbiNlaSFvI2VpIXYjZWkheCNlaSF6I2VpIXwjZWkjTyNlaSNTI2VpI1UjZWkjWCNlaSNZI2VpI1sjZWkjYyNlaSNmI2VpI2ojZWkjbCNlaSNxI2VpI3QjZWkkZyNlaSRqI2VpJHojZWkkeyNlaSVQI2VpJVEjZWklZSNlaSVmI2VpJWkjZWklbCNlaSVyI2VpJXUjZWkldyNlaSRpI2VpJG0jZWl+T2wtZk9zLXRPeCRsT35QJ1JPbC1mT3MtdE94JlBhflAnUk93KWVPeCZQYX5PVClpT18pak8hTyltTyR8KWtPJVFWT35PeCRsTyZTKW9Pfk9UJHpPXyR6T2wtZk9zLXRPIU8lYWF+UCdST3cpdU8hTyVhYX5PbC1mT3MtdE94KXhPIVclY2F+UCdST3cpeU8hVyVjYX5PbC1mT3MtdE93KXlPeCl8TyFXJWNhflAnUk9sLWZPcy10T3cpeU8hVyVjYX5QJ1JPdyl5T3gpfE8hVyVjYX5Pai1nT2stZ09sLXBPbS1xT2hnaXBnaXdnaSFPZ2khUmdpIVNnaSVXZ2khV2dpeGdpIVtnaSNeZ2kkamdpJG1naX1naSNWZ2lxZ2khamdpJVZnaX5PaS1pT35QIUdtT2lnaX5QIUdtT1QncE9sLWZPcy10TyFPKlJPflAnUk9rKlRPfk93KlZPIU8qUk9+TyFPKldPfk9UJ3BPbC1mT3MtdE8hVyVfaX5QJ1JPdypYTyFXJV9pfk8hVypZT35PVChQT2wtZk9zLXRPIVslWWkjXiVZaSRqJVlpJG0lWWkhTyVZaXglWWkhaiVZaSVWJVlpflAnUk93Kl1PIVIlYU8hUyVgTyFbJWBpfk93KmBPIVslWWkjXiVZaSRqJVlpJG0lWWkhTyVZaXglWWkhaiVZaSVWJVlpfk8hWyphT35PXypjT2wtZk9zLXRPIVslYGl+UCdST3cqXU8hWyVgaX5PIVsqZU9+T1QqZ09sLWZPcy10T3glbmEhWyVuYSFqJW5hflAnUk93KmhPeCVuYSFbJW5hIWolbmF+TyFaI1tPJXAqa08hWyFrWH5PIVsqbU9+T3goXk8hWypuT35PVCZQT2x0T3N1T3gkc3EhcyRzcSNeJHNxJGokc3EkbSRzcSVWJHNxflAnUk93JFdpeCRXaSFzJFdpI14kV2kkaiRXaSRtJFdpJVYkV2l+UCRfT1QmUE9sdE9zdU9+UCdST1QmUE9sLWZPcy10TyNeJHNhJGokc2EkbSRzYSVWJHNhflAnUk93Km9PI14kc2EkaiRzYSRtJHNhJVYkc2F+T3cjeWEjXiN5YSRqI3lhJG0jeWFrI3lhflAkX08jXiVbaSRqJVtpJG0lW2lrJVtpflAnUk93KnJPI14jUnEkaiNScSRtI1Jxfk93KnNPI1YqdU8jXiV7WCRqJXtYJG0le1ghTyV7WH5PVCp3T2YqeE8lUVZPfk8lUVZPI14lfGkkaiV8aSRtJXxpfk9sLWZPcy10TyNeJXlpJGoleWkkbSV5aXgleWl+UCdST3EqfE8jYSlPT1AjX3FUI19xZCNfcWYjX3FsI19xcCNfcXMjX3F8I19xfSNfcSFSI19xIVMjX3EhViNfcSFaI19xIWYjX3EhbSNfcSFuI19xIW8jX3EhdiNfcSF4I19xIXojX3EhfCNfcSNPI19xI1MjX3EjVSNfcSNYI19xI1kjX3EjWyNfcSNjI19xI2YjX3EjaiNfcSNsI19xI3EjX3EjdCNfcSRnI19xJGojX3EkeiNfcSR7I19xJVAjX3ElUSNfcSVlI19xJWYjX3ElaSNfcSVsI19xJXIjX3EldSNfcSV3I19xJGkjX3EkbSNfcX5PayRiYXckYmF+UCRfT1QpU09rJk9pflAnUk93K1RPayZPaX5PUGhPVGVPbHRPcCFTT3N1T3x2T30hUE8hUiFWTyFTIVVPIXZ4TyF4eU8henpPIXx7TyNPfE8jU31PI1UhT08jWCFRTyNZIVFPI1shUk8jYyFUTyNmIVdPI2ohWE8jbCFZTyNxIVpPI3RsT35QJ1JPdytfT3gkbE8jVitfT35PI2grYE9QI2VxVCNlcWQjZXFmI2VxbCNlcXAjZXFzI2VxfCNlcX0jZXEhUiNlcSFTI2VxIVYjZXEhWiNlcSFmI2VxIW0jZXEhbiNlcSFvI2VxIXYjZXEheCNlcSF6I2VxIXwjZXEjTyNlcSNTI2VxI1UjZXEjWCNlcSNZI2VxI1sjZXEjYyNlcSNmI2VxI2ojZXEjbCNlcSNxI2VxI3QjZXEkZyNlcSRqI2VxJHojZXEkeyNlcSVQI2VxJVEjZXElZSNlcSVmI2VxJWkjZXElbCNlcSVyI2VxJXUjZXEldyNlcSRpI2VxJG0jZXF+TyNWK2FPdyRkYXgkZGF+T2wtZk9zLXRPeCZQaX5QJ1JPdytjT3gmUGl+T3gkUU8lVitlT3cmUlghTyZSWH5PJVFWT3cmUlghTyZSWH5PdytpTyFPJlFYfk8hTytrT35PVCR6T18kek9sLWZPcy10TyFPJWFpflAnUk94K25PdyN8YSFXI3xhfk9sLWZPcy10T3grb093I3xhIVcjfGF+UCdST2wtZk9zLXRPeCl4TyFXJWNpflAnUk93K3JPIVclY2l+T2wtZk9zLXRPdytyTyFXJWNpflAnUk93K3JPeCt1TyFXJWNpfk93I3hpIU8jeGkhVyN4aX5QJF9PVCdwT2wtZk9zLXRPflAnUk9rK3dPfk9UJ3BPbC1mT3MtdE8hTyt4T35QJ1JPVCdwT2wtZk9zLXRPIVclX3F+UCdST3cjd2khWyN3aSNeI3dpJGojd2kkbSN3aSFPI3dpeCN3aSFqI3dpJVYjd2l+UCRfT1QoUE9sLWZPcy10T35QJ1JPXypjT2wtZk9zLXRPIVslYHF+UCdST3creU8hWyVgcX5PIVsrek9+T1QoUE9sLWZPcy10TyFbJVlxI14lWXEkaiVZcSRtJVlxIU8lWXF4JVlxIWolWXElViVZcX5QJ1JPeCt7T35PVCpnT2wtZk9zLXRPeCVuaSFbJW5pIWolbml+UCdST3csUU94JW5pIVslbmkhaiVuaX5PIVojW08lcCprTyFbIWthfk9UJlBPbC1mT3MtdE8jXiRzaSRqJHNpJG0kc2klViRzaX5QJ1JPdyxTTyNeJHNpJGokc2kkbSRzaSVWJHNpfk8lUVZPI14le2EkaiV7YSRtJXthIU8le2F+T3csVk8jXiV7YSRqJXthJG0le2EhTyV7YX5PIU8sWU9+T2skYml3JGJpflAkX09UKVNPflAnUk9UKVNPayZPcX5QJ1JPcSxeT1AjZHlUI2R5ZCNkeWYjZHlsI2R5cCNkeXMjZHl8I2R5fSNkeSFSI2R5IVMjZHkhViNkeSFaI2R5IWYjZHkhbSNkeSFuI2R5IW8jZHkhdiNkeSF4I2R5IXojZHkhfCNkeSNPI2R5I1MjZHkjVSNkeSNYI2R5I1kjZHkjWyNkeSNjI2R5I2YjZHkjaiNkeSNsI2R5I3EjZHkjdCNkeSRnI2R5JGojZHkkeiNkeSR7I2R5JVAjZHklUSNkeSVlI2R5JWYjZHklaSNkeSVsI2R5JXIjZHkldSNkeSV3I2R5JGkjZHkkbSNkeX5PUGhPVGVPbHRPcCFTT3N1T3x2T30hUE8hUiFWTyFTIVVPIXZ4TyF4eU8henpPIXx7TyNPfE8jU31PI1UhT08jWCFRTyNZIVFPI1shUk8jYyFUTyNmIVdPI2ohWE8jbCFZTyNxIVpPI3RsTyRpLGJPJG0sYk9+UCdSTyNoLGNPUCNleVQjZXlkI2V5ZiNleWwjZXlwI2V5cyNleXwjZXl9I2V5IVIjZXkhUyNleSFWI2V5IVojZXkhZiNleSFtI2V5IW4jZXkhbyNleSF2I2V5IXgjZXkheiNleSF8I2V5I08jZXkjUyNleSNVI2V5I1gjZXkjWSNleSNbI2V5I2MjZXkjZiNleSNqI2V5I2wjZXkjcSNleSN0I2V5JGcjZXkkaiNleSR6I2V5JHsjZXklUCNleSVRI2V5JWUjZXklZiNleSVpI2V5JWwjZXklciNleSV1I2V5JXcjZXkkaSNleSRtI2V5fk9sLWZPcy10T3gmUHF+UCdST3csZ094JlBxfk8lVitlT3cmUmEhTyZSYX5PVClpT18pak8kfClrTyVRVk8hTyZRYX5PdyxrTyFPJlFhfk9UJHpPXyR6T2wtZk9zLXRPflAnUk9sLWZPcy10T3gsbU93I3xpIVcjfGl+UCdST2wtZk9zLXRPdyN8aSFXI3xpflAnUk94LG1PdyN8aSFXI3xpfk9sLWZPcy10T3gpeE9+UCdST2wtZk9zLXRPeCl4TyFXJWNxflAnUk93LHBPIVclY3F+T2wtZk9zLXRPdyxwTyFXJWNxflAnUk9wLHNPIVIlYU8hUyVgTyFPJVpxIVclWnEhWyVacXclWnF+UCEsbk9fKmNPbC1mT3MtdE8hWyVgeX5QJ1JPdyN6aSFbI3ppflAkX09fKmNPbC1mT3MtdE9+UCdST1QqZ09sLWZPcy10T35QJ1JPVCpnT2wtZk9zLXRPeCVucSFbJW5xIWolbnF+UCdST1QmUE9sLWZPcy10TyNeJHNxJGokc3EkbSRzcSVWJHNxflAnUk8jVix3T3ckXWEjXiRdYSRqJF1hJG0kXWEhTyRdYX5PJVFWTyNeJXtpJGole2kkbSV7aSFPJXtpfk93LHlPI14le2kkaiV7aSRtJXtpIU8le2l+TyFPLHtPfk9xLH1PUCNkIVJUI2QhUmQjZCFSZiNkIVJsI2QhUnAjZCFScyNkIVJ8I2QhUn0jZCFSIVIjZCFSIVMjZCFSIVYjZCFSIVojZCFSIWYjZCFSIW0jZCFSIW4jZCFSIW8jZCFSIXYjZCFSIXgjZCFSIXojZCFSIXwjZCFSI08jZCFSI1MjZCFSI1UjZCFSI1gjZCFSI1kjZCFSI1sjZCFSI2MjZCFSI2YjZCFSI2ojZCFSI2wjZCFSI3EjZCFSI3QjZCFSJGcjZCFSJGojZCFSJHojZCFSJHsjZCFSJVAjZCFSJVEjZCFSJWUjZCFSJWYjZCFSJWkjZCFSJWwjZCFSJXIjZCFSJXUjZCFSJXcjZCFSJGkjZCFSJG0jZCFSfk9sLWZPcy10T3gmUHl+UCdST1QpaU9fKWpPJHwpa08lUVZPIU8mUWl+T2wtZk9zLXRPdyN8cSFXI3xxflAnUk94LVRPdyN8cSFXI3xxfk9sLWZPcy10T3gpeE8hVyVjeX5QJ1JPdy1VTyFXJWN5fk9sLWZPcy1ZT35QJ1JPcCxzTyFSJWFPIVMlYE8hTyVaeSFXJVp5IVslWnl3JVp5flAhLG5PJVFWTyNeJXtxJGole3EkbSV7cSFPJXtxfk93LV5PI14le3EkaiV7cSRtJXtxIU8le3F+T1QpaU9fKWpPJHwpa08lUVZPfk9sLWZPcy10T3cjfHkhVyN8eX5QJ1JPbC1mT3MtdE94KXhPIVclYyFSflAnUk93LWFPIVclYyFSfk9wJV5YIU8lXlghUiVeWCFTJV5YIVclXlghWyVeWHclXlh+UCEsbk9wLHNPIVIlYU8hUyVgTyFPJV1hIVclXWEhWyVdYXclXWF+TyVRVk8jXiV7eSRqJXt5JG0le3khTyV7eX5PbC1mT3MtdE94KXhPIVclYyFaflAnUk94LWRPfk93Km9PI14kc2EkaiRzYSRtJHNhJVYkc2F+UCRfT1QmUE9sLWZPcy10T35QJ1JPay1rT35PbC1rT35QJ1JPeC1sT35PcS1tT35QISxuTyVmJWkldSV3JWUhWiVtJXMldiV4JWwlciVsJVF+XCIsXG4gIGdvdG86IFwiISx1JlNQUFBQJlRQJl0pbipUKmsrUytsLFZQLHFQJl0tXy1fJl1QJl1QMHBQUFBQUFAwcDNgUFAzYFA1bDV1OnlQUDp8O1s7X1BQUCZdJl1QUDtrJl1QUCZdJl1QUCZdJl0mXSZdO288YyZdUDxmUDxpPGlAT1BAZCZdUFBQQGhAbiZUUCZUJlRQJlRQJlRQJlRQJlRQJlQmVCZUUCZUUFAmVFBQJlRQQHRQQHtBUlBAe1BAe0B7UFBQQHtQQnpQQ1RDWkNhQnpQQHtDZ1BDbkN0Q3pEV0RqRHBEekVRRW5FdEV6RlFGW0ZiRmhGbkZ0RnpHXkdoR25HdEd6SFVIW0hiSGhIbkh4SU9JWUlgUFBQUFBQUFBQSWlJcUl6SlVKYVBQUFBQUFBQUFBQUE52ISBgISVuISh6UFAhKVMhKWIhKWshKmEhKlchKmohKnAhKnMhKnYhKnkhK1JQUFBQUFBQUFBQIStVIStYUFBQUFBQUFBQIStfIStrISt3ISxUISxXISxeISxkISxqISxtXWlPciNsJGwpWytaJ29kT1NYWVplaHJzdHZ4fH0hUiFTIVQhVSFYIWMhZCFlIWYhZyFoIWkhayFuIW8hcCFyIXMheSF8I1EjUiNbI2kjbCN9JE8kUSRTJFYkZyRpJGokbCR6JVAlVyVaJV0lYCVkJWklayV1JX0mUCZbJmAmaSZrJmwmcyZ3JnonUidVJ2AnYSdkJ2YnZydrJ3Ancid2J3ooUChRKFcoWihiKGQobChvKHspTylTKVQpWClbKWUpbyl1KXgpeSl8KlMqVCpWKlgqWypdKmAqYypnKmgqbypxKnIqeitTK1QrWitiK2MrZittK24rbytxK3IrdSt3K3kreyt9LFAsUSxTLGcsaSxtLHAscy1ULVUtYS1kLWYtZy1oLWktay1sLW0tbi1vLXEtdXchY1AjaCN1JFckZiViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWp5IWRQI2gjdSRXJGYkciViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWp7IWVQI2gjdSRXJGYkciRzJWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtan0hZlAjaCN1JFckZiRyJHMkdCViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWohUCFnUCNoI3UkVyRmJHIkcyR0JHUlYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qIVIhaFAjaCN1JFckZiRyJHMkdCR1JHYlYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qIVYhaFAhbSNoI3UkVyRmJHIkcyR0JHUkdiR3JWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtaidvU09TWFlaZWhyc3R2eHx9IVIhUyFUIVUhWCFjIWQhZSFmIWchaCFpIWshbiFvIXAhciFzIXkhfCNRI1IjWyNpI2wjfSRPJFEkUyRWJGckaSRqJGwkeiVQJVclWiVdJWAlZCVpJWsldSV9JlAmWyZgJmkmayZsJnMmdyZ6J1InVSdgJ2EnZCdmJ2cnaydwJ3Indid6KFAoUShXKFooYihkKGwobyh7KU8pUylUKVgpWyllKW8pdSl4KXkpfCpTKlQqVipYKlsqXSpgKmMqZypoKm8qcSpyKnorUytUK1orYitjK2YrbStuK28rcStyK3Urdyt5K3srfSxQLFEsUyxnLGksbSxwLHMtVC1VLWEtZC1mLWctaC1pLWstbC1tLW4tby1xLXUmWlVPWFlaaHJ0dnx9IVIhUyFUIVghaSFrIW4hbyFwIXIhcyNbI2kjbCRPJFEkUyRWJGokbCR6JVAlVyVaJV0lZCVpJWsldSV9JlsmYCZrJmwmcyZ6J1InVSdgJ2EnZCdmJ2cnaydyJ3ooUShXKFooYihkKGwoeylPKVgpWyllKW8pdSl4KXkpfCpTKlQqVipYKlsqXSpgKmcqaCpvKnIqeitaK2IrYytmK20rbitvK3Ercit1K3creSt7K30sUCxRLFMsZyxpLG0scCxzLVQtVS1hLWQtZi1nLWgtaS1rLWwtbS1uLXEtdSVlV09YWVpocnZ8fSFSIVMhVCFYIWkhayNbI2kjbCRPJFEkUyRWJGokbCR6JVAlWiVdJWQlaSVrJXUlfSZbJmAmayZsJnMmeidSJ1UnYCdhJ2QnZidnJ2sncid6KFEoVyhaKGIoZChsKHspTylYKVspZSlvKXUpeCl5KXwqUypWKlgqWypdKmAqZypoKm8qcip6K1orYitjK2YrbStuK28rcStyK3UreSt7K30sUCxRLFMsZyxpLG0scC1ULVUtYS1sLW0tblEje3VRLWItWVItci10J2ZkT1NYWVplaHJzdHZ4fH0hUiFTIVQhVSFYIWMhZCFlIWYhZyFoIWshbiFvIXAhciFzIXkhfCNRI1IjWyNpI2wjfSRPJFEkUyRWJGckaSRqJGwkeiVQJVclWiVdJWAlZCVpJWsldSV9JlAmWyZgJmkmayZsJnMmdyZ6J1InVSdgJ2QnZidnJ2sncCdyJ3YneihQKFEoVyhaKGIoZChsKG8oeylPKVMpVClYKVspZSlvKXgpeSl8KlMqVCpWKlgqWypdKmAqYypnKmgqbypxKnIqeitTK1QrWitiK2MrZituK28rcStyK3Urdyt5K3srfSxQLFEsUyxnLGksbSxwLHMtVC1VLWEtZC1mLWctaC1pLWstbC1tLW4tby1xLXVXI29sIU8hUCReVyN3dSZeLVktdFEkYCFRUSRwIVlRJHEhWlckeSFpJ2EpdSttUyZdI3gjeVEmfSRrUShlJlZRKHMmbVcodCZvKHUodip4VSh3JnEoeCp5USlnJ1dXKWgnWStpLGstUlMraClpKWpZLFUqcyxWLHgseS1eUSxYKnVRLGQrX1EsZithUi1dLHdSJlsjd2khdlhZIVMhVCVdJWQncid6KU8qUypWKlhSJVohdVEhelhRJXYjW1EmZSRTUiZoJFZULVgscy1kIVUhalAhbSNoI3UkVyRmJHIkcyR0JHUkdiR3JWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtalEmWSNwUiddJHFSJ2AkeVIlUyFsJ25jT1NYWVplaHJzdHZ4fH0hUiFTIVQhVSFYIWMhZCFlIWYhZyFoIWkhayFuIW8hcCFyIXMheSF8I1EjUiNbI2kjbCN9JE8kUSRTJFYkZyRpJGokbCR6JVAlVyVaJV0lYCVkJWklayV1JX0mUCZbJmAmaSZrJmwmcyZ3JnonUidVJ2AnYSdkJ2YnZydrJ3Ancid2J3ooUChRKFcoWihiKGQobChvKHspTylTKVQpWClbKWUpbyl1KXgpeSl8KlMqVCpWKlgqWypdKmAqYypnKmgqbypxKnIqeitTK1QrWitiK2MrZittK24rbytxK3IrdSt3K3kreyt9LFAsUSxTLGcsaSxtLHAscy1ULVUtYS1kLWYtZy1oLWktay1sLW0tbi1vLXEtdVQjZmMjZ1MjXV8jXlMjYGAjYVMjYmEjY1MjZGIjZVQqayheKmxUKF8ldihhUSRVd1IrZyloWCRTdyRUJFUmZ1prT3IkbClbK1pYb09yKVsrWlEkbSFXUSZ1JGRRJnYkZVEnWCRvUSdbJHFRKVkmfFEpYCdSUSliJ1NRKWMnVFEpcCdaUSlyJ11RKn0pT1ErUClQUStRKVFRK1UpV1MrVylaKXFRK1spXlErXSlfUSteKWFRLFsqfFEsXStPUSxfK1ZRLGArWFEsZStgUSx8LF5RLU8sY1EtUCxkUi1fLH1Xb09yKVsrWlIjcm5RJ1okcFIpWiZ9UStmKWhSLGkrZ1EpcSdaUitYKVpabU9ucilbK1pRck9SI3RyUSZfI3pSKGomX1MlaiNQI3xTKFIlaihVVChVJW0mYVElXiF4USVlIXtXJ3MlXiVlJ3gnfFEneCViUid8JWdRJmokV1IocCZqUShYJW5RKl4oU1QqZChYKl5RJ2Ike1IpdidiUydlJU8lUFkpeidlKXsrcyxxLVZVKXsnZidnJ2hVK3MpfCl9Kk9TLHErdCt1Ui1WLHJRI1ddUiVxI1dRI1peUiVzI1pRI15fUiV3I15RKFsldFMqaShbKmpSKmooXVEqbCheUixSKmxRI2FgUiV5I2FRI2NhUiV6I2NRI2ViUiV7I2VRI2djUiV8I2dRI2pmUSZPI2hXJlIjaiZPKG0qcFEobSZkUipwLWpRJFR3UyZmJFQmZ1ImZyRVUSZ0JGJSKHwmdFEmVyNvUihmJldRJF4hUFImbiReUSp0KHRTLFcqdCx6Uix6LFhRJnIkYFIoeSZyUSNtalImVCNtUStaKVtSLGErWlEofSZ1Uip7KH1RJngkZlMpVSZ4KVZSKVYmeVEnUSRtUildJ1FRJ1YkblMpZidWK2RSK2QpZ1ErailsUixsK2pXbk9yKVsrWlIjcW5TcU9yVCtZKVsrWldwT3IpWytaUidPJGxZak9yJGwpWytaUiZTI2xbd09yI2wkbClbK1pSJmUkUyZZUE9YWVpocnR2fH0hUiFTIVQhWCFpIWshbiFvIXAhciFzI1sjaSNsJE8kUSRTJFYkaiRsJHolUCVXJVolXSVkJWklayV1JX0mWyZgJmsmbCZzJnonUidVJ2AnYSdkJ2YnZydrJ3IneihRKFcoWihiKGQobCh7KU8pWClbKWUpbyl1KXgpeSl8KlMqVCpWKlgqWypdKmAqZypoKm8qcip6K1orYitjK2YrbStuK28rcStyK3Urdyt5K3srfSxQLFEsUyxnLGksbSxwLHMtVC1VLWEtZC1mLWctaC1pLWstbC1tLW4tcS11USFtU1EjaGVRI3VzVSRXeCVgJ3ZTJGYhVSRpUSRyIWNRJHMhZFEkdCFlUSR1IWZRJHYhZ1EkdyFoUSViIXlRJWchfFElbSNRUSVuI1JRJmEjfVEmeSRnUShjJlBVKG4maShvKnFXKVImdylUK1MrVFEqUSdwUSpaKFBRK1IpU1ErfCpjUi1qLW9RIXhYUSF7WVEkZCFTUSRlIVReJ28lXSVkJ3IneipTKlYqWFIrTylPW2ZPciNsJGwpWytaaCF1WFkhUyFUJV0lZCdyJ3opTypTKlYqWFEjUFpRI2toUyN8dnxRJFp9VyRiIVIkViZ6KVhTJG4hWCRqVyR4IWknYSl1K21RJU8ha1EldCNbYCZRI2klfShiKGQobCpvLFMtblEmYiRPUSZjJFFRJmQkU1EnXiR6USdoJVBRJ24lWlcoTyVpKFEqWypgUShTJWtRKF0ldVEoaCZbUyhrJmAtbFEocSZrUShyJmxVKHomcyh7KnpRKWEnUlkpZCdVKWUrYitjLGdRKXMnYF4pdydkKXkrcStyLHAtVS1hUSl9J2ZRKk8nZ1MqUCdrLW1XKmIoVypdK3krfVcqZihaKmgsUCxRUStsKW9RK3ApeFErdCl8USxPKmdRLFQqclEsaCtmUSxuK25RLG8rb1Escit1USx2K3tRLVEsaVEtUyxtUi1gLVRoVE9yI2kjbCRsJX0mYCdrKGIoZClbK1okeiF0WFlaaHZ8fSFSIVMhVCFYIWkhayNbJE8kUSRTJFYkaiR6JVAlWiVdJWQlaSVrJXUmWyZrJmwmcyZ6J1InVSdgJ2EnZCdmJ2cncid6KFEoVyhaKGwoeylPKVgpZSlvKXUpeCl5KXwqUypWKlgqWypdKmAqZypoKm8qcip6K2IrYytmK20rbitvK3Ercit1K3kreyt9LFAsUSxTLGcsaSxtLHAtVC1VLWEtbC1tLW5RI3Z0VyVUIW4hci1nLXFRJVUhb1ElViFwUSVYIXNRJWMtZlMnaiVXLWtRJ2wtaFEnbS1pUSt2KlRRLHUrd1MtVyxzLWRSLXMtdVUjenUtWS10UihpJl5bZ09yI2wkbClbK1pYIXdYI1skUyRWUSNVWlEkUHZSJFl8USVfIXhRJWYhe1ElbCNQUSdeJHhRJ3klYlEnfSVnUShWJW1RKFklblEqXyhTUSx0K3ZRLVssdVItYy1aUSRYeFEndSVgUipVJ3ZRLVosc1ItZS1kUiNPWVIjVFpSJH0haVEkeyFpVil0J2EpdSttUiVRIWtSJXYjW1EoYCV2UipuKGFRJGMhUlEmaCRWUSlXJnpSK1YpWFEjcGxRJFshT1EkXyFQUiZwJF5RKHMmb1Eqdih1USp3KHZSLFoqeFIkYSFRWHBPcilbK1pRJGghVVImeyRpUSRvIVhSJnwkalIpbidZUSlsJ1lWLGoraSxrLVJcIixcbiAgbm9kZU5hbWVzOiBcIuKaoCBwcmludCBDb21tZW50IFNjcmlwdCBBc3NpZ25TdGF0ZW1lbnQgKiBCaW5hcnlFeHByZXNzaW9uIEJpdE9wIEJpdE9wIEJpdE9wIEJpdE9wIEFyaXRoT3AgQXJpdGhPcCBAIEFyaXRoT3AgKiogVW5hcnlFeHByZXNzaW9uIEFyaXRoT3AgQml0T3AgQXdhaXRFeHByZXNzaW9uIGF3YWl0IFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uICggQmluYXJ5RXhwcmVzc2lvbiBvciBhbmQgQ29tcGFyZU9wIGluIG5vdCBpcyBVbmFyeUV4cHJlc3Npb24gQ29uZGl0aW9uYWxFeHByZXNzaW9uIGlmIGVsc2UgTGFtYmRhRXhwcmVzc2lvbiBsYW1iZGEgUGFyYW1MaXN0IFZhcmlhYmxlTmFtZSBBc3NpZ25PcCAsIDogTmFtZWRFeHByZXNzaW9uIEFzc2lnbk9wIFlpZWxkRXhwcmVzc2lvbiB5aWVsZCBmcm9tICkgVHVwbGVFeHByZXNzaW9uIENvbXByZWhlbnNpb25FeHByZXNzaW9uIGFzeW5jIGZvciBMYW1iZGFFeHByZXNzaW9uIEFycmF5RXhwcmVzc2lvbiBbIF0gQXJyYXlDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiBEaWN0aW9uYXJ5RXhwcmVzc2lvbiB7IH0gRGljdGlvbmFyeUNvbXByZWhlbnNpb25FeHByZXNzaW9uIFNldEV4cHJlc3Npb24gU2V0Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24gQ2FsbEV4cHJlc3Npb24gQXJnTGlzdCBBc3NpZ25PcCBNZW1iZXJFeHByZXNzaW9uIC4gUHJvcGVydHlOYW1lIE51bWJlciBTdHJpbmcgRm9ybWF0U3RyaW5nIEZvcm1hdFJlcGxhY2VtZW50IEZvcm1hdENvbnZlcnNpb24gRm9ybWF0U3BlYyBDb250aW51ZWRTdHJpbmcgRWxsaXBzaXMgTm9uZSBCb29sZWFuIFR5cGVEZWYgQXNzaWduT3AgVXBkYXRlU3RhdGVtZW50IFVwZGF0ZU9wIEV4cHJlc3Npb25TdGF0ZW1lbnQgRGVsZXRlU3RhdGVtZW50IGRlbCBQYXNzU3RhdGVtZW50IHBhc3MgQnJlYWtTdGF0ZW1lbnQgYnJlYWsgQ29udGludWVTdGF0ZW1lbnQgY29udGludWUgUmV0dXJuU3RhdGVtZW50IHJldHVybiBZaWVsZFN0YXRlbWVudCBQcmludFN0YXRlbWVudCBSYWlzZVN0YXRlbWVudCByYWlzZSBJbXBvcnRTdGF0ZW1lbnQgaW1wb3J0IGFzIFNjb3BlU3RhdGVtZW50IGdsb2JhbCBub25sb2NhbCBBc3NlcnRTdGF0ZW1lbnQgYXNzZXJ0IFN0YXRlbWVudEdyb3VwIDsgSWZTdGF0ZW1lbnQgQm9keSBlbGlmIFdoaWxlU3RhdGVtZW50IHdoaWxlIEZvclN0YXRlbWVudCBUcnlTdGF0ZW1lbnQgdHJ5IGV4Y2VwdCBmaW5hbGx5IFdpdGhTdGF0ZW1lbnQgd2l0aCBGdW5jdGlvbkRlZmluaXRpb24gZGVmIFBhcmFtTGlzdCBBc3NpZ25PcCBUeXBlRGVmIENsYXNzRGVmaW5pdGlvbiBjbGFzcyBEZWNvcmF0ZWRTdGF0ZW1lbnQgRGVjb3JhdG9yIEF0XCIsXG4gIG1heFRlcm06IDIzNCxcbiAgY29udGV4dDogdHJhY2tJbmRlbnQsXG4gIG5vZGVQcm9wczogW1xuICAgIFtOb2RlUHJvcC5ncm91cCwgLTE0LDQsODAsODIsODMsODUsODcsODksOTEsOTMsOTQsOTUsOTcsMTAwLDEwMyxcIlN0YXRlbWVudCBTdGF0ZW1lbnRcIiwtMjIsNiwxNiwxOSwyMSwzNyw0Nyw0OCw1Miw1NSw1Niw1OSw2MCw2MSw2Miw2NSw2OCw2OSw3MCw3NCw3NSw3Niw3NyxcIkV4cHJlc3Npb25cIiwtOSwxMDUsMTA3LDExMCwxMTIsMTEzLDExNywxMTksMTI0LDEyNixcIlN0YXRlbWVudFwiXVxuICBdLFxuICBza2lwcGVkTm9kZXM6IFswLDJdLFxuICByZXBlYXROb2RlQ291bnQ6IDMyLFxuICB0b2tlbkRhdGE6IFwiJkFhTWdSIV5PWCR9WFkhI3hZWyR9W10hI3hdcCR9cHEhI3hxciEmU3JzISl5c3QhQ3t0dSR9dXYkK312dyQuYXd4JC9teHkkTGd5eiRNbXp7JE5ze3wlI2N8fSUkb30hTyUldSFPIVAlKFshUCFRJTNiIVEhUiU2USFSIVslOlMhWyFdJUVPIV0hXiVHYiFeIV8lSGghXyFgJUtXIWAhYSVMZCFhIWIkfSFiIWMmIFAhYyFkJiFfIWQhZSYkUCFlIWgmIV8haCFpJi5SIWkhdCYhXyF0IXUmN2chdSF3JiFfIXcheCYsYSF4IX0mIV8hfSNPJjlxI08jUCElYiNQI1EmOncjUSNSJjt9I1IjUyYhXyNTI1QkfSNUI1UmIV8jVSNWJiRQI1YjWSYhXyNZI1omLlIjWiNmJiFfI2YjZyY3ZyNnI2kmIV8jaSNqJixhI2ojbyYhXyNvI3AmPVojcCNxJj5QI3EjciY/XSNyI3MmQFojcyRnJH0kZ34mIV88ciVgWiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9OVsmXlolcDdbJWdTJW1gJXYhYk9yJ1Byc0N4c3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQOVsnXlolcDdbJWdTJWpXJW1gJXYhYk9yJ1BycyZSc3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQOHooV1olcDdbJWpXT3IoeXJzKXdzdyh5d3g7YngjTyh5I08jUDJWI1Ajbyh5I28jcDduI3AjcSh5I3EjcjJrI3J+KHk4eilVWiVwN1slZ1MlalcldiFiT3IoeXJzKXdzdyh5d3goUHgjTyh5I08jUDJWI1Ajbyh5I28jcDduI3AjcSh5I3EjcjJrI3J+KHk4eipRWiVwN1slZ1MldiFiT3IoeXJzKnNzdyh5d3goUHgjTyh5I08jUDJWI1Ajbyh5I28jcDduI3AjcSh5I3EjcjJrI3J+KHk4eip8WiVwN1slZ1MldiFiT3IoeXJzK29zdyh5d3goUHgjTyh5I08jUDJWI1Ajbyh5I28jcDduI3AjcSh5I3EjcjJrI3J+KHk4cit4WCVwN1slZ1MldiFiT3crb3d4LGV4I08rbyNPI1AuViNQI28rbyNvI3AwXiNwI3ErbyNxI3IuayNyfitvOHIsalglcDdbT3crb3d4LVZ4I08rbyNPI1AuViNQI28rbyNvI3AwXiNwI3ErbyNxI3IuayNyfitvOHItW1glcDdbT3crb3d4LXd4I08rbyNPI1AuViNQI28rbyNvI3AwXiNwI3ErbyNxI3IuayNyfitvN1stfFIlcDdbTyNvLXcjcCNxLXcjcn4tdzhyLltUJXA3W08jbytvI28jcC5rI3AjcStvI3Ejci5rI3J+K28hZi5yViVnUyV2IWJPdy5rd3gvWHgjTy5rI08jUDBXI1Ajby5rI28jcDBeI3B+LmshZi9bVk93Lmt3eC9xeCNPLmsjTyNQMFcjUCNvLmsjbyNwMF4jcH4uayFmL3RVT3cua3gjTy5rI08jUDBXI1Ajby5rI28jcDBeI3B+LmshZjBaUE9+LmshZjBjViVnU093MHh3eDFeeCNPMHgjTyNQMlAjUCNvMHgjbyNwLmsjcH4weFMwfVQlZ1NPdzB4d3gxXngjTzB4I08jUDJQI1B+MHhTMWFUT3cweHd4MXB4I08weCNPI1AyUCNQfjB4UzFzU093MHh4I08weCNPI1AyUCNQfjB4UzJTUE9+MHg4ejJbVCVwN1tPI28oeSNvI3AyayNwI3EoeSNxI3IyayNyfih5IW4ydFglZ1MlalcldiFiT3Iya3JzM2FzdzJrd3g0d3gjTzJrI08jUDdoI1AjbzJrI28jcDduI3B+MmshbjNoWCVnUyV2IWJPcjJrcnM0VHN3Mmt3eDR3eCNPMmsjTyNQN2gjUCNvMmsjbyNwN24jcH4yayFuNFtYJWdTJXYhYk9yMmtycy5rc3cya3d4NHd4I08yayNPI1A3aCNQI28yayNvI3A3biNwfjJrIW40fFglaldPcjJrcnMzYXN3Mmt3eDVpeCNPMmsjTyNQN2gjUCNvMmsjbyNwN24jcH4yayFuNW5YJWpXT3Iya3JzM2FzdzJrd3g2WngjTzJrI08jUDdoI1AjbzJrI28jcDduI3B+MmtXNmBUJWpXT3I2WnJzNm9zI082WiNPI1A3YiNQfjZaVzZyVE9yNlpyczdScyNPNlojTyNQN2IjUH42Wlc3VVNPcjZacyNPNlojTyNQN2IjUH42Wlc3ZVBPfjZaIW43a1BPfjJrIW43dVglZ1MlaldPcjhicnM5T3N3OGJ3eDpVeCNPOGIjTyNQO1sjUCNvOGIjbyNwMmsjcH44Yls4aVYlZ1MlaldPcjhicnM5T3N3OGJ3eDpVeCNPOGIjTyNQO1sjUH44Yls5VFYlZ1NPcjhicnM5anN3OGJ3eDpVeCNPOGIjTyNQO1sjUH44Yls5b1YlZ1NPcjhicnMweHN3OGJ3eDpVeCNPOGIjTyNQO1sjUH44Yls6WlYlaldPcjhicnM5T3N3OGJ3eDpweCNPOGIjTyNQO1sjUH44Yls6dVYlaldPcjhicnM5T3N3OGJ3eDZaeCNPOGIjTyNQO1sjUH44Yls7X1BPfjhiOHo7aVolcDdbJWpXT3IoeXJzKXdzdyh5d3g8W3gjTyh5I08jUDJWI1Ajbyh5I28jcDduI3AjcSh5I3EjcjJrI3J+KHk3ZDxjWCVwN1slaldPcjxbcnM9T3MjTzxbI08jUD5iI1AjbzxbI28jcDZaI3AjcTxbI3EjcjZaI3J+PFs3ZD1UWCVwN1tPcjxbcnM9cHMjTzxbI08jUD5iI1AjbzxbI28jcDZaI3AjcTxbI3EjcjZaI3J+PFs3ZD11WCVwN1tPcjxbcnMtd3MjTzxbI08jUD5iI1AjbzxbI28jcDZaI3AjcTxbI3EjcjZaI3J+PFs3ZD5nVCVwN1tPI288WyNvI3A2WiNwI3E8WyNxI3I2WiNyfjxbOVs+e1QlcDdbTyNvJ1AjbyNwP1sjcCNxJ1AjcSNyP1sjcn4nUCNPP2dYJWdTJWpXJW1gJXYhYk9yP1tyc0BTc3c/W3d4NHd4I08/WyNPI1BDTyNQI28/WyNvI3BDVSNwfj9bI09AXVglZ1MlbWAldiFiT3I/W3JzQHhzdz9bd3g0d3gjTz9bI08jUENPI1Ajbz9bI28jcENVI3B+P1sjT0FSWCVnUyVtYCV2IWJPcj9bcnNBbnN3P1t3eDR3eCNPP1sjTyNQQ08jUCNvP1sjbyNwQ1UjcH4/WyF2QXdWJWdTJW1gJXYhYk93QW53eC9YeCNPQW4jTyNQQl4jUCNvQW4jbyNwQmQjcH5BbiF2QmFQT35BbiF2QmlWJWdTT3cweHd4MV54I08weCNPI1AyUCNQI28weCNvI3BBbiNwfjB4I09DUlBPfj9bI09DXVglZ1MlaldPcjhicnM5T3N3OGJ3eDpVeCNPOGIjTyNQO1sjUCNvOGIjbyNwP1sjcH44YjlbRFRaJXA3WyVnUyVtYCV2IWJPcidQcnNEdnN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUDlTRVJYJXA3WyVnUyVtYCV2IWJPd0R2d3gsZXgjT0R2I08jUEVuI1Ajb0R2I28jcEJkI3AjcUR2I3EjckFuI3J+RHY5U0VzVCVwN1tPI29EdiNvI3BBbiNwI3FEdiNxI3JBbiNyfkR2PGJGX1olcDdbJWpXJXNwJXgjdE9yR1Fycyl3c3dHUXd4TV54I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdRPGJHYVolcDdbJWdTJWpXJXNwJXYhYiV4I3RPckdRcnMpd3N3R1F3eEZTeCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUTxiSFhUJXA3W08jb0dRI28jcEhoI3AjcUdRI3EjckhoI3J+R1EmVUh1WCVnUyVqVyVzcCV2IWIleCN0T3JIaHJzM2Fzd0hod3hJYngjT0hoI08jUExkI1Ajb0hoI28jcExqI3B+SGgmVUlrWCVqVyVzcCV4I3RPckhocnMzYXN3SGh3eEpXeCNPSGgjTyNQTGQjUCNvSGgjbyNwTGojcH5IaCZVSmFYJWpXJXNwJXgjdE9ySGhyczNhc3dIaHd4Snx4I09IaCNPI1BMZCNQI29IaCNvI3BMaiNwfkhoJG5LVlglalclc3AleCN0T3JKfHJzNm9zd0p8d3hKfHgjT0p8I08jUEtyI1Ajb0p8I28jcEt4I3B+Snwkbkt1UE9+Snwkbkt9ViVqV09yNlpyczZvcyNPNlojTyNQN2IjUCNvNlojbyNwSnwjcH42WiZVTGdQT35IaCZVTHFYJWdTJWpXT3I4YnJzOU9zdzhid3g6VXgjTzhiI08jUDtbI1AjbzhiI28jcEhoI3B+OGI8Yk1pWiVwN1slalclc3AleCN0T3JHUXJzKXdzd0dRd3hOW3gjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1E6ek5nWiVwN1slalclc3AleCN0T3JOW3JzPU9zd05bd3hOW3gjT05bI08jUCEgWSNQI29OWyNvI3BLeCNwI3FOWyNxI3JKfCNyfk5bOnohIF9UJXA3W08jb05bI28jcEp8I3AjcU5bI3Ejckp8I3J+Tls8ciEgc1QlcDdbTyNvJH0jbyNwISFTI3AjcSR9I3EjciEhUyNyfiR9JmYhIWNYJWdTJWpXJW1gJXNwJXYhYiV4I3RPciEhU3JzQFNzdyEhU3d4SWJ4I08hIVMjTyNQISNPI1AjbyEhUyNvI3AhI1UjcH4hIVMmZiEjUlBPfiEhUyZmISNdWCVnUyVqV09yOGJyczlPc3c4Ynd4OlV4I084YiNPI1A7WyNQI284YiNvI3AhIVMjcH44Yk1nISRdYSVwN1slZ1MlalckbzFzJW1gJXNwJXYhYiV4I3RPWCR9WFkhI3hZWyR9W10hI3hdcCR9cHEhI3hxciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISViI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfU1nISVnWCVwN1tPWSR9WVohI3haXSR9XV4hI3heI28kfSNvI3AhIVMjcCNxJH0jcSNyISFTI3J+JH08dSEmZWIlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgISdtIWAjTyR9I08jUCEgbiNQI1QkfSNUI1UhKHMjVSNmJH0jZiNnIShzI2cjaCEocyNoI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH08dSEoUVpqUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9PHUhKVdaIWpSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyEqWV8ldHAlcDdbJWdTJWUsWCVtYCV2IWJPWSErWFlaJ1BaXSErWF1eJ1BeciErWHJzIUJQc3chK1h3eCEtZ3gjTyErWCNPI1AhPmUjUCNvIStYI28jcCFAfSNwI3EhK1gjcSNyIT55I3J+IStYRGUhK2hfJXA3WyVnUyVqVyVlLFglbWAldiFiT1khK1hZWidQWl0hK1hdXidQXnIhK1hycyEsZ3N3IStYd3ghLWd4I08hK1gjTyNQIT5lI1AjbyErWCNvI3AhQH0jcCNxIStYI3EjciE+eSNyfiErWERlISx0WiVwN1slZ1MlZSxYJW1gJXYhYk9yJ1Byc0N4c3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQRFQhLXBfJXA3WyVqVyVlLFhPWSEub1laKHlaXSEub11eKHleciEub3JzIS97c3chLm93eCE7UngjTyEubyNPI1AhMHkjUCNvIS5vI28jcCE2bSNwI3EhLm8jcSNyITFfI3J+IS5vRFQhLnxfJXA3WyVnUyVqVyVlLFgldiFiT1khLm9ZWih5Wl0hLm9dXih5XnIhLm9ycyEve3N3IS5vd3ghLWd4I08hLm8jTyNQITB5I1AjbyEubyNvI3AhNm0jcCNxIS5vI3EjciExXyNyfiEub0RUITBXWiVwN1slZ1MlZSxYJXYhYk9yKHlycypzc3coeXd4KFB4I08oeSNPI1AyViNQI28oeSNvI3A3biNwI3EoeSNxI3IyayNyfih5RFQhMU9UJXA3W08jbyEubyNvI3AhMV8jcCNxIS5vI3EjciExXyNyfiEuby13ITFqXSVnUyVqVyVlLFgldiFiT1khMV9ZWjJrWl0hMV9dXjJrXnIhMV9ycyEyY3N3ITFfd3ghM1h4I08hMV8jTyNQITZnI1AjbyExXyNvI3AhNm0jcH4hMV8tdyEybFglZ1MlZSxYJXYhYk9yMmtyczRUc3cya3d4NHd4I08yayNPI1A3aCNQI28yayNvI3A3biNwfjJrLXchM2BdJWpXJWUsWE9ZITFfWVoya1pdITFfXV4ya15yITFfcnMhMmNzdyExX3d4ITRYeCNPITFfI08jUCE2ZyNQI28hMV8jbyNwITZtI3B+ITFfLXchNGBdJWpXJWUsWE9ZITFfWVoya1pdITFfXV4ya15yITFfcnMhMmNzdyExX3d4ITVYeCNPITFfI08jUCE2ZyNQI28hMV8jbyNwITZtI3B+ITFfLGEhNWBYJWpXJWUsWE9ZITVYWVo2WlpdITVYXV42Wl5yITVYcnMhNXtzI08hNVgjTyNQITZhI1B+ITVYLGEhNlFUJWUsWE9yNlpyczdScyNPNlojTyNQN2IjUH42WixhITZkUE9+ITVYLXchNmpQT34hMV8tdyE2dl0lZ1MlalclZSxYT1khN29ZWjhiWl0hN29dXjhiXnIhN29ycyE4a3N3ITdvd3ghOVh4I08hN28jTyNQITp7I1AjbyE3byNvI3AhMV8jcH4hN28sZSE3eFolZ1MlalclZSxYT1khN29ZWjhiWl0hN29dXjhiXnIhN29ycyE4a3N3ITdvd3ghOVh4I08hN28jTyNQITp7I1B+ITdvLGUhOHJWJWdTJWUsWE9yOGJyczlqc3c4Ynd4OlV4I084YiNPI1A7WyNQfjhiLGUhOWBaJWpXJWUsWE9ZITdvWVo4YlpdITdvXV44Yl5yITdvcnMhOGtzdyE3b3d4ITpSeCNPITdvI08jUCE6eyNQfiE3byxlITpZWiVqVyVlLFhPWSE3b1laOGJaXSE3b11eOGJeciE3b3JzIThrc3chN293eCE1WHgjTyE3byNPI1AhOnsjUH4hN28sZSE7T1BPfiE3b0RUITtbXyVwN1slalclZSxYT1khLm9ZWih5Wl0hLm9dXih5XnIhLm9ycyEve3N3IS5vd3ghPFp4I08hLm8jTyNQITB5I1AjbyEubyNvI3AhNm0jcCNxIS5vI3EjciExXyNyfiEub0JtITxkXSVwN1slalclZSxYT1khPFpZWjxbWl0hPFpdXjxbXnIhPFpycyE9XXMjTyE8WiNPI1AhPlAjUCNvITxaI28jcCE1WCNwI3EhPFojcSNyITVYI3J+ITxaQm0hPWRYJXA3WyVlLFhPcjxbcnM9cHMjTzxbI08jUD5iI1AjbzxbI28jcDZaI3AjcTxbI3EjcjZaI3J+PFtCbSE+VVQlcDdbTyNvITxaI28jcCE1WCNwI3EhPFojcSNyITVYI3J+ITxaRGUhPmpUJXA3W08jbyErWCNvI3AhPnkjcCNxIStYI3EjciE+eSNyfiErWC5YIT9XXSVnUyVqVyVlLFglbWAldiFiT1khPnlZWj9bWl0hPnldXj9bXnIhPnlycyFAUHN3IT55d3ghM1h4I08hPnkjTyNQIUB3I1AjbyE+eSNvI3AhQH0jcH4hPnkuWCFAW1glZ1MlZSxYJW1gJXYhYk9yP1tyc0B4c3c/W3d4NHd4I08/WyNPI1BDTyNQI28/WyNvI3BDVSNwfj9bLlghQHpQT34hPnkuWCFBV10lZ1MlalclZSxYT1khN29ZWjhiWl0hN29dXjhiXnIhN29ycyE4a3N3ITdvd3ghOVh4I08hN28jTyNQITp7I1AjbyE3byNvI3AhPnkjcH4hN29HWiFCXlolcDdbJWdTJWUsWCVtYCV2IWJPcidQcnMhQ1BzdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1BHWiFDYFglayN8JXA3WyVnUyVpLFglbWAldiFiT3dEdnd4LGV4I09EdiNPI1BFbiNQI29EdiNvI3BCZCNwI3FEdiNxI3JBbiNyfkR2TWchRGBfUTFzJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T1khQ3tZWiR9Wl0hQ3tdXiR9XnIhQ3tycyFFX3N3IUN7d3gjSHF4I08hQ3sjTyNQJChpI1AjbyFDeyNvI3AkKnsjcCNxIUN7I3EjciQpXSNyfiFDe0pQIUVsX1ExcyVwN1slZ1MlbWAldiFiT1khRmtZWidQWl0hRmtdXidQXnIhRmtycyNFa3N3IUZrd3ghR3l4I08hRmsjTyNQIz11I1AjbyFGayNvI3AjRGkjcCNxIUZrI3EjciM+aSNyfiFGa0pQIUZ6X1ExcyVwN1slZ1MlalclbWAldiFiT1khRmtZWidQWl0hRmtdXidQXnIhRmtycyFFX3N3IUZrd3ghR3l4I08hRmsjTyNQIz11I1AjbyFGayNvI3AjRGkjcCNxIUZrI3EjciM+aSNyfiFGa0lvIUhTX1ExcyVwN1slaldPWSFJUllaKHlaXSFJUl1eKHleciFJUnJzIUpfc3chSVJ3eCM4d3gjTyFJUiNPI1AjKlIjUCNvIUlSI28jcCMyfSNwI3EhSVIjcSNyIyp1I3J+IUlSSW8hSWBfUTFzJXA3WyVnUyVqVyV2IWJPWSFJUllaKHlaXSFJUl1eKHleciFJUnJzIUpfc3chSVJ3eCFHeXgjTyFJUiNPI1AjKlIjUCNvIUlSI28jcCMyfSNwI3EhSVIjcSNyIyp1I3J+IUlSSW8hSmpfUTFzJXA3WyVnUyV2IWJPWSFJUllaKHlaXSFJUl1eKHleciFJUnJzIUtpc3chSVJ3eCFHeXgjTyFJUiNPI1AjKlIjUCNvIUlSI28jcCMyfSNwI3EhSVIjcSNyIyp1I3J+IUlSSW8hS3RfUTFzJXA3WyVnUyV2IWJPWSFJUllaKHlaXSFJUl1eKHleciFJUnJzIUxzc3chSVJ3eCFHeXgjTyFJUiNPI1AjKlIjUCNvIUlSI28jcCMyfSNwI3EhSVIjcSNyIyp1I3J+IUlSSWchTU9dUTFzJXA3WyVnUyV2IWJPWSFMc1laK29aXSFMc11eK29edyFMc3d4IU13eCNPIUxzI08jUCMheSNQI28hTHMjbyNwIyZtI3AjcSFMcyNxI3IjI20jcn4hTHNJZyFOT11RMXMlcDdbT1khTHNZWitvWl0hTHNdXitvXnchTHN3eCFOd3gjTyFMcyNPI1AjIXkjUCNvIUxzI28jcCMmbSNwI3EhTHMjcSNyIyNtI3J+IUxzSWcjIE9dUTFzJXA3W09ZIUxzWVorb1pdIUxzXV4rb153IUxzd3gjIHd4I08hTHMjTyNQIyF5I1AjbyFMcyNvI3AjJm0jcCNxIUxzI3EjciMjbSNyfiFMc0hQIyFPWFExcyVwN1tPWSMgd1laLXdaXSMgd11eLXdeI28jIHcjbyNwIyFrI3AjcSMgdyNxI3IjIWsjcn4jIHcxcyMhcFJRMXNPWSMha1pdIyFrXn4jIWtJZyMjUVhRMXMlcDdbT1khTHNZWitvWl0hTHNdXitvXiNvIUxzI28jcCMjbSNwI3EhTHMjcSNyIyNtI3J+IUxzM1ojI3ZaUTFzJWdTJXYhYk9ZIyNtWVoua1pdIyNtXV4ua153IyNtd3gjJGl4I08jI20jTyNQIyZYI1AjbyMjbSNvI3AjJm0jcH4jI20zWiMkblpRMXNPWSMjbVlaLmtaXSMjbV1eLmtedyMjbXd4IyVheCNPIyNtI08jUCMmWCNQI28jI20jbyNwIyZtI3B+IyNtM1ojJWZaUTFzT1kjI21ZWi5rWl0jI21dXi5rXncjI213eCMha3gjTyMjbSNPI1AjJlgjUCNvIyNtI28jcCMmbSNwfiMjbTNaIyZeVFExc09ZIyNtWVoua1pdIyNtXV4ua15+IyNtM1ojJnRaUTFzJWdTT1kjJ2dZWjB4Wl0jJ2ddXjB4XncjJ2d3eCMoWngjTyMnZyNPI1AjKW0jUCNvIydnI28jcCMjbSNwfiMnZzF3IyduWFExcyVnU09ZIydnWVoweFpdIydnXV4weF53Iydnd3gjKFp4I08jJ2cjTyNQIyltI1B+IydnMXcjKGBYUTFzT1kjJ2dZWjB4Wl0jJ2ddXjB4XncjJ2d3eCMoe3gjTyMnZyNPI1AjKW0jUH4jJ2cxdyMpUVhRMXNPWSMnZ1laMHhaXSMnZ11eMHhedyMnZ3d4IyFreCNPIydnI08jUCMpbSNQfiMnZzF3IylyVFExc09ZIydnWVoweFpdIydnXV4weF5+IydnSW8jKllYUTFzJXA3W09ZIUlSWVooeVpdIUlSXV4oeV4jbyFJUiNvI3AjKnUjcCNxIUlSI3EjciMqdSNyfiFJUjNjIytRXVExcyVnUyVqVyV2IWJPWSMqdVlaMmtaXSMqdV1eMmteciMqdXJzIyt5c3cjKnV3eCMtfXgjTyMqdSNPI1AjMmkjUCNvIyp1I28jcCMyfSNwfiMqdTNjIyxTXVExcyVnUyV2IWJPWSMqdVlaMmtaXSMqdV1eMmteciMqdXJzIyx7c3cjKnV3eCMtfXgjTyMqdSNPI1AjMmkjUCNvIyp1I28jcCMyfSNwfiMqdTNjIy1VXVExcyVnUyV2IWJPWSMqdVlaMmtaXSMqdV1eMmteciMqdXJzIyNtc3cjKnV3eCMtfXgjTyMqdSNPI1AjMmkjUCNvIyp1I28jcCMyfSNwfiMqdTNjIy5VXVExcyVqV09ZIyp1WVoya1pdIyp1XV4ya15yIyp1cnMjK3lzdyMqdXd4Iy59eCNPIyp1I08jUCMyaSNQI28jKnUjbyNwIzJ9I3B+Iyp1M2MjL1VdUTFzJWpXT1kjKnVZWjJrWl0jKnVdXjJrXnIjKnVycyMreXN3Iyp1d3gjL314I08jKnUjTyNQIzJpI1AjbyMqdSNvI3AjMn0jcH4jKnUxeyMwVVhRMXMlaldPWSMvfVlaNlpaXSMvfV1eNlpeciMvfXJzIzBxcyNPIy99I08jUCMyVCNQfiMvfTF7IzB2WFExc09ZIy99WVo2WlpdIy99XV42Wl5yIy99cnMjMWNzI08jL30jTyNQIzJUI1B+Iy99MXsjMWhYUTFzT1kjL31ZWjZaWl0jL31dXjZaXnIjL31ycyMha3MjTyMvfSNPI1AjMlQjUH4jL30xeyMyWVRRMXNPWSMvfVlaNlpaXSMvfV1eNlpefiMvfTNjIzJuVFExc09ZIyp1WVoya1pdIyp1XV4ya15+Iyp1M2MjM1ddUTFzJWdTJWpXT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM0e3N3IzRQd3gjNm94I08jNFAjTyNQIzhjI1AjbyM0UCNvI3AjKnUjcH4jNFAyUCM0WVpRMXMlZ1MlaldPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzR7c3cjNFB3eCM2b3gjTyM0UCNPI1AjOGMjUH4jNFAyUCM1U1pRMXMlZ1NPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzV1c3cjNFB3eCM2b3gjTyM0UCNPI1AjOGMjUH4jNFAyUCM1fFpRMXMlZ1NPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIydnc3cjNFB3eCM2b3gjTyM0UCNPI1AjOGMjUH4jNFAyUCM2dlpRMXMlaldPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzR7c3cjNFB3eCM3aXgjTyM0UCNPI1AjOGMjUH4jNFAyUCM3cFpRMXMlaldPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzR7c3cjNFB3eCMvfXgjTyM0UCNPI1AjOGMjUH4jNFAyUCM4aFRRMXNPWSM0UFlaOGJaXSM0UF1eOGJefiM0UElvIzlRX1ExcyVwN1slaldPWSFJUllaKHlaXSFJUl1eKHleciFJUnJzIUpfc3chSVJ3eCM6UHgjTyFJUiNPI1AjKlIjUCNvIUlSI28jcCMyfSNwI3EhSVIjcSNyIyp1I3J+IUlSSFgjOlldUTFzJXA3WyVqV09ZIzpQWVo8W1pdIzpQXV48W15yIzpQcnMjO1JzI08jOlAjTyNQIz1SI1AjbyM6UCNvI3AjL30jcCNxIzpQI3EjciMvfSNyfiM6UEhYIztZXVExcyVwN1tPWSM6UFlaPFtaXSM6UF1ePFteciM6UHJzIzxScyNPIzpQI08jUCM9UiNQI28jOlAjbyNwIy99I3AjcSM6UCNxI3IjL30jcn4jOlBIWCM8WV1RMXMlcDdbT1kjOlBZWjxbWl0jOlBdXjxbXnIjOlBycyMgd3MjTyM6UCNPI1AjPVIjUCNvIzpQI28jcCMvfSNwI3EjOlAjcSNyIy99I3J+IzpQSFgjPVlYUTFzJXA3W09ZIzpQWVo8W1pdIzpQXV48W14jbyM6UCNvI3AjL30jcCNxIzpQI3EjciMvfSNyfiM6UEpQIz18WFExcyVwN1tPWSFGa1laJ1BaXSFGa11eJ1BeI28hRmsjbyNwIz5pI3AjcSFGayNxI3IjPmkjcn4hRmszcyM+dl1RMXMlZ1MlalclbWAldiFiT1kjPmlZWj9bWl0jPmldXj9bXnIjPmlycyM/b3N3Iz5pd3gjLX14I08jPmkjTyNQI0RUI1AjbyM+aSNvI3AjRGkjcH4jPmkzcyM/el1RMXMlZ1MlbWAldiFiT1kjPmlZWj9bWl0jPmldXj9bXnIjPmlycyNAc3N3Iz5pd3gjLX14I08jPmkjTyNQI0RUI1AjbyM+aSNvI3AjRGkjcH4jPmkzcyNBT11RMXMlZ1MlbWAldiFiT1kjPmlZWj9bWl0jPmldXj9bXnIjPmlycyNBd3N3Iz5pd3gjLX14I08jPmkjTyNQI0RUI1AjbyM+aSNvI3AjRGkjcH4jPmkzayNCU1pRMXMlZ1MlbWAldiFiT1kjQXdZWkFuWl0jQXddXkFuXncjQXd3eCMkaXgjTyNBdyNPI1AjQnUjUCNvI0F3I28jcCNDWiNwfiNBdzNrI0J6VFExc09ZI0F3WVpBblpdI0F3XV5Bbl5+I0F3M2sjQ2JaUTFzJWdTT1kjJ2dZWjB4Wl0jJ2ddXjB4XncjJ2d3eCMoWngjTyMnZyNPI1AjKW0jUCNvIydnI28jcCNBdyNwfiMnZzNzI0RZVFExc09ZIz5pWVo/W1pdIz5pXV4/W15+Iz5pM3MjRHJdUTFzJWdTJWpXT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM0e3N3IzRQd3gjNm94I08jNFAjTyNQIzhjI1AjbyM0UCNvI3AjPmkjcH4jNFBKUCNFeF9RMXMlcDdbJWdTJW1gJXYhYk9ZIUZrWVonUFpdIUZrXV4nUF5yIUZrcnMjRndzdyFGa3d4IUd5eCNPIUZrI08jUCM9dSNQI28hRmsjbyNwI0RpI3AjcSFGayNxI3IjPmkjcn4hRmtJdyNHVV1RMXMlcDdbJWdTJW1gJXYhYk9ZI0Z3WVpEdlpdI0Z3XV5Edl53I0Z3d3ghTXd4I08jRncjTyNQI0d9I1AjbyNGdyNvI3AjQ1ojcCNxI0Z3I3EjciNBdyNyfiNGd0l3I0hVWFExcyVwN1tPWSNGd1laRHZaXSNGd11eRHZeI28jRncjbyNwI0F3I3AjcSNGdyNxI3IjQXcjcn4jRndNViNJT19RMXMlcDdbJWpXJXNwJXgjdE9ZI0l9WVpHUVpdI0l9XV5HUV5yI0l9cnMhSl9zdyNJfXd4JCVdeCNPI0l9I08jUCNLXyNQI28jSX0jbyNwJCRaI3AjcSNJfSNxI3IjTFIjcn4jSX1NViNKYF9RMXMlcDdbJWdTJWpXJXNwJXYhYiV4I3RPWSNJfVlaR1FaXSNJfV1eR1FeciNJfXJzIUpfc3cjSX13eCNIcXgjTyNJfSNPI1AjS18jUCNvI0l9I28jcCQkWiNwI3EjSX0jcSNyI0xSI3J+I0l9TVYjS2ZYUTFzJXA3W09ZI0l9WVpHUVpdI0l9XV5HUV4jbyNJfSNvI3AjTFIjcCNxI0l9I3EjciNMUiNyfiNJfTZ5I0xiXVExcyVnUyVqVyVzcCV2IWIleCN0T1kjTFJZWkhoWl0jTFJdXkhoXnIjTFJycyMreXN3I0xSd3gjTVp4I08jTFIjTyNQJCN1I1AjbyNMUiNvI3AkJFojcH4jTFI2eSNNZl1RMXMlalclc3AleCN0T1kjTFJZWkhoWl0jTFJdXkhoXnIjTFJycyMreXN3I0xSd3gjTl94I08jTFIjTyNQJCN1I1AjbyNMUiNvI3AkJFojcH4jTFI2eSNOal1RMXMlalclc3AleCN0T1kjTFJZWkhoWl0jTFJdXkhoXnIjTFJycyMreXN3I0xSd3gkIGN4I08jTFIjTyNQJCN1I1AjbyNMUiNvI3AkJFojcH4jTFI1YyQgbl1RMXMlalclc3AleCN0T1kkIGNZWkp8Wl0kIGNdXkp8XnIkIGNycyMwcXN3JCBjd3gkIGN4I08kIGMjTyNQJCFnI1AjbyQgYyNvI3AkIXsjcH4kIGM1YyQhbFRRMXNPWSQgY1laSnxaXSQgY11eSnxefiQgYzVjJCNTWlExcyVqV09ZIy99WVo2WlpdIy99XV42Wl5yIy99cnMjMHFzI08jL30jTyNQIzJUI1AjbyMvfSNvI3AkIGMjcH4jL302eSQjelRRMXNPWSNMUllaSGhaXSNMUl1eSGhefiNMUjZ5JCRkXVExcyVnUyVqV09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNHtzdyM0UHd4IzZveCNPIzRQI08jUCM4YyNQI28jNFAjbyNwI0xSI3B+IzRQTVYkJWpfUTFzJXA3WyVqVyVzcCV4I3RPWSNJfVlaR1FaXSNJfV1eR1FeciNJfXJzIUpfc3cjSX13eCQmaXgjTyNJfSNPI1AjS18jUCNvI0l9I28jcCQkWiNwI3EjSX0jcSNyI0xSI3J+I0l9S28kJnZfUTFzJXA3WyVqVyVzcCV4I3RPWSQmaVlaTltaXSQmaV1eTlteciQmaXJzIztSc3ckJml3eCQmaXgjTyQmaSNPI1AkJ3UjUCNvJCZpI28jcCQheyNwI3EkJmkjcSNyJCBjI3J+JCZpS28kJ3xYUTFzJXA3W09ZJCZpWVpOW1pdJCZpXV5OW14jbyQmaSNvI3AkIGMjcCNxJCZpI3EjciQgYyNyfiQmaU1nJChwWFExcyVwN1tPWSFDe1laJH1aXSFDe11eJH1eI28hQ3sjbyNwJCldI3AjcSFDeyNxI3IkKV0jcn4hQ3s3WiQpbl1RMXMlZ1MlalclbWAlc3AldiFiJXgjdE9ZJCldWVohIVNaXSQpXV1eISFTXnIkKV1ycyM/b3N3JCldd3gjTVp4I08kKV0jTyNQJCpnI1AjbyQpXSNvI3AkKnsjcH4kKV03WiQqbFRRMXNPWSQpXVlaISFTWl0kKV1dXiEhU15+JCldN1okK1VdUTFzJWdTJWpXT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM0e3N3IzRQd3gjNm94I08jNFAjTyNQIzhjI1AjbyM0UCNvI3AkKV0jcH4jNFBHeiQsYl0kfVElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeiQtblohcyxXJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeiQudF0kd1ElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyQvfF8lcWAlcDdbJWpXJWUsWCVzcCV4I3RPWSQwe1laR1FaXSQwe11eR1FeciQwe3JzJDJdc3ckMHt3eCRKZXgjTyQweyNPI1AkRncjUCNvJDB7I28jcCRJYyNwI3EkMHsjcSNyJEddI3J+JDB7R2skMV5fJXA3WyVnUyVqVyVlLFglc3AldiFiJXgjdE9ZJDB7WVpHUVpdJDB7XV5HUV5yJDB7cnMkMl1zdyQwe3d4JEV3eCNPJDB7I08jUCRGdyNQI28kMHsjbyNwJEljI3AjcSQweyNxI3IkR10jcn4kMHtEVCQyaF8lcDdbJWdTJWUsWCV2IWJPWSQzZ1laKHlaXSQzZ11eKHleciQzZ3JzJEJhc3ckM2d3eCQ0c3gjTyQzZyNPI1AkNW8jUCNvJDNnI28jcCQ9eyNwI3EkM2cjcSNyJDZUI3J+JDNnRFQkM3RfJXA3WyVnUyVqVyVlLFgldiFiT1kkM2dZWih5Wl0kM2ddXih5XnIkM2dycyQyXXN3JDNnd3gkNHN4I08kM2cjTyNQJDVvI1AjbyQzZyNvI3AkPXsjcCNxJDNnI3EjciQ2VCNyfiQzZ0RUJDR8WiVwN1slalclZSxYT3IoeXJzKXdzdyh5d3g7YngjTyh5I08jUDJWI1Ajbyh5I28jcDduI3AjcSh5I3EjcjJrI3J+KHlEVCQ1dFQlcDdbTyNvJDNnI28jcCQ2VCNwI3EkM2cjcSNyJDZUI3J+JDNnLXckNmBdJWdTJWpXJWUsWCV2IWJPWSQ2VFlaMmtaXSQ2VF1eMmteciQ2VHJzJDdYc3ckNlR3eCQ9UngjTyQ2VCNPI1AkPXUjUCNvJDZUI28jcCQ9eyNwfiQ2VC13JDdiXSVnUyVlLFgldiFiT1kkNlRZWjJrWl0kNlRdXjJrXnIkNlRycyQ4WnN3JDZUd3gkPVJ4I08kNlQjTyNQJD11I1AjbyQ2VCNvI3AkPXsjcH4kNlQtdyQ4ZF0lZ1MlZSxYJXYhYk9ZJDZUWVoya1pdJDZUXV4ya15yJDZUcnMkOV1zdyQ2VHd4JD1SeCNPJDZUI08jUCQ9dSNQI28kNlQjbyNwJD17I3B+JDZULW8kOWZaJWdTJWUsWCV2IWJPWSQ5XVlaLmtaXSQ5XV1eLmtedyQ5XXd4JDpYeCNPJDldI08jUCQ6cyNQI28kOV0jbyNwJDp5I3B+JDldLW8kOl5WJWUsWE93Lmt3eC9xeCNPLmsjTyNQMFcjUCNvLmsjbyNwMF4jcH4uay1vJDp2UE9+JDldLW8kO1FaJWdTJWUsWE9ZJDtzWVoweFpdJDtzXV4weF53JDtzd3gkPGd4I08kO3MjTyNQJDx7I1AjbyQ7cyNvI3AkOV0jcH4kO3MsXSQ7elglZ1MlZSxYT1kkO3NZWjB4Wl0kO3NdXjB4XnckO3N3eCQ8Z3gjTyQ7cyNPI1AkPHsjUH4kO3MsXSQ8bFQlZSxYT3cweHd4MXB4I08weCNPI1AyUCNQfjB4LF0kPU9QT34kO3MtdyQ9WVglalclZSxYT3Iya3JzM2FzdzJrd3g1aXgjTzJrI08jUDdoI1AjbzJrI28jcDduI3B+MmstdyQ9eFBPfiQ2VC13JD5VXSVnUyVqVyVlLFhPWSQ+fVlaOGJaXSQ+fV1eOGJeciQ+fXJzJD95c3ckPn13eCRBbXgjTyQ+fSNPI1AkQlojUCNvJD59I28jcCQ2VCNwfiQ+fSxlJD9XWiVnUyVqVyVlLFhPWSQ+fVlaOGJaXSQ+fV1eOGJeciQ+fXJzJD95c3ckPn13eCRBbXgjTyQ+fSNPI1AkQlojUH4kPn0sZSRAUVolZ1MlZSxYT1kkPn1ZWjhiWl0kPn1dXjhiXnIkPn1ycyRAc3N3JD59d3gkQW14I08kPn0jTyNQJEJaI1B+JD59LGUkQHpaJWdTJWUsWE9ZJD59WVo4YlpdJD59XV44Yl5yJD59cnMkO3NzdyQ+fXd4JEFteCNPJD59I08jUCRCWiNQfiQ+fSxlJEF0ViVqVyVlLFhPcjhicnM5T3N3OGJ3eDpweCNPOGIjTyNQO1sjUH44YixlJEJeUE9+JD59RFQkQmxfJXA3WyVnUyVlLFgldiFiT1kkM2dZWih5Wl0kM2ddXih5XnIkM2dycyRDa3N3JDNnd3gkNHN4I08kM2cjTyNQJDVvI1AjbyQzZyNvI3AkPXsjcCNxJDNnI3EjciQ2VCNyfiQzZ0N7JEN2XSVwN1slZ1MlZSxYJXYhYk9ZJENrWVorb1pdJENrXV4rb153JENrd3gkRG94I08kQ2sjTyNQJEVjI1AjbyRDayNvI3AkOnkjcCNxJENrI3EjciQ5XSNyfiRDa0N7JER2WCVwN1slZSxYT3crb3d4LVZ4I08rbyNPI1AuViNQI28rbyNvI3AwXiNwI3ErbyNxI3IuayNyfitvQ3skRWhUJXA3W08jbyRDayNvI3AkOV0jcCNxJENrI3EjciQ5XSNyfiRDa0drJEZVWiVwN1slalclZSxYJXNwJXgjdE9yR1Fycyl3c3dHUXd4TV54I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdRR2skRnxUJXA3W08jbyQweyNvI3AkR10jcCNxJDB7I3EjciRHXSNyfiQwezFfJEdsXSVnUyVqVyVlLFglc3AldiFiJXgjdE9ZJEddWVpIaFpdJEddXV5IaF5yJEddcnMkN1hzdyRHXXd4JEhleCNPJEddI08jUCRJXSNQI28kR10jbyNwJEljI3B+JEddMV8kSHBYJWpXJWUsWCVzcCV4I3RPckhocnMzYXN3SGh3eEpXeCNPSGgjTyNQTGQjUCNvSGgjbyNwTGojcH5IaDFfJElgUE9+JEddMV8kSWxdJWdTJWpXJWUsWE9ZJD59WVo4YlpdJD59XV44Yl5yJD59cnMkP3lzdyQ+fXd4JEFteCNPJD59I08jUCRCWiNQI28kPn0jbyNwJEddI3B+JD59R2skSnJaJXA3WyVqVyVlLFglc3AleCN0T3JHUXJzKXdzd0dRd3gkS2V4I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdRR2skS3RaJWghZiVwN1slalclZixYJXNwJXgjdE9yTltycz1Pc3dOW3d4Tlt4I09OWyNPI1AhIFkjUCNvTlsjbyNwS3gjcCNxTlsjcSNySnwjcn5OW0d7JEx6WmYsWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9PHUkTlFaIU9SJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyUgV19ULFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeHokfXp7JSFWeyFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyUhal1fUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JSN2XSR6LFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH08dSUlU1p3UiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9TWclJlleJHssWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCFhJSdVIWEjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1CXiUnaVomUyZqJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyUob18hZFElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFPJH0hTyFQJSluIVAhUSR9IVEhWyUsTyFbI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slKlBdJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghTyR9IU8hUCUqeCFQI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slK11aIW0sWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klLGNnIWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVslLE8hWyFnJH0hZyFoJS16IWghbCR9IWwhbSUyWyFtI08kfSNPI1AhIG4jUCNSJH0jUiNTJSxPI1MjWCR9I1gjWSUteiNZI14kfSNeI18lMlsjXyNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klLl1hJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3h7JH17fCUvYnx9JH19IU8lL2IhTyFRJH0hUSFbJTBsIVsjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSUvc10lcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFbJTBsIVsjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSUxUGMhZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWyUwbCFbIWwkfSFsIW0lMlshbSNPJH0jTyNQISBuI1AjUiR9I1IjUyUwbCNTI14kfSNeI18lMlsjXyNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klMm9aIWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slM3VfJHxSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUCR9IVAhUSU0dCFRIV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd6JTVYXSVPUSVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JTZldSFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFPJH0hTyFQJTh4IVAhUSR9IVEhWyU6UyFbIWQkfSFkIWUlPFUhZSFnJH0hZyFoJS16IWghbCR9IWwhbSUyWyFtIXEkfSFxIXIlP08hciF6JH0heiF7JUFyIXsjTyR9I08jUCEgbiNQI1IkfSNSI1MlOlMjUyNVJH0jVSNWJTxVI1YjWCR9I1gjWSUteiNZI14kfSNeI18lMlsjXyNjJH0jYyNkJT9PI2QjbCR9I2wjbSVBciNtI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSU5Wl0lcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFbJSxPIVsjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSU6Z2khZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghTyR9IU8hUCU4eCFQIVEkfSFRIVslOlMhWyFnJH0hZyFoJS16IWghbCR9IWwhbSUyWyFtI08kfSNPI1AhIG4jUCNSJH0jUiNTJTpTI1MjWCR9I1gjWSUteiNZI14kfSNeI18lMlsjXyNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klPGdgJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhUiU9aSFSIVMlPWkhUyNPJH0jTyNQISBuI1AjUiR9I1IjUyU9aSNTI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSU9fGAhZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhUiU9aSFSIVMlPWkhUyNPJH0jTyNQISBuI1AjUiR9I1IjUyU9aSNTI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSU/YV8lcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFZJUBgIVkjTyR9I08jUCEgbiNQI1IkfSNSI1MlQGAjUyNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klQHNfIWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVklQGAhWSNPJH0jTyNQISBuI1AjUiR9I1IjUyVAYCNTI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSVCVGMlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFbJUNgIVshYyR9IWMhaSVDYCFpI08kfSNPI1AhIG4jUCNSJH0jUiNTJUNgI1MjVCR9I1QjWiVDYCNaI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSVDc2MhZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWyVDYCFbIWMkfSFjIWklQ2AhaSNPJH0jTyNQISBuI1AjUiR9I1IjUyVDYCNTI1QkfSNUI1olQ2AjWiNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9TWclRWNdeDFzJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCVGWyFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9PHUlRm9aJVdSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyVHdVojXixYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyVIe19qUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV4kfSFeIV8lSXohXyFgISdtIWAhYSEnbSFhI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3olSl9dJHhRJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slS2tdJVYsWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAhJ20hYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JUx3XmpSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCEnbSFgIWElTXMhYSNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd6JU5XXSR5USVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JiBmXV1RI3RQJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9TWcmIXRjJXA3WyVnUyVqVyVkJmolbWAlc3AldiFiJXgjdCVRLFhPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFbJiFfIVshYyR9IWMhfSYhXyF9I08kfSNPI1AhIG4jUCNSJH0jUiNTJiFfI1MjVCR9I1QjbyYhXyNvI3AhI1UjcCNxJH0jcSNyISFTI3IkZyR9JGd+JiFfTWcmJGZnJXA3WyVnUyVqVyVkJmolbWAlc3AldiFiJXgjdCVRLFhPciR9cnMmJX1zdyR9d3gmKVR4IVEkfSFRIVsmIV8hWyFjJH0hYyF0JiFfIXQhdSYsYSF1IX0mIV8hfSNPJH0jTyNQISBuI1AjUiR9I1IjUyYhXyNTI1QkfSNUI2YmIV8jZiNnJixhI2cjbyYhXyNvI3AhI1UjcCNxJH0jcSNyISFTI3IkZyR9JGd+JiFfRGUmJltfJXA3WyVnUyVlLFglbWAldiFiT1khK1hZWidQWl0hK1hdXidQXnIhK1hycyYnWnN3IStYd3ghLWd4I08hK1gjTyNQIT5lI1AjbyErWCNvI3AhQH0jcCNxIStYI3EjciE+eSNyfiErWERlJidoWiVwN1slZ1MlZSxYJW1gJXYhYk9yJ1BycyYoWnN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUERdJihoWCVwN1slZ1MlaSxYJW1gJXYhYk93RHZ3eCxleCNPRHYjTyNQRW4jUCNvRHYjbyNwQmQjcCNxRHYjcSNyQW4jcn5EdkdrJiliXyVwN1slalclZSxYJXNwJXgjdE9ZJDB7WVpHUVpdJDB7XV5HUV5yJDB7cnMkMl1zdyQwe3d4JipheCNPJDB7I08jUCRGdyNQI28kMHsjbyNwJEljI3AjcSQweyNxI3IkR10jcn4kMHtHayYqblolcDdbJWpXJWUsWCVzcCV4I3RPckdRcnMpd3N3R1F3eCYrYXgjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1FGVCYrblolcDdbJWpXJWYsWCVzcCV4I3RPck5bcnM9T3N3Tlt3eE5beCNPTlsjTyNQISBZI1Ajb05bI28jcEt4I3AjcU5bI3Ejckp8I3J+TltNZyYsdmMlcDdbJWdTJWpXJWQmaiVtYCVzcCV2IWIleCN0JVEsWE9yJH1ycyYlfXN3JH13eCYpVHghUSR9IVEhWyYhXyFbIWMkfSFjIX0mIV8hfSNPJH0jTyNQISBuI1AjUiR9I1IjUyYhXyNTI1QkfSNUI28mIV8jbyNwISNVI3AjcSR9I3EjciEhUyNyJGckfSRnfiYhX01nJi5oZyVwN1slZ1MlalclZCZqJW1gJXNwJXYhYiV4I3QlUSxYT3IkfXJzJjBQc3ckfXd4JjJ3eCFRJH0hUSFbJiFfIVshYyR9IWMhdCYhXyF0IXUmNXUhdSF9JiFfIX0jTyR9I08jUCEgbiNQI1IkfSNSI1MmIV8jUyNUJH0jVCNmJiFfI2YjZyY1dSNnI28mIV8jbyNwISNVI3AjcSR9I3EjciEhUyNyJGckfSRnfiYhX0RlJjBeWiVwN1slZ1MlbWAldiFiJXIsWE9yJ1BycyYxUHN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUERlJjFbWiVwN1slZ1MlbWAldiFiT3InUHJzJjF9c3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQRF0mMltYJXA3WyVnUyV3LFglbWAldiFiT3dEdnd4LGV4I09EdiNPI1BFbiNQI29EdiNvI3BCZCNwI3FEdiNxI3JBbiNyfkR2R2smM1VaJXA3WyVqVyVzcCV4I3QlbCxYT3JHUXJzKXdzd0dRd3gmM3d4I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdRR2smNFNaJXA3WyVqVyVzcCV4I3RPckdRcnMpd3N3R1F3eCY0dXgjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1FGVCY1U1olcDdbJWpXJXUsWCVzcCV4I3RPck5bcnM9T3N3Tlt3eE5beCNPTlsjTyNQISBZI1Ajb05bI28jcEt4I3AjcU5bI3Ejckp8I3J+TltNZyY2W2MlcDdbJWdTJWpXJWQmaiVtYCVzcCV2IWIleCN0JVEsWE9yJH1ycyYwUHN3JH13eCYyd3ghUSR9IVEhWyYhXyFbIWMkfSFjIX0mIV8hfSNPJH0jTyNQISBuI1AjUiR9I1IjUyYhXyNTI1QkfSNUI28mIV8jbyNwISNVI3AjcSR9I3EjciEhUyNyJGckfSRnfiYhX01nJjd8ayVwN1slZ1MlalclZCZqJW1gJXNwJXYhYiV4I3QlUSxYT3IkfXJzJiV9c3ckfXd4JilUeCFRJH0hUSFbJiFfIVshYyR9IWMhaCYhXyFoIWkmNXUhaSF0JiFfIXQhdSYsYSF1IX0mIV8hfSNPJH0jTyNQISBuI1AjUiR9I1IjUyYhXyNTI1QkfSNUI1UmIV8jVSNWJixhI1YjWSYhXyNZI1omNXUjWiNvJiFfI28jcCEjVSNwI3EkfSNxI3IhIVMjciRnJH0kZ34mIV9HeyY6VVohVixYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH08dSY7W1ohV1IlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd6JjxiXSR2USVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5Jj1kWCVnUyVqVyFaR21PcjhicnM5T3N3OGJ3eDpVeCNPOGIjTyNQO1sjUCNvOGIjbyNwISFTI3B+OGJHeiY+ZF0kdVElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH08dSY/blghWzdfJWdTJWpXJW1gJXNwJXYhYiV4I3RPciEhU3JzQFNzdyEhU3d4SWJ4I08hIVMjTyNQISNPI1AjbyEhUyNvI3AhI1UjcH4hIVNHeSZAblolUCxWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1cIixcbiAgdG9rZW5pemVyczogW2xlZ2FjeVByaW50LCBpbmRlbnRhdGlvbiwgMCwgMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIG5ld2xpbmVzXSxcbiAgdG9wUnVsZXM6IHtcIlNjcmlwdFwiOlswLDNdfSxcbiAgc3BlY2lhbGl6ZWQ6IFt7dGVybTogMTg2LCBnZXQ6IHZhbHVlID0+IHNwZWNfaWRlbnRpZmllclt2YWx1ZV0gfHwgLTF9XSxcbiAgdG9rZW5QcmVjOiA2NTk0XG59KTtcblxuZXhwb3J0IHsgcGFyc2VyIH07XG4iLCIvLy8gVGhlIGRlZmF1bHQgbWF4aW11bSBsZW5ndGggb2YgYSBgVHJlZUJ1ZmZlcmAgbm9kZS5cbmNvbnN0IERlZmF1bHRCdWZmZXJMZW5ndGggPSAxMDI0O1xubGV0IG5leHRQcm9wSUQgPSAwO1xuY29uc3QgQ2FjaGVkTm9kZSA9IG5ldyBXZWFrTWFwKCk7XG4vLy8gRWFjaCBbbm9kZSB0eXBlXSgjdHJlZS5Ob2RlVHlwZSkgY2FuIGhhdmUgbWV0YWRhdGEgYXNzb2NpYXRlZCB3aXRoXG4vLy8gaXQgaW4gcHJvcHMuIEluc3RhbmNlcyBvZiB0aGlzIGNsYXNzIHJlcHJlc2VudCBwcm9wIG5hbWVzLlxuY2xhc3MgTm9kZVByb3Age1xuICAgIC8vLyBDcmVhdGUgYSBuZXcgbm9kZSBwcm9wIHR5cGUuIFlvdSBjYW4gb3B0aW9uYWxseSBwYXNzIGFcbiAgICAvLy8gYGRlc2VyaWFsaXplYCBmdW5jdGlvbi5cbiAgICBjb25zdHJ1Y3Rvcih7IGRlc2VyaWFsaXplIH0gPSB7fSkge1xuICAgICAgICB0aGlzLmlkID0gbmV4dFByb3BJRCsrO1xuICAgICAgICB0aGlzLmRlc2VyaWFsaXplID0gZGVzZXJpYWxpemUgfHwgKCgpID0+IHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgbm9kZSB0eXBlIGRvZXNuJ3QgZGVmaW5lIGEgZGVzZXJpYWxpemUgZnVuY3Rpb25cIik7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLy8gQ3JlYXRlIGEgc3RyaW5nLXZhbHVlZCBub2RlIHByb3Agd2hvc2UgZGVzZXJpYWxpemUgZnVuY3Rpb24gaXNcbiAgICAvLy8gdGhlIGlkZW50aXR5IGZ1bmN0aW9uLlxuICAgIHN0YXRpYyBzdHJpbmcoKSB7IHJldHVybiBuZXcgTm9kZVByb3AoeyBkZXNlcmlhbGl6ZTogc3RyID0+IHN0ciB9KTsgfVxuICAgIC8vLyBDcmVhdGUgYSBudW1iZXItdmFsdWVkIG5vZGUgcHJvcCB3aG9zZSBkZXNlcmlhbGl6ZSBmdW5jdGlvbiBpc1xuICAgIC8vLyBqdXN0IGBOdW1iZXJgLlxuICAgIHN0YXRpYyBudW1iZXIoKSB7IHJldHVybiBuZXcgTm9kZVByb3AoeyBkZXNlcmlhbGl6ZTogTnVtYmVyIH0pOyB9XG4gICAgLy8vIENyZWF0ZXMgYSBib29sZWFuLXZhbHVlZCBub2RlIHByb3Agd2hvc2UgZGVzZXJpYWxpemUgZnVuY3Rpb25cbiAgICAvLy8gcmV0dXJucyB0cnVlIGZvciBhbnkgaW5wdXQuXG4gICAgc3RhdGljIGZsYWcoKSB7IHJldHVybiBuZXcgTm9kZVByb3AoeyBkZXNlcmlhbGl6ZTogKCkgPT4gdHJ1ZSB9KTsgfVxuICAgIC8vLyBTdG9yZSBhIHZhbHVlIGZvciB0aGlzIHByb3AgaW4gdGhlIGdpdmVuIG9iamVjdC4gVGhpcyBjYW4gYmVcbiAgICAvLy8gdXNlZnVsIHdoZW4gYnVpbGRpbmcgdXAgYSBwcm9wIG9iamVjdCB0byBwYXNzIHRvIHRoZVxuICAgIC8vLyBbYE5vZGVUeXBlYF0oI3RyZWUuTm9kZVR5cGUpIGNvbnN0cnVjdG9yLiBSZXR1cm5zIGl0cyBmaXJzdFxuICAgIC8vLyBhcmd1bWVudC5cbiAgICBzZXQocHJvcE9iaiwgdmFsdWUpIHtcbiAgICAgICAgcHJvcE9ialt0aGlzLmlkXSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gcHJvcE9iajtcbiAgICB9XG4gICAgLy8vIFRoaXMgaXMgbWVhbnQgdG8gYmUgdXNlZCB3aXRoXG4gICAgLy8vIFtgTm9kZVNldC5leHRlbmRgXSgjdHJlZS5Ob2RlU2V0LmV4dGVuZCkgb3JcbiAgICAvLy8gW2BQYXJzZXIud2l0aFByb3BzYF0oI2xlemVyLlBhcnNlci53aXRoUHJvcHMpIHRvIGNvbXB1dGUgcHJvcFxuICAgIC8vLyB2YWx1ZXMgZm9yIGVhY2ggbm9kZSB0eXBlIGluIHRoZSBzZXQuIFRha2VzIGEgW21hdGNoXG4gICAgLy8vIG9iamVjdF0oI3RyZWUuTm9kZVR5cGVebWF0Y2gpIG9yIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB1bmRlZmluZWRcbiAgICAvLy8gaWYgdGhlIG5vZGUgdHlwZSBkb2Vzbid0IGdldCB0aGlzIHByb3AsIGFuZCB0aGUgcHJvcCdzIHZhbHVlIGlmXG4gICAgLy8vIGl0IGRvZXMuXG4gICAgYWRkKG1hdGNoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbWF0Y2ggIT0gXCJmdW5jdGlvblwiKVxuICAgICAgICAgICAgbWF0Y2ggPSBOb2RlVHlwZS5tYXRjaChtYXRjaCk7XG4gICAgICAgIHJldHVybiAodHlwZSkgPT4ge1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IG1hdGNoKHR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IFt0aGlzLCByZXN1bHRdO1xuICAgICAgICB9O1xuICAgIH1cbn1cbi8vLyBQcm9wIHRoYXQgaXMgdXNlZCB0byBkZXNjcmliZSBtYXRjaGluZyBkZWxpbWl0ZXJzLiBGb3Igb3BlbmluZ1xuLy8vIGRlbGltaXRlcnMsIHRoaXMgaG9sZHMgYW4gYXJyYXkgb2Ygbm9kZSBuYW1lcyAod3JpdHRlbiBhcyBhXG4vLy8gc3BhY2Utc2VwYXJhdGVkIHN0cmluZyB3aGVuIGRlY2xhcmluZyB0aGlzIHByb3AgaW4gYSBncmFtbWFyKVxuLy8vIGZvciB0aGUgbm9kZSB0eXBlcyBvZiBjbG9zaW5nIGRlbGltaXRlcnMgdGhhdCBtYXRjaCBpdC5cbk5vZGVQcm9wLmNsb3NlZEJ5ID0gbmV3IE5vZGVQcm9wKHsgZGVzZXJpYWxpemU6IHN0ciA9PiBzdHIuc3BsaXQoXCIgXCIpIH0pO1xuLy8vIFRoZSBpbnZlcnNlIG9mIFtgb3BlbmVkQnlgXSgjdHJlZS5Ob2RlUHJvcF5jbG9zZWRCeSkuIFRoaXMgaXNcbi8vLyBhdHRhY2hlZCB0byBjbG9zaW5nIGRlbGltaXRlcnMsIGhvbGRpbmcgYW4gYXJyYXkgb2Ygbm9kZSBuYW1lc1xuLy8vIG9mIHR5cGVzIG9mIG1hdGNoaW5nIG9wZW5pbmcgZGVsaW1pdGVycy5cbk5vZGVQcm9wLm9wZW5lZEJ5ID0gbmV3IE5vZGVQcm9wKHsgZGVzZXJpYWxpemU6IHN0ciA9PiBzdHIuc3BsaXQoXCIgXCIpIH0pO1xuLy8vIFVzZWQgdG8gYXNzaWduIG5vZGUgdHlwZXMgdG8gZ3JvdXBzIChmb3IgZXhhbXBsZSwgYWxsIG5vZGVcbi8vLyB0eXBlcyB0aGF0IHJlcHJlc2VudCBhbiBleHByZXNzaW9uIGNvdWxkIGJlIHRhZ2dlZCB3aXRoIGFuXG4vLy8gYFwiRXhwcmVzc2lvblwiYCBncm91cCkuXG5Ob2RlUHJvcC5ncm91cCA9IG5ldyBOb2RlUHJvcCh7IGRlc2VyaWFsaXplOiBzdHIgPT4gc3RyLnNwbGl0KFwiIFwiKSB9KTtcbmNvbnN0IG5vUHJvcHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuLy8vIEVhY2ggbm9kZSBpbiBhIHN5bnRheCB0cmVlIGhhcyBhIG5vZGUgdHlwZSBhc3NvY2lhdGVkIHdpdGggaXQuXG5jbGFzcyBOb2RlVHlwZSB7XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGNvbnN0cnVjdG9yKFxuICAgIC8vLyBUaGUgbmFtZSBvZiB0aGUgbm9kZSB0eXBlLiBOb3QgbmVjZXNzYXJpbHkgdW5pcXVlLCBidXQgaWYgdGhlXG4gICAgLy8vIGdyYW1tYXIgd2FzIHdyaXR0ZW4gcHJvcGVybHksIGRpZmZlcmVudCBub2RlIHR5cGVzIHdpdGggdGhlXG4gICAgLy8vIHNhbWUgbmFtZSB3aXRoaW4gYSBub2RlIHNldCBzaG91bGQgcGxheSB0aGUgc2FtZSBzZW1hbnRpY1xuICAgIC8vLyByb2xlLlxuICAgIG5hbWUsIFxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBwcm9wcywgXG4gICAgLy8vIFRoZSBpZCBvZiB0aGlzIG5vZGUgaW4gaXRzIHNldC4gQ29ycmVzcG9uZHMgdG8gdGhlIHRlcm0gaWRzXG4gICAgLy8vIHVzZWQgaW4gdGhlIHBhcnNlci5cbiAgICBpZCwgXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGZsYWdzID0gMCkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLnByb3BzID0gcHJvcHM7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5mbGFncyA9IGZsYWdzO1xuICAgIH1cbiAgICBzdGF0aWMgZGVmaW5lKHNwZWMpIHtcbiAgICAgICAgbGV0IHByb3BzID0gc3BlYy5wcm9wcyAmJiBzcGVjLnByb3BzLmxlbmd0aCA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiBub1Byb3BzO1xuICAgICAgICBsZXQgZmxhZ3MgPSAoc3BlYy50b3AgPyAxIC8qIFRvcCAqLyA6IDApIHwgKHNwZWMuc2tpcHBlZCA/IDIgLyogU2tpcHBlZCAqLyA6IDApIHxcbiAgICAgICAgICAgIChzcGVjLmVycm9yID8gNCAvKiBFcnJvciAqLyA6IDApIHwgKHNwZWMubmFtZSA9PSBudWxsID8gOCAvKiBBbm9ueW1vdXMgKi8gOiAwKTtcbiAgICAgICAgbGV0IHR5cGUgPSBuZXcgTm9kZVR5cGUoc3BlYy5uYW1lIHx8IFwiXCIsIHByb3BzLCBzcGVjLmlkLCBmbGFncyk7XG4gICAgICAgIGlmIChzcGVjLnByb3BzKVxuICAgICAgICAgICAgZm9yIChsZXQgc3JjIG9mIHNwZWMucHJvcHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoc3JjKSlcbiAgICAgICAgICAgICAgICAgICAgc3JjID0gc3JjKHR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChzcmMpXG4gICAgICAgICAgICAgICAgICAgIHNyY1swXS5zZXQocHJvcHMsIHNyY1sxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIHJldHVybiB0eXBlO1xuICAgIH1cbiAgICAvLy8gUmV0cmlldmVzIGEgbm9kZSBwcm9wIGZvciB0aGlzIHR5cGUuIFdpbGwgcmV0dXJuIGB1bmRlZmluZWRgIGlmXG4gICAgLy8vIHRoZSBwcm9wIGlzbid0IHByZXNlbnQgb24gdGhpcyBub2RlLlxuICAgIHByb3AocHJvcCkgeyByZXR1cm4gdGhpcy5wcm9wc1twcm9wLmlkXTsgfVxuICAgIC8vLyBUcnVlIHdoZW4gdGhpcyBpcyB0aGUgdG9wIG5vZGUgb2YgYSBncmFtbWFyLlxuICAgIGdldCBpc1RvcCgpIHsgcmV0dXJuICh0aGlzLmZsYWdzICYgMSAvKiBUb3AgKi8pID4gMDsgfVxuICAgIC8vLyBUcnVlIHdoZW4gdGhpcyBub2RlIGlzIHByb2R1Y2VkIGJ5IGEgc2tpcCBydWxlLlxuICAgIGdldCBpc1NraXBwZWQoKSB7IHJldHVybiAodGhpcy5mbGFncyAmIDIgLyogU2tpcHBlZCAqLykgPiAwOyB9XG4gICAgLy8vIEluZGljYXRlcyB3aGV0aGVyIHRoaXMgaXMgYW4gZXJyb3Igbm9kZS5cbiAgICBnZXQgaXNFcnJvcigpIHsgcmV0dXJuICh0aGlzLmZsYWdzICYgNCAvKiBFcnJvciAqLykgPiAwOyB9XG4gICAgLy8vIFdoZW4gdHJ1ZSwgdGhpcyBub2RlIHR5cGUgZG9lc24ndCBjb3JyZXNwb25kIHRvIGEgdXNlci1kZWNsYXJlZFxuICAgIC8vLyBuYW1lZCBub2RlLCBmb3IgZXhhbXBsZSBiZWNhdXNlIGl0IGlzIHVzZWQgdG8gY2FjaGUgcmVwZXRpdGlvbi5cbiAgICBnZXQgaXNBbm9ueW1vdXMoKSB7IHJldHVybiAodGhpcy5mbGFncyAmIDggLyogQW5vbnltb3VzICovKSA+IDA7IH1cbiAgICAvLy8gUmV0dXJucyB0cnVlIHdoZW4gdGhpcyBub2RlJ3MgbmFtZSBvciBvbmUgb2YgaXRzXG4gICAgLy8vIFtncm91cHNdKCN0cmVlLk5vZGVQcm9wXmdyb3VwKSBtYXRjaGVzIHRoZSBnaXZlbiBzdHJpbmcuXG4gICAgaXMobmFtZSkge1xuICAgICAgICBpZiAodHlwZW9mIG5hbWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm5hbWUgPT0gbmFtZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBncm91cCA9IHRoaXMucHJvcChOb2RlUHJvcC5ncm91cCk7XG4gICAgICAgICAgICByZXR1cm4gZ3JvdXAgPyBncm91cC5pbmRleE9mKG5hbWUpID4gLTEgOiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5pZCA9PSBuYW1lO1xuICAgIH1cbiAgICAvLy8gQ3JlYXRlIGEgZnVuY3Rpb24gZnJvbSBub2RlIHR5cGVzIHRvIGFyYml0cmFyeSB2YWx1ZXMgYnlcbiAgICAvLy8gc3BlY2lmeWluZyBhbiBvYmplY3Qgd2hvc2UgcHJvcGVydHkgbmFtZXMgYXJlIG5vZGUgb3JcbiAgICAvLy8gW2dyb3VwXSgjdHJlZS5Ob2RlUHJvcF5ncm91cCkgbmFtZXMuIE9mdGVuIHVzZWZ1bCB3aXRoXG4gICAgLy8vIFtgTm9kZVByb3AuYWRkYF0oI3RyZWUuTm9kZVByb3AuYWRkKS4gWW91IGNhbiBwdXQgbXVsdGlwbGVcbiAgICAvLy8gbmFtZXMsIHNlcGFyYXRlZCBieSBzcGFjZXMsIGluIGEgc2luZ2xlIHByb3BlcnR5IG5hbWUgdG8gbWFwXG4gICAgLy8vIG11bHRpcGxlIG5vZGUgbmFtZXMgdG8gYSBzaW5nbGUgdmFsdWUuXG4gICAgc3RhdGljIG1hdGNoKG1hcCkge1xuICAgICAgICBsZXQgZGlyZWN0ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgZm9yIChsZXQgcHJvcCBpbiBtYXApXG4gICAgICAgICAgICBmb3IgKGxldCBuYW1lIG9mIHByb3Auc3BsaXQoXCIgXCIpKVxuICAgICAgICAgICAgICAgIGRpcmVjdFtuYW1lXSA9IG1hcFtwcm9wXTtcbiAgICAgICAgcmV0dXJuIChub2RlKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGxldCBncm91cHMgPSBub2RlLnByb3AoTm9kZVByb3AuZ3JvdXApLCBpID0gLTE7IGkgPCAoZ3JvdXBzID8gZ3JvdXBzLmxlbmd0aCA6IDApOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBkaXJlY3RbaSA8IDAgPyBub2RlLm5hbWUgOiBncm91cHNbaV1dO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vLyBBbiBlbXB0eSBkdW1teSBub2RlIHR5cGUgdG8gdXNlIHdoZW4gbm8gYWN0dWFsIHR5cGUgaXMgYXZhaWxhYmxlLlxuTm9kZVR5cGUubm9uZSA9IG5ldyBOb2RlVHlwZShcIlwiLCBPYmplY3QuY3JlYXRlKG51bGwpLCAwLCA4IC8qIEFub255bW91cyAqLyk7XG4vLy8gQSBub2RlIHNldCBob2xkcyBhIGNvbGxlY3Rpb24gb2Ygbm9kZSB0eXBlcy4gSXQgaXMgdXNlZCB0b1xuLy8vIGNvbXBhY3RseSByZXByZXNlbnQgdHJlZXMgYnkgc3RvcmluZyB0aGVpciB0eXBlIGlkcywgcmF0aGVyIHRoYW4gYVxuLy8vIGZ1bGwgcG9pbnRlciB0byB0aGUgdHlwZSBvYmplY3QsIGluIGEgbnVtYmVyIGFycmF5LiBFYWNoIHBhcnNlclxuLy8vIFtoYXNdKCNsZXplci5QYXJzZXIubm9kZVNldCkgYSBub2RlIHNldCwgYW5kIFt0cmVlXG4vLy8gYnVmZmVyc10oI3RyZWUuVHJlZUJ1ZmZlcikgY2FuIG9ubHkgc3RvcmUgY29sbGVjdGlvbnMgb2Ygbm9kZXNcbi8vLyBmcm9tIHRoZSBzYW1lIHNldC4gQSBzZXQgY2FuIGhhdmUgYSBtYXhpbXVtIG9mIDIqKjE2ICg2NTUzNilcbi8vLyBub2RlIHR5cGVzIGluIGl0LCBzbyB0aGF0IHRoZSBpZHMgZml0IGludG8gMTYtYml0IHR5cGVkIGFycmF5XG4vLy8gc2xvdHMuXG5jbGFzcyBOb2RlU2V0IHtcbiAgICAvLy8gQ3JlYXRlIGEgc2V0IHdpdGggdGhlIGdpdmVuIHR5cGVzLiBUaGUgYGlkYCBwcm9wZXJ0eSBvZiBlYWNoXG4gICAgLy8vIHR5cGUgc2hvdWxkIGNvcnJlc3BvbmQgdG8gaXRzIHBvc2l0aW9uIHdpdGhpbiB0aGUgYXJyYXkuXG4gICAgY29uc3RydWN0b3IoXG4gICAgLy8vIFRoZSBub2RlIHR5cGVzIGluIHRoaXMgc2V0LCBieSBpZC5cbiAgICB0eXBlcykge1xuICAgICAgICB0aGlzLnR5cGVzID0gdHlwZXM7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdHlwZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBpZiAodHlwZXNbaV0uaWQgIT0gaSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIk5vZGUgdHlwZSBpZHMgc2hvdWxkIGNvcnJlc3BvbmQgdG8gYXJyYXkgcG9zaXRpb25zIHdoZW4gY3JlYXRpbmcgYSBub2RlIHNldFwiKTtcbiAgICB9XG4gICAgLy8vIENyZWF0ZSBhIGNvcHkgb2YgdGhpcyBzZXQgd2l0aCBzb21lIG5vZGUgcHJvcGVydGllcyBhZGRlZC4gVGhlXG4gICAgLy8vIGFyZ3VtZW50cyB0byB0aGlzIG1ldGhvZCBzaG91bGQgYmUgY3JlYXRlZCB3aXRoXG4gICAgLy8vIFtgTm9kZVByb3AuYWRkYF0oI3RyZWUuTm9kZVByb3AuYWRkKS5cbiAgICBleHRlbmQoLi4ucHJvcHMpIHtcbiAgICAgICAgbGV0IG5ld1R5cGVzID0gW107XG4gICAgICAgIGZvciAobGV0IHR5cGUgb2YgdGhpcy50eXBlcykge1xuICAgICAgICAgICAgbGV0IG5ld1Byb3BzID0gbnVsbDtcbiAgICAgICAgICAgIGZvciAobGV0IHNvdXJjZSBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgIGxldCBhZGQgPSBzb3VyY2UodHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKGFkZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW5ld1Byb3BzKVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UHJvcHMgPSBPYmplY3QuYXNzaWduKHt9LCB0eXBlLnByb3BzKTtcbiAgICAgICAgICAgICAgICAgICAgYWRkWzBdLnNldChuZXdQcm9wcywgYWRkWzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdUeXBlcy5wdXNoKG5ld1Byb3BzID8gbmV3IE5vZGVUeXBlKHR5cGUubmFtZSwgbmV3UHJvcHMsIHR5cGUuaWQsIHR5cGUuZmxhZ3MpIDogdHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlU2V0KG5ld1R5cGVzKTtcbiAgICB9XG59XG4vLy8gQSBwaWVjZSBvZiBzeW50YXggdHJlZS4gVGhlcmUgYXJlIHR3byB3YXlzIHRvIGFwcHJvYWNoIHRoZXNlXG4vLy8gdHJlZXM6IHRoZSB3YXkgdGhleSBhcmUgYWN0dWFsbHkgc3RvcmVkIGluIG1lbW9yeSwgYW5kIHRoZVxuLy8vIGNvbnZlbmllbnQgd2F5LlxuLy8vXG4vLy8gU3ludGF4IHRyZWVzIGFyZSBzdG9yZWQgYXMgYSB0cmVlIG9mIGBUcmVlYCBhbmQgYFRyZWVCdWZmZXJgXG4vLy8gb2JqZWN0cy4gQnkgcGFja2luZyBkZXRhaWwgaW5mb3JtYXRpb24gaW50byBgVHJlZUJ1ZmZlcmAgbGVhZlxuLy8vIG5vZGVzLCB0aGUgcmVwcmVzZW50YXRpb24gaXMgbWFkZSBhIGxvdCBtb3JlIG1lbW9yeS1lZmZpY2llbnQuXG4vLy9cbi8vLyBIb3dldmVyLCB3aGVuIHlvdSB3YW50IHRvIGFjdHVhbGx5IHdvcmsgd2l0aCB0cmVlIG5vZGVzLCB0aGlzXG4vLy8gcmVwcmVzZW50YXRpb24gaXMgdmVyeSBhd2t3YXJkLCBzbyBtb3N0IGNsaWVudCBjb2RlIHdpbGwgd2FudCB0b1xuLy8vIHVzZSB0aGUgYFRyZWVDdXJzb3JgIGludGVyZmFjZSBpbnN0ZWFkLCB3aGljaCBwcm92aWRlcyBhIHZpZXcgb25cbi8vLyBzb21lIHBhcnQgb2YgdGhpcyBkYXRhIHN0cnVjdHVyZSwgYW5kIGNhbiBiZSB1c2VkIHRvIG1vdmUgYXJvdW5kXG4vLy8gdG8gYWRqYWNlbnQgbm9kZXMuXG5jbGFzcyBUcmVlIHtcbiAgICAvLy8gQ29uc3RydWN0IGEgbmV3IHRyZWUuIFlvdSB1c3VhbGx5IHdhbnQgdG8gZ28gdGhyb3VnaFxuICAgIC8vLyBbYFRyZWUuYnVpbGRgXSgjdHJlZS5UcmVlXmJ1aWxkKSBpbnN0ZWFkLlxuICAgIGNvbnN0cnVjdG9yKHR5cGUsIFxuICAgIC8vLyBUaGUgdHJlZSdzIGNoaWxkIG5vZGVzLiBDaGlsZHJlbiBzbWFsbCBlbm91Z2ggdG8gZml0IGluIGFcbiAgICAvLy8gYFRyZWVCdWZmZXIgd2lsbCBiZSByZXByZXNlbnRlZCBhcyBzdWNoLCBvdGhlciBjaGlsZHJlbiBjYW4gYmVcbiAgICAvLy8gZnVydGhlciBgVHJlZWAgaW5zdGFuY2VzIHdpdGggdGhlaXIgb3duIGludGVybmFsIHN0cnVjdHVyZS5cbiAgICBjaGlsZHJlbiwgXG4gICAgLy8vIFRoZSBwb3NpdGlvbnMgKG9mZnNldHMgcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoaXMgdHJlZSkgb2ZcbiAgICAvLy8gdGhlIGNoaWxkcmVuLlxuICAgIHBvc2l0aW9ucywgXG4gICAgLy8vIFRoZSB0b3RhbCBsZW5ndGggb2YgdGhpcyB0cmVlXG4gICAgbGVuZ3RoKSB7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICAgICAgdGhpcy5wb3NpdGlvbnMgPSBwb3NpdGlvbnM7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIGxldCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW4ubWFwKGMgPT4gYy50b1N0cmluZygpKS5qb2luKCk7XG4gICAgICAgIHJldHVybiAhdGhpcy50eXBlLm5hbWUgPyBjaGlsZHJlbiA6XG4gICAgICAgICAgICAoL1xcVy8udGVzdCh0aGlzLnR5cGUubmFtZSkgJiYgIXRoaXMudHlwZS5pc0Vycm9yID8gSlNPTi5zdHJpbmdpZnkodGhpcy50eXBlLm5hbWUpIDogdGhpcy50eXBlLm5hbWUpICtcbiAgICAgICAgICAgICAgICAoY2hpbGRyZW4ubGVuZ3RoID8gXCIoXCIgKyBjaGlsZHJlbiArIFwiKVwiIDogXCJcIik7XG4gICAgfVxuICAgIC8vLyBHZXQgYSBbdHJlZSBjdXJzb3JdKCN0cmVlLlRyZWVDdXJzb3IpIHJvb3RlZCBhdCB0aGlzIHRyZWUuIFdoZW5cbiAgICAvLy8gYHBvc2AgaXMgZ2l2ZW4sIHRoZSBjdXJzb3IgaXMgW21vdmVkXSgjdHJlZS5UcmVlQ3Vyc29yLm1vdmVUbylcbiAgICAvLy8gdG8gdGhlIGdpdmVuIHBvc2l0aW9uIGFuZCBzaWRlLlxuICAgIGN1cnNvcihwb3MsIHNpZGUgPSAwKSB7XG4gICAgICAgIGxldCBzY29wZSA9IChwb3MgIT0gbnVsbCAmJiBDYWNoZWROb2RlLmdldCh0aGlzKSkgfHwgdGhpcy50b3BOb2RlO1xuICAgICAgICBsZXQgY3Vyc29yID0gbmV3IFRyZWVDdXJzb3Ioc2NvcGUpO1xuICAgICAgICBpZiAocG9zICE9IG51bGwpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8ocG9zLCBzaWRlKTtcbiAgICAgICAgICAgIENhY2hlZE5vZGUuc2V0KHRoaXMsIGN1cnNvci5fdHJlZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG4gICAgLy8vIEdldCBhIFt0cmVlIGN1cnNvcl0oI3RyZWUuVHJlZUN1cnNvcikgdGhhdCwgdW5saWtlIHJlZ3VsYXJcbiAgICAvLy8gY3Vyc29ycywgZG9lc24ndCBza2lwIFthbm9ueW1vdXNdKCN0cmVlLk5vZGVUeXBlLmlzQW5vbnltb3VzKVxuICAgIC8vLyBub2Rlcy5cbiAgICBmdWxsQ3Vyc29yKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRyZWVDdXJzb3IodGhpcy50b3BOb2RlLCB0cnVlKTtcbiAgICB9XG4gICAgLy8vIEdldCBhIFtzeW50YXggbm9kZV0oI3RyZWUuU3ludGF4Tm9kZSkgb2JqZWN0IGZvciB0aGUgdG9wIG9mIHRoZVxuICAgIC8vLyB0cmVlLlxuICAgIGdldCB0b3BOb2RlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRyZWVOb2RlKHRoaXMsIDAsIDAsIG51bGwpO1xuICAgIH1cbiAgICAvLy8gR2V0IHRoZSBbc3ludGF4IG5vZGVdKCN0cmVlLlN5bnRheE5vZGUpIGF0IHRoZSBnaXZlbiBwb3NpdGlvbi5cbiAgICAvLy8gSWYgYHNpZGVgIGlzIC0xLCB0aGlzIHdpbGwgbW92ZSBpbnRvIG5vZGVzIHRoYXQgZW5kIGF0IHRoZVxuICAgIC8vLyBwb3NpdGlvbi4gSWYgMSwgaXQnbGwgbW92ZSBpbnRvIG5vZGVzIHRoYXQgc3RhcnQgYXQgdGhlXG4gICAgLy8vIHBvc2l0aW9uLiBXaXRoIDAsIGl0J2xsIG9ubHkgZW50ZXIgbm9kZXMgdGhhdCBjb3ZlciB0aGUgcG9zaXRpb25cbiAgICAvLy8gZnJvbSBib3RoIHNpZGVzLlxuICAgIHJlc29sdmUocG9zLCBzaWRlID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJzb3IocG9zLCBzaWRlKS5ub2RlO1xuICAgIH1cbiAgICAvLy8gSXRlcmF0ZSBvdmVyIHRoZSB0cmVlIGFuZCBpdHMgY2hpbGRyZW4sIGNhbGxpbmcgYGVudGVyYCBmb3IgYW55XG4gICAgLy8vIG5vZGUgdGhhdCB0b3VjaGVzIHRoZSBgZnJvbWAvYHRvYCByZWdpb24gKGlmIGdpdmVuKSBiZWZvcmVcbiAgICAvLy8gcnVubmluZyBvdmVyIHN1Y2ggYSBub2RlJ3MgY2hpbGRyZW4sIGFuZCBgbGVhdmVgIChpZiBnaXZlbikgd2hlblxuICAgIC8vLyBsZWF2aW5nIHRoZSBub2RlLiBXaGVuIGBlbnRlcmAgcmV0dXJucyBgZmFsc2VgLCB0aGUgZ2l2ZW4gbm9kZVxuICAgIC8vLyB3aWxsIG5vdCBoYXZlIGl0cyBjaGlsZHJlbiBpdGVyYXRlZCBvdmVyIChvciBgbGVhdmVgIGNhbGxlZCkuXG4gICAgaXRlcmF0ZShzcGVjKSB7XG4gICAgICAgIGxldCB7IGVudGVyLCBsZWF2ZSwgZnJvbSA9IDAsIHRvID0gdGhpcy5sZW5ndGggfSA9IHNwZWM7XG4gICAgICAgIGZvciAobGV0IGMgPSB0aGlzLmN1cnNvcigpOzspIHtcbiAgICAgICAgICAgIGxldCBtdXN0TGVhdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChjLmZyb20gPD0gdG8gJiYgYy50byA+PSBmcm9tICYmIChjLnR5cGUuaXNBbm9ueW1vdXMgfHwgZW50ZXIoYy50eXBlLCBjLmZyb20sIGMudG8pICE9PSBmYWxzZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoYy5maXJzdENoaWxkKCkpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmICghYy50eXBlLmlzQW5vbnltb3VzKVxuICAgICAgICAgICAgICAgICAgICBtdXN0TGVhdmUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGlmIChtdXN0TGVhdmUgJiYgbGVhdmUpXG4gICAgICAgICAgICAgICAgICAgIGxlYXZlKGMudHlwZSwgYy5mcm9tLCBjLnRvKTtcbiAgICAgICAgICAgICAgICBtdXN0TGVhdmUgPSBjLnR5cGUuaXNBbm9ueW1vdXM7XG4gICAgICAgICAgICAgICAgaWYgKGMubmV4dFNpYmxpbmcoKSlcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKCFjLnBhcmVudCgpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgbXVzdExlYXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gQmFsYW5jZSB0aGUgZGlyZWN0IGNoaWxkcmVuIG9mIHRoaXMgdHJlZS5cbiAgICBiYWxhbmNlKG1heEJ1ZmZlckxlbmd0aCA9IERlZmF1bHRCdWZmZXJMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW4ubGVuZ3RoIDw9IEJhbGFuY2VCcmFuY2hGYWN0b3IgPyB0aGlzXG4gICAgICAgICAgICA6IGJhbGFuY2VSYW5nZSh0aGlzLnR5cGUsIE5vZGVUeXBlLm5vbmUsIHRoaXMuY2hpbGRyZW4sIHRoaXMucG9zaXRpb25zLCAwLCB0aGlzLmNoaWxkcmVuLmxlbmd0aCwgMCwgbWF4QnVmZmVyTGVuZ3RoLCB0aGlzLmxlbmd0aCwgMCk7XG4gICAgfVxuICAgIC8vLyBCdWlsZCBhIHRyZWUgZnJvbSBhIHBvc3RmaXgtb3JkZXJlZCBidWZmZXIgb2Ygbm9kZSBpbmZvcm1hdGlvbixcbiAgICAvLy8gb3IgYSBjdXJzb3Igb3ZlciBzdWNoIGEgYnVmZmVyLlxuICAgIHN0YXRpYyBidWlsZChkYXRhKSB7IHJldHVybiBidWlsZFRyZWUoZGF0YSk7IH1cbn1cbi8vLyBUaGUgZW1wdHkgdHJlZVxuVHJlZS5lbXB0eSA9IG5ldyBUcmVlKE5vZGVUeXBlLm5vbmUsIFtdLCBbXSwgMCk7XG4vLyBGb3IgdHJlZXMgdGhhdCBuZWVkIGEgY29udGV4dCBoYXNoIGF0dGFjaGVkLCB3ZSdyZSB1c2luZyB0aGlzXG4vLyBrbHVkZ2Ugd2hpY2ggYXNzaWducyBhbiBleHRyYSBwcm9wZXJ0eSBkaXJlY3RseSBhZnRlclxuLy8gaW5pdGlhbGl6YXRpb24gKGNyZWF0aW5nIGEgc2luZ2xlIG5ldyBvYmplY3Qgc2hhcGUpLlxuZnVuY3Rpb24gd2l0aEhhc2godHJlZSwgaGFzaCkge1xuICAgIGlmIChoYXNoKVxuICAgICAgICB0cmVlLmNvbnRleHRIYXNoID0gaGFzaDtcbiAgICByZXR1cm4gdHJlZTtcbn1cbi8vLyBUcmVlIGJ1ZmZlcnMgY29udGFpbiAodHlwZSwgc3RhcnQsIGVuZCwgZW5kSW5kZXgpIHF1YWRzIGZvciBlYWNoXG4vLy8gbm9kZS4gSW4gc3VjaCBhIGJ1ZmZlciwgbm9kZXMgYXJlIHN0b3JlZCBpbiBwcmVmaXggb3JkZXIgKHBhcmVudHNcbi8vLyBiZWZvcmUgY2hpbGRyZW4sIHdpdGggdGhlIGVuZEluZGV4IG9mIHRoZSBwYXJlbnQgaW5kaWNhdGluZyB3aGljaFxuLy8vIGNoaWxkcmVuIGJlbG9uZyB0byBpdClcbmNsYXNzIFRyZWVCdWZmZXIge1xuICAgIC8vLyBDcmVhdGUgYSB0cmVlIGJ1ZmZlciBAaW50ZXJuYWxcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAvLy8gQGludGVybmFsXG4gICAgYnVmZmVyLCBcbiAgICAvLyBUaGUgdG90YWwgbGVuZ3RoIG9mIHRoZSBncm91cCBvZiBub2RlcyBpbiB0aGUgYnVmZmVyLlxuICAgIGxlbmd0aCwgXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHNldCwgdHlwZSA9IE5vZGVUeXBlLm5vbmUpIHtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgICB0aGlzLnNldCA9IHNldDtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLmJ1ZmZlci5sZW5ndGg7KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh0aGlzLmNoaWxkU3RyaW5nKGluZGV4KSk7XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuYnVmZmVyW2luZGV4ICsgM107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdC5qb2luKFwiLFwiKTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGNoaWxkU3RyaW5nKGluZGV4KSB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMuYnVmZmVyW2luZGV4XSwgZW5kSW5kZXggPSB0aGlzLmJ1ZmZlcltpbmRleCArIDNdO1xuICAgICAgICBsZXQgdHlwZSA9IHRoaXMuc2V0LnR5cGVzW2lkXSwgcmVzdWx0ID0gdHlwZS5uYW1lO1xuICAgICAgICBpZiAoL1xcVy8udGVzdChyZXN1bHQpICYmICF0eXBlLmlzRXJyb3IpXG4gICAgICAgICAgICByZXN1bHQgPSBKU09OLnN0cmluZ2lmeShyZXN1bHQpO1xuICAgICAgICBpbmRleCArPSA0O1xuICAgICAgICBpZiAoZW5kSW5kZXggPT0gaW5kZXgpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICBsZXQgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgZW5kSW5kZXgpIHtcbiAgICAgICAgICAgIGNoaWxkcmVuLnB1c2godGhpcy5jaGlsZFN0cmluZyhpbmRleCkpO1xuICAgICAgICAgICAgaW5kZXggPSB0aGlzLmJ1ZmZlcltpbmRleCArIDNdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQgKyBcIihcIiArIGNoaWxkcmVuLmpvaW4oXCIsXCIpICsgXCIpXCI7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBmaW5kQ2hpbGQoc3RhcnRJbmRleCwgZW5kSW5kZXgsIGRpciwgYWZ0ZXIpIHtcbiAgICAgICAgbGV0IHsgYnVmZmVyIH0gPSB0aGlzLCBwaWNrID0gLTE7XG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFydEluZGV4OyBpICE9IGVuZEluZGV4OyBpID0gYnVmZmVyW2kgKyAzXSkge1xuICAgICAgICAgICAgaWYgKGFmdGVyICE9IC0xMDAwMDAwMDAgLyogTm9uZSAqLykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydCA9IGJ1ZmZlcltpICsgMV0sIGVuZCA9IGJ1ZmZlcltpICsgMl07XG4gICAgICAgICAgICAgICAgaWYgKGRpciA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZCA+IGFmdGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgcGljayA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmQgPiBhZnRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0IDwgYWZ0ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBwaWNrID0gaTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZCA+PSBhZnRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBpY2sgPSBpO1xuICAgICAgICAgICAgICAgIGlmIChkaXIgPiAwKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGljaztcbiAgICB9XG59XG5jbGFzcyBUcmVlTm9kZSB7XG4gICAgY29uc3RydWN0b3Iobm9kZSwgZnJvbSwgaW5kZXgsIF9wYXJlbnQpIHtcbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgdGhpcy5mcm9tID0gZnJvbTtcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBfcGFyZW50O1xuICAgIH1cbiAgICBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMubm9kZS50eXBlOyB9XG4gICAgZ2V0IG5hbWUoKSB7IHJldHVybiB0aGlzLm5vZGUudHlwZS5uYW1lOyB9XG4gICAgZ2V0IHRvKCkgeyByZXR1cm4gdGhpcy5mcm9tICsgdGhpcy5ub2RlLmxlbmd0aDsgfVxuICAgIG5leHRDaGlsZChpLCBkaXIsIGFmdGVyLCBmdWxsID0gZmFsc2UpIHtcbiAgICAgICAgZm9yIChsZXQgcGFyZW50ID0gdGhpczs7KSB7XG4gICAgICAgICAgICBmb3IgKGxldCB7IGNoaWxkcmVuLCBwb3NpdGlvbnMgfSA9IHBhcmVudC5ub2RlLCBlID0gZGlyID4gMCA/IGNoaWxkcmVuLmxlbmd0aCA6IC0xOyBpICE9IGU7IGkgKz0gZGlyKSB7XG4gICAgICAgICAgICAgICAgbGV0IG5leHQgPSBjaGlsZHJlbltpXSwgc3RhcnQgPSBwb3NpdGlvbnNbaV0gKyBwYXJlbnQuZnJvbTtcbiAgICAgICAgICAgICAgICBpZiAoYWZ0ZXIgIT0gLTEwMDAwMDAwMCAvKiBOb25lICovICYmIChkaXIgPCAwID8gc3RhcnQgPj0gYWZ0ZXIgOiBzdGFydCArIG5leHQubGVuZ3RoIDw9IGFmdGVyKSlcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgaW5zdGFuY2VvZiBUcmVlQnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IG5leHQuZmluZENoaWxkKDAsIG5leHQuYnVmZmVyLmxlbmd0aCwgZGlyLCBhZnRlciA9PSAtMTAwMDAwMDAwIC8qIE5vbmUgKi8gPyAtMTAwMDAwMDAwIC8qIE5vbmUgKi8gOiBhZnRlciAtIHN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlck5vZGUobmV3IEJ1ZmZlckNvbnRleHQocGFyZW50LCBuZXh0LCBpLCBzdGFydCksIG51bGwsIGluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZnVsbCB8fCAoIW5leHQudHlwZS5pc0Fub255bW91cyB8fCBoYXNDaGlsZChuZXh0KSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlubmVyID0gbmV3IFRyZWVOb2RlKG5leHQsIHN0YXJ0LCBpLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVsbCB8fCAhaW5uZXIudHlwZS5pc0Fub255bW91cyA/IGlubmVyIDogaW5uZXIubmV4dENoaWxkKGRpciA8IDAgPyBuZXh0LmNoaWxkcmVuLmxlbmd0aCAtIDEgOiAwLCBkaXIsIGFmdGVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZnVsbCB8fCAhcGFyZW50LnR5cGUuaXNBbm9ueW1vdXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBpID0gcGFyZW50LmluZGV4ICsgZGlyO1xuICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50Ll9wYXJlbnQ7XG4gICAgICAgICAgICBpZiAoIXBhcmVudClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgZmlyc3RDaGlsZCgpIHsgcmV0dXJuIHRoaXMubmV4dENoaWxkKDAsIDEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLyk7IH1cbiAgICBnZXQgbGFzdENoaWxkKCkgeyByZXR1cm4gdGhpcy5uZXh0Q2hpbGQodGhpcy5ub2RlLmNoaWxkcmVuLmxlbmd0aCAtIDEsIC0xLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pOyB9XG4gICAgY2hpbGRBZnRlcihwb3MpIHsgcmV0dXJuIHRoaXMubmV4dENoaWxkKDAsIDEsIHBvcyk7IH1cbiAgICBjaGlsZEJlZm9yZShwb3MpIHsgcmV0dXJuIHRoaXMubmV4dENoaWxkKHRoaXMubm9kZS5jaGlsZHJlbi5sZW5ndGggLSAxLCAtMSwgcG9zKTsgfVxuICAgIG5leHRTaWduaWZpY2FudFBhcmVudCgpIHtcbiAgICAgICAgbGV0IHZhbCA9IHRoaXM7XG4gICAgICAgIHdoaWxlICh2YWwudHlwZS5pc0Fub255bW91cyAmJiB2YWwuX3BhcmVudClcbiAgICAgICAgICAgIHZhbCA9IHZhbC5fcGFyZW50O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cbiAgICBnZXQgcGFyZW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50ID8gdGhpcy5fcGFyZW50Lm5leHRTaWduaWZpY2FudFBhcmVudCgpIDogbnVsbDtcbiAgICB9XG4gICAgZ2V0IG5leHRTaWJsaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50ID8gdGhpcy5fcGFyZW50Lm5leHRDaGlsZCh0aGlzLmluZGV4ICsgMSwgMSwgLTEpIDogbnVsbDtcbiAgICB9XG4gICAgZ2V0IHByZXZTaWJsaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50ID8gdGhpcy5fcGFyZW50Lm5leHRDaGlsZCh0aGlzLmluZGV4IC0gMSwgLTEsIC0xKSA6IG51bGw7XG4gICAgfVxuICAgIGdldCBjdXJzb3IoKSB7IHJldHVybiBuZXcgVHJlZUN1cnNvcih0aGlzKTsgfVxuICAgIHJlc29sdmUocG9zLCBzaWRlID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJzb3IubW92ZVRvKHBvcywgc2lkZSkubm9kZTtcbiAgICB9XG4gICAgZ2V0Q2hpbGQodHlwZSwgYmVmb3JlID0gbnVsbCwgYWZ0ZXIgPSBudWxsKSB7XG4gICAgICAgIGxldCByID0gZ2V0Q2hpbGRyZW4odGhpcywgdHlwZSwgYmVmb3JlLCBhZnRlcik7XG4gICAgICAgIHJldHVybiByLmxlbmd0aCA/IHJbMF0gOiBudWxsO1xuICAgIH1cbiAgICBnZXRDaGlsZHJlbih0eXBlLCBiZWZvcmUgPSBudWxsLCBhZnRlciA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGdldENoaWxkcmVuKHRoaXMsIHR5cGUsIGJlZm9yZSwgYWZ0ZXIpO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgdG9TdHJpbmcoKSB7IHJldHVybiB0aGlzLm5vZGUudG9TdHJpbmcoKTsgfVxufVxuZnVuY3Rpb24gZ2V0Q2hpbGRyZW4obm9kZSwgdHlwZSwgYmVmb3JlLCBhZnRlcikge1xuICAgIGxldCBjdXIgPSBub2RlLmN1cnNvciwgcmVzdWx0ID0gW107XG4gICAgaWYgKCFjdXIuZmlyc3RDaGlsZCgpKVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChiZWZvcmUgIT0gbnVsbClcbiAgICAgICAgd2hpbGUgKCFjdXIudHlwZS5pcyhiZWZvcmUpKVxuICAgICAgICAgICAgaWYgKCFjdXIubmV4dFNpYmxpbmcoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIGZvciAoOzspIHtcbiAgICAgICAgaWYgKGFmdGVyICE9IG51bGwgJiYgY3VyLnR5cGUuaXMoYWZ0ZXIpKVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgaWYgKGN1ci50eXBlLmlzKHR5cGUpKVxuICAgICAgICAgICAgcmVzdWx0LnB1c2goY3VyLm5vZGUpO1xuICAgICAgICBpZiAoIWN1ci5uZXh0U2libGluZygpKVxuICAgICAgICAgICAgcmV0dXJuIGFmdGVyID09IG51bGwgPyByZXN1bHQgOiBbXTtcbiAgICB9XG59XG5jbGFzcyBCdWZmZXJDb250ZXh0IHtcbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQsIGJ1ZmZlciwgaW5kZXgsIHN0YXJ0KSB7XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgfVxufVxuY2xhc3MgQnVmZmVyTm9kZSB7XG4gICAgY29uc3RydWN0b3IoY29udGV4dCwgX3BhcmVudCwgaW5kZXgpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gX3BhcmVudDtcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLnR5cGUgPSBjb250ZXh0LmJ1ZmZlci5zZXQudHlwZXNbY29udGV4dC5idWZmZXIuYnVmZmVyW2luZGV4XV07XG4gICAgfVxuICAgIGdldCBuYW1lKCkgeyByZXR1cm4gdGhpcy50eXBlLm5hbWU7IH1cbiAgICBnZXQgZnJvbSgpIHsgcmV0dXJuIHRoaXMuY29udGV4dC5zdGFydCArIHRoaXMuY29udGV4dC5idWZmZXIuYnVmZmVyW3RoaXMuaW5kZXggKyAxXTsgfVxuICAgIGdldCB0bygpIHsgcmV0dXJuIHRoaXMuY29udGV4dC5zdGFydCArIHRoaXMuY29udGV4dC5idWZmZXIuYnVmZmVyW3RoaXMuaW5kZXggKyAyXTsgfVxuICAgIGNoaWxkKGRpciwgYWZ0ZXIpIHtcbiAgICAgICAgbGV0IHsgYnVmZmVyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgICAgIGxldCBpbmRleCA9IGJ1ZmZlci5maW5kQ2hpbGQodGhpcy5pbmRleCArIDQsIGJ1ZmZlci5idWZmZXJbdGhpcy5pbmRleCArIDNdLCBkaXIsIGFmdGVyID09IC0xMDAwMDAwMDAgLyogTm9uZSAqLyA/IC0xMDAwMDAwMDAgLyogTm9uZSAqLyA6IGFmdGVyIC0gdGhpcy5jb250ZXh0LnN0YXJ0KTtcbiAgICAgICAgcmV0dXJuIGluZGV4IDwgMCA/IG51bGwgOiBuZXcgQnVmZmVyTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMsIGluZGV4KTtcbiAgICB9XG4gICAgZ2V0IGZpcnN0Q2hpbGQoKSB7IHJldHVybiB0aGlzLmNoaWxkKDEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLyk7IH1cbiAgICBnZXQgbGFzdENoaWxkKCkgeyByZXR1cm4gdGhpcy5jaGlsZCgtMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKTsgfVxuICAgIGNoaWxkQWZ0ZXIocG9zKSB7IHJldHVybiB0aGlzLmNoaWxkKDEsIHBvcyk7IH1cbiAgICBjaGlsZEJlZm9yZShwb3MpIHsgcmV0dXJuIHRoaXMuY2hpbGQoLTEsIHBvcyk7IH1cbiAgICBnZXQgcGFyZW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50IHx8IHRoaXMuY29udGV4dC5wYXJlbnQubmV4dFNpZ25pZmljYW50UGFyZW50KCk7XG4gICAgfVxuICAgIGV4dGVybmFsU2libGluZyhkaXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudCA/IG51bGwgOiB0aGlzLmNvbnRleHQucGFyZW50Lm5leHRDaGlsZCh0aGlzLmNvbnRleHQuaW5kZXggKyBkaXIsIGRpciwgLTEpO1xuICAgIH1cbiAgICBnZXQgbmV4dFNpYmxpbmcoKSB7XG4gICAgICAgIGxldCB7IGJ1ZmZlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgICAgICBsZXQgYWZ0ZXIgPSBidWZmZXIuYnVmZmVyW3RoaXMuaW5kZXggKyAzXTtcbiAgICAgICAgaWYgKGFmdGVyIDwgKHRoaXMuX3BhcmVudCA/IGJ1ZmZlci5idWZmZXJbdGhpcy5fcGFyZW50LmluZGV4ICsgM10gOiBidWZmZXIuYnVmZmVyLmxlbmd0aCkpXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlck5vZGUodGhpcy5jb250ZXh0LCB0aGlzLl9wYXJlbnQsIGFmdGVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXh0ZXJuYWxTaWJsaW5nKDEpO1xuICAgIH1cbiAgICBnZXQgcHJldlNpYmxpbmcoKSB7XG4gICAgICAgIGxldCB7IGJ1ZmZlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgICAgICBsZXQgcGFyZW50U3RhcnQgPSB0aGlzLl9wYXJlbnQgPyB0aGlzLl9wYXJlbnQuaW5kZXggKyA0IDogMDtcbiAgICAgICAgaWYgKHRoaXMuaW5kZXggPT0gcGFyZW50U3RhcnQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5leHRlcm5hbFNpYmxpbmcoLTEpO1xuICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlck5vZGUodGhpcy5jb250ZXh0LCB0aGlzLl9wYXJlbnQsIGJ1ZmZlci5maW5kQ2hpbGQocGFyZW50U3RhcnQsIHRoaXMuaW5kZXgsIC0xLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pKTtcbiAgICB9XG4gICAgZ2V0IGN1cnNvcigpIHsgcmV0dXJuIG5ldyBUcmVlQ3Vyc29yKHRoaXMpOyB9XG4gICAgcmVzb2x2ZShwb3MsIHNpZGUgPSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnNvci5tb3ZlVG8ocG9zLCBzaWRlKS5ub2RlO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgdG9TdHJpbmcoKSB7IHJldHVybiB0aGlzLmNvbnRleHQuYnVmZmVyLmNoaWxkU3RyaW5nKHRoaXMuaW5kZXgpOyB9XG4gICAgZ2V0Q2hpbGQodHlwZSwgYmVmb3JlID0gbnVsbCwgYWZ0ZXIgPSBudWxsKSB7XG4gICAgICAgIGxldCByID0gZ2V0Q2hpbGRyZW4odGhpcywgdHlwZSwgYmVmb3JlLCBhZnRlcik7XG4gICAgICAgIHJldHVybiByLmxlbmd0aCA/IHJbMF0gOiBudWxsO1xuICAgIH1cbiAgICBnZXRDaGlsZHJlbih0eXBlLCBiZWZvcmUgPSBudWxsLCBhZnRlciA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGdldENoaWxkcmVuKHRoaXMsIHR5cGUsIGJlZm9yZSwgYWZ0ZXIpO1xuICAgIH1cbn1cbi8vLyBBIHRyZWUgY3Vyc29yIG9iamVjdCBmb2N1c2VzIG9uIGEgZ2l2ZW4gbm9kZSBpbiBhIHN5bnRheCB0cmVlLCBhbmRcbi8vLyBhbGxvd3MgeW91IHRvIG1vdmUgdG8gYWRqYWNlbnQgbm9kZXMuXG5jbGFzcyBUcmVlQ3Vyc29yIHtcbiAgICAvLy8gQGludGVybmFsXG4gICAgY29uc3RydWN0b3Iobm9kZSwgZnVsbCA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuZnVsbCA9IGZ1bGw7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5zdGFjayA9IFtdO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5idWZmZXJOb2RlID0gbnVsbDtcbiAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUcmVlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy55aWVsZE5vZGUobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl90cmVlID0gbm9kZS5jb250ZXh0LnBhcmVudDtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gbm9kZS5jb250ZXh0O1xuICAgICAgICAgICAgZm9yIChsZXQgbiA9IG5vZGUuX3BhcmVudDsgbjsgbiA9IG4uX3BhcmVudClcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWNrLnVuc2hpZnQobi5pbmRleCk7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlck5vZGUgPSBub2RlO1xuICAgICAgICAgICAgdGhpcy55aWVsZEJ1Zihub2RlLmluZGV4KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gU2hvcnRoYW5kIGZvciBgLnR5cGUubmFtZWAuXG4gICAgZ2V0IG5hbWUoKSB7IHJldHVybiB0aGlzLnR5cGUubmFtZTsgfVxuICAgIHlpZWxkTm9kZShub2RlKSB7XG4gICAgICAgIGlmICghbm9kZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhpcy5fdHJlZSA9IG5vZGU7XG4gICAgICAgIHRoaXMudHlwZSA9IG5vZGUudHlwZTtcbiAgICAgICAgdGhpcy5mcm9tID0gbm9kZS5mcm9tO1xuICAgICAgICB0aGlzLnRvID0gbm9kZS50bztcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHlpZWxkQnVmKGluZGV4LCB0eXBlKSB7XG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgbGV0IHsgc3RhcnQsIGJ1ZmZlciB9ID0gdGhpcy5idWZmZXI7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGUgfHwgYnVmZmVyLnNldC50eXBlc1tidWZmZXIuYnVmZmVyW2luZGV4XV07XG4gICAgICAgIHRoaXMuZnJvbSA9IHN0YXJ0ICsgYnVmZmVyLmJ1ZmZlcltpbmRleCArIDFdO1xuICAgICAgICB0aGlzLnRvID0gc3RhcnQgKyBidWZmZXIuYnVmZmVyW2luZGV4ICsgMl07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB5aWVsZChub2RlKSB7XG4gICAgICAgIGlmICghbm9kZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUcmVlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5idWZmZXIgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMueWllbGROb2RlKG5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnVmZmVyID0gbm9kZS5jb250ZXh0O1xuICAgICAgICByZXR1cm4gdGhpcy55aWVsZEJ1Zihub2RlLmluZGV4LCBub2RlLnR5cGUpO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlciA/IHRoaXMuYnVmZmVyLmJ1ZmZlci5jaGlsZFN0cmluZyh0aGlzLmluZGV4KSA6IHRoaXMuX3RyZWUudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGVudGVyKGRpciwgYWZ0ZXIpIHtcbiAgICAgICAgaWYgKCF0aGlzLmJ1ZmZlcilcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnlpZWxkKHRoaXMuX3RyZWUubmV4dENoaWxkKGRpciA8IDAgPyB0aGlzLl90cmVlLm5vZGUuY2hpbGRyZW4ubGVuZ3RoIC0gMSA6IDAsIGRpciwgYWZ0ZXIsIHRoaXMuZnVsbCkpO1xuICAgICAgICBsZXQgeyBidWZmZXIgfSA9IHRoaXMuYnVmZmVyO1xuICAgICAgICBsZXQgaW5kZXggPSBidWZmZXIuZmluZENoaWxkKHRoaXMuaW5kZXggKyA0LCBidWZmZXIuYnVmZmVyW3RoaXMuaW5kZXggKyAzXSwgZGlyLCBhZnRlciA9PSAtMTAwMDAwMDAwIC8qIE5vbmUgKi8gPyAtMTAwMDAwMDAwIC8qIE5vbmUgKi8gOiBhZnRlciAtIHRoaXMuYnVmZmVyLnN0YXJ0KTtcbiAgICAgICAgaWYgKGluZGV4IDwgMClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhpcy5zdGFjay5wdXNoKHRoaXMuaW5kZXgpO1xuICAgICAgICByZXR1cm4gdGhpcy55aWVsZEJ1ZihpbmRleCk7XG4gICAgfVxuICAgIC8vLyBNb3ZlIHRoZSBjdXJzb3IgdG8gdGhpcyBub2RlJ3MgZmlyc3QgY2hpbGQuIFdoZW4gdGhpcyByZXR1cm5zXG4gICAgLy8vIGZhbHNlLCB0aGUgbm9kZSBoYXMgbm8gY2hpbGQsIGFuZCB0aGUgY3Vyc29yIGhhcyBub3QgYmVlbiBtb3ZlZC5cbiAgICBmaXJzdENoaWxkKCkgeyByZXR1cm4gdGhpcy5lbnRlcigxLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pOyB9XG4gICAgLy8vIE1vdmUgdGhlIGN1cnNvciB0byB0aGlzIG5vZGUncyBsYXN0IGNoaWxkLlxuICAgIGxhc3RDaGlsZCgpIHsgcmV0dXJuIHRoaXMuZW50ZXIoLTEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLyk7IH1cbiAgICAvLy8gTW92ZSB0aGUgY3Vyc29yIHRvIHRoZSBmaXJzdCBjaGlsZCB0aGF0IHN0YXJ0cyBhdCBvciBhZnRlciBgcG9zYC5cbiAgICBjaGlsZEFmdGVyKHBvcykgeyByZXR1cm4gdGhpcy5lbnRlcigxLCBwb3MpOyB9XG4gICAgLy8vIE1vdmUgdG8gdGhlIGxhc3QgY2hpbGQgdGhhdCBlbmRzIGF0IG9yIGJlZm9yZSBgcG9zYC5cbiAgICBjaGlsZEJlZm9yZShwb3MpIHsgcmV0dXJuIHRoaXMuZW50ZXIoLTEsIHBvcyk7IH1cbiAgICAvLy8gTW92ZSB0aGUgbm9kZSdzIHBhcmVudCBub2RlLCBpZiB0aGlzIGlzbid0IHRoZSB0b3Agbm9kZS5cbiAgICBwYXJlbnQoKSB7XG4gICAgICAgIGlmICghdGhpcy5idWZmZXIpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy55aWVsZE5vZGUodGhpcy5mdWxsID8gdGhpcy5fdHJlZS5fcGFyZW50IDogdGhpcy5fdHJlZS5wYXJlbnQpO1xuICAgICAgICBpZiAodGhpcy5zdGFjay5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy55aWVsZEJ1Zih0aGlzLnN0YWNrLnBvcCgpKTtcbiAgICAgICAgbGV0IHBhcmVudCA9IHRoaXMuZnVsbCA/IHRoaXMuYnVmZmVyLnBhcmVudCA6IHRoaXMuYnVmZmVyLnBhcmVudC5uZXh0U2lnbmlmaWNhbnRQYXJlbnQoKTtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBudWxsO1xuICAgICAgICByZXR1cm4gdGhpcy55aWVsZE5vZGUocGFyZW50KTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHNpYmxpbmcoZGlyKSB7XG4gICAgICAgIGlmICghdGhpcy5idWZmZXIpXG4gICAgICAgICAgICByZXR1cm4gIXRoaXMuX3RyZWUuX3BhcmVudCA/IGZhbHNlXG4gICAgICAgICAgICAgICAgOiB0aGlzLnlpZWxkKHRoaXMuX3RyZWUuX3BhcmVudC5uZXh0Q2hpbGQodGhpcy5fdHJlZS5pbmRleCArIGRpciwgZGlyLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8sIHRoaXMuZnVsbCkpO1xuICAgICAgICBsZXQgeyBidWZmZXIgfSA9IHRoaXMuYnVmZmVyLCBkID0gdGhpcy5zdGFjay5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoZGlyIDwgMCkge1xuICAgICAgICAgICAgbGV0IHBhcmVudFN0YXJ0ID0gZCA8IDAgPyAwIDogdGhpcy5zdGFja1tkXSArIDQ7XG4gICAgICAgICAgICBpZiAodGhpcy5pbmRleCAhPSBwYXJlbnRTdGFydClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy55aWVsZEJ1ZihidWZmZXIuZmluZENoaWxkKHBhcmVudFN0YXJ0LCB0aGlzLmluZGV4LCAtMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgYWZ0ZXIgPSBidWZmZXIuYnVmZmVyW3RoaXMuaW5kZXggKyAzXTtcbiAgICAgICAgICAgIGlmIChhZnRlciA8IChkIDwgMCA/IGJ1ZmZlci5idWZmZXIubGVuZ3RoIDogYnVmZmVyLmJ1ZmZlclt0aGlzLnN0YWNrW2RdICsgM10pKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnlpZWxkQnVmKGFmdGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZCA8IDAgPyB0aGlzLnlpZWxkKHRoaXMuYnVmZmVyLnBhcmVudC5uZXh0Q2hpbGQodGhpcy5idWZmZXIuaW5kZXggKyBkaXIsIGRpciwgLTEwMDAwMDAwMCAvKiBOb25lICovLCB0aGlzLmZ1bGwpKSA6IGZhbHNlO1xuICAgIH1cbiAgICAvLy8gTW92ZSB0byB0aGlzIG5vZGUncyBuZXh0IHNpYmxpbmcsIGlmIGFueS5cbiAgICBuZXh0U2libGluZygpIHsgcmV0dXJuIHRoaXMuc2libGluZygxKTsgfVxuICAgIC8vLyBNb3ZlIHRvIHRoaXMgbm9kZSdzIHByZXZpb3VzIHNpYmxpbmcsIGlmIGFueS5cbiAgICBwcmV2U2libGluZygpIHsgcmV0dXJuIHRoaXMuc2libGluZygtMSk7IH1cbiAgICBhdExhc3ROb2RlKGRpcikge1xuICAgICAgICBsZXQgaW5kZXgsIHBhcmVudCwgeyBidWZmZXIgfSA9IHRoaXM7XG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICAgIGlmIChkaXIgPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXggPCBidWZmZXIuYnVmZmVyLmJ1ZmZlci5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pbmRleDsgaSsrKVxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVmZmVyLmJ1ZmZlci5idWZmZXJbaSArIDNdIDwgdGhpcy5pbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICh7IGluZGV4LCBwYXJlbnQgfSA9IGJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAoeyBpbmRleCwgX3BhcmVudDogcGFyZW50IH0gPSB0aGlzLl90cmVlKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKDsgcGFyZW50OyB7IGluZGV4LCBfcGFyZW50OiBwYXJlbnQgfSA9IHBhcmVudCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4ICsgZGlyLCBlID0gZGlyIDwgMCA/IC0xIDogcGFyZW50Lm5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpICE9IGU7IGkgKz0gZGlyKSB7XG4gICAgICAgICAgICAgICAgbGV0IGNoaWxkID0gcGFyZW50Lm5vZGUuY2hpbGRyZW5baV07XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnVsbCB8fCAhY2hpbGQudHlwZS5pc0Fub255bW91cyB8fCBjaGlsZCBpbnN0YW5jZW9mIFRyZWVCdWZmZXIgfHwgaGFzQ2hpbGQoY2hpbGQpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIG1vdmUoZGlyKSB7XG4gICAgICAgIGlmICh0aGlzLmVudGVyKGRpciwgLTEwMDAwMDAwMCAvKiBOb25lICovKSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zaWJsaW5nKGRpcikpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBpZiAodGhpcy5hdExhc3ROb2RlKGRpcikgfHwgIXRoaXMucGFyZW50KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBNb3ZlIHRvIHRoZSBuZXh0IG5vZGUgaW4gYVxuICAgIC8vLyBbcHJlLW9yZGVyXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9UcmVlX3RyYXZlcnNhbCNQcmUtb3JkZXJfKE5MUikpXG4gICAgLy8vIHRyYXZlcnNhbCwgZ29pbmcgZnJvbSBhIG5vZGUgdG8gaXRzIGZpcnN0IGNoaWxkIG9yLCBpZiB0aGVcbiAgICAvLy8gY3VycmVudCBub2RlIGlzIGVtcHR5LCBpdHMgbmV4dCBzaWJsaW5nIG9yIHRoZSBuZXh0IHNpYmxpbmcgb2ZcbiAgICAvLy8gdGhlIGZpcnN0IHBhcmVudCBub2RlIHRoYXQgaGFzIG9uZS5cbiAgICBuZXh0KCkgeyByZXR1cm4gdGhpcy5tb3ZlKDEpOyB9XG4gICAgLy8vIE1vdmUgdG8gdGhlIG5leHQgbm9kZSBpbiBhIGxhc3QtdG8tZmlyc3QgcHJlLW9yZGVyIHRyYXZlcmFsLiBBXG4gICAgLy8vIG5vZGUgaXMgZm9sbG93ZWQgYnkgaXN0IGxhc3QgY2hpbGQgb3IsIGlmIGl0IGhhcyBub25lLCBpdHNcbiAgICAvLy8gcHJldmlvdXMgc2libGluZyBvciB0aGUgcHJldmlvdXMgc2libGluZyBvZiB0aGUgZmlyc3QgcGFyZW50XG4gICAgLy8vIG5vZGUgdGhhdCBoYXMgb25lLlxuICAgIHByZXYoKSB7IHJldHVybiB0aGlzLm1vdmUoLTEpOyB9XG4gICAgLy8vIE1vdmUgdGhlIGN1cnNvciB0byB0aGUgaW5uZXJtb3N0IG5vZGUgdGhhdCBjb3ZlcnMgYHBvc2AuIElmXG4gICAgLy8vIGBzaWRlYCBpcyAtMSwgaXQgd2lsbCBlbnRlciBub2RlcyB0aGF0IGVuZCBhdCBgcG9zYC4gSWYgaXQgaXMgMSxcbiAgICAvLy8gaXQgd2lsbCBlbnRlciBub2RlcyB0aGF0IHN0YXJ0IGF0IGBwb3NgLlxuICAgIG1vdmVUbyhwb3MsIHNpZGUgPSAwKSB7XG4gICAgICAgIC8vIE1vdmUgdXAgdG8gYSBub2RlIHRoYXQgYWN0dWFsbHkgaG9sZHMgdGhlIHBvc2l0aW9uLCBpZiBwb3NzaWJsZVxuICAgICAgICB3aGlsZSAodGhpcy5mcm9tID09IHRoaXMudG8gfHxcbiAgICAgICAgICAgIChzaWRlIDwgMSA/IHRoaXMuZnJvbSA+PSBwb3MgOiB0aGlzLmZyb20gPiBwb3MpIHx8XG4gICAgICAgICAgICAoc2lkZSA+IC0xID8gdGhpcy50byA8PSBwb3MgOiB0aGlzLnRvIDwgcG9zKSlcbiAgICAgICAgICAgIGlmICghdGhpcy5wYXJlbnQoKSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gVGhlbiBzY2FuIGRvd24gaW50byBjaGlsZCBub2RlcyBhcyBmYXIgYXMgcG9zc2libGVcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgaWYgKHNpZGUgPCAwID8gIXRoaXMuY2hpbGRCZWZvcmUocG9zKSA6ICF0aGlzLmNoaWxkQWZ0ZXIocG9zKSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGlmICh0aGlzLmZyb20gPT0gdGhpcy50byB8fFxuICAgICAgICAgICAgICAgIChzaWRlIDwgMSA/IHRoaXMuZnJvbSA+PSBwb3MgOiB0aGlzLmZyb20gPiBwb3MpIHx8XG4gICAgICAgICAgICAgICAgKHNpZGUgPiAtMSA/IHRoaXMudG8gPD0gcG9zIDogdGhpcy50byA8IHBvcykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvLy8gR2V0IGEgW3N5bnRheCBub2RlXSgjdHJlZS5TeW50YXhOb2RlKSBhdCB0aGUgY3Vyc29yJ3MgY3VycmVudFxuICAgIC8vLyBwb3NpdGlvbi5cbiAgICBnZXQgbm9kZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmJ1ZmZlcilcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl90cmVlO1xuICAgICAgICBsZXQgY2FjaGUgPSB0aGlzLmJ1ZmZlck5vZGUsIHJlc3VsdCA9IG51bGwsIGRlcHRoID0gMDtcbiAgICAgICAgaWYgKGNhY2hlICYmIGNhY2hlLmNvbnRleHQgPT0gdGhpcy5idWZmZXIpIHtcbiAgICAgICAgICAgIHNjYW46IGZvciAobGV0IGluZGV4ID0gdGhpcy5pbmRleCwgZCA9IHRoaXMuc3RhY2subGVuZ3RoOyBkID49IDA7KSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IGNhY2hlOyBjOyBjID0gYy5fcGFyZW50KVxuICAgICAgICAgICAgICAgICAgICBpZiAoYy5pbmRleCA9PSBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09IHRoaXMuaW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwdGggPSBkICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrIHNjYW47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMuc3RhY2tbLS1kXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gZGVwdGg7IGkgPCB0aGlzLnN0YWNrLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEJ1ZmZlck5vZGUodGhpcy5idWZmZXIsIHJlc3VsdCwgdGhpcy5zdGFja1tpXSk7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlck5vZGUgPSBuZXcgQnVmZmVyTm9kZSh0aGlzLmJ1ZmZlciwgcmVzdWx0LCB0aGlzLmluZGV4KTtcbiAgICB9XG4gICAgLy8vIEdldCB0aGUgW3RyZWVdKCN0cmVlLlRyZWUpIHRoYXQgcmVwcmVzZW50cyB0aGUgY3VycmVudCBub2RlLCBpZlxuICAgIC8vLyBhbnkuIFdpbGwgcmV0dXJuIG51bGwgd2hlbiB0aGUgbm9kZSBpcyBpbiBhIFt0cmVlXG4gICAgLy8vIGJ1ZmZlcl0oI3RyZWUuVHJlZUJ1ZmZlcikuXG4gICAgZ2V0IHRyZWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlciA/IG51bGwgOiB0aGlzLl90cmVlLm5vZGU7XG4gICAgfVxufVxuZnVuY3Rpb24gaGFzQ2hpbGQodHJlZSkge1xuICAgIHJldHVybiB0cmVlLmNoaWxkcmVuLnNvbWUoY2ggPT4gIWNoLnR5cGUuaXNBbm9ueW1vdXMgfHwgY2ggaW5zdGFuY2VvZiBUcmVlQnVmZmVyIHx8IGhhc0NoaWxkKGNoKSk7XG59XG5jbGFzcyBGbGF0QnVmZmVyQ3Vyc29yIHtcbiAgICBjb25zdHJ1Y3RvcihidWZmZXIsIGluZGV4KSB7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgfVxuICAgIGdldCBpZCgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSA0XTsgfVxuICAgIGdldCBzdGFydCgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSAzXTsgfVxuICAgIGdldCBlbmQoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gMl07IH1cbiAgICBnZXQgc2l6ZSgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSAxXTsgfVxuICAgIGdldCBwb3MoKSB7IHJldHVybiB0aGlzLmluZGV4OyB9XG4gICAgbmV4dCgpIHsgdGhpcy5pbmRleCAtPSA0OyB9XG4gICAgZm9yaygpIHsgcmV0dXJuIG5ldyBGbGF0QnVmZmVyQ3Vyc29yKHRoaXMuYnVmZmVyLCB0aGlzLmluZGV4KTsgfVxufVxuY29uc3QgQmFsYW5jZUJyYW5jaEZhY3RvciA9IDg7XG5mdW5jdGlvbiBidWlsZFRyZWUoZGF0YSkge1xuICAgIHZhciBfYTtcbiAgICBsZXQgeyBidWZmZXIsIG5vZGVTZXQsIHRvcElEID0gMCwgbWF4QnVmZmVyTGVuZ3RoID0gRGVmYXVsdEJ1ZmZlckxlbmd0aCwgcmV1c2VkID0gW10sIG1pblJlcGVhdFR5cGUgPSBub2RlU2V0LnR5cGVzLmxlbmd0aCB9ID0gZGF0YTtcbiAgICBsZXQgY3Vyc29yID0gQXJyYXkuaXNBcnJheShidWZmZXIpID8gbmV3IEZsYXRCdWZmZXJDdXJzb3IoYnVmZmVyLCBidWZmZXIubGVuZ3RoKSA6IGJ1ZmZlcjtcbiAgICBsZXQgdHlwZXMgPSBub2RlU2V0LnR5cGVzO1xuICAgIGxldCBjb250ZXh0SGFzaCA9IDA7XG4gICAgZnVuY3Rpb24gdGFrZU5vZGUocGFyZW50U3RhcnQsIG1pblBvcywgY2hpbGRyZW4sIHBvc2l0aW9ucywgaW5SZXBlYXQpIHtcbiAgICAgICAgbGV0IHsgaWQsIHN0YXJ0LCBlbmQsIHNpemUgfSA9IGN1cnNvcjtcbiAgICAgICAgbGV0IHN0YXJ0UG9zID0gc3RhcnQgLSBwYXJlbnRTdGFydDtcbiAgICAgICAgaWYgKHNpemUgPCAwKSB7XG4gICAgICAgICAgICBpZiAoc2l6ZSA9PSAtMSkgeyAvLyBSZXVzZWQgbm9kZVxuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gocmV1c2VkW2lkXSk7XG4gICAgICAgICAgICAgICAgcG9zaXRpb25zLnB1c2goc3RhcnRQb3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7IC8vIENvbnRleHQgY2hhbmdlXG4gICAgICAgICAgICAgICAgY29udGV4dEhhc2ggPSBpZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnNvci5uZXh0KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHR5cGUgPSB0eXBlc1tpZF0sIG5vZGUsIGJ1ZmZlcjtcbiAgICAgICAgaWYgKGVuZCAtIHN0YXJ0IDw9IG1heEJ1ZmZlckxlbmd0aCAmJiAoYnVmZmVyID0gZmluZEJ1ZmZlclNpemUoY3Vyc29yLnBvcyAtIG1pblBvcywgaW5SZXBlYXQpKSkge1xuICAgICAgICAgICAgLy8gU21hbGwgZW5vdWdoIGZvciBhIGJ1ZmZlciwgYW5kIG5vIHJldXNlZCBub2RlcyBpbnNpZGVcbiAgICAgICAgICAgIGxldCBkYXRhID0gbmV3IFVpbnQxNkFycmF5KGJ1ZmZlci5zaXplIC0gYnVmZmVyLnNraXApO1xuICAgICAgICAgICAgbGV0IGVuZFBvcyA9IGN1cnNvci5wb3MgLSBidWZmZXIuc2l6ZSwgaW5kZXggPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChjdXJzb3IucG9zID4gZW5kUG9zKVxuICAgICAgICAgICAgICAgIGluZGV4ID0gY29weVRvQnVmZmVyKGJ1ZmZlci5zdGFydCwgZGF0YSwgaW5kZXgsIGluUmVwZWF0KTtcbiAgICAgICAgICAgIG5vZGUgPSBuZXcgVHJlZUJ1ZmZlcihkYXRhLCBlbmQgLSBidWZmZXIuc3RhcnQsIG5vZGVTZXQsIGluUmVwZWF0IDwgMCA/IE5vZGVUeXBlLm5vbmUgOiB0eXBlc1tpblJlcGVhdF0pO1xuICAgICAgICAgICAgc3RhcnRQb3MgPSBidWZmZXIuc3RhcnQgLSBwYXJlbnRTdGFydDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHsgLy8gTWFrZSBpdCBhIG5vZGVcbiAgICAgICAgICAgIGxldCBlbmRQb3MgPSBjdXJzb3IucG9zIC0gc2l6ZTtcbiAgICAgICAgICAgIGN1cnNvci5uZXh0KCk7XG4gICAgICAgICAgICBsZXQgbG9jYWxDaGlsZHJlbiA9IFtdLCBsb2NhbFBvc2l0aW9ucyA9IFtdO1xuICAgICAgICAgICAgbGV0IGxvY2FsSW5SZXBlYXQgPSBpZCA+PSBtaW5SZXBlYXRUeXBlID8gaWQgOiAtMTtcbiAgICAgICAgICAgIHdoaWxlIChjdXJzb3IucG9zID4gZW5kUG9zKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnNvci5pZCA9PSBsb2NhbEluUmVwZWF0KVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IubmV4dCgpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgdGFrZU5vZGUoc3RhcnQsIGVuZFBvcywgbG9jYWxDaGlsZHJlbiwgbG9jYWxQb3NpdGlvbnMsIGxvY2FsSW5SZXBlYXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9jYWxDaGlsZHJlbi5yZXZlcnNlKCk7XG4gICAgICAgICAgICBsb2NhbFBvc2l0aW9ucy5yZXZlcnNlKCk7XG4gICAgICAgICAgICBpZiAobG9jYWxJblJlcGVhdCA+IC0xICYmIGxvY2FsQ2hpbGRyZW4ubGVuZ3RoID4gQmFsYW5jZUJyYW5jaEZhY3RvcilcbiAgICAgICAgICAgICAgICBub2RlID0gYmFsYW5jZVJhbmdlKHR5cGUsIHR5cGUsIGxvY2FsQ2hpbGRyZW4sIGxvY2FsUG9zaXRpb25zLCAwLCBsb2NhbENoaWxkcmVuLmxlbmd0aCwgMCwgbWF4QnVmZmVyTGVuZ3RoLCBlbmQgLSBzdGFydCwgY29udGV4dEhhc2gpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG5vZGUgPSB3aXRoSGFzaChuZXcgVHJlZSh0eXBlLCBsb2NhbENoaWxkcmVuLCBsb2NhbFBvc2l0aW9ucywgZW5kIC0gc3RhcnQpLCBjb250ZXh0SGFzaCk7XG4gICAgICAgIH1cbiAgICAgICAgY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgcG9zaXRpb25zLnB1c2goc3RhcnRQb3MpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmaW5kQnVmZmVyU2l6ZShtYXhTaXplLCBpblJlcGVhdCkge1xuICAgICAgICAvLyBTY2FuIHRocm91Z2ggdGhlIGJ1ZmZlciB0byBmaW5kIHByZXZpb3VzIHNpYmxpbmdzIHRoYXQgZml0XG4gICAgICAgIC8vIHRvZ2V0aGVyIGluIGEgVHJlZUJ1ZmZlciwgYW5kIGRvbid0IGNvbnRhaW4gYW55IHJldXNlZCBub2Rlc1xuICAgICAgICAvLyAod2hpY2ggY2FuJ3QgYmUgc3RvcmVkIGluIGEgYnVmZmVyKS5cbiAgICAgICAgLy8gSWYgYGluUmVwZWF0YCBpcyA+IC0xLCBpZ25vcmUgbm9kZSBib3VuZGFyaWVzIG9mIHRoYXQgdHlwZSBmb3JcbiAgICAgICAgLy8gbmVzdGluZywgYnV0IG1ha2Ugc3VyZSB0aGUgZW5kIGZhbGxzIGVpdGhlciBhdCB0aGUgc3RhcnRcbiAgICAgICAgLy8gKGBtYXhTaXplYCkgb3IgYmVmb3JlIHN1Y2ggYSBub2RlLlxuICAgICAgICBsZXQgZm9yayA9IGN1cnNvci5mb3JrKCk7XG4gICAgICAgIGxldCBzaXplID0gMCwgc3RhcnQgPSAwLCBza2lwID0gMCwgbWluU3RhcnQgPSBmb3JrLmVuZCAtIG1heEJ1ZmZlckxlbmd0aDtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHsgc2l6ZTogMCwgc3RhcnQ6IDAsIHNraXA6IDAgfTtcbiAgICAgICAgc2NhbjogZm9yIChsZXQgbWluUG9zID0gZm9yay5wb3MgLSBtYXhTaXplOyBmb3JrLnBvcyA+IG1pblBvczspIHtcbiAgICAgICAgICAgIC8vIFByZXRlbmQgbmVzdGVkIHJlcGVhdCBub2RlcyBvZiB0aGUgc2FtZSB0eXBlIGRvbid0IGV4aXN0XG4gICAgICAgICAgICBpZiAoZm9yay5pZCA9PSBpblJlcGVhdCkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VwdCB0aGF0IHdlIHN0b3JlIHRoZSBjdXJyZW50IHN0YXRlIGFzIGEgdmFsaWQgcmV0dXJuXG4gICAgICAgICAgICAgICAgLy8gdmFsdWUuXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNpemUgPSBzaXplO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIHJlc3VsdC5za2lwID0gc2tpcDtcbiAgICAgICAgICAgICAgICBza2lwICs9IDQ7XG4gICAgICAgICAgICAgICAgc2l6ZSArPSA0O1xuICAgICAgICAgICAgICAgIGZvcmsubmV4dCgpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IG5vZGVTaXplID0gZm9yay5zaXplLCBzdGFydFBvcyA9IGZvcmsucG9zIC0gbm9kZVNpemU7XG4gICAgICAgICAgICBpZiAobm9kZVNpemUgPCAwIHx8IHN0YXJ0UG9zIDwgbWluUG9zIHx8IGZvcmsuc3RhcnQgPCBtaW5TdGFydClcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGxldCBsb2NhbFNraXBwZWQgPSBmb3JrLmlkID49IG1pblJlcGVhdFR5cGUgPyA0IDogMDtcbiAgICAgICAgICAgIGxldCBub2RlU3RhcnQgPSBmb3JrLnN0YXJ0O1xuICAgICAgICAgICAgZm9yay5uZXh0KCk7XG4gICAgICAgICAgICB3aGlsZSAoZm9yay5wb3MgPiBzdGFydFBvcykge1xuICAgICAgICAgICAgICAgIGlmIChmb3JrLnNpemUgPCAwKVxuICAgICAgICAgICAgICAgICAgICBicmVhayBzY2FuO1xuICAgICAgICAgICAgICAgIGlmIChmb3JrLmlkID49IG1pblJlcGVhdFR5cGUpXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU2tpcHBlZCArPSA0O1xuICAgICAgICAgICAgICAgIGZvcmsubmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhcnQgPSBub2RlU3RhcnQ7XG4gICAgICAgICAgICBzaXplICs9IG5vZGVTaXplO1xuICAgICAgICAgICAgc2tpcCArPSBsb2NhbFNraXBwZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluUmVwZWF0IDwgMCB8fCBzaXplID09IG1heFNpemUpIHtcbiAgICAgICAgICAgIHJlc3VsdC5zaXplID0gc2l6ZTtcbiAgICAgICAgICAgIHJlc3VsdC5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgcmVzdWx0LnNraXAgPSBza2lwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQuc2l6ZSA+IDQgPyByZXN1bHQgOiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvcHlUb0J1ZmZlcihidWZmZXJTdGFydCwgYnVmZmVyLCBpbmRleCwgaW5SZXBlYXQpIHtcbiAgICAgICAgbGV0IHsgaWQsIHN0YXJ0LCBlbmQsIHNpemUgfSA9IGN1cnNvcjtcbiAgICAgICAgY3Vyc29yLm5leHQoKTtcbiAgICAgICAgaWYgKGlkID09IGluUmVwZWF0KVxuICAgICAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgICBsZXQgc3RhcnRJbmRleCA9IGluZGV4O1xuICAgICAgICBpZiAoc2l6ZSA+IDQpIHtcbiAgICAgICAgICAgIGxldCBlbmRQb3MgPSBjdXJzb3IucG9zIC0gKHNpemUgLSA0KTtcbiAgICAgICAgICAgIHdoaWxlIChjdXJzb3IucG9zID4gZW5kUG9zKVxuICAgICAgICAgICAgICAgIGluZGV4ID0gY29weVRvQnVmZmVyKGJ1ZmZlclN0YXJ0LCBidWZmZXIsIGluZGV4LCBpblJlcGVhdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkIDwgbWluUmVwZWF0VHlwZSkgeyAvLyBEb24ndCBjb3B5IHJlcGVhdCBub2RlcyBpbnRvIGJ1ZmZlcnNcbiAgICAgICAgICAgIGJ1ZmZlclstLWluZGV4XSA9IHN0YXJ0SW5kZXg7XG4gICAgICAgICAgICBidWZmZXJbLS1pbmRleF0gPSBlbmQgLSBidWZmZXJTdGFydDtcbiAgICAgICAgICAgIGJ1ZmZlclstLWluZGV4XSA9IHN0YXJ0IC0gYnVmZmVyU3RhcnQ7XG4gICAgICAgICAgICBidWZmZXJbLS1pbmRleF0gPSBpZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxuICAgIGxldCBjaGlsZHJlbiA9IFtdLCBwb3NpdGlvbnMgPSBbXTtcbiAgICB3aGlsZSAoY3Vyc29yLnBvcyA+IDApXG4gICAgICAgIHRha2VOb2RlKGRhdGEuc3RhcnQgfHwgMCwgMCwgY2hpbGRyZW4sIHBvc2l0aW9ucywgLTEpO1xuICAgIGxldCBsZW5ndGggPSAoX2EgPSBkYXRhLmxlbmd0aCkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogKGNoaWxkcmVuLmxlbmd0aCA/IHBvc2l0aW9uc1swXSArIGNoaWxkcmVuWzBdLmxlbmd0aCA6IDApO1xuICAgIHJldHVybiBuZXcgVHJlZSh0eXBlc1t0b3BJRF0sIGNoaWxkcmVuLnJldmVyc2UoKSwgcG9zaXRpb25zLnJldmVyc2UoKSwgbGVuZ3RoKTtcbn1cbmZ1bmN0aW9uIGJhbGFuY2VSYW5nZShvdXRlclR5cGUsIGlubmVyVHlwZSwgY2hpbGRyZW4sIHBvc2l0aW9ucywgZnJvbSwgdG8sIHN0YXJ0LCBtYXhCdWZmZXJMZW5ndGgsIGxlbmd0aCwgY29udGV4dEhhc2gpIHtcbiAgICBsZXQgbG9jYWxDaGlsZHJlbiA9IFtdLCBsb2NhbFBvc2l0aW9ucyA9IFtdO1xuICAgIGlmIChsZW5ndGggPD0gbWF4QnVmZmVyTGVuZ3RoKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSBmcm9tOyBpIDwgdG87IGkrKykge1xuICAgICAgICAgICAgbG9jYWxDaGlsZHJlbi5wdXNoKGNoaWxkcmVuW2ldKTtcbiAgICAgICAgICAgIGxvY2FsUG9zaXRpb25zLnB1c2gocG9zaXRpb25zW2ldIC0gc3RhcnQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBsZXQgbWF4Q2hpbGQgPSBNYXRoLm1heChtYXhCdWZmZXJMZW5ndGgsIE1hdGguY2VpbChsZW5ndGggKiAxLjUgLyBCYWxhbmNlQnJhbmNoRmFjdG9yKSk7XG4gICAgICAgIGZvciAobGV0IGkgPSBmcm9tOyBpIDwgdG87KSB7XG4gICAgICAgICAgICBsZXQgZ3JvdXBGcm9tID0gaSwgZ3JvdXBTdGFydCA9IHBvc2l0aW9uc1tpXTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIGZvciAoOyBpIDwgdG87IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBuZXh0RW5kID0gcG9zaXRpb25zW2ldICsgY2hpbGRyZW5baV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0RW5kIC0gZ3JvdXBTdGFydCA+IG1heENoaWxkKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpID09IGdyb3VwRnJvbSArIDEpIHtcbiAgICAgICAgICAgICAgICBsZXQgb25seSA9IGNoaWxkcmVuW2dyb3VwRnJvbV07XG4gICAgICAgICAgICAgICAgaWYgKG9ubHkgaW5zdGFuY2VvZiBUcmVlICYmIG9ubHkudHlwZSA9PSBpbm5lclR5cGUgJiYgb25seS5sZW5ndGggPiBtYXhDaGlsZCA8PCAxKSB7IC8vIFRvbyBiaWcsIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgb25seS5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxDaGlsZHJlbi5wdXNoKG9ubHkuY2hpbGRyZW5bal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxQb3NpdGlvbnMucHVzaChvbmx5LnBvc2l0aW9uc1tqXSArIGdyb3VwU3RhcnQgLSBzdGFydCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxvY2FsQ2hpbGRyZW4ucHVzaChvbmx5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT0gZ3JvdXBGcm9tICsgMSkge1xuICAgICAgICAgICAgICAgIGxvY2FsQ2hpbGRyZW4ucHVzaChjaGlsZHJlbltncm91cEZyb21dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBpbm5lciA9IGJhbGFuY2VSYW5nZShpbm5lclR5cGUsIGlubmVyVHlwZSwgY2hpbGRyZW4sIHBvc2l0aW9ucywgZ3JvdXBGcm9tLCBpLCBncm91cFN0YXJ0LCBtYXhCdWZmZXJMZW5ndGgsIHBvc2l0aW9uc1tpIC0gMV0gKyBjaGlsZHJlbltpIC0gMV0ubGVuZ3RoIC0gZ3JvdXBTdGFydCwgY29udGV4dEhhc2gpO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lclR5cGUgIT0gTm9kZVR5cGUubm9uZSAmJiAhY29udGFpbnNUeXBlKGlubmVyLmNoaWxkcmVuLCBpbm5lclR5cGUpKVxuICAgICAgICAgICAgICAgICAgICBpbm5lciA9IHdpdGhIYXNoKG5ldyBUcmVlKE5vZGVUeXBlLm5vbmUsIGlubmVyLmNoaWxkcmVuLCBpbm5lci5wb3NpdGlvbnMsIGlubmVyLmxlbmd0aCksIGNvbnRleHRIYXNoKTtcbiAgICAgICAgICAgICAgICBsb2NhbENoaWxkcmVuLnB1c2goaW5uZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9jYWxQb3NpdGlvbnMucHVzaChncm91cFN0YXJ0IC0gc3RhcnQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aXRoSGFzaChuZXcgVHJlZShvdXRlclR5cGUsIGxvY2FsQ2hpbGRyZW4sIGxvY2FsUG9zaXRpb25zLCBsZW5ndGgpLCBjb250ZXh0SGFzaCk7XG59XG5mdW5jdGlvbiBjb250YWluc1R5cGUobm9kZXMsIHR5cGUpIHtcbiAgICBmb3IgKGxldCBlbHQgb2Ygbm9kZXMpXG4gICAgICAgIGlmIChlbHQudHlwZSA9PSB0eXBlKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuLy8vIFRyZWUgZnJhZ21lbnRzIGFyZSB1c2VkIGR1cmluZyBbaW5jcmVtZW50YWxcbi8vLyBwYXJzaW5nXSgjbGV6ZXIuUGFyc2VPcHRpb25zLmZyYWdtZW50cykgdG8gdHJhY2sgcGFydHMgb2Ygb2xkXG4vLy8gdHJlZXMgdGhhdCBjYW4gYmUgcmV1c2VkIGluIGEgbmV3IHBhcnNlLiBBbiBhcnJheSBvZiBmcmFnbWVudHMgaXNcbi8vLyB1c2VkIHRvIHRyYWNrIHJlZ2lvbnMgb2YgYW4gb2xkIHRyZWUgd2hvc2Ugbm9kZXMgbWlnaHQgYmUgcmV1c2VkXG4vLy8gaW4gbmV3IHBhcnNlcy4gVXNlIHRoZSBzdGF0aWNcbi8vLyBbYGFwcGx5Q2hhbmdlc2BdKCN0cmVlLlRyZWVGcmFnbWVudF5hcHBseUNoYW5nZXMpIG1ldGhvZCB0byB1cGRhdGVcbi8vLyBmcmFnbWVudHMgZm9yIGRvY3VtZW50IGNoYW5nZXMuXG5jbGFzcyBUcmVlRnJhZ21lbnQge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgIC8vLyBUaGUgc3RhcnQgb2YgdGhlIHVuY2hhbmdlZCByYW5nZSBwb2ludGVkIHRvIGJ5IHRoaXMgZnJhZ21lbnQuXG4gICAgLy8vIFRoaXMgcmVmZXJzIHRvIGFuIG9mZnNldCBpbiB0aGUgX3VwZGF0ZWRfIGRvY3VtZW50IChhcyBvcHBvc2VkXG4gICAgLy8vIHRvIHRoZSBvcmlnaW5hbCB0cmVlKS5cbiAgICBmcm9tLCBcbiAgICAvLy8gVGhlIGVuZCBvZiB0aGUgdW5jaGFuZ2VkIHJhbmdlLlxuICAgIHRvLCBcbiAgICAvLy8gVGhlIHRyZWUgdGhhdCB0aGlzIGZyYWdtZW50IGlzIGJhc2VkIG9uLlxuICAgIHRyZWUsIFxuICAgIC8vLyBUaGUgb2Zmc2V0IGJldHdlZW4gdGhlIGZyYWdtZW50J3MgdHJlZSBhbmQgdGhlIGRvY3VtZW50IHRoYXRcbiAgICAvLy8gdGhpcyBmcmFnbWVudCBjYW4gYmUgdXNlZCBhZ2FpbnN0LiBBZGQgdGhpcyB3aGVuIGdvaW5nIGZyb21cbiAgICAvLy8gZG9jdW1lbnQgdG8gdHJlZSBwb3NpdGlvbnMsIHN1YnRyYWN0IGl0IHRvIGdvIGZyb20gdHJlZSB0b1xuICAgIC8vLyBkb2N1bWVudCBwb3NpdGlvbnMuXG4gICAgb2Zmc2V0LCBvcGVuKSB7XG4gICAgICAgIHRoaXMuZnJvbSA9IGZyb207XG4gICAgICAgIHRoaXMudG8gPSB0bztcbiAgICAgICAgdGhpcy50cmVlID0gdHJlZTtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMub3BlbiA9IG9wZW47XG4gICAgfVxuICAgIGdldCBvcGVuU3RhcnQoKSB7IHJldHVybiAodGhpcy5vcGVuICYgMSAvKiBTdGFydCAqLykgPiAwOyB9XG4gICAgZ2V0IG9wZW5FbmQoKSB7IHJldHVybiAodGhpcy5vcGVuICYgMiAvKiBFbmQgKi8pID4gMDsgfVxuICAgIC8vLyBBcHBseSBhIHNldCBvZiBlZGl0cyB0byBhbiBhcnJheSBvZiBmcmFnbWVudHMsIHJlbW92aW5nIG9yXG4gICAgLy8vIHNwbGl0dGluZyBmcmFnbWVudHMgYXMgbmVjZXNzYXJ5IHRvIHJlbW92ZSBlZGl0ZWQgcmFuZ2VzLCBhbmRcbiAgICAvLy8gYWRqdXN0aW5nIG9mZnNldHMgZm9yIGZyYWdtZW50cyB0aGF0IG1vdmVkLlxuICAgIHN0YXRpYyBhcHBseUNoYW5nZXMoZnJhZ21lbnRzLCBjaGFuZ2VzLCBtaW5HYXAgPSAxMjgpIHtcbiAgICAgICAgaWYgKCFjaGFuZ2VzLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBmcmFnbWVudHM7XG4gICAgICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICAgICAgbGV0IGZJID0gMSwgbmV4dEYgPSBmcmFnbWVudHMubGVuZ3RoID8gZnJhZ21lbnRzWzBdIDogbnVsbDtcbiAgICAgICAgbGV0IGNJID0gMCwgcG9zID0gMCwgb2ZmID0gMDtcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgbGV0IG5leHRDID0gY0kgPCBjaGFuZ2VzLmxlbmd0aCA/IGNoYW5nZXNbY0krK10gOiBudWxsO1xuICAgICAgICAgICAgbGV0IG5leHRQb3MgPSBuZXh0QyA/IG5leHRDLmZyb21BIDogMWU5O1xuICAgICAgICAgICAgaWYgKG5leHRQb3MgLSBwb3MgPj0gbWluR2FwKVxuICAgICAgICAgICAgICAgIHdoaWxlIChuZXh0RiAmJiBuZXh0Ri5mcm9tIDwgbmV4dFBvcykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY3V0ID0gbmV4dEY7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3MgPj0gY3V0LmZyb20gfHwgbmV4dFBvcyA8PSBjdXQudG8gfHwgb2ZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZkZyb20gPSBNYXRoLm1heChjdXQuZnJvbSwgcG9zKSAtIG9mZiwgZlRvID0gTWF0aC5taW4oY3V0LnRvLCBuZXh0UG9zKSAtIG9mZjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1dCA9IGZGcm9tID49IGZUbyA/IG51bGwgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBUcmVlRnJhZ21lbnQoZkZyb20sIGZUbywgY3V0LnRyZWUsIGN1dC5vZmZzZXQgKyBvZmYsIChjSSA+IDAgPyAxIC8qIFN0YXJ0ICovIDogMCkgfCAobmV4dEMgPyAyIC8qIEVuZCAqLyA6IDApKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoY3V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goY3V0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRGLnRvID4gbmV4dFBvcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBuZXh0RiA9IGZJIDwgZnJhZ21lbnRzLmxlbmd0aCA/IGZyYWdtZW50c1tmSSsrXSA6IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFuZXh0QylcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIHBvcyA9IG5leHRDLnRvQTtcbiAgICAgICAgICAgIG9mZiA9IG5leHRDLnRvQSAtIG5leHRDLnRvQjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLy8gQ3JlYXRlIGEgc2V0IG9mIGZyYWdtZW50cyBmcm9tIGEgZnJlc2hseSBwYXJzZWQgdHJlZSwgb3IgdXBkYXRlXG4gICAgLy8vIGFuIGV4aXN0aW5nIHNldCBvZiBmcmFnbWVudHMgYnkgcmVwbGFjaW5nIHRoZSBvbmVzIHRoYXQgb3ZlcmxhcFxuICAgIC8vLyB3aXRoIGEgdHJlZSB3aXRoIGNvbnRlbnQgZnJvbSB0aGUgbmV3IHRyZWUuIFdoZW4gYHBhcnRpYWxgIGlzXG4gICAgLy8vIHRydWUsIHRoZSBwYXJzZSBpcyB0cmVhdGVkIGFzIGluY29tcGxldGUsIGFuZCB0aGUgdG9rZW4gYXQgaXRzXG4gICAgLy8vIGVuZCBpcyBub3QgaW5jbHVkZWQgaW4gW2BzYWZlVG9gXSgjdHJlZS5UcmVlRnJhZ21lbnQuc2FmZVRvKS5cbiAgICBzdGF0aWMgYWRkVHJlZSh0cmVlLCBmcmFnbWVudHMgPSBbXSwgcGFydGlhbCA9IGZhbHNlKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBbbmV3IFRyZWVGcmFnbWVudCgwLCB0cmVlLmxlbmd0aCwgdHJlZSwgMCwgcGFydGlhbCA/IDIgLyogRW5kICovIDogMCldO1xuICAgICAgICBmb3IgKGxldCBmIG9mIGZyYWdtZW50cylcbiAgICAgICAgICAgIGlmIChmLnRvID4gdHJlZS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goZik7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufVxuLy8gQ3JlYXRlcyBhbiBgSW5wdXRgIHRoYXQgaXMgYmFja2VkIGJ5IGEgc2luZ2xlLCBmbGF0IHN0cmluZy5cbmZ1bmN0aW9uIHN0cmluZ0lucHV0KGlucHV0KSB7IHJldHVybiBuZXcgU3RyaW5nSW5wdXQoaW5wdXQpOyB9XG5jbGFzcyBTdHJpbmdJbnB1dCB7XG4gICAgY29uc3RydWN0b3Ioc3RyaW5nLCBsZW5ndGggPSBzdHJpbmcubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICB9XG4gICAgZ2V0KHBvcykge1xuICAgICAgICByZXR1cm4gcG9zIDwgMCB8fCBwb3MgPj0gdGhpcy5sZW5ndGggPyAtMSA6IHRoaXMuc3RyaW5nLmNoYXJDb2RlQXQocG9zKTtcbiAgICB9XG4gICAgbGluZUFmdGVyKHBvcykge1xuICAgICAgICBpZiAocG9zIDwgMClcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICBsZXQgZW5kID0gdGhpcy5zdHJpbmcuaW5kZXhPZihcIlxcblwiLCBwb3MpO1xuICAgICAgICByZXR1cm4gdGhpcy5zdHJpbmcuc2xpY2UocG9zLCBlbmQgPCAwID8gdGhpcy5sZW5ndGggOiBNYXRoLm1pbihlbmQsIHRoaXMubGVuZ3RoKSk7XG4gICAgfVxuICAgIHJlYWQoZnJvbSwgdG8pIHsgcmV0dXJuIHRoaXMuc3RyaW5nLnNsaWNlKGZyb20sIE1hdGgubWluKHRoaXMubGVuZ3RoLCB0bykpOyB9XG4gICAgY2xpcChhdCkgeyByZXR1cm4gbmV3IFN0cmluZ0lucHV0KHRoaXMuc3RyaW5nLCBhdCk7IH1cbn1cblxuZXhwb3J0IHsgRGVmYXVsdEJ1ZmZlckxlbmd0aCwgTm9kZVByb3AsIE5vZGVTZXQsIE5vZGVUeXBlLCBUcmVlLCBUcmVlQnVmZmVyLCBUcmVlQ3Vyc29yLCBUcmVlRnJhZ21lbnQsIHN0cmluZ0lucHV0IH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD10cmVlLmVzLmpzLm1hcFxuIiwiaW1wb3J0IHsgRGVmYXVsdEJ1ZmZlckxlbmd0aCwgTm9kZVNldCwgTm9kZVR5cGUsIHN0cmluZ0lucHV0LCBUcmVlLCBUcmVlQnVmZmVyIH0gZnJvbSAnbGV6ZXItdHJlZSc7XG5leHBvcnQgeyBOb2RlUHJvcCwgTm9kZVNldCwgTm9kZVR5cGUsIFRyZWUsIFRyZWVDdXJzb3IgfSBmcm9tICdsZXplci10cmVlJztcblxuLy8vIEEgcGFyc2Ugc3RhY2suIFRoZXNlIGFyZSB1c2VkIGludGVybmFsbHkgYnkgdGhlIHBhcnNlciB0byB0cmFja1xuLy8vIHBhcnNpbmcgcHJvZ3Jlc3MuIFRoZXkgYWxzbyBwcm92aWRlIHNvbWUgcHJvcGVydGllcyBhbmQgbWV0aG9kc1xuLy8vIHRoYXQgZXh0ZXJuYWwgY29kZSBzdWNoIGFzIGEgdG9rZW5pemVyIGNhbiB1c2UgdG8gZ2V0IGluZm9ybWF0aW9uXG4vLy8gYWJvdXQgdGhlIHBhcnNlIHN0YXRlLlxuY2xhc3MgU3RhY2sge1xuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAvLy8gQSB0aGUgcGFyc2UgdGhhdCB0aGlzIHN0YWNrIGlzIHBhcnQgb2YgQGludGVybmFsXG4gICAgcCwgXG4gICAgLy8vIEhvbGRzIHN0YXRlLCBwb3MsIHZhbHVlIHN0YWNrIHBvcyAoMTUgYml0cyBhcnJheSBpbmRleCwgMTUgYml0c1xuICAgIC8vLyBidWZmZXIgaW5kZXgpIHRyaXBsZXRzIGZvciBhbGwgYnV0IHRoZSB0b3Agc3RhdGVcbiAgICAvLy8gQGludGVybmFsXG4gICAgc3RhY2ssIFxuICAgIC8vLyBUaGUgY3VycmVudCBwYXJzZSBzdGF0ZSBAaW50ZXJuYWxcbiAgICBzdGF0ZSwgXG4gICAgLy8gVGhlIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBuZXh0IHJlZHVjZSBzaG91bGQgdGFrZSBwbGFjZS4gVGhpc1xuICAgIC8vIGNhbiBiZSBsZXNzIHRoYW4gYHRoaXMucG9zYCB3aGVuIHNraXBwZWQgZXhwcmVzc2lvbnMgaGF2ZSBiZWVuXG4gICAgLy8gYWRkZWQgdG8gdGhlIHN0YWNrICh3aGljaCBzaG91bGQgYmUgbW92ZWQgb3V0c2lkZSBvZiB0aGUgbmV4dFxuICAgIC8vIHJlZHVjdGlvbilcbiAgICAvLy8gQGludGVybmFsXG4gICAgcmVkdWNlUG9zLCBcbiAgICAvLy8gVGhlIGlucHV0IHBvc2l0aW9uIHVwIHRvIHdoaWNoIHRoaXMgc3RhY2sgaGFzIHBhcnNlZC5cbiAgICBwb3MsIFxuICAgIC8vLyBUaGUgZHluYW1pYyBzY29yZSBvZiB0aGUgc3RhY2ssIGluY2x1ZGluZyBkeW5hbWljIHByZWNlZGVuY2VcbiAgICAvLy8gYW5kIGVycm9yLXJlY292ZXJ5IHBlbmFsdGllc1xuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzY29yZSwgXG4gICAgLy8gVGhlIG91dHB1dCBidWZmZXIuIEhvbGRzICh0eXBlLCBzdGFydCwgZW5kLCBzaXplKSBxdWFkc1xuICAgIC8vIHJlcHJlc2VudGluZyBub2RlcyBjcmVhdGVkIGJ5IHRoZSBwYXJzZXIsIHdoZXJlIGBzaXplYCBpc1xuICAgIC8vIGFtb3VudCBvZiBidWZmZXIgYXJyYXkgZW50cmllcyBjb3ZlcmVkIGJ5IHRoaXMgbm9kZS5cbiAgICAvLy8gQGludGVybmFsXG4gICAgYnVmZmVyLCBcbiAgICAvLyBUaGUgYmFzZSBvZmZzZXQgb2YgdGhlIGJ1ZmZlci4gV2hlbiBzdGFja3MgYXJlIHNwbGl0LCB0aGUgc3BsaXRcbiAgICAvLyBpbnN0YW5jZSBzaGFyZWQgdGhlIGJ1ZmZlciBoaXN0b3J5IHdpdGggaXRzIHBhcmVudCB1cCB0b1xuICAgIC8vIGBidWZmZXJCYXNlYCwgd2hpY2ggaXMgdGhlIGFic29sdXRlIG9mZnNldCAoaW5jbHVkaW5nIHRoZVxuICAgIC8vIG9mZnNldCBvZiBwcmV2aW91cyBzcGxpdHMpIGludG8gdGhlIGJ1ZmZlciBhdCB3aGljaCB0aGlzIHN0YWNrXG4gICAgLy8gc3RhcnRzIHdyaXRpbmcuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGJ1ZmZlckJhc2UsIFxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBjdXJDb250ZXh0LCBcbiAgICAvLyBBIHBhcmVudCBzdGFjayBmcm9tIHdoaWNoIHRoaXMgd2FzIHNwbGl0IG9mZiwgaWYgYW55LiBUaGlzIGlzXG4gICAgLy8gc2V0IHVwIHNvIHRoYXQgaXQgYWx3YXlzIHBvaW50cyB0byBhIHN0YWNrIHRoYXQgaGFzIHNvbWVcbiAgICAvLyBhZGRpdGlvbmFsIGJ1ZmZlciBjb250ZW50LCBuZXZlciB0byBhIHN0YWNrIHdpdGggYW4gZXF1YWxcbiAgICAvLyBgYnVmZmVyQmFzZWAuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHBhcmVudCkge1xuICAgICAgICB0aGlzLnAgPSBwO1xuICAgICAgICB0aGlzLnN0YWNrID0gc3RhY2s7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgdGhpcy5yZWR1Y2VQb3MgPSByZWR1Y2VQb3M7XG4gICAgICAgIHRoaXMucG9zID0gcG9zO1xuICAgICAgICB0aGlzLnNjb3JlID0gc2NvcmU7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB0aGlzLmJ1ZmZlckJhc2UgPSBidWZmZXJCYXNlO1xuICAgICAgICB0aGlzLmN1ckNvbnRleHQgPSBjdXJDb250ZXh0O1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gYFske3RoaXMuc3RhY2suZmlsdGVyKChfLCBpKSA9PiBpICUgMyA9PSAwKS5jb25jYXQodGhpcy5zdGF0ZSl9XUAke3RoaXMucG9zfSR7dGhpcy5zY29yZSA/IFwiIVwiICsgdGhpcy5zY29yZSA6IFwiXCJ9YDtcbiAgICB9XG4gICAgLy8gU3RhcnQgYW4gZW1wdHkgc3RhY2tcbiAgICAvLy8gQGludGVybmFsXG4gICAgc3RhdGljIHN0YXJ0KHAsIHN0YXRlLCBwb3MgPSAwKSB7XG4gICAgICAgIGxldCBjeCA9IHAucGFyc2VyLmNvbnRleHQ7XG4gICAgICAgIHJldHVybiBuZXcgU3RhY2socCwgW10sIHN0YXRlLCBwb3MsIHBvcywgMCwgW10sIDAsIGN4ID8gbmV3IFN0YWNrQ29udGV4dChjeCwgY3guc3RhcnQpIDogbnVsbCwgbnVsbCk7XG4gICAgfVxuICAgIC8vLyBUaGUgc3RhY2sncyBjdXJyZW50IFtjb250ZXh0XSgjbGV6ZXIuQ29udGV4dFRyYWNrZXIpIHZhbHVlLCBpZlxuICAgIC8vLyBhbnkuIEl0cyB0eXBlIHdpbGwgZGVwZW5kIG9uIHRoZSBjb250ZXh0IHRyYWNrZXIncyB0eXBlXG4gICAgLy8vIHBhcmFtZXRlciwgb3IgaXQgd2lsbCBiZSBgbnVsbGAgaWYgdGhlcmUgaXMgbm8gY29udGV4dFxuICAgIC8vLyB0cmFja2VyLlxuICAgIGdldCBjb250ZXh0KCkgeyByZXR1cm4gdGhpcy5jdXJDb250ZXh0ID8gdGhpcy5jdXJDb250ZXh0LmNvbnRleHQgOiBudWxsOyB9XG4gICAgLy8gUHVzaCBhIHN0YXRlIG9udG8gdGhlIHN0YWNrLCB0cmFja2luZyBpdHMgc3RhcnQgcG9zaXRpb24gYXMgd2VsbFxuICAgIC8vIGFzIHRoZSBidWZmZXIgYmFzZSBhdCB0aGF0IHBvaW50LlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBwdXNoU3RhdGUoc3RhdGUsIHN0YXJ0KSB7XG4gICAgICAgIHRoaXMuc3RhY2sucHVzaCh0aGlzLnN0YXRlLCBzdGFydCwgdGhpcy5idWZmZXJCYXNlICsgdGhpcy5idWZmZXIubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgIH1cbiAgICAvLyBBcHBseSBhIHJlZHVjZSBhY3Rpb25cbiAgICAvLy8gQGludGVybmFsXG4gICAgcmVkdWNlKGFjdGlvbikge1xuICAgICAgICBsZXQgZGVwdGggPSBhY3Rpb24gPj4gMTkgLyogUmVkdWNlRGVwdGhTaGlmdCAqLywgdHlwZSA9IGFjdGlvbiAmIDY1NTM1IC8qIFZhbHVlTWFzayAqLztcbiAgICAgICAgbGV0IHsgcGFyc2VyIH0gPSB0aGlzLnA7XG4gICAgICAgIGxldCBkUHJlYyA9IHBhcnNlci5keW5hbWljUHJlY2VkZW5jZSh0eXBlKTtcbiAgICAgICAgaWYgKGRQcmVjKVxuICAgICAgICAgICAgdGhpcy5zY29yZSArPSBkUHJlYztcbiAgICAgICAgaWYgKGRlcHRoID09IDApIHtcbiAgICAgICAgICAgIC8vIFplcm8tZGVwdGggcmVkdWN0aW9ucyBhcmUgYSBzcGVjaWFsIGNhc2XigJR0aGV5IGFkZCBzdHVmZiB0b1xuICAgICAgICAgICAgLy8gdGhlIHN0YWNrIHdpdGhvdXQgcG9wcGluZyBhbnl0aGluZyBvZmYuXG4gICAgICAgICAgICBpZiAodHlwZSA8IHBhcnNlci5taW5SZXBlYXRUZXJtKVxuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmVOb2RlKHR5cGUsIHRoaXMucmVkdWNlUG9zLCB0aGlzLnJlZHVjZVBvcywgNCwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZShwYXJzZXIuZ2V0R290byh0aGlzLnN0YXRlLCB0eXBlLCB0cnVlKSwgdGhpcy5yZWR1Y2VQb3MpO1xuICAgICAgICAgICAgdGhpcy5yZWR1Y2VDb250ZXh0KHR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZpbmQgdGhlIGJhc2UgaW5kZXggaW50byBgdGhpcy5zdGFja2AsIGNvbnRlbnQgYWZ0ZXIgd2hpY2ggd2lsbFxuICAgICAgICAvLyBiZSBkcm9wcGVkLiBOb3RlIHRoYXQgd2l0aCBgU3RheUZsYWdgIHJlZHVjdGlvbnMgd2UgbmVlZCB0b1xuICAgICAgICAvLyBjb25zdW1lIHR3byBleHRyYSBmcmFtZXMgKHRoZSBkdW1teSBwYXJlbnQgbm9kZSBmb3IgdGhlIHNraXBwZWRcbiAgICAgICAgLy8gZXhwcmVzc2lvbiBhbmQgdGhlIHN0YXRlIHRoYXQgd2UnbGwgYmUgc3RheWluZyBpbiwgd2hpY2ggc2hvdWxkXG4gICAgICAgIC8vIGJlIG1vdmVkIHRvIGB0aGlzLnN0YXRlYCkuXG4gICAgICAgIGxldCBiYXNlID0gdGhpcy5zdGFjay5sZW5ndGggLSAoKGRlcHRoIC0gMSkgKiAzKSAtIChhY3Rpb24gJiAyNjIxNDQgLyogU3RheUZsYWcgKi8gPyA2IDogMCk7XG4gICAgICAgIGxldCBzdGFydCA9IHRoaXMuc3RhY2tbYmFzZSAtIDJdO1xuICAgICAgICBsZXQgYnVmZmVyQmFzZSA9IHRoaXMuc3RhY2tbYmFzZSAtIDFdLCBjb3VudCA9IHRoaXMuYnVmZmVyQmFzZSArIHRoaXMuYnVmZmVyLmxlbmd0aCAtIGJ1ZmZlckJhc2U7XG4gICAgICAgIC8vIFN0b3JlIG5vcm1hbCB0ZXJtcyBvciBgUiAtPiBSIFJgIHJlcGVhdCByZWR1Y3Rpb25zXG4gICAgICAgIGlmICh0eXBlIDwgcGFyc2VyLm1pblJlcGVhdFRlcm0gfHwgKGFjdGlvbiAmIDEzMTA3MiAvKiBSZXBlYXRGbGFnICovKSkge1xuICAgICAgICAgICAgbGV0IHBvcyA9IHBhcnNlci5zdGF0ZUZsYWcodGhpcy5zdGF0ZSwgMSAvKiBTa2lwcGVkICovKSA/IHRoaXMucG9zIDogdGhpcy5yZWR1Y2VQb3M7XG4gICAgICAgICAgICB0aGlzLnN0b3JlTm9kZSh0eXBlLCBzdGFydCwgcG9zLCBjb3VudCArIDQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhY3Rpb24gJiAyNjIxNDQgLyogU3RheUZsYWcgKi8pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLnN0YWNrW2Jhc2VdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IGJhc2VTdGF0ZUlEID0gdGhpcy5zdGFja1tiYXNlIC0gM107XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gcGFyc2VyLmdldEdvdG8oYmFzZVN0YXRlSUQsIHR5cGUsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlICh0aGlzLnN0YWNrLmxlbmd0aCA+IGJhc2UpXG4gICAgICAgICAgICB0aGlzLnN0YWNrLnBvcCgpO1xuICAgICAgICB0aGlzLnJlZHVjZUNvbnRleHQodHlwZSk7XG4gICAgfVxuICAgIC8vIFNoaWZ0IGEgdmFsdWUgaW50byB0aGUgYnVmZmVyXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHN0b3JlTm9kZSh0ZXJtLCBzdGFydCwgZW5kLCBzaXplID0gNCwgaXNSZWR1Y2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAodGVybSA9PSAwIC8qIEVyciAqLykgeyAvLyBUcnkgdG8gb21pdC9tZXJnZSBhZGphY2VudCBlcnJvciBub2Rlc1xuICAgICAgICAgICAgbGV0IGN1ciA9IHRoaXMsIHRvcCA9IHRoaXMuYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgICAgIGlmICh0b3AgPT0gMCAmJiBjdXIucGFyZW50KSB7XG4gICAgICAgICAgICAgICAgdG9wID0gY3VyLmJ1ZmZlckJhc2UgLSBjdXIucGFyZW50LmJ1ZmZlckJhc2U7XG4gICAgICAgICAgICAgICAgY3VyID0gY3VyLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b3AgPiAwICYmIGN1ci5idWZmZXJbdG9wIC0gNF0gPT0gMCAvKiBFcnIgKi8gJiYgY3VyLmJ1ZmZlclt0b3AgLSAxXSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0ID09IGVuZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmIChjdXIuYnVmZmVyW3RvcCAtIDJdID49IHN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIGN1ci5idWZmZXJbdG9wIC0gMl0gPSBlbmQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc1JlZHVjZSB8fCB0aGlzLnBvcyA9PSBlbmQpIHsgLy8gU2ltcGxlIGNhc2UsIGp1c3QgYXBwZW5kXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlci5wdXNoKHRlcm0sIHN0YXJ0LCBlbmQsIHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgeyAvLyBUaGVyZSBtYXkgYmUgc2tpcHBlZCBub2RlcyB0aGF0IGhhdmUgdG8gYmUgbW92ZWQgZm9yd2FyZFxuICAgICAgICAgICAgbGV0IGluZGV4ID0gdGhpcy5idWZmZXIubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gMCAmJiB0aGlzLmJ1ZmZlcltpbmRleCAtIDRdICE9IDAgLyogRXJyICovKVxuICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA+IDAgJiYgdGhpcy5idWZmZXJbaW5kZXggLSAyXSA+IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNb3ZlIHRoaXMgcmVjb3JkIGZvcndhcmRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXhdID0gdGhpcy5idWZmZXJbaW5kZXggLSA0XTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXggKyAxXSA9IHRoaXMuYnVmZmVyW2luZGV4IC0gM107XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4ICsgMl0gPSB0aGlzLmJ1ZmZlcltpbmRleCAtIDJdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleCArIDNdID0gdGhpcy5idWZmZXJbaW5kZXggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggLT0gNDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNpemUgPiA0KVxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZSAtPSA0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4XSA9IHRlcm07XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleCArIDFdID0gc3RhcnQ7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleCArIDJdID0gZW5kO1xuICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXggKyAzXSA9IHNpemU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQXBwbHkgYSBzaGlmdCBhY3Rpb25cbiAgICAvLy8gQGludGVybmFsXG4gICAgc2hpZnQoYWN0aW9uLCBuZXh0LCBuZXh0RW5kKSB7XG4gICAgICAgIGlmIChhY3Rpb24gJiAxMzEwNzIgLyogR290b0ZsYWcgKi8pIHtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlKGFjdGlvbiAmIDY1NTM1IC8qIFZhbHVlTWFzayAqLywgdGhpcy5wb3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKChhY3Rpb24gJiAyNjIxNDQgLyogU3RheUZsYWcgKi8pID09IDApIHsgLy8gUmVndWxhciBzaGlmdFxuICAgICAgICAgICAgbGV0IHN0YXJ0ID0gdGhpcy5wb3MsIG5leHRTdGF0ZSA9IGFjdGlvbiwgeyBwYXJzZXIgfSA9IHRoaXMucDtcbiAgICAgICAgICAgIGlmIChuZXh0RW5kID4gdGhpcy5wb3MgfHwgbmV4dCA8PSBwYXJzZXIubWF4Tm9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMucG9zID0gbmV4dEVuZDtcbiAgICAgICAgICAgICAgICBpZiAoIXBhcnNlci5zdGF0ZUZsYWcobmV4dFN0YXRlLCAxIC8qIFNraXBwZWQgKi8pKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZHVjZVBvcyA9IG5leHRFbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZShuZXh0U3RhdGUsIHN0YXJ0KTtcbiAgICAgICAgICAgIGlmIChuZXh0IDw9IHBhcnNlci5tYXhOb2RlKVxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyLnB1c2gobmV4dCwgc3RhcnQsIG5leHRFbmQsIDQpO1xuICAgICAgICAgICAgdGhpcy5zaGlmdENvbnRleHQobmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7IC8vIFNoaWZ0LWFuZC1zdGF5LCB3aGljaCBtZWFucyB0aGlzIGlzIGEgc2tpcHBlZCB0b2tlblxuICAgICAgICAgICAgaWYgKG5leHQgPD0gdGhpcy5wLnBhcnNlci5tYXhOb2RlKVxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyLnB1c2gobmV4dCwgdGhpcy5wb3MsIG5leHRFbmQsIDQpO1xuICAgICAgICAgICAgdGhpcy5wb3MgPSBuZXh0RW5kO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEFwcGx5IGFuIGFjdGlvblxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBhcHBseShhY3Rpb24sIG5leHQsIG5leHRFbmQpIHtcbiAgICAgICAgaWYgKGFjdGlvbiAmIDY1NTM2IC8qIFJlZHVjZUZsYWcgKi8pXG4gICAgICAgICAgICB0aGlzLnJlZHVjZShhY3Rpb24pO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLnNoaWZ0KGFjdGlvbiwgbmV4dCwgbmV4dEVuZCk7XG4gICAgfVxuICAgIC8vIEFkZCBhIHByZWJ1aWx0IG5vZGUgaW50byB0aGUgYnVmZmVyLiBUaGlzIG1heSBiZSBhIHJldXNlZCBub2RlIG9yXG4gICAgLy8gdGhlIHJlc3VsdCBvZiBydW5uaW5nIGEgbmVzdGVkIHBhcnNlci5cbiAgICAvLy8gQGludGVybmFsXG4gICAgdXNlTm9kZSh2YWx1ZSwgbmV4dCkge1xuICAgICAgICBsZXQgaW5kZXggPSB0aGlzLnAucmV1c2VkLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5wLnJldXNlZFtpbmRleF0gIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMucC5yZXVzZWQucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdGFydCA9IHRoaXMucG9zO1xuICAgICAgICB0aGlzLnJlZHVjZVBvcyA9IHRoaXMucG9zID0gc3RhcnQgKyB2YWx1ZS5sZW5ndGg7XG4gICAgICAgIHRoaXMucHVzaFN0YXRlKG5leHQsIHN0YXJ0KTtcbiAgICAgICAgdGhpcy5idWZmZXIucHVzaChpbmRleCwgc3RhcnQsIHRoaXMucmVkdWNlUG9zLCAtMSAvKiBzaXplIDwgMCBtZWFucyB0aGlzIGlzIGEgcmV1c2VkIHZhbHVlICovKTtcbiAgICAgICAgaWYgKHRoaXMuY3VyQ29udGV4dClcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29udGV4dCh0aGlzLmN1ckNvbnRleHQudHJhY2tlci5yZXVzZSh0aGlzLmN1ckNvbnRleHQuY29udGV4dCwgdmFsdWUsIHRoaXMucC5pbnB1dCwgdGhpcykpO1xuICAgIH1cbiAgICAvLyBTcGxpdCB0aGUgc3RhY2suIER1ZSB0byB0aGUgYnVmZmVyIHNoYXJpbmcgYW5kIHRoZSBmYWN0XG4gICAgLy8gdGhhdCBgdGhpcy5zdGFja2AgdGVuZHMgdG8gc3RheSBxdWl0ZSBzaGFsbG93LCB0aGlzIGlzbid0IHZlcnlcbiAgICAvLyBleHBlbnNpdmUuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHNwbGl0KCkge1xuICAgICAgICBsZXQgcGFyZW50ID0gdGhpcztcbiAgICAgICAgbGV0IG9mZiA9IHBhcmVudC5idWZmZXIubGVuZ3RoO1xuICAgICAgICAvLyBCZWNhdXNlIHRoZSB0b3Agb2YgdGhlIGJ1ZmZlciAoYWZ0ZXIgdGhpcy5wb3MpIG1heSBiZSBtdXRhdGVkXG4gICAgICAgIC8vIHRvIHJlb3JkZXIgcmVkdWN0aW9ucyBhbmQgc2tpcHBlZCB0b2tlbnMsIGFuZCBzaGFyZWQgYnVmZmVyc1xuICAgICAgICAvLyBzaG91bGQgYmUgaW1tdXRhYmxlLCB0aGlzIGNvcGllcyBhbnkgb3V0c3RhbmRpbmcgc2tpcHBlZCB0b2tlbnNcbiAgICAgICAgLy8gdG8gdGhlIG5ldyBidWZmZXIsIGFuZCBwdXRzIHRoZSBiYXNlIHBvaW50ZXIgYmVmb3JlIHRoZW0uXG4gICAgICAgIHdoaWxlIChvZmYgPiAwICYmIHBhcmVudC5idWZmZXJbb2ZmIC0gMl0gPiBwYXJlbnQucmVkdWNlUG9zKVxuICAgICAgICAgICAgb2ZmIC09IDQ7XG4gICAgICAgIGxldCBidWZmZXIgPSBwYXJlbnQuYnVmZmVyLnNsaWNlKG9mZiksIGJhc2UgPSBwYXJlbnQuYnVmZmVyQmFzZSArIG9mZjtcbiAgICAgICAgLy8gTWFrZSBzdXJlIHBhcmVudCBwb2ludHMgdG8gYW4gYWN0dWFsIHBhcmVudCB3aXRoIGNvbnRlbnQsIGlmIHRoZXJlIGlzIHN1Y2ggYSBwYXJlbnQuXG4gICAgICAgIHdoaWxlIChwYXJlbnQgJiYgYmFzZSA9PSBwYXJlbnQuYnVmZmVyQmFzZSlcbiAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICAgIHJldHVybiBuZXcgU3RhY2sodGhpcy5wLCB0aGlzLnN0YWNrLnNsaWNlKCksIHRoaXMuc3RhdGUsIHRoaXMucmVkdWNlUG9zLCB0aGlzLnBvcywgdGhpcy5zY29yZSwgYnVmZmVyLCBiYXNlLCB0aGlzLmN1ckNvbnRleHQsIHBhcmVudCk7XG4gICAgfVxuICAgIC8vIFRyeSB0byByZWNvdmVyIGZyb20gYW4gZXJyb3IgYnkgJ2RlbGV0aW5nJyAoaWdub3JpbmcpIG9uZSB0b2tlbi5cbiAgICAvLy8gQGludGVybmFsXG4gICAgcmVjb3ZlckJ5RGVsZXRlKG5leHQsIG5leHRFbmQpIHtcbiAgICAgICAgbGV0IGlzTm9kZSA9IG5leHQgPD0gdGhpcy5wLnBhcnNlci5tYXhOb2RlO1xuICAgICAgICBpZiAoaXNOb2RlKVxuICAgICAgICAgICAgdGhpcy5zdG9yZU5vZGUobmV4dCwgdGhpcy5wb3MsIG5leHRFbmQpO1xuICAgICAgICB0aGlzLnN0b3JlTm9kZSgwIC8qIEVyciAqLywgdGhpcy5wb3MsIG5leHRFbmQsIGlzTm9kZSA/IDggOiA0KTtcbiAgICAgICAgdGhpcy5wb3MgPSB0aGlzLnJlZHVjZVBvcyA9IG5leHRFbmQ7XG4gICAgICAgIHRoaXMuc2NvcmUgLT0gMjAwIC8qIFRva2VuICovO1xuICAgIH1cbiAgICAvLy8gQ2hlY2sgaWYgdGhlIGdpdmVuIHRlcm0gd291bGQgYmUgYWJsZSB0byBiZSBzaGlmdGVkIChvcHRpb25hbGx5XG4gICAgLy8vIGFmdGVyIHNvbWUgcmVkdWN0aW9ucykgb24gdGhpcyBzdGFjay4gVGhpcyBjYW4gYmUgdXNlZnVsIGZvclxuICAgIC8vLyBleHRlcm5hbCB0b2tlbml6ZXJzIHRoYXQgd2FudCB0byBtYWtlIHN1cmUgdGhleSBvbmx5IHByb3ZpZGUgYVxuICAgIC8vLyBnaXZlbiB0b2tlbiB3aGVuIGl0IGFwcGxpZXMuXG4gICAgY2FuU2hpZnQodGVybSkge1xuICAgICAgICBmb3IgKGxldCBzaW0gPSBuZXcgU2ltdWxhdGVkU3RhY2sodGhpcyk7Oykge1xuICAgICAgICAgICAgbGV0IGFjdGlvbiA9IHRoaXMucC5wYXJzZXIuc3RhdGVTbG90KHNpbS50b3AsIDQgLyogRGVmYXVsdFJlZHVjZSAqLykgfHwgdGhpcy5wLnBhcnNlci5oYXNBY3Rpb24oc2ltLnRvcCwgdGVybSk7XG4gICAgICAgICAgICBpZiAoKGFjdGlvbiAmIDY1NTM2IC8qIFJlZHVjZUZsYWcgKi8pID09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBpZiAoYWN0aW9uID09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgc2ltLnJlZHVjZShhY3Rpb24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBGaW5kIHRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgcnVsZSB0aGF0IGlzIGN1cnJlbnRseSBiZWluZyBwYXJzZWQuXG4gICAgZ2V0IHJ1bGVTdGFydCgpIHtcbiAgICAgICAgZm9yIChsZXQgc3RhdGUgPSB0aGlzLnN0YXRlLCBiYXNlID0gdGhpcy5zdGFjay5sZW5ndGg7Oykge1xuICAgICAgICAgICAgbGV0IGZvcmNlID0gdGhpcy5wLnBhcnNlci5zdGF0ZVNsb3Qoc3RhdGUsIDUgLyogRm9yY2VkUmVkdWNlICovKTtcbiAgICAgICAgICAgIGlmICghKGZvcmNlICYgNjU1MzYgLyogUmVkdWNlRmxhZyAqLykpXG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICBiYXNlIC09IDMgKiAoZm9yY2UgPj4gMTkgLyogUmVkdWNlRGVwdGhTaGlmdCAqLyk7XG4gICAgICAgICAgICBpZiAoKGZvcmNlICYgNjU1MzUgLyogVmFsdWVNYXNrICovKSA8IHRoaXMucC5wYXJzZXIubWluUmVwZWF0VGVybSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdGFja1tiYXNlICsgMV07XG4gICAgICAgICAgICBzdGF0ZSA9IHRoaXMuc3RhY2tbYmFzZV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIEZpbmQgdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIGFuIGluc3RhbmNlIG9mIGFueSBvZiB0aGUgZ2l2ZW4gdGVybVxuICAgIC8vLyB0eXBlcywgb3IgcmV0dXJuIGBudWxsYCB3aGVuIG5vbmUgb2YgdGhlbSBhcmUgZm91bmQuXG4gICAgLy8vXG4gICAgLy8vICoqTm90ZToqKiB0aGlzIGlzIG9ubHkgcmVsaWFibGUgd2hlbiB0aGVyZSBpcyBhdCBsZWFzdCBzb21lXG4gICAgLy8vIHN0YXRlIHRoYXQgdW5hbWJpZ3VvdXNseSBtYXRjaGVzIHRoZSBnaXZlbiBydWxlIG9uIHRoZSBzdGFjay5cbiAgICAvLy8gSS5lLiBpZiB5b3UgaGF2ZSBhIGdyYW1tYXIgbGlrZSB0aGlzLCB3aGVyZSB0aGUgZGlmZmVyZW5jZVxuICAgIC8vLyBiZXR3ZWVuIGBhYCBhbmQgYGJgIGlzIG9ubHkgYXBwYXJlbnQgYXQgdGhlIHRoaXJkIHRva2VuOlxuICAgIC8vL1xuICAgIC8vLyAgICAgYSB7IGIgfCBjIH1cbiAgICAvLy8gICAgIGIgeyBcInhcIiBcInlcIiBcInhcIiB9XG4gICAgLy8vICAgICBjIHsgXCJ4XCIgXCJ5XCIgXCJ6XCIgfVxuICAgIC8vL1xuICAgIC8vLyBUaGVuIGEgcGFyc2Ugc3RhdGUgYWZ0ZXIgYFwieFwiYCB3aWxsIG5vdCByZWxpYWJseSB0ZWxsIHlvdSB0aGF0XG4gICAgLy8vIGBiYCBpcyBvbiB0aGUgc3RhY2suIFlvdSBfY2FuXyBwYXNzIGBbYiwgY11gIHRvIHJlbGlhYmx5IGNoZWNrXG4gICAgLy8vIGZvciBlaXRoZXIgb2YgdGhvc2UgdHdvIHJ1bGVzIChhc3N1bWluZyB0aGF0IGBhYCBpc24ndCBwYXJ0IG9mXG4gICAgLy8vIHNvbWUgcnVsZSB0aGF0IGluY2x1ZGVzIG90aGVyIHRoaW5ncyBzdGFydGluZyB3aXRoIGBcInhcImApLlxuICAgIC8vL1xuICAgIC8vLyBXaGVuIGBiZWZvcmVgIGlzIGdpdmVuLCB0aGlzIGtlZXBzIHNjYW5uaW5nIHVwIHRoZSBzdGFjayB1bnRpbFxuICAgIC8vLyBpdCBmaW5kcyBhIG1hdGNoIHRoYXQgc3RhcnRzIGJlZm9yZSB0aGF0IHBvc2l0aW9uLlxuICAgIC8vL1xuICAgIC8vLyBOb3RlIHRoYXQgeW91IGhhdmUgdG8gYmUgY2FyZWZ1bCB3aGVuIHVzaW5nIHRoaXMgaW4gdG9rZW5pemVycyxcbiAgICAvLy8gc2luY2UgaXQncyByZWxhdGl2ZWx5IGVhc3kgdG8gaW50cm9kdWNlIGRhdGEgZGVwZW5kZW5jaWVzIHRoYXRcbiAgICAvLy8gYnJlYWsgaW5jcmVtZW50YWwgcGFyc2luZyBieSB1c2luZyB0aGlzIG1ldGhvZC5cbiAgICBzdGFydE9mKHR5cGVzLCBiZWZvcmUpIHtcbiAgICAgICAgbGV0IHN0YXRlID0gdGhpcy5zdGF0ZSwgZnJhbWUgPSB0aGlzLnN0YWNrLmxlbmd0aCwgeyBwYXJzZXIgfSA9IHRoaXMucDtcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgbGV0IGZvcmNlID0gcGFyc2VyLnN0YXRlU2xvdChzdGF0ZSwgNSAvKiBGb3JjZWRSZWR1Y2UgKi8pO1xuICAgICAgICAgICAgbGV0IGRlcHRoID0gZm9yY2UgPj4gMTkgLyogUmVkdWNlRGVwdGhTaGlmdCAqLywgdGVybSA9IGZvcmNlICYgNjU1MzUgLyogVmFsdWVNYXNrICovO1xuICAgICAgICAgICAgaWYgKHR5cGVzLmluZGV4T2YodGVybSkgPiAtMSkge1xuICAgICAgICAgICAgICAgIGxldCBiYXNlID0gZnJhbWUgLSAoMyAqIChmb3JjZSA+PiAxOSAvKiBSZWR1Y2VEZXB0aFNoaWZ0ICovKSksIHBvcyA9IHRoaXMuc3RhY2tbYmFzZSArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChiZWZvcmUgPT0gbnVsbCB8fCBiZWZvcmUgPiBwb3MpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwb3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZnJhbWUgPT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgZnJhbWUgLT0gMztcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHRoaXMuc3RhY2tbZnJhbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZnJhbWUgLT0gMyAqIChkZXB0aCAtIDEpO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gcGFyc2VyLmdldEdvdG8odGhpcy5zdGFja1tmcmFtZSAtIDNdLCB0ZXJtLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBBcHBseSB1cCB0byBSZWNvdmVyLk1heE5leHQgcmVjb3ZlcnkgYWN0aW9ucyB0aGF0IGNvbmNlcHR1YWxseVxuICAgIC8vIGluc2VydHMgc29tZSBtaXNzaW5nIHRva2VuIG9yIHJ1bGUuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHJlY292ZXJCeUluc2VydChuZXh0KSB7XG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA+PSAzMDAgLyogTWF4SW5zZXJ0U3RhY2tEZXB0aCAqLylcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgbGV0IG5leHRTdGF0ZXMgPSB0aGlzLnAucGFyc2VyLm5leHRTdGF0ZXModGhpcy5zdGF0ZSk7XG4gICAgICAgIGlmIChuZXh0U3RhdGVzLmxlbmd0aCA+IDQgLyogTWF4TmV4dCAqLyA8PCAxIHx8IHRoaXMuc3RhY2subGVuZ3RoID49IDEyMCAvKiBEYW1wZW5JbnNlcnRTdGFja0RlcHRoICovKSB7XG4gICAgICAgICAgICBsZXQgYmVzdCA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHM7IGkgPCBuZXh0U3RhdGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICAgICAgaWYgKChzID0gbmV4dFN0YXRlc1tpICsgMV0pICE9IHRoaXMuc3RhdGUgJiYgdGhpcy5wLnBhcnNlci5oYXNBY3Rpb24ocywgbmV4dCkpXG4gICAgICAgICAgICAgICAgICAgIGJlc3QucHVzaChuZXh0U3RhdGVzW2ldLCBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA8IDEyMCAvKiBEYW1wZW5JbnNlcnRTdGFja0RlcHRoICovKVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBiZXN0Lmxlbmd0aCA8IDQgLyogTWF4TmV4dCAqLyA8PCAxICYmIGkgPCBuZXh0U3RhdGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzID0gbmV4dFN0YXRlc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGlmICghYmVzdC5zb21lKCh2LCBpKSA9PiAoaSAmIDEpICYmIHYgPT0gcykpXG4gICAgICAgICAgICAgICAgICAgICAgICBiZXN0LnB1c2gobmV4dFN0YXRlc1tpXSwgcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dFN0YXRlcyA9IGJlc3Q7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5leHRTdGF0ZXMubGVuZ3RoICYmIHJlc3VsdC5sZW5ndGggPCA0IC8qIE1heE5leHQgKi87IGkgKz0gMikge1xuICAgICAgICAgICAgbGV0IHMgPSBuZXh0U3RhdGVzW2kgKyAxXTtcbiAgICAgICAgICAgIGlmIChzID09IHRoaXMuc3RhdGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBsZXQgc3RhY2sgPSB0aGlzLnNwbGl0KCk7XG4gICAgICAgICAgICBzdGFjay5zdG9yZU5vZGUoMCAvKiBFcnIgKi8sIHN0YWNrLnBvcywgc3RhY2sucG9zLCA0LCB0cnVlKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2hTdGF0ZShzLCB0aGlzLnBvcyk7XG4gICAgICAgICAgICBzdGFjay5zaGlmdENvbnRleHQobmV4dFN0YXRlc1tpXSk7XG4gICAgICAgICAgICBzdGFjay5zY29yZSAtPSAyMDAgLyogVG9rZW4gKi87XG4gICAgICAgICAgICByZXN1bHQucHVzaChzdGFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLy8gRm9yY2UgYSByZWR1Y2UsIGlmIHBvc3NpYmxlLiBSZXR1cm4gZmFsc2UgaWYgdGhhdCBjYW4ndFxuICAgIC8vIGJlIGRvbmUuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGZvcmNlUmVkdWNlKCkge1xuICAgICAgICBsZXQgcmVkdWNlID0gdGhpcy5wLnBhcnNlci5zdGF0ZVNsb3QodGhpcy5zdGF0ZSwgNSAvKiBGb3JjZWRSZWR1Y2UgKi8pO1xuICAgICAgICBpZiAoKHJlZHVjZSAmIDY1NTM2IC8qIFJlZHVjZUZsYWcgKi8pID09IDApXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy5wLnBhcnNlci52YWxpZEFjdGlvbih0aGlzLnN0YXRlLCByZWR1Y2UpKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3JlTm9kZSgwIC8qIEVyciAqLywgdGhpcy5yZWR1Y2VQb3MsIHRoaXMucmVkdWNlUG9zLCA0LCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2NvcmUgLT0gMTAwIC8qIFJlZHVjZSAqLztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlZHVjZShyZWR1Y2UpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGZvcmNlQWxsKCkge1xuICAgICAgICB3aGlsZSAoIXRoaXMucC5wYXJzZXIuc3RhdGVGbGFnKHRoaXMuc3RhdGUsIDIgLyogQWNjZXB0aW5nICovKSAmJiB0aGlzLmZvcmNlUmVkdWNlKCkpIHsgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLy8vIENoZWNrIHdoZXRoZXIgdGhpcyBzdGF0ZSBoYXMgbm8gZnVydGhlciBhY3Rpb25zIChhc3N1bWVkIHRvIGJlIGEgZGlyZWN0IGRlc2NlbmRhbnQgb2YgdGhlXG4gICAgLy8vIHRvcCBzdGF0ZSwgc2luY2UgYW55IG90aGVyIHN0YXRlcyBtdXN0IGJlIGFibGUgdG8gY29udGludWVcbiAgICAvLy8gc29tZWhvdykuIEBpbnRlcm5hbFxuICAgIGdldCBkZWFkRW5kKCkge1xuICAgICAgICBpZiAodGhpcy5zdGFjay5sZW5ndGggIT0gMylcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgbGV0IHsgcGFyc2VyIH0gPSB0aGlzLnA7XG4gICAgICAgIHJldHVybiBwYXJzZXIuZGF0YVtwYXJzZXIuc3RhdGVTbG90KHRoaXMuc3RhdGUsIDEgLyogQWN0aW9ucyAqLyldID09IDY1NTM1IC8qIEVuZCAqLyAmJlxuICAgICAgICAgICAgIXBhcnNlci5zdGF0ZVNsb3QodGhpcy5zdGF0ZSwgNCAvKiBEZWZhdWx0UmVkdWNlICovKTtcbiAgICB9XG4gICAgLy8vIFJlc3RhcnQgdGhlIHN0YWNrIChwdXQgaXQgYmFjayBpbiBpdHMgc3RhcnQgc3RhdGUpLiBPbmx5IHNhZmVcbiAgICAvLy8gd2hlbiB0aGlzLnN0YWNrLmxlbmd0aCA9PSAzIChzdGF0ZSBpcyBkaXJlY3RseSBiZWxvdyB0aGUgdG9wXG4gICAgLy8vIHN0YXRlKS4gQGludGVybmFsXG4gICAgcmVzdGFydCgpIHtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuc3RhY2tbMF07XG4gICAgICAgIHRoaXMuc3RhY2subGVuZ3RoID0gMDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHNhbWVTdGF0ZShvdGhlcikge1xuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPSBvdGhlci5zdGF0ZSB8fCB0aGlzLnN0YWNrLmxlbmd0aCAhPSBvdGhlci5zdGFjay5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zdGFjay5sZW5ndGg7IGkgKz0gMylcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YWNrW2ldICE9IG90aGVyLnN0YWNrW2ldKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vLyBHZXQgdGhlIHBhcnNlciB1c2VkIGJ5IHRoaXMgc3RhY2suXG4gICAgZ2V0IHBhcnNlcigpIHsgcmV0dXJuIHRoaXMucC5wYXJzZXI7IH1cbiAgICAvLy8gVGVzdCB3aGV0aGVyIGEgZ2l2ZW4gZGlhbGVjdCAoYnkgbnVtZXJpYyBJRCwgYXMgZXhwb3J0ZWQgZnJvbVxuICAgIC8vLyB0aGUgdGVybXMgZmlsZSkgaXMgZW5hYmxlZC5cbiAgICBkaWFsZWN0RW5hYmxlZChkaWFsZWN0SUQpIHsgcmV0dXJuIHRoaXMucC5wYXJzZXIuZGlhbGVjdC5mbGFnc1tkaWFsZWN0SURdOyB9XG4gICAgc2hpZnRDb250ZXh0KHRlcm0pIHtcbiAgICAgICAgaWYgKHRoaXMuY3VyQ29udGV4dClcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29udGV4dCh0aGlzLmN1ckNvbnRleHQudHJhY2tlci5zaGlmdCh0aGlzLmN1ckNvbnRleHQuY29udGV4dCwgdGVybSwgdGhpcy5wLmlucHV0LCB0aGlzKSk7XG4gICAgfVxuICAgIHJlZHVjZUNvbnRleHQodGVybSkge1xuICAgICAgICBpZiAodGhpcy5jdXJDb250ZXh0KVxuICAgICAgICAgICAgdGhpcy51cGRhdGVDb250ZXh0KHRoaXMuY3VyQ29udGV4dC50cmFja2VyLnJlZHVjZSh0aGlzLmN1ckNvbnRleHQuY29udGV4dCwgdGVybSwgdGhpcy5wLmlucHV0LCB0aGlzKSk7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBlbWl0Q29udGV4dCgpIHtcbiAgICAgICAgbGV0IGN4ID0gdGhpcy5jdXJDb250ZXh0O1xuICAgICAgICBpZiAoIWN4LnRyYWNrZXIuc3RyaWN0KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBsZXQgbGFzdCA9IHRoaXMuYnVmZmVyLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChsYXN0IDwgMCB8fCB0aGlzLmJ1ZmZlcltsYXN0XSAhPSAtMilcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyLnB1c2goY3guaGFzaCwgdGhpcy5yZWR1Y2VQb3MsIHRoaXMucmVkdWNlUG9zLCAtMik7XG4gICAgfVxuICAgIHVwZGF0ZUNvbnRleHQoY29udGV4dCkge1xuICAgICAgICBpZiAoY29udGV4dCAhPSB0aGlzLmN1ckNvbnRleHQuY29udGV4dCkge1xuICAgICAgICAgICAgbGV0IG5ld0N4ID0gbmV3IFN0YWNrQ29udGV4dCh0aGlzLmN1ckNvbnRleHQudHJhY2tlciwgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAobmV3Q3guaGFzaCAhPSB0aGlzLmN1ckNvbnRleHQuaGFzaClcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDb250ZXh0KCk7XG4gICAgICAgICAgICB0aGlzLmN1ckNvbnRleHQgPSBuZXdDeDtcbiAgICAgICAgfVxuICAgIH1cbn1cbmNsYXNzIFN0YWNrQ29udGV4dCB7XG4gICAgY29uc3RydWN0b3IodHJhY2tlciwgY29udGV4dCkge1xuICAgICAgICB0aGlzLnRyYWNrZXIgPSB0cmFja2VyO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLmhhc2ggPSB0cmFja2VyLmhhc2goY29udGV4dCk7XG4gICAgfVxufVxudmFyIFJlY292ZXI7XG4oZnVuY3Rpb24gKFJlY292ZXIpIHtcbiAgICBSZWNvdmVyW1JlY292ZXJbXCJUb2tlblwiXSA9IDIwMF0gPSBcIlRva2VuXCI7XG4gICAgUmVjb3ZlcltSZWNvdmVyW1wiUmVkdWNlXCJdID0gMTAwXSA9IFwiUmVkdWNlXCI7XG4gICAgUmVjb3ZlcltSZWNvdmVyW1wiTWF4TmV4dFwiXSA9IDRdID0gXCJNYXhOZXh0XCI7XG4gICAgUmVjb3ZlcltSZWNvdmVyW1wiTWF4SW5zZXJ0U3RhY2tEZXB0aFwiXSA9IDMwMF0gPSBcIk1heEluc2VydFN0YWNrRGVwdGhcIjtcbiAgICBSZWNvdmVyW1JlY292ZXJbXCJEYW1wZW5JbnNlcnRTdGFja0RlcHRoXCJdID0gMTIwXSA9IFwiRGFtcGVuSW5zZXJ0U3RhY2tEZXB0aFwiO1xufSkoUmVjb3ZlciB8fCAoUmVjb3ZlciA9IHt9KSk7XG4vLyBVc2VkIHRvIGNoZWFwbHkgcnVuIHNvbWUgcmVkdWN0aW9ucyB0byBzY2FuIGFoZWFkIHdpdGhvdXQgbXV0YXRpbmdcbi8vIGFuIGVudGlyZSBzdGFja1xuY2xhc3MgU2ltdWxhdGVkU3RhY2sge1xuICAgIGNvbnN0cnVjdG9yKHN0YWNrKSB7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBzdGFjaztcbiAgICAgICAgdGhpcy50b3AgPSBzdGFjay5zdGF0ZTtcbiAgICAgICAgdGhpcy5yZXN0ID0gc3RhY2suc3RhY2s7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gdGhpcy5yZXN0Lmxlbmd0aDtcbiAgICB9XG4gICAgcmVkdWNlKGFjdGlvbikge1xuICAgICAgICBsZXQgdGVybSA9IGFjdGlvbiAmIDY1NTM1IC8qIFZhbHVlTWFzayAqLywgZGVwdGggPSBhY3Rpb24gPj4gMTkgLyogUmVkdWNlRGVwdGhTaGlmdCAqLztcbiAgICAgICAgaWYgKGRlcHRoID09IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3QgPT0gdGhpcy5zdGFjay5zdGFjaylcbiAgICAgICAgICAgICAgICB0aGlzLnJlc3QgPSB0aGlzLnJlc3Quc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMucmVzdC5wdXNoKHRoaXMudG9wLCAwLCAwKTtcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0ICs9IDM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm9mZnNldCAtPSAoZGVwdGggLSAxKSAqIDM7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGdvdG8gPSB0aGlzLnN0YWNrLnAucGFyc2VyLmdldEdvdG8odGhpcy5yZXN0W3RoaXMub2Zmc2V0IC0gM10sIHRlcm0sIHRydWUpO1xuICAgICAgICB0aGlzLnRvcCA9IGdvdG87XG4gICAgfVxufVxuLy8gVGhpcyBpcyBnaXZlbiB0byBgVHJlZS5idWlsZGAgdG8gYnVpbGQgYSBidWZmZXIsIGFuZCBlbmNhcHN1bGF0ZXNcbi8vIHRoZSBwYXJlbnQtc3RhY2std2Fsa2luZyBuZWNlc3NhcnkgdG8gcmVhZCB0aGUgbm9kZXMuXG5jbGFzcyBTdGFja0J1ZmZlckN1cnNvciB7XG4gICAgY29uc3RydWN0b3Ioc3RhY2ssIHBvcywgaW5kZXgpIHtcbiAgICAgICAgdGhpcy5zdGFjayA9IHN0YWNrO1xuICAgICAgICB0aGlzLnBvcyA9IHBvcztcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IHN0YWNrLmJ1ZmZlcjtcbiAgICAgICAgaWYgKHRoaXMuaW5kZXggPT0gMClcbiAgICAgICAgICAgIHRoaXMubWF5YmVOZXh0KCk7XG4gICAgfVxuICAgIHN0YXRpYyBjcmVhdGUoc3RhY2spIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFja0J1ZmZlckN1cnNvcihzdGFjaywgc3RhY2suYnVmZmVyQmFzZSArIHN0YWNrLmJ1ZmZlci5sZW5ndGgsIHN0YWNrLmJ1ZmZlci5sZW5ndGgpO1xuICAgIH1cbiAgICBtYXliZU5leHQoKSB7XG4gICAgICAgIGxldCBuZXh0ID0gdGhpcy5zdGFjay5wYXJlbnQ7XG4gICAgICAgIGlmIChuZXh0ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggPSB0aGlzLnN0YWNrLmJ1ZmZlckJhc2UgLSBuZXh0LmJ1ZmZlckJhc2U7XG4gICAgICAgICAgICB0aGlzLnN0YWNrID0gbmV4dDtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gbmV4dC5idWZmZXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IGlkKCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDRdOyB9XG4gICAgZ2V0IHN0YXJ0KCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDNdOyB9XG4gICAgZ2V0IGVuZCgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSAyXTsgfVxuICAgIGdldCBzaXplKCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDFdOyB9XG4gICAgbmV4dCgpIHtcbiAgICAgICAgdGhpcy5pbmRleCAtPSA0O1xuICAgICAgICB0aGlzLnBvcyAtPSA0O1xuICAgICAgICBpZiAodGhpcy5pbmRleCA9PSAwKVxuICAgICAgICAgICAgdGhpcy5tYXliZU5leHQoKTtcbiAgICB9XG4gICAgZm9yaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFja0J1ZmZlckN1cnNvcih0aGlzLnN0YWNrLCB0aGlzLnBvcywgdGhpcy5pbmRleCk7XG4gICAgfVxufVxuXG4vLy8gVG9rZW5pemVycyB3cml0ZSB0aGUgdG9rZW5zIHRoZXkgcmVhZCBpbnRvIGluc3RhbmNlcyBvZiB0aGlzIGNsYXNzLlxuY2xhc3MgVG9rZW4ge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvLy8gVGhlIHN0YXJ0IG9mIHRoZSB0b2tlbi4gVGhpcyBpcyBzZXQgYnkgdGhlIHBhcnNlciwgYW5kIHNob3VsZCBub3RcbiAgICAgICAgLy8vIGJlIG11dGF0ZWQgYnkgdGhlIHRva2VuaXplci5cbiAgICAgICAgdGhpcy5zdGFydCA9IC0xO1xuICAgICAgICAvLy8gVGhpcyBzdGFydHMgYXQgLTEsIGFuZCBzaG91bGQgYmUgdXBkYXRlZCB0byBhIHRlcm0gaWQgd2hlbiBhXG4gICAgICAgIC8vLyBtYXRjaGluZyB0b2tlbiBpcyBmb3VuZC5cbiAgICAgICAgdGhpcy52YWx1ZSA9IC0xO1xuICAgICAgICAvLy8gV2hlbiBzZXR0aW5nIGAudmFsdWVgLCB5b3Ugc2hvdWxkIGFsc28gc2V0IGAuZW5kYCB0byB0aGUgZW5kXG4gICAgICAgIC8vLyBwb3NpdGlvbiBvZiB0aGUgdG9rZW4uIChZb3UnbGwgdXN1YWxseSB3YW50IHRvIHVzZSB0aGUgYGFjY2VwdGBcbiAgICAgICAgLy8vIG1ldGhvZC4pXG4gICAgICAgIHRoaXMuZW5kID0gLTE7XG4gICAgfVxuICAgIC8vLyBBY2NlcHQgYSB0b2tlbiwgc2V0dGluZyBgdmFsdWVgIGFuZCBgZW5kYCB0byB0aGUgZ2l2ZW4gdmFsdWVzLlxuICAgIGFjY2VwdCh2YWx1ZSwgZW5kKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5lbmQgPSBlbmQ7XG4gICAgfVxufVxuLy8vIEBpbnRlcm5hbFxuY2xhc3MgVG9rZW5Hcm91cCB7XG4gICAgY29uc3RydWN0b3IoZGF0YSwgaWQpIHtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgIH1cbiAgICB0b2tlbihpbnB1dCwgdG9rZW4sIHN0YWNrKSB7IHJlYWRUb2tlbih0aGlzLmRhdGEsIGlucHV0LCB0b2tlbiwgc3RhY2ssIHRoaXMuaWQpOyB9XG59XG5Ub2tlbkdyb3VwLnByb3RvdHlwZS5jb250ZXh0dWFsID0gVG9rZW5Hcm91cC5wcm90b3R5cGUuZmFsbGJhY2sgPSBUb2tlbkdyb3VwLnByb3RvdHlwZS5leHRlbmQgPSBmYWxzZTtcbi8vLyBFeHBvcnRzIHRoYXQgYXJlIHVzZWQgZm9yIGBAZXh0ZXJuYWwgdG9rZW5zYCBpbiB0aGUgZ3JhbW1hciBzaG91bGRcbi8vLyBleHBvcnQgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcy5cbmNsYXNzIEV4dGVybmFsVG9rZW5pemVyIHtcbiAgICAvLy8gQ3JlYXRlIGEgdG9rZW5pemVyLiBUaGUgZmlyc3QgYXJndW1lbnQgaXMgdGhlIGZ1bmN0aW9uIHRoYXQsXG4gICAgLy8vIGdpdmVuIGFuIGlucHV0IHN0cmVhbSBhbmQgYSB0b2tlbiBvYmplY3QsXG4gICAgLy8vIFtmaWxsc10oI2xlemVyLlRva2VuLmFjY2VwdCkgdGhlIHRva2VuIG9iamVjdCBpZiBpdCByZWNvZ25pemVzIGFcbiAgICAvLy8gdG9rZW4uIGB0b2tlbi5zdGFydGAgc2hvdWxkIGJlIHVzZWQgYXMgdGhlIHN0YXJ0IHBvc2l0aW9uIHRvXG4gICAgLy8vIHNjYW4gZnJvbS5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAvLy8gQGludGVybmFsXG4gICAgdG9rZW4sIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICB0aGlzLnRva2VuID0gdG9rZW47XG4gICAgICAgIHRoaXMuY29udGV4dHVhbCA9ICEhb3B0aW9ucy5jb250ZXh0dWFsO1xuICAgICAgICB0aGlzLmZhbGxiYWNrID0gISFvcHRpb25zLmZhbGxiYWNrO1xuICAgICAgICB0aGlzLmV4dGVuZCA9ICEhb3B0aW9ucy5leHRlbmQ7XG4gICAgfVxufVxuLy8gVG9rZW5pemVyIGRhdGEgaXMgc3RvcmVkIGEgYmlnIHVpbnQxNiBhcnJheSBjb250YWluaW5nLCBmb3IgZWFjaFxuLy8gc3RhdGU6XG4vL1xuLy8gIC0gQSBncm91cCBiaXRtYXNrLCBpbmRpY2F0aW5nIHdoYXQgdG9rZW4gZ3JvdXBzIGFyZSByZWFjaGFibGUgZnJvbVxuLy8gICAgdGhpcyBzdGF0ZSwgc28gdGhhdCBwYXRocyB0aGF0IGNhbiBvbmx5IGxlYWQgdG8gdG9rZW5zIG5vdCBpblxuLy8gICAgYW55IG9mIHRoZSBjdXJyZW50IGdyb3VwcyBjYW4gYmUgY3V0IG9mZiBlYXJseS5cbi8vXG4vLyAgLSBUaGUgcG9zaXRpb24gb2YgdGhlIGVuZCBvZiB0aGUgc3RhdGUncyBzZXF1ZW5jZSBvZiBhY2NlcHRpbmdcbi8vICAgIHRva2Vuc1xuLy9cbi8vICAtIFRoZSBudW1iZXIgb2Ygb3V0Z29pbmcgZWRnZXMgZm9yIHRoZSBzdGF0ZVxuLy9cbi8vICAtIFRoZSBhY2NlcHRpbmcgdG9rZW5zLCBhcyAodG9rZW4gaWQsIGdyb3VwIG1hc2spIHBhaXJzXG4vL1xuLy8gIC0gVGhlIG91dGdvaW5nIGVkZ2VzLCBhcyAoc3RhcnQgY2hhcmFjdGVyLCBlbmQgY2hhcmFjdGVyLCBzdGF0ZVxuLy8gICAgaW5kZXgpIHRyaXBsZXMsIHdpdGggZW5kIGNoYXJhY3RlciBiZWluZyBleGNsdXNpdmVcbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGludGVycHJldHMgdGhhdCBkYXRhLCBydW5uaW5nIHRocm91Z2ggYSBzdHJlYW0gYXNcbi8vIGxvbmcgYXMgbmV3IHN0YXRlcyB3aXRoIHRoZSBhIG1hdGNoaW5nIGdyb3VwIG1hc2sgY2FuIGJlIHJlYWNoZWQsXG4vLyBhbmQgdXBkYXRpbmcgYHRva2VuYCB3aGVuIGl0IG1hdGNoZXMgYSB0b2tlbi5cbmZ1bmN0aW9uIHJlYWRUb2tlbihkYXRhLCBpbnB1dCwgdG9rZW4sIHN0YWNrLCBncm91cCkge1xuICAgIGxldCBzdGF0ZSA9IDAsIGdyb3VwTWFzayA9IDEgPDwgZ3JvdXAsIGRpYWxlY3QgPSBzdGFjay5wLnBhcnNlci5kaWFsZWN0O1xuICAgIHNjYW46IGZvciAobGV0IHBvcyA9IHRva2VuLnN0YXJ0OzspIHtcbiAgICAgICAgaWYgKChncm91cE1hc2sgJiBkYXRhW3N0YXRlXSkgPT0gMClcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBsZXQgYWNjRW5kID0gZGF0YVtzdGF0ZSArIDFdO1xuICAgICAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgc3RhdGUgY2FuIGxlYWQgdG8gYSB0b2tlbiBpbiB0aGUgY3VycmVudCBncm91cFxuICAgICAgICAvLyBBY2NlcHQgdG9rZW5zIGluIHRoaXMgc3RhdGUsIHBvc3NpYmx5IG92ZXJ3cml0aW5nXG4gICAgICAgIC8vIGxvd2VyLXByZWNlZGVuY2UgLyBzaG9ydGVyIHRva2Vuc1xuICAgICAgICBmb3IgKGxldCBpID0gc3RhdGUgKyAzOyBpIDwgYWNjRW5kOyBpICs9IDIpXG4gICAgICAgICAgICBpZiAoKGRhdGFbaSArIDFdICYgZ3JvdXBNYXNrKSA+IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgdGVybSA9IGRhdGFbaV07XG4gICAgICAgICAgICAgICAgaWYgKGRpYWxlY3QuYWxsb3dzKHRlcm0pICYmXG4gICAgICAgICAgICAgICAgICAgICh0b2tlbi52YWx1ZSA9PSAtMSB8fCB0b2tlbi52YWx1ZSA9PSB0ZXJtIHx8IHN0YWNrLnAucGFyc2VyLm92ZXJyaWRlcyh0ZXJtLCB0b2tlbi52YWx1ZSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLmFjY2VwdCh0ZXJtLCBwb3MpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIGxldCBuZXh0ID0gaW5wdXQuZ2V0KHBvcysrKTtcbiAgICAgICAgLy8gRG8gYSBiaW5hcnkgc2VhcmNoIG9uIHRoZSBzdGF0ZSdzIGVkZ2VzXG4gICAgICAgIGZvciAobGV0IGxvdyA9IDAsIGhpZ2ggPSBkYXRhW3N0YXRlICsgMl07IGxvdyA8IGhpZ2g7KSB7XG4gICAgICAgICAgICBsZXQgbWlkID0gKGxvdyArIGhpZ2gpID4+IDE7XG4gICAgICAgICAgICBsZXQgaW5kZXggPSBhY2NFbmQgKyBtaWQgKyAobWlkIDw8IDEpO1xuICAgICAgICAgICAgbGV0IGZyb20gPSBkYXRhW2luZGV4XSwgdG8gPSBkYXRhW2luZGV4ICsgMV07XG4gICAgICAgICAgICBpZiAobmV4dCA8IGZyb20pXG4gICAgICAgICAgICAgICAgaGlnaCA9IG1pZDtcbiAgICAgICAgICAgIGVsc2UgaWYgKG5leHQgPj0gdG8pXG4gICAgICAgICAgICAgICAgbG93ID0gbWlkICsgMTtcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gZGF0YVtpbmRleCArIDJdO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlIHNjYW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG4vLyBTZWUgbGV6ZXItZ2VuZXJhdG9yL3NyYy9lbmNvZGUudHMgZm9yIGNvbW1lbnRzIGFib3V0IHRoZSBlbmNvZGluZ1xuLy8gdXNlZCBoZXJlXG5mdW5jdGlvbiBkZWNvZGVBcnJheShpbnB1dCwgVHlwZSA9IFVpbnQxNkFycmF5KSB7XG4gICAgaWYgKHR5cGVvZiBpbnB1dCAhPSBcInN0cmluZ1wiKVxuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgbGV0IGFycmF5ID0gbnVsbDtcbiAgICBmb3IgKGxldCBwb3MgPSAwLCBvdXQgPSAwOyBwb3MgPCBpbnB1dC5sZW5ndGg7KSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IDA7XG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGxldCBuZXh0ID0gaW5wdXQuY2hhckNvZGVBdChwb3MrKyksIHN0b3AgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChuZXh0ID09IDEyNiAvKiBCaWdWYWxDb2RlICovKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSA2NTUzNSAvKiBCaWdWYWwgKi87XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV4dCA+PSA5MiAvKiBHYXAyICovKVxuICAgICAgICAgICAgICAgIG5leHQtLTtcbiAgICAgICAgICAgIGlmIChuZXh0ID49IDM0IC8qIEdhcDEgKi8pXG4gICAgICAgICAgICAgICAgbmV4dC0tO1xuICAgICAgICAgICAgbGV0IGRpZ2l0ID0gbmV4dCAtIDMyIC8qIFN0YXJ0ICovO1xuICAgICAgICAgICAgaWYgKGRpZ2l0ID49IDQ2IC8qIEJhc2UgKi8pIHtcbiAgICAgICAgICAgICAgICBkaWdpdCAtPSA0NiAvKiBCYXNlICovO1xuICAgICAgICAgICAgICAgIHN0b3AgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgKz0gZGlnaXQ7XG4gICAgICAgICAgICBpZiAoc3RvcClcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIHZhbHVlICo9IDQ2IC8qIEJhc2UgKi87XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFycmF5KVxuICAgICAgICAgICAgYXJyYXlbb3V0KytdID0gdmFsdWU7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGFycmF5ID0gbmV3IFR5cGUodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG59XG5cbi8vIEZJWE1FIGZpbmQgc29tZSB3YXkgdG8gcmVkdWNlIHJlY292ZXJ5IHdvcmsgZG9uZSB3aGVuIHRoZSBpbnB1dFxuLy8gZG9lc24ndCBtYXRjaCB0aGUgZ3JhbW1hciBhdCBhbGwuXG4vLyBFbnZpcm9ubWVudCB2YXJpYWJsZSB1c2VkIHRvIGNvbnRyb2wgY29uc29sZSBvdXRwdXRcbmNvbnN0IHZlcmJvc2UgPSB0eXBlb2YgcHJvY2VzcyAhPSBcInVuZGVmaW5lZFwiICYmIC9cXGJwYXJzZVxcYi8udGVzdChwcm9jZXNzLmVudi5MT0cpO1xubGV0IHN0YWNrSURzID0gbnVsbDtcbmZ1bmN0aW9uIGN1dEF0KHRyZWUsIHBvcywgc2lkZSkge1xuICAgIGxldCBjdXJzb3IgPSB0cmVlLmN1cnNvcihwb3MpO1xuICAgIGZvciAoOzspIHtcbiAgICAgICAgaWYgKCEoc2lkZSA8IDAgPyBjdXJzb3IuY2hpbGRCZWZvcmUocG9zKSA6IGN1cnNvci5jaGlsZEFmdGVyKHBvcykpKVxuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGlmICgoc2lkZSA8IDAgPyBjdXJzb3IudG8gPCBwb3MgOiBjdXJzb3IuZnJvbSA+IHBvcykgJiYgIWN1cnNvci50eXBlLmlzRXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWRlIDwgMCA/IE1hdGgubWF4KDAsIE1hdGgubWluKGN1cnNvci50byAtIDEsIHBvcyAtIDUpKSA6IE1hdGgubWluKHRyZWUubGVuZ3RoLCBNYXRoLm1heChjdXJzb3IuZnJvbSArIDEsIHBvcyArIDUpKTtcbiAgICAgICAgICAgICAgICBpZiAoc2lkZSA8IDAgPyBjdXJzb3IucHJldlNpYmxpbmcoKSA6IGN1cnNvci5uZXh0U2libGluZygpKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnNvci5wYXJlbnQoKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZGUgPCAwID8gMCA6IHRyZWUubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgIH1cbn1cbmNsYXNzIEZyYWdtZW50Q3Vyc29yIHtcbiAgICBjb25zdHJ1Y3RvcihmcmFnbWVudHMpIHtcbiAgICAgICAgdGhpcy5mcmFnbWVudHMgPSBmcmFnbWVudHM7XG4gICAgICAgIHRoaXMuaSA9IDA7XG4gICAgICAgIHRoaXMuZnJhZ21lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNhZmVGcm9tID0gLTE7XG4gICAgICAgIHRoaXMuc2FmZVRvID0gLTE7XG4gICAgICAgIHRoaXMudHJlZXMgPSBbXTtcbiAgICAgICAgdGhpcy5zdGFydCA9IFtdO1xuICAgICAgICB0aGlzLmluZGV4ID0gW107XG4gICAgICAgIHRoaXMubmV4dEZyYWdtZW50KCk7XG4gICAgfVxuICAgIG5leHRGcmFnbWVudCgpIHtcbiAgICAgICAgbGV0IGZyID0gdGhpcy5mcmFnbWVudCA9IHRoaXMuaSA9PSB0aGlzLmZyYWdtZW50cy5sZW5ndGggPyBudWxsIDogdGhpcy5mcmFnbWVudHNbdGhpcy5pKytdO1xuICAgICAgICBpZiAoZnIpIHtcbiAgICAgICAgICAgIHRoaXMuc2FmZUZyb20gPSBmci5vcGVuU3RhcnQgPyBjdXRBdChmci50cmVlLCBmci5mcm9tICsgZnIub2Zmc2V0LCAxKSAtIGZyLm9mZnNldCA6IGZyLmZyb207XG4gICAgICAgICAgICB0aGlzLnNhZmVUbyA9IGZyLm9wZW5FbmQgPyBjdXRBdChmci50cmVlLCBmci50byArIGZyLm9mZnNldCwgLTEpIC0gZnIub2Zmc2V0IDogZnIudG87XG4gICAgICAgICAgICB3aGlsZSAodGhpcy50cmVlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWVzLnBvcCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQucG9wKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleC5wb3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudHJlZXMucHVzaChmci50cmVlKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQucHVzaCgtZnIub2Zmc2V0KTtcbiAgICAgICAgICAgIHRoaXMuaW5kZXgucHVzaCgwKTtcbiAgICAgICAgICAgIHRoaXMubmV4dFN0YXJ0ID0gdGhpcy5zYWZlRnJvbTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubmV4dFN0YXJ0ID0gMWU5O1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGBwb3NgIG11c3QgYmUgPj0gYW55IHByZXZpb3VzbHkgZ2l2ZW4gYHBvc2AgZm9yIHRoaXMgY3Vyc29yXG4gICAgbm9kZUF0KHBvcykge1xuICAgICAgICBpZiAocG9zIDwgdGhpcy5uZXh0U3RhcnQpXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgd2hpbGUgKHRoaXMuZnJhZ21lbnQgJiYgdGhpcy5zYWZlVG8gPD0gcG9zKVxuICAgICAgICAgICAgdGhpcy5uZXh0RnJhZ21lbnQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmZyYWdtZW50KVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGxldCBsYXN0ID0gdGhpcy50cmVlcy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgaWYgKGxhc3QgPCAwKSB7IC8vIEVuZCBvZiB0cmVlXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCB0b3AgPSB0aGlzLnRyZWVzW2xhc3RdLCBpbmRleCA9IHRoaXMuaW5kZXhbbGFzdF07XG4gICAgICAgICAgICBpZiAoaW5kZXggPT0gdG9wLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlZXMucG9wKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydC5wb3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4LnBvcCgpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IG5leHQgPSB0b3AuY2hpbGRyZW5baW5kZXhdO1xuICAgICAgICAgICAgbGV0IHN0YXJ0ID0gdGhpcy5zdGFydFtsYXN0XSArIHRvcC5wb3NpdGlvbnNbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKHN0YXJ0ID4gcG9zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0U3RhcnQgPSBzdGFydDtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHN0YXJ0ID09IHBvcyAmJiBzdGFydCArIG5leHQubGVuZ3RoIDw9IHRoaXMuc2FmZVRvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0YXJ0ID09IHBvcyAmJiBzdGFydCA+PSB0aGlzLnNhZmVGcm9tID8gbmV4dCA6IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV4dCBpbnN0YW5jZW9mIFRyZWVCdWZmZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4W2xhc3RdKys7XG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0U3RhcnQgPSBzdGFydCArIG5leHQubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleFtsYXN0XSsrO1xuICAgICAgICAgICAgICAgIGlmIChzdGFydCArIG5leHQubGVuZ3RoID49IHBvcykgeyAvLyBFbnRlciB0aGlzIG5vZGVcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmVlcy5wdXNoKG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0LnB1c2goc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4LnB1c2goMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuY2xhc3MgQ2FjaGVkVG9rZW4gZXh0ZW5kcyBUb2tlbiB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMuZXh0ZW5kZWQgPSAtMTtcbiAgICAgICAgdGhpcy5tYXNrID0gMDtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gMDtcbiAgICB9XG4gICAgY2xlYXIoc3RhcnQpIHtcbiAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5leHRlbmRlZCA9IC0xO1xuICAgIH1cbn1cbmNvbnN0IGR1bW15VG9rZW4gPSBuZXcgVG9rZW47XG5jbGFzcyBUb2tlbkNhY2hlIHtcbiAgICBjb25zdHJ1Y3RvcihwYXJzZXIpIHtcbiAgICAgICAgdGhpcy50b2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5tYWluVG9rZW4gPSBkdW1teVRva2VuO1xuICAgICAgICB0aGlzLmFjdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy50b2tlbnMgPSBwYXJzZXIudG9rZW5pemVycy5tYXAoXyA9PiBuZXcgQ2FjaGVkVG9rZW4pO1xuICAgIH1cbiAgICBnZXRBY3Rpb25zKHN0YWNrLCBpbnB1dCkge1xuICAgICAgICBsZXQgYWN0aW9uSW5kZXggPSAwO1xuICAgICAgICBsZXQgbWFpbiA9IG51bGw7XG4gICAgICAgIGxldCB7IHBhcnNlciB9ID0gc3RhY2sucCwgeyB0b2tlbml6ZXJzIH0gPSBwYXJzZXI7XG4gICAgICAgIGxldCBtYXNrID0gcGFyc2VyLnN0YXRlU2xvdChzdGFjay5zdGF0ZSwgMyAvKiBUb2tlbml6ZXJNYXNrICovKTtcbiAgICAgICAgbGV0IGNvbnRleHQgPSBzdGFjay5jdXJDb250ZXh0ID8gc3RhY2suY3VyQ29udGV4dC5oYXNoIDogMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbml6ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKCgxIDw8IGkpICYgbWFzaykgPT0gMClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGxldCB0b2tlbml6ZXIgPSB0b2tlbml6ZXJzW2ldLCB0b2tlbiA9IHRoaXMudG9rZW5zW2ldO1xuICAgICAgICAgICAgaWYgKG1haW4gJiYgIXRva2VuaXplci5mYWxsYmFjaylcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGlmICh0b2tlbml6ZXIuY29udGV4dHVhbCB8fCB0b2tlbi5zdGFydCAhPSBzdGFjay5wb3MgfHwgdG9rZW4ubWFzayAhPSBtYXNrIHx8IHRva2VuLmNvbnRleHQgIT0gY29udGV4dCkge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQ2FjaGVkVG9rZW4odG9rZW4sIHRva2VuaXplciwgc3RhY2ssIGlucHV0KTtcbiAgICAgICAgICAgICAgICB0b2tlbi5tYXNrID0gbWFzaztcbiAgICAgICAgICAgICAgICB0b2tlbi5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b2tlbi52YWx1ZSAhPSAwIC8qIEVyciAqLykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydEluZGV4ID0gYWN0aW9uSW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmV4dGVuZGVkID4gLTEpXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbkluZGV4ID0gdGhpcy5hZGRBY3Rpb25zKHN0YWNrLCB0b2tlbi5leHRlbmRlZCwgdG9rZW4uZW5kLCBhY3Rpb25JbmRleCk7XG4gICAgICAgICAgICAgICAgYWN0aW9uSW5kZXggPSB0aGlzLmFkZEFjdGlvbnMoc3RhY2ssIHRva2VuLnZhbHVlLCB0b2tlbi5lbmQsIGFjdGlvbkluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAoIXRva2VuaXplci5leHRlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uSW5kZXggPiBzdGFydEluZGV4KVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHdoaWxlICh0aGlzLmFjdGlvbnMubGVuZ3RoID4gYWN0aW9uSW5kZXgpXG4gICAgICAgICAgICB0aGlzLmFjdGlvbnMucG9wKCk7XG4gICAgICAgIGlmICghbWFpbikge1xuICAgICAgICAgICAgbWFpbiA9IGR1bW15VG9rZW47XG4gICAgICAgICAgICBtYWluLnN0YXJ0ID0gc3RhY2sucG9zO1xuICAgICAgICAgICAgaWYgKHN0YWNrLnBvcyA9PSBpbnB1dC5sZW5ndGgpXG4gICAgICAgICAgICAgICAgbWFpbi5hY2NlcHQoc3RhY2sucC5wYXJzZXIuZW9mVGVybSwgc3RhY2sucG9zKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBtYWluLmFjY2VwdCgwIC8qIEVyciAqLywgc3RhY2sucG9zICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5tYWluVG9rZW4gPSBtYWluO1xuICAgICAgICByZXR1cm4gdGhpcy5hY3Rpb25zO1xuICAgIH1cbiAgICB1cGRhdGVDYWNoZWRUb2tlbih0b2tlbiwgdG9rZW5pemVyLCBzdGFjaywgaW5wdXQpIHtcbiAgICAgICAgdG9rZW4uY2xlYXIoc3RhY2sucG9zKTtcbiAgICAgICAgdG9rZW5pemVyLnRva2VuKGlucHV0LCB0b2tlbiwgc3RhY2spO1xuICAgICAgICBpZiAodG9rZW4udmFsdWUgPiAtMSkge1xuICAgICAgICAgICAgbGV0IHsgcGFyc2VyIH0gPSBzdGFjay5wO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZXIuc3BlY2lhbGl6ZWQubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlci5zcGVjaWFsaXplZFtpXSA9PSB0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gcGFyc2VyLnNwZWNpYWxpemVyc1tpXShpbnB1dC5yZWFkKHRva2VuLnN0YXJ0LCB0b2tlbi5lbmQpLCBzdGFjayk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPj0gMCAmJiBzdGFjay5wLnBhcnNlci5kaWFsZWN0LmFsbG93cyhyZXN1bHQgPj4gMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgocmVzdWx0ICYgMSkgPT0gMCAvKiBTcGVjaWFsaXplICovKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLnZhbHVlID0gcmVzdWx0ID4+IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4uZXh0ZW5kZWQgPSByZXN1bHQgPj4gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN0YWNrLnBvcyA9PSBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2VuLmFjY2VwdChzdGFjay5wLnBhcnNlci5lb2ZUZXJtLCBzdGFjay5wb3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdG9rZW4uYWNjZXB0KDAgLyogRXJyICovLCBzdGFjay5wb3MgKyAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdXRBY3Rpb24oYWN0aW9uLCB0b2tlbiwgZW5kLCBpbmRleCkge1xuICAgICAgICAvLyBEb24ndCBhZGQgZHVwbGljYXRlIGFjdGlvbnNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRleDsgaSArPSAzKVxuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uc1tpXSA9PSBhY3Rpb24pXG4gICAgICAgICAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgICB0aGlzLmFjdGlvbnNbaW5kZXgrK10gPSBhY3Rpb247XG4gICAgICAgIHRoaXMuYWN0aW9uc1tpbmRleCsrXSA9IHRva2VuO1xuICAgICAgICB0aGlzLmFjdGlvbnNbaW5kZXgrK10gPSBlbmQ7XG4gICAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG4gICAgYWRkQWN0aW9ucyhzdGFjaywgdG9rZW4sIGVuZCwgaW5kZXgpIHtcbiAgICAgICAgbGV0IHsgc3RhdGUgfSA9IHN0YWNrLCB7IHBhcnNlciB9ID0gc3RhY2sucCwgeyBkYXRhIH0gPSBwYXJzZXI7XG4gICAgICAgIGZvciAobGV0IHNldCA9IDA7IHNldCA8IDI7IHNldCsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gcGFyc2VyLnN0YXRlU2xvdChzdGF0ZSwgc2V0ID8gMiAvKiBTa2lwICovIDogMSAvKiBBY3Rpb25zICovKTs7IGkgKz0gMykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhW2ldID09IDY1NTM1IC8qIEVuZCAqLykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtpICsgMV0gPT0gMSAvKiBOZXh0ICovKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gcGFpcihkYXRhLCBpICsgMik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT0gMCAmJiBkYXRhW2kgKyAxXSA9PSAyIC8qIE90aGVyICovKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gdGhpcy5wdXRBY3Rpb24ocGFpcihkYXRhLCBpICsgMSksIHRva2VuLCBlbmQsIGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkYXRhW2ldID09IHRva2VuKVxuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMucHV0QWN0aW9uKHBhaXIoZGF0YSwgaSArIDEpLCB0b2tlbiwgZW5kLCBpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH1cbn1cbnZhciBSZWM7XG4oZnVuY3Rpb24gKFJlYykge1xuICAgIFJlY1tSZWNbXCJEaXN0YW5jZVwiXSA9IDVdID0gXCJEaXN0YW5jZVwiO1xuICAgIFJlY1tSZWNbXCJNYXhSZW1haW5pbmdQZXJTdGVwXCJdID0gM10gPSBcIk1heFJlbWFpbmluZ1BlclN0ZXBcIjtcbiAgICBSZWNbUmVjW1wiTWluQnVmZmVyTGVuZ3RoUHJ1bmVcIl0gPSAyMDBdID0gXCJNaW5CdWZmZXJMZW5ndGhQcnVuZVwiO1xuICAgIFJlY1tSZWNbXCJGb3JjZVJlZHVjZUxpbWl0XCJdID0gMTBdID0gXCJGb3JjZVJlZHVjZUxpbWl0XCI7XG59KShSZWMgfHwgKFJlYyA9IHt9KSk7XG4vLy8gQSBwYXJzZSBjb250ZXh0IGNhbiBiZSB1c2VkIGZvciBzdGVwLWJ5LXN0ZXAgcGFyc2luZy4gQWZ0ZXJcbi8vLyBjcmVhdGluZyBpdCwgeW91IHJlcGVhdGVkbHkgY2FsbCBgLmFkdmFuY2UoKWAgdW50aWwgaXQgcmV0dXJucyBhXG4vLy8gdHJlZSB0byBpbmRpY2F0ZSBpdCBoYXMgcmVhY2hlZCB0aGUgZW5kIG9mIHRoZSBwYXJzZS5cbmNsYXNzIFBhcnNlIHtcbiAgICBjb25zdHJ1Y3RvcihwYXJzZXIsIGlucHV0LCBzdGFydFBvcywgY29udGV4dCkge1xuICAgICAgICB0aGlzLnBhcnNlciA9IHBhcnNlcjtcbiAgICAgICAgdGhpcy5pbnB1dCA9IGlucHV0O1xuICAgICAgICB0aGlzLnN0YXJ0UG9zID0gc3RhcnRQb3M7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIC8vIFRoZSBwb3NpdGlvbiB0byB3aGljaCB0aGUgcGFyc2UgaGFzIGFkdmFuY2VkLlxuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgICAgIHRoaXMucmVjb3ZlcmluZyA9IDA7XG4gICAgICAgIHRoaXMubmV4dFN0YWNrSUQgPSAweDI2NTQ7XG4gICAgICAgIHRoaXMubmVzdGVkID0gbnVsbDtcbiAgICAgICAgdGhpcy5uZXN0RW5kID0gMDtcbiAgICAgICAgdGhpcy5uZXN0V3JhcCA9IG51bGw7XG4gICAgICAgIHRoaXMucmV1c2VkID0gW107XG4gICAgICAgIHRoaXMudG9rZW5zID0gbmV3IFRva2VuQ2FjaGUocGFyc2VyKTtcbiAgICAgICAgdGhpcy50b3BUZXJtID0gcGFyc2VyLnRvcFsxXTtcbiAgICAgICAgdGhpcy5zdGFja3MgPSBbU3RhY2suc3RhcnQodGhpcywgcGFyc2VyLnRvcFswXSwgdGhpcy5zdGFydFBvcyldO1xuICAgICAgICBsZXQgZnJhZ21lbnRzID0gY29udGV4dCA9PT0gbnVsbCB8fCBjb250ZXh0ID09PSB2b2lkIDAgPyB2b2lkIDAgOiBjb250ZXh0LmZyYWdtZW50cztcbiAgICAgICAgdGhpcy5mcmFnbWVudHMgPSBmcmFnbWVudHMgJiYgZnJhZ21lbnRzLmxlbmd0aCA/IG5ldyBGcmFnbWVudEN1cnNvcihmcmFnbWVudHMpIDogbnVsbDtcbiAgICB9XG4gICAgLy8gTW92ZSB0aGUgcGFyc2VyIGZvcndhcmQuIFRoaXMgd2lsbCBwcm9jZXNzIGFsbCBwYXJzZSBzdGFja3MgYXRcbiAgICAvLyBgdGhpcy5wb3NgIGFuZCB0cnkgdG8gYWR2YW5jZSB0aGVtIHRvIGEgZnVydGhlciBwb3NpdGlvbi4gSWYgbm9cbiAgICAvLyBzdGFjayBmb3Igc3VjaCBhIHBvc2l0aW9uIGlzIGZvdW5kLCBpdCdsbCBzdGFydCBlcnJvci1yZWNvdmVyeS5cbiAgICAvL1xuICAgIC8vIFdoZW4gdGhlIHBhcnNlIGlzIGZpbmlzaGVkLCB0aGlzIHdpbGwgcmV0dXJuIGEgc3ludGF4IHRyZWUuIFdoZW5cbiAgICAvLyBub3QsIGl0IHJldHVybnMgYG51bGxgLlxuICAgIGFkdmFuY2UoKSB7XG4gICAgICAgIGlmICh0aGlzLm5lc3RlZCkge1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHRoaXMubmVzdGVkLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHRoaXMucG9zID0gdGhpcy5uZXN0ZWQucG9zO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoTmVzdGVkKHRoaXMuc3RhY2tzWzBdLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIHRoaXMubmVzdGVkID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdGFja3MgPSB0aGlzLnN0YWNrcywgcG9zID0gdGhpcy5wb3M7XG4gICAgICAgIC8vIFRoaXMgd2lsbCBob2xkIHN0YWNrcyBiZXlvbmQgYHBvc2AuXG4gICAgICAgIGxldCBuZXdTdGFja3MgPSB0aGlzLnN0YWNrcyA9IFtdO1xuICAgICAgICBsZXQgc3RvcHBlZCwgc3RvcHBlZFRva2VucztcbiAgICAgICAgbGV0IG1heWJlTmVzdDtcbiAgICAgICAgLy8gS2VlcCBhZHZhbmNpbmcgYW55IHN0YWNrcyBhdCBgcG9zYCB1bnRpbCB0aGV5IGVpdGhlciBtb3ZlXG4gICAgICAgIC8vIGZvcndhcmQgb3IgY2FuJ3QgYmUgYWR2YW5jZWQuIEdhdGhlciBzdGFja3MgdGhhdCBjYW4ndCBiZVxuICAgICAgICAvLyBhZHZhbmNlZCBmdXJ0aGVyIGluIGBzdG9wcGVkYC5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGFjayA9IHN0YWNrc1tpXSwgbmVzdDtcbiAgICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2sucG9zID4gcG9zKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N0YWNrcy5wdXNoKHN0YWNrKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobmVzdCA9IHRoaXMuY2hlY2tOZXN0KHN0YWNrKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1heWJlTmVzdCB8fCBtYXliZU5lc3Quc3RhY2suc2NvcmUgPCBzdGFjay5zY29yZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlTmVzdCA9IG5lc3Q7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuYWR2YW5jZVN0YWNrKHN0YWNrLCBuZXdTdGFja3MsIHN0YWNrcykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0b3BwZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BwZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BwZWRUb2tlbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdG9wcGVkLnB1c2goc3RhY2spO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdG9rID0gdGhpcy50b2tlbnMubWFpblRva2VuO1xuICAgICAgICAgICAgICAgICAgICBzdG9wcGVkVG9rZW5zLnB1c2godG9rLnZhbHVlLCB0b2suZW5kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1heWJlTmVzdCkge1xuICAgICAgICAgICAgdGhpcy5zdGFydE5lc3RlZChtYXliZU5lc3QpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFuZXdTdGFja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBsZXQgZmluaXNoZWQgPSBzdG9wcGVkICYmIGZpbmRGaW5pc2hlZChzdG9wcGVkKTtcbiAgICAgICAgICAgIGlmIChmaW5pc2hlZClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdGFja1RvVHJlZShmaW5pc2hlZCk7XG4gICAgICAgICAgICBpZiAodGhpcy5wYXJzZXIuc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZlcmJvc2UgJiYgc3RvcHBlZClcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdHVjayB3aXRoIHRva2VuIFwiICsgdGhpcy5wYXJzZXIuZ2V0TmFtZSh0aGlzLnRva2Vucy5tYWluVG9rZW4udmFsdWUpKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJObyBwYXJzZSBhdCBcIiArIHBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMucmVjb3ZlcmluZylcbiAgICAgICAgICAgICAgICB0aGlzLnJlY292ZXJpbmcgPSA1IC8qIERpc3RhbmNlICovO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnJlY292ZXJpbmcgJiYgc3RvcHBlZCkge1xuICAgICAgICAgICAgbGV0IGZpbmlzaGVkID0gdGhpcy5ydW5SZWNvdmVyeShzdG9wcGVkLCBzdG9wcGVkVG9rZW5zLCBuZXdTdGFja3MpO1xuICAgICAgICAgICAgaWYgKGZpbmlzaGVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YWNrVG9UcmVlKGZpbmlzaGVkLmZvcmNlQWxsKCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnJlY292ZXJpbmcpIHtcbiAgICAgICAgICAgIGxldCBtYXhSZW1haW5pbmcgPSB0aGlzLnJlY292ZXJpbmcgPT0gMSA/IDEgOiB0aGlzLnJlY292ZXJpbmcgKiAzIC8qIE1heFJlbWFpbmluZ1BlclN0ZXAgKi87XG4gICAgICAgICAgICBpZiAobmV3U3RhY2tzLmxlbmd0aCA+IG1heFJlbWFpbmluZykge1xuICAgICAgICAgICAgICAgIG5ld1N0YWNrcy5zb3J0KChhLCBiKSA9PiBiLnNjb3JlIC0gYS5zY29yZSk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKG5ld1N0YWNrcy5sZW5ndGggPiBtYXhSZW1haW5pbmcpXG4gICAgICAgICAgICAgICAgICAgIG5ld1N0YWNrcy5wb3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXdTdGFja3Muc29tZShzID0+IHMucmVkdWNlUG9zID4gcG9zKSlcbiAgICAgICAgICAgICAgICB0aGlzLnJlY292ZXJpbmctLTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChuZXdTdGFja3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgLy8gUHJ1bmUgc3RhY2tzIHRoYXQgYXJlIGluIHRoZSBzYW1lIHN0YXRlLCBvciB0aGF0IGhhdmUgYmVlblxuICAgICAgICAgICAgLy8gcnVubmluZyB3aXRob3V0IHNwbGl0dGluZyBmb3IgYSB3aGlsZSwgdG8gYXZvaWQgZ2V0dGluZyBzdHVja1xuICAgICAgICAgICAgLy8gd2l0aCBtdWx0aXBsZSBzdWNjZXNzZnVsIHN0YWNrcyBydW5uaW5nIGVuZGxlc3NseSBvbi5cbiAgICAgICAgICAgIG91dGVyOiBmb3IgKGxldCBpID0gMDsgaSA8IG5ld1N0YWNrcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhY2sgPSBuZXdTdGFja3NbaV07XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgbmV3U3RhY2tzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBvdGhlciA9IG5ld1N0YWNrc1tqXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YWNrLnNhbWVTdGF0ZShvdGhlcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLmJ1ZmZlci5sZW5ndGggPiAyMDAgLyogTWluQnVmZmVyTGVuZ3RoUHJ1bmUgKi8gJiYgb3RoZXIuYnVmZmVyLmxlbmd0aCA+IDIwMCAvKiBNaW5CdWZmZXJMZW5ndGhQcnVuZSAqLykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCgoc3RhY2suc2NvcmUgLSBvdGhlci5zY29yZSkgfHwgKHN0YWNrLmJ1ZmZlci5sZW5ndGggLSBvdGhlci5idWZmZXIubGVuZ3RoKSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3U3RhY2tzLnNwbGljZShqLS0sIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3U3RhY2tzLnNwbGljZShpLS0sIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucG9zID0gbmV3U3RhY2tzWzBdLnBvcztcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuZXdTdGFja3MubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBpZiAobmV3U3RhY2tzW2ldLnBvcyA8IHRoaXMucG9zKVxuICAgICAgICAgICAgICAgIHRoaXMucG9zID0gbmV3U3RhY2tzW2ldLnBvcztcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIFJldHVybnMgYW4gdXBkYXRlZCB2ZXJzaW9uIG9mIHRoZSBnaXZlbiBzdGFjaywgb3IgbnVsbCBpZiB0aGVcbiAgICAvLyBzdGFjayBjYW4ndCBhZHZhbmNlIG5vcm1hbGx5LiBXaGVuIGBzcGxpdGAgYW5kIGBzdGFja3NgIGFyZVxuICAgIC8vIGdpdmVuLCBzdGFja3Mgc3BsaXQgb2ZmIGJ5IGFtYmlndW91cyBvcGVyYXRpb25zIHdpbGwgYmUgcHVzaGVkIHRvXG4gICAgLy8gYHNwbGl0YCwgb3IgYWRkZWQgdG8gYHN0YWNrc2AgaWYgdGhleSBtb3ZlIGBwb3NgIGZvcndhcmQuXG4gICAgYWR2YW5jZVN0YWNrKHN0YWNrLCBzdGFja3MsIHNwbGl0KSB7XG4gICAgICAgIGxldCBzdGFydCA9IHN0YWNrLnBvcywgeyBpbnB1dCwgcGFyc2VyIH0gPSB0aGlzO1xuICAgICAgICBsZXQgYmFzZSA9IHZlcmJvc2UgPyB0aGlzLnN0YWNrSUQoc3RhY2spICsgXCIgLT4gXCIgOiBcIlwiO1xuICAgICAgICBpZiAodGhpcy5mcmFnbWVudHMpIHtcbiAgICAgICAgICAgIGxldCBzdHJpY3RDeCA9IHN0YWNrLmN1ckNvbnRleHQgJiYgc3RhY2suY3VyQ29udGV4dC50cmFja2VyLnN0cmljdCwgY3hIYXNoID0gc3RyaWN0Q3ggPyBzdGFjay5jdXJDb250ZXh0Lmhhc2ggOiAwO1xuICAgICAgICAgICAgZm9yIChsZXQgY2FjaGVkID0gdGhpcy5mcmFnbWVudHMubm9kZUF0KHN0YXJ0KTsgY2FjaGVkOykge1xuICAgICAgICAgICAgICAgIGxldCBtYXRjaCA9IHRoaXMucGFyc2VyLm5vZGVTZXQudHlwZXNbY2FjaGVkLnR5cGUuaWRdID09IGNhY2hlZC50eXBlID8gcGFyc2VyLmdldEdvdG8oc3RhY2suc3RhdGUsIGNhY2hlZC50eXBlLmlkKSA6IC0xO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCA+IC0xICYmIGNhY2hlZC5sZW5ndGggJiYgKCFzdHJpY3RDeCB8fCAoY2FjaGVkLmNvbnRleHRIYXNoIHx8IDApID09IGN4SGFzaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sudXNlTm9kZShjYWNoZWQsIG1hdGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhiYXNlICsgdGhpcy5zdGFja0lEKHN0YWNrKSArIGAgKHZpYSByZXVzZSBvZiAke3BhcnNlci5nZXROYW1lKGNhY2hlZC50eXBlLmlkKX0pYCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIShjYWNoZWQgaW5zdGFuY2VvZiBUcmVlKSB8fCBjYWNoZWQuY2hpbGRyZW4ubGVuZ3RoID09IDAgfHwgY2FjaGVkLnBvc2l0aW9uc1swXSA+IDApXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGxldCBpbm5lciA9IGNhY2hlZC5jaGlsZHJlblswXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIgaW5zdGFuY2VvZiBUcmVlKVxuICAgICAgICAgICAgICAgICAgICBjYWNoZWQgPSBpbm5lcjtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCBkZWZhdWx0UmVkdWNlID0gcGFyc2VyLnN0YXRlU2xvdChzdGFjay5zdGF0ZSwgNCAvKiBEZWZhdWx0UmVkdWNlICovKTtcbiAgICAgICAgaWYgKGRlZmF1bHRSZWR1Y2UgPiAwKSB7XG4gICAgICAgICAgICBzdGFjay5yZWR1Y2UoZGVmYXVsdFJlZHVjZSk7XG4gICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhiYXNlICsgdGhpcy5zdGFja0lEKHN0YWNrKSArIGAgKHZpYSBhbHdheXMtcmVkdWNlICR7cGFyc2VyLmdldE5hbWUoZGVmYXVsdFJlZHVjZSAmIDY1NTM1IC8qIFZhbHVlTWFzayAqLyl9KWApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGFjdGlvbnMgPSB0aGlzLnRva2Vucy5nZXRBY3Rpb25zKHN0YWNrLCBpbnB1dCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWN0aW9ucy5sZW5ndGg7KSB7XG4gICAgICAgICAgICBsZXQgYWN0aW9uID0gYWN0aW9uc1tpKytdLCB0ZXJtID0gYWN0aW9uc1tpKytdLCBlbmQgPSBhY3Rpb25zW2krK107XG4gICAgICAgICAgICBsZXQgbGFzdCA9IGkgPT0gYWN0aW9ucy5sZW5ndGggfHwgIXNwbGl0O1xuICAgICAgICAgICAgbGV0IGxvY2FsU3RhY2sgPSBsYXN0ID8gc3RhY2sgOiBzdGFjay5zcGxpdCgpO1xuICAgICAgICAgICAgbG9jYWxTdGFjay5hcHBseShhY3Rpb24sIHRlcm0sIGVuZCk7XG4gICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhiYXNlICsgdGhpcy5zdGFja0lEKGxvY2FsU3RhY2spICsgYCAodmlhICR7KGFjdGlvbiAmIDY1NTM2IC8qIFJlZHVjZUZsYWcgKi8pID09IDAgPyBcInNoaWZ0XCJcbiAgICAgICAgICAgICAgICAgICAgOiBgcmVkdWNlIG9mICR7cGFyc2VyLmdldE5hbWUoYWN0aW9uICYgNjU1MzUgLyogVmFsdWVNYXNrICovKX1gfSBmb3IgJHtwYXJzZXIuZ2V0TmFtZSh0ZXJtKX0gQCAke3N0YXJ0fSR7bG9jYWxTdGFjayA9PSBzdGFjayA/IFwiXCIgOiBcIiwgc3BsaXRcIn0pYCk7XG4gICAgICAgICAgICBpZiAobGFzdClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGVsc2UgaWYgKGxvY2FsU3RhY2sucG9zID4gc3RhcnQpXG4gICAgICAgICAgICAgICAgc3RhY2tzLnB1c2gobG9jYWxTdGFjayk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgc3BsaXQucHVzaChsb2NhbFN0YWNrKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFkdmFuY2UgYSBnaXZlbiBzdGFjayBmb3J3YXJkIGFzIGZhciBhcyBpdCB3aWxsIGdvLiBSZXR1cm5zIHRoZVxuICAgIC8vIChwb3NzaWJseSB1cGRhdGVkKSBzdGFjayBpZiBpdCBnb3Qgc3R1Y2ssIG9yIG51bGwgaWYgaXQgbW92ZWRcbiAgICAvLyBmb3J3YXJkIGFuZCB3YXMgZ2l2ZW4gdG8gYHB1c2hTdGFja0RlZHVwYC5cbiAgICBhZHZhbmNlRnVsbHkoc3RhY2ssIG5ld1N0YWNrcykge1xuICAgICAgICBsZXQgcG9zID0gc3RhY2sucG9zO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBsZXQgbmVzdCA9IHRoaXMuY2hlY2tOZXN0KHN0YWNrKTtcbiAgICAgICAgICAgIGlmIChuZXN0KVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXN0O1xuICAgICAgICAgICAgaWYgKCF0aGlzLmFkdmFuY2VTdGFjayhzdGFjaywgbnVsbCwgbnVsbCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgaWYgKHN0YWNrLnBvcyA+IHBvcykge1xuICAgICAgICAgICAgICAgIHB1c2hTdGFja0RlZHVwKHN0YWNrLCBuZXdTdGFja3MpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJ1blJlY292ZXJ5KHN0YWNrcywgdG9rZW5zLCBuZXdTdGFja3MpIHtcbiAgICAgICAgbGV0IGZpbmlzaGVkID0gbnVsbCwgcmVzdGFydGVkID0gZmFsc2U7XG4gICAgICAgIGxldCBtYXliZU5lc3Q7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgc3RhY2sgPSBzdGFja3NbaV0sIHRva2VuID0gdG9rZW5zW2kgPDwgMV0sIHRva2VuRW5kID0gdG9rZW5zWyhpIDw8IDEpICsgMV07XG4gICAgICAgICAgICBsZXQgYmFzZSA9IHZlcmJvc2UgPyB0aGlzLnN0YWNrSUQoc3RhY2spICsgXCIgLT4gXCIgOiBcIlwiO1xuICAgICAgICAgICAgaWYgKHN0YWNrLmRlYWRFbmQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdGFydGVkKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICByZXN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHN0YWNrLnJlc3RhcnQoKTtcbiAgICAgICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYmFzZSArIHRoaXMuc3RhY2tJRChzdGFjaykgKyBcIiAocmVzdGFydGVkKVwiKTtcbiAgICAgICAgICAgICAgICBsZXQgZG9uZSA9IHRoaXMuYWR2YW5jZUZ1bGx5KHN0YWNrLCBuZXdTdGFja3MpO1xuICAgICAgICAgICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb25lICE9PSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWF5YmVOZXN0ID0gZG9uZTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGZvcmNlID0gc3RhY2suc3BsaXQoKSwgZm9yY2VCYXNlID0gYmFzZTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBmb3JjZS5mb3JjZVJlZHVjZSgpICYmIGogPCAxMCAvKiBGb3JjZVJlZHVjZUxpbWl0ICovOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZm9yY2VCYXNlICsgdGhpcy5zdGFja0lEKGZvcmNlKSArIFwiICh2aWEgZm9yY2UtcmVkdWNlKVwiKTtcbiAgICAgICAgICAgICAgICBsZXQgZG9uZSA9IHRoaXMuYWR2YW5jZUZ1bGx5KGZvcmNlLCBuZXdTdGFja3MpO1xuICAgICAgICAgICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb25lICE9PSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWF5YmVOZXN0ID0gZG9uZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgICAgICBmb3JjZUJhc2UgPSB0aGlzLnN0YWNrSUQoZm9yY2UpICsgXCIgLT4gXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBpbnNlcnQgb2Ygc3RhY2sucmVjb3ZlckJ5SW5zZXJ0KHRva2VuKSkge1xuICAgICAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhiYXNlICsgdGhpcy5zdGFja0lEKGluc2VydCkgKyBcIiAodmlhIHJlY292ZXItaW5zZXJ0KVwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFkdmFuY2VGdWxseShpbnNlcnQsIG5ld1N0YWNrcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5pbnB1dC5sZW5ndGggPiBzdGFjay5wb3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW5FbmQgPT0gc3RhY2sucG9zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuRW5kKys7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuID0gMCAvKiBFcnIgKi87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0YWNrLnJlY292ZXJCeURlbGV0ZSh0b2tlbiwgdG9rZW5FbmQpO1xuICAgICAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhiYXNlICsgdGhpcy5zdGFja0lEKHN0YWNrKSArIGAgKHZpYSByZWNvdmVyLWRlbGV0ZSAke3RoaXMucGFyc2VyLmdldE5hbWUodG9rZW4pfSlgKTtcbiAgICAgICAgICAgICAgICBwdXNoU3RhY2tEZWR1cChzdGFjaywgbmV3U3RhY2tzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFmaW5pc2hlZCB8fCBmaW5pc2hlZC5zY29yZSA8IHN0YWNrLnNjb3JlKSB7XG4gICAgICAgICAgICAgICAgZmluaXNoZWQgPSBzdGFjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZmluaXNoZWQpXG4gICAgICAgICAgICByZXR1cm4gZmluaXNoZWQ7XG4gICAgICAgIGlmIChtYXliZU5lc3QpXG4gICAgICAgICAgICBmb3IgKGxldCBzIG9mIHRoaXMuc3RhY2tzKVxuICAgICAgICAgICAgICAgIGlmIChzLnNjb3JlID4gbWF5YmVOZXN0LnN0YWNrLnNjb3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heWJlTmVzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICBpZiAobWF5YmVOZXN0KVxuICAgICAgICAgICAgdGhpcy5zdGFydE5lc3RlZChtYXliZU5lc3QpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZm9yY2VGaW5pc2goKSB7XG4gICAgICAgIGxldCBzdGFjayA9IHRoaXMuc3RhY2tzWzBdLnNwbGl0KCk7XG4gICAgICAgIGlmICh0aGlzLm5lc3RlZClcbiAgICAgICAgICAgIHRoaXMuZmluaXNoTmVzdGVkKHN0YWNrLCB0aGlzLm5lc3RlZC5mb3JjZUZpbmlzaCgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhY2tUb1RyZWUoc3RhY2suZm9yY2VBbGwoKSk7XG4gICAgfVxuICAgIC8vIENvbnZlcnQgdGhlIHN0YWNrJ3MgYnVmZmVyIHRvIGEgc3ludGF4IHRyZWUuXG4gICAgc3RhY2tUb1RyZWUoc3RhY2ssIHBvcyA9IHN0YWNrLnBvcykge1xuICAgICAgICBpZiAodGhpcy5wYXJzZXIuY29udGV4dClcbiAgICAgICAgICAgIHN0YWNrLmVtaXRDb250ZXh0KCk7XG4gICAgICAgIHJldHVybiBUcmVlLmJ1aWxkKHsgYnVmZmVyOiBTdGFja0J1ZmZlckN1cnNvci5jcmVhdGUoc3RhY2spLFxuICAgICAgICAgICAgbm9kZVNldDogdGhpcy5wYXJzZXIubm9kZVNldCxcbiAgICAgICAgICAgIHRvcElEOiB0aGlzLnRvcFRlcm0sXG4gICAgICAgICAgICBtYXhCdWZmZXJMZW5ndGg6IHRoaXMucGFyc2VyLmJ1ZmZlckxlbmd0aCxcbiAgICAgICAgICAgIHJldXNlZDogdGhpcy5yZXVzZWQsXG4gICAgICAgICAgICBzdGFydDogdGhpcy5zdGFydFBvcyxcbiAgICAgICAgICAgIGxlbmd0aDogcG9zIC0gdGhpcy5zdGFydFBvcyxcbiAgICAgICAgICAgIG1pblJlcGVhdFR5cGU6IHRoaXMucGFyc2VyLm1pblJlcGVhdFRlcm0gfSk7XG4gICAgfVxuICAgIGNoZWNrTmVzdChzdGFjaykge1xuICAgICAgICBsZXQgaW5mbyA9IHRoaXMucGFyc2VyLmZpbmROZXN0ZWQoc3RhY2suc3RhdGUpO1xuICAgICAgICBpZiAoIWluZm8pXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IHNwZWMgPSBpbmZvLnZhbHVlO1xuICAgICAgICBpZiAodHlwZW9mIHNwZWMgPT0gXCJmdW5jdGlvblwiKVxuICAgICAgICAgICAgc3BlYyA9IHNwZWModGhpcy5pbnB1dCwgc3RhY2spO1xuICAgICAgICByZXR1cm4gc3BlYyA/IHsgc3RhY2ssIGluZm8sIHNwZWMgfSA6IG51bGw7XG4gICAgfVxuICAgIHN0YXJ0TmVzdGVkKG5lc3QpIHtcbiAgICAgICAgbGV0IHsgc3RhY2ssIGluZm8sIHNwZWMgfSA9IG5lc3Q7XG4gICAgICAgIHRoaXMuc3RhY2tzID0gW3N0YWNrXTtcbiAgICAgICAgdGhpcy5uZXN0RW5kID0gdGhpcy5zY2FuRm9yTmVzdEVuZChzdGFjaywgaW5mby5lbmQsIHNwZWMuZmlsdGVyRW5kKTtcbiAgICAgICAgdGhpcy5uZXN0V3JhcCA9IHR5cGVvZiBzcGVjLndyYXBUeXBlID09IFwibnVtYmVyXCIgPyB0aGlzLnBhcnNlci5ub2RlU2V0LnR5cGVzW3NwZWMud3JhcFR5cGVdIDogc3BlYy53cmFwVHlwZSB8fCBudWxsO1xuICAgICAgICBpZiAoc3BlYy5zdGFydFBhcnNlKSB7XG4gICAgICAgICAgICB0aGlzLm5lc3RlZCA9IHNwZWMuc3RhcnRQYXJzZSh0aGlzLmlucHV0LmNsaXAodGhpcy5uZXN0RW5kKSwgc3RhY2sucG9zLCB0aGlzLmNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5maW5pc2hOZXN0ZWQoc3RhY2spO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNjYW5Gb3JOZXN0RW5kKHN0YWNrLCBlbmRUb2tlbiwgZmlsdGVyKSB7XG4gICAgICAgIGZvciAobGV0IHBvcyA9IHN0YWNrLnBvczsgcG9zIDwgdGhpcy5pbnB1dC5sZW5ndGg7IHBvcysrKSB7XG4gICAgICAgICAgICBkdW1teVRva2VuLnN0YXJ0ID0gcG9zO1xuICAgICAgICAgICAgZHVtbXlUb2tlbi52YWx1ZSA9IC0xO1xuICAgICAgICAgICAgZW5kVG9rZW4udG9rZW4odGhpcy5pbnB1dCwgZHVtbXlUb2tlbiwgc3RhY2spO1xuICAgICAgICAgICAgaWYgKGR1bW15VG9rZW4udmFsdWUgPiAtMSAmJiAoIWZpbHRlciB8fCBmaWx0ZXIodGhpcy5pbnB1dC5yZWFkKHBvcywgZHVtbXlUb2tlbi5lbmQpKSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgfVxuICAgIGZpbmlzaE5lc3RlZChzdGFjaywgdHJlZSkge1xuICAgICAgICBpZiAodGhpcy5uZXN0V3JhcClcbiAgICAgICAgICAgIHRyZWUgPSBuZXcgVHJlZSh0aGlzLm5lc3RXcmFwLCB0cmVlID8gW3RyZWVdIDogW10sIHRyZWUgPyBbMF0gOiBbXSwgdGhpcy5uZXN0RW5kIC0gc3RhY2sucG9zKTtcbiAgICAgICAgZWxzZSBpZiAoIXRyZWUpXG4gICAgICAgICAgICB0cmVlID0gbmV3IFRyZWUoTm9kZVR5cGUubm9uZSwgW10sIFtdLCB0aGlzLm5lc3RFbmQgLSBzdGFjay5wb3MpO1xuICAgICAgICBsZXQgaW5mbyA9IHRoaXMucGFyc2VyLmZpbmROZXN0ZWQoc3RhY2suc3RhdGUpO1xuICAgICAgICBzdGFjay51c2VOb2RlKHRyZWUsIHRoaXMucGFyc2VyLmdldEdvdG8oc3RhY2suc3RhdGUsIGluZm8ucGxhY2Vob2xkZXIsIHRydWUpKTtcbiAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnN0YWNrSUQoc3RhY2spICsgYCAodmlhIHVubmVzdClgKTtcbiAgICB9XG4gICAgc3RhY2tJRChzdGFjaykge1xuICAgICAgICBsZXQgaWQgPSAoc3RhY2tJRHMgfHwgKHN0YWNrSURzID0gbmV3IFdlYWtNYXApKS5nZXQoc3RhY2spO1xuICAgICAgICBpZiAoIWlkKVxuICAgICAgICAgICAgc3RhY2tJRHMuc2V0KHN0YWNrLCBpZCA9IFN0cmluZy5mcm9tQ29kZVBvaW50KHRoaXMubmV4dFN0YWNrSUQrKykpO1xuICAgICAgICByZXR1cm4gaWQgKyBzdGFjaztcbiAgICB9XG59XG5mdW5jdGlvbiBwdXNoU3RhY2tEZWR1cChzdGFjaywgbmV3U3RhY2tzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZXdTdGFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IG90aGVyID0gbmV3U3RhY2tzW2ldO1xuICAgICAgICBpZiAob3RoZXIucG9zID09IHN0YWNrLnBvcyAmJiBvdGhlci5zYW1lU3RhdGUoc3RhY2spKSB7XG4gICAgICAgICAgICBpZiAobmV3U3RhY2tzW2ldLnNjb3JlIDwgc3RhY2suc2NvcmUpXG4gICAgICAgICAgICAgICAgbmV3U3RhY2tzW2ldID0gc3RhY2s7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG4gICAgbmV3U3RhY2tzLnB1c2goc3RhY2spO1xufVxuY2xhc3MgRGlhbGVjdCB7XG4gICAgY29uc3RydWN0b3Ioc291cmNlLCBmbGFncywgZGlzYWJsZWQpIHtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIHRoaXMuZmxhZ3MgPSBmbGFncztcbiAgICAgICAgdGhpcy5kaXNhYmxlZCA9IGRpc2FibGVkO1xuICAgIH1cbiAgICBhbGxvd3ModGVybSkgeyByZXR1cm4gIXRoaXMuZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlZFt0ZXJtXSA9PSAwOyB9XG59XG5jb25zdCBpZCA9IHggPT4geDtcbi8vLyBDb250ZXh0IHRyYWNrZXJzIGFyZSB1c2VkIHRvIHRyYWNrIHN0YXRlZnVsIGNvbnRleHQgKHN1Y2ggYXNcbi8vLyBpbmRlbnRhdGlvbiBpbiB0aGUgUHl0aG9uIGdyYW1tYXIsIG9yIHBhcmVudCBlbGVtZW50cyBpbiB0aGUgWE1MXG4vLy8gZ3JhbW1hcikgbmVlZGVkIGJ5IGV4dGVybmFsIHRva2VuaXplcnMuIFlvdSBkZWNsYXJlIHRoZW0gaW4gYVxuLy8vIGdyYW1tYXIgZmlsZSBhcyBgQGNvbnRleHQgZXhwb3J0TmFtZSBmcm9tIFwibW9kdWxlXCJgLlxuLy8vXG4vLy8gQ29udGV4dCB2YWx1ZXMgc2hvdWxkIGJlIGltbXV0YWJsZSwgYW5kIGNhbiBiZSB1cGRhdGVkIChyZXBsYWNlZClcbi8vLyBvbiBzaGlmdCBvciByZWR1Y2UgYWN0aW9ucy5cbmNsYXNzIENvbnRleHRUcmFja2VyIHtcbiAgICAvLy8gVGhlIGV4cG9ydCB1c2VkIGluIGEgYEBjb250ZXh0YCBkZWNsYXJhdGlvbiBzaG91bGQgYmUgb2YgdGhpc1xuICAgIC8vLyB0eXBlLlxuICAgIGNvbnN0cnVjdG9yKHNwZWMpIHtcbiAgICAgICAgdGhpcy5zdGFydCA9IHNwZWMuc3RhcnQ7XG4gICAgICAgIHRoaXMuc2hpZnQgPSBzcGVjLnNoaWZ0IHx8IGlkO1xuICAgICAgICB0aGlzLnJlZHVjZSA9IHNwZWMucmVkdWNlIHx8IGlkO1xuICAgICAgICB0aGlzLnJldXNlID0gc3BlYy5yZXVzZSB8fCBpZDtcbiAgICAgICAgdGhpcy5oYXNoID0gc3BlYy5oYXNoO1xuICAgICAgICB0aGlzLnN0cmljdCA9IHNwZWMuc3RyaWN0ICE9PSBmYWxzZTtcbiAgICB9XG59XG4vLy8gQSBwYXJzZXIgaG9sZHMgdGhlIHBhcnNlIHRhYmxlcyBmb3IgYSBnaXZlbiBncmFtbWFyLCBhcyBnZW5lcmF0ZWRcbi8vLyBieSBgbGV6ZXItZ2VuZXJhdG9yYC5cbmNsYXNzIFBhcnNlciB7XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGNvbnN0cnVjdG9yKHNwZWMpIHtcbiAgICAgICAgLy8vIEBpbnRlcm5hbFxuICAgICAgICB0aGlzLmJ1ZmZlckxlbmd0aCA9IERlZmF1bHRCdWZmZXJMZW5ndGg7XG4gICAgICAgIC8vLyBAaW50ZXJuYWxcbiAgICAgICAgdGhpcy5zdHJpY3QgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jYWNoZWREaWFsZWN0ID0gbnVsbDtcbiAgICAgICAgaWYgKHNwZWMudmVyc2lvbiAhPSAxMyAvKiBWZXJzaW9uICovKVxuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYFBhcnNlciB2ZXJzaW9uICgke3NwZWMudmVyc2lvbn0pIGRvZXNuJ3QgbWF0Y2ggcnVudGltZSB2ZXJzaW9uICgkezEzIC8qIFZlcnNpb24gKi99KWApO1xuICAgICAgICBsZXQgdG9rZW5BcnJheSA9IGRlY29kZUFycmF5KHNwZWMudG9rZW5EYXRhKTtcbiAgICAgICAgbGV0IG5vZGVOYW1lcyA9IHNwZWMubm9kZU5hbWVzLnNwbGl0KFwiIFwiKTtcbiAgICAgICAgdGhpcy5taW5SZXBlYXRUZXJtID0gbm9kZU5hbWVzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gc3BlYy5jb250ZXh0O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwZWMucmVwZWF0Tm9kZUNvdW50OyBpKyspXG4gICAgICAgICAgICBub2RlTmFtZXMucHVzaChcIlwiKTtcbiAgICAgICAgbGV0IG5vZGVQcm9wcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVOYW1lcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIG5vZGVQcm9wcy5wdXNoKFtdKTtcbiAgICAgICAgZnVuY3Rpb24gc2V0UHJvcChub2RlSUQsIHByb3AsIHZhbHVlKSB7XG4gICAgICAgICAgICBub2RlUHJvcHNbbm9kZUlEXS5wdXNoKFtwcm9wLCBwcm9wLmRlc2VyaWFsaXplKFN0cmluZyh2YWx1ZSkpXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMubm9kZVByb3BzKVxuICAgICAgICAgICAgZm9yIChsZXQgcHJvcFNwZWMgb2Ygc3BlYy5ub2RlUHJvcHMpIHtcbiAgICAgICAgICAgICAgICBsZXQgcHJvcCA9IHByb3BTcGVjWzBdO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgcHJvcFNwZWMubGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dCA9IHByb3BTcGVjW2krK107XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFByb3AobmV4dCwgcHJvcCwgcHJvcFNwZWNbaSsrXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBwcm9wU3BlY1tpICsgLW5leHRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IC1uZXh0OyBqID4gMDsgai0tKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFByb3AocHJvcFNwZWNbaSsrXSwgcHJvcCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB0aGlzLnNwZWNpYWxpemVkID0gbmV3IFVpbnQxNkFycmF5KHNwZWMuc3BlY2lhbGl6ZWQgPyBzcGVjLnNwZWNpYWxpemVkLmxlbmd0aCA6IDApO1xuICAgICAgICB0aGlzLnNwZWNpYWxpemVycyA9IFtdO1xuICAgICAgICBpZiAoc3BlYy5zcGVjaWFsaXplZClcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BlYy5zcGVjaWFsaXplZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlY2lhbGl6ZWRbaV0gPSBzcGVjLnNwZWNpYWxpemVkW2ldLnRlcm07XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVjaWFsaXplcnNbaV0gPSBzcGVjLnNwZWNpYWxpemVkW2ldLmdldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGF0ZXMgPSBkZWNvZGVBcnJheShzcGVjLnN0YXRlcywgVWludDMyQXJyYXkpO1xuICAgICAgICB0aGlzLmRhdGEgPSBkZWNvZGVBcnJheShzcGVjLnN0YXRlRGF0YSk7XG4gICAgICAgIHRoaXMuZ290byA9IGRlY29kZUFycmF5KHNwZWMuZ290byk7XG4gICAgICAgIGxldCB0b3BUZXJtcyA9IE9iamVjdC5rZXlzKHNwZWMudG9wUnVsZXMpLm1hcChyID0+IHNwZWMudG9wUnVsZXNbcl1bMV0pO1xuICAgICAgICB0aGlzLm5vZGVTZXQgPSBuZXcgTm9kZVNldChub2RlTmFtZXMubWFwKChuYW1lLCBpKSA9PiBOb2RlVHlwZS5kZWZpbmUoe1xuICAgICAgICAgICAgbmFtZTogaSA+PSB0aGlzLm1pblJlcGVhdFRlcm0gPyB1bmRlZmluZWQgOiBuYW1lLFxuICAgICAgICAgICAgaWQ6IGksXG4gICAgICAgICAgICBwcm9wczogbm9kZVByb3BzW2ldLFxuICAgICAgICAgICAgdG9wOiB0b3BUZXJtcy5pbmRleE9mKGkpID4gLTEsXG4gICAgICAgICAgICBlcnJvcjogaSA9PSAwLFxuICAgICAgICAgICAgc2tpcHBlZDogc3BlYy5za2lwcGVkTm9kZXMgJiYgc3BlYy5za2lwcGVkTm9kZXMuaW5kZXhPZihpKSA+IC0xXG4gICAgICAgIH0pKSk7XG4gICAgICAgIHRoaXMubWF4VGVybSA9IHNwZWMubWF4VGVybTtcbiAgICAgICAgdGhpcy50b2tlbml6ZXJzID0gc3BlYy50b2tlbml6ZXJzLm1hcCh2YWx1ZSA9PiB0eXBlb2YgdmFsdWUgPT0gXCJudW1iZXJcIiA/IG5ldyBUb2tlbkdyb3VwKHRva2VuQXJyYXksIHZhbHVlKSA6IHZhbHVlKTtcbiAgICAgICAgdGhpcy50b3BSdWxlcyA9IHNwZWMudG9wUnVsZXM7XG4gICAgICAgIHRoaXMubmVzdGVkID0gKHNwZWMubmVzdGVkIHx8IFtdKS5tYXAoKFtuYW1lLCB2YWx1ZSwgZW5kVG9rZW4sIHBsYWNlaG9sZGVyXSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHsgbmFtZSwgdmFsdWUsIGVuZDogbmV3IFRva2VuR3JvdXAoZGVjb2RlQXJyYXkoZW5kVG9rZW4pLCAwKSwgcGxhY2Vob2xkZXIgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZGlhbGVjdHMgPSBzcGVjLmRpYWxlY3RzIHx8IHt9O1xuICAgICAgICB0aGlzLmR5bmFtaWNQcmVjZWRlbmNlcyA9IHNwZWMuZHluYW1pY1ByZWNlZGVuY2VzIHx8IG51bGw7XG4gICAgICAgIHRoaXMudG9rZW5QcmVjVGFibGUgPSBzcGVjLnRva2VuUHJlYztcbiAgICAgICAgdGhpcy50ZXJtTmFtZXMgPSBzcGVjLnRlcm1OYW1lcyB8fCBudWxsO1xuICAgICAgICB0aGlzLm1heE5vZGUgPSB0aGlzLm5vZGVTZXQudHlwZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5kaWFsZWN0ID0gdGhpcy5wYXJzZURpYWxlY3QoKTtcbiAgICAgICAgdGhpcy50b3AgPSB0aGlzLnRvcFJ1bGVzW09iamVjdC5rZXlzKHRoaXMudG9wUnVsZXMpWzBdXTtcbiAgICB9XG4gICAgLy8vIFBhcnNlIGEgZ2l2ZW4gc3RyaW5nIG9yIHN0cmVhbS5cbiAgICBwYXJzZShpbnB1dCwgc3RhcnRQb3MgPSAwLCBjb250ZXh0ID0ge30pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgaW5wdXQgPSBzdHJpbmdJbnB1dChpbnB1dCk7XG4gICAgICAgIGxldCBjeCA9IG5ldyBQYXJzZSh0aGlzLCBpbnB1dCwgc3RhcnRQb3MsIGNvbnRleHQpO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBsZXQgZG9uZSA9IGN4LmFkdmFuY2UoKTtcbiAgICAgICAgICAgIGlmIChkb25lKVxuICAgICAgICAgICAgICAgIHJldHVybiBkb25lO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBTdGFydCBhbiBpbmNyZW1lbnRhbCBwYXJzZS5cbiAgICBzdGFydFBhcnNlKGlucHV0LCBzdGFydFBvcyA9IDAsIGNvbnRleHQgPSB7fSkge1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICBpbnB1dCA9IHN0cmluZ0lucHV0KGlucHV0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJzZSh0aGlzLCBpbnB1dCwgc3RhcnRQb3MsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvLy8gR2V0IGEgZ290byB0YWJsZSBlbnRyeSBAaW50ZXJuYWxcbiAgICBnZXRHb3RvKHN0YXRlLCB0ZXJtLCBsb29zZSA9IGZhbHNlKSB7XG4gICAgICAgIGxldCB0YWJsZSA9IHRoaXMuZ290bztcbiAgICAgICAgaWYgKHRlcm0gPj0gdGFibGVbMF0pXG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGZvciAobGV0IHBvcyA9IHRhYmxlW3Rlcm0gKyAxXTs7KSB7XG4gICAgICAgICAgICBsZXQgZ3JvdXBUYWcgPSB0YWJsZVtwb3MrK10sIGxhc3QgPSBncm91cFRhZyAmIDE7XG4gICAgICAgICAgICBsZXQgdGFyZ2V0ID0gdGFibGVbcG9zKytdO1xuICAgICAgICAgICAgaWYgKGxhc3QgJiYgbG9vc2UpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgICAgIGZvciAobGV0IGVuZCA9IHBvcyArIChncm91cFRhZyA+PiAxKTsgcG9zIDwgZW5kOyBwb3MrKylcbiAgICAgICAgICAgICAgICBpZiAodGFibGVbcG9zXSA9PSBzdGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgICAgIGlmIChsYXN0KVxuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gQ2hlY2sgaWYgdGhpcyBzdGF0ZSBoYXMgYW4gYWN0aW9uIGZvciBhIGdpdmVuIHRlcm1pbmFsIEBpbnRlcm5hbFxuICAgIGhhc0FjdGlvbihzdGF0ZSwgdGVybWluYWwpIHtcbiAgICAgICAgbGV0IGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICAgIGZvciAobGV0IHNldCA9IDA7IHNldCA8IDI7IHNldCsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGF0ZVNsb3Qoc3RhdGUsIHNldCA/IDIgLyogU2tpcCAqLyA6IDEgLyogQWN0aW9ucyAqLyksIG5leHQ7OyBpICs9IDMpIHtcbiAgICAgICAgICAgICAgICBpZiAoKG5leHQgPSBkYXRhW2ldKSA9PSA2NTUzNSAvKiBFbmQgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbaSArIDFdID09IDEgLyogTmV4dCAqLylcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQgPSBkYXRhW2kgPSBwYWlyKGRhdGEsIGkgKyAyKV07XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRhdGFbaSArIDFdID09IDIgLyogT3RoZXIgKi8pXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFpcihkYXRhLCBpICsgMik7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmV4dCA9PSB0ZXJtaW5hbCB8fCBuZXh0ID09IDAgLyogRXJyICovKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFpcihkYXRhLCBpICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzdGF0ZVNsb3Qoc3RhdGUsIHNsb3QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGVzWyhzdGF0ZSAqIDYgLyogU2l6ZSAqLykgKyBzbG90XTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHN0YXRlRmxhZyhzdGF0ZSwgZmxhZykge1xuICAgICAgICByZXR1cm4gKHRoaXMuc3RhdGVTbG90KHN0YXRlLCAwIC8qIEZsYWdzICovKSAmIGZsYWcpID4gMDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGZpbmROZXN0ZWQoc3RhdGUpIHtcbiAgICAgICAgbGV0IGZsYWdzID0gdGhpcy5zdGF0ZVNsb3Qoc3RhdGUsIDAgLyogRmxhZ3MgKi8pO1xuICAgICAgICByZXR1cm4gZmxhZ3MgJiA0IC8qIFN0YXJ0TmVzdCAqLyA/IHRoaXMubmVzdGVkW2ZsYWdzID4+IDEwIC8qIE5lc3RTaGlmdCAqL10gOiBudWxsO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgdmFsaWRBY3Rpb24oc3RhdGUsIGFjdGlvbikge1xuICAgICAgICBpZiAoYWN0aW9uID09IHRoaXMuc3RhdGVTbG90KHN0YXRlLCA0IC8qIERlZmF1bHRSZWR1Y2UgKi8pKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YXRlU2xvdChzdGF0ZSwgMSAvKiBBY3Rpb25zICovKTs7IGkgKz0gMykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSA9PSA2NTUzNSAvKiBFbmQgKi8pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW2kgKyAxXSA9PSAxIC8qIE5leHQgKi8pXG4gICAgICAgICAgICAgICAgICAgIGkgPSBwYWlyKHRoaXMuZGF0YSwgaSArIDIpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PSBwYWlyKHRoaXMuZGF0YSwgaSArIDEpKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBHZXQgdGhlIHN0YXRlcyB0aGF0IGNhbiBmb2xsb3cgdGhpcyBvbmUgdGhyb3VnaCBzaGlmdCBhY3Rpb25zIG9yXG4gICAgLy8vIGdvdG8ganVtcHMuIEBpbnRlcm5hbFxuICAgIG5leHRTdGF0ZXMoc3RhdGUpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGF0ZVNsb3Qoc3RhdGUsIDEgLyogQWN0aW9ucyAqLyk7OyBpICs9IDMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gPT0gNjU1MzUgLyogRW5kICovKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpICsgMV0gPT0gMSAvKiBOZXh0ICovKVxuICAgICAgICAgICAgICAgICAgICBpID0gcGFpcih0aGlzLmRhdGEsIGkgKyAyKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCh0aGlzLmRhdGFbaSArIDJdICYgKDY1NTM2IC8qIFJlZHVjZUZsYWcgKi8gPj4gMTYpKSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gdGhpcy5kYXRhW2kgKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5zb21lKCh2LCBpKSA9PiAoaSAmIDEpICYmIHYgPT0gdmFsdWUpKVxuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh0aGlzLmRhdGFbaV0sIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgb3ZlcnJpZGVzKHRva2VuLCBwcmV2KSB7XG4gICAgICAgIGxldCBpUHJldiA9IGZpbmRPZmZzZXQodGhpcy5kYXRhLCB0aGlzLnRva2VuUHJlY1RhYmxlLCBwcmV2KTtcbiAgICAgICAgcmV0dXJuIGlQcmV2IDwgMCB8fCBmaW5kT2Zmc2V0KHRoaXMuZGF0YSwgdGhpcy50b2tlblByZWNUYWJsZSwgdG9rZW4pIDwgaVByZXY7XG4gICAgfVxuICAgIC8vLyBDb25maWd1cmUgdGhlIHBhcnNlci4gUmV0dXJucyBhIG5ldyBwYXJzZXIgaW5zdGFuY2UgdGhhdCBoYXMgdGhlXG4gICAgLy8vIGdpdmVuIHNldHRpbmdzIG1vZGlmaWVkLiBTZXR0aW5ncyBub3QgcHJvdmlkZWQgaW4gYGNvbmZpZ2AgYXJlXG4gICAgLy8vIGtlcHQgZnJvbSB0aGUgb3JpZ2luYWwgcGFyc2VyLlxuICAgIGNvbmZpZ3VyZShjb25maWcpIHtcbiAgICAgICAgLy8gSGlkZW91cyByZWZsZWN0aW9uLWJhc2VkIGtsdWRnZSB0byBtYWtlIGl0IGVhc3kgdG8gY3JlYXRlIGFcbiAgICAgICAgLy8gc2xpZ2h0bHkgbW9kaWZpZWQgY29weSBvZiBhIHBhcnNlci5cbiAgICAgICAgbGV0IGNvcHkgPSBPYmplY3QuYXNzaWduKE9iamVjdC5jcmVhdGUoUGFyc2VyLnByb3RvdHlwZSksIHRoaXMpO1xuICAgICAgICBpZiAoY29uZmlnLnByb3BzKVxuICAgICAgICAgICAgY29weS5ub2RlU2V0ID0gdGhpcy5ub2RlU2V0LmV4dGVuZCguLi5jb25maWcucHJvcHMpO1xuICAgICAgICBpZiAoY29uZmlnLnRvcCkge1xuICAgICAgICAgICAgbGV0IGluZm8gPSB0aGlzLnRvcFJ1bGVzW2NvbmZpZy50b3BdO1xuICAgICAgICAgICAgaWYgKCFpbmZvKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBJbnZhbGlkIHRvcCBydWxlIG5hbWUgJHtjb25maWcudG9wfWApO1xuICAgICAgICAgICAgY29weS50b3AgPSBpbmZvO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcudG9rZW5pemVycylcbiAgICAgICAgICAgIGNvcHkudG9rZW5pemVycyA9IHRoaXMudG9rZW5pemVycy5tYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gY29uZmlnLnRva2VuaXplcnMuZmluZChyID0+IHIuZnJvbSA9PSB0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm91bmQgPyBmb3VuZC50byA6IHQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKGNvbmZpZy5kaWFsZWN0KVxuICAgICAgICAgICAgY29weS5kaWFsZWN0ID0gdGhpcy5wYXJzZURpYWxlY3QoY29uZmlnLmRpYWxlY3QpO1xuICAgICAgICBpZiAoY29uZmlnLm5lc3RlZClcbiAgICAgICAgICAgIGNvcHkubmVzdGVkID0gdGhpcy5uZXN0ZWQubWFwKG9iaiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29uZmlnLm5lc3RlZCwgb2JqLm5hbWUpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IG9iai5uYW1lLCB2YWx1ZTogY29uZmlnLm5lc3RlZFtvYmoubmFtZV0sIGVuZDogb2JqLmVuZCwgcGxhY2Vob2xkZXI6IG9iai5wbGFjZWhvbGRlciB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGlmIChjb25maWcuc3RyaWN0ICE9IG51bGwpXG4gICAgICAgICAgICBjb3B5LnN0cmljdCA9IGNvbmZpZy5zdHJpY3Q7XG4gICAgICAgIGlmIChjb25maWcuYnVmZmVyTGVuZ3RoICE9IG51bGwpXG4gICAgICAgICAgICBjb3B5LmJ1ZmZlckxlbmd0aCA9IGNvbmZpZy5idWZmZXJMZW5ndGg7XG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgIH1cbiAgICAvLy8gUmV0dXJucyB0aGUgbmFtZSBhc3NvY2lhdGVkIHdpdGggYSBnaXZlbiB0ZXJtLiBUaGlzIHdpbGwgb25seVxuICAgIC8vLyB3b3JrIGZvciBhbGwgdGVybXMgd2hlbiB0aGUgcGFyc2VyIHdhcyBnZW5lcmF0ZWQgd2l0aCB0aGVcbiAgICAvLy8gYC0tbmFtZXNgIG9wdGlvbi4gQnkgZGVmYXVsdCwgb25seSB0aGUgbmFtZXMgb2YgdGFnZ2VkIHRlcm1zIGFyZVxuICAgIC8vLyBzdG9yZWQuXG4gICAgZ2V0TmFtZSh0ZXJtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRlcm1OYW1lcyA/IHRoaXMudGVybU5hbWVzW3Rlcm1dIDogU3RyaW5nKHRlcm0gPD0gdGhpcy5tYXhOb2RlICYmIHRoaXMubm9kZVNldC50eXBlc1t0ZXJtXS5uYW1lIHx8IHRlcm0pO1xuICAgIH1cbiAgICAvLy8gVGhlIGVvZiB0ZXJtIGlkIGlzIGFsd2F5cyBhbGxvY2F0ZWQgZGlyZWN0bHkgYWZ0ZXIgdGhlIG5vZGVcbiAgICAvLy8gdHlwZXMuIEBpbnRlcm5hbFxuICAgIGdldCBlb2ZUZXJtKCkgeyByZXR1cm4gdGhpcy5tYXhOb2RlICsgMTsgfVxuICAgIC8vLyBUZWxscyB5b3Ugd2hldGhlciB0aGlzIGdyYW1tYXIgaGFzIGFueSBuZXN0ZWQgZ3JhbW1hcnMuXG4gICAgZ2V0IGhhc05lc3RlZCgpIHsgcmV0dXJuIHRoaXMubmVzdGVkLmxlbmd0aCA+IDA7IH1cbiAgICAvLy8gVGhlIHR5cGUgb2YgdG9wIG5vZGUgcHJvZHVjZWQgYnkgdGhlIHBhcnNlci5cbiAgICBnZXQgdG9wTm9kZSgpIHsgcmV0dXJuIHRoaXMubm9kZVNldC50eXBlc1t0aGlzLnRvcFsxXV07IH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgZHluYW1pY1ByZWNlZGVuY2UodGVybSkge1xuICAgICAgICBsZXQgcHJlYyA9IHRoaXMuZHluYW1pY1ByZWNlZGVuY2VzO1xuICAgICAgICByZXR1cm4gcHJlYyA9PSBudWxsID8gMCA6IHByZWNbdGVybV0gfHwgMDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHBhcnNlRGlhbGVjdChkaWFsZWN0KSB7XG4gICAgICAgIGlmICh0aGlzLmNhY2hlZERpYWxlY3QgJiYgdGhpcy5jYWNoZWREaWFsZWN0LnNvdXJjZSA9PSBkaWFsZWN0KVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVkRGlhbGVjdDtcbiAgICAgICAgbGV0IHZhbHVlcyA9IE9iamVjdC5rZXlzKHRoaXMuZGlhbGVjdHMpLCBmbGFncyA9IHZhbHVlcy5tYXAoKCkgPT4gZmFsc2UpO1xuICAgICAgICBpZiAoZGlhbGVjdClcbiAgICAgICAgICAgIGZvciAobGV0IHBhcnQgb2YgZGlhbGVjdC5zcGxpdChcIiBcIikpIHtcbiAgICAgICAgICAgICAgICBsZXQgaWQgPSB2YWx1ZXMuaW5kZXhPZihwYXJ0KTtcbiAgICAgICAgICAgICAgICBpZiAoaWQgPj0gMClcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3NbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgbGV0IGRpc2FibGVkID0gbnVsbDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBpZiAoIWZsYWdzW2ldKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IHRoaXMuZGlhbGVjdHNbdmFsdWVzW2ldXSwgaWQ7IChpZCA9IHRoaXMuZGF0YVtqKytdKSAhPSA2NTUzNSAvKiBFbmQgKi87KVxuICAgICAgICAgICAgICAgICAgICAoZGlzYWJsZWQgfHwgKGRpc2FibGVkID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5tYXhUZXJtICsgMSkpKVtpZF0gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZWREaWFsZWN0ID0gbmV3IERpYWxlY3QoZGlhbGVjdCwgZmxhZ3MsIGRpc2FibGVkKTtcbiAgICB9XG4gICAgLy8vICh1c2VkIGJ5IHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlciBnZW5lcmF0b3IpIEBpbnRlcm5hbFxuICAgIHN0YXRpYyBkZXNlcmlhbGl6ZShzcGVjKSB7XG4gICAgICAgIHJldHVybiBuZXcgUGFyc2VyKHNwZWMpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHBhaXIoZGF0YSwgb2ZmKSB7IHJldHVybiBkYXRhW29mZl0gfCAoZGF0YVtvZmYgKyAxXSA8PCAxNik7IH1cbmZ1bmN0aW9uIGZpbmRPZmZzZXQoZGF0YSwgc3RhcnQsIHRlcm0pIHtcbiAgICBmb3IgKGxldCBpID0gc3RhcnQsIG5leHQ7IChuZXh0ID0gZGF0YVtpXSkgIT0gNjU1MzUgLyogRW5kICovOyBpKyspXG4gICAgICAgIGlmIChuZXh0ID09IHRlcm0pXG4gICAgICAgICAgICByZXR1cm4gaSAtIHN0YXJ0O1xuICAgIHJldHVybiAtMTtcbn1cbmZ1bmN0aW9uIGZpbmRGaW5pc2hlZChzdGFja3MpIHtcbiAgICBsZXQgYmVzdCA9IG51bGw7XG4gICAgZm9yIChsZXQgc3RhY2sgb2Ygc3RhY2tzKSB7XG4gICAgICAgIGlmIChzdGFjay5wb3MgPT0gc3RhY2sucC5pbnB1dC5sZW5ndGggJiZcbiAgICAgICAgICAgIHN0YWNrLnAucGFyc2VyLnN0YXRlRmxhZyhzdGFjay5zdGF0ZSwgMiAvKiBBY2NlcHRpbmcgKi8pICYmXG4gICAgICAgICAgICAoIWJlc3QgfHwgYmVzdC5zY29yZSA8IHN0YWNrLnNjb3JlKSlcbiAgICAgICAgICAgIGJlc3QgPSBzdGFjaztcbiAgICB9XG4gICAgcmV0dXJuIGJlc3Q7XG59XG5cbmV4cG9ydCB7IENvbnRleHRUcmFja2VyLCBFeHRlcm5hbFRva2VuaXplciwgUGFyc2VyLCBTdGFjaywgVG9rZW4gfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmVzLmpzLm1hcFxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsInZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xudmFyIF9fZ2VuZXJhdG9yID0gKHRoaXMgJiYgdGhpcy5fX2dlbmVyYXRvcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIGJvZHkpIHtcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xuICAgICAgICB3aGlsZSAoXykgdHJ5IHtcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbn07XG5pbXBvcnQgeyBjb21waWxlIH0gZnJvbSAnLi9jb21waWxlcic7XG5pbXBvcnQgeyBydW53YXRzcmMgfSBmcm9tICcuL3J1bm5lcic7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBmdW5jdGlvbiAoKSB7IHJldHVybiBfX2F3YWl0ZXIodm9pZCAwLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIGRpc3BsYXkoYXJnKSB7XG4gICAgICAgIHZhciBlbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicHJlXCIpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm91dHB1dFwiKS5hcHBlbmRDaGlsZChlbHQpO1xuICAgICAgICBlbHQuaW5uZXJUZXh0ID0gYXJnO1xuICAgIH1cbiAgICB2YXIgbWVtb3J5LCBpbXBvcnRPYmplY3QsIHJ1bkJ1dHRvbiwgdXNlckNvZGU7XG4gICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICBtZW1vcnkgPSBuZXcgV2ViQXNzZW1ibHkuTWVtb3J5KHsgaW5pdGlhbDogMTAsIG1heGltdW06IDEwMCB9KTtcbiAgICAgICAgaW1wb3J0T2JqZWN0ID0ge1xuICAgICAgICAgICAgaW1wb3J0czoge1xuICAgICAgICAgICAgICAgIHByaW50X251bTogZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxvZ2dpbmcgZnJvbSBXQVNNOiBcIiwgYXJnKTtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheShTdHJpbmcoYXJnKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcmludF9ib29sOiBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmcgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXkoXCJGYWxzZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXkoXCJUcnVlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcmludF9ub25lOiBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXkoXCJOb25lXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcHJpbnQ6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2dnaW5nIGZyb20gV0FTTTogXCIsIGFyZyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicHJlXCIpO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm91dHB1dFwiKS5hcHBlbmRDaGlsZChlbHQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBlbHQuaW5uZXJUZXh0ID0gYXJnO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWVtOiBtZW1vcnksXG4gICAgICAgICAgICAgICAgYWJzOiBNYXRoLmFicyxcbiAgICAgICAgICAgICAgICBtYXg6IE1hdGgubWF4LFxuICAgICAgICAgICAgICAgIG1pbjogTWF0aC5taW4sXG4gICAgICAgICAgICAgICAgcG93OiBNYXRoLnBvd1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgcnVuQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJydW5cIik7XG4gICAgICAgIHVzZXJDb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1c2VyLWNvZGVcIik7XG4gICAgICAgIHJ1bkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkgeyByZXR1cm4gX19hd2FpdGVyKHZvaWQgMCwgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwcm9ncmFtLCBvdXRwdXQsIHdhdCwgY29kZSwgcmVzdWx0LCBpMzIsIGksIGVfMTtcbiAgICAgICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKF9hLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW0gPSB1c2VyQ29kZS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3V0cHV0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnRleHRDb250ZW50ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJvZ3JhbTogXCIuY29uY2F0KHByb2dyYW0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hLmxhYmVsID0gMTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgX2EudHJ5cy5wdXNoKFsxLCAzLCAsIDRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhdCA9IGNvbXBpbGUocHJvZ3JhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0ZWQtY29kZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUudGV4dENvbnRlbnQgPSB3YXQud2FzbVNvdXJjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFs0IC8qeWllbGQqLywgcnVud2F0c3JjKHByb2dyYW0sIHsgaW1wb3J0T2JqZWN0OiBpbXBvcnRPYmplY3QgfSldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBfYS5zZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpMzIgPSBuZXcgVWludDMyQXJyYXkobWVtb3J5LmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaTMyW1wiLmNvbmNhdChpLCBcIl06IFwiKS5jb25jYXQoaTMyW2ldKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQudGV4dENvbnRlbnQgKz0gU3RyaW5nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogYmxhY2tcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzMgLypicmVhayovLCA0XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICAgICAgZV8xID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlXzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnRleHRDb250ZW50ID0gU3RyaW5nKGVfMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogcmVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgNF07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDogcmV0dXJuIFsyIC8qcmV0dXJuKi9dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTsgfSk7XG4gICAgICAgIHVzZXJDb2RlLnZhbHVlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwcm9ncmFtXCIpO1xuICAgICAgICB1c2VyQ29kZS5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgZnVuY3Rpb24gKCkgeyByZXR1cm4gX19hd2FpdGVyKHZvaWQgMCwgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInByb2dyYW1cIiwgdXNlckNvZGUudmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTsgfSk7XG4gICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICB9KTtcbn0pOyB9KTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==