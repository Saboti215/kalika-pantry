<script setup>
// App shell: just the router outlet. Every view (scanner, login, onboarding,
// settings) renders full-screen - there is no persistent chrome by design,
// keeping the scan-first flow free of distracting navigation.
</script>

<template>
  <router-view />
</template>
