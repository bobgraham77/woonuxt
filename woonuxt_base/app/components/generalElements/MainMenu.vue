<script setup lang="ts">
const { wishlistLink } = useAuth();
</script>

<template>
  <nav>
    <NuxtLink to="/">Accueil</NuxtLink>
    <NuxtLink to="/suivi-commande">Suivi de Livraison</NuxtLink>
    <NuxtLink to="/contact">Service Client</NuxtLink>
  </nav>
</template>
