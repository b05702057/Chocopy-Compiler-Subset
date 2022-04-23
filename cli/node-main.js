"use strict";
exports.__esModule = true;
var compiler_1 = require("./compiler");
var runner_1 = require("./runner");
// command to run:
// node node-main.js 987
var input = process.argv[2];
var result = compiler_1.compile(input);
console.log(result);
runner_1.run(result.wasmSource, {}).then(function (value) {
    console.log(value);
});
