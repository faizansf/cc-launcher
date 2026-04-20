// Provider registry.
//
// A provider defines what env vars Claude Code needs to talk to a specific
// API endpoint. Each provider is just a plain object:
//
//   { id, name, fields: [{ key, label, type, required, default? }] }
//
// where `type` is 'url' | 'secret' | 'string'. The user creates one or more
// sets of *credentials* per provider via the Add credentials flow.
//
// To add a new provider: drop a file in this folder exporting an object of
// the shape above, then register it in the `providers` array below.
import zai from './zai.js';
import openrouter from './openrouter.js';
import deepseek from './deepseek.js';
import minimax from './minimax.js';
import glm from './glm.js';
import moonshot from './moonshot.js';
import qwen from './qwen.js';
import fireworks from './fireworks.js';
import volcengine from './volcengine.js';
import nvidiaNim from './nvidia-nim.js';
import ollama from './ollama.js';
import lmstudio from './lmstudio.js';
import vllm from './vllm.js';
import litellm from './litellm.js';
import cloudflare from './cloudflare.js';
import vercel from './vercel.js';

const providers = [
  zai, openrouter, deepseek, minimax, glm, moonshot, qwen,
  fireworks, volcengine, nvidiaNim, ollama, lmstudio, vllm,
  litellm, cloudflare, vercel,
];

export function getProviderDef(id) {
  return providers.find(p => p.id === id) || null;
}

export function getAllProviders() {
  return providers;
}

export function getProviderChoices() {
  return providers.map(p => ({ name: p.name, value: p.id }));
}
