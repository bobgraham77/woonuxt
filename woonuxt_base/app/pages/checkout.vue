<script setup lang="ts">
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements, CreateSourceData, StripeCardElement, SetupIntentConfirmParams } from '@stripe/stripe-js';
import type { SetupIntent } from '@stripe/stripe-js';

const { t } = useI18n();
const { query } = useRoute();
const { cart, isUpdatingCart, paymentGateways } = useCart();
const { customer, viewer } = useAuth();
// Utiliser le composable useCheckout avec une vérification de nullité
const checkoutComposable = useCheckout();
const orderInput = checkoutComposable?.orderInput;
const isProcessingOrder = checkoutComposable?.isProcessingOrder;
const processCheckout = checkoutComposable?.processCheckout;
const runtimeConfig = useRuntimeConfig();
const stripeKey = runtimeConfig.public?.STRIPE_PUBLISHABLE_KEY || null;

const buttonText = ref<string>(isProcessingOrder.value ? t('messages.general.processing') || 'Traitement en cours...' : t('messages.shop.checkoutButton') || 'Passer la commande');
const errorMessage = ref<string>('');
const isCheckoutDisabled = computed<boolean>(() => isProcessingOrder.value || isUpdatingCart.value || !orderInput.value.paymentMethod);

const isInvalidEmail = ref<boolean>(false);
const stripe: Stripe | null = stripeKey ? await loadStripe(stripeKey) : null;
const elements = ref<StripeElements | null>(null);
const cardElement = ref<StripeCardElement | null>(null);
const isPaid = ref<boolean>(false);
const isStripeReady = ref<boolean>(false);

onBeforeMount(async () => {
  if (query.cancel_order) window.close();
});

// Observer les changements de méthode de paiement pour initialiser Stripe si nécessaire
watch(() => orderInput.value.paymentMethod, async (newPaymentMethod) => {
  if (newPaymentMethod && (newPaymentMethod.id === 'stripe' || newPaymentMethod.id === 'woocommerce_payments')) {
    // Réinitialiser l'élément de carte si nécessaire
    if (cardElement.value) {
      cardElement.value.unmount();
      cardElement.value = null;
    }
    
    // Initialiser Stripe avec un court délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      initializeStripe();
    }, 200);
  }
}, { immediate: true });

const payNow = async () => {
  errorMessage.value = '';
  buttonText.value = t('messages.general.processing') || 'Traitement en cours...';

  // Vérifier si le panier est vide ou si le montant est invalide
  if (!cart.value || cart.value.isEmpty || (cart.value.total && Number(cart.value.total) <= 0)) {
    errorMessage.value = t('messages.shop.errorCartAmount') || 'Votre panier est vide ou le montant est invalide.';
    buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
    return;
  }

  // Vérifier si une méthode de paiement est sélectionnée
  if (!orderInput.value.paymentMethod || !orderInput.value.paymentMethod.id) {
    errorMessage.value = t('messages.shop.errorNoPaymentMethod') || 'Veuillez sélectionner une méthode de paiement.';
    buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
    return;
  }

  // Vérifier que les informations de facturation sont complètes
  const billing = customer.value?.billing;
  if (!billing || !billing.firstName || !billing.lastName || !billing.address1 || !billing.city || !billing.postcode || !billing.email) {
    errorMessage.value = 'Veuillez remplir tous les champs obligatoires de facturation.';
    buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
    return;
  }

  try {
    // Ajouter un identifiant de transaction générique
    orderInput.value.transactionId = `order_${new Date().getTime()}`;
    
    // Réinitialiser les métadonnées pour éviter les doublons
    orderInput.value.metaData = [{ key: 'order_via', value: 'WooNuxt' }];
    
    // Traitement générique pour toutes les méthodes de paiement sauf Stripe/WooCommerce Payments
    const paymentMethodId = orderInput.value.paymentMethod.id;
    const isStripePayment = paymentMethodId === 'woocommerce_payments' || paymentMethodId === 'stripe';
    
    if (!isStripePayment) {
      console.log('Méthode de paiement sélectionnée:', paymentMethodId);
      
      // Ajouter des métadonnées pour la méthode de paiement
      orderInput.value.metaData.push({ key: 'payment_method_note', value: `Paiement via ${orderInput.value.paymentMethod.title}` });
      
      try {
        // Traiter la commande avec la méthode de paiement sélectionnée
        buttonText.value = t('messages.shop.processingOrder') || 'Traitement de votre commande...';
        const order = await processCheckout(false);
        
        if (order?.databaseId) {
          console.log(`Commande créée avec succès via ${paymentMethodId}, ID:`, order.databaseId);
          isPaid.value = true;
          buttonText.value = t('messages.shop.orderComplete') || 'Commande complétée';
        } else {
          console.error(`Échec de la création de la commande via ${paymentMethodId}:`, order);
          errorMessage.value = 'Erreur lors de la création de la commande';
          buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
        }
      } catch (error: any) {
        console.error(`Erreur lors du processus de paiement via ${paymentMethodId}:`, error);
        errorMessage.value = error?.message || `Une erreur est survenue lors du paiement via ${orderInput.value.paymentMethod.title}`;
        buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
      }
    }
    // Traitement spécifique pour Stripe
    else if (orderInput.value.paymentMethod.id === 'woocommerce_payments' || orderInput.value.paymentMethod.id === 'stripe') {
      console.log('Méthode de paiement sélectionnée: stripe');
      
      // Vérifier que Stripe et les éléments sont bien initialisés
      if (!stripe) {
        errorMessage.value = 'Erreur: Stripe n\'est pas initialisé';
        buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
        return;
      }
      
      if (!elements.value) {
        errorMessage.value = 'Erreur: Les éléments de paiement ne sont pas initialisés';
        buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
        return;
      }
      
      try {
        buttonText.value = t('messages.shop.processingOrder') || 'Processing Order...';
        
        // Récupérer l'intention de paiement
        const { stripePaymentIntent } = await GqlGetStripePaymentIntent();
        const clientSecret = stripePaymentIntent?.clientSecret || '';
        
        if (!clientSecret) {
          errorMessage.value = 'Erreur: Impossible de récupérer les informations de paiement';
          buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
          return;
        }
        
        // Vérifier que l'élément de carte est disponible
        if (!cardElement.value) {
          console.error('Erreur: L\'élément de carte n\'est pas disponible');
          errorMessage.value = 'Erreur: L\'élément de carte n\'est pas disponible';
          buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
          return;
        }
        
        console.log('Élément de carte disponible, continuation du processus de paiement');

        // Confirmer le paiement
        const paymentMethod = {
          card: cardElement.value,
          billing_details: {
            name: `${billing?.firstName || ''} ${billing?.lastName || ''}`,
            email: billing?.email || '',
            phone: billing?.phone || '',
            address: {
              line1: billing?.address1 || '',
              line2: billing?.address2 || '',
              city: billing?.city || '',
              state: billing?.state || '',
              postal_code: billing?.postcode || '',
              country: billing?.country || ''
            }
          }
        };
        
        console.log('Détails de paiement prêts pour confirmation');
        
        const confirmParams = { payment_method: paymentMethod } as SetupIntentConfirmParams;

        const result = await stripe.confirmCardSetup(clientSecret, confirmParams);
        const confirmationError = result.error;
        const setupIntent = result.setupIntent as SetupIntent | null;
        
        if (confirmationError) {
          errorMessage.value = confirmationError?.message || 'Erreur lors du processus de paiement';
          buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
          return;
        }

        if (!setupIntent?.payment_method) {
          errorMessage.value = 'Erreur: Impossible de confirmer le paiement';
          buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
          return;
        }

        // Ajouter l'ID de la méthode de paiement aux métadonnées
        orderInput.value.metaData.push({
          key: 'stripe_payment_method_id',
          value: setupIntent.payment_method as string
        });

        // Vérifier si le paiement a réussi
        isPaid.value = setupIntent?.status === 'succeeded' || false;
        orderInput.value.transactionId = setupIntent?.created?.toString() || new Date().getTime().toString();
        
        // Définir isPaid à true pour indiquer que le paiement a été traité
        orderInput.value.isPaid = true;
        console.log('Paiement Stripe confirmé, setupIntent:', setupIntent);
        console.log('Métadonnées avant processCheckout:', orderInput.value.metaData);
        console.log('TransactionId avant processCheckout:', orderInput.value.transactionId);
        
        // Traiter la commande
        console.log('Appel de processCheckout avec isPaid=true');
        const order = await processCheckout(true);
        
        console.log('Résultat de processCheckout:', order);
        
        if (order?.databaseId) {
          console.log('Commande créée avec succès, ID:', order.databaseId);
          isPaid.value = true;
          buttonText.value = t('messages.shop.orderComplete') || 'Commande complétée';
        } else {
          console.error('Échec de la création de la commande:', order);
          errorMessage.value = 'Erreur lors de la création de la commande';
          buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
        }
      } catch (error: any) {
        console.error('Erreur lors du processus de paiement:', error);
        errorMessage.value = error?.message || 'Une erreur est survenue lors du paiement';
        buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
      }
    } else if (orderInput.value.paymentMethod.id === 'bacs') { // Virement bancaire
      orderInput.value.metaData.push({ key: 'payment_method_note', value: 'Paiement par virement bancaire' });
    } else if (orderInput.value.paymentMethod.id === 'cod') { // Paiement à la livraison
      orderInput.value.metaData.push({ key: 'payment_method_note', value: 'Paiement à la livraison' });
    } else if (orderInput.value.paymentMethod.id === 'cheque') { // Chèque
      orderInput.value.metaData.push({ key: 'payment_method_note', value: 'Paiement par chèque' });
    }
    
    // Assurer que les informations d'expédition sont correctes
    if (orderInput.value.shipToDifferentAddress) {
      const shipping = customer.value?.shipping;
      if (!shipping || !shipping.firstName || !shipping.lastName || !shipping.address1 || !shipping.city || !shipping.postcode) {
        errorMessage.value = "Veuillez remplir tous les champs obligatoires d'expédition.";
        buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
        return;
      }
    }
    
    // Préparer les données de facturation et d'expédition
    const billingData = billing ? {
      firstName: billing.firstName || '',
      lastName: billing.lastName || '',
      address1: billing.address1 || '',
      address2: billing.address2 || '',
      city: billing.city || '',
      postcode: billing.postcode || '',
      country: billing.country || '',
      state: billing.state || '',
      email: billing.email || '',
      phone: billing.phone || ''
    } : {};
    
    const shippingData = orderInput.value.shipToDifferentAddress && customer.value?.shipping ? {
      firstName: customer.value.shipping.firstName || '',
      lastName: customer.value.shipping.lastName || '',
      address1: customer.value.shipping.address1 || '',
      address2: customer.value.shipping.address2 || '',
      city: customer.value.shipping.city || '',
      postcode: customer.value.shipping.postcode || '',
      country: customer.value.shipping.country || '',
      state: customer.value.shipping.state || '',
      email: customer.value.shipping.email || '',
      phone: customer.value.shipping.phone || ''
    } : billingData;
    
    // Traiter la commande via l'API WooCommerce
    console.log('Traitement de la commande avec les données:', {
      billing: billingData,
      shipping: shippingData,
      paymentMethod: orderInput.value.paymentMethod.id,
      metaData: orderInput.value.metaData,
      isPaid: isPaid.value
    });
    
    // Finaliser la commande
    await processCheckout(isPaid.value);
  } catch (error: any) {
    console.error('Erreur lors du checkout:', error);
    // Afficher un message d'erreur plus détaillé
    if (error?.gqlErrors && error.gqlErrors.length > 0) {
      errorMessage.value = error.gqlErrors[0].message || 'Erreur lors du traitement de la commande.';
    } else if (error?.message) {
      errorMessage.value = error.message || t('messages.shop.errorCheckout') || 'Erreur lors de la validation de la commande.';
    } else {
      errorMessage.value = 'Erreur inconnue lors du traitement de la commande.';
    }
    buttonText.value = t('messages.shop.placeOrder') || 'Passer la commande';
  }
};

// Initialiser les éléments Stripe directement dans la page de checkout
const initializeStripe = async (): Promise<void> => {
  if (!stripe || !orderInput.value.paymentMethod) return;
  
  try {
    // Vérifier si la méthode de paiement est Stripe
    const isStripePayment = orderInput.value.paymentMethod.id === 'stripe' || orderInput.value.paymentMethod.id === 'woocommerce_payments';
    if (!isStripePayment) return;
    
    console.log('Initialisation des éléments Stripe...');
    
    // Calculer le montant du panier
    const cartAmount = cart.value?.total ? Math.round(Number(cart.value.total) * 100) : 1000;
    console.log('Montant du panier pour Stripe:', cartAmount);
    
    // Créer les éléments Stripe
    const elementsOptions = {
      mode: 'payment' as const,
      amount: cartAmount > 0 ? cartAmount : 1000,
      currency: 'eur'
    };
    
    // Créer les éléments Stripe
    elements.value = stripe.elements(elementsOptions);
    
    // Créer l'élément de carte
    if (elements.value) {
      // Attendre que le DOM soit prêt
      await nextTick();
      
      // Vérifier que l'élément DOM existe
      const cardElementDom = document.getElementById('card-element');
      if (!cardElementDom) {
        console.error("L'élément DOM #card-element n'existe pas");
        errorMessage.value = 'Erreur lors du chargement du formulaire de paiement';
        return;
      }
      
      // Créer et monter l'élément de carte
      cardElement.value = elements.value.create('card', {
        hidePostalCode: true,
        style: {
          base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        }
      });
      
      // Monter l'élément de carte dans le DOM
      cardElement.value.mount('#card-element');
      
      // Écouter les événements d'erreur
      cardElement.value.on('change', (event) => {
        if (event.error) {
          errorMessage.value = event.error.message || 'Erreur de carte';
        } else {
          errorMessage.value = '';
          if (event.complete) {
            isStripeReady.value = true;
          }
        }
      });
      
      console.log('Éléments Stripe initialisés avec succès');
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'initialisation de Stripe:', error);
    errorMessage.value = error?.message || 'Erreur lors de l\'initialisation du paiement';
  }
};

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

const checkEmailOnBlur = (email?: string | null): void => {
  if (email) isInvalidEmail.value = !emailRegex.test(email);
};

const checkEmailOnInput = (email?: string | null): void => {
  if (email && isInvalidEmail.value) isInvalidEmail.value = !emailRegex.test(email);
};

useSeoMeta({
  title: t('messages.shop.checkout'),
});
</script>

<template>
  <div class="flex flex-col min-h-[600px]">
    <template v-if="cart && customer">
      <div v-if="cart.isEmpty" class="flex flex-col items-center justify-center flex-1 mb-12">
        <Icon name="ion:cart-outline" size="156" class="opacity-25 mb-5" />
        <h2 class="text-2xl font-bold mb-2">{{ $t('messages.shop.cartEmpty') }}</h2>
        <span class="text-gray-400 mb-4">{{ $t('messages.shop.addProductsInYourCart') }}</span>
        <NuxtLink
          to="/products"
          class="flex items-center justify-center gap-3 p-2 px-3 mt-4 font-semibold text-center text-white rounded-lg shadow-md bg-primary hover:bg-primary-dark">
          {{ $t('messages.shop.browseOurProducts') }}
        </NuxtLink>
      </div>

      <form v-else class="container flex flex-wrap items-start gap-8 my-16 justify-evenly lg:gap-20" @submit.prevent="payNow();">
        <div class="grid w-full max-w-2xl gap-8 checkout-form md:flex-1">
          <!-- Customer details -->
          <div v-if="!viewer && customer.billing">
            <h2 class="w-full mb-2 text-2xl font-semibold leading-none">Contact Information</h2>
            <p class="mt-1 text-sm text-gray-500">Already have an account? <a href="/my-account" class="text-primary text-semibold">Log in</a>.</p>
            <div class="w-full mt-4">
              <label for="email">{{ $t('messages.billing.email') }}</label>
              <input
                v-model="customer.billing.email"
                placeholder="johndoe@email.com"
                autocomplete="email"
                type="email"
                name="email"
                :class="{ 'has-error': isInvalidEmail }"
                @blur="checkEmailOnBlur(customer.billing.email)"
                @input="checkEmailOnInput(customer.billing.email)"
                required />
              <Transition name="scale-y" mode="out-in">
                <div v-if="isInvalidEmail" class="mt-1 text-sm text-red-500">Invalid email address</div>
              </Transition>
            </div>
            <template v-if="orderInput.createAccount">
              <div class="w-full mt-4">
                <label for="username">{{ $t('messages.account.username') }}</label>
                <input v-model="orderInput.username" placeholder="johndoe" autocomplete="username" type="text" name="username" required />
              </div>
              <div class="w-full my-2" v-if="orderInput.createAccount">
                <label for="email">{{ $t('messages.account.password') }}</label>
                <PasswordInput id="password" class="my-2" v-model="orderInput.password" placeholder="••••••••••" :required="true" />
              </div>
            </template>
            <div v-if="!viewer" class="flex items-center gap-2 my-2">
              <label for="creat-account">Create an account?</label>
              <input id="creat-account" v-model="orderInput.createAccount" type="checkbox" name="creat-account" />
            </div>
          </div>

          <div>
            <h2 class="w-full mb-3 text-2xl font-semibold">{{ $t('messages.billing.billingDetails') }}</h2>
            <BillingDetails v-model="customer.billing as Record<string, any>" />
          </div>

          <label v-if="cart.availableShippingMethods && cart.availableShippingMethods.length > 0" for="shipToDifferentAddress" class="flex items-center gap-2">
            <span>{{ $t('messages.billing.differentAddress') }}</span>
            <input id="shipToDifferentAddress" v-model="orderInput.shipToDifferentAddress" type="checkbox" name="shipToDifferentAddress" />
          </label>

          <div>
            <Transition name="scale-y" mode="out-in">
              <div v-if="orderInput.shipToDifferentAddress" key="shipping-details">
                <h2 class="mb-4 text-xl font-semibold">{{ $t('messages.general.shippingDetails') }}</h2>
                <ShippingDetails v-model="customer.shipping as Record<string, any>" />
              </div>
              <div v-else key="no-shipping-details" class="h-0"></div>
            </Transition>
          </div>

          <!-- Shipping methods -->
          <div v-if="cart.availableShippingMethods && cart.availableShippingMethods.length > 0">
            <h3 class="mb-4 text-xl font-semibold">{{ $t('messages.general.shippingSelect') }}</h3>
            <ShippingOptions 
              v-if="cart.availableShippingMethods[0] && cart.availableShippingMethods[0].rates" 
              :options="cart.availableShippingMethods[0].rates || []" 
              :active-option="cart.chosenShippingMethods && cart.chosenShippingMethods[0] ? cart.chosenShippingMethods[0] : undefined" 
            />
          </div>

          <!-- Pay methods -->
          <div v-if="paymentGateways?.nodes.length" class="mt-2 col-span-full">
            <h2 class="mb-4 text-xl font-semibold">{{ $t('messages.billing.paymentOptions') }}</h2>
            
            <!-- Options de paiement (sans Stripe) -->
            <PaymentOptions v-model="orderInput.paymentMethod" class="mb-4" :paymentGateways />
            
            <!-- Élément Stripe (affiché uniquement pour les méthodes de paiement Stripe) -->
            <template v-if="orderInput.paymentMethod && (orderInput.paymentMethod.id === 'stripe' || orderInput.paymentMethod.id === 'woocommerce_payments') && stripe">
              <div class="mt-4 mb-2">
                <h3 class="mb-2 text-lg font-medium">Détails de la carte</h3>
                <div id="card-element" class="bg-white border rounded-md outline-none border-gray-300 shadow-sm w-full py-4 px-4">
                  <!-- Stripe Elements sera monté ici -->
                </div>
                <div v-if="errorMessage" class="mt-2 text-sm text-red-500">{{ errorMessage }}</div>
              </div>
            </template>
          </div>

          <!-- Order note -->
          <div>
            <h2 class="mb-4 text-xl font-semibold">{{ $t('messages.shop.orderNote') }} ({{ $t('messages.general.optional') }})</h2>
            <textarea
              id="order-note"
              v-model="orderInput.customerNote"
              name="order-note"
              class="w-full min-h-[100px]"
              rows="4"
              :placeholder="$t('messages.shop.orderNotePlaceholder')"></textarea>
          </div>
        </div>

        <OrderSummary>
          <button
            class="flex items-center justify-center w-full gap-3 p-3 mt-4 font-semibold text-center text-white rounded-lg shadow-md bg-primary hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-400"
            :disabled="isCheckoutDisabled">
            {{ buttonText }}<LoadingIcon v-if="isProcessingOrder" color="#fff" size="18" />
          </button>
        </OrderSummary>
      </form>
    </template>
    <LoadingIcon v-else class="m-auto" />
  </div>
</template>

<style lang="postcss">
.checkout-form input[type='text'],
.checkout-form input[type='email'],
.checkout-form input[type='tel'],
.checkout-form input[type='password'],
.checkout-form textarea,
.checkout-form select,
.checkout-form .StripeElement {
  @apply bg-white border rounded-md outline-none border-gray-300 shadow-sm w-full py-2 px-4;
}

.checkout-form input.has-error,
.checkout-form textarea.has-error {
  @apply border-red-500;
}

.checkout-form label {
  @apply my-1.5 text-xs text-gray-600 uppercase;
}

.checkout-form .StripeElement {
  padding: 1rem 0.75rem;
}
</style>
