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
  if (!response.ok) {
    if (response.status === 429) throw new Error(path === 'recover' ? 'Il servizio ha raggiunto il limite temporaneo di invio o di richieste. La nuova email non è stata inviata. Riprova più tardi, senza ripetere continuamente la richiesta.' : 'Il servizio ha applicato un limite temporaneo ai tentativi. Riprova più tardi.');
    if (path === 'verify') throw new Error('Il collegamento è scaduto, già utilizzato o non valido. Richiedi una nuova email di recupero e copia il collegamento più recente senza aprirlo.');
    if (path === 'user') {
      if (response.status === 401 || response.status === 403) {
        accessToken = null;
        document.querySelector('#invitation').disabled = false;
        throw new Error('La sessione di recupero è scaduta. Richiedi una nuova email di recupero.');
      }
      if (data.code === 'same_password') throw new Error('La nuova password deve essere diversa da quella attuale. Scegline un’altra e premi di nuovo Salva password.');
      if (data.code === 'weak_password' || data.code === 'validation_failed' || response.status === 422) throw new Error('La password è stata rifiutata. Scegli una password più robusta e diversa dalla precedente, poi premi di nuovo Salva password. Il collegamento è già stato verificato: non ricaricare la pagina.');
      throw new Error('Il salvataggio della password non è riuscito. Il collegamento è già stato verificato: riprova senza ricaricare la pagina.');
    }
    throw new Error('Non è stato possibile richiedere l’email di recupero. Riprova più tardi.');
  }
  return data;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const password = document.querySelector('#password').value;
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    message('Usa almeno 12 caratteri, con maiuscole, minuscole e un numero.', true); return;
  }
  if (password !== document.querySelector('#confirm').value) { message('Le password non corrispondono.', true); return; }
  button.disabled = true;
  const resendWasDisabled = resendButton.disabled;
  resendButton.disabled = true;
  message('Verifica del collegamento in corso…');
  try {
    if (!accessToken) {
      let link;
      try { link = new URL(document.querySelector('#invitation').value.trim()); } catch { throw new Error('Incolla il collegamento completo del pulsante nell’email di recupero più recente.'); }
      const fragment = new URLSearchParams(link.hash.slice(1));
      const redirectedToken = fragment.get('access_token');
      let session;
      if (redirectedToken && ['recovery', 'invite'].includes(fragment.get('type')) && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(redirectedToken)) {
        // Never fetch the pasted destination: verify the bearer token only with
        // this app's fixed Auth service, then check the actual account below.
        const user = await authRequest('user', 'GET', null, redirectedToken);
        session = { access_token: redirectedToken, user };
      } else {
        if (fragment.has('error') || fragment.has('error_code')) throw new Error('La pagina aperta dall’email contiene un errore, non una sessione valida. Richiedi una nuova email e copia il link del pulsante senza aprirlo.');
        const hash = link.searchParams.get('token') || link.searchParams.get('token_hash');
        const type = link.searchParams.get('type');
        if (link.origin !== BASE || link.pathname !== '/auth/v1/verify' || !['invite', 'recovery'].includes(type) || !hash || !/^[a-f0-9]{40,128}$/i.test(hash)) {
          throw new Error('Incolla il link originale dell’email più recente oppure l’indirizzo completo della pagina aperta da quel link. Non basta il solo indirizzo del sito.');
        }
        session = await authRequest('verify', 'POST', { token_hash: hash, type });
      }
      const user = session.user;
      if (!session.access_token || user?.email?.toLowerCase() !== 'trani@streetstock.it' || user?.app_metadata?.role !== 'pickup_point' || user?.app_metadata?.pickup_point_id !== 'fe5ce2ea-8707-4ec6-8bc7-e2556df05992') {
        throw new Error('Il collegamento non corrisponde all’accesso del punto di ritiro di Trani. Nessuna password è stata cambiata.');
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
  finally { button.disabled = false; resendButton.disabled = resendWasDisabled; }
});
const resendButton = document.querySelector('#resend');
resendButton.addEventListener('click', async () => {
  resendButton.disabled = true;
  button.disabled = true;
  try {
    await authRequest('recover', 'POST', { email: 'trani@streetstock.it' });
    accessToken = null;
    document.querySelector('#invitation').disabled = false;
    document.querySelector('#invitation').value = '';
    form.hidden = false;
    message('Richiesta accettata. Controlla la posta di trani@streetstock.it, anche nello spam. Usa solo l’email più recente e copia il collegamento senza aprirlo.');
  } catch (error) { message(error instanceof Error ? error.message : 'Richiesta non riuscita.', true); }
  finally { button.disabled = false; setTimeout(() => { resendButton.disabled = false; }, 60000); }
});
