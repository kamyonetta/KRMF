import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({ root:'companion', base:'./', plugins:[svelte()], publicDir:'public', build:{outDir:'../dist-companion',emptyOutDir:true,target:'safari16',manifest:true}, server:{host:'127.0.0.1',port:1421,strictPort:true,fs:{allow:['..']}} });
