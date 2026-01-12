
import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SUPABASE_TABLES } from '../../utils/constants';

const FacebookLogin = () => {
    const [token, setToken] = useState('');
    const [savedToken, setSavedToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Load existing token from Supabase
        const loadToken = async () => {
            const { data } = await supabase
                .from(SUPABASE_TABLES.AUTH)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setSavedToken(data);
                setToken(data.access_token || '');
            }
        };
        loadToken();
    }, []);

    const handleSave = async () => {
        if (!token.trim()) {
            setMessage('กรุณากรอก Token');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from(SUPABASE_TABLES.AUTH)
                .insert({
                    access_token: token.trim(),
                    token_type: 'manual',
                    user_id: 'manual_entry',
                    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
                });

            if (error) throw error;

            setMessage('บันทึก Token สำเร็จ ✅');
            setSavedToken({ access_token: token.trim() });
        } catch (err) {
            setMessage('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        setLoading(true);
        try {
            await supabase.from(SUPABASE_TABLES.AUTH).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            setToken('');
            setSavedToken(null);
            setMessage('ลบ Token สำเร็จ');
        } catch (err) {
            setMessage('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Facebook Access Token
            </h3>

            <div className="space-y-3">
                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your Access Token here..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />

                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-2 hover:bg-blue-700 transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Token'}
                    </button>

                    {savedToken && (
                        <button
                            onClick={handleClear}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-red-100 text-red-600 font-semibold flex items-center gap-2 hover:bg-red-200 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                </div>

                {savedToken && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Token saved: {savedToken.access_token?.substring(0, 20)}...
                    </div>
                )}

                {message && (
                    <p className="text-sm text-slate-600">{message}</p>
                )}
            </div>

            <p className="text-xs text-slate-400">
                วิธีหา Token: ไปที่ Facebook Graph API Explorer → Generate Access Token → Copy มาวางที่นี่
            </p>
        </div>
    );
};

export default FacebookLogin;
