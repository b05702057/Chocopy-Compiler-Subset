"use strict";
exports.__esModule = true;
exports.typeCheckHasReturnCases = exports.typeCheckCases = exports.compiledTestCases = exports.programTestCases = exports.binopTestCases = exports.uniopTestCases = exports.callTestCases = exports.whileTestCases = exports.returnTestCases = exports.funcTestCasese = exports.ifTestCases = exports.initTestCases = void 0;
exports.initTestCases = [
    { name: "VarInit (Int)",
        input: "x: int = 2",
        output: { name: 'x', type: "int", initLiteral: { tag: 'num', value: 2 } }
    },
    {
        name: "VarInt (bool - False)",
        input: "x: bool = False",
        output: { name: 'x', type: "bool", initLiteral: { tag: 'bool', value: false } }
    },
    {
        name: "VarInt (bool - True)",
        input: "x: bool = True",
        output: { name: 'x', type: "bool", initLiteral: { tag: 'bool', value: true } }
    },
    {
        name: "None",
        input: "x: None = None",
        output: { name: 'x', type: "None", initLiteral: { tag: 'none' } }
    }
];
exports.ifTestCases = [
    {
        name: "if (basic)",
        input: "if True: \n pass",
        output: {
            tag: 'if',
            ifOp: { cond: { tag: 'literal', literal: { tag: 'bool', value: true } }, stmts: [{ tag: 'pass' }] },
            elifOp: { cond: null, stmts: null },
            elseOp: { stmts: null }
        }
    },
    {
        name: "if..else (basic)",
        input: "if False:\n    pass\nelse: \n    pass\n",
        output: {
            tag: 'if',
            ifOp: { cond: { tag: 'literal', literal: { tag: 'bool', value: false } }, stmts: [{ tag: 'pass' }] },
            elifOp: { cond: null, stmts: null },
            elseOp: { stmts: [{ tag: 'pass' }] }
        }
    },
    {
        name: "if..elif..else (basic)",
        input: "if False:\n    pass\nelif False:\n    pass\nelse:\n    pass",
        output: {
            tag: 'if',
            ifOp: { cond: { tag: 'literal', literal: { tag: 'bool', value: false } }, stmts: [{ tag: 'pass' }] },
            elifOp: { cond: { tag: 'literal', literal: { tag: 'bool', value: false } }, stmts: [{ tag: 'pass' }] },
            elseOp: { stmts: [{ tag: 'pass' }] }
        }
    }
];
exports.funcTestCasese = [
    {
        name: "func (bacis1)",
        input: "def f1(a: int) -> int:\n    b: int = 1\n    return a + b ",
        output: {
            name: 'f1',
            params: [{ name: 'a', type: "int" }],
            retType: "int",
            varInits: [{ name: 'b', type: "int", initLiteral: { tag: 'num', value: 1 } }],
            stmts: [{ tag: 'return', expr: { tag: 'binop', op: '+', left: { tag: 'id', name: 'a' }, right: { tag: 'id', name: 'b' } } }]
        }
    },
    {
        name: "func (no return)",
        input: "def f1(a: int):\n   print(a)\n",
        output: {
            name: 'f1',
            params: [{ name: 'a', type: "int" }],
            retType: "None",
            varInits: [],
            stmts: [{ tag: 'expr', expr: { tag: 'call', name: 'print', args: [{ tag: 'id', name: 'a' }] } }]
        }
    },
    {
        name: "func (no args)",
        input: "def f1() -> int:\n    b: int = 1\n    return b",
        output: {
            name: 'f1',
            params: [],
            retType: "int",
            varInits: [{ name: 'b', type: "int", initLiteral: { tag: 'num', value: 1 } }],
            stmts: [{ tag: 'return', expr: { tag: 'id', name: 'b' } }]
        }
    },
    {
        name: "func (no args)",
        input: "def abcd_efg():\n    pass",
        output: {
            name: 'abcd_efg',
            params: [],
            retType: "None",
            varInits: [],
            stmts: [{ tag: 'pass' }]
        }
    },
];
exports.returnTestCases = [
    {
        name: "return int",
        input: "return 0",
        output: {
            tag: 'return',
            expr: { tag: 'literal', literal: { tag: 'num', value: 0 } }
        }
    },
    {
        name: "return bool (False)",
        input: "return False",
        output: { tag: 'return',
            expr: { tag: 'literal', literal: { tag: 'bool', value: false } }
        }
    },
    {
        name: "return bool",
        input: "return True",
        output: { tag: 'return',
            expr: { tag: 'literal', literal: { tag: 'bool', value: true } }
        }
    },
    {
        name: "return simple expr",
        input: "return 1 + 2",
        output: { tag: 'return',
            expr: {
                tag: 'binop',
                op: '+',
                left: { tag: 'literal', literal: { tag: 'num', value: 1 } },
                right: { tag: 'literal', literal: { tag: 'num', value: 2 } }
            }
        }
    },
    {
        name: "return empty",
        input: "return",
        output: { tag: 'return', expr: { tag: 'literal', literal: { tag: 'none' } } }
    }
];
exports.whileTestCases = [
    {
        name: "simple while",
        input: "while False:\n    pass",
        output: {
            tag: 'while',
            cond: { tag: 'literal', literal: { tag: 'bool', value: false } },
            stmts: [{ tag: 'pass' }]
        }
    },
    {
        name: "basic while",
        input: "while i < 5:\n    i = i + 1",
        output: {
            tag: 'while',
            cond: {
                tag: 'binop',
                op: '<',
                left: { tag: 'id', name: 'i' },
                right: { tag: 'literal', literal: { tag: 'num', value: 5 } }
            },
            stmts: [
                {
                    tag: 'assign',
                    name: 'i',
                    value: {
                        tag: 'binop',
                        op: '+',
                        left: { tag: 'id', name: 'i' },
                        right: { tag: 'literal', literal: { tag: 'num', value: 1 } }
                    }
                }
            ]
        }
    }
];
exports.callTestCases = [
    {
        name: "simple print",
        input: "print(1)",
        output: {
            tag: "call",
            name: 'print',
            args: [{ tag: 'literal', literal: { tag: 'num', value: 1 } }]
        }
    },
    {
        name: "basic print",
        input: "print(1 + 2)",
        output: {
            tag: 'call',
            name: 'print',
            args: [{ tag: 'binop', op: '+',
                    left: { tag: 'literal', literal: { tag: 'num', value: 1 } },
                    right: { tag: 'literal', literal: { tag: 'num', value: 2 } } }]
        }
    },
    {
        name: "basic max",
        input: "max(1, 2)",
        output: {
            tag: 'call',
            name: 'max',
            args: [
                { tag: 'literal', literal: { tag: 'num', value: 1 } },
                { tag: 'literal', literal: { tag: 'num', value: 2 } }
            ]
        }
    },
    {
        name: "no argument",
        input: "f()",
        output: { tag: 'call', name: 'f', args: [] }
    }
];
exports.uniopTestCases = [
    {
        name: "-",
        input: "-1",
        output: {
            tag: 'uniop',
            op: '-',
            expr: { tag: 'literal', literal: { tag: 'num', value: 1 } }
        }
    },
    {
        name: "not",
        input: "not True",
        output: {
            tag: 'uniop',
            op: 'not',
            expr: { tag: 'literal', literal: { tag: 'bool', value: true } }
        }
    }
];
exports.binopTestCases = [
    {
        name: "+",
        input: "1+2+3",
        output: {
            tag: 'binop',
            op: '+',
            left: {
                tag: 'binop',
                op: '+',
                left: { tag: 'literal', literal: { tag: 'num', value: 1 } },
                right: { tag: 'literal', literal: { tag: 'num', value: 2 } }
            },
            right: { tag: 'literal', literal: { tag: 'num', value: 3 } }
        }
    },
    {
        name: "==",
        input: "1  == 2",
        output: {
            tag: 'binop',
            op: '==',
            left: { tag: 'literal', literal: { tag: 'num', value: 1 } },
            right: { tag: 'literal', literal: { tag: 'num', value: 2 } }
        }
    },
    {
        name: "is",
        input: "x is y",
        output: {
            tag: 'binop',
            op: 'is',
            left: { tag: 'id', name: 'x' },
            right: { tag: 'id', name: 'y' }
        }
    },
    {
        name: ">=",
        input: "2 >= 1",
        output: {
            tag: 'binop',
            op: '>=',
            left: { tag: 'literal', literal: { tag: 'num', value: 2 } },
            right: { tag: 'literal', literal: { tag: 'num', value: 1 } }
        }
    }
];
exports.programTestCases = [
    {
        name: "program 1",
        input: "x: int = 1\ndef f1(a:int) -> int:\n    return a\nf1(x)",
        output: {
            varInits: [{ name: 'x', type: "int", initLiteral: { tag: 'num', value: 1 } }],
            funcDefs: [
                {
                    name: 'f1',
                    params: [{ name: 'a', type: "int" }],
                    retType: "int",
                    varInits: [],
                    stmts: [{ tag: 'return', expr: { tag: 'id', name: 'a' } }]
                }
            ],
            stmts: [{ tag: 'expr', expr: { tag: 'call', name: 'f1', args: [{ tag: 'id', name: 'x' }] } }]
        }
    },
    {
        name: "Q2",
        input: "x: int = 1\ndef f1(a: int):\n    b: int = 1\n    return a + b\nf1(x)\n",
        output: {
            varInits: [{ name: 'x', type: "int", initLiteral: { tag: 'num', value: 1 } }],
            funcDefs: [
                {
                    name: 'f1',
                    params: [{ name: 'a', type: "int" }],
                    retType: "None",
                    varInits: [{ name: 'b', type: "int", initLiteral: { tag: 'num', value: 1 } }],
                    stmts: [{ tag: 'return', expr: { tag: 'binop', op: '+', left: { tag: 'id', name: 'a' }, right: { tag: 'id', name: 'b' } } }]
                }
            ],
            stmts: [{ tag: 'expr', expr: { tag: 'call', name: 'f1', args: [{ tag: 'id', name: 'x' }] } }]
        }
    },
    {
        name: "4.3",
        input: "x: int = 0\n while x < 2:\n    print(x)\n    x = x + 1\n",
        output: {
            varInits: [{ name: 'x', type: "int", initLiteral: { tag: 'num', value: 0 } }],
            funcDefs: [],
            stmts: [{
                    tag: 'while',
                    cond: {
                        tag: 'binop',
                        op: '<',
                        left: { tag: 'id', name: 'x' },
                        right: { tag: 'literal', literal: { tag: 'num', value: 2 } }
                    },
                    stmts: [
                        { tag: 'expr', expr: { tag: 'call', name: 'print', args: [{ tag: 'id', name: 'x' }] } },
                        { tag: 'assign', name: 'x', value: { tag: 'binop', op: '+', left: { tag: 'id', name: 'x' }, right: { tag: 'literal', literal: { tag: 'num', value: 1 } } } }
                    ]
                }]
        }
    },
    {
        name: "4.4",
        input: "x: int = 0\ndef f1():\n    while x < 2:\n        if x == 1:\n            return\n        x = x + 1\nf1()\n",
        output: {
            varInits: [{ name: 'x', type: "int", initLiteral: { tag: 'num', value: 0 } }],
            funcDefs: [
                {
                    name: 'f1',
                    params: [],
                    retType: "None",
                    varInits: [],
                    stmts: [{
                            tag: 'while',
                            cond: {
                                tag: 'binop',
                                op: '<',
                                left: { tag: 'id', name: 'x' },
                                right: { tag: 'literal', literal: { tag: "num", value: 2 }
                                }
                            },
                            stmts: [
                                {
                                    tag: 'if',
                                    ifOp: {
                                        cond: {
                                            tag: 'binop',
                                            op: '==',
                                            left: { tag: 'id', name: 'x' },
                                            right: { tag: 'literal', literal: { tag: 'num', value: 1 } }
                                        },
                                        stmts: [{ tag: 'return', expr: { tag: 'literal', literal: { tag: 'none' } } }]
                                    },
                                    elifOp: { cond: null, stmts: null },
                                    elseOp: { stmts: null }
                                },
                                {
                                    tag: 'assign',
                                    name: 'x',
                                    value: {
                                        tag: 'binop',
                                        op: '+',
                                        left: { tag: 'id', name: 'x' },
                                        right: { tag: 'literal', literal: { tag: 'num', value: 1 } }
                                    }
                                }
                            ]
                        }]
                }
            ],
            stmts: [{ tag: 'expr', expr: { tag: 'call', name: 'f1', args: [] } }]
        }
    },
    {
        name: "4.5",
        input: "print(1)\nprint(True)",
        output: {
            varInits: [],
            funcDefs: [],
            stmts: [{
                    tag: 'expr',
                    expr: { tag: 'call', name: 'print', args: [{ tag: 'literal', literal: { tag: 'num', value: 1 } }] }
                },
                {
                    tag: 'expr',
                    expr: { tag: 'call', name: 'print', args: [{ tag: 'literal', literal: { tag: 'bool', value: true } }] }
                }]
        }
    },
    {
        name: "4.6",
        input: "def f(x: int):\n    x = x - 1\n    if x==0:\n        return\n    f(x)\nf(2)",
        output: {
            varInits: [],
            funcDefs: [
                {
                    name: 'f',
                    params: [{ name: "x", type: "int" }],
                    retType: "None",
                    varInits: [],
                    stmts: [
                        {
                            tag: 'assign',
                            name: 'x',
                            value: { tag: 'binop', op: '-', left: { tag: 'id', name: 'x' }, right: { tag: 'literal', literal: { tag: 'num', value: 1 } } }
                        },
                        {
                            tag: 'if',
                            ifOp: {
                                cond: { tag: 'binop', op: '==', left: { tag: 'id', name: 'x' }, right: { tag: 'literal', literal: { tag: 'num', value: 0 } } },
                                stmts: [{ tag: 'return', expr: { tag: 'literal', literal: { tag: 'none' } } }]
                            },
                            elifOp: { cond: null, stmts: null },
                            elseOp: { stmts: null }
                        },
                        { tag: 'expr', expr: { tag: 'call', name: 'f', args: [{ tag: 'id', name: 'x' }] } }
                    ]
                }
            ],
            stmts: [{ tag: 'expr', expr: {
                        tag: 'call',
                        name: 'f',
                        args: [{ tag: 'literal', literal: { tag: 'num', value: 2 } }]
                    } }]
        }
    },
    {
        name: "easy one (var int)",
        input: "x: int = 1",
        output: {
            varInits: [{ name: 'x', type: "int", initLiteral: { tag: 'num', value: 1 } }],
            funcDefs: [],
            stmts: []
        }
    },
    {
        name: "easy one (func)",
        input: "def f():\n    pass\n",
        output: {
            varInits: [],
            funcDefs: [
                { name: 'f', params: [], retType: "None", varInits: [], stmts: [{ tag: 'pass' }] }
            ],
            stmts: []
        }
    },
    {
        name: "program (add function)",
        input: "a: int = 1\nb: int = 2\ndef f(x: int, y: int) -> int:\n    return x + y\nf(x,y)",
        output: {
            varInits: [
                { name: 'a', type: 'int', initLiteral: { tag: 'num', value: 1 } },
                { name: 'b', type: 'int', initLiteral: { tag: 'num', value: 2 } }
            ],
            funcDefs: [
                {
                    name: 'f',
                    params: [{ name: 'x', type: 'int' }, { name: 'y', type: 'int' }],
                    retType: 'int',
                    varInits: [],
                    stmts: [{
                            tag: 'return',
                            expr: {
                                tag: 'binop',
                                op: '+',
                                left: { tag: 'id', name: 'x' },
                                right: { tag: 'id', name: 'y' }
                            }
                        }]
                }
            ],
            stmts: [{ tag: 'expr', expr: {
                        tag: 'call',
                        name: 'f',
                        args: [{ tag: 'id', name: 'x' }, { tag: 'id', name: 'y' }]
                    } }]
        }
    },
    {
        name: "class",
        input: "\n    class Rat(object):\n        n : int = 456\n        d : int = 789\n        def __init__(self : Rat):\n            pass\n        def new(self : Rat, n : int, d : int) -> Rat:\n            self.n = n\n            self.d = d\n            return self\n        def mul(self : Rat, other : Rat) -> Rat:\n            return Rat().new(self.n * other.n, self.d * other.d)\n            \n    class Pair(object):\n        left : int = 0\n        right : int = 0\n        def __init__(self : Pair): \n            pass\n        def new(self : Pair, l : int, r : int) -> Pair:\n            self.left = l\n            self.right = r\n            return self\n        def mul(self : Pair, other : Pair) -> int:\n            return self.left * other.left + self.right * other.right\n  \n    p : Pair = None\n    r1 : Rat = None\n    r2 : Rat = None\n    p = Pair().new(8, 9)\n    r1 = Rat().new(4, 5)\n    r2 = Rat()\n    r2.n = 3\n    r2.d = 2\n    print(r1.mul(r2).mul(r2).n)\n    print(p.mul(Pair().new(3, 2)))\n    ",
        output: {}
    },
    {
        name: "easy class",
        input: "\n    class Pair(object):\n        left : int = 0\n        right : int = 0\n        def __init__(self : Pair): \n            pass\n        def new(self : Pair, l : int, r : int) -> Pair:\n            self.left = l\n            self.right = r\n            return self\n        def mul(self : Pair, other : Pair) -> int:\n            return self.left * other.left + self.right * other.right\n    ",
        output: {}
    },
    {
        name: "easy class",
        input: "\nnot True\n    ",
        output: {}
    },
];
exports.compiledTestCases = [
    {
        name: 'simeple function',
        input: "def f1(a: int) -> int:\n    b: int = 1\n    return a + b ",
        output: "\n(func $f1 (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (local $last i32))"
    },
    {
        name: "func (no args)",
        input: "def f1() -> int:\n    b: int = 1\n    return b",
        output: "\n(func $f1  (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $b)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (local $last i32))"
    },
    {
        name: "program 1",
        input: "x: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    return a + b\nf(x)",
        output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
    },
    {
        name: "program 1 (pass)",
        input: "x: int = 1\ndef f(a: int):\n    pass\nf(x)",
        output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n\nnop\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
    },
    {
        name: "program (while)",
        input: "x: int = 0\nwhile x < 2:\n  print(x)\n  x = x + 1\n",
        output: "(global $x (mut i32) (i32.const 0))\n\n(func (export \"exported_func\") (local $last i32)\n(loop \n(global.get $x)\n(call $print_num)\n(local.set $last)\n(global.get $x)\n(i32.const 1)\n(i32.add)\n(global.set $x)\n(global.get $x)\n(i32.const 2)\n(i32.lt_s)\nbr_if 0))"
    },
    {
        name: "program (if)",
        input: "x: int = 1\ny: int = 2\nif x == 1:\n    print(x)\nelif y==2:\n    print(y)\nelse:\n    print(4)\n",
        output: "(global $x (mut i32) (i32.const 1))\n(global $y (mut i32) (i32.const 2))\n\n(func (export \"exported_func\") (local $last i32)\n(global.get $x)\n(i32.const 1)\n(i32.eq)\n(if\n(then\n(global.get $x)\n(call $print_num)\n(local.set $last)\n)\n(else\n(global.get $y)\n(i32.const 2)\n(i32.eq)\n(if\n(then\n(global.get $y)\n(call $print_num)\n(local.set $last)\n)\n(else\n(i32.const 4)\n(call $print_num)\n(local.set $last)\n)))))"
    },
    {
        name: "None is None",
        input: "def f():\n              pass\n            f() is f()",
        output: "\n(func $f  (result i32)\n(local $last i32)\n\nnop\n(call $f)\n(call $f)\n(i32.eq)\n(local.set $last)\n(i32.const 0))\n(func (export \"exported_func\") (local $last i32))"
    },
    {
        name: "global and local",
        input: "a: int = 5\nx: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    return a + b\nf(x)",
        output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
    },
    {
        name: "global and local",
        input: "a: int = 5\nx: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    return a + b\nf(x)",
        output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
    },
    {
        name: "global and local assign",
        input: "a: int = 5\nx: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    x=2\n    return a + b\nf(x)",
        output: ""
    },
    {
        name: "lecture 8",
        input: "\nclass Rat(object):\n    n : int = 456\n    d : int = 789\n    def __init__(self : Rat):\n        pass\n    def new(self : Rat, n : int, d : int) -> Rat:\n        self.n = n\n        self.d = d\n        return self\n    def mul(self : Rat, other : Rat) -> Rat:\n        return Rat().new(self.n * other.n, self.d * other.d)\n        \nclass Pair(object):\n    left : int = 0\n    right : int = 0\n    def __init__(self : Pair): \n        pass\n    def new(self : Pair, l : int, r : int) -> Pair:\n        self.left = l\n        self.right = r\n        return self\n    def mul(self : Pair, other : Pair) -> int:\n        return self.left * other.left + self.right * other.right\n\np : Pair = None\nr1 : Rat = None\nr2 : Rat = None\np = Pair().new(8, 9)\nr1 = Rat().new(4, 5)\nr2 = Rat()\nr2.n = 3\nr2.d = 2\nprint(r1.mul(r2).mul(r2).n)\nprint(p.mul(Pair().new(3, 2)))\n    ",
        output: "" // method!!!!!
    },
    {
        name: "lecture 7",
        input: "\nclass Rat(object):\n    n : int = 456\n    d : int = 789\n    def __init__(self : Rat):\n        pass\n    def new(self : Rat, n : int, d : int) -> Rat:\n        self.n = n\n        self.d = d\n        return self\n    def mul(self : Rat, other : Rat) -> Rat:\n        return Rat().new(self.n * other.n, self.d * other.d)\n\nr1 : Rat = None\nr2 : Rat = None\nr1 = Rat().new(4, 5)\nr2 = Rat()\nr2.n = 3\nr2.d = 2\nprint(r1.mul(r2).mul(r2).n)\n    ",
        output: ""
    },
    {
        name: "easy",
        input: "\nclass C(object):\n    x : int = 0\n\nc : C = None\nc.x\n    ",
        output: ""
    },
];
exports.typeCheckCases = [
    {
        name: "test id (undefined)",
        input: "x",
        output: "TYPE ERROR: not a variable x"
    },
    {
        name: "test id (assign)",
        input: "x: int = 1\ny = x",
        output: "TYPE ERROR: not a variable y"
    },
    {
        name: "assign error",
        input: "x: int = 1\ny: bool = True\nx=y\n",
        output: "TYPE ERROR: Expected type int; got type bool"
    },
    {
        name: "uniop (Minus) error",
        input: "x: bool = True\ny: int = 0\ny = -x",
        output: "TYPECHECK ERROR: uniary operator - expected int; got type bool"
    },
    {
        name: "uniop (Not) error",
        input: "x: bool = True\ny: int = 0\nx = not y",
        output: "TYPECHECK ERROR: uniary operator not expected bool; got type int"
    },
    {
        name: "binop (+) error",
        input: "x: bool = True\ny: bool = True\nx + y",
        output: "TYPECHECK ERROR: Cannot apply operator '+' on types 'bool' and type 'bool'"
    },
    {
        name: "binop (-) error",
        input: "x: bool = True\ny: int = 0\nx - y",
        output: "TYPECHECK ERROR: Cannot apply operator '-' on types 'bool' and type 'int'"
    },
    {
        name: "binop (*) error",
        input: "x: bool = True\ny: int = 0\nx * y",
        output: "TYPECHECK ERROR: Cannot apply operator '*' on types 'bool' and type 'int'"
    },
    {
        name: "binop (//) error",
        input: "x: bool = True\ny: int = 0\nx // y",
        output: "TYPECHECK ERROR: Cannot apply operator '//' on types 'bool' and type 'int'"
    },
    {
        name: "binop (%) error",
        input: "x: int = 0\ny: bool = True\nx % y",
        output: "TYPECHECK ERROR: Cannot apply operator '%' on types 'int' and type 'bool'"
    },
    {
        name: "binop (>) error",
        input: "x: int = 0\ny: bool = True\nx > y",
        output: "TYPECHECK ERROR: Cannot apply operator '>' on types 'int' and type 'bool'"
    },
    {
        name: "binop (==) error",
        input: "x: int = 0\ny: bool = True\nx == y",
        output: "TYPECHECK ERROR: Cannot apply operator '==' on types 'int' and type 'bool'"
    },
    {
        name: "call (less args)",
        input: "a: int = 1\nb: int = 2\ndef f(x: int, y: int) -> int:\n    return x + y\nf(x)",
        output: "TYPECHECK ERROR: call func f; expected 2 arguments; got 1"
    },
    {
        name: "call (more args)",
        input: "a: int = 1\nb: int = 2\ndef f(x: int) -> int:\n    return x\nf(x, y)",
        output: "TYPECHECK ERROR: call func f; expected 1 arguments; got 2"
    },
    {
        name: "call (wrong argument type)",
        input: "a: int = 1\n            b: bool = True\n            def f(x:int, y: int) -> int:\n              return x + y\n            f(a, b)",
        output: "TYPECHECK ERROR: call func f; expected type int; got type bool in parameters 1"
    },
    {
        name: "if (cond not bool)",
        input: "if 1:\n              pass",
        output: "TYPECHECK ERROR: Condtion expression cannot be of type 'int'"
    },
    {
        name: "elif (cond not bool)",
        input: 'if False:\n  pass\nelif 1:\n  pass',
        output: "TYPECHECK ERROR: Condtion expression cannot be of type 'int'"
    },
    {
        name: "while (cond not bool)",
        input: 'while 1:\n  pass',
        output: "TYPECHECK ERROR: Condtion expression cannot be of type 'int'"
    },
    {
        name: "check if + if (false)",
        input: "def func(a: int, b: int) -> int:\n              if True:\n                  return 1\n              elif True:\n                  pass\n              else:\n                  return 1\n              if True:\n                  pass\n              elif True:\n                  return 0\n              else:\n                  return 1",
        output: "TYPECHECK ERROR: All paths in function/method must have a return statement: func"
    },
    {
        name: "correct class",
        input: "\n    class Rat(object):\n        n : int = 456\n        d : int = 789\n        def __init__(self : Rat):\n            pass\n        def new(self : Rat, n : int, d : int) -> Rat:\n            self.n = n\n            self.d = d\n            return self\n        def mul(self : Rat, other : Rat) -> Rat:\n            return Rat().new(self.n * other.n, self.d * other.d)\n            \n    class Pair(object):\n        left : int = 0\n        right : int = 0\n        def __init__(self : Pair): \n            pass\n        def new(self : Pair, l : int, r : int) -> Pair:\n            self.left = l\n            self.right = r\n            return self\n        def mul(self : Pair, other : Pair) -> int:\n            return self.left * other.left + self.right * other.right\n  \n    p : Pair = None\n    r1 : Rat = None\n    r2 : Rat = None\n    p = Pair().new(8, 9)\n    r1 = Rat().new(4, 5)\n    r2 = Rat()\n    r2.n = 3\n    r2.d = 2\n    print(r1.mul(r2).mul(r2).n)\n    print(p.mul(Pair().new(3, 2)))\n    ",
        output: ""
    },
    {
        name: "incorrect method return type",
        input: "\n    class Rat(object):\n        def __init__(self : Rat):\n            pass\n        def new(self : Rat, n : int, d : int) -> int:\n            return self\n    ",
        output: "Error: TYPE ERROR: return expected type int; got type [object Object]"
    },
    {
        name: "incorrect assign type",
        input: "\n    class Rat(object):\n        def __init__(self : Rat):\n            pass\n    r1 : Rat = None\n    r1 = 3\n    ",
        output: "Error: TYPE ERROR: Expected type [object Object]; got type int"
    },
    {
        name: "easy",
        input: "\nclass C(object):\n    x : int = 0\nc : C = None\nc = None\n    ",
        output: "Error: TYPE ERROR: Expected type [object Object]; got type [object Object]"
    }
];
exports.typeCheckHasReturnCases = [
    {
        name: "check whether all paths has return",
        input: "def func() -> int:\n              if True:\n                  pass\n              else:\n                  pass\n              if True:\n                  return 0\n              else:\n                  return 1",
        output: true
    },
    {
        name: "check while",
        input: "def func() -> int:\n              while True:\n                return 1",
        output: false
    },
    {
        name: "check while + if (false)",
        input: "def func() -> int:\n              while True:\n                  return 1\n              if True:\n                  return 1\n              else:\n                  pass",
        output: false
    },
    {
        name: "check while + if (true)",
        input: "def func() -> int:\n              while True:\n                  return 1\n              if True:\n                  return 1\n              else:\n                  return 0",
        output: true
    },
    {
        name: "check while + if + erxpr (true)",
        input: "def func(a: int, b: int) -> int:\n              while True:\n                  return 1\n              if True:\n                  return 1\n              else:\n                  return 1\n              a + b",
        output: true
    },
    {
        name: "check if + if (true)",
        input: "def func(a: int, b: int) -> int:\n              if True:\n                  return 1\n              elif True:\n                  return 2\n              else:\n                  return 1\n              if True:\n                  pass\n              elif True:\n                  return 0\n              else:\n                  return 1",
        output: true
    },
    {
        name: "check if + if (false)",
        input: "def func(a: int, b: int) -> int:\n              if True:\n                  return 1\n              elif True:\n                  pass\n              else:\n                  return 1\n              if True:\n                  pass\n              elif True:\n                  return 0\n              else:\n                  return 1",
        output: false
    }
];
/*
class Rat(object):
  n : int = 456
  d : int = 789
  def __init__(self : Rat):
    self.n = n
    self.d = d
    return self
  def mul(self : Rat, other : Rat) -> Rat:
    return Rat().new(self.n * other.n, self.d * other.d)

r1 : Rat = None
r2 : Rat = None
r1 = Rat().new(4, 5)
r2 = Rat()
r2.n = 3
r2.d = 2
print(r1.mul(r2).mul(r2).n)
*/
