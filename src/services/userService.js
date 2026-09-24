const supabase = require('../db/supabase');

async function getUsers() {
  const { data, error } = await supabase.from('users').select('id, name').order('id');
  if (error) throw error;
  return data;
}

async function getUserById(id) {
  if (!Number.isSafeInteger(id) || id < 1) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createUser(name) {
  const { data, error } = await supabase
    .from('users')
    .insert({ name })
    .select('id, name')
    .single();
  if (error) throw error;
  return data;
}

async function updateUser(id, name) {
  if (!Number.isSafeInteger(id) || id < 1) return null;

  const { data, error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', id)
    .select('id, name')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteUser(id) {
  if (!Number.isSafeInteger(id) || id < 1) return false;

  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
