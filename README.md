# CSE231-Spring2022-pa2
I provide the following command to run this program.

1. To test the program
    ```
    bash run_test.sh
    ```
    This script will test the code with the testing cases in ```./tests``` and remove the compiled *.js file automatically after testing.
    
2. To run the code in user-interface
    ```
    bash run_build_web.sh
    ```
    This script will generate and store the index.html in the ```build``` directory.

3. To run the program with command line
    ```
    bash run_build_cli.sh
    ```
    This script will generate the *.js files and store them in the ```cli ``` directory. You can then use the command below to execute the program.
    ```
    node cli/node-main.js <code>
    ```
    However, this is highly not recommended because putting codes in a line of string will cause a lot of trouble and errors. Life is beautiful and short. There is a better way (method 2) to run the program. Thus, please do not give yourself a hard time.


    # PA3
