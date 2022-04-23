PA1 answer:

Question 1: Give three examples of Python programs that use 
            binary operators and/or builtins from this PA, 
            but have different behavior than your compiler.

1.  I think for the binary operators implemented in this PA (+, -, *). 
    They are only performed on the i32 data. However, for the python 
    binary operators, they can be applied to other data type such as float. 
    To solve this issue, we can have a piece of code to decide the input
    number type (float, int) and use the corresponding operations.

2.  For the builtins, currently, they are also only implemented for i32.
    However, in Python, they can be applied to other data type. The solution
    might be that we convert all the input number into float and use the f64 
    to do the operation and cast the computed number back to the original type
    before returning

3.  For the pow operation, in this assignment, we only implement pow(x, y).
    However, in Python, the pow operation takes three arguments (x, y, x). 
    With the given z, it computes (x^y)%z. We can also have a function that 
    try to generate extra code (WASM in string format) to do the mod.

Question 2: What resources did you find most helpful in completing the assignment?
For simply completing the assignment, the tutorial is the most helpful one. 

Questoin 3: Who (if anyone) in the class did you work with on the assignment? (See collaboration below)
I work on this project alone with the help of the TA's tutorial