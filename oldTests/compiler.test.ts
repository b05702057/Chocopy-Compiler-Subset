import { expect } from 'chai';
import { compile, createEmptyGlobalEnv, GlobalEnv } from '../compiler';
import { compiledTestCases, funcTestCasese } from './cases.test';


describe('test compiled functions', () => {
  for(let idx = 0; idx < compiledTestCases.length; ++idx) {
    const t = compiledTestCases[idx];
    it(t.name, () => {
      expect(compile(t.input).wasmSource).to.deep.equal(t.output);
    })
  }
  
});
