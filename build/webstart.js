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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUNBQW1DO0FBQ25DO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0Q0FBNEM7QUFDNUM7QUFDQTtBQUNBLGVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwREFBMEQ7QUFDMUQsd0RBQXdELFNBQVM7QUFDakU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQWlEO0FBQ2pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0RBQStEO0FBQy9EO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUNBO0FBQ0E7QUFDQTtBQUNBLGtEQUFrRCxXQUFXO0FBQzdEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0IsbUJBQW1CO0FBQ2xEO0FBQ0EsZUFBZTtBQUNmO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQSxtQkFBbUI7QUFDbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZTtBQUNmO0FBQ0EsNEJBQTRCO0FBQzVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLGtEQUFVO0FBQzFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrREFBa0Q7QUFDbEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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Q3JILGlGQUFpRixpQkFBaUI7QUFDbEcseURBQXlELGdCQUFnQixRQUFRO0FBQ2pGLCtDQUErQyxnQkFBZ0IsZ0JBQWdCO0FBQy9FO0FBQ0Esa0NBQWtDO0FBQ2xDO0FBQ0E7QUFDQSxVQUFVLFlBQVksYUFBYSxTQUFTLFVBQVU7QUFDdEQsb0NBQW9DLFNBQVM7QUFDN0M7QUFDQTtBQUNxQztBQUNBO0FBQ3JDLDREQUE0RDtBQUM1RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQywyQkFBMkI7QUFDckU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLDBEQUEwRDtBQUMxRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCLGtEQUFPO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBLDZDQUE2QyxrREFBUyxZQUFZLDRCQUE0QjtBQUM5RjtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsUUFBUTtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUyxJQUFJO0FBQ2I7QUFDQSw0REFBNEQ7QUFDNUQ7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVMsSUFBSTtBQUNiO0FBQ0EsS0FBSztBQUNMLENBQUMsSUFBSSIsInNvdXJjZXMiOlsid2VicGFjazovL3dlYi1hc20taml0Ly4vYXN0LnRzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vY29tcGlsZXIudHMiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvLi9wYXJzZXIudHMiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvLi9ydW5uZXIudHMiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvLi90eXBlY2hlY2sudHMiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvZXh0ZXJuYWwgdmFyIFwid2FidFwiIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vbm9kZV9tb2R1bGVzL2xlemVyLXB5dGhvbi9kaXN0L2luZGV4LmVzLmpzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vbm9kZV9tb2R1bGVzL2xlemVyLXRyZWUvZGlzdC90cmVlLmVzLmpzIiwid2VicGFjazovL3dlYi1hc20taml0Ly4vbm9kZV9tb2R1bGVzL2xlemVyL2Rpc3QvaW5kZXguZXMuanMiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3dlYi1hc20taml0L3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vd2ViLWFzbS1qaXQvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly93ZWItYXNtLWppdC8uL3dlYnN0YXJ0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB2YXIgQmluT3A7XG4oZnVuY3Rpb24gKEJpbk9wKSB7XG4gICAgQmluT3BbXCJQbHVzXCJdID0gXCIrXCI7XG4gICAgQmluT3BbXCJNaW51c1wiXSA9IFwiLVwiO1xuICAgIEJpbk9wW1wiTXVsXCJdID0gXCIqXCI7XG4gICAgQmluT3BbXCJEaXZcIl0gPSBcIi8vXCI7XG4gICAgQmluT3BbXCJNb2RcIl0gPSBcIiVcIjtcbiAgICBCaW5PcFtcIkVxXCJdID0gXCI9PVwiO1xuICAgIEJpbk9wW1wiTmVxXCJdID0gXCIhPVwiO1xuICAgIEJpbk9wW1wiU2VxXCJdID0gXCI8PVwiO1xuICAgIEJpbk9wW1wiTGVxXCJdID0gXCI+PVwiO1xuICAgIEJpbk9wW1wiU21sXCJdID0gXCI8XCI7XG4gICAgQmluT3BbXCJMcmdcIl0gPSBcIj5cIjtcbiAgICBCaW5PcFtcIklzXCJdID0gXCJpc1wiO1xufSkoQmluT3AgfHwgKEJpbk9wID0ge30pKTtcbmV4cG9ydCB2YXIgVW5pT3A7XG4oZnVuY3Rpb24gKFVuaU9wKSB7XG4gICAgVW5pT3BbXCJNaW51c1wiXSA9IFwiLVwiO1xuICAgIFVuaU9wW1wiTm90XCJdID0gXCJub3RcIjtcbn0pKFVuaU9wIHx8IChVbmlPcCA9IHt9KSk7XG4iLCJ2YXIgX19hc3NpZ24gPSAodGhpcyAmJiB0aGlzLl9fYXNzaWduKSB8fCBmdW5jdGlvbiAoKSB7XG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKVxuICAgICAgICAgICAgICAgIHRbcF0gPSBzW3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0O1xuICAgIH07XG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xudmFyIF9fc3ByZWFkQXJyYXkgPSAodGhpcyAmJiB0aGlzLl9fc3ByZWFkQXJyYXkpIHx8IGZ1bmN0aW9uICh0bywgZnJvbSwgcGFjaykge1xuICAgIGlmIChwYWNrIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIGZvciAodmFyIGkgPSAwLCBsID0gZnJvbS5sZW5ndGgsIGFyOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmIChhciB8fCAhKGkgaW4gZnJvbSkpIHtcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XG4gICAgICAgICAgICBhcltpXSA9IGZyb21baV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRvLmNvbmNhdChhciB8fCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tKSk7XG59O1xuaW1wb3J0IHsgQmluT3AsIFVuaU9wIH0gZnJvbSAnLi9hc3QnO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiLi9wYXJzZXJcIjtcbmltcG9ydCB7IHR5cGVDaGVja1Byb2dyYW0gfSBmcm9tIFwiLi90eXBlY2hlY2tcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbXB0eUxvY2FsRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHZhcnM6IG5ldyBNYXAoKSxcbiAgICAgICAgaXNGdW5jOiBmYWxzZSxcbiAgICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5R2xvYmFsRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHZhcnM6IG5ldyBNYXAoKSxcbiAgICAgICAgZnVuY3M6IG5ldyBNYXAoKSxcbiAgICAgICAgY2xhc3NJbmRleGVzOiBuZXcgTWFwKCksXG4gICAgICAgIGNsYXNzSW5pdHM6IG5ldyBNYXAoKSxcbiAgICAgICAgbG9vcERlcHRoOiAwXG4gICAgfTtcbn1cbi8vIHNldCB1cCBnbG9iYWwgdmFyaWFibGVzIGFuZCBnbG9iYWwgZnVuY3Rpb25zXG5leHBvcnQgZnVuY3Rpb24gc2V0R2xvYmFsSW5mbyhwcm9ncmFtKSB7XG4gICAgdmFyIGdsb2JhbEVudiA9IGNyZWF0ZUVtcHR5R2xvYmFsRW52KCk7XG4gICAgLy8gc2V0IHZhcmlhYmxlc1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHByb2dyYW0udmFySW5pdHMubGVuZ3RoOyArK2lkeCkge1xuICAgICAgICBnbG9iYWxFbnYudmFycy5zZXQocHJvZ3JhbS52YXJJbml0c1tpZHhdLm5hbWUsIHByb2dyYW0udmFySW5pdHNbaWR4XSk7XG4gICAgfVxuICAgIC8vIHNldCBmdW5jc3Rpb25zXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgcHJvZ3JhbS5mdW5jRGVmcy5sZW5ndGg7ICsraWR4KSB7XG4gICAgICAgIGdsb2JhbEVudi5mdW5jcy5zZXQocHJvZ3JhbS5mdW5jRGVmc1tpZHhdLm5hbWUsIHByb2dyYW0uZnVuY0RlZnNbaWR4XSk7XG4gICAgfVxuICAgIC8vIHNldCBjbGFzcyBmaWVsZCBpbmRleGVzIGFuZCBpbml0IHZhbHVlXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgcHJvZ3JhbS5jbGFzc0RlZnMubGVuZ3RoOyBpZHgrKykge1xuICAgICAgICB2YXIgY2xhc3NJbmRleGVzID0gbmV3IE1hcCgpO1xuICAgICAgICB2YXIgY2xhc3NJbml0cyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdmFyIGNsYXNzRGVmID0gcHJvZ3JhbS5jbGFzc0RlZnNbaWR4XTtcbiAgICAgICAgaWYgKGNsYXNzRGVmLnRhZyAhPT0gXCJjbGFzc1wiKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcInNob3VsZCBiZSBhIGNsYXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmaWVsZHMgPSBjbGFzc0RlZi5maWVsZHM7XG4gICAgICAgIGZvciAodmFyIGlkeDIgPSAwOyBpZHgyIDwgZmllbGRzLmxlbmd0aDsgaWR4MisrKSB7XG4gICAgICAgICAgICBjbGFzc0luZGV4ZXMuc2V0KGZpZWxkc1tpZHgyXS5uYW1lLCBpZHgyKTtcbiAgICAgICAgICAgIGNsYXNzSW5pdHMuc2V0KGZpZWxkc1tpZHgyXS5uYW1lLCBmaWVsZHNbaWR4Ml0uaW5pdExpdGVyYWwpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjbGFzc05hbWUgPSBjbGFzc0RlZi5uYW1lO1xuICAgICAgICBnbG9iYWxFbnYuY2xhc3NJbmRleGVzLnNldChjbGFzc05hbWUsIGNsYXNzSW5kZXhlcyk7XG4gICAgICAgIGdsb2JhbEVudi5jbGFzc0luaXRzLnNldChjbGFzc05hbWUsIGNsYXNzSW5pdHMpO1xuICAgIH1cbiAgICByZXR1cm4gZ2xvYmFsRW52O1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUoc291cmNlKSB7XG4gICAgLy8gcGFyc2UgcHJvZ3JhbSBhbmQgZ2V0IGVhY2ggZWxlbWVudHNcbiAgICB2YXIgcHJvZ3JhbSA9IHR5cGVDaGVja1Byb2dyYW0ocGFyc2Uoc291cmNlKSk7XG4gICAgdmFyIGFzdCA9IHByb2dyYW0uc3RtdHM7XG4gICAgdmFyIGdsb2JhbEVudiA9IHNldEdsb2JhbEluZm8ocHJvZ3JhbSk7XG4gICAgLy8gZ2VuZXJhdGUgZnVuY3Rpb24gZGVmaW5pdGlvbnNcbiAgICB2YXIgZnVuY3MgPSBwcm9ncmFtLmZ1bmNEZWZzLm1hcChmdW5jdGlvbiAoZnVuY0RlZikge1xuICAgICAgICByZXR1cm4gY29kZUdlbkZ1bmNEZWYoZnVuY0RlZiwgZ2xvYmFsRW52KTtcbiAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAvLyBnZW5lcmF0ZSBnbG9iYWwgdmFyaWFibGVzIChpbmNsdWRpbmcgdGhlIGhlYXApXG4gICAgdmFyIGdsb2JhbFZhcnMgPSBjb2RlR2VuR2xvYmFsVmFyKHByb2dyYW0udmFySW5pdHMpLmpvaW4oJ1xcbicpO1xuICAgIC8vIGdlbmVyYXRlIGNsYXNzIGRlZmluaXRpb25zXG4gICAgdmFyIGNsYXNzZXMgPSBwcm9ncmFtLmNsYXNzRGVmcy5tYXAoZnVuY3Rpb24gKGNsYXNzRGVmKSB7XG4gICAgICAgIHJldHVybiBjb2RlR2VuQ2xhc3NEZWYoY2xhc3NEZWYsIGdsb2JhbEVudik7IC8vIG5vdCBzdXJlIHdoeSBpdHMgcmV0dXJuIGlzIHN0cmluZ3BbXVxuICAgIH0pLmpvaW4oXCJcXG5cIik7XG4gICAgLy8gY3JlYXRlIGFuIGVtcHR5IGxvY2FsIGVudmlyb25tZW50XG4gICAgdmFyIGxvY2FsRW52ID0gY3JlYXRlRW1wdHlMb2NhbEVudigpO1xuICAgIC8vIGdlbmVyYXRlIHRoZSBjb2RlIGZvciB0aGUgbWFpbiBib2R5XG4gICAgdmFyIGNvbW1hbmRzID0gY29kZUdlbk1haW5Cb2R5KGFzdCwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgLy8gY29uc29sZS5sb2coY29tbWFuZHMpO1xuICAgIC8vIHNldCB1cCBmaW5hbCBmdW5jdGlvbiByZXR1cm4gdHlwZVxuICAgIHZhciBsYXN0RXhwciA9IGFzdFthc3QubGVuZ3RoIC0gMV07XG4gICAgdmFyIHJldHVyblR5cGUgPSBcIlwiO1xuICAgIHZhciByZXR1cm5FeHByID0gXCJcIjtcbiAgICAvLyBjb25zb2xlLmxvZyhgYXN0Lmxlbmd0aDogJHthc3QubGVuZ3RofSwgbGFzdEV4cHI6ICR7bGFzdEV4cHIudGFnfWApO1xuICAgIGlmIChhc3QubGVuZ3RoID4gMCAmJiBsYXN0RXhwci50YWcgPT09IFwiZXhwclwiKSB7XG4gICAgICAgIHJldHVyblR5cGUgPSBcIihyZXN1bHQgaTMyKVwiO1xuICAgICAgICByZXR1cm5FeHByID0gXCJcXG4obG9jYWwuZ2V0ICRsYXN0KVwiOyAvLyBTaW5jZSB3ZSB1c2UgYSBmdW5jdGlvbiBhdCB0aGUgZW5kLCB3ZSBuZWVkIHRvIHB1dCB0aGUgcmV0dXJuIHZhbHVlIGluIHRoZSBzdGFjay5cbiAgICB9XG4gICAgLy8gVGhlIGxhc3QgdmFsdWUgaXMgbm90IG5lZWRlZCBpZiB0aGUgbGFzdCBzdGF0ZW1lbnQgaXMgbm90IGFuIGV4cHJlc3Npb24uXG4gICAgcmV0dXJuIHtcbiAgICAgICAgd2FzbVNvdXJjZTogXCJcIi5jb25jYXQoZ2xvYmFsVmFycywgXCJcXG5cIikuY29uY2F0KGNsYXNzZXMsIFwiXFxuXCIpLmNvbmNhdChmdW5jcywgXCJcXG4oZnVuYyAoZXhwb3J0IFxcXCJleHBvcnRlZF9mdW5jXFxcIikgXCIpLmNvbmNhdChyZXR1cm5UeXBlKS5jb25jYXQoY29tbWFuZHMuam9pbignXFxuJykpLmNvbmNhdChyZXR1cm5FeHByLCBcIilcIilcbiAgICB9O1xufVxuLy8gZ2VuZXJhdGUgY29kZXMgZm9yIHN0YXRlbWVudHNcbmZ1bmN0aW9uIGNvZGVHZW4oc3RtdCwgZ2xvYmFsRW52LCBsb2NhbEVudikge1xuICAgIHN3aXRjaCAoc3RtdC50YWcpIHtcbiAgICAgICAgY2FzZSBcImFzc2lnblwiOlxuICAgICAgICAgICAgdmFyIHZhbFN0bXRzID0gY29kZUdlbkV4cHIoc3RtdC52YWx1ZSwgZ2xvYmFsRW52LCBsb2NhbEVudik7IC8vIHJoc1xuICAgICAgICAgICAgdmFyIGxlZnRFeHByID0gY29kZUdlbkV4cHIoc3RtdC5uYW1lLCBnbG9iYWxFbnYsIGxvY2FsRW52KTsgLy8gbGhzXG4gICAgICAgICAgICAvLyBnZW5lcmF0ZSB0aGUgXCJzdG9yZVwiIGFzc2lnbiBjb2RlXG4gICAgICAgICAgICBpZiAoc3RtdC5uYW1lLnRhZyA9PSBcImdldGZpZWxkXCIpIHtcbiAgICAgICAgICAgICAgICBsZWZ0RXhwciA9IGxlZnRFeHByLnNsaWNlKDAsIC0xKTsgLy8gc3RyaXAgYGkzMi5sb2FkYCBzaW5jZSBpdCdzIGxoc1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0RXhwci5jb25jYXQoW3ZhbFN0bXRzICsgXCJcXG5pMzIuc3RvcmVcIl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7IC8vIGdlbmVyYXRlIHRoZSBcInNldFwiIGFzc2lnbiBjb2RlXG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsRW52LmlzRnVuYykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxFbnYudmFycy5oYXMoc3RtdC52YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWxTdG10cy5jb25jYXQoW1wiKGxvY2FsLnNldCAkXCIuY29uY2F0KHN0bXQubmFtZSwgXCIpXCIpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgY2Fubm90IGFzc2lnbiBhIHZhbHVlIHRvIGEgZ2xvYmFsIHZhcmlhYmxlIGluIHRoZSBmdW5jdGlvbiBlbnZpcm9ubWVudC5cbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGdsb2JhbCB2YXJpYWJsZSBcIi5jb25jYXQoc3RtdC52YXJpYWJsZSwgXCIgY2Fubm90IGJlIGFzc2lnbmVkIGluIGEgZnVuY3Rpb25cIikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWxTdG10cy5jb25jYXQoW1wiKGdsb2JhbC5zZXQgJFwiLmNvbmNhdChzdG10LnZhcmlhYmxlLCBcIilcIildKTsgLy8gZ2xvYmFsIGVudmlyb25tZW50XG4gICAgICAgIGNhc2UgXCJleHByXCI6XG4gICAgICAgICAgICB2YXIgZXhwclN0bXRzID0gY29kZUdlbkV4cHIoc3RtdC5leHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHJldHVybiBleHByU3RtdHMuY29uY2F0KFtcIihsb2NhbC5zZXQgJGxhc3QpXCJdKTtcbiAgICAgICAgLy8gV2l0aG91dCB0aGUgcmV0dXJuIGNvbW1hbmQsIHRoZSBmdW5jdGlvbiB3b3VsZCByZXR1cm4gdGhlIHZhbHVlcyBpbiB0aGUgc3RhY2suXG4gICAgICAgIC8vIEhvd2V2ZXIsIHdlIHdvdWxkIG5lZWQgdG8gbWFrZSBzdXJlIHRoZSAjc3RhY2sgZWxlbWVudHMgPT0gI3JldHVybiB2YWx1ZXNcbiAgICAgICAgY2FzZSBcInJldHVyblwiOlxuICAgICAgICAgICAgdmFyIHJldHVyblN0bXRzID0gY29kZUdlbkV4cHIoc3RtdC5leHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHJldHVyblN0bXRzLnB1c2goXCIocmV0dXJuKVwiKTtcbiAgICAgICAgICAgIHJldHVybiByZXR1cm5TdG10cztcbiAgICAgICAgY2FzZSBcInBhc3NcIjpcbiAgICAgICAgICAgIHJldHVybiBbXCJub3BcIl07IC8vIG5vIG9wZXJhdGlvblxuICAgICAgICBjYXNlIFwid2hpbGVcIjpcbiAgICAgICAgICAgIHZhciB3aGlsZVN0bXRzID0gY29kZUdlbldoaWxlKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICAgICAgcmV0dXJuIHdoaWxlU3RtdHMuY29uY2F0KCk7XG4gICAgICAgIGNhc2UgXCJpZlwiOlxuICAgICAgICAgICAgdmFyIGlmU3RtdHMgPSBjb2RlR2VuSWYoc3RtdCwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICByZXR1cm4gaWZTdG10cy5jb25jYXQoKTtcbiAgICB9XG59XG5mdW5jdGlvbiBjb2RlR2VuTWFpbkJvZHkoc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICAvLyBkZWNsYXJlIGFsbCBsb2NhbCB2YXJpYWJsZXMgYWNjb3JkaW5nIHRvIHRoZSBzb3VyY2VcbiAgICB2YXIgc2NyYXRjaFZhciA9IFwiKGxvY2FsICRsYXN0IGkzMilcIjsgLy8gYXMgZnVuY3Rpb24gb3V0cHV0XG4gICAgLy8gcHV0ICRsYXN0IG9uIHRoZSBzdGFjaywgYW5kIGl0IHdpbCBjb25zdW1lIHRoZSB0b3AgdmFsdWUgb24gdGhlIHN0YWNrIGV2ZW50dWFsbHlcbiAgICB2YXIgbG9jYWxEZWZpbmVzID0gW3NjcmF0Y2hWYXJdO1xuICAgIHZhciBjb21tYW5kR3JvdXBzID0gc3RtdHMubWFwKGZ1bmN0aW9uIChzdG10KSB7IHJldHVybiBjb2RlR2VuKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpOyB9KTtcbiAgICByZXR1cm4gbG9jYWxEZWZpbmVzLmNvbmNhdChbXS5jb25jYXQuYXBwbHkoW10sIGNvbW1hbmRHcm91cHMpKTtcbn1cbmZ1bmN0aW9uIGNvZGVHZW5FeHByKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICBzd2l0Y2ggKGV4cHIudGFnKSB7XG4gICAgICAgIGNhc2UgXCJpZFwiOlxuICAgICAgICAgICAgcmV0dXJuIFtjb2RlR2VuSWQoZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudildO1xuICAgICAgICBjYXNlIFwiYmlub3BcIjpcbiAgICAgICAgICAgIHZhciBsZWZ0U3RtdHMgPSBjb2RlR2VuRXhwcihleHByLmxlZnQsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgICAgICAgICAgdmFyIHJpZ2h0U3RtdHMgPSBjb2RlR2VuRXhwcihleHByLnJpZ2h0LCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHZhciBvcFN0bXQgPSBjb2RlR2VuQmluT3AoZXhwci5vcCk7XG4gICAgICAgICAgICByZXR1cm4gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KF9fc3ByZWFkQXJyYXkoW10sIGxlZnRTdG10cywgdHJ1ZSksIHJpZ2h0U3RtdHMsIHRydWUpLCBbb3BTdG10XSwgZmFsc2UpO1xuICAgICAgICBjYXNlIFwidW5pb3BcIjpcbiAgICAgICAgICAgIHZhciB1bmlvcFJpZ2h0ID0gY29kZUdlbkV4cHIoZXhwci5leHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICAgICAgICAgIHJldHVybiBjb2RlR2VuVW5pb25PcChleHByLm9wLCB1bmlvcFJpZ2h0KTtcbiAgICAgICAgY2FzZSBcImxpdGVyYWxcIjpcbiAgICAgICAgICAgIHJldHVybiBbY29kZUdlbkxpdGVyYWwoZXhwci5saXRlcmFsKV07XG4gICAgICAgIGNhc2UgXCJjYWxsXCI6XG4gICAgICAgICAgICByZXR1cm4gY29kZUdlbkNhbGwoZXhwciwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgIGNhc2UgXCJtZXRob2RcIjpcbiAgICAgICAgICAgIC8vIGNvbnN0IG9iakFkZHIgPSBjb2RlR2VuRXhwcihleHByLm9iaiwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgICAgICAvLyBjb25zdCBjaGVja1ZhbGlkQWRkcmVzcyA9IFsuLi5vYmpBZGRyLCBgKGkzMi5jb25zdCAtNCkgXFxuKGkzMi5hZGQpYCwgYChpMzIubG9hZClgLCBgbG9jYWwuc2V0ICRsYXN0YF07IC8vIGMgOiBSYXQgPSBOb25lLCBjLnhcbiAgICAgICAgICAgIHZhciBhcmdJbnN0cnMgPSBleHByLmFyZ3MubWFwKGZ1bmN0aW9uIChhKSB7IHJldHVybiBjb2RlR2VuRXhwcihhLCBnbG9iYWxFbnYsIGxvY2FsRW52KTsgfSk7XG4gICAgICAgICAgICB2YXIgZmxhdHRlbkFyZ3NfMSA9IFtdOyAvLyBmbGF0IHRoZSBsaXN0IG9mIGxpc3RzXG4gICAgICAgICAgICBhcmdJbnN0cnMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7IHJldHVybiBmbGF0dGVuQXJnc18xLnB1c2goYXJnLmpvaW4oXCJcXG5cIikpOyB9KTtcbiAgICAgICAgICAgIGlmIChleHByLm9iai5hID09IFwiaW50XCIgfHwgZXhwci5vYmouYSA9PSBcImJvb2xcIiB8fCBleHByLm9iai5hID09IFwiTm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJUaGlzIHNob3VsZCBiZSBhIGNsYXNzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFRoZSBjYWxsIG9iamVjdCBpcyB0aGUgZmlyc3QgYXJndW1lbnQgc2VsZi5cbiAgICAgICAgICAgIHZhciBjYWxsT2JqZWN0ID0gY29kZUdlbkV4cHIoZXhwci5vYmosIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oXCJcXG5cIik7XG4gICAgICAgICAgICByZXR1cm4gW2NhbGxPYmplY3QsIGZsYXR0ZW5BcmdzXzEuam9pbihcIlxcblwiKSwgXCJcXG4oY2FsbCAkJFwiLmNvbmNhdChleHByLm9iai5hLmNsYXNzLCBcIiRcIikuY29uY2F0KGV4cHIubmFtZSwgXCIpXCIpXTtcbiAgICAgICAgY2FzZSBcImdldGZpZWxkXCI6XG4gICAgICAgICAgICByZXR1cm4gY29kZUdlbkZpZWxkKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNvZGVHZW5CaW5PcChvcCkge1xuICAgIHN3aXRjaCAob3ApIHtcbiAgICAgICAgY2FzZSBCaW5PcC5QbHVzOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5hZGQpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuTWludXM6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLnN1YilcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5NdWw6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLm11bClcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5EaXY6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmRpdl9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLk1vZDpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIucmVtX3MpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuRXE6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmVxKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLk5lcTpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIubmUpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuU2VxOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5sZV9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLkxlcTpcbiAgICAgICAgICAgIHJldHVybiBcIihpMzIuZ2VfcylcIjtcbiAgICAgICAgY2FzZSBCaW5PcC5TbWw6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmx0X3MpXCI7XG4gICAgICAgIGNhc2UgQmluT3AuTHJnOlxuICAgICAgICAgICAgcmV0dXJuIFwiKGkzMi5ndF9zKVwiO1xuICAgICAgICBjYXNlIEJpbk9wLklzOlxuICAgICAgICAgICAgLy8geCBpcyB5IFxuICAgICAgICAgICAgLy8gZS5nLiB5IGlzIGEgY2xhc3MgYW5kIHggaXMgYW4gb2JqZWN0IG9mIHRoYXQgY2xhc3NcbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSwgdGhlIG9ubHkgY2xhc3MgaXMgTm9uZSwgc28gd2UgY2FuIHVzZSBlcVxuICAgICAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKFwiQ09NUElMRSBFUlJPUjogaXMgb3BlcmF0b3Igbm90IGltcGxlbWVudGVkXCIpXG4gICAgICAgICAgICAvLyBGb3Igb3RoZXIgY2xhc3Nlcywgd2Ugc2hvdWxkIGNvbXBhcmUgdGhlIGZpZWxkIHJlY3Vyc2l2ZWx5LlxuICAgICAgICAgICAgLy8gSW4gQ2hvY29weSwgXCJpc1wiIGlzIHVzZWQgdG8gY29tcGFyZSB0aGUgZmllbGRzIGluIHR3byBjbGFzcyBvYmplY3RzLCBhbmQgXCI9PVwiIGNhbm5vdCBiZSB1c2VkIHdpdGggY2xhc3Nlcy4gXG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmVxKVwiO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNvZGVHZW5Vbmlvbk9wKG9wLCByaWdodCkge1xuICAgIHN3aXRjaCAob3ApIHtcbiAgICAgICAgY2FzZSBVbmlPcC5NaW51czpcbiAgICAgICAgICAgIHJldHVybiBfX3NwcmVhZEFycmF5KF9fc3ByZWFkQXJyYXkoW1wiKGkzMi5jb25zdCAwKVwiXSwgcmlnaHQsIHRydWUpLCBbXCIoaTMyLnN1YikgXCJdLCBmYWxzZSk7IC8vIC14ID0gMCAtIHhcbiAgICAgICAgY2FzZSBVbmlPcC5Ob3Q6XG4gICAgICAgICAgICByZXR1cm4gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCByaWdodCwgdHJ1ZSksIFtcIihpMzIuZXF6KVwiXSwgZmFsc2UpOyAvLyBpcyB4ICE9IDAsIHJldHVybiAxOyBlbHNlLCByZXR1cm4gMFxuICAgIH1cbn1cbmZ1bmN0aW9uIGNvZGVHZW5JZihzdG10LCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKHN0bXQudGFnICE9PSAnaWYnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNPTVBJTEUgRVJST1I6IHRoZSBpbnB1dCB0byBjb2RlR2VuSWYgc2hvdWxkIGhhdmUgdGFnIGlmXCIpO1xuICAgIH1cbiAgICB2YXIgaWZDb25kID0gY29kZUdlbkV4cHIoc3RtdC5pZk9wLmNvbmQsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgIHZhciBpZkJvZHkgPSBjb2RlR2VuQm9keShzdG10LmlmT3Auc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgIHZhciBlbGlmQ29uZCA9IFwiKGkzMi5jb25zdCAwKVwiO1xuICAgIHZhciBlbGlmQm9keSA9IFwibm9wXCI7XG4gICAgdmFyIGVsc2VCb2R5ID0gXCJub3BcIjtcbiAgICAvLyBoYXMgZWxzZSBpZlxuICAgIGlmIChzdG10LmVsaWZPcC5jb25kICE9PSBudWxsKSB7XG4gICAgICAgIGVsaWZDb25kID0gY29kZUdlbkV4cHIoc3RtdC5lbGlmT3AuY29uZCwgZ2xvYmFsRW52LCBsb2NhbEVudikuam9pbignXFxuJyk7XG4gICAgICAgIGVsaWZCb2R5ID0gY29kZUdlbkJvZHkoc3RtdC5lbGlmT3Auc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICBpZiAoc3RtdC5lbHNlT3Auc3RtdHMgIT09IG51bGwpIHtcbiAgICAgICAgZWxzZUJvZHkgPSBjb2RlR2VuQm9keShzdG10LmVsc2VPcC5zdG10cywgZ2xvYmFsRW52LCBsb2NhbEVudikuam9pbignXFxuJyk7XG4gICAgfVxuICAgIHJldHVybiBbXCJcIi5jb25jYXQoaWZDb25kLCBcIlxcbihpZlxcbih0aGVuXFxuXCIpLmNvbmNhdChpZkJvZHksIFwiXFxuKVxcbihlbHNlXFxuXCIpLmNvbmNhdChlbGlmQ29uZCwgXCJcXG4oaWZcXG4odGhlblxcblwiKS5jb25jYXQoZWxpZkJvZHksIFwiXFxuKVxcbihlbHNlXFxuXCIpLmNvbmNhdChlbHNlQm9keSwgXCJcXG4pKSkpXCIpXTtcbn1cbi8vIGdlbmVyYXRlIHRoZSBjb2RlcyBmb3Igc3RhdGVtZW50c1xuZnVuY3Rpb24gY29kZUdlbkJvZHkoc3RtdHMsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICB2YXIgYm9keSA9IHN0bXRzLm1hcChmdW5jdGlvbiAocykge1xuICAgICAgICB2YXIgYiA9IGNvZGVHZW4ocywgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgICAgIHJldHVybiBiLmpvaW4oJ1xcbicpO1xuICAgIH0pO1xuICAgIHJldHVybiBib2R5O1xufVxuZnVuY3Rpb24gY29kZUdlbldoaWxlKHN0bXQsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICBpZiAoc3RtdC50YWcgIT09IFwid2hpbGVcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDT01QSUxFIEVSUk9SOiBjb2RlR2VuV2hpbGUgdGFrZXMgb25seSB3aGlsZSBzdGF0ZW1lbnQgYXMgaW5wdXRcIik7XG4gICAgfVxuICAgIC8vIHRocm93IG5ldyBFcnJvcihcIkNPTVBJTEUgRVJST1I6IHdoaWxlIGhhcyBub3QgYmVlbiBpbXBsZW1lbnRlZCB5ZXRcIik7XG4gICAgdmFyIGxvb3BJZCA9IChnbG9iYWxFbnYubG9vcERlcHRoKyspO1xuICAgIC8vIGNvbW1hbmQgYm9keVxuICAgIHZhciBib2R5ID0gY29kZUdlbkJvZHkoc3RtdC5zdG10cywgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgLy8gY29uZGl0aW9uIFxuICAgIHZhciBjb25kID0gY29kZUdlbkV4cHIoc3RtdC5jb25kLCBnbG9iYWxFbnYsIGxvY2FsRW52KTtcbiAgICBnbG9iYWxFbnYubG9vcERlcHRoLS07XG4gICAgcmV0dXJuIFtcIihsb29wIFxcblwiLmNvbmNhdChib2R5LmpvaW4oJ1xcbicpLCBcIlxcblwiKS5jb25jYXQoY29uZC5qb2luKCdcXG4nKSwgXCJcXG5icl9pZiBcIikuY29uY2F0KGxvb3BJZCwgXCIpXCIpXTtcbn1cbmZ1bmN0aW9uIGNvZGVHZW5GaWVsZChleHByLCBnbG9iYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9PSAnZ2V0ZmllbGQnKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiQ09NUElMRVIgRVJST1I6IFRoZSBpbnB1dCBleHByZXNzaW9uIHRvIGNvZGVHZW5DYWxsIHNob3VsZCBiZSBnZXRmaWVsZC5cIik7XG4gICAgfVxuICAgIGlmIChleHByLm9iai5hID09PSBcImludFwiIHx8IGV4cHIub2JqLmEgPT09IFwiYm9vbFwiIHx8IGV4cHIub2JqLmEgPT09IFwiTm9uZVwiKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiQ09NUElMRVIgRVJST1I6IFRoZSBvYmplY3Qgc2hvdWxkIGJlIGEgY2xhc3MuXCIpO1xuICAgIH1cbiAgICAvLyBJZiBpdCBpcyBhbiBpbnN0YW5jZSwgaXQgc2hvdWxkIHJldHVybiBpdHMgYWRkcmVzcywgZXguIChnbG9iYWwuZ2V0ICRyMSkuXG4gICAgdmFyIG9iakFkZHIgPSBjb2RlR2VuRXhwcihleHByLm9iaiwgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgdmFyIGNoZWNrVmFsaWRBZGRyZXNzID0gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBvYmpBZGRyLCB0cnVlKSwgW1wiKGkzMi5jb25zdCAtNCkgXFxuKGkzMi5hZGQpXCIsIFwiKGkzMi5sb2FkKVwiLCBcImxvY2FsLnNldCAkbGFzdFwiXSwgZmFsc2UpOyAvLyBjIDogUmF0ID0gTm9uZSwgYy54XG4gICAgdmFyIGNsYXNzSW5kZXhlcyA9IGdsb2JhbEVudi5jbGFzc0luZGV4ZXMuZ2V0KGV4cHIub2JqLmEuY2xhc3MpO1xuICAgIHZhciBpbmRleE9mRmllbGQgPSBjbGFzc0luZGV4ZXMuZ2V0KGV4cHIubmFtZSk7XG4gICAgcmV0dXJuIF9fc3ByZWFkQXJyYXkoX19zcHJlYWRBcnJheShbY2hlY2tWYWxpZEFkZHJlc3Muam9pbihcIlxcblwiKV0sIG9iakFkZHIsIHRydWUpLCBbXCIoaTMyLmNvbnN0IFwiLmNvbmNhdChpbmRleE9mRmllbGQgKiA0LCBcIikgXFxuKGkzMi5hZGQpXCIpLCBcIihpMzIubG9hZClcIl0sIGZhbHNlKTtcbn1cbmZ1bmN0aW9uIGNvZGVHZW5DYWxsKGV4cHIsIGdsb2JhbEVudiwgbG9jYWxFbnYpIHtcbiAgICBpZiAoZXhwci50YWcgIT09IFwiY2FsbFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNPTVBJTEVSIEVSUk9SOiBUaGUgaW5wdXQgZXhwcmVzc2lvbiB0byBjb2RlR2VuQ2FsbCBzaG91bGQgYmUgY2FsbC5cIik7XG4gICAgfVxuICAgIC8vIGFkZHJlc3MgdGhlIGNhc2Ugb2YgYW4gaW5pdCBjYWxsLCBleC4gcjEgPSBSYXQoKS5cbiAgICBpZiAoZ2xvYmFsRW52LmNsYXNzSW5pdHMuaGFzKGV4cHIubmFtZSkpIHtcbiAgICAgICAgLy8gdmFyaWFibGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICAgIHZhciBpbml0VmFsc18xID0gW107XG4gICAgICAgIHZhciBjbGFzc0luaXRzXzEgPSBnbG9iYWxFbnYuY2xhc3NJbml0cy5nZXQoZXhwci5uYW1lKTsgLy8gZ2V0IHRoZSBpbml0aWFsaXppbmcgdmFsdWVzIG9mIGEgY2xhc3NcbiAgICAgICAgdmFyIGNsYXNzSW5kZXhlcyA9IGdsb2JhbEVudi5jbGFzc0luZGV4ZXMuZ2V0KGV4cHIubmFtZSk7IC8vIGdldCB0aGUgZmllbGQgaW5kZXhlcyBvZiBhIGNsYXNzXG4gICAgICAgIGNsYXNzSW5kZXhlcy5mb3JFYWNoKGZ1bmN0aW9uIChpbmRleCwgZmllbGQpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBpbmRleCAqIDQ7XG4gICAgICAgICAgICBpbml0VmFsc18xID0gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBpbml0VmFsc18xLCB0cnVlKSwgW1xuICAgICAgICAgICAgICAgIFwiKGdsb2JhbC5nZXQgJGhlYXApXCIsXG4gICAgICAgICAgICAgICAgXCIoaTMyLmNvbnN0IFwiLmNvbmNhdChvZmZzZXQsIFwiKVwiKSxcbiAgICAgICAgICAgICAgICBcIihpMzIuYWRkKVwiLFxuICAgICAgICAgICAgICAgIGNvZGVHZW5MaXRlcmFsKGNsYXNzSW5pdHNfMS5nZXQoZmllbGQpKSxcbiAgICAgICAgICAgICAgICBcIihpMzIuc3RvcmUpXCJcbiAgICAgICAgICAgIF0sIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFdlIGhhdmUgdG8gbW9kaWZ5IHRoZSBhZGRyZXNzIG9mIHRoZSBoZWFwLCBzbyB0aGUgbmV4dCBjbGFzcyBjYW4gdXNlIGl0LlxuICAgICAgICBpbml0VmFsc18xID0gX19zcHJlYWRBcnJheShfX3NwcmVhZEFycmF5KFtdLCBpbml0VmFsc18xLCB0cnVlKSwgW1xuICAgICAgICAgICAgXCIoZ2xvYmFsLmdldCAkaGVhcClcIixcbiAgICAgICAgICAgIFwiKGdsb2JhbC5nZXQgJGhlYXApXCIsXG4gICAgICAgICAgICBcIihpMzIuY29uc3QgXCIuY29uY2F0KGNsYXNzSW5kZXhlcy5zaXplICogNCwgXCIpXCIpLFxuICAgICAgICAgICAgXCIoaTMyLmFkZClcIixcbiAgICAgICAgICAgIFwiKGdsb2JhbC5zZXQgJGhlYXApXCIsXG4gICAgICAgIF0sIGZhbHNlKTtcbiAgICAgICAgdmFyIGluaXRGdW5jTmFtZSA9IFwiJCRcIi5jb25jYXQoZXhwci5uYW1lLCBcIiRfX2luaXRfXylcIik7XG4gICAgICAgIGlmIChnbG9iYWxFbnYuZnVuY3MuaGFzKGluaXRGdW5jTmFtZSkpIHtcbiAgICAgICAgICAgIGluaXRWYWxzXzEucHVzaChcIihjYWxsICQkXCIuY29uY2F0KGV4cHIubmFtZSwgXCIkX19pbml0X18pXCIpKTsgLy8gZXhlY3V0ZSB0aGUgX19pbml0X18gb3BlcmF0aW9uc1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbml0VmFsc18xO1xuICAgIH1cbiAgICB2YXIgY29kZXMgPSBbXTtcbiAgICAvLyBjb2xsZWN0IGFyZ3VtZW50c1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGV4cHIuYXJncy5sZW5ndGg7ICsraWR4KSB7XG4gICAgICAgIHZhciBhcmcgPSBleHByLmFyZ3NbaWR4XTtcbiAgICAgICAgY29kZXMgPSBfX3NwcmVhZEFycmF5KF9fc3ByZWFkQXJyYXkoW10sIGNvZGVzLCB0cnVlKSwgY29kZUdlbkV4cHIoYXJnLCBnbG9iYWxFbnYsIGxvY2FsRW52KSwgdHJ1ZSk7XG4gICAgfVxuICAgIC8vIGNhbGwgdGhlIGZ1bmN0aW9uXG4gICAgaWYgKGV4cHIubmFtZSA9PT0gJ3ByaW50Jykge1xuICAgICAgICBpZiAoZXhwci5hcmdzWzBdLmEgIT09IFwiaW50XCIgJiYgZXhwci5hcmdzWzBdLmEgIT09IFwiYm9vbFwiICYmIGV4cHIuYXJnc1swXS5hICE9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRwcmludF9udW0pXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3dpdGNoIChleHByLmFyZ3NbMF0uYSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJpbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRwcmludF9udW0pXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiYm9vbFwiOlxuICAgICAgICAgICAgICAgICAgICBjb2Rlcy5wdXNoKFwiKGNhbGwgJHByaW50X2Jvb2wpXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiTm9uZVwiOlxuICAgICAgICAgICAgICAgICAgICBjb2Rlcy5wdXNoKFwiKGNhbGwgJHByaW50X25vbmUpXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY29kZSBjYW4gc3RpbGwgY29tcGlsZSBpZiBpdCdzIGEgY2xhc3MsIGFuZCBhbiBlcnJvciB3aWxsIG9jY3VyIGF0IHJ1bnRpbWUuXG4gICAgICAgICAgICAgICAgICAgIGNvZGVzLnB1c2goXCIoY2FsbCAkcHJpbnRfbnVtKVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29kZXMucHVzaChcIihjYWxsICRcIi5jb25jYXQoZXhwci5uYW1lLCBcIilcIikpO1xuICAgIH1cbiAgICByZXR1cm4gY29kZXM7XG59XG5mdW5jdGlvbiBjb2RlR2VuR2xvYmFsVmFyKHZhckluaXRzKSB7XG4gICAgdmFyIHZhckluaXRXYXNtID0gdmFySW5pdHMubWFwKGZ1bmN0aW9uICh2YXJJbml0KSB7XG4gICAgICAgIHJldHVybiBcIihnbG9iYWwgJFwiLmNvbmNhdCh2YXJJbml0Lm5hbWUsIFwiIChtdXQgaTMyKSBcIikuY29uY2F0KGNvZGVHZW5MaXRlcmFsKHZhckluaXQuaW5pdExpdGVyYWwpLCBcIilcIik7XG4gICAgfSk7XG4gICAgdmFySW5pdFdhc20ucHVzaChcIihnbG9iYWwgJGhlYXAgKG11dCBpMzIpIChpMzIuY29uc3QgNCkpXFxuXCIpOyAvLyBpbml0aWFsaXplIHRoZSBoZWFwIGZvciBjbGFzc2VzXG4gICAgcmV0dXJuIHZhckluaXRXYXNtO1xufVxuLypcbmRlZiBnZXRfZmllbGRfYShzZWxmIDogUmF0KTpcbiAgcmV0dXJuIHNlbGYuYVxuKi9cbmZ1bmN0aW9uIGNvZGVHZW5DbGFzc0RlZihjbGFzc0RlZiwgZ2xvYmFsRW52KSB7XG4gICAgaWYgKGNsYXNzRGVmLnRhZyAhPT0gXCJjbGFzc1wiKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuIG9ubHkgZ2VuZXJhdGUgY29kZXMgZm9yIGNsYXNzZXNcIik7XG4gICAgfVxuICAgIHZhciBjbGFzc1dhc20gPSBbXTtcbiAgICAvLyBhZGQgYWxsIHRoZSBmaWVsZHMgZnVuY3Rpb25zIChzaW1wbHkgcmV0dXJuIHRoZSB2YWx1ZSlcbiAgICBjbGFzc0RlZi5maWVsZHMuZm9yRWFjaChmdW5jdGlvbiAoZikge1xuICAgICAgICAvLyBUbyByZXR1cm4gc2VsZi5hLCB3ZSBuZWVkIHRoZSBhZGRyZXNzIG9mIHNlbGYsIGFuZCB0aGUgaW5kZXggb2YgYS5cbiAgICAgICAgdmFyIHBhcmFtcyA9IFt7XG4gICAgICAgICAgICAgICAgYToge1xuICAgICAgICAgICAgICAgICAgICB0YWc6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBjbGFzc0RlZi5uYW1lXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBuYW1lOiBcInNlbGZcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBjbGFzc0RlZi5hXG4gICAgICAgICAgICB9XTsgLy8gZXguIHNlbGYgOiBSYXRcbiAgICAgICAgdmFyIHZhckluaXRzID0gW107IC8vIG5vIHZhcmlhYmxlIGluaXRpYWxpemF0aW9uc1xuICAgICAgICB2YXIgZ2V0ZmllbGRPYmogPSB7XG4gICAgICAgICAgICBhOiB7XG4gICAgICAgICAgICAgICAgdGFnOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIGNsYXNzOiBjbGFzc0RlZi5uYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGFnOiBcImlkXCIsXG4gICAgICAgICAgICBuYW1lOiBcInNlbGZcIlxuICAgICAgICB9OyAvLyBleC4gcjFcbiAgICAgICAgdmFyIGdldGZpZWxkRXhwciA9IHsgYTogZi5hLCB0YWc6IFwiZ2V0ZmllbGRcIiwgb2JqOiBnZXRmaWVsZE9iaiwgbmFtZTogZi5uYW1lIH07XG4gICAgICAgIHZhciBzdG10cyA9IFt7IGE6IFwiTm9uZVwiLCB0YWc6IFwicmV0dXJuXCIsIGV4cHI6IGdldGZpZWxkRXhwciB9XTtcbiAgICAgICAgdmFyIGZ1bmNEZWYgPSB7XG4gICAgICAgICAgICBuYW1lOiBcIiRcIi5jb25jYXQoY2xhc3NEZWYubmFtZSwgXCIkZ2V0X2ZpZWxkX1wiKS5jb25jYXQoZi5uYW1lKSxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgcmV0VHlwZTogZi5hLFxuICAgICAgICAgICAgdmFySW5pdHM6IHZhckluaXRzLFxuICAgICAgICAgICAgc3RtdHM6IHN0bXRzXG4gICAgICAgIH07XG4gICAgICAgIGNvZGVHZW5GdW5jRGVmKGZ1bmNEZWYsIGdsb2JhbEVudikuZm9yRWFjaChmdW5jdGlvbiAoZnVuY1dhc20pIHtcbiAgICAgICAgICAgIGNsYXNzV2FzbS5wdXNoKGZ1bmNXYXNtKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgLy8gYWRkIGFsbCB0aGUgbWV0aG9kIGZ1bmN0aW9uc1xuICAgIGNsYXNzRGVmLm1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobSkge1xuICAgICAgICB2YXIgZnVuY0RlZiA9IF9fYXNzaWduKF9fYXNzaWduKHt9LCBtKSwgeyBuYW1lOiBcIiRcIi5jb25jYXQoY2xhc3NEZWYubmFtZSwgXCIkXCIpLmNvbmNhdChtLm5hbWUpIH0pOyAvLyBBbm90aGVyIFwiJFwiIHdvdWxkIGJlIGFkZGVkIGxhdGVyLlxuICAgICAgICAvLyBhZGQgYSByZXR1cm4gc3RhdGVtZW50IHRvIHRoZSBpbml0IGZ1bmN0aW9uXG4gICAgICAgIGlmIChtLm5hbWUgPT0gXCJfX2luaXRfX1wiKSB7XG4gICAgICAgICAgICBmdW5jRGVmLnN0bXRzLnB1c2goe1xuICAgICAgICAgICAgICAgIGE6IFwiTm9uZVwiLFxuICAgICAgICAgICAgICAgIHRhZzogXCJyZXR1cm5cIixcbiAgICAgICAgICAgICAgICBleHByOiB7XG4gICAgICAgICAgICAgICAgICAgIGE6IHsgdGFnOiBcIm9iamVjdFwiLCBjbGFzczogY2xhc3NEZWYubmFtZSB9LFxuICAgICAgICAgICAgICAgICAgICB0YWc6IFwiaWRcIixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJzZWxmXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSByZW1vdmUgXCJzZWxmXCIgaW4gdGhlIHBhcnNlciBhbmQgYWRkIGl0IGJhY2sgaGVyZS5cbiAgICAgICAgZnVuY0RlZi5wYXJhbXMgPSBfX3NwcmVhZEFycmF5KFt7XG4gICAgICAgICAgICAgICAgYToge1xuICAgICAgICAgICAgICAgICAgICB0YWc6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBjbGFzc0RlZi5uYW1lXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBuYW1lOiBcInNlbGZcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBjbGFzc0RlZi5hXG4gICAgICAgICAgICB9XSwgZnVuY0RlZi5wYXJhbXMsIHRydWUpO1xuICAgICAgICAvLyBmdW5jRGVmLnBhcmFtcy5wdXNoKHsgXG4gICAgICAgIC8vICAgYTogeyBcbiAgICAgICAgLy8gICAgIHRhZzogXCJvYmplY3RcIiwgXG4gICAgICAgIC8vICAgICBjbGFzczogY2xhc3NEZWYubmFtZSBcbiAgICAgICAgLy8gICB9LCBcbiAgICAgICAgLy8gICBuYW1lOiBcInNlbGZcIiwgXG4gICAgICAgIC8vICAgdHlwZTogY2xhc3NEZWYuYSBcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIGNvZGVHZW5GdW5jRGVmKGZ1bmNEZWYsIGdsb2JhbEVudikuZm9yRWFjaChmdW5jdGlvbiAoZnVuY1dhc20pIHtcbiAgICAgICAgICAgIGNsYXNzV2FzbS5wdXNoKGZ1bmNXYXNtKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsYXNzV2FzbS5qb2luKFwiXFxuXCIpO1xufVxuZnVuY3Rpb24gY29kZUdlbkZ1bmNEZWYoZnVuY0RlZiwgZ2xvYmFsRW52KSB7XG4gICAgLy8gcHJlcGFyZSB0aGUgbG9jYWwgZW52aXJvbm1lbnRcbiAgICB2YXIgbG9jYWxFbnYgPSBjcmVhdGVFbXB0eUxvY2FsRW52KCk7XG4gICAgbG9jYWxFbnYuaXNGdW5jID0gdHJ1ZTtcbiAgICBmdW5jRGVmLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHtcbiAgICAgICAgbG9jYWxFbnYudmFycy5zZXQocC5uYW1lLCB0cnVlKTtcbiAgICB9KTtcbiAgICBmdW5jRGVmLnZhckluaXRzLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICBsb2NhbEVudi52YXJzLnNldCh2Lm5hbWUsIHRydWUpO1xuICAgIH0pO1xuICAgIC8vIHBhcmFtc1xuICAgIHZhciBwYXJhbXMgPSBmdW5jRGVmLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHtcbiAgICAgICAgcmV0dXJuIFwiKHBhcmFtICRcIi5jb25jYXQocC5uYW1lLCBcIiBpMzIpXCIpO1xuICAgIH0pLmpvaW4oJyAnKTtcbiAgICAvLyBpbml0IGxvY2FsIHZhcmlhYmxlc1xuICAgIHZhciBsb2NhbFZhckluaXQgPSBmdW5jRGVmLnZhckluaXRzLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICByZXR1cm4gXCIobG9jYWwgJFwiLmNvbmNhdCh2Lm5hbWUsIFwiIGkzMilcXG4obG9jYWwuc2V0ICRcIikuY29uY2F0KHYubmFtZSwgXCIgXCIpLmNvbmNhdChjb2RlR2VuTGl0ZXJhbCh2LmluaXRMaXRlcmFsKSwgXCIpXCIpO1xuICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgIC8vIGdlbmVyYXRlIGJvZHkgc3RhdGVtZW50c1xuICAgIHZhciBib2R5ID0gY29kZUdlbkJvZHkoZnVuY0RlZi5zdG10cywgZ2xvYmFsRW52LCBsb2NhbEVudik7XG4gICAgLy8gcmV0dXJuIHRnZSBmdW5jdGlvbiBkZWZpbml0aW9uIGluIFdBU01cbiAgICAvLyByZXR1cm4gW2BcXG4oZnVuYyAkJHtmdW5jRGVmLm5hbWV9ICR7cGFyYW1zfSAocmVzdWx0IGkzMikgJHtsb2NhbFZhckluaXR9XFxuJHtib2R5LmpvaW4oJ1xcbicpfSlgXVxuICAgIC8vIHJldHVybiBbYChmdW5jICQke2Z1bmNEZWYubmFtZX0gJHtwYXJhbXN9IChyZXN1bHQgaTMyKVxcbihsb2NhbCAkbGFzdCBpMzIpXFxuJHtsb2NhbFZhckluaXR9XFxuJHtib2R5LmpvaW4oJ1xcbicpfVxcbihpMzIuY29uc3QgMCkpYF1cbiAgICByZXR1cm4gW1wiKGZ1bmMgJFwiLmNvbmNhdChmdW5jRGVmLm5hbWUsIFwiIFwiKS5jb25jYXQocGFyYW1zLCBcIiAocmVzdWx0IGkzMilcXG4obG9jYWwgJGxhc3QgaTMyKVwiKS5jb25jYXQobG9jYWxWYXJJbml0LCBcIlxcblwiKS5jb25jYXQoYm9keS5qb2luKCdcXG4nKSwgXCJcXG4oaTMyLmNvbnN0IDApKVxcblwiKV07XG59XG5mdW5jdGlvbiBjb2RlR2VuTGl0ZXJhbChsaXRlcmFsKSB7XG4gICAgc3dpdGNoIChsaXRlcmFsLnRhZykge1xuICAgICAgICBjYXNlIFwibnVtXCI6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IFwiLmNvbmNhdChsaXRlcmFsLnZhbHVlLCBcIilcIik7XG4gICAgICAgIGNhc2UgXCJib29sXCI6XG4gICAgICAgICAgICBpZiAobGl0ZXJhbC52YWx1ZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IDEpXCI7XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IDApXCI7XG4gICAgICAgIGNhc2UgXCJub25lXCI6XG4gICAgICAgICAgICByZXR1cm4gXCIoaTMyLmNvbnN0IDApXCI7XG4gICAgfVxufVxuLy8gc2hvdWxkIHVzZSBsb2NhbCBlbnZpcm9ubWVudCBpbnN0ZWFkIG9mIGdsb2JhbCBlbnZpcm9ubWVudFxuZnVuY3Rpb24gY29kZUdlbklkKGlkLCBHbG9jYWxFbnYsIGxvY2FsRW52KSB7XG4gICAgaWYgKGlkLnRhZyAhPT0gJ2lkJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDT01QSUxFIEVSUk9SOiBpbnB1dCB0byBjb2RlR2VuIElkIHNob3VsZCBiZSBhbiBpZCBleHByXCIpO1xuICAgIH1cbiAgICAvLyBUaGUgdHlwZSBjaGVja2VyIGhhcyBhbHJlYWR5IG1ha2Ugc3VyZSB0aGUgdmFyaWFibGUgaXMgZGVmaW5lZC5cbiAgICBpZiAobG9jYWxFbnYudmFycy5oYXMoaWQubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIFwiKGxvY2FsLmdldCAkXCIuY29uY2F0KGlkLm5hbWUsIFwiKVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIFwiKGdsb2JhbC5nZXQgJFwiLmNvbmNhdChpZC5uYW1lLCBcIilcIik7XG59XG4iLCJpbXBvcnQgeyBwYXJzZXIgfSBmcm9tIFwibGV6ZXItcHl0aG9uXCI7XG5pbXBvcnQgeyBCaW5PcCwgVW5pT3AgfSBmcm9tICcuL2FzdCc7XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VBcmdzKGMsIHMpIHtcbiAgICB2YXIgYXJncyA9IFtdO1xuICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgIHdoaWxlIChjLm5leHRTaWJsaW5nKCkpIHtcbiAgICAgICAgaWYgKGMudHlwZS5uYW1lID09PSAnKScpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MucHVzaCh0cmF2ZXJzZUV4cHIoYywgcykpO1xuICAgICAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgfVxuICAgIGMucGFyZW50KCk7XG4gICAgcmV0dXJuIGFyZ3M7XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VFeHByKGMsIHMpIHtcbiAgICBzd2l0Y2ggKGMudHlwZS5uYW1lKSB7XG4gICAgICAgIGNhc2UgXCJOdW1iZXJcIjogLy8gZWcuICcxJ1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0YWc6IFwibGl0ZXJhbFwiLFxuICAgICAgICAgICAgICAgIGxpdGVyYWw6IHtcbiAgICAgICAgICAgICAgICAgICAgdGFnOiBcIm51bVwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogTnVtYmVyKHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgY2FzZSAnQm9vbGVhbic6XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRhZzogXCJsaXRlcmFsXCIsXG4gICAgICAgICAgICAgICAgbGl0ZXJhbDoge1xuICAgICAgICAgICAgICAgICAgICB0YWc6IFwiYm9vbFwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gXCJUcnVlXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICBjYXNlIFwiTm9uZVwiOlxuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImxpdGVyYWxcIiwgbGl0ZXJhbDogeyB0YWc6IFwibm9uZVwiIH0gfTtcbiAgICAgICAgY2FzZSBcIlZhcmlhYmxlTmFtZVwiOiAvLyBlLmcuICd4J1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImlkXCIsIG5hbWU6IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykgfTtcbiAgICAgICAgY2FzZSBcInNlbGZcIjogLy8gbm90IHN1cmUgaWYgdGhpcyBzaG91bGQgYmUgaGFuZGxlZCBsaWtlIHRoaXNcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJpZFwiLCBuYW1lOiBcInNlbGZcIiB9O1xuICAgICAgICBjYXNlIFwiQ2FsbEV4cHJlc3Npb25cIjogLy8gZS5nLiBtYXgoeCwgeSksIGFicyh4KSwgZigpXG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCJNZW1iZXJFeHByZXNzaW9uXCIgb3IgXCJWYXJpYWJsZU5hbWVcIlxuICAgICAgICAgICAgaWYgKGMubmFtZSA9PT0gXCJNZW1iZXJFeHByZXNzaW9uXCIpIHtcbiAgICAgICAgICAgICAgICBjLmxhc3RDaGlsZCgpOyAvLyBcIlByb3BlcnR5TmFtZVwiXG4gICAgICAgICAgICAgICAgdmFyIHBOYW1lXzEgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pO1xuICAgICAgICAgICAgICAgIGMucGFyZW50KCk7IC8vIGdldCBiYWNrIHRvIFwiTWVtYmVyRXhwcmVzc2lvblwiXG4gICAgICAgICAgICAgICAgdmFyIG9ial8xID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgICAgICAgICAgICAgIGlmIChvYmpfMS50YWcgIT09IFwiZ2V0ZmllbGRcIikgeyAvLyBWaXNpdGluZyBNZW1iZXJFeHByZXNzaW9uIHNob3VsZCBhbHdheXMgZ2V0cyBhIGdldGZpZWxkIHJldHVybi5cbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJUaGUgb2JqZWN0IGhhcyBhbiBpbmNvcnJlY3QgdGFnLlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYy5uZXh0U2libGluZygpOyAvLyBcIkFyZ0xpc3RcIlxuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gdHJhdmVyc2VBcmdzKGMsIHMpO1xuICAgICAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgLy8gV2UgcmV0dXJuIG9iai5vYmogYmVjYXVzZSB0aGUgb2JqIGlzIGFjdHVhbGx5IG5vdCBhIGdldGZpZWxkLlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJtZXRob2RcIiwgb2JqOiBvYmpfMS5vYmosIGFyZ3M6IGFyZ3MsIG5hbWU6IHBOYW1lXzEgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFwiVmFyaWFibGVOYW1lXCJcbiAgICAgICAgICAgICAgICB2YXIgY2FsbE5hbWUgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pO1xuICAgICAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJBcmdMaXN0XCJcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHRyYXZlcnNlQXJncyhjLCBzKTtcbiAgICAgICAgICAgICAgICBjLnBhcmVudCgpOyAvLyBiYWNrIHRvIFwiQ2FsbEV4cHJlc3Npb25cIlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJjYWxsXCIsIG5hbWU6IGNhbGxOYW1lLCBhcmdzOiBhcmdzIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJVbmFyeUV4cHJlc3Npb25cIjpcbiAgICAgICAgICAgIC8vIFdBUk5JTkc6IFRoaXMgdW5pYXJ5IGV4cHJlc3Npb24gb25seSBkZWFscyB3aXRoIHVuaWFyeSBvcGVyYXRvciBkaXJlY3RseSBmb2xsb3dlZCBieSBhIG51bWJlciBcbiAgICAgICAgICAgIC8vIGUuZy4gLXgsIC0gKDEgKyAyKVxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7IC8vIGdvIGludG8gdGhlIHVuYXJ5IGV4cHJlc3NvaW5cbiAgICAgICAgICAgIHZhciB1bmlPcCA9IHN0cjJ1bmlvcChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICAgICAgICAgIC8vIHBvcCB1bmlhcnkgZXhwcmVzc2lvblxuICAgICAgICAgICAgdmFyIG51bSA9IE51bWJlcihzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHZhciB1bmlvbkV4cHIgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcInVuaW9wXCIsIG9wOiB1bmlPcCwgZXhwcjogdW5pb25FeHByIH07XG4gICAgICAgIGNhc2UgXCJCaW5hcnlFeHByZXNzaW9uXCI6IC8vIGUuZy4gMSArIDJcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBnbyBpbnRvIGJpbmFyeSBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgbGVmdCA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHZhciBvcCA9IHN0cjJiaW5vcChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHZhciByaWdodCA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMucGFyZW50KCk7IC8vIHBvcCB0aGUgYmluYXJ5XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiYmlub3BcIiwgb3A6IG9wLCBsZWZ0OiBsZWZ0LCByaWdodDogcmlnaHQgfTtcbiAgICAgICAgY2FzZSBcIk1lbWJlckV4cHJlc3Npb25cIjogLy8gZXguIHIyLm5cbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBcIkNhbGxFeHByZXNzaW9uXCIgb3IgXCJWYXJpYWJsZU5hbWVcIlxuICAgICAgICAgICAgdmFyIG9iaiA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCIuXCJcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJQcm9wZXJ0eU5hbWVcIlxuICAgICAgICAgICAgdmFyIHBOYW1lID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiZ2V0ZmllbGRcIiwgb2JqOiBvYmosIG5hbWU6IHBOYW1lIH07XG4gICAgICAgIGNhc2UgXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiOlxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7IC8vIHZpc2l0IFwiKFwiXG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHZpc2l0IHRoZSBpbm5lciBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgZXhwciA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMucGFyZW50O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzdHJpbmdpZnlUcmVlKGMsIHMsIDIpKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiBDb3VsZCBub3QgcGFyc2UgZXhwciBhdCBcIiArIGMuZnJvbSArIFwiIFwiICsgYy50byArIFwiOiBcIiArIHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50bykpO1xuICAgIH1cbn1cbi8qXG4gKiBBIGZ1bmN0aW9uIHRvIHBhcnNlIG9uZSBzdGF0ZW1lbnRcbiAqIEBpbnB1dCBjOiBhIHRyZWVjb3Jzb3JcbiAqIEBpbnB1dCBzOiB0aGUgb3JpZ2luYWwgaW5wdXQgc3RyaW5nXG4gKiBAaW5wdXQgZW52OiBlbnZpcm9ubWVudCB2YXJpYWJsZXMgKGlmIHdlIGFyZSBnb2luZyB0byB0cmF2ZXJzZSBhIGZ1bmMsKVxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VTdG10KGMsIHMpIHtcbiAgICBzd2l0Y2ggKGMubm9kZS50eXBlLm5hbWUpIHtcbiAgICAgICAgY2FzZSBcIkFzc2lnblN0YXRlbWVudFwiOiAvLyBhID0gMSwgYiA9IDIgb3IgdmFyIEluaXRcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBcIlZhcmlhYmxlTmFtZVwiIG9yIFwiTWVtYmVyRXhwcmVzc2lvblwiXG4gICAgICAgICAgICAvLyBnZXQgbGhzIGV4cHJlc3Npb25cbiAgICAgICAgICAgIHZhciBuYW1lID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgICAgICAgICAgdmFyIHZhcmlhYmxlID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICAgICAgICAgIHZhcmlhYmxlID0gdmFyaWFibGUuc3BsaXQoXCIuXCIpWzBdOyAvLyBUaGlzIG9ubHkgdGVsbHMgdGhlIGluaXRpYWwgdmFyaWFibGUgPT4gc2VsZi55IGFzIHNlbGZcbiAgICAgICAgICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJBc3NpZ25PcFwiXG4gICAgICAgICAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHJocyBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgICAgICAgICBjLnBhcmVudCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImFzc2lnblwiLCBuYW1lOiBuYW1lLCB2YXJpYWJsZTogdmFyaWFibGUsIHZhbHVlOiB2YWx1ZSB9O1xuICAgICAgICBjYXNlIFwiRXhwcmVzc2lvblN0YXRlbWVudFwiOlxuICAgICAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgICAgICB2YXIgZXhwciA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwiZXhwclwiLCBleHByOiBleHByIH07XG4gICAgICAgIGNhc2UgXCJSZXR1cm5TdGF0ZW1lbnRcIjpcbiAgICAgICAgICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgICAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICAgICAgdmFyIHJldEV4cHIgPSB7IHRhZzogXCJsaXRlcmFsXCIsIGxpdGVyYWw6IHsgdGFnOiBcIm5vbmVcIiB9IH07XG4gICAgICAgICAgICBpZiAoYy50eXBlLm5hbWUgIT09ICfimqAnKSB7IC8vIHJldHVybiBOb25lXG4gICAgICAgICAgICAgICAgcmV0RXhwciA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwicmV0dXJuXCIsIGV4cHI6IHJldEV4cHIgfTtcbiAgICAgICAgY2FzZSBcIlBhc3NTdGF0ZW1lbnRcIjpcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJwYXNzXCIgfTtcbiAgICAgICAgY2FzZSBcIklmU3RhdGVtZW50XCI6XG4gICAgICAgICAgICByZXR1cm4gdHJhdmVyc2VJZihjLCBzKTtcbiAgICAgICAgY2FzZSBcIldoaWxlU3RhdGVtZW50XCI6XG4gICAgICAgICAgICByZXR1cm4gdHJhdmVyc2VXaGlsZShjLCBzKTtcbiAgICAgICAgY2FzZSBcIkNsYXNzRGVmaW5pdGlvblwiOlxuICAgICAgICAgICAgcmV0dXJuIHRyYXZlcnNlQ2xhc3NEZWYoYywgcyk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcGFyc2Ugc3RtdCBhdCBcIiArIGMubm9kZS5mcm9tICsgXCIgXCIgKyBjLm5vZGUudG8gKyBcIjogXCIgKyBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pKTtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VQcm9ncmFtKGMsIHMpIHtcbiAgICB2YXIgdmFySW5pdHMgPSBbXTtcbiAgICB2YXIgY2xhc3NEZWZzID0gW107XG4gICAgdmFyIGZ1bmNEZWZzID0gW107IC8vIG5vIEZ1bmNEZWYgZm9yIFBBM1xuICAgIHZhciBzdG10cyA9IFtdOyAvLyBjbGFzcyBkZWZpbml0aW9ucyBhcmUgaW5jbHVkZWQgaGVyZVxuICAgIHN3aXRjaCAoYy5ub2RlLnR5cGUubmFtZSkge1xuICAgICAgICBjYXNlIFwiU2NyaXB0XCI6XG4gICAgICAgICAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICAgICAgICAgIC8vIHBhcnNlIGNsYXNzIGRlZmluaXRpb25zIGFuZCB2YXJpYWJsZSBpbml0aWFsaXphdGlvbnNcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNWYXJJbml0KGMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhckluaXRzLnB1c2godHJhdmVyc2VWYXJJbml0KGMsIHMpKTsgLy8gcGFyc2UgdmFyaWFibGUgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaXNGdW5jRGVmKGMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmNEZWZzLnB1c2godHJhdmVyc2VGdW5jRGVmKGMsIHMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaXNDbGFzc0RlZihjKSkge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc0RlZnMucHVzaCh0cmF2ZXJzZUNsYXNzRGVmKGMsIHMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgICAgICAgICBpZiAoaXNWYXJJbml0KGMpIHx8IGlzRnVuY0RlZihjKSB8fCBpc0NsYXNzRGVmKGMpKSB7IC8vIG5vIG5leHQgc2libGluZyAmJiBubyBzdG10c1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhckluaXRzOiB2YXJJbml0cywgY2xhc3NEZWZzOiBjbGFzc0RlZnMsIGZ1bmNEZWZzOiBmdW5jRGVmcywgc3RtdHM6IHN0bXRzIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBwYXJzZSBzdGF0ZW1lbnRzXG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFySW5pdChjKSB8fCBpc0Z1bmNEZWYoYykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0UgRVJST1I6IHZhciBpbml0IGFuZCBmdW5jIGRlZiBzaG91bGQgZ28gYmVmb3JlIHN0YXRlbWVudHNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICAgICAgICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgICAgICAgICByZXR1cm4geyB2YXJJbml0czogdmFySW5pdHMsIGNsYXNzRGVmczogY2xhc3NEZWZzLCBmdW5jRGVmczogZnVuY0RlZnMsIHN0bXRzOiBzdG10cyB9O1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IHBhcnNlIHByb2dyYW0gYXQgXCIgKyBjLm5vZGUuZnJvbSArIFwiIFwiICsgYy5ub2RlLnRvKTtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc291cmNlKSB7XG4gICAgdmFyIHQgPSBwYXJzZXIucGFyc2Uoc291cmNlKTtcbiAgICAvLyBjb25zb2xlLmxvZyhcIlBhcnNlZCBTb3VyY2UgQ29kZTpcIik7XG4gICAgLy8gY29uc29sZS5sb2coc3RyaW5naWZ5VHJlZSh0LmN1cnNvcigpLCBzb3VyY2UsIDApKTtcbiAgICAvLyBjb25zb2xlLmxvZyhcIlxcblwiKTtcbiAgICByZXR1cm4gdHJhdmVyc2VQcm9ncmFtKHQuY3Vyc29yKCksIHNvdXJjZSk7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jRGVmKGMpIHtcbiAgICByZXR1cm4gYy50eXBlLm5hbWUgPT09ICdGdW5jdGlvbkRlZmluaXRpb24nO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2xhc3NEZWYoYykge1xuICAgIHJldHVybiBjLnR5cGUubmFtZSA9PT0gJ0NsYXNzRGVmaW5pdGlvbic7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNWYXJJbml0KGMpIHtcbiAgICBpZiAoYy50eXBlLm5hbWUgIT09ICdBc3NpZ25TdGF0ZW1lbnQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYy5maXJzdENoaWxkKCk7XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIHZhciBpc1R5cGVEZWYgPSAoYy5ub2RlLnR5cGUubmFtZSA9PT0gJ1R5cGVEZWYnKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiBpc1R5cGVEZWY7XG59XG4vLyBjIGlzIG5vdyBpbiBBc3NpZ25TdGF0ZW1lbnRcbmV4cG9ydCBmdW5jdGlvbiB0cmF2ZXJzZVZhckluaXQoYywgcykge1xuICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBWYXJpYWJsZU5hbWVcbiAgICB2YXIgdFZhciA9IHRyYXZlcnNlVHlwZWRWYXIoYywgcyk7XG4gICAgYy5uZXh0U2libGluZygpOyAvLyBUeXBlRGVmXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBBc3NpZ25PcFxuICAgIHZhciBsaXRlcmFsID0gdHJhdmVyc2VMaXRlcmFsKGMsIHMpOyAvLyBOdW1iZXJcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiB7IG5hbWU6IHRWYXIubmFtZSwgdHlwZTogdFZhci50eXBlLCBpbml0TGl0ZXJhbDogbGl0ZXJhbCB9O1xufVxuLy8gVGhlcmUgd291bGQgYmUgbXVjaCBtb3JlIHR5cGVzIChjbGFzc2VzKS5cbmV4cG9ydCBmdW5jdGlvbiBub2RlMnR5cGUoYywgcykge1xuICAgIHZhciB0eXBlU3RyID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTtcbiAgICBzd2l0Y2ggKHR5cGVTdHIpIHtcbiAgICAgICAgY2FzZSAnaW50JzpcbiAgICAgICAgICAgIHJldHVybiBcImludFwiO1xuICAgICAgICBjYXNlICdib29sJzpcbiAgICAgICAgICAgIHJldHVybiBcImJvb2xcIjtcbiAgICAgICAgY2FzZSAnTm9uZSc6XG4gICAgICAgICAgICByZXR1cm4gXCJOb25lXCI7XG4gICAgICAgIGRlZmF1bHQ6IC8vIFdlJ2xsIGNoZWNrIGlmIHRoZSB0eXBlIGV4aXN0cyBpbiB0aGUgdHlwZSBjaGVja2VyXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRhZzogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBjbGFzczogdHlwZVN0clxuICAgICAgICAgICAgfTtcbiAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKGBQQVJTRSBFUlJPUjogdW5rbm93biB0eXBlICR7dHlwZVN0cn1gKTtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VUeXBlZFZhcihjLCBzKSB7XG4gICAgdmFyIG5hbWUgPSBzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pOyAvLyBcIlZhcmlhYmxlTmFtZVwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBUeXBlRGVmXG4gICAgYy5maXJzdENoaWxkKCk7IC8vIDpcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFZhcmlhYmxlTmFtZVxuICAgIHZhciB0eXBlID0gbm9kZTJ0eXBlKGMsIHMpO1xuICAgIGMucGFyZW50KCk7XG4gICAgcmV0dXJuIHsgbmFtZTogbmFtZSwgdHlwZTogdHlwZSB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlTGl0ZXJhbChjLCBzKSB7XG4gICAgdmFyIHZhbFN0ciA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgc3dpdGNoIChjLnR5cGUubmFtZSkge1xuICAgICAgICBjYXNlICdCb29sZWFuJzpcbiAgICAgICAgICAgIGlmICh2YWxTdHIgPT0gJ0ZhbHNlJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJib29sXCIsIHZhbHVlOiBmYWxzZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdGFnOiBcImJvb2xcIiwgdmFsdWU6IHRydWUgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgY2FzZSAnTnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiB7IHRhZzogXCJudW1cIiwgdmFsdWU6IHBhcnNlSW50KHZhbFN0cikgfTtcbiAgICAgICAgY2FzZSAnTm9uZSc6XG4gICAgICAgICAgICByZXR1cm4geyB0YWc6IFwibm9uZVwiIH07XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiB1bnN1cHBvcnRpbmcgbGl0ZXJhbCB0eXBlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRyYXZlcnNlQ2xhc3NEZWYoYywgcykge1xuICAgIHZhciBjbHMgPSB7XG4gICAgICAgIHRhZzogXCJjbGFzc1wiLFxuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgICBmaWVsZHM6IFtdLFxuICAgICAgICBtZXRob2RzOiBbXSwgLy8gY2xhc3MgZnVuY3Rpb25zXG4gICAgfTtcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gY2xhc3Mgbm9kZVxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gY2xhc3MgbmFtZVxuICAgIGNscy5uYW1lID0gcy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKTsgLy8gYXNzaWduIGNsYXNzIG5hbWVcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiQXJnbGlzdFwiID0+IGZpeGVkIHRvIGJlIG9iamVjdFxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJCb2R5XCJcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCI6XCJcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHJlYWNoIHRoZSBmaXNydCBzdGF0ZW1lbnQgaW4gdGhlIGJvZHlcbiAgICB2YXIgY29kZSA9IHRyYXZlcnNlQ2xhc3NCb2R5KGMsIHMpO1xuICAgIGNscy5maWVsZHMgPSBjb2RlLnZhckluaXRzO1xuICAgIGNscy5tZXRob2RzID0gY29kZS5mdW5jRGVmcztcbiAgICBjLnBhcmVudCgpOyAvLyBiYWNrIHRvIFwiQm9keVwiXG4gICAgYy5wYXJlbnQoKTsgLy8gYmFjayB0byBcIkNsYXNzRGVmaW5pdGlvblwiXG4gICAgcmV0dXJuIGNscztcbn1cbmV4cG9ydCBmdW5jdGlvbiB0cmF2ZXJzZU1ldGhEZWYoYywgcykge1xuICAgIHZhciBmdW5jID0ge1xuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgICBwYXJhbXM6IG51bGwsXG4gICAgICAgIHJldFR5cGU6IFwiTm9uZVwiLFxuICAgICAgICB2YXJJbml0czogbnVsbCxcbiAgICAgICAgc3RtdHM6IG51bGxcbiAgICB9O1xuICAgIGMuZmlyc3RDaGlsZCgpOyAvLyBcImRlZlwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBtZXRob2QgbmFtZVxuICAgIGZ1bmMubmFtZSA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgYy5uZXh0U2libGluZygpOyAvLyBcIlBhcmFtTGlzdFwiID0+IGF0IGxlYXN0IDEgcGFyYW1ldGVycyAoc2VsZilcbiAgICBmdW5jLnBhcmFtcyA9IHRyYXZlcnNlTWV0aFBhcmFtcyhjLCBzKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiVHlwZURlZlwiIG9yIFwiQm9keVwiXG4gICAgLy8gY2hlY2sgaWYgdGhlIG1ldGhvZCBwcm92aWRlcyBhIHJldHVybiB0eXBlXG4gICAgaWYgKGMudHlwZS5uYW1lID09PSAnVHlwZURlZicpIHtcbiAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgIGZ1bmMucmV0VHlwZSA9IG5vZGUydHlwZShjLCBzKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpOyAvLyBcIkJvZHlcIlxuICAgIH1cbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gXCI6XCJcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIHRoZSBmaXJzdCBib2R5IHN0YXRlbWVudFxuICAgIHZhciBjb2RlID0gdHJhdmVyc2VNZXRoQm9keShjLCBzKTsgLy8gVGhpcyBsaW5lIGlzIHRoZSBvbmx5IGRpZmZlcmVuY2VcbiAgICBmdW5jLnZhckluaXRzID0gY29kZS52YXJJbml0cztcbiAgICBmdW5jLnN0bXRzID0gY29kZS5zdG10cztcbiAgICBjLnBhcmVudCgpOyAvLyBiYWNrIHRvIFwiQm9keVwiXG4gICAgYy5wYXJlbnQoKTsgLy8gYmFjayB0byBcIkNsYXNzRGVmaW5pdGlvblwiXG4gICAgcmV0dXJuIGZ1bmM7XG59XG5leHBvcnQgZnVuY3Rpb24gdHJhdmVyc2VGdW5jRGVmKGMsIHMpIHtcbiAgICB2YXIgZnVuYyA9IHtcbiAgICAgICAgbmFtZTogXCJcIixcbiAgICAgICAgcGFyYW1zOiBudWxsLFxuICAgICAgICByZXRUeXBlOiBcIk5vbmVcIixcbiAgICAgICAgdmFySW5pdHM6IG51bGwsXG4gICAgICAgIHN0bXRzOiBudWxsXG4gICAgfTtcbiAgICAvLyBmdW5jdGlvbiBuYW1lXG4gICAgYy5maXJzdENoaWxkKCk7XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGZ1bmMubmFtZSA9IHMuc3Vic3RyaW5nKGMuZnJvbSwgYy50byk7XG4gICAgLy8gcGFyYW1saXN0ICgwIG9yIG1vcmUpXG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGZ1bmMucGFyYW1zID0gdHJhdmVyc2VGdW5jUGFyYW1zKGMsIHMpO1xuICAgIC8vIHJldHVybiB0eXBlICgwIG9yIG9uZSlcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgaWYgKGMudHlwZS5uYW1lID09PSAnVHlwZURlZicpIHtcbiAgICAgICAgYy5maXJzdENoaWxkKCk7XG4gICAgICAgIGZ1bmMucmV0VHlwZSA9IG5vZGUydHlwZShjLCBzKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICB9XG4gICAgLy8gcGFyc2UgYm9keVxuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgdmFyIGNvZGUgPSB0cmF2ZXJzZUZ1bmNCb2R5KGMsIHMpO1xuICAgIGZ1bmMudmFySW5pdHMgPSBjb2RlLnZhckluaXRzO1xuICAgIGZ1bmMuc3RtdHMgPSBjb2RlLnN0bXRzO1xuICAgIGMucGFyZW50KCk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4gZnVuYztcbn1cbi8vIHNpbWlsYXIgdG8gdHJhdmVyc2VGdW5jUGFyYW1zLCBidXQgZXNjYXBlIHRoZSBzZWxmIHBhcmFtZXRlclxuZnVuY3Rpb24gdHJhdmVyc2VNZXRoUGFyYW1zKGMsIHMpIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgYy5maXJzdENoaWxkKCk7IC8vIFwiKFwiXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBcInNlbGZcIlxuICAgIGMubmV4dFNpYmxpbmcoKTsgLy8gXCJUeXBlRGVmXCJcbiAgICBjLm5leHRTaWJsaW5nKCk7IC8vIFwiLFwiXG4gICAgZG8ge1xuICAgICAgICBpZiAocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gJyknKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGlmIChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pID09PSAnLCcpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgcGFyYW1zLnB1c2godHJhdmVyc2VUeXBlZFZhcihjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiBwYXJhbXM7XG59XG5mdW5jdGlvbiB0cmF2ZXJzZUZ1bmNQYXJhbXMoYywgcykge1xuICAgIHZhciBwYXJhbXMgPSBbXTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgZG8ge1xuICAgICAgICBpZiAocy5zdWJzdHJpbmcoYy5mcm9tLCBjLnRvKSA9PT0gJyknKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGlmIChzLnN1YnN0cmluZyhjLmZyb20sIGMudG8pID09PSAnLCcpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgcGFyYW1zLnB1c2godHJhdmVyc2VUeXBlZFZhcihjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIHJldHVybiBwYXJhbXM7XG59XG5mdW5jdGlvbiB0cmF2ZXJzZUNsYXNzQm9keShjLCBzKSB7XG4gICAgdmFyIHZhckluaXRzID0gW107XG4gICAgdmFyIGZ1bmNEZWZzID0gW107XG4gICAgZG8ge1xuICAgICAgICBpZiAoaXNWYXJJbml0KGMpKSB7XG4gICAgICAgICAgICB2YXJJbml0cy5wdXNoKHRyYXZlcnNlVmFySW5pdChjLCBzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRnVuY0RlZihjKSkge1xuICAgICAgICAgICAgZnVuY0RlZnMucHVzaCh0cmF2ZXJzZU1ldGhEZWYoYywgcykpO1xuICAgICAgICB9XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAvLyBBIGNsYXNzIGNvbnNpc3RzIG9mIHZhcmlhYmxlIGluaXRpYWxpemF0aW9ucyBhbmQgbWV0aG9kIGRlZmluaXRpb25zLlxuICAgIHJldHVybiB7IHZhckluaXRzOiB2YXJJbml0cywgY2xhc3NEZWZzOiBbXSwgZnVuY0RlZnM6IGZ1bmNEZWZzLCBzdG10czogW10gfTtcbn1cbi8vIEEgbWV0aG9kIGJvZHkgY29uc2lzdHMgdmFyaWFibGUgZGVmaW5pdGlvbnMgYW5kIHN0YXRlbWVudHMuXG5mdW5jdGlvbiB0cmF2ZXJzZU1ldGhCb2R5KGMsIHMpIHtcbiAgICB2YXIgdmFySW5pdHMgPSBbXTtcbiAgICB2YXIgc3RtdHMgPSBbXTtcbiAgICAvLyB0cmF2ZXJzZSB2YXJpYWJsZSBpbml0aWFsaXphdGlvbnNcbiAgICBkbyB7XG4gICAgICAgIGlmICghaXNWYXJJbml0KGMpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB2YXJJbml0cy5wdXNoKHRyYXZlcnNlVmFySW5pdChjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAvLyBnZXQgYWxsIHN0YXRlbWVudFxuICAgIGRvIHtcbiAgICAgICAgc3RtdHMucHVzaCh0cmF2ZXJzZVN0bXQoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgcmV0dXJuIHsgdmFySW5pdHM6IHZhckluaXRzLCBjbGFzc0RlZnM6IFtdLCBzdG10czogc3RtdHMsIGZ1bmNEZWZzOiBbXSB9O1xufVxuZnVuY3Rpb24gdHJhdmVyc2VGdW5jQm9keShjLCBzKSB7XG4gICAgdmFyIHZhckluaXRzID0gW107XG4gICAgdmFyIHN0bXRzID0gW107XG4gICAgZG8ge1xuICAgICAgICBpZiAoIWlzVmFySW5pdChjKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRnVuY0RlZihjKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0VSIEVSUk86IG5lc3RlZCBmdW5jdGlvbiBkZWZpbml0aW9uIGlzIG5vdCBhbGxvd2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhckluaXRzLnB1c2godHJhdmVyc2VWYXJJbml0KGMsIHMpKTtcbiAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgIC8vIGdldCBhbGwgc3RhdGVtZW50XG4gICAgZG8ge1xuICAgICAgICBpZiAoaXNGdW5jRGVmKGMpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQQVJTRVIgRVJST1I6IG5lc3RlZCBmdW5jdGlvbiBkZWZpbml0aW9uIGlzIG5vdyBhbGxvd2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1ZhckluaXQoYykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBBUlNFIEVSUk9SOiBWYXJpYWJsZSBpbml0aWFsaXphdGlvbiBzaG91bGQgZ28gYmVmb3JlIHN0YXRlbWVudHNcIik7XG4gICAgICAgIH1cbiAgICAgICAgc3RtdHMucHVzaCh0cmF2ZXJzZVN0bXQoYywgcykpO1xuICAgIH0gd2hpbGUgKGMubmV4dFNpYmxpbmcoKSk7XG4gICAgcmV0dXJuIHsgdmFySW5pdHM6IHZhckluaXRzLCBjbGFzc0RlZnM6IFtdLCBzdG10czogc3RtdHMsIGZ1bmNEZWZzOiBbXSB9O1xufVxuZnVuY3Rpb24gc3RyMnVuaW9wKG9wU3RyKSB7XG4gICAgc3dpdGNoIChvcFN0cikge1xuICAgICAgICBjYXNlIFwiLVwiOlxuICAgICAgICAgICAgcmV0dXJuIFVuaU9wLk1pbnVzO1xuICAgICAgICBjYXNlIFwibm90XCI6XG4gICAgICAgICAgICByZXR1cm4gVW5pT3AuTm90O1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJQQVJTRSBFUlJPUjogdW5zdXBwb3J0ZWQgdW5pYXJ5IG9wZXJhdG9yXCIpO1xufVxuZnVuY3Rpb24gc3RyMmJpbm9wKG9wU3RyKSB7XG4gICAgc3dpdGNoIChvcFN0cikge1xuICAgICAgICBjYXNlIFwiK1wiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLlBsdXM7XG4gICAgICAgIGNhc2UgXCItXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTWludXM7XG4gICAgICAgIGNhc2UgXCIqXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTXVsO1xuICAgICAgICBjYXNlIFwiLy9cIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5EaXY7XG4gICAgICAgIGNhc2UgXCIlXCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTW9kO1xuICAgICAgICBjYXNlIFwiPT1cIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5FcTtcbiAgICAgICAgY2FzZSBcIiE9XCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTmVxO1xuICAgICAgICBjYXNlIFwiPD1cIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5TZXE7XG4gICAgICAgIGNhc2UgXCI+PVwiOlxuICAgICAgICAgICAgcmV0dXJuIEJpbk9wLkxlcTtcbiAgICAgICAgY2FzZSBcIjxcIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5TbWw7XG4gICAgICAgIGNhc2UgXCI+XCI6XG4gICAgICAgICAgICByZXR1cm4gQmluT3AuTHJnO1xuICAgICAgICBjYXNlIFwiaXNcIjpcbiAgICAgICAgICAgIHJldHVybiBCaW5PcC5JcztcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUEFSU0UgRVJST1I6IHVua25vd24gYmluYXJ5IG9wZXJhdG9yXCIpO1xufVxuZnVuY3Rpb24gdHJhdmVyc2VXaGlsZShjLCBzKSB7XG4gICAgYy5maXJzdENoaWxkKCk7IC8vIHdoaWxlXG4gICAgYy5uZXh0U2libGluZygpOyAvLyBjb25kXG4gICAgdmFyIGNvbmQgPSB0cmF2ZXJzZUV4cHIoYywgcyk7XG4gICAgdmFyIHN0bXRzID0gW107XG4gICAgYy5uZXh0U2libGluZygpO1xuICAgIGMuZmlyc3RDaGlsZCgpO1xuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBkbyB7XG4gICAgICAgIHN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICB9IHdoaWxlIChjLm5leHRTaWJsaW5nKCkpO1xuICAgIGMucGFyZW50KCk7XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4geyB0YWc6IFwid2hpbGVcIiwgY29uZDogY29uZCwgc3RtdHM6IHN0bXRzIH07XG59XG5mdW5jdGlvbiB0cmF2ZXJzZUlmKGMsIHMpIHtcbiAgICB2YXIgaWZDbGF1c2UgPSB7XG4gICAgICAgIHRhZzogXCJpZlwiLFxuICAgICAgICBpZk9wOiB7XG4gICAgICAgICAgICBjb25kOiBudWxsLFxuICAgICAgICAgICAgc3RtdHM6IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgZWxpZk9wOiB7XG4gICAgICAgICAgICBjb25kOiBudWxsLFxuICAgICAgICAgICAgc3RtdHM6IG51bGwsXG4gICAgICAgIH0sXG4gICAgICAgIGVsc2VPcDoge1xuICAgICAgICAgICAgc3RtdHM6IG51bGxcbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gY2hlY2sgaWZcbiAgICBjLmZpcnN0Q2hpbGQoKTsgLy8gaWZcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgaWZDbGF1c2UuaWZPcC5jb25kID0gdHJhdmVyc2VFeHByKGMsIHMpO1xuICAgIGMubmV4dFNpYmxpbmcoKTtcbiAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICBjLm5leHRTaWJsaW5nKCk7XG4gICAgaWZDbGF1c2UuaWZPcC5zdG10cyA9IFtdO1xuICAgIGRvIHtcbiAgICAgICAgaWZDbGF1c2UuaWZPcC5zdG10cy5wdXNoKHRyYXZlcnNlU3RtdChjLCBzKSk7XG4gICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICBjLnBhcmVudCgpO1xuICAgIGlmICghYy5uZXh0U2libGluZygpKSB7XG4gICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgIHJldHVybiBpZkNsYXVzZTtcbiAgICB9XG4gICAgLy8gY2hlY2sgZWxpZiBpZlxuICAgIGlmIChjLnR5cGUubmFtZSA9PSAnZWxpZicpIHtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBpZkNsYXVzZS5lbGlmT3AuY29uZCA9IHRyYXZlcnNlRXhwcihjLCBzKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBpZkNsYXVzZS5lbGlmT3Auc3RtdHMgPSBbXTtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWZDbGF1c2UuZWxpZk9wLnN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICAgICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICAgICAgaWYgKCFjLm5leHRTaWJsaW5nKCkpIHtcbiAgICAgICAgICAgIGMucGFyZW50KCk7XG4gICAgICAgICAgICByZXR1cm4gaWZDbGF1c2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gY2hlY2sgZWxzZVxuICAgIGlmIChjLnR5cGUubmFtZSA9PSAnZWxzZScpIHtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBjLmZpcnN0Q2hpbGQoKTtcbiAgICAgICAgYy5uZXh0U2libGluZygpO1xuICAgICAgICBpZkNsYXVzZS5lbHNlT3Auc3RtdHMgPSBbXTtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWZDbGF1c2UuZWxzZU9wLnN0bXRzLnB1c2godHJhdmVyc2VTdG10KGMsIHMpKTtcbiAgICAgICAgfSB3aGlsZSAoYy5uZXh0U2libGluZygpKTtcbiAgICAgICAgYy5wYXJlbnQoKTtcbiAgICB9XG4gICAgYy5wYXJlbnQoKTtcbiAgICByZXR1cm4gaWZDbGF1c2U7XG59XG4vKlxuICogSGVscGVyIEZ1bmN0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5VHJlZSh0LCBzb3VyY2UsIGQpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICB2YXIgc3BhY2VzID0gXCIgXCIucmVwZWF0KGQgKiAyKTtcbiAgICBzdHIgKz0gc3BhY2VzICsgdC50eXBlLm5hbWU7XG4gICAgaWYgKFtcIk51bWJlclwiLCBcIkNhbGxFeHByZXNzaW9uXCIsIFwiQmluYXJ5RXhwcmVzc2lvblwiLCBcIlVuYXJ5RXhwcmVzc2lvblwiXS5pbmNsdWRlcyh0LnR5cGUubmFtZSkpIHtcbiAgICAgICAgc3RyICs9IFwiLS0+XCIgKyBzb3VyY2Uuc3Vic3RyaW5nKHQuZnJvbSwgdC50byk7XG4gICAgfVxuICAgIHN0ciArPSBcIlxcblwiO1xuICAgIGlmICh0LmZpcnN0Q2hpbGQoKSkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBzdHIgKz0gc3RyaW5naWZ5VHJlZSh0LCBzb3VyY2UsIGQgKyAxKTtcbiAgICAgICAgfSB3aGlsZSAodC5uZXh0U2libGluZygpKTtcbiAgICAgICAgdC5wYXJlbnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cbiIsIi8vIFRoaXMgaXMgYSBtYXNodXAgb2YgdHV0b3JpYWxzIGZyb206XG4vL1xuLy8gLSBodHRwczovL2dpdGh1Yi5jb20vQXNzZW1ibHlTY3JpcHQvd2FidC5qcy9cbi8vIC0gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWJBc3NlbWJseS9Vc2luZ190aGVfSmF2YVNjcmlwdF9BUElcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xudmFyIF9fZ2VuZXJhdG9yID0gKHRoaXMgJiYgdGhpcy5fX2dlbmVyYXRvcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIGJvZHkpIHtcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xuICAgICAgICB3aGlsZSAoXykgdHJ5IHtcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbn07XG5pbXBvcnQgd2FidCBmcm9tICd3YWJ0JztcbmltcG9ydCAqIGFzIGNvbXBpbGVyIGZyb20gJy4vY29tcGlsZXInO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICcuL3BhcnNlcic7XG4vLyBOT1RFKGpvZSk6IFRoaXMgaXMgYSBoYWNrIHRvIGdldCB0aGUgQ0xJIFJlcGwgdG8gcnVuLiBXQUJUIHJlZ2lzdGVycyBhIGdsb2JhbFxuLy8gdW5jYXVnaHQgZXhuIGhhbmRsZXIsIGFuZCB0aGlzIGlzIG5vdCBhbGxvd2VkIHdoZW4gcnVubmluZyB0aGUgUkVQTFxuLy8gKGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvcmVwbC5odG1sI3JlcGxfZ2xvYmFsX3VuY2F1Z2h0X2V4Y2VwdGlvbnMpLiBObyByZWFzb25cbi8vIGlzIGdpdmVuIGZvciB0aGlzIGluIHRoZSBkb2NzIHBhZ2UsIGFuZCBJIGhhdmVuJ3Qgc3BlbnQgdGltZSBvbiB0aGUgZG9tYWluXG4vLyBtb2R1bGUgdG8gZmlndXJlIG91dCB3aGF0J3MgZ29pbmcgb24gaGVyZS4gSXQgZG9lc24ndCBzZWVtIGNyaXRpY2FsIGZvciBXQUJUXG4vLyB0byBoYXZlIHRoaXMgc3VwcG9ydCwgc28gd2UgcGF0Y2ggaXQgYXdheS5cbmlmICh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBvbGRQcm9jZXNzT25fMSA9IHByb2Nlc3Mub247XG4gICAgcHJvY2Vzcy5vbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFyZ3NbX2ldID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnc1swXSA9PT0gXCJ1bmNhdWdodEV4Y2VwdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb2xkUHJvY2Vzc09uXzEuYXBwbHkocHJvY2VzcywgYXJncyk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHJ1bndhdHNyYyhzb3VyY2UsIGNvbmZpZykge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdhYnRJbnRlcmZhY2UsIHBhcnNlZCwgcmV0dXJuVHlwZSwgcmV0dXJuRXhwciwgY29tcGlsZWQsIGltcG9ydE9iamVjdCwgd2FzbVNvdXJjZSwgbXlNb2R1bGUsIGFzQmluYXJ5LCB3YXNtTW9kdWxlLCByZXN1bHQ7XG4gICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIHdhYnQoKV07XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICB3YWJ0SW50ZXJmYWNlID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZWQgPSBwYXJzZShzb3VyY2UpLnN0bXRzO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm5UeXBlID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuRXhwciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBpbGVkID0gY29tcGlsZXIuY29tcGlsZShzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnRPYmplY3QgPSBjb25maWcuaW1wb3J0T2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICB3YXNtU291cmNlID0gXCIobW9kdWxlXFxuICAgIChmdW5jICRwcmludF9udW0gKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcInByaW50X251bVxcXCIpIChwYXJhbSBpMzIpIChyZXN1bHQgaTMyKSlcXG4gICAgKGZ1bmMgJHByaW50X2Jvb2wgKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcInByaW50X2Jvb2xcXFwiKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChmdW5jICRwcmludF9ub25lIChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJwcmludF9ub25lXFxcIikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkcHJpbnQgKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcInByaW50XFxcIikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkYWJzIChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJhYnNcXFwiKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChmdW5jICRtYXggKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcIm1heFxcXCIpIChwYXJhbSBpMzIpIChwYXJhbSBpMzIpIChyZXN1bHQgaTMyKSlcXG4gICAgKGZ1bmMgJG1pbiAoaW1wb3J0IFxcXCJpbXBvcnRzXFxcIiBcXFwibWluXFxcIikgKHBhcmFtIGkzMikgKHBhcmFtIGkzMikgKHJlc3VsdCBpMzIpKVxcbiAgICAoZnVuYyAkcG93IChpbXBvcnQgXFxcImltcG9ydHNcXFwiIFxcXCJwb3dcXFwiKSAocGFyYW0gaTMyKSAocGFyYW0gaTMyKSAocmVzdWx0IGkzMikpXFxuICAgIChtZW1vcnkgKGltcG9ydCBcXFwiaW1wb3J0c1xcXCIgXFxcIm1lbVxcXCIpIDEpXFxuICAgIFwiLmNvbmNhdChjb21waWxlZC53YXNtU291cmNlLCBcIlxcbiAgKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3YXNtU291cmNlOiBcIi5jb25jYXQod2FzbVNvdXJjZSkpO1xuICAgICAgICAgICAgICAgICAgICBteU1vZHVsZSA9IHdhYnRJbnRlcmZhY2UucGFyc2VXYXQoXCJ0ZXN0LndhdFwiLCB3YXNtU291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgYXNCaW5hcnkgPSBteU1vZHVsZS50b0JpbmFyeSh7fSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKGFzQmluYXJ5LmJ1ZmZlciwgaW1wb3J0T2JqZWN0KV07XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICB3YXNtTW9kdWxlID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB3YXNtTW9kdWxlLmluc3RhbmNlLmV4cG9ydHMuZXhwb3J0ZWRfZnVuYygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qLywgcmVzdWx0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4iLCJ2YXIgX19hc3NpZ24gPSAodGhpcyAmJiB0aGlzLl9fYXNzaWduKSB8fCBmdW5jdGlvbiAoKSB7XG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKVxuICAgICAgICAgICAgICAgIHRbcF0gPSBzW3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0O1xuICAgIH07XG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuaW1wb3J0IHsgQmluT3AsIFVuaU9wIH0gZnJvbSAnLi9hc3QnO1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5VmFyRW52KGVudikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHZhcnM6IG5ldyBNYXAoZW52LnZhcnMpLFxuICAgICAgICBjbGFzc01ldGhvZHM6IG5ldyBNYXAoZW52LmNsYXNzTWV0aG9kcyksXG4gICAgICAgIGNsYXNzRmllbGRzOiBuZXcgTWFwKGVudi5jbGFzc0ZpZWxkcyksXG4gICAgICAgIGZ1bmNzOiBuZXcgTWFwKGVudi5mdW5jcyksXG4gICAgICAgIHJldFR5cGU6IGVudi5yZXRUeXBlXG4gICAgfTtcbn1cbi8vIGluaXRpYWxpemUgYW4gZW52aXJvbm1lbnQgc3R1cmN0dXJlXG5leHBvcnQgZnVuY3Rpb24gbmV3VHlwZUVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YXJzOiBuZXcgTWFwKCksXG4gICAgICAgIGNsYXNzTWV0aG9kczogbmV3IE1hcCgpLFxuICAgICAgICBjbGFzc0ZpZWxkczogbmV3IE1hcCgpLFxuICAgICAgICBmdW5jczogbmV3IE1hcCgpLFxuICAgICAgICByZXRUeXBlOiBcIk5vbmVcIlxuICAgIH07XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0dXBFbnYocHJvZ3JhbSkge1xuICAgIHZhciBldm4gPSBuZXdUeXBlRW52KCk7XG4gICAgLy8gZ2xvYmFsIHZhcmlhYmxlc1xuICAgIHByb2dyYW0udmFySW5pdHMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgICAgICBldm4udmFycy5zZXQodi5uYW1lLCB2LnR5cGUpO1xuICAgIH0pO1xuICAgIC8vIGNsYXNzIGRlZmluaXRpb25zXG4gICAgcHJvZ3JhbS5jbGFzc0RlZnMuZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgICAgICBpZiAocy50YWcgIT09IFwiY2xhc3NcIikge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFcnJvcjogVFlQRSBFUlJPUjogbm90IGEgY2xhc3NcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZGVmaW5lIHRoZSBmaWVsZHMgKG5hbWUgOiB0eXBlKVxuICAgICAgICB2YXIgZmllbGRzID0gcy5maWVsZHM7XG4gICAgICAgIHZhciBmaWVsZE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgZmllbGRzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgICAgIGZpZWxkTWFwLnNldChmLm5hbWUsIGYudHlwZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBldm4uY2xhc3NGaWVsZHMuc2V0KHMubmFtZSwgZmllbGRNYXApO1xuICAgICAgICAvLyBkZWZpbmUgdGhlIG1ldGhvZHMgKG5hbWUgOiBhcmdzIGFuZCByZXR1cm4gdHlwZSlcbiAgICAgICAgdmFyIG1ldGhvZHMgPSBzLm1ldGhvZHM7XG4gICAgICAgIHZhciBtZXRob2RNYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgIG1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgbWV0aG9kTWFwLnNldChtLm5hbWUsIFttLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHAudHlwZTsgfSksIG0ucmV0VHlwZV0pO1xuICAgICAgICB9KTtcbiAgICAgICAgZXZuLmNsYXNzTWV0aG9kcy5zZXQocy5uYW1lLCBtZXRob2RNYXApO1xuICAgICAgICAvLyBhZGQgdGhlIGNsYXNzIGluaXRpYWxpemF0aW9uIGZ1bmN0aW9uc1xuICAgICAgICBldm4uZnVuY3Muc2V0KHMubmFtZSwgW1tdLCB7IHRhZzogXCJvYmplY3RcIiwgY2xhc3M6IHMubmFtZSB9XSk7XG4gICAgfSk7XG4gICAgLy8gZnVuY3Rpb24gZGVmaW5pdGlvbnNcbiAgICBwcm9ncmFtLmZ1bmNEZWZzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgZXZuLmZ1bmNzLnNldChmLm5hbWUsIFtmLnBhcmFtcy5tYXAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHAudHlwZTsgfSksIGYucmV0VHlwZV0pO1xuICAgIH0pO1xuICAgIHJldHVybiBldm47XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrUHJvZ3JhbShwcm9nKSB7XG4gICAgdmFyIGVudiA9IHNldHVwRW52KHByb2cpO1xuICAgIHZhciBwcm9nVHlwZWQgPSB7XG4gICAgICAgIHZhckluaXRzOiBbXSxcbiAgICAgICAgY2xhc3NEZWZzOiBbXSxcbiAgICAgICAgZnVuY0RlZnM6IFtdLFxuICAgICAgICBzdG10czogW11cbiAgICB9O1xuICAgIC8vIGNoZWNrIGdsb2JhbCB2YXJpYWJsZSA9PiBUaGUgcmhzIHZhbHVlcyBzaG91bGQgaGF2ZSBjb3JyZWN0IHR5cGVzXG4gICAgcHJvZ1R5cGVkLnZhckluaXRzID0gdHlwZUNoZWNrVmFySW5pdChwcm9nLnZhckluaXRzLCBlbnYpO1xuICAgIC8vIGNoZWNrIGNsYXNzIGRlZmluaXRpb25zXG4gICAgcHJvZ1R5cGVkLmNsYXNzRGVmcyA9IHByb2cuY2xhc3NEZWZzLm1hcChmdW5jdGlvbiAoYykgeyByZXR1cm4gdHlwZUNoZWNrQ2xhc3NEZWYoYywgZW52KTsgfSk7XG4gICAgLy8gY2hlY2sgZnVuY3Rpb24gZGVmaW5pdGlvbnNcbiAgICBwcm9nVHlwZWQuZnVuY0RlZnMgPSBwcm9nLmZ1bmNEZWZzLm1hcChmdW5jdGlvbiAoZikgeyByZXR1cm4gdHlwZUNoZWNrRnVuY0RlZihmLCBlbnYpOyB9KTtcbiAgICAvLyBjaGVjayBtYWluIGJvZHlcbiAgICBwcm9nVHlwZWQuc3RtdHMgPSB0eXBlQ2hlY2tTdG10cyhwcm9nLnN0bXRzLCBlbnYpO1xuICAgIHJldHVybiBwcm9nVHlwZWQ7XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrU3RtdHMoc3RtdHMsIGVudikge1xuICAgIHZhciB0eXBlZFN0bXRzID0gW107XG4gICAgc3RtdHMuZm9yRWFjaChmdW5jdGlvbiAoc3RtdCkge1xuICAgICAgICBzd2l0Y2ggKHN0bXQudGFnKSB7XG4gICAgICAgICAgICBjYXNlIFwiYXNzaWduXCI6IC8vIGUuZy4gYSA9IDBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc3RtdCBpcyBhbiBcImlkXCIsIHdlIHdvdWxkIGNoZWNrIG9mIHRoZSB2YXJpYWJsZSBleGlzdHMuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHN0bXQgaXMgYSBcImdldGZpZWxkXCIsIHdlIHdvdWxkIGNoZWNrIHJlY3Vyc2l2ZWx5IHVudGlsIGl0J3MgYW4gXCJpZFwiLlxuICAgICAgICAgICAgICAgIHZhciBsZWZ0VHlwZWRWYWx1ZSA9IHR5cGVDaGVja0V4cHIoc3RtdC5uYW1lLCBlbnYpO1xuICAgICAgICAgICAgICAgIHZhciByaWdodFR5cGVkVmFsdWUgPSB0eXBlQ2hlY2tFeHByKHN0bXQudmFsdWUsIGVudik7IC8vIHRvIGdldCBhXG4gICAgICAgICAgICAgICAgaWYgKCFpc1NhbWVUeXBlKGxlZnRUeXBlZFZhbHVlLmEsIHJpZ2h0VHlwZWRWYWx1ZS5hKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVycm9yOiBUWVBFIEVSUk9SOiBFeHBlY3RlZCB0eXBlIFwiLmNvbmNhdChsZWZ0VHlwZWRWYWx1ZS5hLCBcIjsgZ290IHR5cGUgXCIpLmNvbmNhdChyaWdodFR5cGVkVmFsdWUuYSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGE6IFwiTm9uZVwiLCBuYW1lOiBsZWZ0VHlwZWRWYWx1ZSwgdmFsdWU6IHJpZ2h0VHlwZWRWYWx1ZSB9KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZXhwclwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZEV4cHIgPSB0eXBlQ2hlY2tFeHByKHN0bXQuZXhwciwgZW52KTtcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGV4cHI6IHR5cGVkRXhwciwgYTogXCJOb25lXCIgfSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInJldHVyblwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZFJldCA9IHR5cGVDaGVja0V4cHIoc3RtdC5leHByLCBlbnYpO1xuICAgICAgICAgICAgICAgIGlmICghaXNTYW1lVHlwZSh0eXBlZFJldC5hLCBlbnYucmV0VHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3I6IFRZUEUgRVJST1I6IHJldHVybiBleHBlY3RlZCB0eXBlIFwiLmNvbmNhdChlbnYucmV0VHlwZSwgXCI7IGdvdCB0eXBlIFwiKS5jb25jYXQodHlwZWRSZXQuYSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGV4cHI6IHR5cGVkUmV0LCBhOiB0eXBlZFJldC5hIH0pKTsgLy8gVGhpcyBjYW4gYWxzbyBiZSBcIk5vbmVcIlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInBhc3NcIjpcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHN0bXQpLCB7IGE6IFwiTm9uZVwiIH0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJ3aGlsZVwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZFdoaWxlID0gdHlwZUNoZWNrV2hpbGUoc3RtdCwgZW52KTtcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHR5cGVkV2hpbGUpLCB7IGE6IFwiTm9uZVwiIH0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJpZlwiOlxuICAgICAgICAgICAgICAgIHZhciB0eXBlZElmID0gdHlwZUNoZWNrSWYoc3RtdCwgZW52KTtcbiAgICAgICAgICAgICAgICB0eXBlZFN0bXRzLnB1c2goX19hc3NpZ24oX19hc3NpZ24oe30sIHR5cGVkSWYpLCB7IGE6IFwiTm9uZVwiIH0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0eXBlZFN0bXRzO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0V4cHIoZXhwciwgZW52KSB7XG4gICAgc3dpdGNoIChleHByLnRhZykge1xuICAgICAgICBjYXNlIFwiaWRcIjogLy8gY2hlY2sgaWYgdGhlIHZhcmlhYmxlIGhhcyBiZWVuIGRlZmluZWQgXG4gICAgICAgICAgICBpZiAoIWVudi52YXJzLmhhcyhleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogbm90IGEgdmFyaWFibGUgXCIuY29uY2F0KGV4cHIubmFtZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlkVHlwZSA9IGVudi52YXJzLmdldChleHByLm5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBhOiBpZFR5cGUgfSk7XG4gICAgICAgIGNhc2UgXCJiaW5vcFwiOlxuICAgICAgICAgICAgcmV0dXJuIHR5cGVDaGVja0Jpbk9wKGV4cHIsIGVudik7XG4gICAgICAgIGNhc2UgXCJ1bmlvcFwiOlxuICAgICAgICAgICAgcmV0dXJuIHR5cGVDaGVja1VuaU9wKGV4cHIsIGVudik7XG4gICAgICAgIGNhc2UgXCJsaXRlcmFsXCI6XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGE6IHR5cGVDaGVja0xpdGVyYWwoZXhwci5saXRlcmFsKS5hIH0pO1xuICAgICAgICBjYXNlIFwiY2FsbFwiOlxuICAgICAgICAgICAgdmFyIHR5cGVkQ2FsbCA9IHR5cGVDaGVja0NhbGwoZXhwciwgZW52KTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlZENhbGw7XG4gICAgICAgIGNhc2UgXCJnZXRmaWVsZFwiOlxuICAgICAgICAgICAgdmFyIHR5cGVkR2V0ZmllbGQgPSB0eXBlQ2hlY2tGaWVsZChleHByLCBlbnYpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVkR2V0ZmllbGQ7XG4gICAgICAgIGNhc2UgXCJtZXRob2RcIjpcbiAgICAgICAgICAgIHZhciB0eXBlZE1ldGhvZCA9IHR5cGVDaGVja01ldGhvZChleHByLCBlbnYpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVkTWV0aG9kO1xuICAgIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tCaW5PcChleHByLCBlbnYpIHtcbiAgICBpZiAoZXhwci50YWcgIT0gXCJiaW5vcFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IHR5cGVDaGVja0Jpbk9wIG9ubHkgdGFrZSBiaW5hcnkgb3BlcmF0aW9uXCIpO1xuICAgIH1cbiAgICBzd2l0Y2ggKGV4cHIub3ApIHtcbiAgICAgICAgLy8gd29yayBmb3IgaW50XG4gICAgICAgIGNhc2UgQmluT3AuUGx1czpcbiAgICAgICAgY2FzZSBCaW5PcC5NaW51czpcbiAgICAgICAgY2FzZSBCaW5PcC5NdWw6XG4gICAgICAgIGNhc2UgQmluT3AuRGl2OlxuICAgICAgICBjYXNlIEJpbk9wLk1vZDpcbiAgICAgICAgY2FzZSBCaW5PcC5TZXE6XG4gICAgICAgIGNhc2UgQmluT3AuTGVxOlxuICAgICAgICBjYXNlIEJpbk9wLlNtbDpcbiAgICAgICAgY2FzZSBCaW5PcC5Mcmc6XG4gICAgICAgICAgICB2YXIgbGVmdFR5cGVkID0gdHlwZUNoZWNrRXhwcihleHByLmxlZnQsIGVudik7IC8vIGFkZCB0aGUgdHlwZSB0byB0aGUgbGVmdCBleHByZXNzaW9uXG4gICAgICAgICAgICB2YXIgcmlnaHRUeXBlZCA9IHR5cGVDaGVja0V4cHIoZXhwci5yaWdodCwgZW52KTtcbiAgICAgICAgICAgIGlmICghaXNTYW1lVHlwZShsZWZ0VHlwZWQuYSwgcmlnaHRUeXBlZC5hKSB8fCAobGVmdFR5cGVkLmEgIT09IFwiaW50XCIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogQ2Fubm90IGFwcGx5IG9wZXJhdG9yICdcIi5jb25jYXQoZXhwci5vcCwgXCInIG9uIHR5cGVzICdcIikuY29uY2F0KGxlZnRUeXBlZC5hLCBcIicgYW5kIHR5cGUgJ1wiKS5jb25jYXQocmlnaHRUeXBlZC5hLCBcIidcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4cHIub3AgPT09IEJpbk9wLlNlcSB8fCBleHByLm9wID09PSBCaW5PcC5MZXEgfHwgZXhwci5vcCA9PT0gQmluT3AuU21sIHx8IGV4cHIub3AgPT09IEJpbk9wLkxyZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZXhwciksIHsgbGVmdDogbGVmdFR5cGVkLCByaWdodDogcmlnaHRUeXBlZCwgYTogXCJib29sXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGxlZnQ6IGxlZnRUeXBlZCwgcmlnaHQ6IHJpZ2h0VHlwZWQsIGE6IFwiaW50XCIgfSk7XG4gICAgICAgIC8vIHdvcmsgZm9yIGJvdGggaW50IGFuZCBib29sLCBidXQgbm90IE5vbmVcbiAgICAgICAgY2FzZSBCaW5PcC5FcTpcbiAgICAgICAgY2FzZSBCaW5PcC5OZXE6XG4gICAgICAgICAgICB2YXIgbGVmdFR5cGVkRXEgPSB0eXBlQ2hlY2tFeHByKGV4cHIubGVmdCwgZW52KTtcbiAgICAgICAgICAgIHZhciByaWdodFR5cGVkRXEgPSB0eXBlQ2hlY2tFeHByKGV4cHIucmlnaHQsIGVudik7XG4gICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IGNsYXNzZXMgYW5kIFwiTm9uZVwiXG4gICAgICAgICAgICBpZiAoIWlzU2FtZVR5cGUobGVmdFR5cGVkRXEuYSwgcmlnaHRUeXBlZEVxLmEpIHx8IGlzT2JqZWN0KGxlZnRUeXBlZEVxLmEpIHx8IGxlZnRUeXBlZEVxLmEgPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBDYW5ub3QgYXBwbHkgb3BlcmF0b3IgJ1wiLmNvbmNhdChleHByLm9wLCBcIicgb24gdHlwZXMgJ1wiKS5jb25jYXQobGVmdFR5cGVkRXEuYSwgXCInIGFuZCB0eXBlICdcIikuY29uY2F0KHJpZ2h0VHlwZWRFcS5hLCBcIidcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBleHByKSwgeyBsZWZ0OiBsZWZ0VHlwZWRFcSwgcmlnaHQ6IHJpZ2h0VHlwZWRFcSwgYTogXCJib29sXCIgfSk7XG4gICAgICAgIC8vIHdvcmsgZm9yIE5vbmUgYW5kIG90aGVyIGNsYXNzZXNcbiAgICAgICAgY2FzZSBCaW5PcC5JczpcbiAgICAgICAgICAgIHZhciBsZWZ0VHlwZWRJcyA9IHR5cGVDaGVja0V4cHIoZXhwci5sZWZ0LCBlbnYpO1xuICAgICAgICAgICAgdmFyIHJpZ2h0VHlwZWRJcyA9IHR5cGVDaGVja0V4cHIoZXhwci5yaWdodCwgZW52KTtcbiAgICAgICAgICAgIGlmIChsZWZ0VHlwZWRJcy5hID09PSBcImludFwiIHx8IGxlZnRUeXBlZElzLmEgPT09IFwiYm9vbFwiIHx8IHJpZ2h0VHlwZWRJcy5hID09PSBcImludFwiIHx8IHJpZ2h0VHlwZWRJcy5hID09PSBcImJvb2xcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IENhbm5vdCBhcHBseSBvcGVyYXRvciAnXCIuY29uY2F0KGV4cHIub3AsIFwiJyBvbiB0eXBlcyAnXCIpLmNvbmNhdChsZWZ0VHlwZWRJcy5hLCBcIicgYW5kIHR5cGUgJ1wiKS5jb25jYXQocmlnaHRUeXBlZElzLmEsIFwiJ1wiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGxlZnQ6IGxlZnRUeXBlZElzLCByaWdodDogcmlnaHRUeXBlZElzLCBhOiBcImJvb2xcIiB9KTtcbiAgICB9XG59XG4vLyBzaG91bGQgcmV0dXJuIHRydWUgaW4gdGhlIGZpcnN0IHN0YXRlbWVudCBpZiBib3RoIGFyZSBub3Qgb2JqZWN0c1xuZXhwb3J0IGZ1bmN0aW9uIGlzU2FtZVR5cGUocywgdCkge1xuICAgIGlmIChzID09PSB0KSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBib3RoIFwiaW50XCIsIFwiYm9vbFwiLCBvciBcIk5vbmVcIlxuICAgIH1cbiAgICBlbHNlIGlmIChzID09PSBcImludFwiIHx8IHMgPT09IFwiYm9vbFwiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSBpZiAodCA9PT0gXCJpbnRcIiB8fCB0ID09PSBcImJvb2xcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHQgPT09IFwiTm9uZVwiIHx8IHMgPT09IFwiTm9uZVwiKSB7IC8vIFwiTm9uZVwiIGlzIHRoZSBzYW1lIHR5cGUgYXMgYW55IGNsYXNzZXNcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gKHMudGFnID09PSB0LnRhZyAmJiBzLmNsYXNzID09PSB0LmNsYXNzKTsgLy8gYm90aCBvYmplY3RzXG4gICAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHMpIHtcbiAgICBpZiAocyA9PT0gXCJpbnRcIiB8fCBzID09PSBcImJvb2xcIiB8fCBzID09PSBcIk5vbmVcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1VuaU9wKGV4cHIsIGVudikge1xuICAgIGlmIChleHByLnRhZyAhPSBcInVuaW9wXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogdHlwZUNoZWNrVW5pT3Agb25seSB0YWtlIHVuYXJ5IG9wZXJhdGlvbnNcIik7XG4gICAgfVxuICAgIHN3aXRjaCAoZXhwci5vcCkge1xuICAgICAgICAvLyB3b3JrIGZvciBpbnRcbiAgICAgICAgY2FzZSBVbmlPcC5NaW51czpcbiAgICAgICAgICAgIHZhciB0eXBlZEV4cHIgPSB0eXBlQ2hlY2tFeHByKGV4cHIuZXhwciwgZW52KTtcbiAgICAgICAgICAgIGlmICh0eXBlZEV4cHIuYSAhPT0gXCJpbnRcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IHVuaWFyeSBvcGVyYXRvciBcIi5jb25jYXQoVW5pT3AuTWludXMsIFwiIGV4cGVjdGVkIFwiKS5jb25jYXQoXCJpbnRcIiwgXCI7IGdvdCB0eXBlIFwiKS5jb25jYXQodHlwZWRFeHByLmEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZXhwciksIHsgZXhwcjogdHlwZWRFeHByLCBhOiBcImludFwiIH0pO1xuICAgICAgICAvLyB3b3JrIGZvciBib29sXG4gICAgICAgIGNhc2UgVW5pT3AuTm90OlxuICAgICAgICAgICAgdmFyIG5vdFR5cGVkRXhwciA9IHR5cGVDaGVja0V4cHIoZXhwci5leHByLCBlbnYpO1xuICAgICAgICAgICAgaWYgKG5vdFR5cGVkRXhwci5hICE9PSBcImJvb2xcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEVDSEVDSyBFUlJPUjogdW5pYXJ5IG9wZXJhdG9yIFwiLmNvbmNhdChVbmlPcC5Ob3QsIFwiIGV4cGVjdGVkIFwiKS5jb25jYXQoXCJib29sXCIsIFwiOyBnb3QgdHlwZSBcIikuY29uY2F0KG5vdFR5cGVkRXhwci5hKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGV4cHI6IG5vdFR5cGVkRXhwciwgYTogXCJib29sXCIgfSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiB1bmRlZmluZWQgdW5hcnkgb3BlcmF0b3IgXCIuY29uY2F0KGV4cHIsIFwiLiBUaGlzIGVycm9yIHNob3VsZCBiZSBjYWxsZWQgaW4gcGFyc2VyXCIpKTtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrV2hpbGUoc3RtdCwgZW52KSB7XG4gICAgaWYgKHN0bXQudGFnICE9PSAnd2hpbGUnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IHRoZSBpbnB1dCBzdGF0ZW1lbnQgc2hvdWxkIGJlIHdoaWxlIHdoZW4gY2FsbGluZyB0eXBlQ2hlY2tXaGlsZVwiKTtcbiAgICB9XG4gICAgdmFyIHR5cGVkV2hpbGVDb25kID0gdHlwZUNoZWNrRXhwcihzdG10LmNvbmQsIGVudik7XG4gICAgdmFyIHR5cGVkV2hpbGVCb2R5ID0gdHlwZUNoZWNrU3RtdHMoc3RtdC5zdG10cywgZW52KTtcbiAgICBpZiAodHlwZWRXaGlsZUNvbmQuYSAhPT0gXCJib29sXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogQ29uZHRpb24gZXhwcmVzc2lvbiBjYW5ub3QgYmUgb2YgdHlwZSAnXCIuY29uY2F0KHR5cGVkV2hpbGVDb25kLmEsIFwiJ1wiKSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGE6IFwiTm9uZVwiLFxuICAgICAgICB0YWc6ICd3aGlsZScsXG4gICAgICAgIGNvbmQ6IHR5cGVkV2hpbGVDb25kLFxuICAgICAgICBzdG10czogdHlwZWRXaGlsZUJvZHlcbiAgICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0lmKHN0bXQsIGVudikge1xuICAgIGlmIChzdG10LnRhZyAhPT0gJ2lmJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiB0aGUgaW5wdXQgc3RhdGVtZW50IHNob3VsZCBiZSBpZiB3aGVuIGNhbGxpbmcgdHlwZUNoZWNrSWZcIik7XG4gICAgfVxuICAgIC8vIGNoZWNrIGlmXG4gICAgdmFyIHR5cGVkSWZDb25kID0gdHlwZUNoZWNrRXhwcihzdG10LmlmT3AuY29uZCwgZW52KTtcbiAgICB2YXIgdHlwZWRJZkJvZHkgPSB0eXBlQ2hlY2tTdG10cyhzdG10LmlmT3Auc3RtdHMsIGVudik7XG4gICAgaWYgKHR5cGVkSWZDb25kLmEgIT09IFwiYm9vbFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IENvbmR0aW9uIGV4cHJlc3Npb24gY2Fubm90IGJlIG9mIHR5cGUgJ1wiLmNvbmNhdCh0eXBlZElmQ29uZC5hLCBcIidcIikpO1xuICAgIH1cbiAgICAvLyBjaGVjayBlbGlmXG4gICAgdmFyIHR5cGVkRWxpZkNvbmQgPSBudWxsO1xuICAgIHZhciB0eXBlZEVsaWZCb2R5ID0gbnVsbDtcbiAgICBpZiAoc3RtdC5lbGlmT3AuY29uZCAhPT0gbnVsbCkge1xuICAgICAgICB0eXBlZEVsaWZDb25kID0gdHlwZUNoZWNrRXhwcihzdG10LmVsaWZPcC5jb25kLCBlbnYpO1xuICAgICAgICB0eXBlZEVsaWZCb2R5ID0gdHlwZUNoZWNrU3RtdHMoc3RtdC5lbGlmT3Auc3RtdHMsIGVudik7XG4gICAgICAgIGlmICh0eXBlZEVsaWZDb25kLmEgIT09IFwiYm9vbFwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBDb25kdGlvbiBleHByZXNzaW9uIGNhbm5vdCBiZSBvZiB0eXBlICdcIi5jb25jYXQodHlwZWRFbGlmQ29uZC5hLCBcIidcIikpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGNoZWNrIGVsc2U6XG4gICAgdmFyIHRweWVkRWxzZUJvZHkgPSBudWxsO1xuICAgIGlmIChzdG10LmVsc2VPcC5zdG10cyAhPT0gbnVsbCkge1xuICAgICAgICB0cHllZEVsc2VCb2R5ID0gdHlwZUNoZWNrU3RtdHMoc3RtdC5lbHNlT3Auc3RtdHMsIGVudik7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGE6IFwiTm9uZVwiLFxuICAgICAgICB0YWc6IFwiaWZcIixcbiAgICAgICAgaWZPcDogeyBjb25kOiB0eXBlZElmQ29uZCwgc3RtdHM6IHR5cGVkSWZCb2R5IH0sXG4gICAgICAgIGVsaWZPcDogeyBjb25kOiB0eXBlZEVsaWZDb25kLCBzdG10czogdHlwZWRFbGlmQm9keSB9LFxuICAgICAgICBlbHNlT3A6IHsgc3RtdHM6IHRweWVkRWxzZUJvZHkgfVxuICAgIH07XG59XG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrRmllbGQoZXhwciwgZW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9PSBcImdldGZpZWxkXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogdHlwZUNoZWNrTWV0aG9kIG9ubHkgYWNjZXB0cyBhIGdldGZpZWxkIGFzIGFuIGlucHV0IGV4cHJcIik7XG4gICAgfVxuICAgIHZhciB0eXBlZE9iaiA9IHR5cGVDaGVja0V4cHIoZXhwci5vYmosIGVudik7XG4gICAgaWYgKHR5cGVkT2JqLmEgPT09IFwiaW50XCIgfHwgdHlwZWRPYmouYSA9PT0gXCJib29sXCIgfHwgdHlwZWRPYmouYSA9PT0gXCJOb25lXCIpIHsgLy8gY2Fubm90IGNvbXBpbGUgd2l0aCBpc09iamVjdCgpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IE9ubHkgb2JqZWN0cyBjYW4gZ2V0IGZpZWxkcy5cIik7XG4gICAgfVxuICAgIGlmICghZW52LmNsYXNzRmllbGRzLmhhcyh0eXBlZE9iai5hLmNsYXNzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBUaGUgY2xhc3MgZG9lc24ndCBleGlzdC5cIik7XG4gICAgfVxuICAgIHZhciBjbGFzc0ZpZWxkcyA9IGVudi5jbGFzc0ZpZWxkcy5nZXQodHlwZWRPYmouYS5jbGFzcyk7XG4gICAgaWYgKCFjbGFzc0ZpZWxkcy5oYXMoZXhwci5uYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBUaGUgZmllbGQgZG9lc24ndCBleGlzdCBpbiB0aGUgY2xhc3MuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IG9iajogdHlwZWRPYmosIGE6IGNsYXNzRmllbGRzLmdldChleHByLm5hbWUpIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja01ldGhvZChleHByLCBlbnYpIHtcbiAgICBpZiAoZXhwci50YWcgIT09IFwibWV0aG9kXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogdHlwZUNoZWNrTWV0aG9kIG9ubHkgYWNjZXB0cyBhIG1ldGhvZCBhcyBhbiBpbnB1dCBleHByXCIpO1xuICAgIH1cbiAgICB2YXIgdHlwZWRPYmogPSB0eXBlQ2hlY2tFeHByKGV4cHIub2JqLCBlbnYpO1xuICAgIGlmICh0eXBlZE9iai5hID09PSBcImludFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiYm9vbFwiIHx8IHR5cGVkT2JqLmEgPT09IFwiTm9uZVwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IE9ubHkgY2xhc3NlcyBjYW4gY2FsbCBtZXRob2RzLlwiKTtcbiAgICB9XG4gICAgaWYgKCFlbnYuY2xhc3NNZXRob2RzLmhhcyh0eXBlZE9iai5hLmNsYXNzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBUaGUgY2xhc3MgZG9lc24ndCBleGlzdC5cIik7XG4gICAgfVxuICAgIHZhciBjbGFzc01ldGhvZHMgPSBlbnYuY2xhc3NNZXRob2RzLmdldCh0eXBlZE9iai5hLmNsYXNzKTtcbiAgICBpZiAoIWNsYXNzTWV0aG9kcy5oYXMoZXhwci5uYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBUaGUgbWV0aG9kIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGNsYXNzLlwiKTtcbiAgICB9XG4gICAgdmFyIF9hID0gY2xhc3NNZXRob2RzLmdldChleHByLm5hbWUpLCBhcmdUeXBzID0gX2FbMF0sIHJldFR5cCA9IF9hWzFdO1xuICAgIHZhciB0eXBlZEFyZ3MgPSBleHByLmFyZ3MubWFwKGZ1bmN0aW9uIChhKSB7IHJldHVybiB0eXBlQ2hlY2tFeHByKGEsIGVudik7IH0pO1xuICAgIGlmIChhcmdUeXBzLmxlbmd0aCAhPSB0eXBlZEFyZ3MubGVuZ3RoKSB7IC8vIFdlIGVzY2FwZWQgXCJzZWxmXCIgaW4gdGhlIHBhcnNlci5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogVGhlIG51bWJlciBvZiBwYXJhbWV0ZXJzIGlzIGluY29ycmVjdC5cIik7XG4gICAgfVxuICAgIGFyZ1R5cHMuZm9yRWFjaChmdW5jdGlvbiAodCwgaSkge1xuICAgICAgICBpZiAoIWlzU2FtZVR5cGUodCwgdHlwZWRBcmdzW2ldLmEpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBpbmNvcnJlY3QgcGFyYW1ldGVyIHR5cGVcIik7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IG9iajogdHlwZWRPYmosIGFyZ3M6IHR5cGVkQXJncywgYTogcmV0VHlwIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0NhbGwoZXhwciwgZW52KSB7XG4gICAgaWYgKGV4cHIudGFnICE9PSBcImNhbGxcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiB0eXBlQ2hlY2tDYWxsIG9ubHkgYWNjZXB0IGEgY2FsbCBhcyBhbiBpbnB1dCBleHByXCIpO1xuICAgIH1cbiAgICBpZiAoIWVudi5mdW5jcy5oYXMoZXhwci5uYW1lKSkge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJUWVBFQ0hFQ0sgV0FSTklORzogSWYgdGhlIFwiLmNvbmNhdChleHByLm5hbWUsIFwiIGZ1bmN0aW9uIGlzIGFuIGltcG9ydGVkIG9uZSwgd2UgZG9uJ3QgZG8gYW55IHR5cGUgY2hlY2suXCIpKTsgLy8gZXguIHByaW50KClcbiAgICAgICAgdmFyIHR5cGVkQXJnc18xID0gZXhwci5hcmdzLm1hcChmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZUNoZWNrRXhwcihhcmcsIGVudik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGFyZ3M6IHR5cGVkQXJnc18xLCBhOiBcIk5vbmVcIiB9KTtcbiAgICB9XG4gICAgLy8gY2hlY2sgIyBwYXJhbXNcbiAgICB2YXIgcGFyYW1zID0gZW52LmZ1bmNzLmdldChleHByLm5hbWUpWzBdO1xuICAgIHZhciBhcmdzID0gZXhwci5hcmdzO1xuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gcGFyYW1zLmxlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiBjYWxsIGZ1bmMgXCIuY29uY2F0KGV4cHIubmFtZSwgXCI7IGV4cGVjdGVkIFwiKS5jb25jYXQocGFyYW1zLmxlbmd0aCwgXCIgYXJndW1lbnRzOyBnb3QgXCIpLmNvbmNhdChhcmdzLmxlbmd0aCkpO1xuICAgIH1cbiAgICAvLyBjaGVjayBhcmd1bWVudCB0eXBlXG4gICAgdmFyIHR5cGVkQXJncyA9IFtdO1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHBhcmFtcy5sZW5ndGg7ICsraWR4KSB7XG4gICAgICAgIHZhciB0eXBlZEFyZyA9IHR5cGVDaGVja0V4cHIoYXJnc1tpZHhdLCBlbnYpO1xuICAgICAgICBpZiAodHlwZWRBcmcuYSAhPT0gcGFyYW1zW2lkeF0pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IGNhbGwgZnVuYyBcIi5jb25jYXQoZXhwci5uYW1lLCBcIjsgZXhwZWN0ZWQgdHlwZSBcIikuY29uY2F0KHBhcmFtc1tpZHhdLCBcIjsgZ290IHR5cGUgXCIpLmNvbmNhdCh0eXBlZEFyZy5hLCBcIiBpbiBwYXJhbWV0ZXJzIFwiKS5jb25jYXQoaWR4KSk7XG4gICAgICAgIH1cbiAgICAgICAgdHlwZWRBcmdzLnB1c2godHlwZWRBcmcpO1xuICAgIH1cbiAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGV4cHIpLCB7IGFyZ3M6IHR5cGVkQXJncywgYTogZW52LmZ1bmNzLmdldChleHByLm5hbWUpWzFdIH0pOyAvLyB1c2UgdGhlIHJldHVybiB0eXBlXG59XG4vLyBtYWtlIHN1cmUgdGhlIHZhcmlhYmxlIHR5cGUgaXMgZXF1YWwgdG8gdGhlIGxpdGVyYWwgdHlwZVxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja1ZhckluaXQoaW5pdHMsIGVudikge1xuICAgIHZhciB0eXBlZEluaXRzID0gW107XG4gICAgdmFyIHNjb3BlVmFyID0gbmV3IFNldCgpO1xuICAgIGluaXRzLmZvckVhY2goZnVuY3Rpb24gKGluaXQpIHtcbiAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGxlZnQgaGFuZCB0eXBlIGVxdWFscyB0byB0aGUgcmlnaHQgaGFuZCB0eXBlXG4gICAgICAgIC8vIGV4LiB4OmludCBhbmQgMVxuICAgICAgICB2YXIgdHlwZWRMaXRlcmFsID0gdHlwZUNoZWNrTGl0ZXJhbChpbml0LmluaXRMaXRlcmFsKTtcbiAgICAgICAgaWYgKCFpc1NhbWVUeXBlKGluaXQudHlwZSwgdHlwZWRMaXRlcmFsLmEpICYmICEoaXNPYmplY3QoaW5pdC50eXBlKSAmJiB0eXBlZExpdGVyYWwuYSA9PT0gXCJOb25lXCIpKSB7IC8vIGV4LiByMSA6IFJhdCA9IE5vbmVcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiRXJyb3I6IFRZUEUgRVJST1I6IGluaXQgdHlwZSBkb2VzIG5vdCBtYXRjaCBsaXRlcmFsIHR5cGVcIik7XG4gICAgICAgIH1cbiAgICAgICAgdHlwZWRJbml0cy5wdXNoKF9fYXNzaWduKF9fYXNzaWduKHt9LCBpbml0KSwgeyBhOiBpbml0LnR5cGUsIGluaXRMaXRlcmFsOiB0eXBlZExpdGVyYWwgfSkpOyAvLyBhZGQgdGhlIHR5cGVzIHRvIFZhckluaXRcbiAgICB9KTtcbiAgICByZXR1cm4gdHlwZWRJbml0cztcbn1cbi8qXG5DaGVjayB0aGUgdHlwZSBvZiBjbGFzcyBkZWZpbml0aW9uOlxuKDEpIGFkZCB0aGUgY2xhc3MgdmFyaWFibGVzXG4oMikgY2hlY2sgZWFjaCBmdW5jdGlvblxuKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tDbGFzc0RlZihjbHMsIGVudikge1xuICAgIGlmIChjbHMudGFnICE9PSBcImNsYXNzXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVFlQRSBFUlJPUjogVGhpcyBpcyBub3QgYSBjbGFzcyBzdGF0ZW1lbnQuXCIpO1xuICAgIH1cbiAgICAvLyBUaGUgbWV0aG9kcyBpbiB0aGUgY2xhc3MgY2FuIGFjY2VzcyB0aGUgZ2xvYmFsIHZhcmlhYmxlcy5cbiAgICB2YXIgbG9jYWxFbnYgPSBkZWVwQ29weVZhckVudihlbnYpOyAvLyBpbmNsdWRlIGdsb2JhbCB2YXJpYWJsZXMgaW4gdGhlIGxvY2FsIGVudmlyb25tZW50XG4gICAgLy8gY2hlY2sgdmFyaWFibGUgaW5pdGlhbGl6YXRpb25zXG4gICAgdmFyIGxvY2FsVHlwZWRJbml0cyA9IHR5cGVDaGVja1ZhckluaXQoY2xzLmZpZWxkcywgbG9jYWxFbnYpOyAvLyBjaGVjayB0aGUgdHlwZVxuICAgIGNscy5maWVsZHMuZm9yRWFjaChmdW5jdGlvbiAobG9jYWxUeXBlZEluaXQpIHtcbiAgICAgICAgbG9jYWxFbnYudmFycy5zZXQoXCJzZWxmLlwiICsgbG9jYWxUeXBlZEluaXQubmFtZSwgbG9jYWxUeXBlZEluaXQudHlwZSk7IC8vIHRvIGRpc3Rpbmd1aXNoIHNlbGYuYSBmcm9tIGFcbiAgICB9KTsgLy8gYWRkIHZhcmlhYmxlcyB0byB0aGUgZW52aXJvbm1lbnRcbiAgICBsb2NhbEVudi52YXJzLnNldChcInNlbGZcIiwgeyB0YWc6IFwib2JqZWN0XCIsIGNsYXNzOiBjbHMubmFtZSB9KTsgLy8gYWRkIHRoZSBcInNlbGZcIiB2YXJpYWJsZSB0byB0aGUgZW52aXJvbm1lbnRcbiAgICAvLyBjaGVjayBtZXRob2QgZGVmaW5pdGlvbnNcbiAgICB2YXIgbG9jYWxUeXBlZE1ldGhvZHMgPSBjbHMubWV0aG9kcy5tYXAoZnVuY3Rpb24gKG0pIHsgcmV0dXJuIHR5cGVDaGVja0Z1bmNEZWYobSwgbG9jYWxFbnYpOyB9KTsgLy8gdXNlIHRoZSBzYW1lIGZ1bmN0aW9uXG4gICAgcmV0dXJuIF9fYXNzaWduKF9fYXNzaWduKHt9LCBjbHMpLCB7IGE6IFwiTm9uZVwiLCBmaWVsZHM6IGxvY2FsVHlwZWRJbml0cywgbWV0aG9kczogbG9jYWxUeXBlZE1ldGhvZHMgfSk7IC8vIEEgY2xhc3MgZGVmaW5pdGlvbiBkb2Vzbid0IHJlcXVpcmUgYW4gXCJhXCIuXG59XG4vKlxuICogQ2hlY2sgdGhlIHR5cGUgb2YgZnVuY3Rpb24gZGVmaW5pdGlvbjpcbiAqICgxKSBuZWVkIHRvIHVwZGF0ZSB0aGUgdHlwZSB2YXIgZW52IGJlZm9yZSBjaGVja2luZyB0aGUgZnVuYyBib2R5XG4gKiAoMikgbmVlZCB0byBjaGVjayB0aGUgc3RhdGVtZW50c1xuICogKDMpIHRoZSByZXR1cm4gdHlwZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrRnVuY0RlZihmdW5jLCBlbnYpIHtcbiAgICAvLyBUaGUgZ2xvYmFsIHZhcmlhYmxlcyBhcmUgaW5jbHVkZWQgaW4gdGhlIGxvY2FsIGVudmlyb25tZW50LlxuICAgIHZhciBsb2NhbEVudiA9IGRlZXBDb3B5VmFyRW52KGVudik7XG4gICAgLy8gYWRkIHBhcmFtcyB0byBlbnZzXG4gICAgdmFyIHNjb3BlVmFyID0gbmV3IFNldCgpOyAvLyBXZSBuZWVkIHRoaXMgYmVjYXVzZSBsb2NhbEVudiBjb250YWlucyBnbG9iYWwgdmFyaWFibGVzLlxuICAgIHZhciB0eXBlZFBhcmFtcyA9IHR5cGVDaGVja1BhcmFtcyhmdW5jLnBhcmFtcyk7XG4gICAgZnVuYy5wYXJhbXMuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0pIHtcbiAgICAgICAgLy8gUGFyYW1zIGFyZSBhZGRlZCBmaXJzdCB0byBjaGVjayBkdXBsaWNhdGUgaW5pdGlhbGl6YXRpb25zLlxuICAgICAgICBpZiAoc2NvcGVWYXIuaGFzKHBhcmFtLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlRZUEUgRVJST1I6IGR1cGxpY2F0ZSBwYXJhbSBkZWNsYXJhdGlvbiBpbiB0aGUgc2FtZSBmaWVsZFwiKTtcbiAgICAgICAgfVxuICAgICAgICBzY29wZVZhci5hZGQocGFyYW0ubmFtZSk7XG4gICAgICAgIGxvY2FsRW52LnZhcnMuc2V0KHBhcmFtLm5hbWUsIHBhcmFtLnR5cGUpO1xuICAgIH0pO1xuICAgIC8vIGNoZWNrIGluaXRzIC0+IGFkZCB0byBlbnZzXG4gICAgdmFyIGxvY2FsVHlwZWRJbml0cyA9IHR5cGVDaGVja1ZhckluaXQoZnVuYy52YXJJbml0cywgbG9jYWxFbnYpO1xuICAgIGZ1bmMudmFySW5pdHMuZm9yRWFjaChmdW5jdGlvbiAobG9jYWxUeXBlZEluaXQpIHtcbiAgICAgICAgaWYgKHNjb3BlVmFyLmhhcyhsb2NhbFR5cGVkSW5pdC5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJUWVBFIEVSUk9SOiBkdXBsaWNhdGUgaW5pdCBkZWNsYXJhdGlvbiBpbiB0aGUgc2FtZSBmaWVsZFwiKTtcbiAgICAgICAgfVxuICAgICAgICBzY29wZVZhci5hZGQobG9jYWxUeXBlZEluaXQubmFtZSk7XG4gICAgICAgIGxvY2FsRW52LnZhcnMuc2V0KGxvY2FsVHlwZWRJbml0Lm5hbWUsIGxvY2FsVHlwZWRJbml0LnR5cGUpO1xuICAgIH0pO1xuICAgIC8vIGFkZCByZXR1cm4gdHlwZVxuICAgIGxvY2FsRW52LnJldFR5cGUgPSBmdW5jLnJldFR5cGU7XG4gICAgLy8gY2hlY2sgYm9keSBzdGF0ZW1lbnRzXG4gICAgdmFyIHR5cGVkU3RtdHMgPSB0eXBlQ2hlY2tTdG10cyhmdW5jLnN0bXRzLCBsb2NhbEVudik7XG4gICAgLy8gbWFrZSBzdXJlIGV2ZXJ5IHBhdGggaGFzIHRoZSBleHBlY3RlZCByZXR1cm4gXG4gICAgaWYgKCF0eXBlQ2hlY2tIYXNSZXR1cm4oZnVuYy5zdG10cywgZW52KSAmJiBmdW5jLnJldFR5cGUgIT09IFwiTm9uZVwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRZUEUgRVJST1I6IEFsbCBwYXRocyBpbiBmdW5jdGlvbi9tZXRob2QgbXVzdCBoYXZlIGEgcmV0dXJuIHN0YXRlbWVudDogXCIuY29uY2F0KGZ1bmMubmFtZSkpO1xuICAgIH1cbiAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGZ1bmMpLCB7IHBhcmFtczogdHlwZWRQYXJhbXMsIHZhckluaXRzOiBsb2NhbFR5cGVkSW5pdHMsIHN0bXRzOiB0eXBlZFN0bXRzIH0pO1xufVxuLy8gc2ltcGx5IGFzc2lnbiB0aGUgdHlwZSB0byBhXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrUGFyYW1zKHBhcmFtcykge1xuICAgIHJldHVybiBwYXJhbXMubWFwKGZ1bmN0aW9uIChwKSB7IHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgcCksIHsgYTogcC50eXBlIH0pOyB9KTtcbn1cbi8vIFRoZSB0YWdzIG9mIGxpdGVyYWxzIGFyZSB0aGVpciB0eXBlcy5cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQ2hlY2tMaXRlcmFsKGxpdGVyYWwpIHtcbiAgICBzd2l0Y2ggKGxpdGVyYWwudGFnKSB7XG4gICAgICAgIGNhc2UgXCJudW1cIjpcbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgbGl0ZXJhbCksIHsgYTogXCJpbnRcIiB9KTtcbiAgICAgICAgY2FzZSBcImJvb2xcIjpcbiAgICAgICAgICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgbGl0ZXJhbCksIHsgYTogXCJib29sXCIgfSk7XG4gICAgICAgIGNhc2UgXCJub25lXCI6XG4gICAgICAgICAgICByZXR1cm4gX19hc3NpZ24oX19hc3NpZ24oe30sIGxpdGVyYWwpLCB7IGE6IFwiTm9uZVwiIH0pO1xuICAgIH1cbn1cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGNoZWNrIHdoZXRoZXIgdGhpcyBib2R5IGFyZ3VtZW50IGhhcyB0aGVcbiAqIGRlc2lyZWQgcmV0dXJuIHZhbHVlXG4gKiBAcGFyYW0gYm9keVxuICogQHBhcmFtIGVudlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZUNoZWNrSGFzUmV0dXJuKGJvZHksIGVudikge1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGJvZHkubGVuZ3RoOyArK2lkeCkge1xuICAgICAgICB2YXIgc3RtdCA9IGJvZHlbaWR4XTtcbiAgICAgICAgc3dpdGNoIChzdG10LnRhZykge1xuICAgICAgICAgICAgY2FzZSBcInJldHVyblwiOlxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSBcImlmXCI6XG4gICAgICAgICAgICAgICAgdmFyIGlmSGFzUmV0ID0gdHlwZUNoZWNrSGFzUmV0dXJuKHN0bXQuaWZPcC5zdG10cywgZW52KTtcbiAgICAgICAgICAgICAgICBpZiAoc3RtdC5lbGlmT3AuY29uZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZkhhc1JldCA9IGlmSGFzUmV0ICYmIHR5cGVDaGVja0hhc1JldHVybihzdG10LmVsaWZPcC5zdG10cywgZW52KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHN0bXQuZWxzZU9wLnN0bXRzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmSGFzUmV0ID0gaWZIYXNSZXQgJiYgdHlwZUNoZWNrSGFzUmV0dXJuKHN0bXQuZWxzZU9wLnN0bXRzLCBlbnYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgYWJvdmUgY29uZGl0aW9ucyBhcmUgbWV0XG4gICAgICAgICAgICAgICAgaWYgKGlmSGFzUmV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGNhc2UgXCJwYXNzXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgY2FzZSBcImV4cHJcIjpcbiAgICAgICAgICAgIGNhc2UgXCJhc3NpZ25cIjpcbiAgICAgICAgICAgIGNhc2UgXCJ3aGlsZVwiOlxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUWVBFIEVSUk9SOiB0eXBlQ2hlY2tIYXNSZXR1cm4gbWVldHMgdW5rbm93biBzdGF0ZW1lbnRcIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3YWJ0OyIsImltcG9ydCB7IEV4dGVybmFsVG9rZW5pemVyLCBDb250ZXh0VHJhY2tlciwgUGFyc2VyLCBOb2RlUHJvcCB9IGZyb20gJ2xlemVyJztcblxuLy8gVGhpcyBmaWxlIHdhcyBnZW5lcmF0ZWQgYnkgbGV6ZXItZ2VuZXJhdG9yLiBZb3UgcHJvYmFibHkgc2hvdWxkbid0IGVkaXQgaXQuXG5jb25zdCBwcmludEtleXdvcmQgPSAxLFxuICBpbmRlbnQgPSAxNjIsXG4gIGRlZGVudCA9IDE2MyxcbiAgbmV3bGluZSQxID0gMTY0LFxuICBuZXdsaW5lQnJhY2tldGVkID0gMTY1LFxuICBuZXdsaW5lRW1wdHkgPSAxNjYsXG4gIGVvZiA9IDE2NyxcbiAgUGFyZW50aGVzaXplZEV4cHJlc3Npb24gPSAyMSxcbiAgVHVwbGVFeHByZXNzaW9uID0gNDcsXG4gIENvbXByZWhlbnNpb25FeHByZXNzaW9uID0gNDgsXG4gIEFycmF5RXhwcmVzc2lvbiA9IDUyLFxuICBBcnJheUNvbXByZWhlbnNpb25FeHByZXNzaW9uID0gNTUsXG4gIERpY3Rpb25hcnlFeHByZXNzaW9uID0gNTYsXG4gIERpY3Rpb25hcnlDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiA9IDU5LFxuICBTZXRFeHByZXNzaW9uID0gNjAsXG4gIFNldENvbXByZWhlbnNpb25FeHByZXNzaW9uID0gNjEsXG4gIEFyZ0xpc3QgPSA2MyxcbiAgUGFyYW1MaXN0ID0gMTIxO1xuXG5jb25zdCBuZXdsaW5lID0gMTAsIGNhcnJpYWdlUmV0dXJuID0gMTMsIHNwYWNlID0gMzIsIHRhYiA9IDksIGhhc2ggPSAzNSwgcGFyZW5PcGVuID0gNDAsIGRvdCA9IDQ2O1xuXG5jb25zdCBicmFja2V0ZWQgPSBbXG4gIFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uLCBUdXBsZUV4cHJlc3Npb24sIENvbXByZWhlbnNpb25FeHByZXNzaW9uLCBBcnJheUV4cHJlc3Npb24sIEFycmF5Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24sXG4gIERpY3Rpb25hcnlFeHByZXNzaW9uLCBEaWN0aW9uYXJ5Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24sIFNldEV4cHJlc3Npb24sIFNldENvbXByZWhlbnNpb25FeHByZXNzaW9uLCBBcmdMaXN0LCBQYXJhbUxpc3Rcbl07XG5cbmxldCBjYWNoZWRJbmRlbnQgPSAwLCBjYWNoZWRJbnB1dCA9IG51bGwsIGNhY2hlZFBvcyA9IDA7XG5mdW5jdGlvbiBnZXRJbmRlbnQoaW5wdXQsIHBvcykge1xuICBpZiAocG9zID09IGNhY2hlZFBvcyAmJiBpbnB1dCA9PSBjYWNoZWRJbnB1dCkgcmV0dXJuIGNhY2hlZEluZGVudFxuICBjYWNoZWRJbnB1dCA9IGlucHV0OyBjYWNoZWRQb3MgPSBwb3M7XG4gIHJldHVybiBjYWNoZWRJbmRlbnQgPSBnZXRJbmRlbnRJbm5lcihpbnB1dCwgcG9zKVxufVxuXG5mdW5jdGlvbiBnZXRJbmRlbnRJbm5lcihpbnB1dCwgcG9zKSB7XG4gIGZvciAobGV0IGluZGVudCA9IDA7OyBwb3MrKykge1xuICAgIGxldCBjaCA9IGlucHV0LmdldChwb3MpO1xuICAgIGlmIChjaCA9PSBzcGFjZSkgaW5kZW50Kys7XG4gICAgZWxzZSBpZiAoY2ggPT0gdGFiKSBpbmRlbnQgKz0gOCAtIChpbmRlbnQgJSA4KTtcbiAgICBlbHNlIGlmIChjaCA9PSBuZXdsaW5lIHx8IGNoID09IGNhcnJpYWdlUmV0dXJuIHx8IGNoID09IGhhc2gpIHJldHVybiAtMVxuICAgIGVsc2UgcmV0dXJuIGluZGVudFxuICB9XG59XG5cbmNvbnN0IG5ld2xpbmVzID0gbmV3IEV4dGVybmFsVG9rZW5pemVyKChpbnB1dCwgdG9rZW4sIHN0YWNrKSA9PiB7XG4gIGxldCBuZXh0ID0gaW5wdXQuZ2V0KHRva2VuLnN0YXJ0KTtcbiAgaWYgKG5leHQgPCAwKSB7XG4gICAgdG9rZW4uYWNjZXB0KGVvZiwgdG9rZW4uc3RhcnQpO1xuICB9IGVsc2UgaWYgKG5leHQgIT0gbmV3bGluZSAmJiBuZXh0ICE9IGNhcnJpYWdlUmV0dXJuKSA7IGVsc2UgaWYgKHN0YWNrLnN0YXJ0T2YoYnJhY2tldGVkKSAhPSBudWxsKSB7XG4gICAgdG9rZW4uYWNjZXB0KG5ld2xpbmVCcmFja2V0ZWQsIHRva2VuLnN0YXJ0ICsgMSk7XG4gIH0gZWxzZSBpZiAoZ2V0SW5kZW50KGlucHV0LCB0b2tlbi5zdGFydCArIDEpIDwgMCkge1xuICAgIHRva2VuLmFjY2VwdChuZXdsaW5lRW1wdHksIHRva2VuLnN0YXJ0ICsgMSk7XG4gIH0gZWxzZSB7XG4gICAgdG9rZW4uYWNjZXB0KG5ld2xpbmUkMSwgdG9rZW4uc3RhcnQgKyAxKTtcbiAgfVxufSwge2NvbnRleHR1YWw6IHRydWUsIGZhbGxiYWNrOiB0cnVlfSk7XG5cbmNvbnN0IGluZGVudGF0aW9uID0gbmV3IEV4dGVybmFsVG9rZW5pemVyKChpbnB1dCwgdG9rZW4sIHN0YWNrKSA9PiB7XG4gIGxldCBwcmV2ID0gaW5wdXQuZ2V0KHRva2VuLnN0YXJ0IC0gMSksIGRlcHRoO1xuICBpZiAoKHByZXYgPT0gbmV3bGluZSB8fCBwcmV2ID09IGNhcnJpYWdlUmV0dXJuKSAmJlxuICAgICAgKGRlcHRoID0gZ2V0SW5kZW50KGlucHV0LCB0b2tlbi5zdGFydCkpID49IDAgJiZcbiAgICAgIGRlcHRoICE9IHN0YWNrLmNvbnRleHQuZGVwdGggJiZcbiAgICAgIHN0YWNrLnN0YXJ0T2YoYnJhY2tldGVkKSA9PSBudWxsKVxuICAgIHRva2VuLmFjY2VwdChkZXB0aCA8IHN0YWNrLmNvbnRleHQuZGVwdGggPyBkZWRlbnQgOiBpbmRlbnQsIHRva2VuLnN0YXJ0KTtcbn0pO1xuXG5mdW5jdGlvbiBJbmRlbnRMZXZlbChwYXJlbnQsIGRlcHRoKSB7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gIHRoaXMuaGFzaCA9IChwYXJlbnQgPyBwYXJlbnQuaGFzaCArIHBhcmVudC5oYXNoIDw8IDggOiAwKSArIGRlcHRoICsgKGRlcHRoIDw8IDQpO1xufVxuXG5jb25zdCB0b3BJbmRlbnQgPSBuZXcgSW5kZW50TGV2ZWwobnVsbCwgMCk7XG5cbmNvbnN0IHRyYWNrSW5kZW50ID0gbmV3IENvbnRleHRUcmFja2VyKHtcbiAgc3RhcnQ6IHRvcEluZGVudCxcbiAgc2hpZnQoY29udGV4dCwgdGVybSwgaW5wdXQsIHN0YWNrKSB7XG4gICAgcmV0dXJuIHRlcm0gPT0gaW5kZW50ID8gbmV3IEluZGVudExldmVsKGNvbnRleHQsIGdldEluZGVudChpbnB1dCwgc3RhY2sucG9zKSkgOlxuICAgICAgdGVybSA9PSBkZWRlbnQgPyBjb250ZXh0LnBhcmVudCA6IGNvbnRleHRcbiAgfSxcbiAgaGFzaChjb250ZXh0KSB7IHJldHVybiBjb250ZXh0Lmhhc2ggfVxufSk7XG5cbmNvbnN0IGxlZ2FjeVByaW50ID0gbmV3IEV4dGVybmFsVG9rZW5pemVyKChpbnB1dCwgdG9rZW4pID0+IHtcbiAgbGV0IHBvcyA9IHRva2VuLnN0YXJ0O1xuICBmb3IgKGxldCBwcmludCA9IFwicHJpbnRcIiwgaSA9IDA7IGkgPCBwcmludC5sZW5ndGg7IGkrKywgcG9zKyspXG4gICAgaWYgKGlucHV0LmdldChwb3MpICE9IHByaW50LmNoYXJDb2RlQXQoaSkpIHJldHVyblxuICBsZXQgZW5kID0gcG9zO1xuICBpZiAoL1xcdy8udGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGlucHV0LmdldChwb3MpKSkpIHJldHVyblxuICBmb3IgKDs7IHBvcysrKSB7XG4gICAgbGV0IG5leHQgPSBpbnB1dC5nZXQocG9zKTtcbiAgICBpZiAobmV4dCA9PSBzcGFjZSB8fCBuZXh0ID09IHRhYikgY29udGludWVcbiAgICBpZiAobmV4dCAhPSBwYXJlbk9wZW4gJiYgbmV4dCAhPSBkb3QgJiYgbmV4dCAhPSBuZXdsaW5lICYmIG5leHQgIT0gY2FycmlhZ2VSZXR1cm4gJiYgbmV4dCAhPSBoYXNoKVxuICAgICAgdG9rZW4uYWNjZXB0KHByaW50S2V5d29yZCwgZW5kKTtcbiAgICByZXR1cm5cbiAgfVxufSk7XG5cbi8vIFRoaXMgZmlsZSB3YXMgZ2VuZXJhdGVkIGJ5IGxlemVyLWdlbmVyYXRvci4gWW91IHByb2JhYmx5IHNob3VsZG4ndCBlZGl0IGl0LlxuY29uc3Qgc3BlY19pZGVudGlmaWVyID0ge19fcHJvdG9fXzpudWxsLGF3YWl0OjQwLCBvcjo0OCwgYW5kOjUwLCBpbjo1NCwgbm90OjU2LCBpczo1OCwgaWY6NjQsIGVsc2U6NjYsIGxhbWJkYTo3MCwgeWllbGQ6ODgsIGZyb206OTAsIGFzeW5jOjk4LCBmb3I6MTAwLCBOb25lOjE1MiwgVHJ1ZToxNTQsIEZhbHNlOjE1NCwgZGVsOjE2OCwgcGFzczoxNzIsIGJyZWFrOjE3NiwgY29udGludWU6MTgwLCByZXR1cm46MTg0LCByYWlzZToxOTIsIGltcG9ydDoxOTYsIGFzOjE5OCwgZ2xvYmFsOjIwMiwgbm9ubG9jYWw6MjA0LCBhc3NlcnQ6MjA4LCBlbGlmOjIxOCwgd2hpbGU6MjIyLCB0cnk6MjI4LCBleGNlcHQ6MjMwLCBmaW5hbGx5OjIzMiwgd2l0aDoyMzYsIGRlZjoyNDAsIGNsYXNzOjI1MH07XG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZGVzZXJpYWxpemUoe1xuICB2ZXJzaW9uOiAxMyxcbiAgc3RhdGVzOiBcIiE/fE9gUSRJWE9PTyVjUSRJW08nI0dhT09RJElTJyNDbScjQ21PT1EkSVMnI0NuJyNDbk8nUlEkSVdPJyNDbE8odFEkSVtPJyNHYE9PUSRJUycjR2EnI0dhT09RJElTJyNEUicjRFJPT1EkSVMnI0dgJyNHYE8pYlEkSVdPJyNDcU8pclEkSVdPJyNEYk8qU1EkSVdPJyNEZk9PUSRJUycjRHMnI0RzTypnT2BPJyNEc08qb09wTycjRHNPKndPIWJPJyNEdE8rU08jdE8nI0R0TytfTyZqTycjRHRPK2pPLFVPJyNEdE8tbFEkSVtPJyNHUU9PUSRJUycjR1EnI0dRTydSUSRJV08nI0dQTy9PUSRJW08nI0dQT09RJElTJyNFXScjRV1PL2dRJElXTycjRV5PT1EkSVMnI0dPJyNHT08vcVEkSVdPJyNGfU9PUSRJVicjRn0nI0Z9Ty98USRJV08nI0ZQT09RJElTJyNGcicjRnJPMFJRJElXTycjRk9PT1EkSVYnI0haJyNIWk9PUSRJVicjRnwnI0Z8T09RJElUJyNGUicjRlJRYFEkSVhPT08nUlEkSVdPJyNDb08wYVEkSVdPJyNDek8waFEkSVdPJyNET08wdlEkSVdPJyNHZU8xV1EkSVtPJyNFUU8nUlEkSVdPJyNFUk9PUSRJUycjRVQnI0VUT09RJElTJyNFVicjRVZPT1EkSVMnI0VYJyNFWE8xbFEkSVdPJyNFWk8yU1EkSVdPJyNFX08vfFEkSVdPJyNFYU8yZ1EkSVtPJyNFYU8vfFEkSVdPJyNFZE8vZ1EkSVdPJyNFZ08vZ1EkSVdPJyNFa08vZ1EkSVdPJyNFbk8yclEkSVdPJyNFcE8yeVEkSVdPJyNFdU8zVVEkSVdPJyNFcU8vZ1EkSVdPJyNFdU8vfFEkSVdPJyNFd08vfFEkSVdPJyNFfE9PUSRJUycjQ2MnI0NjT09RJElTJyNDZCcjQ2RPT1EkSVMnI0NlJyNDZU9PUSRJUycjQ2YnI0NmT09RJElTJyNDZycjQ2dPT1EkSVMnI0NoJyNDaE9PUSRJUycjQ2onI0NqTydSUSRJV08sNTh8TydSUSRJV08sNTh8TydSUSRJV08sNTh8TydSUSRJV08sNTh8TydSUSRJV08sNTh8TydSUSRJV08sNTh8TzNaUSRJV08nI0RtT09RJElTLDU6Vyw1OldPM25RJElXTyw1OlpPM3tRJTFgTyw1OlpPNFFRJElbTyw1OVdPMGFRJElXTyw1OV9PMGFRJElXTyw1OV9PMGFRJElXTyw1OV9PNnBRJElXTyw1OV9PNnVRJElXTyw1OV9PNnxRJElXTyw1OWdPN1RRJElXTycjR2BPOFpRJElXTycjR19PT1EkSVMnI0dfJyNHX09PUSRJUycjRFgnI0RYTzhyUSRJV08sNTldTydSUSRJV08sNTldTzlRUSRJV08sNTldTzlWUSRJV08sNTpQTydSUSRJV08sNTpQT09RJElTLDU5fCw1OXxPOWVRJElXTyw1OXxPOWpRJElXTyw1OlZPJ1JRJElXTyw1OlZPJ1JRJElXTyw1OlRPT1EkSVMsNTpRLDU6UU85e1EkSVdPLDU6UU86UVEkSVdPLDU6VU9PT08nI0ZaJyNGWk86Vk9gTyw1Ol9PT1EkSVMsNTpfLDU6X09PT08nI0ZbJyNGW086X09wTyw1Ol9POmdRJElXTycjRHVPT09PJyNGXScjRl1POndPIWJPLDU6YE9PUSRJUyw1OmAsNTpgT09PTycjRmAnI0ZgTztTTyN0Tyw1OmBPT09PJyNGYScjRmFPO19PJmpPLDU6YE9PT08nI0ZiJyNGYk87ak8sVU8sNTpgT09RJElTJyNGYycjRmNPO3VRJElbTyw1OmRPPmdRJElbTyw1PGtPP1FRJUdsTyw1PGtPP3FRJElbTyw1PGtPT1EkSVMsNTp4LDU6eE9AWVEkSVhPJyNGa09BaVEkSVdPLDU7VE9PUSRJViw1PGksNTxpT0F0USRJW08nI0hXT0JdUSRJV08sNTtrT09RJElTLUU5cC1FOXBPT1EkSVYsNTtqLDU7ak8zUFEkSVdPJyNFd09PUSRJVC1FOVAtRTlQT0JlUSRJW08sNTlaT0RsUSRJW08sNTlmT0VWUSRJV08nI0diT0ViUSRJV08nI0diTy98USRJV08nI0diT0VtUSRJV08nI0RRT0V1USRJV08sNTlqT0V6USRJV08nI0dmTydSUSRJV08nI0dmTy9nUSRJV08sNT1QT09RJElTLDU9UCw1PVBPL2dRJElXTycjRHxPT1EkSVMnI0R9JyNEfU9GaVEkSVdPJyNGZU9GeVEkSVdPLDU4ek9HWFEkSVdPLDU4ek8pZVEkSVdPLDU6ak9HXlEkSVtPJyNHaE9PUSRJUyw1Om0sNTptT09RJElTLDU6dSw1OnVPR3FRJElXTyw1OnlPSFNRJElXTyw1OntPT1EkSVMnI0ZoJyNGaE9IYlEkSVtPLDU6e09IcFEkSVdPLDU6e09IdVEkSVdPJyNIWU9PUSRJUyw1O08sNTtPT0lUUSRJV08nI0hWT09RJElTLDU7Uiw1O1JPM1VRJElXTyw1O1ZPM1VRJElXTyw1O1lPSWZRJElbTycjSFtPJ1JRJElXTycjSFtPSXBRJElXTyw1O1tPMnJRJElXTyw1O1tPL2dRJElXTyw1O2FPL3xRJElXTyw1O2NPSXVRJElYTycjRWxPS09RJElaTyw1O11PTmFRJElXTycjSF1PM1VRJElXTyw1O2FPTmxRJElXTyw1O2NPTnFRJElXTyw1O2hPISNmUSRJW08xRy5oTyEjbVEkSVtPMUcuaE8hJl5RJElbTzFHLmhPISZoUSRJW08xRy5oTyEpUlEkSVtPMUcuaE8hKWZRJElbTzFHLmhPISl5USRJV08nI0duTyEqWFEkSVtPJyNHUU8vZ1EkSVdPJyNHbk8hKmNRJElXTycjR21PT1EkSVMsNTpYLDU6WE8hKmtRJElXTyw1OlhPISpwUSRJV08nI0dvTyEqe1EkSVdPJyNHb08hK2BRJElXTzFHL3VPT1EkSVMnI0RxJyNEcU9PUSRJUzFHL3UxRy91T09RJElTMUcueTFHLnlPISxgUSRJW08xRy55TyEsZ1EkSVtPMUcueU8wYVEkSVdPMUcueU8hLVNRJElXTzFHL1JPT1EkSVMnI0RXJyNEV08vZ1EkSVdPLDU5cU9PUSRJUzFHLncxRy53TyEtWlEkSVdPMUcvY08hLWtRJElXTzFHL2NPIS1zUSRJV08xRy9kTydSUSRJV08nI0dnTyEteFEkSVdPJyNHZ08hLX1RJElbTzFHLndPIS5fUSRJV08sNTlmTyEvZVEkSVdPLDU9Vk8hL3VRJElXTyw1PVZPIS99USRJV08xRy9rTyEwU1EkSVtPMUcva09PUSRJUzFHL2gxRy9oTyEwZFEkSVdPLDU9UU8hMVpRJElXTyw1PVFPL2dRJElXTzFHL29PITF4USRJV08xRy9xTyExfVEkSVtPMUcvcU8hMl9RJElbTzFHL29PT1EkSVMxRy9sMUcvbE9PUSRJUzFHL3AxRy9wT09PTy1FOVgtRTlYT09RJElTMUcveTFHL3lPT09PLUU5WS1FOVlPITJvUSRJV08nI0d6Ty9nUSRJV08nI0d6TyEyfVEkSVdPLDU6YU9PT08tRTlaLUU5Wk9PUSRJUzFHL3oxRy96T09PTy1FOV4tRTleT09PTy1FOV8tRTlfT09PTy1FOWAtRTlgT09RJElTLUU5YS1FOWFPITNZUSVHbE8xRzJWTyEzeVEkSVtPMUcyVk8nUlEkSVdPLDU8T09PUSRJUyw1PE8sNTxPT09RJElTLUU5Yi1FOWJPT1EkSVMsNTxWLDU8Vk9PUSRJUy1FOWktRTlpT09RJElWMUcwbzFHMG9PL3xRJElXTycjRmdPITRiUSRJW08sNT1yT09RJElTMUcxVjFHMVZPITR5USRJV08xRzFWT09RJElTJyNEUycjRFNPL2dRJElXTyw1PHxPT1EkSVMsNTx8LDU8fE8hNU9RJElXTycjRlNPITVaUSRJV08sNTlsTyE1Y1EkSVdPMUcvVU8hNW1RJElbTyw1PVFPT1EkSVMxRzJrMUcya09PUSRJUyw1OmgsNTpoTyE2XlEkSVdPJyNHUE9PUSRJUyw1PFAsNTxQT09RJElTLUU5Yy1FOWNPITZvUSRJV08xRy5mT09RJElTMUcwVTFHMFVPITZ9USRJV08sNT1TTyE3X1EkSVdPLDU9U08vZ1EkSVdPMUcwZU8vZ1EkSVdPMUcwZU8vfFEkSVdPMUcwZ09PUSRJUy1FOWYtRTlmTyE3cFEkSVdPMUcwZ08hN3tRJElXTzFHMGdPIThRUSRJV08sNT10TyE4YFEkSVdPLDU9dE8hOG5RJElXTyw1PXFPITlVUSRJV08sNT1xTyE5Z1EkSVpPMUcwcU8hPHVRJElaTzFHMHRPIUBRUSRJV08sNT12TyFAW1EkSVdPLDU9dk8hQGRRJElbTyw1PXZPL2dRJElXTzFHMHZPIUBuUSRJV08xRzB2TzNVUSRJV08xRzB7T05sUSRJV08xRzB9T09RJElWLDU7Vyw1O1dPIUBzUSRJWU8sNTtXTyFAeFEkSVpPMUcwd08hRFpRJElXTycjRm9PM1VRJElXTzFHMHdPM1VRJElXTzFHMHdPIURoUSRJV08sNT13TyFEdVEkSVdPLDU9d08vfFEkSVdPLDU9d09PUSRJVjFHMHsxRzB7TyFEfVEkSVdPJyNFeU8hRWBRJTFgTzFHMH1PT1EkSVYxRzFTMUcxU08zVVEkSVdPMUcxU09PUSRJUyw1PVksNT1ZT09RJElTJyNEbicjRG5PL2dRJElXTyw1PVlPIUVoUSRJV08sNT1YTyFFe1EkSVdPLDU9WE9PUSRJUzFHL3MxRy9zTyFGVFEkSVdPLDU9Wk8hRmVRJElXTyw1PVpPIUZtUSRJV08sNT1aTyFHUVEkSVdPLDU9Wk8hR2JRJElXTyw1PVpPT1EkSVM3KyVhNyslYU9PUSRJUzcrJGU3KyRlTyE1Y1EkSVdPNyskbU8hSVRRJElXTzFHLnlPIUlbUSRJV08xRy55T09RJElTMUcvXTFHL11PT1EkSVMsNTtwLDU7cE8nUlEkSVdPLDU7cE9PUSRJUzcrJH03KyR9TyFJY1EkSVdPNyskfU9PUSRJUy1FOVMtRTlTT09RJElTNyslTzcrJU9PIUlzUSRJV08sNT1STydSUSRJV08sNT1ST09RJElTNyskYzcrJGNPIUl4USRJV083KyR9TyFKUVEkSVdPNyslT08hSlZRJElXTzFHMnFPT1EkSVM3KyVWNyslVk8hSmdRJElXTzFHMnFPIUpvUSRJV083KyVWT09RJElTLDU7byw1O29PJ1JRJElXTyw1O29PIUp0USRJV08xRzJsT09RJElTLUU5Ui1FOVJPIUtrUSRJV083KyVaT09RJElTNyslXTcrJV1PIUt5USRJV08xRzJsTyFMaFEkSVdPNyslXU8hTG1RJElXTzFHMnJPIUx9USRJV08xRzJyTyFNVlEkSVdPNyslWk8hTVtRJElXTyw1PWZPIU1yUSRJV08sNT1mTyFNclEkSVdPLDU9Zk8hTlFPIUxRTycjRHdPIU5dT1NPJyNHe09PT08xRy97MUcve08hTmJRJElXTzFHL3tPIU5qUSVHbE83KydxTyMgWlEkSVtPMUcxalAjIHRRJElXTycjRmRPT1EkSVMsNTxSLDU8Uk9PUSRJUy1FOWUtRTllT09RJElTNysmcTcrJnFPT1EkSVMxRzJoMUcyaE9PUSRJUyw1O24sNTtuT09RJElTLUU5US1FOVFPT1EkSVM3KyRwNyskcE8jIVJRJElXTyw1PGtPIyFsUSRJV08sNTxrTyMhfVEkSVtPLDU7cU8jI2JRJElXTzFHMm5PT1EkSVMtRTlULUU5VE9PUSRJUzcrJlA3KyZQTyMjclEkSVdPNysmUE9PUSRJUzcrJlI3KyZSTyMkUVEkSVdPJyNIWE8vfFEkSVdPNysmUk8jJGZRJElXTzcrJlJPT1EkSVMsNTxVLDU8VU8jJHFRJElXTzFHM2BPT1EkSVMtRTloLUU5aE9PUSRJUyw1PFEsNTxRTyMlUFEkSVdPMUczXU9PUSRJUy1FOWQtRTlkTyMlZ1EkSVpPNysmXU8hRFpRJElXTycjRm1PM1VRJElXTzcrJl1PM1VRJElXTzcrJmBPIyh1USRJW08sNTxZTydSUSRJV08sNTxZTyMpUFEkSVdPMUczYk9PUSRJUy1FOWwtRTlsTyMpWlEkSVdPMUczYk8zVVEkSVdPNysmYk8vZ1EkSVdPNysmYk9PUSRJVjcrJmc3KyZnTyFFYFElMWBPNysmaU8jKWNRJElYTzFHMHJPT1EkSVYtRTltLUU5bU8zVVEkSVdPNysmY08zVVEkSVdPNysmY09PUSRJViw1PFosNTxaTyMrVVEkSVdPLDU8Wk9PUSRJVjcrJmM3KyZjTyMrYVEkSVpPNysmY08jLmxRJElXTyw1PFtPIy53USRJV08xRzNjT09RJElTLUU5bi1FOW5PIy9VUSRJV08xRzNjTyMvXlEkSVdPJyNIX08jL2xRJElXTycjSF9PL3xRJElXTycjSF9PT1EkSVMnI0hfJyNIX08jL3dRJElXTycjSF5PT1EkSVMsNTtlLDU7ZU8jMFBRJElXTyw1O2VPL2dRJElXTycjRXtPT1EkSVY3KyZpNysmaU8zVVEkSVdPNysmaU9PUSRJVjcrJm43KyZuT09RJElTMUcydDFHMnRPT1EkSVMsNTtzLDU7c08jMFVRJElXTzFHMnNPT1EkSVMtRTlWLUU5Vk8jMGlRJElXTyw1O3RPIzB0USRJV08sNTt0TyMxWFEkSVdPMUcydU9PUSRJUy1FOVctRTlXTyMxaVEkSVdPMUcydU8jMXFRJElXTzFHMnVPIzJSUSRJV08xRzJ1TyMxaVEkSVdPMUcydU9PUSRJUzw8SFg8PEhYTyMyXlEkSVtPMUcxW09PUSRJUzw8SGk8PEhpUCMya1EkSVdPJyNGVU82fFEkSVdPMUcybU8jMnhRJElXTzFHMm1PIzJ9USRJV088PEhpT09RJElTPDxIajw8SGpPIzNfUSRJV083KyhdT09RJElTPDxIcTw8SHFPIzNvUSRJW08xRzFaUCM0YFEkSVdPJyNGVE8jNG1RJElXTzcrKF5PIzR9USRJV083KyheTyM1VlEkSVdPPDxIdU8jNVtRJElXTzcrKFdPT1EkSVM8PEh3PDxId08jNlJRJElXTyw1O3JPJ1JRJElXTyw1O3JPT1EkSVMtRTlVLUU5VU9PUSRJUzw8SHU8PEh1T09RJElTLDU7eCw1O3hPL2dRJElXTyw1O3hPIzZXUSRJV08xRzNRT09RJElTLUU5Wy1FOVtPIzZuUSRJV08xRzNRT09PTycjRl8nI0ZfTyM2fE8hTFFPLDU6Y09PT08sNT1nLDU9Z09PT083KyVnNyslZ08jN1hRJElXTzFHMlZPIzdyUSRJV08xRzJWUCdSUSRJV08nI0ZWTy9nUSRJV088PElrTyM4VFEkSVdPLDU9c08jOGZRJElXTyw1PXNPL3xRJElXTyw1PXNPIzh3USRJV088PEltT09RJElTPDxJbTw8SW1PL3xRJElXTzw8SW1QL3xRJElXTycjRmpQL2dRJElXTycjRmZPT1EkSVYtRTlrLUU5a08zVVEkSVdPPDxJd09PUSRJViw1PFgsNTxYTzNVUSRJV08sNTxYT09RJElWPDxJdzw8SXdPT1EkSVY8PEl6PDxJek8jOHxRJElbTzFHMXRQIzlXUSRJV08nI0ZuTyM5X1EkSVdPNysofE8jOWlRJElaTzw8SXxPM1VRJElXTzw8SXxPT1EkSVY8PEpUPDxKVE8zVVEkSVdPPDxKVE9PUSRJVicjRmwnI0ZsTyM8dFEkSVpPNysmXk9PUSRJVjw8SX08PEl9TyM+bVEkSVpPPDxJfU9PUSRJVjFHMXUxRzF1Ty98USRJV08xRzF1TzNVUSRJV088PEl9Ty98USRJV08xRzF2UC9nUSRJV08nI0ZwTyNBeFEkSVdPNysofU8jQlZRJElXTzcrKH1PT1EkSVMnI0V6JyNFek8vZ1EkSVdPLDU9eU8jQl9RJElXTyw1PXlPT1EkSVMsNT15LDU9eU8jQmpRJElXTyw1PXhPI0J7USRJV08sNT14T09RJElTMUcxUDFHMVBPT1EkSVMsNTtnLDU7Z1AjQ1RRJElXTycjRlhPI0NlUSRJV08xRzFgTyNDeFEkSVdPMUcxYE8jRFlRJElXTzFHMWBQI0RlUSRJV08nI0ZZTyNEclEkSVdPNysoYU8jRVNRJElXTzcrKGFPI0VTUSRJV083KyhhTyNFW1EkSVdPNysoYU8jRWxRJElXTzcrKFhPNnxRJElXTzcrKFhPT1EkSVNBTj5UQU4+VE8jRlZRJElXTzw8S3hPT1EkSVNBTj5hQU4+YU8vZ1EkSVdPMUcxXk8jRmdRJElbTzFHMV5QI0ZxUSRJV08nI0ZXT09RJElTMUcxZDFHMWRQI0dPUSRJV08nI0ZeTyNHXVEkSVdPNysobE9PT08tRTldLUU5XU8jR3NRJElXTzcrJ3FPT1EkSVNBTj9WQU4/Vk8jSF5RJElXTyw1PFRPI0hyUSRJV08xRzNfT09RJElTLUU5Zy1FOWdPI0lUUSRJV08xRzNfT09RJElTQU4/WEFOP1hPI0lmUSRJV09BTj9YT09RJElWQU4/Y0FOP2NPT1EkSVYxRzFzMUcxc08zVVEkSVdPQU4/aE8jSWtRJElaT0FOP2hPT1EkSVZBTj9vQU4/b09PUSRJVi1FOWotRTlqT09RJElWPDxJeDw8SXhPM1VRJElXT0FOP2lPM1VRJElXTzcrJ2FPT1EkSVZBTj9pQU4/aU9PUSRJUzcrJ2I3KydiTyNMdlEkSVdPPDxMaU9PUSRJUzFHM2UxRzNlTy9nUSRJV08xRzNlT09RJElTLDU8XSw1PF1PI01UUSRJV08xRzNkT09RJElTLUU5by1FOW9PI01mUSRJV083KyZ6TyNNdlEkSVdPNysmek9PUSRJUzcrJno3KyZ6TyNOUlEkSVdPPDxLe08jTmNRJElXTzw8S3tPI05jUSRJV088PEt7TyNOa1EkSVdPJyNHaU9PUSRJUzw8S3M8PEtzTyNOdVEkSVdPPDxLc09PUSRJUzcrJng3KyZ4Ty98USRJV08xRzFvUC98USRJV08nI0ZpTyQgYFEkSVdPNysoeU8kIHFRJElXTzcrKHlPT1EkSVNHMjRzRzI0c09PUSRJVkcyNVNHMjVTTzNVUSRJV09HMjVTT09RJElWRzI1VEcyNVRPT1EkSVY8PEp7PDxKe09PUSRJUzcrKVA3KylQUCQhU1EkSVdPJyNGcU9PUSRJUzw8SmY8PEpmTyQhYlEkSVdPPDxKZk8kIXJRJElXT0FOQWdPJCNTUSRJV09BTkFnTyQjW1EkSVdPJyNHak9PUSRJUycjR2onI0dqTzBoUSRJV08nI0RhTyQjdVEkSVdPLDU9VE9PUSRJU0FOQV9BTkFfT09RJElTNysnWjcrJ1pPJCReUSRJV088PExlT09RJElWTEQqbkxEKm5PT1EkSVNBTkBRQU5AUU8kJG9RJElXT0cyN1JPJCVQUSRJV08sNTl7T09RJElTMUcybzFHMm9PI05rUSRJV08xRy9nT09RJElTNyslUjcrJVJPNnxRJElXTycjQ3pPNnxRJElXTyw1OV9PNnxRJElXTyw1OV9PNnxRJElXTyw1OV9PJCVVUSRJW08sNTxrTzZ8USRJV08xRy55Ty9nUSRJV08xRy9VTy9nUSRJV083KyRtUCQlaVEkSVdPJyNGZE8nUlEkSVdPJyNHUE8kJXZRJElXTyw1OV9PJCV7USRJV08sNTlfTyQmU1EkSVdPLDU5ak8kJlhRJElXTzFHL1JPMGhRJElXTycjRE9PNnxRJElXTyw1OWdcIixcbiAgc3RhdGVEYXRhOiBcIiQmb35PJG9PUyRsT1Mka09TUU9Tfk9QaE9UZU9kc09mWE9sdE9wIVNPc3VPfHZPfSFQTyFSIVZPIVMhVU8hVllPIVpaTyFmZE8hbWRPIW5kTyFvZE8hdnhPIXh5TyF6ek8hfHtPI098TyNTfU8jVSFPTyNYIVFPI1khUU8jWyFSTyNjIVRPI2YhV08jaiFYTyNsIVlPI3EhWk8jdGxPJGpxTyR6UU8ke1FPJVBSTyVRVk8lZVtPJWZdTyVpXk8lbF9PJXJgTyV1YU8ld2JPfk9UIWFPXSFhT18hYk9mIWlPIVYha08hZCFsTyR1IVtPJHYhXU8kdyFeTyR4IV9PJHkhX08keiFgTyR7IWBPJHwhYU8kfSFhTyVPIWFPfk9oJVRYaSVUWGolVFhrJVRYbCVUWG0lVFhwJVRYdyVUWHglVFghcyVUWCNeJVRYJGolVFgkbSVUWCVWJVRYIU8lVFghUiVUWCFTJVRYJVclVFghVyVUWCFbJVRYfSVUWCNWJVRYcSVUWCFqJVRYflAkX09kc09mWE8hVllPIVpaTyFmZE8hbWRPIW5kTyFvZE8kelFPJHtRTyVQUk8lUVZPJWVbTyVmXU8laV5PJWxfTyVyYE8ldWFPJXdiT35PdyVTWHglU1gjXiVTWCRqJVNYJG0lU1glViVTWH5PaCFvT2khcE9qIW5PayFuT2whcU9tIXJPcCFzTyFzJVNYflAoYE9UIXlPbC1mT3MtdE98dk9+UCdST1QhfE9sLWZPcy10TyFXIX1PflAnUk9UI1FPXyNST2wtZk9zLXRPIVsjU09+UCdSTyVnI1ZPJWgjWE9+TyVqI1lPJWsjWE9+TyFaI1tPJW0jXU8lcSNfT35PIVojW08lcyNgTyV0I19Pfk8hWiNbTyVoI19PJXYjYk9+TyFaI1tPJWsjX08leCNkT35PVCR0WF0kdFhfJHRYZiR0WGgkdFhpJHRYaiR0WGskdFhsJHRYbSR0WHAkdFh3JHRYIVYkdFghZCR0WCR1JHRYJHYkdFgkdyR0WCR4JHRYJHkkdFgkeiR0WCR7JHRYJHwkdFgkfSR0WCVPJHRYIU8kdFghUiR0WCFTJHRYfk8lZVtPJWZdTyVpXk8lbF9PJXJgTyV1YU8ld2JPeCR0WCFzJHRYI14kdFgkaiR0WCRtJHRYJVYkdFglVyR0WCFXJHRYIVskdFh9JHRYI1YkdFhxJHRYIWokdFh+UCt1T3cjaU94JHNYIXMkc1gjXiRzWCRqJHNYJG0kc1glViRzWH5PbC1mT3MtdE9+UCdSTyNeI2xPJGojbk8kbSNuT35PJVFWT35PIVIjc08jbCFZTyNxIVpPI3RsT35PbHRPflAnUk9UI3hPXyN5TyVRVk94dFB+T1QjfU9sLWZPcy10T30kT09+UCdST3gkUU8hcyRWTyVWJFJPI14hdFgkaiF0WCRtIXRYfk9UI31PbC1mT3MtdE8jXiF9WCRqIX1YJG0hfVh+UCdST2wtZk9zLXRPI14jUlgkaiNSWCRtI1JYflAnUk8hZCRdTyFtJF1PJVFWT35PVCRnT35QJ1JPIVMkaU8jaiRqTyNsJGtPfk94JGxPfk9UJHpPXyR6T2wtZk9zLXRPIU8kfE9+UCdST2wtZk9zLXRPeCVQT35QJ1JPJWQlUk9+T18hYk9mIWlPIVYha08hZCFsT1RgYV1gYWhgYWlgYWpgYWtgYWxgYW1gYXBgYXdgYXhgYSFzYGEjXmBhJGpgYSRtYGEkdWBhJHZgYSR3YGEkeGBhJHlgYSR6YGEke2BhJHxgYSR9YGElT2BhJVZgYSFPYGEhUmBhIVNgYSVXYGEhV2BhIVtgYX1gYSNWYGFxYGEhamBhfk9rJVdPfk9sJVdPflAnUk9sLWZPflAnUk9oLWhPaS1pT2otZ09rLWdPbC1wT20tcU9wLXVPIU8lU1ghUiVTWCFTJVNYJVclU1ghVyVTWCFbJVNYfSVTWCNWJVNYIWolU1h+UChgTyVXJVlPdyVSWCFPJVJYIVIlUlghUyVSWCFXJVJYeCVSWH5PdyVdTyFPJVtPIVIlYU8hUyVgT35PIU8lW09+T3clZE8hUiVhTyFTJWBPIVclX1h+TyFXJWhPfk93JWlPeCVrTyFSJWFPIVMlYE8hWyVZWH5PIVslb09+TyFbJXBPfk8lZyNWTyVoJXJPfk8laiNZTyVrJXJPfk9UJXVPbC1mT3MtdE98dk9+UCdSTyFaI1tPJW0jXU8lcSV4T35PIVojW08lcyNgTyV0JXhPfk8hWiNbTyVoJXhPJXYjYk9+TyFaI1tPJWsleE8leCNkT35PVCFsYV0hbGFfIWxhZiFsYWghbGFpIWxhaiFsYWshbGFsIWxhbSFsYXAhbGF3IWxheCFsYSFWIWxhIWQhbGEhcyFsYSNeIWxhJGohbGEkbSFsYSR1IWxhJHYhbGEkdyFsYSR4IWxhJHkhbGEkeiFsYSR7IWxhJHwhbGEkfSFsYSVPIWxhJVYhbGEhTyFsYSFSIWxhIVMhbGElVyFsYSFXIWxhIVshbGF9IWxhI1YhbGFxIWxhIWohbGF+UCN2T3clfU94JHNhIXMkc2EjXiRzYSRqJHNhJG0kc2ElViRzYX5QJF9PVCZQT2x0T3N1T3gkc2EhcyRzYSNeJHNhJGokc2EkbSRzYSVWJHNhflAnUk93JX1PeCRzYSFzJHNhI14kc2EkaiRzYSRtJHNhJVYkc2F+T1BoT1RlT2x0T3N1T3x2T30hUE8hdnhPIXh5TyF6ek8hfHtPI098TyNTfU8jVSFPTyNYIVFPI1khUU8jWyFSTyNeJF9YJGokX1gkbSRfWH5QJ1JPI14jbE8kaiZVTyRtJlVPfk8hZCZWT2YlelgkaiV6WCNWJXpYI14lelgkbSV6WCNVJXpYfk9mIWlPJGomWE9+T2hjYWljYWpjYWtjYWxjYW1jYXBjYXdjYXhjYSFzY2EjXmNhJGpjYSRtY2ElVmNhIU9jYSFSY2EhU2NhJVdjYSFXY2EhW2NhfWNhI1ZjYXFjYSFqY2F+UCRfT3BuYXduYXhuYSNebmEkam5hJG1uYSVWbmF+T2ghb09pIXBPaiFuT2shbk9sIXFPbSFyTyFzbmF+UERUTyVWJlpPdyVVWHglVVh+TyVRVk93JVVYeCVVWH5PdyZeT3h0WH5PeCZgT35PdyVpTyNeJVlYJGolWVgkbSVZWCFPJVlYeCVZWCFbJVlYIWolWVglViVZWH5PVC1vT2wtZk9zLXRPfHZPflAnUk8lViRSTyNeU2EkalNhJG1TYX5PJVYkUk9+T3cmaU8jXiVbWCRqJVtYJG0lW1hrJVtYflAkX093JmxPfSZrTyNeI1JhJGojUmEkbSNSYX5PI1YmbU8jXiNUYSRqI1RhJG0jVGF+TyFkJF1PIW0kXU8jVSZvTyVRVk9+TyNVJm9Pfk93JnFPI14lfFgkaiV8WCRtJXxYfk93JnNPI14leVgkaiV5WCRtJXlYeCV5WH5PdyZ3T2smT1h+UCRfT2smek9+T1BoT1RlT2x0T3N1T3x2T30hUE8hdnhPIXh5TyF6ek8hfHtPI098TyNTfU8jVSFPTyNYIVFPI1khUU8jWyFSTyRqJ1BPflAnUk9xJ1RPI2cnUk8jaCdTT1AjZWFUI2VhZCNlYWYjZWFsI2VhcCNlYXMjZWF8I2VhfSNlYSFSI2VhIVMjZWEhViNlYSFaI2VhIWYjZWEhbSNlYSFuI2VhIW8jZWEhdiNlYSF4I2VhIXojZWEhfCNlYSNPI2VhI1MjZWEjVSNlYSNYI2VhI1kjZWEjWyNlYSNjI2VhI2YjZWEjaiNlYSNsI2VhI3EjZWEjdCNlYSRnI2VhJGojZWEkeiNlYSR7I2VhJVAjZWElUSNlYSVlI2VhJWYjZWElaSNlYSVsI2VhJXIjZWEldSNlYSV3I2VhJGkjZWEkbSNlYX5PdydVTyNWJ1dPeCZQWH5PZidZT35PZiFpT3gkbE9+T1QhYU9dIWFPXyFiT2YhaU8hViFrTyFkIWxPJHchXk8keCFfTyR5IV9PJHohYE8keyFgTyR8IWFPJH0hYU8lTyFhT2hVaWlVaWpVaWtVaWxVaW1VaXBVaXdVaXhVaSFzVWkjXlVpJGpVaSRtVWkkdVVpJVZVaSFPVWkhUlVpIVNVaSVXVWkhV1VpIVtVaX1VaSNWVWlxVWkhalVpfk8kdiFdT35QTnlPJHZVaX5QTnlPVCFhT10hYU9fIWJPZiFpTyFWIWtPIWQhbE8keiFgTyR7IWBPJHwhYU8kfSFhTyVPIWFPaFVpaVVpalVpa1VpbFVpbVVpcFVpd1VpeFVpIXNVaSNeVWkkalVpJG1VaSR1VWkkdlVpJHdVaSVWVWkhT1VpIVJVaSFTVWklV1VpIVdVaSFbVWl9VWkjVlVpcVVpIWpVaX5PJHghX08keSFfT35QISN0TyR4VWkkeVVpflAhI3RPXyFiT2YhaU8hViFrTyFkIWxPaFVpaVVpalVpa1VpbFVpbVVpcFVpd1VpeFVpIXNVaSNeVWkkalVpJG1VaSR1VWkkdlVpJHdVaSR4VWkkeVVpJHpVaSR7VWklVlVpIU9VaSFSVWkhU1VpJVdVaSFXVWkhW1VpfVVpI1ZVaXFVaSFqVWl+T1QhYU9dIWFPJHwhYU8kfSFhTyVPIWFPflAhJnJPVFVpXVVpJHxVaSR9VWklT1VpflAhJnJPIVIlYU8hUyVgT3clYlghTyViWH5PJVYnX08lVydfT35QK3VPdydhTyFPJWFYfk8hTydjT35PdydkT3gnZk8hVyVjWH5PbC1mT3MtdE93J2RPeCdnTyFXJWNYflAnUk8hVydpT35PaiFuT2shbk9sIXFPbSFyT2hnaXBnaXdnaXhnaSFzZ2kjXmdpJGpnaSRtZ2klVmdpfk9pIXBPflAhK2VPaWdpflAhK2VPaC1oT2ktaU9qLWdPay1nT2wtcE9tLXFPfk9xJ2tPflAhLG5PVCdwT2wtZk9zLXRPIU8ncU9+UCdST3cnck8hTydxT35PIU8ndE9+TyFTJ3ZPfk93J3JPIU8nd08hUiVhTyFTJWBPflAkX09oLWhPaS1pT2otZ09rLWdPbC1wT20tcU8hT25hIVJuYSFTbmElV25hIVduYSFbbmF9bmEjVm5hcW5hIWpuYX5QRFRPVCdwT2wtZk9zLXRPIVclX2F+UCdST3cnek8hVyVfYX5PIVcne09+T3cnek8hUiVhTyFTJWBPIVclX2F+UCRfT1QoUE9sLWZPcy10TyFbJVlhI14lWWEkaiVZYSRtJVlhIU8lWWF4JVlhIWolWWElViVZYX5QJ1JPdyhRTyFbJVlhI14lWWEkaiVZYSRtJVlhIU8lWWF4JVlhIWolWWElViVZYX5PIVsoVE9+T3coUU8hUiVhTyFTJWBPIVslWWF+UCRfT3coV08hUiVhTyFTJWBPIVslYGF+UCRfT3coWk94JW5YIVslblghaiVuWH5PeCheTyFbKGBPIWooYU9+T1QmUE9sdE9zdU94JHNpIXMkc2kjXiRzaSRqJHNpJG0kc2klViRzaX5QJ1JPdyhiT3gkc2khcyRzaSNeJHNpJGokc2kkbSRzaSVWJHNpfk8hZCZWT2YlemEkaiV6YSNWJXphI14lemEkbSV6YSNVJXphfk8kaihnT35PVCN4T18jeU8lUVZPfk93Jl5PeHRhfk9sdE9zdU9+UCdST3coUU8jXiVZYSRqJVlhJG0lWWEhTyVZYXglWWEhWyVZYSFqJVlhJVYlWWF+UCRfT3cobE8jXiRzWCRqJHNYJG0kc1glViRzWH5PJVYkUk8jXlNpJGpTaSRtU2l+TyNeJVthJGolW2EkbSVbYWslW2F+UCdST3cob08jXiVbYSRqJVthJG0lW2FrJVthfk9UKHNPZih1TyVRVk9+TyNVKHZPfk8lUVZPI14lfGEkaiV8YSRtJXxhfk93KHhPI14lfGEkaiV8YSRtJXxhfk9sLWZPcy10TyNeJXlhJGoleWEkbSV5YXgleWF+UCdST3coe08jXiV5YSRqJXlhJG0leWF4JXlhfk9xKVBPI2EpT09QI19pVCNfaWQjX2lmI19pbCNfaXAjX2lzI19pfCNfaX0jX2khUiNfaSFTI19pIVYjX2khWiNfaSFmI19pIW0jX2khbiNfaSFvI19pIXYjX2kheCNfaSF6I19pIXwjX2kjTyNfaSNTI19pI1UjX2kjWCNfaSNZI19pI1sjX2kjYyNfaSNmI19pI2ojX2kjbCNfaSNxI19pI3QjX2kkZyNfaSRqI19pJHojX2kkeyNfaSVQI19pJVEjX2klZSNfaSVmI19pJWkjX2klbCNfaSVyI19pJXUjX2kldyNfaSRpI19pJG0jX2l+T3EpUU9QI2JpVCNiaWQjYmlmI2JpbCNiaXAjYmlzI2JpfCNiaX0jYmkhUiNiaSFTI2JpIVYjYmkhWiNiaSFmI2JpIW0jYmkhbiNiaSFvI2JpIXYjYmkheCNiaSF6I2JpIXwjYmkjTyNiaSNTI2JpI1UjYmkjWCNiaSNZI2JpI1sjYmkjYyNiaSNmI2JpI2ojYmkjbCNiaSNxI2JpI3QjYmkkZyNiaSRqI2JpJHojYmkkeyNiaSVQI2JpJVEjYmklZSNiaSVmI2JpJWkjYmklbCNiaSVyI2JpJXUjYmkldyNiaSRpI2JpJG0jYml+T1QpU09rJk9hflAnUk93KVRPayZPYX5PdylUT2smT2F+UCRfT2spWE9+TyRoKVtPfk9xKV9PI2cnUk8jaCleT1AjZWlUI2VpZCNlaWYjZWlsI2VpcCNlaXMjZWl8I2VpfSNlaSFSI2VpIVMjZWkhViNlaSFaI2VpIWYjZWkhbSNlaSFuI2VpIW8jZWkhdiNlaSF4I2VpIXojZWkhfCNlaSNPI2VpI1MjZWkjVSNlaSNYI2VpI1kjZWkjWyNlaSNjI2VpI2YjZWkjaiNlaSNsI2VpI3EjZWkjdCNlaSRnI2VpJGojZWkkeiNlaSR7I2VpJVAjZWklUSNlaSVlI2VpJWYjZWklaSNlaSVsI2VpJXIjZWkldSNlaSV3I2VpJGkjZWkkbSNlaX5PbC1mT3MtdE94JGxPflAnUk9sLWZPcy10T3gmUGF+UCdST3cpZU94JlBhfk9UKWlPXylqTyFPKW1PJHwpa08lUVZPfk94JGxPJlMpb09+T1Qkek9fJHpPbC1mT3MtdE8hTyVhYX5QJ1JPdyl1TyFPJWFhfk9sLWZPcy10T3gpeE8hVyVjYX5QJ1JPdyl5TyFXJWNhfk9sLWZPcy10T3cpeU94KXxPIVclY2F+UCdST2wtZk9zLXRPdyl5TyFXJWNhflAnUk93KXlPeCl8TyFXJWNhfk9qLWdPay1nT2wtcE9tLXFPaGdpcGdpd2dpIU9naSFSZ2khU2dpJVdnaSFXZ2l4Z2khW2dpI15naSRqZ2kkbWdpfWdpI1ZnaXFnaSFqZ2klVmdpfk9pLWlPflAhR21PaWdpflAhR21PVCdwT2wtZk9zLXRPIU8qUk9+UCdST2sqVE9+T3cqVk8hTypST35PIU8qV09+T1QncE9sLWZPcy10TyFXJV9pflAnUk93KlhPIVclX2l+TyFXKllPfk9UKFBPbC1mT3MtdE8hWyVZaSNeJVlpJGolWWkkbSVZaSFPJVlpeCVZaSFqJVlpJVYlWWl+UCdST3cqXU8hUiVhTyFTJWBPIVslYGl+T3cqYE8hWyVZaSNeJVlpJGolWWkkbSVZaSFPJVlpeCVZaSFqJVlpJVYlWWl+TyFbKmFPfk9fKmNPbC1mT3MtdE8hWyVgaX5QJ1JPdypdTyFbJWBpfk8hWyplT35PVCpnT2wtZk9zLXRPeCVuYSFbJW5hIWolbmF+UCdST3cqaE94JW5hIVslbmEhaiVuYX5PIVojW08lcCprTyFbIWtYfk8hWyptT35PeCheTyFbKm5Pfk9UJlBPbHRPc3VPeCRzcSFzJHNxI14kc3EkaiRzcSRtJHNxJVYkc3F+UCdST3ckV2l4JFdpIXMkV2kjXiRXaSRqJFdpJG0kV2klViRXaX5QJF9PVCZQT2x0T3N1T35QJ1JPVCZQT2wtZk9zLXRPI14kc2EkaiRzYSRtJHNhJVYkc2F+UCdST3cqb08jXiRzYSRqJHNhJG0kc2ElViRzYX5PdyN5YSNeI3lhJGojeWEkbSN5YWsjeWF+UCRfTyNeJVtpJGolW2kkbSVbaWslW2l+UCdST3cqck8jXiNScSRqI1JxJG0jUnF+T3cqc08jVip1TyNeJXtYJGole1gkbSV7WCFPJXtYfk9UKndPZip4TyVRVk9+TyVRVk8jXiV8aSRqJXxpJG0lfGl+T2wtZk9zLXRPI14leWkkaiV5aSRtJXlpeCV5aX5QJ1JPcSp8TyNhKU9PUCNfcVQjX3FkI19xZiNfcWwjX3FwI19xcyNfcXwjX3F9I19xIVIjX3EhUyNfcSFWI19xIVojX3EhZiNfcSFtI19xIW4jX3EhbyNfcSF2I19xIXgjX3EheiNfcSF8I19xI08jX3EjUyNfcSNVI19xI1gjX3EjWSNfcSNbI19xI2MjX3EjZiNfcSNqI19xI2wjX3EjcSNfcSN0I19xJGcjX3EkaiNfcSR6I19xJHsjX3ElUCNfcSVRI19xJWUjX3ElZiNfcSVpI19xJWwjX3ElciNfcSV1I19xJXcjX3EkaSNfcSRtI19xfk9rJGJhdyRiYX5QJF9PVClTT2smT2l+UCdST3crVE9rJk9pfk9QaE9UZU9sdE9wIVNPc3VPfHZPfSFQTyFSIVZPIVMhVU8hdnhPIXh5TyF6ek8hfHtPI098TyNTfU8jVSFPTyNYIVFPI1khUU8jWyFSTyNjIVRPI2YhV08jaiFYTyNsIVlPI3EhWk8jdGxPflAnUk93K19PeCRsTyNWK19Pfk8jaCtgT1AjZXFUI2VxZCNlcWYjZXFsI2VxcCNlcXMjZXF8I2VxfSNlcSFSI2VxIVMjZXEhViNlcSFaI2VxIWYjZXEhbSNlcSFuI2VxIW8jZXEhdiNlcSF4I2VxIXojZXEhfCNlcSNPI2VxI1MjZXEjVSNlcSNYI2VxI1kjZXEjWyNlcSNjI2VxI2YjZXEjaiNlcSNsI2VxI3EjZXEjdCNlcSRnI2VxJGojZXEkeiNlcSR7I2VxJVAjZXElUSNlcSVlI2VxJWYjZXElaSNlcSVsI2VxJXIjZXEldSNlcSV3I2VxJGkjZXEkbSNlcX5PI1YrYU93JGRheCRkYX5PbC1mT3MtdE94JlBpflAnUk93K2NPeCZQaX5PeCRRTyVWK2VPdyZSWCFPJlJYfk8lUVZPdyZSWCFPJlJYfk93K2lPIU8mUVh+TyFPK2tPfk9UJHpPXyR6T2wtZk9zLXRPIU8lYWl+UCdST3grbk93I3xhIVcjfGF+T2wtZk9zLXRPeCtvT3cjfGEhVyN8YX5QJ1JPbC1mT3MtdE94KXhPIVclY2l+UCdST3crck8hVyVjaX5PbC1mT3MtdE93K3JPIVclY2l+UCdST3crck94K3VPIVclY2l+T3cjeGkhTyN4aSFXI3hpflAkX09UJ3BPbC1mT3MtdE9+UCdST2srd09+T1QncE9sLWZPcy10TyFPK3hPflAnUk9UJ3BPbC1mT3MtdE8hVyVfcX5QJ1JPdyN3aSFbI3dpI14jd2kkaiN3aSRtI3dpIU8jd2l4I3dpIWojd2klViN3aX5QJF9PVChQT2wtZk9zLXRPflAnUk9fKmNPbC1mT3MtdE8hWyVgcX5QJ1JPdyt5TyFbJWBxfk8hWyt6T35PVChQT2wtZk9zLXRPIVslWXEjXiVZcSRqJVlxJG0lWXEhTyVZcXglWXEhaiVZcSVWJVlxflAnUk94K3tPfk9UKmdPbC1mT3MtdE94JW5pIVslbmkhaiVuaX5QJ1JPdyxRT3glbmkhWyVuaSFqJW5pfk8hWiNbTyVwKmtPIVsha2F+T1QmUE9sLWZPcy10TyNeJHNpJGokc2kkbSRzaSVWJHNpflAnUk93LFNPI14kc2kkaiRzaSRtJHNpJVYkc2l+TyVRVk8jXiV7YSRqJXthJG0le2EhTyV7YX5PdyxWTyNeJXthJGole2EkbSV7YSFPJXthfk8hTyxZT35PayRiaXckYml+UCRfT1QpU09+UCdST1QpU09rJk9xflAnUk9xLF5PUCNkeVQjZHlkI2R5ZiNkeWwjZHlwI2R5cyNkeXwjZHl9I2R5IVIjZHkhUyNkeSFWI2R5IVojZHkhZiNkeSFtI2R5IW4jZHkhbyNkeSF2I2R5IXgjZHkheiNkeSF8I2R5I08jZHkjUyNkeSNVI2R5I1gjZHkjWSNkeSNbI2R5I2MjZHkjZiNkeSNqI2R5I2wjZHkjcSNkeSN0I2R5JGcjZHkkaiNkeSR6I2R5JHsjZHklUCNkeSVRI2R5JWUjZHklZiNkeSVpI2R5JWwjZHklciNkeSV1I2R5JXcjZHkkaSNkeSRtI2R5fk9QaE9UZU9sdE9wIVNPc3VPfHZPfSFQTyFSIVZPIVMhVU8hdnhPIXh5TyF6ek8hfHtPI098TyNTfU8jVSFPTyNYIVFPI1khUU8jWyFSTyNjIVRPI2YhV08jaiFYTyNsIVlPI3EhWk8jdGxPJGksYk8kbSxiT35QJ1JPI2gsY09QI2V5VCNleWQjZXlmI2V5bCNleXAjZXlzI2V5fCNleX0jZXkhUiNleSFTI2V5IVYjZXkhWiNleSFmI2V5IW0jZXkhbiNleSFvI2V5IXYjZXkheCNleSF6I2V5IXwjZXkjTyNleSNTI2V5I1UjZXkjWCNleSNZI2V5I1sjZXkjYyNleSNmI2V5I2ojZXkjbCNleSNxI2V5I3QjZXkkZyNleSRqI2V5JHojZXkkeyNleSVQI2V5JVEjZXklZSNleSVmI2V5JWkjZXklbCNleSVyI2V5JXUjZXkldyNleSRpI2V5JG0jZXl+T2wtZk9zLXRPeCZQcX5QJ1JPdyxnT3gmUHF+TyVWK2VPdyZSYSFPJlJhfk9UKWlPXylqTyR8KWtPJVFWTyFPJlFhfk93LGtPIU8mUWF+T1Qkek9fJHpPbC1mT3MtdE9+UCdST2wtZk9zLXRPeCxtT3cjfGkhVyN8aX5QJ1JPbC1mT3MtdE93I3xpIVcjfGl+UCdST3gsbU93I3xpIVcjfGl+T2wtZk9zLXRPeCl4T35QJ1JPbC1mT3MtdE94KXhPIVclY3F+UCdST3cscE8hVyVjcX5PbC1mT3MtdE93LHBPIVclY3F+UCdST3Asc08hUiVhTyFTJWBPIU8lWnEhVyVacSFbJVpxdyVacX5QISxuT18qY09sLWZPcy10TyFbJWB5flAnUk93I3ppIVsjeml+UCRfT18qY09sLWZPcy10T35QJ1JPVCpnT2wtZk9zLXRPflAnUk9UKmdPbC1mT3MtdE94JW5xIVslbnEhaiVucX5QJ1JPVCZQT2wtZk9zLXRPI14kc3EkaiRzcSRtJHNxJVYkc3F+UCdSTyNWLHdPdyRdYSNeJF1hJGokXWEkbSRdYSFPJF1hfk8lUVZPI14le2kkaiV7aSRtJXtpIU8le2l+T3cseU8jXiV7aSRqJXtpJG0le2khTyV7aX5PIU8se09+T3EsfU9QI2QhUlQjZCFSZCNkIVJmI2QhUmwjZCFScCNkIVJzI2QhUnwjZCFSfSNkIVIhUiNkIVIhUyNkIVIhViNkIVIhWiNkIVIhZiNkIVIhbSNkIVIhbiNkIVIhbyNkIVIhdiNkIVIheCNkIVIheiNkIVIhfCNkIVIjTyNkIVIjUyNkIVIjVSNkIVIjWCNkIVIjWSNkIVIjWyNkIVIjYyNkIVIjZiNkIVIjaiNkIVIjbCNkIVIjcSNkIVIjdCNkIVIkZyNkIVIkaiNkIVIkeiNkIVIkeyNkIVIlUCNkIVIlUSNkIVIlZSNkIVIlZiNkIVIlaSNkIVIlbCNkIVIlciNkIVIldSNkIVIldyNkIVIkaSNkIVIkbSNkIVJ+T2wtZk9zLXRPeCZQeX5QJ1JPVClpT18pak8kfClrTyVRVk8hTyZRaX5PbC1mT3MtdE93I3xxIVcjfHF+UCdST3gtVE93I3xxIVcjfHF+T2wtZk9zLXRPeCl4TyFXJWN5flAnUk93LVVPIVclY3l+T2wtZk9zLVlPflAnUk9wLHNPIVIlYU8hUyVgTyFPJVp5IVclWnkhWyVaeXclWnl+UCEsbk8lUVZPI14le3EkaiV7cSRtJXtxIU8le3F+T3ctXk8jXiV7cSRqJXtxJG0le3EhTyV7cX5PVClpT18pak8kfClrTyVRVk9+T2wtZk9zLXRPdyN8eSFXI3x5flAnUk9sLWZPcy10T3gpeE8hVyVjIVJ+UCdST3ctYU8hVyVjIVJ+T3AlXlghTyVeWCFSJV5YIVMlXlghVyVeWCFbJV5YdyVeWH5QISxuT3Asc08hUiVhTyFTJWBPIU8lXWEhVyVdYSFbJV1hdyVdYX5PJVFWTyNeJXt5JGole3kkbSV7eSFPJXt5fk9sLWZPcy10T3gpeE8hVyVjIVp+UCdST3gtZE9+T3cqb08jXiRzYSRqJHNhJG0kc2ElViRzYX5QJF9PVCZQT2wtZk9zLXRPflAnUk9rLWtPfk9sLWtPflAnUk94LWxPfk9xLW1PflAhLG5PJWYlaSV1JXclZSFaJW0lcyV2JXglbCVyJWwlUX5cIixcbiAgZ290bzogXCIhLHUmU1BQUFAmVFAmXSluKlQqaytTK2wsVlAscVAmXS1fLV8mXVAmXVAwcFBQUFBQUDBwM2BQUDNgUDVsNXU6eVBQOnw7WztfUFBQJl0mXVBQO2smXVBQJl0mXVBQJl0mXSZdJl07bzxjJl1QPGZQPGk8aUBPUEBkJl1QUFBAaEBuJlRQJlQmVFAmVFAmVFAmVFAmVFAmVCZUJlRQJlRQUCZUUFAmVFBAdFBAe0FSUEB7UEB7QHtQUFBAe1BCelBDVENaQ2FCelBAe0NnUENuQ3RDekRXRGpEcER6RVFFbkV0RXpGUUZbRmJGaEZuRnRGekdeR2hHbkd0R3pIVUhbSGJIaEhuSHhJT0lZSWBQUFBQUFBQUFBJaUlxSXpKVUphUFBQUFBQUFBQUFBQTnYhIGAhJW4hKHpQUCEpUyEpYiEpayEqYSEqVyEqaiEqcCEqcyEqdiEqeSErUlBQUFBQUFBQUFAhK1UhK1hQUFBQUFBQUFAhK18hK2shK3chLFQhLFchLF4hLGQhLGohLG1daU9yI2wkbClbK1onb2RPU1hZWmVocnN0dnh8fSFSIVMhVCFVIVghYyFkIWUhZiFnIWghaSFrIW4hbyFwIXIhcyF5IXwjUSNSI1sjaSNsI30kTyRRJFMkViRnJGkkaiRsJHolUCVXJVolXSVgJWQlaSVrJXUlfSZQJlsmYCZpJmsmbCZzJncmeidSJ1UnYCdhJ2QnZidnJ2sncCdyJ3YneihQKFEoVyhaKGIoZChsKG8oeylPKVMpVClYKVspZSlvKXUpeCl5KXwqUypUKlYqWCpbKl0qYCpjKmcqaCpvKnEqcip6K1MrVCtaK2IrYytmK20rbitvK3Ercit1K3creSt7K30sUCxRLFMsZyxpLG0scCxzLVQtVS1hLWQtZi1nLWgtaS1rLWwtbS1uLW8tcS11dyFjUCNoI3UkVyRmJWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtankhZFAjaCN1JFckZiRyJWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtanshZVAjaCN1JFckZiRyJHMlYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qfSFmUCNoI3UkVyRmJHIkcyR0JWIlZyVtJW4mYSZ5KGMobilSKlEqWitSK3wtaiFQIWdQI2gjdSRXJGYkciRzJHQkdSViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWohUiFoUCNoI3UkVyRmJHIkcyR0JHUkdiViJWclbSVuJmEmeShjKG4pUipRKlorUit8LWohViFoUCFtI2gjdSRXJGYkciRzJHQkdSR2JHclYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qJ29TT1NYWVplaHJzdHZ4fH0hUiFTIVQhVSFYIWMhZCFlIWYhZyFoIWkhayFuIW8hcCFyIXMheSF8I1EjUiNbI2kjbCN9JE8kUSRTJFYkZyRpJGokbCR6JVAlVyVaJV0lYCVkJWklayV1JX0mUCZbJmAmaSZrJmwmcyZ3JnonUidVJ2AnYSdkJ2YnZydrJ3Ancid2J3ooUChRKFcoWihiKGQobChvKHspTylTKVQpWClbKWUpbyl1KXgpeSl8KlMqVCpWKlgqWypdKmAqYypnKmgqbypxKnIqeitTK1QrWitiK2MrZittK24rbytxK3IrdSt3K3kreyt9LFAsUSxTLGcsaSxtLHAscy1ULVUtYS1kLWYtZy1oLWktay1sLW0tbi1vLXEtdSZaVU9YWVpocnR2fH0hUiFTIVQhWCFpIWshbiFvIXAhciFzI1sjaSNsJE8kUSRTJFYkaiRsJHolUCVXJVolXSVkJWklayV1JX0mWyZgJmsmbCZzJnonUidVJ2AnYSdkJ2YnZydrJ3IneihRKFcoWihiKGQobCh7KU8pWClbKWUpbyl1KXgpeSl8KlMqVCpWKlgqWypdKmAqZypoKm8qcip6K1orYitjK2YrbStuK28rcStyK3Urdyt5K3srfSxQLFEsUyxnLGksbSxwLHMtVC1VLWEtZC1mLWctaC1pLWstbC1tLW4tcS11JWVXT1hZWmhydnx9IVIhUyFUIVghaSFrI1sjaSNsJE8kUSRTJFYkaiRsJHolUCVaJV0lZCVpJWsldSV9JlsmYCZrJmwmcyZ6J1InVSdgJ2EnZCdmJ2cnaydyJ3ooUShXKFooYihkKGwoeylPKVgpWyllKW8pdSl4KXkpfCpTKlYqWCpbKl0qYCpnKmgqbypyKnorWitiK2MrZittK24rbytxK3IrdSt5K3srfSxQLFEsUyxnLGksbSxwLVQtVS1hLWwtbS1uUSN7dVEtYi1ZUi1yLXQnZmRPU1hZWmVocnN0dnh8fSFSIVMhVCFVIVghYyFkIWUhZiFnIWghayFuIW8hcCFyIXMheSF8I1EjUiNbI2kjbCN9JE8kUSRTJFYkZyRpJGokbCR6JVAlVyVaJV0lYCVkJWklayV1JX0mUCZbJmAmaSZrJmwmcyZ3JnonUidVJ2AnZCdmJ2cnaydwJ3Indid6KFAoUShXKFooYihkKGwobyh7KU8pUylUKVgpWyllKW8peCl5KXwqUypUKlYqWCpbKl0qYCpjKmcqaCpvKnEqcip6K1MrVCtaK2IrYytmK24rbytxK3IrdSt3K3kreyt9LFAsUSxTLGcsaSxtLHAscy1ULVUtYS1kLWYtZy1oLWktay1sLW0tbi1vLXEtdVcjb2whTyFQJF5XI3d1Jl4tWS10USRgIVFRJHAhWVEkcSFaVyR5IWknYSl1K21TJl0jeCN5USZ9JGtRKGUmVlEocyZtVyh0Jm8odSh2KnhVKHcmcSh4KnlRKWcnV1cpaCdZK2ksay1SUytoKWkpalksVSpzLFYseCx5LV5RLFgqdVEsZCtfUSxmK2FSLV0sd1ImWyN3aSF2WFkhUyFUJV0lZCdyJ3opTypTKlYqWFIlWiF1USF6WFEldiNbUSZlJFNSJmgkVlQtWCxzLWQhVSFqUCFtI2gjdSRXJGYkciRzJHQkdSR2JHclYiVnJW0lbiZhJnkoYyhuKVIqUSpaK1IrfC1qUSZZI3BSJ10kcVInYCR5UiVTIWwnbmNPU1hZWmVocnN0dnh8fSFSIVMhVCFVIVghYyFkIWUhZiFnIWghaSFrIW4hbyFwIXIhcyF5IXwjUSNSI1sjaSNsI30kTyRRJFMkViRnJGkkaiRsJHolUCVXJVolXSVgJWQlaSVrJXUlfSZQJlsmYCZpJmsmbCZzJncmeidSJ1UnYCdhJ2QnZidnJ2sncCdyJ3YneihQKFEoVyhaKGIoZChsKG8oeylPKVMpVClYKVspZSlvKXUpeCl5KXwqUypUKlYqWCpbKl0qYCpjKmcqaCpvKnEqcip6K1MrVCtaK2IrYytmK20rbitvK3Ercit1K3creSt7K30sUCxRLFMsZyxpLG0scCxzLVQtVS1hLWQtZi1nLWgtaS1rLWwtbS1uLW8tcS11VCNmYyNnUyNdXyNeUyNgYCNhUyNiYSNjUyNkYiNlVCprKF4qbFQoXyV2KGFRJFV3UitnKWhYJFN3JFQkVSZnWmtPciRsKVsrWlhvT3IpWytaUSRtIVdRJnUkZFEmdiRlUSdYJG9RJ1skcVEpWSZ8USlgJ1JRKWInU1EpYydUUSlwJ1pRKXInXVEqfSlPUStQKVBRK1EpUVErVSlXUytXKVopcVErWyleUStdKV9RK14pYVEsWyp8USxdK09RLF8rVlEsYCtYUSxlK2BRLHwsXlEtTyxjUS1QLGRSLV8sfVdvT3IpWytaUiNyblEnWiRwUilaJn1RK2YpaFIsaStnUSlxJ1pSK1gpWlptT25yKVsrWlFyT1IjdHJRJl8jelIoaiZfUyVqI1AjfFMoUiVqKFVUKFUlbSZhUSVeIXhRJWUhe1cncyVeJWUneCd8USd4JWJSJ3wlZ1EmaiRXUihwJmpRKFglblEqXihTVCpkKFgqXlEnYiR7Uil2J2JTJ2UlTyVQWSl6J2UpeytzLHEtVlUpeydmJ2cnaFUrcyl8KX0qT1MscSt0K3VSLVYsclEjV11SJXEjV1EjWl5SJXMjWlEjXl9SJXcjXlEoWyV0UyppKFsqalIqaihdUSpsKF5SLFIqbFEjYWBSJXkjYVEjY2FSJXojY1EjZWJSJXsjZVEjZ2NSJXwjZ1EjamZRJk8jaFcmUiNqJk8obSpwUShtJmRSKnAtalEkVHdTJmYkVCZnUiZnJFVRJnQkYlIofCZ0USZXI29SKGYmV1EkXiFQUiZuJF5RKnQodFMsVyp0LHpSLHosWFEmciRgUih5JnJRI21qUiZUI21RK1opW1IsYStaUSh9JnVSKnsofVEmeCRmUylVJngpVlIpViZ5USdRJG1SKV0nUVEnViRuUylmJ1YrZFIrZClnUStqKWxSLGwralduT3IpWytaUiNxblNxT3JUK1kpWytaV3BPcilbK1pSJ08kbFlqT3IkbClbK1pSJlMjbFt3T3IjbCRsKVsrWlImZSRTJllQT1hZWmhydHZ8fSFSIVMhVCFYIWkhayFuIW8hcCFyIXMjWyNpI2wkTyRRJFMkViRqJGwkeiVQJVclWiVdJWQlaSVrJXUlfSZbJmAmayZsJnMmeidSJ1UnYCdhJ2QnZidnJ2sncid6KFEoVyhaKGIoZChsKHspTylYKVspZSlvKXUpeCl5KXwqUypUKlYqWCpbKl0qYCpnKmgqbypyKnorWitiK2MrZittK24rbytxK3IrdSt3K3kreyt9LFAsUSxTLGcsaSxtLHAscy1ULVUtYS1kLWYtZy1oLWktay1sLW0tbi1xLXVRIW1TUSNoZVEjdXNVJFd4JWAndlMkZiFVJGlRJHIhY1EkcyFkUSR0IWVRJHUhZlEkdiFnUSR3IWhRJWIheVElZyF8USVtI1FRJW4jUlEmYSN9USZ5JGdRKGMmUFUobiZpKG8qcVcpUiZ3KVQrUytUUSpRJ3BRKlooUFErUilTUSt8KmNSLWotb1EheFhRIXtZUSRkIVNRJGUhVF4nbyVdJWQncid6KlMqVipYUitPKU9bZk9yI2wkbClbK1poIXVYWSFTIVQlXSVkJ3IneilPKlMqVipYUSNQWlEja2hTI3x2fFEkWn1XJGIhUiRWJnopWFMkbiFYJGpXJHghaSdhKXUrbVElTyFrUSV0I1tgJlEjaSV9KGIoZChsKm8sUy1uUSZiJE9RJmMkUVEmZCRTUSdeJHpRJ2glUFEnbiVaVyhPJWkoUSpbKmBRKFMla1EoXSV1UShoJltTKGsmYC1sUShxJmtRKHImbFUoeiZzKHsqelEpYSdSWSlkJ1UpZStiK2MsZ1EpcydgXil3J2QpeStxK3IscC1VLWFRKX0nZlEqTydnUypQJ2stbVcqYihXKl0reSt9VypmKFoqaCxQLFFRK2wpb1ErcCl4USt0KXxRLE8qZ1EsVCpyUSxoK2ZRLG4rblEsbytvUSxyK3VRLHYre1EtUSxpUS1TLG1SLWAtVGhUT3IjaSNsJGwlfSZgJ2soYihkKVsrWiR6IXRYWVpodnx9IVIhUyFUIVghaSFrI1skTyRRJFMkViRqJHolUCVaJV0lZCVpJWsldSZbJmsmbCZzJnonUidVJ2AnYSdkJ2YnZydyJ3ooUShXKFoobCh7KU8pWCllKW8pdSl4KXkpfCpTKlYqWCpbKl0qYCpnKmgqbypyKnorYitjK2YrbStuK28rcStyK3UreSt7K30sUCxRLFMsZyxpLG0scC1ULVUtYS1sLW0tblEjdnRXJVQhbiFyLWctcVElVSFvUSVWIXBRJVghc1ElYy1mUydqJVcta1EnbC1oUSdtLWlRK3YqVFEsdSt3Uy1XLHMtZFItcy11VSN6dS1ZLXRSKGkmXltnT3IjbCRsKVsrWlghd1gjWyRTJFZRI1VaUSRQdlIkWXxRJV8heFElZiF7USVsI1BRJ14keFEneSViUSd9JWdRKFYlbVEoWSVuUSpfKFNRLHQrdlEtWyx1Ui1jLVpRJFh4USd1JWBSKlUndlEtWixzUi1lLWRSI09ZUiNUWlIkfSFpUSR7IWlWKXQnYSl1K21SJVEha1IldiNbUShgJXZSKm4oYVEkYyFSUSZoJFZRKVcmelIrVilYUSNwbFEkWyFPUSRfIVBSJnAkXlEocyZvUSp2KHVRKncodlIsWip4UiRhIVFYcE9yKVsrWlEkaCFVUiZ7JGlRJG8hWFImfCRqUiluJ1lRKWwnWVYsaitpLGstUlwiLFxuICBub2RlTmFtZXM6IFwi4pqgIHByaW50IENvbW1lbnQgU2NyaXB0IEFzc2lnblN0YXRlbWVudCAqIEJpbmFyeUV4cHJlc3Npb24gQml0T3AgQml0T3AgQml0T3AgQml0T3AgQXJpdGhPcCBBcml0aE9wIEAgQXJpdGhPcCAqKiBVbmFyeUV4cHJlc3Npb24gQXJpdGhPcCBCaXRPcCBBd2FpdEV4cHJlc3Npb24gYXdhaXQgUGFyZW50aGVzaXplZEV4cHJlc3Npb24gKCBCaW5hcnlFeHByZXNzaW9uIG9yIGFuZCBDb21wYXJlT3AgaW4gbm90IGlzIFVuYXJ5RXhwcmVzc2lvbiBDb25kaXRpb25hbEV4cHJlc3Npb24gaWYgZWxzZSBMYW1iZGFFeHByZXNzaW9uIGxhbWJkYSBQYXJhbUxpc3QgVmFyaWFibGVOYW1lIEFzc2lnbk9wICwgOiBOYW1lZEV4cHJlc3Npb24gQXNzaWduT3AgWWllbGRFeHByZXNzaW9uIHlpZWxkIGZyb20gKSBUdXBsZUV4cHJlc3Npb24gQ29tcHJlaGVuc2lvbkV4cHJlc3Npb24gYXN5bmMgZm9yIExhbWJkYUV4cHJlc3Npb24gQXJyYXlFeHByZXNzaW9uIFsgXSBBcnJheUNvbXByZWhlbnNpb25FeHByZXNzaW9uIERpY3Rpb25hcnlFeHByZXNzaW9uIHsgfSBEaWN0aW9uYXJ5Q29tcHJlaGVuc2lvbkV4cHJlc3Npb24gU2V0RXhwcmVzc2lvbiBTZXRDb21wcmVoZW5zaW9uRXhwcmVzc2lvbiBDYWxsRXhwcmVzc2lvbiBBcmdMaXN0IEFzc2lnbk9wIE1lbWJlckV4cHJlc3Npb24gLiBQcm9wZXJ0eU5hbWUgTnVtYmVyIFN0cmluZyBGb3JtYXRTdHJpbmcgRm9ybWF0UmVwbGFjZW1lbnQgRm9ybWF0Q29udmVyc2lvbiBGb3JtYXRTcGVjIENvbnRpbnVlZFN0cmluZyBFbGxpcHNpcyBOb25lIEJvb2xlYW4gVHlwZURlZiBBc3NpZ25PcCBVcGRhdGVTdGF0ZW1lbnQgVXBkYXRlT3AgRXhwcmVzc2lvblN0YXRlbWVudCBEZWxldGVTdGF0ZW1lbnQgZGVsIFBhc3NTdGF0ZW1lbnQgcGFzcyBCcmVha1N0YXRlbWVudCBicmVhayBDb250aW51ZVN0YXRlbWVudCBjb250aW51ZSBSZXR1cm5TdGF0ZW1lbnQgcmV0dXJuIFlpZWxkU3RhdGVtZW50IFByaW50U3RhdGVtZW50IFJhaXNlU3RhdGVtZW50IHJhaXNlIEltcG9ydFN0YXRlbWVudCBpbXBvcnQgYXMgU2NvcGVTdGF0ZW1lbnQgZ2xvYmFsIG5vbmxvY2FsIEFzc2VydFN0YXRlbWVudCBhc3NlcnQgU3RhdGVtZW50R3JvdXAgOyBJZlN0YXRlbWVudCBCb2R5IGVsaWYgV2hpbGVTdGF0ZW1lbnQgd2hpbGUgRm9yU3RhdGVtZW50IFRyeVN0YXRlbWVudCB0cnkgZXhjZXB0IGZpbmFsbHkgV2l0aFN0YXRlbWVudCB3aXRoIEZ1bmN0aW9uRGVmaW5pdGlvbiBkZWYgUGFyYW1MaXN0IEFzc2lnbk9wIFR5cGVEZWYgQ2xhc3NEZWZpbml0aW9uIGNsYXNzIERlY29yYXRlZFN0YXRlbWVudCBEZWNvcmF0b3IgQXRcIixcbiAgbWF4VGVybTogMjM0LFxuICBjb250ZXh0OiB0cmFja0luZGVudCxcbiAgbm9kZVByb3BzOiBbXG4gICAgW05vZGVQcm9wLmdyb3VwLCAtMTQsNCw4MCw4Miw4Myw4NSw4Nyw4OSw5MSw5Myw5NCw5NSw5NywxMDAsMTAzLFwiU3RhdGVtZW50IFN0YXRlbWVudFwiLC0yMiw2LDE2LDE5LDIxLDM3LDQ3LDQ4LDUyLDU1LDU2LDU5LDYwLDYxLDYyLDY1LDY4LDY5LDcwLDc0LDc1LDc2LDc3LFwiRXhwcmVzc2lvblwiLC05LDEwNSwxMDcsMTEwLDExMiwxMTMsMTE3LDExOSwxMjQsMTI2LFwiU3RhdGVtZW50XCJdXG4gIF0sXG4gIHNraXBwZWROb2RlczogWzAsMl0sXG4gIHJlcGVhdE5vZGVDb3VudDogMzIsXG4gIHRva2VuRGF0YTogXCImQWFNZ1IhXk9YJH1YWSEjeFlbJH1bXSEjeF1wJH1wcSEjeHFyISZTcnMhKXlzdCFDe3R1JH11diQrfXZ3JC5hd3gkL214eSRMZ3l6JE1tenskTnN7fCUjY3x9JSRvfSFPJSV1IU8hUCUoWyFQIVElM2IhUSFSJTZRIVIhWyU6UyFbIV0lRU8hXSFeJUdiIV4hXyVIaCFfIWAlS1chYCFhJUxkIWEhYiR9IWIhYyYgUCFjIWQmIV8hZCFlJiRQIWUhaCYhXyFoIWkmLlIhaSF0JiFfIXQhdSY3ZyF1IXcmIV8hdyF4JixhIXghfSYhXyF9I08mOXEjTyNQISViI1AjUSY6dyNRI1ImO30jUiNTJiFfI1MjVCR9I1QjVSYhXyNVI1YmJFAjViNZJiFfI1kjWiYuUiNaI2YmIV8jZiNnJjdnI2cjaSYhXyNpI2omLGEjaiNvJiFfI28jcCY9WiNwI3EmPlAjcSNyJj9dI3IjcyZAWiNzJGckfSRnfiYhXzxyJWBaJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH05WyZeWiVwN1slZ1MlbWAldiFiT3InUHJzQ3hzdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1A5WydeWiVwN1slZ1MlalclbWAldiFiT3InUHJzJlJzdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1A4eihXWiVwN1slaldPcih5cnMpd3N3KHl3eDtieCNPKHkjTyNQMlYjUCNvKHkjbyNwN24jcCNxKHkjcSNyMmsjcn4oeTh6KVVaJXA3WyVnUyVqVyV2IWJPcih5cnMpd3N3KHl3eChQeCNPKHkjTyNQMlYjUCNvKHkjbyNwN24jcCNxKHkjcSNyMmsjcn4oeTh6KlFaJXA3WyVnUyV2IWJPcih5cnMqc3N3KHl3eChQeCNPKHkjTyNQMlYjUCNvKHkjbyNwN24jcCNxKHkjcSNyMmsjcn4oeTh6KnxaJXA3WyVnUyV2IWJPcih5cnMrb3N3KHl3eChQeCNPKHkjTyNQMlYjUCNvKHkjbyNwN24jcCNxKHkjcSNyMmsjcn4oeThyK3hYJXA3WyVnUyV2IWJPdytvd3gsZXgjTytvI08jUC5WI1AjbytvI28jcDBeI3AjcStvI3Ejci5rI3J+K284cixqWCVwN1tPdytvd3gtVngjTytvI08jUC5WI1AjbytvI28jcDBeI3AjcStvI3Ejci5rI3J+K284ci1bWCVwN1tPdytvd3gtd3gjTytvI08jUC5WI1AjbytvI28jcDBeI3AjcStvI3Ejci5rI3J+K283Wy18UiVwN1tPI28tdyNwI3EtdyNyfi13OHIuW1QlcDdbTyNvK28jbyNwLmsjcCNxK28jcSNyLmsjcn4rbyFmLnJWJWdTJXYhYk93Lmt3eC9YeCNPLmsjTyNQMFcjUCNvLmsjbyNwMF4jcH4uayFmL1tWT3cua3d4L3F4I08uayNPI1AwVyNQI28uayNvI3AwXiNwfi5rIWYvdFVPdy5reCNPLmsjTyNQMFcjUCNvLmsjbyNwMF4jcH4uayFmMFpQT34uayFmMGNWJWdTT3cweHd4MV54I08weCNPI1AyUCNQI28weCNvI3AuayNwfjB4UzB9VCVnU093MHh3eDFeeCNPMHgjTyNQMlAjUH4weFMxYVRPdzB4d3gxcHgjTzB4I08jUDJQI1B+MHhTMXNTT3cweHgjTzB4I08jUDJQI1B+MHhTMlNQT34weDh6MltUJXA3W08jbyh5I28jcDJrI3AjcSh5I3EjcjJrI3J+KHkhbjJ0WCVnUyVqVyV2IWJPcjJrcnMzYXN3Mmt3eDR3eCNPMmsjTyNQN2gjUCNvMmsjbyNwN24jcH4yayFuM2hYJWdTJXYhYk9yMmtyczRUc3cya3d4NHd4I08yayNPI1A3aCNQI28yayNvI3A3biNwfjJrIW40W1glZ1MldiFiT3Iya3JzLmtzdzJrd3g0d3gjTzJrI08jUDdoI1AjbzJrI28jcDduI3B+MmshbjR8WCVqV09yMmtyczNhc3cya3d4NWl4I08yayNPI1A3aCNQI28yayNvI3A3biNwfjJrIW41blglaldPcjJrcnMzYXN3Mmt3eDZaeCNPMmsjTyNQN2gjUCNvMmsjbyNwN24jcH4ya1c2YFQlaldPcjZacnM2b3MjTzZaI08jUDdiI1B+NlpXNnJUT3I2WnJzN1JzI082WiNPI1A3YiNQfjZaVzdVU09yNlpzI082WiNPI1A3YiNQfjZaVzdlUE9+NlohbjdrUE9+Mmshbjd1WCVnUyVqV09yOGJyczlPc3c4Ynd4OlV4I084YiNPI1A7WyNQI284YiNvI3AyayNwfjhiWzhpViVnUyVqV09yOGJyczlPc3c4Ynd4OlV4I084YiNPI1A7WyNQfjhiWzlUViVnU09yOGJyczlqc3c4Ynd4OlV4I084YiNPI1A7WyNQfjhiWzlvViVnU09yOGJyczB4c3c4Ynd4OlV4I084YiNPI1A7WyNQfjhiWzpaViVqV09yOGJyczlPc3c4Ynd4OnB4I084YiNPI1A7WyNQfjhiWzp1ViVqV09yOGJyczlPc3c4Ynd4Nlp4I084YiNPI1A7WyNQfjhiWztfUE9+OGI4ejtpWiVwN1slaldPcih5cnMpd3N3KHl3eDxbeCNPKHkjTyNQMlYjUCNvKHkjbyNwN24jcCNxKHkjcSNyMmsjcn4oeTdkPGNYJXA3WyVqV09yPFtycz1PcyNPPFsjTyNQPmIjUCNvPFsjbyNwNlojcCNxPFsjcSNyNlojcn48WzdkPVRYJXA3W09yPFtycz1wcyNPPFsjTyNQPmIjUCNvPFsjbyNwNlojcCNxPFsjcSNyNlojcn48WzdkPXVYJXA3W09yPFtycy13cyNPPFsjTyNQPmIjUCNvPFsjbyNwNlojcCNxPFsjcSNyNlojcn48WzdkPmdUJXA3W08jbzxbI28jcDZaI3AjcTxbI3EjcjZaI3J+PFs5Wz57VCVwN1tPI28nUCNvI3A/WyNwI3EnUCNxI3I/WyNyfidQI08/Z1glZ1MlalclbWAldiFiT3I/W3JzQFNzdz9bd3g0d3gjTz9bI08jUENPI1Ajbz9bI28jcENVI3B+P1sjT0BdWCVnUyVtYCV2IWJPcj9bcnNAeHN3P1t3eDR3eCNPP1sjTyNQQ08jUCNvP1sjbyNwQ1UjcH4/WyNPQVJYJWdTJW1gJXYhYk9yP1tyc0Fuc3c/W3d4NHd4I08/WyNPI1BDTyNQI28/WyNvI3BDVSNwfj9bIXZBd1YlZ1MlbWAldiFiT3dBbnd4L1h4I09BbiNPI1BCXiNQI29BbiNvI3BCZCNwfkFuIXZCYVBPfkFuIXZCaVYlZ1NPdzB4d3gxXngjTzB4I08jUDJQI1AjbzB4I28jcEFuI3B+MHgjT0NSUE9+P1sjT0NdWCVnUyVqV09yOGJyczlPc3c4Ynd4OlV4I084YiNPI1A7WyNQI284YiNvI3A/WyNwfjhiOVtEVFolcDdbJWdTJW1gJXYhYk9yJ1Byc0R2c3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQOVNFUlglcDdbJWdTJW1gJXYhYk93RHZ3eCxleCNPRHYjTyNQRW4jUCNvRHYjbyNwQmQjcCNxRHYjcSNyQW4jcn5EdjlTRXNUJXA3W08jb0R2I28jcEFuI3AjcUR2I3EjckFuI3J+RHY8YkZfWiVwN1slalclc3AleCN0T3JHUXJzKXdzd0dRd3hNXngjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1E8YkdhWiVwN1slZ1Mlalclc3AldiFiJXgjdE9yR1Fycyl3c3dHUXd4RlN4I09HUSNPI1BIUyNQI29HUSNvI3BMaiNwI3FHUSNxI3JIaCNyfkdRPGJIWFQlcDdbTyNvR1EjbyNwSGgjcCNxR1EjcSNySGgjcn5HUSZVSHVYJWdTJWpXJXNwJXYhYiV4I3RPckhocnMzYXN3SGh3eElieCNPSGgjTyNQTGQjUCNvSGgjbyNwTGojcH5IaCZVSWtYJWpXJXNwJXgjdE9ySGhyczNhc3dIaHd4Sld4I09IaCNPI1BMZCNQI29IaCNvI3BMaiNwfkhoJlVKYVglalclc3AleCN0T3JIaHJzM2Fzd0hod3hKfHgjT0hoI08jUExkI1Ajb0hoI28jcExqI3B+SGgkbktWWCVqVyVzcCV4I3RPckp8cnM2b3N3Snx3eEp8eCNPSnwjTyNQS3IjUCNvSnwjbyNwS3gjcH5KfCRuS3VQT35KfCRuS31WJWpXT3I2WnJzNm9zI082WiNPI1A3YiNQI282WiNvI3BKfCNwfjZaJlVMZ1BPfkhoJlVMcVglZ1MlaldPcjhicnM5T3N3OGJ3eDpVeCNPOGIjTyNQO1sjUCNvOGIjbyNwSGgjcH44YjxiTWlaJXA3WyVqVyVzcCV4I3RPckdRcnMpd3N3R1F3eE5beCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUTp6TmdaJXA3WyVqVyVzcCV4I3RPck5bcnM9T3N3Tlt3eE5beCNPTlsjTyNQISBZI1Ajb05bI28jcEt4I3AjcU5bI3Ejckp8I3J+Tls6eiEgX1QlcDdbTyNvTlsjbyNwSnwjcCNxTlsjcSNySnwjcn5OWzxyISBzVCVwN1tPI28kfSNvI3AhIVMjcCNxJH0jcSNyISFTI3J+JH0mZiEhY1glZ1MlalclbWAlc3AldiFiJXgjdE9yISFTcnNAU3N3ISFTd3hJYngjTyEhUyNPI1AhI08jUCNvISFTI28jcCEjVSNwfiEhUyZmISNSUE9+ISFTJmYhI11YJWdTJWpXT3I4YnJzOU9zdzhid3g6VXgjTzhiI08jUDtbI1AjbzhiI28jcCEhUyNwfjhiTWchJF1hJXA3WyVnUyVqVyRvMXMlbWAlc3AldiFiJXgjdE9YJH1YWSEjeFlbJH1bXSEjeF1wJH1wcSEjeHFyJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhJWIjUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9TWchJWdYJXA3W09ZJH1ZWiEjeFpdJH1dXiEjeF4jbyR9I28jcCEhUyNwI3EkfSNxI3IhIVMjcn4kfTx1ISZlYiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAhJ20hYCNPJH0jTyNQISBuI1AjVCR9I1QjVSEocyNVI2YkfSNmI2chKHMjZyNoIShzI2gjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTx1IShRWmpSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH08dSEpV1ohalIlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7ISpZXyV0cCVwN1slZ1MlZSxYJW1gJXYhYk9ZIStYWVonUFpdIStYXV4nUF5yIStYcnMhQlBzdyErWHd4IS1neCNPIStYI08jUCE+ZSNQI28hK1gjbyNwIUB9I3AjcSErWCNxI3IhPnkjcn4hK1hEZSEraF8lcDdbJWdTJWpXJWUsWCVtYCV2IWJPWSErWFlaJ1BaXSErWF1eJ1BeciErWHJzISxnc3chK1h3eCEtZ3gjTyErWCNPI1AhPmUjUCNvIStYI28jcCFAfSNwI3EhK1gjcSNyIT55I3J+IStYRGUhLHRaJXA3WyVnUyVlLFglbWAldiFiT3InUHJzQ3hzdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1BEVCEtcF8lcDdbJWpXJWUsWE9ZIS5vWVooeVpdIS5vXV4oeV5yIS5vcnMhL3tzdyEub3d4ITtSeCNPIS5vI08jUCEweSNQI28hLm8jbyNwITZtI3AjcSEubyNxI3IhMV8jcn4hLm9EVCEufF8lcDdbJWdTJWpXJWUsWCV2IWJPWSEub1laKHlaXSEub11eKHleciEub3JzIS97c3chLm93eCEtZ3gjTyEubyNPI1AhMHkjUCNvIS5vI28jcCE2bSNwI3EhLm8jcSNyITFfI3J+IS5vRFQhMFdaJXA3WyVnUyVlLFgldiFiT3IoeXJzKnNzdyh5d3goUHgjTyh5I08jUDJWI1Ajbyh5I28jcDduI3AjcSh5I3EjcjJrI3J+KHlEVCExT1QlcDdbTyNvIS5vI28jcCExXyNwI3EhLm8jcSNyITFfI3J+IS5vLXchMWpdJWdTJWpXJWUsWCV2IWJPWSExX1laMmtaXSExX11eMmteciExX3JzITJjc3chMV93eCEzWHgjTyExXyNPI1AhNmcjUCNvITFfI28jcCE2bSNwfiExXy13ITJsWCVnUyVlLFgldiFiT3Iya3JzNFRzdzJrd3g0d3gjTzJrI08jUDdoI1AjbzJrI28jcDduI3B+MmstdyEzYF0lalclZSxYT1khMV9ZWjJrWl0hMV9dXjJrXnIhMV9ycyEyY3N3ITFfd3ghNFh4I08hMV8jTyNQITZnI1AjbyExXyNvI3AhNm0jcH4hMV8tdyE0YF0lalclZSxYT1khMV9ZWjJrWl0hMV9dXjJrXnIhMV9ycyEyY3N3ITFfd3ghNVh4I08hMV8jTyNQITZnI1AjbyExXyNvI3AhNm0jcH4hMV8sYSE1YFglalclZSxYT1khNVhZWjZaWl0hNVhdXjZaXnIhNVhycyE1e3MjTyE1WCNPI1AhNmEjUH4hNVgsYSE2UVQlZSxYT3I2WnJzN1JzI082WiNPI1A3YiNQfjZaLGEhNmRQT34hNVgtdyE2alBPfiExXy13ITZ2XSVnUyVqVyVlLFhPWSE3b1laOGJaXSE3b11eOGJeciE3b3JzIThrc3chN293eCE5WHgjTyE3byNPI1AhOnsjUCNvITdvI28jcCExXyNwfiE3byxlITd4WiVnUyVqVyVlLFhPWSE3b1laOGJaXSE3b11eOGJeciE3b3JzIThrc3chN293eCE5WHgjTyE3byNPI1AhOnsjUH4hN28sZSE4clYlZ1MlZSxYT3I4YnJzOWpzdzhid3g6VXgjTzhiI08jUDtbI1B+OGIsZSE5YFolalclZSxYT1khN29ZWjhiWl0hN29dXjhiXnIhN29ycyE4a3N3ITdvd3ghOlJ4I08hN28jTyNQITp7I1B+ITdvLGUhOllaJWpXJWUsWE9ZITdvWVo4YlpdITdvXV44Yl5yITdvcnMhOGtzdyE3b3d4ITVYeCNPITdvI08jUCE6eyNQfiE3byxlITtPUE9+ITdvRFQhO1tfJXA3WyVqVyVlLFhPWSEub1laKHlaXSEub11eKHleciEub3JzIS97c3chLm93eCE8WngjTyEubyNPI1AhMHkjUCNvIS5vI28jcCE2bSNwI3EhLm8jcSNyITFfI3J+IS5vQm0hPGRdJXA3WyVqVyVlLFhPWSE8WllaPFtaXSE8Wl1ePFteciE8WnJzIT1dcyNPITxaI08jUCE+UCNQI28hPFojbyNwITVYI3AjcSE8WiNxI3IhNVgjcn4hPFpCbSE9ZFglcDdbJWUsWE9yPFtycz1wcyNPPFsjTyNQPmIjUCNvPFsjbyNwNlojcCNxPFsjcSNyNlojcn48W0JtIT5VVCVwN1tPI28hPFojbyNwITVYI3AjcSE8WiNxI3IhNVgjcn4hPFpEZSE+alQlcDdbTyNvIStYI28jcCE+eSNwI3EhK1gjcSNyIT55I3J+IStYLlghP1ddJWdTJWpXJWUsWCVtYCV2IWJPWSE+eVlaP1taXSE+eV1eP1teciE+eXJzIUBQc3chPnl3eCEzWHgjTyE+eSNPI1AhQHcjUCNvIT55I28jcCFAfSNwfiE+eS5YIUBbWCVnUyVlLFglbWAldiFiT3I/W3JzQHhzdz9bd3g0d3gjTz9bI08jUENPI1Ajbz9bI28jcENVI3B+P1suWCFAelBPfiE+eS5YIUFXXSVnUyVqVyVlLFhPWSE3b1laOGJaXSE3b11eOGJeciE3b3JzIThrc3chN293eCE5WHgjTyE3byNPI1AhOnsjUCNvITdvI28jcCE+eSNwfiE3b0daIUJeWiVwN1slZ1MlZSxYJW1gJXYhYk9yJ1BycyFDUHN3J1B3eChQeCNPJ1AjTyNQPnYjUCNvJ1AjbyNwQ1UjcCNxJ1AjcSNyP1sjcn4nUEdaIUNgWCVrI3wlcDdbJWdTJWksWCVtYCV2IWJPd0R2d3gsZXgjT0R2I08jUEVuI1Ajb0R2I28jcEJkI3AjcUR2I3EjckFuI3J+RHZNZyFEYF9RMXMlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPWSFDe1laJH1aXSFDe11eJH1eciFDe3JzIUVfc3chQ3t3eCNIcXgjTyFDeyNPI1AkKGkjUCNvIUN7I28jcCQqeyNwI3EhQ3sjcSNyJCldI3J+IUN7SlAhRWxfUTFzJXA3WyVnUyVtYCV2IWJPWSFGa1laJ1BaXSFGa11eJ1BeciFGa3JzI0Vrc3chRmt3eCFHeXgjTyFGayNPI1AjPXUjUCNvIUZrI28jcCNEaSNwI3EhRmsjcSNyIz5pI3J+IUZrSlAhRnpfUTFzJXA3WyVnUyVqVyVtYCV2IWJPWSFGa1laJ1BaXSFGa11eJ1BeciFGa3JzIUVfc3chRmt3eCFHeXgjTyFGayNPI1AjPXUjUCNvIUZrI28jcCNEaSNwI3EhRmsjcSNyIz5pI3J+IUZrSW8hSFNfUTFzJXA3WyVqV09ZIUlSWVooeVpdIUlSXV4oeV5yIUlScnMhSl9zdyFJUnd4Izh3eCNPIUlSI08jUCMqUiNQI28hSVIjbyNwIzJ9I3AjcSFJUiNxI3IjKnUjcn4hSVJJbyFJYF9RMXMlcDdbJWdTJWpXJXYhYk9ZIUlSWVooeVpdIUlSXV4oeV5yIUlScnMhSl9zdyFJUnd4IUd5eCNPIUlSI08jUCMqUiNQI28hSVIjbyNwIzJ9I3AjcSFJUiNxI3IjKnUjcn4hSVJJbyFKal9RMXMlcDdbJWdTJXYhYk9ZIUlSWVooeVpdIUlSXV4oeV5yIUlScnMhS2lzdyFJUnd4IUd5eCNPIUlSI08jUCMqUiNQI28hSVIjbyNwIzJ9I3AjcSFJUiNxI3IjKnUjcn4hSVJJbyFLdF9RMXMlcDdbJWdTJXYhYk9ZIUlSWVooeVpdIUlSXV4oeV5yIUlScnMhTHNzdyFJUnd4IUd5eCNPIUlSI08jUCMqUiNQI28hSVIjbyNwIzJ9I3AjcSFJUiNxI3IjKnUjcn4hSVJJZyFNT11RMXMlcDdbJWdTJXYhYk9ZIUxzWVorb1pdIUxzXV4rb153IUxzd3ghTXd4I08hTHMjTyNQIyF5I1AjbyFMcyNvI3AjJm0jcCNxIUxzI3EjciMjbSNyfiFMc0lnIU5PXVExcyVwN1tPWSFMc1laK29aXSFMc11eK29edyFMc3d4IU53eCNPIUxzI08jUCMheSNQI28hTHMjbyNwIyZtI3AjcSFMcyNxI3IjI20jcn4hTHNJZyMgT11RMXMlcDdbT1khTHNZWitvWl0hTHNdXitvXnchTHN3eCMgd3gjTyFMcyNPI1AjIXkjUCNvIUxzI28jcCMmbSNwI3EhTHMjcSNyIyNtI3J+IUxzSFAjIU9YUTFzJXA3W09ZIyB3WVotd1pdIyB3XV4td14jbyMgdyNvI3AjIWsjcCNxIyB3I3EjciMhayNyfiMgdzFzIyFwUlExc09ZIyFrWl0jIWtefiMha0lnIyNRWFExcyVwN1tPWSFMc1laK29aXSFMc11eK29eI28hTHMjbyNwIyNtI3AjcSFMcyNxI3IjI20jcn4hTHMzWiMjdlpRMXMlZ1MldiFiT1kjI21ZWi5rWl0jI21dXi5rXncjI213eCMkaXgjTyMjbSNPI1AjJlgjUCNvIyNtI28jcCMmbSNwfiMjbTNaIyRuWlExc09ZIyNtWVoua1pdIyNtXV4ua153IyNtd3gjJWF4I08jI20jTyNQIyZYI1AjbyMjbSNvI3AjJm0jcH4jI20zWiMlZlpRMXNPWSMjbVlaLmtaXSMjbV1eLmtedyMjbXd4IyFreCNPIyNtI08jUCMmWCNQI28jI20jbyNwIyZtI3B+IyNtM1ojJl5UUTFzT1kjI21ZWi5rWl0jI21dXi5rXn4jI20zWiMmdFpRMXMlZ1NPWSMnZ1laMHhaXSMnZ11eMHhedyMnZ3d4IyhaeCNPIydnI08jUCMpbSNQI28jJ2cjbyNwIyNtI3B+IydnMXcjJ25YUTFzJWdTT1kjJ2dZWjB4Wl0jJ2ddXjB4XncjJ2d3eCMoWngjTyMnZyNPI1AjKW0jUH4jJ2cxdyMoYFhRMXNPWSMnZ1laMHhaXSMnZ11eMHhedyMnZ3d4Iyh7eCNPIydnI08jUCMpbSNQfiMnZzF3IylRWFExc09ZIydnWVoweFpdIydnXV4weF53Iydnd3gjIWt4I08jJ2cjTyNQIyltI1B+IydnMXcjKXJUUTFzT1kjJ2dZWjB4Wl0jJ2ddXjB4Xn4jJ2dJbyMqWVhRMXMlcDdbT1khSVJZWih5Wl0hSVJdXih5XiNvIUlSI28jcCMqdSNwI3EhSVIjcSNyIyp1I3J+IUlSM2MjK1FdUTFzJWdTJWpXJXYhYk9ZIyp1WVoya1pdIyp1XV4ya15yIyp1cnMjK3lzdyMqdXd4Iy19eCNPIyp1I08jUCMyaSNQI28jKnUjbyNwIzJ9I3B+Iyp1M2MjLFNdUTFzJWdTJXYhYk9ZIyp1WVoya1pdIyp1XV4ya15yIyp1cnMjLHtzdyMqdXd4Iy19eCNPIyp1I08jUCMyaSNQI28jKnUjbyNwIzJ9I3B+Iyp1M2MjLVVdUTFzJWdTJXYhYk9ZIyp1WVoya1pdIyp1XV4ya15yIyp1cnMjI21zdyMqdXd4Iy19eCNPIyp1I08jUCMyaSNQI28jKnUjbyNwIzJ9I3B+Iyp1M2MjLlVdUTFzJWpXT1kjKnVZWjJrWl0jKnVdXjJrXnIjKnVycyMreXN3Iyp1d3gjLn14I08jKnUjTyNQIzJpI1AjbyMqdSNvI3AjMn0jcH4jKnUzYyMvVV1RMXMlaldPWSMqdVlaMmtaXSMqdV1eMmteciMqdXJzIyt5c3cjKnV3eCMvfXgjTyMqdSNPI1AjMmkjUCNvIyp1I28jcCMyfSNwfiMqdTF7IzBVWFExcyVqV09ZIy99WVo2WlpdIy99XV42Wl5yIy99cnMjMHFzI08jL30jTyNQIzJUI1B+Iy99MXsjMHZYUTFzT1kjL31ZWjZaWl0jL31dXjZaXnIjL31ycyMxY3MjTyMvfSNPI1AjMlQjUH4jL30xeyMxaFhRMXNPWSMvfVlaNlpaXSMvfV1eNlpeciMvfXJzIyFrcyNPIy99I08jUCMyVCNQfiMvfTF7IzJZVFExc09ZIy99WVo2WlpdIy99XV42Wl5+Iy99M2MjMm5UUTFzT1kjKnVZWjJrWl0jKnVdXjJrXn4jKnUzYyMzV11RMXMlZ1MlaldPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzR7c3cjNFB3eCM2b3gjTyM0UCNPI1AjOGMjUCNvIzRQI28jcCMqdSNwfiM0UDJQIzRZWlExcyVnUyVqV09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNHtzdyM0UHd4IzZveCNPIzRQI08jUCM4YyNQfiM0UDJQIzVTWlExcyVnU09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNXVzdyM0UHd4IzZveCNPIzRQI08jUCM4YyNQfiM0UDJQIzV8WlExcyVnU09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjJ2dzdyM0UHd4IzZveCNPIzRQI08jUCM4YyNQfiM0UDJQIzZ2WlExcyVqV09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNHtzdyM0UHd4IzdpeCNPIzRQI08jUCM4YyNQfiM0UDJQIzdwWlExcyVqV09ZIzRQWVo4YlpdIzRQXV44Yl5yIzRQcnMjNHtzdyM0UHd4Iy99eCNPIzRQI08jUCM4YyNQfiM0UDJQIzhoVFExc09ZIzRQWVo4YlpdIzRQXV44Yl5+IzRQSW8jOVFfUTFzJXA3WyVqV09ZIUlSWVooeVpdIUlSXV4oeV5yIUlScnMhSl9zdyFJUnd4IzpQeCNPIUlSI08jUCMqUiNQI28hSVIjbyNwIzJ9I3AjcSFJUiNxI3IjKnUjcn4hSVJIWCM6WV1RMXMlcDdbJWpXT1kjOlBZWjxbWl0jOlBdXjxbXnIjOlBycyM7UnMjTyM6UCNPI1AjPVIjUCNvIzpQI28jcCMvfSNwI3EjOlAjcSNyIy99I3J+IzpQSFgjO1ldUTFzJXA3W09ZIzpQWVo8W1pdIzpQXV48W15yIzpQcnMjPFJzI08jOlAjTyNQIz1SI1AjbyM6UCNvI3AjL30jcCNxIzpQI3EjciMvfSNyfiM6UEhYIzxZXVExcyVwN1tPWSM6UFlaPFtaXSM6UF1ePFteciM6UHJzIyB3cyNPIzpQI08jUCM9UiNQI28jOlAjbyNwIy99I3AjcSM6UCNxI3IjL30jcn4jOlBIWCM9WVhRMXMlcDdbT1kjOlBZWjxbWl0jOlBdXjxbXiNvIzpQI28jcCMvfSNwI3EjOlAjcSNyIy99I3J+IzpQSlAjPXxYUTFzJXA3W09ZIUZrWVonUFpdIUZrXV4nUF4jbyFGayNvI3AjPmkjcCNxIUZrI3EjciM+aSNyfiFGazNzIz52XVExcyVnUyVqVyVtYCV2IWJPWSM+aVlaP1taXSM+aV1eP1teciM+aXJzIz9vc3cjPml3eCMtfXgjTyM+aSNPI1AjRFQjUCNvIz5pI28jcCNEaSNwfiM+aTNzIz96XVExcyVnUyVtYCV2IWJPWSM+aVlaP1taXSM+aV1eP1teciM+aXJzI0Bzc3cjPml3eCMtfXgjTyM+aSNPI1AjRFQjUCNvIz5pI28jcCNEaSNwfiM+aTNzI0FPXVExcyVnUyVtYCV2IWJPWSM+aVlaP1taXSM+aV1eP1teciM+aXJzI0F3c3cjPml3eCMtfXgjTyM+aSNPI1AjRFQjUCNvIz5pI28jcCNEaSNwfiM+aTNrI0JTWlExcyVnUyVtYCV2IWJPWSNBd1laQW5aXSNBd11eQW5edyNBd3d4IyRpeCNPI0F3I08jUCNCdSNQI28jQXcjbyNwI0NaI3B+I0F3M2sjQnpUUTFzT1kjQXdZWkFuWl0jQXddXkFuXn4jQXczayNDYlpRMXMlZ1NPWSMnZ1laMHhaXSMnZ11eMHhedyMnZ3d4IyhaeCNPIydnI08jUCMpbSNQI28jJ2cjbyNwI0F3I3B+IydnM3MjRFlUUTFzT1kjPmlZWj9bWl0jPmldXj9bXn4jPmkzcyNEcl1RMXMlZ1MlaldPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzR7c3cjNFB3eCM2b3gjTyM0UCNPI1AjOGMjUCNvIzRQI28jcCM+aSNwfiM0UEpQI0V4X1ExcyVwN1slZ1MlbWAldiFiT1khRmtZWidQWl0hRmtdXidQXnIhRmtycyNGd3N3IUZrd3ghR3l4I08hRmsjTyNQIz11I1AjbyFGayNvI3AjRGkjcCNxIUZrI3EjciM+aSNyfiFGa0l3I0dVXVExcyVwN1slZ1MlbWAldiFiT1kjRndZWkR2Wl0jRnddXkR2XncjRnd3eCFNd3gjTyNGdyNPI1AjR30jUCNvI0Z3I28jcCNDWiNwI3EjRncjcSNyI0F3I3J+I0Z3SXcjSFVYUTFzJXA3W09ZI0Z3WVpEdlpdI0Z3XV5Edl4jbyNGdyNvI3AjQXcjcCNxI0Z3I3EjciNBdyNyfiNGd01WI0lPX1ExcyVwN1slalclc3AleCN0T1kjSX1ZWkdRWl0jSX1dXkdRXnIjSX1ycyFKX3N3I0l9d3gkJV14I08jSX0jTyNQI0tfI1AjbyNJfSNvI3AkJFojcCNxI0l9I3EjciNMUiNyfiNJfU1WI0pgX1ExcyVwN1slZ1Mlalclc3AldiFiJXgjdE9ZI0l9WVpHUVpdI0l9XV5HUV5yI0l9cnMhSl9zdyNJfXd4I0hxeCNPI0l9I08jUCNLXyNQI28jSX0jbyNwJCRaI3AjcSNJfSNxI3IjTFIjcn4jSX1NViNLZlhRMXMlcDdbT1kjSX1ZWkdRWl0jSX1dXkdRXiNvI0l9I28jcCNMUiNwI3EjSX0jcSNyI0xSI3J+I0l9NnkjTGJdUTFzJWdTJWpXJXNwJXYhYiV4I3RPWSNMUllaSGhaXSNMUl1eSGheciNMUnJzIyt5c3cjTFJ3eCNNWngjTyNMUiNPI1AkI3UjUCNvI0xSI28jcCQkWiNwfiNMUjZ5I01mXVExcyVqVyVzcCV4I3RPWSNMUllaSGhaXSNMUl1eSGheciNMUnJzIyt5c3cjTFJ3eCNOX3gjTyNMUiNPI1AkI3UjUCNvI0xSI28jcCQkWiNwfiNMUjZ5I05qXVExcyVqVyVzcCV4I3RPWSNMUllaSGhaXSNMUl1eSGheciNMUnJzIyt5c3cjTFJ3eCQgY3gjTyNMUiNPI1AkI3UjUCNvI0xSI28jcCQkWiNwfiNMUjVjJCBuXVExcyVqVyVzcCV4I3RPWSQgY1laSnxaXSQgY11eSnxeciQgY3JzIzBxc3ckIGN3eCQgY3gjTyQgYyNPI1AkIWcjUCNvJCBjI28jcCQheyNwfiQgYzVjJCFsVFExc09ZJCBjWVpKfFpdJCBjXV5KfF5+JCBjNWMkI1NaUTFzJWpXT1kjL31ZWjZaWl0jL31dXjZaXnIjL31ycyMwcXMjTyMvfSNPI1AjMlQjUCNvIy99I28jcCQgYyNwfiMvfTZ5JCN6VFExc09ZI0xSWVpIaFpdI0xSXV5IaF5+I0xSNnkkJGRdUTFzJWdTJWpXT1kjNFBZWjhiWl0jNFBdXjhiXnIjNFBycyM0e3N3IzRQd3gjNm94I08jNFAjTyNQIzhjI1AjbyM0UCNvI3AjTFIjcH4jNFBNViQlal9RMXMlcDdbJWpXJXNwJXgjdE9ZI0l9WVpHUVpdI0l9XV5HUV5yI0l9cnMhSl9zdyNJfXd4JCZpeCNPI0l9I08jUCNLXyNQI28jSX0jbyNwJCRaI3AjcSNJfSNxI3IjTFIjcn4jSX1LbyQmdl9RMXMlcDdbJWpXJXNwJXgjdE9ZJCZpWVpOW1pdJCZpXV5OW15yJCZpcnMjO1JzdyQmaXd4JCZpeCNPJCZpI08jUCQndSNQI28kJmkjbyNwJCF7I3AjcSQmaSNxI3IkIGMjcn4kJmlLbyQnfFhRMXMlcDdbT1kkJmlZWk5bWl0kJmldXk5bXiNvJCZpI28jcCQgYyNwI3EkJmkjcSNyJCBjI3J+JCZpTWckKHBYUTFzJXA3W09ZIUN7WVokfVpdIUN7XV4kfV4jbyFDeyNvI3AkKV0jcCNxIUN7I3EjciQpXSNyfiFDezdaJCluXVExcyVnUyVqVyVtYCVzcCV2IWIleCN0T1kkKV1ZWiEhU1pdJCldXV4hIVNeciQpXXJzIz9vc3ckKV13eCNNWngjTyQpXSNPI1AkKmcjUCNvJCldI28jcCQqeyNwfiQpXTdaJCpsVFExc09ZJCldWVohIVNaXSQpXV1eISFTXn4kKV03WiQrVV1RMXMlZ1MlaldPWSM0UFlaOGJaXSM0UF1eOGJeciM0UHJzIzR7c3cjNFB3eCM2b3gjTyM0UCNPI1AjOGMjUCNvIzRQI28jcCQpXSNwfiM0UEd6JCxiXSR9USVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd6JC1uWiFzLFclcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd6JC50XSR3USVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JC98XyVxYCVwN1slalclZSxYJXNwJXgjdE9ZJDB7WVpHUVpdJDB7XV5HUV5yJDB7cnMkMl1zdyQwe3d4JEpleCNPJDB7I08jUCRGdyNQI28kMHsjbyNwJEljI3AjcSQweyNxI3IkR10jcn4kMHtHayQxXl8lcDdbJWdTJWpXJWUsWCVzcCV2IWIleCN0T1kkMHtZWkdRWl0kMHtdXkdRXnIkMHtycyQyXXN3JDB7d3gkRXd4I08kMHsjTyNQJEZ3I1AjbyQweyNvI3AkSWMjcCNxJDB7I3EjciRHXSNyfiQwe0RUJDJoXyVwN1slZ1MlZSxYJXYhYk9ZJDNnWVooeVpdJDNnXV4oeV5yJDNncnMkQmFzdyQzZ3d4JDRzeCNPJDNnI08jUCQ1byNQI28kM2cjbyNwJD17I3AjcSQzZyNxI3IkNlQjcn4kM2dEVCQzdF8lcDdbJWdTJWpXJWUsWCV2IWJPWSQzZ1laKHlaXSQzZ11eKHleciQzZ3JzJDJdc3ckM2d3eCQ0c3gjTyQzZyNPI1AkNW8jUCNvJDNnI28jcCQ9eyNwI3EkM2cjcSNyJDZUI3J+JDNnRFQkNHxaJXA3WyVqVyVlLFhPcih5cnMpd3N3KHl3eDtieCNPKHkjTyNQMlYjUCNvKHkjbyNwN24jcCNxKHkjcSNyMmsjcn4oeURUJDV0VCVwN1tPI28kM2cjbyNwJDZUI3AjcSQzZyNxI3IkNlQjcn4kM2ctdyQ2YF0lZ1MlalclZSxYJXYhYk9ZJDZUWVoya1pdJDZUXV4ya15yJDZUcnMkN1hzdyQ2VHd4JD1SeCNPJDZUI08jUCQ9dSNQI28kNlQjbyNwJD17I3B+JDZULXckN2JdJWdTJWUsWCV2IWJPWSQ2VFlaMmtaXSQ2VF1eMmteciQ2VHJzJDhac3ckNlR3eCQ9UngjTyQ2VCNPI1AkPXUjUCNvJDZUI28jcCQ9eyNwfiQ2VC13JDhkXSVnUyVlLFgldiFiT1kkNlRZWjJrWl0kNlRdXjJrXnIkNlRycyQ5XXN3JDZUd3gkPVJ4I08kNlQjTyNQJD11I1AjbyQ2VCNvI3AkPXsjcH4kNlQtbyQ5ZlolZ1MlZSxYJXYhYk9ZJDldWVoua1pdJDldXV4ua153JDldd3gkOlh4I08kOV0jTyNQJDpzI1AjbyQ5XSNvI3AkOnkjcH4kOV0tbyQ6XlYlZSxYT3cua3d4L3F4I08uayNPI1AwVyNQI28uayNvI3AwXiNwfi5rLW8kOnZQT34kOV0tbyQ7UVolZ1MlZSxYT1kkO3NZWjB4Wl0kO3NdXjB4XnckO3N3eCQ8Z3gjTyQ7cyNPI1AkPHsjUCNvJDtzI28jcCQ5XSNwfiQ7cyxdJDt6WCVnUyVlLFhPWSQ7c1laMHhaXSQ7c11eMHhedyQ7c3d4JDxneCNPJDtzI08jUCQ8eyNQfiQ7cyxdJDxsVCVlLFhPdzB4d3gxcHgjTzB4I08jUDJQI1B+MHgsXSQ9T1BPfiQ7cy13JD1ZWCVqVyVlLFhPcjJrcnMzYXN3Mmt3eDVpeCNPMmsjTyNQN2gjUCNvMmsjbyNwN24jcH4yay13JD14UE9+JDZULXckPlVdJWdTJWpXJWUsWE9ZJD59WVo4YlpdJD59XV44Yl5yJD59cnMkP3lzdyQ+fXd4JEFteCNPJD59I08jUCRCWiNQI28kPn0jbyNwJDZUI3B+JD59LGUkP1daJWdTJWpXJWUsWE9ZJD59WVo4YlpdJD59XV44Yl5yJD59cnMkP3lzdyQ+fXd4JEFteCNPJD59I08jUCRCWiNQfiQ+fSxlJEBRWiVnUyVlLFhPWSQ+fVlaOGJaXSQ+fV1eOGJeciQ+fXJzJEBzc3ckPn13eCRBbXgjTyQ+fSNPI1AkQlojUH4kPn0sZSRAelolZ1MlZSxYT1kkPn1ZWjhiWl0kPn1dXjhiXnIkPn1ycyQ7c3N3JD59d3gkQW14I08kPn0jTyNQJEJaI1B+JD59LGUkQXRWJWpXJWUsWE9yOGJyczlPc3c4Ynd4OnB4I084YiNPI1A7WyNQfjhiLGUkQl5QT34kPn1EVCRCbF8lcDdbJWdTJWUsWCV2IWJPWSQzZ1laKHlaXSQzZ11eKHleciQzZ3JzJENrc3ckM2d3eCQ0c3gjTyQzZyNPI1AkNW8jUCNvJDNnI28jcCQ9eyNwI3EkM2cjcSNyJDZUI3J+JDNnQ3skQ3ZdJXA3WyVnUyVlLFgldiFiT1kkQ2tZWitvWl0kQ2tdXitvXnckQ2t3eCREb3gjTyRDayNPI1AkRWMjUCNvJENrI28jcCQ6eSNwI3EkQ2sjcSNyJDldI3J+JENrQ3skRHZYJXA3WyVlLFhPdytvd3gtVngjTytvI08jUC5WI1AjbytvI28jcDBeI3AjcStvI3Ejci5rI3J+K29DeyRFaFQlcDdbTyNvJENrI28jcCQ5XSNwI3EkQ2sjcSNyJDldI3J+JENrR2skRlVaJXA3WyVqVyVlLFglc3AleCN0T3JHUXJzKXdzd0dRd3hNXngjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1FHayRGfFQlcDdbTyNvJDB7I28jcCRHXSNwI3EkMHsjcSNyJEddI3J+JDB7MV8kR2xdJWdTJWpXJWUsWCVzcCV2IWIleCN0T1kkR11ZWkhoWl0kR11dXkhoXnIkR11ycyQ3WHN3JEddd3gkSGV4I08kR10jTyNQJEldI1AjbyRHXSNvI3AkSWMjcH4kR10xXyRIcFglalclZSxYJXNwJXgjdE9ySGhyczNhc3dIaHd4Sld4I09IaCNPI1BMZCNQI29IaCNvI3BMaiNwfkhoMV8kSWBQT34kR10xXyRJbF0lZ1MlalclZSxYT1kkPn1ZWjhiWl0kPn1dXjhiXnIkPn1ycyQ/eXN3JD59d3gkQW14I08kPn0jTyNQJEJaI1AjbyQ+fSNvI3AkR10jcH4kPn1HayRKclolcDdbJWpXJWUsWCVzcCV4I3RPckdRcnMpd3N3R1F3eCRLZXgjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1FHayRLdFolaCFmJXA3WyVqVyVmLFglc3AleCN0T3JOW3JzPU9zd05bd3hOW3gjT05bI08jUCEgWSNQI29OWyNvI3BLeCNwI3FOWyNxI3JKfCNyfk5bR3skTHpaZixYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH08dSROUVohT1IlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JSBXX1QsWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4eiR9enslIVZ7IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JSFqXV9SJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slI3ZdJHosWCVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTx1JSVTWndSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1NZyUmWV4keyxYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgIWElJ1UhYSNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUJeJSdpWiZTJmolcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JShvXyFkUSVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IU8kfSFPIVAlKW4hUCFRJH0hUSFbJSxPIVsjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyUqUF0lcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFPJH0hTyFQJSp4IVAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyUrXVohbSxYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSUsY2chZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWyUsTyFbIWckfSFnIWglLXohaCFsJH0hbCFtJTJbIW0jTyR9I08jUCEgbiNQI1IkfSNSI1MlLE8jUyNYJH0jWCNZJS16I1kjXiR9I14jXyUyWyNfI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSUuXWElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeHskfXt8JS9ifH0kfX0hTyUvYiFPIVEkfSFRIVslMGwhWyNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JS9zXSVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVslMGwhWyNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JTFQYyFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFbJTBsIVshbCR9IWwhbSUyWyFtI08kfSNPI1AhIG4jUCNSJH0jUiNTJTBsI1MjXiR9I14jXyUyWyNfI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSUyb1ohZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3gjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyUzdV8kfFIlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFQJH0hUCFRJTR0IVEhXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3olNVhdJU9RJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3klNmV1IWYsViVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IU8kfSFPIVAlOHghUCFRJH0hUSFbJTpTIVshZCR9IWQhZSU8VSFlIWckfSFnIWglLXohaCFsJH0hbCFtJTJbIW0hcSR9IXEhciU/TyFyIXokfSF6IXslQXIheyNPJH0jTyNQISBuI1AjUiR9I1IjUyU6UyNTI1UkfSNVI1YlPFUjViNYJH0jWCNZJS16I1kjXiR9I14jXyUyWyNfI2MkfSNjI2QlP08jZCNsJH0jbCNtJUFyI20jbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JTlaXSVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVslLE8hWyNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JTpnaSFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFPJH0hTyFQJTh4IVAhUSR9IVEhWyU6UyFbIWckfSFnIWglLXohaCFsJH0hbCFtJTJbIW0jTyR9I08jUCEgbiNQI1IkfSNSI1MlOlMjUyNYJH0jWCNZJS16I1kjXiR9I14jXyUyWyNfI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSU8Z2AlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFSJT1pIVIhUyU9aSFTI08kfSNPI1AhIG4jUCNSJH0jUiNTJT1pI1MjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JT18YCFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFSJT1pIVIhUyU9aSFTI08kfSNPI1AhIG4jUCNSJH0jUiNTJT1pI1MjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JT9hXyVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVklQGAhWSNPJH0jTyNQISBuI1AjUiR9I1IjUyVAYCNTI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeSVAc18hZixWJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghUSR9IVEhWSVAYCFZI08kfSNPI1AhIG4jUCNSJH0jUiNTJUBgI1MjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JUJUYyVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVslQ2AhWyFjJH0hYyFpJUNgIWkjTyR9I08jUCEgbiNQI1IkfSNSI1MlQ2AjUyNUJH0jVCNaJUNgI1ojbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd5JUNzYyFmLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFRJH0hUSFbJUNgIVshYyR9IWMhaSVDYCFpI08kfSNPI1AhIG4jUCNSJH0jUiNTJUNgI1MjVCR9I1QjWiVDYCNaI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1NZyVFY114MXMlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJUZbIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH08dSVGb1olV1IlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JUd1WiNeLFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfUd7JUh7X2pSJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXiR9IV4hXyVJeiFfIWAhJ20hYCFhISdtIWEjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeiVKX10keFElcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1HeyVLa10lVixYJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCEnbSFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3slTHdealIlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgISdtIWAhYSVNcyFhI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3olTlddJHlRJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3smIGZdXVEjdFAlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCFfJH0hXyFgJC1aIWAjTyR9I08jUCEgbiNQI28kfSNvI3AhI1UjcCNxJH0jcSNyISFTI3J+JH1NZyYhdGMlcDdbJWdTJWpXJWQmaiVtYCVzcCV2IWIleCN0JVEsWE9yJH1ycyZSc3ckfXd4RlN4IVEkfSFRIVsmIV8hWyFjJH0hYyF9JiFfIX0jTyR9I08jUCEgbiNQI1IkfSNSI1MmIV8jUyNUJH0jVCNvJiFfI28jcCEjVSNwI3EkfSNxI3IhIVMjciRnJH0kZ34mIV9NZyYkZmclcDdbJWdTJWpXJWQmaiVtYCVzcCV2IWIleCN0JVEsWE9yJH1ycyYlfXN3JH13eCYpVHghUSR9IVEhWyYhXyFbIWMkfSFjIXQmIV8hdCF1JixhIXUhfSYhXyF9I08kfSNPI1AhIG4jUCNSJH0jUiNTJiFfI1MjVCR9I1QjZiYhXyNmI2cmLGEjZyNvJiFfI28jcCEjVSNwI3EkfSNxI3IhIVMjciRnJH0kZ34mIV9EZSYmW18lcDdbJWdTJWUsWCVtYCV2IWJPWSErWFlaJ1BaXSErWF1eJ1BeciErWHJzJidac3chK1h3eCEtZ3gjTyErWCNPI1AhPmUjUCNvIStYI28jcCFAfSNwI3EhK1gjcSNyIT55I3J+IStYRGUmJ2haJXA3WyVnUyVlLFglbWAldiFiT3InUHJzJihac3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQRF0mKGhYJXA3WyVnUyVpLFglbWAldiFiT3dEdnd4LGV4I09EdiNPI1BFbiNQI29EdiNvI3BCZCNwI3FEdiNxI3JBbiNyfkR2R2smKWJfJXA3WyVqVyVlLFglc3AleCN0T1kkMHtZWkdRWl0kMHtdXkdRXnIkMHtycyQyXXN3JDB7d3gmKmF4I08kMHsjTyNQJEZ3I1AjbyQweyNvI3AkSWMjcCNxJDB7I3EjciRHXSNyfiQwe0drJipuWiVwN1slalclZSxYJXNwJXgjdE9yR1Fycyl3c3dHUXd4JitheCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUUZUJituWiVwN1slalclZixYJXNwJXgjdE9yTltycz1Pc3dOW3d4Tlt4I09OWyNPI1AhIFkjUCNvTlsjbyNwS3gjcCNxTlsjcSNySnwjcn5OW01nJix2YyVwN1slZ1MlalclZCZqJW1gJXNwJXYhYiV4I3QlUSxYT3IkfXJzJiV9c3ckfXd4JilUeCFRJH0hUSFbJiFfIVshYyR9IWMhfSYhXyF9I08kfSNPI1AhIG4jUCNSJH0jUiNTJiFfI1MjVCR9I1QjbyYhXyNvI3AhI1UjcCNxJH0jcSNyISFTI3IkZyR9JGd+JiFfTWcmLmhnJXA3WyVnUyVqVyVkJmolbWAlc3AldiFiJXgjdCVRLFhPciR9cnMmMFBzdyR9d3gmMnd4IVEkfSFRIVsmIV8hWyFjJH0hYyF0JiFfIXQhdSY1dSF1IX0mIV8hfSNPJH0jTyNQISBuI1AjUiR9I1IjUyYhXyNTI1QkfSNUI2YmIV8jZiNnJjV1I2cjbyYhXyNvI3AhI1UjcCNxJH0jcSNyISFTI3IkZyR9JGd+JiFfRGUmMF5aJXA3WyVnUyVtYCV2IWIlcixYT3InUHJzJjFQc3cnUHd4KFB4I08nUCNPI1A+diNQI28nUCNvI3BDVSNwI3EnUCNxI3I/WyNyfidQRGUmMVtaJXA3WyVnUyVtYCV2IWJPcidQcnMmMX1zdydQd3goUHgjTydQI08jUD52I1AjbydQI28jcENVI3AjcSdQI3Ejcj9bI3J+J1BEXSYyW1glcDdbJWdTJXcsWCVtYCV2IWJPd0R2d3gsZXgjT0R2I08jUEVuI1Ajb0R2I28jcEJkI3AjcUR2I3EjckFuI3J+RHZHayYzVVolcDdbJWpXJXNwJXgjdCVsLFhPckdRcnMpd3N3R1F3eCYzd3gjT0dRI08jUEhTI1Ajb0dRI28jcExqI3AjcUdRI3EjckhoI3J+R1FHayY0U1olcDdbJWpXJXNwJXgjdE9yR1Fycyl3c3dHUXd4JjR1eCNPR1EjTyNQSFMjUCNvR1EjbyNwTGojcCNxR1EjcSNySGgjcn5HUUZUJjVTWiVwN1slalcldSxYJXNwJXgjdE9yTltycz1Pc3dOW3d4Tlt4I09OWyNPI1AhIFkjUCNvTlsjbyNwS3gjcCNxTlsjcSNySnwjcn5OW01nJjZbYyVwN1slZ1MlalclZCZqJW1gJXNwJXYhYiV4I3QlUSxYT3IkfXJzJjBQc3ckfXd4JjJ3eCFRJH0hUSFbJiFfIVshYyR9IWMhfSYhXyF9I08kfSNPI1AhIG4jUCNSJH0jUiNTJiFfI1MjVCR9I1QjbyYhXyNvI3AhI1UjcCNxJH0jcSNyISFTI3IkZyR9JGd+JiFfTWcmN3xrJXA3WyVnUyVqVyVkJmolbWAlc3AldiFiJXgjdCVRLFhPciR9cnMmJX1zdyR9d3gmKVR4IVEkfSFRIVsmIV8hWyFjJH0hYyFoJiFfIWghaSY1dSFpIXQmIV8hdCF1JixhIXUhfSYhXyF9I08kfSNPI1AhIG4jUCNSJH0jUiNTJiFfI1MjVCR9I1QjVSYhXyNVI1YmLGEjViNZJiFfI1kjWiY1dSNaI28mIV8jbyNwISNVI3AjcSR9I3EjciEhUyNyJGckfSRnfiYhX0d7JjpVWiFWLFglcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTx1JjtbWiFXUiVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4I08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3omPGJdJHZRJXA3WyVnUyVqVyVtYCVzcCV2IWIleCN0T3IkfXJzJlJzdyR9d3hGU3ghXyR9IV8hYCQtWiFgI08kfSNPI1AhIG4jUCNvJH0jbyNwISNVI3AjcSR9I3EjciEhUyNyfiR9R3kmPWRYJWdTJWpXIVpHbU9yOGJyczlPc3c4Ynd4OlV4I084YiNPI1A7WyNQI284YiNvI3AhIVMjcH44Ykd6Jj5kXSR1USVwN1slZ1MlalclbWAlc3AldiFiJXgjdE9yJH1ycyZSc3ckfXd4RlN4IV8kfSFfIWAkLVohYCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfTx1Jj9uWCFbN18lZ1MlalclbWAlc3AldiFiJXgjdE9yISFTcnNAU3N3ISFTd3hJYngjTyEhUyNPI1AhI08jUCNvISFTI28jcCEjVSNwfiEhU0d5JkBuWiVQLFYlcDdbJWdTJWpXJW1gJXNwJXYhYiV4I3RPciR9cnMmUnN3JH13eEZTeCNPJH0jTyNQISBuI1AjbyR9I28jcCEjVSNwI3EkfSNxI3IhIVMjcn4kfVwiLFxuICB0b2tlbml6ZXJzOiBbbGVnYWN5UHJpbnQsIGluZGVudGF0aW9uLCAwLCAxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgbmV3bGluZXNdLFxuICB0b3BSdWxlczoge1wiU2NyaXB0XCI6WzAsM119LFxuICBzcGVjaWFsaXplZDogW3t0ZXJtOiAxODYsIGdldDogdmFsdWUgPT4gc3BlY19pZGVudGlmaWVyW3ZhbHVlXSB8fCAtMX1dLFxuICB0b2tlblByZWM6IDY1OTRcbn0pO1xuXG5leHBvcnQgeyBwYXJzZXIgfTtcbiIsIi8vLyBUaGUgZGVmYXVsdCBtYXhpbXVtIGxlbmd0aCBvZiBhIGBUcmVlQnVmZmVyYCBub2RlLlxuY29uc3QgRGVmYXVsdEJ1ZmZlckxlbmd0aCA9IDEwMjQ7XG5sZXQgbmV4dFByb3BJRCA9IDA7XG5jb25zdCBDYWNoZWROb2RlID0gbmV3IFdlYWtNYXAoKTtcbi8vLyBFYWNoIFtub2RlIHR5cGVdKCN0cmVlLk5vZGVUeXBlKSBjYW4gaGF2ZSBtZXRhZGF0YSBhc3NvY2lhdGVkIHdpdGhcbi8vLyBpdCBpbiBwcm9wcy4gSW5zdGFuY2VzIG9mIHRoaXMgY2xhc3MgcmVwcmVzZW50IHByb3AgbmFtZXMuXG5jbGFzcyBOb2RlUHJvcCB7XG4gICAgLy8vIENyZWF0ZSBhIG5ldyBub2RlIHByb3AgdHlwZS4gWW91IGNhbiBvcHRpb25hbGx5IHBhc3MgYVxuICAgIC8vLyBgZGVzZXJpYWxpemVgIGZ1bmN0aW9uLlxuICAgIGNvbnN0cnVjdG9yKHsgZGVzZXJpYWxpemUgfSA9IHt9KSB7XG4gICAgICAgIHRoaXMuaWQgPSBuZXh0UHJvcElEKys7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemUgPSBkZXNlcmlhbGl6ZSB8fCAoKCkgPT4ge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBub2RlIHR5cGUgZG9lc24ndCBkZWZpbmUgYSBkZXNlcmlhbGl6ZSBmdW5jdGlvblwiKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vLyBDcmVhdGUgYSBzdHJpbmctdmFsdWVkIG5vZGUgcHJvcCB3aG9zZSBkZXNlcmlhbGl6ZSBmdW5jdGlvbiBpc1xuICAgIC8vLyB0aGUgaWRlbnRpdHkgZnVuY3Rpb24uXG4gICAgc3RhdGljIHN0cmluZygpIHsgcmV0dXJuIG5ldyBOb2RlUHJvcCh7IGRlc2VyaWFsaXplOiBzdHIgPT4gc3RyIH0pOyB9XG4gICAgLy8vIENyZWF0ZSBhIG51bWJlci12YWx1ZWQgbm9kZSBwcm9wIHdob3NlIGRlc2VyaWFsaXplIGZ1bmN0aW9uIGlzXG4gICAgLy8vIGp1c3QgYE51bWJlcmAuXG4gICAgc3RhdGljIG51bWJlcigpIHsgcmV0dXJuIG5ldyBOb2RlUHJvcCh7IGRlc2VyaWFsaXplOiBOdW1iZXIgfSk7IH1cbiAgICAvLy8gQ3JlYXRlcyBhIGJvb2xlYW4tdmFsdWVkIG5vZGUgcHJvcCB3aG9zZSBkZXNlcmlhbGl6ZSBmdW5jdGlvblxuICAgIC8vLyByZXR1cm5zIHRydWUgZm9yIGFueSBpbnB1dC5cbiAgICBzdGF0aWMgZmxhZygpIHsgcmV0dXJuIG5ldyBOb2RlUHJvcCh7IGRlc2VyaWFsaXplOiAoKSA9PiB0cnVlIH0pOyB9XG4gICAgLy8vIFN0b3JlIGEgdmFsdWUgZm9yIHRoaXMgcHJvcCBpbiB0aGUgZ2l2ZW4gb2JqZWN0LiBUaGlzIGNhbiBiZVxuICAgIC8vLyB1c2VmdWwgd2hlbiBidWlsZGluZyB1cCBhIHByb3Agb2JqZWN0IHRvIHBhc3MgdG8gdGhlXG4gICAgLy8vIFtgTm9kZVR5cGVgXSgjdHJlZS5Ob2RlVHlwZSkgY29uc3RydWN0b3IuIFJldHVybnMgaXRzIGZpcnN0XG4gICAgLy8vIGFyZ3VtZW50LlxuICAgIHNldChwcm9wT2JqLCB2YWx1ZSkge1xuICAgICAgICBwcm9wT2JqW3RoaXMuaWRdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBwcm9wT2JqO1xuICAgIH1cbiAgICAvLy8gVGhpcyBpcyBtZWFudCB0byBiZSB1c2VkIHdpdGhcbiAgICAvLy8gW2BOb2RlU2V0LmV4dGVuZGBdKCN0cmVlLk5vZGVTZXQuZXh0ZW5kKSBvclxuICAgIC8vLyBbYFBhcnNlci53aXRoUHJvcHNgXSgjbGV6ZXIuUGFyc2VyLndpdGhQcm9wcykgdG8gY29tcHV0ZSBwcm9wXG4gICAgLy8vIHZhbHVlcyBmb3IgZWFjaCBub2RlIHR5cGUgaW4gdGhlIHNldC4gVGFrZXMgYSBbbWF0Y2hcbiAgICAvLy8gb2JqZWN0XSgjdHJlZS5Ob2RlVHlwZV5tYXRjaCkgb3IgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHVuZGVmaW5lZFxuICAgIC8vLyBpZiB0aGUgbm9kZSB0eXBlIGRvZXNuJ3QgZ2V0IHRoaXMgcHJvcCwgYW5kIHRoZSBwcm9wJ3MgdmFsdWUgaWZcbiAgICAvLy8gaXQgZG9lcy5cbiAgICBhZGQobWF0Y2gpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtYXRjaCAhPSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgICBtYXRjaCA9IE5vZGVUeXBlLm1hdGNoKG1hdGNoKTtcbiAgICAgICAgcmV0dXJuICh0eXBlKSA9PiB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gbWF0Y2godHlwZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0ID09PSB1bmRlZmluZWQgPyBudWxsIDogW3RoaXMsIHJlc3VsdF07XG4gICAgICAgIH07XG4gICAgfVxufVxuLy8vIFByb3AgdGhhdCBpcyB1c2VkIHRvIGRlc2NyaWJlIG1hdGNoaW5nIGRlbGltaXRlcnMuIEZvciBvcGVuaW5nXG4vLy8gZGVsaW1pdGVycywgdGhpcyBob2xkcyBhbiBhcnJheSBvZiBub2RlIG5hbWVzICh3cml0dGVuIGFzIGFcbi8vLyBzcGFjZS1zZXBhcmF0ZWQgc3RyaW5nIHdoZW4gZGVjbGFyaW5nIHRoaXMgcHJvcCBpbiBhIGdyYW1tYXIpXG4vLy8gZm9yIHRoZSBub2RlIHR5cGVzIG9mIGNsb3NpbmcgZGVsaW1pdGVycyB0aGF0IG1hdGNoIGl0LlxuTm9kZVByb3AuY2xvc2VkQnkgPSBuZXcgTm9kZVByb3AoeyBkZXNlcmlhbGl6ZTogc3RyID0+IHN0ci5zcGxpdChcIiBcIikgfSk7XG4vLy8gVGhlIGludmVyc2Ugb2YgW2BvcGVuZWRCeWBdKCN0cmVlLk5vZGVQcm9wXmNsb3NlZEJ5KS4gVGhpcyBpc1xuLy8vIGF0dGFjaGVkIHRvIGNsb3NpbmcgZGVsaW1pdGVycywgaG9sZGluZyBhbiBhcnJheSBvZiBub2RlIG5hbWVzXG4vLy8gb2YgdHlwZXMgb2YgbWF0Y2hpbmcgb3BlbmluZyBkZWxpbWl0ZXJzLlxuTm9kZVByb3Aub3BlbmVkQnkgPSBuZXcgTm9kZVByb3AoeyBkZXNlcmlhbGl6ZTogc3RyID0+IHN0ci5zcGxpdChcIiBcIikgfSk7XG4vLy8gVXNlZCB0byBhc3NpZ24gbm9kZSB0eXBlcyB0byBncm91cHMgKGZvciBleGFtcGxlLCBhbGwgbm9kZVxuLy8vIHR5cGVzIHRoYXQgcmVwcmVzZW50IGFuIGV4cHJlc3Npb24gY291bGQgYmUgdGFnZ2VkIHdpdGggYW5cbi8vLyBgXCJFeHByZXNzaW9uXCJgIGdyb3VwKS5cbk5vZGVQcm9wLmdyb3VwID0gbmV3IE5vZGVQcm9wKHsgZGVzZXJpYWxpemU6IHN0ciA9PiBzdHIuc3BsaXQoXCIgXCIpIH0pO1xuY29uc3Qgbm9Qcm9wcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4vLy8gRWFjaCBub2RlIGluIGEgc3ludGF4IHRyZWUgaGFzIGEgbm9kZSB0eXBlIGFzc29jaWF0ZWQgd2l0aCBpdC5cbmNsYXNzIE5vZGVUeXBlIHtcbiAgICAvLy8gQGludGVybmFsXG4gICAgY29uc3RydWN0b3IoXG4gICAgLy8vIFRoZSBuYW1lIG9mIHRoZSBub2RlIHR5cGUuIE5vdCBuZWNlc3NhcmlseSB1bmlxdWUsIGJ1dCBpZiB0aGVcbiAgICAvLy8gZ3JhbW1hciB3YXMgd3JpdHRlbiBwcm9wZXJseSwgZGlmZmVyZW50IG5vZGUgdHlwZXMgd2l0aCB0aGVcbiAgICAvLy8gc2FtZSBuYW1lIHdpdGhpbiBhIG5vZGUgc2V0IHNob3VsZCBwbGF5IHRoZSBzYW1lIHNlbWFudGljXG4gICAgLy8vIHJvbGUuXG4gICAgbmFtZSwgXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHByb3BzLCBcbiAgICAvLy8gVGhlIGlkIG9mIHRoaXMgbm9kZSBpbiBpdHMgc2V0LiBDb3JyZXNwb25kcyB0byB0aGUgdGVybSBpZHNcbiAgICAvLy8gdXNlZCBpbiB0aGUgcGFyc2VyLlxuICAgIGlkLCBcbiAgICAvLy8gQGludGVybmFsXG4gICAgZmxhZ3MgPSAwKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLmZsYWdzID0gZmxhZ3M7XG4gICAgfVxuICAgIHN0YXRpYyBkZWZpbmUoc3BlYykge1xuICAgICAgICBsZXQgcHJvcHMgPSBzcGVjLnByb3BzICYmIHNwZWMucHJvcHMubGVuZ3RoID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IG5vUHJvcHM7XG4gICAgICAgIGxldCBmbGFncyA9IChzcGVjLnRvcCA/IDEgLyogVG9wICovIDogMCkgfCAoc3BlYy5za2lwcGVkID8gMiAvKiBTa2lwcGVkICovIDogMCkgfFxuICAgICAgICAgICAgKHNwZWMuZXJyb3IgPyA0IC8qIEVycm9yICovIDogMCkgfCAoc3BlYy5uYW1lID09IG51bGwgPyA4IC8qIEFub255bW91cyAqLyA6IDApO1xuICAgICAgICBsZXQgdHlwZSA9IG5ldyBOb2RlVHlwZShzcGVjLm5hbWUgfHwgXCJcIiwgcHJvcHMsIHNwZWMuaWQsIGZsYWdzKTtcbiAgICAgICAgaWYgKHNwZWMucHJvcHMpXG4gICAgICAgICAgICBmb3IgKGxldCBzcmMgb2Ygc3BlYy5wcm9wcykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShzcmMpKVxuICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmModHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKHNyYylcbiAgICAgICAgICAgICAgICAgICAgc3JjWzBdLnNldChwcm9wcywgc3JjWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHR5cGU7XG4gICAgfVxuICAgIC8vLyBSZXRyaWV2ZXMgYSBub2RlIHByb3AgZm9yIHRoaXMgdHlwZS4gV2lsbCByZXR1cm4gYHVuZGVmaW5lZGAgaWZcbiAgICAvLy8gdGhlIHByb3AgaXNuJ3QgcHJlc2VudCBvbiB0aGlzIG5vZGUuXG4gICAgcHJvcChwcm9wKSB7IHJldHVybiB0aGlzLnByb3BzW3Byb3AuaWRdOyB9XG4gICAgLy8vIFRydWUgd2hlbiB0aGlzIGlzIHRoZSB0b3Agbm9kZSBvZiBhIGdyYW1tYXIuXG4gICAgZ2V0IGlzVG9wKCkgeyByZXR1cm4gKHRoaXMuZmxhZ3MgJiAxIC8qIFRvcCAqLykgPiAwOyB9XG4gICAgLy8vIFRydWUgd2hlbiB0aGlzIG5vZGUgaXMgcHJvZHVjZWQgYnkgYSBza2lwIHJ1bGUuXG4gICAgZ2V0IGlzU2tpcHBlZCgpIHsgcmV0dXJuICh0aGlzLmZsYWdzICYgMiAvKiBTa2lwcGVkICovKSA+IDA7IH1cbiAgICAvLy8gSW5kaWNhdGVzIHdoZXRoZXIgdGhpcyBpcyBhbiBlcnJvciBub2RlLlxuICAgIGdldCBpc0Vycm9yKCkgeyByZXR1cm4gKHRoaXMuZmxhZ3MgJiA0IC8qIEVycm9yICovKSA+IDA7IH1cbiAgICAvLy8gV2hlbiB0cnVlLCB0aGlzIG5vZGUgdHlwZSBkb2Vzbid0IGNvcnJlc3BvbmQgdG8gYSB1c2VyLWRlY2xhcmVkXG4gICAgLy8vIG5hbWVkIG5vZGUsIGZvciBleGFtcGxlIGJlY2F1c2UgaXQgaXMgdXNlZCB0byBjYWNoZSByZXBldGl0aW9uLlxuICAgIGdldCBpc0Fub255bW91cygpIHsgcmV0dXJuICh0aGlzLmZsYWdzICYgOCAvKiBBbm9ueW1vdXMgKi8pID4gMDsgfVxuICAgIC8vLyBSZXR1cm5zIHRydWUgd2hlbiB0aGlzIG5vZGUncyBuYW1lIG9yIG9uZSBvZiBpdHNcbiAgICAvLy8gW2dyb3Vwc10oI3RyZWUuTm9kZVByb3BeZ3JvdXApIG1hdGNoZXMgdGhlIGdpdmVuIHN0cmluZy5cbiAgICBpcyhuYW1lKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHRoaXMubmFtZSA9PSBuYW1lKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgbGV0IGdyb3VwID0gdGhpcy5wcm9wKE5vZGVQcm9wLmdyb3VwKTtcbiAgICAgICAgICAgIHJldHVybiBncm91cCA/IGdyb3VwLmluZGV4T2YobmFtZSkgPiAtMSA6IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmlkID09IG5hbWU7XG4gICAgfVxuICAgIC8vLyBDcmVhdGUgYSBmdW5jdGlvbiBmcm9tIG5vZGUgdHlwZXMgdG8gYXJiaXRyYXJ5IHZhbHVlcyBieVxuICAgIC8vLyBzcGVjaWZ5aW5nIGFuIG9iamVjdCB3aG9zZSBwcm9wZXJ0eSBuYW1lcyBhcmUgbm9kZSBvclxuICAgIC8vLyBbZ3JvdXBdKCN0cmVlLk5vZGVQcm9wXmdyb3VwKSBuYW1lcy4gT2Z0ZW4gdXNlZnVsIHdpdGhcbiAgICAvLy8gW2BOb2RlUHJvcC5hZGRgXSgjdHJlZS5Ob2RlUHJvcC5hZGQpLiBZb3UgY2FuIHB1dCBtdWx0aXBsZVxuICAgIC8vLyBuYW1lcywgc2VwYXJhdGVkIGJ5IHNwYWNlcywgaW4gYSBzaW5nbGUgcHJvcGVydHkgbmFtZSB0byBtYXBcbiAgICAvLy8gbXVsdGlwbGUgbm9kZSBuYW1lcyB0byBhIHNpbmdsZSB2YWx1ZS5cbiAgICBzdGF0aWMgbWF0Y2gobWFwKSB7XG4gICAgICAgIGxldCBkaXJlY3QgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICBmb3IgKGxldCBwcm9wIGluIG1hcClcbiAgICAgICAgICAgIGZvciAobGV0IG5hbWUgb2YgcHJvcC5zcGxpdChcIiBcIikpXG4gICAgICAgICAgICAgICAgZGlyZWN0W25hbWVdID0gbWFwW3Byb3BdO1xuICAgICAgICByZXR1cm4gKG5vZGUpID0+IHtcbiAgICAgICAgICAgIGZvciAobGV0IGdyb3VwcyA9IG5vZGUucHJvcChOb2RlUHJvcC5ncm91cCksIGkgPSAtMTsgaSA8IChncm91cHMgPyBncm91cHMubGVuZ3RoIDogMCk7IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBmb3VuZCA9IGRpcmVjdFtpIDwgMCA/IG5vZGUubmFtZSA6IGdyb3Vwc1tpXV07XG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufVxuLy8vIEFuIGVtcHR5IGR1bW15IG5vZGUgdHlwZSB0byB1c2Ugd2hlbiBubyBhY3R1YWwgdHlwZSBpcyBhdmFpbGFibGUuXG5Ob2RlVHlwZS5ub25lID0gbmV3IE5vZGVUeXBlKFwiXCIsIE9iamVjdC5jcmVhdGUobnVsbCksIDAsIDggLyogQW5vbnltb3VzICovKTtcbi8vLyBBIG5vZGUgc2V0IGhvbGRzIGEgY29sbGVjdGlvbiBvZiBub2RlIHR5cGVzLiBJdCBpcyB1c2VkIHRvXG4vLy8gY29tcGFjdGx5IHJlcHJlc2VudCB0cmVlcyBieSBzdG9yaW5nIHRoZWlyIHR5cGUgaWRzLCByYXRoZXIgdGhhbiBhXG4vLy8gZnVsbCBwb2ludGVyIHRvIHRoZSB0eXBlIG9iamVjdCwgaW4gYSBudW1iZXIgYXJyYXkuIEVhY2ggcGFyc2VyXG4vLy8gW2hhc10oI2xlemVyLlBhcnNlci5ub2RlU2V0KSBhIG5vZGUgc2V0LCBhbmQgW3RyZWVcbi8vLyBidWZmZXJzXSgjdHJlZS5UcmVlQnVmZmVyKSBjYW4gb25seSBzdG9yZSBjb2xsZWN0aW9ucyBvZiBub2Rlc1xuLy8vIGZyb20gdGhlIHNhbWUgc2V0LiBBIHNldCBjYW4gaGF2ZSBhIG1heGltdW0gb2YgMioqMTYgKDY1NTM2KVxuLy8vIG5vZGUgdHlwZXMgaW4gaXQsIHNvIHRoYXQgdGhlIGlkcyBmaXQgaW50byAxNi1iaXQgdHlwZWQgYXJyYXlcbi8vLyBzbG90cy5cbmNsYXNzIE5vZGVTZXQge1xuICAgIC8vLyBDcmVhdGUgYSBzZXQgd2l0aCB0aGUgZ2l2ZW4gdHlwZXMuIFRoZSBgaWRgIHByb3BlcnR5IG9mIGVhY2hcbiAgICAvLy8gdHlwZSBzaG91bGQgY29ycmVzcG9uZCB0byBpdHMgcG9zaXRpb24gd2l0aGluIHRoZSBhcnJheS5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAvLy8gVGhlIG5vZGUgdHlwZXMgaW4gdGhpcyBzZXQsIGJ5IGlkLlxuICAgIHR5cGVzKSB7XG4gICAgICAgIHRoaXMudHlwZXMgPSB0eXBlcztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eXBlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGlmICh0eXBlc1tpXS5pZCAhPSBpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiTm9kZSB0eXBlIGlkcyBzaG91bGQgY29ycmVzcG9uZCB0byBhcnJheSBwb3NpdGlvbnMgd2hlbiBjcmVhdGluZyBhIG5vZGUgc2V0XCIpO1xuICAgIH1cbiAgICAvLy8gQ3JlYXRlIGEgY29weSBvZiB0aGlzIHNldCB3aXRoIHNvbWUgbm9kZSBwcm9wZXJ0aWVzIGFkZGVkLiBUaGVcbiAgICAvLy8gYXJndW1lbnRzIHRvIHRoaXMgbWV0aG9kIHNob3VsZCBiZSBjcmVhdGVkIHdpdGhcbiAgICAvLy8gW2BOb2RlUHJvcC5hZGRgXSgjdHJlZS5Ob2RlUHJvcC5hZGQpLlxuICAgIGV4dGVuZCguLi5wcm9wcykge1xuICAgICAgICBsZXQgbmV3VHlwZXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdHlwZSBvZiB0aGlzLnR5cGVzKSB7XG4gICAgICAgICAgICBsZXQgbmV3UHJvcHMgPSBudWxsO1xuICAgICAgICAgICAgZm9yIChsZXQgc291cmNlIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgbGV0IGFkZCA9IHNvdXJjZSh0eXBlKTtcbiAgICAgICAgICAgICAgICBpZiAoYWRkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbmV3UHJvcHMpXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQcm9wcyA9IE9iamVjdC5hc3NpZ24oe30sIHR5cGUucHJvcHMpO1xuICAgICAgICAgICAgICAgICAgICBhZGRbMF0uc2V0KG5ld1Byb3BzLCBhZGRbMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld1R5cGVzLnB1c2gobmV3UHJvcHMgPyBuZXcgTm9kZVR5cGUodHlwZS5uYW1lLCBuZXdQcm9wcywgdHlwZS5pZCwgdHlwZS5mbGFncykgOiB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IE5vZGVTZXQobmV3VHlwZXMpO1xuICAgIH1cbn1cbi8vLyBBIHBpZWNlIG9mIHN5bnRheCB0cmVlLiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gYXBwcm9hY2ggdGhlc2Vcbi8vLyB0cmVlczogdGhlIHdheSB0aGV5IGFyZSBhY3R1YWxseSBzdG9yZWQgaW4gbWVtb3J5LCBhbmQgdGhlXG4vLy8gY29udmVuaWVudCB3YXkuXG4vLy9cbi8vLyBTeW50YXggdHJlZXMgYXJlIHN0b3JlZCBhcyBhIHRyZWUgb2YgYFRyZWVgIGFuZCBgVHJlZUJ1ZmZlcmBcbi8vLyBvYmplY3RzLiBCeSBwYWNraW5nIGRldGFpbCBpbmZvcm1hdGlvbiBpbnRvIGBUcmVlQnVmZmVyYCBsZWFmXG4vLy8gbm9kZXMsIHRoZSByZXByZXNlbnRhdGlvbiBpcyBtYWRlIGEgbG90IG1vcmUgbWVtb3J5LWVmZmljaWVudC5cbi8vL1xuLy8vIEhvd2V2ZXIsIHdoZW4geW91IHdhbnQgdG8gYWN0dWFsbHkgd29yayB3aXRoIHRyZWUgbm9kZXMsIHRoaXNcbi8vLyByZXByZXNlbnRhdGlvbiBpcyB2ZXJ5IGF3a3dhcmQsIHNvIG1vc3QgY2xpZW50IGNvZGUgd2lsbCB3YW50IHRvXG4vLy8gdXNlIHRoZSBgVHJlZUN1cnNvcmAgaW50ZXJmYWNlIGluc3RlYWQsIHdoaWNoIHByb3ZpZGVzIGEgdmlldyBvblxuLy8vIHNvbWUgcGFydCBvZiB0aGlzIGRhdGEgc3RydWN0dXJlLCBhbmQgY2FuIGJlIHVzZWQgdG8gbW92ZSBhcm91bmRcbi8vLyB0byBhZGphY2VudCBub2Rlcy5cbmNsYXNzIFRyZWUge1xuICAgIC8vLyBDb25zdHJ1Y3QgYSBuZXcgdHJlZS4gWW91IHVzdWFsbHkgd2FudCB0byBnbyB0aHJvdWdoXG4gICAgLy8vIFtgVHJlZS5idWlsZGBdKCN0cmVlLlRyZWVeYnVpbGQpIGluc3RlYWQuXG4gICAgY29uc3RydWN0b3IodHlwZSwgXG4gICAgLy8vIFRoZSB0cmVlJ3MgY2hpbGQgbm9kZXMuIENoaWxkcmVuIHNtYWxsIGVub3VnaCB0byBmaXQgaW4gYVxuICAgIC8vLyBgVHJlZUJ1ZmZlciB3aWxsIGJlIHJlcHJlc2VudGVkIGFzIHN1Y2gsIG90aGVyIGNoaWxkcmVuIGNhbiBiZVxuICAgIC8vLyBmdXJ0aGVyIGBUcmVlYCBpbnN0YW5jZXMgd2l0aCB0aGVpciBvd24gaW50ZXJuYWwgc3RydWN0dXJlLlxuICAgIGNoaWxkcmVuLCBcbiAgICAvLy8gVGhlIHBvc2l0aW9ucyAob2Zmc2V0cyByZWxhdGl2ZSB0byB0aGUgc3RhcnQgb2YgdGhpcyB0cmVlKSBvZlxuICAgIC8vLyB0aGUgY2hpbGRyZW4uXG4gICAgcG9zaXRpb25zLCBcbiAgICAvLy8gVGhlIHRvdGFsIGxlbmd0aCBvZiB0aGlzIHRyZWVcbiAgICBsZW5ndGgpIHtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgICAgICB0aGlzLnBvc2l0aW9ucyA9IHBvc2l0aW9ucztcbiAgICAgICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgbGV0IGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbi5tYXAoYyA9PiBjLnRvU3RyaW5nKCkpLmpvaW4oKTtcbiAgICAgICAgcmV0dXJuICF0aGlzLnR5cGUubmFtZSA/IGNoaWxkcmVuIDpcbiAgICAgICAgICAgICgvXFxXLy50ZXN0KHRoaXMudHlwZS5uYW1lKSAmJiAhdGhpcy50eXBlLmlzRXJyb3IgPyBKU09OLnN0cmluZ2lmeSh0aGlzLnR5cGUubmFtZSkgOiB0aGlzLnR5cGUubmFtZSkgK1xuICAgICAgICAgICAgICAgIChjaGlsZHJlbi5sZW5ndGggPyBcIihcIiArIGNoaWxkcmVuICsgXCIpXCIgOiBcIlwiKTtcbiAgICB9XG4gICAgLy8vIEdldCBhIFt0cmVlIGN1cnNvcl0oI3RyZWUuVHJlZUN1cnNvcikgcm9vdGVkIGF0IHRoaXMgdHJlZS4gV2hlblxuICAgIC8vLyBgcG9zYCBpcyBnaXZlbiwgdGhlIGN1cnNvciBpcyBbbW92ZWRdKCN0cmVlLlRyZWVDdXJzb3IubW92ZVRvKVxuICAgIC8vLyB0byB0aGUgZ2l2ZW4gcG9zaXRpb24gYW5kIHNpZGUuXG4gICAgY3Vyc29yKHBvcywgc2lkZSA9IDApIHtcbiAgICAgICAgbGV0IHNjb3BlID0gKHBvcyAhPSBudWxsICYmIENhY2hlZE5vZGUuZ2V0KHRoaXMpKSB8fCB0aGlzLnRvcE5vZGU7XG4gICAgICAgIGxldCBjdXJzb3IgPSBuZXcgVHJlZUN1cnNvcihzY29wZSk7XG4gICAgICAgIGlmIChwb3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyhwb3MsIHNpZGUpO1xuICAgICAgICAgICAgQ2FjaGVkTm9kZS5zZXQodGhpcywgY3Vyc29yLl90cmVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3Vyc29yO1xuICAgIH1cbiAgICAvLy8gR2V0IGEgW3RyZWUgY3Vyc29yXSgjdHJlZS5UcmVlQ3Vyc29yKSB0aGF0LCB1bmxpa2UgcmVndWxhclxuICAgIC8vLyBjdXJzb3JzLCBkb2Vzbid0IHNraXAgW2Fub255bW91c10oI3RyZWUuTm9kZVR5cGUuaXNBbm9ueW1vdXMpXG4gICAgLy8vIG5vZGVzLlxuICAgIGZ1bGxDdXJzb3IoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHJlZUN1cnNvcih0aGlzLnRvcE5vZGUsIHRydWUpO1xuICAgIH1cbiAgICAvLy8gR2V0IGEgW3N5bnRheCBub2RlXSgjdHJlZS5TeW50YXhOb2RlKSBvYmplY3QgZm9yIHRoZSB0b3Agb2YgdGhlXG4gICAgLy8vIHRyZWUuXG4gICAgZ2V0IHRvcE5vZGUoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHJlZU5vZGUodGhpcywgMCwgMCwgbnVsbCk7XG4gICAgfVxuICAgIC8vLyBHZXQgdGhlIFtzeW50YXggbm9kZV0oI3RyZWUuU3ludGF4Tm9kZSkgYXQgdGhlIGdpdmVuIHBvc2l0aW9uLlxuICAgIC8vLyBJZiBgc2lkZWAgaXMgLTEsIHRoaXMgd2lsbCBtb3ZlIGludG8gbm9kZXMgdGhhdCBlbmQgYXQgdGhlXG4gICAgLy8vIHBvc2l0aW9uLiBJZiAxLCBpdCdsbCBtb3ZlIGludG8gbm9kZXMgdGhhdCBzdGFydCBhdCB0aGVcbiAgICAvLy8gcG9zaXRpb24uIFdpdGggMCwgaXQnbGwgb25seSBlbnRlciBub2RlcyB0aGF0IGNvdmVyIHRoZSBwb3NpdGlvblxuICAgIC8vLyBmcm9tIGJvdGggc2lkZXMuXG4gICAgcmVzb2x2ZShwb3MsIHNpZGUgPSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnNvcihwb3MsIHNpZGUpLm5vZGU7XG4gICAgfVxuICAgIC8vLyBJdGVyYXRlIG92ZXIgdGhlIHRyZWUgYW5kIGl0cyBjaGlsZHJlbiwgY2FsbGluZyBgZW50ZXJgIGZvciBhbnlcbiAgICAvLy8gbm9kZSB0aGF0IHRvdWNoZXMgdGhlIGBmcm9tYC9gdG9gIHJlZ2lvbiAoaWYgZ2l2ZW4pIGJlZm9yZVxuICAgIC8vLyBydW5uaW5nIG92ZXIgc3VjaCBhIG5vZGUncyBjaGlsZHJlbiwgYW5kIGBsZWF2ZWAgKGlmIGdpdmVuKSB3aGVuXG4gICAgLy8vIGxlYXZpbmcgdGhlIG5vZGUuIFdoZW4gYGVudGVyYCByZXR1cm5zIGBmYWxzZWAsIHRoZSBnaXZlbiBub2RlXG4gICAgLy8vIHdpbGwgbm90IGhhdmUgaXRzIGNoaWxkcmVuIGl0ZXJhdGVkIG92ZXIgKG9yIGBsZWF2ZWAgY2FsbGVkKS5cbiAgICBpdGVyYXRlKHNwZWMpIHtcbiAgICAgICAgbGV0IHsgZW50ZXIsIGxlYXZlLCBmcm9tID0gMCwgdG8gPSB0aGlzLmxlbmd0aCB9ID0gc3BlYztcbiAgICAgICAgZm9yIChsZXQgYyA9IHRoaXMuY3Vyc29yKCk7Oykge1xuICAgICAgICAgICAgbGV0IG11c3RMZWF2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGMuZnJvbSA8PSB0byAmJiBjLnRvID49IGZyb20gJiYgKGMudHlwZS5pc0Fub255bW91cyB8fCBlbnRlcihjLnR5cGUsIGMuZnJvbSwgYy50bykgIT09IGZhbHNlKSkge1xuICAgICAgICAgICAgICAgIGlmIChjLmZpcnN0Q2hpbGQoKSlcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKCFjLnR5cGUuaXNBbm9ueW1vdXMpXG4gICAgICAgICAgICAgICAgICAgIG11c3RMZWF2ZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgaWYgKG11c3RMZWF2ZSAmJiBsZWF2ZSlcbiAgICAgICAgICAgICAgICAgICAgbGVhdmUoYy50eXBlLCBjLmZyb20sIGMudG8pO1xuICAgICAgICAgICAgICAgIG11c3RMZWF2ZSA9IGMudHlwZS5pc0Fub255bW91cztcbiAgICAgICAgICAgICAgICBpZiAoYy5uZXh0U2libGluZygpKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAoIWMucGFyZW50KCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBtdXN0TGVhdmUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBCYWxhbmNlIHRoZSBkaXJlY3QgY2hpbGRyZW4gb2YgdGhpcyB0cmVlLlxuICAgIGJhbGFuY2UobWF4QnVmZmVyTGVuZ3RoID0gRGVmYXVsdEJ1ZmZlckxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbi5sZW5ndGggPD0gQmFsYW5jZUJyYW5jaEZhY3RvciA/IHRoaXNcbiAgICAgICAgICAgIDogYmFsYW5jZVJhbmdlKHRoaXMudHlwZSwgTm9kZVR5cGUubm9uZSwgdGhpcy5jaGlsZHJlbiwgdGhpcy5wb3NpdGlvbnMsIDAsIHRoaXMuY2hpbGRyZW4ubGVuZ3RoLCAwLCBtYXhCdWZmZXJMZW5ndGgsIHRoaXMubGVuZ3RoLCAwKTtcbiAgICB9XG4gICAgLy8vIEJ1aWxkIGEgdHJlZSBmcm9tIGEgcG9zdGZpeC1vcmRlcmVkIGJ1ZmZlciBvZiBub2RlIGluZm9ybWF0aW9uLFxuICAgIC8vLyBvciBhIGN1cnNvciBvdmVyIHN1Y2ggYSBidWZmZXIuXG4gICAgc3RhdGljIGJ1aWxkKGRhdGEpIHsgcmV0dXJuIGJ1aWxkVHJlZShkYXRhKTsgfVxufVxuLy8vIFRoZSBlbXB0eSB0cmVlXG5UcmVlLmVtcHR5ID0gbmV3IFRyZWUoTm9kZVR5cGUubm9uZSwgW10sIFtdLCAwKTtcbi8vIEZvciB0cmVlcyB0aGF0IG5lZWQgYSBjb250ZXh0IGhhc2ggYXR0YWNoZWQsIHdlJ3JlIHVzaW5nIHRoaXNcbi8vIGtsdWRnZSB3aGljaCBhc3NpZ25zIGFuIGV4dHJhIHByb3BlcnR5IGRpcmVjdGx5IGFmdGVyXG4vLyBpbml0aWFsaXphdGlvbiAoY3JlYXRpbmcgYSBzaW5nbGUgbmV3IG9iamVjdCBzaGFwZSkuXG5mdW5jdGlvbiB3aXRoSGFzaCh0cmVlLCBoYXNoKSB7XG4gICAgaWYgKGhhc2gpXG4gICAgICAgIHRyZWUuY29udGV4dEhhc2ggPSBoYXNoO1xuICAgIHJldHVybiB0cmVlO1xufVxuLy8vIFRyZWUgYnVmZmVycyBjb250YWluICh0eXBlLCBzdGFydCwgZW5kLCBlbmRJbmRleCkgcXVhZHMgZm9yIGVhY2hcbi8vLyBub2RlLiBJbiBzdWNoIGEgYnVmZmVyLCBub2RlcyBhcmUgc3RvcmVkIGluIHByZWZpeCBvcmRlciAocGFyZW50c1xuLy8vIGJlZm9yZSBjaGlsZHJlbiwgd2l0aCB0aGUgZW5kSW5kZXggb2YgdGhlIHBhcmVudCBpbmRpY2F0aW5nIHdoaWNoXG4vLy8gY2hpbGRyZW4gYmVsb25nIHRvIGl0KVxuY2xhc3MgVHJlZUJ1ZmZlciB7XG4gICAgLy8vIENyZWF0ZSBhIHRyZWUgYnVmZmVyIEBpbnRlcm5hbFxuICAgIGNvbnN0cnVjdG9yKFxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBidWZmZXIsIFxuICAgIC8vIFRoZSB0b3RhbCBsZW5ndGggb2YgdGhlIGdyb3VwIG9mIG5vZGVzIGluIHRoZSBidWZmZXIuXG4gICAgbGVuZ3RoLCBcbiAgICAvLy8gQGludGVybmFsXG4gICAgc2V0LCB0eXBlID0gTm9kZVR5cGUubm9uZSkge1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgICAgIHRoaXMuc2V0ID0gc2V0O1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHRoaXMuYnVmZmVyLmxlbmd0aDspIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHRoaXMuY2hpbGRTdHJpbmcoaW5kZXgpKTtcbiAgICAgICAgICAgIGluZGV4ID0gdGhpcy5idWZmZXJbaW5kZXggKyAzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0LmpvaW4oXCIsXCIpO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgY2hpbGRTdHJpbmcoaW5kZXgpIHtcbiAgICAgICAgbGV0IGlkID0gdGhpcy5idWZmZXJbaW5kZXhdLCBlbmRJbmRleCA9IHRoaXMuYnVmZmVyW2luZGV4ICsgM107XG4gICAgICAgIGxldCB0eXBlID0gdGhpcy5zZXQudHlwZXNbaWRdLCByZXN1bHQgPSB0eXBlLm5hbWU7XG4gICAgICAgIGlmICgvXFxXLy50ZXN0KHJlc3VsdCkgJiYgIXR5cGUuaXNFcnJvcilcbiAgICAgICAgICAgIHJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHJlc3VsdCk7XG4gICAgICAgIGluZGV4ICs9IDQ7XG4gICAgICAgIGlmIChlbmRJbmRleCA9PSBpbmRleClcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIGxldCBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB3aGlsZSAoaW5kZXggPCBlbmRJbmRleCkge1xuICAgICAgICAgICAgY2hpbGRyZW4ucHVzaCh0aGlzLmNoaWxkU3RyaW5nKGluZGV4KSk7XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuYnVmZmVyW2luZGV4ICsgM107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdCArIFwiKFwiICsgY2hpbGRyZW4uam9pbihcIixcIikgKyBcIilcIjtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGZpbmRDaGlsZChzdGFydEluZGV4LCBlbmRJbmRleCwgZGlyLCBhZnRlcikge1xuICAgICAgICBsZXQgeyBidWZmZXIgfSA9IHRoaXMsIHBpY2sgPSAtMTtcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0SW5kZXg7IGkgIT0gZW5kSW5kZXg7IGkgPSBidWZmZXJbaSArIDNdKSB7XG4gICAgICAgICAgICBpZiAoYWZ0ZXIgIT0gLTEwMDAwMDAwMCAvKiBOb25lICovKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0ID0gYnVmZmVyW2kgKyAxXSwgZW5kID0gYnVmZmVyW2kgKyAyXTtcbiAgICAgICAgICAgICAgICBpZiAoZGlyID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW5kID4gYWZ0ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBwaWNrID0gaTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZCA+IGFmdGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnQgPCBhZnRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIHBpY2sgPSBpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW5kID49IGFmdGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGljayA9IGk7XG4gICAgICAgICAgICAgICAgaWYgKGRpciA+IDApXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwaWNrO1xuICAgIH1cbn1cbmNsYXNzIFRyZWVOb2RlIHtcbiAgICBjb25zdHJ1Y3Rvcihub2RlLCBmcm9tLCBpbmRleCwgX3BhcmVudCkge1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLmZyb20gPSBmcm9tO1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IF9wYXJlbnQ7XG4gICAgfVxuICAgIGdldCB0eXBlKCkgeyByZXR1cm4gdGhpcy5ub2RlLnR5cGU7IH1cbiAgICBnZXQgbmFtZSgpIHsgcmV0dXJuIHRoaXMubm9kZS50eXBlLm5hbWU7IH1cbiAgICBnZXQgdG8oKSB7IHJldHVybiB0aGlzLmZyb20gKyB0aGlzLm5vZGUubGVuZ3RoOyB9XG4gICAgbmV4dENoaWxkKGksIGRpciwgYWZ0ZXIsIGZ1bGwgPSBmYWxzZSkge1xuICAgICAgICBmb3IgKGxldCBwYXJlbnQgPSB0aGlzOzspIHtcbiAgICAgICAgICAgIGZvciAobGV0IHsgY2hpbGRyZW4sIHBvc2l0aW9ucyB9ID0gcGFyZW50Lm5vZGUsIGUgPSBkaXIgPiAwID8gY2hpbGRyZW4ubGVuZ3RoIDogLTE7IGkgIT0gZTsgaSArPSBkaXIpIHtcbiAgICAgICAgICAgICAgICBsZXQgbmV4dCA9IGNoaWxkcmVuW2ldLCBzdGFydCA9IHBvc2l0aW9uc1tpXSArIHBhcmVudC5mcm9tO1xuICAgICAgICAgICAgICAgIGlmIChhZnRlciAhPSAtMTAwMDAwMDAwIC8qIE5vbmUgKi8gJiYgKGRpciA8IDAgPyBzdGFydCA+PSBhZnRlciA6IHN0YXJ0ICsgbmV4dC5sZW5ndGggPD0gYWZ0ZXIpKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dCBpbnN0YW5jZW9mIFRyZWVCdWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gbmV4dC5maW5kQ2hpbGQoMCwgbmV4dC5idWZmZXIubGVuZ3RoLCBkaXIsIGFmdGVyID09IC0xMDAwMDAwMDAgLyogTm9uZSAqLyA/IC0xMDAwMDAwMDAgLyogTm9uZSAqLyA6IGFmdGVyIC0gc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZmVyTm9kZShuZXcgQnVmZmVyQ29udGV4dChwYXJlbnQsIG5leHQsIGksIHN0YXJ0KSwgbnVsbCwgaW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChmdWxsIHx8ICghbmV4dC50eXBlLmlzQW5vbnltb3VzIHx8IGhhc0NoaWxkKG5leHQpKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaW5uZXIgPSBuZXcgVHJlZU5vZGUobmV4dCwgc3RhcnQsIGksIHBhcmVudCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdWxsIHx8ICFpbm5lci50eXBlLmlzQW5vbnltb3VzID8gaW5uZXIgOiBpbm5lci5uZXh0Q2hpbGQoZGlyIDwgMCA/IG5leHQuY2hpbGRyZW4ubGVuZ3RoIC0gMSA6IDAsIGRpciwgYWZ0ZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmdWxsIHx8ICFwYXJlbnQudHlwZS5pc0Fub255bW91cylcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGkgPSBwYXJlbnQuaW5kZXggKyBkaXI7XG4gICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQuX3BhcmVudDtcbiAgICAgICAgICAgIGlmICghcGFyZW50KVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldCBmaXJzdENoaWxkKCkgeyByZXR1cm4gdGhpcy5uZXh0Q2hpbGQoMCwgMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKTsgfVxuICAgIGdldCBsYXN0Q2hpbGQoKSB7IHJldHVybiB0aGlzLm5leHRDaGlsZCh0aGlzLm5vZGUuY2hpbGRyZW4ubGVuZ3RoIC0gMSwgLTEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLyk7IH1cbiAgICBjaGlsZEFmdGVyKHBvcykgeyByZXR1cm4gdGhpcy5uZXh0Q2hpbGQoMCwgMSwgcG9zKTsgfVxuICAgIGNoaWxkQmVmb3JlKHBvcykgeyByZXR1cm4gdGhpcy5uZXh0Q2hpbGQodGhpcy5ub2RlLmNoaWxkcmVuLmxlbmd0aCAtIDEsIC0xLCBwb3MpOyB9XG4gICAgbmV4dFNpZ25pZmljYW50UGFyZW50KCkge1xuICAgICAgICBsZXQgdmFsID0gdGhpcztcbiAgICAgICAgd2hpbGUgKHZhbC50eXBlLmlzQW5vbnltb3VzICYmIHZhbC5fcGFyZW50KVxuICAgICAgICAgICAgdmFsID0gdmFsLl9wYXJlbnQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuICAgIGdldCBwYXJlbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQgPyB0aGlzLl9wYXJlbnQubmV4dFNpZ25pZmljYW50UGFyZW50KCkgOiBudWxsO1xuICAgIH1cbiAgICBnZXQgbmV4dFNpYmxpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQgPyB0aGlzLl9wYXJlbnQubmV4dENoaWxkKHRoaXMuaW5kZXggKyAxLCAxLCAtMSkgOiBudWxsO1xuICAgIH1cbiAgICBnZXQgcHJldlNpYmxpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQgPyB0aGlzLl9wYXJlbnQubmV4dENoaWxkKHRoaXMuaW5kZXggLSAxLCAtMSwgLTEpIDogbnVsbDtcbiAgICB9XG4gICAgZ2V0IGN1cnNvcigpIHsgcmV0dXJuIG5ldyBUcmVlQ3Vyc29yKHRoaXMpOyB9XG4gICAgcmVzb2x2ZShwb3MsIHNpZGUgPSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnNvci5tb3ZlVG8ocG9zLCBzaWRlKS5ub2RlO1xuICAgIH1cbiAgICBnZXRDaGlsZCh0eXBlLCBiZWZvcmUgPSBudWxsLCBhZnRlciA9IG51bGwpIHtcbiAgICAgICAgbGV0IHIgPSBnZXRDaGlsZHJlbih0aGlzLCB0eXBlLCBiZWZvcmUsIGFmdGVyKTtcbiAgICAgICAgcmV0dXJuIHIubGVuZ3RoID8gclswXSA6IG51bGw7XG4gICAgfVxuICAgIGdldENoaWxkcmVuKHR5cGUsIGJlZm9yZSA9IG51bGwsIGFmdGVyID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZ2V0Q2hpbGRyZW4odGhpcywgdHlwZSwgYmVmb3JlLCBhZnRlcik7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB0b1N0cmluZygpIHsgcmV0dXJuIHRoaXMubm9kZS50b1N0cmluZygpOyB9XG59XG5mdW5jdGlvbiBnZXRDaGlsZHJlbihub2RlLCB0eXBlLCBiZWZvcmUsIGFmdGVyKSB7XG4gICAgbGV0IGN1ciA9IG5vZGUuY3Vyc29yLCByZXN1bHQgPSBbXTtcbiAgICBpZiAoIWN1ci5maXJzdENoaWxkKCkpXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKGJlZm9yZSAhPSBudWxsKVxuICAgICAgICB3aGlsZSAoIWN1ci50eXBlLmlzKGJlZm9yZSkpXG4gICAgICAgICAgICBpZiAoIWN1ci5uZXh0U2libGluZygpKVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgZm9yICg7Oykge1xuICAgICAgICBpZiAoYWZ0ZXIgIT0gbnVsbCAmJiBjdXIudHlwZS5pcyhhZnRlcikpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICBpZiAoY3VyLnR5cGUuaXModHlwZSkpXG4gICAgICAgICAgICByZXN1bHQucHVzaChjdXIubm9kZSk7XG4gICAgICAgIGlmICghY3VyLm5leHRTaWJsaW5nKCkpXG4gICAgICAgICAgICByZXR1cm4gYWZ0ZXIgPT0gbnVsbCA/IHJlc3VsdCA6IFtdO1xuICAgIH1cbn1cbmNsYXNzIEJ1ZmZlckNvbnRleHQge1xuICAgIGNvbnN0cnVjdG9yKHBhcmVudCwgYnVmZmVyLCBpbmRleCwgc3RhcnQpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICB9XG59XG5jbGFzcyBCdWZmZXJOb2RlIHtcbiAgICBjb25zdHJ1Y3Rvcihjb250ZXh0LCBfcGFyZW50LCBpbmRleCkge1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBfcGFyZW50O1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMudHlwZSA9IGNvbnRleHQuYnVmZmVyLnNldC50eXBlc1tjb250ZXh0LmJ1ZmZlci5idWZmZXJbaW5kZXhdXTtcbiAgICB9XG4gICAgZ2V0IG5hbWUoKSB7IHJldHVybiB0aGlzLnR5cGUubmFtZTsgfVxuICAgIGdldCBmcm9tKCkgeyByZXR1cm4gdGhpcy5jb250ZXh0LnN0YXJ0ICsgdGhpcy5jb250ZXh0LmJ1ZmZlci5idWZmZXJbdGhpcy5pbmRleCArIDFdOyB9XG4gICAgZ2V0IHRvKCkgeyByZXR1cm4gdGhpcy5jb250ZXh0LnN0YXJ0ICsgdGhpcy5jb250ZXh0LmJ1ZmZlci5idWZmZXJbdGhpcy5pbmRleCArIDJdOyB9XG4gICAgY2hpbGQoZGlyLCBhZnRlcikge1xuICAgICAgICBsZXQgeyBidWZmZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICAgICAgbGV0IGluZGV4ID0gYnVmZmVyLmZpbmRDaGlsZCh0aGlzLmluZGV4ICsgNCwgYnVmZmVyLmJ1ZmZlclt0aGlzLmluZGV4ICsgM10sIGRpciwgYWZ0ZXIgPT0gLTEwMDAwMDAwMCAvKiBOb25lICovID8gLTEwMDAwMDAwMCAvKiBOb25lICovIDogYWZ0ZXIgLSB0aGlzLmNvbnRleHQuc3RhcnQpO1xuICAgICAgICByZXR1cm4gaW5kZXggPCAwID8gbnVsbCA6IG5ldyBCdWZmZXJOb2RlKHRoaXMuY29udGV4dCwgdGhpcywgaW5kZXgpO1xuICAgIH1cbiAgICBnZXQgZmlyc3RDaGlsZCgpIHsgcmV0dXJuIHRoaXMuY2hpbGQoMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKTsgfVxuICAgIGdldCBsYXN0Q2hpbGQoKSB7IHJldHVybiB0aGlzLmNoaWxkKC0xLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pOyB9XG4gICAgY2hpbGRBZnRlcihwb3MpIHsgcmV0dXJuIHRoaXMuY2hpbGQoMSwgcG9zKTsgfVxuICAgIGNoaWxkQmVmb3JlKHBvcykgeyByZXR1cm4gdGhpcy5jaGlsZCgtMSwgcG9zKTsgfVxuICAgIGdldCBwYXJlbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQgfHwgdGhpcy5jb250ZXh0LnBhcmVudC5uZXh0U2lnbmlmaWNhbnRQYXJlbnQoKTtcbiAgICB9XG4gICAgZXh0ZXJuYWxTaWJsaW5nKGRpcikge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50ID8gbnVsbCA6IHRoaXMuY29udGV4dC5wYXJlbnQubmV4dENoaWxkKHRoaXMuY29udGV4dC5pbmRleCArIGRpciwgZGlyLCAtMSk7XG4gICAgfVxuICAgIGdldCBuZXh0U2libGluZygpIHtcbiAgICAgICAgbGV0IHsgYnVmZmVyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgICAgIGxldCBhZnRlciA9IGJ1ZmZlci5idWZmZXJbdGhpcy5pbmRleCArIDNdO1xuICAgICAgICBpZiAoYWZ0ZXIgPCAodGhpcy5fcGFyZW50ID8gYnVmZmVyLmJ1ZmZlclt0aGlzLl9wYXJlbnQuaW5kZXggKyAzXSA6IGJ1ZmZlci5idWZmZXIubGVuZ3RoKSlcbiAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZmVyTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMuX3BhcmVudCwgYWZ0ZXIpO1xuICAgICAgICByZXR1cm4gdGhpcy5leHRlcm5hbFNpYmxpbmcoMSk7XG4gICAgfVxuICAgIGdldCBwcmV2U2libGluZygpIHtcbiAgICAgICAgbGV0IHsgYnVmZmVyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgICAgIGxldCBwYXJlbnRTdGFydCA9IHRoaXMuX3BhcmVudCA/IHRoaXMuX3BhcmVudC5pbmRleCArIDQgOiAwO1xuICAgICAgICBpZiAodGhpcy5pbmRleCA9PSBwYXJlbnRTdGFydClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmV4dGVybmFsU2libGluZygtMSk7XG4gICAgICAgIHJldHVybiBuZXcgQnVmZmVyTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMuX3BhcmVudCwgYnVmZmVyLmZpbmRDaGlsZChwYXJlbnRTdGFydCwgdGhpcy5pbmRleCwgLTEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLykpO1xuICAgIH1cbiAgICBnZXQgY3Vyc29yKCkgeyByZXR1cm4gbmV3IFRyZWVDdXJzb3IodGhpcyk7IH1cbiAgICByZXNvbHZlKHBvcywgc2lkZSA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3Vyc29yLm1vdmVUbyhwb3MsIHNpZGUpLm5vZGU7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB0b1N0cmluZygpIHsgcmV0dXJuIHRoaXMuY29udGV4dC5idWZmZXIuY2hpbGRTdHJpbmcodGhpcy5pbmRleCk7IH1cbiAgICBnZXRDaGlsZCh0eXBlLCBiZWZvcmUgPSBudWxsLCBhZnRlciA9IG51bGwpIHtcbiAgICAgICAgbGV0IHIgPSBnZXRDaGlsZHJlbih0aGlzLCB0eXBlLCBiZWZvcmUsIGFmdGVyKTtcbiAgICAgICAgcmV0dXJuIHIubGVuZ3RoID8gclswXSA6IG51bGw7XG4gICAgfVxuICAgIGdldENoaWxkcmVuKHR5cGUsIGJlZm9yZSA9IG51bGwsIGFmdGVyID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZ2V0Q2hpbGRyZW4odGhpcywgdHlwZSwgYmVmb3JlLCBhZnRlcik7XG4gICAgfVxufVxuLy8vIEEgdHJlZSBjdXJzb3Igb2JqZWN0IGZvY3VzZXMgb24gYSBnaXZlbiBub2RlIGluIGEgc3ludGF4IHRyZWUsIGFuZFxuLy8vIGFsbG93cyB5b3UgdG8gbW92ZSB0byBhZGphY2VudCBub2Rlcy5cbmNsYXNzIFRyZWVDdXJzb3Ige1xuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBjb25zdHJ1Y3Rvcihub2RlLCBmdWxsID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5mdWxsID0gZnVsbDtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBudWxsO1xuICAgICAgICB0aGlzLnN0YWNrID0gW107XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgICAgICB0aGlzLmJ1ZmZlck5vZGUgPSBudWxsO1xuICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRyZWVOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLnlpZWxkTm9kZShub2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3RyZWUgPSBub2RlLmNvbnRleHQucGFyZW50O1xuICAgICAgICAgICAgdGhpcy5idWZmZXIgPSBub2RlLmNvbnRleHQ7XG4gICAgICAgICAgICBmb3IgKGxldCBuID0gbm9kZS5fcGFyZW50OyBuOyBuID0gbi5fcGFyZW50KVxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sudW5zaGlmdChuLmluZGV4KTtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyTm9kZSA9IG5vZGU7XG4gICAgICAgICAgICB0aGlzLnlpZWxkQnVmKG5vZGUuaW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBTaG9ydGhhbmQgZm9yIGAudHlwZS5uYW1lYC5cbiAgICBnZXQgbmFtZSgpIHsgcmV0dXJuIHRoaXMudHlwZS5uYW1lOyB9XG4gICAgeWllbGROb2RlKG5vZGUpIHtcbiAgICAgICAgaWYgKCFub2RlKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aGlzLl90cmVlID0gbm9kZTtcbiAgICAgICAgdGhpcy50eXBlID0gbm9kZS50eXBlO1xuICAgICAgICB0aGlzLmZyb20gPSBub2RlLmZyb207XG4gICAgICAgIHRoaXMudG8gPSBub2RlLnRvO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgeWllbGRCdWYoaW5kZXgsIHR5cGUpIHtcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgICAgICBsZXQgeyBzdGFydCwgYnVmZmVyIH0gPSB0aGlzLmJ1ZmZlcjtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZSB8fCBidWZmZXIuc2V0LnR5cGVzW2J1ZmZlci5idWZmZXJbaW5kZXhdXTtcbiAgICAgICAgdGhpcy5mcm9tID0gc3RhcnQgKyBidWZmZXIuYnVmZmVyW2luZGV4ICsgMV07XG4gICAgICAgIHRoaXMudG8gPSBzdGFydCArIGJ1ZmZlci5idWZmZXJbaW5kZXggKyAyXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHlpZWxkKG5vZGUpIHtcbiAgICAgICAgaWYgKCFub2RlKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRyZWVOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy55aWVsZE5vZGUobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5idWZmZXIgPSBub2RlLmNvbnRleHQ7XG4gICAgICAgIHJldHVybiB0aGlzLnlpZWxkQnVmKG5vZGUuaW5kZXgsIG5vZGUudHlwZSk7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyID8gdGhpcy5idWZmZXIuYnVmZmVyLmNoaWxkU3RyaW5nKHRoaXMuaW5kZXgpIDogdGhpcy5fdHJlZS50b1N0cmluZygpO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgZW50ZXIoZGlyLCBhZnRlcikge1xuICAgICAgICBpZiAoIXRoaXMuYnVmZmVyKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMueWllbGQodGhpcy5fdHJlZS5uZXh0Q2hpbGQoZGlyIDwgMCA/IHRoaXMuX3RyZWUubm9kZS5jaGlsZHJlbi5sZW5ndGggLSAxIDogMCwgZGlyLCBhZnRlciwgdGhpcy5mdWxsKSk7XG4gICAgICAgIGxldCB7IGJ1ZmZlciB9ID0gdGhpcy5idWZmZXI7XG4gICAgICAgIGxldCBpbmRleCA9IGJ1ZmZlci5maW5kQ2hpbGQodGhpcy5pbmRleCArIDQsIGJ1ZmZlci5idWZmZXJbdGhpcy5pbmRleCArIDNdLCBkaXIsIGFmdGVyID09IC0xMDAwMDAwMDAgLyogTm9uZSAqLyA/IC0xMDAwMDAwMDAgLyogTm9uZSAqLyA6IGFmdGVyIC0gdGhpcy5idWZmZXIuc3RhcnQpO1xuICAgICAgICBpZiAoaW5kZXggPCAwKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aGlzLnN0YWNrLnB1c2godGhpcy5pbmRleCk7XG4gICAgICAgIHJldHVybiB0aGlzLnlpZWxkQnVmKGluZGV4KTtcbiAgICB9XG4gICAgLy8vIE1vdmUgdGhlIGN1cnNvciB0byB0aGlzIG5vZGUncyBmaXJzdCBjaGlsZC4gV2hlbiB0aGlzIHJldHVybnNcbiAgICAvLy8gZmFsc2UsIHRoZSBub2RlIGhhcyBubyBjaGlsZCwgYW5kIHRoZSBjdXJzb3IgaGFzIG5vdCBiZWVuIG1vdmVkLlxuICAgIGZpcnN0Q2hpbGQoKSB7IHJldHVybiB0aGlzLmVudGVyKDEsIC0xMDAwMDAwMDAgLyogTm9uZSAqLyk7IH1cbiAgICAvLy8gTW92ZSB0aGUgY3Vyc29yIHRvIHRoaXMgbm9kZSdzIGxhc3QgY2hpbGQuXG4gICAgbGFzdENoaWxkKCkgeyByZXR1cm4gdGhpcy5lbnRlcigtMSwgLTEwMDAwMDAwMCAvKiBOb25lICovKTsgfVxuICAgIC8vLyBNb3ZlIHRoZSBjdXJzb3IgdG8gdGhlIGZpcnN0IGNoaWxkIHRoYXQgc3RhcnRzIGF0IG9yIGFmdGVyIGBwb3NgLlxuICAgIGNoaWxkQWZ0ZXIocG9zKSB7IHJldHVybiB0aGlzLmVudGVyKDEsIHBvcyk7IH1cbiAgICAvLy8gTW92ZSB0byB0aGUgbGFzdCBjaGlsZCB0aGF0IGVuZHMgYXQgb3IgYmVmb3JlIGBwb3NgLlxuICAgIGNoaWxkQmVmb3JlKHBvcykgeyByZXR1cm4gdGhpcy5lbnRlcigtMSwgcG9zKTsgfVxuICAgIC8vLyBNb3ZlIHRoZSBub2RlJ3MgcGFyZW50IG5vZGUsIGlmIHRoaXMgaXNuJ3QgdGhlIHRvcCBub2RlLlxuICAgIHBhcmVudCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmJ1ZmZlcilcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnlpZWxkTm9kZSh0aGlzLmZ1bGwgPyB0aGlzLl90cmVlLl9wYXJlbnQgOiB0aGlzLl90cmVlLnBhcmVudCk7XG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnlpZWxkQnVmKHRoaXMuc3RhY2sucG9wKCkpO1xuICAgICAgICBsZXQgcGFyZW50ID0gdGhpcy5mdWxsID8gdGhpcy5idWZmZXIucGFyZW50IDogdGhpcy5idWZmZXIucGFyZW50Lm5leHRTaWduaWZpY2FudFBhcmVudCgpO1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHJldHVybiB0aGlzLnlpZWxkTm9kZShwYXJlbnQpO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgc2libGluZyhkaXIpIHtcbiAgICAgICAgaWYgKCF0aGlzLmJ1ZmZlcilcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5fdHJlZS5fcGFyZW50ID8gZmFsc2VcbiAgICAgICAgICAgICAgICA6IHRoaXMueWllbGQodGhpcy5fdHJlZS5fcGFyZW50Lm5leHRDaGlsZCh0aGlzLl90cmVlLmluZGV4ICsgZGlyLCBkaXIsIC0xMDAwMDAwMDAgLyogTm9uZSAqLywgdGhpcy5mdWxsKSk7XG4gICAgICAgIGxldCB7IGJ1ZmZlciB9ID0gdGhpcy5idWZmZXIsIGQgPSB0aGlzLnN0YWNrLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChkaXIgPCAwKSB7XG4gICAgICAgICAgICBsZXQgcGFyZW50U3RhcnQgPSBkIDwgMCA/IDAgOiB0aGlzLnN0YWNrW2RdICsgNDtcbiAgICAgICAgICAgIGlmICh0aGlzLmluZGV4ICE9IHBhcmVudFN0YXJ0KVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnlpZWxkQnVmKGJ1ZmZlci5maW5kQ2hpbGQocGFyZW50U3RhcnQsIHRoaXMuaW5kZXgsIC0xLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBhZnRlciA9IGJ1ZmZlci5idWZmZXJbdGhpcy5pbmRleCArIDNdO1xuICAgICAgICAgICAgaWYgKGFmdGVyIDwgKGQgPCAwID8gYnVmZmVyLmJ1ZmZlci5sZW5ndGggOiBidWZmZXIuYnVmZmVyW3RoaXMuc3RhY2tbZF0gKyAzXSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMueWllbGRCdWYoYWZ0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkIDwgMCA/IHRoaXMueWllbGQodGhpcy5idWZmZXIucGFyZW50Lm5leHRDaGlsZCh0aGlzLmJ1ZmZlci5pbmRleCArIGRpciwgZGlyLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8sIHRoaXMuZnVsbCkpIDogZmFsc2U7XG4gICAgfVxuICAgIC8vLyBNb3ZlIHRvIHRoaXMgbm9kZSdzIG5leHQgc2libGluZywgaWYgYW55LlxuICAgIG5leHRTaWJsaW5nKCkgeyByZXR1cm4gdGhpcy5zaWJsaW5nKDEpOyB9XG4gICAgLy8vIE1vdmUgdG8gdGhpcyBub2RlJ3MgcHJldmlvdXMgc2libGluZywgaWYgYW55LlxuICAgIHByZXZTaWJsaW5nKCkgeyByZXR1cm4gdGhpcy5zaWJsaW5nKC0xKTsgfVxuICAgIGF0TGFzdE5vZGUoZGlyKSB7XG4gICAgICAgIGxldCBpbmRleCwgcGFyZW50LCB7IGJ1ZmZlciB9ID0gdGhpcztcbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgICAgaWYgKGRpciA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA8IGJ1ZmZlci5idWZmZXIuYnVmZmVyLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmluZGV4OyBpKyspXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIuYnVmZmVyLmJ1ZmZlcltpICsgM10gPCB0aGlzLmluZGV4KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKHsgaW5kZXgsIHBhcmVudCB9ID0gYnVmZmVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICh7IGluZGV4LCBfcGFyZW50OiBwYXJlbnQgfSA9IHRoaXMuX3RyZWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoOyBwYXJlbnQ7IHsgaW5kZXgsIF9wYXJlbnQ6IHBhcmVudCB9ID0gcGFyZW50KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gaW5kZXggKyBkaXIsIGUgPSBkaXIgPCAwID8gLTEgOiBwYXJlbnQubm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkgIT0gZTsgaSArPSBkaXIpIHtcbiAgICAgICAgICAgICAgICBsZXQgY2hpbGQgPSBwYXJlbnQubm9kZS5jaGlsZHJlbltpXTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mdWxsIHx8ICFjaGlsZC50eXBlLmlzQW5vbnltb3VzIHx8IGNoaWxkIGluc3RhbmNlb2YgVHJlZUJ1ZmZlciB8fCBoYXNDaGlsZChjaGlsZCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgbW92ZShkaXIpIHtcbiAgICAgICAgaWYgKHRoaXMuZW50ZXIoZGlyLCAtMTAwMDAwMDAwIC8qIE5vbmUgKi8pKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNpYmxpbmcoZGlyKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF0TGFzdE5vZGUoZGlyKSB8fCAhdGhpcy5wYXJlbnQoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIE1vdmUgdG8gdGhlIG5leHQgbm9kZSBpbiBhXG4gICAgLy8vIFtwcmUtb3JkZXJdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1RyZWVfdHJhdmVyc2FsI1ByZS1vcmRlcl8oTkxSKSlcbiAgICAvLy8gdHJhdmVyc2FsLCBnb2luZyBmcm9tIGEgbm9kZSB0byBpdHMgZmlyc3QgY2hpbGQgb3IsIGlmIHRoZVxuICAgIC8vLyBjdXJyZW50IG5vZGUgaXMgZW1wdHksIGl0cyBuZXh0IHNpYmxpbmcgb3IgdGhlIG5leHQgc2libGluZyBvZlxuICAgIC8vLyB0aGUgZmlyc3QgcGFyZW50IG5vZGUgdGhhdCBoYXMgb25lLlxuICAgIG5leHQoKSB7IHJldHVybiB0aGlzLm1vdmUoMSk7IH1cbiAgICAvLy8gTW92ZSB0byB0aGUgbmV4dCBub2RlIGluIGEgbGFzdC10by1maXJzdCBwcmUtb3JkZXIgdHJhdmVyYWwuIEFcbiAgICAvLy8gbm9kZSBpcyBmb2xsb3dlZCBieSBpc3QgbGFzdCBjaGlsZCBvciwgaWYgaXQgaGFzIG5vbmUsIGl0c1xuICAgIC8vLyBwcmV2aW91cyBzaWJsaW5nIG9yIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9mIHRoZSBmaXJzdCBwYXJlbnRcbiAgICAvLy8gbm9kZSB0aGF0IGhhcyBvbmUuXG4gICAgcHJldigpIHsgcmV0dXJuIHRoaXMubW92ZSgtMSk7IH1cbiAgICAvLy8gTW92ZSB0aGUgY3Vyc29yIHRvIHRoZSBpbm5lcm1vc3Qgbm9kZSB0aGF0IGNvdmVycyBgcG9zYC4gSWZcbiAgICAvLy8gYHNpZGVgIGlzIC0xLCBpdCB3aWxsIGVudGVyIG5vZGVzIHRoYXQgZW5kIGF0IGBwb3NgLiBJZiBpdCBpcyAxLFxuICAgIC8vLyBpdCB3aWxsIGVudGVyIG5vZGVzIHRoYXQgc3RhcnQgYXQgYHBvc2AuXG4gICAgbW92ZVRvKHBvcywgc2lkZSA9IDApIHtcbiAgICAgICAgLy8gTW92ZSB1cCB0byBhIG5vZGUgdGhhdCBhY3R1YWxseSBob2xkcyB0aGUgcG9zaXRpb24sIGlmIHBvc3NpYmxlXG4gICAgICAgIHdoaWxlICh0aGlzLmZyb20gPT0gdGhpcy50byB8fFxuICAgICAgICAgICAgKHNpZGUgPCAxID8gdGhpcy5mcm9tID49IHBvcyA6IHRoaXMuZnJvbSA+IHBvcykgfHxcbiAgICAgICAgICAgIChzaWRlID4gLTEgPyB0aGlzLnRvIDw9IHBvcyA6IHRoaXMudG8gPCBwb3MpKVxuICAgICAgICAgICAgaWYgKCF0aGlzLnBhcmVudCgpKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBUaGVuIHNjYW4gZG93biBpbnRvIGNoaWxkIG5vZGVzIGFzIGZhciBhcyBwb3NzaWJsZVxuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBpZiAoc2lkZSA8IDAgPyAhdGhpcy5jaGlsZEJlZm9yZShwb3MpIDogIXRoaXMuY2hpbGRBZnRlcihwb3MpKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgaWYgKHRoaXMuZnJvbSA9PSB0aGlzLnRvIHx8XG4gICAgICAgICAgICAgICAgKHNpZGUgPCAxID8gdGhpcy5mcm9tID49IHBvcyA6IHRoaXMuZnJvbSA+IHBvcykgfHxcbiAgICAgICAgICAgICAgICAoc2lkZSA+IC0xID8gdGhpcy50byA8PSBwb3MgOiB0aGlzLnRvIDwgcG9zKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8vLyBHZXQgYSBbc3ludGF4IG5vZGVdKCN0cmVlLlN5bnRheE5vZGUpIGF0IHRoZSBjdXJzb3IncyBjdXJyZW50XG4gICAgLy8vIHBvc2l0aW9uLlxuICAgIGdldCBub2RlKCkge1xuICAgICAgICBpZiAoIXRoaXMuYnVmZmVyKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RyZWU7XG4gICAgICAgIGxldCBjYWNoZSA9IHRoaXMuYnVmZmVyTm9kZSwgcmVzdWx0ID0gbnVsbCwgZGVwdGggPSAwO1xuICAgICAgICBpZiAoY2FjaGUgJiYgY2FjaGUuY29udGV4dCA9PSB0aGlzLmJ1ZmZlcikge1xuICAgICAgICAgICAgc2NhbjogZm9yIChsZXQgaW5kZXggPSB0aGlzLmluZGV4LCBkID0gdGhpcy5zdGFjay5sZW5ndGg7IGQgPj0gMDspIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gY2FjaGU7IGM7IGMgPSBjLl9wYXJlbnQpXG4gICAgICAgICAgICAgICAgICAgIGlmIChjLmluZGV4ID09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT0gdGhpcy5pbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGM7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXB0aCA9IGQgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWsgc2NhbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluZGV4ID0gdGhpcy5zdGFja1stLWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSBkZXB0aDsgaSA8IHRoaXMuc3RhY2subGVuZ3RoOyBpKyspXG4gICAgICAgICAgICByZXN1bHQgPSBuZXcgQnVmZmVyTm9kZSh0aGlzLmJ1ZmZlciwgcmVzdWx0LCB0aGlzLnN0YWNrW2ldKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyTm9kZSA9IG5ldyBCdWZmZXJOb2RlKHRoaXMuYnVmZmVyLCByZXN1bHQsIHRoaXMuaW5kZXgpO1xuICAgIH1cbiAgICAvLy8gR2V0IHRoZSBbdHJlZV0oI3RyZWUuVHJlZSkgdGhhdCByZXByZXNlbnRzIHRoZSBjdXJyZW50IG5vZGUsIGlmXG4gICAgLy8vIGFueS4gV2lsbCByZXR1cm4gbnVsbCB3aGVuIHRoZSBub2RlIGlzIGluIGEgW3RyZWVcbiAgICAvLy8gYnVmZmVyXSgjdHJlZS5UcmVlQnVmZmVyKS5cbiAgICBnZXQgdHJlZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyID8gbnVsbCA6IHRoaXMuX3RyZWUubm9kZTtcbiAgICB9XG59XG5mdW5jdGlvbiBoYXNDaGlsZCh0cmVlKSB7XG4gICAgcmV0dXJuIHRyZWUuY2hpbGRyZW4uc29tZShjaCA9PiAhY2gudHlwZS5pc0Fub255bW91cyB8fCBjaCBpbnN0YW5jZW9mIFRyZWVCdWZmZXIgfHwgaGFzQ2hpbGQoY2gpKTtcbn1cbmNsYXNzIEZsYXRCdWZmZXJDdXJzb3Ige1xuICAgIGNvbnN0cnVjdG9yKGJ1ZmZlciwgaW5kZXgpIHtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICB9XG4gICAgZ2V0IGlkKCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDRdOyB9XG4gICAgZ2V0IHN0YXJ0KCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDNdOyB9XG4gICAgZ2V0IGVuZCgpIHsgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuaW5kZXggLSAyXTsgfVxuICAgIGdldCBzaXplKCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDFdOyB9XG4gICAgZ2V0IHBvcygpIHsgcmV0dXJuIHRoaXMuaW5kZXg7IH1cbiAgICBuZXh0KCkgeyB0aGlzLmluZGV4IC09IDQ7IH1cbiAgICBmb3JrKCkgeyByZXR1cm4gbmV3IEZsYXRCdWZmZXJDdXJzb3IodGhpcy5idWZmZXIsIHRoaXMuaW5kZXgpOyB9XG59XG5jb25zdCBCYWxhbmNlQnJhbmNoRmFjdG9yID0gODtcbmZ1bmN0aW9uIGJ1aWxkVHJlZShkYXRhKSB7XG4gICAgdmFyIF9hO1xuICAgIGxldCB7IGJ1ZmZlciwgbm9kZVNldCwgdG9wSUQgPSAwLCBtYXhCdWZmZXJMZW5ndGggPSBEZWZhdWx0QnVmZmVyTGVuZ3RoLCByZXVzZWQgPSBbXSwgbWluUmVwZWF0VHlwZSA9IG5vZGVTZXQudHlwZXMubGVuZ3RoIH0gPSBkYXRhO1xuICAgIGxldCBjdXJzb3IgPSBBcnJheS5pc0FycmF5KGJ1ZmZlcikgPyBuZXcgRmxhdEJ1ZmZlckN1cnNvcihidWZmZXIsIGJ1ZmZlci5sZW5ndGgpIDogYnVmZmVyO1xuICAgIGxldCB0eXBlcyA9IG5vZGVTZXQudHlwZXM7XG4gICAgbGV0IGNvbnRleHRIYXNoID0gMDtcbiAgICBmdW5jdGlvbiB0YWtlTm9kZShwYXJlbnRTdGFydCwgbWluUG9zLCBjaGlsZHJlbiwgcG9zaXRpb25zLCBpblJlcGVhdCkge1xuICAgICAgICBsZXQgeyBpZCwgc3RhcnQsIGVuZCwgc2l6ZSB9ID0gY3Vyc29yO1xuICAgICAgICBsZXQgc3RhcnRQb3MgPSBzdGFydCAtIHBhcmVudFN0YXJ0O1xuICAgICAgICBpZiAoc2l6ZSA8IDApIHtcbiAgICAgICAgICAgIGlmIChzaXplID09IC0xKSB7IC8vIFJldXNlZCBub2RlXG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChyZXVzZWRbaWRdKTtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnMucHVzaChzdGFydFBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHsgLy8gQ29udGV4dCBjaGFuZ2VcbiAgICAgICAgICAgICAgICBjb250ZXh0SGFzaCA9IGlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3Vyc29yLm5leHQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdHlwZSA9IHR5cGVzW2lkXSwgbm9kZSwgYnVmZmVyO1xuICAgICAgICBpZiAoZW5kIC0gc3RhcnQgPD0gbWF4QnVmZmVyTGVuZ3RoICYmIChidWZmZXIgPSBmaW5kQnVmZmVyU2l6ZShjdXJzb3IucG9zIC0gbWluUG9zLCBpblJlcGVhdCkpKSB7XG4gICAgICAgICAgICAvLyBTbWFsbCBlbm91Z2ggZm9yIGEgYnVmZmVyLCBhbmQgbm8gcmV1c2VkIG5vZGVzIGluc2lkZVxuICAgICAgICAgICAgbGV0IGRhdGEgPSBuZXcgVWludDE2QXJyYXkoYnVmZmVyLnNpemUgLSBidWZmZXIuc2tpcCk7XG4gICAgICAgICAgICBsZXQgZW5kUG9zID0gY3Vyc29yLnBvcyAtIGJ1ZmZlci5zaXplLCBpbmRleCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGN1cnNvci5wb3MgPiBlbmRQb3MpXG4gICAgICAgICAgICAgICAgaW5kZXggPSBjb3B5VG9CdWZmZXIoYnVmZmVyLnN0YXJ0LCBkYXRhLCBpbmRleCwgaW5SZXBlYXQpO1xuICAgICAgICAgICAgbm9kZSA9IG5ldyBUcmVlQnVmZmVyKGRhdGEsIGVuZCAtIGJ1ZmZlci5zdGFydCwgbm9kZVNldCwgaW5SZXBlYXQgPCAwID8gTm9kZVR5cGUubm9uZSA6IHR5cGVzW2luUmVwZWF0XSk7XG4gICAgICAgICAgICBzdGFydFBvcyA9IGJ1ZmZlci5zdGFydCAtIHBhcmVudFN0YXJ0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgeyAvLyBNYWtlIGl0IGEgbm9kZVxuICAgICAgICAgICAgbGV0IGVuZFBvcyA9IGN1cnNvci5wb3MgLSBzaXplO1xuICAgICAgICAgICAgY3Vyc29yLm5leHQoKTtcbiAgICAgICAgICAgIGxldCBsb2NhbENoaWxkcmVuID0gW10sIGxvY2FsUG9zaXRpb25zID0gW107XG4gICAgICAgICAgICBsZXQgbG9jYWxJblJlcGVhdCA9IGlkID49IG1pblJlcGVhdFR5cGUgPyBpZCA6IC0xO1xuICAgICAgICAgICAgd2hpbGUgKGN1cnNvci5wb3MgPiBlbmRQb3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3Vyc29yLmlkID09IGxvY2FsSW5SZXBlYXQpXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5uZXh0KCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICB0YWtlTm9kZShzdGFydCwgZW5kUG9zLCBsb2NhbENoaWxkcmVuLCBsb2NhbFBvc2l0aW9ucywgbG9jYWxJblJlcGVhdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsb2NhbENoaWxkcmVuLnJldmVyc2UoKTtcbiAgICAgICAgICAgIGxvY2FsUG9zaXRpb25zLnJldmVyc2UoKTtcbiAgICAgICAgICAgIGlmIChsb2NhbEluUmVwZWF0ID4gLTEgJiYgbG9jYWxDaGlsZHJlbi5sZW5ndGggPiBCYWxhbmNlQnJhbmNoRmFjdG9yKVxuICAgICAgICAgICAgICAgIG5vZGUgPSBiYWxhbmNlUmFuZ2UodHlwZSwgdHlwZSwgbG9jYWxDaGlsZHJlbiwgbG9jYWxQb3NpdGlvbnMsIDAsIGxvY2FsQ2hpbGRyZW4ubGVuZ3RoLCAwLCBtYXhCdWZmZXJMZW5ndGgsIGVuZCAtIHN0YXJ0LCBjb250ZXh0SGFzaCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbm9kZSA9IHdpdGhIYXNoKG5ldyBUcmVlKHR5cGUsIGxvY2FsQ2hpbGRyZW4sIGxvY2FsUG9zaXRpb25zLCBlbmQgLSBzdGFydCksIGNvbnRleHRIYXNoKTtcbiAgICAgICAgfVxuICAgICAgICBjaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICBwb3NpdGlvbnMucHVzaChzdGFydFBvcyk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZpbmRCdWZmZXJTaXplKG1heFNpemUsIGluUmVwZWF0KSB7XG4gICAgICAgIC8vIFNjYW4gdGhyb3VnaCB0aGUgYnVmZmVyIHRvIGZpbmQgcHJldmlvdXMgc2libGluZ3MgdGhhdCBmaXRcbiAgICAgICAgLy8gdG9nZXRoZXIgaW4gYSBUcmVlQnVmZmVyLCBhbmQgZG9uJ3QgY29udGFpbiBhbnkgcmV1c2VkIG5vZGVzXG4gICAgICAgIC8vICh3aGljaCBjYW4ndCBiZSBzdG9yZWQgaW4gYSBidWZmZXIpLlxuICAgICAgICAvLyBJZiBgaW5SZXBlYXRgIGlzID4gLTEsIGlnbm9yZSBub2RlIGJvdW5kYXJpZXMgb2YgdGhhdCB0eXBlIGZvclxuICAgICAgICAvLyBuZXN0aW5nLCBidXQgbWFrZSBzdXJlIHRoZSBlbmQgZmFsbHMgZWl0aGVyIGF0IHRoZSBzdGFydFxuICAgICAgICAvLyAoYG1heFNpemVgKSBvciBiZWZvcmUgc3VjaCBhIG5vZGUuXG4gICAgICAgIGxldCBmb3JrID0gY3Vyc29yLmZvcmsoKTtcbiAgICAgICAgbGV0IHNpemUgPSAwLCBzdGFydCA9IDAsIHNraXAgPSAwLCBtaW5TdGFydCA9IGZvcmsuZW5kIC0gbWF4QnVmZmVyTGVuZ3RoO1xuICAgICAgICBsZXQgcmVzdWx0ID0geyBzaXplOiAwLCBzdGFydDogMCwgc2tpcDogMCB9O1xuICAgICAgICBzY2FuOiBmb3IgKGxldCBtaW5Qb3MgPSBmb3JrLnBvcyAtIG1heFNpemU7IGZvcmsucG9zID4gbWluUG9zOykge1xuICAgICAgICAgICAgLy8gUHJldGVuZCBuZXN0ZWQgcmVwZWF0IG5vZGVzIG9mIHRoZSBzYW1lIHR5cGUgZG9uJ3QgZXhpc3RcbiAgICAgICAgICAgIGlmIChmb3JrLmlkID09IGluUmVwZWF0KSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjZXB0IHRoYXQgd2Ugc3RvcmUgdGhlIGN1cnJlbnQgc3RhdGUgYXMgYSB2YWxpZCByZXR1cm5cbiAgICAgICAgICAgICAgICAvLyB2YWx1ZS5cbiAgICAgICAgICAgICAgICByZXN1bHQuc2l6ZSA9IHNpemU7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNraXAgPSBza2lwO1xuICAgICAgICAgICAgICAgIHNraXAgKz0gNDtcbiAgICAgICAgICAgICAgICBzaXplICs9IDQ7XG4gICAgICAgICAgICAgICAgZm9yay5uZXh0KCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgbm9kZVNpemUgPSBmb3JrLnNpemUsIHN0YXJ0UG9zID0gZm9yay5wb3MgLSBub2RlU2l6ZTtcbiAgICAgICAgICAgIGlmIChub2RlU2l6ZSA8IDAgfHwgc3RhcnRQb3MgPCBtaW5Qb3MgfHwgZm9yay5zdGFydCA8IG1pblN0YXJ0KVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgbGV0IGxvY2FsU2tpcHBlZCA9IGZvcmsuaWQgPj0gbWluUmVwZWF0VHlwZSA/IDQgOiAwO1xuICAgICAgICAgICAgbGV0IG5vZGVTdGFydCA9IGZvcmsuc3RhcnQ7XG4gICAgICAgICAgICBmb3JrLm5leHQoKTtcbiAgICAgICAgICAgIHdoaWxlIChmb3JrLnBvcyA+IHN0YXJ0UG9zKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZvcmsuc2l6ZSA8IDApXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrIHNjYW47XG4gICAgICAgICAgICAgICAgaWYgKGZvcmsuaWQgPj0gbWluUmVwZWF0VHlwZSlcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTa2lwcGVkICs9IDQ7XG4gICAgICAgICAgICAgICAgZm9yay5uZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFydCA9IG5vZGVTdGFydDtcbiAgICAgICAgICAgIHNpemUgKz0gbm9kZVNpemU7XG4gICAgICAgICAgICBza2lwICs9IGxvY2FsU2tpcHBlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5SZXBlYXQgPCAwIHx8IHNpemUgPT0gbWF4U2l6ZSkge1xuICAgICAgICAgICAgcmVzdWx0LnNpemUgPSBzaXplO1xuICAgICAgICAgICAgcmVzdWx0LnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICByZXN1bHQuc2tpcCA9IHNraXA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdC5zaXplID4gNCA/IHJlc3VsdCA6IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZnVuY3Rpb24gY29weVRvQnVmZmVyKGJ1ZmZlclN0YXJ0LCBidWZmZXIsIGluZGV4LCBpblJlcGVhdCkge1xuICAgICAgICBsZXQgeyBpZCwgc3RhcnQsIGVuZCwgc2l6ZSB9ID0gY3Vyc29yO1xuICAgICAgICBjdXJzb3IubmV4dCgpO1xuICAgICAgICBpZiAoaWQgPT0gaW5SZXBlYXQpXG4gICAgICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICAgIGxldCBzdGFydEluZGV4ID0gaW5kZXg7XG4gICAgICAgIGlmIChzaXplID4gNCkge1xuICAgICAgICAgICAgbGV0IGVuZFBvcyA9IGN1cnNvci5wb3MgLSAoc2l6ZSAtIDQpO1xuICAgICAgICAgICAgd2hpbGUgKGN1cnNvci5wb3MgPiBlbmRQb3MpXG4gICAgICAgICAgICAgICAgaW5kZXggPSBjb3B5VG9CdWZmZXIoYnVmZmVyU3RhcnQsIGJ1ZmZlciwgaW5kZXgsIGluUmVwZWF0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPCBtaW5SZXBlYXRUeXBlKSB7IC8vIERvbid0IGNvcHkgcmVwZWF0IG5vZGVzIGludG8gYnVmZmVyc1xuICAgICAgICAgICAgYnVmZmVyWy0taW5kZXhdID0gc3RhcnRJbmRleDtcbiAgICAgICAgICAgIGJ1ZmZlclstLWluZGV4XSA9IGVuZCAtIGJ1ZmZlclN0YXJ0O1xuICAgICAgICAgICAgYnVmZmVyWy0taW5kZXhdID0gc3RhcnQgLSBidWZmZXJTdGFydDtcbiAgICAgICAgICAgIGJ1ZmZlclstLWluZGV4XSA9IGlkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG4gICAgbGV0IGNoaWxkcmVuID0gW10sIHBvc2l0aW9ucyA9IFtdO1xuICAgIHdoaWxlIChjdXJzb3IucG9zID4gMClcbiAgICAgICAgdGFrZU5vZGUoZGF0YS5zdGFydCB8fCAwLCAwLCBjaGlsZHJlbiwgcG9zaXRpb25zLCAtMSk7XG4gICAgbGV0IGxlbmd0aCA9IChfYSA9IGRhdGEubGVuZ3RoKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiAoY2hpbGRyZW4ubGVuZ3RoID8gcG9zaXRpb25zWzBdICsgY2hpbGRyZW5bMF0ubGVuZ3RoIDogMCk7XG4gICAgcmV0dXJuIG5ldyBUcmVlKHR5cGVzW3RvcElEXSwgY2hpbGRyZW4ucmV2ZXJzZSgpLCBwb3NpdGlvbnMucmV2ZXJzZSgpLCBsZW5ndGgpO1xufVxuZnVuY3Rpb24gYmFsYW5jZVJhbmdlKG91dGVyVHlwZSwgaW5uZXJUeXBlLCBjaGlsZHJlbiwgcG9zaXRpb25zLCBmcm9tLCB0bywgc3RhcnQsIG1heEJ1ZmZlckxlbmd0aCwgbGVuZ3RoLCBjb250ZXh0SGFzaCkge1xuICAgIGxldCBsb2NhbENoaWxkcmVuID0gW10sIGxvY2FsUG9zaXRpb25zID0gW107XG4gICAgaWYgKGxlbmd0aCA8PSBtYXhCdWZmZXJMZW5ndGgpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGZyb207IGkgPCB0bzsgaSsrKSB7XG4gICAgICAgICAgICBsb2NhbENoaWxkcmVuLnB1c2goY2hpbGRyZW5baV0pO1xuICAgICAgICAgICAgbG9jYWxQb3NpdGlvbnMucHVzaChwb3NpdGlvbnNbaV0gLSBzdGFydCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGxldCBtYXhDaGlsZCA9IE1hdGgubWF4KG1heEJ1ZmZlckxlbmd0aCwgTWF0aC5jZWlsKGxlbmd0aCAqIDEuNSAvIEJhbGFuY2VCcmFuY2hGYWN0b3IpKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IGZyb207IGkgPCB0bzspIHtcbiAgICAgICAgICAgIGxldCBncm91cEZyb20gPSBpLCBncm91cFN0YXJ0ID0gcG9zaXRpb25zW2ldO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgZm9yICg7IGkgPCB0bzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IG5leHRFbmQgPSBwb3NpdGlvbnNbaV0gKyBjaGlsZHJlbltpXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRFbmQgLSBncm91cFN0YXJ0ID4gbWF4Q2hpbGQpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGkgPT0gZ3JvdXBGcm9tICsgMSkge1xuICAgICAgICAgICAgICAgIGxldCBvbmx5ID0gY2hpbGRyZW5bZ3JvdXBGcm9tXTtcbiAgICAgICAgICAgICAgICBpZiAob25seSBpbnN0YW5jZW9mIFRyZWUgJiYgb25seS50eXBlID09IGlubmVyVHlwZSAmJiBvbmx5Lmxlbmd0aCA+IG1heENoaWxkIDw8IDEpIHsgLy8gVG9vIGJpZywgY29sbGFwc2VcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBvbmx5LmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbENoaWxkcmVuLnB1c2gob25seS5jaGlsZHJlbltqXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFBvc2l0aW9ucy5wdXNoKG9ubHkucG9zaXRpb25zW2pdICsgZ3JvdXBTdGFydCAtIHN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbG9jYWxDaGlsZHJlbi5wdXNoKG9ubHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PSBncm91cEZyb20gKyAxKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxDaGlsZHJlbi5wdXNoKGNoaWxkcmVuW2dyb3VwRnJvbV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGlubmVyID0gYmFsYW5jZVJhbmdlKGlubmVyVHlwZSwgaW5uZXJUeXBlLCBjaGlsZHJlbiwgcG9zaXRpb25zLCBncm91cEZyb20sIGksIGdyb3VwU3RhcnQsIG1heEJ1ZmZlckxlbmd0aCwgcG9zaXRpb25zW2kgLSAxXSArIGNoaWxkcmVuW2kgLSAxXS5sZW5ndGggLSBncm91cFN0YXJ0LCBjb250ZXh0SGFzaCk7XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyVHlwZSAhPSBOb2RlVHlwZS5ub25lICYmICFjb250YWluc1R5cGUoaW5uZXIuY2hpbGRyZW4sIGlubmVyVHlwZSkpXG4gICAgICAgICAgICAgICAgICAgIGlubmVyID0gd2l0aEhhc2gobmV3IFRyZWUoTm9kZVR5cGUubm9uZSwgaW5uZXIuY2hpbGRyZW4sIGlubmVyLnBvc2l0aW9ucywgaW5uZXIubGVuZ3RoKSwgY29udGV4dEhhc2gpO1xuICAgICAgICAgICAgICAgIGxvY2FsQ2hpbGRyZW4ucHVzaChpbm5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsb2NhbFBvc2l0aW9ucy5wdXNoKGdyb3VwU3RhcnQgLSBzdGFydCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdpdGhIYXNoKG5ldyBUcmVlKG91dGVyVHlwZSwgbG9jYWxDaGlsZHJlbiwgbG9jYWxQb3NpdGlvbnMsIGxlbmd0aCksIGNvbnRleHRIYXNoKTtcbn1cbmZ1bmN0aW9uIGNvbnRhaW5zVHlwZShub2RlcywgdHlwZSkge1xuICAgIGZvciAobGV0IGVsdCBvZiBub2RlcylcbiAgICAgICAgaWYgKGVsdC50eXBlID09IHR5cGUpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG59XG4vLy8gVHJlZSBmcmFnbWVudHMgYXJlIHVzZWQgZHVyaW5nIFtpbmNyZW1lbnRhbFxuLy8vIHBhcnNpbmddKCNsZXplci5QYXJzZU9wdGlvbnMuZnJhZ21lbnRzKSB0byB0cmFjayBwYXJ0cyBvZiBvbGRcbi8vLyB0cmVlcyB0aGF0IGNhbiBiZSByZXVzZWQgaW4gYSBuZXcgcGFyc2UuIEFuIGFycmF5IG9mIGZyYWdtZW50cyBpc1xuLy8vIHVzZWQgdG8gdHJhY2sgcmVnaW9ucyBvZiBhbiBvbGQgdHJlZSB3aG9zZSBub2RlcyBtaWdodCBiZSByZXVzZWRcbi8vLyBpbiBuZXcgcGFyc2VzLiBVc2UgdGhlIHN0YXRpY1xuLy8vIFtgYXBwbHlDaGFuZ2VzYF0oI3RyZWUuVHJlZUZyYWdtZW50XmFwcGx5Q2hhbmdlcykgbWV0aG9kIHRvIHVwZGF0ZVxuLy8vIGZyYWdtZW50cyBmb3IgZG9jdW1lbnQgY2hhbmdlcy5cbmNsYXNzIFRyZWVGcmFnbWVudCB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgLy8vIFRoZSBzdGFydCBvZiB0aGUgdW5jaGFuZ2VkIHJhbmdlIHBvaW50ZWQgdG8gYnkgdGhpcyBmcmFnbWVudC5cbiAgICAvLy8gVGhpcyByZWZlcnMgdG8gYW4gb2Zmc2V0IGluIHRoZSBfdXBkYXRlZF8gZG9jdW1lbnQgKGFzIG9wcG9zZWRcbiAgICAvLy8gdG8gdGhlIG9yaWdpbmFsIHRyZWUpLlxuICAgIGZyb20sIFxuICAgIC8vLyBUaGUgZW5kIG9mIHRoZSB1bmNoYW5nZWQgcmFuZ2UuXG4gICAgdG8sIFxuICAgIC8vLyBUaGUgdHJlZSB0aGF0IHRoaXMgZnJhZ21lbnQgaXMgYmFzZWQgb24uXG4gICAgdHJlZSwgXG4gICAgLy8vIFRoZSBvZmZzZXQgYmV0d2VlbiB0aGUgZnJhZ21lbnQncyB0cmVlIGFuZCB0aGUgZG9jdW1lbnQgdGhhdFxuICAgIC8vLyB0aGlzIGZyYWdtZW50IGNhbiBiZSB1c2VkIGFnYWluc3QuIEFkZCB0aGlzIHdoZW4gZ29pbmcgZnJvbVxuICAgIC8vLyBkb2N1bWVudCB0byB0cmVlIHBvc2l0aW9ucywgc3VidHJhY3QgaXQgdG8gZ28gZnJvbSB0cmVlIHRvXG4gICAgLy8vIGRvY3VtZW50IHBvc2l0aW9ucy5cbiAgICBvZmZzZXQsIG9wZW4pIHtcbiAgICAgICAgdGhpcy5mcm9tID0gZnJvbTtcbiAgICAgICAgdGhpcy50byA9IHRvO1xuICAgICAgICB0aGlzLnRyZWUgPSB0cmVlO1xuICAgICAgICB0aGlzLm9mZnNldCA9IG9mZnNldDtcbiAgICAgICAgdGhpcy5vcGVuID0gb3BlbjtcbiAgICB9XG4gICAgZ2V0IG9wZW5TdGFydCgpIHsgcmV0dXJuICh0aGlzLm9wZW4gJiAxIC8qIFN0YXJ0ICovKSA+IDA7IH1cbiAgICBnZXQgb3BlbkVuZCgpIHsgcmV0dXJuICh0aGlzLm9wZW4gJiAyIC8qIEVuZCAqLykgPiAwOyB9XG4gICAgLy8vIEFwcGx5IGEgc2V0IG9mIGVkaXRzIHRvIGFuIGFycmF5IG9mIGZyYWdtZW50cywgcmVtb3Zpbmcgb3JcbiAgICAvLy8gc3BsaXR0aW5nIGZyYWdtZW50cyBhcyBuZWNlc3NhcnkgdG8gcmVtb3ZlIGVkaXRlZCByYW5nZXMsIGFuZFxuICAgIC8vLyBhZGp1c3Rpbmcgb2Zmc2V0cyBmb3IgZnJhZ21lbnRzIHRoYXQgbW92ZWQuXG4gICAgc3RhdGljIGFwcGx5Q2hhbmdlcyhmcmFnbWVudHMsIGNoYW5nZXMsIG1pbkdhcCA9IDEyOCkge1xuICAgICAgICBpZiAoIWNoYW5nZXMubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIGZyYWdtZW50cztcbiAgICAgICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgICAgICBsZXQgZkkgPSAxLCBuZXh0RiA9IGZyYWdtZW50cy5sZW5ndGggPyBmcmFnbWVudHNbMF0gOiBudWxsO1xuICAgICAgICBsZXQgY0kgPSAwLCBwb3MgPSAwLCBvZmYgPSAwO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBsZXQgbmV4dEMgPSBjSSA8IGNoYW5nZXMubGVuZ3RoID8gY2hhbmdlc1tjSSsrXSA6IG51bGw7XG4gICAgICAgICAgICBsZXQgbmV4dFBvcyA9IG5leHRDID8gbmV4dEMuZnJvbUEgOiAxZTk7XG4gICAgICAgICAgICBpZiAobmV4dFBvcyAtIHBvcyA+PSBtaW5HYXApXG4gICAgICAgICAgICAgICAgd2hpbGUgKG5leHRGICYmIG5leHRGLmZyb20gPCBuZXh0UG9zKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBjdXQgPSBuZXh0RjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvcyA+PSBjdXQuZnJvbSB8fCBuZXh0UG9zIDw9IGN1dC50byB8fCBvZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmRnJvbSA9IE1hdGgubWF4KGN1dC5mcm9tLCBwb3MpIC0gb2ZmLCBmVG8gPSBNYXRoLm1pbihjdXQudG8sIG5leHRQb3MpIC0gb2ZmO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3V0ID0gZkZyb20gPj0gZlRvID8gbnVsbCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFRyZWVGcmFnbWVudChmRnJvbSwgZlRvLCBjdXQudHJlZSwgY3V0Lm9mZnNldCArIG9mZiwgKGNJID4gMCA/IDEgLyogU3RhcnQgKi8gOiAwKSB8IChuZXh0QyA/IDIgLyogRW5kICovIDogMCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXQpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjdXQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dEYudG8gPiBuZXh0UG9zKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIG5leHRGID0gZkkgPCBmcmFnbWVudHMubGVuZ3RoID8gZnJhZ21lbnRzW2ZJKytdIDogbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW5leHRDKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgcG9zID0gbmV4dEMudG9BO1xuICAgICAgICAgICAgb2ZmID0gbmV4dEMudG9BIC0gbmV4dEMudG9CO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIC8vLyBDcmVhdGUgYSBzZXQgb2YgZnJhZ21lbnRzIGZyb20gYSBmcmVzaGx5IHBhcnNlZCB0cmVlLCBvciB1cGRhdGVcbiAgICAvLy8gYW4gZXhpc3Rpbmcgc2V0IG9mIGZyYWdtZW50cyBieSByZXBsYWNpbmcgdGhlIG9uZXMgdGhhdCBvdmVybGFwXG4gICAgLy8vIHdpdGggYSB0cmVlIHdpdGggY29udGVudCBmcm9tIHRoZSBuZXcgdHJlZS4gV2hlbiBgcGFydGlhbGAgaXNcbiAgICAvLy8gdHJ1ZSwgdGhlIHBhcnNlIGlzIHRyZWF0ZWQgYXMgaW5jb21wbGV0ZSwgYW5kIHRoZSB0b2tlbiBhdCBpdHNcbiAgICAvLy8gZW5kIGlzIG5vdCBpbmNsdWRlZCBpbiBbYHNhZmVUb2BdKCN0cmVlLlRyZWVGcmFnbWVudC5zYWZlVG8pLlxuICAgIHN0YXRpYyBhZGRUcmVlKHRyZWUsIGZyYWdtZW50cyA9IFtdLCBwYXJ0aWFsID0gZmFsc2UpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IFtuZXcgVHJlZUZyYWdtZW50KDAsIHRyZWUubGVuZ3RoLCB0cmVlLCAwLCBwYXJ0aWFsID8gMiAvKiBFbmQgKi8gOiAwKV07XG4gICAgICAgIGZvciAobGV0IGYgb2YgZnJhZ21lbnRzKVxuICAgICAgICAgICAgaWYgKGYudG8gPiB0cmVlLmxlbmd0aClcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChmKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG4vLyBDcmVhdGVzIGFuIGBJbnB1dGAgdGhhdCBpcyBiYWNrZWQgYnkgYSBzaW5nbGUsIGZsYXQgc3RyaW5nLlxuZnVuY3Rpb24gc3RyaW5nSW5wdXQoaW5wdXQpIHsgcmV0dXJuIG5ldyBTdHJpbmdJbnB1dChpbnB1dCk7IH1cbmNsYXNzIFN0cmluZ0lucHV0IHtcbiAgICBjb25zdHJ1Y3RvcihzdHJpbmcsIGxlbmd0aCA9IHN0cmluZy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgIH1cbiAgICBnZXQocG9zKSB7XG4gICAgICAgIHJldHVybiBwb3MgPCAwIHx8IHBvcyA+PSB0aGlzLmxlbmd0aCA/IC0xIDogdGhpcy5zdHJpbmcuY2hhckNvZGVBdChwb3MpO1xuICAgIH1cbiAgICBsaW5lQWZ0ZXIocG9zKSB7XG4gICAgICAgIGlmIChwb3MgPCAwKVxuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIGxldCBlbmQgPSB0aGlzLnN0cmluZy5pbmRleE9mKFwiXFxuXCIsIHBvcyk7XG4gICAgICAgIHJldHVybiB0aGlzLnN0cmluZy5zbGljZShwb3MsIGVuZCA8IDAgPyB0aGlzLmxlbmd0aCA6IE1hdGgubWluKGVuZCwgdGhpcy5sZW5ndGgpKTtcbiAgICB9XG4gICAgcmVhZChmcm9tLCB0bykgeyByZXR1cm4gdGhpcy5zdHJpbmcuc2xpY2UoZnJvbSwgTWF0aC5taW4odGhpcy5sZW5ndGgsIHRvKSk7IH1cbiAgICBjbGlwKGF0KSB7IHJldHVybiBuZXcgU3RyaW5nSW5wdXQodGhpcy5zdHJpbmcsIGF0KTsgfVxufVxuXG5leHBvcnQgeyBEZWZhdWx0QnVmZmVyTGVuZ3RoLCBOb2RlUHJvcCwgTm9kZVNldCwgTm9kZVR5cGUsIFRyZWUsIFRyZWVCdWZmZXIsIFRyZWVDdXJzb3IsIFRyZWVGcmFnbWVudCwgc3RyaW5nSW5wdXQgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRyZWUuZXMuanMubWFwXG4iLCJpbXBvcnQgeyBEZWZhdWx0QnVmZmVyTGVuZ3RoLCBOb2RlU2V0LCBOb2RlVHlwZSwgc3RyaW5nSW5wdXQsIFRyZWUsIFRyZWVCdWZmZXIgfSBmcm9tICdsZXplci10cmVlJztcbmV4cG9ydCB7IE5vZGVQcm9wLCBOb2RlU2V0LCBOb2RlVHlwZSwgVHJlZSwgVHJlZUN1cnNvciB9IGZyb20gJ2xlemVyLXRyZWUnO1xuXG4vLy8gQSBwYXJzZSBzdGFjay4gVGhlc2UgYXJlIHVzZWQgaW50ZXJuYWxseSBieSB0aGUgcGFyc2VyIHRvIHRyYWNrXG4vLy8gcGFyc2luZyBwcm9ncmVzcy4gVGhleSBhbHNvIHByb3ZpZGUgc29tZSBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzXG4vLy8gdGhhdCBleHRlcm5hbCBjb2RlIHN1Y2ggYXMgYSB0b2tlbml6ZXIgY2FuIHVzZSB0byBnZXQgaW5mb3JtYXRpb25cbi8vLyBhYm91dCB0aGUgcGFyc2Ugc3RhdGUuXG5jbGFzcyBTdGFjayB7XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGNvbnN0cnVjdG9yKFxuICAgIC8vLyBBIHRoZSBwYXJzZSB0aGF0IHRoaXMgc3RhY2sgaXMgcGFydCBvZiBAaW50ZXJuYWxcbiAgICBwLCBcbiAgICAvLy8gSG9sZHMgc3RhdGUsIHBvcywgdmFsdWUgc3RhY2sgcG9zICgxNSBiaXRzIGFycmF5IGluZGV4LCAxNSBiaXRzXG4gICAgLy8vIGJ1ZmZlciBpbmRleCkgdHJpcGxldHMgZm9yIGFsbCBidXQgdGhlIHRvcCBzdGF0ZVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzdGFjaywgXG4gICAgLy8vIFRoZSBjdXJyZW50IHBhcnNlIHN0YXRlIEBpbnRlcm5hbFxuICAgIHN0YXRlLCBcbiAgICAvLyBUaGUgcG9zaXRpb24gYXQgd2hpY2ggdGhlIG5leHQgcmVkdWNlIHNob3VsZCB0YWtlIHBsYWNlLiBUaGlzXG4gICAgLy8gY2FuIGJlIGxlc3MgdGhhbiBgdGhpcy5wb3NgIHdoZW4gc2tpcHBlZCBleHByZXNzaW9ucyBoYXZlIGJlZW5cbiAgICAvLyBhZGRlZCB0byB0aGUgc3RhY2sgKHdoaWNoIHNob3VsZCBiZSBtb3ZlZCBvdXRzaWRlIG9mIHRoZSBuZXh0XG4gICAgLy8gcmVkdWN0aW9uKVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICByZWR1Y2VQb3MsIFxuICAgIC8vLyBUaGUgaW5wdXQgcG9zaXRpb24gdXAgdG8gd2hpY2ggdGhpcyBzdGFjayBoYXMgcGFyc2VkLlxuICAgIHBvcywgXG4gICAgLy8vIFRoZSBkeW5hbWljIHNjb3JlIG9mIHRoZSBzdGFjaywgaW5jbHVkaW5nIGR5bmFtaWMgcHJlY2VkZW5jZVxuICAgIC8vLyBhbmQgZXJyb3ItcmVjb3ZlcnkgcGVuYWx0aWVzXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHNjb3JlLCBcbiAgICAvLyBUaGUgb3V0cHV0IGJ1ZmZlci4gSG9sZHMgKHR5cGUsIHN0YXJ0LCBlbmQsIHNpemUpIHF1YWRzXG4gICAgLy8gcmVwcmVzZW50aW5nIG5vZGVzIGNyZWF0ZWQgYnkgdGhlIHBhcnNlciwgd2hlcmUgYHNpemVgIGlzXG4gICAgLy8gYW1vdW50IG9mIGJ1ZmZlciBhcnJheSBlbnRyaWVzIGNvdmVyZWQgYnkgdGhpcyBub2RlLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBidWZmZXIsIFxuICAgIC8vIFRoZSBiYXNlIG9mZnNldCBvZiB0aGUgYnVmZmVyLiBXaGVuIHN0YWNrcyBhcmUgc3BsaXQsIHRoZSBzcGxpdFxuICAgIC8vIGluc3RhbmNlIHNoYXJlZCB0aGUgYnVmZmVyIGhpc3Rvcnkgd2l0aCBpdHMgcGFyZW50IHVwIHRvXG4gICAgLy8gYGJ1ZmZlckJhc2VgLCB3aGljaCBpcyB0aGUgYWJzb2x1dGUgb2Zmc2V0IChpbmNsdWRpbmcgdGhlXG4gICAgLy8gb2Zmc2V0IG9mIHByZXZpb3VzIHNwbGl0cykgaW50byB0aGUgYnVmZmVyIGF0IHdoaWNoIHRoaXMgc3RhY2tcbiAgICAvLyBzdGFydHMgd3JpdGluZy5cbiAgICAvLy8gQGludGVybmFsXG4gICAgYnVmZmVyQmFzZSwgXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGN1ckNvbnRleHQsIFxuICAgIC8vIEEgcGFyZW50IHN0YWNrIGZyb20gd2hpY2ggdGhpcyB3YXMgc3BsaXQgb2ZmLCBpZiBhbnkuIFRoaXMgaXNcbiAgICAvLyBzZXQgdXAgc28gdGhhdCBpdCBhbHdheXMgcG9pbnRzIHRvIGEgc3RhY2sgdGhhdCBoYXMgc29tZVxuICAgIC8vIGFkZGl0aW9uYWwgYnVmZmVyIGNvbnRlbnQsIG5ldmVyIHRvIGEgc3RhY2sgd2l0aCBhbiBlcXVhbFxuICAgIC8vIGBidWZmZXJCYXNlYC5cbiAgICAvLy8gQGludGVybmFsXG4gICAgcGFyZW50KSB7XG4gICAgICAgIHRoaXMucCA9IHA7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBzdGFjaztcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICB0aGlzLnJlZHVjZVBvcyA9IHJlZHVjZVBvcztcbiAgICAgICAgdGhpcy5wb3MgPSBwb3M7XG4gICAgICAgIHRoaXMuc2NvcmUgPSBzY29yZTtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgIHRoaXMuYnVmZmVyQmFzZSA9IGJ1ZmZlckJhc2U7XG4gICAgICAgIHRoaXMuY3VyQ29udGV4dCA9IGN1ckNvbnRleHQ7XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiBgWyR7dGhpcy5zdGFjay5maWx0ZXIoKF8sIGkpID0+IGkgJSAzID09IDApLmNvbmNhdCh0aGlzLnN0YXRlKX1dQCR7dGhpcy5wb3N9JHt0aGlzLnNjb3JlID8gXCIhXCIgKyB0aGlzLnNjb3JlIDogXCJcIn1gO1xuICAgIH1cbiAgICAvLyBTdGFydCBhbiBlbXB0eSBzdGFja1xuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzdGF0aWMgc3RhcnQocCwgc3RhdGUsIHBvcyA9IDApIHtcbiAgICAgICAgbGV0IGN4ID0gcC5wYXJzZXIuY29udGV4dDtcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFjayhwLCBbXSwgc3RhdGUsIHBvcywgcG9zLCAwLCBbXSwgMCwgY3ggPyBuZXcgU3RhY2tDb250ZXh0KGN4LCBjeC5zdGFydCkgOiBudWxsLCBudWxsKTtcbiAgICB9XG4gICAgLy8vIFRoZSBzdGFjaydzIGN1cnJlbnQgW2NvbnRleHRdKCNsZXplci5Db250ZXh0VHJhY2tlcikgdmFsdWUsIGlmXG4gICAgLy8vIGFueS4gSXRzIHR5cGUgd2lsbCBkZXBlbmQgb24gdGhlIGNvbnRleHQgdHJhY2tlcidzIHR5cGVcbiAgICAvLy8gcGFyYW1ldGVyLCBvciBpdCB3aWxsIGJlIGBudWxsYCBpZiB0aGVyZSBpcyBubyBjb250ZXh0XG4gICAgLy8vIHRyYWNrZXIuXG4gICAgZ2V0IGNvbnRleHQoKSB7IHJldHVybiB0aGlzLmN1ckNvbnRleHQgPyB0aGlzLmN1ckNvbnRleHQuY29udGV4dCA6IG51bGw7IH1cbiAgICAvLyBQdXNoIGEgc3RhdGUgb250byB0aGUgc3RhY2ssIHRyYWNraW5nIGl0cyBzdGFydCBwb3NpdGlvbiBhcyB3ZWxsXG4gICAgLy8gYXMgdGhlIGJ1ZmZlciBiYXNlIGF0IHRoYXQgcG9pbnQuXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHB1c2hTdGF0ZShzdGF0ZSwgc3RhcnQpIHtcbiAgICAgICAgdGhpcy5zdGFjay5wdXNoKHRoaXMuc3RhdGUsIHN0YXJ0LCB0aGlzLmJ1ZmZlckJhc2UgKyB0aGlzLmJ1ZmZlci5sZW5ndGgpO1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgfVxuICAgIC8vIEFwcGx5IGEgcmVkdWNlIGFjdGlvblxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICByZWR1Y2UoYWN0aW9uKSB7XG4gICAgICAgIGxldCBkZXB0aCA9IGFjdGlvbiA+PiAxOSAvKiBSZWR1Y2VEZXB0aFNoaWZ0ICovLCB0eXBlID0gYWN0aW9uICYgNjU1MzUgLyogVmFsdWVNYXNrICovO1xuICAgICAgICBsZXQgeyBwYXJzZXIgfSA9IHRoaXMucDtcbiAgICAgICAgbGV0IGRQcmVjID0gcGFyc2VyLmR5bmFtaWNQcmVjZWRlbmNlKHR5cGUpO1xuICAgICAgICBpZiAoZFByZWMpXG4gICAgICAgICAgICB0aGlzLnNjb3JlICs9IGRQcmVjO1xuICAgICAgICBpZiAoZGVwdGggPT0gMCkge1xuICAgICAgICAgICAgLy8gWmVyby1kZXB0aCByZWR1Y3Rpb25zIGFyZSBhIHNwZWNpYWwgY2FzZeKAlHRoZXkgYWRkIHN0dWZmIHRvXG4gICAgICAgICAgICAvLyB0aGUgc3RhY2sgd2l0aG91dCBwb3BwaW5nIGFueXRoaW5nIG9mZi5cbiAgICAgICAgICAgIGlmICh0eXBlIDwgcGFyc2VyLm1pblJlcGVhdFRlcm0pXG4gICAgICAgICAgICAgICAgdGhpcy5zdG9yZU5vZGUodHlwZSwgdGhpcy5yZWR1Y2VQb3MsIHRoaXMucmVkdWNlUG9zLCA0LCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlKHBhcnNlci5nZXRHb3RvKHRoaXMuc3RhdGUsIHR5cGUsIHRydWUpLCB0aGlzLnJlZHVjZVBvcyk7XG4gICAgICAgICAgICB0aGlzLnJlZHVjZUNvbnRleHQodHlwZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmluZCB0aGUgYmFzZSBpbmRleCBpbnRvIGB0aGlzLnN0YWNrYCwgY29udGVudCBhZnRlciB3aGljaCB3aWxsXG4gICAgICAgIC8vIGJlIGRyb3BwZWQuIE5vdGUgdGhhdCB3aXRoIGBTdGF5RmxhZ2AgcmVkdWN0aW9ucyB3ZSBuZWVkIHRvXG4gICAgICAgIC8vIGNvbnN1bWUgdHdvIGV4dHJhIGZyYW1lcyAodGhlIGR1bW15IHBhcmVudCBub2RlIGZvciB0aGUgc2tpcHBlZFxuICAgICAgICAvLyBleHByZXNzaW9uIGFuZCB0aGUgc3RhdGUgdGhhdCB3ZSdsbCBiZSBzdGF5aW5nIGluLCB3aGljaCBzaG91bGRcbiAgICAgICAgLy8gYmUgbW92ZWQgdG8gYHRoaXMuc3RhdGVgKS5cbiAgICAgICAgbGV0IGJhc2UgPSB0aGlzLnN0YWNrLmxlbmd0aCAtICgoZGVwdGggLSAxKSAqIDMpIC0gKGFjdGlvbiAmIDI2MjE0NCAvKiBTdGF5RmxhZyAqLyA/IDYgOiAwKTtcbiAgICAgICAgbGV0IHN0YXJ0ID0gdGhpcy5zdGFja1tiYXNlIC0gMl07XG4gICAgICAgIGxldCBidWZmZXJCYXNlID0gdGhpcy5zdGFja1tiYXNlIC0gMV0sIGNvdW50ID0gdGhpcy5idWZmZXJCYXNlICsgdGhpcy5idWZmZXIubGVuZ3RoIC0gYnVmZmVyQmFzZTtcbiAgICAgICAgLy8gU3RvcmUgbm9ybWFsIHRlcm1zIG9yIGBSIC0+IFIgUmAgcmVwZWF0IHJlZHVjdGlvbnNcbiAgICAgICAgaWYgKHR5cGUgPCBwYXJzZXIubWluUmVwZWF0VGVybSB8fCAoYWN0aW9uICYgMTMxMDcyIC8qIFJlcGVhdEZsYWcgKi8pKSB7XG4gICAgICAgICAgICBsZXQgcG9zID0gcGFyc2VyLnN0YXRlRmxhZyh0aGlzLnN0YXRlLCAxIC8qIFNraXBwZWQgKi8pID8gdGhpcy5wb3MgOiB0aGlzLnJlZHVjZVBvcztcbiAgICAgICAgICAgIHRoaXMuc3RvcmVOb2RlKHR5cGUsIHN0YXJ0LCBwb3MsIGNvdW50ICsgNCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFjdGlvbiAmIDI2MjE0NCAvKiBTdGF5RmxhZyAqLykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuc3RhY2tbYmFzZV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgYmFzZVN0YXRlSUQgPSB0aGlzLnN0YWNrW2Jhc2UgLSAzXTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBwYXJzZXIuZ2V0R290byhiYXNlU3RhdGVJRCwgdHlwZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHRoaXMuc3RhY2subGVuZ3RoID4gYmFzZSlcbiAgICAgICAgICAgIHRoaXMuc3RhY2sucG9wKCk7XG4gICAgICAgIHRoaXMucmVkdWNlQ29udGV4dCh0eXBlKTtcbiAgICB9XG4gICAgLy8gU2hpZnQgYSB2YWx1ZSBpbnRvIHRoZSBidWZmZXJcbiAgICAvLy8gQGludGVybmFsXG4gICAgc3RvcmVOb2RlKHRlcm0sIHN0YXJ0LCBlbmQsIHNpemUgPSA0LCBpc1JlZHVjZSA9IGZhbHNlKSB7XG4gICAgICAgIGlmICh0ZXJtID09IDAgLyogRXJyICovKSB7IC8vIFRyeSB0byBvbWl0L21lcmdlIGFkamFjZW50IGVycm9yIG5vZGVzXG4gICAgICAgICAgICBsZXQgY3VyID0gdGhpcywgdG9wID0gdGhpcy5idWZmZXIubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRvcCA9PSAwICYmIGN1ci5wYXJlbnQpIHtcbiAgICAgICAgICAgICAgICB0b3AgPSBjdXIuYnVmZmVyQmFzZSAtIGN1ci5wYXJlbnQuYnVmZmVyQmFzZTtcbiAgICAgICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvcCA+IDAgJiYgY3VyLmJ1ZmZlclt0b3AgLSA0XSA9PSAwIC8qIEVyciAqLyAmJiBjdXIuYnVmZmVyW3RvcCAtIDFdID4gLTEpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhcnQgPT0gZW5kKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKGN1ci5idWZmZXJbdG9wIC0gMl0gPj0gc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VyLmJ1ZmZlclt0b3AgLSAyXSA9IGVuZDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzUmVkdWNlIHx8IHRoaXMucG9zID09IGVuZCkgeyAvLyBTaW1wbGUgY2FzZSwganVzdCBhcHBlbmRcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyLnB1c2godGVybSwgc3RhcnQsIGVuZCwgc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7IC8vIFRoZXJlIG1heSBiZSBza2lwcGVkIG5vZGVzIHRoYXQgaGF2ZSB0byBiZSBtb3ZlZCBmb3J3YXJkXG4gICAgICAgICAgICBsZXQgaW5kZXggPSB0aGlzLmJ1ZmZlci5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoaW5kZXggPiAwICYmIHRoaXMuYnVmZmVyW2luZGV4IC0gNF0gIT0gMCAvKiBFcnIgKi8pXG4gICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4ID4gMCAmJiB0aGlzLmJ1ZmZlcltpbmRleCAtIDJdID4gZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1vdmUgdGhpcyByZWNvcmQgZm9yd2FyZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleF0gPSB0aGlzLmJ1ZmZlcltpbmRleCAtIDRdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleCArIDFdID0gdGhpcy5idWZmZXJbaW5kZXggLSAzXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXggKyAyXSA9IHRoaXMuYnVmZmVyW2luZGV4IC0gMl07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4ICsgM10gPSB0aGlzLmJ1ZmZlcltpbmRleCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAtPSA0O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2l6ZSA+IDQpXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplIC09IDQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5idWZmZXJbaW5kZXhdID0gdGVybTtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4ICsgMV0gPSBzdGFydDtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyW2luZGV4ICsgMl0gPSBlbmQ7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlcltpbmRleCArIDNdID0gc2l6ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBBcHBseSBhIHNoaWZ0IGFjdGlvblxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBzaGlmdChhY3Rpb24sIG5leHQsIG5leHRFbmQpIHtcbiAgICAgICAgaWYgKGFjdGlvbiAmIDEzMTA3MiAvKiBHb3RvRmxhZyAqLykge1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGUoYWN0aW9uICYgNjU1MzUgLyogVmFsdWVNYXNrICovLCB0aGlzLnBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoKGFjdGlvbiAmIDI2MjE0NCAvKiBTdGF5RmxhZyAqLykgPT0gMCkgeyAvLyBSZWd1bGFyIHNoaWZ0XG4gICAgICAgICAgICBsZXQgc3RhcnQgPSB0aGlzLnBvcywgbmV4dFN0YXRlID0gYWN0aW9uLCB7IHBhcnNlciB9ID0gdGhpcy5wO1xuICAgICAgICAgICAgaWYgKG5leHRFbmQgPiB0aGlzLnBvcyB8fCBuZXh0IDw9IHBhcnNlci5tYXhOb2RlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3MgPSBuZXh0RW5kO1xuICAgICAgICAgICAgICAgIGlmICghcGFyc2VyLnN0YXRlRmxhZyhuZXh0U3RhdGUsIDEgLyogU2tpcHBlZCAqLykpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVkdWNlUG9zID0gbmV4dEVuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlKG5leHRTdGF0ZSwgc3RhcnQpO1xuICAgICAgICAgICAgaWYgKG5leHQgPD0gcGFyc2VyLm1heE5vZGUpXG4gICAgICAgICAgICAgICAgdGhpcy5idWZmZXIucHVzaChuZXh0LCBzdGFydCwgbmV4dEVuZCwgNCk7XG4gICAgICAgICAgICB0aGlzLnNoaWZ0Q29udGV4dChuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHsgLy8gU2hpZnQtYW5kLXN0YXksIHdoaWNoIG1lYW5zIHRoaXMgaXMgYSBza2lwcGVkIHRva2VuXG4gICAgICAgICAgICBpZiAobmV4dCA8PSB0aGlzLnAucGFyc2VyLm1heE5vZGUpXG4gICAgICAgICAgICAgICAgdGhpcy5idWZmZXIucHVzaChuZXh0LCB0aGlzLnBvcywgbmV4dEVuZCwgNCk7XG4gICAgICAgICAgICB0aGlzLnBvcyA9IG5leHRFbmQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQXBwbHkgYW4gYWN0aW9uXG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGFwcGx5KGFjdGlvbiwgbmV4dCwgbmV4dEVuZCkge1xuICAgICAgICBpZiAoYWN0aW9uICYgNjU1MzYgLyogUmVkdWNlRmxhZyAqLylcbiAgICAgICAgICAgIHRoaXMucmVkdWNlKGFjdGlvbik7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuc2hpZnQoYWN0aW9uLCBuZXh0LCBuZXh0RW5kKTtcbiAgICB9XG4gICAgLy8gQWRkIGEgcHJlYnVpbHQgbm9kZSBpbnRvIHRoZSBidWZmZXIuIFRoaXMgbWF5IGJlIGEgcmV1c2VkIG5vZGUgb3JcbiAgICAvLyB0aGUgcmVzdWx0IG9mIHJ1bm5pbmcgYSBuZXN0ZWQgcGFyc2VyLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB1c2VOb2RlKHZhbHVlLCBuZXh0KSB7XG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMucC5yZXVzZWQubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLnAucmV1c2VkW2luZGV4XSAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5wLnJldXNlZC5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0YXJ0ID0gdGhpcy5wb3M7XG4gICAgICAgIHRoaXMucmVkdWNlUG9zID0gdGhpcy5wb3MgPSBzdGFydCArIHZhbHVlLmxlbmd0aDtcbiAgICAgICAgdGhpcy5wdXNoU3RhdGUobmV4dCwgc3RhcnQpO1xuICAgICAgICB0aGlzLmJ1ZmZlci5wdXNoKGluZGV4LCBzdGFydCwgdGhpcy5yZWR1Y2VQb3MsIC0xIC8qIHNpemUgPCAwIG1lYW5zIHRoaXMgaXMgYSByZXVzZWQgdmFsdWUgKi8pO1xuICAgICAgICBpZiAodGhpcy5jdXJDb250ZXh0KVxuICAgICAgICAgICAgdGhpcy51cGRhdGVDb250ZXh0KHRoaXMuY3VyQ29udGV4dC50cmFja2VyLnJldXNlKHRoaXMuY3VyQ29udGV4dC5jb250ZXh0LCB2YWx1ZSwgdGhpcy5wLmlucHV0LCB0aGlzKSk7XG4gICAgfVxuICAgIC8vIFNwbGl0IHRoZSBzdGFjay4gRHVlIHRvIHRoZSBidWZmZXIgc2hhcmluZyBhbmQgdGhlIGZhY3RcbiAgICAvLyB0aGF0IGB0aGlzLnN0YWNrYCB0ZW5kcyB0byBzdGF5IHF1aXRlIHNoYWxsb3csIHRoaXMgaXNuJ3QgdmVyeVxuICAgIC8vIGV4cGVuc2l2ZS5cbiAgICAvLy8gQGludGVybmFsXG4gICAgc3BsaXQoKSB7XG4gICAgICAgIGxldCBwYXJlbnQgPSB0aGlzO1xuICAgICAgICBsZXQgb2ZmID0gcGFyZW50LmJ1ZmZlci5sZW5ndGg7XG4gICAgICAgIC8vIEJlY2F1c2UgdGhlIHRvcCBvZiB0aGUgYnVmZmVyIChhZnRlciB0aGlzLnBvcykgbWF5IGJlIG11dGF0ZWRcbiAgICAgICAgLy8gdG8gcmVvcmRlciByZWR1Y3Rpb25zIGFuZCBza2lwcGVkIHRva2VucywgYW5kIHNoYXJlZCBidWZmZXJzXG4gICAgICAgIC8vIHNob3VsZCBiZSBpbW11dGFibGUsIHRoaXMgY29waWVzIGFueSBvdXRzdGFuZGluZyBza2lwcGVkIHRva2Vuc1xuICAgICAgICAvLyB0byB0aGUgbmV3IGJ1ZmZlciwgYW5kIHB1dHMgdGhlIGJhc2UgcG9pbnRlciBiZWZvcmUgdGhlbS5cbiAgICAgICAgd2hpbGUgKG9mZiA+IDAgJiYgcGFyZW50LmJ1ZmZlcltvZmYgLSAyXSA+IHBhcmVudC5yZWR1Y2VQb3MpXG4gICAgICAgICAgICBvZmYgLT0gNDtcbiAgICAgICAgbGV0IGJ1ZmZlciA9IHBhcmVudC5idWZmZXIuc2xpY2Uob2ZmKSwgYmFzZSA9IHBhcmVudC5idWZmZXJCYXNlICsgb2ZmO1xuICAgICAgICAvLyBNYWtlIHN1cmUgcGFyZW50IHBvaW50cyB0byBhbiBhY3R1YWwgcGFyZW50IHdpdGggY29udGVudCwgaWYgdGhlcmUgaXMgc3VjaCBhIHBhcmVudC5cbiAgICAgICAgd2hpbGUgKHBhcmVudCAmJiBiYXNlID09IHBhcmVudC5idWZmZXJCYXNlKVxuICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFjayh0aGlzLnAsIHRoaXMuc3RhY2suc2xpY2UoKSwgdGhpcy5zdGF0ZSwgdGhpcy5yZWR1Y2VQb3MsIHRoaXMucG9zLCB0aGlzLnNjb3JlLCBidWZmZXIsIGJhc2UsIHRoaXMuY3VyQ29udGV4dCwgcGFyZW50KTtcbiAgICB9XG4gICAgLy8gVHJ5IHRvIHJlY292ZXIgZnJvbSBhbiBlcnJvciBieSAnZGVsZXRpbmcnIChpZ25vcmluZykgb25lIHRva2VuLlxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICByZWNvdmVyQnlEZWxldGUobmV4dCwgbmV4dEVuZCkge1xuICAgICAgICBsZXQgaXNOb2RlID0gbmV4dCA8PSB0aGlzLnAucGFyc2VyLm1heE5vZGU7XG4gICAgICAgIGlmIChpc05vZGUpXG4gICAgICAgICAgICB0aGlzLnN0b3JlTm9kZShuZXh0LCB0aGlzLnBvcywgbmV4dEVuZCk7XG4gICAgICAgIHRoaXMuc3RvcmVOb2RlKDAgLyogRXJyICovLCB0aGlzLnBvcywgbmV4dEVuZCwgaXNOb2RlID8gOCA6IDQpO1xuICAgICAgICB0aGlzLnBvcyA9IHRoaXMucmVkdWNlUG9zID0gbmV4dEVuZDtcbiAgICAgICAgdGhpcy5zY29yZSAtPSAyMDAgLyogVG9rZW4gKi87XG4gICAgfVxuICAgIC8vLyBDaGVjayBpZiB0aGUgZ2l2ZW4gdGVybSB3b3VsZCBiZSBhYmxlIHRvIGJlIHNoaWZ0ZWQgKG9wdGlvbmFsbHlcbiAgICAvLy8gYWZ0ZXIgc29tZSByZWR1Y3Rpb25zKSBvbiB0aGlzIHN0YWNrLiBUaGlzIGNhbiBiZSB1c2VmdWwgZm9yXG4gICAgLy8vIGV4dGVybmFsIHRva2VuaXplcnMgdGhhdCB3YW50IHRvIG1ha2Ugc3VyZSB0aGV5IG9ubHkgcHJvdmlkZSBhXG4gICAgLy8vIGdpdmVuIHRva2VuIHdoZW4gaXQgYXBwbGllcy5cbiAgICBjYW5TaGlmdCh0ZXJtKSB7XG4gICAgICAgIGZvciAobGV0IHNpbSA9IG5ldyBTaW11bGF0ZWRTdGFjayh0aGlzKTs7KSB7XG4gICAgICAgICAgICBsZXQgYWN0aW9uID0gdGhpcy5wLnBhcnNlci5zdGF0ZVNsb3Qoc2ltLnRvcCwgNCAvKiBEZWZhdWx0UmVkdWNlICovKSB8fCB0aGlzLnAucGFyc2VyLmhhc0FjdGlvbihzaW0udG9wLCB0ZXJtKTtcbiAgICAgICAgICAgIGlmICgoYWN0aW9uICYgNjU1MzYgLyogUmVkdWNlRmxhZyAqLykgPT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBzaW0ucmVkdWNlKGFjdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIEZpbmQgdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSBydWxlIHRoYXQgaXMgY3VycmVudGx5IGJlaW5nIHBhcnNlZC5cbiAgICBnZXQgcnVsZVN0YXJ0KCkge1xuICAgICAgICBmb3IgKGxldCBzdGF0ZSA9IHRoaXMuc3RhdGUsIGJhc2UgPSB0aGlzLnN0YWNrLmxlbmd0aDs7KSB7XG4gICAgICAgICAgICBsZXQgZm9yY2UgPSB0aGlzLnAucGFyc2VyLnN0YXRlU2xvdChzdGF0ZSwgNSAvKiBGb3JjZWRSZWR1Y2UgKi8pO1xuICAgICAgICAgICAgaWYgKCEoZm9yY2UgJiA2NTUzNiAvKiBSZWR1Y2VGbGFnICovKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIGJhc2UgLT0gMyAqIChmb3JjZSA+PiAxOSAvKiBSZWR1Y2VEZXB0aFNoaWZ0ICovKTtcbiAgICAgICAgICAgIGlmICgoZm9yY2UgJiA2NTUzNSAvKiBWYWx1ZU1hc2sgKi8pIDwgdGhpcy5wLnBhcnNlci5taW5SZXBlYXRUZXJtKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YWNrW2Jhc2UgKyAxXTtcbiAgICAgICAgICAgIHN0YXRlID0gdGhpcy5zdGFja1tiYXNlXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLy8gRmluZCB0aGUgc3RhcnQgcG9zaXRpb24gb2YgYW4gaW5zdGFuY2Ugb2YgYW55IG9mIHRoZSBnaXZlbiB0ZXJtXG4gICAgLy8vIHR5cGVzLCBvciByZXR1cm4gYG51bGxgIHdoZW4gbm9uZSBvZiB0aGVtIGFyZSBmb3VuZC5cbiAgICAvLy9cbiAgICAvLy8gKipOb3RlOioqIHRoaXMgaXMgb25seSByZWxpYWJsZSB3aGVuIHRoZXJlIGlzIGF0IGxlYXN0IHNvbWVcbiAgICAvLy8gc3RhdGUgdGhhdCB1bmFtYmlndW91c2x5IG1hdGNoZXMgdGhlIGdpdmVuIHJ1bGUgb24gdGhlIHN0YWNrLlxuICAgIC8vLyBJLmUuIGlmIHlvdSBoYXZlIGEgZ3JhbW1hciBsaWtlIHRoaXMsIHdoZXJlIHRoZSBkaWZmZXJlbmNlXG4gICAgLy8vIGJldHdlZW4gYGFgIGFuZCBgYmAgaXMgb25seSBhcHBhcmVudCBhdCB0aGUgdGhpcmQgdG9rZW46XG4gICAgLy8vXG4gICAgLy8vICAgICBhIHsgYiB8IGMgfVxuICAgIC8vLyAgICAgYiB7IFwieFwiIFwieVwiIFwieFwiIH1cbiAgICAvLy8gICAgIGMgeyBcInhcIiBcInlcIiBcInpcIiB9XG4gICAgLy8vXG4gICAgLy8vIFRoZW4gYSBwYXJzZSBzdGF0ZSBhZnRlciBgXCJ4XCJgIHdpbGwgbm90IHJlbGlhYmx5IHRlbGwgeW91IHRoYXRcbiAgICAvLy8gYGJgIGlzIG9uIHRoZSBzdGFjay4gWW91IF9jYW5fIHBhc3MgYFtiLCBjXWAgdG8gcmVsaWFibHkgY2hlY2tcbiAgICAvLy8gZm9yIGVpdGhlciBvZiB0aG9zZSB0d28gcnVsZXMgKGFzc3VtaW5nIHRoYXQgYGFgIGlzbid0IHBhcnQgb2ZcbiAgICAvLy8gc29tZSBydWxlIHRoYXQgaW5jbHVkZXMgb3RoZXIgdGhpbmdzIHN0YXJ0aW5nIHdpdGggYFwieFwiYCkuXG4gICAgLy8vXG4gICAgLy8vIFdoZW4gYGJlZm9yZWAgaXMgZ2l2ZW4sIHRoaXMga2VlcHMgc2Nhbm5pbmcgdXAgdGhlIHN0YWNrIHVudGlsXG4gICAgLy8vIGl0IGZpbmRzIGEgbWF0Y2ggdGhhdCBzdGFydHMgYmVmb3JlIHRoYXQgcG9zaXRpb24uXG4gICAgLy8vXG4gICAgLy8vIE5vdGUgdGhhdCB5b3UgaGF2ZSB0byBiZSBjYXJlZnVsIHdoZW4gdXNpbmcgdGhpcyBpbiB0b2tlbml6ZXJzLFxuICAgIC8vLyBzaW5jZSBpdCdzIHJlbGF0aXZlbHkgZWFzeSB0byBpbnRyb2R1Y2UgZGF0YSBkZXBlbmRlbmNpZXMgdGhhdFxuICAgIC8vLyBicmVhayBpbmNyZW1lbnRhbCBwYXJzaW5nIGJ5IHVzaW5nIHRoaXMgbWV0aG9kLlxuICAgIHN0YXJ0T2YodHlwZXMsIGJlZm9yZSkge1xuICAgICAgICBsZXQgc3RhdGUgPSB0aGlzLnN0YXRlLCBmcmFtZSA9IHRoaXMuc3RhY2subGVuZ3RoLCB7IHBhcnNlciB9ID0gdGhpcy5wO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBsZXQgZm9yY2UgPSBwYXJzZXIuc3RhdGVTbG90KHN0YXRlLCA1IC8qIEZvcmNlZFJlZHVjZSAqLyk7XG4gICAgICAgICAgICBsZXQgZGVwdGggPSBmb3JjZSA+PiAxOSAvKiBSZWR1Y2VEZXB0aFNoaWZ0ICovLCB0ZXJtID0gZm9yY2UgJiA2NTUzNSAvKiBWYWx1ZU1hc2sgKi87XG4gICAgICAgICAgICBpZiAodHlwZXMuaW5kZXhPZih0ZXJtKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgbGV0IGJhc2UgPSBmcmFtZSAtICgzICogKGZvcmNlID4+IDE5IC8qIFJlZHVjZURlcHRoU2hpZnQgKi8pKSwgcG9zID0gdGhpcy5zdGFja1tiYXNlICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGJlZm9yZSA9PSBudWxsIHx8IGJlZm9yZSA+IHBvcylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBvcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmcmFtZSA9PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgaWYgKGRlcHRoID09IDApIHtcbiAgICAgICAgICAgICAgICBmcmFtZSAtPSAzO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gdGhpcy5zdGFja1tmcmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmcmFtZSAtPSAzICogKGRlcHRoIC0gMSk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBwYXJzZXIuZ2V0R290byh0aGlzLnN0YWNrW2ZyYW1lIC0gM10sIHRlcm0sIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEFwcGx5IHVwIHRvIFJlY292ZXIuTWF4TmV4dCByZWNvdmVyeSBhY3Rpb25zIHRoYXQgY29uY2VwdHVhbGx5XG4gICAgLy8gaW5zZXJ0cyBzb21lIG1pc3NpbmcgdG9rZW4gb3IgcnVsZS5cbiAgICAvLy8gQGludGVybmFsXG4gICAgcmVjb3ZlckJ5SW5zZXJ0KG5leHQpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhY2subGVuZ3RoID49IDMwMCAvKiBNYXhJbnNlcnRTdGFja0RlcHRoICovKVxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICBsZXQgbmV4dFN0YXRlcyA9IHRoaXMucC5wYXJzZXIubmV4dFN0YXRlcyh0aGlzLnN0YXRlKTtcbiAgICAgICAgaWYgKG5leHRTdGF0ZXMubGVuZ3RoID4gNCAvKiBNYXhOZXh0ICovIDw8IDEgfHwgdGhpcy5zdGFjay5sZW5ndGggPj0gMTIwIC8qIERhbXBlbkluc2VydFN0YWNrRGVwdGggKi8pIHtcbiAgICAgICAgICAgIGxldCBiZXN0ID0gW107XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgczsgaSA8IG5leHRTdGF0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHMgPSBuZXh0U3RhdGVzW2kgKyAxXSkgIT0gdGhpcy5zdGF0ZSAmJiB0aGlzLnAucGFyc2VyLmhhc0FjdGlvbihzLCBuZXh0KSlcbiAgICAgICAgICAgICAgICAgICAgYmVzdC5wdXNoKG5leHRTdGF0ZXNbaV0sIHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhY2subGVuZ3RoIDwgMTIwIC8qIERhbXBlbkluc2VydFN0YWNrRGVwdGggKi8pXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGJlc3QubGVuZ3RoIDwgNCAvKiBNYXhOZXh0ICovIDw8IDEgJiYgaSA8IG5leHRTdGF0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHMgPSBuZXh0U3RhdGVzW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFiZXN0LnNvbWUoKHYsIGkpID0+IChpICYgMSkgJiYgdiA9PSBzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlc3QucHVzaChuZXh0U3RhdGVzW2ldLCBzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0U3RhdGVzID0gYmVzdDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmV4dFN0YXRlcy5sZW5ndGggJiYgcmVzdWx0Lmxlbmd0aCA8IDQgLyogTWF4TmV4dCAqLzsgaSArPSAyKSB7XG4gICAgICAgICAgICBsZXQgcyA9IG5leHRTdGF0ZXNbaSArIDFdO1xuICAgICAgICAgICAgaWYgKHMgPT0gdGhpcy5zdGF0ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGxldCBzdGFjayA9IHRoaXMuc3BsaXQoKTtcbiAgICAgICAgICAgIHN0YWNrLnN0b3JlTm9kZSgwIC8qIEVyciAqLywgc3RhY2sucG9zLCBzdGFjay5wb3MsIDQsIHRydWUpO1xuICAgICAgICAgICAgc3RhY2sucHVzaFN0YXRlKHMsIHRoaXMucG9zKTtcbiAgICAgICAgICAgIHN0YWNrLnNoaWZ0Q29udGV4dChuZXh0U3RhdGVzW2ldKTtcbiAgICAgICAgICAgIHN0YWNrLnNjb3JlIC09IDIwMCAvKiBUb2tlbiAqLztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHN0YWNrKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLyBGb3JjZSBhIHJlZHVjZSwgaWYgcG9zc2libGUuIFJldHVybiBmYWxzZSBpZiB0aGF0IGNhbid0XG4gICAgLy8gYmUgZG9uZS5cbiAgICAvLy8gQGludGVybmFsXG4gICAgZm9yY2VSZWR1Y2UoKSB7XG4gICAgICAgIGxldCByZWR1Y2UgPSB0aGlzLnAucGFyc2VyLnN0YXRlU2xvdCh0aGlzLnN0YXRlLCA1IC8qIEZvcmNlZFJlZHVjZSAqLyk7XG4gICAgICAgIGlmICgocmVkdWNlICYgNjU1MzYgLyogUmVkdWNlRmxhZyAqLykgPT0gMClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnAucGFyc2VyLnZhbGlkQWN0aW9uKHRoaXMuc3RhdGUsIHJlZHVjZSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcmVOb2RlKDAgLyogRXJyICovLCB0aGlzLnJlZHVjZVBvcywgdGhpcy5yZWR1Y2VQb3MsIDQsIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zY29yZSAtPSAxMDAgLyogUmVkdWNlICovO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVkdWNlKHJlZHVjZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgZm9yY2VBbGwoKSB7XG4gICAgICAgIHdoaWxlICghdGhpcy5wLnBhcnNlci5zdGF0ZUZsYWcodGhpcy5zdGF0ZSwgMiAvKiBBY2NlcHRpbmcgKi8pICYmIHRoaXMuZm9yY2VSZWR1Y2UoKSkgeyB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvLy8gQ2hlY2sgd2hldGhlciB0aGlzIHN0YXRlIGhhcyBubyBmdXJ0aGVyIGFjdGlvbnMgKGFzc3VtZWQgdG8gYmUgYSBkaXJlY3QgZGVzY2VuZGFudCBvZiB0aGVcbiAgICAvLy8gdG9wIHN0YXRlLCBzaW5jZSBhbnkgb3RoZXIgc3RhdGVzIG11c3QgYmUgYWJsZSB0byBjb250aW51ZVxuICAgIC8vLyBzb21laG93KS4gQGludGVybmFsXG4gICAgZ2V0IGRlYWRFbmQoKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCAhPSAzKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBsZXQgeyBwYXJzZXIgfSA9IHRoaXMucDtcbiAgICAgICAgcmV0dXJuIHBhcnNlci5kYXRhW3BhcnNlci5zdGF0ZVNsb3QodGhpcy5zdGF0ZSwgMSAvKiBBY3Rpb25zICovKV0gPT0gNjU1MzUgLyogRW5kICovICYmXG4gICAgICAgICAgICAhcGFyc2VyLnN0YXRlU2xvdCh0aGlzLnN0YXRlLCA0IC8qIERlZmF1bHRSZWR1Y2UgKi8pO1xuICAgIH1cbiAgICAvLy8gUmVzdGFydCB0aGUgc3RhY2sgKHB1dCBpdCBiYWNrIGluIGl0cyBzdGFydCBzdGF0ZSkuIE9ubHkgc2FmZVxuICAgIC8vLyB3aGVuIHRoaXMuc3RhY2subGVuZ3RoID09IDMgKHN0YXRlIGlzIGRpcmVjdGx5IGJlbG93IHRoZSB0b3BcbiAgICAvLy8gc3RhdGUpLiBAaW50ZXJuYWxcbiAgICByZXN0YXJ0KCkge1xuICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5zdGFja1swXTtcbiAgICAgICAgdGhpcy5zdGFjay5sZW5ndGggPSAwO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgc2FtZVN0YXRlKG90aGVyKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9IG90aGVyLnN0YXRlIHx8IHRoaXMuc3RhY2subGVuZ3RoICE9IG90aGVyLnN0YWNrLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN0YWNrLmxlbmd0aDsgaSArPSAzKVxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhY2tbaV0gIT0gb3RoZXIuc3RhY2tbaV0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8vIEdldCB0aGUgcGFyc2VyIHVzZWQgYnkgdGhpcyBzdGFjay5cbiAgICBnZXQgcGFyc2VyKCkgeyByZXR1cm4gdGhpcy5wLnBhcnNlcjsgfVxuICAgIC8vLyBUZXN0IHdoZXRoZXIgYSBnaXZlbiBkaWFsZWN0IChieSBudW1lcmljIElELCBhcyBleHBvcnRlZCBmcm9tXG4gICAgLy8vIHRoZSB0ZXJtcyBmaWxlKSBpcyBlbmFibGVkLlxuICAgIGRpYWxlY3RFbmFibGVkKGRpYWxlY3RJRCkgeyByZXR1cm4gdGhpcy5wLnBhcnNlci5kaWFsZWN0LmZsYWdzW2RpYWxlY3RJRF07IH1cbiAgICBzaGlmdENvbnRleHQodGVybSkge1xuICAgICAgICBpZiAodGhpcy5jdXJDb250ZXh0KVxuICAgICAgICAgICAgdGhpcy51cGRhdGVDb250ZXh0KHRoaXMuY3VyQ29udGV4dC50cmFja2VyLnNoaWZ0KHRoaXMuY3VyQ29udGV4dC5jb250ZXh0LCB0ZXJtLCB0aGlzLnAuaW5wdXQsIHRoaXMpKTtcbiAgICB9XG4gICAgcmVkdWNlQ29udGV4dCh0ZXJtKSB7XG4gICAgICAgIGlmICh0aGlzLmN1ckNvbnRleHQpXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbnRleHQodGhpcy5jdXJDb250ZXh0LnRyYWNrZXIucmVkdWNlKHRoaXMuY3VyQ29udGV4dC5jb250ZXh0LCB0ZXJtLCB0aGlzLnAuaW5wdXQsIHRoaXMpKTtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIGVtaXRDb250ZXh0KCkge1xuICAgICAgICBsZXQgY3ggPSB0aGlzLmN1ckNvbnRleHQ7XG4gICAgICAgIGlmICghY3gudHJhY2tlci5zdHJpY3QpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGxldCBsYXN0ID0gdGhpcy5idWZmZXIubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGxhc3QgPCAwIHx8IHRoaXMuYnVmZmVyW2xhc3RdICE9IC0yKVxuICAgICAgICAgICAgdGhpcy5idWZmZXIucHVzaChjeC5oYXNoLCB0aGlzLnJlZHVjZVBvcywgdGhpcy5yZWR1Y2VQb3MsIC0yKTtcbiAgICB9XG4gICAgdXBkYXRlQ29udGV4dChjb250ZXh0KSB7XG4gICAgICAgIGlmIChjb250ZXh0ICE9IHRoaXMuY3VyQ29udGV4dC5jb250ZXh0KSB7XG4gICAgICAgICAgICBsZXQgbmV3Q3ggPSBuZXcgU3RhY2tDb250ZXh0KHRoaXMuY3VyQ29udGV4dC50cmFja2VyLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChuZXdDeC5oYXNoICE9IHRoaXMuY3VyQ29udGV4dC5oYXNoKVxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdENvbnRleHQoKTtcbiAgICAgICAgICAgIHRoaXMuY3VyQ29udGV4dCA9IG5ld0N4O1xuICAgICAgICB9XG4gICAgfVxufVxuY2xhc3MgU3RhY2tDb250ZXh0IHtcbiAgICBjb25zdHJ1Y3Rvcih0cmFja2VyLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMudHJhY2tlciA9IHRyYWNrZXI7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMuaGFzaCA9IHRyYWNrZXIuaGFzaChjb250ZXh0KTtcbiAgICB9XG59XG52YXIgUmVjb3ZlcjtcbihmdW5jdGlvbiAoUmVjb3Zlcikge1xuICAgIFJlY292ZXJbUmVjb3ZlcltcIlRva2VuXCJdID0gMjAwXSA9IFwiVG9rZW5cIjtcbiAgICBSZWNvdmVyW1JlY292ZXJbXCJSZWR1Y2VcIl0gPSAxMDBdID0gXCJSZWR1Y2VcIjtcbiAgICBSZWNvdmVyW1JlY292ZXJbXCJNYXhOZXh0XCJdID0gNF0gPSBcIk1heE5leHRcIjtcbiAgICBSZWNvdmVyW1JlY292ZXJbXCJNYXhJbnNlcnRTdGFja0RlcHRoXCJdID0gMzAwXSA9IFwiTWF4SW5zZXJ0U3RhY2tEZXB0aFwiO1xuICAgIFJlY292ZXJbUmVjb3ZlcltcIkRhbXBlbkluc2VydFN0YWNrRGVwdGhcIl0gPSAxMjBdID0gXCJEYW1wZW5JbnNlcnRTdGFja0RlcHRoXCI7XG59KShSZWNvdmVyIHx8IChSZWNvdmVyID0ge30pKTtcbi8vIFVzZWQgdG8gY2hlYXBseSBydW4gc29tZSByZWR1Y3Rpb25zIHRvIHNjYW4gYWhlYWQgd2l0aG91dCBtdXRhdGluZ1xuLy8gYW4gZW50aXJlIHN0YWNrXG5jbGFzcyBTaW11bGF0ZWRTdGFjayB7XG4gICAgY29uc3RydWN0b3Ioc3RhY2spIHtcbiAgICAgICAgdGhpcy5zdGFjayA9IHN0YWNrO1xuICAgICAgICB0aGlzLnRvcCA9IHN0YWNrLnN0YXRlO1xuICAgICAgICB0aGlzLnJlc3QgPSBzdGFjay5zdGFjaztcbiAgICAgICAgdGhpcy5vZmZzZXQgPSB0aGlzLnJlc3QubGVuZ3RoO1xuICAgIH1cbiAgICByZWR1Y2UoYWN0aW9uKSB7XG4gICAgICAgIGxldCB0ZXJtID0gYWN0aW9uICYgNjU1MzUgLyogVmFsdWVNYXNrICovLCBkZXB0aCA9IGFjdGlvbiA+PiAxOSAvKiBSZWR1Y2VEZXB0aFNoaWZ0ICovO1xuICAgICAgICBpZiAoZGVwdGggPT0gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzdCA9PSB0aGlzLnN0YWNrLnN0YWNrKVxuICAgICAgICAgICAgICAgIHRoaXMucmVzdCA9IHRoaXMucmVzdC5zbGljZSgpO1xuICAgICAgICAgICAgdGhpcy5yZXN0LnB1c2godGhpcy50b3AsIDAsIDApO1xuICAgICAgICAgICAgdGhpcy5vZmZzZXQgKz0gMztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0IC09IChkZXB0aCAtIDEpICogMztcbiAgICAgICAgfVxuICAgICAgICBsZXQgZ290byA9IHRoaXMuc3RhY2sucC5wYXJzZXIuZ2V0R290byh0aGlzLnJlc3RbdGhpcy5vZmZzZXQgLSAzXSwgdGVybSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMudG9wID0gZ290bztcbiAgICB9XG59XG4vLyBUaGlzIGlzIGdpdmVuIHRvIGBUcmVlLmJ1aWxkYCB0byBidWlsZCBhIGJ1ZmZlciwgYW5kIGVuY2Fwc3VsYXRlc1xuLy8gdGhlIHBhcmVudC1zdGFjay13YWxraW5nIG5lY2Vzc2FyeSB0byByZWFkIHRoZSBub2Rlcy5cbmNsYXNzIFN0YWNrQnVmZmVyQ3Vyc29yIHtcbiAgICBjb25zdHJ1Y3RvcihzdGFjaywgcG9zLCBpbmRleCkge1xuICAgICAgICB0aGlzLnN0YWNrID0gc3RhY2s7XG4gICAgICAgIHRoaXMucG9zID0gcG9zO1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gc3RhY2suYnVmZmVyO1xuICAgICAgICBpZiAodGhpcy5pbmRleCA9PSAwKVxuICAgICAgICAgICAgdGhpcy5tYXliZU5leHQoKTtcbiAgICB9XG4gICAgc3RhdGljIGNyZWF0ZShzdGFjaykge1xuICAgICAgICByZXR1cm4gbmV3IFN0YWNrQnVmZmVyQ3Vyc29yKHN0YWNrLCBzdGFjay5idWZmZXJCYXNlICsgc3RhY2suYnVmZmVyLmxlbmd0aCwgc3RhY2suYnVmZmVyLmxlbmd0aCk7XG4gICAgfVxuICAgIG1heWJlTmV4dCgpIHtcbiAgICAgICAgbGV0IG5leHQgPSB0aGlzLnN0YWNrLnBhcmVudDtcbiAgICAgICAgaWYgKG5leHQgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IHRoaXMuc3RhY2suYnVmZmVyQmFzZSAtIG5leHQuYnVmZmVyQmFzZTtcbiAgICAgICAgICAgIHRoaXMuc3RhY2sgPSBuZXh0O1xuICAgICAgICAgICAgdGhpcy5idWZmZXIgPSBuZXh0LmJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgaWQoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gNF07IH1cbiAgICBnZXQgc3RhcnQoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gM107IH1cbiAgICBnZXQgZW5kKCkgeyByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5pbmRleCAtIDJdOyB9XG4gICAgZ2V0IHNpemUoKSB7IHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmluZGV4IC0gMV07IH1cbiAgICBuZXh0KCkge1xuICAgICAgICB0aGlzLmluZGV4IC09IDQ7XG4gICAgICAgIHRoaXMucG9zIC09IDQ7XG4gICAgICAgIGlmICh0aGlzLmluZGV4ID09IDApXG4gICAgICAgICAgICB0aGlzLm1heWJlTmV4dCgpO1xuICAgIH1cbiAgICBmb3JrKCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0YWNrQnVmZmVyQ3Vyc29yKHRoaXMuc3RhY2ssIHRoaXMucG9zLCB0aGlzLmluZGV4KTtcbiAgICB9XG59XG5cbi8vLyBUb2tlbml6ZXJzIHdyaXRlIHRoZSB0b2tlbnMgdGhleSByZWFkIGludG8gaW5zdGFuY2VzIG9mIHRoaXMgY2xhc3MuXG5jbGFzcyBUb2tlbiB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8vLyBUaGUgc3RhcnQgb2YgdGhlIHRva2VuLiBUaGlzIGlzIHNldCBieSB0aGUgcGFyc2VyLCBhbmQgc2hvdWxkIG5vdFxuICAgICAgICAvLy8gYmUgbXV0YXRlZCBieSB0aGUgdG9rZW5pemVyLlxuICAgICAgICB0aGlzLnN0YXJ0ID0gLTE7XG4gICAgICAgIC8vLyBUaGlzIHN0YXJ0cyBhdCAtMSwgYW5kIHNob3VsZCBiZSB1cGRhdGVkIHRvIGEgdGVybSBpZCB3aGVuIGFcbiAgICAgICAgLy8vIG1hdGNoaW5nIHRva2VuIGlzIGZvdW5kLlxuICAgICAgICB0aGlzLnZhbHVlID0gLTE7XG4gICAgICAgIC8vLyBXaGVuIHNldHRpbmcgYC52YWx1ZWAsIHlvdSBzaG91bGQgYWxzbyBzZXQgYC5lbmRgIHRvIHRoZSBlbmRcbiAgICAgICAgLy8vIHBvc2l0aW9uIG9mIHRoZSB0b2tlbi4gKFlvdSdsbCB1c3VhbGx5IHdhbnQgdG8gdXNlIHRoZSBgYWNjZXB0YFxuICAgICAgICAvLy8gbWV0aG9kLilcbiAgICAgICAgdGhpcy5lbmQgPSAtMTtcbiAgICB9XG4gICAgLy8vIEFjY2VwdCBhIHRva2VuLCBzZXR0aW5nIGB2YWx1ZWAgYW5kIGBlbmRgIHRvIHRoZSBnaXZlbiB2YWx1ZXMuXG4gICAgYWNjZXB0KHZhbHVlLCBlbmQpIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLmVuZCA9IGVuZDtcbiAgICB9XG59XG4vLy8gQGludGVybmFsXG5jbGFzcyBUb2tlbkdyb3VwIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhLCBpZCkge1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgfVxuICAgIHRva2VuKGlucHV0LCB0b2tlbiwgc3RhY2spIHsgcmVhZFRva2VuKHRoaXMuZGF0YSwgaW5wdXQsIHRva2VuLCBzdGFjaywgdGhpcy5pZCk7IH1cbn1cblRva2VuR3JvdXAucHJvdG90eXBlLmNvbnRleHR1YWwgPSBUb2tlbkdyb3VwLnByb3RvdHlwZS5mYWxsYmFjayA9IFRva2VuR3JvdXAucHJvdG90eXBlLmV4dGVuZCA9IGZhbHNlO1xuLy8vIEV4cG9ydHMgdGhhdCBhcmUgdXNlZCBmb3IgYEBleHRlcm5hbCB0b2tlbnNgIGluIHRoZSBncmFtbWFyIHNob3VsZFxuLy8vIGV4cG9ydCBhbiBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzLlxuY2xhc3MgRXh0ZXJuYWxUb2tlbml6ZXIge1xuICAgIC8vLyBDcmVhdGUgYSB0b2tlbml6ZXIuIFRoZSBmaXJzdCBhcmd1bWVudCBpcyB0aGUgZnVuY3Rpb24gdGhhdCxcbiAgICAvLy8gZ2l2ZW4gYW4gaW5wdXQgc3RyZWFtIGFuZCBhIHRva2VuIG9iamVjdCxcbiAgICAvLy8gW2ZpbGxzXSgjbGV6ZXIuVG9rZW4uYWNjZXB0KSB0aGUgdG9rZW4gb2JqZWN0IGlmIGl0IHJlY29nbml6ZXMgYVxuICAgIC8vLyB0b2tlbi4gYHRva2VuLnN0YXJ0YCBzaG91bGQgYmUgdXNlZCBhcyB0aGUgc3RhcnQgcG9zaXRpb24gdG9cbiAgICAvLy8gc2NhbiBmcm9tLlxuICAgIGNvbnN0cnVjdG9yKFxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB0b2tlbiwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHRoaXMudG9rZW4gPSB0b2tlbjtcbiAgICAgICAgdGhpcy5jb250ZXh0dWFsID0gISFvcHRpb25zLmNvbnRleHR1YWw7XG4gICAgICAgIHRoaXMuZmFsbGJhY2sgPSAhIW9wdGlvbnMuZmFsbGJhY2s7XG4gICAgICAgIHRoaXMuZXh0ZW5kID0gISFvcHRpb25zLmV4dGVuZDtcbiAgICB9XG59XG4vLyBUb2tlbml6ZXIgZGF0YSBpcyBzdG9yZWQgYSBiaWcgdWludDE2IGFycmF5IGNvbnRhaW5pbmcsIGZvciBlYWNoXG4vLyBzdGF0ZTpcbi8vXG4vLyAgLSBBIGdyb3VwIGJpdG1hc2ssIGluZGljYXRpbmcgd2hhdCB0b2tlbiBncm91cHMgYXJlIHJlYWNoYWJsZSBmcm9tXG4vLyAgICB0aGlzIHN0YXRlLCBzbyB0aGF0IHBhdGhzIHRoYXQgY2FuIG9ubHkgbGVhZCB0byB0b2tlbnMgbm90IGluXG4vLyAgICBhbnkgb2YgdGhlIGN1cnJlbnQgZ3JvdXBzIGNhbiBiZSBjdXQgb2ZmIGVhcmx5LlxuLy9cbi8vICAtIFRoZSBwb3NpdGlvbiBvZiB0aGUgZW5kIG9mIHRoZSBzdGF0ZSdzIHNlcXVlbmNlIG9mIGFjY2VwdGluZ1xuLy8gICAgdG9rZW5zXG4vL1xuLy8gIC0gVGhlIG51bWJlciBvZiBvdXRnb2luZyBlZGdlcyBmb3IgdGhlIHN0YXRlXG4vL1xuLy8gIC0gVGhlIGFjY2VwdGluZyB0b2tlbnMsIGFzICh0b2tlbiBpZCwgZ3JvdXAgbWFzaykgcGFpcnNcbi8vXG4vLyAgLSBUaGUgb3V0Z29pbmcgZWRnZXMsIGFzIChzdGFydCBjaGFyYWN0ZXIsIGVuZCBjaGFyYWN0ZXIsIHN0YXRlXG4vLyAgICBpbmRleCkgdHJpcGxlcywgd2l0aCBlbmQgY2hhcmFjdGVyIGJlaW5nIGV4Y2x1c2l2ZVxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gaW50ZXJwcmV0cyB0aGF0IGRhdGEsIHJ1bm5pbmcgdGhyb3VnaCBhIHN0cmVhbSBhc1xuLy8gbG9uZyBhcyBuZXcgc3RhdGVzIHdpdGggdGhlIGEgbWF0Y2hpbmcgZ3JvdXAgbWFzayBjYW4gYmUgcmVhY2hlZCxcbi8vIGFuZCB1cGRhdGluZyBgdG9rZW5gIHdoZW4gaXQgbWF0Y2hlcyBhIHRva2VuLlxuZnVuY3Rpb24gcmVhZFRva2VuKGRhdGEsIGlucHV0LCB0b2tlbiwgc3RhY2ssIGdyb3VwKSB7XG4gICAgbGV0IHN0YXRlID0gMCwgZ3JvdXBNYXNrID0gMSA8PCBncm91cCwgZGlhbGVjdCA9IHN0YWNrLnAucGFyc2VyLmRpYWxlY3Q7XG4gICAgc2NhbjogZm9yIChsZXQgcG9zID0gdG9rZW4uc3RhcnQ7Oykge1xuICAgICAgICBpZiAoKGdyb3VwTWFzayAmIGRhdGFbc3RhdGVdKSA9PSAwKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGxldCBhY2NFbmQgPSBkYXRhW3N0YXRlICsgMV07XG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBzdGF0ZSBjYW4gbGVhZCB0byBhIHRva2VuIGluIHRoZSBjdXJyZW50IGdyb3VwXG4gICAgICAgIC8vIEFjY2VwdCB0b2tlbnMgaW4gdGhpcyBzdGF0ZSwgcG9zc2libHkgb3ZlcndyaXRpbmdcbiAgICAgICAgLy8gbG93ZXItcHJlY2VkZW5jZSAvIHNob3J0ZXIgdG9rZW5zXG4gICAgICAgIGZvciAobGV0IGkgPSBzdGF0ZSArIDM7IGkgPCBhY2NFbmQ7IGkgKz0gMilcbiAgICAgICAgICAgIGlmICgoZGF0YVtpICsgMV0gJiBncm91cE1hc2spID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCB0ZXJtID0gZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoZGlhbGVjdC5hbGxvd3ModGVybSkgJiZcbiAgICAgICAgICAgICAgICAgICAgKHRva2VuLnZhbHVlID09IC0xIHx8IHRva2VuLnZhbHVlID09IHRlcm0gfHwgc3RhY2sucC5wYXJzZXIub3ZlcnJpZGVzKHRlcm0sIHRva2VuLnZhbHVlKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uYWNjZXB0KHRlcm0sIHBvcyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgbGV0IG5leHQgPSBpbnB1dC5nZXQocG9zKyspO1xuICAgICAgICAvLyBEbyBhIGJpbmFyeSBzZWFyY2ggb24gdGhlIHN0YXRlJ3MgZWRnZXNcbiAgICAgICAgZm9yIChsZXQgbG93ID0gMCwgaGlnaCA9IGRhdGFbc3RhdGUgKyAyXTsgbG93IDwgaGlnaDspIHtcbiAgICAgICAgICAgIGxldCBtaWQgPSAobG93ICsgaGlnaCkgPj4gMTtcbiAgICAgICAgICAgIGxldCBpbmRleCA9IGFjY0VuZCArIG1pZCArIChtaWQgPDwgMSk7XG4gICAgICAgICAgICBsZXQgZnJvbSA9IGRhdGFbaW5kZXhdLCB0byA9IGRhdGFbaW5kZXggKyAxXTtcbiAgICAgICAgICAgIGlmIChuZXh0IDwgZnJvbSlcbiAgICAgICAgICAgICAgICBoaWdoID0gbWlkO1xuICAgICAgICAgICAgZWxzZSBpZiAobmV4dCA+PSB0bylcbiAgICAgICAgICAgICAgICBsb3cgPSBtaWQgKyAxO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBkYXRhW2luZGV4ICsgMl07XG4gICAgICAgICAgICAgICAgY29udGludWUgc2NhbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICB9XG59XG5cbi8vIFNlZSBsZXplci1nZW5lcmF0b3Ivc3JjL2VuY29kZS50cyBmb3IgY29tbWVudHMgYWJvdXQgdGhlIGVuY29kaW5nXG4vLyB1c2VkIGhlcmVcbmZ1bmN0aW9uIGRlY29kZUFycmF5KGlucHV0LCBUeXBlID0gVWludDE2QXJyYXkpIHtcbiAgICBpZiAodHlwZW9mIGlucHV0ICE9IFwic3RyaW5nXCIpXG4gICAgICAgIHJldHVybiBpbnB1dDtcbiAgICBsZXQgYXJyYXkgPSBudWxsO1xuICAgIGZvciAobGV0IHBvcyA9IDAsIG91dCA9IDA7IHBvcyA8IGlucHV0Lmxlbmd0aDspIHtcbiAgICAgICAgbGV0IHZhbHVlID0gMDtcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgbGV0IG5leHQgPSBpbnB1dC5jaGFyQ29kZUF0KHBvcysrKSwgc3RvcCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKG5leHQgPT0gMTI2IC8qIEJpZ1ZhbENvZGUgKi8pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IDY1NTM1IC8qIEJpZ1ZhbCAqLztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXh0ID49IDkyIC8qIEdhcDIgKi8pXG4gICAgICAgICAgICAgICAgbmV4dC0tO1xuICAgICAgICAgICAgaWYgKG5leHQgPj0gMzQgLyogR2FwMSAqLylcbiAgICAgICAgICAgICAgICBuZXh0LS07XG4gICAgICAgICAgICBsZXQgZGlnaXQgPSBuZXh0IC0gMzIgLyogU3RhcnQgKi87XG4gICAgICAgICAgICBpZiAoZGlnaXQgPj0gNDYgLyogQmFzZSAqLykge1xuICAgICAgICAgICAgICAgIGRpZ2l0IC09IDQ2IC8qIEJhc2UgKi87XG4gICAgICAgICAgICAgICAgc3RvcCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSArPSBkaWdpdDtcbiAgICAgICAgICAgIGlmIChzdG9wKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgdmFsdWUgKj0gNDYgLyogQmFzZSAqLztcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJyYXkpXG4gICAgICAgICAgICBhcnJheVtvdXQrK10gPSB2YWx1ZTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXJyYXkgPSBuZXcgVHlwZSh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbn1cblxuLy8gRklYTUUgZmluZCBzb21lIHdheSB0byByZWR1Y2UgcmVjb3Zlcnkgd29yayBkb25lIHdoZW4gdGhlIGlucHV0XG4vLyBkb2Vzbid0IG1hdGNoIHRoZSBncmFtbWFyIGF0IGFsbC5cbi8vIEVudmlyb25tZW50IHZhcmlhYmxlIHVzZWQgdG8gY29udHJvbCBjb25zb2xlIG91dHB1dFxuY29uc3QgdmVyYm9zZSA9IHR5cGVvZiBwcm9jZXNzICE9IFwidW5kZWZpbmVkXCIgJiYgL1xcYnBhcnNlXFxiLy50ZXN0KHByb2Nlc3MuZW52LkxPRyk7XG5sZXQgc3RhY2tJRHMgPSBudWxsO1xuZnVuY3Rpb24gY3V0QXQodHJlZSwgcG9zLCBzaWRlKSB7XG4gICAgbGV0IGN1cnNvciA9IHRyZWUuY3Vyc29yKHBvcyk7XG4gICAgZm9yICg7Oykge1xuICAgICAgICBpZiAoIShzaWRlIDwgMCA/IGN1cnNvci5jaGlsZEJlZm9yZShwb3MpIDogY3Vyc29yLmNoaWxkQWZ0ZXIocG9zKSkpXG4gICAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICAgICAgaWYgKChzaWRlIDwgMCA/IGN1cnNvci50byA8IHBvcyA6IGN1cnNvci5mcm9tID4gcG9zKSAmJiAhY3Vyc29yLnR5cGUuaXNFcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZGUgPCAwID8gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3Vyc29yLnRvIC0gMSwgcG9zIC0gNSkpIDogTWF0aC5taW4odHJlZS5sZW5ndGgsIE1hdGgubWF4KGN1cnNvci5mcm9tICsgMSwgcG9zICsgNSkpO1xuICAgICAgICAgICAgICAgIGlmIChzaWRlIDwgMCA/IGN1cnNvci5wcmV2U2libGluZygpIDogY3Vyc29yLm5leHRTaWJsaW5nKCkpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICghY3Vyc29yLnBhcmVudCgpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lkZSA8IDAgPyAwIDogdHJlZS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgfVxufVxuY2xhc3MgRnJhZ21lbnRDdXJzb3Ige1xuICAgIGNvbnN0cnVjdG9yKGZyYWdtZW50cykge1xuICAgICAgICB0aGlzLmZyYWdtZW50cyA9IGZyYWdtZW50cztcbiAgICAgICAgdGhpcy5pID0gMDtcbiAgICAgICAgdGhpcy5mcmFnbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuc2FmZUZyb20gPSAtMTtcbiAgICAgICAgdGhpcy5zYWZlVG8gPSAtMTtcbiAgICAgICAgdGhpcy50cmVlcyA9IFtdO1xuICAgICAgICB0aGlzLnN0YXJ0ID0gW107XG4gICAgICAgIHRoaXMuaW5kZXggPSBbXTtcbiAgICAgICAgdGhpcy5uZXh0RnJhZ21lbnQoKTtcbiAgICB9XG4gICAgbmV4dEZyYWdtZW50KCkge1xuICAgICAgICBsZXQgZnIgPSB0aGlzLmZyYWdtZW50ID0gdGhpcy5pID09IHRoaXMuZnJhZ21lbnRzLmxlbmd0aCA/IG51bGwgOiB0aGlzLmZyYWdtZW50c1t0aGlzLmkrK107XG4gICAgICAgIGlmIChmcikge1xuICAgICAgICAgICAgdGhpcy5zYWZlRnJvbSA9IGZyLm9wZW5TdGFydCA/IGN1dEF0KGZyLnRyZWUsIGZyLmZyb20gKyBmci5vZmZzZXQsIDEpIC0gZnIub2Zmc2V0IDogZnIuZnJvbTtcbiAgICAgICAgICAgIHRoaXMuc2FmZVRvID0gZnIub3BlbkVuZCA/IGN1dEF0KGZyLnRyZWUsIGZyLnRvICsgZnIub2Zmc2V0LCAtMSkgLSBmci5vZmZzZXQgOiBmci50bztcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRyZWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlZXMucG9wKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydC5wb3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy50cmVlcy5wdXNoKGZyLnRyZWUpO1xuICAgICAgICAgICAgdGhpcy5zdGFydC5wdXNoKC1mci5vZmZzZXQpO1xuICAgICAgICAgICAgdGhpcy5pbmRleC5wdXNoKDApO1xuICAgICAgICAgICAgdGhpcy5uZXh0U3RhcnQgPSB0aGlzLnNhZmVGcm9tO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5uZXh0U3RhcnQgPSAxZTk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gYHBvc2AgbXVzdCBiZSA+PSBhbnkgcHJldmlvdXNseSBnaXZlbiBgcG9zYCBmb3IgdGhpcyBjdXJzb3JcbiAgICBub2RlQXQocG9zKSB7XG4gICAgICAgIGlmIChwb3MgPCB0aGlzLm5leHRTdGFydClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB3aGlsZSAodGhpcy5mcmFnbWVudCAmJiB0aGlzLnNhZmVUbyA8PSBwb3MpXG4gICAgICAgICAgICB0aGlzLm5leHRGcmFnbWVudCgpO1xuICAgICAgICBpZiAoIXRoaXMuZnJhZ21lbnQpXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgbGV0IGxhc3QgPSB0aGlzLnRyZWVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBpZiAobGFzdCA8IDApIHsgLy8gRW5kIG9mIHRyZWVcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHRvcCA9IHRoaXMudHJlZXNbbGFzdF0sIGluZGV4ID0gdGhpcy5pbmRleFtsYXN0XTtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSB0b3AuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVlcy5wb3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0LnBvcCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXgucG9wKCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgbmV4dCA9IHRvcC5jaGlsZHJlbltpbmRleF07XG4gICAgICAgICAgICBsZXQgc3RhcnQgPSB0aGlzLnN0YXJ0W2xhc3RdICsgdG9wLnBvc2l0aW9uc1tpbmRleF07XG4gICAgICAgICAgICBpZiAoc3RhcnQgPiBwb3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRTdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc3RhcnQgPT0gcG9zICYmIHN0YXJ0ICsgbmV4dC5sZW5ndGggPD0gdGhpcy5zYWZlVG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RhcnQgPT0gcG9zICYmIHN0YXJ0ID49IHRoaXMuc2FmZUZyb20gPyBuZXh0IDogbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXh0IGluc3RhbmNlb2YgVHJlZUJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhbbGFzdF0rKztcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRTdGFydCA9IHN0YXJ0ICsgbmV4dC5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4W2xhc3RdKys7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0ICsgbmV4dC5sZW5ndGggPj0gcG9zKSB7IC8vIEVudGVyIHRoaXMgbm9kZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyZWVzLnB1c2gobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQucHVzaChzdGFydCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZXgucHVzaCgwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5jbGFzcyBDYWNoZWRUb2tlbiBleHRlbmRzIFRva2VuIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5leHRlbmRlZCA9IC0xO1xuICAgICAgICB0aGlzLm1hc2sgPSAwO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSAwO1xuICAgIH1cbiAgICBjbGVhcihzdGFydCkge1xuICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLmV4dGVuZGVkID0gLTE7XG4gICAgfVxufVxuY29uc3QgZHVtbXlUb2tlbiA9IG5ldyBUb2tlbjtcbmNsYXNzIFRva2VuQ2FjaGUge1xuICAgIGNvbnN0cnVjdG9yKHBhcnNlcikge1xuICAgICAgICB0aGlzLnRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLm1haW5Ub2tlbiA9IGR1bW15VG9rZW47XG4gICAgICAgIHRoaXMuYWN0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLnRva2VucyA9IHBhcnNlci50b2tlbml6ZXJzLm1hcChfID0+IG5ldyBDYWNoZWRUb2tlbik7XG4gICAgfVxuICAgIGdldEFjdGlvbnMoc3RhY2ssIGlucHV0KSB7XG4gICAgICAgIGxldCBhY3Rpb25JbmRleCA9IDA7XG4gICAgICAgIGxldCBtYWluID0gbnVsbDtcbiAgICAgICAgbGV0IHsgcGFyc2VyIH0gPSBzdGFjay5wLCB7IHRva2VuaXplcnMgfSA9IHBhcnNlcjtcbiAgICAgICAgbGV0IG1hc2sgPSBwYXJzZXIuc3RhdGVTbG90KHN0YWNrLnN0YXRlLCAzIC8qIFRva2VuaXplck1hc2sgKi8pO1xuICAgICAgICBsZXQgY29udGV4dCA9IHN0YWNrLmN1ckNvbnRleHQgPyBzdGFjay5jdXJDb250ZXh0Lmhhc2ggOiAwO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2VuaXplcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICgoKDEgPDwgaSkgJiBtYXNrKSA9PSAwKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IHRva2VuaXplciA9IHRva2VuaXplcnNbaV0sIHRva2VuID0gdGhpcy50b2tlbnNbaV07XG4gICAgICAgICAgICBpZiAobWFpbiAmJiAhdG9rZW5pemVyLmZhbGxiYWNrKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKHRva2VuaXplci5jb250ZXh0dWFsIHx8IHRva2VuLnN0YXJ0ICE9IHN0YWNrLnBvcyB8fCB0b2tlbi5tYXNrICE9IG1hc2sgfHwgdG9rZW4uY29udGV4dCAhPSBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVDYWNoZWRUb2tlbih0b2tlbiwgdG9rZW5pemVyLCBzdGFjaywgaW5wdXQpO1xuICAgICAgICAgICAgICAgIHRva2VuLm1hc2sgPSBtYXNrO1xuICAgICAgICAgICAgICAgIHRva2VuLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlICE9IDAgLyogRXJyICovKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0SW5kZXggPSBhY3Rpb25JbmRleDtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4uZXh0ZW5kZWQgPiAtMSlcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uSW5kZXggPSB0aGlzLmFkZEFjdGlvbnMoc3RhY2ssIHRva2VuLmV4dGVuZGVkLCB0b2tlbi5lbmQsIGFjdGlvbkluZGV4KTtcbiAgICAgICAgICAgICAgICBhY3Rpb25JbmRleCA9IHRoaXMuYWRkQWN0aW9ucyhzdGFjaywgdG9rZW4udmFsdWUsIHRva2VuLmVuZCwgYWN0aW9uSW5kZXgpO1xuICAgICAgICAgICAgICAgIGlmICghdG9rZW5pemVyLmV4dGVuZCkge1xuICAgICAgICAgICAgICAgICAgICBtYWluID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb25JbmRleCA+IHN0YXJ0SW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHRoaXMuYWN0aW9ucy5sZW5ndGggPiBhY3Rpb25JbmRleClcbiAgICAgICAgICAgIHRoaXMuYWN0aW9ucy5wb3AoKTtcbiAgICAgICAgaWYgKCFtYWluKSB7XG4gICAgICAgICAgICBtYWluID0gZHVtbXlUb2tlbjtcbiAgICAgICAgICAgIG1haW4uc3RhcnQgPSBzdGFjay5wb3M7XG4gICAgICAgICAgICBpZiAoc3RhY2sucG9zID09IGlucHV0Lmxlbmd0aClcbiAgICAgICAgICAgICAgICBtYWluLmFjY2VwdChzdGFjay5wLnBhcnNlci5lb2ZUZXJtLCBzdGFjay5wb3MpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG1haW4uYWNjZXB0KDAgLyogRXJyICovLCBzdGFjay5wb3MgKyAxKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm1haW5Ub2tlbiA9IG1haW47XG4gICAgICAgIHJldHVybiB0aGlzLmFjdGlvbnM7XG4gICAgfVxuICAgIHVwZGF0ZUNhY2hlZFRva2VuKHRva2VuLCB0b2tlbml6ZXIsIHN0YWNrLCBpbnB1dCkge1xuICAgICAgICB0b2tlbi5jbGVhcihzdGFjay5wb3MpO1xuICAgICAgICB0b2tlbml6ZXIudG9rZW4oaW5wdXQsIHRva2VuLCBzdGFjayk7XG4gICAgICAgIGlmICh0b2tlbi52YWx1ZSA+IC0xKSB7XG4gICAgICAgICAgICBsZXQgeyBwYXJzZXIgfSA9IHN0YWNrLnA7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlci5zcGVjaWFsaXplZC5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VyLnNwZWNpYWxpemVkW2ldID09IHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXN1bHQgPSBwYXJzZXIuc3BlY2lhbGl6ZXJzW2ldKGlucHV0LnJlYWQodG9rZW4uc3RhcnQsIHRva2VuLmVuZCksIHN0YWNrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA+PSAwICYmIHN0YWNrLnAucGFyc2VyLmRpYWxlY3QuYWxsb3dzKHJlc3VsdCA+PiAxKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChyZXN1bHQgJiAxKSA9PSAwIC8qIFNwZWNpYWxpemUgKi8pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4udmFsdWUgPSByZXN1bHQgPj4gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5leHRlbmRlZCA9IHJlc3VsdCA+PiAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3RhY2sucG9zID09IGlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4uYWNjZXB0KHN0YWNrLnAucGFyc2VyLmVvZlRlcm0sIHN0YWNrLnBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0b2tlbi5hY2NlcHQoMCAvKiBFcnIgKi8sIHN0YWNrLnBvcyArIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1dEFjdGlvbihhY3Rpb24sIHRva2VuLCBlbmQsIGluZGV4KSB7XG4gICAgICAgIC8vIERvbid0IGFkZCBkdXBsaWNhdGUgYWN0aW9uc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGluZGV4OyBpICs9IDMpXG4gICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25zW2ldID09IGFjdGlvbilcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tpbmRleCsrXSA9IGFjdGlvbjtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2luZGV4KytdID0gdG9rZW47XG4gICAgICAgIHRoaXMuYWN0aW9uc1tpbmRleCsrXSA9IGVuZDtcbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH1cbiAgICBhZGRBY3Rpb25zKHN0YWNrLCB0b2tlbiwgZW5kLCBpbmRleCkge1xuICAgICAgICBsZXQgeyBzdGF0ZSB9ID0gc3RhY2ssIHsgcGFyc2VyIH0gPSBzdGFjay5wLCB7IGRhdGEgfSA9IHBhcnNlcjtcbiAgICAgICAgZm9yIChsZXQgc2V0ID0gMDsgc2V0IDwgMjsgc2V0KyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBwYXJzZXIuc3RhdGVTbG90KHN0YXRlLCBzZXQgPyAyIC8qIFNraXAgKi8gOiAxIC8qIEFjdGlvbnMgKi8pOzsgaSArPSAzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGFbaV0gPT0gNjU1MzUgLyogRW5kICovKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2kgKyAxXSA9PSAxIC8qIE5leHQgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkgPSBwYWlyKGRhdGEsIGkgKyAyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PSAwICYmIGRhdGFbaSArIDFdID09IDIgLyogT3RoZXIgKi8pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPSB0aGlzLnB1dEFjdGlvbihwYWlyKGRhdGEsIGkgKyAxKSwgdG9rZW4sIGVuZCwgaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGRhdGFbaV0gPT0gdG9rZW4pXG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gdGhpcy5wdXRBY3Rpb24ocGFpcihkYXRhLCBpICsgMSksIHRva2VuLCBlbmQsIGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxufVxudmFyIFJlYztcbihmdW5jdGlvbiAoUmVjKSB7XG4gICAgUmVjW1JlY1tcIkRpc3RhbmNlXCJdID0gNV0gPSBcIkRpc3RhbmNlXCI7XG4gICAgUmVjW1JlY1tcIk1heFJlbWFpbmluZ1BlclN0ZXBcIl0gPSAzXSA9IFwiTWF4UmVtYWluaW5nUGVyU3RlcFwiO1xuICAgIFJlY1tSZWNbXCJNaW5CdWZmZXJMZW5ndGhQcnVuZVwiXSA9IDIwMF0gPSBcIk1pbkJ1ZmZlckxlbmd0aFBydW5lXCI7XG4gICAgUmVjW1JlY1tcIkZvcmNlUmVkdWNlTGltaXRcIl0gPSAxMF0gPSBcIkZvcmNlUmVkdWNlTGltaXRcIjtcbn0pKFJlYyB8fCAoUmVjID0ge30pKTtcbi8vLyBBIHBhcnNlIGNvbnRleHQgY2FuIGJlIHVzZWQgZm9yIHN0ZXAtYnktc3RlcCBwYXJzaW5nLiBBZnRlclxuLy8vIGNyZWF0aW5nIGl0LCB5b3UgcmVwZWF0ZWRseSBjYWxsIGAuYWR2YW5jZSgpYCB1bnRpbCBpdCByZXR1cm5zIGFcbi8vLyB0cmVlIHRvIGluZGljYXRlIGl0IGhhcyByZWFjaGVkIHRoZSBlbmQgb2YgdGhlIHBhcnNlLlxuY2xhc3MgUGFyc2Uge1xuICAgIGNvbnN0cnVjdG9yKHBhcnNlciwgaW5wdXQsIHN0YXJ0UG9zLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMucGFyc2VyID0gcGFyc2VyO1xuICAgICAgICB0aGlzLmlucHV0ID0gaW5wdXQ7XG4gICAgICAgIHRoaXMuc3RhcnRQb3MgPSBzdGFydFBvcztcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgLy8gVGhlIHBvc2l0aW9uIHRvIHdoaWNoIHRoZSBwYXJzZSBoYXMgYWR2YW5jZWQuXG4gICAgICAgIHRoaXMucG9zID0gMDtcbiAgICAgICAgdGhpcy5yZWNvdmVyaW5nID0gMDtcbiAgICAgICAgdGhpcy5uZXh0U3RhY2tJRCA9IDB4MjY1NDtcbiAgICAgICAgdGhpcy5uZXN0ZWQgPSBudWxsO1xuICAgICAgICB0aGlzLm5lc3RFbmQgPSAwO1xuICAgICAgICB0aGlzLm5lc3RXcmFwID0gbnVsbDtcbiAgICAgICAgdGhpcy5yZXVzZWQgPSBbXTtcbiAgICAgICAgdGhpcy50b2tlbnMgPSBuZXcgVG9rZW5DYWNoZShwYXJzZXIpO1xuICAgICAgICB0aGlzLnRvcFRlcm0gPSBwYXJzZXIudG9wWzFdO1xuICAgICAgICB0aGlzLnN0YWNrcyA9IFtTdGFjay5zdGFydCh0aGlzLCBwYXJzZXIudG9wWzBdLCB0aGlzLnN0YXJ0UG9zKV07XG4gICAgICAgIGxldCBmcmFnbWVudHMgPSBjb250ZXh0ID09PSBudWxsIHx8IGNvbnRleHQgPT09IHZvaWQgMCA/IHZvaWQgMCA6IGNvbnRleHQuZnJhZ21lbnRzO1xuICAgICAgICB0aGlzLmZyYWdtZW50cyA9IGZyYWdtZW50cyAmJiBmcmFnbWVudHMubGVuZ3RoID8gbmV3IEZyYWdtZW50Q3Vyc29yKGZyYWdtZW50cykgOiBudWxsO1xuICAgIH1cbiAgICAvLyBNb3ZlIHRoZSBwYXJzZXIgZm9yd2FyZC4gVGhpcyB3aWxsIHByb2Nlc3MgYWxsIHBhcnNlIHN0YWNrcyBhdFxuICAgIC8vIGB0aGlzLnBvc2AgYW5kIHRyeSB0byBhZHZhbmNlIHRoZW0gdG8gYSBmdXJ0aGVyIHBvc2l0aW9uLiBJZiBub1xuICAgIC8vIHN0YWNrIGZvciBzdWNoIGEgcG9zaXRpb24gaXMgZm91bmQsIGl0J2xsIHN0YXJ0IGVycm9yLXJlY292ZXJ5LlxuICAgIC8vXG4gICAgLy8gV2hlbiB0aGUgcGFyc2UgaXMgZmluaXNoZWQsIHRoaXMgd2lsbCByZXR1cm4gYSBzeW50YXggdHJlZS4gV2hlblxuICAgIC8vIG5vdCwgaXQgcmV0dXJucyBgbnVsbGAuXG4gICAgYWR2YW5jZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubmVzdGVkKSB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gdGhpcy5uZXN0ZWQuYWR2YW5jZSgpO1xuICAgICAgICAgICAgdGhpcy5wb3MgPSB0aGlzLm5lc3RlZC5wb3M7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maW5pc2hOZXN0ZWQodGhpcy5zdGFja3NbMF0sIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgdGhpcy5uZXN0ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0YWNrcyA9IHRoaXMuc3RhY2tzLCBwb3MgPSB0aGlzLnBvcztcbiAgICAgICAgLy8gVGhpcyB3aWxsIGhvbGQgc3RhY2tzIGJleW9uZCBgcG9zYC5cbiAgICAgICAgbGV0IG5ld1N0YWNrcyA9IHRoaXMuc3RhY2tzID0gW107XG4gICAgICAgIGxldCBzdG9wcGVkLCBzdG9wcGVkVG9rZW5zO1xuICAgICAgICBsZXQgbWF5YmVOZXN0O1xuICAgICAgICAvLyBLZWVwIGFkdmFuY2luZyBhbnkgc3RhY2tzIGF0IGBwb3NgIHVudGlsIHRoZXkgZWl0aGVyIG1vdmVcbiAgICAgICAgLy8gZm9yd2FyZCBvciBjYW4ndCBiZSBhZHZhbmNlZC4gR2F0aGVyIHN0YWNrcyB0aGF0IGNhbid0IGJlXG4gICAgICAgIC8vIGFkdmFuY2VkIGZ1cnRoZXIgaW4gYHN0b3BwZWRgLlxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0YWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHN0YWNrID0gc3RhY2tzW2ldLCBuZXN0O1xuICAgICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgICAgIGlmIChzdGFjay5wb3MgPiBwb3MpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3U3RhY2tzLnB1c2goc3RhY2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChuZXN0ID0gdGhpcy5jaGVja05lc3Qoc3RhY2spKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF5YmVOZXN0IHx8IG1heWJlTmVzdC5zdGFjay5zY29yZSA8IHN0YWNrLnNjb3JlKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWF5YmVOZXN0ID0gbmVzdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5hZHZhbmNlU3RhY2soc3RhY2ssIG5ld1N0YWNrcywgc3RhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3RvcHBlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcHBlZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcHBlZFRva2VucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0b3BwZWQucHVzaChzdGFjayk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0b2sgPSB0aGlzLnRva2Vucy5tYWluVG9rZW47XG4gICAgICAgICAgICAgICAgICAgIHN0b3BwZWRUb2tlbnMucHVzaCh0b2sudmFsdWUsIHRvay5lbmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobWF5YmVOZXN0KSB7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0TmVzdGVkKG1heWJlTmVzdCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW5ld1N0YWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxldCBmaW5pc2hlZCA9IHN0b3BwZWQgJiYgZmluZEZpbmlzaGVkKHN0b3BwZWQpO1xuICAgICAgICAgICAgaWYgKGZpbmlzaGVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YWNrVG9UcmVlKGZpbmlzaGVkKTtcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcnNlci5zdHJpY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAodmVyYm9zZSAmJiBzdG9wcGVkKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN0dWNrIHdpdGggdG9rZW4gXCIgKyB0aGlzLnBhcnNlci5nZXROYW1lKHRoaXMudG9rZW5zLm1haW5Ub2tlbi52YWx1ZSkpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcIk5vIHBhcnNlIGF0IFwiICsgcG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5yZWNvdmVyaW5nKVxuICAgICAgICAgICAgICAgIHRoaXMucmVjb3ZlcmluZyA9IDUgLyogRGlzdGFuY2UgKi87XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3ZlcmluZyAmJiBzdG9wcGVkKSB7XG4gICAgICAgICAgICBsZXQgZmluaXNoZWQgPSB0aGlzLnJ1blJlY292ZXJ5KHN0b3BwZWQsIHN0b3BwZWRUb2tlbnMsIG5ld1N0YWNrcyk7XG4gICAgICAgICAgICBpZiAoZmluaXNoZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhY2tUb1RyZWUoZmluaXNoZWQuZm9yY2VBbGwoKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3ZlcmluZykge1xuICAgICAgICAgICAgbGV0IG1heFJlbWFpbmluZyA9IHRoaXMucmVjb3ZlcmluZyA9PSAxID8gMSA6IHRoaXMucmVjb3ZlcmluZyAqIDMgLyogTWF4UmVtYWluaW5nUGVyU3RlcCAqLztcbiAgICAgICAgICAgIGlmIChuZXdTdGFja3MubGVuZ3RoID4gbWF4UmVtYWluaW5nKSB7XG4gICAgICAgICAgICAgICAgbmV3U3RhY2tzLnNvcnQoKGEsIGIpID0+IGIuc2NvcmUgLSBhLnNjb3JlKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAobmV3U3RhY2tzLmxlbmd0aCA+IG1heFJlbWFpbmluZylcbiAgICAgICAgICAgICAgICAgICAgbmV3U3RhY2tzLnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5ld1N0YWNrcy5zb21lKHMgPT4gcy5yZWR1Y2VQb3MgPiBwb3MpKVxuICAgICAgICAgICAgICAgIHRoaXMucmVjb3ZlcmluZy0tO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5ld1N0YWNrcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAvLyBQcnVuZSBzdGFja3MgdGhhdCBhcmUgaW4gdGhlIHNhbWUgc3RhdGUsIG9yIHRoYXQgaGF2ZSBiZWVuXG4gICAgICAgICAgICAvLyBydW5uaW5nIHdpdGhvdXQgc3BsaXR0aW5nIGZvciBhIHdoaWxlLCB0byBhdm9pZCBnZXR0aW5nIHN0dWNrXG4gICAgICAgICAgICAvLyB3aXRoIG11bHRpcGxlIHN1Y2Nlc3NmdWwgc3RhY2tzIHJ1bm5pbmcgZW5kbGVzc2x5IG9uLlxuICAgICAgICAgICAgb3V0ZXI6IGZvciAobGV0IGkgPSAwOyBpIDwgbmV3U3RhY2tzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFjayA9IG5ld1N0YWNrc1tpXTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCBuZXdTdGFja3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG90aGVyID0gbmV3U3RhY2tzW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhY2suc2FtZVN0YXRlKG90aGVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2suYnVmZmVyLmxlbmd0aCA+IDIwMCAvKiBNaW5CdWZmZXJMZW5ndGhQcnVuZSAqLyAmJiBvdGhlci5idWZmZXIubGVuZ3RoID4gMjAwIC8qIE1pbkJ1ZmZlckxlbmd0aFBydW5lICovKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKChzdGFjay5zY29yZSAtIG90aGVyLnNjb3JlKSB8fCAoc3RhY2suYnVmZmVyLmxlbmd0aCAtIG90aGVyLmJ1ZmZlci5sZW5ndGgpKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdTdGFja3Muc3BsaWNlKGotLSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdTdGFja3Muc3BsaWNlKGktLSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wb3MgPSBuZXdTdGFja3NbMF0ucG9zO1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IG5ld1N0YWNrcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGlmIChuZXdTdGFja3NbaV0ucG9zIDwgdGhpcy5wb3MpXG4gICAgICAgICAgICAgICAgdGhpcy5wb3MgPSBuZXdTdGFja3NbaV0ucG9zO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gUmV0dXJucyBhbiB1cGRhdGVkIHZlcnNpb24gb2YgdGhlIGdpdmVuIHN0YWNrLCBvciBudWxsIGlmIHRoZVxuICAgIC8vIHN0YWNrIGNhbid0IGFkdmFuY2Ugbm9ybWFsbHkuIFdoZW4gYHNwbGl0YCBhbmQgYHN0YWNrc2AgYXJlXG4gICAgLy8gZ2l2ZW4sIHN0YWNrcyBzcGxpdCBvZmYgYnkgYW1iaWd1b3VzIG9wZXJhdGlvbnMgd2lsbCBiZSBwdXNoZWQgdG9cbiAgICAvLyBgc3BsaXRgLCBvciBhZGRlZCB0byBgc3RhY2tzYCBpZiB0aGV5IG1vdmUgYHBvc2AgZm9yd2FyZC5cbiAgICBhZHZhbmNlU3RhY2soc3RhY2ssIHN0YWNrcywgc3BsaXQpIHtcbiAgICAgICAgbGV0IHN0YXJ0ID0gc3RhY2sucG9zLCB7IGlucHV0LCBwYXJzZXIgfSA9IHRoaXM7XG4gICAgICAgIGxldCBiYXNlID0gdmVyYm9zZSA/IHRoaXMuc3RhY2tJRChzdGFjaykgKyBcIiAtPiBcIiA6IFwiXCI7XG4gICAgICAgIGlmICh0aGlzLmZyYWdtZW50cykge1xuICAgICAgICAgICAgbGV0IHN0cmljdEN4ID0gc3RhY2suY3VyQ29udGV4dCAmJiBzdGFjay5jdXJDb250ZXh0LnRyYWNrZXIuc3RyaWN0LCBjeEhhc2ggPSBzdHJpY3RDeCA/IHN0YWNrLmN1ckNvbnRleHQuaGFzaCA6IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBjYWNoZWQgPSB0aGlzLmZyYWdtZW50cy5ub2RlQXQoc3RhcnQpOyBjYWNoZWQ7KSB7XG4gICAgICAgICAgICAgICAgbGV0IG1hdGNoID0gdGhpcy5wYXJzZXIubm9kZVNldC50eXBlc1tjYWNoZWQudHlwZS5pZF0gPT0gY2FjaGVkLnR5cGUgPyBwYXJzZXIuZ2V0R290byhzdGFjay5zdGF0ZSwgY2FjaGVkLnR5cGUuaWQpIDogLTE7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoID4gLTEgJiYgY2FjaGVkLmxlbmd0aCAmJiAoIXN0cmljdEN4IHx8IChjYWNoZWQuY29udGV4dEhhc2ggfHwgMCkgPT0gY3hIYXNoKSkge1xuICAgICAgICAgICAgICAgICAgICBzdGFjay51c2VOb2RlKGNhY2hlZCwgbWF0Y2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJhc2UgKyB0aGlzLnN0YWNrSUQoc3RhY2spICsgYCAodmlhIHJldXNlIG9mICR7cGFyc2VyLmdldE5hbWUoY2FjaGVkLnR5cGUuaWQpfSlgKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghKGNhY2hlZCBpbnN0YW5jZW9mIFRyZWUpIHx8IGNhY2hlZC5jaGlsZHJlbi5sZW5ndGggPT0gMCB8fCBjYWNoZWQucG9zaXRpb25zWzBdID4gMClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgbGV0IGlubmVyID0gY2FjaGVkLmNoaWxkcmVuWzBdO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lciBpbnN0YW5jZW9mIFRyZWUpXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZCA9IGlubmVyO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGRlZmF1bHRSZWR1Y2UgPSBwYXJzZXIuc3RhdGVTbG90KHN0YWNrLnN0YXRlLCA0IC8qIERlZmF1bHRSZWR1Y2UgKi8pO1xuICAgICAgICBpZiAoZGVmYXVsdFJlZHVjZSA+IDApIHtcbiAgICAgICAgICAgIHN0YWNrLnJlZHVjZShkZWZhdWx0UmVkdWNlKTtcbiAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJhc2UgKyB0aGlzLnN0YWNrSUQoc3RhY2spICsgYCAodmlhIGFsd2F5cy1yZWR1Y2UgJHtwYXJzZXIuZ2V0TmFtZShkZWZhdWx0UmVkdWNlICYgNjU1MzUgLyogVmFsdWVNYXNrICovKX0pYCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYWN0aW9ucyA9IHRoaXMudG9rZW5zLmdldEFjdGlvbnMoc3RhY2ssIGlucHV0KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY3Rpb25zLmxlbmd0aDspIHtcbiAgICAgICAgICAgIGxldCBhY3Rpb24gPSBhY3Rpb25zW2krK10sIHRlcm0gPSBhY3Rpb25zW2krK10sIGVuZCA9IGFjdGlvbnNbaSsrXTtcbiAgICAgICAgICAgIGxldCBsYXN0ID0gaSA9PSBhY3Rpb25zLmxlbmd0aCB8fCAhc3BsaXQ7XG4gICAgICAgICAgICBsZXQgbG9jYWxTdGFjayA9IGxhc3QgPyBzdGFjayA6IHN0YWNrLnNwbGl0KCk7XG4gICAgICAgICAgICBsb2NhbFN0YWNrLmFwcGx5KGFjdGlvbiwgdGVybSwgZW5kKTtcbiAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJhc2UgKyB0aGlzLnN0YWNrSUQobG9jYWxTdGFjaykgKyBgICh2aWEgJHsoYWN0aW9uICYgNjU1MzYgLyogUmVkdWNlRmxhZyAqLykgPT0gMCA/IFwic2hpZnRcIlxuICAgICAgICAgICAgICAgICAgICA6IGByZWR1Y2Ugb2YgJHtwYXJzZXIuZ2V0TmFtZShhY3Rpb24gJiA2NTUzNSAvKiBWYWx1ZU1hc2sgKi8pfWB9IGZvciAke3BhcnNlci5nZXROYW1lKHRlcm0pfSBAICR7c3RhcnR9JHtsb2NhbFN0YWNrID09IHN0YWNrID8gXCJcIiA6IFwiLCBzcGxpdFwifSlgKTtcbiAgICAgICAgICAgIGlmIChsYXN0KVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgZWxzZSBpZiAobG9jYWxTdGFjay5wb3MgPiBzdGFydClcbiAgICAgICAgICAgICAgICBzdGFja3MucHVzaChsb2NhbFN0YWNrKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBzcGxpdC5wdXNoKGxvY2FsU3RhY2spO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWR2YW5jZSBhIGdpdmVuIHN0YWNrIGZvcndhcmQgYXMgZmFyIGFzIGl0IHdpbGwgZ28uIFJldHVybnMgdGhlXG4gICAgLy8gKHBvc3NpYmx5IHVwZGF0ZWQpIHN0YWNrIGlmIGl0IGdvdCBzdHVjaywgb3IgbnVsbCBpZiBpdCBtb3ZlZFxuICAgIC8vIGZvcndhcmQgYW5kIHdhcyBnaXZlbiB0byBgcHVzaFN0YWNrRGVkdXBgLlxuICAgIGFkdmFuY2VGdWxseShzdGFjaywgbmV3U3RhY2tzKSB7XG4gICAgICAgIGxldCBwb3MgPSBzdGFjay5wb3M7XG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGxldCBuZXN0ID0gdGhpcy5jaGVja05lc3Qoc3RhY2spO1xuICAgICAgICAgICAgaWYgKG5lc3QpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5lc3Q7XG4gICAgICAgICAgICBpZiAoIXRoaXMuYWR2YW5jZVN0YWNrKHN0YWNrLCBudWxsLCBudWxsKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBpZiAoc3RhY2sucG9zID4gcG9zKSB7XG4gICAgICAgICAgICAgICAgcHVzaFN0YWNrRGVkdXAoc3RhY2ssIG5ld1N0YWNrcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcnVuUmVjb3Zlcnkoc3RhY2tzLCB0b2tlbnMsIG5ld1N0YWNrcykge1xuICAgICAgICBsZXQgZmluaXNoZWQgPSBudWxsLCByZXN0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgbGV0IG1heWJlTmVzdDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGFjayA9IHN0YWNrc1tpXSwgdG9rZW4gPSB0b2tlbnNbaSA8PCAxXSwgdG9rZW5FbmQgPSB0b2tlbnNbKGkgPDwgMSkgKyAxXTtcbiAgICAgICAgICAgIGxldCBiYXNlID0gdmVyYm9zZSA/IHRoaXMuc3RhY2tJRChzdGFjaykgKyBcIiAtPiBcIiA6IFwiXCI7XG4gICAgICAgICAgICBpZiAoc3RhY2suZGVhZEVuZCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXN0YXJ0ZWQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHJlc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3RhY2sucmVzdGFydCgpO1xuICAgICAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhiYXNlICsgdGhpcy5zdGFja0lEKHN0YWNrKSArIFwiIChyZXN0YXJ0ZWQpXCIpO1xuICAgICAgICAgICAgICAgIGxldCBkb25lID0gdGhpcy5hZHZhbmNlRnVsbHkoc3RhY2ssIG5ld1N0YWNrcyk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbmUgIT09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXliZU5lc3QgPSBkb25lO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgZm9yY2UgPSBzdGFjay5zcGxpdCgpLCBmb3JjZUJhc2UgPSBiYXNlO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGZvcmNlLmZvcmNlUmVkdWNlKCkgJiYgaiA8IDEwIC8qIEZvcmNlUmVkdWNlTGltaXQgKi87IGorKykge1xuICAgICAgICAgICAgICAgIGlmICh2ZXJib3NlKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhmb3JjZUJhc2UgKyB0aGlzLnN0YWNrSUQoZm9yY2UpICsgXCIgKHZpYSBmb3JjZS1yZWR1Y2UpXCIpO1xuICAgICAgICAgICAgICAgIGxldCBkb25lID0gdGhpcy5hZHZhbmNlRnVsbHkoZm9yY2UsIG5ld1N0YWNrcyk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbmUgIT09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXliZU5lc3QgPSBkb25lO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgICAgIGZvcmNlQmFzZSA9IHRoaXMuc3RhY2tJRChmb3JjZSkgKyBcIiAtPiBcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGluc2VydCBvZiBzdGFjay5yZWNvdmVyQnlJbnNlcnQodG9rZW4pKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJhc2UgKyB0aGlzLnN0YWNrSUQoaW5zZXJ0KSArIFwiICh2aWEgcmVjb3Zlci1pbnNlcnQpXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuYWR2YW5jZUZ1bGx5KGluc2VydCwgbmV3U3RhY2tzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmlucHV0Lmxlbmd0aCA+IHN0YWNrLnBvcykge1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbkVuZCA9PSBzdGFjay5wb3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5FbmQrKztcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSAwIC8qIEVyciAqLztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RhY2sucmVjb3ZlckJ5RGVsZXRlKHRva2VuLCB0b2tlbkVuZCk7XG4gICAgICAgICAgICAgICAgaWYgKHZlcmJvc2UpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJhc2UgKyB0aGlzLnN0YWNrSUQoc3RhY2spICsgYCAodmlhIHJlY292ZXItZGVsZXRlICR7dGhpcy5wYXJzZXIuZ2V0TmFtZSh0b2tlbil9KWApO1xuICAgICAgICAgICAgICAgIHB1c2hTdGFja0RlZHVwKHN0YWNrLCBuZXdTdGFja3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIWZpbmlzaGVkIHx8IGZpbmlzaGVkLnNjb3JlIDwgc3RhY2suc2NvcmUpIHtcbiAgICAgICAgICAgICAgICBmaW5pc2hlZCA9IHN0YWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmaW5pc2hlZClcbiAgICAgICAgICAgIHJldHVybiBmaW5pc2hlZDtcbiAgICAgICAgaWYgKG1heWJlTmVzdClcbiAgICAgICAgICAgIGZvciAobGV0IHMgb2YgdGhpcy5zdGFja3MpXG4gICAgICAgICAgICAgICAgaWYgKHMuc2NvcmUgPiBtYXliZU5lc3Quc3RhY2suc2NvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF5YmVOZXN0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIGlmIChtYXliZU5lc3QpXG4gICAgICAgICAgICB0aGlzLnN0YXJ0TmVzdGVkKG1heWJlTmVzdCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3JjZUZpbmlzaCgpIHtcbiAgICAgICAgbGV0IHN0YWNrID0gdGhpcy5zdGFja3NbMF0uc3BsaXQoKTtcbiAgICAgICAgaWYgKHRoaXMubmVzdGVkKVxuICAgICAgICAgICAgdGhpcy5maW5pc2hOZXN0ZWQoc3RhY2ssIHRoaXMubmVzdGVkLmZvcmNlRmluaXNoKCkpO1xuICAgICAgICByZXR1cm4gdGhpcy5zdGFja1RvVHJlZShzdGFjay5mb3JjZUFsbCgpKTtcbiAgICB9XG4gICAgLy8gQ29udmVydCB0aGUgc3RhY2sncyBidWZmZXIgdG8gYSBzeW50YXggdHJlZS5cbiAgICBzdGFja1RvVHJlZShzdGFjaywgcG9zID0gc3RhY2sucG9zKSB7XG4gICAgICAgIGlmICh0aGlzLnBhcnNlci5jb250ZXh0KVxuICAgICAgICAgICAgc3RhY2suZW1pdENvbnRleHQoKTtcbiAgICAgICAgcmV0dXJuIFRyZWUuYnVpbGQoeyBidWZmZXI6IFN0YWNrQnVmZmVyQ3Vyc29yLmNyZWF0ZShzdGFjayksXG4gICAgICAgICAgICBub2RlU2V0OiB0aGlzLnBhcnNlci5ub2RlU2V0LFxuICAgICAgICAgICAgdG9wSUQ6IHRoaXMudG9wVGVybSxcbiAgICAgICAgICAgIG1heEJ1ZmZlckxlbmd0aDogdGhpcy5wYXJzZXIuYnVmZmVyTGVuZ3RoLFxuICAgICAgICAgICAgcmV1c2VkOiB0aGlzLnJldXNlZCxcbiAgICAgICAgICAgIHN0YXJ0OiB0aGlzLnN0YXJ0UG9zLFxuICAgICAgICAgICAgbGVuZ3RoOiBwb3MgLSB0aGlzLnN0YXJ0UG9zLFxuICAgICAgICAgICAgbWluUmVwZWF0VHlwZTogdGhpcy5wYXJzZXIubWluUmVwZWF0VGVybSB9KTtcbiAgICB9XG4gICAgY2hlY2tOZXN0KHN0YWNrKSB7XG4gICAgICAgIGxldCBpbmZvID0gdGhpcy5wYXJzZXIuZmluZE5lc3RlZChzdGFjay5zdGF0ZSk7XG4gICAgICAgIGlmICghaW5mbylcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgc3BlYyA9IGluZm8udmFsdWU7XG4gICAgICAgIGlmICh0eXBlb2Ygc3BlYyA9PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgICBzcGVjID0gc3BlYyh0aGlzLmlucHV0LCBzdGFjayk7XG4gICAgICAgIHJldHVybiBzcGVjID8geyBzdGFjaywgaW5mbywgc3BlYyB9IDogbnVsbDtcbiAgICB9XG4gICAgc3RhcnROZXN0ZWQobmVzdCkge1xuICAgICAgICBsZXQgeyBzdGFjaywgaW5mbywgc3BlYyB9ID0gbmVzdDtcbiAgICAgICAgdGhpcy5zdGFja3MgPSBbc3RhY2tdO1xuICAgICAgICB0aGlzLm5lc3RFbmQgPSB0aGlzLnNjYW5Gb3JOZXN0RW5kKHN0YWNrLCBpbmZvLmVuZCwgc3BlYy5maWx0ZXJFbmQpO1xuICAgICAgICB0aGlzLm5lc3RXcmFwID0gdHlwZW9mIHNwZWMud3JhcFR5cGUgPT0gXCJudW1iZXJcIiA/IHRoaXMucGFyc2VyLm5vZGVTZXQudHlwZXNbc3BlYy53cmFwVHlwZV0gOiBzcGVjLndyYXBUeXBlIHx8IG51bGw7XG4gICAgICAgIGlmIChzcGVjLnN0YXJ0UGFyc2UpIHtcbiAgICAgICAgICAgIHRoaXMubmVzdGVkID0gc3BlYy5zdGFydFBhcnNlKHRoaXMuaW5wdXQuY2xpcCh0aGlzLm5lc3RFbmQpLCBzdGFjay5wb3MsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmZpbmlzaE5lc3RlZChzdGFjayk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2NhbkZvck5lc3RFbmQoc3RhY2ssIGVuZFRva2VuLCBmaWx0ZXIpIHtcbiAgICAgICAgZm9yIChsZXQgcG9zID0gc3RhY2sucG9zOyBwb3MgPCB0aGlzLmlucHV0Lmxlbmd0aDsgcG9zKyspIHtcbiAgICAgICAgICAgIGR1bW15VG9rZW4uc3RhcnQgPSBwb3M7XG4gICAgICAgICAgICBkdW1teVRva2VuLnZhbHVlID0gLTE7XG4gICAgICAgICAgICBlbmRUb2tlbi50b2tlbih0aGlzLmlucHV0LCBkdW1teVRva2VuLCBzdGFjayk7XG4gICAgICAgICAgICBpZiAoZHVtbXlUb2tlbi52YWx1ZSA+IC0xICYmICghZmlsdGVyIHx8IGZpbHRlcih0aGlzLmlucHV0LnJlYWQocG9zLCBkdW1teVRva2VuLmVuZCkpKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmlucHV0Lmxlbmd0aDtcbiAgICB9XG4gICAgZmluaXNoTmVzdGVkKHN0YWNrLCB0cmVlKSB7XG4gICAgICAgIGlmICh0aGlzLm5lc3RXcmFwKVxuICAgICAgICAgICAgdHJlZSA9IG5ldyBUcmVlKHRoaXMubmVzdFdyYXAsIHRyZWUgPyBbdHJlZV0gOiBbXSwgdHJlZSA/IFswXSA6IFtdLCB0aGlzLm5lc3RFbmQgLSBzdGFjay5wb3MpO1xuICAgICAgICBlbHNlIGlmICghdHJlZSlcbiAgICAgICAgICAgIHRyZWUgPSBuZXcgVHJlZShOb2RlVHlwZS5ub25lLCBbXSwgW10sIHRoaXMubmVzdEVuZCAtIHN0YWNrLnBvcyk7XG4gICAgICAgIGxldCBpbmZvID0gdGhpcy5wYXJzZXIuZmluZE5lc3RlZChzdGFjay5zdGF0ZSk7XG4gICAgICAgIHN0YWNrLnVzZU5vZGUodHJlZSwgdGhpcy5wYXJzZXIuZ2V0R290byhzdGFjay5zdGF0ZSwgaW5mby5wbGFjZWhvbGRlciwgdHJ1ZSkpO1xuICAgICAgICBpZiAodmVyYm9zZSlcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuc3RhY2tJRChzdGFjaykgKyBgICh2aWEgdW5uZXN0KWApO1xuICAgIH1cbiAgICBzdGFja0lEKHN0YWNrKSB7XG4gICAgICAgIGxldCBpZCA9IChzdGFja0lEcyB8fCAoc3RhY2tJRHMgPSBuZXcgV2Vha01hcCkpLmdldChzdGFjayk7XG4gICAgICAgIGlmICghaWQpXG4gICAgICAgICAgICBzdGFja0lEcy5zZXQoc3RhY2ssIGlkID0gU3RyaW5nLmZyb21Db2RlUG9pbnQodGhpcy5uZXh0U3RhY2tJRCsrKSk7XG4gICAgICAgIHJldHVybiBpZCArIHN0YWNrO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHB1c2hTdGFja0RlZHVwKHN0YWNrLCBuZXdTdGFja3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5ld1N0YWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgb3RoZXIgPSBuZXdTdGFja3NbaV07XG4gICAgICAgIGlmIChvdGhlci5wb3MgPT0gc3RhY2sucG9zICYmIG90aGVyLnNhbWVTdGF0ZShzdGFjaykpIHtcbiAgICAgICAgICAgIGlmIChuZXdTdGFja3NbaV0uc2NvcmUgPCBzdGFjay5zY29yZSlcbiAgICAgICAgICAgICAgICBuZXdTdGFja3NbaV0gPSBzdGFjaztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBuZXdTdGFja3MucHVzaChzdGFjayk7XG59XG5jbGFzcyBEaWFsZWN0IHtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2UsIGZsYWdzLCBkaXNhYmxlZCkge1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgICAgdGhpcy5mbGFncyA9IGZsYWdzO1xuICAgICAgICB0aGlzLmRpc2FibGVkID0gZGlzYWJsZWQ7XG4gICAgfVxuICAgIGFsbG93cyh0ZXJtKSB7IHJldHVybiAhdGhpcy5kaXNhYmxlZCB8fCB0aGlzLmRpc2FibGVkW3Rlcm1dID09IDA7IH1cbn1cbmNvbnN0IGlkID0geCA9PiB4O1xuLy8vIENvbnRleHQgdHJhY2tlcnMgYXJlIHVzZWQgdG8gdHJhY2sgc3RhdGVmdWwgY29udGV4dCAoc3VjaCBhc1xuLy8vIGluZGVudGF0aW9uIGluIHRoZSBQeXRob24gZ3JhbW1hciwgb3IgcGFyZW50IGVsZW1lbnRzIGluIHRoZSBYTUxcbi8vLyBncmFtbWFyKSBuZWVkZWQgYnkgZXh0ZXJuYWwgdG9rZW5pemVycy4gWW91IGRlY2xhcmUgdGhlbSBpbiBhXG4vLy8gZ3JhbW1hciBmaWxlIGFzIGBAY29udGV4dCBleHBvcnROYW1lIGZyb20gXCJtb2R1bGVcImAuXG4vLy9cbi8vLyBDb250ZXh0IHZhbHVlcyBzaG91bGQgYmUgaW1tdXRhYmxlLCBhbmQgY2FuIGJlIHVwZGF0ZWQgKHJlcGxhY2VkKVxuLy8vIG9uIHNoaWZ0IG9yIHJlZHVjZSBhY3Rpb25zLlxuY2xhc3MgQ29udGV4dFRyYWNrZXIge1xuICAgIC8vLyBUaGUgZXhwb3J0IHVzZWQgaW4gYSBgQGNvbnRleHRgIGRlY2xhcmF0aW9uIHNob3VsZCBiZSBvZiB0aGlzXG4gICAgLy8vIHR5cGUuXG4gICAgY29uc3RydWN0b3Ioc3BlYykge1xuICAgICAgICB0aGlzLnN0YXJ0ID0gc3BlYy5zdGFydDtcbiAgICAgICAgdGhpcy5zaGlmdCA9IHNwZWMuc2hpZnQgfHwgaWQ7XG4gICAgICAgIHRoaXMucmVkdWNlID0gc3BlYy5yZWR1Y2UgfHwgaWQ7XG4gICAgICAgIHRoaXMucmV1c2UgPSBzcGVjLnJldXNlIHx8IGlkO1xuICAgICAgICB0aGlzLmhhc2ggPSBzcGVjLmhhc2g7XG4gICAgICAgIHRoaXMuc3RyaWN0ID0gc3BlYy5zdHJpY3QgIT09IGZhbHNlO1xuICAgIH1cbn1cbi8vLyBBIHBhcnNlciBob2xkcyB0aGUgcGFyc2UgdGFibGVzIGZvciBhIGdpdmVuIGdyYW1tYXIsIGFzIGdlbmVyYXRlZFxuLy8vIGJ5IGBsZXplci1nZW5lcmF0b3JgLlxuY2xhc3MgUGFyc2VyIHtcbiAgICAvLy8gQGludGVybmFsXG4gICAgY29uc3RydWN0b3Ioc3BlYykge1xuICAgICAgICAvLy8gQGludGVybmFsXG4gICAgICAgIHRoaXMuYnVmZmVyTGVuZ3RoID0gRGVmYXVsdEJ1ZmZlckxlbmd0aDtcbiAgICAgICAgLy8vIEBpbnRlcm5hbFxuICAgICAgICB0aGlzLnN0cmljdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhY2hlZERpYWxlY3QgPSBudWxsO1xuICAgICAgICBpZiAoc3BlYy52ZXJzaW9uICE9IDEzIC8qIFZlcnNpb24gKi8pXG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgUGFyc2VyIHZlcnNpb24gKCR7c3BlYy52ZXJzaW9ufSkgZG9lc24ndCBtYXRjaCBydW50aW1lIHZlcnNpb24gKCR7MTMgLyogVmVyc2lvbiAqL30pYCk7XG4gICAgICAgIGxldCB0b2tlbkFycmF5ID0gZGVjb2RlQXJyYXkoc3BlYy50b2tlbkRhdGEpO1xuICAgICAgICBsZXQgbm9kZU5hbWVzID0gc3BlYy5ub2RlTmFtZXMuc3BsaXQoXCIgXCIpO1xuICAgICAgICB0aGlzLm1pblJlcGVhdFRlcm0gPSBub2RlTmFtZXMubGVuZ3RoO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBzcGVjLmNvbnRleHQ7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BlYy5yZXBlYXROb2RlQ291bnQ7IGkrKylcbiAgICAgICAgICAgIG5vZGVOYW1lcy5wdXNoKFwiXCIpO1xuICAgICAgICBsZXQgbm9kZVByb3BzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZU5hbWVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgbm9kZVByb3BzLnB1c2goW10pO1xuICAgICAgICBmdW5jdGlvbiBzZXRQcm9wKG5vZGVJRCwgcHJvcCwgdmFsdWUpIHtcbiAgICAgICAgICAgIG5vZGVQcm9wc1tub2RlSURdLnB1c2goW3Byb3AsIHByb3AuZGVzZXJpYWxpemUoU3RyaW5nKHZhbHVlKSldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3BlYy5ub2RlUHJvcHMpXG4gICAgICAgICAgICBmb3IgKGxldCBwcm9wU3BlYyBvZiBzcGVjLm5vZGVQcm9wcykge1xuICAgICAgICAgICAgICAgIGxldCBwcm9wID0gcHJvcFNwZWNbMF07XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBwcm9wU3BlYy5sZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXh0ID0gcHJvcFNwZWNbaSsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0UHJvcChuZXh0LCBwcm9wLCBwcm9wU3BlY1tpKytdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IHByb3BTcGVjW2kgKyAtbmV4dF07XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gLW5leHQ7IGogPiAwOyBqLS0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0UHJvcChwcm9wU3BlY1tpKytdLCBwcm9wLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BlY2lhbGl6ZWQgPSBuZXcgVWludDE2QXJyYXkoc3BlYy5zcGVjaWFsaXplZCA/IHNwZWMuc3BlY2lhbGl6ZWQubGVuZ3RoIDogMCk7XG4gICAgICAgIHRoaXMuc3BlY2lhbGl6ZXJzID0gW107XG4gICAgICAgIGlmIChzcGVjLnNwZWNpYWxpemVkKVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcGVjLnNwZWNpYWxpemVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVjaWFsaXplZFtpXSA9IHNwZWMuc3BlY2lhbGl6ZWRbaV0udGVybTtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWNpYWxpemVyc1tpXSA9IHNwZWMuc3BlY2lhbGl6ZWRbaV0uZ2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YXRlcyA9IGRlY29kZUFycmF5KHNwZWMuc3RhdGVzLCBVaW50MzJBcnJheSk7XG4gICAgICAgIHRoaXMuZGF0YSA9IGRlY29kZUFycmF5KHNwZWMuc3RhdGVEYXRhKTtcbiAgICAgICAgdGhpcy5nb3RvID0gZGVjb2RlQXJyYXkoc3BlYy5nb3RvKTtcbiAgICAgICAgbGV0IHRvcFRlcm1zID0gT2JqZWN0LmtleXMoc3BlYy50b3BSdWxlcykubWFwKHIgPT4gc3BlYy50b3BSdWxlc1tyXVsxXSk7XG4gICAgICAgIHRoaXMubm9kZVNldCA9IG5ldyBOb2RlU2V0KG5vZGVOYW1lcy5tYXAoKG5hbWUsIGkpID0+IE5vZGVUeXBlLmRlZmluZSh7XG4gICAgICAgICAgICBuYW1lOiBpID49IHRoaXMubWluUmVwZWF0VGVybSA/IHVuZGVmaW5lZCA6IG5hbWUsXG4gICAgICAgICAgICBpZDogaSxcbiAgICAgICAgICAgIHByb3BzOiBub2RlUHJvcHNbaV0sXG4gICAgICAgICAgICB0b3A6IHRvcFRlcm1zLmluZGV4T2YoaSkgPiAtMSxcbiAgICAgICAgICAgIGVycm9yOiBpID09IDAsXG4gICAgICAgICAgICBza2lwcGVkOiBzcGVjLnNraXBwZWROb2RlcyAmJiBzcGVjLnNraXBwZWROb2Rlcy5pbmRleE9mKGkpID4gLTFcbiAgICAgICAgfSkpKTtcbiAgICAgICAgdGhpcy5tYXhUZXJtID0gc3BlYy5tYXhUZXJtO1xuICAgICAgICB0aGlzLnRva2VuaXplcnMgPSBzcGVjLnRva2VuaXplcnMubWFwKHZhbHVlID0+IHR5cGVvZiB2YWx1ZSA9PSBcIm51bWJlclwiID8gbmV3IFRva2VuR3JvdXAodG9rZW5BcnJheSwgdmFsdWUpIDogdmFsdWUpO1xuICAgICAgICB0aGlzLnRvcFJ1bGVzID0gc3BlYy50b3BSdWxlcztcbiAgICAgICAgdGhpcy5uZXN0ZWQgPSAoc3BlYy5uZXN0ZWQgfHwgW10pLm1hcCgoW25hbWUsIHZhbHVlLCBlbmRUb2tlbiwgcGxhY2Vob2xkZXJdKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4geyBuYW1lLCB2YWx1ZSwgZW5kOiBuZXcgVG9rZW5Hcm91cChkZWNvZGVBcnJheShlbmRUb2tlbiksIDApLCBwbGFjZWhvbGRlciB9O1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5kaWFsZWN0cyA9IHNwZWMuZGlhbGVjdHMgfHwge307XG4gICAgICAgIHRoaXMuZHluYW1pY1ByZWNlZGVuY2VzID0gc3BlYy5keW5hbWljUHJlY2VkZW5jZXMgfHwgbnVsbDtcbiAgICAgICAgdGhpcy50b2tlblByZWNUYWJsZSA9IHNwZWMudG9rZW5QcmVjO1xuICAgICAgICB0aGlzLnRlcm1OYW1lcyA9IHNwZWMudGVybU5hbWVzIHx8IG51bGw7XG4gICAgICAgIHRoaXMubWF4Tm9kZSA9IHRoaXMubm9kZVNldC50eXBlcy5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLmRpYWxlY3QgPSB0aGlzLnBhcnNlRGlhbGVjdCgpO1xuICAgICAgICB0aGlzLnRvcCA9IHRoaXMudG9wUnVsZXNbT2JqZWN0LmtleXModGhpcy50b3BSdWxlcylbMF1dO1xuICAgIH1cbiAgICAvLy8gUGFyc2UgYSBnaXZlbiBzdHJpbmcgb3Igc3RyZWFtLlxuICAgIHBhcnNlKGlucHV0LCBzdGFydFBvcyA9IDAsIGNvbnRleHQgPSB7fSkge1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICBpbnB1dCA9IHN0cmluZ0lucHV0KGlucHV0KTtcbiAgICAgICAgbGV0IGN4ID0gbmV3IFBhcnNlKHRoaXMsIGlucHV0LCBzdGFydFBvcywgY29udGV4dCk7XG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGxldCBkb25lID0gY3guYWR2YW5jZSgpO1xuICAgICAgICAgICAgaWYgKGRvbmUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvbmU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIFN0YXJ0IGFuIGluY3JlbWVudGFsIHBhcnNlLlxuICAgIHN0YXJ0UGFyc2UoaW5wdXQsIHN0YXJ0UG9zID0gMCwgY29udGV4dCA9IHt9KSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgIGlucHV0ID0gc3RyaW5nSW5wdXQoaW5wdXQpO1xuICAgICAgICByZXR1cm4gbmV3IFBhcnNlKHRoaXMsIGlucHV0LCBzdGFydFBvcywgY29udGV4dCk7XG4gICAgfVxuICAgIC8vLyBHZXQgYSBnb3RvIHRhYmxlIGVudHJ5IEBpbnRlcm5hbFxuICAgIGdldEdvdG8oc3RhdGUsIHRlcm0sIGxvb3NlID0gZmFsc2UpIHtcbiAgICAgICAgbGV0IHRhYmxlID0gdGhpcy5nb3RvO1xuICAgICAgICBpZiAodGVybSA+PSB0YWJsZVswXSlcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgZm9yIChsZXQgcG9zID0gdGFibGVbdGVybSArIDFdOzspIHtcbiAgICAgICAgICAgIGxldCBncm91cFRhZyA9IHRhYmxlW3BvcysrXSwgbGFzdCA9IGdyb3VwVGFnICYgMTtcbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSB0YWJsZVtwb3MrK107XG4gICAgICAgICAgICBpZiAobGFzdCAmJiBsb29zZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICAgICAgZm9yIChsZXQgZW5kID0gcG9zICsgKGdyb3VwVGFnID4+IDEpOyBwb3MgPCBlbmQ7IHBvcysrKVxuICAgICAgICAgICAgICAgIGlmICh0YWJsZVtwb3NdID09IHN0YXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICAgICAgaWYgKGxhc3QpXG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vLyBDaGVjayBpZiB0aGlzIHN0YXRlIGhhcyBhbiBhY3Rpb24gZm9yIGEgZ2l2ZW4gdGVybWluYWwgQGludGVybmFsXG4gICAgaGFzQWN0aW9uKHN0YXRlLCB0ZXJtaW5hbCkge1xuICAgICAgICBsZXQgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICAgICAgZm9yIChsZXQgc2V0ID0gMDsgc2V0IDwgMjsgc2V0KyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YXRlU2xvdChzdGF0ZSwgc2V0ID8gMiAvKiBTa2lwICovIDogMSAvKiBBY3Rpb25zICovKSwgbmV4dDs7IGkgKz0gMykge1xuICAgICAgICAgICAgICAgIGlmICgobmV4dCA9IGRhdGFbaV0pID09IDY1NTM1IC8qIEVuZCAqLykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtpICsgMV0gPT0gMSAvKiBOZXh0ICovKVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCA9IGRhdGFbaSA9IHBhaXIoZGF0YSwgaSArIDIpXTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGF0YVtpICsgMV0gPT0gMiAvKiBPdGhlciAqLylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWlyKGRhdGEsIGkgKyAyKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChuZXh0ID09IHRlcm1pbmFsIHx8IG5leHQgPT0gMCAvKiBFcnIgKi8pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYWlyKGRhdGEsIGkgKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgLy8vIEBpbnRlcm5hbFxuICAgIHN0YXRlU2xvdChzdGF0ZSwgc2xvdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZXNbKHN0YXRlICogNiAvKiBTaXplICovKSArIHNsb3RdO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgc3RhdGVGbGFnKHN0YXRlLCBmbGFnKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5zdGF0ZVNsb3Qoc3RhdGUsIDAgLyogRmxhZ3MgKi8pICYgZmxhZykgPiAwO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgZmluZE5lc3RlZChzdGF0ZSkge1xuICAgICAgICBsZXQgZmxhZ3MgPSB0aGlzLnN0YXRlU2xvdChzdGF0ZSwgMCAvKiBGbGFncyAqLyk7XG4gICAgICAgIHJldHVybiBmbGFncyAmIDQgLyogU3RhcnROZXN0ICovID8gdGhpcy5uZXN0ZWRbZmxhZ3MgPj4gMTAgLyogTmVzdFNoaWZ0ICovXSA6IG51bGw7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICB2YWxpZEFjdGlvbihzdGF0ZSwgYWN0aW9uKSB7XG4gICAgICAgIGlmIChhY3Rpb24gPT0gdGhpcy5zdGF0ZVNsb3Qoc3RhdGUsIDQgLyogRGVmYXVsdFJlZHVjZSAqLykpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhdGVTbG90KHN0YXRlLCAxIC8qIEFjdGlvbnMgKi8pOzsgaSArPSAzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldID09IDY1NTM1IC8qIEVuZCAqLykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaSArIDFdID09IDEgLyogTmV4dCAqLylcbiAgICAgICAgICAgICAgICAgICAgaSA9IHBhaXIodGhpcy5kYXRhLCBpICsgMik7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYWN0aW9uID09IHBhaXIodGhpcy5kYXRhLCBpICsgMSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8vIEdldCB0aGUgc3RhdGVzIHRoYXQgY2FuIGZvbGxvdyB0aGlzIG9uZSB0aHJvdWdoIHNoaWZ0IGFjdGlvbnMgb3JcbiAgICAvLy8gZ290byBqdW1wcy4gQGludGVybmFsXG4gICAgbmV4dFN0YXRlcyhzdGF0ZSkge1xuICAgICAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YXRlU2xvdChzdGF0ZSwgMSAvKiBBY3Rpb25zICovKTs7IGkgKz0gMykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSA9PSA2NTUzNSAvKiBFbmQgKi8pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW2kgKyAxXSA9PSAxIC8qIE5leHQgKi8pXG4gICAgICAgICAgICAgICAgICAgIGkgPSBwYWlyKHRoaXMuZGF0YSwgaSArIDIpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKHRoaXMuZGF0YVtpICsgMl0gJiAoNjU1MzYgLyogUmVkdWNlRmxhZyAqLyA+PiAxNikpID09IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSB0aGlzLmRhdGFbaSArIDFdO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LnNvbWUoKHYsIGkpID0+IChpICYgMSkgJiYgdiA9PSB2YWx1ZSkpXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHRoaXMuZGF0YVtpXSwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBvdmVycmlkZXModG9rZW4sIHByZXYpIHtcbiAgICAgICAgbGV0IGlQcmV2ID0gZmluZE9mZnNldCh0aGlzLmRhdGEsIHRoaXMudG9rZW5QcmVjVGFibGUsIHByZXYpO1xuICAgICAgICByZXR1cm4gaVByZXYgPCAwIHx8IGZpbmRPZmZzZXQodGhpcy5kYXRhLCB0aGlzLnRva2VuUHJlY1RhYmxlLCB0b2tlbikgPCBpUHJldjtcbiAgICB9XG4gICAgLy8vIENvbmZpZ3VyZSB0aGUgcGFyc2VyLiBSZXR1cm5zIGEgbmV3IHBhcnNlciBpbnN0YW5jZSB0aGF0IGhhcyB0aGVcbiAgICAvLy8gZ2l2ZW4gc2V0dGluZ3MgbW9kaWZpZWQuIFNldHRpbmdzIG5vdCBwcm92aWRlZCBpbiBgY29uZmlnYCBhcmVcbiAgICAvLy8ga2VwdCBmcm9tIHRoZSBvcmlnaW5hbCBwYXJzZXIuXG4gICAgY29uZmlndXJlKGNvbmZpZykge1xuICAgICAgICAvLyBIaWRlb3VzIHJlZmxlY3Rpb24tYmFzZWQga2x1ZGdlIHRvIG1ha2UgaXQgZWFzeSB0byBjcmVhdGUgYVxuICAgICAgICAvLyBzbGlnaHRseSBtb2RpZmllZCBjb3B5IG9mIGEgcGFyc2VyLlxuICAgICAgICBsZXQgY29weSA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShQYXJzZXIucHJvdG90eXBlKSwgdGhpcyk7XG4gICAgICAgIGlmIChjb25maWcucHJvcHMpXG4gICAgICAgICAgICBjb3B5Lm5vZGVTZXQgPSB0aGlzLm5vZGVTZXQuZXh0ZW5kKC4uLmNvbmZpZy5wcm9wcyk7XG4gICAgICAgIGlmIChjb25maWcudG9wKSB7XG4gICAgICAgICAgICBsZXQgaW5mbyA9IHRoaXMudG9wUnVsZXNbY29uZmlnLnRvcF07XG4gICAgICAgICAgICBpZiAoIWluZm8pXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYEludmFsaWQgdG9wIHJ1bGUgbmFtZSAke2NvbmZpZy50b3B9YCk7XG4gICAgICAgICAgICBjb3B5LnRvcCA9IGluZm87XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbmZpZy50b2tlbml6ZXJzKVxuICAgICAgICAgICAgY29weS50b2tlbml6ZXJzID0gdGhpcy50b2tlbml6ZXJzLm1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBjb25maWcudG9rZW5pemVycy5maW5kKHIgPT4gci5mcm9tID09IHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3VuZCA/IGZvdW5kLnRvIDogdDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBpZiAoY29uZmlnLmRpYWxlY3QpXG4gICAgICAgICAgICBjb3B5LmRpYWxlY3QgPSB0aGlzLnBhcnNlRGlhbGVjdChjb25maWcuZGlhbGVjdCk7XG4gICAgICAgIGlmIChjb25maWcubmVzdGVkKVxuICAgICAgICAgICAgY29weS5uZXN0ZWQgPSB0aGlzLm5lc3RlZC5tYXAob2JqID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25maWcubmVzdGVkLCBvYmoubmFtZSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogb2JqLm5hbWUsIHZhbHVlOiBjb25maWcubmVzdGVkW29iai5uYW1lXSwgZW5kOiBvYmouZW5kLCBwbGFjZWhvbGRlcjogb2JqLnBsYWNlaG9sZGVyIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKGNvbmZpZy5zdHJpY3QgIT0gbnVsbClcbiAgICAgICAgICAgIGNvcHkuc3RyaWN0ID0gY29uZmlnLnN0cmljdDtcbiAgICAgICAgaWYgKGNvbmZpZy5idWZmZXJMZW5ndGggIT0gbnVsbClcbiAgICAgICAgICAgIGNvcHkuYnVmZmVyTGVuZ3RoID0gY29uZmlnLmJ1ZmZlckxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgfVxuICAgIC8vLyBSZXR1cm5zIHRoZSBuYW1lIGFzc29jaWF0ZWQgd2l0aCBhIGdpdmVuIHRlcm0uIFRoaXMgd2lsbCBvbmx5XG4gICAgLy8vIHdvcmsgZm9yIGFsbCB0ZXJtcyB3aGVuIHRoZSBwYXJzZXIgd2FzIGdlbmVyYXRlZCB3aXRoIHRoZVxuICAgIC8vLyBgLS1uYW1lc2Agb3B0aW9uLiBCeSBkZWZhdWx0LCBvbmx5IHRoZSBuYW1lcyBvZiB0YWdnZWQgdGVybXMgYXJlXG4gICAgLy8vIHN0b3JlZC5cbiAgICBnZXROYW1lKHRlcm0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGVybU5hbWVzID8gdGhpcy50ZXJtTmFtZXNbdGVybV0gOiBTdHJpbmcodGVybSA8PSB0aGlzLm1heE5vZGUgJiYgdGhpcy5ub2RlU2V0LnR5cGVzW3Rlcm1dLm5hbWUgfHwgdGVybSk7XG4gICAgfVxuICAgIC8vLyBUaGUgZW9mIHRlcm0gaWQgaXMgYWx3YXlzIGFsbG9jYXRlZCBkaXJlY3RseSBhZnRlciB0aGUgbm9kZVxuICAgIC8vLyB0eXBlcy4gQGludGVybmFsXG4gICAgZ2V0IGVvZlRlcm0oKSB7IHJldHVybiB0aGlzLm1heE5vZGUgKyAxOyB9XG4gICAgLy8vIFRlbGxzIHlvdSB3aGV0aGVyIHRoaXMgZ3JhbW1hciBoYXMgYW55IG5lc3RlZCBncmFtbWFycy5cbiAgICBnZXQgaGFzTmVzdGVkKCkgeyByZXR1cm4gdGhpcy5uZXN0ZWQubGVuZ3RoID4gMDsgfVxuICAgIC8vLyBUaGUgdHlwZSBvZiB0b3Agbm9kZSBwcm9kdWNlZCBieSB0aGUgcGFyc2VyLlxuICAgIGdldCB0b3BOb2RlKCkgeyByZXR1cm4gdGhpcy5ub2RlU2V0LnR5cGVzW3RoaXMudG9wWzFdXTsgfVxuICAgIC8vLyBAaW50ZXJuYWxcbiAgICBkeW5hbWljUHJlY2VkZW5jZSh0ZXJtKSB7XG4gICAgICAgIGxldCBwcmVjID0gdGhpcy5keW5hbWljUHJlY2VkZW5jZXM7XG4gICAgICAgIHJldHVybiBwcmVjID09IG51bGwgPyAwIDogcHJlY1t0ZXJtXSB8fCAwO1xuICAgIH1cbiAgICAvLy8gQGludGVybmFsXG4gICAgcGFyc2VEaWFsZWN0KGRpYWxlY3QpIHtcbiAgICAgICAgaWYgKHRoaXMuY2FjaGVkRGlhbGVjdCAmJiB0aGlzLmNhY2hlZERpYWxlY3Quc291cmNlID09IGRpYWxlY3QpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZWREaWFsZWN0O1xuICAgICAgICBsZXQgdmFsdWVzID0gT2JqZWN0LmtleXModGhpcy5kaWFsZWN0cyksIGZsYWdzID0gdmFsdWVzLm1hcCgoKSA9PiBmYWxzZSk7XG4gICAgICAgIGlmIChkaWFsZWN0KVxuICAgICAgICAgICAgZm9yIChsZXQgcGFydCBvZiBkaWFsZWN0LnNwbGl0KFwiIFwiKSkge1xuICAgICAgICAgICAgICAgIGxldCBpZCA9IHZhbHVlcy5pbmRleE9mKHBhcnQpO1xuICAgICAgICAgICAgICAgIGlmIChpZCA+PSAwKVxuICAgICAgICAgICAgICAgICAgICBmbGFnc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICBsZXQgZGlzYWJsZWQgPSBudWxsO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGlmICghZmxhZ3NbaV0pIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gdGhpcy5kaWFsZWN0c1t2YWx1ZXNbaV1dLCBpZDsgKGlkID0gdGhpcy5kYXRhW2orK10pICE9IDY1NTM1IC8qIEVuZCAqLzspXG4gICAgICAgICAgICAgICAgICAgIChkaXNhYmxlZCB8fCAoZGlzYWJsZWQgPSBuZXcgVWludDhBcnJheSh0aGlzLm1heFRlcm0gKyAxKSkpW2lkXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlZERpYWxlY3QgPSBuZXcgRGlhbGVjdChkaWFsZWN0LCBmbGFncywgZGlzYWJsZWQpO1xuICAgIH1cbiAgICAvLy8gKHVzZWQgYnkgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyIGdlbmVyYXRvcikgQGludGVybmFsXG4gICAgc3RhdGljIGRlc2VyaWFsaXplKHNwZWMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJzZXIoc3BlYyk7XG4gICAgfVxufVxuZnVuY3Rpb24gcGFpcihkYXRhLCBvZmYpIHsgcmV0dXJuIGRhdGFbb2ZmXSB8IChkYXRhW29mZiArIDFdIDw8IDE2KTsgfVxuZnVuY3Rpb24gZmluZE9mZnNldChkYXRhLCBzdGFydCwgdGVybSkge1xuICAgIGZvciAobGV0IGkgPSBzdGFydCwgbmV4dDsgKG5leHQgPSBkYXRhW2ldKSAhPSA2NTUzNSAvKiBFbmQgKi87IGkrKylcbiAgICAgICAgaWYgKG5leHQgPT0gdGVybSlcbiAgICAgICAgICAgIHJldHVybiBpIC0gc3RhcnQ7XG4gICAgcmV0dXJuIC0xO1xufVxuZnVuY3Rpb24gZmluZEZpbmlzaGVkKHN0YWNrcykge1xuICAgIGxldCBiZXN0ID0gbnVsbDtcbiAgICBmb3IgKGxldCBzdGFjayBvZiBzdGFja3MpIHtcbiAgICAgICAgaWYgKHN0YWNrLnBvcyA9PSBzdGFjay5wLmlucHV0Lmxlbmd0aCAmJlxuICAgICAgICAgICAgc3RhY2sucC5wYXJzZXIuc3RhdGVGbGFnKHN0YWNrLnN0YXRlLCAyIC8qIEFjY2VwdGluZyAqLykgJiZcbiAgICAgICAgICAgICghYmVzdCB8fCBiZXN0LnNjb3JlIDwgc3RhY2suc2NvcmUpKVxuICAgICAgICAgICAgYmVzdCA9IHN0YWNrO1xuICAgIH1cbiAgICByZXR1cm4gYmVzdDtcbn1cblxuZXhwb3J0IHsgQ29udGV4dFRyYWNrZXIsIEV4dGVybmFsVG9rZW5pemVyLCBQYXJzZXIsIFN0YWNrLCBUb2tlbiB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguZXMuanMubWFwXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbl9fd2VicGFja19yZXF1aXJlX18ubiA9IChtb2R1bGUpID0+IHtcblx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG5cdFx0KCkgPT4gKG1vZHVsZVsnZGVmYXVsdCddKSA6XG5cdFx0KCkgPT4gKG1vZHVsZSk7XG5cdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsIHsgYTogZ2V0dGVyIH0pO1xuXHRyZXR1cm4gZ2V0dGVyO1xufTsiLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwidmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG52YXIgX19nZW5lcmF0b3IgPSAodGhpcyAmJiB0aGlzLl9fZ2VuZXJhdG9yKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgYm9keSkge1xuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxufTtcbmltcG9ydCB7IGNvbXBpbGUgfSBmcm9tICcuL2NvbXBpbGVyJztcbmltcG9ydCB7IHJ1bndhdHNyYyB9IGZyb20gJy4vcnVubmVyJztcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIF9fYXdhaXRlcih2b2lkIDAsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gZGlzcGxheShhcmcpIHtcbiAgICAgICAgdmFyIGVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwcmVcIik7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3V0cHV0XCIpLmFwcGVuZENoaWxkKGVsdCk7XG4gICAgICAgIGVsdC5pbm5lclRleHQgPSBhcmc7XG4gICAgfVxuICAgIHZhciBtZW1vcnksIGltcG9ydE9iamVjdCwgcnVuQnV0dG9uLCB1c2VyQ29kZTtcbiAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgIG1lbW9yeSA9IG5ldyBXZWJBc3NlbWJseS5NZW1vcnkoeyBpbml0aWFsOiAxMCwgbWF4aW11bTogMTAwIH0pO1xuICAgICAgICBpbXBvcnRPYmplY3QgPSB7XG4gICAgICAgICAgICBpbXBvcnRzOiB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbnVtOiBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9nZ2luZyBmcm9tIFdBU006IFwiLCBhcmcpO1xuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5KFN0cmluZyhhcmcpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByaW50X2Jvb2w6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheShcIkZhbHNlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheShcIlRydWVcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByaW50X25vbmU6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheShcIk5vbmVcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcmludDogZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxvZ2dpbmcgZnJvbSBXQVNNOiBcIiwgYXJnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwcmVcIik7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3V0cHV0XCIpLmFwcGVuZENoaWxkKGVsdCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVsdC5pbm5lclRleHQgPSBhcmc7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZW06IG1lbW9yeSxcbiAgICAgICAgICAgICAgICBhYnM6IE1hdGguYWJzLFxuICAgICAgICAgICAgICAgIG1heDogTWF0aC5tYXgsXG4gICAgICAgICAgICAgICAgbWluOiBNYXRoLm1pbixcbiAgICAgICAgICAgICAgICBwb3c6IE1hdGgucG93XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICBydW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ1blwiKTtcbiAgICAgICAgdXNlckNvZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVzZXItY29kZVwiKTtcbiAgICAgICAgcnVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7IHJldHVybiBfX2F3YWl0ZXIodm9pZCAwLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHByb2dyYW0sIG91dHB1dCwgd2F0LCBjb2RlLCByZXN1bHQsIGkzMiwgaSwgZV8xO1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbSA9IHVzZXJDb2RlLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvdXRwdXRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQudGV4dENvbnRlbnQgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcm9ncmFtOiBcIi5jb25jYXQocHJvZ3JhbSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2EubGFiZWwgPSAxO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYS50cnlzLnB1c2goWzEsIDMsICwgNF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2F0ID0gY29tcGlsZShwcm9ncmFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbmVyYXRlZC1jb2RlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZS50ZXh0Q29udGVudCA9IHdhdC53YXNtU291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzQgLyp5aWVsZCovLCBydW53YXRzcmMocHJvZ3JhbSwgeyBpbXBvcnRPYmplY3Q6IGltcG9ydE9iamVjdCB9KV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkzMiA9IG5ldyBVaW50MzJBcnJheShtZW1vcnkuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJpMzJbXCIuY29uY2F0KGksIFwiXTogXCIpLmNvbmNhdChpMzJbaV0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC50ZXh0Q29udGVudCArPSBTdHJpbmcocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImNvbG9yOiBibGFja1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMyAvKmJyZWFrKi8sIDRdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgICAgICBlXzEgPSBfYS5zZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVfMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQudGV4dENvbnRlbnQgPSBTdHJpbmcoZV8xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImNvbG9yOiByZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzMgLypicmVhayovLCA0XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OiByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pOyB9KTtcbiAgICAgICAgdXNlckNvZGUudmFsdWUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInByb2dyYW1cIik7XG4gICAgICAgIHVzZXJDb2RlLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBmdW5jdGlvbiAoKSB7IHJldHVybiBfX2F3YWl0ZXIodm9pZCAwLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicHJvZ3JhbVwiLCB1c2VyQ29kZS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsyIC8qcmV0dXJuKi9dO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pOyB9KTtcbiAgICAgICAgcmV0dXJuIFsyIC8qcmV0dXJuKi9dO1xuICAgIH0pO1xufSk7IH0pO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9