import { ethers } from "ethers";
import { ABI, DIRECCION_CONTRATO, CHAIN_ID } from "./config";

export async function conectarContrato() {
    if (!window.ethereum) {
        throw new Error("Instala MetaMask para continuar");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    const red = await provider.getNetwork();

    if (red.chainId !== CHAIN_ID) {
        throw new Error("Selecciona la red Hardhat Local (31337)");
    }

    if (!ethers.isAddress(DIRECCION_CONTRATO)) {
        throw new Error("Configura la direccion del contrato");
    }

    const codigo = await provider.getCode(DIRECCION_CONTRATO);

    if (codigo === "0x") {
        throw new Error("No existe un contrato en esa direccion");
    }

    const signer = await provider.getSigner();

    const contrato = new ethers.Contract(DIRECCION_CONTRATO, ABI, signer);

    return {
        contrato,
        cuenta: await signer.getAddress(),
    };
}
