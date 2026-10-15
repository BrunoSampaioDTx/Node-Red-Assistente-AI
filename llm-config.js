"use strict";

const { LlmClient } = require("./lib/llm-client");
const { buildSystemPrompt, parseReply } = require("./lib/assistant");

module.exports = function llmConfig(RED) {
    function LlmConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.model = config.model;

        const apiKey = this.credentials?.apiKey;

        this.createClient = () => new LlmClient({
            url: config.url,
            model: config.model,
            apiKey,
            timeoutMs: Number(config.timeout) || 120000
        });
    }

    RED.nodes.registerType("llm-config", LlmConfigNode, {
        credentials: { apiKey: { type: "password" } }
    });

    // ---- Editor sidebar assistant API ---------------------------------------

    function resolveClient(modelId) {
        const node = modelId && RED.nodes.getNode(modelId);
        if (!node?.createClient) {
            throw new Error("Selected model is not deployed. Deploy the llm-config node first.");
        }
        return node.createClient();
    }

    RED.httpAdmin.get("/llm-plugin/models", RED.auth.needsPermission("flows.read"), (req, res) => {
        const models = [];
        RED.nodes.eachNode(n => {
            if (n.type === "llm-config") models.push({ id: n.id, name: n.name || n.model });
        });
        res.json(models);
    });

    // Body: { modelId, mode: "ask"|"agent", flow: [nodes]|null, nodeTypes: [string], messages: [{role, content}] }
    RED.httpAdmin.post("/llm-plugin/chat", RED.auth.needsPermission("flows.write"), async (req, res) => {
        const { modelId, mode, flow, nodeTypes, messages } = req.body || {};
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "messages is required" });
        }
        const started = Date.now();
        try {
            const client = resolveClient(modelId);
            const response = await client.chat(
                [{ role: "system", content: buildSystemPrompt(mode, flow, nodeTypes) }, ...messages],
                { max_tokens: 16000 }
            );
            const message = response.choices?.[0]?.message;
            if (!message) throw new Error("LLM response has no message");

            const { text, nodes } = parseReply(message.content);
            res.json({
                text,
                nodes: mode === "agent" ? nodes : null,
                model: response.model || client.model,
                elapsedMs: Date.now() - started,
                usage: response.usage
            });
        } catch (err) {
            RED.log.warn(`[llm-plugin] ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    });
};
