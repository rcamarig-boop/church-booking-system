(async ()=>{
  const base = 'http://localhost:4000/api';
  try {
    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@church.com', password: 'admin1234' })
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN', loginRes.status, loginJson);
    if (!loginRes.ok) return;
    const token = loginJson.token;

    const usersRes = await fetch(base + '/users', { headers: { Authorization: 'Bearer ' + token } });
    const users = await usersRes.json();
    console.log('USERS BEFORE', usersRes.status, users);

    const candidate = users.find(u => u.email !== 'admin@church.com');
    if (!candidate) {
      console.log('No non-admin user found to delete.');
      return;
    }

    console.log('Deleting candidate:', candidate.id, candidate.email);
    const delRes = await fetch(base + '/users/' + candidate.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    let delJson;
    try { delJson = await delRes.json(); } catch(e) { delJson = { error: 'no json' }; }
    console.log('DELETE', delRes.status, delJson);

    const usersRes2 = await fetch(base + '/users', { headers: { Authorization: 'Bearer ' + token } });
    console.log('USERS AFTER', usersRes2.status, await usersRes2.json());
  } catch (e) {
    console.error('ERROR', e);
  }
})();
