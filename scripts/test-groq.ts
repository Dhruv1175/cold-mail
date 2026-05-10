import { generateEmailDraft } from '@/services/ai-generator';

async function test() {
  const draft = await generateEmailDraft({
    prospectName: 'Elon Musk',
    companyName: 'Tesla',
    signal: 'Just launched Cybertruck production line in Austin.',
    title: 'CEO',
  });
  console.log(draft);
}
test();