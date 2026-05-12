"use server";
import { prisma } from "@/lib/prisma";
import { checkDomainHealth } from "@/lib/dns-check";
import { revalidatePath } from "next/cache";
import { generateEmailDraft } from "@/services/ai-generator";
import { cleanDomain } from "@/lib/utils";
import { evaluateEmailDraft } from "@/services/email-evaluator";

export async function createLead(formData: FormData) {
  const website = formData.get("website") as string;
  const domain = cleanDomain(website);
  console.log("Checking domain:", domain);

  const health = await checkDomainHealth(domain);
  const existing = await prisma.lead.findUnique({ where: { website: domain } });
  if (existing) {
    return { success: false, message: "Lead already exists" };
  }

  // Extract all fields first
  const prospectEmail = formData.get("prospectEmail") as string;
  const prospectName = formData.get("prospectName") as string;
  const companyName = formData.get("companyName") as string;
  const signal = formData.get("signal") as string;
  const title = formData.get("title") as string;

  const emailDraft = await generateEmailDraft({
    prospectName,
    companyName,
    signal,
    title,
  });

  const newLead = await prisma.lead.create({
    data: {
      companyName,
      website,
      prospectName,
      title,
      signal,
      status: "DISCOVERED",
      deliverability: health,
      emailDraft,
      prospectEmail
    },
  });

  // Evaluate the email draft and store the score
  const evaluation = await evaluateEmailDraft(emailDraft, signal);
  await prisma.evaluation.create({
    data: {
      leadId: newLead.id,
      score: evaluation.score,
      criteria: evaluation.criteria,
      feedback: evaluation.feedback,
    },
  });

  revalidatePath("/");
  return { success: true, message: "Lead created" };
}