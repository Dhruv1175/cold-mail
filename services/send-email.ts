"use server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailAction(formData: FormData) {
  const leadId = formData.get("leadId") as string;
  console.log("Sending for lead:", leadId);

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || !lead.emailDraft) {
    return { success: false, message: "Lead or email draft not found" };
  }

  const recipientEmail = formData.get("email") as string ||"ashserena1947@gmail.com";
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: recipientEmail,
    subject: `Opportunity with ${lead.companyName}`,
    html: lead.emailDraft.replace(/\n/g, "<br>"),
  });

  console.log("Resend response:", { data, error });
  if (error) {
    console.error("Resend error:", error);
    return { success: false, message: error.message };
  }
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "DRAFTED" },
  });
  console.log("Status updated to DRAFTED");

  revalidatePath("/");
  return { success: true, message: "Email sent successfully" };
}