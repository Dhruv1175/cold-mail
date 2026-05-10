import {NextResponse} from 'next/server';
import {scrapeYCombinator} from '@/services/scraper';

export async function GET(){
    try{
        await scrapeYCombinator();
        return NextResponse.json({success:true,message:"Scraping completed successfully"});
    }
    catch(error){
        console.error("Scrape API error",error)
        return NextResponse.json({success:false,error:String(error)}, {status:500});
    }
}