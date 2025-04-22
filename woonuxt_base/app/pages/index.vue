<template>
  <main class="container mx-auto py-16">
    <section class="flex flex-col md:flex-row items-center justify-between bg-white rounded-xl shadow-lg p-8 md:p-16 min-h-[400px]">
      <!-- Bloc gauche : Texte -->
      <div class="flex-1 max-w-lg">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Découvrez notre<br />Collection Sélectionnée</h1>
        <p class="text-gray-600 mb-8">
          Explorez notre sélection de produits soigneusement choisis pour votre maison et votre style de vie.
        </p>
        <NuxtLink
          to="/product/telechargez-votre-application-obd2-wifi-pro"
          class="inline-block bg-black text-white px-8 py-3 rounded-full font-semibold shadow hover:bg-gray-800 transition"
        >
          Voir le produit
        </NuxtLink>
      </div>
      <!-- Bloc droit : Image -->
      <div class="flex-1 flex justify-center mt-12 md:mt-0">
        <img
          src="/images/hero-mug.png"
          alt="Produit mis en avant"
          class="w-80 h-80 object-contain"
          loading="eager"
        />
      </div>
    </section>
  </main>
</template>