/**
 * 当前工具页向右侧 AI 栏提供的「可复制提示词」注册信息。
 * 主内容区与 AiChatPanel 为兄弟节点，故用模块级 store 传递。
 */
import { get, writable } from 'svelte/store';

let registrationSeq = 0;

/**
 * @typedef {{ templateKey: string, getParams: () => Record<string, string | number | boolean> }} AgentPromptRegistration
 * @type {import('svelte/store').Writable<(AgentPromptRegistration & { id: number }) | null>}
 */
export const agentPromptStore = writable(null);

/**
 * 注册当前页的提示词模板；在 Svelte 5 中于 $effect 内调用并 return 清理函数。
 * @param {{ templateKey: string, getParams: () => Record<string, string | number | boolean> }} spec
 * @returns {() => void}
 */
export function registerAgentPrompt({ templateKey, getParams }) {
  const id = ++registrationSeq;
  agentPromptStore.set({ id, templateKey, getParams });
  return () => {
    if (get(agentPromptStore)?.id === id) {
      agentPromptStore.set(null);
    }
  };
}
