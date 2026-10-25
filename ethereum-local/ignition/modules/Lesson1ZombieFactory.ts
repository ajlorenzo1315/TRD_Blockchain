
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Lesson1ZombieFactoryModule", (m) => {
  const factory = m.contract("Lesson1ZombieFactoryModule");
  return { factory };
});
