"""
Maps source_portal domain strings to Indian state names.
Used by pipelines to auto-fill `state` when a spider doesn't extract it.
Central government portals map to 'Central Govt'.
"""

PORTAL_STATE_MAP = {
    # ── Maharashtra ───────────────────────────────────────────────────────────
    'mahatenders.gov.in':       'Maharashtra',
    'vvcmc.in':                  'Maharashtra',
    'thanecity.gov.in':          'Maharashtra',
    'nmmc.gov.in':               'Maharashtra',
    'pcmcindia.gov.in':          'Maharashtra',
    'cidco.maharashtra.gov.in':  'Maharashtra',
    'msetcl.in':                 'Maharashtra',
    'mahapreit.com':             'Maharashtra',
    'mahaurja.com':              'Maharashtra',
    'msedcl.in':                 'Maharashtra',
    'maharashtra.gov.in':        'Maharashtra',

    # ── West Bengal ───────────────────────────────────────────────────────────
    'wbtenders.gov.in':          'West Bengal',
    'wbsedcl.in':                'West Bengal',
    'wbiidc.org':                'West Bengal',
    'wbsetcl.in':                'West Bengal',
    'wb.gov.in':                 'West Bengal',
    'wbpdcl.co.in':              'West Bengal',

    # ── Tamil Nadu ────────────────────────────────────────────────────────────
    'tntenders.gov.in':          'Tamil Nadu',
    'tangedco.gov.in':           'Tamil Nadu',
    'tnpsc.gov.in':              'Tamil Nadu',
    'tneb.in':                   'Tamil Nadu',
    'cmda.gov.in':               'Tamil Nadu',
    'chennaiport.gov.in':        'Tamil Nadu',

    # ── Andhra Pradesh ────────────────────────────────────────────────────────
    'tender.apeprocurement.gov.in': 'Andhra Pradesh',
    'apcpdcl.in':                'Andhra Pradesh',
    'apspdcl.in':                'Andhra Pradesh',
    'apcrda.org':                'Andhra Pradesh',
    'apgenco.gov.in':            'Andhra Pradesh',

    # ── Telangana ─────────────────────────────────────────────────────────────
    'tender.telangana.gov.in':   'Telangana',
    'tssouthernpower.com':       'Telangana',
    'tsrtconline.in':            'Telangana',
    'hmwssb.gov.in':             'Telangana',
    'tsgenco.telangana.gov.in':  'Telangana',
    'tsnpdcl.in':                'Telangana',
    'tsecl.in':                  'Telangana',

    # ── Karnataka ─────────────────────────────────────────────────────────────
    'keonics.in':                'Karnataka',
    'bangaloremetro.co.in':      'Karnataka',
    'bmrcl.com':                 'Karnataka',
    'bescom.org':                'Karnataka',
    'gescom.in':                 'Karnataka',
    'mescom.in':                 'Karnataka',
    'cesc.co.in':                'Karnataka',
    'kptcl.com':                 'Karnataka',
    'karnataka.gov.in':          'Karnataka',

    # ── Gujarat ───────────────────────────────────────────────────────────────
    'suratmunicipal.gov.in':     'Gujarat',
    'vmc.gov.in':                'Gujarat',
    'gmdc.com':                  'Gujarat',
    'gsecl.in':                  'Gujarat',
    'guvnl.in':                  'Gujarat',
    'pgvcl.com':                 'Gujarat',
    'mgvcl.com':                 'Gujarat',
    'dgvcl.com':                 'Gujarat',
    'ugvcl.com':                 'Gujarat',
    'gujarattenders.gov.in':     'Gujarat',
    'amcindore.org':             'Gujarat',

    # ── Uttar Pradesh ─────────────────────────────────────────────────────────
    'upavp.in':                  'Uttar Pradesh',
    'upjn.org':                  'Uttar Pradesh',
    'uppcl.org':                 'Uttar Pradesh',
    'upsrtc.up.gov.in':          'Uttar Pradesh',
    'uppwd.gov.in':              'Uttar Pradesh',
    'upenergy.in':               'Uttar Pradesh',
    'pvvnl.org':                 'Uttar Pradesh',
    'mvvnl.org':                 'Uttar Pradesh',
    'dvvnl.org':                 'Uttar Pradesh',
    'puvvnl.org':                'Uttar Pradesh',
    'uptenders.gov.in':          'Uttar Pradesh',

    # ── Rajasthan ─────────────────────────────────────────────────────────────
    'rrvpnl.in':                 'Rajasthan',
    'rvpn.co.in':                'Rajasthan',
    'rajasthan.gov.in':          'Rajasthan',
    'rpcl.in':                   'Rajasthan',
    'jvvnl.com':                 'Rajasthan',
    'avvnl.com':                 'Rajasthan',

    # ── Madhya Pradesh ────────────────────────────────────────────────────────
    'mpeproc.gov.in':            'Madhya Pradesh',
    'mppost.gov.in':             'Madhya Pradesh',
    'mppkvvcl.org':              'Madhya Pradesh',
    'mpez.co.in':                'Madhya Pradesh',
    'mptransco.in':              'Madhya Pradesh',

    # ── Bihar ─────────────────────────────────────────────────────────────────
    'tender.bihar.gov.in':       'Bihar',
    'bsphcl.bih.nic.in':        'Bihar',
    'bseb.co.in':                'Bihar',
    'biharurban.gov.in':         'Bihar',

    # ── Odisha ────────────────────────────────────────────────────────────────
    'tendersodisha.gov.in':      'Odisha',
    'tpcentralodisha.com':       'Odisha',
    'gridco.co.in':              'Odisha',
    'ophwc.org':                 'Odisha',
    'odishapower.gov.in':        'Odisha',

    # ── Uttarakhand ───────────────────────────────────────────────────────────
    'uktenders.gov.in':          'Uttarakhand',
    'upcl.org':                  'Uttarakhand',
    'ujvnl.com':                 'Uttarakhand',

    # ── Haryana ───────────────────────────────────────────────────────────────
    'uhbvn.org.in':              'Haryana',
    'dhbvn.org.in':              'Haryana',
    'haryana.gov.in':            'Haryana',
    'hvpnl.org.in':              'Haryana',
    'hry.nic.in':                'Haryana',

    # ── Punjab ────────────────────────────────────────────────────────────────
    'pspcl.in':                  'Punjab',
    'pstcl.org':                 'Punjab',
    'punjab.gov.in':             'Punjab',

    # ── Himachal Pradesh ──────────────────────────────────────────────────────
    'hptenders.gov.in':          'Himachal Pradesh',
    'hpsebl.org':                'Himachal Pradesh',
    'hpseb.in':                  'Himachal Pradesh',

    # ── Kerala ────────────────────────────────────────────────────────────────
    'etenders.kerala.gov.in':    'Kerala',
    'kseb.in':                   'Kerala',
    'ksrtc.kerala.gov.in':       'Kerala',
    'ktdfc.com':                 'Kerala',

    # ── Assam ─────────────────────────────────────────────────────────────────
    'assamtenders.gov.in':       'Assam',
    'apdcl.org':                 'Assam',

    # ── Jharkhand ─────────────────────────────────────────────────────────────
    'jharkhandtenders.gov.in':   'Jharkhand',
    'jbvnl.co.in':               'Jharkhand',

    # ── Chhattisgarh ─────────────────────────────────────────────────────────
    'cgstate.gov.in':            'Chhattisgarh',
    'csidc.in':                  'Chhattisgarh',
    'cspdcl.co.in':              'Chhattisgarh',

    # ── Sikkim ────────────────────────────────────────────────────────────────
    'sikkimtender.gov.in':       'Sikkim',

    # ── Tripura ───────────────────────────────────────────────────────────────
    'tripuratenders.gov.in':     'Tripura',
    'tsecl.in':                  'Tripura',

    # ── Goa ───────────────────────────────────────────────────────────────────
    'goatenders.gov.in':         'Goa',
    'goaelectricity.gov.in':     'Goa',

    # ── Manipur ───────────────────────────────────────────────────────────────
    'manipurtenders.gov.in':     'Manipur',

    # ── Meghalaya ─────────────────────────────────────────────────────────────
    'meghalayatenders.gov.in':   'Meghalaya',
    'meecl.nic.in':              'Meghalaya',

    # ── Nagaland ──────────────────────────────────────────────────────────────
    'nagalandtenders.gov.in':    'Nagaland',

    # ── Mizoram ───────────────────────────────────────────────────────────────
    'mizoramtenders.gov.in':     'Mizoram',

    # ── Arunachal Pradesh ─────────────────────────────────────────────────────
    'arunachaltenders.gov.in':   'Arunachal Pradesh',

    # ── Jammu & Kashmir ───────────────────────────────────────────────────────
    'jktenders.gov.in':          'Jammu & Kashmir',
    'smcsrinagar.in':            'Jammu & Kashmir',
    'jakeda.org':                'Jammu & Kashmir',

    # ── Delhi ─────────────────────────────────────────────────────────────────
    'delhi.gov.in':              'Delhi',
    'delhimetrorail.com':        'Delhi',
    'dmrc.co.in':                'Delhi',
    'bses.in':                   'Delhi',
    'ndmc.gov.in':               'Delhi',
    'dda.gov.in':                'Delhi',

    # ── Andaman & Nicobar ─────────────────────────────────────────────────────
    'tenders.andaman.gov.in':    'Andaman & Nicobar',
    'andaman.gov.in':            'Andaman & Nicobar',

    # ── Puducherry ────────────────────────────────────────────────────────────
    'py.gov.in':                 'Puducherry',

    # ── Ladakh ────────────────────────────────────────────────────────────────
    'ladakh.gov.in':             'Ladakh',

    # ── State PSC / Recruitment Portals ──────────────────────────────────────
    'keralapsc.gov.in':          'Kerala',
    'gpsc.gujarat.gov.in':       'Gujarat',
    'gpssb.gujarat.gov.in':      'Gujarat',
    'ojas.gujarat.gov.in':       'Gujarat',
    'gpsc.goa.gov.in':           'Goa',
    'gssc.goa.gov.in':           'Goa',
    'ccpgoa.com':                'Goa',
    'recruitment.py.gov.in':     'Puducherry',
    'mpsc.mizoram.gov.in':       'Mizoram',
    'psc.uk.gov.in':             'Uttarakhand',
    'tpsc.tripura.gov.in':       'Tripura',
    'agartalacity.tripura.gov.in': 'Tripura',
    'jda.rajasthan.gov.in':      'Rajasthan',
    'rsmssb.rajasthan.gov.in':   'Rajasthan',
    'rpsc.rajasthan.gov.in':     'Rajasthan',
    'hpsc.gov.in':               'Haryana',
    'hsvphry.org.in':            'Haryana',
    'hssc.gov.in':               'Haryana',
    'sssb.punjab.gov.in':        'Punjab',
    'ppsc.gov.in':               'Punjab',
    'tnusrb.tn.gov.in':          'Tamil Nadu',
    'trb.tn.gov.in':             'Tamil Nadu',
    'appsc.gov.in':              'Andhra Pradesh',
    'apsc.nic.in':               'Assam',
    'apssb.nic.in':              'Arunachal Pradesh',
    'jkssb.nic.in':              'Jammu & Kashmir',
    'jkpsc.nic.in':              'Jammu & Kashmir',
    'nssb.nagaland.gov.in':      'Nagaland',
    'uppsc.up.nic.in':           'Uttar Pradesh',
    'uppbpb.gov.in':             'Uttar Pradesh',
    'psc.cg.gov.in':             'Chhattisgarh',
    'ossc.gov.in':               'Odisha',
    'opsc.gov.in':               'Odisha',
    'jpsc.gov.in':               'Jharkhand',
    'bssc.bihar.gov.in':         'Bihar',
    'buidco.in':                 'Bihar',
    'prb.wb.gov.in':             'West Bengal',

    # ── Central Government ────────────────────────────────────────────────────
    'eprocure.gov.in':           'Central Govt',
    'gem.gov.in':                'Central Govt',
    'ntpc.co.in':                'Central Govt',
    'ntpctender.com':            'Central Govt',
    'powergrid.in':              'Central Govt',
    'seci.co.in':                'Central Govt',
    'tenders.ongc.co.in':        'Central Govt',
    'ongcindia.com':             'Central Govt',
    'bhel.com':                  'Central Govt',
    'bpcl.in':                   'Central Govt',
    'iocl.com':                  'Central Govt',
    'hpcl.com':                  'Central Govt',
    'coalindia.in':              'Central Govt',
    'sail.co.in':                'Central Govt',
    'nmdc.co.in':                'Central Govt',
    'nhai.gov.in':               'Central Govt',
    'rites.com':                 'Central Govt',
    'ircon.org':                 'Central Govt',
    'irfc.nic.in':               'Central Govt',
    'indianrailways.gov.in':     'Central Govt',
    'rrb.gov.in':                'Central Govt',
    'joinindiannavy.gov.in':     'Central Govt',
    'upsc.gov.in':               'Central Govt',
    'ssc.gov.in':                'Central Govt',
    'ibps.in':                   'Central Govt',
    'rbi.org.in':                'Central Govt',
    'sbi.co.in':                 'Central Govt',
    'esic.gov.in':               'Central Govt',
    'licindia.in':               'Central Govt',
    'rac.gov.in':                'Central Govt',
    'careers.bhel.in':           'Central Govt',
    'ncs.gov.in':                'Central Govt',
    'nic.in':                    'Central Govt',
    'meity.gov.in':              'Central Govt',
    'tender.nprocure.com':       'Central Govt',
    'defence.gov.in':            'Central Govt',
    'drdo.gov.in':               'Central Govt',
    'isro.gov.in':               'Central Govt',
    'dae.gov.in':                'Central Govt',
    'barc.gov.in':               'Central Govt',
    'npcil.nic.in':              'Central Govt',
    'aai.aero':                  'Central Govt',
    'pngrb.gov.in':              'Central Govt',
    'cerc.gov.in':               'Central Govt',
    'eia.nic.in':                'Central Govt',
}


def state_from_portal(source_portal: str) -> str:
    """Return state name for a portal domain, or '' if unknown."""
    domain = source_portal.lower().removeprefix('www.')
    return PORTAL_STATE_MAP.get(domain, '')
