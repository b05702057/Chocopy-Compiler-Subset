"use strict";
exports.__esModule = true;
exports.program8 = exports.program7 = exports.program6 = exports.program5 = exports.return4 = exports.program4 = exports.program3 = exports.call3 = exports.program2 = exports.program1 = exports.program0 = exports.readCode = exports.printTestInfo = void 0;
var lezer_python_1 = require("lezer-python");
var parser_1 = require("./parser");
var cases_test_1 = require("./tests/cases.test");
var compiler_1 = require("./compiler");
var fs = require("fs");
var typecheck_1 = require("./typecheck");
function printTestInfo(t, source) {
    // console.log("========== print cursor ==========");
    // console.log(t)
    console.log("========== print tree ==========");
    console.log((0, parser_1.stringifyTree)(t, source, 2));
}
exports.printTestInfo = printTestInfo;
function readCode(codePath) {
    return fs.readFileSync(codePath, 'utf8');
}
exports.readCode = readCode;
function program0() {
    var s = cases_test_1.programTestCases[0].input;
    var parsed = (0, parser_1.parse)(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== func defs ==========");
    console.log(parsed.funcDefs[0]);
    console.log(parsed.funcDefs[0].varInits[0].initLiteral);
    console.log("========== stmts ==========");
    console.log(parsed.stmts[0]);
    console.log(parsed.stmts[0].tag);
}
exports.program0 = program0;
function program1() {
    var s = cases_test_1.programTestCases[1].input;
    var parsed = (0, parser_1.parse)(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== func defs ==========");
    console.log(parsed.funcDefs[0]);
    console.log("----------");
    console.log(parsed.funcDefs[0].varInits[0].initLiteral);
    console.log(parsed.funcDefs[0].stmts[0]);
    console.log("========== stmts ==========");
    console.log(parsed.stmts[0]);
    if (parsed.stmts[0].tag === 'expr') {
        console.log("----------");
        if (parsed.stmts[0].expr.tag === "call") {
            console.log(parsed.stmts[0].expr.args);
        }
    }
}
exports.program1 = program1;
function program2() {
    var s = cases_test_1.programTestCases[2].input;
    var parsed = (0, parser_1.parse)(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== stmts ==========");
    console.log(parsed.stmts[0]);
    var stmt = parsed.stmts[0];
    if (stmt.tag === "while") {
        console.log(stmt.cond);
        // statement 0 \\ print(x)
        var stmt0 = stmt.stmts[0];
        if (stmt0.tag === "expr") {
            console.log("----------- stmt 0 -----------");
            console.log(stmt0.expr);
        }
        // statement 1 \\ x = x + 1
        var stmt1 = stmt.stmts[1];
        if (stmt1.tag === "assign" && stmt1.value.tag === "binop") {
            console.log("----------- stmt 1 -----------");
            console.log(stmt1.value);
        }
    }
}
exports.program2 = program2;
function call3() {
    var s = cases_test_1.callTestCases[3].input;
    var c = lezer_python_1.parser.parse(s).cursor();
    c.firstChild();
    var parsed = (0, parser_1.traverseStmt)(c, s);
    console.log(parsed);
}
exports.call3 = call3;
function program3() {
    console.log("*********** ".concat(cases_test_1.programTestCases[3].name, " **********"));
    var s = cases_test_1.programTestCases[3].input;
    console.log(s);
    var parsed = (0, parser_1.parse)(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== func def ==========");
    console.log(parsed.funcDefs[0]);
    var stmt0 = parsed.funcDefs[0].stmts[0];
    if (stmt0.tag === "while") {
        console.log("---------- cond ----------");
        console.log(stmt0.cond);
        console.log("---------- body ----------");
        console.log(stmt0.stmts[0]);
        var stmt00 = stmt0.stmts[0];
        if (stmt00.tag === "if") {
            console.log(stmt00.ifOp.cond);
            console.log(stmt00.ifOp.stmts[0]);
        }
        console.log(stmt0.stmts[1]);
        if (stmt0.stmts[1].tag === "assign") {
            console.log(stmt0.stmts[1].value);
        }
    }
    console.log("========== stmts ==========");
    console.log(parsed.stmts[0]);
    var stmt = parsed.stmts[0];
    if (stmt.tag === "while") {
        console.log(stmt.cond);
        // statement 0 \\ print(x)
        var stmt0_1 = stmt.stmts[0];
        if (stmt0_1.tag === "expr") {
            console.log("----------- stmt 0 -----------");
            console.log(stmt0_1.expr);
        }
        // statement 1 \\ x = x + 1
        var stmt1 = stmt.stmts[1];
        if (stmt1.tag === "assign" && stmt1.value.tag === "binop") {
            console.log("----------- stmt 1 -----------");
            console.log(stmt1.value);
        }
    }
}
exports.program3 = program3;
function program4() {
    console.log("*********** ".concat(cases_test_1.programTestCases[4].name, " **********"));
    var s = cases_test_1.programTestCases[4].input;
    console.log(s);
    var parsed = (0, parser_1.parse)(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== func def ==========");
    console.log(parsed.funcDefs[0]);
    console.log("========== stmts ==========");
    console.log(parsed.stmts);
    var stmt0 = parsed.stmts[0];
    console.log(stmt0);
    if (stmt0.tag === "expr") {
        console.log(stmt0.expr);
        if (stmt0.expr.tag === "call") {
            console.log(stmt0.expr.args);
        }
    }
    var stmt1 = parsed.stmts[0];
    console.log(stmt1);
    if (stmt1.tag === "expr") {
        console.log(stmt1.expr);
    }
}
exports.program4 = program4;
function return4() {
    var s = cases_test_1.returnTestCases[4].input;
    var c = lezer_python_1.parser.parse(s).cursor();
    c.firstChild();
    var parsed = (0, parser_1.traverseStmt)(c, s);
    console.log(parsed);
}
exports.return4 = return4;
function program5() {
    var s = cases_test_1.programTestCases[5].input;
    var parsed = (0, parser_1.parse)(s);
    // console.log(parsed);
    // deal with func defs
    // console.log(parsed.funcDefs[0].stmts[2]);
    // if(parsed.funcDefs[0].stmts[2].tag === "expr") {
    //     console.log(parsed.funcDefs[0].stmts[2].expr);
    // }
    // console.log(parsed.stmts[0]);
    if (parsed.stmts[0].tag === 'expr') {
        if (parsed.stmts[0].expr.tag === 'call')
            console.log(parsed.stmts[0].expr.args);
    }
}
exports.program5 = program5;
function program6() {
    var s = cases_test_1.programTestCases[6].input;
    var parsed = (0, parser_1.parse)(s);
    // console.log(parsed);
    console.log(parsed.varInits);
}
exports.program6 = program6;
function program7() {
    var s = cases_test_1.programTestCases[7].input;
    var parsed = (0, parser_1.parse)(s);
    console.log(parsed.funcDefs[0].stmts);
    // console.log(parsed.varInits);
}
exports.program7 = program7;
function program8() {
    var s = cases_test_1.programTestCases[8].input;
    var parsed = (0, parser_1.parse)(s);
    if (parsed.stmts[0].tag === "expr") {
        console.log(parsed.stmts[0].expr);
    }
}
exports.program8 = program8;
function funcCompiled0() {
    console.log(cases_test_1.compiledTestCases[0].input);
    var c = (0, compiler_1.compile)(cases_test_1.compiledTestCases[0].input);
    console.log(c.wasmSource);
}
function funcCompiled1() {
    console.log(cases_test_1.compiledTestCases[6].input);
    var c = (0, compiler_1.compile)(cases_test_1.compiledTestCases[6].input);
    console.log(c.wasmSource);
}
function typeCheck0(idx) {
    var t = cases_test_1.typeCheckCases[idx];
    var program = (0, parser_1.parse)(t.input);
    var typeCheck = (0, typecheck_1.typeCheckProgram)(program);
}
function checkHasReturn(idx) {
    var t = cases_test_1.typeCheckHasReturnCases[idx];
    var program = (0, parser_1.parse)(t.input);
    var env = (0, typecheck_1.setupEnv)(program);
    console.log(program);
    console.log((0, typecheck_1.typeCheckHasReturn)(program.funcDefs[0].stmts, env));
}
// typeCheck0(16);
program8();
// funcCompiled1();
