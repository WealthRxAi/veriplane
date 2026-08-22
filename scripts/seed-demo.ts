import { resolve } from "node:path";
import { seedDemo } from "../src/demo.js";
import { VeriplaneStore } from "../src/core/store.js";

const path = resolve(process.env.VERIPLANE_DB_PATH ?? ".veriplane/demo.db");
const store = new VeriplaneStore(path);
seedDemo(store, true);
console.log(`Seeded Veriplane demo data at ${path}`);
store.close();
