# PharmaChainRolesManuales modular: versión manual y OpenZeppelin

Separa la lógica farmacéutica compartida de las políticas de autorización.

## Archivos

- `contracts/core/GestionLotesYTransferencias.sol`: datos, eventos, registro, consulta y transferencias.
- `contracts/PharmaChainRolesManuales.sol`: implementación manual con enum y mapping, compatible con `asignarRol`.
- `contracts/PharmaChainRolesOpenZeppelin.sol`: implementación con AccessControl y Pausable.
- `test/PharmaChainRolesManuales.shared.test.js`: misma batería funcional para ambas versiones.
- `test/PharmaChainRolesManuales.roles.test.js`: diferencias de los modelos de permisos.

## Instalación

Copiar las carpetas `contracts` y `test` dentro del proyecto Hardhat existente. No sobrescribir otros tests sin revisarlos.

```bash
npm install @openzeppelin/contracts@^5
npx hardhat compile
npx hardhat test mocha test/PharmaChainRolesManuales.shared.test.js test/PharmaChainRolesManuales.roles.test.js
```

## Advertencias

- Esta es una implementación académica, no auditada.
- La versión OpenZeppelin permite varios roles por dirección; la manual solo uno.
- La pausa bloquea registro, propuesta y aceptación, pero **no** cancelación ni desactivación de emergencia.
- La lógica compartida comprueba los roles otra vez al aceptar, por lo que una revocación puede bloquear la aceptación.
- La administración manual es fija; AccessControl permite gestionar administradores, incluso renunciar a ellos. Proteger `DEFAULT_ADMIN_ROLE` en producción.
- Las dos versiones tienen la misma lógica farmacéutica por herencia; las pruebas no demuestran que los modelos de roles sean idénticos.
- Si se mantiene el contrato anterior con el mismo nombre `PharmaChainRolesManuales` en otra ruta, Hardhat puede requerir el nombre completamente cualificado o dar ambigüedad. Sustituir el archivo anterior, no duplicarlo.
