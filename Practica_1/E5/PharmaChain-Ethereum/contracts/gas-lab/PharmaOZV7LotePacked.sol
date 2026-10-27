// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {GestionV7LotePacked} from "./GestionV7LotePacked.sol";

// Versión con controles de seguridad de OpenZeppelin.
contract PharmaOZV7LotePacked is
    GestionV7LotePacked,
    AccessControl,
    Pausable
{
    bytes32 public constant LABORATORIO_ROLE = keccak256("LABORATORIO_ROLE");
    bytes32 public constant DISTRIBUIDOR_ROLE = keccak256("DISTRIBUIDOR_ROLE");
    bytes32 public constant FARMACIA_ROLE = keccak256("FARMACIA_ROLE");

    // Dirección que desplegó el contrato; la autorización real usa DEFAULT_ADMIN_ROLE.
    address public immutable administrador;

    constructor() {
        administrador = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function pausar() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    function reanudar() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _esLaboratorio(address usuario) internal view override returns (bool) {
        return hasRole(LABORATORIO_ROLE, usuario);
    }

    function _esAdministrador(address usuario) internal view override returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, usuario);
    }

    function _transicionValida(
        address origen,
        address destino
    ) internal view override returns (bool) {
        if (hasRole(LABORATORIO_ROLE, origen)) return hasRole(DISTRIBUIDOR_ROLE, destino);
        if (hasRole(DISTRIBUIDOR_ROLE, origen)) return hasRole(FARMACIA_ROLE, destino);
        return false;
    }

    function _comprobarActivo() internal view override {
        _requireNotPaused();
    }
}
