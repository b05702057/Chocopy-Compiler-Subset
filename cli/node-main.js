"use strict";
exports.__esModule = true;
var compiler_1 = require("./compiler");
var runner_1 = require("./runner");
// command to run:
// node node-main.js 987
var input = process.argv[2];
var result = (0, compiler_1.compile)(input);
console.log(result);
(0, runner_1.runwatsrc)(result.wasmSource, {}).then(function (value) {
    console.log(value);
});
