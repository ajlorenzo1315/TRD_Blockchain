pragma solidity ^0.4.25;

// LECCION 2 - CAPITULO 5: Herencia
// Importa Lesson4ZombieHelper y, mediante herencia,
// toda la funcionalidad de las lecciones anteriores.
import "./L4zombiehelper.sol";

// LECCION 4: Sistema de combate
// Este es el contrato principal que se despliega.
contract Lesson4ZombieAttack is Lesson4ZombieHelper {

    // LECCION 4 - CAPITULO 3: Numeros aleatorios
    // Contador que cambia cada vez que se
    // solicita un resultado pseudoaleatorio.
    uint randNonce = 0;

    // LECCION 4: Probabilidad de victoria
    // Umbral utilizado para decidir el combate.
    uint attackVictoryProbability = 70;

    // LECCION 4 - CAPITULO 3: Numeros aleatorios
    // Genera un entero entre 0 y _modulus - 1.
    //
    // internal permite utilizarlo dentro
    // de los contratos derivados.
    //
    // No utiliza view porque modifica randNonce.
    function randMod(uint _modulus) internal returns(uint) {

        // Incrementa el contador.
        randNonce++;

        // LECCION 1: keccak256 y abi.encodePacked
        //
        // now: timestamp del bloque.
        // msg.sender: direccion del remitente.
        // randNonce: contador de llamadas.
        //
        // keccak256 produce un hash.
        // uint convierte el hash en entero.
        // % limita el resultado al rango deseado.
        //
        // IMPORTANTE:
        // No es aleatoriedad criptograficamente segura.
        return uint(
            keccak256(
                abi.encodePacked(now, msg.sender, randNonce)
            )
        ) % _modulus;
    }

    // LECCION 4: Funcion attack
    // Ejecuta un combate entre dos zombis.
    //
    // _zombieId: zombi atacante.
    // _targetId: zombi objetivo.
    //
    // ownerOf exige que el remitente sea
    // propietario del atacante.
    function attack(
        uint _zombieId,
        uint _targetId
    ) external ownerOf(_zombieId) {

        // LECCION 1: Structs
        // storage permite modificar directamente
        // los zombis almacenados en la blockchain.
        Zombie storage myZombie = zombies[_zombieId];

        Zombie storage enemyZombie = zombies[_targetId];

        // LECCION 4 - CAPITULO 3: Aleatoriedad
        // Obtiene un valor entre 0 y 99.
        uint rand = randMod(100);

        // LECCION 4: Condiciones de combate
        //
        // Si rand es menor o igual al umbral,
        // el atacante gana.
        //
        // Como rand puede valer de 0 a 99,
        // <= 70 incluye 71 resultados posibles.
        if (rand <= attackVictoryProbability) {

            // LECCION 4: Estadisticas
            // Registra una victoria del atacante.
            myZombie.winCount++;

            // LECCION 3: Niveles
            // Una victoria incrementa el nivel.
            myZombie.level++;

            // Registra una derrota del enemigo.
            enemyZombie.lossCount++;

            // LECCION 2: Reproduccion
            // El atacante utiliza el ADN del rival
            // para intentar crear un descendiente.
            //
            // LECCION 4: Cooldown
            // feedAndMultiply comprueba que
            // el atacante este preparado.
            //
            // Si no lo esta, revierte toda
            // la transaccion, incluidas las
            // estadisticas incrementadas.
            feedAndMultiply(_zombieId, enemyZombie.dna, "zombie");

        } else {

            // LECCION 4: Derrota
            // Incrementa las derrotas del atacante.
            myZombie.lossCount++;

            // Incrementa las victorias del enemigo.
            enemyZombie.winCount++;

            // LECCION 4: Cooldown
            // Reinicia el tiempo de espera
            // despues de perder el combate.
            _triggerCooldown(myZombie);
        }
    }
}
