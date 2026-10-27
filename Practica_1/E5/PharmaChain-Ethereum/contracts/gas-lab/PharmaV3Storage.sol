// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GestionV3Storage} from "./GestionV3Storage.sol";

// Versión didáctica: permisos programados manualmente.
contract PharmaV3Storage is GestionV3Storage {
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
        require(msg.sender == administrador, "No eres el administrador");
        _;
    }

    // El administrador asigna un único rol por dirección.
    function asignarRol(address usuario, Rol rol) external soloAdministrador {
        require(usuario != address(0), "Direccion invalida");
        require(usuario != administrador, "El administrador no puede tener rol");
        roles[usuario] = rol;
        emit RolAsignado(usuario, rol);
    }

    function pausar() external soloAdministrador {
        require(!paused, "Ya pausado");
        paused = true;
        emit Paused(msg.sender);
    }

    function reanudar() external soloAdministrador {
        require(paused, "No esta pausado");
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
        require(!paused, "Contrato pausado");
    }
}
