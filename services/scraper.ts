import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { checkDomainHealth } from "@/lib/dns-check";
import { generateEmailDraft } from "@/services/ai-generator";
import { cleanDomain } from "@/lib/utils";

export async function scrapeYCombinator(): Promise<void> {
  console.log("[SCRAPER] Starting...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("[SCRAPER] Navigating to YC companies page...");
    await page.goto("https://www.ycombinator.com/companies", { waitUntil: "networkidle0" });
    await page.waitForSelector('a[href^="/companies/"]', { timeout: 10000 });
    console.log("[SCRAPER] Found company links");

    const companies = await page.$$eval('a[href^="/companies/"]', (elements) => {
      return elements.slice(0, 10).map(el => {
        const nameSpan = el.querySelector('[class^="_coName"]');
        const name = nameSpan?.textContent?.trim() || '';
        const descDiv = el.querySelector('.mb-1\\.5.text-sm span');
        const signal = descDiv?.textContent?.trim() || 'Listed on Y Combinator';
        const href = el.getAttribute('href') || '';
        return { name, signal, href };
      });
    });

    let insertedCount = 0;
    for (const company of companies) {
      if (!company.name || !company.href) continue;

      const detailUrl = `https://www.ycombinator.com${company.href}`;
      console.log(`\n[SCRAPER] Processing: ${company.name}`);
      await page.goto(detailUrl, { waitUntil: "networkidle0" });

      // --- Better website extraction ---
      let website = '';
      try {
      
        const websiteEl = await page.$('a[href^="http"]:not([href*="ycombinator.com"]):not([href*="startupschool.org"])');
        if (websiteEl) {
          website = await websiteEl.evaluate(el => el.getAttribute('href')) || '';
        }
        // Fallback: if still empty, look for any link with "visit" or "website" in its text
        if (!website) {
          const fallbackEl = await page.$('a:has-text("website"), a:has-text("Visit")');
          if (fallbackEl) {
            website = await fallbackEl.evaluate(el => el.getAttribute('href')) || '';
          }
        }
        console.log(`[SCRAPER] Extracted website: ${website}`);
      } catch (err) {
        console.log(`[SCRAPER] Could not find website for ${company.name}`);
      }

      if (!website) {
        console.log(`[SCRAPER] Skipping ${company.name} – no website found`);
        continue;
      }

      const domain = cleanDomain(website);
      if (!domain) {
        console.log(`[SCRAPER] Invalid domain after cleaning: ${website}`);
        continue;
      }
      let prospectName = "Founder";
      let title = "CEO";
      try {
        // Look for founder names inside a specific container
        const founderEl = await page.$('.space-y-2 a, .font-bold a, [class*="founder"] a');
        if (founderEl) {
          prospectName = await founderEl.evaluate(el => el.textContent) || "Founder";
        }
      } catch (err) {
        console.log(`[SCRAPER] Founder not found for ${company.name}`);
      }

      const deliverability = await checkDomainHealth(domain);
      const emailDraft = await generateEmailDraft({
        prospectName,
        companyName: company.name,
        signal: company.signal,
        title,
      });

      await prisma.lead.upsert({
        where: { website: domain },
        update: {
          companyName: company.name,
          prospectName,
          title,
          signal: company.signal,
          emailDraft,
          deliverability,
          status: 'DISCOVERED',
        },
        create: {
          companyName: company.name,
          website: domain,
          prospectName,
          title,
          signal: company.signal,
          emailDraft,
          deliverability,
          status: 'DISCOVERED',
        },
      });


      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`\n[SCRAPER] Finished. Inserted/updated ${insertedCount} leads.`);
  } catch (error) {
    console.error('[SCRAPER] Fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}