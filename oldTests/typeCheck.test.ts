import { assert, expect } from 'chai';
import {parse, stringifyTree} from '../parser';
import { setupEnv, typeCheckHasReturn, typeCheckProgram } from '../typecheck';
import { typeCheckCases, typeCheckHasReturnCases } from './cases.test';


describe('typy check error', () => {
    for(let idx = 0; idx < typeCheckCases.length; ++idx) {
        
        it(typeCheckCases[idx].name, () => {
            const t = typeCheckCases[idx];
            const program = parse(t.input);
            assert.throws(function() { typeCheckProgram(program) }, Error, t.output);

            console.log("fuck")
            console.log(program)
            console.log(t.output)
        });
      }
    
  });

describe('typy check has Return statement', () => {
    for(let idx = 0; idx < typeCheckHasReturnCases.length; ++idx) {
        
        it(typeCheckHasReturnCases[idx].name, () => {
            const t = typeCheckHasReturnCases[idx];
            const program = parse(t.input);
            console.log(program.funcDefs[0])
            const env = setupEnv(program);
            expect(typeCheckHasReturn(program.funcDefs[0].stmts, env)).to.deep.equal(t.output);
        });
      }
    
  });