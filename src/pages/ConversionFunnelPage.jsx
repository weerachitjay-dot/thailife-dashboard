import React, { useMemo, useState } from 'react';
import { Filter, Calendar } from 'lucide-react';
import { useData } from '../context/DataContext';
import DateRangePicker from '../components/common/DateRangePicker';
import LeadFunnel from '../components/funnel/LeadFunnel';
import DropoffChart from '../components/funnel/DropoffChart';
import ConversionTable from '../components/funnel/ConversionTable';

const ConversionFunnelPage = () => {
    const { appendData, sentData, telesalesData, dateRange, setDateRange } = useData();
    const [productFilter, setProductFilter] = useState('All');

    // 1. Get Unique Products
    const products = useMemo(() => {
        if (!appendData) return ['All'];
        const unique = new Set(appendData.map(d => d.Product).filter(Boolean));
        return ['All', ...Array.from(unique).sort()];
    }, [appendData]);

    // 2. Aggregate Data
    const aggregatedData = useMemo(() => {
        // Filter Helpers
        const isInRange = (dDate) => dDate >= dateRange.start && dDate <= dateRange.end;
        const matchesProduct = (prod) => productFilter === 'All' || prod === productFilter;

        // Map to hold aggregated stats per product
        // Key: Product Name -> { meta, sent, tl }
        const stats = {};

        // Helper to init key
        const initProduct = (prod) => {
            if (!stats[prod]) stats[prod] = { meta: 0, sent: 0, tl: 0 };
        };

        // A. Meta Leads (from appendData)
        (appendData || []).forEach(row => {
            if (isInRange(row.Day) && matchesProduct(row.Product)) {
                initProduct(row.Product);
                stats[row.Product].meta += (parseInt(row.Meta_Leads) || parseInt(row.Leads) || 0); // Prioritize Meta_Leads if available? User context says "Meta Leads"
                // Note: The UI screenshot shows "Meta Leads". In appendData, usually 'Leads' is the main lead count from Meta. 
                // Let's use 'Leads' as per usual mapping which is from Meta ads.
            }
        });

        // B. Sent Leads (from sentData)
        (sentData || []).forEach(row => {
            if (isInRange(row.Day) && matchesProduct(row.Product)) {
                initProduct(row.Product);
                stats[row.Product].sent += (parseInt(row.Leads_Sent) || 0);
            }
        });

        // C. Telesales Leads (from telesalesData)
        (telesalesData || []).forEach(row => {
            // Note: Telesales data has 'Product_Normalized' or 'Product' depending on mapping
            // Let's check both or trust standard 'Product' if normalized
            const p = row.Product_Normalized || row.Product;
            if (isInRange(row.Day) && matchesProduct(p)) {
                initProduct(p);
                stats[p].tl += (parseInt(row.Leads_TL) || 0);
            }
        });

        // Convert Map to Array
        const processedRows = Object.keys(stats).map(prod => {
            const d = stats[prod];
            // Calc Rates
            const screenRate = d.meta > 0 ? ((d.sent / d.meta) * 100).toFixed(1) : 0;
            const tlConvRate = d.sent > 0 ? ((d.tl / d.sent) * 100).toFixed(1) : 0;

            return {
                product: prod,
                meta: d.meta,
                sent: d.sent,
                tl: d.tl,
                screenRate: parseFloat(screenRate),
                tlConvRate: parseFloat(tlConvRate)
            };
        });

        // Calculate Totals for Funnel
        const totalFunnel = processedRows.reduce((acc, row) => ({
            meta: acc.meta + row.meta,
            sent: acc.sent + row.sent,
            tl: acc.tl + row.tl
        }), { meta: 0, sent: 0, tl: 0 });

        return {
            rows: processedRows.sort((a, b) => b.meta - a.meta), // Sort by volume
            total: totalFunnel
        };

    }, [appendData, sentData, telesalesData, dateRange, productFilter]);

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Conversion Funnel</h2>
                    <p className="text-slate-500 text-sm">Track lead quality from Meta to Revenue.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Product Filter */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={productFilter}
                            onChange={(e) => setProductFilter(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer min-w-[120px]"
                        >
                            {products.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <DateRangePicker
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onChange={(s, e) => setDateRange({ start: s, end: e })}
                        />
                    </div>
                </div>
            </div>

            {/* Top Section: Funnel & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[450px]">
                <LeadFunnel data={aggregatedData.total} />
                <DropoffChart data={aggregatedData.rows} />
            </div>

            {/* Bottom Section: Table */}
            <ConversionTable data={aggregatedData.rows} />

        </div>
    );
};

export default ConversionFunnelPage;
