import {parser} from "lezer-python";
import {Tree, TreeCursor} from "lezer-tree";
import {BinOp, Expr, Stmt, VarInit, FuncDef, Type, Literal, TypedVar, Program, UniOp} from "./ast";

export function traverseArgs(c : TreeCursor, s : string) : Array<Expr<null>> {
  var args : Array<Expr<null>> = [];
  c.firstChild();
  while(c.nextSibling()) {
    if(c.type.name === ')') {
      break;
    }
    args.push(traverseExpr(c, s));
    c.nextSibling();
  }
  c.parent()

  return args;
}

export function traverseExpr(c : TreeCursor, s : string) : Expr<null> {
  switch(c.type.name) {
    
    case "Number": // eg. '1'
      return {tag: "literal", 
              literal: {tag: "num", 
                        value:  Number(s.substring(c.from, c.to))
                      }
              }
    case 'Boolean':
      return {tag: "literal",
              literal: {tag: "bool", value: s.substring(c.from, c.to) === "True"}}
    case "VariableName": // e.g. 'x'
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      }

    case "CallExpression": // e.g. max(x, y), abs(x), f()
      c.firstChild();
      const callName = s.substring(c.from, c.to); 
      c.nextSibling(); // go to arglist
      var args = traverseArgs(c, s);
      c.parent();
      return {
        tag: "call",
        name: callName,
        args: args
      }
    case "UnaryExpression": 
      // WARNING: this uniary expression only deal with 
      // uniary directly followed by a number 
      // e.g. -x, - (1 + 2)
      
      c.firstChild(); // go into unary expressoin
      const uniOp = str2uniop(s.substring(c.from, c.to));
      
       // pop uniary expression
      const num = Number(s.substring(c.from, c.to));
      c.nextSibling();
      const unionExpr = traverseExpr(c, s);
      return {tag: "uniop", op: uniOp, expr: unionExpr}; 
      
    case "BinaryExpression": // e.g. 1 + 2
      c.firstChild(); // go into binary expression
      const left = traverseExpr(c, s);
      c.nextSibling();
      var op:BinOp = str2binop(s.substring(c.from, c.to));
      c.nextSibling();
      const right = traverseExpr(c, s);
      c.parent();// pop the binary
      return {
        tag: "binop",
        op: op,
        left: left,
        right: right
      }
    default:
      console.log(stringifyTree(c, s, 2));
      throw new Error("PARSE ERROR: Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}
/*
 * A function to parse one statement
 * @input c: a treecorsor
 * @input s: the original input string
 * @input env: environment variables (if we are going to traverse a func,)
 */
export function traverseStmt(c : TreeCursor, s : string) : Stmt<null> {
  switch(c.node.type.name) {
    
    case "AssignStatement": // a = 1, b = 2 or var Init
      c.firstChild(); // go to name
      const name = s.substring(c.from, c.to);
      c.nextSibling(); 
      c.nextSibling(); // go to value
      const value = traverseExpr(c, s);
      c.parent();
      return {tag: "assign",name: name,value: value}
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent();
      return { tag: "expr", expr: expr }
    case "ReturnStatement":
      c.firstChild();
      c.nextSibling();
      let retExpr: Expr<null> = {tag: "literal", literal: {tag: "none"}};
      if(c.type.name !== '⚠'){
        retExpr = traverseExpr(c, s);
      } 
      c.parent();
      return {tag: "return", expr: retExpr};
    case "PassStatement":
      return {tag: "pass"}
    case "IfStatement": // TODO
      return traverseIf(c, s);
    case "WhileStatement": // TODO
      return traverseWhile(c, s);
    default:
      console.log(stringifyTree(c, s, 2));
      throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseProgram(c: TreeCursor, s: string): Program<null> {
  const varInits: VarInit<null>[] = []
  const funcDefs: FuncDef<null>[] = []
  const stmts: Stmt<null>[] = []

  switch(c.node.type.name) {
    case "Script":
    
      c.firstChild();  
      do {
        // var Init
        if(isVarInit(c)) { // parse variable initialization
          varInits.push(traverseVarInit(c, s));
        } else if(isFuncDef(c)) {
          funcDefs.push(traverseFuncDef(c, s));
        } else {
          break;
        }
      } while(c.nextSibling())
      if(isVarInit(c) || isFuncDef(c)) { // no next sibling && no stmts
        return {
          varInits: varInits,
          funcDefs: funcDefs,
          stmts: stmts
        };
      }

      // parse statements
      do {
        if(isVarInit(c) || isFuncDef(c)) {
          throw new Error("PARSE ERROR: var init and func def should go before statements");
        }
        stmts.push(traverseStmt(c, s));
      } while(c.nextSibling())
      return {
        varInits: varInits,
        funcDefs: funcDefs,
        stmts: stmts
      };
    default:
      throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
  }
}

export function parse(source : string) : Program<null> {
  const t = parser.parse(source); 
  return traverseProgram(t.cursor(), source);
}

export function isFuncDef(c: TreeCursor): boolean {
  return c.type.name === 'FunctionDefinition';
}

export function isVarInit(c: TreeCursor): boolean {
  if(c.type.name !== 'AssignStatement') {
    return false;
  }

  c.firstChild();
  c.nextSibling();
  const isTypeDef = (c.node.type.name === 'TypeDef');
  c.parent();
  return isTypeDef;
}

export function traverseVarInit(c: TreeCursor, s: string): VarInit<null> {
  // c is now in AssignStatement
  c.firstChild();
  const tVar = traverseTypedVar(c, s);
  c.nextSibling();
  c.nextSibling();
  const literal = traverseLiteral(c, s);
  c.parent();
  return {
    name: tVar.name,
    type: tVar.type,
    initLiteral: literal
  };
} 

export function node2type(c: TreeCursor, s:string): Type {
  const typeStr = s.substring(c.from, c.to);
  switch (typeStr) {
    case 'int': 
      return Type.int
    case  'bool':
      return Type.bool
    case 'None':
      return Type.none
    default:
      throw new Error(`PARSE ERROR: unknown type ${typeStr}`);
  }
}

export function traverseTypedVar(c: TreeCursor, s:string): TypedVar<null> {
  const name = s.substring(c.from, c.to);
  c.nextSibling();
  c.firstChild();
  c.nextSibling();
  const type = node2type(c, s);
  c.parent();
  return {
    name: name,
    type: type
  }
} 

export function traverseLiteral(c: TreeCursor, s: string): Literal<null> {
  
  const valStr = s.substring(c.from, c.to);
  switch(c.type.name) {
    case 'Boolean':
      if(valStr == 'False') {
        return {tag: "bool", value: false}
      } else {
        return {tag: "bool", value: true}
      }
    case 'Number':
      return {tag: "num", value: parseInt(valStr)};
    case 'None':
      return {tag: "none"}
  }
  throw new Error("PARSE ERROR: unsupporting literal type")
}

export function traverseFuncDef(c: TreeCursor, s: string): FuncDef<null> {

  const func: FuncDef<null> = {
    name: "",
    params: null,
    retType: Type.none,
    varInits: null,
    stmts: null
  }

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
  
  const code = traverseFuncBody(c, s);
  
  func.varInits = code.varInits;
  func.stmts = code.stmts;
  c.parent();
  c.parent();
  
  return func;
}

function traverseFuncParams(c: TreeCursor, s:string): TypedVar<null>[] {
  let params: TypedVar<null>[] = [];
  c.firstChild();
  c.nextSibling();
  
  do {
    if(s.substring(c.from, c.to) === ')') break;
    if(s.substring(c.from, c.to) === ',') continue; 
    params.push(traverseTypedVar(c, s));
  } while(c.nextSibling())
  c.parent();
  return params;
}

function traverseFuncBody(c: TreeCursor, s: string): Program<null> {
  const varInits: VarInit<null>[] = [];
  const stmts: Stmt<null>[] = [];
  
  do {
    if(!isVarInit(c)) {
      break;
    }
    if (isFuncDef(c)) {
      throw new Error("PARSER ERRO: nested function definition is now allowed");
    }
    varInits.push(traverseVarInit(c, s));
  } while(c.nextSibling());

  // get all statement
  do {
    if(isFuncDef(c)) {
      throw new Error("PARSER ERROR: nested function definition is now allowed");
    } 
    if (isVarInit(c)) {
      throw new Error("PARSE ERROR: Variable initialization should go before statements");
    }
    stmts.push(traverseStmt(c, s));
  } while(c.nextSibling())
  
  return {
    varInits: varInits,
    stmts: stmts,
    funcDefs: [],
  };
}

function str2uniop(opStr: String): UniOp {
  switch (opStr) {
    case "-":
      return UniOp.Minus
    case "not":
      return UniOp.Not
  }
  throw new Error("PARSE ERROR: unsupported uniary operator");
}

function str2binop(opStr: string): BinOp {
  switch(opStr) {
    case "+" : 
      return BinOp.Plus 
    case "-" : 
      return BinOp.Minus
    case "*" : 
      return BinOp.Mul  
    case "//": 
      return BinOp.Div  
    case "%" : 
      return BinOp.Mod  
    case "==": 
      return BinOp.Eq   
    case "!=": 
      return BinOp.Neq  
    case "<=": 
      return BinOp.Seq  
    case ">=": 
      return BinOp.Leq  
    case "<" : 
      return BinOp.Sml  
    case ">" : 
      return BinOp.Lrg  
    case "is": 
      return BinOp.Is   
  }
  throw new Error("PARSE ERROR: unknown binary operator");
}

function traverseWhile(c: TreeCursor, s: string): Stmt<null> {
  c.firstChild(); // while
  c.nextSibling(); // cond
  const cond = traverseExpr(c, s);
  const body: Stmt<null>[] = [];
  c.nextSibling();
  c.firstChild();
  c.nextSibling();

  do {
    body.push(traverseStmt(c, s));
  } while(c.nextSibling());
  c.parent();
  c.parent();
  return {
    tag: "while",
    cond: cond,
    stmts: body,
  };
}

function traverseIf(c: TreeCursor, s: string): Stmt<null> {
  
  let ifClause: Stmt<null> = {
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
  }

  c.firstChild(); // if

  // check if
  c.nextSibling();
  ifClause.ifOp.cond = traverseExpr(c, s);
  c.nextSibling();
  c.firstChild();
  c.nextSibling();
  ifClause.ifOp.stmts  = [];
  do {
    ifClause.ifOp.stmts.push(traverseStmt(c, s));
  } while(c.nextSibling());
  c.parent();

  if(!c.nextSibling()) {
    c.parent();
    return ifClause;
  }
  
  // check elif if
  if(c.type.name == 'elif') {

    c.nextSibling(); 
    ifClause.elifOp.cond = traverseExpr(c, s);
    c.nextSibling();
    c.firstChild();
    c.nextSibling();
    ifClause.elifOp.stmts  = [];
    do {
      ifClause.elifOp.stmts.push(traverseStmt(c, s));
    } while(c.nextSibling());
    c.parent();
  
    if(!c.nextSibling()) {
      c.parent();
      return ifClause;
    }
  }

  // check else
  if(c.type.name == 'else') {
    c.nextSibling();
    c.firstChild();
    c.nextSibling();
    ifClause.elseOp.stmts  = [];
    do {
      ifClause.elseOp.stmts.push(traverseStmt(c, s));
    } while(c.nextSibling());
    c.parent();
  }

  c.parent();
  return ifClause;
}

/*
 * Helper Functions
 */
export function stringifyTree(t:TreeCursor, source: string, d:number){
  var str = "";
  var spaces = " ".repeat(d*2);
  str += spaces + t.type.name;
  if(["Number","CallExpression","BinaryExpression","UnaryExpression"].includes(t.type.name)){
      str += "-->" + source.substring(t.from, t.to); 
  }
  str += "\n";
  if(t.firstChild()){
      do{
          str += stringifyTree(t, source, d + 1);
          
      
      }while(t.nextSibling());
      t.parent(); 
  }
  return str; 
}