def f1():
    print("Running f1")
    f2()

def f2():
    print("Running f2")
    f1()

f1()
