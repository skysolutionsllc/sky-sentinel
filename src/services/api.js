const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const provider = localStorage.getItem('llm_provider') || 'openai';
  const model = localStorage.getItem('llm_model') || 'gpt-4o-mini';

  // Use provider-specific API key
  let apiKey = '';
  if (provider === 'openai') {
    apiKey = localStorage.getItem('llm_api_key_openai') || localStorage.getItem('llm_api_key') || '';
  } else if (provider === 'anthropic') {
    apiKey = localStorage.getItem('llm_api_key_anthropic') || localStorage.getItem('llm_api_key') || '';
  }

  const llmHeaders = {
    'x-llm-provider': provider,
    'x-llm-model': model,
    'x-llm-api-key': apiKey,
  };

  const resp = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 
      'Content-Type': 'application/json', 
      ...llmHeaders,
      ...options.headers 
    },
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export const api = {
  // Dashboard
  dashboardStats: () => fetchJSON('/dashboard/stats'),
  geoRisk: () => fetchJSON('/dashboard/geo-risk'),
  trends: () => fetchJSON('/dashboard/trends'),
  hcpcsDistribution: () => fetchJSON('/dashboard/hcpcs-distribution'),

  // Alerts
  alerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/alerts?${qs}`);
  },
  alertSummary: () => fetchJSON('/alerts/summary'),
  alertAction: (id, body) => fetchJSON(`/alerts/${id}/action`, {
    method: 'POST', body: JSON.stringify(body),
  }),

  // Suppliers
  suppliers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/suppliers?${qs}`);
  },
  supplierDetail: (npi) => fetchJSON(`/suppliers/${npi}`),
  supplierTimeline: (npi) => fetchJSON(`/suppliers/${npi}/timeline`),
  supplierPeers: (npi) => fetchJSON(`/suppliers/${npi}/peers`),

  // Clusters
  clusters: () => fetchJSON('/clusters'),
  clusterDetail: (id) => fetchJSON(`/clusters/${id}`),

  // Claims
  claimsFeed: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/claims/feed?${qs}`);
  },
  submitClaim: (body) => fetchJSON('/claims', {
    method: 'POST', body: JSON.stringify(body),
  }),

  // Investigation
  createPattern: (body) => fetchJSON('/investigation/patterns', {
    method: 'POST', body: JSON.stringify(body),
  }),
  listPatterns: () => fetchJSON('/investigation/patterns'),
  testThreshold: (body) => fetchJSON('/investigation/threshold-test', {
    method: 'POST', body: JSON.stringify(body),
  }),
  aiQuery: (query) => fetchJSON('/investigation/query', {
    method: 'POST', body: JSON.stringify({ query }),
  }),
  queryHistory: () => fetchJSON('/investigation/query-history'),

  // Weight Configs
  saveWeightConfig: (body) => fetchJSON('/investigation/weight-configs', {
    method: 'POST', body: JSON.stringify(body),
  }),
  listWeightConfigs: () => fetchJSON('/investigation/weight-configs'),
  renameWeightConfig: (id, name) => fetchJSON(`/investigation/weight-configs/${id}`, {
    method: 'PUT', body: JSON.stringify({ name }),
  }),
  deleteWeightConfig: (id) => fetchJSON(`/investigation/weight-configs/${id}`, {
    method: 'DELETE',
  }),
};
