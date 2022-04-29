import * as mocha from 'mocha';
import {expect} from 'chai';
import { parser } from 'lezer-python';
import { traverseExpr, traverseStmt, parse, isFuncDef, isVarInit, node2type, traverseVarInit, traverseFuncDef} from '../parser';
import {BinOp, Expr, Stmt} from "../ast";
import {TestCase, binopTestCases, callTestCases, funcTestCasese, initTestCases, returnTestCases, uniopTestCases, whileTestCases, ifTestCases, programTestCases} from './cases.test'



// the ground truth result for "1 + 2"
function getExpr1GT() : Object {
  return {
    tag: 'expr',
    expr: {
      tag: 'binexpr',
      op: 'Plus',
      left: { tag: 'num', value: 1 },
      right: { tag: 'num', value: 2 }
    }
  };
};


// the ground truth result for "x = 2"
function getAssignment1GT() : Object {
  return { tag: 'assign', 
           name: 'x', 
           value: { tag: 'num', 
                    value: {
                      literal: {
                        tag: "num",
                        value: 2
                      }} 
                  } 
          };
};

// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
describe('traverseExpr(c, s) function', () => {
  it('parses a number in the beginning', () => {
    const source = "987";
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);
    
    // Note: we have to use deep equality when comparing objects
    expect(parsedExpr).to.deep.equal({tag: "literal", 
                                      literal: {
                                        tag: "num",
                                        value: 987
                                      },
                                    });
  })

});

describe('traverseStmt(c, s) function', () => {
  // TODO: add tests here to ensure traverseStmt works as expected
});

describe('parse(source) function', () => {

});

// test cases for parser of pa2
describe('test is functions', () => {
  it('test isFuncDef (true)', () => {
    const cursor = parser.parse(funcTestCasese[0].input).cursor();
    cursor.firstChild();
    expect(isFuncDef(cursor)).to.deep.equal(true);
    
  })

  it('test isFuncDef (false)', () => {
    const cursor = parser.parse(initTestCases[0].input).cursor();
    cursor.firstChild();
    expect(isFuncDef(cursor)).to.deep.equal(false);
    
  })

  it('test isVarInit (true)', () => {
    const cursor = parser.parse(initTestCases[0].input).cursor();
    cursor.firstChild();
    expect(isVarInit(cursor)).to.deep.equal(true);
  })

  it('test isVarInit (false)', () => {
    const cursor = parser.parse("x = 2").cursor();
    cursor.firstChild();
    expect(isVarInit(cursor)).to.deep.equal(false);
  })
});

describe('traverseVarInit', () => {
  it('traverseVarInit(int)', () => {
    const s = initTestCases[0].input
    const cursor = parser.parse(s).cursor();
    cursor.firstChild();
    expect(traverseVarInit(cursor, s)).to.deep.equal(initTestCases[0].output);
    
  })

  it('traverseVarInit(bool)', () => {
    const s1 = initTestCases[1].input
    const c1 = parser.parse(s1).cursor();
    c1.firstChild();
    expect(traverseVarInit(c1, s1)).to.deep.equal(initTestCases[1].output);
    
    const s2 = initTestCases[2].input;
    const c2 = parser.parse(s2).cursor();
    c2.firstChild();
    expect(traverseVarInit(c2, s2)).to.deep.equal(initTestCases[2].output);

  })

  it('traverseVarInit(None)', () => {
    const s = initTestCases[3].input;
    const cursor = parser.parse(s).cursor();
    cursor.firstChild();
    expect(traverseVarInit(cursor, s)).to.deep.equal(initTestCases[3].output);
  })

});

describe('test return stmt', () => {

  for (let idx = 0; idx < returnTestCases.length; ++idx) {
    it(returnTestCases[idx].name, () => {
      const s = returnTestCases[idx].input;
      const cursor = parser.parse(s).cursor();
      cursor.firstChild();
      expect(traverseStmt(cursor, s)).to.deep.equal(returnTestCases[idx].output);
      
    })
  }
  
});

describe('test pass stmt', () => {

  it("simple pass", () => {
      const s = "pass";
      const cursor = parser.parse(s).cursor();
      cursor.firstChild();
      expect(traverseStmt(cursor, s)).to.deep.equal({tag: "pass"});
      
  })
  
});

describe('test function call', () => {
  runTestCasesExpr(callTestCases);
  
});

describe('test union operation', () => {

  runTestCasesExpr(uniopTestCases);
  
});

describe('test binary operation', () => {

  runTestCasesExpr(binopTestCases);
  
});


describe('test while loop', () => {

  runTestCasesStmt(whileTestCases);
  
});

describe('test if loop', () => {

  runTestCasesStmt(ifTestCases);
  
});

describe('test func def', () => {

  for(let idx = 0; idx < funcTestCasese.length; ++idx) {
    it(funcTestCasese[idx].name, () => {
      const s = funcTestCasese[idx].input;
      const c = parser.parse(s).cursor();
      c.firstChild();
      c.firstChild();
      expect(traverseFuncDef(c, s)).to.deep.equal(funcTestCasese[idx].output);
    });
  }
   
});

describe('test program', () => {

  for(let idx = 0; idx < programTestCases.length; ++idx) {
    it(programTestCases[idx].name, () => {
      expect(parse(programTestCases[idx].input)).to.deep.equal(programTestCases[idx].output);
    });
  }
   
});

function runTestCasesExpr(testCases: TestCase<Object>[]) {
  for(let idx = 0; idx < testCases.length; ++idx) {
    it(testCases[idx].name, () => {
      const s = testCases[idx].input;
      const c = parser.parse(s).cursor();
      c.firstChild();
      c.firstChild();
      expect(traverseExpr(c, s)).to.deep.equal(testCases[idx].output);
    });
  }
}

function runTestCasesStmt(testCases: TestCase<Object>[]) {
  for(let idx = 0; idx < testCases.length; ++idx) {
    it(testCases[idx].name, () => {
      const s = testCases[idx].input;
      const c = parser.parse(s).cursor();
      c.firstChild();
      expect(traverseStmt(c, s)).to.deep.equal(testCases[idx].output);
    });
  }
}


