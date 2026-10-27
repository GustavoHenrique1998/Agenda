-- Segurança para uso no Supabase.
--
-- O Supabase expõe automaticamente as tabelas do schema "public" por uma API REST
-- aberta à internet (chave "anon", que é pública). Sem RLS, qualquer pessoa poderia
-- ler e alterar estas tabelas, inclusive os hashes de senha.
--
-- Ligamos o RLS SEM criar nenhuma política: a API pública não enxerga nada.
-- O aplicativo continua funcionando porque o Prisma conecta como dono do banco
-- (role "postgres"), que ignora o RLS.
--
-- Em um PostgreSQL comum (sem Supabase) isto é inofensivo.

ALTER TABLE "User"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Professional"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfessionalService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkSchedule"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeBlock"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppointmentService"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations"  ENABLE ROW LEVEL SECURITY;
