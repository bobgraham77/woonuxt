<template>
  <main class="container mx-auto max-w-2xl py-12">
    <h1 class="text-2xl font-bold mb-6 text-center">Suivi de livraison</h1>
    <form @submit.prevent="trackParcel" class="flex flex-col gap-4 items-center mb-8">
      <input
        v-model="trackingNumber"
        type="text"
        placeholder="Entrez votre numéro de suivi"
        class="w-full border rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
        required
      />
      <button type="submit" class="bg-green-600 text-white font-bold rounded-lg px-8 py-3 hover:bg-green-500 transition-all">Suivre mon colis</button>
    </form>
    <div v-if="loading" class="text-center my-8">
      <span>Recherche en cours...</span>
    </div>
    <div v-if="error" class="text-red-500 text-center my-4">{{ error }}</div>
    <div v-if="parcel" class="bg-white rounded-lg shadow p-6 mt-4">
      <h2 class="text-xl font-semibold mb-2">Statut : <span class="font-bold">{{ parcel.status }}</span></h2>
      <div class="mb-2">Transporteur : <span class="font-bold">{{ parcel.carrier_name }}</span></div>
      <div class="mb-2">Numéro de suivi : <span class="font-mono">{{ parcel.tracking_number }}</span></div>
      <div class="mb-4">Dernière mise à jour : {{ parcel.last_event?.time || 'N/A' }}</div>
      <div v-if="parcel.events && parcel.events.length" class="mt-4">
        <h3 class="font-semibold mb-2">Historique</h3>
        <ul class="timeline">
          <li v-for="event in parcel.events" :key="event.time" class="mb-2">
            <span class="font-mono text-xs text-gray-500">{{ event.time }}</span> :
            <span>{{ event.status_description }}</span>
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const trackingNumber = ref('');
const loading = ref(false);
const error = ref('');
const parcel = ref<any>(null);

const PARCEL_PANEL_API_KEY = import.meta.env.VITE_PARCEL_PANEL_API_KEY;

async function trackParcel() {
  loading.value = true;
  error.value = '';
  parcel.value = null;
  try {
    const response = await fetch('https://api.parcelpanel.com/open/v1/trackings/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PARCEL_PANEL_API_KEY}`
      },
      body: JSON.stringify({ tracking_number: trackingNumber.value })
    });
    if (!response.ok) throw new Error('Erreur lors de la récupération du suivi.');
    const data = await response.json();
    if (data.code !== 200 || !data.data) throw new Error(data.message || 'Aucune information trouvée.');
    parcel.value = data.data;
  } catch (e: any) {
    error.value = e.message || 'Erreur inconnue.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.timeline {
  border-left: 2px solid #e5e7eb;
  margin-left: 1rem;
  padding-left: 1rem;
}
.timeline li {
  position: relative;
  padding-left: 1rem;
}
.timeline li:before {
  content: '';
  position: absolute;
  left: -1.1rem;
  top: 0.4rem;
  width: 0.7rem;
  height: 0.7rem;
  background: #34d399;
  border-radius: 50%;
}
</style>
