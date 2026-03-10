import React, { useEffect, useState } from 'react';

interface RulesViewerProps {
    onRuleClick?: (nodeIds: string[]) => void;
    version?: number;
}

export const RulesViewer: React.FC<RulesViewerProps> = ({ onRuleClick, version }) => {
    const [rules, setRules] = useState<{ antecedent: string[], support: string, nodeIds: string[] }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/rules.txt?v=${version || Date.now()}`)
            .then(res => res.text())
            .then(text => {
                const parsedRules = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.startsWith('(supportOf'))
                    .map(line => {
                        const match = line.match(/\(, (.*)\) (\d+)\)$/);
                        if (!match) return null;

                        const innerParts = match[1];
                        const support = match[2];

                        const items = innerParts.match(/\([^\)]+\)/g) || [];
                        const nodeIds: string[] = [];
                        const antecedent = items.map(item => {
                            const withoutParens = item.replace(/^\(/, '').replace(/\)$/, '');
                            const parts = withoutParens.match(/([^\s"]+|"[^"]+")/g);
                            if (parts && parts.length >= 3) {
                                const prop = parts[0];
                                const val = parts[2].replace(/"/g, '');
                                nodeIds.push(`${prop}_${val}`);
                                return `${prop}: ${val}`;
                            }
                            return item;
                        });

                        return { antecedent, support, nodeIds };
                    })
                    .filter(Boolean) as { antecedent: string[], support: string, nodeIds: string[] }[];

                setRules(parsedRules.sort((a, b) => parseInt(b.support) - parseInt(a.support)));
                setLoading(false);
            })
            .catch(err => {
                console.error("Could not load rules.txt", err);
                setLoading(false);
            });
    }, []);

    return (
        <div style={{ height: '100%', width: '100%', backgroundColor: '#050505', color: '#4ade80', overflowY: 'auto', padding: '32px', boxSizing: 'border-box' }}>
            <h2 style={{ fontSize: '28px', color: '#4ade80', textShadow: '0 0 10px rgba(74, 222, 128, 0.4)', marginBottom: '32px', borderBottom: '1px solid rgba(74, 222, 128, 0.2)', paddingBottom: '16px' }}>
                Mined Rules Evidence
            </h2>

            {loading ? (
                <div>Loading rules...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {rules.map((rule, idx) => (
                        <div key={idx} style={{
                            background: '#0a0a0a',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '8px',
                            padding: '24px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            transition: 'all 0.2s',
                            cursor: onRuleClick ? 'pointer' : 'default'
                        }}
                            onClick={() => onRuleClick && onRuleClick(rule.nodeIds)}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = '#4ade80';
                                e.currentTarget.style.boxShadow = '0 0 16px rgba(74, 222, 128, 0.2)';
                                if (onRuleClick) e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.3)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
                                if (onRuleClick) e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontFamily: 'sans-serif', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Association Pattern</span>
                                <span style={{ background: '#112211', color: '#4ade80', padding: '4px 10px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold' }}>Support: {rule.support}</span>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {rule.antecedent.map((ant, i) => (
                                    <li key={i} style={{
                                        fontFamily: 'monospace',
                                        fontSize: '14px',
                                        padding: '10px 12px',
                                        backgroundColor: '#111',
                                        borderRadius: '4px',
                                        borderLeft: '3px solid #4ade80',
                                        color: '#cbd5e1'
                                    }}>
                                        {ant}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
