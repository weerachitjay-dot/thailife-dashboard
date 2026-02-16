import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Env Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Product keywords for campaign classification
const PRODUCTS = ['LIFE-EXTRASENIOR-BUPHAKARI', 'LIFE-SENIOR-BONECARE', 'LIFE-SENIOR-MORRADOK'];

// Get last 30 days data
const DAYS_LOOKBACK = 30;
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - DAYS_LOOKBACK);
const startDate = cutoffDate.toISOString().split('T')[0];

async function analyzeProductPerformance() {
    console.log(`\n=== PRODUCT PERFORMANCE ANALYSIS (Last ${DAYS_LOOKBACK} Days) ===\n`);
    console.log(`Analysis Period: ${startDate} to present\n`);

    const productData = {};

    // Fetch all data for the three products
    for (const product of PRODUCTS) {
        console.log(`Fetching data for ${product}...`);

        const { data, error } = await supabase
            .from('sheet_time_analysis')
            .select('*')
            .eq('product', product)
            .gte('day', startDate);

        if (error) {
            console.error(`Error fetching ${product}:`, error);
            continue;
        }

        // Aggregate metrics by product
        const metrics = {
            product: product,
            totalSpend: 0,
            totalLeads: 0,
            totalImpressions: 0,
            records: data.length,
            dailyData: {},
            campaigns: new Set()
        };

        data.forEach(row => {
            metrics.totalSpend += parseFloat(row.cost || 0);
            metrics.totalLeads += parseInt(row.leads || 0);

            // Track campaigns
            if (row.campaign_name) {
                metrics.campaigns.add(row.campaign_name);
            }

            // Aggregate by day for trend analysis
            const day = row.day;
            if (!metrics.dailyData[day]) {
                metrics.dailyData[day] = { spend: 0, leads: 0, records: 0 };
            }
            metrics.dailyData[day].spend += parseFloat(row.cost || 0);
            metrics.dailyData[day].leads += parseInt(row.leads || 0);
            metrics.dailyData[day].records += 1;
        });

        // Calculate derived metrics
        metrics.cpl = metrics.totalLeads > 0 ? metrics.totalSpend / metrics.totalLeads : 0;
        metrics.avgDailySpend = metrics.totalSpend / Object.keys(metrics.dailyData).length;
        metrics.avgDailyLeads = metrics.totalLeads / Object.keys(metrics.dailyData).length;
        metrics.numCampaigns = metrics.campaigns.size;

        // Calculate daily variance for stability
        const dailyCPLs = Object.values(metrics.dailyData)
            .filter(d => d.leads > 0)
            .map(d => d.spend / d.leads);

        if (dailyCPLs.length > 0) {
            const mean = dailyCPLs.reduce((a, b) => a + b, 0) / dailyCPLs.length;
            const variance = dailyCPLs.reduce((sum, cpl) => sum + Math.pow(cpl - mean, 2), 0) / dailyCPLs.length;
            metrics.cplStdDev = Math.sqrt(variance);
            metrics.cplCoeffOfVar = (metrics.cplStdDev / mean) * 100; // CV%
        } else {
            metrics.cplStdDev = 0;
            metrics.cplCoeffOfVar = 0;
        }

        productData[product] = metrics;
    }

    // Now fetch additional metrics from sheet_append for CTR, CPM analysis
    console.log('\nFetching additional metrics from sheet_append...');

    for (const product of PRODUCTS) {
        const { data, error } = await supabase
            .from('sheet_append')
            .select('*')
            .eq('product', product)
            .gte('day', startDate);

        if (error) {
            console.error(`Error fetching append data for ${product}:`, error);
            continue;
        }

        let totalImpressions = 0;
        let totalMetaLeads = 0;

        data.forEach(row => {
            totalImpressions += parseInt(row.impressions || 0);
            totalMetaLeads += parseInt(row.meta_leads || 0);
        });

        if (productData[product]) {
            productData[product].totalImpressions = totalImpressions;
            productData[product].totalMetaLeads = totalMetaLeads;

            // Calculate CPM (Cost Per Mille/Thousand Impressions)
            productData[product].cpm = totalImpressions > 0
                ? (productData[product].totalSpend / totalImpressions) * 1000
                : 0;

            // Meta leads should ideally match, but check discrepancy
            productData[product].leadDiscrepancy = Math.abs(totalMetaLeads - productData[product].totalLeads);
        }
    }

    console.log('\n=== PERFORMANCE SUMMARY ===\n');

    // Sort by CPL (best to worst)
    const sortedProducts = Object.values(productData).sort((a, b) => a.cpl - b.cpl);

    // Print comparison table
    console.log('Product Performance Comparison:');
    console.log('═'.repeat(140));
    console.log(
        'Product'.padEnd(35) +
        'Campaigns'.padEnd(12) +
        'Spend'.padEnd(15) +
        'Leads'.padEnd(10) +
        'CPL'.padEnd(12) +
        'CPM'.padEnd(12) +
        'Impressions'.padEnd(18) +
        'CPL σ'.padEnd(12) +
        'CV%'
    );
    console.log('═'.repeat(140));

    sortedProducts.forEach((p, idx) => {
        const productName = p.product.replace('LIFE-', '');
        console.log(
            productName.padEnd(35) +
            p.numCampaigns.toString().padEnd(12) +
            `฿${p.totalSpend.toFixed(2)}`.padEnd(15) +
            p.totalLeads.toString().padEnd(10) +
            `฿${p.cpl.toFixed(2)}`.padEnd(12) +
            `฿${p.cpm.toFixed(2)}`.padEnd(12) +
            p.totalImpressions.toLocaleString().padEnd(18) +
            `฿${p.cplStdDev.toFixed(2)}`.padEnd(12) +
            `${p.cplCoeffOfVar.toFixed(1)}%`
        );
    });
    console.log('═'.repeat(140));

    // Detailed analysis
    console.log('\n=== DETAILED ANALYSIS ===\n');

    const bestProduct = sortedProducts[0];
    const otherProducts = sortedProducts.slice(1);

    console.log(`✓ Best Performing Product: ${bestProduct.product}`);
    console.log(`  - CPL: ฿${bestProduct.cpl.toFixed(2)}`);
    console.log(`  - Total Spend: ฿${bestProduct.totalSpend.toFixed(2)}`);
    console.log(`  - Total Leads: ${bestProduct.totalLeads}`);
    console.log(`  - Campaigns: ${bestProduct.numCampaigns}`);
    console.log(`  - CPL Stability (CV): ${bestProduct.cplCoeffOfVar.toFixed(1)}%`);

    console.log('\n✗ Underperforming Products:\n');

    otherProducts.forEach((p, idx) => {
        const cplDiff = ((p.cpl - bestProduct.cpl) / bestProduct.cpl) * 100;
        const cpmDiff = ((p.cpm - bestProduct.cpm) / bestProduct.cpm) * 100;

        console.log(`${idx + 1}. ${p.product}`);
        console.log(`   CPL: ฿${p.cpl.toFixed(2)} (+${cplDiff.toFixed(1)}% vs best)`);
        console.log(`   CPM: ฿${p.cpm.toFixed(2)} (${cpmDiff > 0 ? '+' : ''}${cpmDiff.toFixed(1)}% vs best)`);
        console.log(`   Leads: ${p.totalLeads} (${bestProduct.totalLeads - p.totalLeads} fewer than best)`);
        console.log(`   Spend: ฿${p.totalSpend.toFixed(2)}`);
        console.log(`   Campaigns: ${p.numCampaigns}`);
        console.log(`   CPL Stability (CV): ${p.cplCoeffOfVar.toFixed(1)}%`);
        console.log('');
    });

    // Generate report data for markdown
    const reportData = {
        analysisDate: new Date().toISOString().split('T')[0],
        analysisPeriod: `${startDate} to ${new Date().toISOString().split('T')[0]}`,
        daysAnalyzed: DAYS_LOOKBACK,
        bestProduct,
        otherProducts,
        allProducts: sortedProducts
    };

    // Save report data as JSON for the report generator
    fs.writeFileSync(
        path.resolve(process.cwd(), 'performance_analysis_data.json'),
        JSON.stringify(reportData, null, 2)
    );

    console.log('\n✓ Analysis complete! Data saved to performance_analysis_data.json');
    console.log('  Use this data to generate the executive report.\n');

    return reportData;
}

analyzeProductPerformance().catch(console.error);
