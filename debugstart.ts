import { parser } from 'lezer-python';
import { TreeCursor } from 'lezer-tree';
import { traverseStmt, parse, stringifyTree } from './parser';
import { returnTestCases, callTestCases, programTestCases, compiledTestCases, typeCheckCases, typeCheckHasReturnCases} from './oldTests/cases.test';
import {compile } from './compiler';

import * as fs from 'fs';
import { setupEnv, typeCheckHasReturn, typeCheckProgram } from './typecheck';

export function printTestInfo(t: TreeCursor, source: string) {
    // console.log("========== print cursor ==========");
    // console.log(t)
    console.log("========== print tree ==========")
    console.log(stringifyTree(t, source, 2));
}

export function readCode(codePath:string): string {
    return fs.readFileSync(codePath,'utf8');
}

export function program0(){
    const s = programTestCases[0].input;
    const parsed = parse(s);
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

export function program1(){
    const s = programTestCases[1].input;
    const parsed = parse(s);
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
    if(parsed.stmts[0].tag === 'expr') {
        console.log("----------");
        if(parsed.stmts[0].expr.tag === "call") {
            console.log(parsed.stmts[0].expr.args);
        }
    }
}

export function program2(){
    const s = programTestCases[2].input;
    const parsed = parse(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== stmts ==========");
    console.log(parsed.stmts[0]);
    const stmt = parsed.stmts[0];
    if(stmt.tag === "while") {
        console.log(stmt.cond);
        

        // statement 0 \\ print(x)
        const stmt0 = stmt.stmts[0];
        if(stmt0.tag === "expr") {
            console.log("----------- stmt 0 -----------");
            console.log(stmt0.expr);
        } 
        
        // statement 1 \\ x = x + 1
        const stmt1 = stmt.stmts[1];
        if (stmt1.tag === "assign" && stmt1.value.tag === "binop") {
            console.log("----------- stmt 1 -----------");
            console.log(stmt1.value);
        }
    }
}
export function call3() {
    const s = callTestCases[3].input;
    const c = parser.parse(s).cursor();
    c.firstChild();
    const parsed = traverseStmt(c, s);
    console.log(parsed);
}
export function program3(){
    console.log(`*********** ${programTestCases[3].name} **********`)
    const s = programTestCases[3].input;
    console.log(s);
    const parsed = parse(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== func def ==========");
    console.log(parsed.funcDefs[0]);
    const stmt0 = parsed.funcDefs[0].stmts[0];
    
    if(stmt0.tag === "while") {
        console.log("---------- cond ----------");
        console.log(stmt0.cond);
        console.log("---------- body ----------")
        console.log(stmt0.stmts[0]);
        const stmt00 = stmt0.stmts[0];
        if(stmt00.tag === "if"){
            console.log(stmt00.ifOp.cond);
            console.log(stmt00.ifOp.stmts[0]);
        }
        console.log(stmt0.stmts[1]);
        if(stmt0.stmts[1].tag === "assign") {
            console.log(stmt0.stmts[1].value);
        }
    }
    console.log("========== stmts ==========");
    console.log(parsed.stmts[0]);
    const stmt = parsed.stmts[0];
    if(stmt.tag === "while") {
        console.log(stmt.cond);
        

        // statement 0 \\ print(x)
        const stmt0 = stmt.stmts[0];
        if(stmt0.tag === "expr") {
            console.log("----------- stmt 0 -----------");
            console.log(stmt0.expr);
        } 
        
        // statement 1 \\ x = x + 1
        const stmt1 = stmt.stmts[1];
        if (stmt1.tag === "assign" && stmt1.value.tag === "binop") {
            console.log("----------- stmt 1 -----------");
            console.log(stmt1.value);
        }
    }
}

export function program4(){
    console.log(`*********** ${programTestCases[4].name} **********`)
    const s = programTestCases[4].input;
    console.log(s);
    const parsed = parse(s);
    console.log(parsed);
    console.log("========== varInits ==========");
    console.log(parsed.varInits[0]);
    console.log("========== func def ==========");
    console.log(parsed.funcDefs[0]);
    console.log("========== stmts ==========");
    console.log(parsed.stmts);
    const stmt0 = parsed.stmts[0];
    console.log(stmt0);
    if(stmt0.tag === "expr") {
        console.log(stmt0.expr);
        if(stmt0.expr.tag === "call") {
            console.log(stmt0.expr.args);
        }
    }
    const stmt1 = parsed.stmts[0];
    console.log(stmt1);
    if(stmt1.tag === "expr") {
        console.log(stmt1.expr);
    }
    
}

export function return4() {
    const s = returnTestCases[4].input;
    const c = parser.parse(s).cursor();
    c.firstChild();
    const parsed = traverseStmt(c, s);
    console.log(parsed);
}

export function program5() {
    const s = programTestCases[5].input;
    const parsed = parse(s);
    // console.log(parsed);

    // deal with func defs
    // console.log(parsed.funcDefs[0].stmts[2]);
    // if(parsed.funcDefs[0].stmts[2].tag === "expr") {
    //     console.log(parsed.funcDefs[0].stmts[2].expr);
    // }
    // console.log(parsed.stmts[0]);
    if(parsed.stmts[0].tag === 'expr') {
        if (parsed.stmts[0].expr.tag === 'call')
            console.log(parsed.stmts[0].expr.args);
    }
}
export function program6() {
    const s = programTestCases[6].input;
    const parsed = parse(s);
    // console.log(parsed);

    console.log(parsed.varInits);
}
export function program7() {
    const s = programTestCases[7].input;
    const parsed = parse(s);
    console.log(parsed.funcDefs[0].stmts);

    // console.log(parsed.varInits);
}

export function program8() {
    const s = programTestCases[8].input;
    const parsed = parse(s);
    if(parsed.stmts[0].tag === "expr") {
        console.log(parsed.stmts[0].expr);
    }
}

export function program(idx : number) {
    const s = programTestCases[idx].input;
    const parsed = parse(s);
    console.log(parsed);
}

function funcCompiled0() {
    console.log(compiledTestCases[0].input);
    const c = compile(compiledTestCases[0].input);
    console.log(c.wasmSource);
}
function funcCompiled1(idx: number) {
    console.log(compiledTestCases[idx].input);
    const c = compile(compiledTestCases[idx].input);
    console.log(c.wasmSource);
}

function typeCheck0(idx: number) {
    const t = typeCheckCases[idx];
    const program = parse(t.input);
    const typeCheck = typeCheckProgram(program);
}

function checkHasReturn(idx: number) {
    const t = typeCheckHasReturnCases[idx];
    const program = parse(t.input);
    const env = setupEnv(program);
    console.log(program)
    console.log(typeCheckHasReturn(program.funcDefs[0].stmts, env))
}

// typeCheck0(22);
// program(11);
funcCompiled1(12);
