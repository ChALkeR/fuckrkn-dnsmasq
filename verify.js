const tls = require('tls');
const fs = require('fs');

function numberish(x) {
  return (+x + '') === x ? +x : x;
}

function parseOpts(opts) {
  return new Map(
    (opts || '')
      .split(/\s+/)
      .filter(x => x)
      .map(y => y.split(':'))
      .map(([key, value]) => [key, numberish(value)])
  );
}

const entries = fs
  .readFileSync('fuckrkn.conf', 'utf-8')
  .split("\n")
  .filter(x => x && !x.startsWith('#'))
  .map(x => x.replace('=/', '=').split(/[=,/#]/))
  .map(x => x.map(y => y.trim()))
  .map(([type, servername, host, opts]) => ({
    type, servername, host,
    opts: parseOpts(opts)
  }));

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
  for (const { type, servername, host, opts } of entries) {
    if (!['address', 'host-record'].includes(type))
      throw new Error(`Invalid type: ${type}`);
    if (process.argv.length > 2 && !process.argv.includes(servername))
      continue;
    const domain = type === 'address' ? `www${servername}` : servername;
    if (opts.has('tls') && !opts.get('tls')) {
      console.log('Skipping', host, domain);
    } else {
      await verify(host, domain);
    }
  }
  console.log('Done!');
}

main().catch(e => console.error(e));
