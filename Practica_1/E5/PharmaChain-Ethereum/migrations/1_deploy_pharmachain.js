const names = ["PharmaChainRolesManuales", "PharmaChainRolesOpenZeppelin", "PharmaChainRolesManualesOptimized", "PharmaChainRolesOpenZeppelinOptimized", "PharmaChainRolesManualesOptimized1", "PharmaChainRolesOpenZeppelinOptimized1", "PharmaChainRolesManualesOptimizednoID", "PharmaChainRolesOpenZeppelinOptimizednoID"];
module.exports = async function(deployer) {
  for (const name of names) await deployer.deploy(artifacts.require(name));
};
