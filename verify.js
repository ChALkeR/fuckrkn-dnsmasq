const tls = require('tls');
const fs = require('fs');

const entries = fs
  .readFileSync('fuckrkn.conf', 'utf-8')
  .split("\n")
  .filter(x => x && !x.startsWith('#'))
  .map(x => {
    if (x.startsWith('address='))
      return x.replace('=', '').split('/');
    if (x.startsWith('host-record='))
      return x.split(/[=,]/);
  });

async function verify(host, servername) {
  return new Promise((accept, reject) => {
    console.log('Verifying', host, servername);
    const options = { port: 443, host, servername };
    const socket = tls.connect(options, () => {
      if (socket.authorized) {
        console.log(' OK, authorized');
      } else {
        console.log(' FAIL, unauthorized');
      }
      socket.end();
    });
    socket.setTimeout(3000);
    socket.on('data', () => {});
    socket.on('error', () => {
      console.log(' FAIL, error');
      accept();
    })
    socket.on('timeout', () => {
      console.log(' FAIL, timeout');
      socket.destroy();
      accept();
    });
    socket.on('end', () => {
      accept();
    });
  });
}

async function main() {
  for (const [type, servername, host] of entries) {
    switch (type) {
      case 'address':
        await verify(host, `www${servername}`);
        break;
      case 'host-record':
        await verify(host, servername);
        break;
    }
  }
  console.log('Done!');
}

main().catch(e => console.error(e));
