import { cpSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const preview=process.argv.includes('--preview');
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.companion.config.ts','--mode',preview?'preview':'production'],{stdio:'inherit'});
mkdirSync('dist-companion/art',{recursive:true});
cpSync('public/art/krmf-logo.png','dist-companion/art/krmf-logo.png');
cpSync('public/art/krmf-logo.png','dist-companion/apple-touch-icon.png');
const manifest={name:'KRMF · Pocket planner',short_name:'KRMF',start_url:'/krmf/',scope:'/krmf/',display:'standalone',background_color:'#211e2a',theme_color:'#272333',icons:[{src:'./apple-touch-icon.png',sizes:'any',type:'image/png'}]};
writeFileSync('dist-companion/manifest.webmanifest',JSON.stringify(manifest));
cpSync('companion/public/sw.js','dist-companion/sw.js');
if(!preview){mkdirSync('wordpress/krmf-companion/web',{recursive:true});cpSync('dist-companion','wordpress/krmf-companion/web',{recursive:true});}
writeFileSync('dist-companion/BUILD-MODE.txt',preview?'TEST DATA PREVIEW — NO SYNC SERVER':'PRODUCTION CANDIDATE — STAGING VALIDATION REQUIRED');
