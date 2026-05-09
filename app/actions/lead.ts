"use server";
import {prisma} from "@/lib/prisma";
import {checkDomainHealth} from "@/lib/dns-check";
import {revalidatePath} from "next/cache";


export async function createLead(formData:FormData){
    const website = formData.get("website") as string;
    const domain = website
  .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
  .split('/')[0]; 

console.log("Checking domain:", domain);

    const health = await checkDomainHealth(domain);

    await prisma.lead.create({
        data:{
            companyName: formData.get("companyName") as string,
            website:website,
            prospectName: formData.get("prospectName") as string,
            title: formData.get("title") as string,
            signal: formData.get("signal") as string,
            status:'DISCOVERED',
            deliverability: health
        }
    }),
    revalidatePath('/');
}