import { createSession } from "./session";
import { generateText, CoreMessage } from 'ai';
import { model } from './_internal/setup';
import { Browser, chromium, Page } from "playwright";

/**
 * Defines the structure for dynamic data that can be passed to the workflow,
 * representing the information to be filled into the form.
 */
export interface WorkflowData {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  medicalId?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  currentMedications?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/**
 * Perceives the current state of the web page by extracting interactive elements.
 * It serializes these elements (inputs, textareas, selects, buttons, headers)
 * along with their current values and labels into a string format for the LLM.
 * @param page The Playwright Page object.
 * @returns A promise that resolves to a string representing the serialized page elements.
 */
async function getSerializedPage(page: Page): Promise<string> {
  const elements = await page.evaluate(() => {
      const interactiveElements = Array.from(document.querySelectorAll('input, textarea, select, button, a[role="button"], h2'));
      return interactiveElements.map(el => {
          const tagName = el.tagName.toLowerCase();
          const name = el.getAttribute('name') || '';
          const type = el.getAttribute('type') || '';
          let value = '';
          // Extract current value for input, textarea elements
          if (tagName === 'input' || tagName === 'textarea') {
              value = (el as HTMLInputElement | HTMLTextAreaElement).value || '';
          // Extract text of selected option for select elements
          } else if (tagName === 'select') {
              const selectedOption = (el as HTMLSelectElement).options[(el as HTMLSelectElement).selectedIndex];
              value = selectedOption ? selectedOption.text : '';
          }

          // Attempt to find an associated label for the element
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          // Use label text if found, otherwise use the element's own text content (e.g., for buttons, h2s)
          const label = labelEl ? labelEl.textContent?.trim() : el.textContent?.trim();
          
          return `<${tagName} type="${type}" name="${name}" value="${value}">${label || ''}</${tagName}>`;
      });
  });
  return elements.join('\n');
}

/**
 * Main function to execute the agentic loop for filling the web form.
 * It launches a browser, interacts with the LLM to decide actions,
 * and uses Playwright to perform those actions on the page.
 * @param data The dynamic data to be used for filling the form.
 */
export async function main(data: WorkflowData): Promise<void> {
  
  let browser: Browser | undefined;

  try {
    // Launch a new Playwright browser instance.
    // Headless mode can be configured here (e.g., headless: true for CI/background runs).
    browser = await chromium.launch({ headless: false, args: ["--no-sandbox"] });

    // Create a new browser page/session and navigate to the target URL.
    const page = await createSession(browser, "https://magical-medical-form.netlify.app/");
    
    // Construct the high-level objective for the LLM based on the input data.
    const objective = `Your goal is to fill out this medical form with these details: ${JSON.stringify(data)}.`;

    // Define the system prompt to guide the LLM's behavior and response format.
    const systemPrompt = `
      You are an AI agent filling a web form. Your objective is: ${objective}.
      Your response MUST be a single, valid JSON object and nothing else.
      
      **RULES:**
      1. For the "label" in your JSON response, you MUST use the visible text of the form field's label (e.g., "First Name", "Date of Birth"), not the HTML 'name' attribute (e.g., "firstName").
      2. For the "name" in a click action, use the visible text of the button or header.
      3. First, fill all fields specified in the objective. Do not fill fields that are already correctly filled.
      4. After all fields are filled, your next action MUST be to click the 'Submit' button.
      5. Only after you have clicked 'Submit' should you respond with {"action": "finish"}.

      Available actions: {"action": "fill", "label": "..."}, {"action": "click", "role": "button", "name": "..."}, {"action": "select", "label": "..."}, {"action": "finish"}.
    `;
    
    // Initialize conversational history with the system prompt. This provides memory to the LLM.
    const conversationHistory: CoreMessage[] = [{ role: 'system', content: systemPrompt }];
    const maxSteps = 20; // Define a maximum number of steps to prevent infinite loops.

    // Start the agentic "perceive-think-act" loop.
    for (let i = 0; i < maxSteps; i++) {
      console.log(`\n--- Step ${i + 1} / ${maxSteps} ---`);

      // 1. PERCEIVE: Get the current state of interactive elements on the page.
      const pageElements = await getSerializedPage(page);
      // Construct the current prompt for the LLM, including the page state.
      const currentPrompt = `Based on our history and the current page state, what is the next action? Page state:\n\`\`\`html\n${pageElements}\n\`\`\``;
      
      // Add the user's turn (current perception/question) to the conversation history.
      conversationHistory.push({ role: 'user', content: currentPrompt });

      console.log("Asking LLM for the next action...");
      
      // 2. THINK: Send the conversation history to the LLM to get the next action.
      const { text } = await generateText({
        model,
        messages: conversationHistory,
      });
      
      // Add the assistant's response to the conversation history.
      conversationHistory.push({ role: 'assistant', content: text });

      console.log("LLM response received:", text);
      let action;
      try {
        // Attempt to robustly parse the JSON action object from the LLM's response.
        // This regex helps extract JSON even if there's surrounding text.
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON object found in response.");
        action = JSON.parse(jsonMatch[0]);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown parsing error";
        console.error(`Error: LLM returned invalid JSON or no JSON found. Error: ${errorMessage}. Raw response:`, text);
        // If parsing fails, inform the LLM in the next turn.
        conversationHistory.push({ role: 'user', content: 'Your last response was invalid JSON. Please try again.' });
        continue;
      }
      
      // 3. ACT: Execute the action suggested by the LLM.
      switch (action.action) {
        case 'fill':
          await page.getByLabel(action.label, { exact: true }).fill(action.value);
          break;
        case 'click':
          await page.getByRole(action.role, { name: action.name, exact: true }).click();
          break;
        case 'select':
          await page.getByLabel(action.label, { exact: true }).selectOption({ label: action.value });
          break;
        case 'finish':
          console.log("LLM determined the task is complete. Workflow finished successfully.");
          await page.waitForTimeout(60000); 
          return; // Exit the main function as the task is complete.
        default:
          console.error(`Error: LLM returned an unknown action: ${action.action}`);
          continue;
      }
    }
    console.log("Reached max steps. Ending workflow.");

  } catch (error) {
    console.error('An error occurred during the agentic workflow:', error);
    throw error; // Re-throw the error to be handled by the caller.
  } finally {
    // Ensure the browser is closed regardless of success or failure.
    if (browser) {
      await browser.close();
      console.log("Browser closed by main function.");
    }
    }
}
