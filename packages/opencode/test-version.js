import { execSync } from 'child_process';
try {
  const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  const repo = remote.match(/[:\/]([^\/]+\/[^\/]+?)(\.git)?$/)[1];
  const tags = execSync('git describe --tags', { encoding: 'utf8' }).trim();
  console.log(`${repo} ${tags}`);
} catch(e) {
  console.log("local");
}
