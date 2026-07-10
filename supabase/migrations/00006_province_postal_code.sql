-- TRIBE — provincia e CAP, a completamento dei campi indirizzo utente

alter table users add column if not exists province text;
alter table users add column if not exists postal_code text;
