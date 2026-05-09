export interface Lead{
    id:string;
    companyName:string;
    website:string;
    prospectName:string;
    title:string;
    signal:string;
    emailDraft?:string;
    status:'discovered' | 'researched' | 'drafted' | 'failed'
    deliverability:{
        spf:boolean;
        dkim:boolean;
        dmarc:boolean;
    }
}