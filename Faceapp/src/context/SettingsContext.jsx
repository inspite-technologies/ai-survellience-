import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Default settings
const defaultSettings = {
    companyName: 'Tech Solutions Inc.',
    companyEmail: 'contact@techsolutions.com',
    companyPhone: '+1 555-0123',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    currency: 'USD'
};

// Currency symbols
const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$'
};

// Create context
const SettingsContext = createContext(null);

// Settings Provider
export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);

    // Fetch settings from backend
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${API_URL}/settings`);
            if (response.data.success && response.data.settings) {
                const s = response.data.settings;
                // Check if HR general settings exist
                if (s['hr.general']) {
                    const hrSettings = JSON.parse(s['hr.general']);
                    setSettings(prev => ({ ...prev, ...hrSettings }));
                }

                // Load Attendance settings
                if (s['hr.attendance']) {
                    const attendanceParams = JSON.parse(s['hr.attendance']);
                    setSettings(prev => ({ ...prev, ...attendanceParams }));
                }

                // Load Leave settings
                if (s['hr.leave']) {
                    const leaveParams = JSON.parse(s['hr.leave']);
                    setSettings(prev => ({ ...prev, ...leaveParams }));
                }
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    };

    // Update settings
    const updateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    // Refresh settings from backend
    const refreshSettings = () => {
        fetchSettings();
    };

    // Format date according to settings
    const formatDate = (date, customFormat = null) => {
        if (!date) return '';
        const d = new Date(date);
        const format = customFormat || settings.dateFormat;

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        switch (format) {
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD/YYYY':
            default:
                return `${month}/${day}/${year}`;
        }
    };

    // Format time according to settings
    const formatTime = (date, customFormat = null) => {
        if (!date) return '';
        const d = new Date(date);
        const format = customFormat || settings.timeFormat;

        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');

        if (format === '12h') {
            const period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            return `${hours}:${minutes} ${period}`;
        } else {
            return `${String(hours).padStart(2, '0')}:${minutes}`;
        }
    };

    // Format date and time together
    const formatDateTime = (date) => {
        if (!date) return '';
        return `${formatDate(date)} ${formatTime(date)}`;
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '';
        // ✅ DYNAMIC: Use symbol based on settings (e.g., ₹ for INR)
        const symbol = currencySymbols[settings.currency] || settings.currency;
        return `${symbol}${Number(amount).toLocaleString()}`;
    };

    // Get timezone display name
    const getTimezoneDisplayName = () => {
        const timezoneNames = {
            'America/New_York': 'Eastern Time (ET)',
            'America/Chicago': 'Central Time (CT)',
            'America/Los_Angeles': 'Pacific Time (PT)',
            'Europe/London': 'London (GMT)',
            'Europe/Paris': 'Paris (CET)',
            'Asia/Tokyo': 'Tokyo (JST)',
            'Asia/Shanghai': 'Shanghai (CST)',
            'Asia/Kolkata': 'India (IST)',
            'Australia/Sydney': 'Sydney (AEST)'
        };
        return timezoneNames[settings.timezone] || settings.timezone;
    };

    // Get current time in set timezone
    const getCurrentTimeInTimezone = () => {
        const now = new Date();
        try {
            return now.toLocaleTimeString('en-US', {
                timeZone: settings.timezone,
                hour: settings.timeFormat === '12h' ? 'numeric' : '2-digit',
                minute: '2-digit',
                hour12: settings.timeFormat === '12h'
            });
        } catch (err) {
            return formatTime(now);
        }
    };

    // Get current date in set timezone
    const getCurrentDateInTimezone = () => {
        const now = new Date();
        try {
            const options = { timeZone: settings.timezone };
            const tzDate = new Date(now.toLocaleString('en-US', options));
            return formatDate(tzDate);
        } catch (err) {
            return formatDate(now);
        }
    };

    const value = {
        settings,
        loading,
        updateSettings,
        refreshSettings,
        formatDate,
        formatTime,
        formatDateTime,
        formatCurrency,
        getTimezoneDisplayName,
        getCurrentTimeInTimezone,
        getCurrentDateInTimezone
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

// Custom hook to use settings
export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export default SettingsContext;
