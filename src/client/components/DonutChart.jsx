import React from 'react';
import './DonutChart.css';

export default function DonutChart({ data, size, title }) {
    var total = (data || []).reduce(function (sum, d) { return sum + d.value; }, 0);
    var s = size || 180;
    var r = s / 2 - 10;
    var cx = s / 2;
    var cy = s / 2;
    var cumAngle = -90;

    function polarToCart(cxv, cyv, rv, deg) {
        var rad = (deg * Math.PI) / 180;
        return { x: cxv + rv * Math.cos(rad), y: cyv + rv * Math.sin(rad) };
    }

    var paths = (data || []).map(function (d, i) {
        if (total === 0) return null;
        var pct = d.value / total;
        var angle = pct * 360;
        var start = polarToCart(cx, cy, r, cumAngle);
        var end = polarToCart(cx, cy, r, cumAngle + angle);
        var largeArc = angle > 180 ? 1 : 0;
        var pathD = 'M ' + cx + ' ' + cy + ' L ' + start.x + ' ' + start.y +
            ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + end.x + ' ' + end.y + ' Z';
        cumAngle += angle;
        return React.createElement('path', { key: i, d: pathD, fill: d.color, className: 'donut-slice' });
    });

    return (
        <figure className="donut-chart">
            {title && <figcaption className="donut-chart__title">{title}</figcaption>}
            <svg width={s} height={s} viewBox={'0 0 ' + s + ' ' + s}>
                <circle cx={cx} cy={cy} r={r * 0.6} fill="var(--bnp-white)" />
                {paths}
                <circle cx={cx} cy={cy} r={r * 0.6} fill="var(--bnp-white)" />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="donut-center-text">{total}</text>
            </svg>
            <ul className="donut-legend">
                {(data || []).map(function (d, i) {
                    return (
                        <li key={i} className="donut-legend__item">
                            <span className="donut-legend__dot" style={{ backgroundColor: d.color }}></span>
                            {d.label}: {d.value}
                        </li>
                    );
                })}
            </ul>
        </figure>
    );
}
