import json
import re
import sys
from datetime import datetime
from pathlib import Path

import openpyxl


WORKBOOK = Path(r"G:\My Drive\TS_2026\TS_Data\Sanctions\2026\USG_Enforcement_Actions_Database_Updated_2026-07-22_Excel-Compatible.xlsx")
ROOT = Path(__file__).resolve().parents[1]


COUNTRY_FIXES = {
    "U.S.": "United States",
    "USA": "United States",
    "US": "United States",
    "UAE": "United Arab Emirates",
    "UK": "United Kingdom",
    "PRC": "China",
}

AGENCY_NAMES = {
    "Bureau of Industry and Security": "BIS",
    "Directorate of Defense Trade Controls": "DDTC",
    "Office of Foreign Assets Control": "OFAC",
    "Department of Justice": "DOJ",
}

RECENT_OFFICIAL_OVERLAY = [
{
    "id": "doj-recent-2026-10-28-yana-leonova",
    "date": "2026-10-28",
    "agency": "DOJ",
    "name": "Yana Leonova",
    "countries": ["Armenia", "Belarus", "Russia", "United States"],
    "productCategory": "aircraft_parts",
    "products": ["U.S.-origin avionics and other aircraft equipment for private jets and other aircraft"],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 0,
    "sentenceMonths": 12,
    "factors": ["management_awareness", "no_license", "red_flags", "restricted_party", "transshipment", "us_origin"],
    "summary": "DOJ announced a sentence of 12 months and one day for Yana Leonova after her guilty plea to violating the Export Control Reform Act. Leonova and co-conspirators used Armenian companies, shell companies, false documentation, foreign intermediaries, and overseas bank accounts to procure U.S.-origin avionics and other aircraft equipment and re-export dozens of components to Russia without required Commerce licenses. The equipment supported aircraft operated or maintained by her former employer, a company on the Commerce Entity List. DOJ reported millions of dollars in payments but no exact transaction value or monetary penalty, so those amounts are not inferred.",
    "sourceTitle": "DOJ sentencing release, October 28, 2026",
    "sourceUrl": "https://www.justice.gov/usao-dc/pr/belarusian-woman-sentenced-dc-illegally-exporting-us-sourced-aviation-components-russia",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "doj-recent-2026-10-28-dimitri-beix",
    "date": "2026-10-28",
    "agency": "DOJ",
    "name": "Dimitri Beix",
    "countries": ["Dominica", "United States"],
    "productCategory": "controlled_goods",
    "products": ["Firearms, more than 100 firearm parts, ammunition, magazines, rifle parts, and a suppressor kit"],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 0,
    "sentenceMonths": 66,
    "factors": ["management_awareness", "no_license", "red_flags", "us_origin"],
    "summary": "DOJ announced a 66-month prison sentence for Dimitri Beix after his guilty plea to conspiracy to violate the Export Control Reform Act. From at least January 2021 through September 2024, Beix led a network that procured firearms, firearm components, and ammunition in the United States and exported them to Dominica without required Commerce licenses or authorization. He personally bought more than 100 firearm parts through eBay accounts; Dominica authorities intercepted parcels containing six handguns, Glock components, rifle and pistol magazines, AM15 rifle parts, a suppressor kit, ammunition, and other components. The release reports no monetary penalty or transaction value, so none is inferred.",
    "sourceTitle": "DOJ sentencing release, October 28, 2026",
    "sourceUrl": "https://www.justice.gov/usao-ct/pr/homeland-security-task-force-dual-dominican-and-french-national-sentenced-more-5-years",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "ofac-doj-recent-2026-10-27-extreme-networks",
    "date": "2026-10-27",
    "agency": "DOJ/OFAC",
    "name": "Extreme Networks, Inc.",
    "countries": ["Russia", "United States"],
    "productCategory": "encryption_electronics",
    "products": ["Networking equipment and related services supplied to Moscow Machinery Building Plant Avangard"],
    "disclosure": "Voluntary self-disclosure; DOJ treated disclosure as untimely near miss",
    "posture": "Parallel OFAC civil settlement and DOJ non-prosecution agreement",
    "amountUsd": 2505406.84,
    "transactionValueUsd": 487860.92,
    "violationCount": 9,
    "factors": ["management_awareness", "no_license", "red_flags", "remediation", "restricted_party", "us_origin", "voluntary_disclosure", "weak_controls"],
    "summary": "OFAC announced a $1,529,685 settlement with Extreme Networks for nine apparent violations involving networking equipment and related services exported from the United States to Russian defense manufacturer Moscow Machinery Building Plant Avangard, which was blocked through majority ownership by designated Almaz-Antey. OFAC found the conduct voluntarily self-disclosed and egregious. In a parallel near-miss non-prosecution agreement, DOJ imposed $975,721.84 in a criminal fine and forfeiture for 11 purchase orders processed through Extreme's former Russian subsidiary; Russia-based employees concealed the customer from trade compliance personnel and caused false export information to be filed. DOJ found the disclosure untimely but credited full cooperation and timely remediation. amountUsd combines the parallel OFAC and DOJ monetary resolutions without double-counting the forfeited proceeds as transaction value.",
    "sourceTitle": "OFAC enforcement action and DOJ near-miss non-prosecution agreement, October 27, 2026",
    "sourceUrl": "https://ofac.treasury.gov/recent-actions/20261027",
    "recordType": "Recent official parallel DOJ/OFAC overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Civil and criminal resolution",
    "sanctionsRegime": "Ukraine-/Russia-Related Sanctions Regulations",
    "egregious": "Yes",
},
{
    "id": "doj-recent-2026-10-27-ilya-pankov",
    "date": "2026-10-27",
    "agency": "DOJ",
    "name": "Ilya Pankov",
    "countries": ["Kazakhstan", "Russia", "South Korea", "Turkey", "United States"],
    "productCategory": "industrial_equipment",
    "products": ["Export-controlled construction, mining, and other equipment"],
    "disclosure": "Not specified",
    "posture": "Criminal indictment; allegations pending",
    "amountUsd": 0,
    "transactionValueUsd": 225000,
    "violationCount": 12,
    "factors": ["management_awareness", "no_license", "red_flags", "transshipment", "us_origin"],
    "summary": "DOJ announced Ilya Pankov's arrest on a 12-count indictment alleging that he and others used straw buyers in South Korea, Turkey, and Kazakhstan to export controlled construction, mining, and other equipment to Russian companies after additional Russia controls took effect. The indictment alleges four unlawful exports in 2023 and 2024, false Electronic Export Information, false statements to CBP about seized shipments, smuggling, and laundering at least $225,000 in sales proceeds. These are allegations, and Pankov is presumed innocent unless proven guilty.",
    "sourceTitle": "DOJ indictment and arrest release, October 27, 2026",
    "sourceUrl": "https://www.justice.gov/usao-wdwa/pr/seattle-man-arrested-indictment-illegally-shipping-restricted-items-russia-going",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "doj-recent-2026-10-26-alexis-lara-herrera",
    "date": "2026-10-26",
    "agency": "DOJ",
    "name": "Alexis Lara Herrera",
    "countries": ["Dominican Republic", "United States"],
    "productCategory": "controlled_goods",
    "products": ["Four Glock firearms and 500 rounds of ammunition concealed in an air conditioner within an international shipping container"],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 0,
    "sentenceMonths": 8,
    "factors": ["management_awareness", "red_flags", "us_origin"],
    "summary": "DOJ announced an eight-month prison sentence for Alexis Lara Herrera after his guilty plea to failure to file export information. Dominican authorities found four Glock firearms and 500 rounds of ammunition concealed inside an air conditioner in a shipping container whose manifest described household goods. The container originated in Boston and was bound for the Dominican Republic; evidence from Herrera's phone showed his involvement in firearms smuggling and discussions of additional firearms shipments. The release does not report a monetary penalty or state that an export license was required, so those facts are not inferred.",
    "sourceTitle": "DOJ sentencing release, October 26, 2026",
    "sourceUrl": "https://www.justice.gov/usao-ma/pr/boston-man-sentenced-prison-failure-file-export-information",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "doj-recent-2026-10-15-alexander-suvorov",
    "date": "2026-10-15",
    "agency": "DOJ",
    "name": "Alexander Suvorov",
    "countries": ["Hong Kong", "Russia", "Sweden", "United States"],
    "productCategory": "encryption_electronics",
    "products": ["U.S.-origin dual-use microelectronic components usable in military communications, radar, and precision-location systems"],
    "disclosure": "Not specified",
    "posture": "Criminal complaint; allegations pending",
    "amountUsd": 0,
    "factors": ["management_awareness", "no_license", "red_flags", "transshipment", "us_origin"],
    "summary": "DOJ announced Alexander Suvorov's extradition from Sweden on a criminal complaint alleging that he led a procurement network that used Hong Kong front companies to obtain U.S. dual-use microelectronics and transship them to Russian end users between March 2022 and April 2023. The components can be used in military communications, radar, and precision-location systems. The complaint alleges ECRA, outbound-smuggling, and promotional-money-laundering conspiracies; the charges are allegations and Suvorov is presumed innocent unless proven guilty.",
    "sourceTitle": "DOJ extradition and criminal complaint release, October 15, 2026",
    "sourceUrl": "https://www.justice.gov/usao-ndny/pr/russian-national-arrested-and-extradited-new-york-charges-evading-sanctions-russia",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "doj-recent-2026-10-14-sasa-micev",
    "date": "2026-10-14",
    "agency": "DOJ",
    "name": "Sasa Micev",
    "countries": ["Bosnia and Herzegovina", "North Korea", "United States"],
    "productCategory": "defense_services",
    "products": ["Brokerage of SA-18 Igla man-portable surface-to-air missiles"],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 0,
    "sentenceMonths": 60,
    "factors": ["management_awareness", "military_end_use", "no_license", "red_flags", "restricted_party"],
    "summary": "DOJ announced a 60-month prison sentence for international arms dealer Sasa Micev after his guilty plea to violating IEEPA and the North Korea Sanctions Regulations. Micev conspired and attempted to broker the purchase of SA-18 Igla man-portable surface-to-air missiles from North Korea without required OFAC licensing or approval. The release does not report a monetary penalty; amountUsd is the existing schema sentinel for an unreported monetary amount.",
    "sourceTitle": "DOJ sentencing release, October 14, 2026",
    "sourceUrl": "https://www.justice.gov/usao-nm/pr/bosnian-national-sentenced-violating-international-sanctions-against-north-korea",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
    "sanctionsRegime": "North Korea Sanctions Regulations / IEEPA",
},
{
    "id": "ofac-recent-2026-10-13-bank-of-america",
    "date": "2026-10-13",
    "agency": "OFAC",
    "name": "Bank of America, N.A.",
    "countries": ["Belarus", "Burma", "Iran", "Russia", "Somalia", "United States"],
    "productCategory": "financial_services",
    "products": ["Payments, customer screening, watchlist updates, and business accounts involving blocked persons and banks"],
    "disclosure": "Largely no voluntary self-disclosure",
    "posture": "OFAC civil settlement",
    "amountUsd": 11662930,
    "violationCount": 475,
    "factors": ["restricted_party", "weak_controls"],
    "summary": "OFAC announced an $11,662,930 settlement with Bank of America for 475 apparent violations across sanctions programs targeting Russia, Belarus, Iran, Burma, Somalia, narcotics, and global terrorism. The conduct included processing payments involving blocked banks, failing to prioritize exact name-and-date-of-birth screening matches, delayed watchlist updates after designations, and mishandling two blocked-person business accounts. OFAC determined that the conduct was non-egregious but largely not voluntarily self-disclosed.",
    "sourceTitle": "OFAC enforcement action, October 13, 2026",
    "sourceUrl": "https://ofac.treasury.gov/recent-actions/20261013_33",
    "recordType": "Recent official OFAC overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Civil",
    "egregious": "No",
},
{
    "id": "ofac-recent-2026-10-09-pegasus-worldwide-logistics",
    "date": "2026-10-09",
    "agency": "OFAC",
    "name": "Pegasus Worldwide Logistics",
    "countries": ["United States"],
    "productCategory": "maritime_logistics",
    "products": ["Freight-forwarding services for importation of a machine supplied by a blocked company"],
    "disclosure": "No voluntary self-disclosure",
    "posture": "OFAC civil settlement",
    "amountUsd": 175015,
    "violationCount": 10,
    "factors": ["restricted_party", "weak_controls"],
    "summary": "OFAC announced a $175,015 settlement with freight forwarder Pegasus Worldwide Logistics for four apparent violations of the Illicit Drug Trafficking Sanctions Regulations and six apparent violations of the Reporting, Procedures and Penalties Regulations. Pegasus facilitated the importation of a machine supplied by a blocked company and failed for six months to respond fully to an OFAC subpoena. OFAC determined that the conduct was non-egregious and not voluntarily disclosed.",
    "sourceTitle": "OFAC enforcement action, October 9, 2026",
    "sourceUrl": "https://ofac.treasury.gov/recent-actions/20261009",
    "recordType": "Recent official OFAC overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Civil",
    "egregious": "No",
},
{
    "id": "bis-recent-2026-10-02-lambda-research-corporation",
    "date": "2026-10-02",
    "agency": "BIS",
    "name": "Lambda Research Corporation",
    "countries": ["China", "Japan", "United States"],
    "productCategory": "services",
    "products": ["EAR99 TracePro, OSLO, IGES, STEP, and RayViz optical-design software licenses, updates, and support"],
    "disclosure": "Voluntary self-disclosure",
    "posture": "BIS administrative settlement",
    "amountUsd": 2000000,
    "violationCount": 66,
    "caseId": "E3059",
    "factors": ["management_awareness", "no_license", "remediation", "restricted_party", "transshipment", "us_origin", "voluntary_disclosure", "weak_controls"],
    "summary": "BIS settled 66 admitted EAR violations by Lambda Research Corporation involving EAR99 optical-design software licenses, automatic updates, maintenance, and support supplied without authorization to Huawei Japan and SiCarrier, both Entity List parties, plus a software license exported through a distributor to a Sun Yat-Sen University laboratory without the required Unverified List statement. Lambda admitted the conduct. BIS imposed a $2 million civil penalty, fully suspended for one year and then waivable if Lambda completes required training and an export-compliance audit and commits no further violations.",
    "sourceTitle": "BIS Export Violation E3059 / Lambda Research Corporation order, October 2, 2026",
    "sourceUrl": "https://www.bis.gov/media/documents/lambda-research-corporation-10-2-2026.pdf",
    "recordType": "Recent official BIS overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Civil",
},
{
    "id": "doj-recent-2026-10-01-greg-lui",
    "date": "2026-10-01",
    "agency": "DOJ",
    "name": "Greg Lui",
    "countries": ["China", "Malaysia", "Singapore", "United States"],
    "productCategory": "semiconductors_ai",
    "products": ["Export-controlled high-end computer servers containing U.S.-manufactured GPUs"],
    "disclosure": "Not specified",
    "posture": "Criminal indictment; allegations pending",
    "amountUsd": 0,
    "transactionValueUsd": 300000000,
    "factors": ["management_awareness", "military_end_use", "no_license", "red_flags", "transshipment", "us_origin"],
    "summary": "DOJ announced Greg Lui's arrest on an indictment alleging a scheme to use Earthmade Computer Inc. to smuggle more than $300 million in export-controlled computer servers containing U.S.-manufactured GPUs to China. The indictment alleges false end-user documents, dummy servers used to mislead inspectors, and transshipment through Malaysia and Singapore without required Commerce Department licenses. The charges are allegations and Lui is presumed innocent unless proven guilty.",
    "sourceTitle": "DOJ indictment and arrest release, October 1, 2026",
    "sourceUrl": "https://www.justice.gov/usao-cdca/pr/san-gabriel-man-arrested-federal-charges-alleging-he-smuggled-china-more-300-million",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "doj-recent-2026-09-25-reza-dindar",
    "date": "2026-09-25",
    "agency": "DOJ",
    "name": "Reza Dindar",
    "countries": ["China", "Iran", "Panama", "United States"],
    "productCategory": "defense_services",
    "products": ["Parts for three military sonar systems"],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 10000,
    "sentenceMonths": 18,
    "violationCount": 4,
    "factors": ["management_awareness", "military_end_use", "no_license", "red_flags", "transshipment", "us_origin"],
    "summary": "DOJ announced an 18-month prison sentence and $10,000 fine for Reza Dindar after he pleaded guilty to two embargoed-country export counts and two smuggling counts. From 2010 through 2014, Dindar's China-based business concealed Iranian customers, falsely represented China as the destination, and procured U.S. parts for three military sonar systems for transshipment through China to Iran without authorization.",
    "sourceTitle": "DOJ sentencing release, September 25, 2026",
    "sourceUrl": "https://www.justice.gov/usao-wdwa/pr/iranian-national-sentenced-scheme-ship-sensitive-technology-iran-china",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
    "sanctionsRegime": "Iran sanctions / IEEPA",
},
{
    "id": "doj-recent-2026-09-21-tomas-niembro-concha",
    "date": "2026-09-21",
    "agency": "DOJ",
    "name": "Tomás Niembro Concha",
    "countries": ["United States", "Venezuela"],
    "productCategory": "financial_services",
    "products": ["Banking services and prohibited transactions involving an OFAC-designated Venezuelan individual"],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 16900000,
    "transactionValueUsd": 4000000,
    "sentenceMonths": 112,
    "factors": ["management_awareness", "no_license", "red_flags"],
    "summary": "DOJ announced a 112-month prison sentence for former Nodus International Bank CEO Tomás Niembro Concha after his guilty plea to wire-fraud conspiracy and conspiracy to violate IEEPA. Between 2021 and 2023, Niembro and others arranged prohibited financial transactions with an OFAC-designated individual who supported Venezuela's state-owned oil company PDVSA. Although OFAC authorized foreclosure on the designated person's New York home, the parties separately arranged an unlicensed $4 million resale through a front company. The court ordered forfeiture of more than $16.9 million, representing proceeds of the wire-fraud conspiracy.",
    "sourceTitle": "DOJ sentencing release, September 21, 2026",
    "sourceUrl": "https://www.justice.gov/opa/pr/former-bank-ceo-sentenced-over-9-years-prison-multimillion-dollar-wire-fraud-conspiracy-and",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
    "sanctionsRegime": "Venezuela Sanctions Regulations / IEEPA",
},
{
    "id": "doj-recent-2026-09-17-cyril-buyanovsky",
    "date": "2026-09-17",
    "agency": "DOJ",
    "name": "Cyril Gregory Buyanovsky",
    "countries": ["Russia", "United States"],
    "productCategory": "aerospace_aviation",
    "products": ["Advanced controlled avionics equipment and accessories"],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 50000,
    "transactionValueUsd": 450000,
    "sentenceMonths": 18,
    "factors": ["management_awareness", "no_license", "us_origin"],
    "summary": "DOJ announced an 18-month prison sentence for Cyril Gregory Buyanovsky, the former president and owner of KanRus Trading Company, after his guilty plea to conspiracy and money laundering. Buyanovsky and KanRus's vice president continued purchasing, selling, and exporting sophisticated controlled avionics equipment to Russian customers without required Commerce Department licenses after Russia's 2022 invasion of Ukraine. He consented to forfeiture of more than $450,000 in avionics equipment and accessories and a $50,000 personal forfeiture judgment.",
    "sourceTitle": "DOJ sentencing release, September 17, 2026",
    "sourceUrl": "https://www.justice.gov/usao-ks/pr/avionics-company-owner-sentenced-prison-thwarting-us-customs-laws",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "doj-recent-2026-09-14-deland-singh-firearms",
    "date": "2026-09-14",
    "agency": "DOJ",
    "name": "Guy Deland and Charan Singh",
    "countries": ["Canada", "Colombia", "United Arab Emirates", "United States"],
    "productCategory": "controlled_goods",
    "products": ["Firearms, suppressors, and ammunition on the U.S. Munitions List"],
    "disclosure": "Not specified",
    "posture": "Criminal guilty plea",
    "amountUsd": 0,
    "transactionValueUsd": 139960,
    "factors": ["management_awareness", "no_license", "red_flags"],
    "summary": "DOJ announced that Canadian nationals Guy Deland and Charan Singh pleaded guilty to conspiring to violate the Arms Export Control Act. From November 2016 through April 2017, they conspired with others to export U.S. Munitions List firearms, suppressors, and ammunition to the United Arab Emirates and Colombia without a State Department license. An undercover agent told them a license was required, and the invoices also warned that export without a license was prohibited. Two $34,990 wire transfers represented half of the planned purchase price. The release reports guilty pleas but no monetary penalty; amountUsd is the existing schema sentinel for an unreported monetary amount.",
    "sourceTitle": "DOJ press release, September 14, 2026",
    "sourceUrl": "https://www.justice.gov/usao-wdny/pr/two-canadian-men-plead-guilty-attempting-illegally-export-firearms-us-dubai-and",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "doj-recent-2026-09-14-andrei-samuilovski",
    "date": "2026-09-14",
    "agency": "DOJ",
    "name": "Andrei Samuilovski",
    "countries": ["Russia", "United Arab Emirates", "United States"],
    "productCategory": "aerospace_aviation",
    "products": ["U.S.-origin export-controlled aviation and aerospace components"],
    "disclosure": "Not specified",
    "posture": "Criminal guilty plea",
    "amountUsd": 0,
    "transactionValueUsd": 2000000,
    "factors": ["management_awareness", "no_license", "transshipment", "us_origin"],
    "summary": "DOJ announced that Andrei Samuilovski, a co-founder of UAE-based ITC Middle East FZ-LLC, pleaded guilty to conspiring to violate the Export Control Reform Act. From early 2022 through September 2024, the conspirators supplied prohibited Russian end users with U.S.-origin aerospace components controlled for national security, regional stability, and anti-terrorism reasons without required BIS licenses. Dozens of shipments went to ITC before ultimate reexport to Russia, with a cumulative value of nearly $2 million. The release does not report a forfeiture or other monetary penalty; amountUsd is the existing schema sentinel for an unreported monetary amount.",
    "sourceTitle": "DOJ press release, September 14, 2026",
    "sourceUrl": "https://www.justice.gov/usao-dc/pr/russian-national-pleads-guilty-smuggling-us-aerospace-goods-russia",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal",
},
{
    "id": "ofac-recent-2026-09-10-an-individual",
    "date": "2026-09-10",
    "agency": "OFAC",
    "name": "An Individual",
    "countries": ["Iran", "Singapore", "Turkey", "United Arab Emirates", "United States"],
    "productCategory": "services",
    "products": [
        "Management consulting and advisory services to Iranian software companies",
        "Iranian-origin dividend payments and Iranian real property"
    ],
    "disclosure": "No voluntary self-disclosure",
    "posture": "OFAC civil settlement",
    "amountUsd": 1427230,
    "transactionValueUsd": 713615,
    "violationCount": 39,
    "factors": ["management_awareness", "no_license", "red_flags", "transshipment", "us_origin"],
    "summary": "OFAC announced a $1,427,230 settlement with an anonymized U.S. lawful permanent resident for 39 apparent violations of the Iranian Transactions and Sanctions Regulations. From 2019 through 2021, the individual knowingly provided management consulting and advisory services to Iranian software companies, received $713,615 in Iranian-origin dividends through banks in Turkey, the United Arab Emirates, and Singapore into U.S. accounts, and purchased four properties in Iran. OFAC found the conduct egregious and not voluntarily self-disclosed; the individual initially gave an incomplete response to an administrative subpoena before responding fully after a second subpoena.",
    "sourceTitle": "OFAC enforcement release, September 10, 2026",
    "sourceUrl": "https://ofac.treasury.gov/media/936911/download?inline=",
    "recordType": "Recent official OFAC overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Civil",
    "sanctionsRegime": "Iran (ITSR)",
    "egregious": "Yes",
},
{
    "id": "doj-recent-2026-09-02-kamo-kirakosyan",
    "date": "2026-09-02",
    "agency": "DOJ",
    "name": "Kamo Kirakosyan",
    "countries": [
        "Armenia",
        "Russia",
        "United States"
    ],
    "productCategory": "industrial_equipment",
    "products": [
        "EAR-controlled goods usable in semiconductor manufacturing"
    ],
    "disclosure": "Not specified",
    "posture": "Criminal sentencing",
    "amountUsd": 0,
    "sentenceMonths": 26,
    "factors": [
        "no_license",
        "transshipment"
    ],
    "summary": "DOJ reported a 26-month prison sentence imposed September 1, 2026, for a conspiracy to export and reexport EAR-controlled goods from the United States to Russia through Armenia without required BIS licenses between February 2022 and at least August 2024. Goods included items usable in semiconductor manufacturing. Kirakosyan pleaded guilty to one conspiracy count in April 2026. The release does not specify a monetary penalty, ECCN, U.S. origin, or military end use; amountUsd is the existing schema sentinel for an unreported monetary amount.",
    "sourceTitle": "DOJ sentencing release, September 2, 2026",
    "sourceUrl": "https://www.justice.gov/usao-wdtx/pr/armenian-man-sentenced-federal-prison-smuggling-controlled-goods-russia",
    "recordType": "Recent official DOJ overlay",
    "codingStatus": "Official-source coded for model",
    "civilCriminal": "Criminal"
},
    {
        "id": "doj-recent-2026-08-28-alexander-mamonov",
        "date": "2026-08-28",
        "agency": "DOJ",
        "name": "Alexander Mamonov",
        "countries": ["China", "Russia", "United Arab Emirates", "United States"],
        "productCategory": "aerospace_aviation",
        "products": ["U.S.-origin aircraft parts", "Aircraft parts destined for PJSC Aeroflot"],
        "disclosure": "Not specified",
        "posture": "Criminal jury conviction",
        "amountUsd": 0,
        "transactionValueUsd": 900000,
        "violationCount": 12,
        "factors": ["management_awareness", "no_license", "red_flags", "restricted_party", "transshipment", "us_origin"],
        "summary": "DOJ announced that a federal jury convicted Alexander Mamonov on 12 counts involving a scheme to acquire and illegally export more than $900,000 in U.S.-origin aircraft parts to Russia and state-owned airline PJSC Aeroflot. Mamonov and a Russia-based co-defendant concealed the ultimate destination from U.S. suppliers by naming false destinations including the United Arab Emirates and China. The convictions included ECRA conspiracy and illegal exports, smuggling, false or misleading export information, and money laundering conspiracy.",
        "sourceTitle": "DOJ press release, August 28, 2026",
        "sourceUrl": "https://www.justice.gov/opa/pr/russian-national-living-florida-convicted-scheme-illegally-export-aircraft-parts-united",
        "recordType": "Recent official DOJ overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Criminal",
    },
    {
        "id": "doj-recent-2026-08-25-maxim-larin",
        "date": "2026-08-25",
        "agency": "DOJ",
        "name": "Maxim Larin",
        "countries": ["Kazakhstan", "Russia", "United States"],
        "productCategory": "defense_services",
        "products": [
            "Commerce Control List firearms parts and accessories",
            "USML Raptar target acquisition device"
        ],
        "disclosure": "Not specified",
        "posture": "Criminal guilty plea",
        "amountUsd": 250000,
        "factors": ["management_awareness", "military_end_use", "no_license", "red_flags", "transshipment", "us_origin"],
        "summary": "DOJ announced that Florida firearms-parts dealer Maxim Larin pleaded guilty to conspiring to violate the Export Control Reform Act and attempting to violate the Arms Export Control Act. Larin used his U.S. businesses to supply a Russia-based co-defendant, routed controlled firearms parts and accessories through Kazakhstan, mislabeled and undervalued shipments, and attempted to export a USML-controlled Raptar target acquisition device despite an express international-shipping prohibition. He agreed to forfeit $250,000 and seized weapons parts and accessories.",
        "sourceTitle": "DOJ press release, August 25, 2026",
        "sourceUrl": "https://www.justice.gov/usao-edny/pr/florida-firearms-parts-dealer-pleads-guilty-exporting-weapons-components-part-russia",
        "recordType": "Recent official DOJ overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Criminal",
    },
    {
        "id": "bis-recent-2026-08-24-container-manufacturing-ltd",
        "date": "2026-08-24",
        "agency": "BIS",
        "name": "Container Manufacturing Ltd.",
        "countries": ["Russia", "Turkey", "United Arab Emirates", "United States"],
        "productCategory": "industrial_equipment",
        "products": [
            "EAR99 spare parts for aluminum metalworking tools",
            "HTS 8466.94, 8462.29, and 4016.93 items"
        ],
        "disclosure": "Not specified",
        "posture": "BIS administrative settlement",
        "amountUsd": 1000000,
        "transactionValueUsd": 264721,
        "violationCount": 10,
        "caseId": "E3054",
        "factors": ["management_awareness", "no_license", "red_flags", "remediation", "transshipment", "us_origin", "weak_controls"],
        "summary": "BIS assessed a $1 million civil penalty against Container Manufacturing Ltd. for ten EAR violations involving $264,721 in EAR99 spare parts for aluminum metalworking tools exported to a Russian end user without required authorization. Eight exports occurred directly or through a UAE distributor; two later exports moved through Turkey after a bank warned of Russia-related restrictions and transaction documents were changed despite unresolved red flags. The company admitted the conduct, cooperated, and implemented remedial compliance measures.",
        "sourceTitle": "BIS Export Violation E3054 / Container Manufacturing Ltd. order, August 24, 2026",
        "sourceUrl": "https://www.bis.gov/media/documents/container-manufacturing-ltd-8-24-2026.pdf",
        "recordType": "Recent official BIS overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Civil",
    },
    {
        "id": "bis-recent-2026-08-14-plexon-inc",
        "date": "2026-08-14",
        "agency": "BIS",
        "name": "Plexon, Inc.",
        "countries": ["China", "United States"],
        "productCategory": "encryption_electronics",
        "products": [
            "Neural Recording Data Acquisition Systems (OmniPlex systems) and accessories",
            "ECCN 4A994.k items"
        ],
        "disclosure": "Not specified",
        "posture": "BIS administrative enforcement action",
        "amountUsd": 0,
        "transactionValueUsd": 178721,
        "violationCount": 8,
        "caseId": "E3053",
        "factors": ["restricted_party", "military_end_use", "no_license", "transshipment", "us_origin", "eccn"],
        "summary": "BIS charged Plexon, Inc. with eight alleged EAR violations involving exports of OmniPlex neural recording systems and accessories, classified under ECCN 4A994.k and valued at approximately $178,721, to China's Academy of Military Medical Sciences through Plexon's Asian distributor without the required BIS authorization. AMMS had been on the Entity List since December 2021 for support of Chinese military end uses, including alleged brain-control weaponry.",
        "sourceTitle": "BIS Export Violation E3053 / Plexon, Inc. order, August 14, 2026",
        "sourceUrl": "https://www.bis.gov/media/documents/plexon-inc.-8-14-2026.pdf",
        "recordType": "Recent official BIS overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Civil",
    },
    {
        "id": "state-ddtc-recent-2026-08-14-bae-systems-inc",
        "date": "2026-08-14",
        "agency": "DDTC",
        "name": "BAE Systems, Inc.",
        "countries": ["China", "France", "Germany", "Italy", "United Kingdom", "United States"],
        "productCategory": "defense_services",
        "products": [
            "ITAR-controlled defense articles and technical data",
            "GPS satellite tracking technology",
            "Explosive materials",
            "F-35-related components"
        ],
        "disclosure": "Voluntary self-disclosure",
        "posture": "State/DDTC civil settlement",
        "amountUsd": 36000000,
        "factors": ["military_end_use", "no_license", "red_flags", "remediation", "us_origin", "voluntary_disclosure", "weak_controls"],
        "summary": "State/DDTC announced a $36 million settlement with BAE Systems, Inc. resolving alleged AECA/ITAR export violations involving unauthorized transfers of controlled defense technology and technical data, including activity involving China and several allied-country locations. Public reporting indicates most violations were voluntarily disclosed and that the settlement includes compliance monitoring and remedial obligations.",
        "sourceTitle": "State Department press release, August 2026",
        "sourceUrl": "https://www.state.gov/releases/bureau-of-political-military-affairs/2026/08/u-s-department-of-state-concludes-36-million-settlement-resolving-export-violations-by-bae-systems-inc-bae",
        "recordType": "Recent official State/DDTC overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Civil",
    },
    {
        "id": "doj-recent-2026-08-10-dingwei-chen",
        "date": "2026-08-10",
        "agency": "DOJ",
        "name": "Dingwei Chen",
        "countries": ["China", "Mexico", "Switzerland", "United States"],
        "productCategory": "defense_services",
        "products": ["Military-grade satellite modems and radios", "ITAR-controlled communications hardware"],
        "disclosure": "Not specified",
        "posture": "Criminal guilty plea",
        "amountUsd": 0,
        "transactionValueUsd": 70000,
        "factors": ["management_awareness", "military_end_use", "no_license", "red_flags", "transshipment", "us_origin"],
        "summary": "DOJ announced that Dingwei Chen pleaded guilty to violating the Arms Export Control Act after attempting to acquire military-grade satellite modems and radios for China. The procurement plan considered transshipment through Switzerland, Saipan, and Mexico, used encrypted communications and cryptocurrency, and involved approximately $70,000 in down payments for 10 modems.",
        "sourceTitle": "DOJ press release, August 10, 2026",
        "sourceUrl": "https://www.justice.gov/opa/pr/chinese-national-pleads-guilty-trying-obtain-us-military-equipment",
        "recordType": "Recent official DOJ overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Criminal",
    },
    {
        "id": "doj-recent-2026-08-05-dimitri-beix",
        "date": "2026-08-05",
        "agency": "DOJ",
        "name": "Dimitri Beix",
        "countries": ["Dominica"],
        "productCategory": "defense_services",
        "products": ["Firearms, firearm components, and ammunition"],
        "disclosure": "Not specified",
        "posture": "Criminal guilty plea",
        "amountUsd": 0,
        "factors": ["no_license", "red_flags", "transshipment", "us_origin"],
        "summary": "DOJ announced a guilty plea involving illegal export of firearms, firearm components, and ammunition from the United States to Dominica without required licenses or authorization.",
        "sourceTitle": "DOJ press release, August 5, 2026",
        "sourceUrl": "https://www.justice.gov/usao-ct/pr/homeland-security-task-force-dominican-national-admits-role-firearms-trafficking-scheme",
        "recordType": "Recent official DOJ overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Criminal",
    },
    {
        "id": "doj-recent-2026-07-23-andrey-shevlyakov",
        "date": "2026-07-23",
        "agency": "DOJ",
        "name": "Andrey Shevlyakov",
        "countries": ["Estonia", "Russia"],
        "productCategory": "encryption_electronics",
        "products": ["Sensitive electronic components"],
        "disclosure": "Not specified",
        "posture": "Criminal guilty plea",
        "amountUsd": 1500000,
        "factors": ["management_awareness", "military_end_use", "no_license", "red_flags", "restricted_party", "transshipment", "us_origin"],
        "summary": "DOJ announced a guilty plea involving a procurement network that exported sensitive U.S. electronics for Russian military and government contractors; the defendant agreed to forfeit approximately $1.5 million.",
        "sourceTitle": "DOJ press release, July 23, 2026",
        "sourceUrl": "https://www.justice.gov/usao-edny/pr/estonian-national-pleads-guilty-exporting-electronics-benefit-russian-military",
        "recordType": "Recent official DOJ overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Criminal",
    },
]


def clean(value):
    if value is None:
        return ""
    text = str(value).strip()
    return "" if text.lower() in {"none", "nan", "n/a - administrative"} else text


def number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = re.sub(r"[^0-9.\-]", "", str(value))
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def date_iso(value, fallback_year=""):
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = clean(value)
    if re.fullmatch(r"\d{8}", text):
        return f"{text[:4]}-{text[4:6]}-{text[6:8]}"
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    year = clean(fallback_year)
    return f"{year}-01-01" if year else ""


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", clean(value).lower()).strip("-")[:90] or "record"


def split_list(value):
    text = clean(value)
    if not text:
        return []
    text = text.replace("U.S.", "United States").replace("U.K.", "United Kingdom").replace("U.A.E.", "United Arab Emirates")
    parts = re.split(r";|,|\band\b", text)
    out = []
    for part in parts:
        item = clean(part)
        if not item or len(item) == 1 or item.lower() in {"multiple", "not stated in source"}:
            continue
        out.append(COUNTRY_FIXES.get(item, item))
    return sorted(set(out))


def extract_notes_field(notes, label):
    text = clean(notes).replace("U.S.", "United States").replace("U.K.", "United Kingdom").replace("U.A.E.", "United Arab Emirates")
    match = re.search(rf"{label}\s*:\s*([^.;]+(?:; [^.;]+)*)", text, flags=re.I)
    return match.group(1).strip() if match else ""


def countries_from_ear(row):
    explicit = extract_notes_field(row.get("Notes"), "Countries/nexus")
    if explicit:
        return split_list(explicit)
    return split_list(row.get("Current Parent HQ Country"))


def normalize_agency(value):
    text = clean(value)
    for long_name, short in AGENCY_NAMES.items():
        if long_name.lower() in text.lower():
            return short
    if "security" in text.lower() and "bureau" in text.lower():
        return "BIS"
    if "defense trade" in text.lower():
        return "DDTC"
    if "ofac" in text.lower():
        return "OFAC"
    if "justice" in text.lower() or text.upper() == "DOJ":
        return "DOJ"
    return text or "Unknown"


def product_category(*values):
    text = " ".join(clean(v).lower() for v in values)
    if any(x in text for x in ["semiconductor", "advanced computing", "huawei", "chip", "wafer"]):
        return "semiconductors_ai"
    if any(x in text for x in ["aerospace", "aircraft", "aviation", "missile", "satellite", "usml category viii"]):
        return "aerospace_aviation"
    if any(x in text for x in ["defense", "itar", "usml", "military", "technical data"]):
        return "defense_services"
    if any(x in text for x in ["oil", "gas", "energy", "petroleum", "liquefied"]):
        return "oil_gas_energy"
    if any(x in text for x in ["bank", "securities", "financial", "brokerage", "payment", "debt"]):
        return "financial_services"
    if any(x in text for x in ["freight", "shipping", "logistics", "shipment", "carrier"]):
        return "maritime_logistics"
    if any(x in text for x in ["software", "sensor", "electronics", "thermal", "camera", "telecom", "encryption"]):
        return "encryption_electronics"
    if any(x in text for x in ["service", "consulting", "training", "advisory"]):
        return "services"
    return "controlled_goods"


def factors_from_text(row, text):
    haystack = text.lower()
    factors = []
    if "vsd: yes" in haystack or clean(row.get("Voluntary Disclosure?")).lower().startswith("yes"):
        factors.append("voluntary_disclosure")
    if "remed" in haystack or "compliance" in haystack or "cooperat" in haystack:
        factors.append("remediation")
    if any(x in haystack for x in ["sdn", "entity list", "blocked", "restricted party", "huawei", "smic"]):
        factors.append("restricted_party")
    if any(x in haystack for x in ["military", "defense", "itar", "usml", "aeca"]):
        factors.append("military_end_use")
    if any(x in haystack for x in ["unlicensed", "without a license", "license", "authorization"]):
        factors.append("no_license")
    if any(x in haystack for x in ["transshipment", "transshipped", "distributor", "reexport", "retransfer", "through"]):
        factors.append("transshipment")
    if any(x in haystack for x in ["evasion", "conceal", "false", "red flag", "reckless"]):
        factors.append("red_flags")
    if any(x in haystack for x in ["management", "actual knowledge", "knew", "awareness"]):
        factors.append("management_awareness")
    if any(x in haystack for x in ["compliance failure", "inadequate compliance", "screening", "recordkeeping", "controls"]):
        factors.append("weak_controls")
    if any(x in haystack for x in ["u.s.", "united states", "us-origin", "u.s.-origin"]):
        factors.append("us_origin")
    return sorted(set(factors))


def disclosure_status(value, notes=""):
    text = f"{clean(value)} {clean(notes)}".lower()
    if "vsd: yes" in text or text.startswith("yes") or "voluntary self" in text:
        return "Voluntary self-disclosure"
    if "vsd: no" in text or text.startswith("no"):
        return "No voluntary self-disclosure"
    return "Not specified"


def row_dict(headers, row):
    return {headers[i]: row[i] for i in range(min(len(headers), len(row))) if headers[i]}


def ofac_record(row, index):
    name = clean(row.get("Individual/Company"))
    if not name:
        return None
    date = date_iso(row.get("Announcement Date"), row.get("Year"))
    text = " ".join(clean(row.get(k)) for k in row)
    penalty = number(row.get("Penalty")) or 0
    countries = split_list(row.get("Countries Involved"))
    items = clean(row.get("Items/Technology Involved")) or clean(row.get("Item(s) Exported/ Other Violations"))
    factors = factors_from_text(row, text)
    if clean(row.get("Egregious Case?")).lower().startswith("yes"):
        factors.append("management_awareness")
    if clean(row.get("SDN Individual or Entity?")).lower().startswith("yes"):
        factors.append("restricted_party")
    if clean(row.get("Items Eligble for License?")).lower().startswith("no"):
        factors.append("no_license")
    return {
        "id": f"ofac-workbook-{date}-{index}-{slug(name)}",
        "date": date,
        "agency": "OFAC",
        "name": name,
        "countries": countries,
        "productCategory": product_category(row.get("Industry"), items, row.get("Sanctions Regime")),
        "products": [x for x in [items, clean(row.get("Item(s) Exported/ Other Violations"))] if x],
        "disclosure": disclosure_status(row.get("Voluntary Disclosure?")),
        "posture": "OFAC civil penalty/settlement",
        "amountUsd": penalty,
        "factors": sorted(set(factors)),
        "summary": clean(row.get("Item(s) Exported/ Other Violations")) or f"OFAC enforcement action involving {name}.",
        "sourceTitle": f"Workbook OFAC {clean(row.get('Year'))} enforcement action",
        "sourceUrl": "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
        "recordType": "Workbook normalized case",
        "codingStatus": "Workbook-coded for model",
        "violationCount": number(row.get("# of violations")),
        "sanctionsRegime": clean(row.get("Sanctions Regime")),
        "egregious": clean(row.get("Egregious Case?")),
    }


def ear_itar_record(row, index):
    name = clean(row.get("Company"))
    if not name:
        return None
    agency = normalize_agency(row.get("Agency2"))
    date = date_iso(row.get("Penalty Date"), row.get("Year"))
    text = " ".join(clean(row.get(k)) for k in row)
    amount = number(row.get("Penalty Amount Adjusted For Eliminating Multiple Counting"))
    if amount is None:
        amount = number(row.get("Penalty Amount")) or 0
    goods = clean(row.get("Goods/Items"))
    desc = clean(row.get("Description"))
    notes = clean(row.get("Notes"))
    return {
        "id": f"ear-itar-workbook-{date}-{index}-{slug(name)}",
        "date": date,
        "agency": agency,
        "name": name,
        "countries": countries_from_ear(row),
        "productCategory": product_category(row.get("NAICS Translation"), row.get("Current Parent Specific Industry"), goods, desc, notes),
        "products": [x for x in [goods, clean(row.get("Secondary Offense"))] if x],
        "disclosure": disclosure_status("", notes),
        "posture": clean(row.get("Prosecution Agreement")) or clean(row.get("Action Type")) or "Enforcement action",
        "amountUsd": amount,
        "factors": factors_from_text(row, text),
        "summary": desc or clean(row.get("Primary Offense")) or f"{agency} enforcement action involving {name}.",
        "sourceTitle": clean(row.get("Case ID")) or f"Workbook {agency} enforcement action",
        "sourceUrl": clean(row.get("Info Source")),
        "recordType": "Workbook normalized case",
        "codingStatus": "Workbook-coded for model",
        "civilCriminal": clean(row.get("Civil/Criminal")),
        "caseId": clean(row.get("Case ID")),
    }


def logistics_record(row, index):
    name = clean(row.get("Company"))
    if not name:
        return None
    agency = normalize_agency(row.get("U.S. Agency"))
    year = clean(row.get("Year ")) or clean(row.get("Year"))
    text = " ".join(clean(row.get(k)) for k in row)
    return {
        "id": f"logistics-workbook-{year}-{index}-{slug(name)}",
        "date": f"{year}-01-01" if year else "",
        "agency": agency,
        "name": name,
        "countries": split_list(row.get("Nationality")),
        "productCategory": "maritime_logistics",
        "products": ["Logistics / freight / shipping services"],
        "disclosure": "Not specified",
        "posture": "Logistics enforcement action",
        "amountUsd": number(row.get("Fine")) or 0,
        "factors": factors_from_text(row, text + " logistics shipment freight"),
        "summary": f"Logistics enforcement action involving {name}.",
        "sourceTitle": "Workbook logistics enforcement row",
        "sourceUrl": "",
        "recordType": "Workbook normalized case",
        "codingStatus": "Workbook-coded for model",
    }


def load_records():
    wb = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    records = []
    sheet_counts = {}
    for sheet, builder in [("OFAC", ofac_record), ("EAR-ITAR", ear_itar_record), ("Logistics", logistics_record)]:
        ws = wb[sheet]
        rows = ws.iter_rows(values_only=True)
        headers = [clean(x) for x in next(rows)]
        count = 0
        for index, row in enumerate(rows, start=2):
            record = builder(row_dict(headers, row), index)
            if record and record["name"]:
                records.append(record)
                count += 1
        sheet_counts[sheet] = count
    records.extend(RECENT_OFFICIAL_OVERLAY)
    sheet_counts["Recent official overlay"] = len(RECENT_OFFICIAL_OVERLAY)
    return records, sheet_counts


def js_write(path, variable, value):
    Path(path).write_text(f"window.{variable} = {json.dumps(value, indent=2, ensure_ascii=False)};\n", encoding="utf-8")


def read_existing_source_index():
    path = ROOT / "data" / "sourceIndex.js"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []
    text = re.sub(r"^window\.SOURCE_INDEX\s*=\s*", "", text)
    text = re.sub(r";\s*$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return []


def main():
    if not WORKBOOK.exists():
        print(f"Workbook not found: {WORKBOOK}", file=sys.stderr)
        return 1
    records, sheet_counts = load_records()
    records.sort(key=lambda x: (x.get("date") or "", x.get("name") or ""), reverse=True)
    source_index = [
        {
            "id": record["id"],
            "date": record["date"],
            "agency": record["agency"],
            "name": record["name"],
            "amountUsd": record["amountUsd"],
            "recordType": record["recordType"],
            "codingStatus": record["codingStatus"],
            "countries": record.get("countries", []),
            "disclosure": record.get("disclosure", "Not specified"),
            "aggravatingFactors": [record.get("factors", [])],
            "sourceTitle": record.get("sourceTitle", ""),
            "sourceUrl": record.get("sourceUrl", ""),
        }
        for record in records
    ]
    coverage = [
        {
            "agency": "OFAC",
            "source": "Workbook OFAC sheet",
            "scope": "OFAC civil penalties and settlements through workbook update",
            "indexedRecords": sheet_counts.get("OFAC", 0),
            "indexedPeriod": "Workbook updated 2026-07-22",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Rows mapped from workbook fields including penalty, regime, VSD, countries, items, SDN flag, and egregious-case flag.",
            "sourceUrl": "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
        },
        {
            "agency": "BIS/DDTC/DOJ",
            "source": "Workbook EAR-ITAR sheet",
            "scope": "Export-control, ITAR, administrative, civil, and criminal enforcement actions",
            "indexedRecords": sheet_counts.get("EAR-ITAR", 0),
            "indexedPeriod": "Workbook updated 2026-07-22",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Rows mapped from workbook fields including agency, case ID, goods, description, source URL, country nexus from notes, VSD, and penalty amount.",
            "sourceUrl": "",
        },
        {
            "agency": "Logistics",
            "source": "Workbook Logistics sheet",
            "scope": "Logistics-specific enforcement rows",
            "indexedRecords": sheet_counts.get("Logistics", 0),
            "indexedPeriod": "Workbook updated 2026-07-22",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Rows mapped as logistics/freight/shipping cases.",
            "sourceUrl": "",
        },
        {
            "agency": "BIS/DOJ/DDTC",
            "source": "Recent official agency overlay",
            "scope": "Post-workbook BIS, DOJ, and State/DDTC export-control and sanctions matters checked against official releases",
            "indexedRecords": sheet_counts.get("Recent official overlay", 0),
            "indexedPeriod": "Official feeds checked 2026-11-08",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Recent post-workbook official matters are normalized as overlay records so the scoring model includes entries identified after the July 22 workbook update. The October 29 review added the Yana Leonova and Dimitri Beix sentencing matters; charging-stage records remain explicitly labeled as allegations.",
            "sourceUrl": "https://www.bis.gov/enforcement/export-violations",
        },
        {
            "agency": "BIS",
            "source": "Official BIS export-violations index",
            "scope": "BIS export-violation documents, including recent orders and charging letters",
            "indexedRecords": 1127,
            "indexedPeriod": "Official BIS index fetched 2026-11-08",
            "status": "Indexed; source rows loaded",
            "notes": "These official BIS rows are searchable in the historical explorer. Rows become part of Bayesian likelihoods after normalization into the full case schema.",
            "sourceUrl": "https://www.bis.gov/enforcement/export-violations",
        },
        {
            "agency": "OFAC",
            "source": "Official OFAC civil-penalty index",
            "scope": "OFAC civil-penalty rows from official yearly enforcement pages",
            "indexedRecords": 1058,
            "indexedPeriod": "Official OFAC pages fetched 2026-11-08",
            "status": "Indexed; source rows loaded",
            "notes": "These official OFAC rows are searchable but remain outside Bayesian likelihoods until fully normalized and factor-coded.",
            "sourceUrl": "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
        },
        {
            "agency": "DOJ",
            "source": "Official DOJ NSD export-control/sanctions news",
            "scope": "DOJ NSD export-control and sanctions press releases",
            "indexedRecords": 290,
            "indexedPeriod": "Official DOJ pages fetched 2026-11-08",
            "status": "Indexed; source rows loaded",
            "notes": "These official DOJ rows are searchable but remain outside Bayesian likelihoods until fully normalized and factor-coded.",
            "sourceUrl": "https://www.justice.gov/nsd/export-control-news",
        },
        {
            "agency": "Multi-jurisdiction",
            "source": "Sanctions Expert feed",
            "scope": "U.S. and non-U.S. sanctions, export-control, AML, designation, guidance, and enforcement briefs",
            "indexedRecords": 219,
            "indexedPeriod": "Feed fetched 2026-11-08",
            "status": "Third-party feed indexed; official-source review needed for model coding",
            "notes": "Feed items are searchable in the historical explorer and category search. They are not used for Bayesian likelihoods until verified against official sources and normalized into the full case schema.",
            "sourceUrl": "https://feed.sanctionsexpert.com/feed",
        },
    ]
    js_write(ROOT / "data" / "cases.js", "SANCTIONS_CASES", records)
    js_write(ROOT / "data" / "sourceIndex.js", "SOURCE_INDEX", read_existing_source_index())
    js_write(ROOT / "data" / "sourceCoverage.js", "SOURCE_COVERAGE", coverage)
    print(json.dumps({"records": len(records), "sheet_counts": sheet_counts}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
