import { setGlobalDispatcher, ProxyAgent } from "undici";

// Point at your Clash HTTP proxy (adjust port if necessary)
const proxyUri = process.env.HTTP_PROXY || "http://127.0.0.1:7897";
setGlobalDispatcher(new ProxyAgent({ uri: proxyUri }));

import express, { RequestHandler } from 'express';
import { main, WorkflowData } from './main'; // Import our existing workflow function and WorkflowData
import "dotenv-defaults/config"; // Ensure environment variables are loaded

// Debug: Check if the API key is loaded in this context
console.log(`[Server Startup] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Loaded' : 'MISSING or UNDEFINED'}`);
if (!process.env.ANTHROPIC_API_KEY) console.error("Error: ANTHROPIC_API_KEY is not found in the environment. Check your .env file and its loading.");

const app = express();
const PORT = 3000; // We'll run the server on port 3000

// Add this middleware to enable the server to parse JSON request bodies
app.use(express.json());

/**
 * Express request handler for the /api/workflow/run endpoint.
 * It receives form data in the request body, validates it,
 * and triggers the main agentic workflow.
 */
const runWorkflowHandler: RequestHandler<{}, any, WorkflowData, any> = async (req, res) => {
  console.log('API call received, starting workflow...');

  // req.body is typed as WorkflowData due to RequestHandler<..., ..., WorkflowData, ...>
  const workflowPayload = req.body;

  // Validate that required fields are present
  if (!workflowPayload || !workflowPayload.firstName || !workflowPayload.lastName) {
    res.status(400).json({ message: 'Missing required fields: firstName and lastName are required.' });
    return;
  }

  try {
    // Execute the main Playwright logic
    await main(workflowPayload); // Pass the entire payload

    // If the workflow completes successfully, send a success response
    console.log('Workflow finished successfully.');
    res.status(200).json({ message: `Workflow completed successfully for ${workflowPayload.firstName} ${workflowPayload.lastName}!` });

  } catch (error) {
    // If an error occurs during the workflow, log it and send an error response
    console.error('An error occurred during the workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: 'An error occurred during the workflow.', error: errorMessage });
  }
};

// Define a POST endpoint at /api/workflow/run to trigger the agentic workflow.
app.post('/api/workflow/run', runWorkflowHandler);

// Start the server and make it listen for incoming requests
app.listen(PORT, () => {
  console.log(`API server is running at http://localhost:${PORT}`);
  console.log(`Make a POST request to http://localhost:${PORT}/api/workflow/run to start the automation.`);
});