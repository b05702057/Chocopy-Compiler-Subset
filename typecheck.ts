import {BinOp, Expr, Stmt, Program, Type, Literal, VarInit, FuncDef, TypedVar, UniOp} from "./ast";


export type TypeEnv = {
    vars: Map<string, Type>,
    funcs: Map<string, [Type[], Type]>, // a list of parameters and return type
    retType: Type
}
export function deepCopyVarEnv(env: TypeEnv): TypeEnv{
    return {vars: new Map(env.vars), funcs: new Map(env.funcs), retType: env.retType};
}

export function newTypeEnv(): TypeEnv {
    return {vars: new Map<string, Type>(), 
      funcs: new Map<string, [Type[], Type]>(),
      retType: Type.none}
}

export function setupEnv(program: Program<null>): TypeEnv {
    const evn = newTypeEnv();

    // global variables
    program.varInits.forEach(v => {
        evn.vars.set(v.name, v.type);
    });

    // function definitions
    program.funcDefs.forEach(f => {
        evn.funcs.set(f.name, [f.params.map(p => {return p.type}), f.retType]);
    });

    return evn;
}

export function typeCheckProgram(prog: Program<null>): Program<Type> {
    const env = setupEnv(prog);
    let progTyped: Program<Type> = {
        varInits: [],
        funcDefs: [],
        stmts: []
    }

    // check global variable
    progTyped.varInits = typeCheckVarInit(prog.varInits, env);

    // check function definitions
    progTyped.funcDefs = prog.funcDefs.map(f => {return typeCheckFuncDef(f, env)});

    // check main body
    progTyped.stmts = typeCheckStmts(prog.stmts, env);

    return progTyped;
}

export function typeCheckStmts(stmts: Stmt<null>[], env: TypeEnv): Stmt<Type>[] {
    const typedStmts: Stmt<Type>[] = [];

    stmts.forEach(stmt => {
        switch(stmt.tag) {
            case "assign": // e.g. a = 0
                if(!env.vars.has(stmt.name)) { // the variable should have been inited
                    throw new Error(`TYPE ERROR: Not a variable ${stmt.name}`);
                }
                const typedValue = typeCheckExpr(stmt.value, env);
                if(typedValue.a !== env.vars.get(stmt.name)) {
                    throw new Error(`TYPE ERROR: Expected type ${env.vars.get(stmt.name)}; got type ${typedValue.a}`);
                }

                typedStmts.push({...stmt, a: Type.none, value: typedValue});
                break;
            case "expr"  :
                const typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push({...stmt, expr: typedExpr, a: Type.none}); 
                break;
            case "return":
                const typedRet = typeCheckExpr(stmt.expr, env);
                if(typedRet.a !== env.retType) {
                    throw new Error(`TYPE ERROR: return expected type ${env.retType}; got type ${typedRet.a}`);
                }
                typedStmts.push({...stmt, expr: typedRet, a: typedRet.a});
                break;
            case "pass"  :
                typedStmts.push({...stmt, a: Type.none});
                break;
            case "while":
                const typedWhile = typeCheckWhile(stmt, env);
                typedStmts.push({...typedWhile, a: Type.none});
                break;
            case "if":
                const typedIf = typeCheckIf(stmt, env);
                typedStmts.push({...typedIf, a: Type.none});
                break;
        }
    });
    return typedStmts;
}

export function typeCheckExpr(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    switch (expr.tag) {
        case "id": // if the variable has been defined 
            if(!env.vars.has(expr.name)) {
                throw new Error(`TYPE ERROR: not a variable ${expr.name}`);
            }
            const idType = env.vars.get(expr.name);
            return {...expr, a: idType};
        case "binop" :
            return typeCheckBinOp(expr, env);
        case "uniop":
            return typeCheckUniOp(expr, env);
        case "literal" :
            return {...expr, a: typeCheckLiteral(expr.literal).a}
        case "call":
            const typedCall = typeCheckCall(expr, env);
            return typedCall
    }
}

export function typeCheckBinOp(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    if(expr.tag != "binop") {
        throw new Error("TYPECHECK  ERROR: typeCheckBinOp only take binary operation");
    }

    switch(expr.op) {
        case BinOp.Plus : // work for int
        case BinOp.Minus:
        case BinOp.Mul  :
        case BinOp.Div  :
        case BinOp.Mod  :
        case BinOp.Seq  :
        case BinOp.Leq  :
        case BinOp.Sml  :
        case BinOp.Lrg  :
            const leftTyped = typeCheckExpr(expr.left, env);
            const rightTyped = typeCheckExpr(expr.right, env);
            if(leftTyped.a !== rightTyped.a || (leftTyped.a !== Type.int || rightTyped.a != Type.int)) {
                throw new Error(`TYPECHECK ERROR: Cannot apply operator \'${expr.op}\' on types \'${leftTyped.a}\' and type \'${rightTyped.a}\'`);
            }
            if(expr.op === BinOp.Seq || expr.op === BinOp.Leq || expr.op === BinOp.Sml || expr.op === BinOp.Lrg) {
                return {...expr, left: leftTyped, right:rightTyped, a: Type.bool};
            }
            return {...expr, left: leftTyped, right:rightTyped, a: Type.int};
        case BinOp.Eq   : // wprk fpr both int and bool
        case BinOp.Neq  :
            const leftTypedEq = typeCheckExpr(expr.left, env);
            const rightTypedEq = typeCheckExpr(expr.right, env);
            if(leftTypedEq.a !== rightTypedEq.a ) {
                throw new Error(`TYPECHECK ERROR: Cannot apply operator \'${expr.op}\' on types \'${leftTypedEq.a}\' and type \'${rightTypedEq.a}\'`);
            }
            return {...expr, left: leftTypedEq, right: rightTypedEq, a: Type.bool}
        case BinOp.Is   : // work for none
            const leftTypedNone = typeCheckExpr(expr.left, env);
            const rightTypedNone = typeCheckExpr(expr.right, env);
            if(leftTypedNone.a !== Type.none || rightTypedNone.a !== Type.none) {
                throw new Error(`TYPECHECK ERROR: Cannot apply operator \'${expr.op}\' on types \'${leftTypedNone.a}\' and type \'${rightTypedNone.a}\'`);
            }
            return {...expr, left: leftTypedNone, right: rightTypedNone, a: Type.bool}
    }
}

export function typeCheckUniOp(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    if(expr.tag != "uniop") {
        throw new Error("TYPECHECK  ERROR: typeCheckUniOp only take binary operation");
    }
    // work for both (==, ) bool and int
    switch(expr.op) {
        case UniOp.Minus:
            const typedExpr = typeCheckExpr(expr.expr, env);
            if(typedExpr.a !== Type.int) {
                throw new Error(`TYPECHECK ERROR: uniary operator ${UniOp.Minus} expected ${Type.int}; got type ${typedExpr.a}`);
            }
            return {...expr, expr: typedExpr, a: Type.int};
        case UniOp.Not:
            const notTypedExpr = typeCheckExpr(expr.expr, env);
            if(notTypedExpr.a !== Type.bool) {
                throw new Error(`TYPECHECK ERROR: uniary operator ${UniOp.Not} expected ${Type.bool}; got type ${notTypedExpr.a}`);
            }
            return {...expr, expr: typedExpr, a: Type.bool};
        default:
            throw new Error(`TYPECHECK ERROR: undefined unary operator ${expr}. This error should be called in parser`);
    }
}


export function typeCheckWhile(stmt: Stmt<null>, env:TypeEnv): Stmt<Type> { // TODO
    if(stmt.tag !== 'while') {
        throw new Error("TYPECHECK ERROR: the input statement should be while when calling typeCheckWhile");
    }

    const typedWhileCond = typeCheckExpr(stmt.cond, env);
    const typedWhileBody = typeCheckStmts(stmt.stmts, env);

    if(typedWhileCond.a !== Type.bool) {
        throw new Error(`TYPECHECK ERROR: Condtion expression cannot be of type '${typedWhileCond.a}'`);
    }
    return {
        a: Type.none,
        tag: 'while',
        cond: typedWhileCond,
        stmts: typedWhileBody
    }
}

export function typeCheckIf(stmt: Stmt<null>, env:TypeEnv): Stmt<Type> {
    if(stmt.tag !== 'if') {
        throw new Error("TYPECHECK ERROR: the input statement should be if when calling typeCheckIf");
    }

    // check if
    const typedIfCond = typeCheckExpr(stmt.ifOp.cond, env);
    const typedIfBody = typeCheckStmts(stmt.ifOp.stmts, env);
    if(typedIfCond.a !== Type.bool) {
        throw new Error(`TYPECHECK ERROR: Condtion expression cannot be of type '${typedIfCond.a}'`);
    }
    
    // check elif
    let typedElifCond: Expr<Type> = null;
    let typedElifBody: Stmt<Type>[] = null;
    if(stmt.elifOp.cond !== null) {
        typedElifCond = typeCheckExpr(stmt.elifOp.cond, env);
        typedElifBody = typeCheckStmts(stmt.elifOp.stmts, env);
        if(typedElifCond.a !== Type.bool) {
            throw new Error(`TYPECHECK ERROR: Condtion expression cannot be of type '${typedElifCond.a}'`);
        }
    }

    // check else:
    let tpyedElseBody: Stmt<Type>[] = null;
    if(stmt.elseOp.stmts !== null) {
        tpyedElseBody = typeCheckStmts(stmt.elseOp.stmts, env);
    }

    return {
        a: Type.none,
        tag: "if",
        ifOp: {cond: typedIfCond, stmts: typedIfBody},
        elifOp: {cond: typedElifCond, stmts: typedElifBody},
        elseOp: {stmts: tpyedElseBody}
    };
}

export function typeCheckCall(expr: Expr<null>, env: TypeEnv): Expr<Type> {

    if(expr.tag !== "call") {
        throw new Error("TYPECHECK ERROR: typeCheckCall only accept call as an input expr");
    }
    if(!env.funcs.has(expr.name)) {
        console.warn("TYPECHECK WARNING: the called function might be an imported one, so we cannot do any type check");
        const typedArgs: Expr<Type>[] = expr.args.map(arg => {
            return typeCheckExpr(arg, env);
        });
        return {...expr, args:typedArgs, a: Type.none};
    }

    // check # params
    const params = env.funcs.get(expr.name)[0];
    const args = expr.args;
    if(args.length !== params.length) {
        throw new Error(`TYPECHECK ERROR: call func ${expr.name}; expected ${params.length} arguments; got ${args.length}`);
    }

    // check argument type
    const typedArgs: Expr<Type>[] = [];
    for(let idx = 0; idx < params.length; ++idx) {
        const typedArg = typeCheckExpr(args[idx], env);
        if(typedArg.a !== params[idx]) {
            throw new Error(`TYPECHECK ERROR: call func ${expr.name}; expected type ${params[idx]}; got type ${typedArg.a} in parameters ${idx}`);
        }
        typedArgs.push(typedArg);
    }
    // throw new Error("TYPECHECK ERROR: typecheck on function call has not been implemented yet");
    return {...expr, args: typedArgs, a: env.funcs.get(expr.name)[1]};
}
/*
 * Check the type of each variable initialization to make sure 
 * the variable type is equal to the literal type
 */
export function typeCheckVarInit(inits: VarInit<null>[], env: TypeEnv): VarInit<Type>[] {

    const typedInits: VarInit<Type>[] = []

    inits.forEach((init) => {
        const typedLiteral = typeCheckLiteral(init.initLiteral);
        if (init.type !== typedLiteral.a) {
            throw Error("TYPE ERROR: init type does not match literal type");
        }

        env.vars.set(init.name, init.type);
        typedInits.push({...init, a: init.type, initLiteral:typedLiteral});
    })

    return typedInits;
}

/*
 * Check the type of function definition:
 * (1) need to update the type var env before checking the func body
 * (2) need to check the statements
 * (3) the return type
 */
export function typeCheckFuncDef(func: FuncDef<null>, env: TypeEnv): FuncDef<Type> {

    const localEnv = deepCopyVarEnv(env);

   // add params to envs
   // check inits -> add to envs
   const typedParams = typeCheckParams(func.params);
   func.params.forEach(param => {
       localEnv.vars.set(param.name, param.type);
   })

   const localTypedInits = typeCheckVarInit(func.varInits, env);
   func.varInits.forEach(localTypedInit => {
       localEnv.vars.set(localTypedInit.name, localTypedInit.type);
   })

   // add function to env
   localEnv.funcs.set(func.name, [func.params.map(param => param.type), func.retType])

   // add return type
   localEnv.retType = func.retType;

   // check body statements
   const typedStmts = typeCheckStmts(func.stmts, localEnv);

   // make sure every path has the expected return 
   if(!typeCheckHasReturn(func.stmts,env) && func.retType !== Type.none) {
        throw new Error(`TYPECHECK ERROR: All paths in function/method must have a return statement: ${func.name}`);
   }
   return {...func, 
           params: typedParams, 
           varInits: localTypedInits, 
           stmts: typedStmts};
}

export function typeCheckParams(params: TypedVar<null>[]): TypedVar<Type>[] {
    return params.map(p => { return {...p, a: p.type}});
}

export function typeCheckLiteral(literal: Literal<null>): Literal<Type> {
    switch(literal.tag) {
        case "num" :
            return {...literal, a: Type.int};
        case "bool":
            return {...literal, a: Type.bool};
        case "none":
            return {...literal, a: Type.none};
    }
    return null;
}

/**
 * Yhis function is used to check whether this body argument has the 
 * desired return value
 * @param body 
 * @param env 
 */
export function typeCheckHasReturn(body: Stmt<null>[], env: TypeEnv): boolean {
    for(let idx = 0; idx < body.length; ++idx) {
        const stmt = body[idx];
        switch(stmt.tag) {
            case "return":
                return true;
            case "if":
                let ifHasRet = typeCheckHasReturn(stmt.ifOp.stmts, env);
                if(stmt.elifOp.cond !== null) {
                    ifHasRet = ifHasRet && typeCheckHasReturn(stmt.elifOp.stmts, env);
                }
                if(stmt.elseOp.stmts !== null) {
                    ifHasRet = ifHasRet && typeCheckHasReturn(stmt.elseOp.stmts, env);
                }
                if(ifHasRet) {
                    return true;
                }
                continue;
            case "pass":
                return false;
            case "expr" :
            case "assign":
            case "while":
                continue;
            default:
                throw new Error(`TYPECHECK ERROR: typeCheckHasReturn meets unknown statement`);
        }
    }
    return false;
}