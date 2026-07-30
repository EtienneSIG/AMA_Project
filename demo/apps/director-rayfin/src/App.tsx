//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { overview, DEMO_SCOPE } from "@/overview-data";

// Leaflet is loaded from CDN in index.html.
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        L?: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _lmap?: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _lmarkers?: any;
    }
}

const CSS = `
.da-root{--line:#dde3ea;--grey:#5a6675;--ink:#0a2540;--teal:#1b9e8a;--navy:#0f1b2d;--orange:#f26334;
    font-family:system-ui,sans-serif;color:var(--ink);background:#f4f7fb;padding:1rem;min-height:100vh}
.da-head{margin-bottom:1rem}
.da-head h1{font-size:1.05rem;margin:0;color:var(--navy)}
.da-head .sub{font-size:.8rem;color:var(--grey);margin:.15rem 0 .4rem}
.da-badge{display:inline-block;background:#e5f3f0;color:#0f6b5c;font-size:.72rem;padding:.2rem .55rem;border-radius:999px;border:1px solid #bfe3db}
.da-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:1rem}
.da-bar{display:flex;gap:.5rem;align-items:center;margin-bottom:.6rem}
.da-bar strong{color:var(--navy)}
.da-src{font-size:.72rem;color:var(--grey);margin-left:auto}
.da-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.8rem;margin-bottom:1rem}
.da-kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:.9rem 1rem}
.da-kpi .v{font-size:1.55rem;font-weight:700;color:var(--navy)}
.da-kpi .l{font-size:.74rem;color:var(--grey)}
.da-kpi .v.pos{color:var(--teal)} .da-kpi .v.neg{color:var(--orange)}
.da-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:1rem}
@media(max-width:900px){.da-grid{grid-template-columns:1fr}}
.da-h2{font-size:1rem;margin:.1rem 0 .8rem}
.da-barrow{display:flex;align-items:center;gap:.6rem;margin:.35rem 0;font-size:.82rem}
.da-barrow .nm{width:130px;color:var(--grey)}
.da-barrow .track{flex:1;background:#eef2f7;border-radius:999px;height:.7rem}
.da-barrow .fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--teal),var(--navy))}
.da-barrow .pct{width:42px;text-align:right;font-weight:600}
#da-map{height:360px;border-radius:10px;overflow:hidden;border:1px solid var(--line)}
.da-root svg{max-width:100%}
`;

function App() {
    const j = overview(DEMO_SCOPE);
    const k = j.kpis;
    const mapReady = useRef(false);

    useEffect(() => {
        const L = window.L;
        if (!L || mapReady.current) return;
        mapReady.current = true;
        const map = L.map("da-map", { scrollWheelZoom: false }).setView([52.2, 5.3], 7);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 12, attribution: "© OpenStreetMap" }).addTo(map);
        const markers = L.layerGroup().addTo(map);
        const grp: [number, number][] = [];
        j.schools.forEach((s) => {
            const col = s.mastery >= 0.65 ? "#1b9e8a" : s.mastery >= 0.6 ? "#e8a33d" : "#f26334";
            const m = L.circleMarker([s.lat, s.lng], { radius: 8 + s.learners / 80, color: "#fff", weight: 2, fillColor: col, fillOpacity: 0.9 });
            m.bindPopup(`<strong>${s.name}</strong><br>Mastery ${Math.round(s.mastery * 100)}% · ${s.learners} learners`);
            m.addTo(markers);
            grp.push([s.lat, s.lng]);
        });
        if (grp.length) map.fitBounds(grp, { padding: [30, 30], maxZoom: 9 });
        setTimeout(() => map.invalidateSize(), 200);
    }, [j.schools]);

    const kpis: [string, string | number, string][] = [
        ["Learners", k.learners, ""],
        ["Schools", k.schools, ""],
        ["Mastery", Math.round(k.mastery * 100) + "%", ""],
        ["Engagement", Math.round(k.engagement * 100) + "%", ""],
        ["Completion", Math.round(k.completion * 100) + "%", ""],
        ["Attendance", Math.round(k.attendance * 100) + "%", ""],
        ["Time on task", k.timeOnTaskMin + " min", ""],
        ["At-risk", k.atRisk + "%", k.atRisk > 20 ? "neg" : "pos"],
        ["Satisfaction", k.satisfaction + "/5", ""],
        ["Gap vs national", (k.gapVsNational >= 0 ? "+" : "") + k.gapVsNational + " pts", k.gapVsNational >= 0 ? "pos" : "neg"],
    ];

    const nat = j.national.mastery;
    const tr = j.schools[0] ? j.schools[0].trend : [0.6, 0.63, 0.65];
    const pts = (a: number[]) => a.map((v, i) => `${20 + i * 160},${120 - v * 120}`).join(" ");

    return (
        <div className="da-root">
            <style>{CSS}</style>
            <div className="da-head">
                <h1>Director reporting (native Fabric)</h1>
                <div className="sub">EU-resident Fabric app · scope-bound, suppressed</div>
                <span className="da-badge">Served by Rayfin Fabric app</span>
            </div>

            <div className="da-card">
                <div className="da-bar"><strong>Director analytics</strong><span className="da-src">Fabric · EU · northeurope</span></div>
                <div className="da-kpis">
                    {kpis.map((x) => (
                        <div className="da-kpi" key={x[0]}>
                            <div className={`v ${x[2]}`}>{x[1]}</div>
                            <div className="l">{x[0]}</div>
                        </div>
                    ))}
                </div>

                <div className="da-grid">
                    <div className="da-card">
                        <h2 className="da-h2">Establishment mastery vs national</h2>
                        <div>
                            {j.schools.map((s) => (
                                <div className="da-barrow" key={s.id}>
                                    <span className="nm">{s.name}</span>
                                    <span className="track"><span className="fill" style={{ width: `${Math.round(s.mastery * 100)}%` }} /></span>
                                    <span className="pct">{Math.round(s.mastery * 100)}%</span>
                                </div>
                            ))}
                            <div className="da-barrow">
                                <span className="nm">National</span>
                                <span className="track"><span className="fill" style={{ width: `${Math.round(nat * 100)}%`, background: "#94a3b8" }} /></span>
                                <span className="pct">{Math.round(nat * 100)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="da-card">
                        <h2 className="da-h2">Schools (Netherlands)</h2>
                        <div id="da-map" />
                    </div>
                </div>
            </div>

            <div className="da-card">
                <h2 className="da-h2">Mastery trend (you vs national)</h2>
                <svg viewBox="0 0 360 130" width="360" height="130">
                    <polyline fill="none" stroke="#1b9e8a" strokeWidth={2.5} points={pts(tr)} />
                    <polyline fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4" points={pts(j.nationalTrend)} />
                </svg>
                <p className="da-src">Teal = your scope · grey = national</p>
            </div>
        </div>
    );
}

export default App;
