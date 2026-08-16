import { spawnSync } from 'node:child_process';
import fs from 'fs';

const tokenResult = spawnSync('curl.exe', ['-s', '-X', 'POST', 'http://localhost:8080/api/auth/login', '-H', 'Content-Type: application/json', '-d', '{"email":"ca","password":"1"}']);
const authRes = JSON.parse(tokenResult.stdout);
const token = authRes.data.accessToken;

const uploadResult = spawnSync('curl.exe', ['-s', '-X', 'POST', 'http://localhost:8080/api/cv/upload', '-H', 'Authorization: Bearer ' + token, '-F', 'file=@scratch/real.docx']);
console.log('UPLOAD RES:', uploadResult.stdout.toString());

setTimeout(() => {
  const checkResult = spawnSync('curl.exe', ['-s', '-X', 'GET', 'http://localhost:8080/api/candidates/me/cvs', '-H', 'Authorization: Bearer ' + token]);
  console.log('CVs STATUS:', checkResult.stdout.toString());
}, 2000);
