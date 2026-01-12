import React, { createContext, useContext, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { SHEET_CONFIG, SUPABASE_TABLES, SNIPPET_APPEND, SNIPPET_APPENDSENT, SNIPPET_TARGET, SNIPPET_APPEND_TIME } from '../utils/constants';
import { parseCSV, processAppendData, processSentData, normalizeProduct } from '../utils/formatters';



const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [dataSource, setDataSource] = useState('Loading...');
    const [rawData, setRawData] = useState({ append: [], sent: [], target: [], appendTime: [], telesales: [] });
    const [appendData, setAppendData] = useState([]);
    const [sentData, setSentData] = useState([]);
    const [targetData, setTargetData] = useState([]);
    const [appendTimeData, setAppendTimeData] = useState([]);
    const [telesalesData, setTelesalesData] = useState([]);

    const [productMappings, setProductMappings] = useState([]);

    // Default to TODAY's date
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const [dateRange, setDateRange] = useState({ start: today, end: today });
    const [filters, setFilters] = useState({
        owner: 'All',
        type: 'All',
        product: 'All'
    });

    // Campaign Config - default to today (will be updated after data loads)
    const [campaignConfig, setCampaignConfig] = useState({ start: today, end: today });

    useEffect(() => {
        const loadDefaultData = async () => {
            try {
                // Fetch Product Mappings First
                let mappings = [];
                if (supabase) {
                    try {
                        const { data: mappingData } = await supabase
                            .from('product_mappings')
                            .select('*')
                            .eq('is_active', true)
                            .order('priority', { ascending: false });
                        if (mappingData) {
                            mappings = mappingData;
                            setProductMappings(mappings);
                        }
                    } catch (e) { console.warn('Mappings load failed', e); }
                }

                const fetchData = async (baseName) => {
                    const gid = SHEET_CONFIG.GIDS[baseName];

                    // 1. Try Google Sheet Proxy
                    if (gid && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
                        try {
                            const apiRes = await fetch(`/api/sheet?gid=${gid}`);
                            const contentType = apiRes.headers.get("content-type");
                            if (apiRes.ok && contentType && !contentType.includes("text/html")) {
                                setDataSource('Online (Google Sheets)');
                                return { text: await apiRes.text(), type: 'api-csv' };
                            }
                        } catch (e) {
                            console.log('API fetch failed, fallback to local');
                        }
                    }

                    // 2. Try XLSX Local
                    try {
                        const xlsxRes = await fetch(`/data/${baseName}.xlsx`);
                        if (xlsxRes.ok) {
                            const buffer = await xlsxRes.arrayBuffer();
                            const workbook = XLSX.read(buffer, { type: 'array' });
                            const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
                            setDataSource((prev) => prev.includes('Online') ? prev : 'Local XLSX');
                            return { text: csvText, type: 'xlsx' };
                        }
                    } catch (e) { }

                    // 3. Try CSV Local
                    try {
                        const csvRes = await fetch(`/data/${baseName}.csv`);
                        if (csvRes.ok) {
                            setDataSource((prev) => prev.includes('Online') ? prev : 'Local CSV');
                            return { text: await csvRes.text(), type: 'csv' };
                        }
                    } catch (e) { }

                    return null;
                };

                const fetchSupabaseData = async (tableKey) => {
                    const tableName = SUPABASE_TABLES[tableKey];
                    if (!tableName) return null;
                    if (!supabase) return null;

                    try {
                        // Fetch ALL rows using pagination (Supabase limits to 1000 per request)
                        let allData = [];
                        let from = 0;
                        const batchSize = 1000;
                        let hasMore = true;

                        while (hasMore) {
                            const { data, error } = await supabase
                                .from(tableName)
                                .select('*')
                                .range(from, from + batchSize - 1);

                            if (error) {
                                console.warn('Supabase fetch failed:', error.message);
                                break;
                            }

                            if (data && data.length > 0) {
                                allData = [...allData, ...data];
                                from += batchSize;
                                hasMore = data.length === batchSize;
                            } else {
                                hasMore = false;
                            }
                        }

                        console.log(`DEBUG: Fetched ${allData.length} total rows from ${tableName}`);
                        if (allData.length > 0) return { data: allData, type: 'supabase' };
                    } catch (e) {
                        console.warn('Supabase connection failed:', e);
                    }
                    return null;
                };

                // Helper to extract data (CSV Text OR Array objects)
                // Defined BEFORE usage to prevent ReferenceError (TDZ)
                const extractData = (res, snippet) => {
                    if (res?.type === 'supabase') return { data: res.data, isSupabase: true };
                    return { data: parseCSV(res ? res.text : snippet), isSupabase: false };
                };

                const fetchWithSupabasePriority = async (type, tableKey) => {
                    // 1. Try Supabase
                    const sb = await fetchSupabaseData(tableKey);
                    if (sb) return sb; // { data: [...], type: 'supabase' }

                    // 2. Fallback to Helper
                    return await fetchData(type);
                };

                const [appendRes, sentRes, targetRes, appendTimeRes, telesalesRes] = await Promise.all([
                    fetchWithSupabasePriority('append', 'APPEND'),
                    fetchWithSupabasePriority('sent', 'SENT'),
                    fetchWithSupabasePriority('target', 'TARGETS'),
                    fetchWithSupabasePriority('append_time', 'TIME_ANALYSIS'),
                    fetchWithSupabasePriority('telesales', 'TELESALES')
                ]);

                const appendObj = extractData(appendRes, SNIPPET_APPEND);
                const sentObj = extractData(sentRes, SNIPPET_APPENDSENT);
                const targetObj = extractData(targetRes, SNIPPET_TARGET);
                const appendTimeObj = extractData(appendTimeRes, SNIPPET_APPEND_TIME);
                const telesalesObj = extractData(telesalesRes, ''); // No snippet for telesales?

                // Normalize Supabase snake_case to expected CamelCase/UPPER keys
                // Sent: day -> Day, product -> Product, leads_sent -> Leads_Sent
                const normalizeSentRow = (row) => ({
                    ...row,
                    Day: row.Day || row.day,
                    Product: row.Product || row.product,
                    Leads_Sent: parseInt(row.Leads_Sent ?? row.leads_sent ?? 0)
                });

                // Targets: owner -> OWNER, type -> TYPE, product_target -> Product_Target, target_lead_sent -> Target_Lead_Sent
                const normalizeTargetRow = (row) => ({
                    ...row,
                    OWNER: row.OWNER || row.owner,
                    TYPE: row.TYPE || row.type,
                    Product_Target: row.Product_Target || row.product_target,
                    Target_Lead_Sent: parseInt(row.Target_Lead_Sent ?? row.target_lead_sent ?? 0),
                    Target_CPL: parseFloat(row.Target_CPL ?? row.target_cpl ?? 0),
                    Target_SellPrice: parseFloat(row.Target_SellPrice ?? row.target_sellprice ?? row.target_sell_price ?? 0)
                });

                const parsedAppend = appendObj.data;
                const parsedSent = Array.isArray(sentObj.data) ? sentObj.data.map(normalizeSentRow) : [];
                const parsedTarget = Array.isArray(targetObj.data) ? targetObj.data.map(normalizeTargetRow) : [];
                const parsedAppendTime = appendTimeObj.data;
                const parsedTelesales = telesalesObj.data || [];

                if (appendObj.isSupabase || sentObj.isSupabase || targetObj.isSupabase || appendTimeObj.isSupabase) {
                    setDataSource('Supabase');
                } else if (!appendRes && !sentRes && !targetRes) {
                    setDataSource('Demo Data (Snippets)');
                } else {
                    setDataSource('Google Sheets / Local');
                }

                setRawData({ append: parsedAppend, sent: parsedSent, target: parsedTarget, appendTime: parsedAppendTime, telesales: parsedTelesales });

                const processedAppend = processAppendData(parsedAppend, mappings);
                const processedAppendTime = processAppendData(parsedAppendTime, mappings);

                // DEBUG: Log append data to see if Cost is present
                console.log('DEBUG: =====  APPEND DATA TRACE =====');
                console.log('DEBUG: appendRes type:', appendRes?.type);
                console.log('DEBUG: appendRes.data length:', appendRes?.data?.length || 0);
                console.log('DEBUG: appendRes.data[0] RAW:', appendRes?.data?.[0]);
                console.log('DEBUG: parsedAppend length:', parsedAppend?.length || 0);
                console.log('DEBUG: parsedAppend[0]:', parsedAppend?.[0]);
                console.log('DEBUG: processedAppend length:', processedAppend?.length || 0);
                console.log('DEBUG: processedAppend[0]:', processedAppend?.[0]);
                console.log('DEBUG: processedAppend[0].Day:', processedAppend?.[0]?.Day);
                console.log('DEBUG: processedAppend[0].Cost:', processedAppend?.[0]?.Cost);
                console.log('DEBUG: ===============================');

                // Process Telesales (Use direct normalizer)
                // const processedTelesales = parsedTelesales.map(row => ({
                //     ...row,
                //     // Try robust product lookup
                //     Product_Normalized: normalizeProduct(row.Product || row.product || row.Product_Normalized, mappings)
                // }));
                // Process Telesales (Normalize snake_case to CamelCase)
                const processedTelesales = Array.isArray(parsedTelesales) ? parsedTelesales.map(row => ({
                    ...row,
                    Day: row.Day || row.day,
                    Product: row.Product || row.product,
                    Product_Normalized: normalizeProduct(row.Product || row.product || row.Product_Normalized, mappings),
                    Leads_TL: parseInt(row.Leads_TL ?? row.leads_tl ?? 0)
                })) : [];

                console.log('DEBUG: telesalesData count:', processedTelesales?.length || 0);
                console.log('DEBUG: telesalesData sample:', processedTelesales?.[0]);

                setAppendData(processedAppend);
                setAppendTimeData(processedAppendTime);
                setTelesalesData(processedTelesales); // Fixed: Use processedTelesales instead of parsedTelesales

                // DEBUG: Comprehensive logging
                console.log('DEBUG: ===== DATA LOADING COMPLETE =====');
                console.log('DEBUG: appendRes type:', appendRes?.type);
                console.log('DEBUG: appendRes count:', appendRes?.data?.length || 0);
                console.log('DEBUG: processedAppend count:', processedAppend?.length || 0);
                console.log('DEBUG: processedAppend sample:', processedAppend?.[0]);
                console.log('DEBUG: parsedSent count:', parsedSent?.length || 0);
                console.log('DEBUG: parsedTarget count:', parsedTarget?.length || 0);

                // Auto-set Date Range (Union of both datasets)
                const appendDates = processedAppend.map(d => d.Day).filter(Boolean);
                const timeDates = processedAppendTime.map(d => d.Day).filter(Boolean);
                const allDates = [...new Set([...appendDates, ...timeDates])].sort();

                console.log('DEBUG: appendDates count:', appendDates.length);
                console.log('DEBUG: All unique Dates:', allDates.slice(0, 5), '...', allDates.length, 'total');

                if (allDates.length) {
                    // Auto-set dateRange to LAST DATE in data (so user sees data immediately)
                    const latestDate = allDates[allDates.length - 1];
                    console.log('DEBUG: Setting dateRange to latest date:', latestDate);
                    setDateRange({ start: latestDate, end: latestDate });
                    setCampaignConfig(prev => ({ ...prev, start: allDates[0], end: latestDate }));
                } else {
                    console.warn('DEBUG: No dates found! Check if Day field is being mapped correctly.');
                }

                setSentData(processSentData(parsedSent, mappings));
                setTargetData(parsedTarget);

            } catch (err) {
                console.error("Error loading data:", err);
                setDataSource('Error Loading Data');
            }
        };

        loadDefaultData();
    }, []);

    const handleFileUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        // Helper to process content
        const processContent = (csvText) => {
            const parsed = parseCSV(csvText);
            if (type === 'append') {
                const processed = processAppendData(parsed, productMappings);
                setAppendData(processed);
                setRawData(prev => ({ ...prev, append: parsed }));

                // Auto-update Date Range on upload
                const dates = processed.map(d => d.Day).filter(Boolean).sort();
                if (dates.length) {
                    setDateRange({ start: dates[0], end: dates[dates.length - 1] });
                }

            } else if (type === 'sent') {
                setSentData(processSentData(parsed, productMappings));
                setRawData(prev => ({ ...prev, sent: parsed }));
            } else if (type === 'target') {
                setTargetData(parsed);
                setRawData(prev => ({ ...prev, target: parsed }));
            } else if (type === 'append_time') {
                setAppendTimeData(processAppendData(parsed, productMappings));
                setRawData(prev => ({ ...prev, appendTime: parsed }));
            }
            setDataSource('Manual Upload');
        };

        reader.onload = (evt) => {
            const content = evt.target.result;
            if (file.name.endsWith('.xlsx')) {
                const workbook = XLSX.read(content, { type: 'binary' });
                const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
                processContent(csvText);
            } else {
                processContent(content);
            }
        };

        if (file.name.endsWith('.xlsx')) {
            reader.readAsBinaryString(file);
        } else {
            reader.readAsText(file);
        }
    };

    return (
        <DataContext.Provider value={{
            dataSource,
            rawData,
            appendData,
            sentData,
            targetData,
            telesalesData,
            appendTimeData, // ADDED: Was missing, causing Time Analysis to not receive data
            productMappings, // Expose mappings
            campaignConfig,
            setCampaignConfig, // Allow updating config
            handleFileUpload,
            filters, setFilters,
            dateRange, setDateRange
        }}>
            {children}
        </DataContext.Provider>
    );
};
