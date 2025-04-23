<script setup lang="ts">
// Utiliser PropType pour définir un type plus précis
const props = defineProps({
  rating: { type: Number, default: 0 },
  count: { type: [Number, null] as PropType<number | null | undefined>, default: undefined },
  hideCount: { type: Boolean, default: false },
  size: { type: Number, default: 14 },
});
</script>

<template>
  <div class="inline-flex items-center">
    <Icon v-for="i in 5" :key="i" name="ion:star" :size="size + ''" class="mr-[2px]" :style="{ color: rating < i ? '#ccc' : '#FBBE24' }" />
    <span v-if="count !== null && !hideCount" class="text-xs ml-1 text-gray-500">({{ count }})</span>
  </div>
</template>
