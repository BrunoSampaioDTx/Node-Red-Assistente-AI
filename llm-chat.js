"use strict";

const { stripThinking } = require("./lib/llm-client");

module.exports = function (RED) {
    function LlmChatNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const server = RED.nodes.getNode(config.server);

        if (!server) {
            node.status({ fill: "red", shape: "ring", text: "no config" });
            return;
        }

        const client = server.createClient();

        // msg.payload: string (user prompt) or array of chat messages.
        function buildMessages(msg) {
            if (Array.isArray(msg.payload)) return msg.payload;

            const messages = [];
            const system = msg.system || config.systemPrompt;
            if (system) messages.push({ role: "system", content: system });
            const prompt = typeof msg.payload === "string" ? msg.payload : JSON.stringify(msg.payload);
            messages.push({ role: "user", content: prompt });
            return messages;
        }

        function buildParams(msg) {
            const params = {};
            if (config.temperature !== "") params.temperature = Number(config.temperature);
            if (config.maxTokens !== "") params.max_tokens = Number(config.maxTokens);
            if (config.jsonMode) params.response_format = { type: "json_object" };
            // msg.llmParams overrides node settings (e.g. tools, top_p, stream=false).
            return Object.assign(params, msg.llmParams);
        }

        node.on("input", async (msg, send, done) => {
            node.status({ fill: "blue", shape: "dot", text: "requesting" });
            try {
                const response = await client.chat(buildMessages(msg), buildParams(msg));
                const message = response.choices && response.choices[0] && response.choices[0].message;
                if (!message) throw new Error("LLM response has no message");

                let content = config.stripThinking ? stripThinking(message.content) : message.content;
                if (config.jsonMode && typeof content === "string") content = JSON.parse(content);

                msg.payload = content;
                msg.llm = response;
                if (message.tool_calls) msg.toolCalls = message.tool_calls;

                const tokens = response.usage && response.usage.total_tokens;
                node.status({ fill: "green", shape: "dot", text: tokens ? `${tokens} tokens` : "ok" });
                send(msg);
                done();
            } catch (err) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                done(err);
            }
        });
    }

    RED.nodes.registerType("llm-chat", LlmChatNode);
};
