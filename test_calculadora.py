from calculadora import sumar, multiplicar

resultado_suma = sumar(2, 3)
resultado_multiplicacion = multiplicar(2, 3)

print(f"sumar(2, 3) = {resultado_suma}")
print(f"multiplicar(2, 3) = {resultado_multiplicacion}")

assert resultado_suma == 5
assert resultado_multiplicacion == 6
