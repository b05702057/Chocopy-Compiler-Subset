export type Program<A> = { a?: A, varInits: VarInit<A>[], classDefs: Stmt<A>[], funcDefs: FuncDef<A>[], stmts: Stmt<A>[] }

// The type is known after the parse function.
export type VarInit<A> = { a?: A, name: string, type: Type, initLiteral: Literal<A> }

export type TypedVar<A> = { a?: A, name: string, type: Type }

export type FuncDef<A> = { a?: A, name: string, params: TypedVar<A>[], retType: Type, varInits: VarInit<A>[], stmts: Stmt<A>[] }
// export type FuncBody<A> = {a?: A, varInits: VarInit<A>[], stmts: Stmt<A>[]}

// A class is made of variable definitions and class functions.
export type Stmt<A> =
  | { a?: A, tag: "assign", name: Expr<A>, variable: string, value: Expr<A> } // The variable of r2.n is r2.
  | { a?: A, tag: "expr"  , expr: Expr<A> }
  | { a?: A, tag: "class", name: string, fields: VarInit<A>[], methods: FuncDef<A>[] }
  | { a?: A, tag: "return", expr: Expr<A> }
  | { a?: A, tag: "pass"  }
  | { a?: A, tag: "while", cond: Expr<A>, stmts: Stmt<A>[]} // while
  | { a?: A, tag: "if", 
    ifOp: {
      cond: Expr<A>, 
      stmts: Stmt<A>[]
    }, 
    elifOp: {
      cond: Expr<A>, 
      stmts: Stmt<A>[]
    }, 
    elseOp: {
      stmts: Stmt<A>[]
    }
  }
  
export type Expr<A> =
    { a?: A, tag: "id"      , name: string }
  | { a?: A, tag: "binop"   , op: BinOp, left: Expr<A>, right: Expr<A> }
  | { a?: A, tag: "uniop"   , op: UniOp, expr: Expr<A> }
  | { a?: A, tag: "literal" , literal: Literal<A> }
  | { a?: A, tag: "call"    , name: string, args: Expr<A>[] }
  | { a?: A, tag: "getfield", obj: Expr<A>, name: string } // get a field of a class
  | { a?: A, tag: "method", obj: Expr<A>, name: string, args: Expr<A>[] } // store the parameters

export type Literal<A>  = 
    { a?: A, tag: "num"  , value: number }
  | { a?: A, tag: "bool" , value: boolean }
  | { a?: A, tag: "none" }

export type Type =
  | "int"
  | "bool"
  | "None"
  | { tag: "object", class: string }

export enum BinOp { 
  Plus  = "+" , 
  Minus = "-" , 
  Mul   = "*" , 
  Div   = "//",
  Mod   = "%" ,
  Eq    = "==",
  Neq   = "!=",
  Seq   = "<=",
  Leq   = ">=",
  Sml   = "<" ,
  Lrg   = ">" ,
  Is    = "is"
}

export enum UniOp { Minus = "-", Not = "not" }
