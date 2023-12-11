import "dotenv/config";

import { createWalletClient, Hex, http, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

import { deploy } from "../src/deploy";
import { parseEnv } from "./parseEnv";

const envSchema = z.object({
  RPC_HTTP_URL: z.string(),
  DEPLOYER_PRIVATE_KEY: z.string().refine(isHex),
});

const env = parseEnv(envSchema);

const client = createWalletClient({
  transport: http(env.RPC_HTTP_URL),
  account: privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY),
});

deploy(client).then(
  () => {
    console.log("done!");
  },
  (error) => {
    console.error(error);
  }
);
