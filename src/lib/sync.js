
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
    // Helper to find value case-insensitively or with variations
    const getVal = (keys) => {
        for (const k of keys) {
            if (row[k] !== undefined) return row[k];
        }
        return undefined;
    };

    switch (type) {
        case 'append':
            // CSV Columns (Google Sheet): campaign_name, Day, Ad_Set_Name, Ad_Name, Reach, Impressions, Clicks, Website_Leads, Cost, Meta_Leads, Leads, Messaging_Conversations_Started
            // DB: campaign_name, day, ad_set_name, ad_name, reach, impressions, clicks, website_leads, cost, meta_leads, leads, messaging_conversations_started, product, row_hash

            // Handle both snake_case and camelCase variants
            const campaignName = getVal(['campaign_name', 'Campaign_Name', 'CampaignName', 'Campaign Name']);
            const day = getVal(['Day', 'day']);
            const adSetName = getVal(['Ad_Set_Name', 'Ad Set Name', 'AdSetName', 'ad_set_name']);
            const adName = getVal(['Ad_Name', 'Ad Name', 'AdName', 'ad_name']);
            const reach = parseInt(getVal(['Reach', 'reach']) || 0);
            const impressions = parseInt(getVal(['Impressions', 'impressions']) || 0);
            const clicks = parseInt(getVal(['Clicks', 'clicks']) || 0);
            const websiteLeads = parseInt(getVal(['Website_Leads', 'Website Leads', 'WebsiteLeads', 'website_leads']) || 0);
            const cost = parseFloat(getVal(['Cost', 'cost']) || 0);
            const metaLeads = parseInt(getVal(['Meta_Leads', 'Meta Leads', 'MetaLeads', 'meta_leads']) || 0);
            const leads = parseInt(getVal(['Leads', 'leads']) || 0);
            const messagingConversations = parseInt(getVal(['Messaging_Conversations_Started', 'MessagingConversationsStarted', 'messaging_conversations_started']) || 0);

            // Derive Product from Campaign Name if not explicit
            const product = getVal(['Product', 'product', 'Product_Normalized']) || '';

            // Generate unique row_hash from ALL columns to prevent aggregation
            const rowHash = `${day}|${campaignName}|${adSetName}|${adName}|${reach}|${impressions}|${clicks}|${websiteLeads}|${cost}|${metaLeads}|${leads}|${messagingConversations}`;

            return {
                campaign_name: campaignName,
                day,
                ad_set_name: adSetName,
                ad_name: adName,
                reach,
                impressions,
                clicks,
                website_leads: websiteLeads,
                cost,
                meta_leads: metaLeads,
                leads,
                messaging_conversations_started: messagingConversations,
                product,
                row_hash: rowHash
            };
        case 'sent':
            // CSV: Day, Product, Leads_Sent
            // DB: day, product, leads_sent
            return {
                day: getVal(['Day', 'day']),
                product: getVal(['Product', 'product', 'Product_Normalized']), // Note: This might need normalization if the CSV has 'Product1' etc.
                leads_sent: parseInt(getVal(['Leads_Sent', 'leads_sent', 'Leads Sent']) || 0)
            };
        case 'target':
            // CSV: OWNER, TYPE, Product_Target, Target_Lead_Sent, Target_CPL
            // DB: owner, type, product_target, target_lead_sent, target_cpl
            return {
                owner: getVal(['OWNER', 'Owner', 'owner']),
                type: getVal(['TYPE', 'Type', 'type']),
                product_target: getVal(['Product_Target', 'Product Target', 'product_target']),
                target_lead_sent: parseInt(getVal(['Target_Lead_Sent', 'Target Lead Sent']) || 0),
                target_cpl: parseFloat(getVal(['Target_CPL', 'Target CPL']) || 0)
            };
        case 'append_time':
            // CSV: Day, Time_of_Day, Campaign_Name, Campaign_ID, Ad_Set_Name, Ad_Set_ID, Ad_Name, Ad_ID, Leads, Cost
            // DB: day, time_of_day, campaign_name, campaign_id, ad_set_name, ad_set_id, ad_name, ad_id, leads, cost
            return {
                day: getVal(['Day', 'day']),
                product: getVal(['Product', 'product', 'Product_Normalized']),
                time_of_day: getVal(['Time', 'time', 'Time_of_Day', 'time_of_day']),
                campaign_name: getVal(['Campaign_Name', 'campaign_name', 'Campaign Name']),
                campaign_id: getVal(['Campaign_ID', 'campaign_id', 'Campaign ID']),
                ad_set_name: getVal(['Ad_Set_Name', 'ad_set_name']),
                ad_set_id: getVal(['Ad_Set_ID', 'ad_set_id', 'Ad Set ID']),
                ad_name: getVal(['Ad_Name', 'ad_name', 'Ad Name']),
                // Fallback: If Ad ID is missing, use COMPOSITE Key (Campaign|AdSet|AdName) to ensure uniqueness
                // Must handle keys with spaces explicitly here as getVal relies on strictly passed keys
                ad_id: getVal(['Ad_ID', 'ad_id', 'Ad ID']) || `${getVal(['Campaign_Name', 'campaign_name', 'Campaign Name']) || ''}|${getVal(['Ad_Set_Name', 'ad_set_name', 'Ad Set Name']) || ''}|${getVal(['Ad_Name', 'ad_name', 'Ad Name']) || ''}`,
                leads: parseInt(getVal(['Leads', 'leads']) || 0),
                cost: parseFloat(getVal(['Cost', 'cost']) || 0)
            };
        case 'telesales':
            // CSV: Day, Product, Leads_TL (Assumption based on Task boundary/Context)
            // DB: day, product, leads_tl
            return {
                day: getVal(['Day', 'day']),
                product: getVal(['Product', 'product']),
                leads_tl: parseInt(getVal(['Leads_TL', 'leads_tl']) || 0)
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

    // Fetch Product Mappings
    let mappings = [];
    try {
        const { data: mappingData, error: mappingError } = await supabase
            .from('product_mappings')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (mappingData) mappings = mappingData;
    } catch (e) {
        console.warn('Failed to fetch product mappings for sync', e);
    }

    // Transform & Enrich
    // We need to enrich specific types that require Product derivation (append, sent, append_time)
    let enrichedData = parsedData;
    if (type === 'append' || type === 'append_time') {
        enrichedData = processAppendData(parsedData, mappings);
    } else if (type === 'sent') {
        enrichedData = processSentData(parsedData, mappings);
    }

    // Map to DB Schema
    const rowsToInsert = enrichedData.map(row => mapRow(type, row)).filter(r => r);

    if (rowsToInsert.length > 0) {
        console.log('DEBUG: First Row Enriched:', enrichedData[0]);
        console.log('DEBUG: First Row mapped:', rowsToInsert[0]);
    }

    // Batch Upsert
    // Supabase limits batch size? Usually 1000s is fine.
    // We need to know which table and conflict columns.
    let tableName = null;
    let conflictColumns = null;

    switch (type) {
        case 'append':
            tableName = SUPABASE_TABLES.APPEND;
            conflictColumns = 'row_hash'; // Changed: Use row_hash for unique row identification
            break;
        case 'sent':
            tableName = SUPABASE_TABLES.SENT;
            conflictColumns = 'day,product';
            break;
        case 'target':
            tableName = SUPABASE_TABLES.TARGETS;
            conflictColumns = 'product_target';
            break;
        case 'append_time':
            tableName = SUPABASE_TABLES.TIME_ANALYSIS;
            conflictColumns = 'day,time_of_day,ad_id';
            break;
        case 'telesales':
            tableName = SUPABASE_TABLES.TELESALES;
            conflictColumns = 'day,product';
            break;
    }

    if (!tableName) throw new Error(`Unknown table for type ${type}`);

    // Deduplicate rows based on conflict columns to prevent intra-batch conflicts
    // AND Aggregate metrics for rows that share the same key (prevent data loss from granular source)
    const uniqueRowsMap = new Map();

    rowsToInsert.forEach(row => {
        let key = '';
        if (type === 'append') key = row.row_hash; // Use row_hash for unique identification
        else if (type === 'sent') key = `${row.day}|${row.product}`;
        else if (type === 'target') key = `${row.product_target}`;
        else if (type === 'append_time') key = `${row.day}|${row.time_of_day}|${row.ad_id}`;
        else if (type === 'telesales') key = `${row.day}|${row.product}`;

        // Skip if critical key is missing
        if (type === 'append' && !row.product) return; // Example safety

        if (uniqueRowsMap.has(key)) {
            // Aggregate
            const existing = uniqueRowsMap.get(key);

            if (type === 'append') {
                existing.impressions += row.impressions || 0;
                existing.cost += row.cost || 0;
                existing.leads += row.leads || 0;
                existing.meta_leads += row.meta_leads || 0;
            } else if (type === 'sent') {
                existing.leads_sent += row.leads_sent || 0;
            } else if (type === 'append_time') {
                existing.leads += row.leads || 0;
                existing.cost += row.cost || 0;
            } else if (type === 'telesales') {
                existing.leads_tl += row.leads_tl || 0;
            }
            // For targets, we overwrite (assume latest config is truth)
            if (type === 'target') {
                uniqueRowsMap.set(key, row);
            }
        } else {
            uniqueRowsMap.set(key, row);
        }
    });

    // Formatting for decimals (cost) to avoid floating point weirdness?
    // JavaScript numbers are floats. Maybe round to 2 decimals for cost?
    if (type === 'append' || type === 'append_time') {
        uniqueRowsMap.forEach(row => {
            if (row.cost) row.cost = parseFloat(row.cost.toFixed(2));
        });
    }

    // Log deduplication stats
    console.log(`Aggregation: ${rowsToInsert.length} -> ${uniqueRowsMap.size} rows`);
    const uniqueRows = Array.from(uniqueRowsMap.values());

    // Batch Processing to avoid Timeouts (Limit ~1000 rows per batch)
    const BATCH_SIZE = 1000;
    let successCount = 0;

    for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
        const chunk = uniqueRows.slice(i, i + BATCH_SIZE);
        console.log(`Upserting batch ${i / BATCH_SIZE + 1} of ${Math.ceil(uniqueRows.length / BATCH_SIZE)}...`);

        const { error } = await supabase
            .from(tableName)
            .upsert(chunk, {
                ignoreDuplicates: true, // Changed: Skip duplicates instead of overwriting
                onConflict: conflictColumns
            });

        if (error) {
            console.error(`Error upserting batch ${i}:`, error);
            throw error;
        }
        successCount += chunk.length;
    }

    return { success: true, count: successCount };
};
