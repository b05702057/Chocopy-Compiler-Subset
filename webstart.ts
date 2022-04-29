import {compile} from './compiler';

import {run} from './runner';
document.addEventListener("DOMContentLoaded", async () => {
  function display(arg : string) {
    const elt = document.createElement("pre");
    document.getElementById("output").appendChild(elt);
    elt.innerText = arg;
  }
  let memory = new WebAssembly.Memory({initial:10, maximum:100});
  var importObject = {
    imports: {
      print_num: (arg : any) => {
        console.log("Logging from WASM: ", arg);
        display(String(arg));
        return arg;
      },
      print_bool: (arg : any) => {
        if(arg === 0) { display("False"); }
        else { display("True"); }
        return arg;
      },
      print_none: (arg: any) => {
        display("None");
        return arg;
      },
      print: (arg : any) => {
        console.log("Logging from WASM: ", arg);
        const elt = document.createElement("pre");
        document.getElementById("output").appendChild(elt);
        // elt.innerText = arg;
        return arg;
      },
      mem: memory,
      abs: Math.abs,
      max: Math.max,
      min: Math.min,
      pow: Math.pow
    },
  };
  const runButton = document.getElementById("run");
  const userCode = document.getElementById("user-code") as HTMLTextAreaElement;
  
  runButton.addEventListener("click", async () => {
    
    const program = userCode.value;
    const output = document.getElementById("output");
    output.textContent = "";
    console.log(`program: ${program}`)
    try {
      // print the WASM code
      const wat = compile(program);
      const code = document.getElementById("generated-code");
      code.textContent = wat.wasmSource;
      document.getElementById("")

      const result = await run(program, {importObject});
      // obj => {
      var i32 = new Uint32Array(memory.buffer);
      for (var i = 0; i < 10; i++) {
        console.log(`i32[${i}]: ${i32[i]}`);
      }
      if (result !== undefined) {
        output.textContent += String(result);
      }
      
      output.setAttribute("style", "color: black");
    }
    catch(e) {
      console.error(e)
      output.textContent = String(e);
      output.setAttribute("style", "color: red");
    }
  });

  userCode.value = localStorage.getItem("program");
  userCode.addEventListener("keypress", async() => {
    localStorage.setItem("program", userCode.value);
  });
});