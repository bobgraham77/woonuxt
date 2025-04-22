<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';

const { cart } = useCart();
const props = defineProps({
  stripe: {
    type: Object as () => Stripe | null,
    required: true
  },
  amount: {
    type: Number,
    default: 0
  }
});

// Utiliser l'amount passé en prop ou calculer à partir du panier
const rawCartTotal = computed(() => {
  // Si un montant est fourni en prop, l'utiliser
  if (props.amount > 0) return props.amount;
  
  // Sinon, calculer à partir du panier
  if (!cart.value || !cart.value.rawTotal) return 0;
  const cartAmount = parseFloat(cart.value.rawTotal as string) * 100;
  return cartAmount > 0 ? cartAmount : 0;
});

const emit = defineEmits(['updateElement', 'error', 'complete']);
const elements = ref<StripeElements | null>(null);
const cardElement = ref<StripeCardElement | null>(null);
const isReady = ref(false);
const hasValidAmount = computed(() => rawCartTotal.value > 0);
const errorMessage = ref('');

interface StripeEvent {
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
  complete?: boolean;
}

// Surveiller les changements de montant pour recréer les éléments si nécessaire
watch(rawCartTotal, (newTotal, oldTotal) => {
  // Seulement recréer si le montant a changé significativement (plus de 1€)
  if (Math.abs(newTotal - oldTotal) > 100 && isReady.value) {
    createStripeElements();
  }
});

const createStripeElements = async () => {
  try {
    // Vérifier que Stripe est disponible
    if (!props.stripe) {
      errorMessage.value = 'Stripe n\'est pas initialisé';
      emit('error', 'Stripe n\'est pas initialisé');
      return;
    }
    
    // Vérifier que le montant est valide
    if (!hasValidAmount.value) {
      errorMessage.value = 'Montant invalide pour le paiement';
      emit('error', 'Montant invalide pour le paiement');
      return;
    }
    
    // Nettoyer les éléments existants si nécessaire
    if (cardElement.value) {
      try {
        cardElement.value.unmount();
      } catch (e) {
        console.error('Erreur lors du démontage de l\'élément de carte:', e);
      }
      cardElement.value = null;
    }
    
    // Créer les nouveaux éléments avec le montant actuel
    const options: { appearance: { theme: 'flat' | 'stripe' | 'night', variables: Record<string, string> } } = {
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#0570de',
          colorBackground: '#ffffff',
          colorText: '#30313d',
          colorDanger: '#df1b41',
          fontFamily: 'Ideal Sans, system-ui, sans-serif',
          spacingUnit: '2px',
          borderRadius: '4px'
        }
      }
    };
    
    // S'assurer que nous avons un montant valide pour Stripe
    const cartAmount = Math.round(rawCartTotal.value);
    console.log('Montant brut du panier:', rawCartTotal.value);
    console.log('Montant arrondi du panier:', cartAmount);
    
    // Créer les éléments Stripe avec les options correctes
    // Utiliser un montant de secours si le montant du panier n'est pas valide
    const elementsOptions = {
      mode: 'payment' as const,
      amount: cartAmount > 0 ? cartAmount : 1000, // Fallback to 10 EUR if no amount
      currency: 'eur'
    };
    console.log('Options Stripe prêtes:', elementsOptions);
    
    try {
      if (!props.stripe) {
        throw new Error('Stripe n\'est pas initialisé');
      }
      elements.value = props.stripe.elements(elementsOptions);
      console.log('Éléments Stripe créés avec succès');
    } catch (error) {
      console.error('Erreur lors de la création des éléments Stripe:', error);
      errorMessage.value = 'Erreur lors de la création des éléments Stripe';
      emit('error', errorMessage.value);
      return;
    }
    
    if (elements.value) {
      // Créer l'élément de carte
      cardElement.value = elements.value.create('card', { 
        hidePostalCode: true,
        style: {
          base: {
            color: '#32325d',
            fontFamily: '\"Helvetica Neue\", Helvetica, sans-serif',
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
      
      if (cardElement.value) {
        try {
          // Vérifier que l'élément DOM existe avant de monter
          const cardElementDom = document.getElementById('card-element');
          if (!cardElementDom) {
            console.error("L'élément DOM #card-element n'existe pas");
            errorMessage.value = 'Erreur lors du chargement du formulaire de paiement';
            emit('error', errorMessage.value);
            return;
          }
          
          // Monter l'élément de carte dans le DOM
          console.log("Montage de l'élément de carte dans le DOM");
          cardElement.value.mount('#card-element');
          console.log("Élément de carte monté avec succès");
          
          // Écouter les événements d'erreur
          cardElement.value.on('change', (event: StripeEvent) => {
            if (event.error) {
              let message = event.error.message;
              
              // Personnaliser les messages d'erreur
              switch(event.error.code) {
                case 'incomplete_number':
                  message = 'Le numéro de carte est incomplet';
                  break;
                case 'invalid_number':
                  message = 'Le numéro de carte n\'est pas valide';
                  break;
                case 'incomplete_expiry':
                  message = 'La date d\'expiration est incomplète';
                  break;
                case 'invalid_expiry':
                  message = 'La date d\'expiration n\'est pas valide';
                  break;
                case 'incomplete_cvc':
                  message = 'Le code de sécurité est incomplet';
                  break;
                case 'invalid_cvc':
                  message = 'Le code de sécurité n\'est pas valide';
                  break;
              }
              
              errorMessage.value = message;
              emit('error', { message, code: event.error.code, type: event.error.type });
            } else {
              errorMessage.value = '';
              if (event.complete) {
                emit('complete');
              }
            }
          });
          
          // Émettre l'élément mis à jour
          emit('updateElement', elements.value);
          isReady.value = true;
          console.log('Éléments Stripe créés avec succès');
        } catch (error: any) {
          console.error('Erreur lors du montage de l\'élément de carte:', error);
          errorMessage.value = error?.message || 'Erreur lors du montage de l\'élément de carte';
          emit('error', errorMessage.value);
        }
      } else {
        console.error('Impossible de créer l\'élément de carte');
        errorMessage.value = 'Impossible de créer l\'élément de carte';
        emit('error', errorMessage.value);
      }
    } else {
      console.error('Impossible de créer les éléments Stripe');
      errorMessage.value = 'Impossible de créer les éléments Stripe';
      emit('error', errorMessage.value);
    }
  } catch (error: any) {
    console.error('Erreur lors de la création des éléments Stripe:', error);
    errorMessage.value = error?.message || 'Erreur lors de l\'initialisation du formulaire de paiement';
    emit('error', errorMessage.value);
    isReady.value = false;
  }
};

// Exposer les méthodes et propriétés pour le composant parent
defineExpose({
  elements,
  cardElement,
  isReady,
  createStripeElements
});

onMounted(() => {
  // Attendre un court instant pour s'assurer que le DOM est prêt
  setTimeout(() => {
    createStripeElements();
  }, 100);
});
</script>

<template>
  <div>
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="hasValidAmount" id="card-element" class="mt-2">
      <!-- Elements will create form elements here -->
    </div>
  </div>
</template>

<style scoped>
.error-message {
  color: #e53e3e;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
  border-radius: 0.25rem;
  background-color: #fed7d7;
}
</style>
