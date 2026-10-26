pragma solidity ^0.4.25;

/**
 * @title Lesson5SafeMath
 * @dev Math operations with safety checks that throw on error
 */
// LECCION 5 - CAPITULOS 9-10: biblioteca para uint256; evita overflows y underflows en Solidity 0.4.25.
library Lesson5SafeMath {
    /** @dev Multiplies two numbers, throws on overflow. */
    // LECCION 5 - CAPITULO 9: multiplica y verifica que no hubo overflow usando division inversa.
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }
    /** @dev Integer division of two numbers, truncating the quotient. */
    // LECCION 5 - CAPITULO 9: division entera; Solidity revierte si el divisor es cero.
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }
    /** @dev Subtracts two numbers, throws on overflow. */
    // LECCION 5 - CAPITULO 9: assert(b <= a) impide resultados negativos en enteros sin signo.
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }
    /** @dev Adds two numbers, throws on overflow. */
    // LECCION 5 - CAPITULO 9: assert(c >= a) detecta el desbordamiento de suma.
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}

/** @title Lesson5SafeMath32 @dev Lesson5SafeMath library implemented for uint32 */
// LECCION 5 - CAPITULO 11: mismas comprobaciones adaptadas a contadores uint32, como level.
library Lesson5SafeMath32 {
    // LECCION 5 - CAPITULO 9: multiplica y verifica que no hubo overflow usando division inversa.
    function mul(uint32 a, uint32 b) internal pure returns (uint32) {
        if (a == 0) {
            return 0;
        }
        uint32 c = a * b;
        assert(c / a == b);
        return c;
    }
    // LECCION 5 - CAPITULO 9: division entera; Solidity revierte si el divisor es cero.
    function div(uint32 a, uint32 b) internal pure returns (uint32) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint32 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }
    // LECCION 5 - CAPITULO 9: assert(b <= a) impide resultados negativos en enteros sin signo.
    function sub(uint32 a, uint32 b) internal pure returns (uint32) {
        assert(b <= a);
        return a - b;
    }
    // LECCION 5 - CAPITULO 9: assert(c >= a) detecta el desbordamiento de suma.
    function add(uint32 a, uint32 b) internal pure returns (uint32) {
        uint32 c = a + b;
        assert(c >= a);
        return c;
    }
}

/** @title Lesson5SafeMath16 @dev Lesson5SafeMath library implemented for uint16 */
// LECCION 5 - CAPITULO 11: operaciones protegidas para winCount y lossCount, que son uint16.
library Lesson5SafeMath16 {
    // LECCION 5 - CAPITULO 9: multiplica y verifica que no hubo overflow usando division inversa.
    function mul(uint16 a, uint16 b) internal pure returns (uint16) {
        if (a == 0) {
            return 0;
        }
        uint16 c = a * b;
        assert(c / a == b);
        return c;
    }
    // LECCION 5 - CAPITULO 9: division entera; Solidity revierte si el divisor es cero.
    function div(uint16 a, uint16 b) internal pure returns (uint16) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint16 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }
    // LECCION 5 - CAPITULO 9: assert(b <= a) impide resultados negativos en enteros sin signo.
    function sub(uint16 a, uint16 b) internal pure returns (uint16) {
        assert(b <= a);
        return a - b;
    }
    // LECCION 5 - CAPITULO 9: assert(c >= a) detecta el desbordamiento de suma.
    function add(uint16 a, uint16 b) internal pure returns (uint16) {
        uint16 c = a + b;
        assert(c >= a);
        return c;
    }
}
