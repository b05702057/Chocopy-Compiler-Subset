export type TestCase<A>  = {
    name: string,
    input: string,
    output: A,
}
  
export const initTestCases: TestCase<Object>[]  = [
  {name: "VarInit (Int)", 
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

export const ifTestCases: TestCase<Object>[] = [
    {
        name: "if (basic)",
        input: "if True: \n pass",
        output: {
          tag: 'if',
          ifOp: {cond: { tag: 'literal', literal: { tag: 'bool', value: true } },stmts: [ { tag: 'pass' } ]},
          elifOp: { cond: null, stmts: null },
          elseOp: { stmts: null }
        }
    },
    {
      name: "if..else (basic)",
      input: `if False:\n    pass\nelse: \n    pass\n`,
      output: {
        tag: 'if',
        ifOp: {cond: { tag: 'literal', literal: { tag: 'bool', value: false } },stmts: [ { tag: 'pass' } ]},
        elifOp: { cond: null, stmts: null },
        elseOp: { stmts: [ { tag: 'pass' } ] }
      }
    },
    {
      name: "if..elif..else (basic)",
      input: "if False:\n    pass\nelif False:\n    pass\nelse:\n    pass",
      output: {
        tag: 'if',
        ifOp: {cond: { tag: 'literal', literal: { tag: 'bool', value: false } },stmts: [ { tag: 'pass' } ]},
        elifOp: {cond: { tag: 'literal', literal: { tag: 'bool', value: false } },stmts: [ { tag: 'pass' } ]},
        elseOp: { stmts: [ { tag: 'pass' } ] }
      }
    }   
]

export const funcTestCasese: TestCase<Object>[] = [
  {//0
      name: "func (bacis1)",
      input: "def f1(a: int) -> int:\n    b: int = 1\n    return a + b ",
      output: {
        name: 'f1',
        params: [ { name: 'a', type: "int" } ],
        retType: "int",
        varInits: [ { name: 'b', type: "int", initLiteral: { tag: 'num', value: 1 } } ],
        stmts: [ {tag: 'return', expr: {tag: 'binop',op: '+', left: { tag: 'id', name: 'a' }, right: { tag: 'id', name: 'b' }}}]
      }
  },
  { // 1
    name: "func (no return)",
    input: "def f1(a: int):\n   print(a)\n",
    output: {
      name: 'f1',
      params: [ { name: 'a', type: "int" } ],
      retType: "None",
      varInits: [],
      stmts: [ { tag: 'expr', expr: { tag: 'call', name: 'print', args: [ { tag: 'id', name: 'a' } ]} } ]
    }
  },
  { // 2 
    name: "func (no args)",
    input: "def f1() -> int:\n    b: int = 1\n    return b", 
    output: {
      name: 'f1',
      params: [],
      retType: "int",
      varInits: [ { name: 'b', type: "int", initLiteral: { tag: 'num', value: 1 } } ],
      stmts: [ { tag: 'return', expr: { tag: 'id', name: 'b' } } ]
    }
  },
  { // 3
    name: "func (no args)",
    input: "def abcd_efg():\n    pass", 
    output:{
      name: 'abcd_efg',
      params: [],
      retType: "None",
      varInits: [],
      stmts: [ { tag: 'pass' } ]
    }
  },
]

export const returnTestCases: TestCase<Object>[] = [
  {
    name: "return int",
    input: "return 0",
    output: {
            tag: 'return',
            expr: { tag: 'literal', literal: { tag: 'num', value: 0 } }
          },
  },
  {
    name: "return bool (False)",
    input: "return False",
    output: {tag: 'return',
             expr: { tag: 'literal', literal: { tag: 'bool', value: false } }
            },
  },
  {
    name: "return bool",
    input: "return True",
    output: {tag: 'return',
             expr: { tag: 'literal', literal: { tag: 'bool', value: true } }
            },
  },
  {
    name: "return simple expr",
    input: "return 1 + 2",
    output: {tag: 'return',
             expr: {
                  tag: 'binop',
                  op: '+',
                  left: { tag: 'literal', literal: {tag: 'num', value: 1}},
                  right: { tag: 'literal', literal: {tag: 'num', value: 2}}
              }
            },
  },
  {
    name: "return empty",
    input: "return",
    output: { tag: 'return', expr: { tag: 'literal', literal: { tag: 'none' } } },
  }
]

export const whileTestCases: TestCase<Object>[] = [
  {
    name: "simple while",
    input: "while False:\n    pass",
    output: {
      tag: 'while',
      cond: { tag: 'literal', literal: { tag: 'bool', value: false } },
      stmts: [ { tag: 'pass' } ]
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
]

export const callTestCases: TestCase<Object>[] = [
  {
    name: "simple print",
    input: "print(1)",
    output: {
        tag: "call",
        name: 'print',
        args: [ { tag: 'literal', literal: { tag: 'num', value: 1 } }]
    }
  },
  {
    name: "basic print",
    input: "print(1 + 2)",
    output: {
      tag: 'call',
      name: 'print',
      args: [ { tag: 'binop', op: '+', 
                left: { tag: 'literal', literal: { tag: 'num', value: 1 } }, 
                right: { tag: 'literal', literal: { tag: 'num', value: 2 } } } ]
    }
  },
  {
    name: "basic max",
    input: "max(1, 2)",
    output: {
      tag: 'call',
      name: 'max',
      args: [
        { tag: 'literal', literal: { tag: 'num', value: 1 }},
        { tag: 'literal', literal: { tag: 'num', value: 2 }}
      ]
    }
  },
  {
    name: "no argument",
    input: "f()",
    output: {tag: 'call', name: 'f', args: []}
  }
]

export const uniopTestCases: TestCase<Object>[] = [
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
]

export const binopTestCases: TestCase<Object>[] = [
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

 
]

export const programTestCases: TestCase<Object>[] = [
  { //0
    name: "program 1",
    input: "x: int = 1\ndef f1(a:int) -> int:\n    return a\nf1(x)",
    output: {
      varInits: [ { name: 'x', type: "int", initLiteral: { tag: 'num', value: 1 } }],
      funcDefs: [
        {
          name: 'f1',
          params: [ { name: 'a', type: "int" } ],
          retType: "int",
          varInits: [],
          stmts: [ { tag: 'return', expr: { tag: 'id', name: 'a' } }]
        }
      ],
      stmts: [ { tag: 'expr', expr: { tag: 'call', name: 'f1', args: [ { tag: 'id', name: 'x' } ] }}]
    }
  },
  { // 1
    name: "Q2",
    input: "x: int = 1\ndef f1(a: int):\n    b: int = 1\n    return a + b\nf1(x)\n",
    output: {
      varInits: [{ name: 'x', type: "int", initLiteral: {tag: 'num', value: 1}}],
      funcDefs: [
        {
          name: 'f1',
          params: [ { name: 'a', type: "int" } ],
          retType: "None",
          varInits: [ { name: 'b', type: "int", initLiteral: { tag: 'num', value: 1 } } ],
          stmts: [{tag: 'return', expr: {tag: 'binop',op: '+',left: { tag: 'id', name: 'a' },right: { tag: 'id', name: 'b' }}}]
        }
      ],
      stmts: [ { tag: 'expr', expr: { tag: 'call', name: 'f1', args: [{ tag: 'id', name: 'x' }]}}]
    }
  },
  { // 2
    name: "4.3",
    input: "x: int = 0\n while x < 2:\n    print(x)\n    x = x + 1\n",
    output: {
      varInits: [{ name: 'x', type: "int", initLiteral: { tag: 'num', value: 0 } }],
      funcDefs: [],
      stmts: [ {
        tag: 'while',
        cond: {
          tag: 'binop',
          op: '<',
          left: { tag: 'id', name: 'x' },
          right: { tag: 'literal', literal: { tag: 'num', value: 2 } }
        },
        stmts: [
          { tag: 'expr', expr: { tag: 'call', name: 'print', args: [ { tag: 'id', name: 'x' } ] } },
          { tag: 'assign', name: 'x', value: {tag: 'binop',op: '+',left: { tag: 'id', name: 'x' }, right: { tag: 'literal', literal: { tag: 'num', value: 1 }}} }
        ]
      }]
    }
  },
  { // 3
    name: "4.4",
    input: "x: int = 0\ndef f1():\n    while x < 2:\n        if x == 1:\n            return\n        x = x + 1\nf1()\n",
    output: {
      varInits: [{name: 'x', type: "int", initLiteral: {tag: 'num', value: 0}}],
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
              right: { tag: 'literal', literal: {tag: "num", value: 2}
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
  { // 4
    name: "4.5",
    input: "print(1)\nprint(True)",
    output: {
      varInits: [],
      funcDefs: [],
      stmts: [{
        tag: 'expr',
        expr: { tag: 'call', name: 'print', args: [ { tag: 'literal', literal: { tag: 'num', value: 1 } } ] }
      }, 
      {
        tag: 'expr',
        expr: { tag: 'call', name: 'print', args: [ { tag: 'literal', literal: { tag: 'bool', value: true } } ]}
      } ]
    }
  }, 
  { // 5
    name: "4.6",
    input: "def f(x: int):\n    x = x - 1\n    if x==0:\n        return\n    f(x)\nf(2)",
    output: {
      varInits: [],
      funcDefs: [
        {
          name: 'f',
          params: [{name: "x", type: "int"}],
          retType: "None",
          varInits: [],
          stmts: [
            {
              tag: 'assign',
              name: 'x',
              value: {tag: 'binop', op: '-', left: { tag: 'id', name: 'x' }, right: { tag: 'literal', literal: { tag: 'num', value: 1 } }}
            },
            {
              tag: 'if',
              ifOp: {
                cond: {tag: 'binop',op: '==',left: { tag: 'id', name: 'x' },right: { tag: 'literal', literal: { tag: 'num', value: 0 } }},
                stmts: [ { tag: 'return', expr: { tag: 'literal', literal: { tag: 'none' } } } ]
              },
              elifOp: { cond: null, stmts: null },
              elseOp: { stmts: null }
            },
            { tag: 'expr', expr: { tag: 'call', name: 'f', args: [ { tag: 'id', name: 'x' } ] }}
          ]
        }
      ],
      stmts: [{ tag: 'expr', expr:{
        tag: 'call',
        name: 'f',
        args: [ { tag: 'literal', literal: { tag: 'num', value: 2 } } ] 
      }}]
    }
  },
  { // 6
    name: "easy one (var int)",
    input: "x: int = 1",
    output: {
      varInits: [{name: 'x', type: "int", initLiteral: {tag: 'num', value: 1}}],
      funcDefs: [],
      stmts: []
    }
  },
  { // 7
    name: "easy one (func)",
    input: "def f():\n    pass\n",
    output: {
      varInits: [],
      funcDefs: [
        { name: 'f', params: [], retType: "None", varInits: [], stmts: [ { tag: 'pass' } ] }
      ],
      stmts: []
    }
  },
  { // 8
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
          params: [ { name: 'x', type: 'int' }, { name: 'y', type: 'int' } ],
          retType: 'int',
          varInits: [],
          stmts: [ {
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
      stmts: [ { tag: 'expr', expr: {
        tag: 'call',
        name: 'f',
        args: [ { tag: 'id', name: 'x' }, { tag: 'id', name: 'y' } ]
      } } ]
    }
  },
  { // 9
    name: "class",
    input: 
    `
    class Rat(object):
        n : int = 456
        d : int = 789
        def __init__(self : Rat):
            pass
        def new(self : Rat, n : int, d : int) -> Rat:
            self.n = n
            self.d = d
            return self
        def mul(self : Rat, other : Rat) -> Rat:
            return Rat().new(self.n * other.n, self.d * other.d)
            
    class Pair(object):
        left : int = 0
        right : int = 0
        def __init__(self : Pair): 
            pass
        def new(self : Pair, l : int, r : int) -> Pair:
            self.left = l
            self.right = r
            return self
        def mul(self : Pair, other : Pair) -> int:
            return self.left * other.left + self.right * other.right
  
    p : Pair = None
    r1 : Rat = None
    r2 : Rat = None
    p = Pair().new(8, 9)
    r1 = Rat().new(4, 5)
    r2 = Rat()
    r2.n = 3
    r2.d = 2
    print(r1.mul(r2).mul(r2).n)
    print(p.mul(Pair().new(3, 2)))
    `,
    output: {}
  },
  { // 10
    name: "easy class",
    input: 
    `
    class Pair(object):
        left : int = 0
        right : int = 0
        def __init__(self : Pair): 
            pass
        def new(self : Pair, l : int, r : int) -> Pair:
            self.left = l
            self.right = r
            return self
        def mul(self : Pair, other : Pair) -> int:
            return self.left * other.left + self.right * other.right
    `,
    output: {}
  },
  { // 11
    name: "easy class",
    input: 
    `
not True
    `,
    output: {}
  },

]

export const compiledTestCases: TestCase<String>[] = [
  { // 0
    name: 'simeple function',
    input: "def f1(a: int) -> int:\n    b: int = 1\n    return a + b ",
    output: "\n(func $f1 (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (local $last i32))"
  },
  { // 1
    name: "func (no args)",
    input: "def f1() -> int:\n    b: int = 1\n    return b",
    output: "\n(func $f1  (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $b)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (local $last i32))"
  }, 
  {//2
    name: "program 1",
    input: "x: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    return a + b\nf(x)",
    output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
  },
  {//3
    name: "program 1 (pass)",
    input: "x: int = 1\ndef f(a: int):\n    pass\nf(x)",
    output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n\nnop\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
  }, 
  { // 4
    name: "program (while)",
    input: "x: int = 0\nwhile x < 2:\n  print(x)\n  x = x + 1\n",
    output:"(global $x (mut i32) (i32.const 0))\n\n(func (export \"exported_func\") (local $last i32)\n(loop \n(global.get $x)\n(call $print_num)\n(local.set $last)\n(global.get $x)\n(i32.const 1)\n(i32.add)\n(global.set $x)\n(global.get $x)\n(i32.const 2)\n(i32.lt_s)\nbr_if 0))"
  },
  { // 5
    name: "program (if)",
    input: "x: int = 1\ny: int = 2\nif x == 1:\n    print(x)\nelif y==2:\n    print(y)\nelse:\n    print(4)\n",
    output:"(global $x (mut i32) (i32.const 1))\n(global $y (mut i32) (i32.const 2))\n\n(func (export \"exported_func\") (local $last i32)\n(global.get $x)\n(i32.const 1)\n(i32.eq)\n(if\n(then\n(global.get $x)\n(call $print_num)\n(local.set $last)\n)\n(else\n(global.get $y)\n(i32.const 2)\n(i32.eq)\n(if\n(then\n(global.get $y)\n(call $print_num)\n(local.set $last)\n)\n(else\n(i32.const 4)\n(call $print_num)\n(local.set $last)\n)))))"  },
  { //  6
    name: "None is None",
    input: `def f():
              pass
            f() is f()`,
    output: "\n(func $f  (result i32)\n(local $last i32)\n\nnop\n(call $f)\n(call $f)\n(i32.eq)\n(local.set $last)\n(i32.const 0))\n(func (export \"exported_func\") (local $last i32))"
  },
  { // 7
    name: "global and local",
    input: "a: int = 5\nx: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    return a + b\nf(x)",
    output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
  },
  { // 8
    name: "global and local",
    input: "a: int = 5\nx: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    return a + b\nf(x)",
    output: "(global $x (mut i32) (i32.const 1))\n(func $f (param $a i32) (result i32)\n(local $last i32)\n(local $b i32)\n(local.set $b (i32.const 1))\n(local.get $a)\n(local.get $b)\n(i32.add)\nreturn\n(i32.const 0))\n(func (export \"exported_func\") (result i32)(local $last i32)\n(global.get $x)\n(call $f)\n(local.set $last)(local.get $last))"
  },
  { // 9
    name: "global and local assign",
    input: "a: int = 5\nx: int = 1\ndef f(a: int) -> int:\n    b: int = 1\n    x=2\n    return a + b\nf(x)",
    output: ""
  },
  { // 10
    name: "lecture 8",
    input: 
    `
class Rat(object):
    n : int = 456
    d : int = 789
    def __init__(self : Rat):
        pass
    def new(self : Rat, n : int, d : int) -> Rat:
        self.n = n
        self.d = d
        return self
    def mul(self : Rat, other : Rat) -> Rat:
        return Rat().new(self.n * other.n, self.d * other.d)
        
class Pair(object):
    left : int = 0
    right : int = 0
    def __init__(self : Pair): 
        pass
    def new(self : Pair, l : int, r : int) -> Pair:
        self.left = l
        self.right = r
        return self
    def mul(self : Pair, other : Pair) -> int:
        return self.left * other.left + self.right * other.right

p : Pair = None
r1 : Rat = None
r2 : Rat = None
p = Pair().new(8, 9)
r1 = Rat().new(4, 5)
r2 = Rat()
r2.n = 3
r2.d = 2
print(r1.mul(r2).mul(r2).n)
print(p.mul(Pair().new(3, 2)))
    `,
    output: "" // method!!!!!
  },
  { // 11
    name: "lecture 7",
    input: 
    `
class Rat(object):
    n : int = 456
    d : int = 789
    def __init__(self : Rat):
        pass
    def new(self : Rat, n : int, d : int) -> Rat:
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
    `,
    output: ""
  },
  { // 12
    name: "easy",
    input: 
    `
class A(object):
    g : int = 0
    def __init__(self: A, g : int):
        self.g = g
    `,
    output: ""
  },
];
export const typeCheckCases: TestCase<string>[] = [
  { // 0
    name: "test id (undefined)",
    input: "x",
    output: "TYPE ERROR: not a variable x",
  },
  { // 1
    name: "test id (assign)",
    input: "x: int = 1\ny = x",
    output: "TYPE ERROR: not a variable y",
  },
  { // 2
    name: "assign error",
    input: "x: int = 1\ny: bool = True\nx=y\n",
    output: "TYPE ERROR: Expected type int; got type bool"
  }, 
  {//3
    name: "uniop (Minus) error",
    input: "x: bool = True\ny: int = 0\ny = -x",
    output: "TYPECHECK ERROR: uniary operator - expected int; got type bool",
  },
  {// 4
    name: "uniop (Not) error",
    input: "x: bool = True\ny: int = 0\nx = not y",
    output: "TYPECHECK ERROR: uniary operator not expected bool; got type int"
  },
  {// 5
    name: "binop (+) error",
    input: "x: bool = True\ny: bool = True\nx + y",
    output: "TYPECHECK ERROR: Cannot apply operator '+' on types 'bool' and type 'bool'"
  },
  {// 6
    name: "binop (-) error",
    input: "x: bool = True\ny: int = 0\nx - y",
    output: "TYPECHECK ERROR: Cannot apply operator '-' on types 'bool' and type 'int'"
  }, 
  { // 7
    name: "binop (*) error",
    input: "x: bool = True\ny: int = 0\nx * y",
    output: "TYPECHECK ERROR: Cannot apply operator '*' on types 'bool' and type 'int'"
 
  },
  { // 8
    name: "binop (//) error",
    input: "x: bool = True\ny: int = 0\nx // y",
    output: "TYPECHECK ERROR: Cannot apply operator '//' on types 'bool' and type 'int'"
 
  },
  { // 9
    name: "binop (%) error",
    input: "x: int = 0\ny: bool = True\nx % y",
    output: "TYPECHECK ERROR: Cannot apply operator '%' on types 'int' and type 'bool'"
  },
  { // 10
    name: "binop (>) error",
    input: "x: int = 0\ny: bool = True\nx > y",
    output: "TYPECHECK ERROR: Cannot apply operator '>' on types 'int' and type 'bool'"
  },
  { // 11
    name: "binop (==) error",
    input: "x: int = 0\ny: bool = True\nx == y",
    output: "TYPECHECK ERROR: Cannot apply operator '==' on types 'int' and type 'bool'"
  },
  { // 12
    name: "call (less args)",
    input: "a: int = 1\nb: int = 2\ndef f(x: int, y: int) -> int:\n    return x + y\nf(x)",
    output: "TYPECHECK ERROR: call func f; expected 2 arguments; got 1"
  },
  { // 13
    name: "call (more args)",
    input: "a: int = 1\nb: int = 2\ndef f(x: int) -> int:\n    return x\nf(x, y)",
    output: "TYPECHECK ERROR: call func f; expected 1 arguments; got 2"
  },
  { // 14
    name: "call (wrong argument type)",
    input: `a: int = 1
            b: bool = True
            def f(x:int, y: int) -> int:
              return x + y
            f(a, b)`,
    output: "TYPECHECK ERROR: call func f; expected type int; got type bool in parameters 1"
  },
  { // 15
    name: "if (cond not bool)",
    input: `if 1:
              pass`,
    output: `TYPECHECK ERROR: Condtion expression cannot be of type 'int'`
  }, 
  {// 16
    name: "elif (cond not bool)",
    input: 'if False:\n  pass\nelif 1:\n  pass',
    output: `TYPECHECK ERROR: Condtion expression cannot be of type 'int'`
  },
  {// 17
    name: "while (cond not bool)",
    input: 'while 1:\n  pass',
    output: `TYPECHECK ERROR: Condtion expression cannot be of type 'int'`
  }, 
  {// 18
    name: "check if + if (false)",
    input: `def func(a: int, b: int) -> int:
              if True:
                  return 1
              elif True:
                  pass
              else:
                  return 1
              if True:
                  pass
              elif True:
                  return 0
              else:
                  return 1`,
    output: `TYPECHECK ERROR: All paths in function/method must have a return statement: func`
  },
  {// 19
    name: "correct class",
    input:
    `
    class Rat(object):
        n : int = 456
        d : int = 789
        def __init__(self : Rat):
            pass
        def new(self : Rat, n : int, d : int) -> Rat:
            self.n = n
            self.d = d
            return self
        def mul(self : Rat, other : Rat) -> Rat:
            return Rat().new(self.n * other.n, self.d * other.d)
            
    class Pair(object):
        left : int = 0
        right : int = 0
        def __init__(self : Pair): 
            pass
        def new(self : Pair, l : int, r : int) -> Pair:
            self.left = l
            self.right = r
            return self
        def mul(self : Pair, other : Pair) -> int:
            return self.left * other.left + self.right * other.right
  
    p : Pair = None
    r1 : Rat = None
    r2 : Rat = None
    p = Pair().new(8, 9)
    r1 = Rat().new(4, 5)
    r2 = Rat()
    r2.n = 3
    r2.d = 2
    print(r1.mul(r2).mul(r2).n)
    print(p.mul(Pair().new(3, 2)))
    `,
    output: ``,
  },
  {// 20
    name: "incorrect method return type",
    input:
    `
    class Rat(object):
        def __init__(self : Rat):
            pass
        def new(self : Rat, n : int, d : int) -> int:
            return self
    `,
    output: `Error: TYPE ERROR: return expected type int; got type [object Object]`,
  },
  {// 21
    name: "incorrect assign type",
    input:
    `
    class Rat(object):
        def __init__(self : Rat):
            pass
    r1 : Rat = None
    r1 = 3
    `,
    output: `Error: TYPE ERROR: Expected type [object Object]; got type int`,
  },
  {// 22
    name: "easy",
    input:
    `
class C(object):
    x : int = 0
c : C = None
c = None
    `,
    output: `Error: TYPE ERROR: Expected type [object Object]; got type [object Object]`,
  }
]

export const typeCheckHasReturnCases: TestCase<Boolean>[] =  [
  {
    name: "check whether all paths has return",
    input: `def func() -> int:
              if True:
                  pass
              else:
                  pass
              if True:
                  return 0
              else:
                  return 1`,
    output: true
  }, 
  {
    name: "check while",
    input: `def func() -> int:
              while True:
                return 1`,
    output: false
  },
  {
    name: "check while + if (false)",
    input: `def func() -> int:
              while True:
                  return 1
              if True:
                  return 1
              else:
                  pass`,
    output: false
  },
  {
    name: "check while + if (true)",
    input: `def func() -> int:
              while True:
                  return 1
              if True:
                  return 1
              else:
                  return 0`,
    output: true
  }, 
  {
    name: "check while + if + erxpr (true)",
    input: `def func(a: int, b: int) -> int:
              while True:
                  return 1
              if True:
                  return 1
              else:
                  return 1
              a + b`,
    output: true
  },
  {
    name: "check if + if (true)",
    input: `def func(a: int, b: int) -> int:
              if True:
                  return 1
              elif True:
                  return 2
              else:
                  return 1
              if True:
                  pass
              elif True:
                  return 0
              else:
                  return 1`,
    output: true
  },
  {
    name: "check if + if (false)",
    input: `def func(a: int, b: int) -> int:
              if True:
                  return 1
              elif True:
                  pass
              else:
                  return 1
              if True:
                  pass
              elif True:
                  return 0
              else:
                  return 1`,
    output: false,
  }
]

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
