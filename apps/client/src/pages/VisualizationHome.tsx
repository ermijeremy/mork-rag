import React, { useState, useEffect } from 'react';
import { GraphViewer } from '../components/GraphViewer';
import { RulesViewer } from '../components/RulesViewer';

interface VisualizationHomeProps {
  token: string;
  children?: React.ReactNode;
}

const VisualizationHome: React.FC<VisualizationHomeProps> = ({ token, children }) => {
  const [ingesting, setIngesting] = useState(false);
  const [mettaData, setMettaData] = useState<string>('');
  const [viewRules, setViewRules] = useState(false);

  const [highlightRule, setHighlightRule] = useState<string[] | null>(null);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    fetch('/data.metta')
      .then(res => res.text())
      .then(text => setMettaData(text))
      .catch(err => console.error("Could not load data.metta", err));
  }, []);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Ingestion Complete', 'success');
      } else {
        showToast(`Error: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('Ingestion Failed', 'error');
    } finally {
      setIngesting(false);
    }
  };

  const onRuleClick = (nodeIds: string[]) => {
    setHighlightRule(nodeIds);
    setViewRules(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#050505' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(74, 222, 128, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#4ade80', margin: 0, fontSize: '24px', letterSpacing: '1px', textShadow: '0 0 6px rgba(74, 222, 128, 0.3)' }}>
            Mindplex Hyperon
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '13px' }}>
            {viewRules ? 'Rules Visualization' : 'Graph Visualization'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => {
              setViewRules(!viewRules);
              if (!viewRules) setHighlightRule(null); 
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: viewRules ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
              border: '1px solid #4ade80',
              color: '#4ade80',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              boxShadow: '0 0 4px rgba(74, 222, 128, 0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            {viewRules ? 'VIEW GRAPH' : 'VIEW RULES'}
          </button>

          <button
            onClick={handleIngest}
            disabled={ingesting}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid #4ade80',
              color: '#4ade80',
              borderRadius: '4px',
              cursor: ingesting ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              boxShadow: '0 0 4px rgba(74, 222, 128, 0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            {ingesting ? 'INGESTING...' : 'INGEST DATA'}
          </button>
          {children}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        {toast && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            padding: '12px 24px',
            minWidth: '250px',
            backgroundColor: toast.type === 'success' ? 'rgba(6, 78, 59, 0.4)' : 'rgba(127, 29, 29, 0.4)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(52, 211, 153, 0.6)' : 'rgba(248, 113, 113, 0.6)'}`,
            borderRadius: '8px',
            color: toast.type === 'success' ? '#34d399' : '#fca5a5',
            fontFamily: 'monospace',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 1000,
            transition: 'all 0.3s ease-in-out',
            backdropFilter: 'blur(8px)'
          }}>
            {toast.message}
          </div>
        )}
        {viewRules ? (
          <RulesViewer onRuleClick={onRuleClick} />
        ) : mettaData ? (
          <GraphViewer
            mettaText={mettaData}
            highlightRule={highlightRule}
            clearHighlight={() => setHighlightRule(null)}
          />
        ) : (
          <div style={{ color: '#4ade80', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            Loading graph data...
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizationHome;
