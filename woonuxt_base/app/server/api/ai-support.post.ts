import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { question, orderId, email } = body

  // 1. Récupérer les infos de commande WooCommerce si besoin
  let orderInfo = ''
  if (orderId || email) {
    const woocommerceRes = await $fetch('https://roadclique.fr/wp-json/wc/v3/orders', {
      params: orderId ? { search: orderId } : { email },
      headers: {
        Authorization: 'Basic ' + Buffer.from(process.env.WOOCOMMERCE_CONSUMER_KEY + ':' + process.env.WOOCOMMERCE_CONSUMER_SECRET).toString('base64')
      }
    })
    orderInfo = JSON.stringify(woocommerceRes)
  }

  // 2. Appel à Groq
  const groqRes = await $fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: {
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: "Tu es un assistant de support livraison. Rassure le client, donne un suivi précis, réponds naturellement." },
        { role: 'user', content: `Question: ${question}\nInfos commande: ${orderInfo}` }
      ]
    }
  }) as any;

  // Vérification de structure et typage
  if (!groqRes || !groqRes.choices || !groqRes.choices[0]?.message?.content) {
    throw new Error('Réponse inattendue de Groq');
  }

  return { answer: groqRes.choices[0].message.content as string };
})
