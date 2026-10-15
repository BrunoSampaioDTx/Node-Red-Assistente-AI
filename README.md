# @dae/node-red-llm

Node-RED nodes and an editor sidebar for any OpenAI-compatible `/chat/completions` endpoint
(vLLM, LiteLLM, Ollama, OpenAI, ...).

## Install

The package is published to the DAE Nexus npm registry. In the Node-RED user directory
(e.g. `/data` in the `nodered/node-red` image):

```sh
echo "@dae:registry=https://nexus.dtx-colab.com/repository/dae-node/" >> .npmrc
npm install @dae/node-red-llm
```

Then restart Node-RED.

## Configuration

Settings come from the `llm-config` node; any empty field falls back to an environment variable
of the Node-RED process. No URL, model or key is bundled with the package.

| Variable      | Used for                                                    |
|---------------|-------------------------------------------------------------|
| `LLM_URL`     | Chat completions URL, e.g. `https://host/v1/chat/completions` |
| `LLM_MODEL`   | Model id sent in the request                                |
| `LLM_API_KEY` | Bearer token                                                |

With `LLM_URL` and `LLM_MODEL` set, the sidebar also offers a "<model> (env)" entry that needs
no `llm-config` node.

## Nodes

### llm-config (configuration)

| Field   | Description                                                        |
|---------|--------------------------------------------------------------------|
| URL     | Full chat completions URL (empty = `LLM_URL`)                      |
| Model   | Model id sent in the request (empty = `LLM_MODEL`)                 |
| API key | Bearer token, stored encrypted (empty = `LLM_API_KEY`)             |
| Timeout | Request timeout in ms (default 120000)                             |


### llm-chat

Sends `msg.payload` to the model and returns the reply.

| Input           | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| `msg.payload`   | Prompt string, or a full array of chat messages (`{role, content}`)          |
| `msg.system`    | Optional, overrides the configured system prompt                            |
| `msg.llmParams` | Optional, extra request fields merged into the body (`tools`, `top_p`, ...) |

| Output          | Description                                      |
|-----------------|--------------------------------------------------|
| `msg.payload`   | Assistant reply (parsed object in JSON mode)     |
| `msg.llm`       | Raw completion response, including `usage`        |
| `msg.toolCalls` | Tool calls requested by the model, if any         |

Options: system prompt, temperature, max tokens, JSON mode and removal of `<think>` reasoning blocks.

## LLM Plugin sidebar

An **LLM Plugin** tab in the editor sidebar to chat with the model about the open flow.

![LLM Plugin sidebar in Agent mode](docs/llm-plugin-sidebar.png)

- **Model**: the env vars entry and any deployed `llm-config` node.
- **Context**: send the current flow tab (without credentials) or nothing.
- **Mode**:
  - *Ask* answers questions.
  - *Agent* returns the complete updated flow and applies it to the open tab. Every applied change
    keeps a **Restore Checkpoint** and can also be undone with Ctrl+Z. Deploy to apply it to the runtime.
- Chats are stored in the browser (`localStorage`).

Subflows are not supported by the agent.

## Publish

```sh
npm login --registry=https://nexus.dtx-colab.com/repository/dae-node/ --auth-type=legacy
npm version patch
npm publish
```
