<script setup lang="ts">
const props = defineProps<{
  modelValue: string | object;
  paymentGateways: PaymentGateways;
}>();

const paymentMethod = toRef(props, 'modelValue');
const activePaymentMethod = computed<PaymentGateway>(() => paymentMethod.value as PaymentGateway);
const emits = defineEmits(['update:modelValue']);

// Définir les méthodes de paiement disponibles
const activePaymentGateways = computed(() => {
  if (!props.paymentGateways?.nodes) return [];
  
  // Afficher toutes les méthodes de paiement disponibles dans WooCommerce
  // sauf celles qui sont redondantes ou non fonctionnelles
  console.log('Méthodes de paiement disponibles:', props.paymentGateways.nodes);
  
  // Filtrer pour ne garder que les méthodes de paiement actives et valides
  const filteredGateways = props.paymentGateways.nodes.filter(gateway => {
    // Exclure les méthodes de paiement redondantes ou non fonctionnelles
    const excludedGateways = ['stripe_cc']; // Ajouter ici d'autres méthodes à exclure si nécessaire
    return !excludedGateways.includes(gateway.id);
  });
  
  console.log('Méthodes de paiement filtrées:', filteredGateways);
  
  return filteredGateways;
});

const updatePaymentMethod = (value: any) => {
  console.log('Méthode de paiement sélectionnée:', value.id);
  emits('update:modelValue', value);
};

onMounted(() => {
  // Sélectionner la première méthode de paiement active
  const activeGateways = activePaymentGateways.value;
  if (activeGateways.length) {
    // Préférer Stripe ou WooCommerce Payments si disponible
    const stripeGateway = activeGateways.find(g => g.id === 'stripe' || g.id === 'woocommerce_payments');
    updatePaymentMethod(stripeGateway || activeGateways[0]);
  }
});
</script>

<template>
  <div class="flex gap-4 leading-tight flex-wrap">
    <div
      v-for="gateway in activePaymentGateways"
      :key="gateway.id"
      class="option"
      :class="{ 'active-option': gateway.id === activePaymentMethod.id }"
      @click="updatePaymentMethod(gateway)"
      :title="gateway?.description || gateway?.title || 'Payment Method'">
      <!-- Icônes pour les méthodes de paiement actives -->
      <icon v-if="gateway.id === 'woocommerce_payments'" name="ion:card-outline" size="20" />
      <icon v-else-if="gateway.id === 'paypal'" name="ion:logo-paypal" size="20" />
      <icon v-else-if="gateway.id === 'bacs'" name="ion:cash-outline" size="20" />
      <icon v-else-if="gateway.id === 'cod'" name="ion:cash-outline" size="20" />
      <icon v-else-if="gateway.id === 'cheque'" name="ion:document-text-outline" size="20" />
      <icon v-else name="ion:wallet-outline" size="20" />
      <span class="whitespace-nowrap" v-html="gateway.title" />
      <icon name="ion:checkmark-circle" size="20" class="ml-auto text-primary checkmark opacity-0" />
    </div>
    <div v-if="activePaymentMethod.description" class="prose block w-full">
      <p class="text-sm text-gray-500" v-html="activePaymentMethod.description" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.option {
  @apply bg-white border rounded-lg text-gray-600 cursor-pointer flex flex-1 text-sm py-3 px-4 gap-2 items-center hover:border-purple-300;

  &.active-option {
    @apply border-primary cursor-default border-opacity-50 shadow-sm pointer-events-none;

    & .checkmark {
      @apply opacity-100;
    }
  }
}
</style>
