/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";

const app = document.getElementById('app');

interface SavedPrompt {
  id: number;
  inputs: typeof state.inputs;
  output: string;
}

const state = {
  isLoading: false,
  output: '',
  error: '',
  inputs: {
    goal: '',
    category: 'Marketing',
    tone: '',
    outputFormat: 'Text',
    constraints: '',
    refinementDepth: 'Tier-1',
  },
  savedPrompts: [] as SavedPrompt[],
  editingPromptId: null as number | null,
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-pro';

function saveFormStateToStorage() {
  localStorage.setItem('promptFormState', JSON.stringify(state.inputs));
}

function loadFormStateFromStorage() {
  const savedState = localStorage.getItem('promptFormState');
  if (savedState) {
    try {
      const parsedState = JSON.parse(savedState);
      // Merge with defaults to ensure compatibility with new state properties
      state.inputs = { ...state.inputs, ...parsedState };
    } catch (e) {
      console.error("Failed to parse saved form state:", e);
      // Use default state if parsing fails
    }
  }
}

function loadSavedPrompts() {
  const saved = localStorage.getItem('savedPrompts');
  if (saved) {
    try {
      const parsedPrompts: SavedPrompt[] = JSON.parse(saved);
       state.savedPrompts = parsedPrompts.map(p => ({
            ...p,
            inputs: {
              ...p.inputs,
              refinementDepth: p.inputs.refinementDepth || 'Tier-1'
            }
          }));
    } catch (e) {
      console.error("Failed to parse saved prompts:", e);
      state.savedPrompts = [];
    }
  }
}

function savePromptsToStorage() {
  localStorage.setItem('savedPrompts', JSON.stringify(state.savedPrompts));
}


function render() {
  if (!app) return;

  const categoryOptions = ['App Building', 'Automation', 'Coding', 'Creative', 'Design', 'Marketing', 'Productivity', 'Research', 'Strategy', 'Writing'].sort();
  const formatOptions = ['Text', 'Table', 'Code', 'Script', 'Step-by-Step', 'Report'];
  const refinementOptions = ['Tier-1', 'Simplify', 'Expand', 'Role Boost', 'Creative Twist'];
  const isAlreadySaved = state.output && state.savedPrompts.some(p => p.output === state.output);

  let tier1Prompt = '';
  let restOfOutput = state.output;

  if (state.output.includes('--- TIER-1 PROMPT START ---') && state.output.includes('--- TIER-1 PROMPT END ---')) {
    const parts = state.output.split('--- TIER-1 PROMPT START ---');
    const promptAndRest = parts[1].split('--- TIER-1 PROMPT END ---');
    tier1Prompt = promptAndRest[0].trim();
    // Combine the text before the prompt and after, then clean it up.
    restOfOutput = (parts[0] + promptAndRest[1]).replace(/\*\*Tier-1 Prompt\*\*/, '').trim();
  } else if (state.output) {
      restOfOutput = state.output;
  }


  app.innerHTML = `
    <main class="container">
      <header>
        <h1>AI Prompt Master</h1>
        <p>Generate world-class prompts for any task.</p>
      </header>
      <div class="content-wrapper">
        <section class="form-section" aria-labelledby="form-heading">
          <h2 id="form-heading">Your Goal</h2>
          <form id="prompt-form">
            <label for="goal">Goal / Objective / Task</label>
            <textarea id="goal" name="goal" rows="5" placeholder="e.g., Generate a 2-hour podcast script on AI in digital marketing" required>${state.inputs.goal}</textarea>

            <div class="grid-inputs">
              <div>
                <label for="category">Category</label>
                <select id="category" name="category" aria-label="Select a category">
                  ${categoryOptions.map(opt => `<option value="${opt}" ${state.inputs.category === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
              <div>
                <label for="outputFormat">Output Format</label>
                <select id="outputFormat" name="outputFormat" aria-label="Select an output format">
                  ${formatOptions.map(opt => `<option value="${opt}" ${state.inputs.outputFormat === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
               <div>
                <label for="refinementDepth">Refinement Depth</label>
                <select id="refinementDepth" name="refinementDepth" aria-label="Select a refinement depth">
                  ${refinementOptions.map(opt => `<option value="${opt}" ${state.inputs.refinementDepth === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
            </div>

            <label for="tone">Tone / Persona (optional)</label>
            <input type="text" id="tone" name="tone" value="${state.inputs.tone}" placeholder="e.g., Engaging, business + funny">

            <label for="constraints">Constraints / Preferences (optional)</label>
            <textarea id="constraints" name="constraints" rows="3" placeholder="e.g., Include 3 real-world examples">${state.inputs.constraints}</textarea>

            <button type="submit" ${state.isLoading ? 'disabled' : ''}>
              ${state.isLoading ? '<div class="loader"></div> Generating...' : 'Generate Prompt'}
            </button>
          </form>
        </section>

        <section class="output-section" aria-labelledby="output-heading">
          <h2 id="output-heading">Generated Prompt</h2>
          <div id="output-container" class="output-container ${state.isLoading || state.error || state.output ? '' : 'empty'}" role="status" aria-live="polite">
            ${state.isLoading ? '<div class="loader-large"></div>' : ''}
            ${state.error ? `<div class="error">${state.error}</div>` : ''}
            ${state.output ? `
              <h3>Tier-1 Prompt</h3>
              ${tier1Prompt ? `
                <div class="prompt-container">
                  <div class="prompt-actions-header">
                     <button id="save-button" class="save-button" ${!state.output || isAlreadySaved ? 'disabled' : ''} aria-label="Save prompt">
                       ${isAlreadySaved ? `
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/></svg>
                         Saved` : `
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg>
                         Save`}
                     </button>
                     <button id="copy-button" class="copy-button" aria-label="Copy prompt">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/></svg>
                     </button>
                  </div>
                  <pre><code>${tier1Prompt}</code></pre>
                </div>
              ` : ''}
              <div class="rest-of-output">${restOfOutput}</div>
            ` : '<p>Your generated prompt will appear here.</p>'}
          </div>
        </section>
      </div>
    </main>
    <section class="saved-prompts-section container" aria-labelledby="saved-prompts-heading">
      <div class="saved-prompts-header">
        <h2 id="saved-prompts-heading">Saved Prompts</h2>
        <div class="saved-prompts-actions">
           <button id="import-button" class="button-secondary" aria-label="Import prompts from a JSON file">Import</button>
           <input type="file" id="import-file-input" accept="application/json" style="display: none;" />
          ${state.savedPrompts.length > 0 ? `
            <button id="export-button" class="button-secondary" aria-label="Export all saved prompts">
              Export All
            </button>
          ` : ''}
        </div>
      </div>
      ${state.savedPrompts.length > 0 ? `
        <ul id="saved-prompts-list" class="saved-prompts-list">
          ${state.savedPrompts.map(p => {
            const isEditing = state.editingPromptId === p.id;
            return isEditing ? `
              <li class="saved-prompt-item editing" data-id="${p.id}">
                <form class="edit-form">
                  <input type="text" class="edit-goal-input" name="goal" value="${p.inputs.goal.replace(/"/g, '&quot;')}" required aria-label="Edit prompt title">
                  <div class="edit-actions">
                    <button type="submit" class="save-edit button-secondary" data-id="${p.id}" aria-label="Save changes">Save</button>
                    <button type="button" class="cancel-edit button-danger" data-id="${p.id}" aria-label="Cancel editing">Cancel</button>
                  </div>
                </form>
              </li>
            ` : `
              <li class="saved-prompt-item" data-id="${p.id}">
                <p class="prompt-title" title="${p.inputs.goal}">${p.inputs.goal}</p>
                <div class="prompt-actions">
                  <button class="use-prompt button-secondary" data-id="${p.id}" aria-label="Use prompt: ${p.inputs.goal}">Use</button>
                  <button class="edit-prompt button-info" data-id="${p.id}" aria-label="Edit prompt: ${p.inputs.goal}">Edit</button>
                  <button class="delete-prompt button-danger" data-id="${p.id}" aria-label="Delete prompt: ${p.inputs.goal}">Delete</button>
                </div>
              </li>
            `}).join('')}
        </ul>
      ` : `
        <p class="empty-saved">You haven't saved any prompts yet.</p>
      `}
    </section>
  `;

  document.getElementById('prompt-form')?.addEventListener('submit', handleSubmit);
  
  document.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('input', handleInputChange);
  });
  
  document.getElementById('save-button')?.addEventListener('click', handleSavePrompt);
  document.getElementById('export-button')?.addEventListener('click', handleExportPrompts);
  document.getElementById('import-button')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });
  document.getElementById('import-file-input')?.addEventListener('change', handleImportPrompts);
  
  const savedPromptsList = document.getElementById('saved-prompts-list');
  savedPromptsList?.addEventListener('click', handleSavedListClick);
  savedPromptsList?.addEventListener('submit', handleSavedPromptFormSubmit);


  const copyButton = document.getElementById('copy-button');
  copyButton?.addEventListener('click', () => {
    navigator.clipboard.writeText(tier1Prompt).then(() => {
        copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/></svg>`;
        copyButton.classList.add('copied');
        setTimeout(() => {
             copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/></svg>`;
             copyButton.classList.remove('copied');
        }, 2000);
    });
  });
}

function handleImportPrompts(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const importedPrompts = JSON.parse(content);

            if (!Array.isArray(importedPrompts)) {
                throw new Error('Invalid JSON format: Not an array.');
            }
            
            const arePromptsValid = importedPrompts.every(p =>
                p.hasOwnProperty('id') &&
                p.hasOwnProperty('inputs') &&
                p.hasOwnProperty('output') &&
                p.inputs.hasOwnProperty('goal')
            );

            if (!arePromptsValid) {
                throw new Error('Invalid prompt structure in JSON file.');
            }

            const existingOutputs = new Set(state.savedPrompts.map(p => p.output));
            const newPrompts = importedPrompts.filter((p: SavedPrompt) => !existingOutputs.has(p.output));
            
            const mergedPrompts = newPrompts.map((p: SavedPrompt) => ({
                ...p,
                id: Date.now() + Math.random(),
                inputs: {
                  ...p.inputs,
                  refinementDepth: p.inputs.refinementDepth || 'Tier-1'
                }
            }));

            state.savedPrompts = [...mergedPrompts, ...state.savedPrompts];
            savePromptsToStorage();
            render();
        } catch (err) {
            alert(`Failed to import prompts: ${(err as Error).message}`);
        } finally {
            input.value = ''; // Reset file input
        }
    };

    reader.onerror = () => {
        alert('Error reading the file.');
        input.value = '';
    }

    reader.readAsText(file);
}

function handleSavePrompt() {
  if (!state.output || state.savedPrompts.some(p => p.output === state.output)) {
    return;
  }
  const newPrompt: SavedPrompt = {
    id: Date.now(),
    inputs: { ...state.inputs },
    output: state.output,
  };
  state.savedPrompts.unshift(newPrompt); // Add to the top
  savePromptsToStorage();
  render();
}

function handleExportPrompts() {
  if (state.savedPrompts.length === 0) return;

  const dataStr = JSON.stringify(state.savedPrompts, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  link.download = `prompt-master-backup-${timestamp}.json`;
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleSavedPromptFormSubmit(e: Event) {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    if (!target.classList.contains('edit-form')) return;

    const id = parseInt(target.parentElement?.dataset.id || '', 10);
    const input = target.querySelector('.edit-goal-input') as HTMLInputElement;

    if (!id || !input || !input.value.trim()) return;

    const promptToUpdate = state.savedPrompts.find(p => p.id === id);
    if (promptToUpdate) {
        promptToUpdate.inputs.goal = input.value.trim();
        savePromptsToStorage();
    }
    state.editingPromptId = null;
    render();
}

function handleSavedListClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const useButton = target.closest('.use-prompt');
    const deleteButton = target.closest('.delete-prompt');
    const editButton = target.closest('.edit-prompt');
    const cancelButton = target.closest('.cancel-edit');
    
    if (!useButton && !deleteButton && !editButton && !cancelButton) return;

    const id = parseInt(useButton?.getAttribute('data-id') || deleteButton?.getAttribute('data-id') || editButton?.getAttribute('data-id') || '', 10);

    if (useButton && id) {
        const promptToUse = state.savedPrompts.find(p => p.id === id);
        if (promptToUse) {
            state.inputs = { 
                refinementDepth: 'Tier-1',
                ...promptToUse.inputs 
            };
            state.output = promptToUse.output;
            state.error = '';
            state.editingPromptId = null;
            saveFormStateToStorage();
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else if (deleteButton && id) {
        state.savedPrompts = state.savedPrompts.filter(p => p.id !== id);
        savePromptsToStorage();
        render();
    } else if (editButton && id) {
        state.editingPromptId = id;
        render();
    } else if (cancelButton) {
        state.editingPromptId = null;
        render();
    }
}


function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    state.inputs[target.name as keyof typeof state.inputs] = target.value;
    saveFormStateToStorage();
}

async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!state.inputs.goal.trim()) {
        state.error = 'Please enter a goal for your prompt.';
        render();
        return;
    }
    
    state.isLoading = true;
    state.output = '';
    state.error = '';
    render();
    
    let refinementInstruction = "Based on the user's input, generate the response following this exact structure. The 'Tier-1 Prompt' should be your primary, most optimized output, with the other sections providing refinements and analysis.";

    switch (state.inputs.refinementDepth) {
        case 'Simplify':
            refinementInstruction = "Based on the user's input, generate the response following this exact structure. Your main task is to create the **most concise and direct prompt possible**. This simplified version should be placed in the 'Tier-1 Prompt' section. The other refinement sections should offer alternative perspectives.";
            break;
        case 'Expand':
            refinementInstruction = "Based on the user's input, generate the response following this exact structure. Your main task is to create the **most detailed, step-by-step prompt possible**. This expanded version should be placed in the 'Tier-1 Prompt' section. The other refinement sections should offer alternative perspectives.";
            break;
        case 'Role Boost':
            refinementInstruction = "Based on the user's input, generate the response following this exact structure. Your main task is to create a prompt that **maximizes the persona depth and expertise**. This role-boosted version should be placed in the 'Tier-1 Prompt' section. The other refinement sections should offer alternative perspectives.";
            break;
        case 'Creative Twist':
             refinementInstruction = "Based on the user's input, generate the response following this exact structure. Your main task is to create the **most creative and original prompt**, perhaps with a storytelling flair. This creative version should be placed in the 'Tier-1 Prompt' section. The other refinement sections should offer alternative perspectives.";
             break;
    }

    const masterPrompt = `
You are now acting as the **world’s #1 prompt engineer and AI strategist**, with expertise across business, marketing, coding, creative writing, automation, and productivity. Your mission is to **create prompts that are among the top 1% in the world**.

### Workflow:
1. Receive **user input**.
2. Analyze the input and **expand context**.
3. Generate a **Tier-1 prompt**.
4. Provide **Refinement Options**.
5. Output in a structured format using markdown.

### 🚫 What You MUST NOT Do
- Do not produce vague, generic, or filler prompts.  
- Do not assume details the user did not provide.
- Do not include biased, offensive, illegal, or harmful instructions.  
- Do not make the prompt unnecessarily long or confusing; clarity is critical.  
- Do not contradict the user’s constraints, preferences, or goals.  

**Here is the user input:**
- **Goal / Objective / Task:** ${state.inputs.goal}
- **Category:** ${state.inputs.category}
- **Tone / Persona:** ${state.inputs.tone || 'Not specified'}
- **Output Format:** ${state.inputs.outputFormat}
- **Constraints / Preferences:** ${state.inputs.constraints || 'Not specified'}
- **Refinement Depth:** ${state.inputs.refinementDepth}

---

**YOUR TASK:**
${refinementInstruction} Use markdown for formatting. **Bold all headings.**

**Tier-1 Prompt**
--- TIER-1 PROMPT START ---
[The fully-optimized prompt you generate goes here. This part should be ready to be copied and pasted directly into another AI.]
--- TIER-1 PROMPT END ---

**Refinement Options**
- **Simplify:** [Provide a shorter, more concise version of the prompt.]
- **Expand:** [Provide a more detailed, step-by-step version of the prompt.]
- **Role Boost:** [Provide a version that increases the persona depth and expertise.]
- **Creative Twist:** [Provide a version that introduces originality or a unique storytelling flair.]

**Rationale**
[1-2 sentences explaining why this prompt is elite.]

**Scoring**
- **Clarity:** [Score out of 10]
- **Specificity:** [Score out of 10]
- **Persona Alignment:** [Score out of 10]
- **Creativity:** [Score out of 10]
`;

    try {
        const response = await ai.models.generateContent({ model, contents: masterPrompt });
        state.output = response.text;
    } catch (err) {
        console.error(err);
        state.error = `An error occurred: ${(err as Error).message}. Please try again.`;
    } finally {
        state.isLoading = false;
        render();
    }
}

// Initial load and render
loadFormStateFromStorage();
loadSavedPrompts();
render();