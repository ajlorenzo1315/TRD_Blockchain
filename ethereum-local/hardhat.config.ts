import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
    plugins: [hardhatToolboxViemPlugin],

    solidity: {
        profiles: {
            default: {
                compilers: [{ version: "0.4.25" }, { version: "0.8.20" }, { version: "0.8.34" }],
            },

            production: {
                compilers: [
                    {
                        version: "0.4.25",
                        settings: {
                            optimizer: {
                                enabled: true,
                                runs: 200,
                            },
                        },
                    },
                    {
                        version: "0.8.20",
                        settings: {
                            optimizer: {
                                enabled: true,
                                runs: 200,
                            },
                        },
                    },
                    {
                        version: "0.8.34",
                        settings: {
                            optimizer: {
                                enabled: true,
                                runs: 200,
                            },
                        },
                    },
                ],
            },
        },
    },

    networks: {
        hardhatMainnet: {
            type: "edr-simulated",
            chainType: "l1",
        },

        hardhatOp: {
            type: "edr-simulated",
            chainType: "op",
        },

        localhost: {
            type: "http",
            chainType: "l1",
            url: "http://127.0.0.1:8545",
        },

        sepolia: {
            type: "http",
            chainType: "l1",
            url: configVariable("SEPOLIA_RPC_URL"),
            accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
        },
    },
});
