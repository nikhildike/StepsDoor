import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Building2, ExternalLink, Search } from 'lucide-react'
import { companyService } from '@/services/companyService'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'

// ─── Static company career directory ──────────────────────────────────────────

const COMPANY_DIRECTORY = [
  // IT & Software
  { name: 'TCS',               url: 'https://www.tcs.com/careers',                    desc: 'Tata Consultancy Services',           sector: 'IT & Software' },
  { name: 'Infosys',           url: 'https://www.infosys.com/careers',                desc: 'Infosys careers portal',              sector: 'IT & Software' },
  { name: 'Wipro',             url: 'https://www.wipro.com/careers',                  desc: 'Wipro careers portal',                sector: 'IT & Software' },
  { name: 'HCLTech',           url: 'https://www.hcltech.com/careers',                desc: 'HCL Technologies',                    sector: 'IT & Software' },
  { name: 'Tech Mahindra',     url: 'https://www.techmahindra.com/careers',           desc: 'Tech Mahindra careers',               sector: 'IT & Software' },
  { name: 'LTIMindtree',       url: 'https://www.ltimindtree.com/careers',            desc: 'LTIMindtree careers',                 sector: 'IT & Software' },
  { name: 'Cognizant',         url: 'https://www.cognizant.com/careers',              desc: 'Cognizant India careers',             sector: 'IT & Software' },
  { name: 'Accenture India',   url: 'https://www.accenture.com/careers',              desc: 'Accenture consulting & tech',         sector: 'IT & Software' },
  { name: 'Capgemini',         url: 'https://www.capgemini.com/careers',              desc: 'Capgemini India careers',             sector: 'IT & Software' },
  { name: 'IBM India',         url: 'https://www.ibm.com/in-en/careers',              desc: 'IBM India careers',                   sector: 'IT & Software' },
  { name: 'Mphasis',           url: 'https://www.mphasis.com/careers',                desc: 'Mphasis careers portal',              sector: 'IT & Software' },
  { name: 'Persistent Systems',url: 'https://www.persistent.com/careers',             desc: 'Persistent Systems careers',          sector: 'IT & Software' },
  { name: 'Coforge',           url: 'https://www.coforge.com/careers',                desc: 'Coforge (NIIT Tech) careers',         sector: 'IT & Software' },
  { name: 'Zensar',            url: 'https://www.zensar.com/careers',                 desc: 'Zensar Technologies',                 sector: 'IT & Software' },
  { name: 'Birlasoft',         url: 'https://www.birlasoft.com/careers',              desc: 'Birlasoft careers',                   sector: 'IT & Software' },
  { name: 'Cyient',            url: 'https://www.cyient.com/careers',                 desc: 'Cyient engineering services',         sector: 'IT & Software' },
  { name: 'KPIT Technologies', url: 'https://www.kpit.com/careers',                   desc: 'KPIT automotive software',            sector: 'IT & Software' },
  { name: 'Tata Elxsi',        url: 'https://www.tataelxsi.com/careers',              desc: 'Tata Elxsi design & tech',            sector: 'IT & Software' },
  { name: 'Hexaware',          url: 'https://hexaware.com/careers',                   desc: 'Hexaware Technologies',               sector: 'IT & Software' },
  { name: 'Sonata Software',   url: 'https://www.sonata-software.com/careers',        desc: 'Sonata Software careers',             sector: 'IT & Software' },
  { name: 'Happiest Minds',    url: 'https://www.happiestminds.com/careers',          desc: 'Happiest Minds Technologies',         sector: 'IT & Software' },
  { name: 'Mastek',            url: 'https://www.mastek.com/careers',                 desc: 'Mastek careers portal',               sector: 'IT & Software' },
  { name: 'Newgen Software',   url: 'https://newgensoft.com/careers',                 desc: 'Newgen Software Products',            sector: 'IT & Software' },
  { name: 'Intellect Design',  url: 'https://www.intellectdesign.com/careers',        desc: 'Intellect Design Arena (Fintech)',     sector: 'IT & Software' },
  { name: 'Ramco Systems',     url: 'https://www.ramco.com/careers',                  desc: 'Ramco Systems',                       sector: 'IT & Software' },
  { name: 'Subex',             url: 'https://www.subex.com/careers',                  desc: 'Subex telecom software',              sector: 'IT & Software' },
  { name: 'Tanla Platforms',   url: 'https://www.tanla.com/careers',                  desc: 'Tanla CPaaS platform',                sector: 'IT & Software' },
  { name: 'Route Mobile',      url: 'https://routemobile.com/careers',                desc: 'Route Mobile CPaaS',                  sector: 'IT & Software' },
  { name: 'Sasken',            url: 'https://www.sasken.com/careers',                 desc: 'Sasken product engineering',          sector: 'IT & Software' },
  { name: 'eClerx',            url: 'https://eclerx.com/careers',                     desc: 'eClerx Analytics & KPO',              sector: 'IT & Software' },
  { name: 'Latent View',       url: 'https://www.latentview.com/careers',             desc: 'Latent View Analytics',               sector: 'IT & Software' },
  { name: 'Tiger Analytics',   url: 'https://www.tigeranalytics.com/careers',         desc: 'Tiger Analytics',                     sector: 'IT & Software' },
  { name: 'Mu Sigma',          url: 'https://www.mu-sigma.com/careers',               desc: 'Mu Sigma analytics',                  sector: 'IT & Software' },
  { name: 'Fractal Analytics', url: 'https://fractal.ai/careers',                     desc: 'Fractal Analytics AI',                sector: 'IT & Software' },
  { name: 'GlobalLogic',       url: 'https://www.globallogic.com/careers',            desc: 'GlobalLogic product engineering',     sector: 'IT & Software' },
  { name: 'EPAM India',        url: 'https://www.epam.com/careers',                   desc: 'EPAM Systems engineering',            sector: 'IT & Software' },
  { name: 'Thoughtworks',      url: 'https://www.thoughtworks.com/careers',           desc: 'Thoughtworks software consulting',     sector: 'IT & Software' },
  { name: 'Publicis Sapient',  url: 'https://www.publicissapient.com/careers',        desc: 'Publicis Sapient digital',            sector: 'IT & Software' },
  { name: 'UST Global',        url: 'https://www.ust.com/careers',                    desc: 'UST Global IT services',              sector: 'IT & Software' },
  { name: 'Virtusa',           url: 'https://www.virtusa.com/careers',                desc: 'Virtusa IT services',                 sector: 'IT & Software' },
  { name: 'NTT DATA India',    url: 'https://www.nttdata.com/careers',                desc: 'NTT DATA India',                      sector: 'IT & Software' },
  { name: 'Infogain',          url: 'https://www.infogain.com/careers',               desc: 'Infogain IT services',                sector: 'IT & Software' },
  { name: 'Nagarro',           url: 'https://www.nagarro.com/careers',                desc: 'Nagarro software engineering',        sector: 'IT & Software' },
  { name: 'QuEST Global',      url: 'https://www.quest-global.com/careers',           desc: 'QuEST Global engineering services',   sector: 'IT & Software' },
  // Tech / MNCs
  { name: 'Microsoft India',   url: 'https://www.microsoft.com/en-in/careers',        desc: 'Microsoft India careers',             sector: 'Tech / MNCs' },
  { name: 'Google India',      url: 'https://about.google/careers',                   desc: 'Google India careers',                sector: 'Tech / MNCs' },
  { name: 'Amazon Dev Centre', url: 'https://www.amazon.jobs',                        desc: 'Amazon Development Centre India',     sector: 'Tech / MNCs' },
  { name: 'Oracle India',      url: 'https://www.oracle.com/in/careers',              desc: 'Oracle India careers',                sector: 'Tech / MNCs' },
  { name: 'SAP India',         url: 'https://www.sap.com/india/careers',              desc: 'SAP India careers',                   sector: 'Tech / MNCs' },
  { name: 'Adobe India',       url: 'https://www.adobe.com/in/careers',               desc: 'Adobe India careers',                 sector: 'Tech / MNCs' },
  { name: 'Salesforce India',  url: 'https://www.salesforce.com/in/careers',          desc: 'Salesforce India',                    sector: 'Tech / MNCs' },
  { name: 'Dell India',        url: 'https://www.dell.com/careers',                   desc: 'Dell Technologies India',             sector: 'Tech / MNCs' },
  { name: 'HP India',          url: 'https://www.hp.com/in-en/careers',               desc: 'HP India careers',                    sector: 'Tech / MNCs' },
  { name: 'Zoho',              url: 'https://www.zoho.com/careers',                   desc: 'Zoho Corporation SaaS',               sector: 'Tech / MNCs' },
  { name: 'Freshworks',        url: 'https://www.freshworks.com/careers',             desc: 'Freshworks SaaS careers',             sector: 'Tech / MNCs' },
  // Semiconductors
  { name: 'Intel India',       url: 'https://www.intel.in/careers',                   desc: 'Intel India semiconductor',           sector: 'Semiconductors' },
  { name: 'Qualcomm India',    url: 'https://www.qualcomm.com/careers',               desc: 'Qualcomm India careers',              sector: 'Semiconductors' },
  { name: 'NVIDIA India',      url: 'https://www.nvidia.com/careers',                 desc: 'NVIDIA India careers',                sector: 'Semiconductors' },
  { name: 'AMD India',         url: 'https://www.amd.com/careers',                    desc: 'AMD India careers',                   sector: 'Semiconductors' },
  { name: 'Texas Instruments', url: 'https://www.ti.com/careers',                     desc: 'TI India careers',                    sector: 'Semiconductors' },
  { name: 'Samsung R&D India', url: 'https://www.samsung.com/in/careers',             desc: 'Samsung R&D Institute India',         sector: 'Semiconductors' },
  // E-commerce & Quick Commerce
  { name: 'Flipkart',          url: 'https://www.flipkart.com/careers',               desc: 'Flipkart careers',                    sector: 'E-commerce' },
  { name: 'Amazon India',      url: 'https://www.amazon.in/careers',                  desc: 'Amazon India operations',             sector: 'E-commerce' },
  { name: 'Meesho',            url: 'https://www.meesho.com/careers',                 desc: 'Meesho careers',                      sector: 'E-commerce' },
  { name: 'Nykaa',             url: 'https://www.nykaa.com/careers',                  desc: 'Nykaa e-commerce',                    sector: 'E-commerce' },
  { name: 'Myntra',            url: 'https://www.myntra.com/careers',                 desc: 'Myntra fashion e-commerce',           sector: 'E-commerce' },
  { name: 'AJIO (Reliance)',   url: 'https://www.ajio.com/careers',                   desc: 'AJIO Reliance fashion',               sector: 'E-commerce' },
  { name: 'BigBasket',         url: 'https://www.bigbasket.com/careers',              desc: 'BigBasket e-grocery',                 sector: 'E-commerce' },
  { name: 'Cars24',            url: 'https://www.cars24.com/careers',                 desc: 'Cars24 auto marketplace',             sector: 'E-commerce' },
  { name: 'Spinny',            url: 'https://www.spinny.com/careers',                 desc: 'Spinny used car platform',            sector: 'E-commerce' },
  { name: 'CarDekho',          url: 'https://www.cardekho.com/careers',               desc: 'CarDekho auto marketplace',           sector: 'E-commerce' },
  { name: 'Droom',             url: 'https://droom.in/careers',                       desc: 'Droom auto marketplace',              sector: 'E-commerce' },
  { name: 'Zepto',             url: 'https://www.zeptonow.com/careers',               desc: 'Zepto quick commerce',                sector: 'E-commerce' },
  { name: 'Blinkit',           url: 'https://blinkit.com/careers',                    desc: 'Blinkit quick commerce',              sector: 'E-commerce' },
  { name: 'Dunzo',             url: 'https://www.dunzo.com/careers',                  desc: 'Dunzo hyperlocal delivery',           sector: 'E-commerce' },
  { name: 'Urban Company',     url: 'https://www.urbancompany.com/careers',           desc: 'Urban Company services marketplace',  sector: 'E-commerce' },
  // Food Tech & Mobility
  { name: 'Zomato (Eternal)',  url: 'https://www.zomato.com/careers',                 desc: 'Zomato food delivery',                sector: 'Food Tech & Mobility' },
  { name: 'Swiggy',            url: 'https://www.swiggy.com/careers',                 desc: 'Swiggy food delivery',                sector: 'Food Tech & Mobility' },
  { name: 'Ola',               url: 'https://www.olacabs.com/careers',                desc: 'Ola mobility careers',                sector: 'Food Tech & Mobility' },
  { name: 'Ola Electric',      url: 'https://www.olaelectric.com/careers',            desc: 'Ola Electric EV careers',             sector: 'Food Tech & Mobility' },
  { name: 'Uber India',        url: 'https://www.uber.com/careers',                   desc: 'Uber India careers',                  sector: 'Food Tech & Mobility' },
  { name: 'Rapido',            url: 'https://rapido.bike/careers',                    desc: 'Rapido bike taxi',                    sector: 'Food Tech & Mobility' },
  // Travel Tech
  { name: 'MakeMyTrip',        url: 'https://www.makemytrip.com/careers',             desc: 'MakeMyTrip travel tech',              sector: 'Travel Tech' },
  { name: 'Ixigo',             url: 'https://www.ixigo.com/careers',                  desc: 'Ixigo travel platform',               sector: 'Travel Tech' },
  { name: 'Cleartrip',         url: 'https://www.cleartrip.com/careers',              desc: 'Cleartrip travel portal',             sector: 'Travel Tech' },
  { name: 'EaseMyTrip',        url: 'https://www.easemytrip.com/careers',             desc: 'EaseMyTrip online travel',            sector: 'Travel Tech' },
  { name: 'Yatra',             url: 'https://www.yatra.com/careers',                  desc: 'Yatra travel portal',                 sector: 'Travel Tech' },
  // Proptech
  { name: 'NoBroker',          url: 'https://www.nobroker.in/careers',                desc: 'NoBroker proptech',                   sector: 'Travel Tech' },
  { name: 'Housing.com',       url: 'https://housing.com/careers',                    desc: 'Housing.com (REA Group)',             sector: 'Travel Tech' },
  { name: 'MagicBricks',       url: 'https://www.magicbricks.com/careers',            desc: 'MagicBricks real estate portal',      sector: 'Travel Tech' },
  // Fintech
  { name: 'Paytm',             url: 'https://paytm.com/careers',                      desc: 'Paytm payments & fintech',            sector: 'Fintech' },
  { name: 'PhonePe',           url: 'https://www.phonepe.com/careers',                desc: 'PhonePe digital payments',            sector: 'Fintech' },
  { name: 'Razorpay',          url: 'https://razorpay.com/careers',                   desc: 'Razorpay payment gateway',            sector: 'Fintech' },
  { name: 'Groww',             url: 'https://groww.in/careers',                       desc: 'Groww investment platform',           sector: 'Fintech' },
  { name: 'Zerodha',           url: 'https://zerodha.com/careers',                    desc: 'Zerodha discount broking',            sector: 'Fintech' },
  { name: 'Upstox',            url: 'https://upstox.com/careers',                     desc: 'Upstox fintech broking',              sector: 'Fintech' },
  { name: 'CRED',              url: 'https://cred.club/careers',                      desc: 'CRED fintech platform',               sector: 'Fintech' },
  { name: 'BharatPe',          url: 'https://bharatpe.com/careers',                   desc: 'BharatPe merchant payments',          sector: 'Fintech' },
  { name: 'Pine Labs',         url: 'https://www.pinelabs.com/careers',               desc: 'Pine Labs POS fintech',               sector: 'Fintech' },
  { name: 'Cashfree',          url: 'https://www.cashfree.com/careers',               desc: 'Cashfree payment solutions',          sector: 'Fintech' },
  { name: 'Juspay',            url: 'https://juspay.io/careers',                      desc: 'Juspay payments platform',            sector: 'Fintech' },
  { name: 'Lendingkart',       url: 'https://www.lendingkart.com/careers',            desc: 'Lendingkart MSME lending',            sector: 'Fintech' },
  { name: 'KreditBee',         url: 'https://www.kreditbee.in/careers',               desc: 'KreditBee personal loans',            sector: 'Fintech' },
  { name: 'Navi',              url: 'https://navi.com/careers',                       desc: 'Navi fintech platform',               sector: 'Fintech' },
  { name: 'Jupiter',           url: 'https://jupiter.money/careers',                  desc: 'Jupiter neobank',                     sector: 'Fintech' },
  { name: 'Fi Money',          url: 'https://fi.money/careers',                       desc: 'Fi Money neobank',                    sector: 'Fintech' },
  { name: 'PolicyBazaar',      url: 'https://www.policybazaar.com/careers',           desc: 'PolicyBazaar insurtech',              sector: 'Fintech' },
  { name: 'Info Edge (Naukri)', url: 'https://www.infoedge.in/careers',              desc: 'Info Edge — Naukri, 99acres, Jeevansathi', sector: 'Fintech' },
  { name: 'CCAvenue',          url: 'https://www.ccavenue.com/careers',               desc: 'CCAvenue (Infibeam) payments',        sector: 'Fintech' },
  { name: 'Slice',             url: 'https://www.sliceit.com/careers',                desc: 'Slice fintech card',                  sector: 'Fintech' },
  // Private Banks
  { name: 'HDFC Bank',         url: 'https://www.hdfcbank.com/careers',               desc: 'HDFC Bank careers',                   sector: 'Private Banks' },
  { name: 'ICICI Bank',        url: 'https://www.icicibank.com/careers',              desc: 'ICICI Bank careers',                  sector: 'Private Banks' },
  { name: 'Axis Bank',         url: 'https://www.axisbank.com/careers',               desc: 'Axis Bank careers',                   sector: 'Private Banks' },
  { name: 'Kotak Mahindra Bank', url: 'https://www.kotak.com/careers',               desc: 'Kotak Mahindra Bank',                 sector: 'Private Banks' },
  { name: 'IndusInd Bank',     url: 'https://www.indusind.com/careers',               desc: 'IndusInd Bank careers',               sector: 'Private Banks' },
  { name: 'Yes Bank',          url: 'https://www.yesbank.in/careers',                 desc: 'Yes Bank careers',                    sector: 'Private Banks' },
  { name: 'IDFC FIRST Bank',   url: 'https://www.idfcfirstbank.com/careers',          desc: 'IDFC FIRST Bank careers',             sector: 'Private Banks' },
  { name: 'Federal Bank',      url: 'https://www.federalbank.co.in/careers',          desc: 'Federal Bank Kerala',                 sector: 'Private Banks' },
  { name: 'South Indian Bank', url: 'https://www.southindianbank.com/careers',        desc: 'South Indian Bank careers',           sector: 'Private Banks' },
  { name: 'Karur Vysya Bank',  url: 'https://www.kvb.co.in/careers',                 desc: 'Karur Vysya Bank KVB',                sector: 'Private Banks' },
  { name: 'City Union Bank',   url: 'https://www.cityunionbank.com/careers',          desc: 'City Union Bank careers',             sector: 'Private Banks' },
  { name: 'RBL Bank',          url: 'https://www.rblbank.com/careers',                desc: 'RBL Bank careers',                    sector: 'Private Banks' },
  { name: 'Bandhan Bank',      url: 'https://www.bandhanbank.com/careers',            desc: 'Bandhan Bank careers',                sector: 'Private Banks' },
  { name: 'CSB Bank',          url: 'https://www.csb.co.in/careers',                  desc: 'CSB Bank careers',                    sector: 'Private Banks' },
  { name: 'DCB Bank',          url: 'https://www.dcbbank.com/careers',                desc: 'DCB Bank careers',                    sector: 'Private Banks' },
  { name: 'Tamilnad Mercantile', url: 'https://www.tmb.in/careers',                  desc: 'Tamilnad Mercantile Bank',            sector: 'Private Banks' },
  // Small Finance Banks
  { name: 'AU Small Finance',  url: 'https://www.aubank.in/careers',                  desc: 'AU Small Finance Bank',               sector: 'Small Finance Banks' },
  { name: 'Equitas SFB',       url: 'https://www.equitasbank.com/careers',            desc: 'Equitas Small Finance Bank',          sector: 'Small Finance Banks' },
  { name: 'Ujjivan SFB',       url: 'https://www.ujjivansfb.in/careers',              desc: 'Ujjivan Small Finance Bank',          sector: 'Small Finance Banks' },
  { name: 'Jana Small Finance', url: 'https://www.janabank.com/careers',              desc: 'Jana Small Finance Bank',             sector: 'Small Finance Banks' },
  { name: 'Utkarsh SFB',       url: 'https://www.utkarsh.bank/careers',               desc: 'Utkarsh Small Finance Bank',          sector: 'Small Finance Banks' },
  { name: 'ESAF SFB',          url: 'https://www.esafbank.com/careers',               desc: 'ESAF Small Finance Bank',             sector: 'Small Finance Banks' },
  { name: 'Suryoday SFB',      url: 'https://www.suryodaybank.com/careers',           desc: 'Suryoday Small Finance Bank',         sector: 'Small Finance Banks' },
  // NBFC & Finance
  { name: 'Bajaj Finance',     url: 'https://www.bajajfinserv.in/careers',            desc: 'Bajaj Finance / Bajaj Finserv',       sector: 'NBFC & Finance' },
  { name: 'Shriram Finance',   url: 'https://www.shriramfinance.in/careers',          desc: 'Shriram Finance NBFC',                sector: 'NBFC & Finance' },
  { name: 'Muthoot Finance',   url: 'https://www.muthootfinance.com/careers',         desc: 'Muthoot Finance gold loans',          sector: 'NBFC & Finance' },
  { name: 'Manappuram',        url: 'https://www.manappuram.com/careers',             desc: 'Manappuram Finance gold loans',       sector: 'NBFC & Finance' },
  { name: 'Cholamandalam',     url: 'https://www.cholamandalam.com/careers',          desc: 'Cholamandalam Finance (Murugappa)',    sector: 'NBFC & Finance' },
  { name: 'Sundaram Finance',  url: 'https://www.sundaramfinance.in/careers',         desc: 'Sundaram Finance NBFC',               sector: 'NBFC & Finance' },
  { name: 'Mahindra Finance',  url: 'https://www.mahindrafinance.com/careers',        desc: 'Mahindra Finance NBFC',               sector: 'NBFC & Finance' },
  { name: 'Tata Capital',      url: 'https://www.tatacapital.com/careers',            desc: 'Tata Capital NBFC',                   sector: 'NBFC & Finance' },
  { name: 'Aditya Birla Capital', url: 'https://www.adityabirlacapital.com/careers', desc: 'Aditya Birla Capital',                sector: 'NBFC & Finance' },
  { name: 'L&T Finance',       url: 'https://www.ltfs.com/careers',                   desc: 'L&T Finance NBFC',                    sector: 'NBFC & Finance' },
  { name: 'Piramal Finance',   url: 'https://www.piramalfinance.com/careers',         desc: 'Piramal Finance NBFC',                sector: 'NBFC & Finance' },
  { name: 'Poonawalla Fincorp', url: 'https://poonawallafincorp.com/careers',         desc: 'Poonawalla Fincorp NBFC',             sector: 'NBFC & Finance' },
  { name: 'IIFL Finance',      url: 'https://www.iifl.com/careers',                   desc: 'IIFL Finance NBFC',                   sector: 'NBFC & Finance' },
  // Wealth, Insurance & AMC
  { name: 'Motilal Oswal',     url: 'https://www.motilaloswal.com/careers',           desc: 'Motilal Oswal broking & AMC',         sector: 'Insurance & Wealth' },
  { name: 'Angel One',         url: 'https://www.angelone.in/careers',                desc: 'Angel One discount broking',          sector: 'Insurance & Wealth' },
  { name: 'HDFC AMC',          url: 'https://www.hdfcfund.com/careers',               desc: 'HDFC Asset Management',               sector: 'Insurance & Wealth' },
  { name: 'Nippon India AMC',  url: 'https://mf.nipponindiaim.com/careers',           desc: 'Nippon India Mutual Fund',            sector: 'Insurance & Wealth' },
  { name: 'UTI AMC',           url: 'https://www.utimf.com/careers',                  desc: 'UTI Asset Management',                sector: 'Insurance & Wealth' },
  { name: 'CAMS',              url: 'https://www.camsonline.com/careers',              desc: 'CAMS financial infrastructure',       sector: 'Insurance & Wealth' },
  { name: 'KFin Technologies', url: 'https://www.kfintech.com/careers',               desc: 'KFin Technologies',                   sector: 'Insurance & Wealth' },
  { name: 'HDFC Life',         url: 'https://www.hdfclife.com/careers',               desc: 'HDFC Life Insurance',                 sector: 'Insurance & Wealth' },
  { name: 'ICICI Pru Life',    url: 'https://www.iciciprulife.com/careers',           desc: 'ICICI Prudential Life Insurance',     sector: 'Insurance & Wealth' },
  { name: 'SBI Life',          url: 'https://www.sbilife.co.in/careers',              desc: 'SBI Life Insurance',                  sector: 'Insurance & Wealth' },
  { name: 'Max Life',          url: 'https://www.maxlifeinsurance.com/careers',       desc: 'Max Life Insurance',                  sector: 'Insurance & Wealth' },
  { name: 'Bajaj Allianz Life',url: 'https://www.bajajallianzlife.com/careers',       desc: 'Bajaj Allianz Life Insurance',        sector: 'Insurance & Wealth' },
  { name: 'Tata AIA',          url: 'https://www.tataaia.com/careers',                desc: 'Tata AIA Life Insurance',             sector: 'Insurance & Wealth' },
  { name: 'ICICI Lombard',     url: 'https://www.icicilombard.com/careers',           desc: 'ICICI Lombard General Insurance',     sector: 'Insurance & Wealth' },
  { name: 'HDFC ERGO',         url: 'https://www.hdfcergo.com/careers',               desc: 'HDFC ERGO General Insurance',         sector: 'Insurance & Wealth' },
  { name: 'Star Health',       url: 'https://www.starhealth.in/careers',              desc: 'Star Health Insurance',               sector: 'Insurance & Wealth' },
  { name: 'Niva Bupa',         url: 'https://www.nivabupa.com/careers',               desc: 'Niva Bupa Health Insurance',          sector: 'Insurance & Wealth' },
  { name: 'Go Digit',          url: 'https://www.godigit.com/careers',                desc: 'Go Digit insurtech',                  sector: 'Insurance & Wealth' },
  // Automobile
  { name: 'Tata Motors',       url: 'https://www.tatamotors.com/careers',             desc: 'Tata Motors automobiles',             sector: 'Automobile' },
  { name: 'Mahindra & Mahindra', url: 'https://www.mahindra.com/careers',             desc: 'Mahindra & Mahindra cars & tractors', sector: 'Automobile' },
  { name: 'Maruti Suzuki',     url: 'https://www.marutisuzuki.com/careers',           desc: 'Maruti Suzuki India',                 sector: 'Automobile' },
  { name: 'Hyundai India',     url: 'https://www.hyundai.com/in/careers',             desc: 'Hyundai Motor India',                 sector: 'Automobile' },
  { name: 'Kia India',         url: 'https://www.kia.com/in/careers',                 desc: 'Kia India careers',                   sector: 'Automobile' },
  { name: 'Toyota Kirloskar',  url: 'https://www.toyotabharat.com/careers',           desc: 'Toyota Kirloskar Motor',              sector: 'Automobile' },
  { name: 'Honda Cars India',  url: 'https://www.hondacarindia.com/careers',          desc: 'Honda Cars India',                    sector: 'Automobile' },
  { name: 'MG Motor',         url: 'https://www.mgmotor.co.in/careers',              desc: 'MG Motor (JSW) India',                sector: 'Automobile' },
  { name: 'Skoda VW India',    url: 'https://www.skoda-vw.co.in/careers',             desc: 'Skoda Auto VW Group India',           sector: 'Automobile' },
  { name: 'Bajaj Auto',        url: 'https://www.bajajauto.com/careers',              desc: 'Bajaj Auto two-wheelers',             sector: 'Automobile' },
  { name: 'TVS Motor',         url: 'https://www.tvsmotor.com/careers',               desc: 'TVS Motor Company',                   sector: 'Automobile' },
  { name: 'Hero MotoCorp',     url: 'https://www.heromotocorp.com/careers',           desc: 'Hero MotoCorp two-wheelers',          sector: 'Automobile' },
  { name: 'Royal Enfield',     url: 'https://www.royalenfield.com/careers',           desc: 'Royal Enfield (Eicher Motors)',       sector: 'Automobile' },
  { name: 'Honda 2W India',    url: 'https://www.honda2wheelersindia.com/careers',    desc: 'Honda Motorcycle & Scooter India',    sector: 'Automobile' },
  { name: 'Ather Energy',      url: 'https://www.atherenergy.com/careers',            desc: 'Ather Energy EV two-wheelers',        sector: 'Automobile' },
  { name: 'Ashok Leyland',     url: 'https://www.ashokleyland.com/careers',           desc: 'Ashok Leyland commercial vehicles',   sector: 'Automobile' },
  { name: 'VECV (Eicher Trucks)', url: 'https://www.eichertrucksandbuses.com/careers', desc: 'VE Commercial Vehicles (VECV)',     sector: 'Automobile' },
  { name: 'Force Motors',      url: 'https://www.forcemotors.com/careers',            desc: 'Force Motors vehicles',              sector: 'Automobile' },
  { name: 'Escorts Kubota',    url: 'https://www.escortskubota.com/careers',          desc: 'Escorts Kubota tractors',             sector: 'Automobile' },
  { name: 'Sonalika',          url: 'https://www.sonalika.com/careers',               desc: 'Sonalika tractors',                   sector: 'Automobile' },
  // Auto Components
  { name: 'Bosch India',       url: 'https://www.bosch.in/careers',                   desc: 'Bosch India auto components',         sector: 'Auto Components' },
  { name: 'Motherson Group',   url: 'https://www.motherson.com/careers',              desc: 'Motherson auto components',           sector: 'Auto Components' },
  { name: 'Bharat Forge',      url: 'https://www.bharatforge.com/careers',            desc: 'Bharat Forge auto components',        sector: 'Auto Components' },
  { name: 'Sona Comstar',      url: 'https://sonacomstar.com/careers',                desc: 'Sona BLW Precision (Sona Comstar)',   sector: 'Auto Components' },
  { name: 'Uno Minda',         url: 'https://www.unominda.com/careers',               desc: 'Uno Minda auto components',           sector: 'Auto Components' },
  { name: 'Endurance Tech',    url: 'https://www.endurancegroup.com/careers',         desc: 'Endurance Technologies',              sector: 'Auto Components' },
  { name: 'Exide Industries',  url: 'https://www.exideindustries.com/careers',        desc: 'Exide Industries batteries',          sector: 'Auto Components' },
  { name: 'Amara Raja',        url: 'https://www.amararajaenergy.com/careers',        desc: 'Amara Raja Energy batteries',         sector: 'Auto Components' },
  { name: 'MRF',               url: 'https://www.mrftyres.com/careers',               desc: 'MRF tyres',                           sector: 'Auto Components' },
  { name: 'Apollo Tyres',      url: 'https://www.apollotyres.com/careers',            desc: 'Apollo Tyres careers',                sector: 'Auto Components' },
  { name: 'CEAT',              url: 'https://www.ceat.com/careers',                   desc: 'CEAT tyres (RPG Group)',              sector: 'Auto Components' },
  { name: 'JK Tyre',           url: 'https://www.jktyre.com/careers',                 desc: 'JK Tyre & Industries',                sector: 'Auto Components' },
  { name: 'BKT',               url: 'https://www.bkt-tires.com/careers',              desc: 'Balkrishna Industries (BKT)',         sector: 'Auto Components' },
  { name: 'Schaeffler India',  url: 'https://www.schaeffler.co.in/careers',           desc: 'Schaeffler India bearings',           sector: 'Auto Components' },
  { name: 'ZF India',          url: 'https://www.zf.com/careers',                     desc: 'ZF India auto components',            sector: 'Auto Components' },
  { name: 'Continental India', url: 'https://www.continental.com/careers',            desc: 'Continental India auto tech',         sector: 'Auto Components' },
  { name: 'Tata AutoComp',     url: 'https://www.tataautocomp.com/careers',           desc: 'Tata AutoComp Systems',               sector: 'Auto Components' },
  // Industrial & Engineering
  { name: 'L&T',               url: 'https://www.larsentoubro.com/careers',           desc: 'Larsen & Toubro EPC / tech',          sector: 'Industrial & Engineering' },
  { name: 'Siemens India',     url: 'https://www.siemens.com/in/careers',             desc: 'Siemens India industrial tech',       sector: 'Industrial & Engineering' },
  { name: 'ABB India',         url: 'https://new.abb.com/indian-subcontinent/careers', desc: 'ABB India electrification',          sector: 'Industrial & Engineering' },
  { name: 'Schneider Electric',url: 'https://www.se.com/in/careers',                  desc: 'Schneider Electric India',            sector: 'Industrial & Engineering' },
  { name: 'Honeywell India',   url: 'https://www.honeywell.com/careers',              desc: 'Honeywell India industrial',          sector: 'Industrial & Engineering' },
  { name: 'GE Vernova India',  url: 'https://www.gevernova.com/careers',              desc: 'GE Vernova energy tech',              sector: 'Industrial & Engineering' },
  { name: 'Cummins India',     url: 'https://www.cummins.com/careers',                desc: 'Cummins India engines',               sector: 'Industrial & Engineering' },
  { name: 'Kirloskar Oil Engines', url: 'https://koel.kirloskar.com/careers',         desc: 'Kirloskar Oil Engines',               sector: 'Industrial & Engineering' },
  { name: 'Kirloskar Brothers', url: 'https://www.kirloskarpumps.com/careers',        desc: 'Kirloskar Brothers pumps',            sector: 'Industrial & Engineering' },
  { name: 'Thermax',           url: 'https://www.thermaxglobal.com/careers',          desc: 'Thermax energy & environment',        sector: 'Industrial & Engineering' },
  { name: 'Voltas',            url: 'https://www.voltas.com/careers',                 desc: 'Voltas engineering & AC (Tata)',      sector: 'Industrial & Engineering' },
  { name: 'Blue Star',         url: 'https://www.bluestarindia.com/careers',          desc: 'Blue Star AC & engineering',          sector: 'Industrial & Engineering' },
  { name: 'Carrier India',     url: 'https://www.carrier.com/careers',                desc: 'Carrier HVAC India',                  sector: 'Industrial & Engineering' },
  { name: 'Daikin India',      url: 'https://www.daikinindia.com/careers',            desc: 'Daikin India HVAC',                   sector: 'Industrial & Engineering' },
  { name: 'Elgi Equipments',   url: 'https://www.elgi.com/careers',                   desc: 'Elgi Equipments compressors',         sector: 'Industrial & Engineering' },
  { name: 'Atlas Copco India', url: 'https://www.atlascopco.com/en-in/careers',       desc: 'Atlas Copco industrial equipment',    sector: 'Industrial & Engineering' },
  // Electricals & Components
  { name: 'Crompton Greaves',  url: 'https://www.crompton.co.in/careers',             desc: 'Crompton Greaves Consumer Electricals', sector: 'Electricals & Components' },
  { name: 'Havells India',     url: 'https://www.havells.com/careers',                desc: 'Havells India electricals',           sector: 'Electricals & Components' },
  { name: 'Polycab',           url: 'https://polycab.com/careers',                    desc: 'Polycab cables & wires',              sector: 'Electricals & Components' },
  { name: 'KEI Industries',    url: 'https://www.kei-ind.com/careers',                desc: 'KEI Industries cables',               sector: 'Electricals & Components' },
  { name: 'Finolex Cables',    url: 'https://www.finolex.com/careers',                desc: 'Finolex Cables',                      sector: 'Electricals & Components' },
  { name: 'V-Guard',           url: 'https://www.vguard.in/careers',                  desc: 'V-Guard Industries',                  sector: 'Electricals & Components' },
  { name: 'Bajaj Electricals', url: 'https://www.bajajelectricals.com/careers',       desc: 'Bajaj Electricals',                   sector: 'Electricals & Components' },
  { name: 'Orient Electric',   url: 'https://www.orientelectric.com/careers',         desc: 'Orient Electric',                     sector: 'Electricals & Components' },
  { name: 'SKF India',         url: 'https://www.skf.com/in/careers',                 desc: 'SKF India bearings',                  sector: 'Electricals & Components' },
  { name: 'Timken India',      url: 'https://www.timken.com/careers',                 desc: 'Timken India bearings',               sector: 'Electricals & Components' },
  { name: 'AIA Engineering',   url: 'https://www.aiaengineering.com/careers',         desc: 'AIA Engineering castings',            sector: 'Electricals & Components' },
  // Pharma & Biotech
  { name: 'Sun Pharma',        url: 'https://sunpharma.com/careers',                  desc: 'Sun Pharmaceutical Industries',       sector: 'Pharma & Biotech' },
  { name: "Dr. Reddy's",       url: 'https://www.drreddys.com/careers',               desc: "Dr. Reddy's Laboratories",            sector: 'Pharma & Biotech' },
  { name: 'Cipla',             url: 'https://www.cipla.com/careers',                  desc: 'Cipla pharma careers',                sector: 'Pharma & Biotech' },
  { name: 'Lupin',             url: 'https://www.lupin.com/careers',                  desc: 'Lupin Pharmaceuticals',               sector: 'Pharma & Biotech' },
  { name: 'Aurobindo Pharma',  url: 'https://www.aurobindo.com/careers',              desc: 'Aurobindo Pharma',                    sector: 'Pharma & Biotech' },
  { name: 'Zydus Lifesciences',url: 'https://www.zyduslife.com/careers',              desc: 'Zydus Lifesciences (Cadila)',          sector: 'Pharma & Biotech' },
  { name: 'Torrent Pharma',    url: 'https://www.torrentpharma.com/careers',          desc: 'Torrent Pharmaceuticals',             sector: 'Pharma & Biotech' },
  { name: 'Alkem Labs',        url: 'https://www.alkemlabs.com/careers',              desc: 'Alkem Laboratories',                  sector: 'Pharma & Biotech' },
  { name: 'Mankind Pharma',    url: 'https://www.mankindpharma.com/careers',          desc: 'Mankind Pharma',                      sector: 'Pharma & Biotech' },
  { name: 'Glenmark',          url: 'https://www.glenmarkpharma.com/careers',         desc: 'Glenmark Pharmaceuticals',            sector: 'Pharma & Biotech' },
  { name: 'Ipca Labs',         url: 'https://www.ipca.com/careers',                   desc: 'Ipca Laboratories',                   sector: 'Pharma & Biotech' },
  { name: 'Ajanta Pharma',     url: 'https://www.ajantapharma.com/careers',           desc: 'Ajanta Pharmaceuticals',              sector: 'Pharma & Biotech' },
  { name: 'Emcure',            url: 'https://www.emcure.com/careers',                 desc: 'Emcure Pharmaceuticals',              sector: 'Pharma & Biotech' },
  { name: 'Macleods Pharma',   url: 'https://www.macleodspharma.com/careers',         desc: 'Macleods Pharmaceuticals',            sector: 'Pharma & Biotech' },
  { name: "Intas Pharma",      url: 'https://www.intaspharma.com/careers',            desc: 'Intas Pharmaceuticals',               sector: 'Pharma & Biotech' },
  { name: "Hetero",            url: 'https://www.hetero.com/careers',                 desc: 'Hetero Labs pharma',                  sector: 'Pharma & Biotech' },
  { name: "Divi's Labs",       url: 'https://www.divislabs.com/careers',              desc: "Divi's Laboratories API",             sector: 'Pharma & Biotech' },
  { name: 'Laurus Labs',       url: 'https://www.lauruslabs.com/careers',             desc: 'Laurus Labs pharma API',              sector: 'Pharma & Biotech' },
  { name: 'Gland Pharma',      url: 'https://glandpharma.com/careers',                desc: 'Gland Pharma injectables',            sector: 'Pharma & Biotech' },
  { name: 'Biocon',            url: 'https://www.biocon.com/careers',                 desc: 'Biocon biopharmaceuticals',           sector: 'Pharma & Biotech' },
  { name: 'Syngene',           url: 'https://www.syngeneintl.com/careers',            desc: 'Syngene contract research',           sector: 'Pharma & Biotech' },
  { name: 'Serum Institute',   url: 'https://www.seruminstitute.com/careers',         desc: 'Serum Institute of India vaccines',   sector: 'Pharma & Biotech' },
  { name: 'Bharat Biotech',    url: 'https://www.bharatbiotech.com/careers',          desc: 'Bharat Biotech vaccines',             sector: 'Pharma & Biotech' },
  { name: 'Piramal Pharma',    url: 'https://www.piramalpharma.com/careers',          desc: 'Piramal Pharma',                      sector: 'Pharma & Biotech' },
  { name: 'Abbott India',      url: 'https://www.abbott.co.in/careers',               desc: 'Abbott India pharma MNC',             sector: 'Pharma & Biotech' },
  { name: 'GSK India',         url: 'https://india-pharma.gsk.com/careers',           desc: 'GSK India pharma MNC',                sector: 'Pharma & Biotech' },
  { name: 'Pfizer India',      url: 'https://www.pfizer.co.in/careers',               desc: 'Pfizer India pharma MNC',             sector: 'Pharma & Biotech' },
  { name: 'Novartis India',    url: 'https://www.novartis.com/in-en/careers',         desc: 'Novartis India pharma MNC',           sector: 'Pharma & Biotech' },
  { name: 'Sanofi India',      url: 'https://www.sanofi.in/careers',                  desc: 'Sanofi India pharma MNC',             sector: 'Pharma & Biotech' },
  // Healthcare
  { name: 'Apollo Hospitals',  url: 'https://www.apollohospitals.com/careers',        desc: 'Apollo Hospitals Group',              sector: 'Healthcare' },
  { name: 'Fortis Healthcare', url: 'https://www.fortishealthcare.com/careers',       desc: 'Fortis Healthcare hospitals',         sector: 'Healthcare' },
  { name: 'Max Healthcare',    url: 'https://www.maxhealthcare.in/careers',            desc: 'Max Healthcare hospitals',            sector: 'Healthcare' },
  { name: 'Narayana Health',   url: 'https://www.narayanahealth.org/careers',         desc: 'Narayana Health hospitals',           sector: 'Healthcare' },
  { name: 'Manipal Hospitals', url: 'https://www.manipalhospitals.com/careers',       desc: 'Manipal Hospitals Group',             sector: 'Healthcare' },
  { name: 'Medanta',           url: 'https://www.medanta.org/careers',                desc: 'Medanta hospitals',                   sector: 'Healthcare' },
  { name: 'KIMS Hospitals',    url: 'https://www.kimshospitals.com/careers',          desc: 'KIMS Hospitals Group',                sector: 'Healthcare' },
  { name: 'Aster DM',          url: 'https://www.asterdmhealthcare.com/careers',      desc: 'Aster DM Healthcare',                 sector: 'Healthcare' },
  { name: 'Dr Lal PathLabs',   url: 'https://www.lalpathlabs.com/careers',            desc: 'Dr Lal PathLabs diagnostics',         sector: 'Healthcare' },
  { name: 'Metropolis',        url: 'https://www.metropolisindia.com/careers',        desc: 'Metropolis Healthcare diagnostics',   sector: 'Healthcare' },
  // FMCG
  { name: 'HUL',               url: 'https://www.hul.co.in/careers',                  desc: 'Hindustan Unilever',                  sector: 'FMCG' },
  { name: 'ITC',               url: 'https://www.itcportal.com/careers',              desc: 'ITC conglomerate/FMCG',               sector: 'FMCG' },
  { name: 'Nestle India',       url: 'https://www.nestle.in/careers',                  desc: 'Nestle India FMCG',                   sector: 'FMCG' },
  { name: 'Britannia',         url: 'https://www.britannia.co.in/careers',            desc: 'Britannia Industries',                sector: 'FMCG' },
  { name: 'Dabur',             url: 'https://www.dabur.com/careers',                  desc: 'Dabur India FMCG',                    sector: 'FMCG' },
  { name: 'Marico',            url: 'https://marico.com/careers',                     desc: 'Marico FMCG',                         sector: 'FMCG' },
  { name: 'Godrej Consumer',   url: 'https://www.godrejcp.com/careers',               desc: 'Godrej Consumer Products',            sector: 'FMCG' },
  { name: 'Colgate India',     url: 'https://www.colgatepalmolive.co.in/careers',     desc: 'Colgate-Palmolive India',             sector: 'FMCG' },
  { name: 'P&G India',         url: 'https://in.pg.com/careers',                      desc: 'Procter & Gamble India',              sector: 'FMCG' },
  { name: 'Emami',             url: 'https://www.emamiltd.in/careers',                desc: 'Emami FMCG',                          sector: 'FMCG' },
  { name: 'Jyothy Labs',       url: 'https://www.jyothylabs.com/careers',             desc: 'Jyothy Laboratories FMCG',            sector: 'FMCG' },
  { name: 'Tata Consumer',     url: 'https://www.tataconsumer.com/careers',           desc: 'Tata Consumer Products',              sector: 'FMCG' },
  { name: 'Zydus Wellness',    url: 'https://www.zyduswellness.com/careers',          desc: 'Zydus Wellness consumer health',      sector: 'FMCG' },
  { name: 'Wipro Consumer',    url: 'https://www.wiproconsumercare.com/careers',      desc: 'Wipro Consumer Care FMCG',            sector: 'FMCG' },
  { name: 'CavinKare',         url: 'https://www.cavinkare.com/careers',              desc: 'CavinKare FMCG',                      sector: 'FMCG' },
  { name: 'Himalaya Wellness', url: 'https://himalayawellness.in/careers',            desc: 'Himalaya Wellness FMCG',              sector: 'FMCG' },
  { name: 'Mamaearth (Honasa)', url: 'https://mamaearth.in/careers',                 desc: 'Mamaearth / Honasa D2C',              sector: 'FMCG' },
  // Food & Beverages
  { name: 'Amul (GCMMF)',      url: 'https://amul.com/careers',                       desc: 'Amul dairy cooperative',              sector: 'Food & Beverages' },
  { name: 'Mother Dairy',      url: 'https://www.motherdairy.com/careers',            desc: 'Mother Dairy dairy products',         sector: 'Food & Beverages' },
  { name: 'Parle Products',    url: 'https://www.parleproducts.com/careers',          desc: 'Parle Products biscuits & snacks',    sector: 'Food & Beverages' },
  { name: 'Haldiram',          url: 'https://www.haldiram.com/careers',               desc: "Haldiram's snacks & sweets",          sector: 'Food & Beverages' },
  { name: 'Bikaji Foods',      url: 'https://www.bikaji.com/careers',                 desc: 'Bikaji Foods snacks',                 sector: 'Food & Beverages' },
  { name: 'MTR Foods',         url: 'https://www.mtrfoods.com/careers',               desc: 'MTR Foods (Orkla) ready-to-eat',      sector: 'Food & Beverages' },
  { name: 'Adani Wilmar',      url: 'https://www.awledibleoilsandfoods.com/careers',  desc: 'Adani Wilmar (Fortune edible oils)',  sector: 'Food & Beverages' },
  { name: 'Patanjali Foods',   url: 'https://www.patanjalifoods.com/careers',         desc: 'Patanjali Foods',                     sector: 'Food & Beverages' },
  { name: 'Hatsun Agro',       url: 'https://www.hap.in/careers',                    desc: 'Hatsun Agro dairy products',          sector: 'Food & Beverages' },
  { name: 'Heritage Foods',    url: 'https://www.heritagefoods.in/careers',           desc: 'Heritage Foods dairy',                sector: 'Food & Beverages' },
  { name: 'Parag Milk Foods',  url: 'https://www.paragmilkfoods.com/careers',         desc: 'Parag Milk Foods (Gowardhan)',        sector: 'Food & Beverages' },
  { name: 'Balaji Wafers',     url: 'https://www.balajiwafers.com/careers',           desc: 'Balaji Wafers snacks',                sector: 'Food & Beverages' },
  { name: 'Coca-Cola (HCCB)',  url: 'https://www.hccb.in/careers',                   desc: 'Hindustan Coca-Cola Beverages',       sector: 'Food & Beverages' },
  { name: 'PepsiCo India',     url: 'https://www.pepsicoindia.co.in/careers',         desc: 'PepsiCo India beverages & snacks',    sector: 'Food & Beverages' },
  { name: 'Varun Beverages',   url: 'https://varunbeverages.com/careers',             desc: 'Varun Beverages (PepsiCo bottler)',   sector: 'Food & Beverages' },
  { name: 'United Breweries',  url: 'https://www.unitedbreweries.com/careers',        desc: 'United Breweries (Heineken/UB)',      sector: 'Food & Beverages' },
  { name: 'United Spirits',    url: 'https://www.diageoindia.com/careers',            desc: 'United Spirits (Diageo India)',       sector: 'Food & Beverages' },
  { name: 'Radico Khaitan',    url: 'https://www.radicokhaitan.com/careers',          desc: 'Radico Khaitan spirits',              sector: 'Food & Beverages' },
  // Retail & Consumer
  { name: 'Reliance Retail',   url: 'https://relianceretail.com/careers',             desc: 'Reliance Retail careers',             sector: 'Retail & Consumer' },
  { name: 'DMart',             url: 'https://www.dmartindia.com/careers',             desc: 'Avenue Supermarts (DMart)',           sector: 'Retail & Consumer' },
  { name: 'Trent (Westside)',  url: 'https://www.trentlimited.com/careers',           desc: 'Trent — Westside / Zudio',            sector: 'Retail & Consumer' },
  { name: 'Aditya Birla Fashion', url: 'https://www.abfrl.com/careers',              desc: 'ABFRL — Pantaloons / brands',         sector: 'Retail & Consumer' },
  { name: 'Shoppers Stop',     url: 'https://www.shoppersstop.com/careers',           desc: 'Shoppers Stop department stores',     sector: 'Retail & Consumer' },
  { name: 'Lifestyle (Landmark)', url: 'https://www.lifestylestores.com/careers',    desc: 'Lifestyle International',             sector: 'Retail & Consumer' },
  { name: 'V-Mart',            url: 'https://www.vmartretail.com/careers',            desc: 'V-Mart value retail',                 sector: 'Retail & Consumer' },
  { name: 'Vishal Mega Mart',  url: 'https://www.vishalmegamart.com/careers',         desc: 'Vishal Mega Mart value retail',       sector: 'Retail & Consumer' },
  { name: 'Titan',             url: 'https://www.titancompany.in/careers',            desc: 'Titan jewellery & watches',           sector: 'Retail & Consumer' },
  { name: 'Kalyan Jewellers',  url: 'https://www.kalyanjewellers.net/careers',        desc: 'Kalyan Jewellers',                    sector: 'Retail & Consumer' },
  { name: 'Malabar Gold',      url: 'https://www.malabargoldanddiamonds.com/careers', desc: 'Malabar Gold & Diamonds',             sector: 'Retail & Consumer' },
  { name: 'Senco Gold',        url: 'https://sencogoldanddiamonds.com/careers',       desc: 'Senco Gold & Diamonds',               sector: 'Retail & Consumer' },
  { name: 'Bata India',        url: 'https://www.bata.in/careers',                    desc: 'Bata India footwear',                 sector: 'Retail & Consumer' },
  { name: 'Metro Brands',      url: 'https://www.metrobrands.com/careers',            desc: 'Metro Brands footwear (Mochi/Crocs)', sector: 'Retail & Consumer' },
  { name: 'Relaxo',            url: 'https://www.relaxofootwear.com/careers',         desc: 'Relaxo Footwear',                     sector: 'Retail & Consumer' },
  { name: 'Page Industries',   url: 'https://www.jockey.in/careers',                  desc: 'Page Industries (Jockey India)',      sector: 'Retail & Consumer' },
  { name: 'Raymond',           url: 'https://www.raymond.in/careers',                 desc: 'Raymond apparel & textiles',          sector: 'Retail & Consumer' },
  { name: 'Arvind Ltd',        url: 'https://www.arvind.com/careers',                 desc: 'Arvind Limited textiles',             sector: 'Retail & Consumer' },
  { name: 'Fabindia',          url: 'https://www.fabindia.com/careers',               desc: 'Fabindia retail',                     sector: 'Retail & Consumer' },
  // Telecom & Conglomerates
  { name: 'Reliance Industries', url: 'https://www.ril.com/careers',                 desc: 'Reliance Industries conglomerate',    sector: 'Telecom & Conglomerates' },
  { name: 'Jio',               url: 'https://www.jio.com/careers',                   desc: 'Reliance Jio telecom',                sector: 'Telecom & Conglomerates' },
  { name: 'Bharti Airtel',     url: 'https://www.airtel.in/careers',                 desc: 'Bharti Airtel telecom',               sector: 'Telecom & Conglomerates' },
  { name: 'Vodafone Idea (Vi)', url: 'https://www.myvi.in/careers',                  desc: 'Vodafone Idea telecom',               sector: 'Telecom & Conglomerates' },
  { name: 'Indus Towers',      url: 'https://www.industowers.com/careers',            desc: 'Indus Towers telecom infra',          sector: 'Telecom & Conglomerates' },
  { name: 'Tata Communications', url: 'https://www.tatacommunications.com/careers',  desc: 'Tata Communications',                 sector: 'Telecom & Conglomerates' },
  { name: 'Adani Group',       url: 'https://www.adani.com/careers',                 desc: 'Adani Group conglomerate',            sector: 'Telecom & Conglomerates' },
  { name: 'Grasim (ABGL)',     url: 'https://www.grasim.com/careers',                desc: 'Grasim Industries (Aditya Birla)',    sector: 'Telecom & Conglomerates' },
  // Power & Renewables
  { name: 'Tata Power',        url: 'https://www.tatapower.com/careers',              desc: 'Tata Power utility',                  sector: 'Power & Renewables' },
  { name: 'Torrent Power',     url: 'https://www.torrentpower.com/careers',           desc: 'Torrent Power utility',               sector: 'Power & Renewables' },
  { name: 'CESC',              url: 'https://www.cesc.co.in/careers',                 desc: 'CESC power distribution',             sector: 'Power & Renewables' },
  { name: 'JSW Energy',        url: 'https://www.jsw.in/energy/careers',              desc: 'JSW Energy power',                    sector: 'Power & Renewables' },
  { name: 'ReNew',             url: 'https://renew.com/careers',                      desc: 'ReNew Power renewables',              sector: 'Power & Renewables' },
  { name: 'Suzlon',            url: 'https://www.suzlon.com/careers',                 desc: 'Suzlon wind energy',                  sector: 'Power & Renewables' },
  { name: 'Inox Wind',         url: 'https://www.inoxwind.com/careers',               desc: 'Inox Wind turbines',                  sector: 'Power & Renewables' },
  { name: 'Waaree Energies',   url: 'https://www.waaree.com/careers',                 desc: 'Waaree solar manufacturing',          sector: 'Power & Renewables' },
  { name: 'Vikram Solar',      url: 'https://www.vikramsolar.com/careers',            desc: 'Vikram Solar manufacturing',          sector: 'Power & Renewables' },
  { name: 'Adani Green',       url: 'https://www.adanigreenenergy.com/careers',       desc: 'Adani Green Energy renewables',       sector: 'Power & Renewables' },
  // Metals, Cement & Chemicals
  { name: 'Tata Steel',        url: 'https://www.tatasteel.com/careers',              desc: 'Tata Steel',                          sector: 'Metals, Cement & Chemicals' },
  { name: 'JSW Steel',         url: 'https://www.jsw.in/careers',                    desc: 'JSW Steel',                           sector: 'Metals, Cement & Chemicals' },
  { name: 'Jindal Steel',      url: 'https://www.jindalsteelpower.com/careers',       desc: 'Jindal Steel & Power',                sector: 'Metals, Cement & Chemicals' },
  { name: 'Vedanta',           url: 'https://www.vedantalimited.com/careers',         desc: 'Vedanta metals & mining',             sector: 'Metals, Cement & Chemicals' },
  { name: 'Hindalco',          url: 'https://www.hindalco.com/careers',               desc: 'Hindalco aluminium (Aditya Birla)',   sector: 'Metals, Cement & Chemicals' },
  { name: 'Hindustan Zinc',    url: 'https://www.hzlindia.com/careers',               desc: 'Hindustan Zinc (Vedanta)',            sector: 'Metals, Cement & Chemicals' },
  { name: 'APL Apollo',        url: 'https://www.aplapollo.com/careers',              desc: 'APL Apollo steel tubes',              sector: 'Metals, Cement & Chemicals' },
  { name: 'UltraTech Cement',  url: 'https://www.ultratechcement.com/careers',        desc: 'UltraTech Cement (Aditya Birla)',     sector: 'Metals, Cement & Chemicals' },
  { name: 'Ambuja Cements',    url: 'https://www.ambujacement.com/careers',           desc: 'Ambuja Cements (Adani)',              sector: 'Metals, Cement & Chemicals' },
  { name: 'ACC',               url: 'https://www.acclimited.com/careers',             desc: 'ACC cement (Adani)',                  sector: 'Metals, Cement & Chemicals' },
  { name: 'Shree Cement',      url: 'https://www.shreecement.com/careers',            desc: 'Shree Cement',                        sector: 'Metals, Cement & Chemicals' },
  { name: 'Dalmia Bharat',     url: 'https://www.dalmiabharat.com/careers',           desc: 'Dalmia Bharat cement',                sector: 'Metals, Cement & Chemicals' },
  { name: 'JK Cement',         url: 'https://www.jkcement.com/careers',               desc: 'JK Cement',                           sector: 'Metals, Cement & Chemicals' },
  { name: 'Asian Paints',      url: 'https://www.asianpaints.com/careers',            desc: 'Asian Paints',                        sector: 'Metals, Cement & Chemicals' },
  { name: 'Berger Paints',     url: 'https://www.bergerpaints.com/careers',           desc: 'Berger Paints India',                 sector: 'Metals, Cement & Chemicals' },
  { name: 'Kansai Nerolac',    url: 'https://www.nerolac.com/careers',                desc: 'Kansai Nerolac Paints',               sector: 'Metals, Cement & Chemicals' },
  { name: 'Pidilite (Fevicol)', url: 'https://www.pidilite.com/careers',              desc: 'Pidilite Industries adhesives',       sector: 'Metals, Cement & Chemicals' },
  { name: 'SRF',               url: 'https://www.srf.com/careers',                   desc: 'SRF Limited specialty chemicals',     sector: 'Metals, Cement & Chemicals' },
  { name: 'Aarti Industries',  url: 'https://www.aarti-industries.com/careers',       desc: 'Aarti Industries chemicals',          sector: 'Metals, Cement & Chemicals' },
  { name: 'Deepak Nitrite',    url: 'https://www.godeepak.com/careers',               desc: 'Deepak Nitrite specialty chemicals',  sector: 'Metals, Cement & Chemicals' },
  { name: 'Tata Chemicals',    url: 'https://www.tatachemicals.com/careers',          desc: 'Tata Chemicals',                      sector: 'Metals, Cement & Chemicals' },
  { name: 'UPL',               url: 'https://www.upl-ltd.com/careers',                desc: 'UPL agrochemicals',                   sector: 'Metals, Cement & Chemicals' },
  { name: 'PI Industries',     url: 'https://www.piindustries.com/careers',           desc: 'PI Industries agrochemicals',         sector: 'Metals, Cement & Chemicals' },
  { name: 'Coromandel Intl',   url: 'https://www.coromandel.biz/careers',             desc: 'Coromandel International fertilizers', sector: 'Metals, Cement & Chemicals' },
  { name: 'Astral Ltd',        url: 'https://www.astralltd.com/careers',              desc: 'Astral pipes & adhesives',            sector: 'Metals, Cement & Chemicals' },
  { name: 'Supreme Industries', url: 'https://www.supreme.co.in/careers',             desc: 'Supreme Industries plastics/pipes',   sector: 'Metals, Cement & Chemicals' },
  { name: 'Kajaria Ceramics',  url: 'https://www.kajariaceramics.com/careers',        desc: 'Kajaria Ceramics tiles',              sector: 'Metals, Cement & Chemicals' },
  // Infrastructure & Construction
  { name: 'Shapoorji Pallonji', url: 'https://www.shapoorjipallonji.com/careers',    desc: 'Shapoorji Pallonji construction',     sector: 'Infrastructure' },
  { name: 'Afcons',            url: 'https://www.afcons.com/careers',                 desc: 'Afcons Infrastructure EPC',           sector: 'Infrastructure' },
  { name: 'NCC Ltd',           url: 'https://ncclimited.com/careers',                 desc: 'NCC Limited construction',            sector: 'Infrastructure' },
  { name: 'KEC International', url: 'https://www.kecrpg.com/careers',                desc: 'KEC International EPC (RPG)',         sector: 'Infrastructure' },
  { name: 'Kalpataru Projects',url: 'https://kalpataruprojects.com/careers',          desc: 'Kalpataru Projects EPC',              sector: 'Infrastructure' },
  { name: 'Dilip Buildcon',    url: 'https://www.dilipbuildcon.com/careers',          desc: 'Dilip Buildcon roads EPC',            sector: 'Infrastructure' },
  { name: 'IRB Infrastructure', url: 'https://www.irb.co.in/careers',                desc: 'IRB Infrastructure roads',            sector: 'Infrastructure' },
  { name: 'GR Infraprojects',  url: 'https://grinfra.com/careers',                   desc: 'GR Infraprojects roads EPC',          sector: 'Infrastructure' },
  { name: 'PNC Infratech',     url: 'https://www.pncinfratech.com/careers',           desc: 'PNC Infratech roads EPC',             sector: 'Infrastructure' },
  { name: 'Tata Projects',     url: 'https://www.tataprojects.com/careers',           desc: 'Tata Projects EPC',                   sector: 'Infrastructure' },
  { name: 'Megha Engineering', url: 'https://meil.in/careers',                        desc: 'MEIL infrastructure EPC',             sector: 'Infrastructure' },
  { name: 'DLF',               url: 'https://www.dlf.in/careers',                    desc: 'DLF real estate',                     sector: 'Infrastructure' },
  { name: 'Godrej Properties', url: 'https://www.godrejproperties.com/careers',       desc: 'Godrej Properties real estate',       sector: 'Infrastructure' },
  { name: 'Lodha',             url: 'https://www.lodhagroup.in/careers',              desc: 'Lodha Developers (Macrotech)',        sector: 'Infrastructure' },
  { name: 'Prestige Group',    url: 'https://www.prestigeconstructions.com/careers',  desc: 'Prestige Group real estate',          sector: 'Infrastructure' },
  { name: 'Oberoi Realty',     url: 'https://www.oberoirealty.com/careers',           desc: 'Oberoi Realty',                       sector: 'Infrastructure' },
  // Logistics & Aviation
  { name: 'Delhivery',         url: 'https://www.delhivery.com/careers',              desc: 'Delhivery logistics tech',            sector: 'Logistics & Aviation' },
  { name: 'Ecom Express',      url: 'https://www.ecomexpress.in/careers',             desc: 'Ecom Express courier',                sector: 'Logistics & Aviation' },
  { name: 'XpressBees',        url: 'https://www.xpressbees.com/careers',             desc: 'XpressBees express logistics',        sector: 'Logistics & Aviation' },
  { name: 'Shadowfax',         url: 'https://www.shadowfax.in/careers',               desc: 'Shadowfax last-mile logistics',       sector: 'Logistics & Aviation' },
  { name: 'Blue Dart',         url: 'https://www.bluedart.com/careers',               desc: 'Blue Dart Express (DHL)',             sector: 'Logistics & Aviation' },
  { name: 'DTDC',              url: 'https://www.dtdc.in/careers',                    desc: 'DTDC courier services',               sector: 'Logistics & Aviation' },
  { name: 'Gati (Allcargo)',   url: 'https://www.gati.com/careers',                   desc: 'Gati surface logistics',              sector: 'Logistics & Aviation' },
  { name: 'Allcargo Logistics', url: 'https://www.allcargologistics.com/careers',     desc: 'Allcargo Logistics',                  sector: 'Logistics & Aviation' },
  { name: 'Mahindra Logistics', url: 'https://mahindralogistics.com/careers',         desc: 'Mahindra Logistics',                  sector: 'Logistics & Aviation' },
  { name: 'TVS Supply Chain',  url: 'https://www.tvsscs.com/careers',                 desc: 'TVS Supply Chain Solutions',          sector: 'Logistics & Aviation' },
  { name: 'Adani Ports',       url: 'https://www.adaniports.com/careers',             desc: 'Adani Ports APSEZ',                   sector: 'Logistics & Aviation' },
  { name: 'IndiGo',            url: 'https://www.goindigo.in/careers',                desc: 'IndiGo airlines',                     sector: 'Logistics & Aviation' },
  { name: 'Air India',         url: 'https://www.airindia.com/careers',               desc: 'Air India (Tata) careers',            sector: 'Logistics & Aviation' },
  { name: 'Akasa Air',         url: 'https://www.akasaair.com/careers',               desc: 'Akasa Air careers',                   sector: 'Logistics & Aviation' },
  { name: 'SpiceJet',          url: 'https://www.spicejet.com/careers',               desc: 'SpiceJet airlines',                   sector: 'Logistics & Aviation' },
  // Hospitality & Media
  { name: 'Taj Hotels (IHCL)', url: 'https://www.ihcltata.com/careers',              desc: 'Indian Hotels Company (Taj)',         sector: 'Hospitality & Media' },
  { name: 'Oberoi Hotels (EIH)', url: 'https://www.oberoihotels.com/careers',        desc: 'EIH (Oberoi Hotels)',                 sector: 'Hospitality & Media' },
  { name: 'ITC Hotels',        url: 'https://www.itchotels.com/careers',              desc: 'ITC Hotels',                          sector: 'Hospitality & Media' },
  { name: 'Lemon Tree Hotels', url: 'https://www.lemontreehotels.com/careers',        desc: 'Lemon Tree Hotels',                   sector: 'Hospitality & Media' },
  { name: 'OYO',               url: 'https://www.oyorooms.com/careers',               desc: 'OYO Rooms hospitality tech',          sector: 'Hospitality & Media' },
  { name: 'Zee Entertainment', url: 'https://www.zee.com/careers',                   desc: 'Zee Entertainment Networks',          sector: 'Hospitality & Media' },
  { name: 'Sun TV Network',    url: 'https://www.suntv.in/careers',                  desc: 'Sun TV Network media',                sector: 'Hospitality & Media' },
  { name: 'Network18',         url: 'https://www.nw18.com/careers',                  desc: 'Network18 media group',               sector: 'Hospitality & Media' },
  { name: 'Times Group (BCCL)',url: 'https://www.timesgroup.com/careers',             desc: 'Times of India / Times Group',        sector: 'Hospitality & Media' },
  { name: 'PVR INOX',          url: 'https://www.pvrinox.com/careers',               desc: 'PVR INOX cinemas',                    sector: 'Hospitality & Media' },
  // BPO & Outsourcing
  { name: 'Genpact',           url: 'https://www.genpact.com/careers',               desc: 'Genpact BPM & analytics',             sector: 'BPO & Outsourcing' },
  { name: 'WNS',               url: 'https://www.wns.com/careers',                   desc: 'WNS Holdings BPM',                    sector: 'BPO & Outsourcing' },
  { name: 'Concentrix',        url: 'https://www.concentrix.com/careers',             desc: 'Concentrix BPO',                      sector: 'BPO & Outsourcing' },
  { name: 'Teleperformance',   url: 'https://www.teleperformance.com/careers',        desc: 'Teleperformance India BPO',           sector: 'BPO & Outsourcing' },
  { name: 'Firstsource',       url: 'https://www.firstsource.com/careers',            desc: 'Firstsource Solutions BPO',           sector: 'BPO & Outsourcing' },
  { name: 'Hinduja Global (HGS)', url: 'https://hgs.cx/careers',                     desc: 'Hinduja Global Solutions BPO',        sector: 'BPO & Outsourcing' },
  { name: 'Infosys BPM',       url: 'https://www.infosysbpm.com/careers',             desc: 'Infosys BPM operations',              sector: 'BPO & Outsourcing' },
  { name: 'Startek',           url: 'https://www.startek.com/careers',                desc: 'Startek BPO',                         sector: 'BPO & Outsourcing' },
  { name: 'TeamLease',         url: 'https://www.teamleasegroup.com/careers',         desc: 'TeamLease staffing services',         sector: 'BPO & Outsourcing' },
  { name: 'Quess Corp',        url: 'https://www.quesscorp.com/careers',              desc: 'Quess Corp staffing',                 sector: 'BPO & Outsourcing' },
  { name: 'Randstad India',    url: 'https://www.randstad.in/careers',                desc: 'Randstad India HR services',          sector: 'BPO & Outsourcing' },
  { name: 'ManpowerGroup',     url: 'https://www.manpowergroup.co.in/careers',        desc: 'ManpowerGroup India staffing',        sector: 'BPO & Outsourcing' },
  { name: 'Sodexo India',      url: 'https://in.sodexo.com/careers',                 desc: 'Sodexo India facility management',    sector: 'BPO & Outsourcing' },
  { name: 'SIS India',         url: 'https://www.sisindia.com/careers',               desc: 'SIS India security services',         sector: 'BPO & Outsourcing' },
  // EdTech & Education
  { name: 'Physics Wallah',    url: 'https://www.pw.live/careers',                   desc: 'Physics Wallah EdTech',               sector: 'EdTech & Education' },
  { name: 'upGrad',            url: 'https://www.upgrad.com/careers',                 desc: 'upGrad higher education EdTech',      sector: 'EdTech & Education' },
  { name: 'Unacademy',         url: 'https://unacademy.com/careers',                  desc: 'Unacademy online learning',           sector: 'EdTech & Education' },
  { name: 'Vedantu',           url: 'https://www.vedantu.com/careers',                desc: 'Vedantu live online tutoring',        sector: 'EdTech & Education' },
  { name: 'Simplilearn',       url: 'https://www.simplilearn.com/careers',            desc: 'Simplilearn professional learning',   sector: 'EdTech & Education' },
  { name: 'Great Learning',    url: 'https://www.mygreatlearning.com/careers',        desc: 'Great Learning (byju\'s / OD)',       sector: 'EdTech & Education' },
  { name: 'Scaler',            url: 'https://www.scaler.com/careers',                 desc: 'Scaler tech education',               sector: 'EdTech & Education' },
  { name: 'NIIT',              url: 'https://www.niit.com/careers',                   desc: 'NIIT training & development',         sector: 'EdTech & Education' },
  { name: 'Aakash Educational',url: 'https://www.aakash.ac.in/careers',              desc: 'Aakash coaching institute',           sector: 'EdTech & Education' },
  { name: 'Allen Career Institute', url: 'https://www.allen.ac.in/careers',          desc: 'Allen career coaching',               sector: 'EdTech & Education' },
  // Agriculture & Textiles
  { name: 'Godrej Agrovet',    url: 'https://www.godrejagrovet.com/careers',          desc: 'Godrej Agrovet agri',                 sector: 'Agriculture & Textiles' },
  { name: 'Jain Irrigation',   url: 'https://www.jains.com/careers',                 desc: 'Jain Irrigation systems',             sector: 'Agriculture & Textiles' },
  { name: 'Cargill India',     url: 'https://www.cargill.co.in/careers',              desc: 'Cargill India agri/food',             sector: 'Agriculture & Textiles' },
  { name: 'UPL',               url: 'https://www.upl-ltd.com/careers',                desc: 'UPL crop protection',                 sector: 'Agriculture & Textiles' },
  { name: 'Welspun Living',    url: 'https://www.welspunliving.com/careers',          desc: 'Welspun home textiles',               sector: 'Agriculture & Textiles' },
  { name: 'Trident Group',     url: 'https://www.tridentindia.com/careers',           desc: 'Trident Group textiles',              sector: 'Agriculture & Textiles' },
  { name: 'Vardhman Textiles', url: 'https://www.vardhman.com/careers',               desc: 'Vardhman Textiles',                   sector: 'Agriculture & Textiles' },
  { name: 'KPR Mill',          url: 'https://www.kprmilllimited.com/careers',         desc: 'KPR Mill textiles',                   sector: 'Agriculture & Textiles' },
  { name: 'Amber Enterprises', url: 'https://www.ambergroupindia.com/careers',        desc: 'Amber Enterprises electronics mfg',  sector: 'Agriculture & Textiles' },
]

const SECTOR_COLORS = {
  'IT & Software':             'bg-blue-50 text-blue-700',
  'Tech / MNCs':               'bg-indigo-50 text-indigo-700',
  'Semiconductors':            'bg-violet-50 text-violet-700',
  'E-commerce':                'bg-orange-50 text-orange-700',
  'Food Tech & Mobility':      'bg-red-50 text-red-700',
  'Travel Tech':               'bg-cyan-50 text-cyan-700',
  'Fintech':                   'bg-green-50 text-green-700',
  'Private Banks':             'bg-emerald-50 text-emerald-700',
  'Small Finance Banks':       'bg-teal-50 text-teal-700',
  'NBFC & Finance':            'bg-lime-50 text-lime-700',
  'Insurance & Wealth':        'bg-yellow-50 text-yellow-700',
  'Automobile':                'bg-amber-50 text-amber-700',
  'Auto Components':           'bg-stone-50 text-stone-700',
  'Industrial & Engineering':  'bg-slate-50 text-slate-700',
  'Electricals & Components':  'bg-gray-50 text-gray-700',
  'Pharma & Biotech':          'bg-pink-50 text-pink-700',
  'Healthcare':                'bg-rose-50 text-rose-700',
  'FMCG':                      'bg-fuchsia-50 text-fuchsia-700',
  'Food & Beverages':          'bg-purple-50 text-purple-700',
  'Retail & Consumer':         'bg-sky-50 text-sky-700',
  'Telecom & Conglomerates':   'bg-blue-50 text-blue-700',
  'Power & Renewables':        'bg-yellow-50 text-yellow-700',
  'Metals, Cement & Chemicals':'bg-zinc-50 text-zinc-700',
  'Infrastructure':            'bg-orange-50 text-orange-700',
  'Logistics & Aviation':      'bg-cyan-50 text-cyan-700',
  'Hospitality & Media':       'bg-pink-50 text-pink-700',
  'BPO & Outsourcing':         'bg-indigo-50 text-indigo-700',
  'EdTech & Education':        'bg-green-50 text-green-700',
  'Agriculture & Textiles':    'bg-lime-50 text-lime-700',
}

// Ordered sector list (matches COMPANY_DIRECTORY order of appearance)
const SECTORS_ORDERED = [
  'IT & Software',
  'Tech / MNCs',
  'Semiconductors',
  'E-commerce',
  'Food Tech & Mobility',
  'Travel Tech',
  'Fintech',
  'Private Banks',
  'Small Finance Banks',
  'NBFC & Finance',
  'Insurance & Wealth',
  'Automobile',
  'Auto Components',
  'Industrial & Engineering',
  'Electricals & Components',
  'Pharma & Biotech',
  'Healthcare',
  'FMCG',
  'Food & Beverages',
  'Retail & Consumer',
  'Telecom & Conglomerates',
  'Power & Renewables',
  'Metals, Cement & Chemicals',
  'Infrastructure',
  'Logistics & Aviation',
  'Hospitality & Media',
  'BPO & Outsourcing',
  'EdTech & Education',
  'Agriculture & Textiles',
]

// Precomputed count per sector
const SECTOR_COUNTS = SECTORS_ORDERED.reduce((acc, s) => {
  acc[s] = COMPANY_DIRECTORY.filter(c => c.sector === s).length
  return acc
}, {})

// ─── Linksdoor subscriber company card ────────────────────────────────────────

function CompanyCard({ company, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow flex items-start gap-4"
    >
      {company.logo ? (
        <img src={company.logo} alt={company.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Building2 className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground">{company.name}</h3>
        {company.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{company.description}</p>
        )}
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
          <Briefcase className="h-3.5 w-3.5" />
          {company.active_job_count} open position{company.active_job_count !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  )
}

// ─── Career directory link card ────────────────────────────────────────────────

function CareerLinkCard({ name, url, desc, sector }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{name}</p>
          {sector && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${SECTOR_COLORS[sector] || 'bg-gray-50 text-gray-700'}`}>
              {sector}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </a>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Companies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dirSearch, setDirSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const linksdoorRef = useRef(null)
  const directoryRef = useRef(null)

  useEffect(() => {
    companyService.list()
      .then(({ data }) => setCompanies(data.results ?? data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
      )
    : companies

  const filteredDir = COMPANY_DIRECTORY.filter(c => {
    const matchSector = sectorFilter === 'all' || c.sector === sectorFilter
    const matchSearch = !dirSearch.trim() ||
      c.name.toLowerCase().includes(dirSearch.toLowerCase()) ||
      c.desc.toLowerCase().includes(dirSearch.toLowerCase()) ||
      c.sector.toLowerCase().includes(dirSearch.toLowerCase())
    return matchSector && matchSearch
  })

  // Truncate long sector names for sidebar display
  function truncateSector(name, max = 18) {
    return name.length > max ? name.slice(0, max - 1) + '\u2026' : name
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* ── Top section: Companies Hiring on Linksdoor (full width) ── */}
      <section ref={linksdoorRef}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Companies Hiring on Linksdoor</h1>
          <p className="text-muted-foreground mt-1">
            Browse companies actively hiring on Linksdoor with open positions.
            {companies.length > 0 && (
              <span className="ml-2 font-medium text-foreground">
                {companies.length} compan{companies.length !== 1 ? 'ies' : 'y'}
              </span>
            )}
          </p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            {search ? 'No companies match your search.' : 'No companies are currently hiring on Linksdoor.'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => navigate(`/careers/${company.slug}`)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="border-t" />

      {/* ── Bottom section: Sidebar + Career Directory ── */}
      <div ref={directoryRef}>

        {/* Mobile: sector pill strip */}
        <div className="md:hidden mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSectorFilter('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sectorFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white border-border text-muted-foreground'
              }`}
            >
              All Sectors
            </button>
            {SECTORS_ORDERED.map(s => (
              <button
                key={s}
                onClick={() => setSectorFilter(s)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sectorFilter === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white border-border text-muted-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Sticky sidebar (desktop only) ── */}
          <aside className="hidden md:block w-52 shrink-0 sticky top-4">
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 border-b bg-gray-50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sectors</p>
              </div>
              <nav className="py-1">
                <button
                  onClick={() => setSectorFilter('all')}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                    sectorFilter === 'all'
                      ? 'bg-primary/8 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sectorFilter === 'all' ? 'bg-primary' : 'bg-current opacity-30'}`} />
                  All Sectors
                  <span className="ml-auto text-xs opacity-60 shrink-0">{COMPANY_DIRECTORY.length}</span>
                </button>

                <div className="my-1 border-t" />

                {SECTORS_ORDERED.map(s => {
                  const isActive = sectorFilter === s
                  const colorClass = isActive ? SECTOR_COLORS[s] || 'bg-gray-50 text-gray-700' : ''
                  return (
                    <button
                      key={s}
                      onClick={() => setSectorFilter(s)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? `${colorClass} font-medium`
                          : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
                      }`}
                    >
                      <span className="pl-2 truncate">{truncateSector(s)}</span>
                      <span className="text-[10px] shrink-0 ml-1 opacity-60">({SECTOR_COUNTS[s]})</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* ── Directory content ── */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">India Company Career Directory</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Direct links to careers pages of {COMPANY_DIRECTORY.length}+ major Indian & MNC companies.
                Click any card to go to their official careers portal.
              </p>
            </div>

            {/* Search + count */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search companies or sectors..."
                  value={dirSearch}
                  onChange={e => setDirSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <span className="text-xs text-muted-foreground self-center">
                {filteredDir.length} of {COMPANY_DIRECTORY.length} companies
                {sectorFilter !== 'all' && (
                  <span className="ml-1">
                    in <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SECTOR_COLORS[sectorFilter] || 'bg-gray-50 text-gray-700'}`}>{sectorFilter}</span>
                  </span>
                )}
              </span>
            </div>

            {filteredDir.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No companies match your search.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredDir.map(c => (
                  <CareerLinkCard key={c.name + c.sector} name={c.name} url={c.url} desc={c.desc} sector={c.sector} />
                ))}
              </div>
            )}

            <p className="mt-10 text-xs text-muted-foreground text-center border-t pt-6">
              Career links go directly to official company portals. Linksdoor is not affiliated with any listed company.
              Always verify job openings on the official careers page before applying.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
