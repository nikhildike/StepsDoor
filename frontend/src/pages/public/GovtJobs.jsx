/**
 * GovtJobs.jsx
 *
 * Public directory page mounted at `/govt-jobs` (see App.jsx). NOTE: this is
 * distinct from the scraped GovtJob listings shown via GovtJobDetail.jsx —
 * this page is a static, curated directory of official recruitment portal
 * links, split into Central Government bodies (CENTRAL_BODIES) and
 * State/UT departments (STATE_DEPARTMENTS), each card linking straight to
 * the official site (UPSC, SSC, state PSCs, police boards, etc.). Supports
 * central-category filtering, multi-select state checkboxes, and a search
 * that spans both sections regardless of the current sidebar selection.
 */
import { useState } from 'react'
import { ExternalLink, Building2, MapPin, ChevronDown, ChevronRight, Search } from 'lucide-react'

// Central Government recruitment bodies (UPSC, SSC, banking, railway,
// defence, PSUs, ports, health, education, research, judiciary), each
// linking directly to that body's official recruitment portal.
export const CENTRAL_BODIES = [
  // Civil Services
  { name: 'UPSC',             url: 'https://upsc.gov.in',                              desc: 'Union Public Service Commission',        category: 'Civil Services' },
  { name: 'SSC',              url: 'https://ssc.gov.in',                               desc: 'Staff Selection Commission',             category: 'Civil Services' },
  { name: 'NCS Portal',       url: 'https://www.ncs.gov.in',                           desc: 'National Career Service Portal',         category: 'Civil Services' },
  { name: 'Employment News',  url: 'https://www.employmentnews.gov.in',                desc: 'Weekly govt job gazette',                category: 'Civil Services' },
  // Banking
  { name: 'IBPS',             url: 'https://www.ibps.in',                              desc: 'Bank PO / Clerk / SO recruitment',       category: 'Banking' },
  { name: 'SBI Careers',      url: 'https://bank.sbi/web/careers',                    desc: 'State Bank of India',                    category: 'Banking' },
  { name: 'RBI',              url: 'https://opportunities.rbi.org.in',                desc: 'Reserve Bank of India',                  category: 'Banking' },
  { name: 'NABARD',           url: 'https://www.nabard.org/careers.aspx',              desc: 'Agriculture development bank jobs',      category: 'Banking' },
  { name: 'SIDBI',            url: 'https://www.sidbi.in/en/pages/careers',            desc: 'Small Industries Development Bank',      category: 'Banking' },
  // Railway
  { name: 'RRB (Railway)',    url: 'https://www.rrbapply.gov.in',                     desc: 'Railway Recruitment Boards',             category: 'Railway' },
  { name: 'RRC (Group D)',    url: 'https://www.rrcapply.gov.in',                     desc: 'Railway Recruitment Cells',              category: 'Railway' },
  { name: 'IRCON',            url: 'https://www.ircon.org/index.php/careers',          desc: 'Indian Railway Construction Co',         category: 'Railway' },
  // Defence & Paramilitary
  { name: 'Indian Army',      url: 'https://joinindianarmy.nic.in',                   desc: 'Army officer & soldier recruitment',     category: 'Defence' },
  { name: 'Indian Navy',      url: 'https://www.joinindiannavy.gov.in',               desc: 'Naval officer & sailor recruitment',     category: 'Defence' },
  { name: 'Indian Air Force', url: 'https://afcat.cdac.in',                           desc: 'AFCAT & officer entry',                  category: 'Defence' },
  { name: 'CRPF',             url: 'https://www.crpf.gov.in/recruitment.htm',         desc: 'Central Reserve Police Force',           category: 'Defence' },
  { name: 'BSF',              url: 'https://www.bsf.gov.in/recruitment.html',         desc: 'Border Security Force',                  category: 'Defence' },
  { name: 'CISF',             url: 'https://cisfrectt.cisf.gov.in',                   desc: 'Central Industrial Security Force',      category: 'Defence' },
  { name: 'ITBP',             url: 'https://www.itbpolice.nic.in/Recruitment',        desc: 'Indo-Tibetan Border Police',             category: 'Defence' },
  { name: 'SSB',              url: 'https://ssbrectt.gov.in',                         desc: 'Sashastra Seema Bal',                    category: 'Defence' },
  { name: 'Assam Rifles',     url: 'https://www.assamrifles.gov.in/recruitment',      desc: 'Assam Rifles recruitment',               category: 'Defence' },
  { name: 'Coast Guard',      url: 'https://joinindiancoastguard.cdac.in',            desc: 'Indian Coast Guard recruitment',         category: 'Defence' },
  { name: 'DRDO',             url: 'https://rac.gov.in',                              desc: 'Defence R&D Organisation',              category: 'Defence' },
  // PSU
  { name: 'ISRO',             url: 'https://www.isro.gov.in/Careers.html',            desc: 'Space & satellite jobs',                 category: 'PSU' },
  { name: 'ONGC',             url: 'https://ongcindia.com/web/eng/careers',           desc: 'Oil & Natural Gas Corporation',          category: 'PSU' },
  { name: 'NTPC',             url: 'https://www.ntpc.co.in/en/careers',              desc: 'National Thermal Power Corp',            category: 'PSU' },
  { name: 'BHEL',             url: 'https://www.bhel.com/career',                    desc: 'Bharat Heavy Electricals',               category: 'PSU' },
  { name: 'HAL',              url: 'https://hal-india.co.in/Career/pg/48',            desc: 'Hindustan Aeronautics Ltd',              category: 'PSU' },
  { name: 'Coal India',       url: 'https://www.coalindia.in/en-us/careers/career-with-cil.aspx', desc: 'Coal India Ltd',            category: 'PSU' },
  { name: 'FCI',              url: 'https://www.fci.gov.in/recruitments.php',         desc: 'Food Corporation of India',              category: 'PSU' },
  { name: 'BPCL',             url: 'https://www.bharatpetroleum.com/careers',         desc: 'Bharat Petroleum Corp Ltd',              category: 'PSU' },
  { name: 'GAIL',             url: 'https://www.gailonline.com/careers.html',         desc: 'Gas Authority of India',                 category: 'PSU' },
  { name: 'AAI',              url: 'https://www.aai.aero/en/careers',                desc: 'Airports Authority of India',            category: 'PSU' },
  { name: 'CWC',              url: 'https://cewacor.nic.in/recruitment.aspx',         desc: 'Central Warehousing Corporation',        category: 'PSU' },
  { name: 'IOCL',             url: 'https://iocl.com/careers',                       desc: 'Indian Oil Corporation Ltd',             category: 'PSU' },
  { name: 'HPCL',             url: 'https://hindustanpetroleum.com/careers',          desc: 'Hindustan Petroleum Corp Ltd',           category: 'PSU' },
  // Ports
  { name: 'Mumbai Port',      url: 'https://www.mumbaiport.gov.in',                  desc: 'Mumbai Port Authority',                  category: 'Ports' },
  { name: 'JNPA',             url: 'https://www.jnpa.gov.in',                         desc: 'Jawaharlal Nehru Port Authority',        category: 'Ports' },
  { name: 'Chennai Port',     url: 'https://www.chennaiport.gov.in',                 desc: 'Chennai Port Authority',                 category: 'Ports' },
  { name: 'Kolkata Port',     url: 'https://www.kolkataporttrust.gov.in',            desc: 'Syama Prasad Mookerjee Port',            category: 'Ports' },
  { name: 'Visakhapatnam Port', url: 'https://www.vizagport.com',                   desc: 'Visakhapatnam Port Authority',           category: 'Ports' },
  { name: 'Paradip Port',     url: 'https://www.paradipport.gov.in',                desc: 'Paradip Port Trust',                     category: 'Ports' },
  { name: 'Deendayal Port',   url: 'https://www.deendayalport.gov.in',              desc: 'Deendayal Port Authority, Kandla',       category: 'Ports' },
  { name: 'Cochin Port',      url: 'https://www.cochinport.gov.in',                 desc: 'Cochin Port Authority',                  category: 'Ports' },
  { name: 'New Mangalore Port', url: 'https://www.newmangaloreport.gov.in',         desc: 'New Mangalore Port Authority',           category: 'Ports' },
  { name: 'Mormugao Port',    url: 'https://www.mormugaoport.gov.in',               desc: 'Mormugao Port Trust, Goa',               category: 'Ports' },
  { name: 'VOCPT',            url: 'https://www.vocport.gov.in',                     desc: 'V.O. Chidambaranar Port, Tuticorin',    category: 'Ports' },
  { name: 'Kamarajar Port',   url: 'https://kamarajarport.in',                       desc: 'Kamarajar Port Ltd (Ennore)',            category: 'Ports' },
  // Health
  { name: 'AIIMS',            url: 'https://www.aiimsexams.ac.in',                   desc: 'All India Institute of Medical Sciences', category: 'Health' },
  { name: 'ESIC',             url: 'https://www.esic.in/recruitment',                desc: 'Employees State Insurance Corporation', category: 'Health' },
  { name: 'PGIMER',           url: 'https://pgimer.edu.in',                          desc: 'PGI Chandigarh — doctors & staff',      category: 'Health' },
  { name: 'NIMHANS',          url: 'https://nimhans.ac.in',                          desc: 'National Institute of Mental Health',   category: 'Health' },
  { name: 'JIPMER',           url: 'https://jipmer.edu.in',                          desc: 'JIPMER Puducherry recruitment',         category: 'Health' },
  // Education
  { name: 'KVS',              url: 'https://kvsangathan.nic.in/recruitment',          desc: 'Kendriya Vidyalaya Sangathan',          category: 'Education' },
  { name: 'NVS',              url: 'https://navodaya.gov.in/nvs/en/Recruitment/',     desc: 'Navodaya Vidyalaya Samiti',             category: 'Education' },
  { name: 'NTA',              url: 'https://nta.ac.in',                              desc: 'National Testing Agency (CBSE/UGC)',    category: 'Education' },
  { name: 'UGC / NET',        url: 'https://ugcnet.nta.ac.in',                       desc: 'UGC NET / JRF for teaching posts',      category: 'Education' },
  // Research
  { name: 'CSIR',             url: 'https://www.csir.res.in/careers',                desc: 'Council of Scientific & Industrial Research', category: 'Research' },
  { name: 'ICAR',             url: 'https://icar.org.in/recruitment',                desc: 'Indian Council of Agricultural Research', category: 'Research' },
  { name: 'ICMR',             url: 'https://www.icmr.gov.in/recruitment.html',       desc: 'Indian Council of Medical Research',    category: 'Research' },
  { name: 'BARC',             url: 'https://www.barc.gov.in/careers/',               desc: 'Bhabha Atomic Research Centre',         category: 'Research' },
  { name: 'NPCIL',            url: 'https://npcilcareers.co.in',                     desc: 'Nuclear Power Corporation of India',    category: 'Research' },
  // Judiciary
  { name: 'Supreme Court',    url: 'https://main.sci.gov.in/recruitment',            desc: 'Supreme Court of India — court staff',  category: 'Judiciary' },
  { name: 'High Court (NIC)', url: 'https://districts.ecourts.gov.in',               desc: 'District Courts — all states',         category: 'Judiciary' },
]

// Central body category -> Tailwind badge colour classes
const CATEGORY_COLORS = {
  'Civil Services': 'bg-blue-50 text-blue-700',
  'Banking':        'bg-green-50 text-green-700',
  'Railway':        'bg-orange-50 text-orange-700',
  'Defence':        'bg-red-50 text-red-700',
  'PSU':            'bg-violet-50 text-violet-700',
  'Ports':          'bg-cyan-50 text-cyan-700',
  'Health':         'bg-teal-50 text-teal-700',
  'Education':      'bg-lime-50 text-lime-700',
  'Research':       'bg-indigo-50 text-indigo-700',
  'Judiciary':      'bg-purple-50 text-purple-700',
}

// State-wise departments: PSC, police, judiciary, power, transport, education + others
const STATE_DEPARTMENTS = {
  'Andhra Pradesh': [
    { name: 'APPSC',           url: 'https://psc.ap.gov.in',                desc: 'AP Public Service Commission',              category: 'PSC' },
    { name: 'APSLPRB',         url: 'https://slprb.ap.gov.in',              desc: 'AP State Level Police Recruitment Board',   category: 'Police' },
    { name: 'AP High Court',   url: 'https://aphjc.nic.in',                 desc: 'Andhra Pradesh High Court recruitment',     category: 'Judiciary' },
    { name: 'APTRANSCO',       url: 'https://aptransco.gov.in',             desc: 'AP Power Transmission Corporation',         category: 'Power & Utilities' },
    { name: 'APSRTC',          url: 'https://www.apsrtc.gov.in',            desc: 'AP State Road Transport Corporation',       category: 'Transport' },
    { name: 'AP DSC',          url: 'https://apdsc.apcfss.in',             desc: 'AP District Selection Committee — teachers', category: 'Education' },
    { name: 'APSSDC',          url: 'https://apssdc.in',                   desc: 'AP State Skill Development Corp',           category: 'Other' },
  ],
  'Arunachal Pradesh': [
    { name: 'APPSC',           url: 'https://appsc.gov.in',                 desc: 'Arunachal Pradesh PSC',                    category: 'PSC' },
    { name: 'APSSB',           url: 'https://apssb.nic.in',                 desc: 'AP Staff Selection Board',                 category: 'Subordinate Board' },
    { name: 'AP Police',       url: 'https://www.google.com/search?q=Arunachal+Pradesh+Police+recruitment+official+website', desc: 'AP Police recruitment',   category: 'Police' },
    { name: 'Gauhati HC',      url: 'https://ghconline.gov.in',             desc: 'Gauhati HC — Arunachal Bench',             category: 'Judiciary' },
  ],
  'Assam': [
    { name: 'APSC',            url: 'https://apsc.nic.in',                  desc: 'Assam Public Service Commission',          category: 'PSC' },
    { name: 'SLRC Assam',      url: 'https://slrcassam.in',                 desc: 'State Level Recruitment Commission',       category: 'Subordinate Board' },
    { name: 'SLPRB Assam',     url: 'https://slprbassam.in',                desc: 'State Level Police Recruitment Board',     category: 'Police' },
    { name: 'Gauhati HC',      url: 'https://ghconline.gov.in',             desc: 'Gauhati High Court recruitment',           category: 'Judiciary' },
    { name: 'APDCL',           url: 'https://www.apdcl.org',               desc: 'Assam Power Distribution Company',         category: 'Power & Utilities' },
    { name: 'ASTC',            url: 'https://www.google.com/search?q=ASTC+Assam+State+Transport+Corporation+recruitment', desc: 'Assam State Transport Corp', category: 'Transport' },
  ],
  'Bihar': [
    { name: 'BPSC',            url: 'https://bpsc.bih.nic.in',              desc: 'Bihar Public Service Commission',          category: 'PSC' },
    { name: 'BSSC',            url: 'https://bssc.bihar.gov.in',            desc: 'Bihar Staff Selection Commission',         category: 'Subordinate Board' },
    { name: 'CSBC Bihar',      url: 'https://www.csbc.bih.nic.in',          desc: 'Central Selection Board — Police',         category: 'Police' },
    { name: 'Patna HC',        url: 'https://patnahighcourt.gov.in',        desc: 'Patna High Court recruitment',             category: 'Judiciary' },
    { name: 'BSPHCL',         url: 'https://www.bsphcl.bih.nic.in',       desc: 'Bihar State Power Holding Company',        category: 'Power & Utilities' },
    { name: 'BSRTC',           url: 'https://www.google.com/search?q=BSRTC+Bihar+State+Road+Transport+Corporation+recruitment', desc: 'Bihar State Road Transport Corp', category: 'Transport' },
    { name: 'Bihar TET / STET', url: 'https://www.google.com/search?q=Bihar+STET+teacher+recruitment+official', desc: 'Bihar Secondary Teacher Eligibility Test', category: 'Education' },
  ],
  'Chhattisgarh': [
    { name: 'CGPSC',           url: 'https://psc.cg.gov.in',               desc: 'CG Public Service Commission',             category: 'PSC' },
    { name: 'CG Vyapam',       url: 'https://vyapam.cgstate.gov.in',        desc: 'CG Professional Examination Board',        category: 'Subordinate Board' },
    { name: 'CG Police',       url: 'https://www.cgpolice.gov.in/recruitment', desc: 'Chhattisgarh Police recruitment',       category: 'Police' },
    { name: 'CG High Court',   url: 'https://highcourt.cg.gov.in',          desc: 'Chhattisgarh High Court recruitment',      category: 'Judiciary' },
    { name: 'CSPDCL',          url: 'https://www.cspdcl.co.in',             desc: 'CG State Power Distribution Company',      category: 'Power & Utilities' },
    { name: 'CG Teacher Recruitment', url: 'https://www.google.com/search?q=Chhattisgarh+teacher+recruitment+official', desc: 'CG Teacher eligibility & recruitment', category: 'Education' },
  ],
  'Delhi': [
    { name: 'DSSSB',           url: 'https://dsssb.delhi.gov.in',           desc: 'Delhi Subordinate Services Selection Board', category: 'Subordinate Board' },
    { name: 'Delhi Police',    url: 'https://www.delhipolice.gov.in',       desc: 'Delhi Police recruitment',                 category: 'Police' },
    { name: 'Delhi HC',        url: 'https://delhihighcourt.nic.in',        desc: 'Delhi High Court recruitment',             category: 'Judiciary' },
    { name: 'DMRC',            url: 'https://www.delhimetrorail.com/career.html', desc: 'Delhi Metro Rail Corporation',        category: 'Transport' },
    { name: 'DTC',             url: 'https://www.google.com/search?q=DTC+Delhi+Transport+Corporation+recruitment+official', desc: 'Delhi Transport Corporation', category: 'Transport' },
    { name: 'Delhi Jal Board', url: 'https://www.google.com/search?q=Delhi+Jal+Board+recruitment+official+careers', desc: 'Delhi Jal Board water utility', category: 'Power & Utilities' },
    { name: 'DoE Delhi',       url: 'https://www.edudel.nic.in',           desc: 'Delhi Directorate of Education — teacher posts', category: 'Education' },
  ],
  'Goa': [
    { name: 'GPSC',            url: 'https://gpsc.goa.gov.in',              desc: 'Goa Public Service Commission',            category: 'PSC' },
    { name: 'Goa SSB',         url: 'https://www.google.com/search?q=Goa+Staff+Selection+Board+recruitment+official', desc: 'Goa Staff Selection Board',  category: 'Subordinate Board' },
    { name: 'Goa Police',      url: 'https://www.goapolice.gov.in',         desc: 'Goa Police recruitment',                   category: 'Police' },
    { name: 'Bombay HC (Goa)', url: 'https://bombayhighcourt.nic.in',       desc: 'Bombay HC Panaji Bench recruitment',        category: 'Judiciary' },
    { name: 'GSIDC',           url: 'https://www.google.com/search?q=GSIDC+Goa+State+Infrastructure+Development+Corporation+recruitment', desc: 'Goa State Infrastructure Dev Corp', category: 'Other' },
    { name: 'KTC Goa',         url: 'https://www.google.com/search?q=Kadamba+Transport+Corporation+Goa+recruitment', desc: 'Kadamba Transport Corporation', category: 'Transport' },
  ],
  'Gujarat': [
    { name: 'GPSC',            url: 'https://gpsc.gujarat.gov.in',          desc: 'Gujarat Public Service Commission',        category: 'PSC' },
    { name: 'GSSSB',           url: 'https://gsssb.gujarat.gov.in',         desc: 'Gujarat Subordinate Services Selection Board', category: 'Subordinate Board' },
    { name: 'Gujarat Police (OJAS)', url: 'https://ojas.gujarat.gov.in',   desc: 'Gujarat Police recruitment — OJAS portal', category: 'Police' },
    { name: 'Gujarat HC',      url: 'https://gujarathighcourt.nic.in',      desc: 'Gujarat High Court recruitment',           category: 'Judiciary' },
    { name: 'UGVCL',           url: 'https://www.ugvcl.com',               desc: 'Uttar Gujarat Vij Company (Electricity)',  category: 'Power & Utilities' },
    { name: 'GSRTC',           url: 'https://gsrtc.in',                    desc: 'Gujarat State Road Transport Corp',        category: 'Transport' },
    { name: 'GUVNL',           url: 'https://www.guvnl.com/careers',        desc: 'Gujarat Urja Vikas Nigam Ltd',             category: 'Power & Utilities' },
    { name: 'Gujarat TET',     url: 'https://www.google.com/search?q=Gujarat+TET+teacher+eligibility+test+official', desc: 'Gujarat TET — teacher recruitment',  category: 'Education' },
  ],
  'Haryana': [
    { name: 'HPSC',            url: 'https://hpsc.gov.in',                  desc: 'Haryana Public Service Commission',        category: 'PSC' },
    { name: 'HSSC',            url: 'https://www.hssc.gov.in',              desc: 'Haryana Staff Selection Commission',       category: 'Subordinate Board' },
    { name: 'Haryana Police',  url: 'https://www.haryanapolice.gov.in/recruitment', desc: 'Haryana Police recruitment',       category: 'Police' },
    { name: 'P&H HC',          url: 'https://sssc.gov.in',                  desc: 'Punjab & Haryana HC — Haryana posts',      category: 'Judiciary' },
    { name: 'UHBVN / DHBVN',  url: 'https://www.uhbvn.org.in',             desc: 'Haryana Bijli Vitran Nigam',               category: 'Power & Utilities' },
    { name: 'Haryana Roadways', url: 'https://www.google.com/search?q=Haryana+Roadways+recruitment+official+website', desc: 'Haryana State Transport', category: 'Transport' },
    { name: 'HTET',            url: 'https://bseh.org.in',                  desc: 'Haryana TET — teacher recruitment',        category: 'Education' },
  ],
  'Himachal Pradesh': [
    { name: 'HPPSC',           url: 'https://hppsc.hp.gov.in',              desc: 'HP Public Service Commission',             category: 'PSC' },
    { name: 'HPSSSB',          url: 'https://www.hpsssb.hp.gov.in',         desc: 'HP Staff Selection Commission',            category: 'Subordinate Board' },
    { name: 'HP Police',       url: 'https://www.hppolice.gov.in/recruitment', desc: 'Himachal Pradesh Police recruitment',   category: 'Police' },
    { name: 'HP High Court',   url: 'https://hphc.nic.in',                  desc: 'HP High Court recruitment',               category: 'Judiciary' },
    { name: 'HPSEBL',          url: 'https://hpsebl.hp.gov.in',             desc: 'HP State Electricity Board Ltd',          category: 'Power & Utilities' },
    { name: 'HRTC',            url: 'https://www.hrtc.gov.in',              desc: 'HP Road Transport Corporation',           category: 'Transport' },
    { name: 'HP TET',          url: 'https://www.google.com/search?q=HP+TET+Himachal+Pradesh+teacher+eligibility+test+official', desc: 'HP TET — teacher recruitment', category: 'Education' },
  ],
  'Jammu & Kashmir': [
    { name: 'JKPSC',           url: 'https://jkpsc.nic.in',                desc: 'J&K Public Service Commission',            category: 'PSC' },
    { name: 'JKSSB',           url: 'https://jkssb.nic.in',                desc: 'J&K Services Selection Board',            category: 'Subordinate Board' },
    { name: 'J&K Police',      url: 'https://jkpolice.gov.in/recruitment', desc: 'J&K Police recruitment',                  category: 'Police' },
    { name: 'J&K High Court',  url: 'https://jkhighcourt.nic.in',          desc: 'J&K High Court recruitment',              category: 'Judiciary' },
    { name: 'JKPDCL',          url: 'https://www.google.com/search?q=JKPDCL+J%26K+Power+Development+Corporation+recruitment', desc: 'J&K Power Dev Corporation', category: 'Power & Utilities' },
  ],
  'Jharkhand': [
    { name: 'JPSC',            url: 'https://www.jpsc.gov.in',              desc: 'Jharkhand Public Service Commission',      category: 'PSC' },
    { name: 'JSSC',            url: 'https://jssc.nic.in',                  desc: 'Jharkhand Staff Selection Commission',     category: 'Subordinate Board' },
    { name: 'JAC Police',      url: 'https://jharkhandpolice.gov.in',       desc: 'Jharkhand Armed Police recruitment',       category: 'Police' },
    { name: 'Jharkhand HC',    url: 'https://jharkhandhighcourt.nic.in',    desc: 'Jharkhand High Court recruitment',         category: 'Judiciary' },
    { name: 'JBVNL',           url: 'https://www.jbvnl.co.in',             desc: 'Jharkhand Bijli Vitran Nigam',             category: 'Power & Utilities' },
    { name: 'JKPSC TGT/PGT',  url: 'https://www.google.com/search?q=Jharkhand+teacher+recruitment+JTET+official', desc: 'Jharkhand TET — teacher posts', category: 'Education' },
  ],
  'Karnataka': [
    { name: 'KPSC',            url: 'https://kpsc.kar.nic.in',             desc: 'Karnataka Public Service Commission',      category: 'PSC' },
    { name: 'KSSB',            url: 'https://www.kssb.gov.in',             desc: 'Karnataka State Services Selection Board', category: 'Subordinate Board' },
    { name: 'KSP',             url: 'https://ksp.karnataka.gov.in',        desc: 'Karnataka State Police recruitment',       category: 'Police' },
    { name: 'Karnataka HC',    url: 'https://karnatakajudiciary.kar.nic.in', desc: 'Karnataka High Court recruitment',       category: 'Judiciary' },
    { name: 'BESCOM / GESCOM', url: 'https://bescom.karnataka.gov.in',     desc: 'Karnataka Electricity Supply Companies',   category: 'Power & Utilities' },
    { name: 'KSRTC',           url: 'https://www.kaac.karnataka.gov.in',   desc: 'Karnataka State Road Transport Corp',      category: 'Transport' },
    { name: 'Namma Metro',     url: 'https://bmrc.co.in',                  desc: 'Bangalore Metro Rail Corp recruitment',    category: 'Transport' },
    { name: 'KARTET',          url: 'https://kartet.karnataka.gov.in',     desc: 'Karnataka Teacher Eligibility Test',       category: 'Education' },
  ],
  'Kerala': [
    { name: 'Kerala PSC',      url: 'https://www.keralapsc.gov.in',        desc: 'Kerala Public Service Commission',         category: 'PSC' },
    { name: 'Kerala Police',   url: 'https://www.keralapolice.gov.in',     desc: 'Kerala Police recruitment',               category: 'Police' },
    { name: 'Kerala HC',       url: 'https://www.hckrecruitment.nic.in',   desc: 'Kerala High Court recruitment',           category: 'Judiciary' },
    { name: 'KSEB',            url: 'https://www.ksebltd.com/careers',     desc: 'Kerala State Electricity Board',          category: 'Power & Utilities' },
    { name: 'KSRTC Kerala',    url: 'https://www.keralartc.com',           desc: 'Kerala State Road Transport Corp',        category: 'Transport' },
    { name: 'Kochi Metro',     url: 'https://kochimetro.org/careers/',     desc: 'Kochi Metro Rail recruitment',            category: 'Transport' },
    { name: 'KTU / University Jobs', url: 'https://www.google.com/search?q=Kerala+University+teaching+jobs+recruitment+official', desc: 'Kerala University & college jobs', category: 'Education' },
  ],
  'Madhya Pradesh': [
    { name: 'MPPSC',           url: 'https://mppsc.mp.gov.in',             desc: 'MP Public Service Commission',             category: 'PSC' },
    { name: 'MP ESB',          url: 'https://esb.mp.gov.in',               desc: 'MP Employee Selection Board',             category: 'Subordinate Board' },
    { name: 'MP Police',       url: 'https://peb.mp.gov.in',               desc: 'MP Professional Examination Board — Police', category: 'Police' },
    { name: 'MP High Court',   url: 'https://mphc.gov.in',                 desc: 'Madhya Pradesh High Court recruitment',    category: 'Judiciary' },
    { name: 'MPPKVVCL',        url: 'https://www.mppkvvcl.org',            desc: 'MP Poorva Kshetra Vidyut Vitaran',         category: 'Power & Utilities' },
    { name: 'MPSRTC',          url: 'https://www.google.com/search?q=MPSRTC+MP+State+Road+Transport+Corporation+recruitment', desc: 'MP State Road Transport Corp', category: 'Transport' },
    { name: 'MP TET/CTET',     url: 'https://www.google.com/search?q=MP+TET+teacher+eligibility+test+official', desc: 'MP Teacher Eligibility Test', category: 'Education' },
  ],
  'Maharashtra': [
    { name: 'MPSC',            url: 'https://mpsc.gov.in',                 desc: 'Maharashtra Public Service Commission',    category: 'PSC' },
    { name: 'Maha SSC',        url: 'https://maha-ssc.in',                 desc: 'Maharashtra Staff Selection Commission',   category: 'Subordinate Board' },
    { name: 'Maharashtra Police', url: 'https://mahapolice.gov.in/recruitement.html', desc: 'Maharashtra Police recruitment', category: 'Police' },
    { name: 'Bombay HC',       url: 'https://bombayhighcourt.nic.in',      desc: 'Bombay High Court recruitment',            category: 'Judiciary' },
    { name: 'MSEDCL',          url: 'https://www.mahadiscom.in/consumer/careers/', desc: 'Maharashtra State Electricity Dist Co', category: 'Power & Utilities' },
    { name: 'MSRTC',           url: 'https://msrtcexam.in',                desc: 'Maharashtra State Road Transport Corp',    category: 'Transport' },
    { name: 'Mumbai Metro / MMRDA', url: 'https://mmrda.maharashtra.gov.in', desc: 'Mumbai Metropolitan Region Dev Authority', category: 'Transport' },
    { name: 'MHADA',           url: 'https://mhada.gov.in',               desc: 'Maharashtra Housing Dev Authority',        category: 'Other' },
    { name: 'Maha TET / CTET', url: 'https://www.google.com/search?q=Maharashtra+TET+teacher+eligibility+official', desc: 'Maharashtra Teacher Eligibility Test', category: 'Education' },
  ],
  'Manipur': [
    { name: 'MPSC',            url: 'https://mpscmanipur.gov.in',           desc: 'Manipur Public Service Commission',        category: 'PSC' },
    { name: 'Manipur Police',  url: 'https://www.google.com/search?q=Manipur+Police+recruitment+official+website', desc: 'Manipur Police recruitment', category: 'Police' },
    { name: 'Gauhati HC (Manipur)', url: 'https://ghconline.gov.in',       desc: 'Gauhati HC — Manipur Bench',              category: 'Judiciary' },
    { name: 'MSPDCL',          url: 'https://www.google.com/search?q=MSPDCL+Manipur+State+Power+Distribution+Company+recruitment', desc: 'Manipur State Power Dist Co', category: 'Power & Utilities' },
  ],
  'Meghalaya': [
    { name: 'MPSC',            url: 'https://mpsc.nic.in',                  desc: 'Meghalaya Public Service Commission',      category: 'PSC' },
    { name: 'MSSC',            url: 'https://mssc.gov.in',                  desc: 'Meghalaya Staff Selection Commission',     category: 'Subordinate Board' },
    { name: 'Meghalaya Police', url: 'https://www.google.com/search?q=Meghalaya+Police+recruitment+official+website', desc: 'Meghalaya Police recruitment', category: 'Police' },
    { name: 'Meghalaya HC',    url: 'https://meghalayahighcourt.nic.in',    desc: 'Meghalaya High Court recruitment',         category: 'Judiciary' },
    { name: 'MeECL',           url: 'https://www.google.com/search?q=MeECL+Meghalaya+Energy+Corporation+Limited+recruitment', desc: 'Meghalaya Energy Corp Ltd', category: 'Power & Utilities' },
  ],
  'Mizoram': [
    { name: 'MPSC',            url: 'https://mpsc.mizoram.gov.in',          desc: 'Mizoram Public Service Commission',        category: 'PSC' },
    { name: 'Mizoram SSC',     url: 'https://www.google.com/search?q=Mizoram+Staff+Selection+Commission+recruitment+official', desc: 'Mizoram Staff Selection Commission', category: 'Subordinate Board' },
    { name: 'Mizoram Police',  url: 'https://mizorampolice.nic.in',         desc: 'Mizoram Police recruitment',              category: 'Police' },
    { name: 'Gauhati HC (Mizoram)', url: 'https://ghconline.gov.in',        desc: 'Gauhati HC — Mizoram Bench',              category: 'Judiciary' },
  ],
  'Nagaland': [
    { name: 'NPSC',            url: 'https://npsc.nagaland.gov.in',         desc: 'Nagaland Public Service Commission',       category: 'PSC' },
    { name: 'Nagaland SSC',    url: 'https://www.google.com/search?q=Nagaland+Staff+Selection+Commission+recruitment+official', desc: 'Nagaland Staff Selection Commission', category: 'Subordinate Board' },
    { name: 'Nagaland Police', url: 'https://www.nagalandpolice.gov.in',    desc: 'Nagaland Police recruitment',             category: 'Police' },
    { name: 'Gauhati HC (Nagaland)', url: 'https://ghconline.gov.in',       desc: 'Gauhati HC — Nagaland Bench',             category: 'Judiciary' },
  ],
  'Odisha': [
    { name: 'OPSC',            url: 'https://opsc.gov.in',                  desc: 'Odisha Public Service Commission',         category: 'PSC' },
    { name: 'OSSC',            url: 'https://www.ossc.gov.in',              desc: 'Odisha Staff Selection Commission',        category: 'Subordinate Board' },
    { name: 'Odisha Police',   url: 'https://odishapolice.gov.in/recruitment', desc: 'Odisha Police recruitment',            category: 'Police' },
    { name: 'Orissa HC',       url: 'https://orissahighcourt.nic.in',       desc: 'Orissa High Court recruitment',           category: 'Judiciary' },
    { name: 'TPNODL / TPSODL', url: 'https://www.google.com/search?q=TPNODL+TPSODL+Odisha+Power+Distribution+recruitment', desc: 'Odisha Power Distribution Companies', category: 'Power & Utilities' },
    { name: 'OSRTC',           url: 'https://www.google.com/search?q=OSRTC+Odisha+State+Road+Transport+Corporation+recruitment', desc: 'Odisha State Road Transport Corp', category: 'Transport' },
  ],
  'Punjab': [
    { name: 'PPSC',            url: 'https://ppsc.gov.in',                  desc: 'Punjab Public Service Commission',         category: 'PSC' },
    { name: 'Punjab SSSB',     url: 'https://sssb.punjab.gov.in',           desc: 'Punjab Subordinate Services Selection Board', category: 'Subordinate Board' },
    { name: 'Punjab Police',   url: 'https://punjabpolice.gov.in/recruitment.html', desc: 'Punjab Police recruitment',        category: 'Police' },
    { name: 'P&H HC',          url: 'https://sssc.gov.in',                  desc: 'Punjab & Haryana HC — Punjab posts',       category: 'Judiciary' },
    { name: 'PSPCL',           url: 'https://www.pspcl.in/recruitment/',    desc: 'Punjab State Power Corporation Ltd',      category: 'Power & Utilities' },
    { name: 'PRTC / PUNBUS',   url: 'https://www.google.com/search?q=PRTC+Punjab+Roadways+Bus+Corporation+recruitment', desc: 'Punjab Roadways / PRTC', category: 'Transport' },
    { name: 'Punjab TET',      url: 'https://www.google.com/search?q=Punjab+TET+teacher+eligibility+test+official', desc: 'Punjab Teacher Eligibility Test', category: 'Education' },
  ],
  'Rajasthan': [
    { name: 'RPSC',            url: 'https://rpsc.rajasthan.gov.in',        desc: 'Rajasthan Public Service Commission',      category: 'PSC' },
    { name: 'RSMSSB',          url: 'https://rsmssb.rajasthan.gov.in',      desc: 'Rajasthan Subordinate & Ministerial Board', category: 'Subordinate Board' },
    { name: 'Rajasthan Police', url: 'https://police.rajasthan.gov.in/recruitment', desc: 'Rajasthan Police recruitment',   category: 'Police' },
    { name: 'Rajasthan HC',    url: 'https://hcraj.nic.in',                 desc: 'Rajasthan High Court recruitment',         category: 'Judiciary' },
    { name: 'JVVNL / AVVNL',  url: 'https://energy.rajasthan.gov.in',     desc: 'Rajasthan Discoms recruitment',            category: 'Power & Utilities' },
    { name: 'RSRTC',           url: 'https://www.rsrtc.rajasthan.gov.in',   desc: 'Rajasthan State Road Transport Corp',      category: 'Transport' },
    { name: 'REET',            url: 'https://www.google.com/search?q=REET+Rajasthan+Eligibility+Examination+for+Teachers+official', desc: 'REET — Rajasthan teacher recruitment', category: 'Education' },
  ],
  'Sikkim': [
    { name: 'SPSC',            url: 'https://spsc.gov.in',                  desc: 'Sikkim Public Service Commission',         category: 'PSC' },
    { name: 'Sikkim SSC',      url: 'https://www.google.com/search?q=Sikkim+State+Services+Selection+Commission+recruitment', desc: 'Sikkim Staff Selection Commission', category: 'Subordinate Board' },
    { name: 'Sikkim Police',   url: 'https://www.google.com/search?q=Sikkim+Police+recruitment+official+website', desc: 'Sikkim Police recruitment', category: 'Police' },
    { name: 'Sikkim HC',       url: 'https://www.sikkimhighcourt.gov.in',   desc: 'Sikkim High Court recruitment',           category: 'Judiciary' },
  ],
  'Tamil Nadu': [
    { name: 'TNPSC',           url: 'https://www.tnpsc.gov.in',             desc: 'Tamil Nadu Public Service Commission',     category: 'PSC' },
    { name: 'TN TRB',          url: 'https://www.trb.tn.nic.in',            desc: 'TN Teachers Recruitment Board',           category: 'Subordinate Board' },
    { name: 'TNUSRB',          url: 'https://www.tnusrbonline.org',          desc: 'TN Uniformed Services Recruitment Board — Police', category: 'Police' },
    { name: 'Madras HC',       url: 'https://hcmadras.tn.nic.in',           desc: 'Madras High Court recruitment',           category: 'Judiciary' },
    { name: 'TANGEDCO',        url: 'https://www.tangedco.gov.in/careers.html', desc: 'TN Generation & Distribution Corp',   category: 'Power & Utilities' },
    { name: 'TNSTC / MTC',     url: 'https://www.tnstc.in',                 desc: 'TN State Transport Corp / MTC Chennai',   category: 'Transport' },
    { name: 'CMRL',            url: 'https://www.chennaimetrorail.org',      desc: 'Chennai Metro Rail recruitment',          category: 'Transport' },
    { name: 'TNTET',           url: 'https://www.google.com/search?q=TNTET+Tamil+Nadu+Teacher+Eligibility+Test+official', desc: 'TN Teacher Eligibility Test', category: 'Education' },
  ],
  'Telangana': [
    { name: 'TSPSC',           url: 'https://www.tspsc.gov.in',             desc: 'Telangana State PSC',                      category: 'PSC' },
    { name: 'TS SLPRB',        url: 'https://tslprb.in',                    desc: 'TS State Level Police Recruitment Board',  category: 'Police' },
    { name: 'Telangana HC',    url: 'https://hc.ts.nic.in',                 desc: 'Telangana High Court recruitment',         category: 'Judiciary' },
    { name: 'TSGENCO',         url: 'https://www.tsgenco.telangana.gov.in', desc: 'Telangana State Power Generation Corp',    category: 'Power & Utilities' },
    { name: 'TSRTC',           url: 'https://tsrtc.telangana.gov.in',       desc: 'Telangana State Road Transport Corp',      category: 'Transport' },
    { name: 'Hyderabad Metro', url: 'https://www.ltmetro.com',              desc: 'L&T Hyderabad Metro Rail',                category: 'Transport' },
    { name: 'TS TET',          url: 'https://www.google.com/search?q=Telangana+TET+TSTET+teacher+eligibility+official', desc: 'Telangana Teacher Eligibility Test', category: 'Education' },
  ],
  'Tripura': [
    { name: 'TPSC',            url: 'https://tpsc.gov.in',                  desc: 'Tripura Public Service Commission',        category: 'PSC' },
    { name: 'Tripura SSC',     url: 'https://www.google.com/search?q=Tripura+Staff+Selection+Commission+recruitment', desc: 'Tripura SSC recruitment',   category: 'Subordinate Board' },
    { name: 'Tripura Police',  url: 'https://www.google.com/search?q=Tripura+Police+recruitment+official+website', desc: 'Tripura Police recruitment', category: 'Police' },
    { name: 'Tripura HC',      url: 'https://tripurahighcourt.gov.in',       desc: 'Tripura High Court recruitment',          category: 'Judiciary' },
    { name: 'TSECL',           url: 'https://www.tsecl.in',                 desc: 'Tripura State Electricity Corp Ltd',       category: 'Power & Utilities' },
  ],
  'Uttar Pradesh': [
    { name: 'UPPSC',           url: 'https://uppsc.up.nic.in',              desc: 'UP Public Service Commission',             category: 'PSC' },
    { name: 'UPSSSC',          url: 'https://upsssc.gov.in',                desc: 'UP Subordinate Services Selection Commission', category: 'Subordinate Board' },
    { name: 'UP Police (UPPBPB)', url: 'https://uppbpb.gov.in',             desc: 'UP Police Recruitment & Promotion Board', category: 'Police' },
    { name: 'Allahabad HC',    url: 'https://www.allahabadhighcourt.in',    desc: 'Allahabad High Court recruitment',         category: 'Judiciary' },
    { name: 'UPPCL',           url: 'https://uppcl.mpower.in',             desc: 'UP Power Corporation Ltd',                category: 'Power & Utilities' },
    { name: 'UPSRTC',          url: 'https://upsrtc.up.gov.in',            desc: 'UP State Road Transport Corporation',      category: 'Transport' },
    { name: 'LMRC',            url: 'https://lmrcl.com',                   desc: 'Lucknow Metro Rail Corporation',           category: 'Transport' },
    { name: 'UP TET/CTET',     url: 'https://www.google.com/search?q=UP+TET+UPTET+teacher+eligibility+test+official', desc: 'UP Teacher Eligibility Test', category: 'Education' },
  ],
  'Uttarakhand': [
    { name: 'UKPSC',           url: 'https://ukpsc.gov.in',                 desc: 'Uttarakhand Public Service Commission',    category: 'PSC' },
    { name: 'UKSSSC',          url: 'https://sssc.uk.gov.in',               desc: 'UK Subordinate Services Selection Commission', category: 'Subordinate Board' },
    { name: 'Uttarakhand Police', url: 'https://ukpolice.gov.in',           desc: 'Uttarakhand Police recruitment',          category: 'Police' },
    { name: 'UK High Court',   url: 'https://www.highcourtofuttarakhand.gov.in', desc: 'Uttarakhand High Court recruitment', category: 'Judiciary' },
    { name: 'UPCL',            url: 'https://www.upcl.org',                desc: 'Uttarakhand Power Corporation Ltd',        category: 'Power & Utilities' },
    { name: 'UTC',             url: 'https://www.google.com/search?q=UTC+Uttarakhand+Transport+Corporation+recruitment', desc: 'Uttarakhand Transport Corp', category: 'Transport' },
  ],
  'West Bengal': [
    { name: 'WBPSC',           url: 'https://wbpsc.gov.in',                 desc: 'West Bengal Public Service Commission',    category: 'PSC' },
    { name: 'WBSSC',           url: 'https://www.westbengalssc.com',        desc: 'WB Staff Selection Commission',            category: 'Subordinate Board' },
    { name: 'WB Police',       url: 'https://wbpolice.gov.in/recruitment.aspx', desc: 'West Bengal Police recruitment',      category: 'Police' },
    { name: 'Calcutta HC',     url: 'https://calcuttahighcourt.gov.in',     desc: 'Calcutta High Court recruitment',         category: 'Judiciary' },
    { name: 'WBSEDCL',         url: 'https://www.wbsedcl.in/irj/go/km/docs/internet/new_website/CareersMainPage.html', desc: 'WB State Electricity Dist Co', category: 'Power & Utilities' },
    { name: 'WBSTC',           url: 'https://www.wbstc.in',                desc: 'WB Surface Transport Corporation',         category: 'Transport' },
    { name: 'Kolkata Metro',   url: 'https://mtp.indianrailways.gov.in',   desc: 'Kolkata Metro Rail Corporation',           category: 'Transport' },
    { name: 'WB TET',          url: 'https://www.google.com/search?q=WB+TET+West+Bengal+teacher+eligibility+test+official', desc: 'WB Primary/Upper Primary TET', category: 'Education' },
  ],
  // Union Territories
  'Chandigarh': [
    { name: 'Chandigarh Admin', url: 'https://chandigarh.gov.in/recruitment.htm', desc: 'Chandigarh Administration recruitment', category: 'PSC' },
    { name: 'Chandigarh Police', url: 'https://www.chandigarhpolice.gov.in', desc: 'Chandigarh Police recruitment',           category: 'Police' },
    { name: 'P&H HC',          url: 'https://sssc.gov.in',                  desc: 'Punjab & Haryana HC (Chandigarh Bench)',   category: 'Judiciary' },
  ],
  'Puducherry': [
    { name: 'Puducherry PSC',  url: 'https://pscpondicherry.gov.in',        desc: 'Puducherry Public Service Commission',     category: 'PSC' },
    { name: 'Puducherry Police', url: 'https://www.google.com/search?q=Puducherry+Police+recruitment+official+website', desc: 'Puducherry Police recruitment', category: 'Police' },
    { name: 'Madras HC (Pondy)', url: 'https://hcmadras.tn.nic.in',        desc: 'Madras HC Puducherry Bench',              category: 'Judiciary' },
  ],
  'Andaman & Nicobar': [
    { name: 'A&N Administration', url: 'https://www.andaman.gov.in/web/guest/recruitment', desc: 'A&N Islands Administration jobs', category: 'PSC' },
    { name: 'A&N Police',      url: 'https://www.google.com/search?q=Andaman+Nicobar+Police+recruitment+official', desc: 'A&N Police recruitment', category: 'Police' },
    { name: 'Calcutta HC (A&N)', url: 'https://calcuttahighcourt.gov.in',  desc: 'Calcutta HC — A&N Circuit Bench',         category: 'Judiciary' },
  ],
  'Lakshadweep': [
    { name: 'Lakshadweep Admin', url: 'https://www.google.com/search?q=Lakshadweep+Administration+recruitment+official', desc: 'Lakshadweep Administration jobs', category: 'PSC' },
    { name: 'Kerala HC (Laksh.)', url: 'https://www.hckrecruitment.nic.in', desc: 'Kerala HC — Lakshadweep jurisdiction',   category: 'Judiciary' },
  ],
  'Dadra & NH / DD': [
    { name: 'DNH & DD Admin',  url: 'https://www.google.com/search?q=Dadra+Nagar+Haveli+Daman+Diu+administration+recruitment+official', desc: 'DNH & DD Administration recruitment', category: 'PSC' },
    { name: 'Bombay HC (DNH)', url: 'https://bombayhighcourt.nic.in',      desc: 'Bombay HC jurisdiction over DNH & DD',    category: 'Judiciary' },
  ],
  'Ladakh': [
    { name: 'LAHDC / Ladakh Admin', url: 'https://www.google.com/search?q=Ladakh+Autonomous+Hill+Development+Council+Leh+Kargil+recruitment', desc: 'Ladakh Hill Council & UT Admin jobs', category: 'PSC' },
    { name: 'Ladakh Police',   url: 'https://www.google.com/search?q=Ladakh+Police+recruitment+official+website', desc: 'Ladakh Police recruitment', category: 'Police' },
    { name: 'J&K HC (Ladakh)', url: 'https://jkhighcourt.nic.in',          desc: 'J&K HC — Ladakh Bench',                   category: 'Judiciary' },
  ],
}

// State department category -> Tailwind badge colour classes
const DEPT_CATEGORY_COLORS = {
  'PSC':               'bg-blue-50 text-blue-700',
  'Subordinate Board': 'bg-indigo-50 text-indigo-700',
  'Police':            'bg-red-50 text-red-700',
  'Judiciary':         'bg-purple-50 text-purple-700',
  'Power & Utilities': 'bg-yellow-50 text-yellow-700',
  'Transport':         'bg-orange-50 text-orange-700',
  'Education':         'bg-green-50 text-green-700',
  'Other':             'bg-gray-50 text-gray-700',
}

// Card for one recruitment portal (central body or state department) — plain outbound link with a colour-coded category badge
function LinkCard({ name, url, desc, badge, badgeClass }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{name}</p>
          {badge && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{badge}</span>}
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </a>
  )
}

// Every state department, flattened with its state name attached — used for search
export const ALL_STATE_DEPTS = Object.entries(STATE_DEPARTMENTS).flatMap(([state, depts]) =>
  depts.map(d => ({ ...d, state }))
)

/**
 * Renders the government recruitment portal directory: a search box that
 * spans both Central and State sections, a sidebar (desktop) / pill strip
 * (mobile) for switching between "All", "Central Government" (with
 * per-category sub-filters), and "State & UT Portals" (with a multi-select
 * state checklist), and the resulting grid of portal link cards.
 */
export default function GovtJobs() {
  const [section, setSection] = useState('all')   // which top-level section is shown: 'all' | 'central' | 'state'
  const [filter, setFilter] = useState('all')      // active Central Government category filter
  const [selectedStates, setSelectedStates] = useState([])  // empty = All states shown as an overview grid; non-empty = only these states' departments
  const [search, setSearch] = useState('')          // search box value — spans every section, ignoring section/filter/state selection

  const categories = [...new Set(CENTRAL_BODIES.map(b => b.category))]
  const filteredCentral = filter === 'all'
    ? CENTRAL_BODIES
    : CENTRAL_BODIES.filter(b => b.category === filter)

  const stateNames = Object.keys(STATE_DEPARTMENTS).sort()

  // Search spans every section/state, ignoring whatever is currently selected
  const isSearching = search.trim().length > 0
  const q = search.toLowerCase()
  const searchedCentral = CENTRAL_BODIES.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.desc.toLowerCase().includes(q) ||
    b.category.toLowerCase().includes(q)
  )
  const searchedState = ALL_STATE_DEPTS.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.desc.toLowerCase().includes(q) ||
    d.category.toLowerCase().includes(q) ||
    d.state.toLowerCase().includes(q)
  )
  const searchResultCount = searchedCentral.length + searchedState.length

  const allChecked = selectedStates.length === 0

  // "All States & UTs" checkbox handler — clears the selection so every
  // state renders as the default overview grid.
  function toggleAll() {
    setSelectedStates([])
  }

  // Per-state checkbox handler — adds/removes one state from the multi-select list
  function toggleState(state) {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    )
  }

  // Sidebar/pill handler for "All Sections" — resets to showing both
  // Central and State sections and scrolls back to the top.
  function handleSectionAll() {
    setSection('all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sidebar/pill handler for the Central Government section (and its
  // per-category sub-items) — switches to the 'central' section and applies
  // the given category filter (or 'all' for "All Central").
  function handleSectionCentral(cat) {
    setSection('central')
    setFilter(cat || 'all')
  }

  // Sidebar/pill handler for the State & UT Portals section
  function handleSectionState() {
    setSection('state')
  }

  const showCentral = section === 'all' || section === 'central'
  const showState   = section === 'all' || section === 'state'

  const statesToShow = selectedStates.length === 0 ? stateNames : selectedStates

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Government Jobs</h1>
        <p className="text-muted-foreground text-sm">
          Official recruitment portals for central government bodies, PSUs, ports, and all state/UT recruitment boards.
          Click any card to go directly to the official site.
        </p>
      </div>

      {/* Search — spans every section/state, ignoring the current sidebar selection */}
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search portals, departments or states..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Search results view replaces the sidebar+content layout entirely while a query is active */}
      {isSearching ? (
        <div>
          <p className="text-xs text-muted-foreground mb-4">
            {searchResultCount} result{searchResultCount !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
          {searchResultCount === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No portals match your search.</div>
          ) : (
            <div className="space-y-8">
              {searchedCentral.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-blue-700 mb-3">Central Government</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {searchedCentral.map(b => (
                      <LinkCard key={b.name} name={b.name} url={b.url} desc={b.desc} badge={b.category} badgeClass={CATEGORY_COLORS[b.category] || 'bg-gray-50 text-gray-700'} />
                    ))}
                  </div>
                </div>
              )}
              {searchedState.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-orange-700 mb-3">State &amp; UT Departments</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {searchedState.map(d => (
                      <LinkCard key={d.state + d.name} name={d.name} url={d.url} desc={`${d.state} — ${d.desc}`} badge={d.state} badgeClass="bg-orange-50 text-orange-700" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
      <>

      {/* Mobile section strip (visible only on small screens) */}
      <div className="flex md:hidden gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={handleSectionAll}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            section === 'all'
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white border-border text-muted-foreground hover:border-foreground/30'
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleSectionCentral('all')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            section === 'central'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white border-border text-muted-foreground hover:border-foreground/30'
          }`}
        >
          Central Govt
        </button>
        <button
          onClick={handleSectionState}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            section === 'state'
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white border-border text-muted-foreground hover:border-foreground/30'
          }`}
        >
          State &amp; UTs
        </button>
      </div>

      {/* Page layout: sidebar + main content */}
      <div className="flex gap-6 items-start">

        {/* Sticky left sidebar (desktop only) */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-4">
          <nav className="bg-white border rounded-xl overflow-hidden text-sm shadow-sm">

            {/* All Sections */}
            <button
              onClick={handleSectionAll}
              className={`w-full text-left px-3 py-2.5 font-medium transition-colors flex items-center gap-2 ${
                section === 'all'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${section === 'all' ? 'bg-gray-700' : 'bg-transparent'}`} />
              All Sections
            </button>

            <div className="border-t" />

            {/* Central Government header */}
            <button
              onClick={() => handleSectionCentral('all')}
              className={`w-full text-left px-3 py-2 font-semibold transition-colors flex items-center justify-between ${
                section === 'central'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-foreground hover:bg-gray-50'
              }`}
            >
              <span>Central Government</span>
              <span className={`text-xs font-normal ${section === 'central' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                ({CENTRAL_BODIES.length})
              </span>
            </button>

            {/* All Central sub-item */}
            <button
              onClick={() => handleSectionCentral('all')}
              className={`w-full text-left pl-6 pr-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                section === 'central' && filter === 'all'
                  ? 'text-blue-700 font-semibold bg-blue-50/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
              }`}
            >
              <ChevronRight className={`h-3 w-3 shrink-0 ${section === 'central' && filter === 'all' ? 'text-blue-500' : 'text-muted-foreground/50'}`} />
              All Central
            </button>

            {/* Category sub-items */}
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleSectionCentral(cat)}
                className={`w-full text-left pl-6 pr-3 py-1.5 text-xs flex items-center justify-between gap-1 transition-colors ${
                  section === 'central' && filter === cat
                    ? 'text-blue-700 font-semibold bg-blue-100/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight className={`h-3 w-3 shrink-0 ${section === 'central' && filter === cat ? 'text-blue-500' : 'text-muted-foreground/50'}`} />
                  <span className="truncate">{cat}</span>
                </span>
                <span className={`shrink-0 ${section === 'central' && filter === cat ? 'text-blue-500' : 'text-muted-foreground/60'}`}>
                  ({CENTRAL_BODIES.filter(b => b.category === cat).length})
                </span>
              </button>
            ))}

            <div className="border-t" />

            {/* State & UT Portals */}
            <button
              onClick={handleSectionState}
              className={`w-full text-left px-3 py-2 font-semibold transition-colors flex items-center justify-between ${
                section === 'state'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-foreground hover:bg-gray-50'
              }`}
            >
              <span>State &amp; UT Portals</span>
              <span className={`text-xs font-normal ${section === 'state' ? 'text-orange-500' : 'text-muted-foreground'}`}>
                ({stateNames.length})
              </span>
            </button>

          </nav>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">

          {/* Central Government Bodies */}
          {showCentral && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                <Building2 className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold text-blue-700">Central Government Recruitment Portals</h2>
                <span className="ml-auto text-xs font-medium text-blue-700 opacity-70">{filteredCentral.length} portals</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredCentral.map(b => (
                  <LinkCard
                    key={b.name}
                    name={b.name}
                    url={b.url}
                    desc={b.desc}
                    badge={b.category}
                    badgeClass={CATEGORY_COLORS[b.category] || 'bg-gray-50 text-gray-700'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* State & UT Portals */}
          {showState && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100">
                <MapPin className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-bold text-orange-700">State &amp; UT Recruitment Portals</h2>
                <span className="ml-auto text-xs font-medium text-orange-700 opacity-70">{stateNames.length} states / UTs</span>
              </div>

              <p className="text-xs text-muted-foreground mb-4">Check one or more states/UTs to view their recruitment portals side by side.</p>

              {/* State / UT checkbox list */}
              <div className="border rounded-xl overflow-hidden mb-6">
                {/* All checkbox */}
                <label className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-foreground">All States &amp; UTs</span>
                  <span className="ml-auto text-xs text-muted-foreground">{stateNames.length}</span>
                </label>

                {/* Individual state checkboxes — 2-column grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:grid-rows-none">
                  {stateNames.map((state, i) => {
                    const checked = selectedStates.includes(state)
                    return (
                      <label
                        key={state}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b last:border-b-0 ${
                          checked
                            ? 'bg-orange-50 text-orange-700'
                            : 'hover:bg-gray-50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleState(state)}
                          className="h-3.5 w-3.5 accent-orange-500 cursor-pointer shrink-0"
                        />
                        <span className="text-xs font-medium leading-snug">{state}</span>
                        <span className="ml-auto text-xs opacity-60 shrink-0">{STATE_DEPARTMENTS[state].length}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* State departments — one section per shown state */}
              {selectedStates.length === 0 ? (
                /* Default: overview grid of all states */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {stateNames.map(state => (
                    <button
                      key={state}
                      onClick={() => toggleState(state)}
                      className="flex items-start justify-between gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors mb-0.5">{state}</p>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {STATE_DEPARTMENTS[state].length} portals — PSC, Police, HC &amp; more
                        </p>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                /* Show departments for each selected state */
                <div className="space-y-6">
                  {statesToShow.map(state => {
                    const depts = STATE_DEPARTMENTS[state]
                    return (
                      <div key={state} className="border rounded-xl p-4 bg-orange-50/30">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-foreground">{state}</h3>
                          <span className="text-xs text-muted-foreground">{depts.length} portals</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {depts.map(item => (
                            <LinkCard
                              key={item.name}
                              name={item.name}
                              url={item.url}
                              desc={item.desc}
                              badge={item.category}
                              badgeClass={DEPT_CATEGORY_COLORS[item.category] || 'bg-gray-50 text-gray-700'}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      </>
      )}

      <p className="mt-10 text-xs text-muted-foreground text-center border-t pt-6">
        StepsDoor links directly to official government recruitment portals. We are not affiliated with any government body.
        Always check the official notification before applying.
      </p>
    </div>
  )
}
