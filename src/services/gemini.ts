import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function getConsultationResponse(messages: { role: 'user' | 'assistant', content: string }[]) {
  const model = "gemini-3-flash-preview";
  const ai = getAI();
  
  const systemInstruction = `You are a helpful and professional health consultant for SUSSEX PHARMCY Freetown Sierra Leone, located at 22 Sussex Peninsular Road, Freetown, Sierra Leone (Telephone: 078386123 / 033327227). 
  Your goal is to provide basic health advice, explain over-the-counter medications, and help users understand their symptoms.
  
  CRITICAL GUIDELINES:
  - ALWAYS clearly state that you are an AI assistant, not a human doctor or pharmacist.
  - NEVER provide a definitive diagnosis or suggest changes to prescription medications.
  - ALWAYS advise seeing a professional doctor for serious symptoms or prescription drugs.
  - Be culturally sensitive and aware of the local clinical and health context in Freetown and Sierra Leone.
  - Keep responses concise and practical.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: messages.map(m => ({ 
        role: m.role === 'assistant' ? 'model' : 'user', 
        parts: [{ text: m.content }] 
      })),
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
}

export async function summarizeConsultation(messages: { role: 'user' | 'assistant', content: string }[]) {
  const model = "gemini-3-flash-preview";
  const ai = getAI();
  
  const systemInstruction = `You are a professional medical scribe. Your task is to provide a concise, structured summary of a pharmacist-patient consultation.
  
  Format the summary precisely using standard Markdown:
  - Use **bold headers** for each section.
  - Use bullet points where appropriate.
  
  Required Sections:
  1. **### CHIEF COMPLAINT**
     - Brief statement of why the user is seeking advice.
  2. **### KEY SYMPTOMS**
     - Bulleted list of symptoms mentioned.
  3. **### ADVICE GIVEN**
     - Summary of the AI assistant's core recommendations and warnings.
  4. **### URGENCY & NEXT STEPS**
     - Clear indicator of medical urgency (Low/Medium/High) and specific next steps.
  
  Keep the language professional, clinical, and under 200 words.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [{ text: `Summarize this clinical conversation: \n\n${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}` }]
      }],
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Summarization Error:", error);
    throw error;
  }
}

export async function checkDrugInteractions(
  cartItems: { name: string, genericName?: string, manufacturer?: string }[],
  customer: { medicalHistory?: string, allergies?: string[] }
) {
  const model = "gemini-3-flash-preview";
  const ai = getAI();

  const systemInstruction = `You are a clinical pharmacology assistant. Your task is to identify potential drug-drug interactions or drug-allergy contraindications.
  
  CONTEXT:
  - Current Cart Items: List of medications the patient is purchasing.
  - Patient History: Allergies and existing conditions/medications.
  
  RESPONSE FORMAT (Strict Markdown):
  - Use **### WARNING** for serious interactions or contraindications.
  - Use **### ADVICE** for general precautions or mild interactions.
  - If no issues are found, explicitly say "No significant interactions or contraindications found based on provided history."
  
  CRITICAL:
  - Be specific about which drug interacts with what.
  - Focus on patient safety.
  - Keep it clinical and concise.
  - Remind the user to always consult a human pharmacist for final verification.`;

  const prompt = `
    CART ITEMS:
    ${cartItems.map(item => `- ${item.name} ${item.genericName ? `(${item.genericName})` : ''}`).join('\n')}
    
    PATIENT HISTORY:
    Allergies: ${customer.allergies?.join(', ') || 'None reported'}
    Conditions/Meds: ${customer.medicalHistory || 'None reported'}
    
    Please analyze for potential drug-drug or drug-allergy interactions.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Drug Interaction Check Error:", error);
    return "Error performing drug interaction check. Please verify manually.";
  }
}

export async function forecastStockNeeds(
  currentInventory: { name: string, stockLevel: number, category: string }[],
  salesHistory: { items: { name: string, quantity: number }[], timestamp: string }[]
) {
  const model = "gemini-3-flash-preview";
  const ai = getAI();

  const systemInstruction = `You are an AI inventory strategist for a pharmacy. Your goal is to analyze current stock and sales history to forecast future needs.
  
  CONTEXT:
  - Current Inventory: Listing names, current stock, and categories.
  - Sales History: Recent transactions with quantities and dates.
  
  RESPONSE FORMAT (Strict Markdown):
  1. **### FORECAST OVERVIEW**
     - Brief summary of stock health.
  2. **### PROJECTED LOW STOCK ALERTS**
     - List items that are likely to run out soon based on sales velocity.
  3. **### OPTIMIZATION TIPS**
     - Suggest restocking amounts or removing slow-moving items.
  
  Be concise, data-driven, and practical.`;

  const prompt = `
    CURRENT INVENTORY:
    ${currentInventory.map(i => `- ${i.name}: ${i.stockLevel} in stock (${i.category})`).join('\n')}
    
    RECENT SALES HISTORY:
    ${salesHistory.slice(0, 20).map(s => `- ${s.timestamp}: ${s.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`).join('\n')}
    
    Based on this data, provide a 30-day stock forecast and alerts.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Forecasting Error:", error);
    return "Unable to generate forecast at this time due to an error.";
  }
}
