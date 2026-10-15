"use strict";

/**
 * Minimal client for OpenAI-compatible /chat/completions endpoints.
 */
class LlmClient {
    /**
     * @param {{url: string, model: string, apiKey: string, timeoutMs?: number}} options
     */
    constructor({ url, model, apiKey, timeoutMs = 120000 }) {
        if (!url) throw new Error("LLM endpoint URL is not configured");
        if (!model) throw new Error("LLM model is not configured");
        this.url = url;
        this.model = model;
        this.apiKey = apiKey;
        this.timeoutMs = timeoutMs;
    }

    /**
     * @param {Array<object>} messages OpenAI-style chat messages
     * @param {object} [params] extra request fields (temperature, max_tokens, tools, ...)
     * @returns {Promise<object>} raw completion response
     */
    async chat(messages, params = {}) {
        const headers = { "Content-Type": "application/json" };
        if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

        let res;
        try {
            res = await fetch(this.url, {
                method: "POST",
                headers,
                body: JSON.stringify({ model: this.model, messages, ...params }),
                signal: AbortSignal.timeout(this.timeoutMs)
            });
        } catch (err) {
            // fetch hides network errors (DNS, TLS, refused) behind "fetch failed"
            const cause = err.cause?.code || err.cause?.message || err.message;
            throw new Error(`Cannot reach ${this.url}: ${cause}`);
        }

        const text = await res.text();
        if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${text}`);
        return JSON.parse(text);
    }
}

/**
 * Settings from the LLM_URL / LLM_MODEL / LLM_API_KEY env vars.
 * Read at call time, so no value is bundled with the package.
 */
function envSettings() {
    return {
        url: process.env.LLM_URL,
        model: process.env.LLM_MODEL,
        apiKey: process.env.LLM_API_KEY
    };
}

/** Removes <think>...</think> reasoning blocks emitted by reasoning models (e.g. Qwen3). */
function stripThinking(content) {
    return typeof content === "string"
        ? content.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
        : content;
}

module.exports = { LlmClient, stripThinking, envSettings };
