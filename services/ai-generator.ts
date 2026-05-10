import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
})

export async function generateEmailDraft(lead:{
 prospectName: string;
  companyName: string;
  signal: string;
  title: string;
}):Promise<string> {
    const prompt = `You are a B2B outreach expert. Write a short, personalised cold email (max 150 words).
Prospect: ${lead.prospectName}, ${lead.title} at ${lead.companyName}.
Signal: ${lead.signal}
The email must reference the signal naturally, include a clear value proposition, and end with a soft call to action (e.g., "Open to a quick chat?").
Do not use placeholders like [Company]. Write directly.`

const response = await groq.chat.completions.create({model: 'llama-3.3-70b-versatile',  // Groq's free model; you can also use 'mixtral-8x7b-32768'
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  });

    return response.choices[0]?.message?.content || '';
}