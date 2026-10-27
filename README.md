# Agendamento para Salão de Beleza

Next.js 14 (App Router) + Tailwind + Prisma + PostgreSQL + NextAuth. Mobile-first.

## Como rodar

Requisitos: Node 20+ e Docker (ou um PostgreSQL 14+ com a extensão `btree_gist`).

```bash
cp .env.example .env        # edite NEXTAUTH_SECRET, ADMIN_EMAIL e ADMIN_PASSWORD
npm install
npm run db:up               # sobe o PostgreSQL via Docker (pule se já tem um banco)
npm run db:setup            # aplica as migrations e cria os dados iniciais
npm run dev                 # http://localhost:3000
```

- Dono: entre em `/login` com o `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env` → abre o painel em `/admin`.
- Clientes: `/cadastro` → `/agendar`.
- Testes da lógica de horários: `npm test`.

> **Colocar no ar (Supabase + Vercel): veja [DEPLOY.md](DEPLOY.md).**

## O que tem

**Cliente:** cadastro/login, catálogo por categoria, agendamento em 4 passos (serviços → profissional ou "qualquer" → data/horário reais → confirmação), próximos agendamentos com cancelamento (respeita a antecedência mínima) e histórico.

**Admin:** resumo do dia, agenda em linha do tempo por profissional, lista de agendamentos com troca de status, agendamento manual, horários por dia da semana (salão e por profissional, com almoço), bloqueios (folga, férias, feriado), serviços (criar, editar, inativar), profissionais, clientes com histórico.

## Regras de negócio

- **Duração:** o horário só aparece se o serviço inteiro (soma dos serviços + intervalo) cabe numa janela livre. Serviço de 2h às 14:00 → próximo livre às 16:00.
- **Double-booking em 3 camadas:** (1) só oferece horários livres; (2) revalida ao criar; (3) a constraint `appointment_no_overlap` do PostgreSQL recusa qualquer sobreposição, mesmo com requisições simultâneas.
- Cancelado e Falta liberam o horário. Preço e duração ficam congelados em cada agendamento.
- Configurações (antecedência mínima, dias à frente, passo dos horários, prazo de cancelamento) ficam na tabela `Settings`.

## Estrutura

```
prisma/        schema, migrations (inclui a constraint anti-overlap) e seed
src/server/    intervalos.ts (matemática pura), disponibilidade.ts, agendamentos.ts, auth.ts
src/app/api/   rotas do cliente e /admin/*
src/app/       páginas (cliente e /admin)
tests/         testes da lógica de horários e fuso
```
