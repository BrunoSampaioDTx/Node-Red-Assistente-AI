"use strict";

const { stripThinking } = require("./llm-client");

const ASK_PROMPT = `You are a Node-RED expert assistant embedded in the Node-RED editor.
Answer questions about Node-RED and the user's flow concisely, using Markdown.
Do not return flow JSON unless the user explicitly asks for it.`;

const AGENT_PROMPT = `You are a Node-RED expert agent embedded in the Node-RED editor.
You can modify the user's current flow tab.

When a change to the flow is needed:
- Briefly explain what you changed (Markdown, a few lines).
- Then output exactly ONE fenced code block tagged \`json\` containing the COMPLETE
  updated array of nodes for the flow tab (not only the changed nodes).
- Keep the ids, positions (x, y) and wiring of nodes you did not change.
- New nodes need unique 16-char hex ids and sensible x/y positions.
- Do not include the "tab" node itself. Reuse existing config nodes by id.
- Only use node types listed as installed.

If no change is needed, answer normally without a JSON block.`;

/**
 * Builds the system prompt for a chat request.
 * @param {"ask"|"agent"} mode
 * @param {Array<object>|null} flow nodes of the current flow tab
 * @param {Array<string>} nodeTypes node types installed in the editor
 */
function buildSystemPrompt(mode, flow, nodeTypes) {
    const parts = [mode === "agent" ? AGENT_PROMPT : ASK_PROMPT];
    if (nodeTypes && nodeTypes.length) {
        parts.push(`Installed node types: ${nodeTypes.join(", ")}`);
    }
    if (flow) {
        parts.push(`Current flow tab JSON:\n\`\`\`json\n${JSON.stringify(flow)}\n\`\`\``);
    }
    return parts.join("\n\n");
}

/**
 * Splits a model reply into text and an optional flow (last ```json block holding an array).
 * @returns {{text: string, nodes: Array<object>|null}}
 */
function parseReply(content) {
    const text = stripThinking(content || "");
    const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
    for (let i = blocks.length - 1; i >= 0; i--) {
        try {
            const nodes = JSON.parse(blocks[i][1]);
            if (Array.isArray(nodes)) {
                return { text: text.replace(blocks[i][0], "").trim(), nodes };
            }
        } catch (_) {
            // not valid JSON, keep looking
        }
    }
    return { text, nodes: null };
}

module.exports = { buildSystemPrompt, parseReply };
