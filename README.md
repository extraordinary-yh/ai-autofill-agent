# AI Form-Filling Agent

## Project Overview

This is an autonomous, LLM-powered form-filling agent designed to intelligently complete web-based forms. The agent uses Playwright as its "hands" to interact with browsers, while an Anthropic Large Language Model acts as its "brain" to make contextual decisions based on provided data and form structure.

The system provides a robust, API-driven, and stateful solution for automated form completion workflows.

## Features

* **Autonomous Web Agent:** The core logic in `src/main.ts` uses a "perceive-think-act" loop. The agent perceives the webpage's state, reasons about the next step with an LLM, and acts on the page.
* **Conversational Memory:** The agent maintains a history of its actions to make informed, sequential decisions and avoid getting stuck in loops.
* **API-Driven Workflows:** An Express server (`src/server.ts`) exposes a `POST /api/workflow/run` endpoint to trigger the agent on demand.
* **Dynamic Data Payloads:** The API accepts a JSON body, allowing the workflow to be run with custom data (e.g., different names, medical information).
* **Scheduled Triggers:** A separate script (`src/scheduler.ts`) uses `node-cron` to run the agent automatically on a 5-minute schedule.

## Setup Instructions

#### Prerequisites

* Node.js 20+
* An Anthropic API Key

#### Installation

1.  **Clone Repository:** Clone this repository to your local machine.

2.  **Create Environment File:** Create a `.env` file in the project's root directory and add your secret API key. This file is listed in `.gitignore` and will not be committed.
    ```
    ANTHROPIC_API_KEY=your_anthropic_api_key
    ```
   
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
   
4.  **Install Playwright Browsers:**
    ```bash
    npx playwright install
    ```
   
## How to Test

Testing this project involves observing the LLM agent as it autonomously interacts with the browser. The key is to watch both the **terminal output (to see the agent's "thoughts")** and the **browser window (to see its "actions")**.

#### Test Case 1: Run the Agent Directly (Default Data)

This test demonstrates the core agentic loop using a predefined data set.

1.  **Run Command:**
    ```bash
    npm run dev
    ```
   

2.  **Expected Behavior:**
    * A Chromium browser window will launch and navigate to the form.
    * The terminal will display the agent's live thought process. It will log each step, showing when it's `Asking LLM for the next action...` and the `LLM response received...`.
    * You will see the form being filled out incrementally in the browser, with slight pauses between actions as the agent "thinks."
    * The agent will proceed through all sections, click the "Submit" button, and then the browser will close.

#### Test Case 2: Run via API (Dynamic Data)

This test demonstrates the API server and the agent's ability to handle custom data payloads.

1.  **Start the API Server:**
    In your first terminal, start the API server. It will run continuously, waiting for requests.
    ```bash
    npm run start:api
    ```
    *(Expected Output: `API server is running at http://localhost:3000`)*

2.  **Send an API Request:**
    In a **new, separate terminal window**, use `curl` to send a `POST` request. You can customize the JSON body to see the agent use different data. To test the full workflow, provide data for all sections.

    ```bash
    curl -X POST http://localhost:3000/api/workflow/run \
    -H "Content-Type: application/json" \
    -d '{ "firstName": "API", "lastName": "Test", "dateOfBirth": "1995-05-25", "medicalId": "API1995", "gender": "Other", "allergies": "None", "emergencyContactName": "Support" }'
    ```

3.  **Expected Behavior:**
    * The server terminal will log that an API call was received and begin the agentic workflow.
    * A browser window will launch, and the agent will use the data from your `curl` command as its objective, filling the form accordingly while logging its step-by-step reasoning.

#### Test Case 3: Run the Scheduled Workflow

This test demonstrates the background scheduling functionality.

1.  **Run Command:**
    ```bash
    npm run start:scheduler
    ```

2.  **Expected Behavior:**
    * The terminal will log a confirmation message: `Scheduler started. Workflow is scheduled to run every 5 minutes.`
    * The script will wait. After up to 5 minutes, the full agentic process will trigger automatically (browser launch, step-by-step logging, form filling).
    * This process will repeat every 5 minutes until you manually stop the script (`Ctrl+C`).