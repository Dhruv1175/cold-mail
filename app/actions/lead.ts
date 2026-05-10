"use server";
import {prisma} from "@/lib/prisma";
import {checkDomainHealth} from "@/lib/dns-check";
import {revalidatePath} from "next/cache";
import {generateEmailDraft} from "@/services/ai-generator";
import {cleanDomain} from "@/lib/utils";


export async function createLead(formData:FormData){
    const website = formData.get("website") as string;
    const domain = cleanDomain(website);

console.log("Checking domain:", domain);

    const health = await checkDomainHealth(domain);
    const existing = await prisma.lead.findUnique({ where: { website: domain } });
if (existing) {
  // Optionally update instead of throwing error
  return { success: false, message: "Lead already exists" };
}

    const emailDraft = await generateEmailDraft({
        prospectName: formData.get("prospectName") as string,
        companyName: formData.get("companyName") as string,
        signal: formData.get("signal") as string,
        title: formData.get("title") as string,
    });

    await prisma.lead.create({
        data:{
            companyName: formData.get("companyName") as string,
            website:website,
            prospectName: formData.get("prospectName") as string,
            title: formData.get("title") as string,
            signal: formData.get("signal") as string,
            status:'DISCOVERED',
            deliverability: health,
            emailDraft: emailDraft,
        }
    }),
    revalidatePath('/');
}