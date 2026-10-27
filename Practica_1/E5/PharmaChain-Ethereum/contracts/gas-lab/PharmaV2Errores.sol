// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GestionV2Errores} from "./GestionV2Errores.sol";

// Versión didáctica: permisos programados manualmente.
contract PharmaV2Errores is GestionV2Errores {
    error ContratoPausado();
    error DireccionInvalida();
    error AdministradorConRol();
    error YaPausado();
    error NoPausado();
    error NoAdministrador();

    address public immutable administrador;
    bool public paused;

    enum Rol {
        Ninguno,
        Laboratorio,
        Distribuidor,
        Farmacia
    }
    mapping(address => Rol) public roles;

    event RolAsignado(address indexed usuario, Rol rol);
    event Paused(address indexed usuario);
    event Unpaused(address indexed usuario);

    constructor() {
        administrador = msg.sender;
    }

    modifier soloAdministrador() {
        if (!(msg.sender == administrador)) revert NoAdministrador();
        _;
    }

    // El administrador asigna un único rol por dirección.
    function asignarRol(address usuario, Rol rol) external soloAdministrador {
        if (!(usuario != address(0))) revert DireccionInvalida();
        if (!(usuario != administrador)) revert AdministradorConRol();
        roles[usuario] = rol;
        emit RolAsignado(usuario, rol);
    }

    function pausar() external soloAdministrador {
        if (!(!paused)) revert YaPausado();
        paused = true;
        emit Paused(msg.sender);
    }

    function reanudar() external soloAdministrador {
        if (!(paused)) revert NoPausado();
        paused = false;
        emit Unpaused(msg.sender);
    }

    function _esLaboratorio(address usuario) internal view override returns (bool) {
        return roles[usuario] == Rol.Laboratorio;
    }

    function _esAdministrador(address usuario) internal view override returns (bool) {
        return usuario == administrador;
    }

    function _transicionValida(
        address origen,
        address destino
    ) internal view override returns (bool) {
        return
            (roles[origen] == Rol.Laboratorio && roles[destino] == Rol.Distribuidor) ||
            (roles[origen] == Rol.Distribuidor && roles[destino] == Rol.Farmacia);
    }

    function _comprobarActivo() internal view override {
        if (!(!paused)) revert ContratoPausado();
    }
}
