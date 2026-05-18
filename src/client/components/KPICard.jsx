import React from 'react';
import './KPICard.css';

export default function KPICard({ icon, label, value, trend, accentClass }) {
    return (
        <article className={'kpi-card ' + (accentClass || '')}>
            <span className="kpi-card__icon">{icon}</span>
            <div className="kpi-card__body">
                <span className="kpi-card__value">{value}</span>
                <span className="kpi-card__label">{label}</span>
            </div>
            {trend !== undefined && (
                <span className={'kpi-card__trend ' + (trend >= 0 ? 'trend--up' : 'trend--down')}>
                    {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                </span>
            )}
        </article>
    );
}
