/**
 * Master Reference Identity Data - Kebun & Afdeling
 * Source: AREAL & POPULASI MASTERFIELD 2026.xlsx (Sheet: AFD)
 *
 * This dataset serves as the authoritative enterprise reference layer
 * for Kebun and Afdeling identity mapping. It is decoupled from any
 * specific production workbook and ready for future Spreadsheet API
 * or database ingestion pipelines.
 */

export interface AfdelingMasterRecord {
  /** Unique reference composite code (e.g. AFD017K01) */
  reff: string
  /** SAP / Plant code (e.g. 7K01) */
  plantCode: string
  /** Full plant description (e.g. KEBUN PASEWARAN KALISELOGIRI) */
  plantDesc: string
  /** Primary canonical estate key extracted from first KEBUN phrase (e.g. PASEWARAN) */
  primaryEstate: string
  /** Compact normalized plant key for compound estate lookup */
  plantKey: string
  /** Authoritative AFD Code (e.g. AFD01) */
  afdCode: string
  /** Official AFD description (e.g. AFD. PASEWARAN UTARA) */
  afdName: string
  /** Normalized AFD key for deterministic matching (e.g. PASEWARANUTARA) */
  afdKey: string
}

export const afdelingMasterMeta = {
  workbook: 'AREAL & POPULASI MASTERFIELD 2026.xlsx',
  sheet: 'AFD',
  recordCount: 178,
  version: '2026.1',
  role: 'Authoritative Master Reference Data',
} as const

export const afdelingMasterRecords: AfdelingMasterRecord[] = [
  {
    "reff": "AFD017K01",
    "plantCode": "7K01",
    "plantDesc": "KEBUN PASEWARAN KALISELOGIRI",
    "primaryEstate": "PASEWARAN",
    "plantKey": "KEBUNPASEWARANKALISELOGIRI",
    "afdCode": "AFD01",
    "afdName": "AFD. PASEWARAN UTARA",
    "afdKey": "PASEWARANUTARA"
  },
  {
    "reff": "AFD027K01",
    "plantCode": "7K01",
    "plantDesc": "KEBUN PASEWARAN KALISELOGIRI",
    "primaryEstate": "PASEWARAN",
    "plantKey": "KEBUNPASEWARANKALISELOGIRI",
    "afdCode": "AFD02",
    "afdName": "AFD. PASEWARAN SELATAN",
    "afdKey": "PASEWARANSELATAN"
  },
  {
    "reff": "AFD037K01",
    "plantCode": "7K01",
    "plantDesc": "KEBUN PASEWARAN KALISELOGIRI",
    "primaryEstate": "PASEWARAN",
    "plantKey": "KEBUNPASEWARANKALISELOGIRI",
    "afdCode": "AFD03",
    "afdName": "AFD. SIDOMULYO",
    "afdKey": "SIDOMULYO"
  },
  {
    "reff": "AFD047K01",
    "plantCode": "7K01",
    "plantDesc": "KEBUN PASEWARAN KALISELOGIRI",
    "primaryEstate": "PASEWARAN",
    "plantKey": "KEBUNPASEWARANKALISELOGIRI",
    "afdCode": "AFD04",
    "afdName": "AFD. ASEMBAGUS",
    "afdKey": "ASEMBAGUS"
  },
  {
    "reff": "AFD057K01",
    "plantCode": "7K01",
    "plantDesc": "KEBUN PASEWARAN KALISELOGIRI",
    "primaryEstate": "PASEWARAN",
    "plantKey": "KEBUNPASEWARANKALISELOGIRI",
    "afdCode": "AFD05",
    "afdName": "AFD. TETELAN",
    "afdKey": "TETELAN"
  },
  {
    "reff": "AFD067K01",
    "plantCode": "7K01",
    "plantDesc": "KEBUN PASEWARAN KALISELOGIRI",
    "primaryEstate": "PASEWARAN",
    "plantKey": "KEBUNPASEWARANKALISELOGIRI",
    "afdCode": "AFD06",
    "afdName": "AFD. ALAS GEDANG",
    "afdKey": "ALASGEDANG"
  },
  {
    "reff": "AFD077K01",
    "plantCode": "7K01",
    "plantDesc": "KEBUN PASEWARAN KALISELOGIRI",
    "primaryEstate": "PASEWARAN",
    "plantKey": "KEBUNPASEWARANKALISELOGIRI",
    "afdCode": "AFD07",
    "afdName": "AFD. WANGKAL/SECANG",
    "afdKey": "WANGKALSECANG"
  },
  {
    "reff": "AFD017K03",
    "plantCode": "7K03",
    "plantDesc": "KEBUN SUNGAILEMBU",
    "primaryEstate": "SUNGAILEMBU",
    "plantKey": "KEBUNSUNGAILEMBU",
    "afdCode": "AFD01",
    "afdName": "AFD. SUNGAI LEMBU",
    "afdKey": "SUNGAILEMBU"
  },
  {
    "reff": "AFD027K03",
    "plantCode": "7K03",
    "plantDesc": "KEBUN SUNGAILEMBU",
    "primaryEstate": "SUNGAILEMBU",
    "plantKey": "KEBUNSUNGAILEMBU",
    "afdCode": "AFD02",
    "afdName": "AFD. PAKAODA",
    "afdKey": "PAKAODA"
  },
  {
    "reff": "AFD037K03",
    "plantCode": "7K03",
    "plantDesc": "KEBUN SUNGAILEMBU",
    "primaryEstate": "SUNGAILEMBU",
    "plantKey": "KEBUNSUNGAILEMBU",
    "afdCode": "AFD03",
    "afdName": "AFD. REJOAGUNG",
    "afdKey": "REJOAGUNG"
  },
  {
    "reff": "AFD047K03",
    "plantCode": "7K03",
    "plantDesc": "KEBUN SUNGAILEMBU",
    "primaryEstate": "SUNGAILEMBU",
    "plantKey": "KEBUNSUNGAILEMBU",
    "afdCode": "AFD04",
    "afdName": "AFD. SUMBER BOPONG",
    "afdKey": "SUMBERBOPONG"
  },
  {
    "reff": "AFD017K04",
    "plantCode": "7K04",
    "plantDesc": "KEBUN SUMBERJAMBE",
    "primaryEstate": "SUMBERJAMBE",
    "plantKey": "KEBUNSUMBERJAMBE",
    "afdCode": "AFD01",
    "afdName": "AFD. SUMBER JAMBE",
    "afdKey": "SUMBERJAMBE"
  },
  {
    "reff": "AFD027K04",
    "plantCode": "7K04",
    "plantDesc": "KEBUN SUMBERJAMBE",
    "primaryEstate": "SUMBERJAMBE",
    "plantKey": "KEBUNSUMBERJAMBE",
    "afdCode": "AFD02",
    "afdName": "AFD. SUMBER WARINGIN",
    "afdKey": "SUMBERWARINGIN"
  },
  {
    "reff": "AFD037K04",
    "plantCode": "7K04",
    "plantDesc": "KEBUN SUMBERJAMBE",
    "primaryEstate": "SUMBERJAMBE",
    "plantKey": "KEBUNSUMBERJAMBE",
    "afdCode": "AFD03",
    "afdName": "AFD. SUMBER GANDENG",
    "afdKey": "SUMBERGANDENG"
  },
  {
    "reff": "AFD047K04",
    "plantCode": "7K04",
    "plantDesc": "KEBUN SUMBERJAMBE",
    "primaryEstate": "SUMBERJAMBE",
    "plantKey": "KEBUNSUMBERJAMBE",
    "afdCode": "AFD04",
    "afdName": "AFD. PAL IV/VI",
    "afdKey": "PALIVVI"
  },
  {
    "reff": "AFD017K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD01",
    "afdName": "AFD. KALI WADUNG",
    "afdKey": "KALIWADUNG"
  },
  {
    "reff": "AFD027K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD02",
    "afdName": "AFD. WARINGIN",
    "afdKey": "WARINGIN"
  },
  {
    "reff": "AFD037K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD03",
    "afdName": "AFD. KALIJAMBE",
    "afdKey": "KALIJAMBE"
  },
  {
    "reff": "AFD047K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD04",
    "afdName": "AFD. MARGOSUGIH",
    "afdKey": "MARGOSUGIH"
  },
  {
    "reff": "AFD057K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD05",
    "afdName": "AFD. BONDOKEREP",
    "afdKey": "BONDOKEREP"
  },
  {
    "reff": "AFD067K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD06",
    "afdName": "AFD. KEMPIT",
    "afdKey": "KEMPIT"
  },
  {
    "reff": "AFD077K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD07",
    "afdName": "AFD. DARUNGAN",
    "afdKey": "DARUNGAN"
  },
  {
    "reff": "AFD087K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD08",
    "afdName": "AFD. BESARAN",
    "afdKey": "BESARAN"
  },
  {
    "reff": "AFD097K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD09",
    "afdName": "AFD. KAMPUNG LIMA",
    "afdKey": "KAMPUNGLIMA"
  },
  {
    "reff": "AFD107K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD10",
    "afdName": "AFD. KALI BARU KIDUL",
    "afdKey": "KALIBARUKIDUL"
  },
  {
    "reff": "AFD117K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD11",
    "afdName": "AFD. SUMBER BARU",
    "afdKey": "SUMBERBARU"
  },
  {
    "reff": "AFD127K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD12",
    "afdName": "AFD. KAJAR",
    "afdKey": "KAJAR"
  },
  {
    "reff": "AFD137K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD13",
    "afdName": "AFD. KACANGAN",
    "afdKey": "KACANGAN"
  },
  {
    "reff": "AFD147K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD14",
    "afdName": "AFD. JATIRONO UTARA",
    "afdKey": "JATIRONOUTARA"
  },
  {
    "reff": "AFD157K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD15",
    "afdName": "AFD. SUMBER SALAK",
    "afdKey": "SUMBERSALAK"
  },
  {
    "reff": "AFD167K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD16",
    "afdName": "AFD. GUNUNG RAUNG",
    "afdKey": "GUNUNGRAUNG"
  },
  {
    "reff": "AFD177K05",
    "plantCode": "7K05",
    "plantDesc": "KEBUN KALIKEMPIT KALISEPANJANG JATIRONO",
    "primaryEstate": "KALIKEMPIT",
    "plantKey": "KEBUNKALIKEMPITKALISEPANJANGJATIRONO",
    "afdCode": "AFD17",
    "afdName": "AFD. GUNUNG MAS",
    "afdKey": "GUNUNGMAS"
  },
  {
    "reff": "AFD017K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD01",
    "afdName": "AFD. DAMPIT",
    "afdKey": "DAMPIT"
  },
  {
    "reff": "AFD027K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD02",
    "afdName": "AFD. PURWOJOYO",
    "afdKey": "PURWOJOYO"
  },
  {
    "reff": "AFD037K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD03",
    "afdName": "AFD. KALISUGIH",
    "afdKey": "KALISUGIH"
  },
  {
    "reff": "AFD047K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD04",
    "afdName": "AFD. KALIRINGIN",
    "afdKey": "KALIRINGIN"
  },
  {
    "reff": "AFD057K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD05",
    "afdName": "AFD. KALIURIP",
    "afdKey": "KALIURIP"
  },
  {
    "reff": "AFD067K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD06",
    "afdName": "AFD. SIDOMUKTI",
    "afdKey": "SIDOMUKTI"
  },
  {
    "reff": "AFD077K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD07",
    "afdName": "AFD. PEGUNDANGAN",
    "afdKey": "PEGUNDANGAN"
  },
  {
    "reff": "AFD087K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD08",
    "afdName": "AFD. DADIMUKTI",
    "afdKey": "DADIMUKTI"
  },
  {
    "reff": "AFD097K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD09",
    "afdName": "AFD. JATIRONO",
    "afdKey": "JATIRONO"
  },
  {
    "reff": "AFD107K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD10",
    "afdName": "AFD. REJOSARI",
    "afdKey": "REJOSARI"
  },
  {
    "reff": "AFD117K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD11",
    "afdName": "AFD. KALISARI",
    "afdKey": "KALISARI"
  },
  {
    "reff": "AFD127K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD12",
    "afdName": "AFD. SUMBERMANGGIS",
    "afdKey": "SUMBERMANGGIS"
  },
  {
    "reff": "AFD137K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD13",
    "afdName": "AFD. POROLINGGO",
    "afdKey": "POROLINGGO"
  },
  {
    "reff": "AFD147K07",
    "plantCode": "7K07",
    "plantDesc": "KEBUN KALITELEPAK",
    "primaryEstate": "KALITELEPAK",
    "plantKey": "KEBUNKALITELEPAK",
    "afdCode": "AFD14",
    "afdName": "AFD. KALITELEPAK",
    "afdKey": "KALITELEPAK"
  },
  {
    "reff": "AFD017K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD01",
    "afdName": "AFD. BESARAN",
    "afdKey": "BESARAN"
  },
  {
    "reff": "AFD027K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD02",
    "afdName": "AFD. REJOSARI",
    "afdKey": "REJOSARI"
  },
  {
    "reff": "AFD037K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD03",
    "afdName": "AFD. KALIPUTIH",
    "afdKey": "KALIPUTIH"
  },
  {
    "reff": "AFD047K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD04",
    "afdName": "AFD. GENTENGAN",
    "afdKey": "GENTENGAN"
  },
  {
    "reff": "AFD057K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD05",
    "afdName": "AFD. KAMPUNG ANYAR",
    "afdKey": "KAMPUNGANYAR"
  },
  {
    "reff": "AFD067K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD06",
    "afdName": "AFD. SEMAMPIR",
    "afdKey": "SEMAMPIR"
  },
  {
    "reff": "AFD077K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD07",
    "afdName": "AFD. PAGER GUNUNG",
    "afdKey": "PAGERGUNUNG"
  },
  {
    "reff": "AFD087K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD08",
    "afdName": "AFD. KAMPUNG BARU",
    "afdKey": "KAMPUNGBARU"
  },
  {
    "reff": "AFD097K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD09",
    "afdName": "AFD. BESARAN KALIREJO",
    "afdKey": "BESARANKALIREJO"
  },
  {
    "reff": "AFD107K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD10",
    "afdName": "AFD. SUMBER URIP",
    "afdKey": "SUMBERURIP"
  },
  {
    "reff": "AFD117K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD11",
    "afdName": "AFD. SIDOMUKTI",
    "afdKey": "SIDOMUKTI"
  },
  {
    "reff": "AFD127K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD12",
    "afdName": "AFD. MUKTISARI",
    "afdKey": "MUKTISARI"
  },
  {
    "reff": "AFD137K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD13",
    "afdName": "AFD. SIDODADI",
    "afdKey": "SIDODADI"
  },
  {
    "reff": "AFD147K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD14",
    "afdName": "AFD. PEGUNDANGAN",
    "afdKey": "PEGUNDANGAN"
  },
  {
    "reff": "AFD157K09",
    "plantCode": "7K09",
    "plantDesc": "KEBUN KALIREJO KENDENG LEMBU",
    "primaryEstate": "KALIREJO",
    "plantKey": "KEBUNKALIREJOKENDENGLEMBU",
    "afdCode": "AFD15",
    "afdName": "AFD. SEKAR BARU",
    "afdKey": "SEKARBARU"
  },
  {
    "reff": "AFD017K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD01",
    "afdName": "AFD. PANCUREJO",
    "afdKey": "PANCUREJO"
  },
  {
    "reff": "AFD027K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD02",
    "afdName": "AFD. GUNUNG SARI",
    "afdKey": "GUNUNGSARI"
  },
  {
    "reff": "AFD037K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD03",
    "afdName": "AFD. TRETES",
    "afdKey": "TRETES"
  },
  {
    "reff": "AFD047K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD04",
    "afdName": "AFD. KAMPUNG TENGAH",
    "afdKey": "KAMPUNGTENGAH"
  },
  {
    "reff": "AFD057K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD05",
    "afdName": "AFD. MULYOSARI",
    "afdKey": "MULYOSARI"
  },
  {
    "reff": "AFD067K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD06",
    "afdName": "AFD. WATULEMPIT",
    "afdKey": "WATULEMPIT"
  },
  {
    "reff": "AFD077K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD07",
    "afdName": "AFD. LEDOKSARI",
    "afdKey": "LEDOKSARI"
  },
  {
    "reff": "AFD087K11",
    "plantCode": "7K11",
    "plantDesc": "KEBUN MALANGSARI",
    "primaryEstate": "MALANGSARI",
    "plantKey": "KEBUNMALANGSARI",
    "afdCode": "AFD08",
    "afdName": "AFD. KAMPUNG RUKUN",
    "afdKey": "KAMPUNGRUKUN"
  },
  {
    "reff": "AFD017K12",
    "plantCode": "7K12",
    "plantDesc": "KEBUN GUNUNG GUMITIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGUMITIR",
    "afdCode": "AFD01",
    "afdName": "AFD. MRAWAN",
    "afdKey": "MRAWAN"
  },
  {
    "reff": "AFD027K12",
    "plantCode": "7K12",
    "plantDesc": "KEBUN GUNUNG GUMITIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGUMITIR",
    "afdCode": "AFD02",
    "afdName": "AFD. SUMBERSARI",
    "afdKey": "SUMBERSARI"
  },
  {
    "reff": "AFD037K12",
    "plantCode": "7K12",
    "plantDesc": "KEBUN GUNUNG GUMITIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGUMITIR",
    "afdCode": "AFD03",
    "afdName": "AFD. TANAH MANIS",
    "afdKey": "TANAHMANIS"
  },
  {
    "reff": "AFD017K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD01",
    "afdName": "AFD. SUMBER CANTING",
    "afdKey": "SUMBERCANTING"
  },
  {
    "reff": "AFD027K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD02",
    "afdName": "AFD. PANCUR",
    "afdKey": "PANCUR"
  },
  {
    "reff": "AFD037K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD03",
    "afdName": "AFD. KENDENG",
    "afdKey": "KENDENG"
  },
  {
    "reff": "AFD047K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD04",
    "afdName": "AFD. MEGASARI",
    "afdKey": "MEGASARI"
  },
  {
    "reff": "AFD057K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD05",
    "afdName": "AFD. ANGKREK",
    "afdKey": "ANGKREK"
  },
  {
    "reff": "AFD067K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD06",
    "afdName": "AFD. KAYUMAS",
    "afdKey": "KAYUMAS"
  },
  {
    "reff": "AFD077K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD07",
    "afdName": "AFD. TAMAN ARUM",
    "afdKey": "TAMANARUM"
  },
  {
    "reff": "AFD087K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD08",
    "afdName": "AFD. TAMAN DADAR",
    "afdKey": "TAMANDADAR"
  },
  {
    "reff": "AFD097K14",
    "plantCode": "7K14",
    "plantDesc": "KEBUN KAYUMAS PANCUR ANGKREK",
    "primaryEstate": "KAYUMAS",
    "plantKey": "KEBUNKAYUMASPANCURANGKREK",
    "afdCode": "AFD09",
    "afdName": "AFD. PLAMPANG",
    "afdKey": "PLAMPANG"
  },
  {
    "reff": "AFD017K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD01",
    "afdName": "AFD. BESARAN",
    "afdKey": "BESARAN"
  },
  {
    "reff": "AFD027K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD02",
    "afdName": "AFD. PLALANGAN",
    "afdKey": "PLALANGAN"
  },
  {
    "reff": "AFD037K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD03",
    "afdName": "AFD. KALISENGON",
    "afdKey": "KALISENGON"
  },
  {
    "reff": "AFD047K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD04",
    "afdName": "AFD. KALIGEDANG",
    "afdKey": "KALIGEDANG"
  },
  {
    "reff": "AFD057K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD05",
    "afdName": "AFD. GIRIMULYO",
    "afdKey": "GIRIMULYO"
  },
  {
    "reff": "AFD067K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD06",
    "afdName": "AFD. SUMBEREJO",
    "afdKey": "SUMBEREJO"
  },
  {
    "reff": "AFD077K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD07",
    "afdName": "AFD. GUNUNG BLAU",
    "afdKey": "GUNUNGBLAU"
  },
  {
    "reff": "AFD087K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD08",
    "afdName": "AFD. WATU CAPIL",
    "afdKey": "WATUCAPIL"
  },
  {
    "reff": "AFD097K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD09",
    "afdName": "AFD. GENDING WALUH",
    "afdKey": "GENDINGWALUH"
  },
  {
    "reff": "AFD107K15",
    "plantCode": "7K15",
    "plantDesc": "KEBUN BLAWAN",
    "primaryEstate": "BLAWAN",
    "plantKey": "KEBUNBLAWAN",
    "afdCode": "AFD10",
    "afdName": "AFD. JAMPIT BLAWAN",
    "afdKey": "JAMPITBLAWAN"
  },
  {
    "reff": "AFD017K17",
    "plantCode": "7K17",
    "plantDesc": "KEBUN SILOSANEN SUMBERTENGAH",
    "primaryEstate": "SILOSANEN",
    "plantKey": "KEBUNSILOSANENSUMBERTENGAH",
    "afdCode": "AFD01",
    "afdName": "AFD. DARUNGAN",
    "afdKey": "DARUNGAN"
  },
  {
    "reff": "AFD027K17",
    "plantCode": "7K17",
    "plantDesc": "KEBUN SILOSANEN SUMBERTENGAH",
    "primaryEstate": "SILOSANEN",
    "plantKey": "KEBUNSILOSANENSUMBERTENGAH",
    "afdCode": "AFD02",
    "afdName": "AFD. PINANG",
    "afdKey": "PINANG"
  },
  {
    "reff": "AFD037K17",
    "plantCode": "7K17",
    "plantDesc": "KEBUN SILOSANEN SUMBERTENGAH",
    "primaryEstate": "SILOSANEN",
    "plantKey": "KEBUNSILOSANENSUMBERTENGAH",
    "afdCode": "AFD03",
    "afdName": "AFD. WRINGIN ANOM",
    "afdKey": "WRINGINANOM"
  },
  {
    "reff": "AFD047K17",
    "plantCode": "7K17",
    "plantDesc": "KEBUN SILOSANEN SUMBERTENGAH",
    "primaryEstate": "SILOSANEN",
    "plantKey": "KEBUNSILOSANENSUMBERTENGAH",
    "afdCode": "AFD04",
    "afdName": "AFD. KAMPONGAN",
    "afdKey": "KAMPONGAN"
  },
  {
    "reff": "AFD057K17",
    "plantCode": "7K17",
    "plantDesc": "KEBUN SILOSANEN SUMBERTENGAH",
    "primaryEstate": "SILOSANEN",
    "plantKey": "KEBUNSILOSANENSUMBERTENGAH",
    "afdCode": "AFD05",
    "afdName": "AFD. SUMBER JAMBE",
    "afdKey": "SUMBERJAMBE"
  },
  {
    "reff": "AFD067K17",
    "plantCode": "7K17",
    "plantDesc": "KEBUN SILOSANEN SUMBERTENGAH",
    "primaryEstate": "SILOSANEN",
    "plantKey": "KEBUNSILOSANENSUMBERTENGAH",
    "afdCode": "AFD06",
    "afdName": "AFD. GUMITIR",
    "afdKey": "GUMITIR"
  },
  {
    "reff": "AFD017K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD01",
    "afdName": "AFD. KALIMAYANG",
    "afdKey": "KALIMAYANG"
  },
  {
    "reff": "AFD027K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD02",
    "afdName": "AFD. BANJIR ONJUR",
    "afdKey": "BANJIRONJUR"
  },
  {
    "reff": "AFD037K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD03",
    "afdName": "AFD. KALIBAJING",
    "afdKey": "KALIBAJING"
  },
  {
    "reff": "AFD047K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD04",
    "afdName": "AFD. CURAH JAMBE",
    "afdKey": "CURAHJAMBE"
  },
  {
    "reff": "AFD057K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD05",
    "afdName": "AFD. WONOJATI",
    "afdKey": "WONOJATI"
  },
  {
    "reff": "AFD067K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD06",
    "afdName": "AFD. SUMBER WARINGIN",
    "afdKey": "SUMBERWARINGIN"
  },
  {
    "reff": "AFD077K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD07",
    "afdName": "AFD. GAMBIRAN",
    "afdKey": "GAMBIRAN"
  },
  {
    "reff": "AFD087K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD08",
    "afdName": "AFD. GUNUNG MAYANG",
    "afdKey": "GUNUNGMAYANG"
  },
  {
    "reff": "AFD097K19",
    "plantCode": "7K19",
    "plantDesc": "KEBUN GLANTANGAN",
    "primaryEstate": "GLANTANGAN",
    "plantKey": "KEBUNGLANTANGAN",
    "afdCode": "AFD09",
    "afdName": "AFD. DAMPAR",
    "afdKey": "DAMPAR"
  },
  {
    "reff": "AFD017K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD01",
    "afdName": "AFD. UTARA KALISANEN",
    "afdKey": "UTARAKALISANEN"
  },
  {
    "reff": "AFD027K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD02",
    "afdName": "AFD. SELATAN KALISANEN",
    "afdKey": "SELATANKALISANEN"
  },
  {
    "reff": "AFD037K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD03",
    "afdName": "AFD. CURAH BERKONG",
    "afdKey": "CURAHBERKONG"
  },
  {
    "reff": "AFD047K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD04",
    "afdName": "AFD. PONDOK SUTO",
    "afdKey": "PONDOKSUTO"
  },
  {
    "reff": "AFD057K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD05",
    "afdName": "AFD. WONO WIRI",
    "afdKey": "WONOWIRI"
  },
  {
    "reff": "AFD067K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD06",
    "afdName": "AFD. BLATER",
    "afdKey": "BLATER"
  },
  {
    "reff": "AFD077K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD07",
    "afdName": "AFD. GUCI PUTIH",
    "afdKey": "GUCIPUTIH"
  },
  {
    "reff": "AFD087K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD08",
    "afdName": "AFD. TRATE",
    "afdKey": "TRATE"
  },
  {
    "reff": "AFD097K20",
    "plantCode": "7K20",
    "plantDesc": "KEBUN KALISANEN KOTTA BLATER",
    "primaryEstate": "KALISANEN",
    "plantKey": "KEBUNKALISANENKOTTABLATER",
    "afdCode": "AFD09",
    "afdName": "AFD. BANJAR AGUNG",
    "afdKey": "BANJARAGUNG"
  },
  {
    "reff": "AFD017K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD01",
    "afdName": "AFD. BAJING ONJUR",
    "afdKey": "BAJINGONJUR"
  },
  {
    "reff": "AFD027K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD02",
    "afdName": "AFD. GLANTANGAN",
    "afdKey": "GLANTANGAN"
  },
  {
    "reff": "AFD037K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD03",
    "afdName": "AFD. PONDOK SELATAN",
    "afdKey": "PONDOKSELATAN"
  },
  {
    "reff": "AFD047K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD04",
    "afdName": "AFD. MRAWAN",
    "afdKey": "MRAWAN"
  },
  {
    "reff": "AFD057K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD05",
    "afdName": "AFD. LENGKONG",
    "afdKey": "LENGKONG"
  },
  {
    "reff": "AFD067K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD06",
    "afdName": "AFD. TALANG",
    "afdKey": "TALANG"
  },
  {
    "reff": "AFD077K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD07",
    "afdName": "AFD. KOTTABLATER",
    "afdKey": "KOTTABLATER"
  },
  {
    "reff": "AFD087K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD08",
    "afdName": "AFD. KARANGNANGKA",
    "afdKey": "KARANGNANGKA"
  },
  {
    "reff": "AFD097K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD09",
    "afdName": "AFD. KLATAKAN",
    "afdKey": "KLATAKAN"
  },
  {
    "reff": "AFD107K22",
    "plantCode": "7K22",
    "plantDesc": "KEBUN MUMBUL",
    "primaryEstate": "MUMBUL",
    "plantKey": "KEBUNMUMBUL",
    "afdCode": "AFD10",
    "afdName": "AFD. SIDOMULYO",
    "afdKey": "SIDOMULYO"
  },
  {
    "reff": "AFD017K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD01",
    "afdName": "AFD. BANJARSARI",
    "afdKey": "BANJARSARI"
  },
  {
    "reff": "AFD027K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD02",
    "afdName": "AFD. KARANG NANGKA",
    "afdKey": "KARANGNANGKA"
  },
  {
    "reff": "AFD037K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD03",
    "afdName": "AFD. ANTOKAN",
    "afdKey": "ANTOKAN"
  },
  {
    "reff": "AFD047K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD04",
    "afdName": "AFD. GERENG REJO",
    "afdKey": "GERENGREJO"
  },
  {
    "reff": "AFD057K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD05",
    "afdName": "AFD. KLATAKAN",
    "afdKey": "KLATAKAN"
  },
  {
    "reff": "AFD067K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD06",
    "afdName": "AFD. SIDOMULYO",
    "afdKey": "SIDOMULYO"
  },
  {
    "reff": "AFD077K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD07",
    "afdName": "AFD. CURAH MANIS",
    "afdKey": "CURAHMANIS"
  },
  {
    "reff": "AFD087K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD08",
    "afdName": "AFD. KEDATON",
    "afdKey": "KEDATON"
  },
  {
    "reff": "AFD097K24",
    "plantCode": "7K24",
    "plantDesc": "KEBUN RENTENG BANJARSARI",
    "primaryEstate": "RENTENG",
    "plantKey": "KEBUNRENTENGBANJARSARI",
    "afdCode": "AFD09",
    "afdName": "AFD. RAYAP",
    "afdKey": "RAYAP"
  },
  {
    "reff": "AFD017K25",
    "plantCode": "7K25",
    "plantDesc": "KEBUN ZEELANDIA",
    "primaryEstate": "ZEELANDIA",
    "plantKey": "KEBUNZEELANDIA",
    "afdCode": "AFD01",
    "afdName": "AFD. LANGSEPAN",
    "afdKey": "LANGSEPAN"
  },
  {
    "reff": "AFD027K25",
    "plantCode": "7K25",
    "plantDesc": "KEBUN ZEELANDIA",
    "primaryEstate": "ZEELANDIA",
    "plantKey": "KEBUNZEELANDIA",
    "afdCode": "AFD02",
    "afdName": "AFD. ZEELANDIA",
    "afdKey": "ZEELANDIA"
  },
  {
    "reff": "AFD037K25",
    "plantCode": "7K25",
    "plantDesc": "KEBUN ZEELANDIA",
    "primaryEstate": "ZEELANDIA",
    "plantKey": "KEBUNZEELANDIA",
    "afdCode": "AFD03",
    "afdName": "AFD. KALISUKO",
    "afdKey": "KALISUKO"
  },
  {
    "reff": "AFD047K25",
    "plantCode": "7K25",
    "plantDesc": "KEBUN ZEELANDIA",
    "primaryEstate": "ZEELANDIA",
    "plantKey": "KEBUNZEELANDIA",
    "afdCode": "AFD04",
    "afdName": "AFD. SUMBER AYU",
    "afdKey": "SUMBERAYU"
  },
  {
    "reff": "AFD057K25",
    "plantCode": "7K25",
    "plantDesc": "KEBUN ZEELANDIA",
    "primaryEstate": "ZEELANDIA",
    "plantKey": "KEBUNZEELANDIA",
    "afdCode": "AFD05",
    "afdName": "AFD. GONDANG",
    "afdKey": "GONDANG"
  },
  {
    "reff": "AFD067K25",
    "plantCode": "7K25",
    "plantDesc": "KEBUN ZEELANDIA",
    "primaryEstate": "ZEELANDIA",
    "plantKey": "KEBUNZEELANDIA",
    "afdCode": "AFD06",
    "afdName": "AFD. SUMBER BULUS",
    "afdKey": "SUMBERBULUS"
  },
  {
    "reff": "AFD017K26",
    "plantCode": "7K26",
    "plantDesc": "KEBUN GUNUNG GAMBIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGAMBIR",
    "afdCode": "AFD01",
    "afdName": "AFD. LAWANG KEDATON",
    "afdKey": "LAWANGKEDATON"
  },
  {
    "reff": "AFD027K26",
    "plantCode": "7K26",
    "plantDesc": "KEBUN GUNUNG GAMBIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGAMBIR",
    "afdCode": "AFD02",
    "afdName": "AFD. GUNUNG GAMBIR",
    "afdKey": "GUNUNGGAMBIR"
  },
  {
    "reff": "AFD037K26",
    "plantCode": "7K26",
    "plantDesc": "KEBUN GUNUNG GAMBIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGAMBIR",
    "afdCode": "AFD03",
    "afdName": "AFD. TANAH MERAH",
    "afdKey": "TANAHMERAH"
  },
  {
    "reff": "AFD047K26",
    "plantCode": "7K26",
    "plantDesc": "KEBUN GUNUNG GAMBIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGAMBIR",
    "afdCode": "AFD04",
    "afdName": "AFD. AENGSONO",
    "afdKey": "AENGSONO"
  },
  {
    "reff": "AFD057K26",
    "plantCode": "7K26",
    "plantDesc": "KEBUN GUNUNG GAMBIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGAMBIR",
    "afdCode": "AFD05",
    "afdName": "AFD. JAMINTORO",
    "afdKey": "JAMINTORO"
  },
  {
    "reff": "AFD067K26",
    "plantCode": "7K26",
    "plantDesc": "KEBUN GUNUNG GAMBIR",
    "primaryEstate": "GUNUNG",
    "plantKey": "KEBUNGUNUNGGAMBIR",
    "afdCode": "AFD06",
    "afdName": "AFD. KARANG ANOM",
    "afdKey": "KARANGANOM"
  },
  {
    "reff": "AFD017K27",
    "plantCode": "7K27",
    "plantDesc": "KEBUN KERTOWONO",
    "primaryEstate": "KERTOWONO",
    "plantKey": "KEBUNKERTOWONO",
    "afdCode": "AFD01",
    "afdName": "AFD. PURING",
    "afdKey": "PURING"
  },
  {
    "reff": "AFD027K27",
    "plantCode": "7K27",
    "plantDesc": "KEBUN KERTOWONO",
    "primaryEstate": "KERTOWONO",
    "plantKey": "KEBUNKERTOWONO",
    "afdCode": "AFD02",
    "afdName": "AFD. KAMAR TENGAH",
    "afdKey": "KAMARTENGAH"
  },
  {
    "reff": "AFD037K27",
    "plantCode": "7K27",
    "plantDesc": "KEBUN KERTOWONO",
    "primaryEstate": "KERTOWONO",
    "plantKey": "KEBUNKERTOWONO",
    "afdCode": "AFD03",
    "afdName": "AFD. KERTOSUKO",
    "afdKey": "KERTOSUKO"
  },
  {
    "reff": "AFD047K27",
    "plantCode": "7K27",
    "plantDesc": "KEBUN KERTOWONO",
    "primaryEstate": "KERTOWONO",
    "plantKey": "KEBUNKERTOWONO",
    "afdCode": "AFD04",
    "afdName": "AFD. BEDENGAN",
    "afdKey": "BEDENGAN"
  },
  {
    "reff": "AFD057K27",
    "plantCode": "7K27",
    "plantDesc": "KEBUN KERTOWONO",
    "primaryEstate": "KERTOWONO",
    "plantKey": "KEBUNKERTOWONO",
    "afdCode": "AFD05",
    "afdName": "AFD. KALI GEDE/WELANG",
    "afdKey": "KALIGEDEWELANG"
  },
  {
    "reff": "AFD017K28",
    "plantCode": "7K28",
    "plantDesc": "KEBUN WONOSARI",
    "primaryEstate": "WONOSARI",
    "plantKey": "KEBUNWONOSARI",
    "afdCode": "AFD01",
    "afdName": "AFD. WONOSARI",
    "afdKey": "WONOSARI"
  },
  {
    "reff": "AFD027K28",
    "plantCode": "7K28",
    "plantDesc": "KEBUN WONOSARI",
    "primaryEstate": "WONOSARI",
    "plantKey": "KEBUNWONOSARI",
    "afdCode": "AFD02",
    "afdName": "AFD. GEBUG LOR",
    "afdKey": "GEBUGLOR"
  },
  {
    "reff": "AFD037K28",
    "plantCode": "7K28",
    "plantDesc": "KEBUN WONOSARI",
    "primaryEstate": "WONOSARI",
    "plantKey": "KEBUNWONOSARI",
    "afdCode": "AFD03",
    "afdName": "AFD. RANDU AGUNG",
    "afdKey": "RANDUAGUNG"
  },
  {
    "reff": "AFD017K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD01",
    "afdName": "AFD. PANCURSARI TIMUR",
    "afdKey": "PANCURSARITIMUR"
  },
  {
    "reff": "AFD027K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD02",
    "afdName": "AFD. PANCURSARI BARAT",
    "afdKey": "PANCURSARIBARAT"
  },
  {
    "reff": "AFD037K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD03",
    "afdName": "AFD. PG/WR KEMBAR",
    "afdKey": "PGWRKEMBAR"
  },
  {
    "reff": "AFD047K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD04",
    "afdName": "AFD. BUMIREJO",
    "afdKey": "BUMIREJO"
  },
  {
    "reff": "AFD057K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD05",
    "afdName": "AFD. GLAGAH ARUM",
    "afdKey": "GLAGAHARUM"
  },
  {
    "reff": "AFD067K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD06",
    "afdName": "AFD. SK/SBR MANGGIS",
    "afdKey": "SKSBRMANGGIS"
  },
  {
    "reff": "AFD077K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD07",
    "afdName": "AFD. PETUNG OMBO",
    "afdKey": "PETUNGOMBO"
  },
  {
    "reff": "AFD087K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD08",
    "afdName": "AFD. SUMBER GESING",
    "afdKey": "SUMBERGESING"
  },
  {
    "reff": "AFD097K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD09",
    "afdName": "AFD. KALIBAKAR",
    "afdKey": "KALIBAKAR"
  },
  {
    "reff": "AFD107K30",
    "plantCode": "7K30",
    "plantDesc": "KEBUN KALIBAKAR PANCURSARI",
    "primaryEstate": "KALIBAKAR",
    "plantKey": "KEBUNKALIBAKARPANCURSARI",
    "afdCode": "AFD10",
    "afdName": "AFD. LEBAKREJO",
    "afdKey": "LEBAKREJO"
  },
  {
    "reff": "AFD017K32",
    "plantCode": "7K32",
    "plantDesc": "KEBUN BANGELAN BANTARAN",
    "primaryEstate": "BANGELAN",
    "plantKey": "KEBUNBANGELANBANTARAN",
    "afdCode": "AFD01",
    "afdName": "AFD. BANTARAN",
    "afdKey": "BANTARAN"
  },
  {
    "reff": "AFD027K32",
    "plantCode": "7K32",
    "plantDesc": "KEBUN BANGELAN BANTARAN",
    "primaryEstate": "BANGELAN",
    "plantKey": "KEBUNBANGELANBANTARAN",
    "afdCode": "AFD02",
    "afdName": "AFD. SIRAH KENCONG",
    "afdKey": "SIRAHKENCONG"
  },
  {
    "reff": "AFD037K32",
    "plantCode": "7K32",
    "plantDesc": "KEBUN BANGELAN BANTARAN",
    "primaryEstate": "BANGELAN",
    "plantKey": "KEBUNBANGELANBANTARAN",
    "afdCode": "AFD03",
    "afdName": "AFD. PENATARAN",
    "afdKey": "PENATARAN"
  },
  {
    "reff": "AFD047K32",
    "plantCode": "7K32",
    "plantDesc": "KEBUN BANGELAN BANTARAN",
    "primaryEstate": "BANGELAN",
    "plantKey": "KEBUNBANGELANBANTARAN",
    "afdCode": "AFD04",
    "afdName": "AFD. BESARAN",
    "afdKey": "BESARAN"
  },
  {
    "reff": "AFD057K32",
    "plantCode": "7K32",
    "plantDesc": "KEBUN BANGELAN BANTARAN",
    "primaryEstate": "BANGELAN",
    "plantKey": "KEBUNBANGELANBANTARAN",
    "afdCode": "AFD05",
    "afdName": "AFD. KAMPUNG BARU",
    "afdKey": "KAMPUNGBARU"
  },
  {
    "reff": "AFD017K33",
    "plantCode": "7K33",
    "plantDesc": "KEBUN NGRANGKAH PAWON",
    "primaryEstate": "NGRANGKAH",
    "plantKey": "KEBUNNGRANGKAHPAWON",
    "afdCode": "AFD01",
    "afdName": "AFD. PAWON PAKELAN",
    "afdKey": "PAWONPAKELAN"
  },
  {
    "reff": "AFD027K33",
    "plantCode": "7K33",
    "plantDesc": "KEBUN NGRANGKAH PAWON",
    "primaryEstate": "NGRANGKAH",
    "plantKey": "KEBUNNGRANGKAHPAWON",
    "afdCode": "AFD02",
    "afdName": "AFD. BADEK",
    "afdKey": "BADEK"
  },
  {
    "reff": "AFD037K33",
    "plantCode": "7K33",
    "plantDesc": "KEBUN NGRANGKAH PAWON",
    "primaryEstate": "NGRANGKAH",
    "plantKey": "KEBUNNGRANGKAHPAWON",
    "afdCode": "AFD03",
    "afdName": "AFD. BABADAN",
    "afdKey": "BABADAN"
  },
  {
    "reff": "AFD047K33",
    "plantCode": "7K33",
    "plantDesc": "KEBUN NGRANGKAH PAWON",
    "primaryEstate": "NGRANGKAH",
    "plantKey": "KEBUNNGRANGKAHPAWON",
    "afdCode": "AFD04",
    "afdName": "AFD. SUMBER GLATIK",
    "afdKey": "SUMBERGLATIK"
  },
  {
    "reff": "AFD057K33",
    "plantCode": "7K33",
    "plantDesc": "KEBUN NGRANGKAH PAWON",
    "primaryEstate": "NGRANGKAH",
    "plantKey": "KEBUNNGRANGKAHPAWON",
    "afdCode": "AFD05",
    "afdName": "AFD. SATAK",
    "afdKey": "SATAK"
  },
  {
    "reff": "AFD067K33",
    "plantCode": "7K33",
    "plantDesc": "KEBUN NGRANGKAH PAWON",
    "primaryEstate": "NGRANGKAH",
    "plantKey": "KEBUNNGRANGKAHPAWON",
    "afdCode": "AFD06",
    "afdName": "AFD. DAMARWULAN",
    "afdKey": "DAMARWULAN"
  },
  {
    "reff": "AFD077K33",
    "plantCode": "7K33",
    "plantDesc": "KEBUN NGRANGKAH PAWON",
    "primaryEstate": "NGRANGKAH",
    "plantKey": "KEBUNNGRANGKAHPAWON",
    "afdCode": "AFD07",
    "afdName": "AFD. SUMBER",
    "afdKey": "SUMBER"
  },
  {
    "reff": "AFD017K34",
    "plantCode": "7K34",
    "plantDesc": "KEBUN TRETES",
    "primaryEstate": "TRETES",
    "plantKey": "KEBUNTRETES",
    "afdCode": "AFD01",
    "afdName": "AFD. TRETES",
    "afdKey": "TRETES"
  },
  {
    "reff": "AFD027K34",
    "plantCode": "7K34",
    "plantDesc": "KEBUN TRETES",
    "primaryEstate": "TRETES",
    "plantKey": "KEBUNTRETES",
    "afdCode": "AFD02",
    "afdName": "AFD. BEGAL",
    "afdKey": "BEGAL"
  }
]
