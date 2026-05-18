import React from 'react';
import './BarChart.css';

export default function BarChart({ data, title, height, horizontal }) {
    var maxVal = Math.max.apply(null, (data || []).map(function (d) { return d.value; }).concat([1]));
    var h = height || 220;

    if (horizontal) {
        return (
            <figure className="bar-chart">
                {title && <figcaption className="bar-chart__title">{title}</figcaption>}
                <div className="bar-chart__horizontal">
                    {(data || []).map(function (d, i) {
                        var pct = (d.value / maxVal) * 100;
                        return (
                            <div key={i} className="bar-h-row">
                                <span className="bar-h-label">{d.label}</span>
                                <div className="bar-h-track">
                                    <div className="bar-h-fill" style={{ width: pct + '%', backgroundColor: d.color }}></div>
                                </div>
                                <span className="bar-h-value">{d.value}</span>
                            </div>
                        );
                    })}
                </div>
            </figure>
        );
    }

    return (
        <figure className="bar-chart">
            {title && <figcaption className="bar-chart__title">{title}</figcaption>}
            <div className="bar-chart__vertical" style={{ height: h + 'px' }}>
                {(data || []).map(function (d, i) {
                    var pct = (d.value / maxVal) * 100;
                    return (
                        <div key={i} className="bar-v-col">
                            <div className="bar-v-bar" style={{ height: pct + '%', backgroundColor: d.color }} title={d.label + ': ' + d.value}></div>
                            <span className="bar-v-label">{d.label}</span>
                        </div>
                    );
                })}
            </div>
        </figure>
    );
}
