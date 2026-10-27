import { ethers } from "ethers";

export const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:8545"
);

export async function obtenerCuentas() {
  return provider.send("eth_accounts", []);
}

export async function seleccionarCuenta(direccion) {
  const signer = await provider.getSigner(direccion);
  return signer;
}

export async function obtenerContrato(direccion, abi, cuenta) {
  const signer = await seleccionarCuenta(cuenta);

  return new ethers.Contract(direccion, abi, signer);
}