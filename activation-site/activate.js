'use strict';
const BASE = 'https://sippdylyuzejudmzbwdn.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcHBkeWx5dXplanVkbXpid2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAyNTEsImV4cCI6MjA3ODYxNjI1MX0.yPqwhFDcucUNxXnxnQ4orHBvxVNkxjEBUOypW6MV6jE';
const form = document.querySelector('#activation');
const statusText = document.querySelector('#status');
const button = document.querySelector('#save');
let accessToken = null;
function message(text, error = false) { statusText.textContent = text; statusText.dataset.error = String(error); }
async function authRequest(path, method, body, token) {
  const response = await fetch(BASE + '/auth/v1/' + path, {
    method, headers: { apikey: KEY, Authorization: 'Bearer ' + (token || KEY), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), referrerPolicy: 'no-referrer', cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 429 ? 'Troppi tentativi. Attendi qualche minuto prima di riprovare.' : 'Collegamento non valido, già utilizzato o scaduto, oppure richiesta rifiutata. Non richiedere un altro account: contatta l’amministratore.');
  return data;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const password = document.querySelector('#password').value;
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    message('Usa almeno 12 caratteri, con maiuscole, minuscole e un numero.', true); return;
  }
  if (password !== document.querySelector('#confirm').value) { message('Le password non corrispondono.', true); return; }
  button.disabled = true; message('Verifica dell’invito in corso…');
  try {
    if (!accessToken) {
      let link;
      try { link = new URL(document.querySelector('#invitation').value.trim()); } catch { throw new Error('Incolla il collegamento completo del pulsante nell’email di invito.'); }
      const hash = link.searchParams.get('token') || link.searchParams.get('token_hash');
      if (link.origin !== BASE || link.pathname !== '/auth/v1/verify' || link.searchParams.get('type') !== 'invite' || !hash || !/^[a-f0-9]{40,128}$/i.test(hash)) {
        throw new Error('Questo non è il collegamento di invito dell’app. Copia l’indirizzo originale del pulsante ricevuto via email, senza aprirlo.');
      }
      const session = await authRequest('verify', 'POST', { token_hash: hash, type: 'invite' });
      const user = session.user;
      if (!session.access_token || user?.email?.toLowerCase() !== 'trani@streetstock.it' || user?.app_metadata?.role !== 'pickup_point' || user?.app_metadata?.pickup_point_id !== 'fe5ce2ea-8707-4ec6-8bc7-e2556df05992') {
        if (session.access_token) await fetch(BASE + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token } }).catch(() => {});
        throw new Error('L’invito non corrisponde all’accesso del punto di ritiro di Trani. Nessuna password è stata cambiata.');
      }
      accessToken = session.access_token;
      document.querySelector('#invitation').value = '';
      document.querySelector('#invitation').disabled = true;
    }
    message('Salvataggio della password in corso…');
    await authRequest('user', 'PUT', { password }, accessToken);
    await fetch(BASE + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + accessToken } }).catch(() => {});
    accessToken = null;
    form.reset(); form.hidden = true;
    message('Password impostata. Apri RDN STREET STOCK MARKET e accedi con trani@streetstock.it e la password appena scelta.');
  } catch (error) { message(error instanceof Error ? error.message : 'Operazione non riuscita. Riprova.', true); }
  finally { button.disabled = false; }
});
