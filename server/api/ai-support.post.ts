import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    let { question, orderId, email } = body

    // Extraction automatique d'un email ou d'un numéro de commande depuis la question
    if (!orderId) {
      const orderIdMatch = question.match(/\b\d{4,}\b/)
      if (orderIdMatch) orderId = orderIdMatch[0]
    }
    if (!email) {
      const emailMatch = question.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) email = emailMatch[0]
    }

    // 1. Récupérer les infos de commande WooCommerce si besoin
    let orderInfo = ''
    if (orderId || email) {
      const woocommerceRes = await $fetch('https://roadclique.fr/wp-json/wc/v3/orders', {
        params: orderId ? { search: orderId } : { email },
        headers: {
          Authorization: 'Basic ' + Buffer.from(process.env.WOOCOMMERCE_CONSUMER_KEY + ':' + process.env.WOOCOMMERCE_CONSUMER_SECRET).toString('base64')
        }
      })
      console.log('Réponse WooCommerce:', woocommerceRes);
      if (Array.isArray(woocommerceRes) && woocommerceRes.length > 0) {
        const commande = woocommerceRes[0];
        const statut = commande.status;
        const date = commande.date_created ? new Date(commande.date_created).toLocaleDateString('fr-FR') : '';
        const montant = commande.total;
        const client = `${commande.billing?.first_name || ''} ${commande.billing?.last_name || ''}`.trim();
        orderInfo = `Statut: ${statut}, Date: ${date}, Montant: ${montant}€, Client: ${client}`;
      } else {
        orderInfo = "Aucune commande trouvée.";
      }
    }

    // 2. Appel à Groq
    const groqRes = await $fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: {
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: "Tu es un assistant de support livraison. Si des infos de commande sont fournies (statut, date, montant, client), résume-les clairement et humainement pour le client. Si la commande est annulée, explique-le explicitement. Tes réponses doivent être courtes, précises et naturelles, sans redemander le numéro de commande si l'info est présente." },
          { role: 'user', content: `Question: ${question}\nInfos commande: ${orderInfo}` }
        ]
      }
    }) as any;

    // Vérification de structure et typage
    if (!groqRes || !groqRes.choices || !groqRes.choices[0]?.message?.content) {
      throw new Error('Réponse inattendue de Groq');
    }

    console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY);
    return { answer: groqRes.choices[0].message.content as string };
  } catch (error: any) {
    // Log l'erreur détaillée côté serveur
    console.error('Erreur SupportAssistant:', error?.response?._data || error);
    // Retourne une erreur lisible côté client (détail Groq si dispo)
    return {
      answer: "Désolé, une erreur est survenue côté serveur : " + (error?.response?._data?.error?.message || error?.message || error?.toString() || 'Erreur inconnue')
    }
  }
})
