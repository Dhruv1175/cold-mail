import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
})

export async function evaluateEmailDraft(emailDraft: string, signal:string):Promise<{
    score:number;
    criteria: { personalisation: number; clarity: number; cta: number; length: number; tone: number };
    feedback: string;
}>{
    const prompt = `
You are an expert B2B cold email evaluator. Score the following email draft based on:

1. Personalisation (0-20): Does it directly reference the provided signal?
2. Clarity (0-20): Is the value proposition clear in one sentence?
3. Call-to-Action (0-20): Is there a soft, specific next step?
4. Length (0-20): Is it under 150 words? (Score 20 if yes)
5. Tone (0-20): Is it respectful, professional, not spammy?

Email draft:
"""
${emailDraft}
"""

Relevant signal: "${signal}"

Return ONLY JSON: { "score": total (0-100), "criteria": { "personalisation": 0-20, "clarity": 0-20, "cta": 0-20, "length": 0-20, "tone": 0-20 }, "feedback": "short improvement tips" }
`;

const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',  // Groq's free model; you can also use 'mixtral-8x7b-32768'
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
})

const content = response.choices[0]?.message?.content || '{}';
return JSON.parse(content);

}