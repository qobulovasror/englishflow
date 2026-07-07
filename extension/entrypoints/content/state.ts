import { reactive } from 'vue';

/**
 * UI state shared between the content-script bootstrap (`index.ts`, which owns
 * the DOM selection listeners) and the Vue app rendered in the shadow root.
 * Coordinates are viewport-relative (from `getBoundingClientRect`), so the
 * bubble and panel use `position: fixed`.
 */
export const state = reactive({
  bubbleVisible: false,
  panelVisible: false,
  selectedText: '',
  x: 0,
  y: 0,
});

export function showBubble(x: number, y: number, text: string): void {
  state.selectedText = text;
  state.x = x;
  state.y = y;
  state.bubbleVisible = true;
  state.panelVisible = false;
}

export function hideBubble(): void {
  state.bubbleVisible = false;
}

export function openPanel(text?: string): void {
  if (text !== undefined) state.selectedText = text.trim();
  state.bubbleVisible = false;
  state.panelVisible = true;
}

export function closePanel(): void {
  state.panelVisible = false;
}
