
import React, { useState, useEffect } from 'react';
import { Facebook, CheckCircle, AlertCircle } from 'lucide-react';
import { initFacebookSdk, loginWithFacebook, getLoginStatus } from '../../lib/facebook';
import { supabase } from '../../lib/supabase';
import { SUPABASE_TABLES } from '../../utils/constants';

const FacebookLogin = () => {
    const [status, setStatus] = useState('loading'); // loading, connected, disconnected, error
    const [tokenData, setTokenData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                await initFacebookSdk();
                const response = await getLoginStatus();

                if (response.status === 'connected') {
                    // Check if we have this token in Supabase
                    const { data, error } = await supabase
                        .from(SUPABASE_TABLES.AUTH)
                        .select('*')
                        .eq('user_id', response.authResponse.userID)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (data) {
                        setTokenData(data);
                        setStatus('connected');
                    } else {
                        // Connected in FB but not saved? Odd, but let's treat as connected but needs save
                        setStatus('connected_unsaved');
                    }
                } else {
                    setStatus('disconnected');
                }
            } catch (err) {
                console.error("FB Init/Status Error:", err);
                setStatus('error');
            }
        };

        checkStatus();
    }, []);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const authResponse = await loginWithFacebook();
            console.log("FB Login Success:", authResponse);

            // Save to Supabase (use insert, not upsert - no unique constraint on user_id)
            const { error } = await supabase
                .from(SUPABASE_TABLES.AUTH)
                .insert({
                    access_token: authResponse.accessToken,
                    token_type: 'long-lived',
                    user_id: authResponse.userID,
                    expires_at: new Date(Date.now() + authResponse.expiresIn * 1000).toISOString(),
                    data_scope: authResponse.grantedScopes
                });

            if (error) throw error;

            setStatus('connected');
            // Refresh data
            const { data } = await supabase
                .from(SUPABASE_TABLES.AUTH)
                .select('*')
                .eq('user_id', authResponse.userID)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            setTokenData(data);

        } catch (err) {
            console.error("Login/Save Error:", err);
            setStatus('error');
            alert("Login failed: " + (err.message || err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 rounded-2xl flex flex-col items-start gap-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <Facebook className="w-5 h-5 text-blue-600" />
                Facebook Integration
            </h3>

            <div className="flex items-center gap-4 w-full">
                <button
                    onClick={handleLogin}
                    disabled={status === 'connected' || loading}
                    className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${status === 'connected'
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                >
                    {loading ? 'Connecting...' : status === 'connected' ? 'Connected' : 'Connect Facebook'}
                    {status === 'connected' && <CheckCircle className="w-4 h-4" />}
                </button>

                {status === 'connected' && tokenData && (
                    <div className="text-xs text-slate-500">
                        <p>User ID: {tokenData.user_id}</p>
                        <p>Expires: {new Date(tokenData.expires_at).toLocaleDateString()}</p>
                    </div>
                )}

                {status === 'error' && (
                    <span className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Connection Failed
                    </span>
                )}
            </div>
        </div>
    );
};

export default FacebookLogin;
