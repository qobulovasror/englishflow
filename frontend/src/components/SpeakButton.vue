<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

interface Props {
  // The text to pronounce (used for the Web Speech API fallback).
  word: string
  // Optional pre-recorded pronunciation audio. Preferred over speech synthesis.
  audioUrl?: string
}

const props = defineProps<Props>()

// Web Speech API is available in lib.dom; guard for browsers that lack it.
const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// Hide the button entirely when there is no way to produce sound.
const canSpeak = computed(() => !!props.audioUrl || speechSupported)

const playing = ref(false)
let audio: HTMLAudioElement | null = null

function stop() {
  if (audio) {
    audio.pause()
    audio = null
  }
  if (speechSupported) {
    window.speechSynthesis.cancel()
  }
  playing.value = false
}

function speak() {
  if (playing.value) {
    stop()
    return
  }

  if (props.audioUrl) {
    audio = new Audio(props.audioUrl)
    audio.onended = () => {
      playing.value = false
      audio = null
    }
    audio.onerror = () => {
      playing.value = false
      audio = null
    }
    playing.value = true
    void audio.play().catch(() => {
      playing.value = false
      audio = null
    })
    return
  }

  if (speechSupported) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(props.word)
    utterance.lang = 'en-US'
    utterance.onend = () => {
      playing.value = false
    }
    utterance.onerror = () => {
      playing.value = false
    }
    playing.value = true
    window.speechSynthesis.speak(utterance)
  }
}

onBeforeUnmount(stop)
</script>

<template>
  <button
    v-if="canSpeak"
    type="button"
    class="text-gray-400 hover:text-primary-500 transition-colors p-2 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-primary-500 rounded-lg"
    :class="{ 'text-primary-500 animate-pulse': playing }"
    aria-label="Listen"
    @click.stop="speak"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5 9v6h4l5 5V4L9 9H5z"
      />
    </svg>
  </button>
</template>
