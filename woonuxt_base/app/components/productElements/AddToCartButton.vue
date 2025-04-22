<script setup>
import { ref, computed, watch } from 'vue';
const { addToCart, cart } = useCart();
const emit = defineEmits(['success']);
const props = defineProps({
  disabled: { type: Boolean, default: false },
  productInput: { type: Object, required: true },
});
const isLoading = ref(false);
const errorMessage = ref('');
const { t } = useI18n();
const addToCartButtonText = computed(() => (isLoading.value ? t('messages.shop.adding') : t('messages.shop.addToCart')));

// stop loading when cart is updated
watch(cart, () => {
  isLoading.value = false;
});

const handleAddToCart = async () => {
  if (props.disabled || isLoading.value) return;
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await addToCart(props.productInput);
    emit('success');
  } catch (error) {
    errorMessage.value = t('messages.shop.addToCartError') || 'Error adding to cart.';
    isLoading.value = false;
  }
};
</script>

<template>
  <button
    type="button"
    class="w-full rounded-lg font-bold bg-green-600 text-white text-center p-4 gap-4 items-center justify-center focus:outline-none hover:bg-green-400 transition-all duration-200 disabled:cursor-not-allowed disabled:bg-gray-400 flex"
    :class="{ disabled: disabled || isLoading }"
    :disabled="disabled || isLoading"
    @click="handleAddToCart"
  >
    <span>{{ addToCartButtonText }}</span>
    <LoadingIcon v-if="isLoading" stroke="4" size="12" color="#fff" />
  </button>
  <div v-if="errorMessage" class="text-red-500 text-xs mt-2">{{ errorMessage }}</div>
</template>

<style lang="postcss" scoped>
button {
  outline: none !important;
  transition: all 150ms ease-in;
}

button.disabled {
  @apply cursor-not-allowed bg-gray-400;
}
</style>
