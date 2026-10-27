module.exports = {
 contracts_directory: './contracts',
 contracts_build_directory: './build/contracts',
 migrations_directory: './migrations',
 test_directory: './truffle-tests',
 networks: { development: { host:'127.0.0.1', port:8545, network_id:'*' } },
 compilers: { solc: { version:'0.8.34', settings:{optimizer:{enabled:true,runs:200}} } }
};
