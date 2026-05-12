import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request){
    console.log("Notification API called");
    const {event,data,recipient} = await request.json();
    if (event === "scrape.completed"){
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: recipient || 'your-email@example.com',
            subject: `✅ Scraping Complete: ${data.newLeads} new leads found`,
                html: `<p>Scraping finished at ${new Date().toLocaleString()}</p>
                        <p>Total leads in database: ${data.totalLeads}</p>
                        <p>New leads added: ${data.newLeads}</p>`
    })}
      return NextResponse.json({ received: true });
}