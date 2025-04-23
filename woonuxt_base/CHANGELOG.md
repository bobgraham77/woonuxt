## [2025-04-23] – Recent Improvements and Integrations

### Initial Project Setup and Stripe Integration (April 2025)

- Initialized the Nuxt 3 project and set up the base e-commerce template.
- Configured environment variables for secure API key management (`.env`).
- Integrated Stripe for payment processing:
  - Added and debugged Stripe payment elements and checkout logic.
  - Resolved issues with StripeElement component and ensured smooth payment flow.
  - Improved error handling and user feedback for payment failures.
- Set up WooCommerce API access with consumer key/secret for order management.
- Established project structure for pages, components, and server API endpoints.

### Product Page Enhancements

- Refactored product tabs: star ratings and review count now appear next to the "Reviews" tab.
- Removed the "Reviews" text, keeping only the stars and count for a cleaner interface.
- Added a label above the stars for clarity.

### Delivery Tracking

- Created a dedicated delivery tracking page (`/suivi-commande`) allowing users to check parcel status via the Parcel Panel API.
- Designed a form for entering tracking numbers and displaying shipment status.
- Linked the main menu's "Delivery Tracking" button to this page.

### WooCommerce Integration

- Configured WooCommerce API access with secure environment variables.

### AI Support Assistant (Marc)

- Added a conversational AI assistant named Marc, accessible on all pages.
- Integrated Groq API (model: `mixtral-8x7b-32768`) for natural language responses.
- Marc introduces himself, answers order and delivery questions, and reassures customers.
- Implemented a secure server-side endpoint to protect the Groq key and fetch WooCommerce order info if needed.
- Customized the chat UI with a welcome message, avatar, and user-friendly design.

### Security & Configuration

- Managed all sensitive API keys in `.env` (Groq, WooCommerce, Parcel Panel).
- Ensured `.gitignore` prevents secrets from being committed.

### Other

- Provided detailed instructions for connecting pages, configuring APIs, and testing features.
- Fixed bugs and improved error handling in the AI support endpoint.
- Enhanced the chat experience with a personalized avatar, name, and prompt for Marc.

---

## [2025-04-23] – Améliorations et intégrations récentes

### Fonctionnalités produit

- Refonte des onglets produit : affichage des étoiles de notation et du nombre d’avis à côté de l’onglet "Avis".
- Suppression du texte "Reviews" pour ne laisser que les étoiles et le nombre d’avis.
- Ajout du libellé "Avis" au-dessus des étoiles pour plus de clarté.

### Suivi de livraison

- Création d’une page de suivi de livraison `/suivi-commande` permettant de suivre un colis via l’API Parcel Panel.
- Formulaire pour saisir un numéro de suivi et affichage du statut du colis.
- Connexion du bouton "Suivi de Livraison" du menu principal à cette page.

### Intégration WooCommerce

- Configuration de l’accès WooCommerce via variables d’environnement sécurisées.

### Assistant IA de support (Marc)

- Ajout d’un assistant IA conversationnel ("Marc") accessible sur toutes les pages.
- Utilisation de l’API Groq (modèle `mixtral-8x7b-32768`) pour générer des réponses naturelles.
- Marc se présente, répond aux questions sur les commandes et rassure les clients.
- Endpoint sécurisé côté serveur pour protéger la clé Groq et interroger l’API WooCommerce si besoin.
- Message de bienvenue et personnalisation de l’interface du chat.

### Sécurité & configuration

- Ajout des clés API dans le fichier `.env` (Groq, WooCommerce, Parcel Panel).
- Respect du `.gitignore` pour ne pas versionner les secrets.

### Divers

- Instructions détaillées pour la connexion des pages, la configuration et le test des fonctionnalités.
- Correction de bugs et gestion des erreurs dans l’API IA.
- Amélioration de l’expérience utilisateur sur le chat IA (avatar, nom, prompt personnalisé).

---

# Change Log

All notable changes to this project will be documented in this file. I'll try my best to keep it updated.

## v4.0.16 (22-07-2024)`

- feature: Add option showMoveToWishlist #192
- feature: Add browse product button to empty cart #194
- feature: Add autoComplete to multiple forms #200
- refactor: Reduce the number of API call on checkout page
- fix: Order terms order #191
- fix: link in lost-password #195
- fix: Initial country value for states #197
- chore: Add @nuxt/icon module for icon support
- chore: Update ShippingOptions component with currency symbol from runtime config
- chore: Update npm dependencies to latest versions
- chore: Update `.env.example` #190
- chore: Refactor QuantityInput component
- chore: Other minor improvements and bug fixes

## v4.0.6 (4-07-2024)`

- Add user avatar and email to sidebar of account page
- Add Wishlist to my account page
- Add ResetPassword from email #180
- Add new Nuxt `compatibilityDate`

## v4.0.5 (4-07-2024)

- Handle server errors in useGqlError callback
- Improve order summary page layout and styling
- Add null check for date in formatDate function
- Better TypeScript types in index.d.ts
- Add error logging for GraphQL queries in useAuth.ts
- Updated queries & fragment

## v4.0.4 (4-07-2024)

- Fix downloadable products not showing on the correct order summary page

## v4.0.3 (1-07-2024)

- Add Downloads List #177
- Add option to show/hide Breadcrumb on SingleProduct #181

## v4.0.2 (29-06-2024)

- Add more options to `app.config.ts` #178

## v4.0.1 (26-06-2024)

- Add option showReviews #176
- Update `nuxt-graphql-client` to v0.2.35

## v4.0.0 (19-06-2024)

- Enable Nuxt 4 compatibility option in `nuxt.config.js`
- Updated folder structure to new `app` directory. See [New Directory Structure](https://nuxt.com/docs/getting-started/upgrade#new-directory-structure)
- Update dependencies
- Add `app.config.ts` with some default values. Note, this will be expanded in future versions to include more configuration options.
- App Popular products section to the home page
- Minor TS improvements
- Add `#constants` and `#woo` aliases to `nuxt.config.js`. The `#woo` aliase is useful for importing WooCommerce GraphQL types and enums generated by `nuxt-graphql-client` codegen.
- WooNuxt v3 will still be available in the [v3 branch](https://github.com/scottyzen/woonuxt/tree/v3)

# 3.6.2 (20-05-2024)

Add `AUTO_OPEN_CART` to `.env` to automatically open the cart when adding a product to the cart.

# 3.6.1 (17-05-2024)

## CHANGES

- Handle login error and improve error message in `useAuth.ts`
- Remove `formatURI` function
- Minor TypeScript improvements
- Update checkout page to use TypeScript in script setup block
- Add `logGQLError` & `clearAllLocalStorage` helper functions
- Update npm dependencies for `@nuxt/image` and `@stripe/stripe-js`

# 3.6.0 (27-04-2024)

## CHANGES

- Updated dependencies
- Fix images not loading on Netlify
- Add users avatar to the header when logged in
- Add placeholder fot category and product images
- Add basic `error.vue` page

# 3.5.0

## CHANGES (19-04-2024)

- Update styling of PriceFilter component
- Switch slider to Primevue
- Update hover text color in Filters component
- Add keep-alive to NuxtPage (Improves DX)
- fetchAllProducts to get all products
- Updated dependencies

## 3.4.27 (06-04-2024)

### Bug Fixes

- The default variation is now respected. Also, if there are no defaults set, the first of each attribute is selected. IMO I think that is better than having the user select the first option for each attribute. [#141](https://github.com/scottyzen/woonuxt/issues/141)

## 3.4.26 (06-04-2024)

### Bug Fixes

- Fix bug where a product variation that wasn't available was able to be added to the cart.
- Product gallery showing not all variations and won't change image [#139](https://github.com/scottyzen/woonuxt/issues/139)
