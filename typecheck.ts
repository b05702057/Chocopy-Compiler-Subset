import { BinOp, Expr, Stmt, Program, Type, Literal, VarInit, FuncDef, TypedVar, UniOp } from './ast';

export type TypeEnv = {
    vars: Map<string, Type>,
    classMethods: Map<string, Map<string, [Type[], Type]>>, // the methods (args and return types) of a class
    classFields: Map<string, Map<string, Type>>, // the fields (names and types) of a class
    funcs: Map<string, [Type[], Type]>, // a list of parameter types and return type
    retType: Type
}

export function deepCopyVarEnv(env: TypeEnv): TypeEnv{
    return {
        vars: new Map(env.vars),
        classMethods: new Map(env.classMethods),
        classFields: new Map(env.classFields), 
        funcs: new Map(env.funcs), 
        retType: env.retType
    };
}

// initialize an environment sturcture
export function newTypeEnv(): TypeEnv {
    return {
        vars: new Map<string, Type>(), 
        classMethods: new Map<string, Map<string, [Type[], Type]>>(),
        classFields: new Map<string, Map<string, Type>>(),
        funcs: new Map<string, [Type[], Type]>(),
        retType: "None"
    }
}

export function setupEnv(program: Program<null>): TypeEnv {
    const evn = newTypeEnv();

    // global variables
    program.varInits.forEach(v => {
        evn.vars.set(v.name, v.type);
    });

    // class definitions
    program.classDefs.forEach(s => {
        if (s.tag !== "class") {
            throw Error(`Error: TYPE ERROR: not a class`);
        }

        // define the fields (name : type)
        const fields = s.fields;
        const fieldMap = new Map<string, Type>();
        fields.forEach(f => {
            fieldMap.set(f.name, f.type);
        })
        evn.classFields.set(s.name, fieldMap);

        // define the methods (name : args and return type)
        const methods = s.methods;
        const methodMap = new Map<string, [Type[], Type]>();
        methods.forEach(m => {
            methodMap.set(m.name, [m.params.map(p => { return p.type }), m.retType]);
        })
        evn.classMethods.set(s.name, methodMap);

        // add the class initialization functions
        evn.funcs.set(s.name, [[], { tag: "object", class: s.name }]);
    })

    // function definitions
    program.funcDefs.forEach(f => {
        evn.funcs.set(f.name, [f.params.map(p => { return p.type }), f.retType]);
    });
    return evn;
}

export function typeCheckProgram(prog: Program<null>): Program<Type> {
    const env = setupEnv(prog);
    let progTyped: Program<Type> = {
        varInits: [],
        classDefs: [],
        funcDefs: [],
        stmts: []
    }

    // check global variable => The rhs values should have correct types
    progTyped.varInits = typeCheckVarInit(prog.varInits, env);

    // check class definitions
    progTyped.classDefs = prog.classDefs.map(c => { return typeCheckClassDef(c, env) });

    // check function definitions
    progTyped.funcDefs = prog.funcDefs.map(f => {return typeCheckFuncDef(f, env)});

    // check main body
    progTyped.stmts = typeCheckStmts(prog.stmts, env);

    return progTyped;
}

export function typeCheckStmts(stmts: Stmt<null>[], env: TypeEnv): Stmt<Type>[] {
    const typedStmts: Stmt<Type>[] = [];
    stmts.forEach(stmt => {
        switch (stmt.tag) {
            case "assign": // e.g. a = 0
                // If the stmt is an "id", we would check of the variable exists.
                // If the stmt is a "getfield", we would check recursively until it's an "id".
                const leftTypedValue = typeCheckExpr(stmt.name, env);
                const rightTypedValue = typeCheckExpr(stmt.value, env); // to get a
                if (!isSameType(leftTypedValue.a, rightTypedValue.a)) {
                    throw Error(`Error: TYPE ERROR: Expected type ${leftTypedValue.a}; got type ${rightTypedValue.a}`);
                }
                typedStmts.push({...stmt, a: "None", name: leftTypedValue, value: rightTypedValue});
                break;
            case "expr"  :
                const typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push({...stmt, expr: typedExpr, a: "None"}); 
                break;
            case "return":
                const typedRet = typeCheckExpr(stmt.expr, env);
                if(!isSameType(typedRet.a, env.retType)) {
                    throw new Error(`Error: TYPE ERROR: return expected type ${env.retType}; got type ${typedRet.a}`);
                }
                typedStmts.push({...stmt, expr: typedRet, a: typedRet.a}); // This can also be "None"
                break;
            case "pass"  :
                typedStmts.push({...stmt, a: "None"});
                break;
            case "while":
                const typedWhile = typeCheckWhile(stmt, env);
                typedStmts.push({...typedWhile, a: "None"});
                break;
            case "if":
                const typedIf = typeCheckIf(stmt, env);
                typedStmts.push({...typedIf, a: "None"});
                break;
        }
    });
    return typedStmts;
}

export function typeCheckExpr(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    switch (expr.tag) {
        case "id": // check if the variable has been defined 
            if(!env.vars.has(expr.name)) {
                throw new Error(`TYPE ERROR: not a variable ${expr.name}`);
            }
            const idType = env.vars.get(expr.name);
            return { ...expr, a: idType };
        case "binop" :
            return typeCheckBinOp(expr, env);
        case "uniop":
            return typeCheckUniOp(expr, env);
        case "literal" :
            return { ...expr, a: typeCheckLiteral(expr.literal).a }
        case "call":
            const typedCall = typeCheckCall(expr, env);
            return typedCall;
        case "getfield":
            const typedGetfield = typeCheckField(expr, env);
            return typedGetfield;
        case "method":
            const typedMethod = typeCheckMethod(expr, env);
            return typedMethod;
    }
}

export function typeCheckBinOp(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    if (expr.tag != "binop") {
        throw new Error("TYPE ERROR: typeCheckBinOp only take binary operation");
    }
    switch (expr.op) {
        // work for int
        case BinOp.Plus :
        case BinOp.Minus:
        case BinOp.Mul  :
        case BinOp.Div  :
        case BinOp.Mod  :
        case BinOp.Seq  :
        case BinOp.Leq  :
        case BinOp.Sml  :
        case BinOp.Lrg  :
            const leftTyped = typeCheckExpr(expr.left, env); // add the type to the left expression
            const rightTyped = typeCheckExpr(expr.right, env);
            if (!isSameType(leftTyped.a, rightTyped.a) || (leftTyped.a !== "int")) {
                throw new Error(`TYPE ERROR: Cannot apply operator \'${expr.op}\' on types \'${leftTyped.a}\' and type \'${rightTyped.a}\'`);
            }
            if (expr.op === BinOp.Seq || expr.op === BinOp.Leq || expr.op === BinOp.Sml || expr.op === BinOp.Lrg) {
                return { ...expr, left: leftTyped, right:rightTyped, a: "bool" };
            }
            return { ...expr, left: leftTyped, right:rightTyped, a: "int" };
        
        // work for both int and bool, but not None
        case BinOp.Eq   :
        case BinOp.Neq  :
            const leftTypedEq = typeCheckExpr(expr.left, env);
            const rightTypedEq = typeCheckExpr(expr.right, env);
            // filter out classes and "None"
            if (!isSameType(leftTypedEq.a, rightTypedEq.a) || isObject(leftTypedEq.a) || leftTypedEq.a == "None" ) {
                throw new Error(`TYPE ERROR: Cannot apply operator \'${expr.op}\' on types \'${leftTypedEq.a}\' and type \'${rightTypedEq.a}\'`);
            }
            return { ...expr, left: leftTypedEq, right: rightTypedEq, a: "bool" };
        
        // work for None and other classes
        case BinOp.Is   :
            const leftTypedIs = typeCheckExpr(expr.left, env);
            const rightTypedIs = typeCheckExpr(expr.right, env);
            if (leftTypedIs.a === "int" || leftTypedIs.a === "bool" || rightTypedIs.a === "int" || rightTypedIs.a === "bool") {
                throw new Error(`TYPE ERROR: Cannot apply operator \'${expr.op}\' on types \'${leftTypedIs.a}\' and type \'${rightTypedIs.a}\'`);
            }
            return {...expr, left: leftTypedIs, right: rightTypedIs, a: "bool"}
    }
}

// should return true in the first statement if both are not objects
export function isSameType(s: Type, t: Type) {
    if (s === t) { 
        return true; // both "int", "bool", or "None"
    } else if (s === "int" || s === "bool") {
        return false; 
    } else if (t === "int" || t === "bool") {
        return false;
    } else if (t === "None" || s === "None") { // "None" is the same type as any classes
        return true
    } else {
        return (s.tag === t.tag && s.class === t.class) // both objects
    }
}

export function isObject(s: Type) {
    if (s === "int" || s === "bool" || s === "None") {
        return false
    } 
    return true
}

export function typeCheckUniOp(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    if(expr.tag != "uniop") {
        throw new Error("TYPE ERROR: typeCheckUniOp only take unary operations");
    }
    switch(expr.op) {
        // work for int
        case UniOp.Minus:
            const typedExpr = typeCheckExpr(expr.expr, env);
            if(typedExpr.a !== "int") {
                throw new Error(`TYPE ERROR: uniary operator ${UniOp.Minus} expected ${"int"}; got type ${typedExpr.a}`);
            }
            return {...expr, expr: typedExpr, a: "int"};
        // work for bool
        case UniOp.Not:
            const notTypedExpr = typeCheckExpr(expr.expr, env);
            if(notTypedExpr.a !== "bool") {
                throw new Error(`TYPECHECK ERROR: uniary operator ${UniOp.Not} expected ${"bool"}; got type ${notTypedExpr.a}`);
            }
            return {...expr, expr: notTypedExpr, a: "bool"};
        default:
            throw new Error(`TYPE ERROR: undefined unary operator ${expr}. This error should be called in parser`);
    }
}

export function typeCheckWhile(stmt: Stmt<null>, env:TypeEnv): Stmt<Type> { // TODO
    if(stmt.tag !== 'while') {
        throw new Error("TYPE ERROR: the input statement should be while when calling typeCheckWhile");
    }

    const typedWhileCond = typeCheckExpr(stmt.cond, env);
    const typedWhileBody = typeCheckStmts(stmt.stmts, env);

    if(typedWhileCond.a !== "bool") {
        throw new Error(`TYPE ERROR: Condtion expression cannot be of type '${typedWhileCond.a}'`);
    }
    return {
        a: "None",
        tag: 'while',
        cond: typedWhileCond,
        stmts: typedWhileBody
    }
}

export function typeCheckIf(stmt: Stmt<null>, env:TypeEnv): Stmt<Type> {
    if(stmt.tag !== 'if') {
        throw new Error("TYPE ERROR: the input statement should be if when calling typeCheckIf");
    }

    // check if
    const typedIfCond = typeCheckExpr(stmt.ifOp.cond, env);
    const typedIfBody = typeCheckStmts(stmt.ifOp.stmts, env);
    if(typedIfCond.a !== "bool") {
        throw new Error(`TYPE ERROR: Condtion expression cannot be of type '${typedIfCond.a}'`);
    }
    
    // check elif
    let typedElifCond: Expr<Type> = null;
    let typedElifBody: Stmt<Type>[] = null;
    if(stmt.elifOp.cond !== null) {
        typedElifCond = typeCheckExpr(stmt.elifOp.cond, env);
        typedElifBody = typeCheckStmts(stmt.elifOp.stmts, env);
        if(typedElifCond.a !== "bool") {
            throw new Error(`TYPE ERROR: Condtion expression cannot be of type '${typedElifCond.a}'`);
        }
    }

    // check else:
    let tpyedElseBody: Stmt<Type>[] = null;
    if(stmt.elseOp.stmts !== null) {
        tpyedElseBody = typeCheckStmts(stmt.elseOp.stmts, env);
    }
    return {
        a: "None",
        tag: "if",
        ifOp: {cond: typedIfCond, stmts: typedIfBody},
        elifOp: {cond: typedElifCond, stmts: typedElifBody},
        elseOp: {stmts: tpyedElseBody}
    };
}

export function typeCheckField(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    if (expr.tag !== "getfield") {
        throw new Error("TYPE ERROR: typeCheckMethod only accepts a getfield as an input expr");
    }
    const typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") { // cannot compile with isObject()
        throw new Error("TYPE ERROR: Only objects can get fields.");
    }
    if (!env.classFields.has(typedObj.a.class)) {
        throw new Error("TYPE ERROR: The class doesn't exist.");
    }

    const classFields = env.classFields.get(typedObj.a.class);
    if (!classFields.has(expr.name)) {
        throw new Error("TYPE ERROR: The field doesn't exist in the class.");
    }
    return { ...expr, obj: typedObj, a: classFields.get(expr.name) };
}

export function typeCheckMethod(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    if (expr.tag !== "method") {
        throw new Error("TYPE ERROR: typeCheckMethod only accepts a method as an input expr");
    }
    const typedObj = typeCheckExpr(expr.obj, env);
    if (typedObj.a === "int" || typedObj.a === "bool" || typedObj.a === "None") {
        throw new Error("TYPE ERROR: Only classes can call methods.");
    }
    if (!env.classMethods.has(typedObj.a.class)) {
        throw new Error("TYPE ERROR: The class doesn't exist.");
    }
    const classMethods = env.classMethods.get(typedObj.a.class);
    if (!classMethods.has(expr.name)) {
        throw new Error("TYPE ERROR: The method doesn't exist in the class.");
    }

    const [argTyps, retTyp] = classMethods.get(expr.name);
    const typedArgs = expr.args.map(a => typeCheckExpr(a, env));
    if (argTyps.length != typedArgs.length) { // We escaped "self" in the parser.
        throw new Error("TYPE ERROR: The number of parameters is incorrect.");
    }
    argTyps.forEach((t, i) => {
        if (!isSameType(t, typedArgs[i].a)) {
            throw new Error("TYPE ERROR: incorrect parameter type");
        }
    })
    return { ...expr, obj: typedObj, args: typedArgs, a: retTyp };
} 

export function typeCheckCall(expr: Expr<null>, env: TypeEnv): Expr<Type> {
    if (expr.tag !== "call") {
        throw new Error("TYPE ERROR: typeCheckCall only accept a call as an input expr");
    }
    if (!env.funcs.has(expr.name)) {
        console.warn(`TYPECHECK WARNING: If the ${expr.name} function is an imported one, we don't do any type check.`); // ex. print()
        const typedArgs: Expr<Type>[] = expr.args.map(arg => {
            return typeCheckExpr(arg, env);
        });
        return { ...expr, args:typedArgs, a: "None" };
    }

    // check # params
    const params = env.funcs.get(expr.name)[0];
    const args = expr.args;
    if(args.length !== params.length) {
        throw new Error(`TYPE ERROR: call func ${expr.name}; expected ${params.length} arguments; got ${args.length}`);
    }

    // check argument type
    const typedArgs: Expr<Type>[] = [];
    for(let idx = 0; idx < params.length; ++idx) {
        const typedArg = typeCheckExpr(args[idx], env);
        if(typedArg.a !== params[idx]) {
            throw new Error(`TYPE ERROR: call func ${expr.name}; expected type ${params[idx]}; got type ${typedArg.a} in parameters ${idx}`);
        }
        typedArgs.push(typedArg);
    }
    return {...expr, args: typedArgs, a: env.funcs.get(expr.name)[1]}; // use the return type
}

// make sure the variable type is equal to the literal type
export function typeCheckVarInit(inits: VarInit<null>[], env: TypeEnv): VarInit<Type>[] {
    const typedInits: VarInit<Type>[] = []
    const scopeVar = new Set();

    inits.forEach((init) => {
        // check if the left hand type equals to the right hand type
        // ex. x:int and 1
        const typedLiteral = typeCheckLiteral(init.initLiteral);
        if (!isSameType(init.type, typedLiteral.a) && !(isObject(init.type) && typedLiteral.a === "None")) { // ex. r1 : Rat = None
            throw Error("Error: TYPE ERROR: init type does not match literal type");
        }
        typedInits.push({ ...init, a: init.type, initLiteral:typedLiteral }); // add the types to VarInit
    })
    return typedInits;
}

/*
Check the type of class definition:
(1) add the class variables
(2) check each function
*/
export function typeCheckClassDef(cls: Stmt<null>, env: TypeEnv): Stmt<Type> {
    if (cls.tag !== "class") {
        throw new Error("TYPE ERROR: This is not a class statement.");
    }

    // The methods in the class can access the global variables.
    const localEnv = deepCopyVarEnv(env); // include global variables in the local environment
    
    // check variable initializations
    const localTypedInits = typeCheckVarInit(cls.fields, localEnv); // check the type
    cls.fields.forEach(localTypedInit => {
        localEnv.vars.set("self." + localTypedInit.name, localTypedInit.type); // to distinguish self.a from a
    }) // add variables to the environment
    localEnv.vars.set("self", { tag: "object", class: cls.name }); // add the "self" variable to the environment

    // check method definitions
    const localTypedMethods = cls.methods.map(m => { return typeCheckFuncDef(m, localEnv) }); // use the same function
    return { ...cls, a: "None", fields: localTypedInits, methods: localTypedMethods }; // A class definition doesn't require an "a".
}

/*
 * Check the type of function definition:
 * (1) need to update the type var env before checking the func body
 * (2) need to check the statements
 * (3) the return type
 */
export function typeCheckFuncDef(func: FuncDef<null>, env: TypeEnv): FuncDef<Type> {
    // The global variables are included in the local environment.
    const localEnv = deepCopyVarEnv(env);

   // add params to envs
   const scopeVar = new Set(); // We need this because localEnv contains global variables.
   const typedParams = typeCheckParams(func.params);
   func.params.forEach(param => {
       // Params are added first to check duplicate initializations.
       if (scopeVar.has(param.name)) {
           throw Error("TYPE ERROR: duplicate param declaration in the same field");
       }
       scopeVar.add(param.name);
       localEnv.vars.set(param.name, param.type);    
   })

   // check inits -> add to envs
   const localTypedInits = typeCheckVarInit(func.varInits, localEnv);
   func.varInits.forEach(localTypedInit => {
        if (scopeVar.has(localTypedInit.name)) {
            throw Error("TYPE ERROR: duplicate init declaration in the same field");
        }
        scopeVar.add(localTypedInit.name);
       localEnv.vars.set(localTypedInit.name, localTypedInit.type);
   })

   // add return type
   localEnv.retType = func.retType;

   // check body statements
   const typedStmts = typeCheckStmts(func.stmts, localEnv);

   // make sure every path has the expected return 
   if (!typeCheckHasReturn(func.stmts, env) && func.retType !== "None") {
        throw new Error(`TYPE ERROR: All paths in function/method must have a return statement: ${func.name}`);
   }
   return { ...func, params: typedParams, varInits: localTypedInits, stmts: typedStmts };
}

// simply assign the type to a
export function typeCheckParams(params: TypedVar<null>[]): TypedVar<Type>[] {
    return params.map(p => { return { ...p, a: p.type } });
}

// The tags of literals are their types.
export function typeCheckLiteral(literal: Literal<null>): Literal<Type> {
    switch(literal.tag) {
        case "num" :
            return {...literal, a: "int"};
        case "bool":
            return {...literal, a: "bool"};
        case "none":
            return {...literal, a: "None"};
    }
}

/**
 * This function is used to check whether this body argument has the 
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
            case "expr" :
            case "assign":
            case "while":
                continue;
            default:
                throw new Error(`TYPE ERROR: typeCheckHasReturn meets unknown statement`);
        }
    }
    return false;
}
