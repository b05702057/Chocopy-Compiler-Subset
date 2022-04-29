import { Stmt, Expr, BinOp, Type, TypedVar, VarInit, FuncDef, Literal, Program, UniOp } from './ast';
import { parse } from "./parser";
import { typeCheckProgram } from "./typecheck";

// https://learnxinyminutes.com/docs/wasm/

export type CompileResult = {
  wasmSource: string,
};

export type LocalEnv = {
  vars: Map<string, boolean>,
  isFunc: boolean,
}

export function createEmptyLocalEnv(): LocalEnv {
  return {
    vars: new Map<string, boolean>(),
    isFunc: false,
  }
}

export type GlobalEnv = {
  vars: Map<string, VarInit<Type>>,
  funcs: Map<string, FuncDef<Type>>,
  classIndexes: Map<string, Map<string, number>>, // class : classdata (field: [index, init value])
  classInits: Map<string, Map<string, Literal<Type>>>,
  loopDepth: number
}

export function createEmptyGlobalEnv(): GlobalEnv {
  return {
    vars: new Map<string, VarInit<Type>>(),
    funcs: new Map<string, FuncDef<Type>>(), // store a function and its definition 
    classIndexes: new Map<string, Map<string, number>>(),
    classInits: new Map<string, Map<string, Literal<Type>>>(),
    loopDepth: 0
  }
}

// set up global variables and global functions
export function setGlobalInfo(program: Program<Type>) {
  const globalEnv = createEmptyGlobalEnv();

  // set variables
  for (let idx = 0; idx < program.varInits.length; ++idx) {
    globalEnv.vars.set(program.varInits[idx].name, program.varInits[idx]);
  }

  // set funcstions
  for (let idx = 0; idx < program.funcDefs.length; ++idx) {
    globalEnv.funcs.set(program.funcDefs[idx].name, program.funcDefs[idx]);
  }

  // set class field indexes and init value
  for (let idx = 0; idx < program.classDefs.length; idx++) {
    var classIndexes = new Map<string, number>();
    var classInits = new Map<string, Literal<Type>>();
    const classDef = program.classDefs[idx];
    if (classDef.tag !== "class") {
      throw Error("should be a class");
    }
    const fields = classDef.fields;
    for (let idx2 = 0; idx2 < fields.length; idx2++) {
      classIndexes.set(fields[idx2].name, idx2);
      classInits.set(fields[idx2].name, fields[idx2].initLiteral);
    }

    const className = classDef.name;
    globalEnv.classIndexes.set(className, classIndexes);
    globalEnv.classInits.set(className, classInits);
  }
  return globalEnv;
}

export function compile(source: string) : CompileResult {

  // parse program and get each elements
  const program = typeCheckProgram(parse(source));
  const ast = program.stmts;
  const globalEnv = setGlobalInfo(program);
  
  // generate function definitions
  const funcs = program.funcDefs.map(funcDef => {
    return codeGenFuncDef(funcDef, globalEnv);
  }).join('\n');
  
  // generate global variables (including the heap)
  const globalVars = codeGenGlobalVar(program.varInits).join('\n');

  // generate class definitions
  const classes = program.classDefs.map(classDef => {
    return codeGenClassDef(classDef, globalEnv); // not sure why its return is stringp[]
  }).join("\n");

  // create an empty local environment
  const localEnv = createEmptyLocalEnv();

  // generate the code for the main body
  const commands =codeGenMainBody(ast, globalEnv, localEnv);
  // console.log(commands);

  // set up final function return type
  const lastExpr = ast[ast.length - 1]
  let returnType = "";
  let returnExpr = "";
  // console.log(`ast.length: ${ast.length}, lastExpr: ${lastExpr.tag}`);
  if(ast.length > 0 && lastExpr.tag === "expr") {
    returnType = "(result i32)";
    returnExpr = "\n(local.get $last)"; // Since we use a function at the end, we need to put the return value in the stack.
  }
  // The last value is not needed if the last statement is not an expression.

  return {
    wasmSource: `${globalVars}\n${classes}\n${funcs}\n(func (export "exported_func") ${returnType}${commands.join('\n')}${returnExpr})`
  };
}

// generate codes for statements
function codeGen(stmt: Stmt<Type>, globalEnv: GlobalEnv, localEnv: LocalEnv) : string[] {
  switch(stmt.tag) {
    case "assign":
      let valStmts = codeGenExpr(stmt.value, globalEnv, localEnv); // rhs
      let leftExpr = codeGenExpr(stmt.name, globalEnv, localEnv); // lhs

      // generate the "store" assign code
      if (stmt.name.tag == "getfield") {
        leftExpr = leftExpr.slice(0, -1); // strip `i32.load` since it's lhs
        return leftExpr.concat([valStmts + `\ni32.store`]);
      } else { // generate the "set" assign code
        if (localEnv.isFunc) {
          if (localEnv.vars.has(stmt.variable)) {
            return valStmts.concat([`(local.set $${stmt.name})`]);
          }
          // We cannot assign a value to a global variable in the function environment.
          throw new Error(`The global variable ${stmt.variable} cannot be assigned in a function`);
        }
      }
      return valStmts.concat([`(global.set $${stmt.variable})`]); // global environment
    case "expr":
      let exprStmts = codeGenExpr(stmt.expr, globalEnv, localEnv);
      return exprStmts.concat([`(local.set $last)`]);
    // Without the return command, the function would return the values in the stack.
    // However, we would need to make sure the #stack elements == #return values
    case "return":
      let returnStmts = codeGenExpr(stmt.expr, globalEnv, localEnv);
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

function codeGenMainBody(stmts: Stmt<Type>[], globalEnv: GlobalEnv, localEnv: LocalEnv): string[] {
  // declare all local variables according to the source
  const scratchVar : string = `(local $last i32)`; // as function output
  // put $last on the stack, and it wil consume the top value on the stack eventually
  
  const localDefines = [scratchVar];

  const commandGroups = stmts.map((stmt) => codeGen(stmt, globalEnv, localEnv));
  return localDefines.concat([].concat.apply([], commandGroups));
}

function codeGenExpr(expr : Expr<Type>, globalEnv: GlobalEnv, localEnv: LocalEnv) : Array<string> {
  switch(expr.tag) {
    case "id":
      return [codeGenId(expr, globalEnv, localEnv)];
    case "binop":
      const leftStmts = codeGenExpr(expr.left, globalEnv, localEnv);
      const rightStmts = codeGenExpr(expr.right, globalEnv, localEnv);
      const opStmt = codeGenBinOp(expr.op);
      return [...leftStmts, ...rightStmts, opStmt]
    case "uniop": 
      const uniopRight = codeGenExpr(expr.expr, globalEnv, localEnv);
      return codeGenUnionOp(expr.op, uniopRight);
    case "literal":
        return [codeGenLiteral(expr.literal)];
    case "call": 
        return codeGenCall(expr, globalEnv, localEnv);
    case "method":
        // const objAddr = codeGenExpr(expr.obj, globalEnv, localEnv);
        // const checkValidAddress = [...objAddr, `(i32.const -4) \n(i32.add)`, `(i32.load)`, `local.set $last`]; // c : Rat = None, c.x

        const argInstrs = expr.args.map(a => codeGenExpr(a, globalEnv, localEnv));
        const flattenArgs: string[] = []; // flat the list of lists
        argInstrs.forEach(arg => flattenArgs.push(arg.join("\n")));

        if (expr.obj.a == "int" || expr.obj.a == "bool" || expr.obj.a == "None") {
          throw Error("This should be a class.");
        }
        // The call object is the first argument self.
        const callObject = codeGenExpr(expr.obj, globalEnv, localEnv).join("\n");
        return [callObject, flattenArgs.join("\n"), `\n(call $$${expr.obj.a.class}$${expr.name})`];
    case "getfield":
      return codeGenField(expr, globalEnv, localEnv);
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
      // For other classes, we should compare the field recursively.
      // In Chocopy, "is" is used to compare the fields in two class objects, and "==" cannot be used with classes. 
      return  "(i32.eq)";
  }
}

function codeGenUnionOp(op: UniOp, right: string[]): string[] {
  switch(op) {
    case UniOp.Minus:
      return ["(i32.const 0)", ...right, "(i32.sub) "]; // -x = 0 - x
    case UniOp.Not:
      return [...right, "(i32.eqz)"]; // is x != 0, return 1; else, return 0
  }
}

function codeGenIf(stmt: Stmt<Type>, globalEnv: GlobalEnv, localEnv: LocalEnv): string[] {
  if(stmt.tag !== 'if') {
    throw new Error("COMPILE ERROR: the input to codeGenIf should have tag if");
  }

  const ifCond = codeGenExpr(stmt.ifOp.cond, globalEnv, localEnv).join('\n');
  const ifBody = codeGenBody(stmt.ifOp.stmts, globalEnv, localEnv).join('\n');

  let elifCond = "(i32.const 0)";
  let elifBody = "nop";

  let elseBody = "nop";

  // has else if
  if(stmt.elifOp.cond !== null) {
    elifCond = codeGenExpr(stmt.elifOp.cond, globalEnv, localEnv).join('\n');
    elifBody = codeGenBody(stmt.elifOp.stmts, globalEnv, localEnv).join('\n');
  } 
  if(stmt.elseOp.stmts !== null) { 
    elseBody = codeGenBody(stmt.elseOp.stmts, globalEnv, localEnv).join('\n');
  } 

  return [`${ifCond}\n(if\n(then\n${ifBody}\n)\n(else\n${elifCond}\n(if\n(then\n${elifBody}\n)\n(else\n${elseBody}\n))))`];
}

// generate the codes for statements
function codeGenBody(stmts:Stmt<Type>[], globalEnv: GlobalEnv, localEnv: LocalEnv) {
  const body = stmts.map(s => {
    const b = codeGen(s, globalEnv, localEnv);
    return b.join('\n');
  });
  return body
}

function codeGenWhile(stmt: Stmt<Type>, globalEnv: GlobalEnv, localEnv: LocalEnv): string[] {
  if(stmt.tag !== "while") {
    throw new Error("COMPILE ERROR: codeGenWhile takes only while statement as input");
  }
  // throw new Error("COMPILE ERROR: while has not been implemented yet");
  let loopId = (globalEnv.loopDepth++);
  
  // command body
  const body = codeGenBody(stmt.stmts, globalEnv, localEnv);

  // condition 
  const cond = codeGenExpr(stmt.cond, globalEnv, localEnv);

  globalEnv.loopDepth --;
  return [`(loop \n${body.join('\n')}\n${cond.join('\n')}\nbr_if ${loopId})`];
}

function codeGenField(expr: Expr<Type>, globalEnv: GlobalEnv, localEnv: LocalEnv): string[] {
  if (expr.tag !== 'getfield') {
    throw Error("COMPILER ERROR: The input expression to codeGenCall should be getfield.");
  }
  if (expr.obj.a === "int" || expr.obj.a === "bool" || expr.obj.a === "None") {
    throw Error("COMPILER ERROR: The object should be a class.");
  }

  // If it is an instance, it should return its address, ex. (global.get $r1).
  const objAddr = codeGenExpr(expr.obj, globalEnv, localEnv);
  const checkValidAddress = [...objAddr, `(i32.const -4) \n(i32.add)`, `(i32.load)`, `local.set $last`]; // c : Rat = None, c.x

  const classIndexes = globalEnv.classIndexes.get(expr.obj.a.class);
  const indexOfField = classIndexes.get(expr.name);
  return [checkValidAddress.join("\n"), ...objAddr, `(i32.const ${indexOfField * 4}) \n(i32.add)`, `(i32.load)`];
}

function codeGenCall(expr: Expr<Type>, globalEnv: GlobalEnv, localEnv: LocalEnv): string[] {
  if (expr.tag !== "call") {
    throw new Error ("COMPILER ERROR: The input expression to codeGenCall should be call.");
  }

  // address the case of an init call, ex. r1 = Rat().
  if (globalEnv.classInits.has(expr.name)) {
    // variable initializations
    let initVals : string[] = [];
    const classInits = globalEnv.classInits.get(expr.name); // get the initializing values of a class
    const classIndexes = globalEnv.classIndexes.get(expr.name); // get the field indexes of a class
    classIndexes.forEach((index, field) => {
      const offset = index * 4;
      initVals = [
        ...initVals,
        `(global.get $heap)`,
        `(i32.const ${offset})`,
        `(i32.add)`,
        codeGenLiteral( classInits.get(field) ), // get the initial value of the field
        `(i32.store)`
      ]
    })

    // We have to modify the address of the heap, so the next class can use it.
    initVals = [
      ...initVals,
      `(global.get $heap)`, // the return value (the start address) => put in stack
      `(global.get $heap)`,
      `(i32.const ${classIndexes.size * 4})`,
      `(i32.add)`,
      `(global.set $heap)`,
    ]

    const initFuncName = `$$${expr.name}$__init__)`;
    if (globalEnv.funcs.has(initFuncName)) {
      initVals.push(`(call $$${expr.name}$__init__)`); // execute the __init__ operations
    }
    return initVals;
  }
  
  let codes: string[] = [];
  
  // collect arguments
  for(let idx = 0; idx < expr.args.length; ++idx) {
    const arg = expr.args[idx];
    codes = [...codes, ...codeGenExpr(arg, globalEnv, localEnv)];
  }
 
  // call the function
  if(expr.name === 'print') {
    if (expr.args[0].a !== "int" && expr.args[0].a !== "bool" && expr.args[0].a !== "None") {
      codes.push(`(call $print_num)`);
    } else {
      switch(expr.args[0].a) {
        case "int":
          codes.push(`(call $print_num)`);
          break;
        case "bool":
          codes.push(`(call $print_bool)`);
          break;
        case "None":
          codes.push(`(call $print_none)`);
          break;
        default:
          // The code can still compile if it's a class, and an error will occur at runtime.
          codes.push(`(call $print_num)`);
      }
    }
  } else {
      codes.push(`(call $${expr.name})`);
  }
  return codes;
}

function codeGenGlobalVar(varInits: VarInit<Type>[]): string[] {
  var varInitWasm = varInits.map(varInit => {
    return `(global $${varInit.name} (mut i32) ${codeGenLiteral(varInit.initLiteral)})`;
  });
  varInitWasm.push(`(global $heap (mut i32) (i32.const 4))\n`) // initialize the heap for classes
  return varInitWasm;
}

/*
def get_field_a(self : Rat):
  return self.a
*/

function codeGenClassDef(classDef: Stmt<Type>, globalEnv: GlobalEnv): string {
  if (classDef.tag !== "class") {
    throw Error("can only generate codes for classes");
  }
  const classWasm: string[] = [];

  // add all the fields functions (simply return the value)
  classDef.fields.forEach(f => {
    // To return self.a, we need the address of self, and the index of a.
    const params : TypedVar<Type>[] = [{ 
      a: { 
        tag: "object", 
        class: classDef.name 
      }, 
      name: "self", 
      type: classDef.a 
    }]; // ex. self : Rat
    const varInits : VarInit<Type>[] = []; // no variable initializations
    const getfieldObj : Expr<Type> = { 
      a: { 
        tag: "object", 
        class: classDef.name 
      }, 
      tag: "id", 
      name: "self" 
    }; // ex. r1
    const getfieldExpr : Expr<Type> =  { a: f.a, tag: "getfield", obj: getfieldObj, name: f.name }
    const stmts : Stmt<Type>[] = [{ a: "None", tag: "return", expr: getfieldExpr }];
    var funcDef = { 
      name: `$${classDef.name}$get_field_${f.name}`, 
      params, 
      retType: f.a, 
      varInits, 
      stmts
    };
    codeGenFuncDef(funcDef, globalEnv).forEach(funcWasm => {
      classWasm.push(funcWasm);
    });
  })

  // add all the method functions
  classDef.methods.forEach(m => {
    var funcDef = { ...m, name: `$${classDef.name}$${m.name}`}; // Another "$" would be added later.

    // add a return statement to the init function
    if (m.name == "__init__") {
      funcDef.stmts.push({ 
        a: "None", 
        tag: "return", 
        expr: { 
          a: { tag: "object", class: classDef.name}, 
          tag: "id", 
          name: "self"
        }
      });
    }

    // We remove "self" in the parser and add it back here.
    funcDef.params = [{ 
      a: { 
        tag: "object", 
        class: classDef.name 
      }, 
      name: "self", 
      type: classDef.a 
    }, ...funcDef.params];

    // funcDef.params.push({ 
    //   a: { 
    //     tag: "object", 
    //     class: classDef.name 
    //   }, 
    //   name: "self", 
    //   type: classDef.a 
    // });
    codeGenFuncDef(funcDef, globalEnv).forEach(funcWasm => {
      classWasm.push(funcWasm);
    })
  })
  return classWasm.join("\n");
}

function codeGenFuncDef(funcDef: FuncDef<Type>, globalEnv: GlobalEnv): string[] {
  // prepare the local environment
  const localEnv = createEmptyLocalEnv();
  localEnv.isFunc = true;
  funcDef.params.map(p => {
    localEnv.vars.set(p.name, true);
  })
  funcDef.varInits.map(v => {
    localEnv.vars.set(v.name, true);
  })

  // params
  const params = funcDef.params.map(p => {
    return `(param $${p.name} i32)`;
  }).join(' ');
  
  // init local variables
  const localVarInit = funcDef.varInits.map(v => {
    return `(local $${v.name} i32)\n(local.set $${v.name} ${codeGenLiteral(v.initLiteral)})`
  }).join('\n');
  
  // generate body statements
  const body = codeGenBody(funcDef.stmts, globalEnv, localEnv);

  // return tge function definition in WASM
  // return [`\n(func $${funcDef.name} ${params} (result i32) ${localVarInit}\n${body.join('\n')})`]
  // return [`(func $${funcDef.name} ${params} (result i32)\n(local $last i32)\n${localVarInit}\n${body.join('\n')}\n(i32.const 0))`]
  return [`(func $${funcDef.name} ${params} (result i32)\n(local $last i32)${localVarInit}\n${body.join('\n')}\n(i32.const 0))\n`]
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

// should use local environment instead of global environment
function codeGenId(id: Expr<Type>, GlocalEnv: GlobalEnv, localEnv: LocalEnv): string {
  if (id.tag !== 'id') {
    throw new Error("COMPILE ERROR: input to codeGen Id should be an id expr");
  }

  // The type checker has already make sure the variable is defined.
  if (localEnv.vars.has(id.name)) {
    return `(local.get $${id.name})`;
  }
  return `(global.get $${id.name})`;
}
