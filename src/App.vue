<script setup>
// App shell: just the router outlet. Every view (scanner, login, onboarding,
// settings) renders full-screen - there is no persistent chrome by design,
// keeping the scan-first flow free of distracting navigation. ToastContainer
// is the one exception - a shared overlay for background success/error
// feedback that isn't tied to any single view.
import ToastContainer from './components/ToastContainer.vue'
</script>

<template>
  <router-view />
  <ToastContainer />
</template>
