<script setup lang="ts">
import { computed } from 'vue';
import SavePanel from './SavePanel.vue';
import { openPanel, state } from './state';

const PANEL_W = 320;

const bubbleStyle = computed(() => ({
  left: `${state.x}px`,
  top: `${Math.max(8, state.y - 44)}px`,
}));

const panelStyle = computed(() => {
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = state.x - PANEL_W / 2;
  left = Math.max(pad, Math.min(left, vw - PANEL_W - pad));
  let top = state.y + 24;
  if (top > vh - 280) top = Math.max(pad, vh - 340);
  return { left: `${left}px`, top: `${top}px`, width: `${PANEL_W}px` };
});
</script>

<template>
  <div class="ef-root">
    <button
      v-if="state.bubbleVisible && !state.panelVisible"
      class="ef-bubble"
      :style="bubbleStyle"
      @mousedown.prevent
      @click="openPanel()"
    >
      <span class="ef-bubble-plus">＋</span> EnglishFlow
    </button>

    <SavePanel v-if="state.panelVisible" class="ef-panel-wrap" :style="panelStyle" />
  </div>
</template>

<style>
.ef-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483647;
}
.ef-bubble {
  position: fixed;
  transform: translateX(-50%);
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font: 600 12px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 999px;
  padding: 7px 11px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
}
.ef-bubble:hover {
  background: #1d4ed8;
}
.ef-bubble-plus {
  font-size: 14px;
  line-height: 1;
}
.ef-panel-wrap {
  position: fixed;
  pointer-events: auto;
}
</style>
