import { setGlobalDispatcher, ProxyAgent } from "undici";

// Point at your Clash HTTP proxy (adjust port if necessary)
const proxyUri = process.env.HTTP_PROXY || "http://127.0.0.1:7897";
setGlobalDispatcher(new ProxyAgent({ uri: proxyUri }));

import "dotenv-defaults/config";
import { main } from "../main";

// This script serves as a simple way to run the main agentic workflow
// directly for development and testing purposes, using default input data.
(async () => {
          try {
            // Call main with some default data so 'npm run dev' still works
            await main({ firstName: "Default", lastName: "User" });
          } catch (error) {
            console.error("Error during 'npm run dev' execution:", error);
          }
})();
