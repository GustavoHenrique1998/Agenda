# Colocar o sistema no ar (Supabase + Vercel)

Resultado: um endereço na internet (ex.: `https://meusalao.com.br`) onde as clientes agendam
de casa e o dono gerencia pelo celular em `/admin`.

> **Antes de começar — custos reais (conferidos em out/2026)**
>
> | Serviço | Para testar | Para o salão de verdade |
> |---|---|---|
> | Supabase (banco) | Free: 500 MB, **pausa após 1 semana sem uso**, sem backup automático | **Pro, a partir de US$ 25/mês**: nunca pausa, backup diário (7 dias) |
> | Vercel (hospedagem do site) | Hobby: grátis, mas **só para uso pessoal/não comercial** | **Pro, US$ 20/mês por usuário** |
>
> Um salão é uso comercial, e um banco que pausa deixa as clientes sem conseguir agendar.
> Use o grátis para testar e demonstrar; para operar, contrate os planos pagos.

---

## Parte 0 — O que instalar e criar (uma vez só)

**Programas no seu computador**
- **Node.js 20 ou mais novo** (versão "LTS"): https://nodejs.org — instale com tudo "Next, Next".
  Para conferir, abra o terminal e digite `node -v` (deve mostrar v20 ou maior).
  - Terminal no Windows: tecla Windows → digite **PowerShell**. No Mac: **Terminal**.
- **Git** (para enviar o código ao GitHub): https://git-scm.com/downloads
- Opcional: **VS Code** (https://code.visualstudio.com) para editar o arquivo `.env`; o Bloco de Notas também serve.

**Contas (todas têm plano grátis para começar)**
- Supabase — https://supabase.com (banco de dados)
- GitHub — https://github.com (guarda o código)
- Vercel — https://vercel.com (coloca o site no ar; entre com o GitHub)
- Registro.br — https://registro.br (só se quiser um endereço próprio `.com.br`)

**Bibliotecas do projeto:** você **não** instala uma por uma. O comando `npm install` (Parte 2)
baixa tudo sozinho: Next.js 14, React 18, Prisma 5, NextAuth 4, bcryptjs, Zod, Tailwind CSS 3,
TypeScript e tsx.

---

## Parte 1 — Banco de dados no Supabase

1. Crie a conta em **supabase.com** e clique em **New project**.
2. Preencha:
   - **Name:** o nome do salão
   - **Database password:** crie uma senha forte e **guarde** (você vai precisar dela)
   - **Region:** *South America (São Paulo)* — fica mais rápido para quem está no Brasil
3. Espere o projeto ficar pronto (1–2 minutos).
4. Ative a extensão que impede dois agendamentos no mesmo horário:
   **Database → Extensions →** procure `btree_gist` → ligue.
5. Pegue os endereços de conexão: clique em **Connect** (topo da tela) e copie dois:
   - **Transaction pooler** (porta **6543**) → será o `DATABASE_URL`
   - **Session pooler** (porta **5432**) → será o `DIRECT_URL`

   Ficam parecidos com:
   ```
   postgresql://postgres.abcdefgh:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   postgresql://postgres.abcdefgh:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   ```
   Troque `[SUA-SENHA]` pela senha do passo 2. **Se a senha tiver símbolos** (`@ # / : ?`),
   troque-os por código (ex.: `@` vira `%40`) ou escolha uma senha só com letras e números.

   No `DATABASE_URL` (porta 6543) acrescente no final: `?pgbouncer=true&connection_limit=1`

## Parte 2 — Criar as tabelas e os dados iniciais (no seu computador)

Precisa do **Node.js 20+** instalado (nodejs.org).

1. Descompacte o `salao-agenda.zip` e abra um terminal dentro da pasta.
2. Crie o arquivo de configuração: no Mac/Linux `cp .env.example .env`; no PowerShell do Windows
   `copy .env.example .env`. (O arquivo precisa se chamar exatamente `.env`, sem `.txt` no final.)
3. Abra o `.env` e preencha:
   ```
   DATABASE_URL="(transaction pooler, porta 6543, com ?pgbouncer=true&connection_limit=1)"
   DIRECT_URL="(session pooler, porta 5432)"
   NEXTAUTH_SECRET="(gere em https://generate-secret.vercel.app/32 ou rode: openssl rand -base64 32)"
   NEXTAUTH_URL="http://localhost:3000"
   ADMIN_EMAIL="seu-email-de-dono@exemplo.com"
   ADMIN_PASSWORD="uma-senha-forte"
   ```
4. Rode:
   ```bash
   npm install
   npm run db:setup
   ```
   Isso cria as tabelas (já com a proteção anti-double-booking e a segurança do Supabase)
   e cadastra: o usuário dono, categorias, serviços e 3 profissionais de exemplo.
5. Confira no Supabase em **Table Editor**: as tabelas `User`, `Service`, `Appointment`… devem
   aparecer, cada uma com a marca **RLS enabled**.
6. (Opcional) Teste no seu computador: `npm run dev` → http://localhost:3000.

> Os serviços, profissionais e horários de exemplo servem para você ver funcionando.
> Troque pelos reais em `/admin/servicos`, `/admin/profissionais` e `/admin/horarios`.

## Parte 3 — Publicar o site na Vercel

1. Crie uma conta em **github.com** e um repositório **privado** novo; envie a pasta do projeto
   (o arquivo `.env` **não** vai junto — já está no `.gitignore`).
2. Crie conta em **vercel.com** (entre com o GitHub) → **Add New → Project** → escolha o repositório.
3. Em **Environment Variables**, cadastre estas 4:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | o mesmo do seu `.env` (porta 6543) |
   | `DIRECT_URL` | o mesmo do seu `.env` (porta 5432) |
   | `NEXTAUTH_SECRET` | o mesmo do seu `.env` |
   | `NEXTAUTH_URL` | `https://SEU-PROJETO.vercel.app` (ou seu domínio, quando tiver) |

   `ADMIN_EMAIL` e `ADMIN_PASSWORD` **não** precisam ir para a Vercel (o dono já foi criado na Parte 2).
4. Clique em **Deploy**. Em ~2 minutos o site está no ar.
5. Se o endereço final for diferente do que você colocou em `NEXTAUTH_URL`, corrija em
   **Settings → Environment Variables** e faça **Redeploy**.

## Parte 4 — Domínio próprio (opcional, recomendado)

1. Registre o domínio em **registro.br** (`.com.br`, ~R$ 40/ano).
2. Na Vercel: **Settings → Domains → Add** e siga as instruções de DNS que ela mostrar.
3. Atualize `NEXTAUTH_URL` para o novo endereço e faça **Redeploy**.

## Parte 5 — Checklist antes de divulgar

- [ ] Entrar em `/login` com o e-mail e a senha do dono → cai em `/admin`
- [ ] Cadastrar um serviço e uma profissional reais; **ajustar os horários** em `/admin/horarios`
- [ ] Criar uma conta de cliente **de outro e-mail**, agendar pelo celular e ver o horário na agenda do dono
- [ ] Tentar agendar o mesmo horário com outra conta: o horário não deve mais aparecer
- [ ] Cancelar um agendamento pela conta da cliente
- [ ] Trocar o `ADMIN_PASSWORD` de teste por uma senha forte (se ainda usa a do exemplo)

## Limites conhecidos (não estão no sistema ainda)

- **Não há "esqueci minha senha"** nem confirmação de e-mail. Se alguém esquecer a senha,
  é preciso redefinir manualmente.
- **Não envia lembrete** por WhatsApp/e-mail.
- **Sem limite de tentativas de login** (proteção contra robôs).
- **Backup:** no plano grátis do Supabase não há. No Pro há backup diário por 7 dias.
- Dados de clientes (nome, telefone, e-mail) estão sujeitos à **LGPD**: avise na página
  como os dados são usados.

## Se algo der errado

| Sintoma | Causa provável |
|---|---|
| `npm run db:setup` falha com erro de conexão | senha errada ou com símbolos sem codificar; ou usou a porta errada |
| Erro "extension btree_gist" | ligue a extensão no passo 4 da Parte 1 e rode de novo |
| Login volta para a tela de login sem erro | `NEXTAUTH_URL` ou `NEXTAUTH_SECRET` ausente/errado na Vercel |
| Site fica lento ou erro "too many connections" | `DATABASE_URL` não está usando a porta 6543 com `pgbouncer=true` |
| Site parou de responder depois de dias sem uso | projeto grátis do Supabase pausou: reative em supabase.com (ou assine o Pro) |
