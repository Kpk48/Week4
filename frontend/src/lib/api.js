const BASE = import.meta.env.VITE_API_URL || ''

function getHeaders(){
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function handle(res){
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : await res.text()
  if (!res.ok){
    const message = data?.error?.message || data?.message || res.statusText
    throw new Error(message)
  }
  return data
}

export const api = {
  get: (url) => fetch(`${BASE}${url}`, { headers: getHeaders(), credentials: 'include' }).then(handle),
  post: (url, body) => fetch(`${BASE}${url}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body), credentials: 'include' }).then(handle),
  put: (url, body) => fetch(`${BASE}${url}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body), credentials: 'include' }).then(handle),
  delete: (url) => fetch(`${BASE}${url}`, { method: 'DELETE', headers: getHeaders(), credentials: 'include' }).then(handle)
}
