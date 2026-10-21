import test from 'node:test';
import assert from 'node:assert/strict';
import { result } from '../server/supabase.js';

test('missing Storage bucket reports gift image setup instructions even without an error code',async () => {
  await assert.rejects(result(Promise.resolve({error:{message:'Bucket not found'}})),error => error.status===503 && error.message.includes('supabase/storage.sql') && error.message.includes('STORAGE_BUCKET'));
});

test('missing RPC reports migration/cache guidance instead of a generic connection error',async () => {
  for (const code of ['PGRST202','42883']) {
    await assert.rejects(result(Promise.resolve({error:{code,message:'Function not found'}})),error => error.status===503 && error.message.includes('migration'));
  }
  await assert.rejects(result(Promise.resolve({error:{code:'40P01',message:'internal SQL detail'}})),error => error.status===503 && error.message.includes('40P01') && !error.message.includes('internal SQL detail'));
});
