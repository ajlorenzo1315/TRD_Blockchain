// LECCION 6 - Reutilizado de la lección 5: aritmética segura
// Este archivo conserva las instrucciones Solidity del material proporcionado.
// Solo se renombran contratos, bibliotecas, interfaces e imports para evitar colisiones.
// En la leccion 6 la novedad principal es el frontend Web3.js; no un contrato nuevo.

pragma solidity ^0.4.25;

/**
 * @title Lesson6SafeMath
 * @dev Math operations with safety checks that throw on error
 */

// LECCION 6 - Arquitectura: componente desplegable o heredado por el contrato final.
library Lesson6SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

/**
 * @title Lesson6SafeMath32
 * @dev Lesson6SafeMath library implemented for uint32
 */

// LECCION 6 - Arquitectura: componente desplegable o heredado por el contrato final.
library Lesson6SafeMath32 {

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function mul(uint32 a, uint32 b) internal pure returns (uint32) {
    if (a == 0) {
      return 0;
    }
    uint32 c = a * b;
    assert(c / a == b);
    return c;
  }

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function div(uint32 a, uint32 b) internal pure returns (uint32) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint32 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function sub(uint32 a, uint32 b) internal pure returns (uint32) {
    assert(b <= a);
    return a - b;
  }

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function add(uint32 a, uint32 b) internal pure returns (uint32) {
    uint32 c = a + b;
    assert(c >= a);
    return c;
  }
}

/**
 * @title Lesson6SafeMath16
 * @dev Lesson6SafeMath library implemented for uint16
 */

// LECCION 6 - Arquitectura: componente desplegable o heredado por el contrato final.
library Lesson6SafeMath16 {

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function mul(uint16 a, uint16 b) internal pure returns (uint16) {
    if (a == 0) {
      return 0;
    }
    uint16 c = a * b;
    assert(c / a == b);
    return c;
  }

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function div(uint16 a, uint16 b) internal pure returns (uint16) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint16 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function sub(uint16 a, uint16 b) internal pure returns (uint16) {
    assert(b <= a);
    return a - b;
  }

  // LECCION 6 - funcion heredada de lecciones anteriores; el frontend la invoca por ABI.
  function add(uint16 a, uint16 b) internal pure returns (uint16) {
    uint16 c = a + b;
    assert(c >= a);
    return c;
  }
}
