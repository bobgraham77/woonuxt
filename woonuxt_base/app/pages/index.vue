<template>
  <main class="container mx-auto py-16">
    <section class="flex flex-col md:flex-row items-center justify-between bg-white rounded-xl shadow-lg p-8 md:p-16 min-h-[400px]">
      <!-- Bloc gauche : Texte -->
      <div class="flex-1 max-w-lg">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Découvrez Nos<br />Nouveautés 2025 </h1>
        <p class="text-gray-600 mb-8">
          Explorez notre sélection de produits pour vos aventures Printemps-Eté 2025.
        </p>
        <NuxtLink
          to="/product/obd2-wifi-pro-app-pc-ios-android-new"
          class="inline-block bg-black text-white px-8 py-3 rounded-full font-semibold shadow hover:bg-gray-800 transition"
        >
          Voir les Nouveautés
        </NuxtLink>
      </div>
      <!-- Bloc droit : Image -->
      <div class="flex-1 flex justify-center mt-12 md:mt-0">
        <img
          src="/images/New_OBDII.png"
          alt="Produit mis en avant"
          class="w-80 h-80 object-contain"
          loading="eager"
        />
      </div>
    </section>
  </main>
</template>