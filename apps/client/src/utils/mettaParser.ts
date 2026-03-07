export interface GraphNode {
  id: string;
  label: string;
  type: 'article' | 'property';
  category?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const parseMettaToGraph = (mettaText: string): GraphData => {
  const lines = mettaText.split('\n');
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  const targetProperties = [
    'length',
    'reading-time',
    'tone',
    'complexity',
    'audience-expertise',
    'content-type',
    'date-period',
    'primary-goal',
    'popularity',
    'engagement',
    'authored-by'
  ];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('(') || !trimmed.endsWith(')')) return;

    const inner = trimmed.substring(1, trimmed.length - 1).trim();
    // handling quotes
    const regex = /([^\s"]+|"[^"]+")/g;
    const parts = inner.match(regex);

    if (parts && parts.length >= 3) {
      const property = parts[0];
      const articleId = parts[1];
      const value = parts[2].replace(/"/g, ''); // remove quotes

      if (!nodesMap.has(articleId)) {
        nodesMap.set(articleId, {
          id: articleId,
          label: articleId.replace('Article_', ''),
          type: 'article'
        });
      }

      if (property === 'title') {
        const existing = nodesMap.get(articleId)!;
        existing.label = value; 
        return;
      }

      if (targetProperties.includes(property)) {
        const propertyNodeId = `${property}_${value}`;

        if (!nodesMap.has(propertyNodeId)) {
          nodesMap.set(propertyNodeId, {
            id: propertyNodeId,
            label: value.replace(/_/g, ' '),
            type: 'property',
            category: property
          });
        }

        links.push({
          source: articleId,
          target: propertyNodeId
        });
      }
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    links
  };
};

