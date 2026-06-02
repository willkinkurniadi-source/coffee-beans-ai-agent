import { loadEnv } from "../lib/env.js";
import { runDailyWorkflow } from "../services/dailyWorkflow.js";

loadEnv();

const result = await runDailyWorkflow();
console.log(JSON.stringify(result, null, 2));

