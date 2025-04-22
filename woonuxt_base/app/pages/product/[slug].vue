<script lang="ts" setup>
import { StockStatusEnum, ProductTypesEnum, type AddToCartInput } from '#woo';

const route = useRoute();
const { storeSettings } = useAppConfig();
const { arraysEqual, formatArray, checkForVariationTypeOfAny } = useHelpers();
const { addToCart, isUpdatingCart } = useCart();
const { t } = useI18n();
const product = ref<Product | null>(null);

const error = ref<string | null>(null);
const loading = ref<boolean>(false);

async function loadProduct() {
  product.value = null;
  error.value = null;
  loading.value = true;
  try {
    const slug = decodeURIComponent(route.params.slug as string);
    console.log('SLUG DEBUG:', slug);
    const { data } = await useAsyncGql('getProduct', { slug });
    if (!data.value?.product) {
      error.value = t('messages.shop.productNotFound') || 'Produit introuvable';
      return;
    }
    product.value = data.value.product;
  } catch (e) {
    error.value = t('messages.shop.productNotFound') || 'Produit introuvable';
  } finally {
    loading.value = false;
  }
}

onMounted(loadProduct);
watch(() => route.params.slug, loadProduct);
const quantity = ref<number>(1);
const activeVariation = ref<Variation | null>(null);
const variation = ref<VariationAttribute[]>([]);
const indexOfTypeAny = computed<number[]>(() => product.value ? checkForVariationTypeOfAny(product.value) : []);
const attrValues = ref();
const isSimpleProduct = computed<boolean>(() => product.value?.type === ProductTypesEnum.SIMPLE);
const isVariableProduct = computed<boolean>(() => product.value?.type === ProductTypesEnum.VARIABLE);
const isExternalProduct = computed<boolean>(() => product.value?.type === ProductTypesEnum.EXTERNAL);

const safeProduct = computed(() => product.value ?? {});
const safeType = computed(() => type.value ?? {});

const type = computed<Product>(() => {
  if (activeVariation.value) return activeVariation.value as Product;
  if (product.value) return product.value as Product;
  // Objet "vide" conforme à Product pour garantir le typage strict (structure GraphQL)
  return {
    databaseId: 0,
    id: '',
    name: '',
    type: ProductTypesEnum.SIMPLE,
    slug: '',
    sku: '',
    price: '',
    regularPrice: '',
    salePrice: '',
    description: '',
    shortDescription: '',
    attributes: { nodes: [] }, // <- structure attendue par GraphQL
    variations: { nodes: [] }, // <- idem
    image: undefined,
    stockStatus: undefined,
    averageRating: 0,
    reviewCount: 0,
    galleryImages: { nodes: [] },
    terms: { nodes: [] },
    // Ajoute ici tous les champs requis par Product si besoin
  };
});
const selectProductInput = computed<any>(() => ({ productId: type.value?.databaseId ?? 0, quantity: quantity.value })) as ComputedRef<AddToCartInput>;

const mergeLiveStockStatus = (payload: Product): void => {
  if (!product.value) return;
  product.value.stockStatus = payload.stockStatus ?? product.value?.stockStatus;

  payload.variations?.nodes?.forEach((variation: Variation, index: number) => {
    if (product.value?.variations?.nodes && product.value?.variations?.nodes[index]) {
      product.value.variations.nodes[index].stockStatus = variation.stockStatus;
    }
  });
};

onMounted(async () => {
  try {
    if (product.value && typeof product.value.slug === 'string') {
  const { product: stockProduct } = await GqlGetStockStatus({ slug: product.value.slug });
  if (stockProduct) mergeLiveStockStatus(stockProduct as Product);
}
  } catch (error: any) {
    const errorMessage = error?.gqlErrors?.[0].message;
    if (errorMessage) console.error(errorMessage);
  }
});

const updateSelectedVariations = (variations: VariationAttribute[]): void => {
  if (!product.value || !product.value.variations) return;

  attrValues.value = variations.map((el) => ({ attributeName: String(el.name ?? ''), attributeValue: String(el.value ?? '') }));
  const clonedVariations = JSON.parse(JSON.stringify(variations));
  const getActiveVariation = product.value.variations?.nodes.filter((variation: any) => {
    // If there is any variation of type ANY set the value to ''
    if (variation.attributes) {
      // Set the value of the variation of type ANY to ''
      indexOfTypeAny.value.forEach((index) => (clonedVariations[index].value = ''));

      return arraysEqual(formatArray(variation.attributes.nodes), formatArray(clonedVariations));
    }
  });

  // Set variation to the selected variation if it exists
  activeVariation.value = getActiveVariation?.[0] || null;

  selectProductInput.value.variationId = activeVariation.value?.databaseId ?? null;
  selectProductInput.value.variation = activeVariation.value ? attrValues.value : null;
  variation.value = variations;
};

const stockStatus = computed(() => {
  if (isVariableProduct.value) {
    return activeVariation.value?.stockStatus || StockStatusEnum.OUT_OF_STOCK;
  }
  return type.value?.stockStatus || StockStatusEnum.OUT_OF_STOCK;
});

const disabledAddToCart = computed(() => {
  const isOutOfStock = stockStatus.value === StockStatusEnum.OUT_OF_STOCK;
  const isInvalidType = !type.value;
  const isCartUpdating = isUpdatingCart.value;
  const isValidActiveVariation = isVariableProduct.value ? !!activeVariation.value : true;
  return isInvalidType || isOutOfStock || isCartUpdating || !isValidActiveVariation;
});
// Handle AddToCartButton success event
function onAddToCartSuccess() {
  // Optionally show a toast, message, or auto-open cart here
  // For now, just log success
  console.log('Product successfully added to cart!');
}
</script>

<template>
  <main class="container relative py-6 xl:max-w-7xl">
    <div v-if="error">
      <p class="text-red-500 text-center text-lg my-10">{{ error }}</p>
    </div>
    <div v-else-if="loading">
      <div class="flex justify-center items-center my-10">
        <LoadingIcon size="48" color="#888" />
      </div>
    </div>
    <div v-else-if="product">
      <SEOHead :info="product" />
      <Breadcrumb :product class="mb-6" v-if="storeSettings.showBreadcrumbOnSingleProduct" />

      <div class="flex flex-col gap-10 md:flex-row md:justify-between lg:gap-24">
        <ProductImageGallery
          v-if="product && product.image"
          class="relative flex-1"
          :main-image="product?.image || {}"
          :gallery="product?.galleryImages || []"
          :node="safeType"
          :activeVariation="activeVariation || {}" />
        <NuxtImg v-else class="relative flex-1 skeleton" src="/images/placeholder.jpg" :alt="product?.name || 'Product'" />

        <div class="lg:max-w-md xl:max-w-lg md:py-2 w-full">
          <div class="flex justify-between mb-4">
            <div class="flex-1">
              <h1 class="flex flex-wrap items-center gap-2 mb-2 text-2xl font-sesmibold">
                {{ safeType?.name || '' }}
                <LazyWPAdminLink :link="`/wp-admin/post.php?post=${product?.databaseId || 0}&action=edit`">Edit</LazyWPAdminLink>
              </h1>
              <StarRating :rating="product?.averageRating || 0" :count="product?.reviewCount || 0" v-if="storeSettings.showReviews" />
            </div>
            <ProductPrice class="text-xl" :sale-price="safeType?.salePrice || '0'" :regular-price="safeType?.regularPrice || '0'" />
          </div>

          

          <div
  v-if="product.shortDescription"
  class="mb-8 font-light prose"
  v-html="product.shortDescription"
/>

          <hr />

          <form @submit.prevent> <!-- AddToCartButton now handles add-to-cart internally -->
            <AttributeSelections
              v-if="isVariableProduct && product.attributes && product.variations"
              class="mt-4 mb-8"
              :attributes="product.attributes.nodes"
              :defaultAttributes="product.defaultAttributes"
              :variations="product.variations.nodes"
              @attrs-changed="updateSelectedVariations" />
            <div
              v-if="isVariableProduct || isSimpleProduct"
              class="fixed bottom-0 left-0 z-10 flex items-center w-full gap-4 p-4 mt-12 bg-white md:static md:bg-transparent bg-opacity-90 md:p-0">
              <input
                v-model="quantity"
                type="number"
                min="1"
                aria-label="Quantity"
                class="bg-white border rounded-lg flex text-left p-2.5 w-20 gap-4 items-center justify-center focus:outline-none" />
              <AddToCartButton
  class="flex-1 w-full md:max-w-xs"
  :disabled="disabledAddToCart"
  :productInput="selectProductInput"
  :class="{ loading: isUpdatingCart }"
  @success="onAddToCartSuccess"
/>
            </div>
            <a
              v-if="isExternalProduct && product.externalUrl"
              :href="product.externalUrl"
              target="_blank"
              class="rounded-lg flex font-bold bg-gray-800 text-white text-center min-w-[150px] p-2.5 gap-4 items-center justify-center focus:outline-none">
              {{ product?.buttonText || 'View product' }}
            </a>
          </form>

          

          
        </div>
      </div>
      <div v-if="product.description || product.reviews" class="my-32">
        <ProductTabs :product />
      </div>
      <div class="my-32" v-if="product.related && storeSettings.showRelatedProducts">
        <div class="mb-4 text-xl font-semibold">{{ $t('messages.shop.youMayLike') }}</div>
        <LazyProductRow :products="product.related.nodes" class="grid-cols-2 md:grid-cols-4 lg:grid-cols-5" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.product-categories > a:last-child .comma {
  display: none;
}

input[type='number']::-webkit-inner-spin-button {
  opacity: 1;
}
</style>
