import {createLead} from "@/app/actions/lead";
import {prisma} from "@/lib/prisma";
import { Lead } from "@/types";
import { sendEmailAction } from "@/services/send-email";

export default async function Home() {
  const leads = await prisma.lead.findMany({
  orderBy: { createdAt: 'desc' },
  include: {
    evaluations: {
      orderBy: { createdAt: 'desc' },
      take: 1,  // only the most recent evaluation
    },
  },
});
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Lead Discovery Engine</h1>
      
      {/* Manual Entry Form */}
      <form action={createLead} className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-lg mb-8 text-black border-black">
        <input name="companyName" placeholder="Company Name" className="p-2 border rounded" required />
        <input name="website" placeholder="website.com" className="p-2 border rounded" required />
        <input name="prospectName" placeholder="Prospect Name" className="p-2 border rounded" required />
        <input name="prospectEmail" placeholder="Prospect Email (e.g., elon@tesla.com)" className="p-2 border rounded" required />
        <input name="title" placeholder="Job Title (e.g. CEO)" className="p-2 border rounded" required />
        <textarea name="signal" placeholder="Why are we reaching out?" className="p-2 border rounded col-span-2" required />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded col-span-2 hover:bg-blue-700">
          Analyze & Add Lead
        </button>
      </form>

      {/* Leads Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
  <tr className="border-b">
    <th className="p-2">Company</th>
    <th className="p-2">Email Draft (preview)</th>
    <th className="p-2">Status</th>
    <th className="p-2">Health (SPF/DMARC)</th>
    <th className="p-2">Quality Score</th>
    <th className="p-2">Actions</th>
  </tr>
</thead>
<tbody>
  {leads.map((lead) => (
    <tr key={lead.id} className="border-b ">
      <td className="p-2 font-medium">{lead.companyName}</td>
      <td className="p-2 text-sm text-gray-600">
        {lead.emailDraft ? lead.emailDraft.slice(0, 100) + "…" : "—"}
      </td>
      <td className="p-2 text-sm">{lead.status}</td>
      <td className="p-2">
        {lead.deliverability && typeof lead.deliverability === 'object' ? (
          <div className="flex gap-2">
            <span className={(lead.deliverability as any).hasSPF ? "text-green-600" : "text-red-600"}>SPF</span>
            <span className={(lead.deliverability as any).hasDMARC ? "text-green-600" : "text-red-600"}>DMARC</span>
          </div>
        ) : "Pending"}
      </td>
      <td className="p-2">
  {lead.evaluations && lead.evaluations.length > 0 ? (
    <span className={lead.evaluations[0].score >= 70 ? "text-green-600" : "text-red-600"}>
      {lead.evaluations[0].score}
    </span>
  ) : "—"}
</td>
<td className="p-2">
  <form action={sendEmailAction}>
    <input type="hidden" name="leadId" value={lead.id} />
    <button type="submit" className="bg-green-600 text-white px-2 py-1 rounded text-sm">
      Send Email
    </button>
  </form>
</td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </main>
  )  
}
