const names = ['PharmaChainRolesManuales','PharmaChainRolesManualesOptimized','PharmaChainRolesOpenZeppelin','PharmaChainRolesOpenZeppelinOptimized'];
module.exports = async function(deployer) { for (const name of names) await deployer.deploy(artifacts.require(name)); };
