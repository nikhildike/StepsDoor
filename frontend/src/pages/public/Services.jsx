/**
 * Services.jsx
 *
 * Public directory page mounted at `/services` (see App.jsx). Entirely
 * static, hand-curated content — no backend calls. Lists Indian service
 * providers/platforms (legal, accounting, healthcare, logistics, etc.)
 * grouped by category (SERVICE_GROUPS below), each linking straight to the
 * provider's own site. Supports category filtering (sidebar on desktop,
 * pill strip on mobile) and a search that spans every category.
 */
import { useState } from 'react'
import { ExternalLink, Globe, Monitor, Scale, Calculator, IndianRupee, HeartPulse, GraduationCap, UtensilsCrossed, Truck, Wrench, Shield, Building2, Sparkles, Shirt, Camera, Plane, Recycle, Wifi, Search } from 'lucide-react'

// Static directory data: one entry per service category, each holding its
// icon, accent color, blurb, and the list of providers shown as outbound
// link cards. Hand-maintained content, not fetched from the backend.
const SERVICE_GROUPS = [
  {
    id: 'marketplaces',
    label: 'Service Marketplaces',
    icon: Globe,
    color: 'blue',
    desc: 'Master platforms where thousands of local vendors are listed city-by-city',
    providers: [
      { name: 'Justdial',         url: 'https://www.justdial.com',                      desc: 'India\'s largest local services directory'   },
      { name: 'Sulekha',          url: 'https://www.sulekha.com',                       desc: 'Find verified professionals for any service'  },
      { name: 'Urban Company',    url: 'https://www.urbancompany.com',                  desc: 'Home services, beauty & repairs on demand'   },
      { name: 'IndiaMart',        url: 'https://www.indiamart.com',                     desc: 'B2B marketplace — suppliers, manufacturers'   },
      { name: 'TradeIndia',       url: 'https://www.tradeindia.com',                    desc: 'Indian B2B trade & supplier directory'        },
      { name: 'Exporters India',  url: 'https://www.exportersindia.com',                desc: 'Exporters, manufacturers & service providers' },
      { name: 'HouseJoy',         url: 'https://www.housejoy.in',                       desc: 'Home maintenance & repair services'           },
      { name: 'NoBroker Services',url: 'https://www.nobroker.in/services',              desc: 'Home services — cleaning, movers, plumbing'   },
      { name: 'OLX Services',     url: 'https://www.olx.in/services',                  desc: 'Classifieds for local service ads'             },
      { name: 'Quikr Services',   url: 'https://www.quikr.com/services',               desc: 'Local service classifieds across India'        },
      { name: 'WedMeGood',        url: 'https://www.wedmegood.com',                     desc: 'Wedding vendors — photographers, decorators'  },
      { name: 'Weddingz.in',      url: 'https://www.weddingz.in',                      desc: 'Venues, caterers & wedding service vendors'   },
      { name: 'ShadiSaga',        url: 'https://www.shaadisaga.com',                    desc: 'Wedding planning & vendor discovery'          },
      { name: 'Canvera',          url: 'https://www.canvera.com',                       desc: 'Wedding photographers & albums'               },
    ],
  },
  {
    id: 'it',
    label: 'IT & Software Services',
    icon: Monitor,
    color: 'indigo',
    desc: 'IT service companies and agency directories',
    providers: [
      { name: 'TCS',           url: 'https://www.tcs.com',        desc: 'India\'s largest IT services company'     },
      { name: 'Infosys',       url: 'https://www.infosys.com',    desc: 'Global IT consulting & services'          },
      { name: 'Wipro',         url: 'https://www.wipro.com',      desc: 'IT, cloud & digital transformation'       },
      { name: 'HCL Tech',      url: 'https://www.hcltech.com',    desc: 'Engineering, IT & BPO services'           },
      { name: 'Clutch',        url: 'https://clutch.co',          desc: 'Global directory of IT agencies & firms'  },
      { name: 'GoodFirms',     url: 'https://www.goodfirms.co',   desc: 'Software & app development agency directory'},
    ],
  },
  {
    id: 'legal',
    label: 'Legal & Compliance',
    icon: Scale,
    color: 'purple',
    desc: 'Company registration, GST, trademark, and legal advisory platforms',
    providers: [
      { name: 'Vakilsearch',    url: 'https://vakilsearch.com',              desc: 'Company registration, GST & legal docs'       },
      { name: 'IndiaFilings',   url: 'https://www.indiafilings.com',         desc: 'GST, ITR, trademark & compliance filing'      },
      { name: 'LegalRaasta',    url: 'https://www.legalraasta.com',          desc: 'Online legal & compliance services'           },
      { name: 'Razorpay Rize',  url: 'https://razorpay.com/rize',            desc: 'Company incorporation & compliance'           },
      { name: 'MyAdvo',         url: 'https://www.myadvo.in',                desc: 'Lawyer marketplace — consult verified lawyers' },
      { name: 'Lawrato',        url: 'https://lawrato.com',                  desc: 'Find & consult lawyers online'                },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting & Tax',
    icon: Calculator,
    color: 'green',
    desc: 'Income tax filing, GST returns, payroll and CA services',
    providers: [
      { name: 'ClearTax',       url: 'https://cleartax.in',              desc: 'ITR filing, GST, invoicing & e-way bills'    },
      { name: 'IndiaFilings',   url: 'https://www.indiafilings.com',     desc: 'GST registration, returns & annual filing'   },
      { name: 'Vakilsearch',    url: 'https://vakilsearch.com',          desc: 'Accounting, tax & compliance services'       },
    ],
  },
  {
    id: 'financial',
    label: 'Financial Services',
    icon: IndianRupee,
    color: 'yellow',
    desc: 'Loans, insurance, investments and financial comparison platforms',
    providers: [
      { name: 'BankBazaar',     url: 'https://www.bankbazaar.com',        desc: 'Compare loans, credit cards & deposits'      },
      { name: 'PaisaBazaar',    url: 'https://www.paisabazaar.com',       desc: 'Personal finance & credit comparison'        },
      { name: 'PolicyBazaar',   url: 'https://www.policybazaar.com',      desc: 'Insurance comparison & purchase'             },
      { name: 'Turtlemint',     url: 'https://www.turtlemint.com',        desc: 'Insurance advisors & distribution network'  },
      { name: 'Investwell',     url: 'https://www.investwell.in',         desc: 'Mutual fund distribution & portfolio tools'  },
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    icon: HeartPulse,
    color: 'rose',
    desc: 'Doctors, home nursing, labs, diagnostics and surgical care platforms',
    providers: [
      { name: 'Practo',          url: 'https://www.practo.com',           desc: 'Doctor consultations & clinic management'    },
      { name: 'Apollo 247',      url: 'https://www.apollo247.com',        desc: 'Tele-consult, medicines & lab tests'         },
      { name: 'MediBuddy',       url: 'https://www.medibuddy.in',         desc: 'Corporate health & telemedicine'             },
      { name: 'Portea Medical',  url: 'https://www.portea.com',           desc: 'Home healthcare — nurses, physiotherapy'     },
      { name: 'Care24',          url: 'https://www.care24.co.in',         desc: 'Home nursing & attendant care'               },
      { name: 'Nightingales',    url: 'https://www.nightingales.in',      desc: 'Home health & rehabilitation services'       },
      { name: 'Thyrocare',       url: 'https://www.thyrocare.com',        desc: 'Diagnostic & preventive lab tests'           },
      { name: 'Lal PathLabs',    url: 'https://www.lalpathlabs.com',      desc: 'Nationwide pathology & diagnostics'          },
      { name: 'Redcliffe Labs',  url: 'https://redcliffelabs.com',        desc: 'Home sample collection & lab tests'          },
      { name: 'Pristyn Care',    url: 'https://www.pristyncare.com',      desc: 'Elective & surgical care network'            },
      { name: 'HexaHealth',      url: 'https://www.hexahealth.com',       desc: 'Surgery care & insurance coordination'       },
    ],
  },
  {
    id: 'education',
    label: 'Education & Training',
    icon: GraduationCap,
    color: 'teal',
    desc: 'Tutoring marketplaces, institute directories and government skill platforms',
    providers: [
      { name: 'UrbanPro',            url: 'https://www.urbanpro.com',               desc: 'Tutors & trainers marketplace — any subject' },
      { name: 'Superprof',           url: 'https://www.superprof.co.in',            desc: 'Find private tutors across India'            },
      { name: 'Shiksha',             url: 'https://www.shiksha.com',                desc: 'College & course discovery directory'        },
      { name: 'CollegeDunia',        url: 'https://www.collegedunia.com',           desc: 'Colleges, rankings & admission guidance'     },
      { name: 'NCVT MIS (Govt)',     url: 'https://www.ncvtmis.gov.in',             desc: 'ITI & vocational training — official portal' },
      { name: 'Skill India Digital', url: 'https://www.skillindiadigital.gov.in',   desc: 'Govt skill development & courses'            },
    ],
  },
  {
    id: 'hospitality',
    label: 'Hospitality & Food',
    icon: UtensilsCrossed,
    color: 'orange',
    desc: 'Hotels, restaurants, catering and venue booking platforms',
    providers: [
      { name: 'OYO Rooms',    url: 'https://www.oyorooms.com',        desc: 'Budget hotels & managed accommodations'      },
      { name: 'Treebo',       url: 'https://www.treebo.com',          desc: 'Quality-assured budget hotels'               },
      { name: 'FabHotels',    url: 'https://www.fabhotels.com',       desc: 'Standardised budget hotels across India'     },
      { name: 'Zomato',       url: 'https://www.zomato.com',          desc: 'Restaurant discovery, delivery & dining'     },
      { name: 'Swiggy',       url: 'https://www.swiggy.com',          desc: 'Food delivery, quick commerce & dining out'  },
      { name: 'VenueLook',    url: 'https://www.venuelook.com',       desc: 'Banquet halls & event venue booking'         },
      { name: 'Sloshout',     url: 'https://www.sloshout.com',        desc: 'Party venue & club booking platform'         },
      { name: 'Cookifi',      url: 'https://www.cookifi.com',         desc: 'Catering services for events & offices'      },
    ],
  },
  {
    id: 'logistics',
    label: 'Transport & Logistics',
    icon: Truck,
    color: 'slate',
    desc: 'Freight, courier, load boards and packers & movers',
    providers: [
      { name: 'Porter',              url: 'https://porter.in',                          desc: 'Mini trucks & tempo for intra-city moves'    },
      { name: 'Vahak',               url: 'https://www.vahak.in',                       desc: 'Truck & load marketplace for transporters'   },
      { name: 'BlackBuck / Zinka',   url: 'https://www.zinka.in',                       desc: 'Trucking network & fuel card for truckers'   },
      { name: 'Shiprocket',          url: 'https://www.shiprocket.in',                  desc: 'eCommerce courier aggregator'                },
      { name: 'NimbusPost',          url: 'https://www.nimbuspost.com',                 desc: 'Multi-carrier shipping for D2C brands'       },
      { name: 'iThink Logistics',    url: 'https://www.ithinklogistics.com',            desc: 'Shipping & warehousing for eCommerce'        },
      { name: 'Agarwal Packers',     url: 'https://www.agarwalpackers.com',             desc: 'Household & office relocation services'      },
      { name: 'Leo Packers',         url: 'https://www.leopackersindia.com',            desc: 'Packers & movers across India'               },
      { name: 'ThePackersMovers',    url: 'https://www.thepackersmovers.com',           desc: 'Directory of verified packers & movers'      },
    ],
  },
  {
    id: 'home_repair',
    label: 'Home & Repair Services',
    icon: Wrench,
    color: 'cyan',
    desc: 'Electricians, plumbers, AC servicing, car repair and pest control',
    providers: [
      { name: 'Urban Company',    url: 'https://www.urbancompany.com',          desc: 'AC, plumbing, electrician, cleaning'         },
      { name: 'Onsitego',         url: 'https://www.onsitego.com',              desc: 'Device repair & extended warranty plans'     },
      { name: 'Cashify Repair',   url: 'https://www.cashify.in/repair',         desc: 'Doorstep mobile & laptop repair'             },
      { name: 'GoMechanic',       url: 'https://www.gomechanic.in',             desc: 'Doorstep & workshop car servicing'           },
      { name: 'Mr. Right',        url: 'https://www.mrright.in',                desc: 'Home services directory — plumbing, carpentry'},
      { name: 'HiCare',           url: 'https://www.hicare.in',                 desc: 'Pest control services across India'          },
      { name: 'Pest Control India',url: 'https://www.pestcontrolindia.com',     desc: 'PCI — national pest management directory'    },
    ],
  },
  {
    id: 'security',
    label: 'Security & Facility Mgmt',
    icon: Shield,
    color: 'gray',
    desc: 'Manned guarding, facility management and integrated services companies',
    providers: [
      { name: 'SIS India',          url: 'https://www.sisindia.com',             desc: 'India\'s largest security services group'    },
      { name: 'G4S India',          url: 'https://www.g4s.com/en-in',            desc: 'Physical & technology security services'    },
      { name: 'Securitas India',    url: 'https://www.securitasindia.com',        desc: 'Guarding, fire safety & remote monitoring'  },
      { name: 'Sodexo India',       url: 'https://in.sodexo.com',               desc: 'Facility & quality-of-life services'        },
      { name: 'ISS India',          url: 'https://www.in.issworld.com',          desc: 'Integrated facility management'             },
      { name: 'BVG India',          url: 'https://www.bvgindia.com',             desc: 'Facility, waste mgmt & sanitation (Pune)'   },
      { name: 'UDS (Updater)',      url: 'https://www.uds.co.in',               desc: 'Facility management & staffing solutions'   },
      { name: 'Dusters Total Soln', url: 'https://www.dusters.in',              desc: 'Housekeeping & cleaning services'           },
    ],
  },
  {
    id: 'realestate',
    label: 'Real Estate & Construction',
    icon: Building2,
    color: 'amber',
    desc: 'Property portals, interior design and construction service providers',
    providers: [
      { name: '99acres',          url: 'https://www.99acres.com',             desc: 'Property buy, sell & rent listings'           },
      { name: 'Housing.com',      url: 'https://housing.com',                 desc: 'Residential property search & data'           },
      { name: 'MagicBricks',      url: 'https://www.magicbricks.com',         desc: 'India\'s top property classifieds portal'     },
      { name: 'NoBroker',         url: 'https://www.nobroker.in',             desc: 'Zero-brokerage property rental & sale'       },
      { name: 'Square Yards',     url: 'https://www.squareyards.com',         desc: 'Integrated real estate transaction platform'  },
      { name: 'Livspace',         url: 'https://www.livspace.com',            desc: 'End-to-end home interior design & execution' },
      { name: 'HomeLane',         url: 'https://www.homelane.com',            desc: 'Modular interiors & home renovation'         },
      { name: 'Design Cafe',      url: 'https://www.designcafe.com',          desc: 'Home interiors with in-house manufacturing'  },
      { name: 'Bonito Designs',   url: 'https://www.bonito.in',               desc: 'Luxury interiors (Bengaluru & beyond)'       },
      { name: 'ContractorBhai',   url: 'https://www.contractorbhai.com',      desc: 'Home renovation contractors (Mumbai-strong)' },
      { name: 'MaterialDepot',    url: 'https://www.materialdepot.in',        desc: 'Building materials discovery & pricing'      },
      { name: 'Brickbolt',        url: 'https://www.brickbolt.com',           desc: 'Residential construction (South India)'      },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty & Wellness',
    icon: Sparkles,
    color: 'pink',
    desc: 'Salon chains, gyms, spa and wellness service providers',
    providers: [
      { name: 'Urban Company Beauty', url: 'https://www.urbancompany.com/beauty',  desc: 'At-home beauty & grooming services'         },
      { name: 'Naturals Salon',       url: 'https://www.naturals.in',              desc: 'South India\'s largest salon chain'         },
      { name: 'Lakme Salon',          url: 'https://www.lakmesalon.in',            desc: 'Premium salon & beauty chain'               },
      { name: 'Jawed Habib',          url: 'https://www.jawedhabib.co.in',         desc: 'Haircut & styling salon chain'              },
      { name: 'VLCC Wellness',        url: 'https://www.vlccwellness.com',         desc: 'Slimming, beauty & wellness centres'        },
      { name: 'Cult.fit',             url: 'https://www.cultfit.in',               desc: 'Gyms, fitness classes & corporate wellness' },
      { name: 'Gold\'s Gym India',    url: 'https://www.goldsgym.in',              desc: 'Gym & fitness centres across India'         },
      { name: 'Anytime Fitness',      url: 'https://www.anytimefitness.co.in',     desc: '24/7 gym franchise network in India'        },
    ],
  },
  {
    id: 'laundry',
    label: 'Laundry Services',
    icon: Shirt,
    color: 'violet',
    desc: 'Dry cleaning, laundry pickup & subscription services',
    providers: [
      { name: 'UClean',      url: 'https://www.uclean.in',       desc: 'Franchise laundry & dry-cleaning chain'     },
      { name: 'Tumbledry',   url: 'https://www.tumbledry.in',    desc: 'Premium dry cleaning & laundry service'     },
      { name: 'Pressto',     url: 'https://www.pressto.in',      desc: 'Dry-cleaning & garment care franchise'      },
    ],
  },
  {
    id: 'events',
    label: 'Photography & Events',
    icon: Camera,
    color: 'fuchsia',
    desc: 'Event management, photographers and entertainment booking',
    providers: [
      { name: 'WedMeGood Photos', url: 'https://www.wedmegood.com/photographers',  desc: 'Wedding & event photographer discovery'     },
      { name: 'Canvera',          url: 'https://www.canvera.com',                  desc: 'Wedding photographers & premium albums'     },
      { name: 'Eventaa',          url: 'https://www.eventaa.com',                  desc: 'Event vendor directory & management'        },
      { name: 'BookMyShow',       url: 'https://www.bookmyshow.com',               desc: 'Events, movies & entertainment booking'     },
      { name: 'Explara',          url: 'https://www.explara.com',                  desc: 'Event creation, ticketing & services'       },
    ],
  },
  {
    id: 'travel',
    label: 'Travel Services',
    icon: Plane,
    color: 'sky',
    desc: 'Flights, hotels, tours and bus booking platforms',
    providers: [
      { name: 'MakeMyTrip',   url: 'https://www.makemytrip.com',  desc: 'Flights, hotels, trains & holidays'         },
      { name: 'Yatra',        url: 'https://www.yatra.com',        desc: 'Travel booking & corporate travel mgmt'     },
      { name: 'EaseMyTrip',   url: 'https://www.easemytrip.com',  desc: 'Budget-focused flight & hotel booking'      },
      { name: 'Thomas Cook',  url: 'https://www.thomascook.in',   desc: 'International & domestic holiday packages'  },
      { name: 'SOTC',         url: 'https://www.sotc.in',          desc: 'Group tours & holiday packages'            },
      { name: 'Veena World',  url: 'https://www.veenaworld.com',  desc: 'Tour packages, strong in Maharashtra'       },
      { name: 'Kesari Tours', url: 'https://www.kesari.in',        desc: 'Guided tour packages from India'           },
      { name: 'RedBus',       url: 'https://www.redbus.in',        desc: 'Bus booking & operator directory'          },
    ],
  },
  {
    id: 'waste',
    label: 'Waste Management',
    icon: Recycle,
    color: 'lime',
    desc: 'SWM contractors, recyclers, e-waste and waste marketplace platforms',
    providers: [
      { name: 'BVG India',        url: 'https://www.bvgindia.com',          desc: 'Facility mgmt, SWM & waste services (Pune)'  },
      { name: 'UDS',              url: 'https://www.uds.co.in',             desc: 'Updater Services — facility & waste mgmt'    },
      { name: 'Antony Waste',     url: 'https://www.antony-waste.com',      desc: 'SWM contractor (MCGM & other ULBs)'          },
      { name: 'Ramky Enviro',     url: 'https://www.ramky.com',             desc: 'Integrated environmental & waste solutions'  },
      { name: 'Nepra (Let\'s Recycle)', url: 'https://www.nepra.co.in',    desc: 'Dry waste collection & recycling network'    },
      { name: 'Saahas Zero Waste',url: 'https://www.saahaszerowaste.com',  desc: 'Zero-waste management for organizations'     },
      { name: 'Recykal',          url: 'https://recykal.com',               desc: 'Digital waste marketplace & EPR solutions'   },
      { name: 'Attero',           url: 'https://www.attero.in',             desc: 'E-waste collection & recycling (Noida)'      },
    ],
  },
  {
    id: 'telecom',
    label: 'Telecom & ISP',
    icon: Wifi,
    color: 'emerald',
    desc: 'Broadband, fiber and utility service providers',
    providers: [
      { name: 'Airtel Broadband', url: 'https://www.airtel.in/broadband',   desc: 'Fiber broadband & postpaid mobile plans'    },
      { name: 'Jio Fiber',        url: 'https://www.jio.com/fiber',         desc: 'JioFiber home & business broadband'         },
      { name: 'ACT Fibernet',     url: 'https://www.actcorp.in',            desc: 'High-speed fiber ISP (South & select cities)'},
      { name: 'Hathway',          url: 'https://www.hathway.com',           desc: 'Cable broadband across India'               },
      { name: 'Excitel',          url: 'https://www.excitel.com',           desc: 'Budget fiber broadband (North India)'       },
      { name: 'Tata Play Fiber',  url: 'https://www.tataplay.com/fiber',    desc: 'Home fiber from Tata Play'                  },
    ],
  },
]

// Per-category Tailwind class bundle keyed by the `color` name each SERVICE_GROUPS entry declares
const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: 'text-blue-500',    border: 'border-blue-100'    },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: 'text-indigo-500',  border: 'border-indigo-100'  },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  icon: 'text-purple-500',  border: 'border-purple-100'  },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   icon: 'text-green-500',   border: 'border-green-100'   },
  yellow:  { bg: 'bg-yellow-50',  text: 'text-yellow-700',  icon: 'text-yellow-500',  border: 'border-yellow-100'  },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    icon: 'text-rose-500',    border: 'border-rose-100'    },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    icon: 'text-teal-500',    border: 'border-teal-100'    },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  icon: 'text-orange-500',  border: 'border-orange-100'  },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   icon: 'text-slate-500',   border: 'border-slate-100'   },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    icon: 'text-cyan-500',    border: 'border-cyan-100'    },
  gray:    { bg: 'bg-gray-100',   text: 'text-gray-700',    icon: 'text-gray-500',    border: 'border-gray-200'    },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-500',   border: 'border-amber-100'   },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    icon: 'text-pink-500',    border: 'border-pink-100'    },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  icon: 'text-violet-500',  border: 'border-violet-100'  },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', icon: 'text-fuchsia-500', border: 'border-fuchsia-100' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     icon: 'text-sky-500',     border: 'border-sky-100'     },
  lime:    { bg: 'bg-lime-50',    text: 'text-lime-700',    icon: 'text-lime-500',    border: 'border-lime-100'    },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500', border: 'border-emerald-100' },
}

/**
 * One service provider: a plain outbound link card with name and description.
 * @param {{ provider: object, color: string }} props - provider entry from SERVICE_GROUPS and its group's color key
 */
function ProviderCard({ provider, color }) {
  const c = COLOR_MAP[color]
  return (
    <a
      href={provider.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
          {provider.name}
        </p>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{provider.desc}</p>
    </a>
  )
}

// Every provider, flattened with its group's colour/label attached — used for search
export const ALL_PROVIDERS = SERVICE_GROUPS.flatMap(g => g.providers.map(p => ({ ...p, groupLabel: g.label, groupColor: g.color })))

/**
 * One category section: a colour-coded header (icon, label, provider count,
 * optional blurb) followed by a grid of ProviderCard entries.
 * @param {{ group: object }} props - one entry from SERVICE_GROUPS
 */
function ProviderGroup({ group }) {
  const c = COLOR_MAP[group.color]
  const Icon = group.icon
  return (
    <div id={group.id}>
      <div className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-lg ${c.bg} ${c.border} border`}>
        <Icon className={`h-4 w-4 ${c.icon}`} />
        <h2 className={`text-sm font-bold ${c.text}`}>{group.label}</h2>
        <span className={`ml-auto text-xs font-medium ${c.text} opacity-70`}>{group.providers.length} providers</span>
      </div>
      {group.desc && (
        <p className="text-xs text-muted-foreground mb-3 px-1">{group.desc}</p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {group.providers.map(p => (
          <ProviderCard key={p.name} provider={p} color={group.color} />
        ))}
      </div>
    </div>
  )
}

/**
 * Renders the service-provider directory page: a sidebar (desktop) / pill
 * strip (mobile) for filtering by category, the resulting grid of provider
 * link cards, and a cross-category search.
 */
export default function Services() {
  const [activeCategory, setActiveCategory] = useState('all') // 'all' or a SERVICE_GROUPS id
  const [search, setSearch] = useState('') // search box value — spans every category, ignoring the current selection

  const total = SERVICE_GROUPS.reduce((sum, g) => sum + g.providers.length, 0)

  const visibleGroups = activeCategory === 'all'
    ? SERVICE_GROUPS
    : SERVICE_GROUPS.filter(g => g.id === activeCategory)

  // Search spans every category, ignoring whichever one is currently selected
  const isSearching = search.trim().length > 0
  const q = search.toLowerCase()
  const searchedProviders = ALL_PROVIDERS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q) ||
    p.groupLabel.toLowerCase().includes(q)
  )

  // Sidebar/pill category click handler: switches category and scrolls to
  // that section's DOM id, or back to the top when "all" is selected
  const handleCategoryClick = (id) => {
    setActiveCategory(id)
    if (id !== 'all') {
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Service Providers</h1>
        <p className="text-muted-foreground text-sm">
          {total} trusted platforms & service companies across {SERVICE_GROUPS.length} categories.
          Aggregators like Justdial & Sulekha list thousands of local vendors city-by-city.
        </p>
      </div>

      {/* Search — spans every category, ignoring the current sidebar selection */}
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search providers or categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* While searching, show a flat cross-category result list instead of the sidebar/pill browse layout below */}
      {isSearching ? (
        <div>
          <p className="text-xs text-muted-foreground mb-4">
            {searchedProviders.length} result{searchedProviders.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
          {searchedProviders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No providers match your search.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {searchedProviders.map(p => (
                <ProviderCard key={p.name + p.groupLabel} provider={p} color={p.groupColor} />
              ))}
            </div>
          )}
        </div>
      ) : (
      <>

      {/* Sidebar + content layout */}
      <div className="flex gap-6 items-start">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-4">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 border-b bg-gray-50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</p>
            </div>
            <nav className="py-1">
              <button
                onClick={() => handleCategoryClick('all')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  activeCategory === 'all'
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                All Categories
                <span className="ml-auto text-xs opacity-60">{total}</span>
              </button>

              <div className="my-1 border-t" />

              {/* One nav item per category, each showing its icon, label, and provider count */}
              {SERVICE_GROUPS.map(group => {
                const c = COLOR_MAP[group.color]
                const Icon = group.icon
                const isActive = activeCategory === group.id
                return (
                  <button
                    key={group.id}
                    onClick={() => handleCategoryClick(group.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                      isActive
                        ? `${c.bg} ${c.text} font-semibold`
                        : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? c.icon : ''}`} />
                    <span className="truncate">{group.label}</span>
                    <span className="ml-auto text-xs opacity-60 shrink-0">{group.providers.length}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* ── Mobile: horizontal scrollable category strip ── */}
        <div className="md:hidden w-full mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => handleCategoryClick('all')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white border-border text-muted-foreground'
              }`}
            >
              All
            </button>
            {/* One pill per category, highlighted when active — mirrors the desktop sidebar above */}
            {SERVICE_GROUPS.map(group => {
              const c = COLOR_MAP[group.color]
              const Icon = group.icon
              const isActive = activeCategory === group.id
              return (
                <button
                  key={group.id}
                  onClick={() => handleCategoryClick(group.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? `${c.bg} ${c.text} ${c.border} font-semibold`
                      : 'bg-white border-border text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {group.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Main content — renders every category section (or just the selected one) ── */}
        <div className="flex-1 min-w-0 space-y-10">
          {visibleGroups.map(group => (
            <ProviderGroup key={group.id} group={group} />
          ))}
        </div>
      </div>
      </>
      )}

      <div className="border-t pt-6 space-y-2 mt-10">
        <p className="text-xs text-muted-foreground text-center">
          StepsDoor is not affiliated with any platforms listed above. Links open in a new tab.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          ⚠️ The services sector churns frequently — platforms get acquired or shut down. Verify availability before engaging any vendor.
        </p>
      </div>
    </div>
  )
}
