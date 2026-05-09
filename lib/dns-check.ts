import dns from 'dns/promises';
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function checkDomainHealth(domain: string) {
  try {
    const rootTxt = await dns.resolveTxt(domain);
    const flattenedRoot = rootTxt.flat();
    const hasSPF = flattenedRoot.some(r => r.toLowerCase().includes('v=spf1'));
    let hasDMARC = false;
    try {
      const dmarcTxt = await dns.resolveTxt(`_dmarc.${domain}`);
      const flattenedDmarc = dmarcTxt.flat();
      hasDMARC = flattenedDmarc.some(r => r.toLowerCase().includes('v=dmarc1'));
    } catch (err) {
      console.log(`No DMARC record for ${domain}`);
    }

    return { hasSPF, hasDMARC };
  } catch (error) {
    console.error(`DNS Query failed for ${domain}:`, error);
    return { hasSPF: false, hasDMARC: false };
  }
}