import React, { useState, useEffect } from 'react';
import { GraphViewer } from './GraphViewer';
import { RulesViewer } from './RulesViewer';

const DataExplorer: React.FC<{ token: string; mode: 'graph' | 'rules'; version?: number }> = ({ token, mode, version }) => {
  const [mettaData, setMettaData] = useState<string>('');
  const [highlightRule, setHighlightRule] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode === 'graph') {
      setIsLoading(true);
      fetch(`/data.metta?v=${version || Date.now()}`)
        .then(res => res.text())
        .then(text => { setMettaData(text); setIsLoading(false); })
        .catch(err => { console.error(err); setIsLoading(false); });
    }
  }, [mode, version]);

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>

      {/* Header */}
      <div style={{
        padding: '0 24px', height: '52px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {mode === 'graph' ? 'Knowledge Graph' : 'Inference Rules'}
          </h2>
          {isLoading && (
            <div style={{
              width: '14px', height: '14px',
              border: '2px solid var(--border-hover)',
              borderTopColor: 'var(--text-secondary)',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
          )}
        </div>

        {mettaData && mode === 'graph' && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {mettaData.split('\n').filter(Boolean).length} entries
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {mode === 'graph' ? (
          isLoading ? (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '16px', color: 'var(--text-muted)',
            }}>
              <div style={{
                width: '32px', height: '32px',
                border: '2px solid var(--border-hover)',
                borderTopColor: 'var(--text-secondary)',
                borderRadius: '50%', animation: 'spin 0.7s linear infinite',
              }} />
              <span style={{ fontSize: '13px' }}>Loading visualization…</span>
            </div>
          ) : mettaData ? (
            <GraphViewer
              mettaText={mettaData}
              highlightRule={highlightRule}
              clearHighlight={() => setHighlightRule(null)}
            />
          ) : (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '12px', color: 'var(--text-muted)',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span style={{ fontSize: '13px' }}>No graph data available. Try ingesting data first.</span>
            </div>
          )
        ) : (
          <RulesViewer key={version} onRuleClick={(nodeIds) => setHighlightRule(nodeIds)} />
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DataExplorer;