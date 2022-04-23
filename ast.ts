import { BinaryOperator } from "typescript"

export type Program<A> = {a?: A, 
                          varInits: VarInit<A>[],
                          funcDefs: FuncDef<A>[],
                          stmts: Stmt<A>[]}

export type VarInit<A> = {a?: A, 
                          name: string, 
                          type: Type, 
                          initLiteral: Literal<A>}


export type TypedVar<A> = {a?: A, name: string, type: Type}

export type FuncDef<A> = {a?: A, 
                          name: string, 
                          params: TypedVar<A>[], 
                          retType: Type, 
                          varInits: VarInit<A>[], 
                          stmts: Stmt<A>[]}
                          
// export type FuncBody<A> = {a?: A, varInits: VarInit<A>[], stmts: Stmt<A>[]}

export type Stmt<A> =
  | { a?: A, tag: "assign", name: string, value: Expr<A> }
  | { a?: A, tag: "expr"  , expr: Expr<A> }
  | { a?: A, tag: "return", expr: Expr<A>}
  | { a?: A, tag: "pass"  }
  | { a?: A, tag: "while", cond: Expr<A>, stmts: Stmt<A>[]} // while
  | { a?: A, tag: "if", ifOp: {cond: Expr<A>, stmts: Stmt<A>[]}, 
                        elifOp: {cond: Expr<A>, stmts: Stmt<A>[]}, 
                        elseOp: {stmts: Stmt<A>[]}}
  

export type Expr<A> =
    { a?: A, tag: "id"      , name: string }
  | { a?: A, tag: "binop"   , op: BinOp, left: Expr<A>, right: Expr<A>}
  | { a?: A, tag: "uniop"   , op: UniOp, expr: Expr<A>}
  | { a?: A, tag: "literal" , literal: Literal<A>}
  | { a?: A, tag: "call"    , name: string, args: Expr<A>[]}

export type Literal<A>  = 
    {a?: A, tag: "num"  , value: number}
  | {a?: A, tag: "bool" , value: boolean}
  | {a?: A, tag: "none"}


export enum BinOp { Plus  = "+" , 
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
                    Is    = "is"}

export enum UniOp {Minus = "-", Not = "not"}

export enum Type {int="int", bool="bool", none="None"}
