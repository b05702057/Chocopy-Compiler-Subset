import { parse } from "../parser";
import {runwatsrc} from '../runner';
import { typeCheckProgram } from "../typecheck";
import { importObject } from "./import-object.test";
import { Type } from '../ast';

// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string) : Type {
  const program = typeCheckProgram(parse(source));
  if (program.stmts.length === 0) {
    return "None";
  }
  const lastStatement = program.stmts[program.stmts.length - 1];
  if (lastStatement.tag == "expr") {
    return lastStatement.expr.a;
  }
  return "None";
}

// Modify run to use `importObject` (imported above) to use for printing
// You can modify `importObject` to have any new fields you need here, or
// within another function in your compiler, for example if you need other
// JavaScript-side helpers
export async function run(source: string) {
  // Create the memory and add it to impots
  var memory = new WebAssembly.Memory({initial:10, maximum:100});
  (importObject.imports as any).mem = memory
  const result = await runwatsrc(source, {importObject});
  return result;
}

// type Type =
//   | "int"
//   | "bool"
//   | "none"
//   | { tag: "object", class: string }

// Note that we have changed the "none" here to "None"
export const NUM : Type = "int";
export const BOOL : Type = "bool";
export const NONE : Type = "None";
export function CLASS(name : string) : Type { 
  return { tag: "object", class: name }
};
