import React, { useState, useEffect } from 'react';
import { GraphViewer } from './GraphViewer';
import { RulesViewer } from './RulesViewer';

const DataExplorer: React.FC<{ token: string, mode: 'graph' | 'rules', version?: number }> = ({ token, mode, version }) => {
    const [mettaData, setMettaData] = useState<string>('');
    const [highlightRule, setHighlightRule] = useState<string[] | null>(null);

    useEffect(() => {
        if (mode === 'graph') {
            fetch(`/data.metta?v=${version || Date.now()}`)
                .then(res => res.text())
                .then(text => setMettaData(text))
                .catch(console.error);
        }
    }, [mode, version]);

    return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header for Data View */}
            <div style={{
                padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
                    {mode === 'graph' ? 'Knowledge Graph' : 'Inference Rules'}
                </h2>
            </div>

            {/* Content Container */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {mode === 'graph' ? (
                    mettaData ? (
                        <GraphViewer
                            mettaText={mettaData}
                            highlightRule={highlightRule}
                            clearHighlight={() => setHighlightRule(null)}
                        />
                    ) : (
                        <div style={{ padding: 40, color: '#666' }}>Loading visualization data...</div>
                    )
                ) : (
                    <RulesViewer key={version} onRuleClick={(nodeIds) => {
                        setHighlightRule(nodeIds);
                        // Ideally navigate to graph view, but for now we stay in rules
                    }} />
                )}
            </div>
        </div>
    );
};

export default DataExplorer;