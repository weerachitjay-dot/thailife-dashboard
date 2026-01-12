
import { supabase } from './supabase';
import { SHEET_CONFIG, SUPABASE_TABLES, SNIPPET_APPEND, SNIPPET_APPENDSENT, SNIPPET_TARGET } from '../utils/constants';
import { parseCSV, processAppendData, processSentData } from '../utils/formatters';

// Helper to fetch CSV text
const fetchSheetData = async (type) => {
    const gid = SHEET_CONFIG.GIDS[type];
    if (!gid) throw new Error(`Unknown sheet type: ${type}`);

    // Try Proxy
    try {
        const res = await fetch(`/api/sheet?gid=${gid}`);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && !contentType.includes("text/html")) {
            return await res.text();
        }
    } catch (e) {
        console.warn(`Proxy fetch failed for ${type}, ignoring`);
    }

    // Fallback to local (Development/Demo)
    try {
        // Map type to filename base
        const filename = type === 'sent' ? 'append_sent' : type; // Handle potential naming diffs if any, but context uses 'sent' key -> 'sent.csv'? 
        // Context uses `fetchData('append')` which loads `/data/append.csv`.
        // Let's stick to base types: append, sent, target, append_time, telesales.

        // Actually context uses `fetchData('sent')` -> `/data/sent.csv`
        const res = await fetch(`/data/${type}.csv`);
        if (res.ok) return await res.text();
    } catch (e) {
        console.warn(`Local fetch failed for ${type}`);
    }

    // Fallback to snippet if nothing else (To prevent total crash, or throw?)
    // For sync, we probably want to throw or return null so we don't sync junk.
    return null;
};

// Mapper functions to transform CSV rows to Supabase Schema
const mapRow = (type, row) => {
    // Row keys depend on parseCSV output (header names)
    // We need to be careful about matching CSV headers to exact object keys.

    switch (type) {
        case 'append':
            // CSV: Day, Product, Ad Name, Impressions, Cost, Leads, Meta_leads
            // DB: day, product, ad_name, impressions, cost, leads, meta_leads
            return {
                day: row.Day,
                product: row.Product,
                ad_name: row['Ad Name'],
                impressions: parseInt(row.Impressions || 0),
                cost: parseFloat(row.Cost || 0),
                leads: parseInt(row.Leads || 0),
                meta_leads: parseInt(row.Meta_leads || 0)
            };
        case 'sent':
            // CSV: Day, Product, Leads_Sent
            // DB: day, product, leads_sent
            return {
                day: row.Day,
                product: row.Product, // Note: This might need normalization if the CSV has 'Product1' etc.
                leads_sent: parseInt(row.Leads_Sent || 0)
            };
        case 'target':
            // CSV: OWNER, TYPE, Product_Target, Target_Lead_Sent, Target_CPL
            // DB: owner, type, product_target, target_lead_sent, target_cpl
            return {
                owner: row.OWNER,
                type: row.TYPE,
                product_target: row.Product_Target,
                target_lead_sent: parseInt(row.Target_Lead_Sent || 0),
                target_cpl: parseFloat(row.Target_CPL || 0)
            };
        case 'append_time':
            // CSV: Day, Time_of_Day, Campaign_Name, Campaign_ID, Ad_Set_Name, Ad_Set_ID, Ad_Name, Ad_ID, Leads, Cost
            // DB: day, time_of_day, campaign_name, campaign_id, ad_set_name, ad_set_id, ad_name, ad_id, leads, cost
            return {
                day: row.Day,
                time_of_day: row.Time_of_Day,
                campaign_name: row.Campaign_Name,
                campaign_id: row.Campaign_ID,
                ad_set_name: row.Ad_Set_Name,
                ad_set_id: row.Ad_Set_ID,
                ad_name: row.Ad_Name,
                ad_id: row.Ad_ID,
                leads: parseInt(row.Leads || 0),
                cost: parseFloat(row.Cost || 0)
            };
        case 'telesales':
            // CSV: Day, Product, Leads_TL (Assumption based on Task boundary/Context)
            // DB: day, product, leads_tl
            return {
                day: row.Day,
                product: row.Product,
                leads_tl: parseInt(row.Leads_TL || 0)
            };
        default:
            return null;
    }
};

export const syncSheetToSupabase = async (type) => {
    console.log(`Starting sync for ${type}...`);

    const csvText = await fetchSheetData(type);
    if (!csvText) throw new Error(`No data found for ${type}`);

    const parsedData = parseCSV(csvText);
    if (!parsedData || parsedData.length === 0) throw new Error(`Empty CSV for ${type}`);

    // Transform
    const rowsToInsert = parsedData.map(row => mapRow(type, row)).filter(r => r);

    // Batch Upsert
    // Supabase limits batch size? Usually 1000s is fine.
    // We need to know which table.
    let tableName = null;
    switch (type) {
        case 'append': tableName = SUPABASE_TABLES.APPEND; break;
        case 'sent': tableName = SUPABASE_TABLES.SENT; break;
        case 'target': tableName = SUPABASE_TABLES.TARGETS; break;
        case 'append_time': tableName = SUPABASE_TABLES.TIME_ANALYSIS; break;
        case 'telesales': tableName = SUPABASE_TABLES.TELESALES; break;
    }

    if (!tableName) throw new Error(`Unknown table for type ${type}`);

    // Batch Processing to avoid Timeouts (Limit ~1000 rows per batch)
    const BATCH_SIZE = 1000;
    let successCount = 0;

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
        const chunk = rowsToInsert.slice(i, i + BATCH_SIZE);
        console.log(`Upserting batch ${i / BATCH_SIZE + 1} of ${Math.ceil(rowsToInsert.length / BATCH_SIZE)}...`);

        const { error } = await supabase
            .from(tableName)
            .upsert(chunk, {
                ignoreDuplicates: false
            });

        if (error) {
            console.error(`Error upserting batch ${i}:`, error);
            throw error;
        }
        successCount += chunk.length;
    }

    return { success: true, count: successCount };
};
