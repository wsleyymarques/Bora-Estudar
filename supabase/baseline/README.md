# Supabase Baseline

Arquivo gerado:
- `20260424_full_schema_bootstrap.sql`

Uso recomendado:
1. Crie um projeto Supabase novo (vazio).
2. Abra o SQL Editor.
3. Execute todo o conteúdo de `20260424_full_schema_bootstrap.sql`.
4. Atualize seu `.env` para o novo `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

Observações:
- Esse baseline consolida as migrations atuais em um SQL único.
- Use esse arquivo para bootstrap manual no projeto novo.
- Não execute esse baseline junto com `supabase db push` das migrations antigas no mesmo banco, para evitar duplicidade de mudanças.
