import { parse } from "../parser";
import {runwatsrc} from '../runner';
import { typeCheckProgram } from "../typecheck";
import { importObject } from "./import-object.test";

// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string) : Type {
  throw Error(`check if typeCheck is called correctly ${source}`);
  // const program = typeCheckProgram(parse(source));
  // if (program.stmts.length === 0) {
  //   return "none";
  // }
  // const lastStatement = program.stmts[program.stmts.length - 1];
  // if (lastStatement.tag == "expr") {
  //   if (lastStatement.expr.a === "None") {
  //     return "none";
  //   }
  //   // convert the type for testing
  //   return lastStatement.expr.a;
  // }
  // return "none";
}

// Modify run to use `importObject` (imported above) to use for printing
// You can modify `importObject` to have any new fields you need here, or
// within another function in your compiler, for example if you need other
// JavaScript-side helpers
export async function run(source: string) {
  throw Error(`check if run is called correctly ${source}`);
  // Create the memory and add it to impots
  var memory = new WebAssembly.Memory({initial:10, maximum:100});
  (importObject.imports as any).mem = memory
  const result = await runwatsrc(source, {importObject});
  return result;
}

type Type =
  | "int"
  | "bool"
  | "none"
  | { tag: "object", class: string }

// Note that we have changed the "none" here to "None"
export const NUM : Type = "int";
export const BOOL : Type = "bool";
export const NONE : Type = "none";
export function CLASS(name : string) : Type { 
  return { tag: "object", class: name }
};
