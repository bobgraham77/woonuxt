<script setup lang="ts">
interface ProductPriceProps {
  regularPrice?: string | null;
  salePrice?: string | null;
}

const { regularPrice, salePrice } = defineProps<ProductPriceProps>();
</script>

<template>
  <div v-if="regularPrice" class="flex font-semibold">
    <span
      :class="{ 'text-gray-400 line-through font-normal':
        salePrice && String(salePrice) !== '' && String(salePrice) !== '0' && String(salePrice) !== String(regularPrice)
      }"
      v-html="regularPrice"
    />
    <span
      v-if="salePrice && String(salePrice) !== '' && String(salePrice) !== '0' && String(salePrice) !== String(regularPrice)"
      class="ml-2"
      v-html="salePrice"
    />
  </div>
</template>
