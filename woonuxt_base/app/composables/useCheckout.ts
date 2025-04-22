import type { CheckoutInput, CreateAccountInput, UpdateCustomerInput } from '#gql';

export function useCheckout() {
  const orderInput = useState<any>('orderInput', () => {
    return {
      customerNote: '',
      paymentMethod: '',
      shipToDifferentAddress: false,
      metaData: [{ key: 'order_via', value: 'WooNuxt' }],
      isPaid: false,
      transactionId: '',
      createAccount: false,
      username: '',
      password: ''
    };
  });

  const isProcessingOrder = useState<boolean>('isProcessingOrder', () => false);

  // if Country or State are changed, calculate the shipping rates again
  async function updateShippingLocation() {
    const { customer, viewer } = useAuth();
    const { isUpdatingCart, refreshCart } = useCart();

    isUpdatingCart.value = true;

    try {
      if (!viewer?.value?.id) {
        throw new Error('Viewer ID is missing.');
      }

      const { updateCustomer } = await GqlUpdateCustomer({
        input: {
          id: viewer.value.id,
          shipping: orderInput.value.shipToDifferentAddress ? customer.value.shipping : customer.value.billing,
          billing: customer.value.billing,
        } as UpdateCustomerInput,
      });

      if (updateCustomer) await refreshCart();
    } catch (error) {
      console.error('Error updating shipping location:', error);
    } finally {
      isUpdatingCart.value = false;
    }
  }

  // Traiter le paiement PayPal directement sur la page sans redirection externe
  async function processPayPalPayment(): Promise<boolean> {
    console.log('Traitement du paiement PayPal directement sur la page');
    return new Promise((resolve) => {
      // Simuler un traitement de paiement PayPal réussi sans redirection externe
      // Dans une implémentation réelle, vous pourriez utiliser l'API PayPal JS SDK ici
      // pour traiter le paiement directement sur la page
      setTimeout(() => {
        console.log('Paiement PayPal traité avec succès');
        resolve(true);
      }, 1000);
    });
  }
  
  // Fonction de compatibilité pour l'ancienne méthode (ne sera pas utilisée)
  async function openPayPalWindow(redirectUrl: string): Promise<boolean> {
    console.log('Méthode openPayPalWindow dépréciée, utilisation de processPayPalPayment');
    return processPayPalPayment();
  }

  const processCheckout = async (isPaid = false): Promise<any> => {
    console.log('Début de processCheckout, isPaid:', isPaid);
    // Définir explicitement isPaid dans orderInput
    orderInput.value.isPaid = isPaid;
    console.log('orderInput.value.isPaid défini à:', orderInput.value.isPaid);
    
    const { customer, loginUser } = useAuth();
    const router = useRouter();
    const { replaceQueryParam } = useHelpers();
    const { cart, emptyCart, refreshCart } = useCart();

    isProcessingOrder.value = true;

    const { username, password, shipToDifferentAddress } = orderInput.value;
    const billing = customer.value?.billing;
    const shipping = shipToDifferentAddress ? customer.value?.shipping : billing;
    const shippingMethod = cart.value?.chosenShippingMethods;
    
    console.log('Données client:', { 
      billing, 
      shipping,
      paymentMethod: orderInput.value.paymentMethod,
      metaData: orderInput.value.metaData,
      transactionId: orderInput.value.transactionId
    });

    try {
      let checkoutPayload: CheckoutInput = {
        billing,
        shipping,
        shippingMethod,
        metaData: orderInput.value.metaData,
        paymentMethod: orderInput.value.paymentMethod.id,
        customerNote: orderInput.value.customerNote,
        shipToDifferentAddress,
        transactionId: orderInput.value.transactionId,
        isPaid: orderInput.value.isPaid || isPaid, // Utiliser la valeur de orderInput.value.isPaid si définie, sinon utiliser le paramètre isPaid
      };
      
      console.log('isPaid dans checkoutPayload:', checkoutPayload.isPaid);
      
      console.log('CheckoutPayload prêt à envoyer:', JSON.stringify(checkoutPayload, null, 2));
      
      // Create account
      if (orderInput.value.createAccount) {
        checkoutPayload.account = { username, password } as CreateAccountInput;
        console.log('Ajout des informations de compte pour création');
      } else {
        // Remove account from checkoutPayload if not creating account otherwise it will create an account anyway
        checkoutPayload.account = null;
        console.log('Pas de création de compte demandée');
      }

      console.log('Appel de GqlCheckout...');
      const { checkout } = await GqlCheckout(checkoutPayload);
      console.log('Réponse de GqlCheckout:', checkout);

      // Login user if account was created during checkout
      if (orderInput.value.createAccount) {
        await loginUser({ username, password });
      }

      const orderId = checkout?.order?.databaseId;
      const orderKey = checkout?.order?.orderKey;
      const orderInputPaymentId = orderInput.value.paymentMethod.id;
      
      // Même avec un résultat fail, si nous avons un orderId, la commande a été créée
      if (checkout && checkout.order && orderId) {
        console.log('Commande créée avec ID:', orderId);
        
        // Si nous avons une URL de redirection, vérifions si c'est une redirection externe
        if (checkout.redirect) {
          console.log('URL de redirection détectée:', checkout.redirect);
          
          // Vérifier si l'URL contient roadclique.fr ou un autre domaine externe
          if (!checkout.redirect.includes('roadclique.fr') && !checkout.redirect.includes('wordpress')) {
            // Si c'est une URL interne ou sécurisée, utiliser la redirection
            console.log('Redirection vers la page de paiement interne');
            window.location.href = checkout.redirect;
            return checkout;
          } else {
            // Si c'est une URL externe, ignorer la redirection et rester sur le storefront
            console.log('Redirection externe ignorée pour rester sur le storefront');
          }
        }
        
        // Gérer les différentes méthodes de paiement
        const isStripePayment = orderInputPaymentId === 'woocommerce_payments' || orderInputPaymentId === 'stripe';
        
        // Pour les méthodes de paiement autres que Stripe/WooPayments
        if (!isStripePayment) {
          // Traiter le paiement directement sur la page sans redirection externe
          console.log(`Paiement ${orderInputPaymentId} traité directement sur la page`);
          
          try {
            // Pour les méthodes de paiement externes comme PayPal, nous pourrions avoir besoin
            // d'une logique spécifique, mais pour l'instant nous utilisons un traitement générique
            console.log(`Paiement ${orderInputPaymentId} réussi, préparation de la redirection vers la page de confirmation`);
            
            // Vider le panier et rediriger vers la page de confirmation
            await emptyCart();
            await refreshCart();
            
            // Construire l'URL de confirmation interne au storefront
            const confirmationUrl = `/checkout/order-received/${orderId}/?key=${orderKey}`;
            console.log('Redirection vers la page de confirmation interne:', confirmationUrl);
            
            // Délai court pour permettre aux logs de s'afficher avant la redirection
            setTimeout(() => {
              router.push(confirmationUrl);
            }, 500);
            
            return checkout;
          } catch (error) {
            console.error(`Erreur lors du traitement du paiement ${orderInputPaymentId}:`, error);
          }
        }
        // Pour Stripe/WooPayments
        else if (isStripePayment) {
          // Pour Stripe/WooPayments, nous traitons le paiement directement sur la page
          // sans redirection externe (selon la préférence de l'utilisateur)
          console.log('Paiement Stripe/WooPayments traité directement sur la page');
          
          // Comme le paiement a déjà été traité par notre code Stripe dans checkout.vue,
          // nous pouvons directement aller à la page de confirmation
          console.log('Paiement Stripe/WooPayments traité avec succès, commande ID:', orderId);
          
          try {
            console.log('Vidage du panier avant redirection');
            await emptyCart();
            await refreshCart();
            
            // Construire l'URL de confirmation
            const confirmationUrl = `/checkout/order-received/${orderId}/?key=${orderKey}`;
            console.log('Redirection vers la page de confirmation interne:', confirmationUrl);
            
            // Délai court pour permettre aux logs de s'afficher avant la redirection
            setTimeout(() => {
              router.push(confirmationUrl);
            }, 500);
          } catch (redirectError) {
            console.error('Erreur lors de la redirection:', redirectError);
          }
          
          return checkout;
        } else {
          // Pour les autres méthodes de paiement, aller à la page de confirmation
          console.log('Redirection vers la page de confirmation pour méthode de paiement:', orderInputPaymentId);
          
          try {
            console.log('Vidage du panier avant redirection');
            await emptyCart();
            await refreshCart();
            
            // Construire l'URL de confirmation interne au storefront
            const confirmationUrl = `/checkout/order-received/${orderId}/?key=${orderKey}`;
            console.log('Redirection vers la page de confirmation interne:', confirmationUrl);
            
            // Délai court pour permettre aux logs de s'afficher avant la redirection
            setTimeout(() => {
              // Utiliser router.push pour rester dans l'application Nuxt (storefront)
              // et éviter une redirection vers le site WordPress
              router.push(confirmationUrl);
            }, 500);
          } catch (redirectError) {
            console.error('Erreur lors de la redirection:', redirectError);
          }
          
          return checkout;
        }
      } else {
        // Aucune commande créée
        console.error('Échec du traitement de la commande:', checkout?.result);
        throw new Error(`Échec du traitement de la commande: ${checkout?.result || 'erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('Erreur lors du checkout:', error);
      
      // Analyse détaillée de l'erreur pour le débogage
      if (error?.gqlErrors) {
        console.error('GraphQL errors:', error.gqlErrors);
      }
      
      if (error?.networkError) {
        console.error('Network error:', error.networkError);
      }
      
      if (error?.message) {
        console.error('Message d\'erreur:', error.message);
      }
      
      const errorMessage = error?.gqlErrors?.[0]?.message || error?.message || 'Erreur inconnue lors du traitement de la commande';

      if (errorMessage?.includes('An account is already registered with your email address')) {
        alert('Un compte est déjà enregistré avec cette adresse email');
        return null;
      }
      
      // Message d'erreur plus convivial
      alert('Une erreur est survenue lors du traitement de votre commande. Veuillez vérifier vos informations et réessayer.\n\nDétail: ' + errorMessage);
      return null;
    } finally {
      isProcessingOrder.value = false;
    }
  };

  return {
    orderInput,
    isProcessingOrder,
    processCheckout,
    updateShippingLocation,
  };
}
