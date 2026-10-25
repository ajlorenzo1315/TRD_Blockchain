
pragma solidity ^0.4.25;

// ============================================================
// LECCIÓN 1 - CAPÍTULO 2: CONTRATOS
// ============================================================
// Se aprende a declarar un contrato inteligente en Solidity.
// ZombieFactory será el contrato que almacenará y creará zombis.

contract ZombieFactory {

    // ========================================================
    // CAPÍTULO 13: EVENTOS
    // ========================================================
    // Se incorpora un evento para informar de la creación
    // de un nuevo zombi.
    //
    // zombieId: identificador del zombi.
    // name: nombre del zombi.
    // dna: código genético del zombi.
    //
    // Los eventos quedan registrados en los logs de la
    // transacción y pueden ser consultados por aplicaciones.

    event NewZombie(uint zombieId, string name, uint dna);


    // ========================================================
    // CAPÍTULO 3: VARIABLES DE ESTADO Y ENTEROS
    // ========================================================
    // uint representa un entero sin signo de 256 bits.
    //
    // dnaDigits establece el número máximo de dígitos
    // decimales utilizados para representar el ADN.

    uint dnaDigits = 16;


    // ========================================================
    // CAPÍTULO 4: OPERACIONES MATEMÁTICAS
    // ========================================================
    // El operador ** representa la exponenciación.
    //
    // 10 ** 16 = 10000000000000000
    //
    // Este valor permitirá limitar el ADN mediante módulo.

    uint dnaModulus = 10 ** dnaDigits;


    // ========================================================
    // CAPÍTULO 5: ESTRUCTURAS
    // ========================================================
    // Una estructura permite agrupar distintos atributos.
    //
    // Cada zombi tendrá:
    // - name: nombre almacenado como string.
    // - dna: código genético almacenado como uint.

    struct Zombie {
        string name;
        uint dna;
    }


    // ========================================================
    // CAPÍTULO 6: ARRAYS
    // ========================================================
    // Se declara un array dinámico de estructuras Zombie.
    //
    // [] indica que no tiene un tamaño fijo.
    // public genera automáticamente una función de lectura.
    //
    // Los zombis creados se almacenarán aquí.

    Zombie[] public zombies;


    // ========================================================
    // CAPÍTULO 7: DECLARACIÓN DE FUNCIONES
    // CAPÍTULO 8: ESTRUCTURAS Y ARRAYS
    // CAPÍTULO 9: FUNCIONES PRIVADAS Y PÚBLICAS
    // CAPÍTULO 13: EVENTOS
    // ========================================================
    //
    // Capítulo 7:
    // Se aprende a declarar una función con parámetros.
    //
    // Capítulo 8:
    // Se utiliza push() para introducir un Zombie en el array.
    //
    // Capítulo 9:
    // Se cambia createZombie por _createZombie y se establece
    // private para impedir llamadas externas directas.
    //
    // Capítulo 13:
    // Se obtiene el ID del zombi y se emite NewZombie.

    function _createZombie(string _name, uint _dna) private {

        // Crea una estructura Zombie con nombre y ADN.
        // push() la introduce al final del array.
        //
        // En Solidity 0.4.25, push() devuelve la nueva
        // longitud del array.
        //
        // Restamos 1 porque los índices comienzan en 0.

        uint id = zombies.push(Zombie(_name, _dna)) - 1;

        // Emite el evento indicando que se ha creado
        // un zombi con su ID, nombre y ADN.

        emit NewZombie(id, _name, _dna);
    }


    // ========================================================
    // CAPÍTULO 10: FUNCIONES Y VALORES DE RETORNO
    // CAPÍTULO 11: KECCAK256 Y CONVERSIÓN DE TIPOS
    // ========================================================
    //
    // Capítulo 10:
    // Se introduce una función que devuelve un uint.
    //
    // private: solo puede llamarse dentro del contrato.
    // view: no modifica el estado de la blockchain.
    // returns(uint): devuelve un entero sin signo.
    //
    // Capítulo 11:
    // Se utiliza keccak256 para calcular un hash.
    // Después se convierte el resultado a uint.

    function _generateRandomDna(string _str)
        private
        view
        returns (uint)
    {

        // abi.encodePacked convierte el texto en bytes.
        // keccak256 calcula un hash de 256 bits.
        // uint convierte el hash en un número entero.
        //
        // El resultado es determinista: un mismo nombre
        // siempre genera el mismo hash.

        uint rand = uint(keccak256(abi.encodePacked(_str)));

        // El operador % calcula el resto de una división.
        //
        // Limita el ADN al intervalo:
        // 0 <= ADN < 10^16
        //
        // Así el ADN tendrá como máximo 16 dígitos.

        return rand % dnaModulus;
    }


    // ========================================================
    // CAPÍTULO 12: INTEGRANDO TODOS LOS CONCEPTOS
    // ========================================================
    //
    // Se crea una función pública que permite a un usuario
    // generar un zombi indicando únicamente su nombre.
    //
    // La función:
    // 1. Recibe el nombre.
    // 2. Calcula el ADN.
    // 3. Crea y almacena el zombi.
    // 4. Provoca la emisión del evento NewZombie.

    function createRandomZombie(string _name) public {

        // Genera el ADN a partir del nombre recibido.

        uint randDna = _generateRandomDna(_name);

        // Llama a la función privada que almacena el zombi.

        _createZombie(_name, randDna);
    }

}