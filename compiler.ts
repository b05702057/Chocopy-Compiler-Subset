
import { Stmt, Expr, BinOp, Type, VarInit, FuncDef, TypedVar, Literal, Program, UniOp } from "./ast";
import { parse } from "./parser";
import { typeCheckProgram } from "./typecheck";

// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

export type CompileResult = {
  wasmSource: string,
};

export type GlobalEnv = {
  vars: Map<string, VarInit<Type>>,
  funcs: Map<string, FuncDef<Type>>,
  loopDepth: number
}

export function createEmptyGlobalEnv(): GlobalEnv {
  return {
    vars: new Map<string, VarInit<Type>>(),
    funcs: new Map<string, FuncDef<Type>>(),
    loopDepth: 0
  }
}

export function setGlobalInfo(program: Program<Type>) {
  
  const globalEnv = createEmptyGlobalEnv();

  // set variables
  for(let idx = 0; idx < program.varInits.length; ++idx) {
    globalEnv.vars.set(program.varInits[idx].name, program.varInits[idx]);
  }

  // set funcstions
  for(let idx = 0; idx < program.funcDefs.length; ++idx) {
    globalEnv.funcs.set(program.funcDefs[idx].name, program.funcDefs[idx]);
  }

  return globalEnv;
}

export function compile(source: string) : CompileResult {

  // parse program and get each elements
  const program = typeCheckProgram(parse(source));
  const ast = program.stmts;
  const globalEnv = setGlobalInfo(program);
  
  // generate function definitaions
  const funcs = program.funcDefs.map(funcDef => {
    return codeGenFuncDef(funcDef, globalEnv);
  }).join('\n');
  
  // generate global variables
  const globalVars = codeGenGlobalVar(program.varInits).join('\n');

  // generate the code for the main body
  const commands =codeGenMainBody(ast, globalEnv);
  console.log(commands);
  // set up final function return type
  const lastExpr = ast[ast.length - 1]
  let returnType = "";
  let returnExpr = "";
  // console.log(`ast.length: ${ast.length}, lastExpr: ${lastExpr.tag}`);
  if(ast.length > 0 && lastExpr.tag === "expr") {
    returnType = "(result i32)";
    returnExpr = "(local.get $last)";
  }

  return {
    wasmSource: `${globalVars}\n${funcs}\n(func (export "exported_func") ${returnType}${commands.join('\n')}${returnExpr})`
  };
}

function codeGen(stmt: Stmt<Type>, globalEnv: GlobalEnv) : string[] {
  switch(stmt.tag) {
    case "assign":
      let valStmts = codeGenExpr(stmt.value, globalEnv);
      if(globalEnv.vars.has(stmt.name)) {
        return valStmts.concat([`(global.set $${stmt.name})`]);
      }
      return valStmts.concat([`(local.set $${stmt.name})`]);
    case "expr":
      let exprStmts = codeGenExpr(stmt.expr, globalEnv);
      return exprStmts.concat([`(local.set $last)`]);
    case "return":
      let returnStmts = codeGenExpr(stmt.expr, globalEnv);
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

function codeGenMainBody(stmts: Stmt<Type>[], globalEnv: GlobalEnv): string[] {
  // deal with the body statement of the program
  const definedVars = new Set();
  stmts.forEach(s => {
    switch(s.tag) {
      case "assign":
        definedVars.add(s.name);
        break;
    }
  }); 

  // declare all local variables according to the source
  const scratchVar : string = `(local $last i32)`;
  const localDefines = [scratchVar];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i32)`);
  })

  const commandGroups = stmts.map((stmt) => codeGen(stmt, globalEnv));
  return localDefines.concat([].concat.apply([], commandGroups));
}

function codeGenExpr(expr : Expr<Type>, globalEnv: GlobalEnv) : Array<string> {
  switch(expr.tag) {
    case "id":
      return [codeGenId(expr, globalEnv)];
    case "binop":
      const leftStmts = codeGenExpr(expr.left, globalEnv);
      const rightStmts = codeGenExpr(expr.right, globalEnv);
      const opStmt = codeGenBinOp(expr.op);
      return [...leftStmts, ...rightStmts, opStmt]
    case "uniop": 
      const uniopRight = codeGenExpr(expr.expr, globalEnv);
      return codeGenUnionOp(expr.op, uniopRight);
    case "literal":
        return [codeGenLiteral(expr.literal)];
    case "call": 
      return codeGenCall(expr, globalEnv);
  }
}

function codeGenBinOp(op: BinOp): string {
  switch(op) {
    case BinOp.Plus :
      return  "(i32.add)";
    case BinOp.Minus:
      return  "(i32.sub)";
    case BinOp.Mul  :
      return  "(i32.mul)";
    case BinOp.Div  :
      return  "(i32.div_s)";
    case BinOp.Mod  :
      return  "(i32.rem_s)";
    case BinOp.Eq   :
      return  "(i32.eq)";
    case BinOp.Neq  :
      return  "(i32.ne)"
    case BinOp.Seq  :
      return  "(i32.le_s)";
    case BinOp.Leq  :
      return  "(i32.ge_s)";
    case BinOp.Sml  :
      return  "(i32.lt_s)";
    case BinOp.Lrg  :
      return  "(i32.gt_s)";
    case BinOp.Is   : 
      // x is y 
      // e.g. y is a class and x is an object of that class
      // currently, the only class is None, so we can use eq
      // throw new Error("COMPILE ERROR: is operator not implemented")
      return  "(i32.eq)";
  }
}

function codeGenUnionOp(op: UniOp, right: string[]): string[] {
  switch(op) {
    case UniOp.Minus:
      return ["(i32.const 0)", ...right, "(i32.sub) "];
    case UniOp.Not:
      return [...right, "(i32.eqz)"];
  }
}

function codeGenIf(stmt: Stmt<Type>, globalEnv: GlobalEnv): string[] {
  if(stmt.tag !== 'if') {
    throw new Error("COMPILE ERROR: the input to codeGenIf should have tag if");
  }

  const ifCond = codeGenExpr(stmt.ifOp.cond, globalEnv).join('\n');
  const ifBody = codeGenBody(stmt.ifOp.stmts, globalEnv).join('\n');

  let elifCond = "(i32.const 0)";
  let elifBody = "nop";

  let elseBody = "nop";

  // has else if
  if(stmt.elifOp.cond !== null) {
    elifCond = codeGenExpr(stmt.elifOp.cond, globalEnv).join('\n');
    elifBody = codeGenBody(stmt.elifOp.stmts, globalEnv).join('\n');
  } 
  if(stmt.elseOp.stmts !== null) { 
    elseBody = codeGenBody(stmt.elseOp.stmts, globalEnv).join('\n');
  } 

  return [`${ifCond}\n(if\n(then\n${ifBody}\n)\n(else\n${elifCond}\n(if\n(then\n${elifBody}\n)\n(else\n${elseBody}\n))))`];
}

function codeGenBody(stmts:Stmt<Type>[], globalEnv: GlobalEnv) {
  const body = stmts.map(s => {
    const b = codeGen(s, globalEnv);
    return b.join('\n');
  });
  return body
}
function codeGenWhile(stmt: Stmt<Type>, globalEnv: GlobalEnv): string[] {
  if(stmt.tag !== "while") {
    throw new Error("COMPILE ERROR: codeGenWhile takes only while statement as input");
  }
  // throw new Error("COMPILE ERROR: while has not been implemented yet");
  let loopId = (globalEnv.loopDepth++);
  
  // command body
  const body = codeGenBody(stmt.stmts, globalEnv);

  // condition 
  const cond = codeGenExpr(stmt.cond, globalEnv);

  globalEnv.loopDepth --;
  return [`(loop \n${body.join('\n')}\n${cond.join('\n')}\nbr_if ${loopId})`];
}

function codeGenCall(expr: Expr<Type>, globalEnv: GlobalEnv): string[] {
  if(expr.tag !== 'call') {
    throw new Error ("COMPILER ERROR: the input expression to codeGenCall should be call");
  }
  
  let codes: string[] = [];
  
  // collect arguments
  for(let idx = 0; idx < expr.args.length; ++idx) {
    const arg = expr.args[idx];
    codes = [...codeGenExpr(arg, globalEnv), ...codes];
  }
 
  // call the function
  if(expr.name === 'print') {
    
    switch(expr.args[0].a) {
      case Type.int:
        codes.push(`(call $print_num)`);
        break;
      case Type.bool:
        codes.push(`(call $print_bool)`);
        break;
      case Type.none:
        codes.push(`(call $print_none)`);
        break;
      default:
        throw new Error("COMPILE ERROR: unknow literal type");
    }
  } else {
    codes.push(`(call $${expr.name})`);
  }
  
  
  return codes;
}

function codeGenGlobalVar(varInits: VarInit<Type>[]): string[] {
  return varInits.map(varInit => {
    return `(global $${varInit.name} (mut i32) ${codeGenLiteral(varInit.initLiteral)})`;
  });
}

function codeGenFuncDef(funcDef: FuncDef<Type>, globalEnv: GlobalEnv): string[] {
  // params
  const params = funcDef.params.map(p => {
    return `(param $${p.name} i32)`;
  }).join(' ');
  
  // init local variables
  const localVarInit = funcDef.varInits.map(v => {
    return `(local $${v.name} i32)\n(local.set $${v.name} ${codeGenLiteral(v.initLiteral)})`
  }).join('\n');
  
  // generate body statements
  const body = codeGenBody(funcDef.stmts, globalEnv);

  // return tge function definition in WASM
  return [`(func $${funcDef.name} ${params} (result i32)\n(local $last i32)\n${localVarInit}\n${body.join('\n')}\n(i32.const 0))`]
}

function codeGenLiteral(literal: Literal<Type>): string {
  switch (literal.tag) {
    case "num":
      return `(i32.const ${literal.value})`;
    case "bool":
      if(literal.value) return `(i32.const 1)`;
      return `(i32.const 0)`;
    case "none":
      return `(i32.const 0)`;
  }
}

function codeGenId(id: Expr<Type>, globalEnv: GlobalEnv): string {
  if(id.tag !== 'id') {
    throw new Error("COMPILE ERROR: input to codeGen Id should be an id expr");
  }
  if(globalEnv.vars.has(id.name)) {
    return `(global.get $${id.name})`;
  }
  return `(local.get $${id.name})`;
}